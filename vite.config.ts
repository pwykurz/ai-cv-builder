import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { detectKind, importCv, isImportAvailable } from './scripts/cv-import.mjs';
import { renderPdfBuffer } from './scripts/pdf-renderer.mjs';

const SAFE_NAME = /^[\w.-]+$/;
// The base CV in each language: cv.en is what every ?data=-less URL falls back to (see
// getDataName() in src/App.tsx), cv.pl its Polish counterpart. Both undeletable, so each
// language always has something to fall back to.
const DEFAULT_VARIANT = 'cv.en';
const PROTECTED_VARIANTS = ['cv.pl', 'cv.en'];

// Dev-server-only endpoint for the in-page "download PDF" button (see Toolbar in
// src/editing.tsx). Renders a fresh PDF from the *running* dev server on every request, using the
// same Playwright logic as `npm run cv` (scripts/pdf-renderer.mjs) - so it always reflects the
// current data/*.json, not whatever was last built. Only registered under `vite dev`
// (configureServer never runs during `vite build`).
function pdfDownloadPlugin(): Plugin {
  return {
    name: 'cv-pdf-download',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/__cv-pdf')) {
          next();
          return;
        }
        const name = new URL(req.url, `http://${req.headers.host}`).searchParams.get('data') ?? DEFAULT_VARIANT;
        try {
          const pageUrl = `http://${req.headers.host}/?data=${encodeURIComponent(name)}`;
          const buffer = await renderPdfBuffer(pageUrl);
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${name}.pdf"`);
          res.end(buffer);
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/plain');
          res.end(`PDF generation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      });
    },
  };
}

// Dev-server-only endpoint for the toolbar's "Save as" button (see Toolbar in src/editing.tsx).
// Writes the edited CV straight into data/<name>.json, same format `npm run cv` already reads.
// Always data/ (your own, gitignored), never examples/ - so saving an example makes a private copy.
function saveCvPlugin(): Plugin {
  return {
    name: 'cv-save',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/__save-cv')) {
          next();
          return;
        }
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }
        const name = new URL(req.url, `http://${req.headers.host}`).searchParams.get('data');
        if (!name || !SAFE_NAME.test(name)) {
          res.statusCode = 400;
          res.end('Invalid or missing "data" name (letters, digits, dot, dash, underscore only)');
          return;
        }
        try {
          let body = '';
          for await (const chunk of req) body += chunk;
          const cv = JSON.parse(body);
          if (typeof cv?.profile?.name !== 'string' || !Array.isArray(cv?.experience)) {
            throw new Error('Payload does not look like a CV (missing profile.name / experience[])');
          }
          const dataDir = resolve(import.meta.dirname, 'data');
          mkdirSync(dataDir, { recursive: true }); // a fresh clone has no data/ yet
          writeFileSync(resolve(dataDir, `${name}.json`), `${JSON.stringify(cv, null, 2)}\n`);
          res.statusCode = 200;
          res.end('OK');
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/plain');
          res.end(`Save failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      });
    },
  };
}

// Dev-server-only endpoint for the toolbar's delete button (see Toolbar in src/editing.tsx).
// Refuses to remove PROTECTED_VARIANTS, so each language keeps a base CV to fall back to.
function deleteCvPlugin(): Plugin {
  return {
    name: 'cv-delete',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/__delete-cv')) {
          next();
          return;
        }
        if (req.method !== 'DELETE') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }
        const name = new URL(req.url, `http://${req.headers.host}`).searchParams.get('data');
        if (!name || !SAFE_NAME.test(name)) {
          res.statusCode = 400;
          res.end('Invalid or missing "data" name (letters, digits, dot, dash, underscore only)');
          return;
        }
        if (PROTECTED_VARIANTS.includes(name)) {
          res.statusCode = 403;
          res.end(`"${name}" is a base CV and can't be deleted`);
          return;
        }
        const file = resolve(import.meta.dirname, 'data', `${name}.json`);
        if (!existsSync(file)) {
          res.statusCode = 404;
          res.end(`"${name}" is not in data/ - the examples/ that ship with the repo are read-only`);
          return;
        }
        try {
          unlinkSync(file);
          res.statusCode = 200;
          res.end('OK');
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/plain');
          res.end(`Delete failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      });
    },
  };
}

// Accepted photo formats, each with the leading bytes it must start with - the Content-Type is
// only what the browser claims, so the bytes are checked too before anything is written.
const PHOTO_TYPES: Record<string, { ext: string; magic: (b: Buffer) => boolean }> = {
  'image/jpeg': { ext: 'jpg', magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': { ext: 'png', magic: (b) => b.subarray(0, 4).toString('hex') === '89504e47' },
  'image/webp': {
    ext: 'webp',
    magic: (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP',
  },
};
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

// Dev-server-only endpoint for replacing the photo in edit mode (see PhotoEditor in
// src/editing.tsx). Stores the image under public/photos/ named by its content hash - so
// re-uploading the same image doesn't duplicate it and a new photo never overwrites one another
// variant still points at - and returns the path to put in profile.photo.
function uploadPhotoPlugin(): Plugin {
  return {
    name: 'cv-photo-upload',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/__upload-photo')) {
          next();
          return;
        }
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }
        const type = PHOTO_TYPES[(req.headers['content-type'] ?? '').split(';')[0].trim()];
        if (!type) {
          res.statusCode = 415;
          res.end('Only JPEG, PNG or WebP images are accepted');
          return;
        }
        try {
          const chunks: Buffer[] = [];
          let size = 0;
          for await (const chunk of req) {
            size += chunk.length;
            if (size > MAX_PHOTO_BYTES) {
              res.statusCode = 413;
              res.end('Image is larger than 10 MB');
              return;
            }
            chunks.push(chunk);
          }
          const data = Buffer.concat(chunks);
          if (!type.magic(data)) {
            res.statusCode = 415;
            res.end('File content does not match its image type');
            return;
          }
          const name = `photo-${createHash('sha1').update(data).digest('hex').slice(0, 12)}.${type.ext}`;
          const dir = resolve(import.meta.dirname, 'public', 'photos');
          mkdirSync(dir, { recursive: true });
          writeFileSync(resolve(dir, name), data);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ path: `./photos/${name}` }));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/plain');
          res.end(`Upload failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      });
    },
  };
}

const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

// Dev-server-only endpoint behind the toolbar's "Upload CV" button (see Toolbar in
// src/editing/toolbar.tsx). GET /__import-cv/status says whether an API key is configured (the
// button is greyed out otherwise); POST /__import-cv takes the raw file, has Claude read it
// (scripts/cv-import.mjs) and streams its progress, then the content in both languages. Nothing is written to disk
// here - the client merges the result into the open CV and its other-language twin.
function importCvPlugin(): Plugin {
  return {
    name: 'cv-import',
    // ANTHROPIC_API_KEY may live in .env (gitignored) rather than the shell; it is read here, in
    // Node, and never reaches the browser (no VITE_ prefix).
    config(_, { mode }) {
      const key = loadEnv(mode, import.meta.dirname, '').ANTHROPIC_API_KEY;
      if (key && !process.env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = key; // assigning undefined would store "undefined"
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0];
        if (path !== '/__import-cv' && path !== '/__import-cv/status') {
          next();
          return;
        }
        if (path === '/__import-cv/status') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ available: isImportAvailable() }));
          return;
        }
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }
        if (!isImportAvailable()) {
          res.statusCode = 503;
          res.end('ANTHROPIC_API_KEY is not set');
          return;
        }
        try {
          const chunks: Buffer[] = [];
          let size = 0;
          for await (const chunk of req) {
            size += chunk.length;
            if (size > MAX_IMPORT_BYTES) {
              res.statusCode = 413;
              res.end('File is larger than 10 MB');
              return;
            }
            chunks.push(chunk);
          }
          const data = Buffer.concat(chunks);
          const kind = detectKind(data);
          if (!kind) {
            res.statusCode = 415;
            res.end('Only PDF, DOCX or plain-text files are accepted');
            return;
          }
          // Streamed as one JSON object per line - { type: 'start' | 'text' | 'lang' }, then
          // { type: 'result', ... } or { type: 'error', message } - so the UI can show real progress.
          res.setHeader('Content-Type', 'application/x-ndjson');
          const send = (event: object) => res.write(`${JSON.stringify(event)}\n`);
          const abort = new AbortController();
          res.on('close', () => abort.abort()); // the client gave up: stop paying for the request
          send({ type: 'start' });
          try {
            const result = await importCv(kind, data, { onProgress: send, signal: abort.signal });
            send({ type: 'result', ...result });
          } catch (error) {
            send({ type: 'error', message: error instanceof Error ? error.message : String(error) });
          }
          res.end();
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/plain');
          res.end(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), pdfDownloadPlugin(), saveCvPlugin(), deleteCvPlugin(), uploadPhotoPlugin(), importCvPlugin()],
  // Relative asset paths so dist/ also opens from disk if you ever need it.
  base: './',
});
