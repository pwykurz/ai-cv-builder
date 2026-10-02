# Security Policy

## Supported versions

Only the latest commit on the `main` branch is supported.

## Reporting a vulnerability

If you find a security issue in the **template or tooling** (not in your own CV data):

1. **Do not** open a public issue with exploit details.
2. Email the maintainer: [pawel.wykurz@gmail.com](mailto:pawel.wykurz@gmail.com) with a description and steps to reproduce.
3. Allow a reasonable time to respond before any public disclosure.

Please do **not** include real personal data (yours or anyone else's) in reports.

## Scope notes

- **`data/` and `public/photos/`** are gitignored — your CV and photos stay on your machine unless you commit them yourself.
- **Dev-server endpoints** (`/__save-cv`, `/__cv-pdf`, `/__upload-photo`, `/__delete-cv`, `/__import-cv`) exist only under `npm run dev`. They are not part of the production build.
- **Upload CV** sends the uploaded file to the Anthropic API for reading. The API key (`ANTHROPIC_API_KEY`) is read by the dev server from `.env` or the environment and never reaches the browser: no client code reads `import.meta.env`, error replies never echo it, and `/__import-cv/status` only says whether a key exists. `.env` and every `.env.*` (except `.env.example`) are gitignored. **Never prefix the key with `VITE_`** — Vite bundles such variables into the browser code; the dev server refuses to start if a `VITE_` variable named like a secret exists (`*KEY*`, `*TOKEN*`, `*SECRET*`, `*ANTHROPIC*`).
- **Cross-site protection:** state-changing dev endpoints (save, delete, photo upload, CV import) reject requests whose `Origin` is another site (HTTP 403), so a web page open in your browser can't spend your key or overwrite `data/` through `localhost`. Vite also refuses unknown `Host` headers (DNS rebinding) by default.
- **Sample CVs** in `examples/` use fictional names and contact details.

## Known dev-only risks

Running `npm run dev` starts a local Vite server that listens on `localhost` only. Treat it like any local dev environment: do **not** start it with `--host` or otherwise expose it to untrusted networks (anyone who can reach it can use your API key through the import endpoint and read `data/`), and keep dependencies up to date (`npm audit`).
