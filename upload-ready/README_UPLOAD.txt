`upload-ready/` is a generated mirror of the root production app for manual handoff/backups only.

- Source of truth: repository root (`index.html`, `app.js`, `style.css`, `data/`, `src/`).
- Do not hand-edit runtime files in `upload-ready/`.
- Regenerate with: `npm run sync:upload-ready`.

For GitHub Pages deployment, use the workflow at `.github/workflows/deploy-pages.yml` (publishes repository root, not this folder).
