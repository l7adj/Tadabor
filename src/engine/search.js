export function normalizeArabic(value = '') {
  const map = new Map([
    ['أ', 'ا'], ['إ', 'ا'], ['آ', 'ا'], ['ٱ', 'ا'], ['ٲ', 'ا'], ['ٳ', 'ا'], ['ٵ', 'ا'],
    ['ى', 'ي'], ['ی', 'ي'], ['ئ', 'ي'], ['ؤ', 'و'], ['ۆ', 'و'], ['ک', 'ك'],
    ['ۀ', 'ه'], ['ە', 'ه'], ['ـ', ''],
    // Uthmani small letters represent underlying letters in the written text.
    ['ۥ', 'و'], ['ۦ', 'ي']
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

function editDistance(a, b) {
  const aa = Array.from(a), bb = Array.from(b);
  if (!aa.length) return bb.length;
  if (!bb.length) return aa.length;
  let prev = Array.from({ length: bb.length + 1 }, (_, i) => i);
  for (let i = 1; i <= aa.length; i += 1) {
    const cur = [i];
    for (let j = 1; j <= bb.length; j += 1) {
      cur[j] = Math.min(
        cur[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + (aa[i - 1] === bb[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[bb.length];
}

export function matchesSearchToken(displayToken, query) {
  const normalizedQuery = normalizeArabic(query);
  if (!normalizedQuery) return false;
  const normalizedToken = normalizeArabic(displayToken);
  if (normalizedToken.includes(normalizedQuery)) return true;
  if (!normalizedToken || normalizedQuery.includes(' ')) return false;

  // Allow small orthographic differences between the searchable spelling
  // and the Uthmanic spelling, while keeping the highlight on the written
  // Quran word itself.
  const distance = editDistance(normalizedToken, normalizedQuery);
  const limit = normalizedQuery.length >= 6 ? 1 : 0;
  return distance <= limit;
}

// The result markup already uses <mark>. Override its visual treatment here
// so the actual written Quran letters receive the search color, rather than
// painting a background behind the word.
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = '.mark{background:transparent!important;color:#b91c1c!important;font-weight:800!important;padding:0!important}';
  document.head.appendChild(style);
}
