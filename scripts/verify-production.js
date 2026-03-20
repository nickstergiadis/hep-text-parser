import fs from 'node:fs';

const requiredFiles = [
  'index.html',
  'app.js',
  'style.css',
  'data/exercises_master.json',
  'data/video_whitelist.json',
  '.github/workflows/deploy-pages.yml'
];

const missing = requiredFiles.filter(file => !fs.existsSync(file));
if (missing.length) {
  console.error(`Missing required production files: ${missing.join(', ')}`);
  process.exit(1);
}

const exercises = JSON.parse(fs.readFileSync('data/exercises_master.json', 'utf8'));
const whitelist = JSON.parse(fs.readFileSync('data/video_whitelist.json', 'utf8'));

if (!Array.isArray(exercises) || exercises.length === 0) {
  console.error('Canonical exercise library is missing or empty.');
  process.exit(1);
}

if (!Array.isArray(whitelist)) {
  console.error('Video whitelist JSON is invalid.');
  process.exit(1);
}

const canonicalIds = new Set(exercises.map(ex => ex.exercise_id));
const invalidWhitelistRows = whitelist.filter(row => !canonicalIds.has(row.exercise_id));
if (invalidWhitelistRows.length) {
  console.error('Whitelist contains exercise IDs not present in canonical library.');
  process.exit(1);
}

console.log('Production verification passed.');
