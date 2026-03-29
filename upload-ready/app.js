import { VIDEO_MATCHING_CONFIG } from './src/video/config.js';
import {
  cleanExerciseLabel,
  isUsefulExerciseName,
  matchExerciseToCanonical,
  normalizeExerciseName
} from './src/video/matcher.js';
import { resolveExerciseVideoAssignment } from './src/app/exercise-video.js';
import { resolveExerciseInstructions } from './src/app/instructions.js';
import { buildDoseString, buildEmailDraftHref, buildEmailHtml, buildPlainTextExport, buildSummaryText, shouldShowSearchVideoDisclaimer } from './src/app/output.js';
import { parseProgramInput } from './src/app/parser.js';
import { initTheme } from './src/app/theme.js';

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
let copyForEmailBtn;
let copyPlainTextBtn;
let copyStatusEl;

let previewTitleEl;
let previewPatientEl;
let previewDateEl;
let previewIntroEl;
let exerciseListEl;
let editorListEl;
let themeModeEl;

let exercises = [];
let programSections = [];
let hasExplicitSections = false;
let lastParsedInputText = '';
let canonicalExerciseLibrary = [];
let approvedVideoWhitelist = [];
let dataLoadWarnings = [];
const TIME_UNIT_PATTERN = '(seconds?|secs?|minutes?|mins?|sec|min|s)';
const DRAFT_STORAGE_KEY = 'hep_builder_draft_v2';

(async function boot() {
  await initializeApp();
})();

async function initializeApp() {
  cacheElements();
  if (!inputTextEl) return;

  await loadVideoMatchingData();
  setDefaultDate();
  restoreDraftState();
  initThemeControl();
  renderEditors();
  renderPreview();
  bindActionButtons();
  bindFormInputs();
  syncPreviewHeader();
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
  copyForEmailBtn = document.getElementById('copyForEmailBtn');
  copyPlainTextBtn = document.getElementById('copyPlainTextBtn');
  copyStatusEl = document.getElementById('copyStatus');
  previewTitleEl = document.getElementById('previewTitle');
  previewPatientEl = document.getElementById('previewPatient');
  previewDateEl = document.getElementById('previewDate');
  previewIntroEl = document.getElementById('previewIntro');
  exerciseListEl = document.getElementById('exerciseList');
  editorListEl = document.getElementById('editorList');
  themeModeEl = document.getElementById('themeMode');
}


function initThemeControl() {
  initTheme({ controlElement: themeModeEl });
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
  copyForEmailBtn?.addEventListener('click', copyForEmailClients);
  copyPlainTextBtn?.addEventListener('click', copyPlainText);
}

function bindFormInputs() {
  [patientNameEl, recipientEmailEl, programTitleEl, programDateEl, introTextEl, inputTextEl]
    .filter(Boolean)
    .forEach(field => {
      field.addEventListener('input', () => {
        syncPreviewHeader();
        persistDraftState();
      });
      field.addEventListener('change', () => {
        syncPreviewHeader();
        persistDraftState();
      });
    });
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
    programSections = [];
    hasExplicitSections = false;
    lastParsedInputText = '';
    renderEditors();
    renderPreview();
    persistDraftState();
    return;
  }

  const parsedProgram = parseProgramInput(rawText);
  const frequency = parsedProgram.frequencyLine || '';
  hasExplicitSections = Boolean(parsedProgram.hasExplicitSections);

  if (parsedProgram.title && programTitleEl) programTitleEl.value = parsedProgram.title;

  let exerciseIndex = 0;
  programSections = parsedProgram.sections.map((section, sectionIndex) => {
    const sectionId = `section-${sectionIndex}-${Date.now()}`;
    const sectionExercises = section.lines
      .filter(line => /[a-z0-9]/i.test(line))
      .map((line) => buildExerciseObject(line, frequency, exerciseIndex++, {
        id: sectionId,
        name: section.name || 'Exercises',
        rawLabel: section.rawLabel || section.name || 'Exercises',
        frequencyLabel: section.frequencyLabel || '',
        order: section.order ?? sectionIndex
      }));

    return {
      id: sectionId,
      name: section.name || 'Exercises',
      rawLabel: section.rawLabel || section.name || 'Exercises',
      frequencyLabel: section.frequencyLabel || '',
      notes: '',
      order: section.order ?? sectionIndex,
      exercises: sectionExercises
    };
  }).filter(section => section.exercises.length);

  exercises = flattenSections(programSections);
  lastParsedInputText = rawText;
  renderEditors();
  renderPreview();
  persistDraftState();
}

