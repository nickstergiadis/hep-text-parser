import fs from 'node:fs';
import { parseProgramInput } from '../src/app/parser.js';
import { resolveExerciseVideoAssignment } from '../src/app/exercise-video.js';
import { buildPlainTextExport } from '../src/app/output.js';
import { VIDEO_MATCHING_CONFIG } from '../src/video/config.js';
import { matchExerciseToCanonical, isValidVideoUrl } from '../src/video/matcher.js';

const requiredFiles = [
  'index.html',
  'app.js',
  'style.css',
  'data/exercises_master.json',
  'data/video_whitelist.json',
  '.github/workflows/deploy-pages.yml'
];

const requiredDomIds = [
  'themeMode',
  'dataLoadNotice',
  'patientName',
  'recipientEmail',
  'programTitle',
  'programDate',
  'introText',
  'inputText',
  'sampleBtn',
  'generateBtn',
  'printBtn',
  'emailBtn',
  'copyForEmailBtn',
  'copyPlainTextBtn',
  'copyStatus',
  'previewTitle',
  'previewPatient',
  'previewDate',
  'previewIntro',
  'exerciseList',
  'editorList'
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function checkRequiredFiles() {
  const missing = requiredFiles.filter(file => !fs.existsSync(file));
  if (missing.length) fail(`Missing required production files: ${missing.join(', ')}`);

  const deployWorkflow = fs.readFileSync('.github/workflows/deploy-pages.yml', 'utf8');
  const usesNpmCi = /\bnpm ci\b/.test(deployWorkflow);
  if (usesNpmCi && !fs.existsSync('package-lock.json')) {
    fail('Deploy workflow uses npm ci, but package-lock.json is missing.');
  }
}

function checkHtmlIds() {
  const html = fs.readFileSync('index.html', 'utf8');
  const idMatches = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  const seen = new Map();
  idMatches.forEach((id) => seen.set(id, (seen.get(id) || 0) + 1));
  const duplicates = [...seen.entries()].filter(([, count]) => count > 1);
  if (duplicates.length) {
    fail(`Duplicate HTML id values detected: ${duplicates.map(([id, count]) => `${id} (${count})`).join(', ')}`);
  }

  const missingHooks = requiredDomIds.filter(id => !seen.has(id));
  if (missingHooks.length) {
    fail(`Missing required DOM hooks in index.html: ${missingHooks.join(', ')}`);
  }
}

function loadRuntimeData() {
  const exercises = JSON.parse(fs.readFileSync('data/exercises_master.json', 'utf8'));
  const whitelist = JSON.parse(fs.readFileSync('data/video_whitelist.json', 'utf8'));
  if (!Array.isArray(exercises) || exercises.length === 0) {
    fail('Canonical exercise library is missing or empty.');
  }
  if (!Array.isArray(whitelist)) {
    fail('Video whitelist JSON is invalid.');
  }
  return { exercises, whitelist };
}

function checkExerciseSchema(exercises) {
  const invalidExerciseRows = exercises.filter((row) => {
    return !row
      || typeof row.exercise_id !== 'string'
      || typeof row.canonical_name !== 'string'
      || !Array.isArray(row.aliases);
  });
  if (invalidExerciseRows.length) {
    fail(`Canonical exercise schema check failed for ${invalidExerciseRows.length} row(s).`);
  }
}

function checkWhitelistIntegrity(exercises, whitelist) {
  const canonicalIds = new Set(exercises.map(ex => ex.exercise_id));
  const invalidWhitelistRows = whitelist.filter(row => !canonicalIds.has(row.exercise_id));
  if (invalidWhitelistRows.length) {
    fail('Whitelist contains exercise IDs not present in canonical library.');
  }

  const invalidUrls = whitelist.filter((row) => !isValidVideoUrl(row.url));
  if (invalidUrls.length) {
    fail(`Whitelist contains ${invalidUrls.length} invalid URL(s).`);
  }

  const duplicatePairs = new Set();
  whitelist.forEach((row) => {
    const key = `${row.exercise_id}::${row.url}`;
    if (duplicatePairs.has(key)) {
      fail(`Whitelist contains duplicate exercise/url pair: ${key}`);
    }
    duplicatePairs.add(key);
  });
}

function checkWhitelistOnlySmoke(exercises, whitelist) {
  const sampleInput = 'bridge 3x12\nwall sit 3x30 sec';
  const parsed = parseProgramInput(sampleInput);
  const sampleExercises = parsed.sections[0].lines.map((line) => {
    const matched = matchExerciseToCanonical(line, exercises);
    const assignment = resolveExerciseVideoAssignment({
      canonicalExerciseId: matched.canonical?.exercise_id || null,
      exerciseName: matched.canonical?.canonical_name || line,
      whitelist
    });
    return {
      display_name: matched.canonical?.canonical_name || line,
      sets: '3',
      reps: '10',
      duration: '',
      hold: '',
      side: '',
      frequency: '',
      instructions: ['Perform as prescribed.'],
      videoMode: assignment.videoMode,
      videoSource: assignment.videoSource,
      video_links: assignment.video_links,
      video: assignment.video
    };
  });

  if (!sampleExercises.length) {
    fail('Smoke check failed: parse pipeline produced no exercises.');
  }

  const wallSit = sampleExercises.find(ex => ex.display_name.toLowerCase().includes('wall sit'));
  if (!wallSit || wallSit.videoMode !== 'none' || wallSit.video_links.length !== 0) {
    fail('Smoke check failed: non-whitelisted exercise did not resolve to deterministic fallback.');
  }

  const exportText = buildPlainTextExport({
    exercises: sampleExercises,
    title: 'Home Exercise Program',
    patientName: 'Sample Patient',
    date: '2026-03-29',
    introText: 'Perform as directed.',
    fallbackMessage: VIDEO_MATCHING_CONFIG.fallback.message
  });

  if (!exportText.includes(VIDEO_MATCHING_CONFIG.fallback.message)) {
    fail('Smoke check failed: export output missing deterministic fallback text.');
  }
  if (exportText.includes('Search results may vary')) {
    fail('Smoke check failed: deprecated search disclaimer still appears in export output.');
  }
}

checkRequiredFiles();
checkHtmlIds();
const { exercises, whitelist } = loadRuntimeData();
checkExerciseSchema(exercises);
checkWhitelistIntegrity(exercises, whitelist);
checkWhitelistOnlySmoke(exercises, whitelist);

console.log('Production verification passed.');
