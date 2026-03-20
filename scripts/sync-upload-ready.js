import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET_DIR = path.join(ROOT, 'upload-ready');

const RUNTIME_FILES = [
  'index.html',
  'app.js',
  'style.css',
  'data/exercises_master.json',
  'data/video_whitelist.json',
  'src/video/config.js',
  'src/video/matcher.js',
  'src/app/output.js'
];

for (const relPath of RUNTIME_FILES) {
  const sourcePath = path.join(ROOT, relPath);
  const targetPath = path.join(TARGET_DIR, relPath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
}

console.log(`Synced ${RUNTIME_FILES.length} runtime files into upload-ready/.`);
