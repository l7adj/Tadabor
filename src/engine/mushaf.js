const ROOT = document.getElementById('root');
const PAGE_INPUT = document.getElementById('page');
let quran = [];
let pageMap = null;
let currentPage = 1;
let selectedKey = null;

const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

async function loadData() {
  const [quranRes, pagesRes] = await Promise.all([
    fetch('./src/data/quranData.json'),
    fetch('./src/data/quranPages.json')
  ]);
  if (!quranRes.ok || !pagesRes.ok) throw new Error('Local Quran data unavailable');
  quran = await quranRes.json();
  pageMap = await pagesRes.json();
}

function ayahByGlobal(global) { return quran[global - 1]; }
function pageForKey(key) {
  const [surah, ayah] = key.split(':').map(Number);
  const index = quran.findIndex(x => x.surahId === surah && x.ayahId === ayah);
  if (index < 0) return 1;
  const global = index + 1;
  const starts = pageMap.pageStarts;
  let lo = 0, hi = starts.length - 1, best = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (starts[mid] <= global) { best = mid; lo = mid + 1; } else { hi = mid - 1; }
  }
  return best + 1;
}

function render() {
  PAGE_INPUT.value = String(currentPage);
  const start = pageMap.pageStarts[currentPage - 1] || 1;
  const end = (pageMap.pageStarts[currentPage] || quran.length + 1) - 1;
  const globals = [];
  for (let g = start; g <= end; g++) globals.push(g);
  const verses = globals.map(g => ({ ...ayahByGlobal(g), global:g })).filter(Boolean);
  const first = verses[0];
  ROOT.innerHTML = `<div style="background:#fffdf8;border:1px solid #c9bfae;padding:18px 14px;min-height:75vh">
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#71685d;border-bottom:1px solid #e7dfd2;padding-bottom:8px"><span>حفص</span><strong>صفحة ${currentPage} من 604</strong><span>مصحف</span></div>
    <div style="font-family:'Noto Naskh Arabic','Amiri',serif;font-size:25px;line-height:2.35;text-align:justify;direction:rtl;padding-top:18px">${verses.map(v=>`<span data-global="${v.global}" style="padding:2px 3px;border-radius:6px;cursor:pointer;${selectedKey===`${v.surahId}:${v.ayahId}`?'background:#fff0a8;box-shadow:inset 0 0 0 1px #e0bd43;':''}">${escapeHtml(v.text)} <span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border:1px solid #b9a98d;border-radius:50%;font-family:system-ui;font-size:11px;vertical-align:middle;margin:0 5px">${v.ayahId}</span></span> `).join('')}</div>
  </div>`;
  ROOT.querySelectorAll('[data-global]').forEach(el=>el.addEventListener('click',()=>{const v=ayahByGlobal(Number(el.dataset.global));selectedKey=`${v.surahId}:${v.ayahId}`;render()}));
}

(async()=>{try{await loadData();render();document.getElementById('prev').onclick=()=>{if(currentPage>1){currentPage--;render()}};document.getElementById('next').onclick=()=>{if(currentPage<604){currentPage++;render()}};document.getElementById('go').onclick=()=>{currentPage=Math.max(1,Math.min(604,Number(PAGE_INPUT.value)||1));render()};}catch{ROOT.textContent='تعذر فتح المصحف المحلي.'}})();

export const MushafReader = { open: async ({surah,ayah}) => { await loadData(); selectedKey=`${surah}:${ayah}`; currentPage=pageForKey(selectedKey); render(); } };
