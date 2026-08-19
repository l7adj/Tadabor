/**
 * تمثيل بحث قرآني مبسّط وحتمي.
 *
 * لا نعدّل النص العثماني. نبني منه عرضين للبحث فقط:
 * 1) simple: حذف التشكيل والعلامات، مع إبقاء الألف الخنجرية غير مكتوبة.
 * 2) expandedAlif: نفس التمثيل، مع اعتبار الألف الخنجرية = ا.
 *
 * وجود العرضين يحل حالتي مثل «الرحمن» و«كتاب» دون إدخال صرف أو جذر أو AI.
 */

export const DAGGER_ALIF = '\u0670';
export const ALIF_WASL = '\u0671';

const ALIF_VARIANTS: Record<string, string> = {
  'أ': 'ا',
  'إ': 'ا',
  'آ': 'ا',
  'ٱ': 'ا',
  'ا': 'ا'
};

function isIgnorableMark(char: string): boolean {
  if (!char) return false;
  if (char === '\u0640') return true; // Tatweel
  if (char === DAGGER_ALIF) return false;
  return /\p{M}/u.test(char);
}

function normalizeChar(char: string, daggerAsAlif: boolean): string {
  if (char === DAGGER_ALIF) return daggerAsAlif ? 'ا' : '';
  if (isIgnorableMark(char)) return '';
  return ALIF_VARIANTS[char] ?? char;
}

/** تمثيل الاستعلام المبسط الذي يكتبه المستخدم. */
export function normalizeForSearch(input: string): string {
  if (!input) return '';
  const normalized = input.normalize('NFC');
  let out = '';

  for (const char of normalized) {
    const mapped = normalizeChar(char, false);
    out += mapped;
  }

  return out.replace(/\s+/g, ' ').trim();
}

export function stripTashkeel(input: string): string {
  return normalizeForSearch(input);
}

interface SearchView {
  text: string;
  map: number[];
}

function buildSearchView(canonical: string, daggerAsAlif: boolean): SearchView {
  let text = '';
  const map: number[] = [];

  for (let i = 0; i < canonical.length; i++) {
    const mapped = normalizeChar(canonical[i], daggerAsAlif);
    if (!mapped) continue;

    text += mapped;
    for (let j = 0; j < mapped.length; j++) {
      map.push(i);
    }
  }

  return { text, map };
}

export interface SearchWord {
  canonical: string;
  stripped: string;
  normalized: string;
  normalizedOmitted: string;
  expandedNormalized: string;
  charStart: number;
  charEnd: number;
}

export interface NormalizedAyah {
  canonicalText: string;
  strippedText: string;
  normalizedSearchText: string;
  normalizedOmittedAlifText: string;
  expandedAlifSearchText: string;
  graphemeMap: {
    strippedToCanonical: number[];
    searchToCanonical: number[];
    expandedSearchToCanonical: number[];
  };
  words: SearchWord[];
}

export function buildNormalizedAyah(canonicalText: string): NormalizedAyah {
  const canonical = canonicalText.replace(/^\uFEFF/, '');
  const simple = buildSearchView(canonical, false);
  const expanded = buildSearchView(canonical, true);

  const words: SearchWord[] = [];
  let start = 0;

  while (start < canonical.length) {
    while (start < canonical.length && /\s/.test(canonical[start])) start++;
    if (start >= canonical.length) break;

    let end = start;
    while (end < canonical.length && !/\s/.test(canonical[end])) end++;

    const wordCanonical = canonical.slice(start, end);
    words.push({
      canonical: wordCanonical,
      stripped: normalizeForSearch(wordCanonical),
      normalized: normalizeForSearch(wordCanonical),
      normalizedOmitted: normalizeForSearch(wordCanonical),
      expandedNormalized: normalizeCharSequence(wordCanonical, true),
      charStart: start,
      charEnd: end
    });

    start = end;
  }

  return {
    canonicalText: canonical,
    strippedText: simple.text,
    normalizedSearchText: simple.text,
    normalizedOmittedAlifText: simple.text,
    expandedAlifSearchText: expanded.text,
    graphemeMap: {
      strippedToCanonical: simple.map,
      searchToCanonical: simple.map,
      expandedSearchToCanonical: expanded.map
    },
    words
  };
}

function normalizeCharSequence(input: string, daggerAsAlif: boolean): string {
  let out = '';
  for (const char of input.normalize('NFC')) {
    out += normalizeChar(char, daggerAsAlif);
  }
  return out;
}

export function parseQuery(rawQuery: string) {
  const raw = rawQuery.trim();
  const normalized = normalizeForSearch(raw);
  const tokens = normalized.split(/\s+/).filter(Boolean);

  return {
    raw,
    stripped: normalized,
    normalized,
    hasDiacritics: false,
    tokens,
    strippedTokens: tokens,
    normalizedTokens: tokens
  };
}
