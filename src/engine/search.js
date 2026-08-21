const NORMALIZATION_VERSION = 3;

// Search representation: ordinary Arabic, independent from the Uthmani display text.
// Quranic signs that encode a real omitted search letter are handled explicitly.
const SEARCH_CHAR_MAP = new Map([
  ['أ', 'ا'], ['إ', 'ا'], ['آ', 'ا'], ['ٱ', 'ا'], ['ٲ', 'ا'], ['ٳ', 'ا'], ['ٵ', 'ا'],
  ['ى', 'ى'], ['ی', 'ي'], ['ئ', 'ي'], ['ؤ', 'و'], ['ک', 'ك'],
]);

const QURAN_MARKS = /[\u0610-\u061A\u064B-\u065F\u06D6-\u06E4\u06E8-\u06ED\uFEFF]/gu;
const SEARCH_PUNCTUATION = /[\p{P}\p{S}]/gu;
const TATWEEL = /\u0640/gu;
const WHITESPACE = /\s+/gu;

function normalizeSearchText(value = '') {
  const input = String(value ?? '').normalize('NFKC');
  let out = '';

  for (const ch of input) {
    if (ch === '\u0670') {
      // Dagger alif after alif-maqsura is part of forms such as على/هدى/موسى;
      // it does not create an extra alif in ordinary Arabic.
      if (out.endsWith('ى')) continue;
      out += 'ا';
      continue;
    }

    // High yeh in forms such as إِبْرَٰهِـۧمَ represents the omitted ordinary ي.
    if (ch === '\u06E7') {
      out += 'ي';
      continue;
    }

    // Small waw/yeh are pronunciation/reading signs here, not ordinary letters.
    if (ch === '\u06E5' || ch === '\u06E6') continue;
    if (QURAN_MARKS.test(ch)) continue;

    out += SEARCH_CHAR_MAP.get(ch) ?? ch;
  }

  return out
    .replace(TATWEEL, '')
    .replace(SEARCH_PUNCTUATION, ' ')
    .replace(WHITESPACE, ' ')
    .trim();
}

export function normalizeArabic(value = '') {
  return normalizeSearchText(value);
}

// Controlled fallback only. It is deliberately weaker than ordinary-Arabic matching.
// It helps user-entered rasm variants such as ابراهيم / ابرهيم / ابراهم without
// making the primary index itself lossy.
export function orthographicKey(value = '') {
  return normalizeSearchText(value).replace(/[اويى]/gu, '');
}

function finalYehVariant(value = '') {
  return value.replace(/ى(?=\s|$)/gu, 'ي');
}

function buildPostingMap(documents, field) {
  const postings = Object.create(null);
  for (const document of documents) {
    const seen = new Set();
    for (const token of document[field]) {
      if (!token || seen.has(token)) continue;
      seen.add(token);
      (postings[token] ??= []).push(document.id);
    }
  }
  return postings;
}

export function buildSearchIndex(corpus = []) {
  const documents = corpus.map((item, i) => {
    const id = Number.isInteger(item?.globalNumber) ? item.globalNumber : i + 1;
    const text = String(item?.text ?? '');
    const normalized = normalizeArabic(text);
    const tokens = normalized.split(' ').filter(Boolean);
    const finalYehTokens = tokens.map(finalYehVariant);
    const relaxedTokens = tokens.map(orthographicKey).filter(Boolean);
    return { id, normalized, tokens, finalYehTokens, relaxedTokens };
  });

  return {
    version: NORMALIZATION_VERSION,
    documentCount: documents.length,
    documents,
    inverted: buildPostingMap(documents, 'tokens'),
    finalYehInverted: buildPostingMap(documents, 'finalYehTokens'),
    relaxedInverted: buildPostingMap(documents, 'relaxedTokens'),
  };
}

function intersectSorted(left, right) {
  const rightSet = new Set(right);
  return left.filter(id => rightSet.has(id));
}

function getCandidates(searchIndex, queryWords) {
  let candidates = null;
  let mode = 'exact';

  for (const word of queryWords) {
    const exact = searchIndex.inverted[word];
    if (exact?.length) {
      candidates = candidates === null ? [...exact] : intersectSorted(candidates, exact);
      continue;
    }

    const yehWord = finalYehVariant(word);
    const yeh = searchIndex.finalYehInverted[yehWord];
    if (yeh?.length) {
      mode = 'final-yeh';
      candidates = candidates === null ? [...yeh] : intersectSorted(candidates, yeh);
      continue;
    }

    const relaxedWord = orthographicKey(word);
    const relaxed = relaxedWord ? searchIndex.relaxedInverted[relaxedWord] : null;
    if (relaxed?.length) {
      mode = 'relaxed';
      candidates = candidates === null ? [...relaxed] : intersectSorted(candidates, relaxed);
      continue;
    }

    return { ids: [], mode };
  }

  return { ids: candidates ?? [], mode };
}

function hasPhrase(tokens, queryWords) {
  if (!queryWords.length || queryWords.length > tokens.length) return false;
  for (let i = 0; i <= tokens.length - queryWords.length; i++) {
    let match = true;
    for (let j = 0; j < queryWords.length; j++) {
      if (tokens[i + j] !== queryWords[j]) { match = false; break; }
    }
    if (match) return true;
  }
  return false;
}

function rankDocument(document, query, queryWords, mode) {
  const exactPhrase = hasPhrase(document.tokens, queryWords);
  let score = document.normalized === query ? 3000 : exactPhrase ? 2000 : 1000;
  if (mode === 'final-yeh') score -= 150;
  if (mode === 'relaxed') score -= 350;
  return score;
}

export function createQuranSearcher(corpus = [], suppliedIndex = null) {
  const searchIndex = suppliedIndex ?? buildSearchIndex(corpus);
  const byId = new Map(corpus.map((item, i) => [
    Number.isInteger(item?.globalNumber) ? item.globalNumber : i + 1,
    item,
  ]));
  const documentById = new Map(searchIndex.documents.map(document => [document.id, document]));

  function search(query = '') {
    const normalizedQuery = normalizeArabic(query);
    if (!normalizedQuery) return [];
    const queryWords = normalizedQuery.split(' ').filter(Boolean);
    const { ids, mode } = getCandidates(searchIndex, queryWords);

    return ids
      .map(id => {
        const document = documentById.get(id);
        const item = byId.get(id);
        return document && item ? { item, score: rankDocument(document, normalizedQuery, queryWords, mode) } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || (a.item.globalNumber ?? 0) - (b.item.globalNumber ?? 0))
      .map(({ item }) => item);
  }

  return { search, index: searchIndex, normalizationVersion: NORMALIZATION_VERSION };
}

export function matchesSearchToken(displayToken, query) {
  const normalizedQuery = normalizeArabic(query);
  if (!normalizedQuery || normalizedQuery.includes(' ')) return false;
  return normalizeArabic(displayToken).includes(normalizedQuery);
}

export { NORMALIZATION_VERSION };
