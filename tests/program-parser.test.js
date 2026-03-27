import test from 'node:test';
import assert from 'node:assert/strict';
import { parseProgramInput } from '../src/app/parser.js';

test('single-section legacy input remains a single section without explicit headers', () => {
  const parsed = parseProgramInput('bridge 3x12\nclamshell 2x12\nFrequency: daily');
  assert.equal(parsed.hasExplicitSections, false);
  assert.equal(parsed.sections.length, 1);
  assert.equal(parsed.sections[0].name, 'Exercises');
  assert.deepEqual(parsed.sections[0].lines, ['bridge 3x12', 'clamshell 2x12']);
  assert.equal(parsed.frequencyLine, 'daily');
});

test('program title extraction uses Program: prefix and supports bracket sections', () => {
  const parsed = parseProgramInput('Program: Right Shoulder Rehab\n\n[Daily Mobility]\nChin tuck 2x10');
  assert.equal(parsed.title, 'Right Shoulder Rehab');
  assert.equal(parsed.sections.length, 1);
  assert.equal(parsed.sections[0].rawLabel, 'Daily Mobility');
});

test('bracket headers parse multiple sections in order', () => {
  const parsed = parseProgramInput('[Daily Mobility]\nChin tuck 2x10\n\n[Strength 3-4x/week]\nBand row 3x12');
  assert.equal(parsed.hasExplicitSections, true);
  assert.equal(parsed.sections.length, 2);
  assert.equal(parsed.sections[0].rawLabel, 'Daily Mobility');
  assert.equal(parsed.sections[1].rawLabel, 'Strength 3-4x/week');
  assert.equal(parsed.sections[1].name, 'Strength');
  assert.equal(parsed.sections[1].frequencyLabel, '3-4x/week');
});

test('markdown headers parse multiple sections', () => {
  const parsed = parseProgramInput('## Daily Mobility\nChin tuck 2x10\n\n## Strength 3x/week\nBand row 3x12');
  assert.equal(parsed.sections.length, 2);
  assert.equal(parsed.sections[0].rawLabel, 'Daily Mobility');
  assert.equal(parsed.sections[1].frequencyLabel, '3x/week');
});

test('colon headers parse sections and ignore blank lines', () => {
  const parsed = parseProgramInput('Daily Mobility:\n\nChin tuck 2x10\n\nStrength 3x/week:\nBand row 3x12\n');
  assert.equal(parsed.sections.length, 2);
  assert.deepEqual(parsed.sections[0].lines, ['Chin tuck 2x10']);
  assert.deepEqual(parsed.sections[1].lines, ['Band row 3x12']);
});

test('malformed headers fall back to keeping content lines', () => {
  const parsed = parseProgramInput('[Daily Mobility\nChin tuck 2x10\nStrength 3x/week: Band row 3x12');
  assert.equal(parsed.sections.length, 1);
  assert.deepEqual(parsed.sections[0].lines, ['[Daily Mobility', 'Chin tuck 2x10', 'Strength 3x/week: Band row 3x12']);
});

test('empty sections are discarded', () => {
  const parsed = parseProgramInput('[Daily Mobility]\n\n[Strength]\nBand row 3x12');
  assert.equal(parsed.sections.length, 1);
  assert.equal(parsed.sections[0].rawLabel, 'Strength');
});
