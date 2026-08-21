import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createQuranSearcher } from '../src/engine/search.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

console.log('[build] Cleaning...');
if (fs.existsSync(dist)) fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

function copyFile(src, dest) { fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(src, dest); }
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const source = path.join(src, entry.name);
    const target = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(source, target); else copyFile(source, target);
  }
}

copyFile(path.join(root, 'index.html'), path.join(dist, 'index.html'));
copyFile(path.join(root, 'mushaf.html'), path.join(dist, 'mushaf.html'));
copyDir(path.join(root, 'src'), path.join(dist, 'src'));
copyDir(path.join(root, 'public'), path.join(dist, 'public'));

const required = [
  'dist/index.html', 'dist/mushaf.html',
  'dist/src/data/quranData.json', 'dist/src/data/searchData.json',
  'dist/src/data/quranPages.json', 'dist/src/data/surahs.json',
  'dist/src/engine/search.js', 'dist/public/sw.js'
];
const missing = required.filter(relative => !fs.existsSync(path.join(root, relative)));
if (missing.length) throw new Error(`[build] Missing required resources: ${missing.join(', ')}`);

const display = JSON.parse(fs.readFileSync(path.join(dist, 'src/data/quranData.json'), 'utf8'));
const search = JSON.parse(fs.readFileSync(path.join(dist, 'src/data/searchData.json'), 'utf8'));
if (display.length !== 6236 || search.length !== 6236) throw new Error('[build] Both Quran layers must contain exactly 6236 ayahs');

function buildIdentityIndex(corpus, name) {
  const index = new Map();
  for (const item of corpus) {
    const surahId = Number(item?.surahId);
    const ayahId = Number(item?.ayahId);
    if (!Number.isInteger(surahId) || !Number.isInteger(ayahId) || surahId < 1 || ayahId < 1) {
      throw new Error(`[build] Invalid ayah identity in ${name}`);
    }
    const key = `${surahId}:${ayahId}`;
    if (index.has(key)) throw new Error(`[build] Duplicate ayah identity in ${name}: ${key}`);
    index.set(key, item);
  }
  return index;
}

const displayByAyah = buildIdentityIndex(display, 'quranData.json');
const searchByAyah = buildIdentityIndex(search, 'searchData.json');
if (displayByAyah.size !== 6236 || searchByAyah.size !== 6236) {
  throw new Error('[build] Both Quran layers must contain 6236 unique ayah identities');
}
for (const key of searchByAyah.keys()) {
  if (!displayByAyah.has(key)) throw new Error(`[build] Missing display ayah for ${key}`);
}
for (const key of displayByAyah.keys()) {
  if (!searchByAyah.has(key)) throw new Error(`[build] Missing search ayah for ${key}`);
}

const ibrahim = searchByAyah.get('2:124');
if (!ibrahim || !ibrahim.text.includes('إبراهيم')) throw new Error('[build] Search corpus validation failed at 2:124: expected إبراهيم');

const quranSearcher = createQuranSearcher(search, display);
const normalizedResults = quranSearcher.search('ابراهيم');
const hamzaResults = quranSearcher.search('إبراهيم');
const normalizedMatch = normalizedResults.find(x => Number(x.surahId) === 2 && Number(x.ayahId) === 124);
const hamzaMatch = hamzaResults.find(x => Number(x.surahId) === 2 && Number(x.ayahId) === 124);
if (!normalizedMatch) throw new Error('[build] Search query ابراهيم failed to find 2:124');
if (!hamzaMatch) throw new Error('[build] Search query إبراهيم failed to find 2:124');
const uthmani = displayByAyah.get('2:124')?.text || '';
if (normalizedMatch.text !== uthmani) throw new Error('[build] Search result/display mapping failed');

const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
if (!html.includes("SEARCH_URL='./src/data/searchData.json'")) throw new Error('[build] UI search-data wiring missing');
if (!html.includes("import {createQuranSearcher,matchesSearchToken} from './src/engine/search.js'")) throw new Error('[build] UI search engine import missing');
if (html.includes('corpus=q.map') || html.includes('function search(q){const n=norm(q)')) throw new Error('[build] Legacy Uthmani-search path still present');

console.log('[build] Display ayahs 6236 PASS');
console.log('[build] Search ayahs 6236 PASS');
console.log('[build] Search/display identity mapping PASS');
console.log('[build] Search query ابراهيم PASS');
console.log('[build] Search query إبراهيم PASS');
console.log('[build] Uthmani display mapping PASS');
console.log('[build] UI uses independent search corpus PASS');
