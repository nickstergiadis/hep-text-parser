import { VIDEO_MATCHING_CONFIG } from './src/video/config.js';
import {
  buildFallbackVideo,
  buildYoutubeSearchQuery,
  buildYoutubeSearchUrl,
  cleanExerciseLabel,
  isUsefulExerciseName,
  matchExerciseToCanonical,
  normalizeExerciseName,
  resolveWhitelistedVideo
} from './src/video/matcher.js';
import { resolveExerciseInstructions } from './src/app/instructions.js';
import { buildDoseString, buildEmailDraftHref, buildSummaryText } from './src/app/output.js';

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
let dataLoadWarnings = [];
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
  dataLoadWarnings = [];
  const [exerciseResp, whitelistResp] = await Promise.all([
    fetch('./data/exercises_master.json').catch(() => null),
    fetch('./data/video_whitelist.json').catch(() => null)
  ]);

  if (!exerciseResp?.ok) {
    dataLoadWarnings.push('exercise library unavailable');
  } else {
    canonicalExerciseLibrary = await exerciseResp.json().catch(() => []);
    if (!Array.isArray(canonicalExerciseLibrary) || !canonicalExerciseLibrary.length) {
      canonicalExerciseLibrary = [];
      dataLoadWarnings.push('exercise library invalid');
    }
  }

  if (!whitelistResp?.ok) {
    dataLoadWarnings.push('video whitelist unavailable');
  } else {
    approvedVideoWhitelist = await whitelistResp.json().catch(() => []);
    if (!Array.isArray(approvedVideoWhitelist)) {
      approvedVideoWhitelist = [];
      dataLoadWarnings.push('video whitelist invalid');
    }
  }

  if (dataLoadWarnings.length) {
    console.warn(`HEP Builder Pro data load warning: ${dataLoadWarnings.join(', ')}`);
  }
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
  if (inputTextEl) inputTextEl.value = `bridge with band 3x12\nSLS 2x15\nclamshell 2x12\ncalf stretch 2x30s each side\nwall sit 3x30 sec\nFrequency: daily`;
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

  return lines
    .filter(line => !/^frequency:/i.test(line))
    .filter(line => /[a-z0-9]/i.test(line))
    .map((line, index) => buildExerciseObject(line, frequency, index));
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
  const extractedName = titleCase(guessExerciseName(line));
  const displayName = canonical?.canonical_name || extractedName || 'Exercise';
  const normalizedCanonicalName = normalizeExerciseName(canonical?.canonical_name || extractedName);
  const canonicalName = isUsefulExerciseName(normalizedCanonicalName) ? normalizedCanonicalName : '';
  const approvedVideo = canonical ? resolveWhitelistedVideo(canonical.exercise_id, approvedVideoWhitelist) : null;
  const fallbackVideo = buildFallbackVideo(canonical?.exercise_id || null);
  const videoOverrideUrl = approvedVideo?.url || '';
  const hasCanonicalName = Boolean(canonicalName);
  const videoMode = hasCanonicalName ? 'youtube_search' : 'none';
  const videoSearchQuery = videoMode === 'youtube_search' ? buildYoutubeSearchQuery(canonicalName) : '';
  const videoUrl = videoMode === 'youtube_search' ? buildYoutubeSearchUrl(canonicalName) : '';

  let notes = line;
  if (setsDurationMatch) notes = removeText(notes, setsDurationMatch[0]);
  else if (setsRepsMatch) notes = removeText(notes, setsRepsMatch[0]);
  if (holdMatch) notes = removeText(notes, holdMatch[0]);
  if (sideMatch) notes = removeText(notes, sideMatch[0]);
  if (freqInlineMatch) notes = removeText(notes, freqInlineMatch[0]);

  if (canonical?.aliases?.length) {
    canonical.aliases.forEach(alias => {
      const aliasPattern = new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'ig');
      notes = notes.replace(aliasPattern, ' ');
    });
  }

  notes = cleanupNotes(notes);

  const normalizedNotes = normalizeNoteComparison(notes);
  const normalizedDisplayName = normalizeNoteComparison(displayName);
  const looksLikeNameOnly = normalizedNotes && normalizedDisplayName && normalizedNotes === normalizedDisplayName;
  const looksLikeAliasOnly = canonical?.aliases?.some(alias => normalizeNoteComparison(alias) === normalizedNotes);

  if (!notes || looksLikeNameOnly || looksLikeAliasOnly) notes = '';

  const resolvedInstructions = resolveExerciseInstructions({
    canonicalExerciseId: canonical?.exercise_id || '',
    canonicalName: canonical?.canonical_name || displayName,
    displayName,
    rawInput: line,
    aliases: canonical?.aliases || [],
    existingInstructions: canonical?.instructions_short ? [canonical.instructions_short] : genericInstructions(displayName),
    instructionSource: 'generated'
  });

  return {
    id: `ex-${index}-${Date.now()}`,
    raw_input: line,
    name: extractedName,
    display_name: displayName,
    canonicalName,
    canonical_exercise_id: canonical?.exercise_id || null,
    canonical_aliases: canonical?.aliases || [],
    canonical_match_score: canonicalMatch.matchScore,
    sets: setsDurationMatch ? setsDurationMatch[1] : (setsRepsMatch ? setsRepsMatch[1] : ''),
    reps: setsDurationMatch ? '' : (setsRepsMatch ? setsRepsMatch[2] : ''),
    duration: setsDurationMatch ? `${setsDurationMatch[2]} ${normalizeTimeUnit(setsDurationMatch[3])}` : '',
    hold: holdMatch ? `${holdMatch[1]} ${normalizeTimeUnit(holdMatch[2])}` : '',
    side: sideMatch ? sideMatch[0] : '',
    frequency: freqInlineMatch ? freqInlineMatch[0] : frequency,
    instructions: resolvedInstructions.instructions,
    instruction_source: resolvedInstructions.instructionSource,
    notes,
    videoMode,
    videoSearchQuery,
    videoUrl,
    videoOverrideUrl,
    video_links: videoUrl ? [videoUrl] : [],
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
  if (field === 'instructions') {
    exercise.instructions = splitInputLines(event.target.value);
    exercise.instruction_source = 'custom';
  }
  else exercise[field] = event.target.value;
  renderPreview();
}

