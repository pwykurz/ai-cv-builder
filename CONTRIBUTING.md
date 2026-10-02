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

Use the [bug report template](https://github.com/pwykurz/ai-cv-builder/issues/new?template=bug_report.yml) and include:

- what you expected
- what happened
- steps to reproduce
- OS, Node.js version, browser (if relevant)

Please do **not** paste real personal data (email, phone, address) into issues.

## Security

See [SECURITY.md](SECURITY.md) for how to report vulnerabilities privately.

## Maintainer notes (GitHub settings)

To keep this repo clone-only for the public:

| Setting                         | Recommendation                                                |
| ------------------------------- | ------------------------------------------------------------- |
| **Branch protection** on `main` | Require PR, require CI checks, restrict pushes to owner       |
| **Collaborators**               | None, unless explicitly needed                                |
| **Fork PR workflows**           | Require approval for outside collaborators                    |
| **Allow forking**               | Optional — disable if you only want clone, not one-click fork |

These are configured in the GitHub repository settings, not in this codebase.
