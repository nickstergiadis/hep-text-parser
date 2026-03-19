# HEP Builder Pro

## Architecture overview

This repository now includes a conservative, deterministic video-matching subsystem that is separate from runtime parsing UI behavior.

- **Canonical exercise source of truth**: `data/exercises_master.json`
- **Approved video source of truth**: `data/video_whitelist.json`
- **Candidate and rejection logs**: `data/video_candidates.json`, `data/video_rejections.json`
- **Validator outputs**: `data/video_validation_report.json`, `reports/validation_summary.md`
- **Core logic**: `src/video/*.js`
- **Automation scripts**: `scripts/*.js`
- **Scheduled automation**: `.github/workflows/*.yml`

## How video matching works

1. Parsed text is normalized and mapped to canonical exercise names/aliases.
2. Runtime app only checks the local whitelist JSON.
3. Only `APPROVED_HIGH_CONFIDENCE` videos are used by default.
4. If no approved video exists, the app returns a stable fallback object and UI shows: **"Video currently unavailable."**
5. No live YouTube searching is used in user-facing flows.

## Refresh candidates

Candidate refresh is intentionally offline/batch only.

```bash
YOUTUBE_API_KEY=... npm run refresh:candidates
```

This script will:
- generate strict search queries from canonical names/aliases
- collect metadata from YouTube Data API
- score candidates with ambiguity penalties
- auto-approve only high-confidence matches
- write outputs to candidate/rejection/whitelist JSON files

## Validation

```bash
YOUTUBE_API_KEY=... npm run validate:videos
```

Validation re-checks all approved videos for:
- metadata resolution
- embeddability
- public availability

Broken videos are marked inactive; if backup approved entries exist for the same exercise, one is promoted.

## Config flags

Defined in `src/video/config.js`:
- `useLowerConfidenceVideos` (default `false`)
- `highConfidenceThreshold`
- `lowerConfidenceThreshold`
- min/max instructional duration bounds

## File structure

- `app.js` – frontend parser + canonical/whitelist integration
- `src/video/config.js` – deterministic thresholds and tiers
- `src/video/matcher.js` – normalization, alias matching, fallback resolution
- `src/video/scoring.js` – strict candidate scoring and ambiguity penalties
- `src/video/pipeline.js` – query generation + YouTube API candidate collection + ranking
- `scripts/refresh-video-candidates.js` – batch refresh
- `scripts/validate-videos.js` – batch validator
- `tests/video-matching.test.js` – normalization/scoring/fallback/E2E mapping tests

## Troubleshooting

- **No videos are attaching in app**: verify `data/video_whitelist.json` has active `APPROVED_HIGH_CONFIDENCE` entries for canonical IDs.
- **Refresh script fails**: check `YOUTUBE_API_KEY` environment variable.
- **Validation script fails**: check API key and YouTube API quota/permissions.
- **Unexpected matches**: tighten thresholds and penalties in `src/video/config.js` and `src/video/scoring.js`.
