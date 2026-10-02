# CV as Code

React + JSON data → ATS-friendly PDF with real text, plus automatic checks that parsers can read it correctly.

## Setup (once)

```bash
npm install
npx playwright install chromium
```

## Day-to-day workflow

```bash
npm run dev      # live preview (http://localhost:5173); CV file changes show up immediately
npm run cv       # build + PDF to out/cv.en.pdf + text-layer checks (PASS / WARN / FAIL)
```

Each CV variant exists per language as `<variant>.<pl|en>.json`. The base CVs are `cv.en.json` (default) and `cv.pl.json`; both are protected from deletion.

### Your data vs the sample

- `examples/` — fictional sample CVs shipped with the repo (John Smith in English, Jan Kowalski in Polish). Read-only.
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
- **Save** (edit mode only) — writes changes to the open variant; a red dot means unsaved changes (it clears when you undo back to the saved state),
- **flag** (end of the toolbar) — switches the **interface** language (toolbar, menus, edit controls): 🇵🇱 when English is active, 🇬🇧 when Polish is active. Independent of the CV content language. The choice is stored in the browser; English is the default,
- **PDF** — a fresh PDF rendered with the same logic as `npm run cv` (no print dialog, no rebuild). It uses the saved file on disk, so the toolbar warns if you have unsaved changes.

## Project layout

| File                       | Purpose                                                              |
| -------------------------- | -------------------------------------------------------------------- |
| `data/*.json`              | Your CV content, one file per variant (gitignored)                   |
| `examples/*.json`          | Fictional sample CVs in the repo                                     |
| `scripts/data-files.mjs`   | Resolves a variant: `data/` first, then `examples/`                  |
| `src/App.tsx`              | App shell: providers, toolbar, state wiring                          |
| `src/cv/`                  | CV layout and sections (what lands in the PDF)                       |
| `src/editing/`             | Dev toolbar, inline editing primitives                               |
| `src/hooks/`               | Shared React hooks (undo history)                                    |
| `src/i18n/`                | Interface language strings (EN/PL)                                   |
| `src/styles.css`           | Layout, A4 margins, page breaks                                      |
| `src/types.ts`             | Data shape                                                           |
| `scripts/render-pdf.mjs`   | Chromium → PDF file (CLI)                                            |
| `scripts/pdf-renderer.mjs` | Shared render logic — CLI and dev download button (`vite.config.ts`) |
| `scripts/check-pdf.mjs`    | “How an ATS sees it” text-layer checks                               |

## Photo

Easiest in edit mode: hover the photo and click **Change photo** (or **Add photo** if there is none). JPEG, PNG, and WebP up to 10 MB are accepted. The file is stored in `public/photos/` under a content-hash name and referenced from `profile.photo`; save the CV to persist the change.

Manually: drop a file into `public/photos/` and set e.g. `"photo": "./photos/my-photo.jpg"` in the JSON.
(Photo is optional; it does not affect the PDF text layer.)

## What `npm run cv` checks

Last name as the first line of text; section headings Skills / Experience / Education in order; email and phone;
each employer + role + start date; employer order; completeness of every bullet (detects truncated text);
no ligatures or odd characters; no line breaks after hyphens; page count; no orphaned section heading at the bottom of a page.
**FAIL** = fix before sending the CV. **WARN** = worth a look.

## Development

```bash
npm run lint          # ESLint
npm run format:check  # Prettier
npm run build         # typecheck + production bundle
npm run cv            # build + PDF + ATS checks
```

CI runs the same checks on every push to `main` (see `.github/workflows/ci.yml`).

## Rules

- Content lives only in JSON (`data/` or `examples/`), not in components.
- Single column, no tables or form fields, no `text-transform` on the name, no `letter-spacing`.
- Projects nested under the employer, not as separate “companies”.
- After changes, always open the PDF and check page breaks.

## Contributing & repository access

This repo is meant to be **cloned or forked**, not written to by the public. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
