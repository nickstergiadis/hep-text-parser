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
  const hasSearchVideoLinks = exercises.some(exercise => (exercise.video_links || []).length > 0);

  if (hasSearchVideoLinks) {
    lines.push('Search results may vary. Confirm the title matches your prescribed exercise.', '');
  }

  exercises.forEach((exercise, index) => {
    const dose = buildDoseString(exercise);
    lines.push(`${index + 1}. ${exercise.display_name}${dose ? ` — ${dose}` : ''}`);
    (exercise.instructions || []).forEach(step => lines.push(`   - ${step}`));
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
