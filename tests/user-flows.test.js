import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { matchExerciseToCanonical, resolveWhitelistedVideo, buildFallbackVideo } from '../src/video/matcher.js';
import { VIDEO_MATCHING_CONFIG } from '../src/video/config.js';
import { buildDoseString, buildEmailDraftHref, buildSummaryText } from '../src/app/output.js';

const exercises = JSON.parse(fs.readFileSync(new URL('../data/exercises_master.json', import.meta.url), 'utf8'));
const whitelist = JSON.parse(fs.readFileSync(new URL('../data/video_whitelist.json', import.meta.url), 'utf8'));

const sampleInputLines = [
  'bridge with band 3x12',
  'SLS 2x15',
  'clamshell 2x12',
  'calf stretch 2x30s each side',
  'wall sit 3x30 sec'
];

test('empty state input produces no exercise rows', () => {
  const lines = ''.split('\n').map(line => line.trim()).filter(Boolean);
  assert.equal(lines.length, 0);
});

test('sample load lines map to canonical exercises', () => {
  const mapped = sampleInputLines.map(line => matchExerciseToCanonical(line, exercises));
  assert.deepEqual(
    mapped.map(row => row.canonical?.exercise_id),
    ['bridge', 'sls', 'clamshell', 'calf_stretch', 'wall_sit']
  );
});

test('canonical alias shorthand maps correctly', () => {
  const row = matchExerciseToCanonical('SLS 2x15', exercises);
  assert.equal(row.canonical.exercise_id, 'sls');
});

test('fallback message is used when no approved whitelist video exists', () => {
  const wallSit = matchExerciseToCanonical('wall sit 3x30 sec', exercises);
  const approved = resolveWhitelistedVideo(wallSit.canonical.exercise_id, whitelist);
  assert.equal(approved, null);
  const fallback = buildFallbackVideo(wallSit.canonical.exercise_id);
  assert.equal(fallback.message, VIDEO_MATCHING_CONFIG.fallback.message);
});

test('copy summary output is deterministic and includes fallback text', () => {
  const summary = buildSummaryText({
    exercises: [{
      display_name: 'Wall Sit',
      sets: '3',
      reps: '',
      duration: '30 sec',
      hold: '',
      side: '',
      frequency: 'daily',
      instructions: ['Slide down a wall and hold with control.'],
      video_links: [],
      video: { message: VIDEO_MATCHING_CONFIG.fallback.message }
    }],
    title: 'Home Exercise Program',
    patientName: 'Sample Patient',
    date: '2026-03-20',
    fallbackMessage: VIDEO_MATCHING_CONFIG.fallback.message,
    forEmail: false
  });

  assert.match(summary, /1\. Wall Sit — 3 sets x 30 sec • daily/);
  assert.match(summary, /Video currently unavailable\./);
});

test('summary output upgrades weak generated instructions via templates', () => {
  const summary = buildSummaryText({
    exercises: [{
      display_name: 'Wall Sit',
      canonical_exercise_id: 'wall_sit',
      canonicalName: 'Wall Sit',
      raw_input: 'wall sit 3x30 sec',
      canonical_aliases: ['wall sit'],
      instruction_source: 'generated',
      sets: '3',
      reps: '',
      duration: '30 sec',
      hold: '',
      side: '',
      frequency: 'daily',
      instructions: ['Hold partial squat against wall.'],
      video_links: [],
      video: { message: VIDEO_MATCHING_CONFIG.fallback.message }
    }],
    title: 'Home Exercise Program',
    patientName: 'Sample Patient',
    date: '2026-03-20',
    fallbackMessage: VIDEO_MATCHING_CONFIG.fallback.message,
    forEmail: false
  });

  assert.match(summary, /back against the wall/i);
  assert.doesNotMatch(summary, /Hold partial squat against wall/i);
});

test('summary includes search disclaimer exactly once when search video links are present', () => {
  const summary = buildSummaryText({
    exercises: [{
      display_name: 'Bridge',
      sets: '3',
      reps: '10',
      duration: '',
      hold: '',
      side: '',
      frequency: 'daily',
      instructions: ['Lift your hips, then lower with control.'],
      video_links: ['https://www.youtube.com/results?search_query=bridge+exercise'],
      video: null
    }, {
      display_name: 'Wall Sit',
      sets: '3',
      reps: '',
      duration: '30 sec',
      hold: '',
      side: '',
      frequency: 'daily',
      instructions: ['Slide down the wall and hold.'],
      video_links: ['https://www.youtube.com/results?search_query=wall+sit+exercise'],
      video: null
    }],
    title: 'Home Exercise Program',
    patientName: 'Sample Patient',
    date: '2026-03-20',
    fallbackMessage: VIDEO_MATCHING_CONFIG.fallback.message,
    forEmail: false
  });

  const matches = summary.match(/Search results may vary\./g) || [];
  assert.equal(matches.length, 1);
});

test('email draft generation produces a safe mailto URL', () => {
  const body = buildSummaryText({
    exercises: [],
    title: 'Home Exercise Program',
    patientName: 'Sample Patient',
    date: '2026-03-20',
    fallbackMessage: VIDEO_MATCHING_CONFIG.fallback.message,
    forEmail: true
  });

  const href = buildEmailDraftHref({
    recipient: 'patient@example.com',
    subject: 'Home Exercise Program - 2026-03-20',
    body
  });

  assert.match(href, /^mailto:patient%40example\.com\?subject=/);
  assert.ok(href.includes('body='));
});
