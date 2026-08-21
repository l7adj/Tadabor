import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dataDir = path.join(root, 'src/data');
console.log('[download] بدء');
async function fetchJson(url){ const res=await fetch(url); if(!res.ok) throw new Error(`${url} HTTP ${res.status}`); return await res.json(); }
async function main(){
  const urls=[
    'https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/quran.json',
    'https://cdn.jsdelivr.net/gh/shcreator/quran@master/quran.json'
  ];
  let lastError;
  for (const url of urls){
    try{
      const data=await fetchJson(url);
      console.log('fetched', data.length);
      if(!Array.isArray(data) || data.length !== 6236) throw new Error(`Expected 6236 ayahs, found ${data?.length}`);
      const converted=data.map(x=>({surahId:Number(x.chapter??x.surahId), ayahId:Number(x.verse??x.ayahId), text:String(x.text)}));
      fs.mkdirSync(dataDir,{recursive:true});
      fs.writeFileSync(path.join(dataDir,'quranData.json'), JSON.stringify(converted,null,2),'utf-8');
      console.log('saved 6236 ayahs');
      return;
    }catch(e){ lastError=e; console.error('[download] failed',url,e.message); }
  }
  console.error('[download] ALL SOURCES FAILED');
  if (lastError) console.error(lastError);
  process.exit(1);
}
main();
