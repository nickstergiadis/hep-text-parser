import { CONFIDENCE_TIERS, VIDEO_MATCHING_CONFIG } from './config.js';

const EXERCISE_NAME_ALIASES = new Map([
  ['clam shell', 'Sidelying Clamshell'],
  ['clams', 'Sidelying Clamshell'],
  ['clamshell', 'Sidelying Clamshell'],
  ['tke', 'Terminal Knee Extension with Band'],
  ['terminal knee extension', 'Terminal Knee Extension with Band'],
  ['slr', 'Straight Leg Raise'],
  ['bridge', 'Glute Bridge'],
  ['chin tuck', 'Chin Tuck']
]);

const VAGUE_EXERCISE_PATTERNS = [
  /^exercise$/i,
  /^stretches?$/i,
  /^stretching$/i,
  /^mobility$/i,
  /^strength(?:ening)?$/i,
  /^home program$/i,
  /^hep$/i
];

export function cleanExerciseLabel(input) {
  return String(input || '')
    .replace(/[–—]/g, '-')
    .replace(/^\s*(?:[-*•]+|\d+[.)]\s*)+/, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[:|-]+\s*(?:\d+\s*x\s*\d+(?:\s*\/\s*(?:side|leg|arm))?|\d+\s*(?:reps?|sec|secs|seconds|min|mins|minutes))\b.*$/i, ' ')
    .replace(/\b\d+\s*x\s*\d+(?:\s*\/\s*(?:side|leg|arm))?(?:\s*(?:reps?|sec|secs|seconds|min|mins|minutes))?\b.*$/i, ' ')
    .replace(/\bx\s*\d+(?:\s*(?:reps?|sec|secs|seconds|min|mins|minutes))?\b.*$/i, ' ')
    .replace(/\b\d+\s*(?:reps?|sec|secs|seconds|min|mins|minutes)\b.*$/i, ' ')
    .replace(/\bhold\s+\d+\s*(?:sec|secs|seconds|min|mins|minutes)\b.*$/i, ' ')
    .replace(/\b(?:each|per)\s+(?:side|leg|arm)\b.*$/i, ' ')
    .replace(/\b(?:left|right)\b.*$/i, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[,;:\-\s]+|[,;:\-\s]+$/g, '')
    .trim();
}

export function normalizeExerciseText(input) {
  return cleanExerciseLabel(input)
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(hold|sec|secs|seconds|min|mins|minutes|daily|weekly|x\/week)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenOverlapScore(a, b) {
  const aTokens = new Set(a.split(' ').filter(Boolean));
  const bTokens = new Set(b.split(' ').filter(Boolean));
  if (!aTokens.size || !bTokens.size) return 0;
  let overlap = 0;
  aTokens.forEach(token => {
    if (bTokens.has(token)) overlap += 1;
  });
  return Math.round((overlap / Math.max(aTokens.size, bTokens.size)) * 100);
}

export function normalizeExerciseName(name) {
  const compact = cleanExerciseLabel(name);
  if (!compact) return '';

  const stripped = compact
    .replace(/\b(with|using|w\/)\s+(band|resistance band|dumbbell|weights?)\b.*$/i, ' ')
    .replace(/\b\d+\s*x\s*\d+(?:\s*(?:sec|secs|seconds|min|mins|minutes))?\b.*$/i, ' ')
    .replace(/\bhold\s+\d+\s*(?:sec|secs|seconds|min|mins|minutes)\b.*$/i, ' ')
    .replace(/\b(?:each|per)\s+(?:side|leg|arm)\b.*$/i, ' ')
    .replace(/\b(?:left|right)\b.*$/i, ' ')
    .replace(/\b(?:pain|sore|soreness|discomfort|comment|note|notes?)\b.*$/i, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!stripped) return '';
  const aliasValue = EXERCISE_NAME_ALIASES.get(stripped.toLowerCase());
  return aliasValue || stripped;
}

export function isUsefulExerciseName(name) {
  const value = String(name || '').trim();
  if (!value) return false;
  if (!/[a-z]/i.test(value)) return false;
  return !VAGUE_EXERCISE_PATTERNS.some(pattern => pattern.test(value));
}

export function isValidVideoUrl(url) {
  try {
    const parsed = new URL(String(url || '').trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function buildYoutubeSearchQuery(canonicalName) {
  const normalizedName = normalizeExerciseName(canonicalName);
  if (!normalizedName) return '';
  return `${normalizedName} exercise`;
}

export function buildYoutubeSearchUrl(canonicalName) {
  const query = buildYoutubeSearchQuery(canonicalName);
  if (!query) return '';
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

export function matchExerciseToCanonical(rawInput, exercisesMaster) {
  const normalized = normalizeExerciseText(rawInput);
  let best = null;

  for (const exercise of exercisesMaster) {
    const names = [exercise.canonical_name, ...(exercise.aliases || [])].map(normalizeExerciseText);
    const bestNameScore = Math.max(...names.map(name => tokenOverlapScore(normalized, name)));
    const exact = names.includes(normalized) || names.some(name => normalized.includes(name) || name.includes(normalized));
    const finalScore = exact ? Math.max(bestNameScore, 95) : bestNameScore;

    if (!best || finalScore > best.score) {
      best = { exercise, score: finalScore };
    }
  }

  if (!best || best.score < 55) {
    return { canonical: null, matchScore: 0, normalizedInput: normalized };
  }

  return { canonical: best.exercise, matchScore: best.score, normalizedInput: normalized };
}

export function buildFallbackVideo(exerciseId = null) {
  return {
    exercise_id: exerciseId,
    status: VIDEO_MATCHING_CONFIG.fallback.status,
    message: VIDEO_MATCHING_CONFIG.fallback.message,
    youtube_video_id: null,
    embed_url: null,
    confidence_tier: CONFIDENCE_TIERS.REJECTED
  };
}

export function resolveWhitelistedVideo(exerciseId, whitelist, options = {}) {
  const allowLower = options.useLowerConfidenceVideos ?? VIDEO_MATCHING_CONFIG.useLowerConfidenceVideos;
  const rows = (whitelist || []).filter(row => row.exercise_id === exerciseId && row.active !== false);

  const high = rows.find(row => row.confidence_tier === CONFIDENCE_TIERS.APPROVED_HIGH_CONFIDENCE);
  if (high) return high;

  if (allowLower) {
    const lower = rows.find(row => row.confidence_tier === CONFIDENCE_TIERS.APPROVED_LOWER_CONFIDENCE);
    if (lower) return lower;
  }

  return null;
}
