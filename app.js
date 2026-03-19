import { VIDEO_MATCHING_CONFIG } from './src/video/config.js';
import { buildFallbackVideo, matchExerciseToCanonical, resolveWhitelistedVideo } from './src/video/matcher.js';

let patientNameEl;
let recipientEmailEl;
let programTitleEl;
let programDateEl;
let introTextEl;
let inputTextEl;

let sampleBtn;
let generateBtn;
let printBtn;
let emailBtn;
let copySummaryBtn;

let previewTitleEl;
let previewPatientEl;
let previewDateEl;
let previewIntroEl;
let exerciseListEl;
let editorListEl;

let exercises = [];
let lastParsedInputText = '';
let canonicalExerciseLibrary = [];
let approvedVideoWhitelist = [];
const TIME_UNIT_PATTERN = '(seconds?|secs?|minutes?|mins?|sec|min|s)';

(async function boot() {
  await initializeApp();
})();

async function initializeApp() {
  cacheElements();
  if (!inputTextEl) return;

  await loadVideoMatchingData();
  setDefaultDate();
  renderEditors();
  renderPreview();
  bindActionButtons();
}

async function loadVideoMatchingData() {
  const [exerciseResp, whitelistResp] = await Promise.all([
    fetch('./data/exercises_master.json').catch(() => null),
    fetch('./data/video_whitelist.json').catch(() => null)
  ]);

  canonicalExerciseLibrary = exerciseResp?.ok ? await exerciseResp.json() : [];
  approvedVideoWhitelist = whitelistResp?.ok ? await whitelistResp.json() : [];
}

function cacheElements() {
  patientNameEl = document.getElementById('patientName');
  recipientEmailEl = document.getElementById('recipientEmail');
  programTitleEl = document.getElementById('programTitle');
  programDateEl = document.getElementById('programDate');
  introTextEl = document.getElementById('introText');
  inputTextEl = document.getElementById('inputText');
  sampleBtn = document.getElementById('sampleBtn');
  generateBtn = document.getElementById('generateBtn');
  printBtn = document.getElementById('printBtn');
  emailBtn = document.getElementById('emailBtn');
  copySummaryBtn = document.getElementById('copySummaryBtn');
  previewTitleEl = document.getElementById('previewTitle');
  previewPatientEl = document.getElementById('previewPatient');
  previewDateEl = document.getElementById('previewDate');
  previewIntroEl = document.getElementById('previewIntro');
  exerciseListEl = document.getElementById('exerciseList');
  editorListEl = document.getElementById('editorList');
}

function bindActionButtons() {
  generateBtn?.addEventListener('click', generateProgram);
  sampleBtn?.addEventListener('click', () => {
    loadSample();
    generateProgram();
  });
  printBtn?.addEventListener('click', () => {
    if (ensureProgramForActions()) window.print();
  });
  emailBtn?.addEventListener('click', openEmailDraft);
  copySummaryBtn?.addEventListener('click', copySummary);
}

