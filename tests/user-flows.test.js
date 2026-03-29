import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { matchExerciseToCanonical, resolveWhitelistedVideo, buildFallbackVideo } from '../src/video/matcher.js';
import { VIDEO_MATCHING_CONFIG } from '../src/video/config.js';
import { buildDoseString, buildEmailDraftHref, buildEmailHtml, buildPlainTextExport, buildSummaryText, shouldShowSearchVideoDisclaimer } from '../src/app/output.js';
import { resolveExerciseVideoAssignment } from '../src/app/exercise-video.js';
import { parseProgramInput } from '../src/app/parser.js';

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

test('smoke: parse -> video assignment -> export remains whitelist-only and deterministic', () => {
  const parsed = parseProgramInput('bridge 3x12\nwall sit 3x30 sec');
  const built = parsed.sections[0].lines.map((line) => {
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

  const text = buildPlainTextExport({
    exercises: built,
    title: 'Home Exercise Program',
    patientName: 'Sample Patient',
    date: '2026-03-20',
    fallbackMessage: VIDEO_MATCHING_CONFIG.fallback.message
  });

  assert.match(text, /Video currently unavailable\./);
  assert.doesNotMatch(text, /Search results may vary\./);
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

test('summary never includes search disclaimer in whitelist-only runtime', () => {
  const summary = buildSummaryText({
    exercises: [{
      display_name: 'Bridge',
      videoSource: 'search',
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
      videoSource: 'search',
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

  assert.doesNotMatch(summary, /Search results may vary\./);
});

test('summary does not include search disclaimer for curated whitelist links', () => {
  const summary = buildSummaryText({
    exercises: [{
      display_name: 'Bridge',
      videoMode: 'whitelist',
      videoSource: 'curated',
      sets: '3',
      reps: '10',
      duration: '',
      hold: '',
      side: '',
      frequency: 'daily',
      instructions: ['Lift your hips, then lower with control.'],
      video_links: ['https://www.youtube.com/watch?v=approved123'],
      video: null
    }],
    title: 'Home Exercise Program',
    patientName: 'Sample Patient',
    date: '2026-03-20',
    fallbackMessage: VIDEO_MATCHING_CONFIG.fallback.message,
    forEmail: false
  });

  assert.doesNotMatch(summary, /Search results may vary\./);
});

test('explicit curated source suppresses search disclaimer even if links look like search URLs', () => {
  const summary = buildSummaryText({
    exercises: [{
      display_name: 'Bridge',
      videoMode: 'whitelist',
      videoSource: 'curated',
      sets: '3',
      reps: '10',
      duration: '',
      hold: '',
      side: '',
      frequency: 'daily',
      instructions: ['Lift your hips, then lower with control.'],
      video_links: ['https://www.youtube.com/results?search_query=bridge+exercise'],
      video: null
    }],
    title: 'Home Exercise Program',
    patientName: 'Sample Patient',
    date: '2026-03-20',
    fallbackMessage: VIDEO_MATCHING_CONFIG.fallback.message,
    forEmail: false
  });

  assert.doesNotMatch(summary, /Search results may vary\./);
});

test('summary does not include search disclaimer when there are no video links', () => {
  const summary = buildSummaryText({
    exercises: [{
      display_name: 'Wall Sit',
      videoMode: 'none',
      videoSource: 'none',
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

  assert.doesNotMatch(summary, /Search results may vary\./);
});

test('email html rendering remains stable when video mode is none', () => {
  const html = buildEmailHtml({
    exercises: [{
      display_name: 'Wall Sit',
      videoMode: 'none',
      videoSource: 'none',
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
    fallbackMessage: VIDEO_MATCHING_CONFIG.fallback.message
  });

  assert.match(html, /Video: Video currently unavailable\./);
  assert.doesNotMatch(html, /target="_blank"/);
});

test('search disclaimer helper remains disabled for whitelist-only runtime', () => {
  const curated = [{ videoMode: 'whitelist', videoSource: 'curated', video_links: ['https://www.youtube.com/watch?v=approved123'] }];
  const noLinks = [{ videoMode: 'none', videoSource: 'none', video_links: [] }];
  const search = [{ videoMode: 'none', videoSource: 'search', video_links: ['https://www.youtube.com/results?search_query=bridge+exercise'] }];
  const legacySearchLinksWithoutSource = [{ video_links: ['https://www.youtube.com/results?search_query=bridge+exercise'] }];

  assert.equal(shouldShowSearchVideoDisclaimer(curated), false);
  assert.equal(shouldShowSearchVideoDisclaimer(noLinks), false);
  assert.equal(shouldShowSearchVideoDisclaimer(search), false);
  assert.equal(shouldShowSearchVideoDisclaimer(legacySearchLinksWithoutSource), false);
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

test('plain text export includes full video URLs and no HTML tags', () => {
  const text = buildPlainTextExport({
    exercises: [{
      display_name: 'Bridge',
      sets: '3',
      reps: '10',
      duration: '',
      hold: '',
      side: '',
      frequency: 'daily',
      instructions: ['Lift your hips, then lower with control.'],
      video_links: ['https://www.youtube.com/watch?v=approved123'],
      video: null
    }],
    title: 'Home Exercise Program',
    patientName: 'Sample Patient',
    date: '2026-03-20',
    introText: 'Perform as directed.',
    fallbackMessage: VIDEO_MATCHING_CONFIG.fallback.message
  });

  assert.match(text, /Perform as directed\./);
  assert.match(text, /Video: https:\/\/www\.youtube\.com\/watch\?v=approved123/);
  assert.doesNotMatch(text, /<a href=/);
});

test('email HTML export includes clickable video links', () => {
  const html = buildEmailHtml({
    exercises: [{
      display_name: 'Bridge',
      sets: '3',
      reps: '10',
      duration: '',
      hold: '',
      side: '',
      frequency: 'daily',
      instructions: ['Lift your hips, then lower with control.'],
      video_links: ['https://www.youtube.com/watch?v=approved123'],
      video: null
    }],
    title: 'Home Exercise Program',
    patientName: 'Sample Patient',
    date: '2026-03-20',
    introText: 'Perform as directed.',
    fallbackMessage: VIDEO_MATCHING_CONFIG.fallback.message
  });

  assert.match(html, /<a href="https:\/\/www\.youtube\.com\/watch\?v=approved123"/);
  assert.match(html, />Open link<\/a>/);
});


test('plain text export renders multi-section programs in order', () => {
  const text = buildPlainTextExport({
    sections: [
      {
        id: 's1',
        label: 'Daily Mobility',
        exercises: [{
          display_name: 'Chin Tuck',
          sets: '2',
          reps: '10',
          duration: '',
          hold: '',
          side: '',
          frequency: '',
          instructions: ['Gently retract your chin.'],
          video_links: [],
          video: { message: VIDEO_MATCHING_CONFIG.fallback.message }
        }]
      },
      {
        id: 's2',
        label: 'Strength 3-4x/week',
        exercises: [{
          display_name: 'Band Row',
          sets: '3',
          reps: '12',
          duration: '',
          hold: '',
          side: '',
          frequency: '',
          instructions: ['Pull band to your ribs.'],
          video_links: [],
          video: { message: VIDEO_MATCHING_CONFIG.fallback.message }
        }]
      }
    ],
    title: 'Right Shoulder Rehab',
    patientName: 'Sample Patient',
    date: '2026-03-20',
    introText: 'Perform as directed.',
    includeSectionHeadings: true,
    fallbackMessage: VIDEO_MATCHING_CONFIG.fallback.message
  });

  assert.match(text, /Daily Mobility:/);
  assert.match(text, /Strength 3-4x\/week:/);
  assert.ok(text.indexOf('Daily Mobility:') < text.indexOf('Strength 3-4x/week:'));
});

test('email html export renders section headings for combined programs', () => {
  const html = buildEmailHtml({
    sections: [{
      id: 's1',
      label: 'Daily Mobility',
      exercises: [{
        display_name: 'Chin Tuck',
        sets: '2',
        reps: '10',
        duration: '',
        hold: '',
        side: '',
        frequency: '',
        instructions: ['Gently retract your chin.'],
        video_links: ['https://www.youtube.com/watch?v=approved123'],
        video: null
      }]
    }],
    includeSectionHeadings: true,
    title: 'Right Shoulder Rehab',
    patientName: 'Sample Patient',
    date: '2026-03-20',
    introText: '',
    fallbackMessage: VIDEO_MATCHING_CONFIG.fallback.message
  });

  assert.match(html, /<strong>Daily Mobility<\/strong>/);
  assert.match(html, /<strong>1\. Chin Tuck<\/strong>/);
});
