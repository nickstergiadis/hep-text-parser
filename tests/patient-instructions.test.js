import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveExerciseInstructions } from '../src/app/instructions.js';

test('canonical exercise gets patient-friendly template', () => {
  const result = resolveExerciseInstructions({
    canonicalExerciseId: 'bridge',
    canonicalName: 'Glute Bridge',
    displayName: 'Bridge',
    rawInput: 'bridge 3x10',
    existingInstructions: ['Bridge up.'],
    instructionSource: 'generated'
  });

  assert.equal(result.instructionSource, 'template');
  assert.equal(result.instructions.length, 3);
  assert.match(result.instructions[0], /lie on your back/i);
});

test('alias resolves to canonical template', () => {
  const result = resolveExerciseInstructions({
    canonicalName: 'single leg balance',
    displayName: 'SLS',
    rawInput: 'SLS hold',
    existingInstructions: ['SLS hold.'],
    instructionSource: 'generated'
  });

  assert.equal(result.instructionSource, 'template');
  assert.match(result.instructions.join(' '), /use a wall or counter for support/i);
});

test('weak generated instruction gets upgraded', () => {
  const result = resolveExerciseInstructions({
    canonicalExerciseId: 'wall_sit',
    canonicalName: 'Wall Sit',
    displayName: 'Wall Sit',
    rawInput: 'wall sit 3x30 sec',
    existingInstructions: ['Hold partial squat against wall.'],
    instructionSource: 'generated'
  });

  assert.equal(result.wasUpgraded, true);
  assert.match(result.instructions[0], /back against the wall/i);
});

test('custom user-edited instruction is preserved', () => {
  const custom = [
    'Stand tall with one hand on a counter for support.',
    'Lift your heel slowly, then lower with control.',
    'Keep your knees straight and your weight even on both feet.'
  ];

  const result = resolveExerciseInstructions({
    canonicalExerciseId: 'heel_raise',
    canonicalName: 'Double Leg Heel Raise',
    displayName: 'Double Leg Heel Raise',
    rawInput: 'heel raise 3x10',
    existingInstructions: custom,
    instructionSource: 'custom'
  });

  assert.equal(result.instructionSource, 'custom');
  assert.deepEqual(result.instructions, custom);
});

test('unknown exercise falls back safely', () => {
  const result = resolveExerciseInstructions({
    canonicalName: 'Unknown Drill',
    displayName: 'Unknown Drill',
    rawInput: 'weird thing 2x10',
    existingInstructions: [],
    instructionSource: 'generated'
  });

  assert.equal(result.instructionSource, 'fallback');
  assert.equal(result.instructions.length, 3);
  assert.match(result.instructions[0], /set up for unknown drill/i);
});