function renderPreview() {
  if (!exerciseListEl) return;
  syncPreviewHeader();

  if (!exercises.length) {
    exerciseListEl.innerHTML = '<p class="empty">Generate a program to see the patient-ready preview.</p>';
    if (dataLoadWarnings.length) {
      exerciseListEl.innerHTML += `<p class="empty">Data load notice: ${escapeHtml(dataLoadWarnings.join(', '))}. Canonical matching or approved videos may be limited.</p>`;
    }
    return;
  }

  const showVideoSearchDisclaimer = exercises.some(exercise => String(exercise.videoUrl || '').trim());
  const cardsHtml = exercises.map((exercise, index) => {
    const resolvedExercise = resolveInstructionsForExercise(exercise);
    const dose = buildDoseString(exercise);
    const instructions = `<ol class="instructions-list">${resolvedExercise.instructions.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ol>`;
    const safeVideoUrl = String(exercise.videoUrl || '').trim();
    const videoSection = safeVideoUrl
      ? `<div class="video-links"><strong>Instructional videos:</strong><ul><li><a href="${escapeAttribute(safeVideoUrl)}" target="_blank" rel="noopener noreferrer">Find demo video</a></li></ul></div>`
      : `<div class="video-links"><strong>Instructional videos:</strong> ${escapeHtml(exercise.video?.message || VIDEO_MATCHING_CONFIG.fallback.message)}</div>`;
    const notes = exercise.notes ? `<div class="note-box"><strong>Notes:</strong> ${escapeHtml(exercise.notes)}</div>` : '';

    return `<article class="exercise-card"><div class="exercise-top"><p class="exercise-name">${index + 1}. ${escapeHtml(exercise.display_name)}</p><div class="exercise-dose">${escapeHtml(dose)}</div></div>${instructions}${videoSection}${notes}</article>`;
  }).join('');

  const disclaimer = showVideoSearchDisclaimer
    ? '<p class="video-disclaimer">Search results may vary. Confirm the title matches your prescribed exercise.</p>'
    : '';
  exerciseListEl.innerHTML = `${disclaimer}${cardsHtml}`;
}

