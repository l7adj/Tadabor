import fs from 'node:fs';
import crypto from 'node:crypto';
import https from 'node:https';

export const SIMPLE_SOURCE_URL = 'https://raw.githubusercontent.com/lafzi/quran_fts/76c7a622f2fd830c06e36d8f6210e620e0698bd2/data/quran-simple-clean.txt';
export const SIMPLE_SOURCE_COMMIT = '76c7a622f2fd830c06e36d8f6210e620e0698bd2';

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { 'User-Agent': 'Tadabor-Quran-Search' } }, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        fetchText(new URL(response.headers.location, url).toString()).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`HTTP ${response.statusCode} while loading Quran search source`));
        return;
      }
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve(body));
    });
    request.setTimeout(30000, () => request.destroy(new Error('Timed out loading Quran search source')));
    request.on('error', reject);
  });
}

export async function loadSearchCorpus(quranData, options = {}) {
  const sourceFile = options.sourceFile ?? process.env.QURAN_SIMPLE_SOURCE_FILE;
  const raw = sourceFile
    ? fs.readFileSync(sourceFile, 'utf8')
    : await fetchText(SIMPLE_SOURCE_URL);

  const sourceSha256 = crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
  const rows = raw.replace(/^\uFEFF/u, '').split(/\r?\n/).filter(Boolean);
  const source = new Map();

  for (const line of rows) {
    const first = line.indexOf('|');
    const second = line.indexOf('|', first + 1);
    if (first < 1 || second < first + 2) continue;
    const surahId = Number(line.slice(0, first));
    const ayahId = Number(line.slice(first + 1, second));
    source.set(`${surahId}:${ayahId}`, line.slice(second + 1).trim());
  }

  if (source.size !== 6236) {
    throw new Error(`[search-source] Expected 6236 ayahs, found ${source.size}`);
  }

  const corpus = [];
  const missing = [];
  const prefix = 'بسم الله الرحمن الرحيم ';

  for (let i = 0; i < quranData.length; i += 1) {
    const ayah = quranData[i];
    const key = `${ayah.surahId}:${ayah.ayahId}`;
    let searchText = source.get(key);

    if (searchText === undefined) {
      missing.push(key);
      continue;
    }

    // Tanzil-style simple source may prepend basmala to first ayah of a surah.
    // In Tadabor, quranData keeps the ayah text itself as the display source,
    // so the search representation must have the same ayah boundary.
    if (ayah.ayahId === 1 && ayah.surahId !== 1 && ayah.surahId !== 9 && searchText.startsWith(prefix)) {
      searchText = searchText.slice(prefix.length);
    }

    corpus.push({
      globalNumber: i + 1,
      surahId: ayah.surahId,
      ayahId: ayah.ayahId,
      searchText
    });
  }

  if (missing.length > 0) {
    throw new Error(`[search-source] Missing ${missing.length} ayahs: ${missing.slice(0, 5).join(', ')}`);
  }

  return {
    corpus,
    source: {
      url: SIMPLE_SOURCE_URL,
      commit: SIMPLE_SOURCE_COMMIT,
      sha256: sourceSha256,
      rowCount: rows.length,
      ayahCount: source.size
    }
  };
}
