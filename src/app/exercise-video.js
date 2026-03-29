import {
  buildFallbackVideo,
  isValidVideoUrl,
  resolveWhitelistedVideo
} from '../video/matcher.js';

function isLegacyCuratedSource(source) {
  const normalized = String(source || '').trim().toLowerCase();
  return normalized === 'curated' || normalized === 'whitelist' || normalized === 'verified';
}

export function resolveExerciseVideoAssignment({
  canonicalExerciseId,
  exerciseName = '',
  whitelist,
  legacyVideoUrl = '',
  legacyVideoSource = ''
}) {
  const fallbackVideo = buildFallbackVideo(canonicalExerciseId || null);
  const approvedVideo = canonicalExerciseId ? resolveWhitelistedVideo(canonicalExerciseId, whitelist) : null;
  const approvedUrl = String(approvedVideo?.url || '').trim();
  const usableApprovedUrl = isValidVideoUrl(approvedUrl) ? approvedUrl : '';

  if (approvedVideo && usableApprovedUrl) {
    return {
      videoMode: 'whitelist',
      videoSource: 'curated',
      videoLabel: 'Watch video',
      videoUrl: usableApprovedUrl,
      video_links: [usableApprovedUrl],
      videoOverrideUrl: usableApprovedUrl,
      video: approvedVideo
    };
  }

  const legacyApprovedUrl = String(legacyVideoUrl || '').trim();
  if (legacyApprovedUrl && isLegacyCuratedSource(legacyVideoSource) && isValidVideoUrl(legacyApprovedUrl)) {
    return {
      videoMode: 'whitelist',
      videoSource: 'curated',
      videoLabel: 'Watch video',
      videoUrl: legacyApprovedUrl,
      video_links: [legacyApprovedUrl],
      videoOverrideUrl: legacyApprovedUrl,
      video: fallbackVideo
    };
  }

  return {
    videoMode: 'none',
    videoSource: 'none',
    videoLabel: '',
    videoUrl: '',
    video_links: [],
    videoOverrideUrl: '',
    video: fallbackVideo
  };
}
