/*
 * HEP Program Generator (with video links)
 *
 * This script powers the web app for building home exercise programs from a rough list of
 * exercises. It performs basic parsing of clinician shorthand, looks up default
 * instructions and video links for recognised exercises, and renders editable
 * forms and a patient-friendly preview. Users can then print a PDF, copy a
 * summary or open an email draft.
 */

const EXERCISE_LIBRARY = [
  {
    key: 'leg_press',
    aliases: ['leg press', 'machine leg press', 'legpress'],
    displayName: 'Leg Press',
    instructions: [
      'Place your feet shoulder‑width apart on the platform.',
      'Release the weight and extend your legs fully without locking your knees.',
      'Lower the weight until your legs are bent at about 90 degrees, keeping your back against the pad.',
      'Push the platform back to the starting position in a controlled manner.'
    ],
    video: 'https://www.youtube.com/watch?v=ahaJTts1f3s'
  },
  {
    key: 'single_leg_stance',
    aliases: ['sls', 'single leg stance', 'single‑leg stance', 'single leg balance'],
    displayName: 'Single Leg Stance',
    instructions: [
      'Stand upright with your feet together, using a chair or wall for support if needed.',
      'Lift one foot off the ground and balance on the other leg.',
      'Maintain your balance for a few seconds while keeping your torso upright.',
      'Switch legs and repeat for the prescribed reps.'
    ],
    video: 'https://www.youtube.com/watch?v=J4N1--V1JwY'
  },
  {
    key: 'jumping_jacks',
    aliases: ['jumping jacks', 'star jumps', 'jumpingjack'],
    displayName: 'Jumping Jacks',
    instructions: [
      'Stand upright with your feet together and arms by your sides.',
      'Jump up while spreading your feet apart and raising your arms overhead.',
      'Jump again to return to the starting position with feet together and arms down.',
      'Repeat rhythmically, landing softly and keeping your core engaged.'
    ],
    video: 'https://www.youtube.com/watch?v=c4DAnQ6DtF8'
  },
  {
    key: 'calf_stretch',
    aliases: ['calf stretch', 'calf stretch wall', 'wall calf stretch'],
    displayName: 'Calf Stretch',
    instructions: [
      'Stand facing a wall and place one foot forward and one foot back.',
      'Rest your hands on the wall and keep your heels, hips and head aligned.',
      'Lean forward slowly until you feel a stretch in the calf of the back leg.',
      'Hold the stretch for 15–30 seconds then switch legs.'
    ],
    video: 'https://www.youtube.com/watch?v=Ktn6HC5ItvI'
  },
  {
    key: 'bridge',
    aliases: ['bridge', 'glute bridge', 'hip bridge'],
    displayName: 'Glute Bridge',
    instructions: [
      'Lie on your back with your knees bent and feet flat on the floor.',
      'Press your lower back into the floor, tighten your abdominal and buttock muscles.',
      'Lift your hips until your body forms a straight line from knees to shoulders.',
      'Hold for a few seconds at the top, then slowly lower back down.'
    ],
    video: 'https://www.youtube.com/watch?v=fAP9tQ5nnUs'
  },
  {
    key: 'clamshell',
    aliases: ['clamshell', 'clam shell', 'clams'],
    displayName: 'Clamshell',
    instructions: [
      'Lie on your side with your hips stacked and knees bent.',
      'Keep your feet together and gently brace your core.',
      'Lift your top knee while keeping your feet together and hips steady.',
      'Lower your knee slowly to the starting position and repeat.'
    ],
    video: 'https://www.youtube.com/watch?v=2W4ZNSwoW_4'
  },
  {
    key: 'wall_sit',
    aliases: ['wall sit', 'wall sits'],
    displayName: 'Wall Sit',
    instructions: [
      'Stand with your back against a wall and your feet about hip‑width apart.',
      'Walk your feet forward roughly two feet and slide your back down the wall.',
      'Stop when your thighs are parallel to the ground and your knees are above your ankles.',
      'Hold the position for the prescribed time, then slide back up and rest.'
    ],
    video: 'https://www.youtube.com/watch?v=y-wV4Venusw'
  },
  {
    key: 'seated_row',
    aliases: ['seated row', 'band seated row', 'resistance band seated row', 'row'],
    displayName: 'Seated Row (Band)',
    instructions: [
      'Sit on the floor with your legs extended and wrap a resistance band around your feet.',
      'Sit tall with a neutral spine and extend your arms forward holding the band.',
      'Engage your core and pull the band toward your torso, squeezing your shoulder blades.',
      'Keep your elbows close to your body and then slowly return to the starting position.'
    ],
    video: 'https://www.youtube.com/watch?v=55-sf5LGfvc'
  },
  {
    key: 'lateral_walk',
    aliases: ['lateral walk', 'banded lateral walk', 'side steps', 'side step', 'side steps band'],
    displayName: 'Banded Lateral Walk',
    instructions: [
      'Place a resistance band around your thighs or ankles and stand with your feet hip‑width apart.',
      'Bend your knees slightly and hinge forward into a quarter squat, keeping your back straight.',
      'Take small steps to one side while keeping tension on the band and maintaining a slight forward lean.',
      'Avoid letting your knees cave in; repeat for the desired reps then switch directions.'
    ],
    video: 'https://www.youtube.com/watch?v=j2BShH4rp94'
  },
  {
    key: 'push_up',
    aliases: ['push up', 'pushup', 'push-ups', 'pushups'],
    displayName: 'Push‑Up',
    instructions: [
      'Start in a high plank position with your hands slightly wider than shoulder‑width apart.',
      'Engage your core and glutes to keep your body straight and your neck neutral.',
      'Lower your body by bending your elbows at about a 45° angle until your chest is just above the floor.',
      'Push back up through your hands to the starting position.'
    ],
    video: 'https://www.youtube.com/watch?v=_l3ySVKYVJ8'
  }
];

