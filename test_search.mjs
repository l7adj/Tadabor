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
assert.equal(normalizeArabic('الرَّحْمَـٰن'), 'الرحمن');

const exact = searcher.search('ابراهيم');
assert.equal(exact.length, 56, 'ordinary Arabic Ibrahim word search must return every exact-word occurrence');
for (const key of ['2:124', '2:125', '2:127', '2:130', '2:258', '2:260', '11:74', '11:75', '11:76']) {
  const [surahId, ayahId] = key.split(':').map(Number);
  assert.ok(exact.some(a => a.surahId === surahId && a.ayahId === ayahId), `Ibrahim search must include ${key}`);
}

for (const query of ['ابراهيم', 'إبراهيم', 'إِبْرَٰهِيم']) {
  const results = searcher.search(query);
  assert.equal(results.length, 56, `query ${query} must use the ordinary Arabic index`);
  assert.ok(results.some(a => a.surahId === 2 && a.ayahId === 124), `query ${query} must reach Al-Baqarah 2:124`);
}

for (const query of ['ابرهيم', 'ابراهم']) {
  const results = searcher.search(query);
  assert.ok(results.length > 0, `controlled spelling fallback for ${query}`);
  assert.ok(results.some(a => a.surahId === 2 && a.ayahId === 124), `${query} must still reach Al-Baqarah 2:124`);
}

const basmalaResults = searcher.search('بسم الله');
assert.ok(basmalaResults.some(a => a.surahId === 1 && a.ayahId === 1), 'Basmala must find Al-Fatihah 1:1');
assert.ok(!basmalaResults.some(a => a.ayahId === 1 && a.surahId > 1), 'Basmala prefix must not pollute non-Fatihah first ayahs');

const first = searcher.search('الحمد لله')[0];
assert.equal(first.surahId, 1);
assert.equal(first.ayahId, 2);
assert.equal(first.text, quranData[1].text, 'result must return original Uthmani display text');

assert.equal(searchIndex.documentCount, 6236);
assert.equal(searchIndex.documents.length, 6236);
assert.equal(source.ayahCount, 6236);

console.log('[search] display corpus 6236 PASS');
console.log('[search] ordinary-Arabic search corpus 6236 PASS');
console.log('[search] same-ayah mapping 6236/6236 PASS');
console.log('[search] Ibrahim ordinary search PASS');
console.log('[search] Al-Baqarah Uthmani variants PASS');
console.log('[search] original-Uthmani result preservation PASS');
