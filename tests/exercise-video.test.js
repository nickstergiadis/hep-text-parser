import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolveExerciseVideoAssignment } from '../src/app/exercise-video.js';
import { VIDEO_MATCHING_CONFIG } from '../src/video/config.js';

const whitelist = JSON.parse(fs.readFileSync(new URL('../data/video_whitelist.json', import.meta.url), 'utf8'));

test('approved whitelist videos are used directly', () => {
  const result = resolveExerciseVideoAssignment({
    canonicalExerciseId: 'bridge',
    whitelist
  });

  assert.equal(result.videoMode, 'whitelist');
  assert.equal(result.video_links.length, 1);
  assert.match(result.video_links[0], /^https:\/\/www\.youtube\.com\/watch\?/);
});

test('missing whitelist entries return deterministic fallback', () => {
  const result = resolveExerciseVideoAssignment({
    canonicalExerciseId: 'wall_sit',
    whitelist
  });

  assert.equal(result.videoMode, 'none');
  assert.equal(result.video_links.length, 0);
  assert.equal(result.video.message, VIDEO_MATCHING_CONFIG.fallback.message);
});

test('invalid whitelist urls are rejected for safety', () => {
  const result = resolveExerciseVideoAssignment({
    canonicalExerciseId: 'bridge',
    whitelist: [{
      exercise_id: 'bridge',
      url: 'javascript:alert(1)',
      confidence_tier: 'APPROVED_HIGH_CONFIDENCE',
      active: true
    }]
  });

  assert.equal(result.videoMode, 'none');
  assert.equal(result.video_links.length, 0);
});
