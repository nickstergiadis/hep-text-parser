import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchYoutubeCandidates, rankCandidates } from '../src/video/pipeline.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

async function readJson(relPath, fallback) {
  try {
    const content = await fs.readFile(path.join(root, relPath), 'utf8');
    return JSON.parse(content);
  } catch {
    return fallback;
  }
}

async function writeJson(relPath, data) {
  await fs.writeFile(path.join(root, relPath), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function main() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const exercises = await readJson('data/exercises_master.json', []);
  const whitelist = await readJson('data/video_whitelist.json', []);
  const existingApprovedIds = new Set(whitelist.map(item => item.exercise_id));

  const candidatesOut = [];
  const rejectionsOut = [];
  const newWhitelist = [...whitelist];

  for (const exercise of exercises) {
    if (existingApprovedIds.has(exercise.exercise_id)) continue;

    const candidates = await fetchYoutubeCandidates({ apiKey, exercise, maxResults: 5 });
    const ranked = rankCandidates(exercise, candidates);
    candidatesOut.push(...ranked.approved, ...ranked.rejected);
    rejectionsOut.push(...ranked.rejected);

    if (ranked.topHighConfidence) {
      newWhitelist.push({
        ...ranked.topHighConfidence,
        exercise_id: exercise.exercise_id,
        canonical_name: exercise.canonical_name,
        approved_at: new Date().toISOString(),
        active: true,
        source: 'auto'
      });
    }
  }

  await writeJson('data/video_candidates.json', candidatesOut);
  await writeJson('data/video_rejections.json', rejectionsOut);
  await writeJson('data/video_whitelist.json', newWhitelist);
  console.log(`Processed ${exercises.length} exercises; approved ${newWhitelist.length} total whitelist entries.`);
}

main().catch(err => {
  console.error(err.message);
  process.exitCode = 1;
});
