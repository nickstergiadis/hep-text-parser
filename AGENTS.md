# AGENTS.md

## Project context
This repository is primarily worked on through Codex in the browser/cloud workflow connected to GitHub.

This repo is a patient-facing physiotherapy HEP builder that converts exercise input into structured home exercise programs.

## Operating mode
Assume the default workflow is:
1. Make changes in Codex cloud
2. Show the diff
3. User reviews changes
4. User sends changes back through the Codex "Create PR" flow

## Important instruction
Do NOT tell the user to run local git commands such as:
- git add
- git commit
- git push
- git checkout

unless the user explicitly says they are working in a local terminal/CLI checkout on their own machine.

When giving next-step instructions, prefer:
- "Review the diff"
- "Click Create PR"
- "Open the PR in GitHub"
- "Merge the PR in GitHub after review"

## Environment assumptions
- Primary environment: Codex web/cloud
- Repository connected to GitHub
- User may not be using a local terminal
- User may not have the repo checked out locally
- Avoid instructions that require shell access unless explicitly requested

## How to respond
When suggesting actions:
- Be explicit about whether the action is in Codex browser, GitHub, or local terminal
- Label commands by environment
- If a command is for local terminal only, clearly say "Run this in your local terminal, not in Codex browser"

## Preferred phrasing
Use wording like:
- "In Codex browser, click Create PR"
- "In GitHub, review and merge the PR"
- "Only run this locally if you have the repo checked out on your machine"

## Repo priorities
Prioritize, in order:
1. Reliability
2. Clear patient UX
3. Minimal, high-confidence diffs
4. Static-site compatibility
5. Preserving existing working behavior unless the task explicitly requires a change

## Architecture constraints
- Prefer frontend-only or static-site-friendly solutions
- Avoid adding backend services unless absolutely necessary
- Avoid unnecessary dependencies
- Preserve GitHub Pages / simple static deployment compatibility
- Do not introduce fragile third-party integrations without a fallback path

## Change strategy
- Inspect the existing code path before editing
- Prefer the smallest coherent patch over broad refactors
- Reuse existing types, helpers, and structures where reasonable
- Do not rewrite working architecture unnecessarily
- Do not change unrelated styling or copy unless required for the fix
- Flag uncertainty explicitly

## Exercise video-link rules
- Do not blindly generate direct YouTube watch links for generic exercises
- Preserve approved/curated video links if they already exist
- Prefer this fallback order:
  1. verified curated link
  2. YouTube search URL from normalized exercise name
  3. no link
- If an exercise name is too weak or ambiguous, return no video link instead of a poor one
- Do not render broken embeds, blank states, or misleading labels for unavailable links
- Do not label a search-result link as a guaranteed direct video
- Prefer concise labels such as "Video search" when the link is a search URL

## Data model guidance
- Keep model changes minimal and explicit
- If new fields are needed, prefer simple predictable fields such as:
  - videoMode: "verified" | "search" | "none"
  - videoUrl
  - videoLabel
- Make legacy/previous video-link behavior explicit when migrating existing records

## Query generation rules
- Normalize exercise names before generating search URLs:
  - trim whitespace
  - collapse repeated spaces
  - remove noisy punctuation
  - preserve clinically meaningful words
- Keep generated search queries concise and useful

## Verification workflow
When asked to test or verify the app:
1. Inspect repo structure and scripts
2. Run install/build/lint/typecheck/test if available
3. Add focused tests only when high-value
4. Re-run checks after fixes
5. Report remaining risks clearly
6. Never claim 100% certainty

When changing behavior:
- run the available build/typecheck/lint/tests if present
- add focused tests only when they materially reduce regression risk
- verify the touched user flow manually if feasible
- confirm unrelated core flows still render correctly
- never claim certainty beyond the checks actually run

## Review guidelines
- Prefer minimal, high-confidence diffs
- Do not rewrite working architecture unnecessarily
- Preserve existing UX unless fixing a bug
- Flag uncertainty explicitly

## Task completion for non-trivial fixes
Report back with:
1. root cause
2. implementation summary
3. files changed
4. verification run
5. remaining limitations