// Escape HTML to prevent injection when rendering user input into the page
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Normalise units for duration/hold strings
function normaliseTimeUnit(unit) {
  const val = unit.toLowerCase();
  if (['s', 'sec', 'secs', 'second', 'seconds'].includes(val)) return 'sec';
  if (['min', 'mins', 'minute', 'minutes'].includes(val)) return 'min';
  return unit;
}

// Remove matched fragment from a string and clean leftover punctuation
function removeFragment(base, fragment) {
  return base.replace(fragment, '').replace(/^[,\\s]+|[,\\s]+$/g, '').trim();
}

// Find an exercise in the library by alias
function findLibraryEntry(name) {
  const lower = name.toLowerCase();
  return EXERCISE_LIBRARY.find(item =>
    item.aliases.some(alias => lower === alias || lower.includes(alias))
  );
}

// Parse a single exercise line
function parseLine(line, frequency = '') {
  let cleaned = line
    .replace(/^\\d+[\\.\\)\\-\\s]*/, '')
    .replace(/^•\\s*/, '')
    .trim();

  const parts = cleaned.split(/\\s+[–—-]\\s+/);
  let name = cleaned;
  let details = '';
  if (parts.length >= 2) {
    name = parts[0].trim();
    details = parts.slice(1).join(' - ').trim();
  }

  details = details.replace(/^[,\\s]+|[,\\s]+$/g, '');

  let sets = '';
  let reps = '';
  let hold = '';
  let duration = '';
  let side = '';
  let notes = details;

  const setsDurationMatch = details.match(/(\\d+)\\s*x\\s*(\\d+)\\s*(s|sec|secs|second|seconds|min|mins|minute|minutes)\\b/i);
  if (setsDurationMatch) {
    sets = setsDurationMatch[1];
    duration = `${setsDurationMatch[2]} ${normaliseTimeUnit(setsDurationMatch[3])}`;
    notes = removeFragment(notes, setsDurationMatch[0]);
  } else {
    const setsRepsMatch = details.match(/(\\d+)\\s*x\\s*(\\d+)/i);
    if (setsRepsMatch) {
      sets = setsRepsMatch[1];
      reps = setsRepsMatch[2];
      notes = removeFragment(notes, setsRepsMatch[0]);
    }
  }

  const holdMatch = details.match(/(\\d+)\\s*[-]?\\s*(second|seconds|sec|secs)\\s*holds?/i);
  if (holdMatch) {
    hold = `${holdMatch[1]} sec`;
    notes = removeFragment(notes, holdMatch[0]);
  }

  const sideMatch = details.match(/each side|per side|each leg|each arm/i);
  if (sideMatch) {
    side = sideMatch[0];
    notes = removeFragment(notes, sideMatch[0]);
  }

  notes = notes.replace(/^,+|,+$/g, '').trim();

  const entry = findLibraryEntry(name);
  return {
    rawName: name,
    name: entry ? entry.displayName : name,
    sets,
    reps,
    duration,
    hold,
    side,
    frequency,
    notes,
    instructions: entry ? [...entry.instructions] : [],
    video: entry ? entry.video : ''
  };
}

