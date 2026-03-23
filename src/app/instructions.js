import { findInstructionTemplate } from './instruction-templates.js';

const WEAK_FRAGMENT_PATTERNS = [
  /\bmaintain posture\b/i,
  /\bengage core\b/i,
  /\bsls hold\b/i,
  /\bbridge up\b/i,
  /\bhold partial squat against wall\b/i,
  /\bposture\b/i,
  /\bactivate\b/i
];

const SHORTHAND_OR_JARGON_PATTERN = /\b(?:sls|tke|rom|arom|saq|laq|eccentric|concentric|isometric)\b/i;

export function resolveExerciseInstructions({
  canonicalExerciseId,
  canonicalName,
  displayName,
  rawInput,
  aliases,
  existingInstructions,
  instructionSource
} = {}) {
  const safeInstructions = sanitizeInstructionLines(existingInstructions);

  if (instructionSource === 'custom' && safeInstructions.length) {
    return {
      instructions: safeInstructions,
      instructionSource: 'custom',
      templateKey: null,
      wasUpgraded: false
    };
  }

  const template = findInstructionTemplate({
    canonicalExerciseId,
    canonicalName,
    displayName,
    rawInput,
    candidateNames: aliases
  });

  if (template) {
    const shouldUpgrade = !safeInstructions.length || isWeakInstructionSet(safeInstructions);
    if (shouldUpgrade) {
      return {
        instructions: [...template.instructions],
        instructionSource: 'template',
        templateKey: template.canonicalKey,
        wasUpgraded: safeInstructions.length > 0
      };
    }
  }

  if (safeInstructions.length) {
    return {
      instructions: safeInstructions,
      instructionSource: instructionSource || 'provided',
      templateKey: template?.canonicalKey || null,
      wasUpgraded: false
    };
  }

  const fallbackName = displayName || canonicalName || 'this exercise';
  return {
    instructions: [
      `Set up for ${String(fallbackName).toLowerCase()} in a comfortable position.`,
      'Move in a slow and controlled way.',
      'Stop and contact your clinician if your symptoms significantly worsen.'
    ],
    instructionSource: 'fallback',
    templateKey: null,
    wasUpgraded: false
  };
}

export function getPatientFacingInstructions(options = {}) {
  return resolveExerciseInstructions(options).instructions;
}

export function isWeakInstructionSet(lines) {
  const safeLines = sanitizeInstructionLines(lines);
  if (!safeLines.length) return true;

  if (safeLines.length === 1 && isWeakInstructionLine(safeLines[0])) return true;

  const combined = safeLines.join(' ');
  if (combined.length < 35) return true;
  if (SHORTHAND_OR_JARGON_PATTERN.test(combined)) return true;

  return safeLines.every(line => {
    const words = line.split(/\s+/).filter(Boolean);
    return words.length < 6;
  });
}

function isWeakInstructionLine(line) {
  const value = String(line || '').trim();
  if (!value) return true;

  if (WEAK_FRAGMENT_PATTERNS.some(pattern => pattern.test(value))) return true;
  if (SHORTHAND_OR_JARGON_PATTERN.test(value)) return true;

  const words = value.split(/\s+/).filter(Boolean);
  if (words.length <= 5) return true;
  if (value.length < 50) return true;

  if (!/[.!?]$/.test(value) && words.length < 10) return true;

  return false;
}

function sanitizeInstructionLines(lines) {
  if (!Array.isArray(lines)) return [];
  return lines.map(line => String(line || '').trim()).filter(Boolean);
}