function buildExerciseObject(line, frequency, index, sectionMeta = {}) {
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
  const videoAssignment = resolveExerciseVideoAssignment({
    canonicalExerciseId: canonical?.exercise_id || null,
    exerciseName: canonical?.canonical_name || extractedName,
    whitelist: approvedVideoWhitelist
  });

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
    section_id: sectionMeta.id || 'section-0',
    section_name: sectionMeta.name || 'Exercises',
    section_label: sectionMeta.rawLabel || sectionMeta.name || 'Exercises',
    section_frequency_label: sectionMeta.frequencyLabel || '',
    section_order: Number.isInteger(sectionMeta.order) ? sectionMeta.order : 0,
    videoMode: videoAssignment.videoMode,
    videoSource: videoAssignment.videoSource,
    videoLabel: videoAssignment.videoLabel,
    videoUrl: videoAssignment.videoUrl,
    videoOverrideUrl: videoAssignment.videoOverrideUrl,
    video_links: videoAssignment.video_links,
    video: videoAssignment.video
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
      <p class="editor-section-label">${escapeHtml(exercise.section_label || exercise.section_name || 'Exercises')}</p>
      <div class="field-block"><label class="small-label">Exercise name</label><input data-field="display_name" value="${escapeAttribute(exercise.display_name)}" /></div>
      <div class="grid three-col field-block">
        <div><label class="small-label">Sets</label><input data-field="sets" value="${escapeAttribute(exercise.sets)}" /></div>
        <div><label class="small-label">Reps</label><input data-field="reps" value="${escapeAttribute(exercise.reps)}" /></div>
        <div><label class="small-label">Duration</label><input data-field="duration" value="${escapeAttribute(exercise.duration)}" placeholder="e.g. 30 sec" /></div>
      </div>
      <div class="grid three-col field-block">
        <div><label class="small-label">Hold</label><input data-field="hold" value="${escapeAttribute(exercise.hold)}" placeholder="e.g. 5 sec" /></div>
        <div><label class="small-label">Side</label><input data-field="side" value="${escapeAttribute(exercise.side)}" /></div>
        <div><label class="small-label">Frequency</label><input data-field="frequency" value="${escapeAttribute(exercise.frequency)}" /></div>
      </div>
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
  persistDraftState();
}

