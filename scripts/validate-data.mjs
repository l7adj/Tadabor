import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dataDir = path.join(root, 'src/data');
console.log('[validate] بدء التحقق...');
function loadJson(file){
  const p=path.join(dataDir,file);
  if(!fs.existsSync(p)){console.error('مفقود '+file);return null;}
  try{return JSON.parse(fs.readFileSync(p,'utf-8'));}catch(e){console.error('JSON INVALID '+file,e.message);return null;}
}
let allPass=true;
function check(name,cond,details=''){
  const s=cond?'PASS':'FAIL';
  console.log(`${name}: ${s} ${details}`);
  if(!cond) allPass=false;
  return cond;
}
const quranData=loadJson('quranData.json');
const quranPages=loadJson('quranPages.json');
const surahs=loadJson('surahs.json');
if(!quranData){process.exit(1);}
console.log('عدد الآيات:', quranData.length);
check('AYAH COUNT', quranData.length===6236, `found ${quranData.length}`);
if(surahs) check('SURAH COUNT', surahs.length===114, `found ${surahs.length}`);
const surahIds=new Set(quranData.map(a=>a.surahId));
check('SURAH IDs 1-114', surahIds.size===114 && [...surahIds].every(id=>Number.isInteger(id)&&id>=1&&id<=114));
let seen=new Set(); let dup=false;
for(const a of quranData){const k=`${a.surahId}:${a.ayahId}`; if(seen.has(k)) dup=true; seen.add(k);}
check('NO DUPLICATE', !dup);
check('FIRST 1:1', !!quranData.find(a=>a.surahId===1&&a.ayahId===1));
check('LAST 114:6', !!quranData.find(a=>a.surahId===114&&a.ayahId===6));
const kursy=quranData.find(a=>a.surahId===2&&a.ayahId===255);
check('2:255 EXISTS', !!kursy);
check('2:255 NOT EMPTY', !!(kursy&&kursy.text&&kursy.text.length>10));
check('NO EMPTY', quranData.every(a=>typeof a.text==='string'&&a.text.trim().length>0));
const bad=quranData.filter(a=>typeof a.surahId!=='number'||typeof a.ayahId!=='number'||typeof a.text!=='string');
check('VALID STRUCTURE', bad.length===0);
check('NO EXTRA FIELDS', quranData.every(a=>Object.keys(a).length===3 && Object.hasOwn(a,'surahId') && Object.hasOwn(a,'ayahId') && Object.hasOwn(a,'text')));
if(quranPages){
  const pc=Object.keys(quranPages).length;
  check('PAGE COUNT 604', pc===604, `found ${pc}`);
  const pageRefs = Object.values(quranPages).flat();
  const pageKeys = new Set(pageRefs.map(a => `${a.surahId}:${a.ayahId}`));
  check('PAGE AYAH REFS 6236', pageRefs.length===6236, `found ${pageRefs.length}`);
  check('PAGE AYAH UNIQUE', pageKeys.size===6236, `found ${pageKeys.size}`);
  check('PAGE MAP COVERS QURAN', pageKeys.size===seen.size && [...seen].every(k=>pageKeys.has(k)));
  let found=false;
  for(const [page,ayahs] of Object.entries(quranPages)){
    if(ayahs.some(a=>a.surahId===2&&a.ayahId===255)){
      check('2:255 PAGE 42', parseInt(page,10)===42, `found page ${page}`);
      found=true; break;
    }
  }
  if(!found) check('2:255 PAGE 42', false, 'not found');
}
console.log('\nالنتيجة:', allPass?'ALL PASS':'FAIL');
process.exit(allPass?0:1);
