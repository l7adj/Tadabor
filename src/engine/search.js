const NORMALIZATION_VERSION = 5;

// Search operates on the separate ordinary-Arabic Quran corpus.
// Uthmani text is display/copy data only and is never parsed for search.
const CHAR_MAP = new Map([
  ['أ', 'ا'], ['إ', 'ا'], ['آ', 'ا'], ['ٱ', 'ا'], ['ٲ', 'ا'], ['ٳ', 'ا'], ['ٵ', 'ا'],
  ['ى', 'ى'], ['ی', 'ي'], ['ئ', 'ي'], ['ؤ', 'و'], ['ک', 'ك']
]);

const MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\uFEFF]/u;
const PUNCTUATION = /[\p{P}\p{S}]/gu;
const TATWEEL = /\u0640/gu;
const WHITESPACE = /\s+/gu;

// This is only for normal Arabic user input. It is deliberately not a
// conversion of Uthmani Quran text.
export function normalizeArabic(value = '') {
  let out = '';
  for (const ch of String(value ?? '').normalize('NFKC')) {
    if (MARKS.test(ch)) continue;
    out += CHAR_MAP.get(ch) ?? ch;
  }
  return out
    .replace(TATWEEL, '')
    .replace(PUNCTUATION, ' ')
    .replace(WHITESPACE, ' ')
    .trim();
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
    const normalized = normalizeArabic(item?.searchText ?? '');
    const tokens = normalized.split(' ').filter(Boolean);
    return { id, normalized, tokens };
  });

  return {
    version: NORMALIZATION_VERSION,
    representation: 'ordinary-arabic',
    documentCount: documents.length,
    documents,
    inverted: buildPostingMap(documents, 'tokens')
  };
}

function intersect(left, right) {
  const rightSet = new Set(right);
  return left.filter(id => rightSet.has(id));
}

function getCandidates(searchIndex, queryWords) {
  let ids = null;
  for (const word of queryWords) {
    const posting = searchIndex.inverted[word];
    if (!posting?.length) return [];
    ids = ids === null ? [...posting] : intersect(ids, posting);
  }
  return ids ?? [];
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

export function createQuranSearcher(displayCorpus = [], suppliedIndex = null) {
  const searchIndex = suppliedIndex ?? buildSearchIndex([]);
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
      const ids = getCandidates(searchIndex, queryWords);

      return ids
        .map(id => {
          const document = documentById.get(id);
          const item = byId.get(id);
          if (!document || !item) return null;
          const score = document.normalized === normalizedQuery
            ? 3000
            : hasPhrase(document.tokens, queryWords) ? 2000 : 1000;
          return { item, score };
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