function renderPreview() {
  if (!exerciseListEl) return;
  syncPreviewHeader();

  if (!exercises.length) {
    exerciseListEl.innerHTML = '<p class="empty">Generate a program to see the patient-ready preview.</p>';
    if (dataLoadWarnings.length) {
      exerciseListEl.innerHTML += `<p class="empty">Data load notice: ${escapeHtml(dataLoadWarnings.join(', '))}. Canonical matching or approved videos may be limited.</p>`;
    }
    updateCopyButtonsState();
    return;
  }

  const showVideoSearchDisclaimer = shouldShowSearchVideoDisclaimer(exercises);
  const sectionsForPreview = buildSectionsForOutput();
  const showSectionHeaders = hasExplicitSections || sectionsForPreview.length > 1;
  const cardsHtml = sectionsForPreview.map((section, sectionIndex) => {
    const sectionHeading = showSectionHeaders
      ? `<div class="preview-section-header"><h3>${escapeHtml(section.label)}</h3></div>`
      : '';

    const sectionCards = section.exercises.map((exercise, index) => {
      const resolvedExercise = resolveInstructionsForExercise(exercise);
      const dose = buildDoseString(exercise);
      const instructions = `<ol class="instructions-list">${resolvedExercise.instructions.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ol>`;
      const safeVideoUrl = String(exercise.videoUrl || '').trim();
      const videoLabel = exercise.videoMode === 'search' ? 'Video search' : (exercise.videoLabel || 'Watch video');
      const videoSection = safeVideoUrl
        ? `<div class="video-links"><strong>Instructional videos:</strong><ul><li><a href="${escapeAttribute(safeVideoUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(videoLabel)}</a></li></ul></div>`
        : `<div class="video-links"><strong>Instructional videos:</strong> ${escapeHtml(exercise.video?.message || VIDEO_MATCHING_CONFIG.fallback.message)}</div>`;
      const notes = exercise.notes ? `<div class="note-box"><strong>Notes:</strong> ${escapeHtml(exercise.notes)}</div>` : '';
      return `<article class="exercise-card"><div class="exercise-top"><p class="exercise-name">${index + 1}. ${escapeHtml(exercise.display_name)}</p><div class="exercise-dose">${escapeHtml(dose)}</div></div>${instructions}${videoSection}${notes}</article>`;
    }).join('');

    return `<section class="preview-section">${sectionHeading}${sectionCards}</section>`;
  }).join('');

  const disclaimer = showVideoSearchDisclaimer
    ? '<p class="video-disclaimer">Search results may vary. Confirm the title matches your prescribed exercise.</p>'
    : '';
  exerciseListEl.innerHTML = `${disclaimer}${cardsHtml}`;
  updateCopyButtonsState();
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
    alert('Add at least one exercise before printing, emailing, or copying.');
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

function buildProgramExports() {
  const exportSections = buildSectionsForOutput().map(section => ({
    ...section,
    exercises: section.exercises.map(resolveInstructionsForExercise)
  }));
  const title = programTitleEl?.value.trim() || 'Home Exercise Program';
  const patientName = patientNameEl?.value.trim() || 'Patient';
  const date = formatDate(programDateEl?.value);
  const introText = introTextEl?.value.trim() || '';
  const fallbackMessage = VIDEO_MATCHING_CONFIG.fallback.message;
  return {
    plainText: buildPlainTextExport({ sections: exportSections, title, patientName, date, introText, fallbackMessage, includeSectionHeadings: hasExplicitSections || exportSections.length > 1 }),
    emailHtml: buildEmailHtml({ sections: exportSections, title, patientName, date, introText, fallbackMessage, includeSectionHeadings: hasExplicitSections || exportSections.length > 1 })
  };
}

async function copyForEmailClients() {
  if (!ensureProgramForActions()) return;
  const { plainText, emailHtml } = buildProgramExports();

  try {
    if (!navigator?.clipboard) throw new Error('clipboard unavailable');
    if (typeof navigator.clipboard.write === 'function' && typeof ClipboardItem !== 'undefined') {
      const item = new ClipboardItem({
        'text/html': new Blob([emailHtml], { type: 'text/html' }),
        'text/plain': new Blob([plainText], { type: 'text/plain' })
      });
      await navigator.clipboard.write([item]);
      setCopyStatus('Copied for Gmail/Outlook with formatting and clickable links.', 'success');
      return;
    }

    if (!navigator.clipboard.writeText) throw new Error('clipboard unavailable');
    await navigator.clipboard.writeText(plainText);
    setCopyStatus('Rich copy is unavailable in this browser. Copied plain text instead.', 'warning');
  } catch {
    window.prompt('Clipboard unavailable. Copy your summary below:', plainText);
    setCopyStatus('Clipboard API unavailable. Used manual copy prompt.', 'warning');
  }
}

async function copyPlainText() {
  if (!ensureProgramForActions()) return;
  const { plainText } = buildProgramExports();
  try {
    if (!navigator?.clipboard?.writeText) throw new Error('clipboard unavailable');
    await navigator.clipboard.writeText(plainText);
    setCopyStatus('Plain text summary copied.', 'success');
  } catch {
    window.prompt('Clipboard unavailable. Copy your plain text summary below:', plainText);
    setCopyStatus('Clipboard API unavailable. Used manual copy prompt.', 'warning');
  }
}

function buildSummaryTextForProgram(forEmail) {
  const exportSections = buildSectionsForOutput().map(section => ({
    ...section,
    exercises: section.exercises.map(resolveInstructionsForExercise)
  }));

  return buildSummaryText({
    sections: exportSections,
    title: programTitleEl?.value.trim() || 'Home Exercise Program',
    patientName: patientNameEl?.value.trim() || 'Patient',
    date: formatDate(programDateEl?.value),
    introText: introTextEl?.value.trim() || '',
    fallbackMessage: VIDEO_MATCHING_CONFIG.fallback.message,
    includeSectionHeadings: hasExplicitSections || exportSections.length > 1,
    forEmail
  });
}

function updateCopyButtonsState() {
  const hasContent = exercises.length > 0;
  if (copyForEmailBtn) copyForEmailBtn.disabled = !hasContent;
  if (copyPlainTextBtn) copyPlainTextBtn.disabled = !hasContent;
  if (!hasContent) setCopyStatus('', 'idle');
}

function setCopyStatus(message, tone = 'idle') {
  if (!copyStatusEl) return;
  copyStatusEl.textContent = message;
  copyStatusEl.dataset.tone = tone;
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

function persistDraftState() {
  try {
    const payload = {
      patientName: patientNameEl?.value || '',
      recipientEmail: recipientEmailEl?.value || '',
      programTitle: programTitleEl?.value || '',
      programDate: programDateEl?.value || '',
      introText: introTextEl?.value || '',
      inputText: inputTextEl?.value || '',
      lastParsedInputText,
      hasExplicitSections,
      programSections: programSections.map(section => ({
        ...section,
        exercises: section.exercises.map(exercise => ({
          ...exercise,
          instructions: Array.isArray(exercise.instructions) ? [...exercise.instructions] : []
        }))
      })),
      exercises: exercises.map(exercise => ({
        ...exercise,
        instructions: Array.isArray(exercise.instructions) ? [...exercise.instructions] : []
      }))
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // no-op in restricted contexts
  }
}

function restoreDraftState() {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return;
    const payload = JSON.parse(raw);
    if (typeof payload !== 'object' || !payload) return;

    if (patientNameEl && typeof payload.patientName === 'string') patientNameEl.value = payload.patientName;
    if (recipientEmailEl && typeof payload.recipientEmail === 'string') recipientEmailEl.value = payload.recipientEmail;
    if (programTitleEl && typeof payload.programTitle === 'string') programTitleEl.value = payload.programTitle;
    if (programDateEl && typeof payload.programDate === 'string' && payload.programDate) programDateEl.value = payload.programDate;
    if (introTextEl && typeof payload.introText === 'string') introTextEl.value = payload.introText;
    if (inputTextEl && typeof payload.inputText === 'string') inputTextEl.value = payload.inputText;
    if (typeof payload.lastParsedInputText === 'string') lastParsedInputText = payload.lastParsedInputText;
    hasExplicitSections = Boolean(payload.hasExplicitSections);
    if (Array.isArray(payload.programSections) && payload.programSections.length) {
      programSections = payload.programSections.map((section, sectionIndex) => ({
        id: section?.id || `restored-section-${sectionIndex}-${Date.now()}`,
        name: section?.name || 'Exercises',
        rawLabel: section?.rawLabel || section?.name || 'Exercises',
        frequencyLabel: section?.frequencyLabel || '',
        notes: section?.notes || '',
        order: Number.isInteger(section?.order) ? section.order : sectionIndex,
        exercises: Array.isArray(section?.exercises)
          ? section.exercises.map((exercise, exerciseIndex) => hydrateExercise(exercise, exerciseIndex))
          : []
      })).filter(section => section.exercises.length);
      exercises = flattenSections(programSections);
      return;
    }

    if (Array.isArray(payload.exercises)) {
      exercises = payload.exercises.map((exercise, index) => hydrateExercise(exercise, index));
      programSections = exercises.length
        ? [{ id: 'section-0', name: 'Exercises', rawLabel: 'Exercises', frequencyLabel: '', notes: '', order: 0, exercises }]
        : [];
    }
  } catch {
    exercises = [];
    programSections = [];
    hasExplicitSections = false;
    lastParsedInputText = '';
  }
}

function hydrateExercise(exercise, index) {
  const safeExercise = exercise && typeof exercise === 'object' ? exercise : {};
  const canonicalExerciseId = safeExercise.canonical_exercise_id || null;
  const videoAssignment = resolveExerciseVideoAssignment({
    canonicalExerciseId,
    exerciseName: safeExercise.canonicalName || safeExercise.display_name || safeExercise.name || '',
    whitelist: approvedVideoWhitelist,
    legacyVideoUrl: safeExercise.videoUrl || safeExercise.videoOverrideUrl || (safeExercise.video_links || [])[0] || '',
    legacyVideoSource: safeExercise.videoSource || safeExercise.videoMode || ''
  });
  return {
    ...safeExercise,
    id: safeExercise.id || `restored-${index}-${Date.now()}`,
    canonical_exercise_id: canonicalExerciseId,
    display_name: safeExercise.display_name || safeExercise.name || 'Exercise',
    section_id: safeExercise.section_id || 'section-0',
    section_name: safeExercise.section_name || 'Exercises',
    section_label: safeExercise.section_label || safeExercise.section_name || 'Exercises',
    section_frequency_label: safeExercise.section_frequency_label || '',
    section_order: Number.isInteger(safeExercise.section_order) ? safeExercise.section_order : 0,
    instructions: Array.isArray(safeExercise.instructions) ? splitInputLines(safeExercise.instructions.join('\n')) : [],
    instruction_source: safeExercise.instruction_source || 'generated',
    videoMode: videoAssignment.videoMode,
    videoSource: videoAssignment.videoSource,
    videoLabel: videoAssignment.videoLabel,
    videoUrl: videoAssignment.videoUrl,
    videoOverrideUrl: videoAssignment.videoOverrideUrl,
    video_links: videoAssignment.video_links,
    video: videoAssignment.video
  };
}


function flattenSections(sections = []) {
  return sections.flatMap(section => section.exercises || []);
}

function buildSectionsForOutput() {
  if (Array.isArray(programSections) && programSections.length) {
    return [...programSections]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map(section => ({
        ...section,
        label: section.frequencyLabel ? `${section.name} ${section.frequencyLabel}` : section.rawLabel || section.name || 'Exercises',
        exercises: (section.exercises || []).slice()
      }))
      .filter(section => section.exercises.length);
  }

  if (!exercises.length) return [];

  return [{
    id: 'section-0',
    name: 'Exercises',
    rawLabel: 'Exercises',
    frequencyLabel: '',
    notes: '',
    order: 0,
    label: 'Exercises',
    exercises: exercises.slice()
  }];
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
