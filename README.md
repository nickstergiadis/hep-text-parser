# HEP Builder Pro

HEP Builder Pro is a deterministic, static web app for converting clinician shorthand into a patient-ready exercise program.

## Production architecture (single source of truth)

- **Production app:** repository root (`index.html`, `app.js`, `style.css`).
- **Canonical exercise model:** `data/exercises_master.json`.
- **Approved runtime video model:** `data/video_whitelist.json` only.
- **Matching logic:** `src/video/`.
- **Program output helpers:** `src/app/output.js`.
- **`upload-ready/`:** optional generated mirror for manual/static handoff workflows only; **not** the GitHub Pages deploy source.

## Video policy

- Runtime behavior is whitelist-only (no live YouTube searching in user flows).
- Only approved whitelist rows are attached.
- Missing approved videos use deterministic fallback: **"Video currently unavailable."**
- Candidate refresh/validation scripts are batch-only workflows.

## Local commands

```bash
npm test
npm run verify:production
npm run check
npm run sync:upload-ready
```

## GitHub Pages deployment (first-class path)

Single deploy path: **GitHub Actions workflow** at `.github/workflows/deploy-pages.yml`.

- Triggered on push to `main` or manually.
- Runs `npm run check` before deploying.
- Publishes repo root (`path: .`) as the single static Pages artifact source.
- Does **not** depend on `upload-ready/`.

## Production readiness checklist

- **Source of truth:** root app + canonical JSON data.
- **Deployment target:** GitHub Pages workflow (`deploy-pages.yml`).
- **Verification:** `npm run check` (tests + production file/data validation).
- **Video strategy:** deterministic whitelist + stable fallback.
- **Known limitation:** whitelist coverage is intentionally conservative; unsupported exercises will render fallback video text.
