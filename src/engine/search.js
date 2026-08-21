export function normalizeArabic(value = '') {
  let text = String(value)
    .normalize('NFKC')
    .replace(/\u0670/gu, 'ا')
    .replace(/\p{M}/gu, '')
    .replace(/[\u060C\u061B\u061F\u066A-\u066D\u06D4\u00B7.,!?;:()[\]{}"'`~|/\\<>«»]/gu, ' ');
  const map = new Map([
    ['أ', 'ا'], ['إ', 'ا'], ['آ', 'ا'], ['ٱ', 'ا'], ['ٲ', 'ا'], ['ٳ', 'ا'], ['ٵ', 'ا'],
    ['ى', 'ي'], ['ی', 'ي'], ['ئ', 'ي'], ['ؤ', 'و'], ['ۆ', 'و'], ['ک', 'ك'],
    ['ۀ', 'ه'], ['ە', 'ه'], ['ـ', '']
  ]);
  let out = '';
  for (const ch of text) out += map.get(ch) ?? ch;
  return out.replace(/\s+/gu, ' ').trim();
}

export function orthographicKey(value = '') {
  return normalizeArabic(value).replace(/[اوي]/gu, '');
}

function words(value) {
  return normalizeArabic(value).split(' ').filter(Boolean);
}

function looseWords(value) {
  return orthographicKey(value).split(' ').filter(Boolean);
}

export function createQuranSearcher(corpus = []) {
  const index = corpus.map(item => {
    const text = String(item?.text ?? '');
    return {
      item,
      normalized: normalizeArabic(text),
      orthographic: orthographicKey(text),
      words: words(text),
      looseWords: looseWords(text)
    };
  });

  return {
    search(query = '') {
      const normalizedQuery = normalizeArabic(query);
      if (!normalizedQuery) return [];
      const queryWords = normalizedQuery.split(' ').filter(Boolean);
      const looseQuery = orthographicKey(query);
      const looseQueryWords = looseQuery.split(' ').filter(Boolean);

      const matches = [];
      for (const entry of index) {
        let score = 0;
        if (entry.normalized === normalizedQuery) score = 100;
        else if (entry.normalized.includes(normalizedQuery)) score = 90;
        else if (queryWords.every(w => entry.normalized.includes(w))) score = 80;
        else if (queryWords.length === 1 && entry.words.some(w => w.includes(queryWords[0]))) score = 75;
        else if (entry.orthographic === looseQuery) score = 65;
        else if (entry.orthographic.includes(looseQuery)) score = 60;
        else if (looseQueryWords.every(w => entry.orthographic.includes(w))) score = 55;
        else if (looseQueryWords.length === 1 && entry.looseWords.some(w => w.includes(looseQueryWords[0]))) score = 50;
        if (score > 0) matches.push({ item: entry.item, score });
      }

      return matches
        .sort((a, b) => b.score - a.score || (a.item.globalNumber ?? 0) - (b.item.globalNumber ?? 0))
        .map(x => x.item);
    }
  };
}

export function matchesSearchToken(displayToken, query) {
  const q = normalizeArabic(query);
  if (!q) return false;
  const token = normalizeArabic(displayToken);
  const looseQ = orthographicKey(query);
  return token.includes(q) || (looseQ && orthographicKey(displayToken).includes(looseQ));
}
