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
walk(root);
if(errors.length>0){ console.error('FAIL',errors); process.exit(1);} else console.log('PASS');
