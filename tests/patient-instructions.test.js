import test from 'node:test';
import assert from 'node:assert/strict';
import { getPatientFacingInstructions } from '../src/app/instructions.js';

test('wall sit terse instruction is upgraded to patient-facing template', () => {
  const instructions = getPatientFacingInstructions({
    canonicalExerciseId: 'wall_sit',
    canonicalName: 'Wall Sit',
    displayName: 'Wall Sit',
    rawInput: 'wall sit 3x30 sec',
    existingInstructions: ['Hold partial squat against wall.']
  });

  assert.equal(instructions.length, 3);
  assert.match(instructions[0], /back against the wall/i);
  assert.match(instructions[1], /knees in line with your toes/i);
});

test('bridge instructions use patient template when canonical text is too short', () => {
  const instructions = getPatientFacingInstructions({
    canonicalExerciseId: 'bridge',
    canonicalName: 'Bridge',
    displayName: 'Bridge',
    rawInput: 'bridge with band',
    existingInstructions: ['Lift hips while keeping ribs down.']
  });

  assert.equal(instructions.length, 3);
  assert.match(instructions.join(' '), /tighten your stomach and glutes/i);
});

test('existing detailed instructions are preserved when already patient-friendly', () => {
  const custom = [
    'Stand tall with one hand on the counter for support.',
    'Lift your heel slowly, then lower with control.',
    'Keep your knees straight and your weight even on both feet.'
  ];

  const instructions = getPatientFacingInstructions({
    canonicalExerciseId: 'heel_raise_double',
    canonicalName: 'Double Leg Heel Raise',
    displayName: 'Double Leg Heel Raise',
    rawInput: 'heel raise 3x10',
    existingInstructions: custom
  });

  assert.deepEqual(instructions, custom);
});

