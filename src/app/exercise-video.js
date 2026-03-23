import { buildFallbackVideo, isValidVideoUrl, resolveWhitelistedVideo } from '../video/matcher.js';

export function resolveExerciseVideoAssignment({ canonicalExerciseId, whitelist }) {
  const fallbackVideo = buildFallbackVideo(canonicalExerciseId || null);
  const approvedVideo = canonicalExerciseId ? resolveWhitelistedVideo(canonicalExerciseId, whitelist) : null;
  const approvedUrl = String(approvedVideo?.url || '').trim();
  const usableApprovedUrl = isValidVideoUrl(approvedUrl) ? approvedUrl : '';

  if (approvedVideo && usableApprovedUrl) {
    return {
      videoMode: 'whitelist',
      videoSource: 'curated',
      videoUrl: usableApprovedUrl,
      video_links: [usableApprovedUrl],
      videoOverrideUrl: usableApprovedUrl,
      video: approvedVideo
    };
  }

  return {
    videoMode: 'none',
    videoSource: 'none',
    videoUrl: '',
    video_links: [],
    videoOverrideUrl: '',
    video: fallbackVideo
  };
}
