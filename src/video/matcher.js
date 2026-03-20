import { CONFIDENCE_TIERS, VIDEO_MATCHING_CONFIG } from './config.js';

const EXERCISE_NAME_ALIASES = new Map([
  ['clam shell', 'Sidelying Clamshell'],
  ['clams', 'Sidelying Clamshell'],
  ['tke', 'Terminal Knee Extension with Band'],
  ['slr', 'Straight Leg Raise'],
  ['bridge', 'Glute Bridge']
]);

export function normalizeExerciseText(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b\d+x\d+\b/g, ' ')
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
  const compact = String(name || '').replace(/\s+/g, ' ').trim();
  if (!compact) return '';
  const aliasValue = EXERCISE_NAME_ALIASES.get(compact.toLowerCase());
  return aliasValue || compact;
}

export function buildYoutubeSearchQuery(canonicalName) {
  const normalizedName = normalizeExerciseName(canonicalName);
  if (!normalizedName) return '';
  return `${normalizedName} exercise physiotherapy instructions`;
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
