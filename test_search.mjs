import assert from 'node:assert/strict';
import { createQuranSearcher, normalizeArabic, orthographicKey } from './src/engine/search.js';

assert.equal(normalizeArabic('إِبْرَٰهِيم'), 'ابراهيم');
assert.equal(normalizeArabic('أَبرَاهِيم'), 'ابراهيم');
assert.equal(orthographicKey('ابراهيم'), orthographicKey('ابرهيم'));
assert.equal(orthographicKey('ابراهيم'), orthographicKey('ابراهم'));

const corpus = [
  { globalNumber: 1, text: 'إِبْرَٰهِيمُ يَتْلُو عَلَيْهِمْ' },
  { globalNumber: 2, text: 'وَإِبْرَهِيمُ رَبِّي' },
  { globalNumber: 3, text: 'وَإِبْرَاهِمُ خَلِيلِي' },
  { globalNumber: 4, text: 'إِبْرَهِيمُ الْبَاحِثُ' }
];

const searcher = createQuranSearcher(corpus);

for (const query of ['ابراهيم', 'إبراهيم', 'ابرهيم', 'ابراهم']) {
  const ids = searcher.search(query).map(x => x.globalNumber);
  assert.deepEqual(ids, [1, 2, 3, 4], `query ${query} must find all orthographic forms`);
}

assert.deepEqual(
  searcher.search('ابراهيم الباحث').map(x => x.globalNumber),
  [4],
  'multi-word query must require all query terms'
);

console.log('[search] Arabic normalization PASS');
console.log('[search] dagger-alif PASS');
console.log('[search] orthographic variants PASS');
console.log('[search] multi-word matching PASS');
