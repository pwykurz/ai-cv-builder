# CV as Code

[![CI](https://github.com/pwykurz/ai-cv-builder/actions/workflows/ci.yml/badge.svg)](https://github.com/pwykurz/ai-cv-builder/actions/workflows/ci.yml)

React + JSON data → ATS-friendly PDF with real text, plus automatic checks that parsers can read it correctly. Optionally, **import an existing CV** (PDF, DOCX or TXT) with Claude: it fills the template in Polish and English.

> Sample CVs in `examples/` use **fictional** names and contact details (John Smith, Jan Kowalski). Never commit real personal data — use `data/` (gitignored).

**Requirements:** Node.js 20+ (CI uses 22).

| What                          | Needed for                                             | Required |
| ----------------------------- | ------------------------------------------------------ | -------- |
| `npm install`                 | everything                                             | yes      |
| Playwright Chromium           | PDF download button, `npm run cv`                      | yes      |
| `ANTHROPIC_API_KEY` in `.env` | **Upload CV** (import with Claude; billed to your key) | optional |

## Setup (once)

```bash
npm install
npx playwright install chromium
cp .env.example .env     # optional: only needed for the "Upload CV" button, see below
```

## Day-to-day workflow

```bash
npm run dev      # preview at http://localhost:5173 — edit in the browser, or reload after changing JSON on disk
npm run cv       # build + PDF to out/cv.en.pdf + text-layer checks (PASS / WARN / FAIL)
```

Each CV variant exists per language as `<variant>.<pl|en>.json`. The base CVs are `cv.en.json` (default) and `cv.pl.json`; both are protected from deletion.

### Your data vs the sample

- `examples/` — fictional sample CVs shipped with the repo (John Smith in English, Jan Kowalski in Polish). Read-only on disk.
- `data/` — **your** CV. This folder is in `.gitignore`, so your data never gets committed.
- The app and scripts look up a variant in `data/` first, then `examples/`. Saving from the toolbar always writes to `data/`, so open a sample, edit it, and click **Save** to get your own copy. Uploaded photos land in `public/photos/` (also gitignored).

```bash
npm run cv -- --data cv.pl     # one variant → out/cv.pl.pdf
npm run cv:all                 # every variant in data/ and examples/
```

In the preview, pick a variant via `?data=cv.pl` in the URL or from the toolbar.

While running `npm run dev`, a floating, draggable toolbar appears in the top-right corner:

- **file menu** (`cv ▾`) — list of variants in the current language, **Duplicate as…** (copy the current state under a new name in the same language; never overwrites an existing file), and **Delete** (removes the version in the current language; the base `cv` variant is protected),
- **Preview | Edit** — in edit mode every text field is editable (click and type). Move bullets, projects, employers, education entries, skill groups, or paragraphs with **↑ ↓**, remove with **×**, and add with **+ Add …** (new items inherit their section’s style and arrive with text selected for immediate typing; jobs, projects, and education are inserted at the top because lists are newest-first). Dates are edited with month pickers. In preview mode the page looks exactly like the printed CV,
- **PL | EN** — open the same variant in the other language. If that version does not exist yet, the toolbar offers to create it: a copy of the current content with the target language’s section headings and date format, ready to translate in edit mode,
- **Undo** / **Ctrl+Z** (edit mode only) — reverts the last change: text edit, add, remove, reorder, or date change (up to 100 steps). While typing inside a field, Ctrl+Z uses the browser’s normal text undo,
- **Save** — always visible; writes changes to the open variant (tinted while there is something unsaved, “Saved ✓” right after); a red dot means unsaved changes (it clears when you undo back to the saved state),
- **flag** (end of the toolbar) — switches the **interface** language (toolbar, menus, edit controls): Polish flag when English is active, UK flag when Polish is active. Independent of the CV content language. The choice is stored in the browser; English is the default,
- **Upload CV** — click it (or drag a file onto it) to import an existing CV: Claude reads a PDF, DOCX or TXT and fills the template in **both languages**. Greyed out, with an explanation in its tooltip, when no API key is set. Details in [Upload CV](#upload-cv-import-with-claude) below,
- **PDF** — a fresh PDF rendered with the same logic as `npm run cv` (no print dialog, no rebuild). It uses the saved file on disk, so the toolbar warns if you have unsaved changes.

### Upload CV (import with Claude)

**Setup.** Put your Anthropic API key in `.env` (copy `.env.example`; the file is gitignored), then restart `npm run dev`:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

Get a key at [console.anthropic.com](https://console.anthropic.com/). The key is read only by the dev server (`scripts/cv-import.mjs`) and never reaches the browser. Do **not** name it `VITE_ANTHROPIC_API_KEY`: `VITE_` variables are bundled into the browser code, so the dev server refuses to start with one. An `ANTHROPIC_API_KEY` already exported in your shell works too. Without a key the button stays greyed out.

**How it works**

1. Click **Upload CV** or drop a file on it — PDF, DOCX or TXT, up to 10 MB.
2. A dialog shows the real stages (upload → reading the file → Claude fills in the PL version and the EN version → saving the other language). It takes roughly 15–30 s; **Cancel** (or Esc) stops the work.
3. Claude reads the whole document, whatever its layout or section names, and returns the content in **both** languages (text already in one language is kept, the other is translated; names, companies, technologies, URLs and contact details are never translated). Contact fields it misses are filled from the file's own text where an e-mail, phone, LinkedIn or GitHub address is plainly there.
4. The result is **merged into the current CV field by field**: whatever the upload contains replaces the current value (a list such as experience or skills replaces the whole list); whatever it lacks stays as it was. Photo, section headings and date locale are never touched. Upload as many CVs as you like — each one overwrites the fields it has.
5. Where it lands: the **open language** goes into the editor as one undoable change and waits for **Save**; the **other language** is merged into its own file and saved right away (created from that language's base headings if it does not exist yet).
6. A line under the toolbar summarises what was read (name, number of jobs, skills, education) and lists main fields that were **not found**, so a miss is easy to spot. Then click **Save**.

**Cost and privacy.** Every upload sends the file to the Anthropic API (twice — one request per language, in parallel) and is billed to your key. Don't upload CVs you can't share with it. The model is the `MODEL` constant in `scripts/cv-import.mjs` (currently `claude-sonnet-5-5`).

**Troubleshooting**

| Symptom                                   | Fix                                                                                      |
| ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| Button greyed out                         | No `ANTHROPIC_API_KEY` — add it to `.env`, restart `npm run dev`                         |
| `401 … invalid x-api-key`                 | The key is wrong or revoked                                                              |
| `Only PDF, DOCX or plain-text files…`     | Unsupported type (old `.doc` and image files are not accepted)                           |
| `The CV is too long to import`            | The result exceeded the output limit — upload a shorter CV                               |
| Some fields still show the sample content | Not found in the file, so kept (see the line under the toolbar) — fill them in edit mode |
| Changes are gone after switching language | The open language is not saved until you click **Save**                                  |

## Project layout

| Path                       | Purpose                                                         |
| -------------------------- | --------------------------------------------------------------- |
| `data/*.json`              | Your CV content, one file per variant (gitignored)              |
| `.env`                     | Your `ANTHROPIC_API_KEY` (gitignored; template: `.env.example`) |
| `examples/*.json`          | Fictional sample CVs in the repo                                |
| `scripts/data-files.mjs`   | Resolves a variant: `data/` first, then `examples/`             |
| `scripts/cv.mjs`           | Orchestrator: build → PDF → ATS checks                          |
| `scripts/render-pdf.mjs`   | Chromium → PDF file (CLI)                                       |
| `scripts/pdf-renderer.mjs` | Shared render logic — CLI and dev download button               |
| `scripts/check-pdf.mjs`    | “How an ATS sees it” text-layer checks                          |
| `scripts/cv-import.mjs`    | Upload CV: reads a file with Claude (dev server only)           |
| `vite.config.ts`           | Dev-server plugins: save, delete, photo, PDF, CV import         |
| `src/App.tsx`              | App shell: providers, toolbar, state wiring                     |
| `src/cv/`                  | CV layout and sections (what lands in the PDF)                  |
| `src/editing/`             | Dev toolbar, import dialog, inline editing primitives           |
| `src/hooks/`               | Shared React hooks (undo history)                               |
| `src/i18n/`                | Interface language strings (EN/PL)                              |
| `src/lib/`                 | Utilities (dates, stable list IDs, `merge-cv` for imports)      |
| `src/styles.css`           | Layout, A4 margins, page breaks                                 |
| `src/types.ts`             | Data shape                                                      |

## Photo

Easiest in edit mode: hover the photo and click **Change photo** (or **Add photo** if there is none). JPEG, PNG, and WebP up to 10 MB are accepted. The file is stored in `public/photos/` under a content-hash name and referenced from `profile.photo`; save the CV to persist the change.

Manually: drop a file into `public/photos/` and set e.g. `"photo": "./photos/my-photo.jpg"` in the JSON.
(Photo is optional; it does not affect the PDF text layer.)

## What `npm run cv` checks

- PDF has a real text layer (not a flat image)
- **Name** as the first line of text
- Section headings Skills → Experience → Education, each on its own line, in order
- Email and phone present in the text layer; LinkedIn present (warning if missing)
- Every employer, role, and start date found; employers in the same order as in the JSON
- All summary, bullet, and tech/skill list texts complete (catches truncated copy)
- No ligatures or odd private-use characters
- No line breaks after hyphens; hyphenated words intact (warnings)
- Page count within limit; no section heading stranded at the bottom of a page; last page not nearly empty
- PDF title metadata set

**FAIL** = fix before sending the CV. **WARN** = worth a look.

## Development

```bash
npm run lint          # ESLint
npm run lint:fix      # ESLint with auto-fix
npm run format        # Prettier (write)
npm run format:check  # Prettier (check only)
npm run build         # typecheck + production bundle
npm run cv            # build + PDF + ATS checks
```

CI runs lint, format check, build, and `npm run cv` on every push to `main` (see `.github/workflows/ci.yml`).

## Rules

- Content lives only in JSON (`data/` or `examples/`), not in components.
- Single column, no tables or form fields, no `text-transform` on the name, no `letter-spacing`.
- Projects nested under the employer, not as separate “companies”.
- After changes, always open the PDF and check page breaks.

## Contributing & repository access

This repo is meant to be **cloned or forked**, not written to by the public. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

- **Secrets:** `.env` and all `.env.*` (except `.env.example`) are gitignored. The API key is read only by the dev server and never reaches the browser — never name it `VITE_…` (the dev server refuses to start if you do).
- **Personal data:** your CV and photos live in `data/` and `public/photos/` (gitignored). The repo ships only fictional samples. **Upload CV** sends the file you pick to the Anthropic API.
- **Dev server:** listens on `localhost` only; don't start it with `--host`. Save, delete, photo upload and import reject requests coming from other websites.

Report vulnerabilities privately — see [SECURITY.md](SECURITY.md) for details. Do not paste personal data or keys in public issues.

## License

[MIT](LICENSE) — Copyright (c) 2026 Paweł Wykurz
