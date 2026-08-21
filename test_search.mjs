import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildSearchIndex, createQuranSearcher, normalizeArabic } from './src/engine/search.js';
import { loadSearchCorpus } from './scripts/search-source.mjs';

const quranData = JSON.parse(fs.readFileSync('./src/data/quranData.json', 'utf8').replace(/^\uFEFF/u, ''));
assert.equal(quranData.length, 6236, 'display corpus must contain 6236 ayahs');

const { corpus: searchCorpus, source } = await loadSearchCorpus(quranData);
assert.equal(searchCorpus.length, 6236, 'search corpus must contain 6236 ayahs');

const displayCorpus = quranData.map((ayah, index) => ({ ...ayah, globalNumber: index + 1 }));
const searchIndex = buildSearchIndex(searchCorpus);
const searcher = createQuranSearcher(displayCorpus, searchIndex);

assert.equal(normalizeArabic('ابراهيم'), 'ابراهيم');
assert.equal(normalizeArabic('إبراهيم'), 'ابراهيم');
assert.equal(normalizeArabic('إِبْرَٰهِـۧمَ'), 'ابراهيم');

const expectedIbrahimKeys = searchCorpus
  .filter(item => item.searchText.split(/\s+/).some(word => normalizeArabic(word) === 'ابراهيم'))
  .map(item => `${item.surahId}:${item.ayahId}`);
assert.ok(expectedIbrahimKeys.length > 0, 'ordinary Arabic corpus must contain Ibrahim');

const actualIbrahim = searcher.search('ابراهيم');
const actualIbrahimKeys = actualIbrahim.map(item => `${item.surahId}:${item.ayahId}`);
assert.equal(actualIbrahimKeys.length, expectedIbrahimKeys.length, 'ordinary Arabic search must return every exact Ibrahim occurrence');
for (const key of expectedIbrahimKeys) {
  assert.ok(actualIbrahimKeys.includes(key), `Ibrahim search must include ${key}`);
}

// The user searches the ordinary corpus; Uthmani spellings are not a second search corpus.
const hamzaVariant = searcher.search('إبراهيم').map(a => `${a.surahId}:${a.ayahId}`);
assert.deepEqual(hamzaVariant, actualIbrahimKeys, 'ordinary Arabic hamza variant should resolve to the same ordinary search word');

// No orthographic fallback: a spelling not present in the ordinary corpus is not invented.
assert.deepEqual(searcher.search('ابراهم'), [], 'search must not invent a Quran word from an orthographic fallback');

const basmalaResults = searcher.search('بسم الله');
assert.ok(basmalaResults.some(a => a.surahId === 1 && a.ayahId === 1), 'Basmala must find Al-Fatihah 1:1');
assert.ok(!basmalaResults.some(a => a.ayahId === 1 && a.surahId > 1), 'Basmala prefix must not pollute non-Fatihah first ayahs');

const first = searcher.search('الحمد لله')[0];
assert.equal(first.surahId, 1);
assert.equal(first.ayahId, 2);
assert.equal(first.text, quranData[1].text, 'result must return original Uthmani display text');

assert.equal(searchIndex.documentCount, 6236);
assert.equal(searchIndex.documents.length, 6236);
assert.equal(searchIndex.representation, 'ordinary-arabic');
assert.equal(source.ayahCount, 6236);

console.log('[search] display corpus 6236 PASS');
console.log('[search] ordinary-Arabic search corpus 6236 PASS');
console.log('[search] same-ayah mapping 6236/6236 PASS');
console.log(`[search] Ibrahim ordinary-word regression PASS (${expectedIbrahimKeys.length} ayahs)`);
console.log('[search] no Uthmani search fallback PASS');
console.log('[search] original-Uthmani result preservation PASS');
