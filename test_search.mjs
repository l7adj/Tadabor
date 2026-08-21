import assert from 'node:assert/strict';
import { createQuranSearcher, normalizeArabic } from './src/engine/search.js';

assert.equal(normalizeArabic('إِبْرَاهِيم'), 'ابراهيم');
assert.equal(normalizeArabic('أَبْرَاهِيم'), 'ابراهيم');
assert.equal(normalizeArabic('ٱبْرَاهِيم'), 'ابراهيم');

const searchCorpus = [
  { globalNumber: 1, surahId: 2, ayahId: 124, text: 'واذ ابتلى ابراهيم ربه' },
  { globalNumber: 2, surahId: 2, ayahId: 125, text: 'واتخذوا من مقام ابراهيم مصلى' },
  { globalNumber: 3, surahId: 2, ayahId: 126, text: 'واذ قال ابراهيم رب اجعل هذا بلدا' }
];

const displayCorpus = [
  { globalNumber: 1, surahId: 2, ayahId: 124, text: 'وَإِذِ ٱبْتَلَىٰٓ إِبْرَٰهِـۧمَ رَبُّهُ' },
  { globalNumber: 2, surahId: 2, ayahId: 125, text: 'وَٱتَّخِذُوا۟ مِن مَّقَامِ إِبْرَٰهِـۧمَ مُصَلًّى' },
  { globalNumber: 3, surahId: 2, ayahId: 126, text: 'وَإِذْ قَالَ إِبْرَٰهِـۧمُ رَبِّ ٱجْعَلْ هَـٰذَا بَلَدًا' }
];

const searcher = createQuranSearcher(searchCorpus, displayCorpus);

assert.deepEqual(
  searcher.search('ابراهيم').map(x => x.globalNumber),
  [1, 2, 3],
  'search must use the independent simple corpus'
);

assert.equal(
  searcher.search('ابراهيم')[0].text,
  displayCorpus[0].text,
  'search result must return the Uthmani display record'
);

assert.deepEqual(
  searcher.search('ابراهيم ربه').map(x => x.globalNumber),
  [1],
  'multi-word search must be resolved against the search corpus'
);

const wrongDisplayText = 'هذا نص مختلف تمامًا';
const displayWithWrongText = [{ ...displayCorpus[0], text: wrongDisplayText }];
const isolatedSearcher = createQuranSearcher(searchCorpus.slice(0, 1), displayWithWrongText);
assert.equal(isolatedSearcher.search('ابراهيم')[0].text, wrongDisplayText);

console.log('[search] plain Arabic corpus PASS');
console.log('[search] Uthmani display mapping PASS');
console.log('[search] multi-word search PASS');
console.log('[search] search/display separation PASS');
