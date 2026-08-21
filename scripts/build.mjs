import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const __dirname = path.dirname(new URL('.', import.meta.url).pathname);
const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

console.log('[build] Cleaning...');
if (fs.existsSync(dist)) fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const source = path.join(src, entry.name);
    const target = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(source, target);
    else copyFile(source, target);
  }
}

copyFile(path.join(root, 'index.html'), path.join(dist, 'index.html'));
copyFile(path.join(root, 'mushaf.html'), path.join(dist, 'mushaf.html'));
copyDir(path.join(root, 'src'), path.join(dist, 'src'));
copyDir(path.join(root, 'public'), path.join(dist, 'public'));

console.log('[build] Building ordinary-Arabic Quran search index...');
execFileSync(process.execPath, [path.join(root, 'scripts/build-search-index.mjs')], {
  cwd: root,
  stdio: 'inherit'
});

const required = [
  'dist/index.html',
  'dist/mushaf.html',
  'dist/src/data/quranData.json',
  'dist/src/data/quranPages.json',
  'dist/src/data/surahs.json',
  'dist/src/data/quranSearchIndex.json',
  'dist/src/engine/search.js',
  'dist/public/sw.js'
];

const missing = required.filter(relative => !fs.existsSync(path.join(root, relative)));
if (missing.length > 0) {
  console.error('[build] Missing', missing);
  process.exit(1);
}

const qData = JSON.parse(fs.readFileSync(path.join(dist, 'src/data/quranData.json'), 'utf8').replace(/^\uFEFF/u, ''));
console.log(`[build] Display ayahs ${qData.length} PASS`);
if (qData.length !== 6236) process.exit(1);

const builtIndex = JSON.parse(fs.readFileSync(path.join(dist, 'src/data/quranSearchIndex.json'), 'utf8'));
if (
  builtIndex.documentCount !== 6236 ||
  builtIndex.source?.displayAyahCount !== 6236 ||
  builtIndex.source?.displaySurahCount !== 114 ||
  builtIndex.source?.searchRepresentation !== 'ordinary-arabic'
) {
  console.error('[build] Search index metadata FAIL');
  process.exit(1);
}
console.log('[build] Search representation ordinary Arabic PASS');
console.log('[build] Search/display ayah mapping 6236/6236 PASS');

const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
if (!html.includes('./src/engine/search.js') || !html.includes('./src/data/quranSearchIndex.json') || !html.includes('createQuranSearcher')) {
  console.error('[build] Search engine wiring FAIL');
  process.exit(1);
}
if (/\bcorpus\.filter\b|\bfunction search\(q\)\{const n=/.test(html)) {
  console.error('[build] Legacy inline search implementation detected');
  process.exit(1);
}
console.log('[build] Search engine wiring PASS');