// Parse the full textarea input
function parseInput(text) {
  const lines = text
    .split(/\\n+/)
    .map(l => l.trim())
    .filter(l => l.length > 0);
  let frequency = '';
  const exerciseLines = [];
  lines.forEach(line => {
    if (/^frequency:/i.test(line)) {
      frequency = line.replace(/^frequency:/i, '').trim();
    } else {
      exerciseLines.push(line);
    }
  });
  return exerciseLines.map(line => parseLine(line, frequency)).filter(item => item.rawName);
}

// Build a dosage string from an exercise object
function buildDoseString(ex) {
  const parts = [];
  if (ex.sets && ex.reps) {
    parts.push(`${ex.sets} sets x ${ex.reps} reps`);
  } else if (ex.sets && ex.duration) {
    parts.push(`${ex.sets} sets x ${ex.duration}`);
  } else if (ex.duration) {
    parts.push(ex.duration);
  }
  if (ex.hold) {
    parts.push(`${ex.hold} hold`);
  }
  if (ex.side) {
    parts.push(ex.side);
  }
  if (ex.frequency) {
    parts.push(ex.frequency);
  }
  return parts.join(' • ');
}

// Render editable exercise cards
function renderEditableExercises(exercises) {
  const container = document.getElementById('editableExercises');
  container.innerHTML = '';
  exercises.forEach((ex, index) => {
    const card = document.createElement('div');
    card.className = 'editable-card';
    card.innerHTML = `
      <h3>Exercise ${index + 1}</h3>
      <div class="editable-grid">
        <div>
          <label>Name</label>
          <input type="text" value="${escapeHtml(ex.name)}" data-field="name" data-index="${index}" />
        </div>
        <div>
          <label>Sets</label>
          <input type="text" value="${escapeHtml(ex.sets)}" data-field="sets" data-index="${index}" />
        </div>
        <div>
          <label>Reps</label>
          <input type="text" value="${escapeHtml(ex.reps)}" data-field="reps" data-index="${index}" />
        </div>
        <div>
          <label>Duration</label>
          <input type="text" value="${escapeHtml(ex.duration)}" data-field="duration" data-index="${index}" />
        </div>
        <div>
          <label>Hold</label>
          <input type="text" value="${escapeHtml(ex.hold)}" data-field="hold" data-index="${index}" />
        </div>
        <div>
          <label>Side</label>
          <input type="text" value="${escapeHtml(ex.side)}" data-field="side" data-index="${index}" />
        </div>
        <div>
          <label>Frequency</label>
          <input type="text" value="${escapeHtml(ex.frequency)}" data-field="frequency" data-index="${index}" />
        </div>
        <div>
          <label>Video URL</label>
          <input type="text" value="${escapeHtml(ex.video)}" data-field="video" data-index="${index}" />
        </div>
      </div>
      <div class="field-block">
        <label>Instructions (one per line)</label>
        <textarea rows="3" data-field="instructions" data-index="${index}">${escapeHtml(ex.instructions.join('\\n'))}</textarea>
      </div>
      <div class="field-block">
        <label>Notes</label>
        <textarea rows="2" data-field="notes" data-index="${index}">${escapeHtml(ex.notes)}</textarea>
      </div>
    `;
    container.appendChild(card);
  });
}

