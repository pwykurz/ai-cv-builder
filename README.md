# CV as Code

[![CI](https://github.com/pwykurz/ai-cv-builder/actions/workflows/ci.yml/badge.svg)](https://github.com/pwykurz/ai-cv-builder/actions/workflows/ci.yml)

React + JSON data → ATS-friendly PDF with real text, plus automatic checks that parsers can read it correctly.

> Sample CVs in `examples/` use **fictional** names and contact details (John Smith, Jan Kowalski). Never commit real personal data — use `data/` (gitignored).

**Requirements:** Node.js 20+ (CI uses 22).

## Setup (once)

```bash
npm install
npx playwright install chromium
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
- **Upload CV** — pick a PDF, DOCX or TXT: Claude reads it and fills the template in **both languages** (PL and EN). Upload as many CVs as you like; each one overwrites the fields it contains and leaves the rest. The open language is applied as an undoable edit (click **Save** to keep it); the other language is saved right away. Needs an Anthropic API key (see below) — without one the button is greyed out and its tooltip says why,
- **PDF** — a fresh PDF rendered with the same logic as `npm run cv` (no print dialog, no rebuild). It uses the saved file on disk, so the toolbar warns if you have unsaved changes.

### Upload CV: API key

Copy `.env.example` to `.env` (gitignored), set `ANTHROPIC_API_KEY=` to your key from [console.anthropic.com](https://console.anthropic.com/) and restart `npm run dev`. The key is read only by the dev server (`scripts/cv-import.mjs`) and never sent to the browser. The uploaded file is sent to the Anthropic API for reading — don't upload CVs you can't share with it.

## Project layout

| Path                       | Purpose                                                      |
| -------------------------- | ------------------------------------------------------------ |
| `data/*.json`              | Your CV content, one file per variant (gitignored)           |
| `examples/*.json`          | Fictional sample CVs in the repo                             |
| `scripts/data-files.mjs`   | Resolves a variant: `data/` first, then `examples/`          |
| `scripts/cv.mjs`           | Orchestrator: build → PDF → ATS checks                       |
| `scripts/render-pdf.mjs`   | Chromium → PDF file (CLI)                                    |
| `scripts/pdf-renderer.mjs` | Shared render logic — CLI and dev download button            |
| `scripts/check-pdf.mjs`    | “How an ATS sees it” text-layer checks                       |
| `vite.config.ts`           | Dev-server plugins: save, delete, photo upload, PDF download |
| `src/App.tsx`              | App shell: providers, toolbar, state wiring                  |
| `src/cv/`                  | CV layout and sections (what lands in the PDF)               |
| `src/editing/`             | Dev toolbar, inline editing primitives                       |
| `src/hooks/`               | Shared React hooks (undo history)                            |
| `src/i18n/`                | Interface language strings (EN/PL)                           |
| `src/lib/`                 | Utilities (date formatting, stable list IDs)                 |
| `src/styles.css`           | Layout, A4 margins, page breaks                              |
| `src/types.ts`             | Data shape                                                   |

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

Report vulnerabilities privately — see [SECURITY.md](SECURITY.md). Do not paste personal data in public issues.

## License

[MIT](LICENSE) — Copyright (c) 2026 Paweł Wykurz
