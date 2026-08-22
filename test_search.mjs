import assert from 'node:assert/strict';
import { createQuranSearcher, normalizeArabic } from './src/engine/search.js';

assert.equal(normalizeArabic('إِبْرَاهِيم'), 'ابراهيم');
assert.equal(normalizeArabic('أَبْرَاهِيم'), 'ابراهيم');
assert.equal(normalizeArabic('ٱبْرَاهِيم'), 'ابراهيم');

const searchCorpus = [
  { surahId: 2, ayahId: 124, text: 'واذ ابتلى ابراهيم ربه' },
  { surahId: 2, ayahId: 125, text: 'واتخذوا من مقام ابراهيم مصلى' },
  { surahId: 2, ayahId: 126, text: 'واذ قال ابراهيم رب اجعل هذا بلدا' }
];

const displayCorpus = [
  { surahId: 2, ayahId: 124, text: 'وَإِذِ ٱبْتَلَىٰٓ إِبْرَٰهِـۧمَ رَبُّهُ' },
  { surahId: 2, ayahId: 125, text: 'وَٱتَّخِذُوا۟ مِن مَّقَامِ إِبْرَٰهِـۧمَ مُصَلًّى' },
  { surahId: 2, ayahId: 126, text: 'وَإِذْ قَالَ إِبْرَٰهِـۧمُ رَبِّ ٱجْعَلْ هَـٰذَا بَلَدًا' }
];

const searcher = createQuranSearcher(searchCorpus, displayCorpus);

assert.deepEqual(
  searcher.search('ابراهيم').map(x => `${x.surahId}:${x.ayahId}`),
  ['2:124', '2:125', '2:126'],
  'search must use the independent simple corpus'
);

assert.equal(
  searcher.search('ابراهيم')[0].text,
  displayCorpus[0].text,
  'search result must return the Uthmani display record'
);

assert.deepEqual(
  searcher.search('ابراهيم')[0]._matchWordIndexes,
  [2],
  'single-word search must preserve the source word index'
);

assert.deepEqual(
  searcher.search('ابراهيم ربه')[0]._matchWordIndexes,
  [2, 3],
  'multi-word search must preserve every source word index in order'
);

assert.deepEqual(
  searcher.search('مقام ابراهيم مصلى')[0]._matchWordIndexes,
  [2, 3, 4],
  'a multi-word match must map to the exact source positions'
);

assert.deepEqual(
  searcher.search('ابراهيم ربه').map(x => `${x.surahId}:${x.ayahId}`),
  ['2:124'],
  'multi-word search must be resolved against the search corpus'
);

const wrongDisplayText = 'هذا نص مختلف تمامًا';
const displayWithWrongText = [{ ...displayCorpus[0], text: wrongDisplayText }];
const isolatedSearcher = createQuranSearcher(searchCorpus.slice(0, 1), displayWithWrongText);
assert.equal(isolatedSearcher.search('ابراهيم')[0].text, wrongDisplayText);
assert.deepEqual(
  isolatedSearcher.search('ابراهيم')[0]._matchWordIndexes,
  [2],
  'word positions must come from the search corpus even when display text is different'
);

const reversedDisplayCorpus = [...displayCorpus].reverse();
const reversedSearcher = createQuranSearcher(searchCorpus, reversedDisplayCorpus);
assert.deepEqual(
  reversedSearcher.search('ابراهيم').map(x => `${x.surahId}:${x.ayahId}`),
  ['2:124', '2:125', '2:126'],
  'explicit ayah identity must survive reversed display order'
);
assert.equal(
  reversedSearcher.search('ابراهيم')[0].text,
  displayCorpus[0].text,
  'reversed display order must still return the matching ayah text'
);

assert.throws(
  () => createQuranSearcher(searchCorpus, [...displayCorpus, { surahId: 2, ayahId: 124, text: 'duplicate' }]),
  /Duplicate display ayah key: 2:124/
);

assert.throws(
  () => createQuranSearcher(searchCorpus.slice(0, 1), displayCorpus.slice(1)),
  /No matching display ayah for 2:124/
);

console.log('[search] plain Arabic corpus PASS');
console.log('[search] Uthmani display mapping PASS');
console.log('[search] single-word position mapping PASS');
console.log('[search] multi-word position mapping PASS');
console.log('[search] search/display separation PASS');
console.log('[search] explicit ayah identity PASS');
console.log('[search] reversed-order safety PASS');
console.log('[search] duplicate/missing identity safety PASS');