function syncPreviewHeader() {
  if (previewTitleEl) previewTitleEl.textContent = programTitleEl?.value.trim() || 'Home Exercise Program';
  if (previewPatientEl) previewPatientEl.textContent = `Patient: ${patientNameEl?.value.trim() || '—'}`;
  if (previewDateEl) previewDateEl.textContent = `Date: ${formatDate(programDateEl?.value)}`;
  if (previewIntroEl) previewIntroEl.textContent = introTextEl?.value.trim() || 'Perform the following exercises as prescribed.';
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
  const recipient = recipientEmailEl?.value.trim();
  if (!recipient) return alert('Enter a recipient email first.');
  const subject = `${programTitleEl?.value.trim() || 'Home Exercise Program'} - ${formatDate(programDateEl?.value)}`;
  const body = buildSummaryTextForProgram(true);
  window.location.href = buildEmailDraftHref({ recipient, subject, body });
}

async function copySummary() {
  if (!ensureProgramForActions()) return;
  const summary = buildSummaryTextForProgram(false);
  try {
    if (!navigator?.clipboard?.writeText) throw new Error('clipboard unavailable');
    await navigator.clipboard.writeText(summary);
    alert('Program summary copied.');
  } catch {
    window.prompt('Clipboard unavailable. Copy your summary below:', summary);
  }
}

function buildSummaryTextForProgram(forEmail) {
  return buildSummaryText({
    exercises: exercises.map(resolveInstructionsForExercise),
    title: programTitleEl?.value.trim() || 'Home Exercise Program',
    patientName: patientNameEl?.value.trim() || 'Patient',
    date: formatDate(programDateEl?.value),
    fallbackMessage: VIDEO_MATCHING_CONFIG.fallback.message,
    forEmail
  });
}

function resolveInstructionsForExercise(exercise) {
  const resolved = resolveExerciseInstructions({
    canonicalExerciseId: exercise.canonical_exercise_id,
    canonicalName: exercise.canonicalName || exercise.display_name,
    displayName: exercise.display_name,
    rawInput: exercise.raw_input,
    aliases: exercise.canonical_aliases || [],
    existingInstructions: exercise.instructions,
    instructionSource: exercise.instruction_source
  });

  if (resolved.instructions !== exercise.instructions || resolved.instructionSource !== exercise.instruction_source) {
    exercise.instructions = resolved.instructions;
    exercise.instruction_source = resolved.instructionSource;
  }

  return exercise;
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
  const raw = cleanExerciseLabel(line)
    .replace(/\b(?:daily|weekly|x\/week|times per week)\b/ig, ' ')
    .replace(/\b(?:pain|sore|soreness|discomfort|comment|note|notes?)\b.*$/ig, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return raw;
}

function cleanupNotes(text) {
  return String(text || '').replace(/\s+/g, ' ').replace(/^[,;:\-\s]+|[,;:\-\s]+$/g, '').trim();
}

function removeText(base, fragment) {
  return String(base || '').replace(new RegExp(escapeRegExp(fragment), 'ig'), ' ');
}

function normalizeNoteComparison(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatDate(value) {
  if (!value) return '—';
  const [yyyy, mm, dd] = value.split('-');
  return `${yyyy}-${mm}-${dd}`;
}

function titleCase(str) { return str.replace(/\w\S*/g, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()); }
function escapeHtml(str) { return String(str).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
function escapeAttribute(str) { return escapeHtml(String(str ?? '')); }
