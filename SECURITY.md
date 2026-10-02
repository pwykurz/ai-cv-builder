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
- **Dev-server endpoints** (`/__save-cv`, `/__cv-pdf`, `/__upload-photo`, `/__delete-cv`) exist only under `npm run dev`. They are not part of the production build.
- **Sample CVs** in `examples/` use fictional names and contact details.

## Known dev-only risks

Running `npm run dev` starts a local Vite server. Treat it like any local dev environment: do not expose it to untrusted networks, and keep dependencies up to date (`npm audit`).
