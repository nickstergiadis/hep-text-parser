# HEP Builder Pro - Next Build

This version is designed to be more useful for real clinician workflow.

## What it does
- Accepts rough shorthand exercise input
- Standardizes common exercise names from a local exercise library
- Auto-generates patient-friendly instructions for matched exercises
- Creates editable exercise cards before sending
- Renders a cleaner patient-facing HEP preview
- Opens a prefilled email draft
- Prints cleanly to PDF from the browser

## Important limitation
This version does **not** use a real AI API yet.
It uses local matching and instruction templates inside `app.js`.

## Good next step
Connect this UI to an AI endpoint that returns structured exercise JSON, then keep the editor + preview workflow from this build.
