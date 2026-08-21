const NORMALIZATION_VERSION = 4;

// SEARCH REPRESENTATION only: ordinary Arabic, independent from Uthmani display text.
// The Uthmani corpus is never normalized into the search index at runtime.
const CHAR_MAP = new Map([
  ['أ', 'ا'], ['إ', 'ا'], ['آ', 'ا'], ['ٱ', 'ا'], ['ٲ', 'ا'], ['ٳ', 'ا'], ['ٵ', 'ا'],
  ['ى', 'ى'], ['ی', 'ي'], ['ئ', 'ي'], ['ؤ', 'و'], ['ک', 'ك']
]);

const MARKS = /[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED\uFEFF]/u;
const PUNCTUATION = /[\p{P}\p{S}]/gu;
const TATWEEL = /\u0640/gu;
const WHITESPACE = /\s+/gu;

export function normalizeArabic(value = '') {
  let out = '';
  for (const ch of String(value ?? '').normalize('NFKC')) {
    if (ch === '\u0670') {
      // Query convenience: copied Uthmani dagger alif becomes an ordinary alif.
      if (out.endsWith('ى')) continue;
      out += 'ا';
      continue;
    }
    if (ch === '\u06E7') {
      // HIGH YEH in forms such as إِبْرَٰهِـۧمَ represents the ordinary search ي.
      out += 'ي';
      continue;
    }
    if (ch === '\u06E5' || ch === '\u06E6') continue;
    if (MARKS.test(ch)) continue;
    out += CHAR_MAP.get(ch) ?? ch;
  }

  return out
    .replace(TATWEEL, '')
    .replace(PUNCTUATION, ' ')
    .replace(WHITESPACE, ' ')
    .trim();
}

// Secondary, deliberately weak fallback for user-entered spelling variants.
// It is never used for the primary index and is only consulted when exact
// ordinary-Arabic matching produces no candidate.
export function orthographicKey(value = '') {
  return normalizeArabic(value).replace(/[اويى]/gu, '');
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

export function buildSearchIndex(searchCorpus = []) {
  const documents = searchCorpus.map((item, i) => {
    const id = Number.isInteger(item?.globalNumber) ? item.globalNumber : i + 1;
    const normalized = normalizeArabic(item?.searchText ?? item?.text ?? '');
    const tokens = normalized.split(' ').filter(Boolean);
    return {
      id,
      normalized,
      tokens,
      relaxedTokens: tokens.map(orthographicKey).filter(Boolean)
    };
  });

  return {
    version: NORMALIZATION_VERSION,
    documentCount: documents.length,
    documents,
    inverted: buildPostingMap(documents, 'tokens'),
    relaxedInverted: buildPostingMap(documents, 'relaxedTokens')
  };
}

function intersect(left, right) {
  const rightSet = new Set(right);
  return left.filter(id => rightSet.has(id));
}

function getCandidates(searchIndex, queryWords) {
  let ids = null;
  let mode = 'exact';

  for (const word of queryWords) {
    const exact = searchIndex.inverted[word];
    if (exact?.length) {
      ids = ids === null ? [...exact] : intersect(ids, exact);
      continue;
    }

    const relaxedWord = orthographicKey(word);
    const relaxed = relaxedWord ? searchIndex.relaxedInverted[relaxedWord] : null;
    if (relaxed?.length) {
      mode = 'relaxed';
      ids = ids === null ? [...relaxed] : intersect(ids, relaxed);
      continue;
    }

    return { ids: [], mode };
  }

  return { ids: ids ?? [], mode };
}

function hasPhrase(tokens, queryWords) {
  if (!queryWords.length || queryWords.length > tokens.length) return false;
  for (let i = 0; i <= tokens.length - queryWords.length; i += 1) {
    let match = true;
    for (let j = 0; j < queryWords.length; j += 1) {
      if (tokens[i + j] !== queryWords[j]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}

function rankDocument(document, query, queryWords, mode) {
  let score = document.normalized === query ? 3000 : hasPhrase(document.tokens, queryWords) ? 2000 : 1000;
  if (mode === 'relaxed') score -= 500;
  return score;
}

export function createQuranSearcher(displayCorpus = [], suppliedIndex = null) {
  const searchIndex = suppliedIndex ?? buildSearchIndex(displayCorpus);
  const byId = new Map(displayCorpus.map((item, i) => [
    Number.isInteger(item?.globalNumber) ? item.globalNumber : i + 1,
    item
  ]));
  const documentById = new Map(searchIndex.documents.map(document => [document.id, document]));

  return {
    search(query = '') {
      const normalizedQuery = normalizeArabic(query);
      if (!normalizedQuery) return [];

      const queryWords = normalizedQuery.split(' ').filter(Boolean);
      const { ids, mode } = getCandidates(searchIndex, queryWords);

      return ids
        .map(id => {
          const document = documentById.get(id);
          const item = byId.get(id);
          if (!document || !item) return null;
          return { item, score: rankDocument(document, normalizedQuery, queryWords, mode) };
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score || (a.item.globalNumber ?? 0) - (b.item.globalNumber ?? 0))
        .map(({ item }) => item);
    },
    index: searchIndex,
    normalizationVersion: NORMALIZATION_VERSION
  };
}

export { NORMALIZATION_VERSION };
