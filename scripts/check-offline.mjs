import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname,'..');
console.log('[offline:check] scanning...');
let errors=[];
function scan(fp){
  if (fp.includes('sw.js')) return;
  const content=fs.readFileSync(fp,'utf-8');
  if ((content.includes('https://')||content.includes('http://')) && (fp.includes('src/engine')||fp.endsWith('.html'))) {
    const lines=content.split('\n');
    lines.forEach((line,i)=>{
      if (line.includes('https://') && !line.trim().startsWith('//') && !line.includes('androidScheme')) {
        errors.push(`${fp}:${i+1} ${line.trim().slice(0,100)}`);
      }
    });
  }
}
function walk(dir){
  for (const e of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,e.name);
    if (e.isDirectory()){ if (['node_modules','dist','android'].includes(e.name)) continue; walk(p); }
    else if (e.name.endsWith('.js')||e.name.endsWith('.html')) scan(p);
  }
}

function loadJson(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) throw new Error(`Missing required file: ${relativePath}`);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function validateCorpusAlignment() {
  const searchCorpus = loadJson('src/data/searchData.json');
  const displayCorpus = loadJson('src/data/quranData.json');

  if (!Array.isArray(searchCorpus) || !Array.isArray(displayCorpus)) {
    throw new Error('Quran corpora must be arrays');
  }
  if (searchCorpus.length !== 6236 || displayCorpus.length !== 6236) {
    throw new Error(`Expected 6236 records in each corpus; search=${searchCorpus.length}, display=${displayCorpus.length}`);
  }

  function buildIndex(corpus, name) {
    const index = new Map();
    for (const item of corpus) {
      const surahId = Number(item?.surahId);
      const ayahId = Number(item?.ayahId);
      if (!Number.isInteger(surahId) || !Number.isInteger(ayahId) || surahId < 1 || ayahId < 1) {
        throw new Error(`Invalid ayah identity in ${name}: ${JSON.stringify(item)}`);
      }
      const key = `${surahId}:${ayahId}`;
      if (index.has(key)) throw new Error(`Duplicate ayah identity in ${name}: ${key}`);
      index.set(key, item);
    }
    return index;
  }

  const searchIndex = buildIndex(searchCorpus, 'searchData.json');
  const displayIndex = buildIndex(displayCorpus, 'quranData.json');

  for (const key of searchIndex.keys()) {
    if (!displayIndex.has(key)) throw new Error(`Missing display ayah for search identity: ${key}`);
  }
  for (const key of displayIndex.keys()) {
    if (!searchIndex.has(key)) throw new Error(`Missing search ayah for display identity: ${key}`);
  }

  console.log('[offline:check] Quran identity alignment PASS (6236/6236, no duplicates, no missing identities)');
}

walk(root);
validateCorpusAlignment();
if(errors.length>0){ console.error('FAIL',errors); process.exit(1);} else console.log('PASS');
