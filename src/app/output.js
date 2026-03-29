import { resolveExerciseInstructions } from './instructions.js';

export function shouldShowSearchVideoDisclaimer(exercises = []) {
  return false;
}

export function buildDoseString(exercise) {
  const parts = [];
  if (exercise.sets && exercise.reps) parts.push(`${exercise.sets} sets x ${exercise.reps} reps`);
  else if (exercise.sets && exercise.duration) parts.push(`${exercise.sets} sets x ${exercise.duration}`);
  else if (exercise.duration) parts.push(exercise.duration);
  if (exercise.hold) parts.push(`${exercise.hold} hold`);
  if (exercise.side) parts.push(exercise.side);
  if (exercise.frequency) parts.push(exercise.frequency);
  return parts.join(' • ');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function buildProgramExportModel({ exercises = [], sections = [], title, patientName, date, fallbackMessage, introText, includeSectionHeadings = false }) {
  const sourceSections = Array.isArray(sections) && sections.length
    ? sections
    : [{ id: 'section-0', label: 'Exercises', exercises }];

  const resolvedSections = sourceSections
    .map((section, sectionIndex) => {
      const sectionExercises = Array.isArray(section.exercises) ? section.exercises : [];
      const resolvedExercises = sectionExercises.map((exercise) => {
        const resolved = resolveExerciseInstructions({
          canonicalExerciseId: exercise.canonical_exercise_id,
          canonicalName: exercise.canonicalName || exercise.display_name,
          displayName: exercise.display_name,
          rawInput: exercise.raw_input,
          aliases: exercise.canonical_aliases || [],
          existingInstructions: exercise.instructions,
          instructionSource: exercise.instruction_source
        });

        const videoLinks = Array.isArray(exercise.video_links)
          ? exercise.video_links.filter(Boolean).map(url => String(url).trim()).filter(Boolean)
          : [];

        return {
          name: exercise.display_name || 'Exercise',
          dose: buildDoseString(exercise),
          instructions: resolved.instructions,
          notes: String(exercise.notes || '').trim(),
          videoLinks,
          videoFallback: videoLinks.length ? '' : (exercise.video?.message || fallbackMessage)
        };
      });

      const rawLabel = String(section.label || section.rawLabel || section.name || `Section ${sectionIndex + 1}`).trim();
      return {
        id: section.id || `section-${sectionIndex}`,
        label: rawLabel || `Section ${sectionIndex + 1}`,
        exercises: resolvedExercises
      };
    })
    .filter(section => section.exercises.length);

  return {
    title: title || 'Home Exercise Program',
    patientName: patientName || 'Patient',
    date: date || '—',
    introText: String(introText || '').trim(),
    hasSearchVideoLinks: false,
    includeSectionHeadings: Boolean(includeSectionHeadings),
    sections: resolvedSections
  };
}

export function buildSummaryText({ exercises = [], sections = [], title, patientName, date, fallbackMessage, forEmail = false, introText = '', includeSectionHeadings = false }) {
  const newline = forEmail ? '\r\n' : '\n';
  const program = buildProgramExportModel({
    exercises,
    sections,
    title,
    patientName,
    date,
    fallbackMessage,
    introText,
    includeSectionHeadings
  });
  const lines = [program.title, `Patient: ${program.patientName}`, `Date: ${program.date}`];
  if (introText) lines.push('', String(introText).trim());
  lines.push('', 'Exercises:');

  const shouldShowSections = program.includeSectionHeadings || program.sections.length > 1;

  program.sections.forEach((section) => {
    if (shouldShowSections) lines.push('', `${section.label}:`);
    section.exercises.forEach((exercise, index) => {
      lines.push(`${index + 1}. ${exercise.name}${exercise.dose ? ` — ${exercise.dose}` : ''}`);
      exercise.instructions.forEach(step => lines.push(`   - ${step}`));
      if (exercise.notes) lines.push(`   - Notes: ${exercise.notes}`);
      if (exercise.videoLinks.length) {
        exercise.videoLinks.forEach(url => lines.push(`   - Video: ${url}`));
      } else {
        lines.push(`   - Video: ${exercise.videoFallback}`);
      }
    });
  });

  return lines.join(newline);
}

export function buildPlainTextExport({ exercises = [], sections = [], title, patientName, date, fallbackMessage, introText, includeSectionHeadings = false }) {
  return buildSummaryText({ exercises, sections, title, patientName, date, fallbackMessage, forEmail: false, introText, includeSectionHeadings });
}

export function buildEmailHtml({ exercises = [], sections = [], title, patientName, date, fallbackMessage, introText, includeSectionHeadings = false }) {
  const program = buildProgramExportModel({
    exercises,
    sections,
    title,
    patientName,
    date,
    fallbackMessage,
    introText,
    includeSectionHeadings
  });

  const introHtml = program.introText
    ? `<p style="margin:0 0 12px 0;">${escapeHtml(program.introText)}</p>`
    : '';

  const shouldShowSections = program.includeSectionHeadings || program.sections.length > 1;

  const sectionBlocks = program.sections.map((section) => {
    const sectionHeading = shouldShowSections
      ? `<p style="margin:0 0 8px 0;"><strong>${escapeHtml(section.label)}</strong></p>`
      : '';

    const exerciseItems = section.exercises.map((exercise, index) => {
      const instructionItems = exercise.instructions.length
        ? `<ul style="margin:6px 0 0 18px;padding:0;">${exercise.instructions.map(step => `<li style="margin:0 0 3px 0;">${escapeHtml(step)}</li>`).join('')}</ul>`
        : '';
      const notesLine = exercise.notes
        ? `<p style="margin:6px 0 0 0;">Notes: ${escapeHtml(exercise.notes)}</p>`
        : '';
      const linkLines = exercise.videoLinks.length
        ? exercise.videoLinks.map((url, linkIndex) => `<p style="margin:6px 0 0 0;">Video${exercise.videoLinks.length > 1 ? ` ${linkIndex + 1}` : ''}: <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Open link</a></p>`).join('')
        : `<p style="margin:6px 0 0 0;">Video: ${escapeHtml(exercise.videoFallback)}</p>`;
      const doseLine = exercise.dose
        ? `<p style="margin:4px 0 0 0;">${escapeHtml(exercise.dose)}</p>`
        : '';

      return `<li style="margin:0 0 12px 0;"><p style="margin:0;"><strong>${index + 1}. ${escapeHtml(exercise.name)}</strong></p>${doseLine}${instructionItems}${notesLine}${linkLines}</li>`;
    }).join('');

    return `<section style="margin:0 0 14px 0;">${sectionHeading}<ul style="margin:0 0 0 18px;padding:0;">${exerciseItems}</ul></section>`;
  }).join('');

  return `<div><p style="margin:0 0 8px 0;"><strong>${escapeHtml(program.title)}</strong></p><p style="margin:0;">Patient: ${escapeHtml(program.patientName)}</p><p style="margin:0 0 12px 0;">Date: ${escapeHtml(program.date)}</p>${introHtml}<p style="margin:0 0 8px 0;"><strong>Exercises</strong></p>${sectionBlocks}</div>`;
}

export function buildEmailDraftHref({ recipient, subject, body }) {
  return `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
