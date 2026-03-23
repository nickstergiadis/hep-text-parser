import { resolveExerciseInstructions } from './instructions.js';
const SEARCH_RESULTS_DISCLAIMER = 'Search results may vary. Confirm the title matches your prescribed exercise.';

function isSearchLink(url) {
  const value = String(url || '').trim().toLowerCase();
  return value.startsWith('https://www.youtube.com/results?search_query=')
    || value.startsWith('http://www.youtube.com/results?search_query=');
}

function isSearchVideoExercise(exercise) {
  const source = String(exercise?.videoSource || '').trim().toLowerCase();
  if (source) return source === 'search';

  return (exercise?.video_links || []).some(isSearchLink);
}

export function shouldShowSearchVideoDisclaimer(exercises = []) {
  return exercises.some(isSearchVideoExercise);
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

export function buildSummaryText({ exercises, title, patientName, date, fallbackMessage, forEmail = false }) {
  const newline = forEmail ? '\r\n' : '\n';
  const lines = [title || 'Home Exercise Program', `Patient: ${patientName || 'Patient'}`, `Date: ${date || '—'}`, '', 'Exercises:'];
  const hasSearchVideoLinks = shouldShowSearchVideoDisclaimer(exercises);

  if (hasSearchVideoLinks) {
    lines.push(SEARCH_RESULTS_DISCLAIMER, '');
  }

  exercises.forEach((exercise, index) => {
    const resolved = resolveExerciseInstructions({
      canonicalExerciseId: exercise.canonical_exercise_id,
      canonicalName: exercise.canonicalName || exercise.display_name,
      displayName: exercise.display_name,
      rawInput: exercise.raw_input,
      aliases: exercise.canonical_aliases || [],
      existingInstructions: exercise.instructions,
      instructionSource: exercise.instruction_source
    });
    const dose = buildDoseString(exercise);
    lines.push(`${index + 1}. ${exercise.display_name}${dose ? ` — ${dose}` : ''}`);
    resolved.instructions.forEach(step => lines.push(`   - ${step}`));
    if ((exercise.video_links || []).length) {
      exercise.video_links.forEach(url => lines.push(`   - ${url}`));
    } else {
      lines.push(`   - ${exercise.video?.message || fallbackMessage}`);
    }
  });

  return lines.join(newline);
}

export function buildEmailDraftHref({ recipient, subject, body }) {
  return `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
