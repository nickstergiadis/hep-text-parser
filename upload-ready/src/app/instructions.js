const PATIENT_INSTRUCTION_TEMPLATES = {
  bridge: [
    'Lie on your back with knees bent and feet flat on the floor.',
    'Tighten your belly and squeeze your butt, then lift your hips until your body is in a straight line from shoulders to knees.',
    'Pause, then lower slowly with control.'
  ],
  wall_sit: [
    'Stand with your back against a wall and walk your feet a little forward.',
    'Slide down into a small squat and keep your knees lined up with your toes.',
    'Hold, then slide back up slowly.'
  ],
  sls: [
    'Stand tall near a counter and lift one foot off the floor.',
    'Keep your chest upright and hips level while you balance on one leg.',
    'Lightly touch the counter as needed for safety.'
  ],
  clamshell: [
    'Lie on your side with knees bent and feet together.',
    'Keep your feet touching and lift your top knee without rolling your body backward.',
    'Lower slowly with control.'
  ],
  heel_raise: [
    'Stand tall near a counter with feet hip-width apart.',
    'Press through the balls of your feet to rise up onto your toes.',
    'Lower your heels slowly all the way down.'
  ],
  sit_to_stand: [
    'Sit near the front of a sturdy chair with feet flat.',
    'Lean your chest forward and stand up by pushing through your legs.',
    'Lower back down slowly and touch the chair with control.'
  ],
  row: [
    'Stand or sit tall while holding the band handles.',
    'Pull your elbows back and squeeze your shoulder blades gently.',
    'Return slowly without shrugging your shoulders.'
  ],
  squat: [
    'Stand with feet about shoulder-width apart and toes pointing forward.',
    'Bend at your hips and knees to sit back into a comfortable squat depth.',
    'Keep your knees in line with your toes and stand back up slowly.'
  ],
  lunge: [
    'Stand tall and step one foot forward into a split stance.',
    'Lower straight down by bending both knees, keeping your front heel on the floor.',
    'Keep your front knee lined up with your toes, then push back to start.'
  ],
  calf_stretch: [
    'Stand facing a wall with one leg back and that heel flat on the floor.',
    'Bend your front knee and lean forward until you feel a stretch in your back calf.',
    'Keep your back knee straight and hold without bouncing.'
  ],
  hamstring_stretch: [
    'Lie on your back and loop a strap or towel around one foot.',
    'Keep that knee mostly straight as you gently raise the leg toward the ceiling.',
    'Stop at a mild stretch in the back of your thigh and hold.'
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
