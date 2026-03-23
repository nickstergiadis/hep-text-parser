const TEMPLATE_DEFINITIONS = [
  {
    canonicalKey: 'bridge',
    aliases: ['bridge', 'glute bridge', 'bridging'],
    instructions: [
      'Lie on your back with your knees bent and feet flat.',
      'Tighten your stomach and glutes, then lift your hips.',
      'Lower slowly back down.'
    ]
  },
  {
    canonicalKey: 'wall_sit',
    aliases: ['wall sit', 'wall squat hold', 'wall squat', 'wall sit hold'],
    instructions: [
      'Stand with your back against the wall and slide down into a partial squat.',
      'Keep your feet flat and knees in line with your toes.',
      'Hold, then slowly stand back up.'
    ]
  },
  {
    canonicalKey: 'single_leg_stance',
    aliases: ['single leg stance', 'single leg balance', 'single leg stand', 'sls'],
    instructions: [
      'Stand on one leg while keeping your balance.',
      'Keep your trunk upright and pelvis level.',
      'Use a wall or counter for support if needed.'
    ]
  },
  {
    canonicalKey: 'clamshell',
    aliases: ['clamshell', 'clam shell'],
    instructions: [
      'Lie on your side with your knees bent and feet together.',
      'Keep your feet touching as you lift your top knee.',
      'Lower slowly without rolling your hips backward.'
    ]
  },
  {
    canonicalKey: 'side_lying_hip_abduction',
    aliases: ['side lying hip abduction', 'sidelying hip abduction', 'side-lying hip abduction'],
    instructions: [
      'Lie on your side with your bottom knee bent for support.',
      'Keep your top leg straight and lift it up slightly in front of your body.',
      'Lower slowly with control.'
    ]
  },
  {
    canonicalKey: 'heel_raise',
    aliases: ['heel raise', 'calf raise', 'double leg heel raise', 'single leg heel raise'],
    instructions: [
      'Stand tall with your hands on a wall or counter if needed.',
      'Press through your toes to lift your heels.',
      'Lower your heels slowly to the floor.'
    ]
  },
  {
    canonicalKey: 'sit_to_stand',
    aliases: ['sit to stand', 'sit-to-stand', 'chair stand'],
    instructions: [
      'Sit near the front of a sturdy chair with your feet flat.',
      'Lean forward and stand up by pushing through your legs.',
      'Lower back to the chair slowly with control.'
    ]
  },
  {
    canonicalKey: 'squat',
    aliases: ['squat', 'bodyweight squat', 'mini squat', 'partial squat'],
    instructions: [
      'Stand with your feet about shoulder-width apart.',
      'Bend your hips and knees to sit back into a comfortable squat depth.',
      'Keep your knees in line with your toes as you stand back up.'
    ]
  },
  {
    canonicalKey: 'lunge',
    aliases: ['lunge', 'split squat', 'forward lunge', 'reverse lunge'],
    instructions: [
      'Start in a split stance with one foot in front of the other.',
      'Lower straight down by bending both knees.',
      'Push through your front leg to return to the start.'
    ]
  },
  {
    canonicalKey: 'step_up',
    aliases: ['step up', 'step-up'],
    instructions: [
      'Stand facing a step with one foot on the step.',
      'Push through the foot on the step and stand tall.',
      'Step back down slowly with control.'
    ]
  },
  {
    canonicalKey: 'step_down',
    aliases: ['step down', 'step-down'],
    instructions: [
      'Stand on a step near a rail or wall for support.',
      'Slowly lower one foot toward the floor by bending the standing knee.',
      'Return to standing on the step with control.'
    ]
  },
  {
    canonicalKey: 'row',
    aliases: ['row', 'band row', 'standing row', 'resistance row'],
    instructions: [
      'Hold the band with your arms straight in front of you.',
      'Pull your elbows back and gently squeeze your shoulder blades together.',
      'Return slowly with control.'
    ]
  },
  {
    canonicalKey: 'shoulder_external_rotation_band',
    aliases: ['shoulder external rotation with band', 'band external rotation', 'external rotation with band'],
    instructions: [
      'Stand tall with your elbow bent to 90 degrees at your side.',
      'Keep your elbow tucked in as you rotate your forearm away from your body.',
      'Return slowly without shrugging your shoulder.'
    ]
  },
  {
    canonicalKey: 'scapular_retraction',
    aliases: ['scapular retraction', 'shoulder blade squeeze'],
    instructions: [
      'Sit or stand tall with your arms relaxed.',
      'Gently draw your shoulder blades back and down.',
      'Relax and repeat without arching your low back.'
    ]
  },
  {
    canonicalKey: 'chin_tuck',
    aliases: ['chin tuck', 'cervical retraction'],
    instructions: [
      'Sit or stand tall and look straight ahead.',
      'Gently tuck your chin straight back as if making a double chin.',
      'Hold briefly, then relax.'
    ]
  },
  {
    canonicalKey: 'dead_bug',
    aliases: ['dead bug', 'deadbug'],
    instructions: [
      'Lie on your back with knees and hips bent, and arms up toward the ceiling.',
      'Slowly lower one arm and the opposite leg while keeping your back flat.',
      'Return to start and switch sides.'
    ]
  },
  {
    canonicalKey: 'bird_dog',
    aliases: ['bird dog', 'birddog', 'quadruped arm leg raise'],
    instructions: [
      'Start on your hands and knees with your back flat.',
      'Reach one arm forward and the opposite leg back.',
      'Return with control and switch sides.'
    ]
  },
  {
    canonicalKey: 'cat_camel',
    aliases: ['cat camel', 'cat cow', 'cat-cow'],
    instructions: [
      'Start on your hands and knees.',
      'Round your back up, then slowly drop your belly and lift your chest.',
      'Move gently through a comfortable range.'
    ]
  },
  {
    canonicalKey: 'childs_pose',
    aliases: ["child's pose", 'childs pose'],
    instructions: [
      'Kneel on the floor and sit your hips back toward your heels.',
      'Reach your arms forward and lower your chest toward the floor.',
      'Breathe slowly and relax into the stretch.'
    ]
  },
  {
    canonicalKey: 'hamstring_stretch',
    aliases: ['hamstring stretch', 'supine hamstring stretch'],
    instructions: [
      'Lie on your back and lift one leg with a strap or towel.',
      'Keep your knee mostly straight as you raise the leg to a gentle stretch.',
      'Hold without bouncing, then switch sides.'
    ]
  },
  {
    canonicalKey: 'calf_stretch',
    aliases: ['calf stretch', 'gastroc stretch'],
    instructions: [
      'Stand facing a wall with one leg back and heel down.',
      'Bend your front knee and lean forward until you feel a stretch in your back calf.',
      'Keep your back knee straight and hold.'
    ]
  },
  {
    canonicalKey: 'hip_flexor_stretch',
    aliases: ['hip flexor stretch', 'kneeling hip flexor stretch'],
    instructions: [
      'Start in a half-kneeling position with one knee on the floor.',
      'Tuck your pelvis slightly and shift your weight forward.',
      'Hold a gentle stretch in the front of your hip.'
    ]
  },
  {
    canonicalKey: 'quad_stretch',
    aliases: ['quad stretch', 'quadriceps stretch'],
    instructions: [
      'Stand tall and hold a wall or counter for balance.',
      'Bend one knee and bring your heel toward your buttock.',
      'Keep your knees close together and hold the stretch.'
    ]
  },
  {
    canonicalKey: 'piriformis_stretch',
    aliases: ['piriformis stretch', 'figure 4 stretch', 'figure-4 stretch'],
    instructions: [
      'Lie on your back with both knees bent.',
      'Cross one ankle over the opposite knee to make a figure 4.',
      'Pull the uncrossed leg toward you until you feel a stretch in your hip.'
    ]
  },
  {
    canonicalKey: 'open_book',
    aliases: ['open book', 'open-book'],
    instructions: [
      'Lie on your side with knees bent and arms straight in front of you.',
      'Open your top arm across your body and rotate your chest toward the other side.',
      'Return slowly and repeat.'
    ]
  },
  {
    canonicalKey: 'thoracic_rotation',
    aliases: ['thoracic rotation', 't spine rotation', 't-spine rotation'],
    instructions: [
      'Sit or kneel tall with your hands across your chest.',
      'Rotate your upper back to one side while keeping your hips steady.',
      'Return to center and repeat on the other side.'
    ]
  },
  {
    canonicalKey: 'wall_angel',
    aliases: ['wall angel', 'wall angels'],
    instructions: [
      'Stand with your back against the wall and elbows bent at shoulder height.',
      'Slide your arms up and down the wall in a pain-free range.',
      'Keep your ribs down and neck relaxed.'
    ]
  },
  {
    canonicalKey: 'pelvic_tilt',
    aliases: ['pelvic tilt', 'posterior pelvic tilt'],
    instructions: [
      'Lie on your back with your knees bent and feet flat.',
      'Gently flatten your low back into the floor by tightening your stomach.',
      'Relax and repeat with smooth breathing.'
    ]
  },
  {
    canonicalKey: 'straight_leg_raise',
    aliases: ['straight leg raise', 'slr'],
    instructions: [
      'Lie on your back with one knee bent and the other leg straight.',
      'Tighten your thigh and lift the straight leg to about knee height.',
      'Lower slowly with control.'
    ]
  },
  {
    canonicalKey: 'terminal_knee_extension',
    aliases: ['terminal knee extension', 'tke', 'terminal knee extension with band'],
    instructions: [
      'Stand with a band behind your knee and your knee slightly bent.',
      'Straighten your knee by tightening your thigh muscle.',
      'Slowly return to the starting bend.'
    ]
  },
  {
    canonicalKey: 'quad_set',
    aliases: ['quad set', 'quadriceps set'],
    instructions: [
      'Sit or lie with your leg straight and supported.',
      'Tighten the front of your thigh to press the back of your knee down.',
      'Hold briefly, then relax.'
    ]
  },
  {
    canonicalKey: 'short_arc_quad',
    aliases: ['short arc quad', 'saq'],
    instructions: [
      'Lie on your back with a rolled towel under your knee.',
      'Straighten your knee by lifting your foot until your leg is almost straight.',
      'Lower slowly back to the towel.'
    ]
  },
  {
    canonicalKey: 'long_arc_quad',
    aliases: ['long arc quad', 'laq'],
    instructions: [
      'Sit tall in a chair with your feet on the floor.',
      'Straighten one knee until your leg is level.',
      'Lower slowly and repeat.'
    ]
  }
];

