const PATIENT_INSTRUCTION_TEMPLATES = {
  bridge: [
    'Lie on your back with your knees bent and feet flat.',
    'Tighten your stomach and glutes, then lift your hips.',
    'Lower slowly back down.'
  ],
  wall_sit: [
    'Stand with your back against the wall and slide down into a partial squat.',
    'Keep your feet flat and knees in line with your toes.',
    'Hold, then slowly stand back up.'
  ],
  sls: [
    'Stand on one leg while keeping your balance.',
    'Keep your trunk upright and pelvis level.',
    'Use a counter or wall for support if needed.'
  ],
  clamshell: [
    'Lie on your side with your knees bent and feet together.',
    'Keep your hips stacked and lift your top knee.',
    'Lower slowly without rolling backward.'
  ],
  heel_raise: [
    'Stand tall with your feet hip-width apart.',
    'Press through the balls of your feet and rise onto your toes.',
    'Lower your heels slowly with control.'
  ],
  sit_to_stand: [
    'Sit near the front of a sturdy chair with your feet flat.',
    'Lean forward and stand up by pushing through your legs.',
    'Slowly lower back to the chair with control.'
  ],
  row: [
    'Stand or sit tall while holding the band handles.',
    'Pull your elbows back and squeeze your shoulder blades gently.',
    'Return slowly without shrugging your shoulders.'
  ],
  squat: [
    'Stand with your feet about shoulder-width apart.',
    'Bend your hips and knees to lower into a comfortable squat.',
    'Keep your knees in line with your toes and stand back up slowly.'
  ],
  lunge: [
    'Stand tall and step one foot forward into a split stance.',
    'Lower your body by bending both knees in a controlled way.',
    'Keep your front knee over your toes and push back to start.'
  ],
  calf_stretch: [
    'Stand facing a wall with one foot back and heel down.',
    'Lean forward until you feel a stretch in your back calf.',
    'Keep your back knee straight and hold the stretch.'
  ],
  hamstring_stretch: [
    'Lie on your back and lift one leg with a strap or towel.',
    'Keep your knee mostly straight as you gently pull the leg up.',
    'Stop when you feel a stretch in the back of your thigh and hold.'
  ]
};

const TEMPLATE_ALIASES = {
  bridge: 'bridge',
  'glute bridge': 'bridge',
  bridging: 'bridge',
  'wall sit': 'wall_sit',
  'wall squat': 'wall_sit',
  sls: 'sls',
  'single leg stance': 'sls',
  'single leg balance': 'sls',
  clamshell: 'clamshell',
  'clam shell': 'clamshell',
  'heel raise': 'heel_raise',
  'calf raise': 'heel_raise',
  'sit to stand': 'sit_to_stand',
  'chair squat': 'sit_to_stand',
  row: 'row',
  'band row': 'row',
  squat: 'squat',
  'mini squat': 'squat',
  'partial squat': 'squat',
  lunge: 'lunge',
  'calf stretch': 'calf_stretch',
  'hamstring stretch': 'hamstring_stretch'
};

const NON_PATIENT_TERMS = /\b(?:sls|arom|rom|tke|eccentric|concentric|isometric)\b/i;

export function getPatientFacingInstructions({
  canonicalExerciseId,
  canonicalName,
  displayName,
  rawInput,
  existingInstructions
}) {
  const safeInstructions = sanitizeInstructionLines(existingInstructions);
  const templateKey = resolveTemplateKey({ canonicalExerciseId, canonicalName, displayName, rawInput });
  const template = templateKey ? PATIENT_INSTRUCTION_TEMPLATES[templateKey] : null;

  if (template && shouldUseTemplate(safeInstructions)) {
    return [...template];
  }
  if (safeInstructions.length) return safeInstructions;

  const fallbackName = displayName || canonicalName || 'this exercise';
  return [
    `Set up for ${String(fallbackName).toLowerCase()} in a comfortable position.`,
    'Move in a slow and controlled way.',
    'Stop and contact your clinician if your symptoms significantly worsen.'
  ];
}

function shouldUseTemplate(lines) {
  if (!lines.length) return true;
  if (lines.length === 1) {
    const line = lines[0];
    if (line.split(/\s+/).length < 8) return true;
    if (line.length < 55) return true;
  }
  return lines.some(line => NON_PATIENT_TERMS.test(line));
}

function resolveTemplateKey({ canonicalExerciseId, canonicalName, displayName, rawInput }) {
  const candidates = [
    canonicalExerciseId,
    canonicalName,
    displayName,
    rawInput
  ].filter(Boolean).map(value => normalizeKey(value));

  for (const candidate of candidates) {
    if (PATIENT_INSTRUCTION_TEMPLATES[candidate]) return candidate;
  }

  for (const candidate of candidates) {
    for (const [alias, key] of Object.entries(TEMPLATE_ALIASES)) {
      const normalizedAlias = normalizeKey(alias);
      if (candidate === normalizedAlias || candidate.includes(normalizedAlias)) return key;
    }
  }

  return null;
}

function sanitizeInstructionLines(lines) {
  if (!Array.isArray(lines)) return [];
  return lines.map(line => String(line || '').trim()).filter(Boolean);
}

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s/g, '_');
}

