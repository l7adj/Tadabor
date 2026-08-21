import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
console.log('[build] Cleaning...');
if (fs.existsSync(dist)) fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
function copyFile(src,dest){ fs.mkdirSync(path.dirname(dest),{recursive:true}); fs.copyFileSync(src,dest); }
function copyDir(src,dest){
  fs.mkdirSync(dest,{recursive:true});
  for (const e of fs.readdirSync(src,{withFileTypes:true})) {
    const s=path.join(src,e.name), d=path.join(dest,e.name);
    if (e.isDirectory()) copyDir(s,d); else copyFile(s,d);
  }
}
copyFile(path.join(root,'index.html'), path.join(dist,'index.html'));
copyFile(path.join(root,'mushaf.html'), path.join(dist,'mushaf.html'));
copyDir(path.join(root,'src'), path.join(dist,'src'));
copyDir(path.join(root,'public'), path.join(dist,'public'));
const required = ['dist/index.html','dist/mushaf.html','dist/src/data/quranData.json','dist/src/data/quranPages.json','dist/src/data/surahs.json','dist/src/engine/search.js','dist/public/sw.js'];
let missing=[];
for (const r of required){ if (!fs.existsSync(path.join(root,r))) missing.push(r); }
if (missing.length>0){ console.error('Missing',missing); process.exit(1); }
const qData = JSON.parse(fs.readFileSync(path.join(dist,'src/data/quranData.json'),'utf-8'));
console.log(`[build] Ayahs ${qData.length} PASS`);
if (qData.length !== 6236) { console.error(`[build] Expected 6236 ayahs, found ${qData.length}`); process.exit(1); }