// Handle changes in editable form
function handleEditableInput(event) {
  const target = event.target;
  const index = parseInt(target.getAttribute('data-index'), 10);
  const field = target.getAttribute('data-field');
  if (isNaN(index) || !field) return;
  if (field === 'instructions') {
    editableExercises[index].instructions = target.value
      .split(/\\n+/)
      .map(l => l.trim())
      .filter(l => l.length > 0);
  } else {
    editableExercises[index][field] = target.value.trim();
  }
}

// Render the program preview
function renderPreview() {
  const previewSection = document.getElementById('previewSection');
  const previewTitle = document.getElementById('previewTitle');
  const previewPatient = document.getElementById('previewPatient');
  const previewDate = document.getElementById('previewDate');
  const previewIntro = document.getElementById('previewIntro');
  const previewExercises = document.getElementById('previewExercises');

  const titleVal = document.getElementById('programTitle').value.trim() || 'Home Exercise Program';
  const patientVal = document.getElementById('patientName').value.trim() || '—';
  const dateVal = document.getElementById('programDate').value || '';
  previewTitle.textContent = titleVal;
  previewPatient.textContent = `Patient: ${patientVal}`;
  previewDate.textContent = dateVal ? `Date: ${dateVal}` : '';
  const introVal = document.getElementById('introText').value.trim() || '';
  previewIntro.textContent = introVal;

  previewExercises.innerHTML = '';
  editableExercises.forEach((ex, index) => {
    const card = document.createElement('div');
    card.className = 'exercise-card';
    const dose = buildDoseString(ex);
    const nameHtml = escapeHtml(ex.name);
    const instructionsHtml = ex.instructions.map(step => `<li>${escapeHtml(step)}</li>`).join('');
    const notesHtml = ex.notes ? `<p class="exercise-notes"><strong>Notes:</strong> ${escapeHtml(ex.notes)}</p>` : '';
    const videoHtml = ex.video ? `<p class="exercise-video"><a href="${escapeHtml(ex.video)}" target="_blank">Video demo</a></p>` : '';

    card.innerHTML = `
      <div class="exercise-top">
        <div><p class="exercise-name">${index + 1}. ${nameHtml}</p></div>
        <div class="exercise-dose">${escapeHtml(dose)}</div>
      </div>
      <ul class="exercise-instructions">${instructionsHtml}</ul>
      ${videoHtml}
      ${notesHtml}
    `;
    previewExercises.appendChild(card);
  });

  document.getElementById('editableSection').style.display = 'none';
  previewSection.style.display = '';
}

// Build and open email draft (includes video links)
function openEmailDraft() {
  renderPreview();
  const recipient = document.getElementById('recipientEmail').value.trim();
  if (!recipient) {
    alert('Please enter a recipient email first.');
    return;
  }
  const title = document.getElementById('programTitle').value.trim() || 'Home Exercise Program';
  const date = document.getElementById('programDate').value || '';
  const patient = document.getElementById('patientName').value.trim() || 'Patient';
  const intro = document.getElementById('introText').value.trim() || '';
  const subject = `${title}${date ? ' - ' + date : ''}`;
  const summaryLines = editableExercises.map((ex, i) => {
    const dose = buildDoseString(ex);
    const videoPart = ex.video ? ` (Video: ${ex.video})` : '';
    const notesPart = ex.notes ? ` | Notes: ${ex.notes}` : '';
    return `${i + 1}. ${ex.name}${dose ? ' — ' + dose : ''}${videoPart}${notesPart}`;
  });
  const bodyLines = [
    `Hello ${patient},`,
    '',
    `Attached or below is your ${title.toLowerCase()}${date ? ' from ' + date : ''}.`,
    '',
    'Program summary:',
    ...summaryLines,
    '',
    'Instructions:',
    intro,
    '',
    'Please let me know if you have any questions.'
  ];
  const mailto =
    `mailto:${encodeURIComponent(recipient)}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(bodyLines.join('\\n'))}`;
  window.location.href = mailto;
}

