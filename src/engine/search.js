const NORMALIZATION_VERSION = 2;

const SEARCH_CHAR_MAP = new Map([
  ['أ', 'ا'], ['إ', 'ا'], ['آ', 'ا'], ['ٱ', 'ا'], ['ٲ', 'ا'], ['ٳ', 'ا'], ['ٵ', 'ا'],
  ['ى', 'ي'], ['ی', 'ي'],
  ['ئ', 'ي'], ['ؤ', 'و'],
  ['ک', 'ك'],
]);

const RELAXED_CHAR_MAP = new Map([
  ...SEARCH_CHAR_MAP,
  ['ة', 'ه'],
]);

const DAGGER_ALIF = /\u0670/gu;
const SEARCH_MARKS = /[\p{M}\uFEFF]/gu;
const SEARCH_PUNCTUATION = /[\p{P}\p{S}]/gu;
const TATWEEL = /\u0640/gu;
const WHITESPACE = /\s+/gu;

function mapChars(text, map) {
  let out = '';
  for (const ch of text) out += map.get(ch) ?? ch;
  return out;
}

function canonicalize(value, map) {
  return mapChars(
    String(value ?? '')
      .normalize('NFKC')
      .replace(TATWEEL, '')
      .replace(DAGGER_ALIF, 'ا')
      .replace(SEARCH_MARKS, '')
      .replace(SEARCH_PUNCTUATION, ' ')
      .replace(WHITESPACE, ' ')
      .trim(),
    map
  ).replace(WHITESPACE, ' ').trim();
}

export function normalizeArabic(value = '') {
  return canonicalize(value, SEARCH_CHAR_MAP);
}

export function orthographicKey(value = '') {
  return canonicalize(value, RELAXED_CHAR_MAP).replace(/[اوي]/gu, '');
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
    const relaxedTokens = orthographicKey(text).split(' ').filter(Boolean);

    return { id, normalized, tokens, relaxedTokens };
  });

  return {
    version: NORMALIZATION_VERSION,
    documentCount: documents.length,
    documents,
    inverted: buildPostingMap(documents, 'tokens'),
    relaxedInverted: buildPostingMap(documents, 'relaxedTokens')
  };
}

function intersectSorted(left, right) {
  const rightSet = new Set(right);
  return left.filter(id => rightSet.has(id));
}

function getCandidates(searchIndex, queryWords) {
  let candidates = null;
  const modes = [];

  for (const word of queryWords) {
    const exact = searchIndex.inverted[word];
    if (exact?.length) {
      modes.push({ word, mode: 'exact', ids: exact });
      candidates = candidates === null ? [...exact] : intersectSorted(candidates, exact);
      continue;
    }

    const relaxedWord = orthographicKey(word);
    const relaxed = relaxedWord ? searchIndex.relaxedInverted[relaxedWord] : null;
    if (relaxed?.length) {
      modes.push({ word, mode: 'relaxed', ids: relaxed });
      candidates = candidates === null ? [...relaxed] : intersectSorted(candidates, relaxed);
      continue;
    }

    return { ids: [], modes: [] };
  }

  return { ids: candidates ?? [], modes };
}

function hasPhrase(tokens, queryWords) {
  if (!queryWords.length || queryWords.length > tokens.length) return false;
  if (queryWords.length === 1) return tokens.includes(queryWords[0]);

  for (let i = 0; i <= tokens.length - queryWords.length; i++) {
    let match = true;
    for (let j = 0; j < queryWords.length; j++) {
      if (tokens[i + j] !== queryWords[j]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}

function hasRelaxedPhrase(tokens, queryWords) {
  const relaxedQuery = queryWords.map(orthographicKey);
  if (!relaxedQuery.length || relaxedQuery.some(token => !token) || relaxedQuery.length > tokens.length) return false;
  if (relaxedQuery.length === 1) return tokens.includes(relaxedQuery[0]);

  for (let i = 0; i <= tokens.length - relaxedQuery.length; i++) {
    let match = true;
    for (let j = 0; j < relaxedQuery.length; j++) {
      if (tokens[i + j] !== relaxedQuery[j]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}

function rankDocument(document, query, queryWords, modes) {
  const exactPhrase = hasPhrase(document.tokens, queryWords);
  const relaxedPhrase = !exactPhrase && hasRelaxedPhrase(document.relaxedTokens, queryWords);
  let score = 0;

  if (document.normalized === query) score += 2000;
  else if (exactPhrase) score += 1500;
  else if (relaxedPhrase) score += 1100;

  let exactCount = 0;
  let relaxedCount = 0;
  for (const queryWord of queryWords) {
    if (document.tokens.includes(queryWord)) {
      exactCount++;
      score += 300;
      continue;
    }
    const relaxedWord = orthographicKey(queryWord);
    if (relaxedWord && document.relaxedTokens.includes(relaxedWord)) {
      relaxedCount++;
      score += 140;
    }
  }

  score += exactCount * 20;
  score += Math.max(0, queryWords.length - relaxedCount - exactCount) * -100;
  score += modes.filter(item => item.mode === 'exact').length * 8;
  score -= modes.filter(item => item.mode === 'relaxed').length * 4;
  return score;
}

function substringFallback(corpus, queryWords) {
  return corpus.filter(item => {
    const tokens = normalizeArabic(item?.text).split(' ').filter(Boolean);
    return queryWords.every(queryWord => tokens.some(token => token.includes(queryWord)));
  });
}

export function createQuranSearcher(corpus = [], suppliedIndex = null) {
  const searchIndex = suppliedIndex ?? buildSearchIndex(corpus);
  const byId = new Map(corpus.map((item, i) => [
    Number.isInteger(item?.globalNumber) ? item.globalNumber : i + 1,
    item
  ]));
  const documentById = new Map(searchIndex.documents.map(document => [document.id, document]));

  function search(query = '') {
    const normalizedQuery = normalizeArabic(query);
    if (!normalizedQuery) return [];

    const queryWords = normalizedQuery.split(' ').filter(Boolean);
    const { ids, modes } = getCandidates(searchIndex, queryWords);

    if (!ids.length) {
      return substringFallback(corpus, queryWords)
        .map(item => ({ item, score: 100 }))
        .sort((a, b) => (b.score - a.score) || ((a.item.globalNumber ?? 0) - (b.item.globalNumber ?? 0)))
        .map(({ item }) => item);
    }

    return ids
      .map(id => {
        const document = documentById.get(id);
        const item = byId.get(id);
        if (!document || !item) return null;
        return { item, score: rankDocument(document, normalizedQuery, queryWords, modes) };
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

  const normalizedToken = normalizeArabic(displayToken);
  if (normalizedToken.includes(normalizedQuery)) return true;

  const relaxedQuery = orthographicKey(normalizedQuery);
  return Boolean(relaxedQuery && orthographicKey(displayToken).includes(relaxedQuery));
}

export { NORMALIZATION_VERSION };
