import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { matchExerciseToCanonical, buildFallbackVideo, resolveWhitelistedVideo } from '../src/video/matcher.js';
import { scoreCandidate } from '../src/video/scoring.js';
import { CONFIDENCE_TIERS } from '../src/video/config.js';

const exercises = JSON.parse(fs.readFileSync(new URL('../data/exercises_master.json', import.meta.url), 'utf8'));
const whitelist = JSON.parse(fs.readFileSync(new URL('../data/video_whitelist.json', import.meta.url), 'utf8'));

test('normalization + alias matching maps sls to Single Leg Stance', () => {
  const res = matchExerciseToCanonical('SLS 2x15 hold 5 sec', exercises);
  assert.equal(res.canonical.exercise_id, 'sls');
  assert.ok(res.matchScore >= 90);
});

test('score calculation gives high confidence for high quality candidate', () => {
  const exercise = exercises.find(e => e.exercise_id === 'bridge');
  const candidate = {
    youtube_video_id: 'abc123',
    title: 'Bridge physical therapy exercise form',
    description: 'Bridge hip extension glute activation for hip and lumbar rehab.',
    channel_title: 'Rehab PT Clinic',
    duration_seconds: 90,
    embeddable: true,
    public: true
  };
  const scored = scoreCandidate({ exercise, candidate, existing: [] });
  assert.notEqual(scored.tier, CONFIDENCE_TIERS.REJECTED);
});

test('ambiguous clickbait variant is rejected', () => {
  const exercise = exercises.find(e => e.exercise_id === 'clamshell');
  const candidate = {
    youtube_video_id: 'bad1',
    title: 'Best knee exercise fix pain fast',
    description: 'No clear clamshell instruction.',
    channel_title: 'Fitness Hacks',
    duration_seconds: 1200,
    embeddable: true,
    public: true,
    variation_mismatch: true
  };
  const scored = scoreCandidate({ exercise, candidate, existing: [] });
  assert.equal(scored.tier, CONFIDENCE_TIERS.REJECTED);
});

test('broken/missing approved videos return stable fallback', () => {
  const approved = resolveWhitelistedVideo('nonexistent', whitelist);
  assert.equal(approved, null);
  const fallback = buildFallbackVideo('nonexistent');
  assert.equal(fallback.message, 'Video currently unavailable.');
  assert.equal(fallback.embed_url, null);
});

test('end-to-end parsed text maps to approved video for bridge', () => {
  const mapping = matchExerciseToCanonical('bridge 3x12', exercises);
  const approved = resolveWhitelistedVideo(mapping.canonical.exercise_id, whitelist);
  assert.equal(mapping.canonical.exercise_id, 'bridge');
  assert.equal(approved.confidence_tier, CONFIDENCE_TIERS.APPROVED_HIGH_CONFIDENCE);
});
