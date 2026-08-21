import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { buildSearchIndex, NORMALIZATION_VERSION } from '../src/engine/search.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dataPath = path.join(root, 'src/data/quranData.json');
const outPath = path.join(root, 'dist/src/data/quranSearchIndex.json');

function readJson(filePath) {
  const source = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/u, '');
  return JSON.parse(source);
}

const quranData = readJson(dataPath);

if (!Array.isArray(quranData) || quranData.length !== 6236) {
  throw new Error(`[search-index] Expected 6236 ayahs, found ${quranData.length}`);
}

const surahIds = new Set(quranData.map(item => item.surahId));
if (surahIds.size !== 114) {
  throw new Error(`[search-index] Expected 114 surahs, found ${surahIds.size}`);
}

const corpus = quranData.map((ayah, index) => ({ ...ayah, globalNumber: index + 1 }));
const index = buildSearchIndex(corpus);

const payload = {
  ...index,
  source: {
    file: 'src/data/quranData.json',
    sha256: crypto.createHash('sha256').update(fs.readFileSync(dataPath)).digest('hex'),
    ayahCount: quranData.length,
    surahCount: surahIds.size,
    normalizationVersion: NORMALIZATION_VERSION
  }
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload));

console.log(`[search-index] Ayahs ${quranData.length} PASS`);
console.log(`[search-index] Surahs ${surahIds.size} PASS`);
console.log(`[search-index] Documents ${index.documentCount} PASS`);
console.log(`[search-index] Written ${path.relative(root, outPath)}`);
