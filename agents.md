# AGENTS.md

## Project context
This repository is primarily worked on through Codex in the browser/cloud workflow connected to GitHub.

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

## Verification workflow
When asked to test or verify the app:
1. Inspect repo structure and scripts
2. Run install/build/lint/typecheck/test if available
3. Add focused tests only when high-value
4. Re-run checks after fixes
5. Report remaining risks clearly
6. Never claim 100% certainty

## Review guidelines
- Prefer minimal, high-confidence diffs
- Do not rewrite working architecture unnecessarily
- Preserve existing UX unless fixing a bug
- Flag uncertainty explicitly