// Copy program summary to clipboard (includes video links)
async function copySummary() {
  renderPreview();
  const title = document.getElementById('programTitle').value.trim() || 'Home Exercise Program';
  const date = document.getElementById('programDate').value || '';
  const patient = document.getElementById('patientName').value.trim() || 'Patient';
  const intro = document.getElementById('introText').value.trim() || '';
  const lines = [
    title,
    `Patient: ${patient}`,
    date ? `Date: ${date}` : '',
    '',
    'Instructions:',
    intro,
    '',
    'Exercises:'
  ];
  editableExercises.forEach((ex, i) => {
    const dose = buildDoseString(ex);
    const videoPart = ex.video ? ` (Video: ${ex.video})` : '';
    const notesPart = ex.notes ? ` | Notes: ${ex.notes}` : '';
    lines.push(`${i + 1}. ${ex.name}${dose ? ' — ' + dose : ''}${videoPart}${notesPart}`);
  });
  try {
    await navigator.clipboard.writeText(lines.filter(Boolean).join('\\n'));
    alert('Program summary copied to clipboard.');
  } catch (err) {
    alert('Could not copy program summary.');
  }
}

// Global state
let editableExercises = [];

// Initialisation
function init() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  document.getElementById('programDate').value = `${yyyy}-${mm}-${dd}`;

  document.getElementById('loadSampleBtn').addEventListener('click', () => {
    document.getElementById('patientName').value = 'Sample Patient';
    document.getElementById('recipientEmail').value = 'patient@example.com';
    document.getElementById('programTitle').value = 'Home Exercise Program';
    document.getElementById('introText').value = 'Perform the following exercises as prescribed. Stop and contact your physiotherapist if symptoms significantly worsen.';
    document.getElementById('inputText').value = `leg press 3x10 hold 5 sec
SLS 2x15
jumping jacks 30s different intensities
calf stretch 2x30s each side
bridge 3x12
clamshell 2x15 each side
wall sit 3x30s
seated row 2x15
lateral walk 2x10 each way
push up 3x8`;
  });

  document.getElementById('generateExercisesBtn').addEventListener('click', () => {
    const text = document.getElementById('inputText').value.trim();
    if (!text) {
      alert('Please paste your exercise list first.');
      return;
    }
    editableExercises = parseInput(text);
    if (!editableExercises.length) {
      alert('No exercises could be parsed. Please check your input.');
      return;
    }
    renderEditableExercises(editableExercises);
    document.getElementById('editableSection').style.display = '';
    document.getElementById('previewSection').style.display = 'none';
  });

  document.getElementById('editableSection').addEventListener('input', handleEditableInput);
  document.getElementById('previewProgramBtn').addEventListener('click', renderPreview);
  document.getElementById('printBtn').addEventListener('click', () => {
    renderPreview();
    window.print();
  });
  document.getElementById('emailBtn').addEventListener('click', openEmailDraft);
  document.getElementById('copySummaryBtn').addEventListener('click', copySummary);
  document.getElementById('backToEditBtn').addEventListener('click', () => {
    document.getElementById('previewSection').style.display = 'none';
    document.getElementById('editableSection').style.display = '';
  });
}

document.addEventListener('DOMContentLoaded', init);
