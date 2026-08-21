import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

console.log('[build] Cleaning...');
if (fs.existsSync(dist)) fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const source = path.join(src, entry.name);
    const target = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(source, target);
    else copyFile(source, target);
  }
}

copyFile(path.join(root, 'index.html'), path.join(dist, 'index.html'));
copyFile(path.join(root, 'mushaf.html'), path.join(dist, 'mushaf.html'));
copyDir(path.join(root, 'src'), path.join(dist, 'src'));
copyDir(path.join(root, 'public'), path.join(dist, 'public'));

const builtIndex = path.join(dist, 'index.html');
let html = fs.readFileSync(builtIndex, 'utf8');
const searchImport = "import { createQuranSearcher, matchesSearchToken, normalizeArabic } from './src/engine/search.js';";

const replacements = [
  ['<script>\n', `<script type="module">\n${searchImport}\nlet quranSearcher=null;\n`],
  [
    "const QURAN_URL='./src/data/quranData.json';",
    "const QURAN_URL='./src/data/quranData.json';\nconst SEARCH_URL='./src/data/searchData.json';"
  ],
  [
    "function search(q){const n=norm(q);if(!n)return[];return corpus.filter(a=>{const text=norm(a.text);const terms=n.split(' ').filter(Boolean);return text.includes(n)||terms.every(t=>text.includes(t))||a.words.some(w=>norm(w).includes(n))})}",
    'function search(q){return quranSearcher?quranSearcher.search(q):[]}'
  ],
  [
    "function highlight(t,q){const nq=norm(q);if(!nq)return esc(t);return t.split(/(\\s+)/).map(x=>/^\\s+$/.test(x)?x:norm(x).includes(nq)?'<mark class=\"mark\">'+esc(x)+'</mark>':esc(x)).join('')}",
    "function highlight(t,q){if(!q.trim())return esc(t);return t.split(/(\\s+)/).map(x=>/^\\s+$/.test(x)?x:(matchesSearchToken(x,q)?'<mark class=\"mark\">'+esc(x)+'</mark>':esc(x))).join('')}"
  ],
  [
    "Promise.all([fetch(QURAN_URL).then(r=>r.json()),fetch(PAGES_URL).then(r=>r.json()),fetch(SURAHS_URL).then(r=>r.json())]).then(([q,p,s])=>{corpus=q.map((a,i)=>({globalNumber:i+1,surahId:a.surahId,ayahId:a.ayahId,text:a.text,page:pageForGlobalLocal(p.pageStarts,i+1),words:a.text.split(/\\s+/)}));pages=p;surahs=s;meta.textContent=`جاهز — ${corpus.length} آية • 604 صفحة محلية`;results()})",
    "Promise.all([fetch(SEARCH_URL).then(r=>r.json()),fetch(QURAN_URL).then(r=>r.json()),fetch(PAGES_URL).then(r=>r.json()),fetch(SURAHS_URL).then(r=>r.json())]).then(([searchData,q,p,s])=>{corpus=q.map((a,i)=>({globalNumber:i+1,surahId:a.surahId,ayahId:a.ayahId,text:a.text,page:pageForGlobalLocal(p.pageStarts,i+1),words:a.text.split(/\\s+/)}));pages=p;surahs=s;quranSearcher=createQuranSearcher(searchData,corpus);meta.textContent=`جاهز — ${corpus.length} آية • 604 صفحة محلية`;results()})"
  ]
];

for (const [before, after] of replacements) {
  if (!html.includes(before)) {
    console.error('[build] Expected index fragment not found:', before.slice(0, 120));
    process.exit(1);
  }
  html = html.replace(before, after);
}

fs.writeFileSync(builtIndex, html);

const required = [
  'dist/index.html',
  'dist/mushaf.html',
  'dist/src/data/quranData.json',
  'dist/src/data/searchData.json',
  'dist/src/data/quranPages.json',
  'dist/src/data/surahs.json',
  'dist/src/engine/search.js',
  'dist/public/sw.js'
];

const missing = required.filter(relative => !fs.existsSync(path.join(root, relative)));
if (missing.length > 0) {
  console.error('[build] Missing required local resources:', missing.join(', '));
  console.error('[build] Run: npm run download:quran');
  process.exit(1);
}

const qData = JSON.parse(fs.readFileSync(path.join(dist, 'src/data/quranData.json'), 'utf8'));
const searchData = JSON.parse(fs.readFileSync(path.join(dist, 'src/data/searchData.json'), 'utf8'));
console.log(`[build] Display ayahs ${qData.length} PASS`);
console.log(`[build] Search ayahs ${searchData.length} PASS`);

if (qData.length !== 6236 || searchData.length !== 6236) {
  console.error('[build] Both Quran layers must contain exactly 6236 ayahs');
  process.exit(1);
}

const searchIds = searchData.map(x => Number(x.globalNumber));
const displayIds = qData.map((_, i) => i + 1);
if (searchIds.some((id, i) => id !== displayIds[i])) {
  console.error('[build] Search/display ayah identity mapping FAIL');
  process.exit(1);
}

if (!html.includes(searchImport) || !html.includes('quranSearcher=createQuranSearcher(searchData,corpus)')) {
  console.error('[build] Search/display engine wiring FAIL');
  process.exit(1);
}

console.log('[build] Search/display separation PASS');