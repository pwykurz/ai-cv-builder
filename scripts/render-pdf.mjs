// Renders the CV (React page) to a text-based A4 PDF using headless Chromium.
//
//   node scripts/render-pdf.mjs                 -> out/cv.en.pdf
//   node scripts/render-pdf.mjs --data cv.pl    -> out/cv.pl.pdf   (data/ or examples/, see data-files.mjs)
//
// It serves the production build from `dist/` with `vite preview`, so run `npm run build` first
// (the `npm run cv` orchestrator does that for you). Actual rendering is shared with the
// dev-server download button (see scripts/pdf-renderer.mjs).
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { preview } from 'vite';
import { renderPdfBuffer } from './pdf-renderer.mjs';

const args = process.argv.slice(2);
const arg = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const name = arg('--data', 'cv.en');
const root = resolve(import.meta.dirname, '..');
const outFile = resolve(root, arg('--out', `out/${name}.pdf`));

if (!existsSync(resolve(root, 'dist/index.html'))) {
  console.error('dist/ not found. Run `npm run build` first (or use `npm run cv`).');
  process.exit(1);
}
mkdirSync(resolve(outFile, '..'), { recursive: true });

const server = await preview({
  root,
  logLevel: 'error',
  preview: { port: 4173, strictPort: false, open: false },
});

try {
  const url = server.resolvedUrls?.local?.[0];
  if (!url) throw new Error('Could not start the preview server');

  const buffer = await renderPdfBuffer(`${url}?data=${encodeURIComponent(name)}`);
  writeFileSync(outFile, buffer);

  console.log(`PDF: ${outFile}`);
} finally {
  await server.close();
}
