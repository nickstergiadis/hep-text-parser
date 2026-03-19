import { scoreCandidate } from './scoring.js';
import { CONFIDENCE_TIERS } from './config.js';

export function generateQueries(exercise) {
  const base = [exercise.canonical_name, ...(exercise.aliases || [])]
    .map(name => `${name} physical therapy exercise form`)
    .slice(0, 4);
  return [...new Set(base)];
}

function durationToSeconds(isoDuration = '') {
  const m = isoDuration.match(/PT(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!m) return 0;
  return (Number(m[1] || 0) * 60) + Number(m[2] || 0);
}

export async function fetchYoutubeCandidates({ apiKey, exercise, maxResults = 5 }) {
  if (!apiKey) throw new Error('YOUTUBE_API_KEY is required for refreshing candidates.');
  const queries = generateQueries(exercise);
  const aggregate = [];

  for (const query of queries) {
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('key', apiKey);
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('maxResults', String(maxResults));
    searchUrl.searchParams.set('q', query);

    const searchResp = await fetch(searchUrl);
    const searchJson = await searchResp.json();
    const ids = (searchJson.items || []).map(item => item.id.videoId).filter(Boolean);
    if (!ids.length) continue;

    const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    videosUrl.searchParams.set('key', apiKey);
    videosUrl.searchParams.set('part', 'snippet,contentDetails,status');
    videosUrl.searchParams.set('id', ids.join(','));

    const videosResp = await fetch(videosUrl);
    const videosJson = await videosResp.json();

    for (const item of videosJson.items || []) {
      aggregate.push({
        exercise_id: exercise.exercise_id,
        youtube_video_id: item.id,
        title: item.snippet?.title || '',
        description: item.snippet?.description || '',
        channel_title: item.snippet?.channelTitle || '',
        duration_seconds: durationToSeconds(item.contentDetails?.duration || ''),
        embeddable: Boolean(item.status?.embeddable),
        public: item.status?.privacyStatus === 'public',
        url: `https://www.youtube.com/watch?v=${item.id}`,
        embed_url: `https://www.youtube.com/embed/${item.id}`,
        query
      });
    }
  }

  return aggregate;
}

export function rankCandidates(exercise, candidates) {
  const approved = [];
  const rejected = [];

  for (const candidate of candidates) {
    const scored = scoreCandidate({ exercise, candidate, existing: [...approved, ...rejected] });
    const row = { ...candidate, score: scored.score, confidence_tier: scored.tier, reasons: scored.reasons };

    if (scored.tier === CONFIDENCE_TIERS.REJECTED) rejected.push(row);
    else approved.push(row);
  }

  approved.sort((a, b) => b.score - a.score);

  return {
    approved,
    rejected,
    topHighConfidence: approved.find(item => item.confidence_tier === CONFIDENCE_TIERS.APPROVED_HIGH_CONFIDENCE) || null
  };
}
