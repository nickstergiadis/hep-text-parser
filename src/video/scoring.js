import { CHANNEL_QUALITY_HINTS, CONFIDENCE_TIERS, RED_FLAG_PATTERNS, VIDEO_MATCHING_CONFIG } from './config.js';
import { normalizeExerciseText } from './matcher.js';

function includesAny(haystack, needles) {
  const hay = normalizeExerciseText(haystack);
  const hayTokens = new Set(hay.split(' ').filter(Boolean));
  return needles.some(item => {
    const targetTokens = normalizeExerciseText(item).split(' ').filter(Boolean);
    if (!targetTokens.length) return false;
    const overlap = targetTokens.filter(token => hayTokens.has(token)).length;
    return overlap / targetTokens.length >= 0.5;
  });
}

export function scoreCandidate({ exercise, candidate, existing = [] }) {
  const reasons = [];
  let score = 0;
  const title = normalizeExerciseText(candidate.title);
  const description = normalizeExerciseText(candidate.description);
  const canonical = normalizeExerciseText(exercise.canonical_name);
  const aliases = (exercise.aliases || []).map(normalizeExerciseText);
  const allNames = [canonical, ...aliases];

  if (allNames.some(name => title === name)) {
    score += 40;
    reasons.push('Exact title match to canonical/alias.');
  } else if (includesAny(title, allNames)) {
    score += 28;
    reasons.push('Title contains canonical/alias phrase.');
  } else {
    score -= 25;
    reasons.push('Title does not match canonical name.');
  }

  if (includesAny(description, [exercise.canonical_name, ...(exercise.movement_tags || [])])) {
    score += 14;
    reasons.push('Description contains relevant clinical movement language.');
  } else {
    score -= 10;
    reasons.push('Description lacks exercise-specific context.');
  }

  if (includesAny(`${title} ${description}`, exercise.movement_tags || [])) score += 10;
  else score -= 12;

  if (includesAny(`${title} ${description}`, [exercise.body_region])) score += 8;
  else score -= 8;

  if (exercise.equipment && exercise.equipment !== 'none') {
    if (includesAny(`${title} ${description}`, [exercise.equipment])) score += 6;
    else score -= 8;
  }

  if (candidate.variation_mismatch) {
    score -= 30;
    reasons.push('Variation mismatch detected.');
  }

  if (!candidate.embeddable || !candidate.public) {
    score -= 35;
    reasons.push('Not embeddable/public.');
  }

  const seconds = Number(candidate.duration_seconds || 0);
  if (seconds < VIDEO_MATCHING_CONFIG.scoring.minDurationSeconds || seconds > VIDEO_MATCHING_CONFIG.scoring.maxDurationSeconds) {
    score -= 15;
    reasons.push('Duration outside instructional range.');
  } else {
    score += 8;
  }

  if (CHANNEL_QUALITY_HINTS.some(pattern => pattern.test(candidate.channel_title || ''))) score += 7;

  if (RED_FLAG_PATTERNS.some(pattern => pattern.test(`${candidate.title} ${candidate.description}`))) {
    score -= 24;
    reasons.push('Clickbait/red-flag wording.');
  }

  if (existing.some(item => item.youtube_video_id === candidate.youtube_video_id)) {
    score -= 40;
    reasons.push('Duplicate video ID in candidate pool.');
  }

  let tier = CONFIDENCE_TIERS.REJECTED;
  if (score >= VIDEO_MATCHING_CONFIG.scoring.highConfidenceThreshold) tier = CONFIDENCE_TIERS.APPROVED_HIGH_CONFIDENCE;
  else if (score >= VIDEO_MATCHING_CONFIG.scoring.lowerConfidenceThreshold) tier = CONFIDENCE_TIERS.APPROVED_LOWER_CONFIDENCE;

  return { score, tier, reasons };
}
