export function normalizeArabic(value = '') {
  const map = new Map([
    ['أ', 'ا'], ['إ', 'ا'], ['آ', 'ا'], ['ٱ', 'ا'], ['ٲ', 'ا'], ['ٳ', 'ا'], ['ٵ', 'ا'],
    ['ى', 'ي'], ['ی', 'ي'], ['ئ', 'ي'], ['ؤ', 'و'], ['ۆ', 'و'], ['ک', 'ك'],
    ['ۀ', 'ه'], ['ە', 'ه'], ['ـ', '']
  ]);

  let text = String(value)
    .normalize('NFKC')
    .replace(/\p{M}/gu, '')
    .replace(/[\u060C\u061B\u061F\u066A-\u066D\u06D4\u00B7.,!?;:()[\]{}"'`~|/\\<>«»]/gu, ' ');

  let out = '';
  for (const ch of text) out += map.get(ch) ?? ch;
  return out.replace(/\s+/gu, ' ').trim();
}

function words(value) {
  return normalizeArabic(value).split(' ').filter(Boolean);
}

function ayahKey(item) {
  return `${Number(item?.surahId)}:${Number(item?.ayahId)}`;
}

export function createQuranSearcher(searchCorpus = [], displayCorpus = []) {
  const displayByAyah = new Map();

  for (const item of displayCorpus) {
    const key = ayahKey(item);
    if (displayByAyah.has(key)) {
      throw new Error(`Duplicate display ayah key: ${key}`);
    }
    displayByAyah.set(key, item);
  }

  const index = searchCorpus.map((item) => {
    const searchText = String(item?.text ?? '');
    return {
      item,
      key: ayahKey(item),
      normalized: normalizeArabic(searchText),
      words: words(searchText)
    };
  });

  return {
    search(query = '') {
      const normalizedQuery = normalizeArabic(query);
      if (!normalizedQuery) return [];
      const queryWords = normalizedQuery.split(' ').filter(Boolean);

      const matches = [];
      for (const entry of index) {
        let score = 0;
        if (entry.normalized === normalizedQuery) score = 100;
        else if (entry.normalized.includes(normalizedQuery)) score = 90;
        else if (queryWords.every(word => entry.normalized.includes(word))) score = 80;
        else if (queryWords.length === 1 && entry.words.some(word => word.includes(queryWords[0]))) score = 75;

        if (score > 0) {
          const displayItem = displayByAyah.get(entry.key);
          if (!displayItem) {
            throw new Error(`No matching display ayah for ${entry.key}`);
          }
          matches.push({ item: displayItem, score });
        }
      }

      return matches
        .sort((a, b) => b.score - a.score || Number(a.item.surahId) - Number(b.item.surahId) || Number(a.item.ayahId) - Number(b.item.ayahId))
        .map(match => match.item);
    }
  };
}

export function matchesSearchToken(displayToken, query) {
  const normalizedQuery = normalizeArabic(query);
  if (!normalizedQuery) return false;
  return normalizeArabic(displayToken).includes(normalizedQuery);
}
