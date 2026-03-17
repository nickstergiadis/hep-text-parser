# HEP Program Builder

A static GitHub Pages front end for turning structured exercise-program JSON into a patient-facing home exercise program.

## What this version does
- Accepts strict JSON program input
- Matches exercises against a curated local exercise library
- Renders instructions, cues, notes, and images
- Prints cleanly to PDF
- Opens a prefilled email draft
- Copies a chart summary or patient text

## Folder overview
- `index.html` — main UI
- `style.css` — branding and print styling
- `app.js` — logic
- `data/exercise-library.json` — exercise library
- `data/sample-program.json` — sample program for testing
- `data/clinic-config.json` — clinic branding and default wording
- `images/` — placeholder SVGs that you can replace with your own media
- `docs/prompt-template.txt` — prompt to generate valid JSON from ChatGPT

## How to use
1. Upload the entire folder contents to your GitHub repo root.
2. Turn on GitHub Pages using the `main` branch and `/ (root)`.
3. Open the live site.
4. Click **Load sample JSON** to test it.
5. Replace the placeholder exercise images and expand `data/exercise-library.json` over time.

## Important limitation
This is still a static front end. It does **not**:
- send emails directly from a server
- store programs in a database
- call the OpenAI API securely from production

For those, add a backend later.
