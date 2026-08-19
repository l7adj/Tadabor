export type MatchRelation =
  | 'SURFACE_EXACT'
  | 'DIACRITIC_INSENSITIVE'
  | 'ORTHOGRAPHIC_EQUIVALENT'
  | 'PREFIX_ATTACHED'
  | 'SUFFIX_ATTACHED'
  | 'CLITIC_COMBINED'
  | 'STEM_VARIANT'
  | 'LEMMA_VARIANT'
  | 'MORPHOLOGICAL_VARIANT'
  | 'ROOT_VARIANT'
  | 'FUZZY'
  | 'PHONETIC';

export type SearchMode =
  | 'default'
  | 'exact_diacritics'
  | 'exact_bare'
  | 'root_morphology';

export interface EquivalenceRule {
  ruleId: string;
  name: string;
  sourceForm: string;
  targetForm: string;
  scope: 'GLOBAL' | 'WORD_CLASS' | 'POSITIONAL' | 'SURAH' | 'AYAH';
  scopeParam?: number | string;
  description: string;
}

export interface MatchSpan {
  tokenId?: number;
  wordIndex: number;
  charStart: number;
  charEnd: number;
  matchedText: string;
}

export interface MatchEvidence {
  query: string;
  matchedToken: string;
  baseLetterMatch: boolean;
  diacriticsIgnored: boolean;
  orthographicTransformation?: string;
  cliticTransformation?: string;
  cliticDecomposition?: { prefix: string; stem: string; suffix: string };
  morphologyUsed: boolean;
  rootUsed: boolean;
  matchType: MatchRelation;
  confidenceScore: number;
  ruleApplied?: string;
}

export interface SurahMeta {
  number: number;
  name: string;
  nameEnglish: string;
  nameMeaning: string;
  ayahCount: number;
  revelationType: 'Meccan' | 'Medinan';
  revelationOrder: number;
  juzStart: number;
  pageStart: number;
}

export interface Ayah {
  numberInSurah: number;
  globalNumber: number;
  surahNumber: number;
  juz: number;
  page: number;
  textUthmani: string;
  textNormalized: string;
  textBare: string;
  words: string[];
}

export interface SearchResult {
  ayah: Ayah;
  surah: SurahMeta;
  relation: MatchRelation;
  evidence: MatchEvidence;
  score: number;
  spans: MatchSpan[];
  occurrencesInAyah: number;
}

export interface SearchFilter {
  surahNumber?: number | 'all';
  juzNumber?: number | 'all';
  revelationType?: 'all' | 'Meccan' | 'Medinan';
  ayahRange?: { from: number; to: number };
}

export interface GoldTestCase {
  id: string;
  query: string;
  candidateText: string;
  surahNumber?: number;
  expectedVerdict: 'ACCEPT' | 'REJECT';
  expectedRelation: MatchRelation;
  note: string;
}

export interface BenchmarkMetrics {
  totalTests: number;
  passed: number;
  failed: number;
  expansionLeakageRate: number;
  details: {
    test: GoldTestCase;
    actualVerdict: 'ACCEPT' | 'REJECT';
    actualRelation?: MatchRelation;
    passed: boolean;
    reason?: string;
  }[];
}
