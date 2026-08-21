import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dataDir = path.join(root, 'src/data');

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.json();
}

function toFlatAyahs(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.chapter)) return data.chapter;
  if (Array.isArray(data?.data?.surahs)) {
    return data.data.surahs.flatMap(surah => surah.ayahs.map(ayah => ({
      chapter: surah.number,
      verse: ayah.numberInSurah,
      text: ayah.text
    })));
  }
  throw new Error('Unsupported Quran JSON shape');
}

function toSearchCorpus(data) {
  const ayahs = toFlatAyahs(data).map((ayah, index) => ({
    globalNumber: index + 1,
    surahId: Number(ayah.chapter ?? ayah.surahId ?? ayah.surah),
    ayahId: Number(ayah.verse ?? ayah.ayahId ?? ayah.numberInSurah),
    text: String(ayah.text ?? '')
  }));

  if (ayahs.length !== 6236) {
    throw new Error(`Expected 6236 search ayahs, found ${ayahs.length}`);
  }

  for (let i = 0; i < ayahs.length; i++) {
    const ayah = ayahs[i];
    if (!ayah.surahId || !ayah.ayahId || !ayah.text) {
      throw new Error(`Invalid search ayah at index ${i + 1}`);
    }
  }

  return ayahs;
}

async function ensureDisplayCorpus() {
  const target = path.join(dataDir, 'quranData.json');
  if (fs.existsSync(target)) {
    const existing = JSON.parse(fs.readFileSync(target, 'utf8'));
    if (!Array.isArray(existing) || existing.length !== 6236) {
      throw new Error('Existing quranData.json is not a valid 6236-ayah display corpus');
    }
    console.log('[download] Existing quranData.json preserved');
    return;
  }

  const urls = [
    'https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/quran.json',
    'https://cdn.jsdelivr.net/gh/shcreator/quran@master/quran.json'
  ];

  let lastError;
  for (const url of urls) {
    try {
      const data = await fetchJson(url);
      const ayahs = toFlatAyahs(data);
      if (ayahs.length !== 6236) throw new Error(`Expected 6236 ayahs, found ${ayahs.length}`);
      const converted = ayahs.map((x, i) => ({
        surahId: Number(x.chapter ?? x.surahId ?? x.surah),
        ayahId: Number(x.verse ?? x.ayahId ?? x.numberInSurah),
        text: String(x.text ?? '')
      }));
      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(target, JSON.stringify(converted, null, 2), 'utf8');
      console.log('[download] Created quranData.json with 6236 display ayahs');
      return;
    } catch (error) {
      lastError = error;
      console.error('[download] display source failed:', url, error.message);
    }
  }
  throw lastError ?? new Error('Unable to create quranData.json');
}

async function downloadSearchCorpus() {
  const urls = [
    'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/ara-quranspellednod.json',
    'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/ara-quranspellednod.min.json'
  ];

  let lastError;
  for (const url of urls) {
    try {
      const data = await fetchJson(url);
      const searchCorpus = toSearchCorpus(data);
      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(
        path.join(dataDir, 'searchData.json'),
        JSON.stringify(searchCorpus, null, 2),
        'utf8'
      );
      console.log('[download] Created searchData.json with 6236 search ayahs');
      console.log('[download] Source: Quran Spelled No Diacritics');
      return;
    } catch (error) {
      lastError = error;
      console.error('[download] search source failed:', url, error.message);
    }
  }
  throw lastError ?? new Error('Unable to create searchData.json');
}

async function main() {
  console.log('[download] Quran layers');
  fs.mkdirSync(dataDir, { recursive: true });
  await ensureDisplayCorpus();
  await downloadSearchCorpus();
}

main().catch(error => {
  console.error('[download] FAILED:', error);
  process.exit(1);
});
