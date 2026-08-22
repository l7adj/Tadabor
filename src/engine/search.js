export function normalizeArabic(value = '') {
  const map = new Map([
    ['أ', 'ا'], ['إ', 'ا'], ['آ', 'ا'], ['ٱ', 'ا'], ['ٲ', 'ا'], ['ٳ', 'ا'], ['ٵ', 'ا'],
    ['ى', 'ي'], ['ی', 'ي'], ['ئ', 'ي'], ['ؤ', 'و'], ['ۆ', 'و'], ['ک', 'ك'],
    ['ۀ', 'ه'], ['ە', 'ه'], ['ـ', ''],
    // Uthmani small letters represent underlying letters in the written text.
    ['ۥ', 'و'], ['ۦ', 'ي'], ['ۧ', 'ي'], ['ۨ', 'ن'], ['ۭ', 'ن']
  ]);

  let text = String(value)
    .normalize('NFKC')
    .replace(/\p{M}/gu, '')
    // Quranic annotation marks that are not consistently classified as marks
    // by every JavaScript Unicode implementation.
    .replace(/[\u06D6-\u06E4\u06E9-\u06ED]/gu, '')
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

function findMatchedWordIndexes(searchWords, queryWords) {
  if (!queryWords.length) return [];
  if (queryWords.length === 1) {
    return searchWords.reduce((out, word, index) => {
      if (word.includes(queryWords[0])) out.push(index);
      return out;
    }, []);
  }

  const indexes = [];
  for (let i = 0; i <= searchWords.length - queryWords.length; i += 1) {
    let ok = true;
    for (let j = 0; j < queryWords.length; j += 1) {
      if (!searchWords[i + j].includes(queryWords[j])) {
        ok = false;
        break;
      }
    }
    if (ok) {
      for (let j = 0; j < queryWords.length; j += 1) indexes.push(i + j);
    }
  }

  if (indexes.length) return [...new Set(indexes)];

  // The score can also accept multi-word queries whose terms occur
  // independently in the same ayah. Preserve every matched source position.
  for (let i = 0; i < searchWords.length; i += 1) {
    if (queryWords.some(queryWord => searchWords[i].includes(queryWord))) indexes.push(i);
  }
  return [...new Set(indexes)];
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

          const matchWordIndexes = findMatchedWordIndexes(entry.words, queryWords);
          matches.push({
            item: displayItem,
            score,
            matchWordIndexes,
            matchWords: matchWordIndexes.map(index => entry.words[index])
          });
        }
      }

      return matches
        .sort((a, b) => b.score - a.score || Number(a.item.surahId) - Number(b.item.surahId) || Number(a.item.ayahId) - Number(b.item.ayahId))
        .map(match => ({
          ...match.item,
          _matchWordIndexes: match.matchWordIndexes,
          _matchWords: match.matchWords
        }));
    }
  };
}

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = '.mark{background:transparent!important;color:#b91c1c!important;font-weight:800!important;padding:0!important}';
  document.head.appendChild(style);
}
