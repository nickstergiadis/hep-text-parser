import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolveExerciseVideoAssignment } from '../src/app/exercise-video.js';
import { VIDEO_MATCHING_CONFIG } from '../src/video/config.js';

const whitelist = JSON.parse(fs.readFileSync(new URL('../data/video_whitelist.json', import.meta.url), 'utf8'));

test('approved whitelist videos are used directly', () => {
  const result = resolveExerciseVideoAssignment({
    canonicalExerciseId: 'bridge',
    exerciseName: 'Bridge',
    whitelist
  });

  assert.equal(result.videoMode, 'whitelist');
  assert.equal(result.videoSource, 'curated');
  assert.equal(result.videoLabel, 'Watch video');
  assert.equal(result.video_links.length, 1);
  assert.match(result.video_links[0], /^https:\/\/www\.youtube\.com\/watch\?/);
});

test('missing whitelist entries use deterministic fallback with no search link', () => {
  const result = resolveExerciseVideoAssignment({
    canonicalExerciseId: 'wall_sit',
    exerciseName: 'Wall Sit',
    whitelist
  });

  assert.equal(result.videoMode, 'none');
  assert.equal(result.videoSource, 'none');
  assert.equal(result.videoLabel, '');
  assert.equal(result.video_links.length, 0);
  assert.equal(result.video.message, VIDEO_MATCHING_CONFIG.fallback.message);
});

test('invalid whitelist urls are rejected for safety', () => {
  const result = resolveExerciseVideoAssignment({
    canonicalExerciseId: 'bridge',
    exerciseName: 'Bridge',
    whitelist: [{
      exercise_id: 'bridge',
      url: 'javascript:alert(1)',
      confidence_tier: 'APPROVED_HIGH_CONFIDENCE',
      active: true
    }]
  });

  assert.equal(result.videoMode, 'none');
  assert.equal(result.videoSource, 'none');
  assert.equal(result.video_links.length, 0);
});

test('returns no link when exercise name is too vague for a useful search', () => {
  const result = resolveExerciseVideoAssignment({
    canonicalExerciseId: null,
    exerciseName: 'Exercise',
    whitelist: []
  });

  assert.equal(result.videoMode, 'none');
  assert.equal(result.videoSource, 'none');
  assert.equal(result.video_links.length, 0);
  assert.equal(result.video.message, VIDEO_MATCHING_CONFIG.fallback.message);
});

test('legacy non-curated direct links are migrated to fallback mode', () => {
  const result = resolveExerciseVideoAssignment({
    canonicalExerciseId: null,
    exerciseName: 'Bird Dog',
    whitelist: [],
    legacyVideoUrl: 'https://www.youtube.com/watch?v=legacy123',
    legacyVideoSource: 'generated'
  });

  assert.equal(result.videoMode, 'none');
  assert.equal(result.videoSource, 'none');
  assert.equal(result.video_links.length, 0);
});

test('legacy search mode payloads are normalized to fallback mode', () => {
  const result = resolveExerciseVideoAssignment({
    canonicalExerciseId: null,
    exerciseName: 'Bridge',
    whitelist: [],
    legacyVideoUrl: 'https://www.youtube.com/results?search_query=bridge+exercise',
    legacyVideoSource: 'search'
  });

  assert.equal(result.videoMode, 'none');
  assert.equal(result.videoSource, 'none');
  assert.equal(result.video_links.length, 0);
  assert.equal(result.video.message, VIDEO_MATCHING_CONFIG.fallback.message);
});
