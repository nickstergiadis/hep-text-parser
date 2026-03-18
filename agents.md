# AGENTS.md

## Project verification workflow
When asked to verify or test this repo, always:

1. Detect package manager and install dependencies.
2. Run lint, typecheck, build, and tests if available.
3. Identify critical user-facing flows.
4. Add targeted tests for parser logic if coverage is weak.
5. Use realistic clinician HEP text fixtures.
6. Re-run all checks after changes.
7. Report residual risks clearly. Never claim 100% certainty.

## Critical flows
- parse pasted HEP text
- normalize exercise names
- extract sets/reps/holds/duration
- render exercise cards
- show instructions/media
- generate copy/export/email-ready output

## Testing priority
Highest priority is parser correctness and output formatting.
Prefer minimal, high-confidence changes.