function setDefaultDate() {
  if (!programDateEl) return;
  const today = new Date();
  programDateEl.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function loadSample() {
  if (patientNameEl) patientNameEl.value = 'Sample Patient';
  if (recipientEmailEl) recipientEmailEl.value = 'patient@example.com';
  if (programTitleEl) programTitleEl.value = 'Home Exercise Program';
  if (introTextEl) introTextEl.value = 'Perform the following exercises as prescribed. Use controlled movement and stop if symptoms significantly worsen.';
  if (inputTextEl) inputTextEl.value = `leg press 3x10 hold 5 sec\nSLS 2x15\nclamshell 2x12\ncalf stretch 2x30s each side\nbridge 3x12\nFrequency: daily`;
}

function splitInputLines(text) {
  return String(text).replace(/\r\n/g, '\n').replace(/\\n/g, '\n').split('\n').map(line => line.trim()).filter(Boolean);
}

function generateProgram() {
  if (!inputTextEl) return;
  const rawText = inputTextEl.value.trim();
  syncPreviewHeader();
  if (!rawText) {
    exercises = [];
    lastParsedInputText = '';
    renderEditors();
    renderPreview();
    return;
  }

  exercises = parseRoughInput(rawText);
  lastParsedInputText = rawText;
  renderEditors();
  renderPreview();
}

function parseRoughInput(text) {
  const lines = splitInputLines(text);
  const frequencyLine = lines.find(line => /^frequency:/i.test(line));
  const frequency = frequencyLine ? frequencyLine.replace(/^frequency:/i, '').trim() : '';

  return lines.filter(line => !/^frequency:/i.test(line)).map((line, index) => buildExerciseObject(line, frequency, index));
}

function buildExerciseObject(line, frequency, index) {
  const normalizedLine = line.toLowerCase();
  const setsDurationMatch = normalizedLine.match(new RegExp(`(\\d+)\\s*x\\s*(\\d+)\\s*${TIME_UNIT_PATTERN}\\b`, 'i'));
  const setsRepsMatch = normalizedLine.match(/(\d+)\s*x\s*(\d+)/i);
  const holdMatch = normalizedLine.match(new RegExp(`hold\\s*(\\d+)\\s*${TIME_UNIT_PATTERN}\\b`, 'i'));
  const sideMatch = normalizedLine.match(/each side|per side|each leg|each arm|left|right/i);
  const freqInlineMatch = normalizedLine.match(/daily|\d+\s*x\s*\/\s*week|\d+x\/week|\d+ times per week/i);

  const canonicalMatch = matchExerciseToCanonical(line, canonicalExerciseLibrary);
  const canonical = canonicalMatch.canonical;
  const displayName = canonical?.canonical_name || titleCase(guessExerciseName(line));
  const approvedVideo = canonical ? resolveWhitelistedVideo(canonical.exercise_id, approvedVideoWhitelist) : null;
  const fallbackVideo = buildFallbackVideo(canonical?.exercise_id || null);

  let notes = cleanupNotes(line.replace(/(\d+\s*x\s*\d+|hold\s*\d+\s*(?:sec|min|seconds|minutes))/ig, ' '));
  if (!notes || notes.length < 3) notes = canonical?.instructions_short || '';

  return {
    id: `ex-${index}-${Date.now()}`,
    raw_input: line,
    display_name: displayName,
    canonical_exercise_id: canonical?.exercise_id || null,
    canonical_match_score: canonicalMatch.matchScore,
    sets: setsDurationMatch ? setsDurationMatch[1] : (setsRepsMatch ? setsRepsMatch[1] : ''),
    reps: setsDurationMatch ? '' : (setsRepsMatch ? setsRepsMatch[2] : ''),
    duration: setsDurationMatch ? `${setsDurationMatch[2]} ${normalizeTimeUnit(setsDurationMatch[3])}` : '',
    hold: holdMatch ? `${holdMatch[1]} ${normalizeTimeUnit(holdMatch[2])}` : '',
    side: sideMatch ? sideMatch[0] : '',
    frequency: freqInlineMatch ? freqInlineMatch[0] : frequency,
    instructions: canonical?.instructions_short ? [canonical.instructions_short] : genericInstructions(displayName),
    notes,
    video_links: approvedVideo ? [approvedVideo.url] : [],
    video: approvedVideo || fallbackVideo
  };
}

function renderEditors() {
  if (!editorListEl) return;
  if (!exercises.length) {
    editorListEl.innerHTML = '<p class="empty">Generate a program to review editable exercise cards.</p>';
    return;
  }

  editorListEl.innerHTML = exercises.map((exercise, index) => `
    <article class="editor-card" data-id="${exercise.id}">
      <h3>${index + 1}. ${escapeHtml(exercise.display_name)}</h3>
      <span class="raw-chip">Canonical: ${escapeHtml(exercise.canonical_exercise_id || 'none')} (score: ${exercise.canonical_match_score})</span>
      <div class="field-block"><label class="small-label">Notes</label><input data-field="notes" value="${escapeAttribute(exercise.notes)}" /></div>
      <div class="field-block"><label class="small-label">Instructions (one per line)</label><textarea data-field="instructions" rows="3">${escapeHtml(exercise.instructions.join('\n'))}</textarea></div>
    </article>
  `).join('');

  editorListEl.querySelectorAll('input, textarea').forEach(field => field.addEventListener('input', handleEditorChange));
}

function handleEditorChange(event) {
  const card = event.target.closest('.editor-card');
  const id = card.dataset.id;
  const field = event.target.dataset.field;
  const exercise = exercises.find(item => item.id === id);
  if (!exercise) return;
  if (field === 'instructions') exercise.instructions = splitInputLines(event.target.value);
  else exercise[field] = event.target.value;
  renderPreview();
}

function renderPreview() {
  if (!exerciseListEl) return;
  syncPreviewHeader();

  if (!exercises.length) {
    exerciseListEl.innerHTML = '<p class="empty">Generate a program to see the patient-ready preview.</p>';
    return;
  }

  exerciseListEl.innerHTML = exercises.map((exercise, index) => {
    const dose = buildDoseString(exercise);
    const instructions = `<ol class="instructions-list">${exercise.instructions.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ol>`;
    const videoSection = (exercise.video_links || []).length
      ? `<div class="video-links"><strong>Instructional videos:</strong><ul>${exercise.video_links.map(url => `<li><a href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a></li>`).join('')}</ul></div>`
      : `<div class="video-links"><strong>Instructional videos:</strong> ${escapeHtml(exercise.video?.message || VIDEO_MATCHING_CONFIG.fallback.message)}</div>`;
    const notes = exercise.notes ? `<div class="note-box"><strong>Notes:</strong> ${escapeHtml(exercise.notes)}</div>` : '';

    return `<article class="exercise-card"><div class="exercise-top"><p class="exercise-name">${index + 1}. ${escapeHtml(exercise.display_name)}</p><div class="exercise-dose">${escapeHtml(dose)}</div></div>${instructions}${videoSection}${notes}</article>`;
  }).join('');
}

function syncPreviewHeader() {
  if (previewTitleEl) previewTitleEl.textContent = programTitleEl?.value.trim() || 'Home Exercise Program';
  if (previewPatientEl) previewPatientEl.textContent = `Patient: ${patientNameEl?.value.trim() || '—'}`;
  if (previewDateEl) previewDateEl.textContent = `Date: ${formatDate(programDateEl?.value)}`;
  if (previewIntroEl) previewIntroEl.textContent = introTextEl?.value.trim() || 'Perform the following exercises as prescribed.';
}

function buildDoseString(exercise) {
  const parts = [];
  if (exercise.sets && exercise.reps) parts.push(`${exercise.sets} sets x ${exercise.reps} reps`);
  else if (exercise.sets && exercise.duration) parts.push(`${exercise.sets} sets x ${exercise.duration}`);
  else if (exercise.duration) parts.push(exercise.duration);
  if (exercise.hold) parts.push(`${exercise.hold} hold`);
  if (exercise.side) parts.push(exercise.side);
  if (exercise.frequency) parts.push(exercise.frequency);
  return parts.join(' • ');
}

function ensureProgramForActions() {
  if (!inputTextEl) return false;
  const rawText = inputTextEl.value.trim();
  if (!exercises.length || rawText !== lastParsedInputText) generateProgram();
  if (!exercises.length) {
    alert('Add at least one exercise before printing, emailing, or copying the summary.');
    return false;
  }
  return true;
}

function openEmailDraft() {
  if (!ensureProgramForActions()) return;
  const recipient = recipientEmailEl.value.trim();
  if (!recipient) return alert('Enter a recipient email first.');
  const subject = `${programTitleEl.value.trim() || 'Home Exercise Program'} - ${formatDate(programDateEl.value)}`;
  const body = buildSummaryText(true);
  window.location.href = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

async function copySummary() {
  if (!ensureProgramForActions()) return;
  await navigator.clipboard.writeText(buildSummaryText(false));
  alert('Program summary copied.');
}

function buildSummaryText(forEmail) {
  const newline = forEmail ? '\r\n' : '\n';
  const lines = [`${programTitleEl.value.trim() || 'Home Exercise Program'}`, `Patient: ${patientNameEl.value.trim() || 'Patient'}`, `Date: ${formatDate(programDateEl.value)}`, '', 'Exercises:'];
  exercises.forEach((exercise, index) => {
    lines.push(`${index + 1}. ${exercise.display_name}${buildDoseString(exercise) ? ` — ${buildDoseString(exercise)}` : ''}`);
    exercise.instructions.forEach(step => lines.push(`   - ${step}`));
    if ((exercise.video_links || []).length) exercise.video_links.forEach(url => lines.push(`   - ${url}`));
    else lines.push(`   - ${exercise.video?.message || VIDEO_MATCHING_CONFIG.fallback.message}`);
  });
  return lines.join(newline);
}

function genericInstructions(name) {
  return [
    `Set up for ${name.toLowerCase()} as shown by your physiotherapist.`,
    'Perform the movement in a slow and controlled way.',
    'Stay within a comfortable range and stop if symptoms significantly worsen.'
  ];
}

function normalizeTimeUnit(unit) {
  const value = String(unit || '').toLowerCase();
  if (['s', 'sec', 'secs', 'second', 'seconds'].includes(value)) return 'sec';
  if (['min', 'mins', 'minute', 'minutes'].includes(value)) return 'min';
  return unit;
}

function guessExerciseName(line) {
  return line.replace(/(\d+\s*x\s*\d+|hold\s*\d+\s*(?:sec|min|seconds|minutes))/ig, '').trim() || 'Exercise';
}

function cleanupNotes(text) {
  return String(text || '').replace(/\s+/g, ' ').replace(/^[,;:\-\s]+|[,;:\-\s]+$/g, '').trim();
}

function formatDate(value) {
  if (!value) return '—';
  const [yyyy, mm, dd] = value.split('-');
  return `${yyyy}-${mm}-${dd}`;
}

function titleCase(str) { return str.replace(/\w\S*/g, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()); }
function escapeHtml(str) { return String(str).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
function escapeAttribute(str) { return escapeHtml(String(str ?? '')); }
