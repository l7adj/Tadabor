const ROOT = document.getElementById('root');
const PAGE_INPUT = document.getElementById('page');

const state = {
  quran: [],
  pageMap: null,
  ayahMap: Object.create(null),
  currentPage: 1,
  selectedKey: null,
  loadPromise: null
};

const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
}[c]));

async function loadData() {
  if (state.quran.length && state.pageMap) return;
  if (state.loadPromise) return state.loadPromise;

  state.loadPromise = (async () => {
    const [quranRes, pagesRes] = await Promise.all([
      fetch('./src/data/quranData.json'),
      fetch('./src/data/quranPages.json')
    ]);
    if (!quranRes.ok || !pagesRes.ok) throw new Error('Local Quran data unavailable');

    state.quran = await quranRes.json();
    state.pageMap = await pagesRes.json();

    state.ayahMap = Object.create(null);
    for (let i = 0; i < state.quran.length; i++) {
      const ayah = state.quran[i];
      state.ayahMap[`${ayah.surahId}:${ayah.ayahId}`] = {
        ...ayah,
        global: i + 1
      };
    }
  })();

  try {
    await state.loadPromise;
  } catch (error) {
    state.loadPromise = null;
    throw error;
  }
}

function ayahByGlobal(global) {
  return state.quran[global - 1];
}

function ayahByKey(key) {
  return state.ayahMap[key] || null;
}

function pageForGlobal(global) {
  const starts = state.pageMap.pageStarts;
  let lo = 0;
  let hi = starts.length - 1;
  let best = 0;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (starts[mid] <= global) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return best + 1;
}

function pageForKey(key) {
  const ayah = ayahByKey(key);
  return ayah ? pageForGlobal(ayah.global) : 1;
}

function getVersesForPage(page) {
  const start = state.pageMap.pageStarts[page - 1] || 1;
  const end = (state.pageMap.pageStarts[page] || state.quran.length + 1) - 1;
  const verses = [];

  for (let global = start; global <= end; global++) {
    const ayah = ayahByGlobal(global);
    if (ayah) verses.push({ ...ayah, global });
  }

  return verses;
}

function render() {
  PAGE_INPUT.value = String(state.currentPage);
  const verses = getVersesForPage(state.currentPage);

  if (!verses.length) {
    ROOT.textContent = 'لا توجد آيات في هذه الصفحة.';
    return;
  }

  ROOT.innerHTML = `<div style="background:#fffdf8;border:1px solid #c9bfae;padding:18px 14px;min-height:75vh">
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#71685d;border-bottom:1px solid #e7dfd2;padding-bottom:8px">
      <span>حفص</span><strong>صفحة ${state.currentPage} من 604</strong><span>مصحف</span>
    </div>
    <div style="font-family:'Noto Naskh Arabic','Amiri',serif;font-size:25px;line-height:2.35;text-align:justify;direction:rtl;padding-top:18px">
      ${verses.map(v => {
        const key = `${v.surahId}:${v.ayahId}`;
        const selected = state.selectedKey === key;
        return `<span data-global="${v.global}" style="padding:2px 3px;border-radius:6px;cursor:pointer;${selected?'background:#fff0a8;box-shadow:inset 0 0 0 1px #e0bd43;':''}">${escapeHtml(v.text)} <span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border:1px solid #b9a98d;border-radius:50%;font-family:system-ui;font-size:11px;vertical-align:middle;margin:0 5px">${v.ayahId}</span></span> `;
      }).join('')}
    </div>
  </div>`;

  ROOT.querySelectorAll('[data-global]').forEach(el => el.addEventListener('click', () => {
    const verse = ayahByGlobal(Number(el.dataset.global));
    if (!verse) return;
    state.selectedKey = `${verse.surahId}:${verse.ayahId}`;
    render();
  }));

  if (state.selectedKey) {
    const selected = ROOT.querySelector('[data-global="' + (ayahByKey(state.selectedKey)?.global || '') + '"]');
    selected?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function bindControls() {
  const prev = document.getElementById('prev');
  const next = document.getElementById('next');
  const go = document.getElementById('go');

  if (prev) prev.onclick = async () => {
    await loadData();
    if (state.currentPage > 1) {
      state.currentPage--;
      render();
    }
  };

  if (next) next.onclick = async () => {
    await loadData();
    if (state.currentPage < 604) {
      state.currentPage++;
      render();
    }
  };

  if (go) go.onclick = async () => {
    await loadData();
    state.currentPage = Math.max(1, Math.min(604, Number(PAGE_INPUT.value) || 1));
    state.selectedKey = null;
    render();
  };
}

async function init() {
  try {
    await loadData();
    bindControls();
    render();
  } catch {
    ROOT.textContent = 'تعذر فتح المصحف المحلي.';
  }
}

export const MushafReader = {
  open: async ({ surah, ayah } = {}) => {
    await loadData();
    state.selectedKey = Number.isInteger(Number(surah)) && Number.isInteger(Number(ayah))
      ? `${Number(surah)}:${Number(ayah)}`
      : null;
    state.currentPage = state.selectedKey ? pageForKey(state.selectedKey) : 1;
    render();
  },
  openPage: async page => {
    await loadData();
    state.currentPage = Math.max(1, Math.min(604, Number(page) || 1));
    state.selectedKey = null;
    render();
  },
  getSelectedText: async () => {
    await loadData();
    const ayah = state.selectedKey ? ayahByKey(state.selectedKey) : null;
    return ayah?.text || '';
  },
  getSelectedKey: () => state.selectedKey
};

init();
