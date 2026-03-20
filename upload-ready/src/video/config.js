export const CONFIDENCE_TIERS = {
  APPROVED_HIGH_CONFIDENCE: 'APPROVED_HIGH_CONFIDENCE',
  APPROVED_LOWER_CONFIDENCE: 'APPROVED_LOWER_CONFIDENCE',
  REJECTED: 'REJECTED'
};

export const VIDEO_MATCHING_CONFIG = {
  useLowerConfidenceVideos: false,
  scoring: {
    highConfidenceThreshold: 85,
    lowerConfidenceThreshold: 72,
    rejectThreshold: 0,
    minDurationSeconds: 20,
    maxDurationSeconds: 480
  },
  fallback: {
    status: 'VIDEO_UNAVAILABLE',
    message: 'Video currently unavailable.'
  }
};

export const RED_FLAG_PATTERNS = [
  /fix .* fast/i,
  /best .* exercise/i,
  /miracle/i,
  /challenge/i,
  /fat burn/i,
  /no pain no gain/i
];

export const CHANNEL_QUALITY_HINTS = [/pt/i, /physical therapy/i, /rehab/i, /physio/i, /orthopedic/i];
