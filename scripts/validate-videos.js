import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

async function validateEntry(entry, apiKey) {
  const url = new URL('https://www.googleapis.com/youtube/v3/videos');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('part', 'snippet,status');
  url.searchParams.set('id', entry.youtube_video_id);

  const resp = await fetch(url);
  const json = await resp.json();
  const item = json.items?.[0];
  if (!item) return { status: 'BROKEN', reason: 'Video metadata missing.' };

  const embeddable = Boolean(item.status?.embeddable);
  const isPublic = item.status?.privacyStatus === 'public';
  if (!embeddable || !isPublic) {
    return { status: 'BROKEN', reason: 'Video is non-public or non-embeddable.' };
  }

  return { status: 'OK', reason: 'Video resolves and is embeddable/public.' };
}

async function main() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY is required for validation.');

  const whitelist = await readJson('data/video_whitelist.json', []);
  const report = {
    generated_at: new Date().toISOString(),
    total_checked: whitelist.length,
    healthy: 0,
    broken: 0,
    promoted_backups: 0,
    entries: []
  };

  const byExercise = whitelist.reduce((acc, entry) => {
    acc[entry.exercise_id] = acc[entry.exercise_id] || [];
    acc[entry.exercise_id].push(entry);
    return acc;
  }, {});

  for (const entry of whitelist) {
    const validation = await validateEntry(entry, apiKey);
    report.entries.push({
      exercise_id: entry.exercise_id,
      youtube_video_id: entry.youtube_video_id,
      result: validation.status,
      reason: validation.reason
    });

    if (validation.status === 'OK') {
      report.healthy += 1;
      continue;
    }

    report.broken += 1;
    entry.active = false;

    const backups = (byExercise[entry.exercise_id] || []).filter(item => item.youtube_video_id !== entry.youtube_video_id && item.active !== false);
    if (backups.length) {
      backups[0].active = true;
      report.promoted_backups += 1;
    }
  }

  const summary = `# Video Validation Summary\n\n- Generated: ${report.generated_at}\n- Total checked: ${report.total_checked}\n- Healthy: ${report.healthy}\n- Broken: ${report.broken}\n- Backups promoted: ${report.promoted_backups}\n`;

  await writeJson('data/video_validation_report.json', report);
  await writeJson('data/video_whitelist.json', whitelist);
  await fs.writeFile(path.join(root, 'reports/validation_summary.md'), summary, 'utf8');

  console.log(summary);
}

main().catch(err => {
  console.error(err.message);
  process.exitCode = 1;
});