function normalizeInstructionName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const TEMPLATE_BY_CANONICAL_KEY = new Map();
const TEMPLATE_BY_ALIAS = new Map();

for (const template of TEMPLATE_DEFINITIONS) {
  TEMPLATE_BY_CANONICAL_KEY.set(normalizeInstructionName(template.canonicalKey), template);
  for (const alias of template.aliases) {
    TEMPLATE_BY_ALIAS.set(normalizeInstructionName(alias), template.canonicalKey);
  }
}

function findTemplateKeyByCandidate(candidate) {
  const normalized = normalizeInstructionName(candidate);
  if (!normalized) return null;

  if (TEMPLATE_BY_CANONICAL_KEY.has(normalized)) {
    return TEMPLATE_BY_CANONICAL_KEY.get(normalized).canonicalKey;
  }

  if (TEMPLATE_BY_ALIAS.has(normalized)) {
    return TEMPLATE_BY_ALIAS.get(normalized);
  }

  for (const [alias, key] of TEMPLATE_BY_ALIAS.entries()) {
    if (normalized.includes(alias)) return key;
  }

  return null;
}

export function findInstructionTemplate(input = {}) {
  const candidates = [
    ...(Array.isArray(input.candidateNames) ? input.candidateNames : []),
    input.canonicalExerciseId,
    input.canonicalName,
    input.displayName,
    input.rawInput
  ];

  for (const candidate of candidates) {
    const key = findTemplateKeyByCandidate(candidate);
    if (!key) continue;
    const template = TEMPLATE_BY_CANONICAL_KEY.get(normalizeInstructionName(key));
    if (template) return template;
  }

  return null;
}

export function getInstructionTemplateDefinitions() {
  return TEMPLATE_DEFINITIONS.map(template => ({ ...template, instructions: [...template.instructions], aliases: [...template.aliases] }));
}

export { normalizeInstructionName };
