import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildSearchIndex, createQuranSearcher, normalizeArabic, orthographicKey } from './src/engine/search.js';

const stripBom = value => value.replace(/^\uFEFF/u, '');
const quranData = JSON.parse(stripBom(fs.readFileSync('./src/data/quranData.json', 'utf8')));
assert.equal(quranData.length, 6236, 'Quran corpus must contain 6236 ayahs');

const corpus = quranData.map((ayah, index) => ({ ...ayah, globalNumber: index + 1 }));
const searchIndex = buildSearchIndex(corpus);
const searcher = createQuranSearcher(corpus, searchIndex);

const expectedNormalizationCases = [
  ['إِبْرَٰهِيم', 'ابراهيم'],
  ['أَبْرَاهِيم', 'ابراهيم'],
  ['ٱلرَّحْمَـٰنِ', 'الرحمن'],
  ['صَلَّى اللَّهُ', 'صلى الله'],
  ['مَـٰلِكِ يَوْمِ الدِّينِ', 'مالك يوم الدين'],
  ['كُلٌّ ۖ لَّهُ', 'كل له'],
  ['تـطـويـل', 'تطويل'],
  ['أإآٱ', 'اااا']
];

for (const [input, expected] of expectedNormalizationCases) {
  assert.equal(normalizeArabic(input), expected, `normalizeArabic(${input})`);
}

assert.equal(orthographicKey('ابراهيم'), orthographicKey('ابرهيم'));
assert.equal(orthographicKey('ابراهيم'), orthographicKey('ابراهم'));

const quranResult = searcher.search('إِبْرَٰهِيم');
assert.ok(quranResult.length > 0, 'Quran must contain Ibrahim');
const referenceGlobal = quranResult[0].globalNumber;
const variants = ['ابراهيم', 'إبراهيم', 'ابرهيم', 'ابراهم', 'إِبْرَٰهِيم'];

for (const query of variants) {
  const results = searcher.search(query);
  assert.ok(results.length > 0, `query ${query} must return results`);
  assert.ok(results.some(a => a.globalNumber === referenceGlobal), `query ${query} must reach the same Quran target`);
}

const exactDisplay = searcher.search('بسم الله');
assert.ok(exactDisplay.length > 0, 'Exact normalized phrase must find 1:1');
assert.equal(exactDisplay[0].text, quranData[0].text, 'Search result must preserve original عثماني text');

const corpusVariantGroups = new Map();
for (const document of searchIndex.documents) {
  for (const token of document.tokens) {
    const key = orthographicKey(token);
    if (!key) continue;
    const set = corpusVariantGroups.get(key) ?? new Set();
    set.add(token);
    corpusVariantGroups.set(key, set);
  }
}
const multiFormGroups = [...corpusVariantGroups.values()].filter(set => set.size > 1);
assert.ok(multiFormGroups.length >= 5, 'Corpus should expose multiple controlled orthographic variant groups');

assert.equal(normalizeArabic('ۖ ٱلْحَمْدُ، لِلَّهِ'), 'الحمد لله');

console.log('[search] Quran corpus 6236 PASS');
console.log('[search] normalization families PASS');
console.log('[search] Ibrahim regression set PASS');
console.log('[search] original-display preservation PASS');
console.log(`[search] controlled rasm variant groups: ${multiFormGroups.length} PASS`);
