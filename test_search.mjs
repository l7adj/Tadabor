import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildSearchIndex, createQuranSearcher, normalizeArabic, orthographicKey } from './src/engine/search.js';

const stripBom = value => value.replace(/^\uFEFF/u, '');
const quranData = JSON.parse(stripBom(fs.readFileSync('./src/data/quranData.json', 'utf8')));
assert.equal(quranData.length, 6236, 'Quran corpus must contain 6236 ayahs');

const corpus = quranData.map((ayah, index) => ({ ...ayah, globalNumber: index + 1 }));
const searchIndex = buildSearchIndex(corpus);
const searcher = createQuranSearcher(corpus, searchIndex);

// Search representation must be ordinary Arabic, while the source/display remains Uthmani.
const expectedNormalizationCases = [
  ['إِبْرَٰهِـۧمَ', 'ابراهيم'],
  ['ٱلرَّحْمَـٰنِ', 'الرحمن'],
  ['مَـٰلِكِ يَوْمِ الدِّينِ', 'مالك يوم الدين'],
  ['رَبُّهُۥ', 'ربه'],
  ['فِى قُلُوبِهِمْ', 'فى قلوبهم'],
  ['تـطـويـل', 'تطويل'],
  ['أإآٱ', 'اااا'],
];

for (const [input, expected] of expectedNormalizationCases) {
  assert.equal(normalizeArabic(input), expected, `normalizeArabic(${input})`);
}

// The primary representation is not lossy; controlled rasm fallback remains secondary.
assert.equal(orthographicKey('ابراهيم'), orthographicKey('ابرهيم'));
assert.equal(orthographicKey('ابراهيم'), orthographicKey('ابراهم'));

const variants = ['ابراهيم', 'إبراهيم', 'ابرهيم', 'ابراهم', 'إِبْرَٰهِيم'];
const primaryResults = searcher.search('ابراهيم');
assert.equal(primaryResults.length, 52, 'ordinary Arabic Ibrahim search must return all 52 Ibrahim ayahs');
assert.ok(primaryResults.some(a => a.surahId === 2 && a.ayahId === 124), 'Ibrahim search must include Al-Baqarah 2:124');
assert.ok(primaryResults.some(a => a.surahId === 2 && a.ayahId === 258), 'Ibrahim search must include Al-Baqarah 2:258');

for (const query of variants) {
  const results = searcher.search(query);
  assert.ok(results.length > 0, `query ${query} must return results`);
  assert.ok(results.some(a => a.surahId === 2 && a.ayahId === 124), `query ${query} must reach Al-Baqarah 2:124`);
}

const exactDisplay = searcher.search('بسم الله');
assert.ok(exactDisplay.length > 0, 'Exact normalized phrase must find 1:1');
assert.equal(exactDisplay[0].text, quranData[0].text, 'Search result must preserve original Uthmani text');

// Corpus-level invariant: every indexed document must point back to one original ayah.
assert.equal(searchIndex.documentCount, 6236, 'Search index must contain exactly 6236 ayah documents');
assert.equal(searchIndex.documents.length, 6236, 'Search index document list must contain exactly 6236 ayahs');

console.log('[search] Quran corpus 6236 PASS');
console.log('[search] ordinary-Arabic representation PASS');
console.log('[search] Ibrahim = 52 ayahs PASS');
console.log('[search] Al-Baqarah 2:124 + 2:258 PASS');
console.log('[search] original-Uthmani display preservation PASS');
