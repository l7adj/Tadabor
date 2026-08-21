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
const legacyNorm = "const norm=s=>(s||'').normalize('NFC').replace(/[\\u064B-\\u065F\\u0670\\u06D6-\\u06ED\\u0640]/gu,'').replace(/[أإآٱ]/g,'ا').replace(/\\s+/g,' ').trim();";
const legacySearch = "function search(q){const n=norm(q);if(!n)return[];return corpus.filter(a=>{const text=norm(a.text);const terms=n.split(' ').filter(Boolean);return text.includes(n)||terms.every(t=>text.includes(t))||a.words.some(w=>norm(w).includes(n))})}";
const legacyHighlight = "function highlight(t,q){const nq=norm(q);if(!nq)return esc(t);return t.split(/(\\s+)/).map(x=>/^\\s+$/.test(x)?x:norm(x).includes(nq)?'<mark class=\"mark\">'+esc(x)+'</mark>':esc(x)).join('')}";

const replacements = [
  ['<script>\n', `<script type=\"module\">\n${searchImport}\nlet quranSearcher=null;\n`],
  [legacyNorm, 'const norm=s=>normalizeArabic(s);'],
  [legacySearch, 'function search(q){return quranSearcher?quranSearcher.search(q):[]}'],
  [legacyHighlight, "function highlight(t,q){if(!q.trim())return esc(t);return t.split(/(\\s+)/).map(x=>/^\\s+$/.test(x)?x:(matchesSearchToken(x,q)?'<mark class=\"mark\">'+esc(x)+'</mark>':esc(x))).join('')}"],
  ['surahs=s;meta.textContent=', 'surahs=s;quranSearcher=createQuranSearcher(corpus);meta.textContent=']
];

for (const [before, after] of replacements) {
  if (!html.includes(before)) {
    console.error('[build] Expected index fragment not found:', before.slice(0, 80));
    process.exit(1);
  }
  html = html.replace(before, after);
}

fs.writeFileSync(builtIndex, html);

const required = [
  'dist/index.html',
  'dist/mushaf.html',
  'dist/src/data/quranData.json',
  'dist/src/data/quranPages.json',
  'dist/src/data/surahs.json',
  'dist/src/engine/search.js',
  'dist/public/sw.js'
];

const missing = required.filter(relative => !fs.existsSync(path.join(root, relative)));
if (missing.length > 0) {
  console.error('Missing', missing);
  process.exit(1);
}

const qData = JSON.parse(fs.readFileSync(path.join(dist, 'src/data/quranData.json'), 'utf8'));
console.log(`[build] Ayahs ${qData.length} PASS`);
if (qData.length !== 6236) {
  console.error(`[build] Expected 6236 ayahs, found ${qData.length}`);
  process.exit(1);
}

if (!html.includes(searchImport)) {
  console.error('[build] Search engine wiring FAIL');
  process.exit(1);
}

console.log('[build] Search engine wiring PASS');
