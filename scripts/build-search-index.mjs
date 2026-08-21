import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildSearchIndex, NORMALIZATION_VERSION } from '../src/engine/search.js';
import { loadSearchCorpus } from './search-source.mjs';

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
  throw new Error(`[search-index] Expected 6236 display ayahs, found ${quranData.length}`);
}

const surahIds = new Set(quranData.map(item => item.surahId));
if (surahIds.size !== 114) {
  throw new Error(`[search-index] Expected 114 display surahs, found ${surahIds.size}`);
}

const displayKeys = new Set(quranData.map(item => `${item.surahId}:${item.ayahId}`));
const { corpus: searchCorpus, source } = await loadSearchCorpus(quranData);
const searchKeys = new Set(searchCorpus.map(item => `${item.surahId}:${item.ayahId}`));

if (searchKeys.size !== 6236 || [...displayKeys].some(key => !searchKeys.has(key))) {
  throw new Error('[search-index] Search/display ayah mapping FAIL');
}

const index = buildSearchIndex(searchCorpus);
const payload = {
  ...index,
  source: {
    displayFile: 'src/data/quranData.json',
    displaySha256: crypto.createHash('sha256').update(fs.readFileSync(dataPath)).digest('hex'),
    displayAyahCount: quranData.length,
    displaySurahCount: surahIds.size,
    searchRepresentation: 'ordinary-arabic',
    normalizationVersion: NORMALIZATION_VERSION,
    simpleSource: source
  }
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload));

console.log(`[search-index] Display ayahs ${quranData.length} PASS`);
console.log(`[search-index] Search ayahs ${searchCorpus.length} PASS`);
console.log(`[search-index] Ayah mapping 6236/6236 PASS`);
console.log(`[search-index] Documents ${index.documentCount} PASS`);
console.log(`[search-index] Search representation: ordinary Arabic PASS`);
console.log(`[search-index] Written ${path.relative(root, outPath)}`);
