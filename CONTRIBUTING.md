# Contributing

Thanks for your interest in this project.

## This repository is read-only for the public

You **cannot** push changes to this repository unless you are an owner or an explicitly invited collaborator with write access.

To use or customise the CV builder:

1. **Fork** the repository to your own GitHub account (or clone it locally).
2. Make changes in **your fork** or local copy.
3. Keep personal CV data in `data/` — it is gitignored and never committed here.

Do **not** open pull requests unless the maintainer has asked for them.

## Development setup

```bash
npm install
npx playwright install chromium
npm run dev
```

## Before you commit (in your fork)

```bash
npm run lint
npm run format:check
npm run build
npm run cv
```

## Reporting issues

If you find a bug in the template itself (not in your personal CV data), open an issue with:

- what you expected
- what happened
- steps to reproduce

Please do **not** paste real personal data (email, phone, address) into issues.
