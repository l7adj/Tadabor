/*
 * Tadabor Android offline Mushaf bridge.
 * Uses the local Hafs SVG pages from vendor/quran-svg.
 */
(() => {
  const PAGE_DIR = './mushaf-svg/';
  const state = {
    corpus: null,
    pages: null,
    surahs: null,
    ayahByKey: Object.create(null),
    selected: -1,
    page: 1,
    scroll: 0
  };
  const $ = id => document.getElementById(id);

  async function loadLocal() {
    if (state.corpus) return;
    const [q, p, s] = await Promise.all([
      fetch('./src/data/quranData.json').then(r => {
        if (!r.ok) throw new Error('Quran data unavailable');
        return r.json();
      }),
      fetch('./src/data/quranPages.json').then(r => {
        if (!r.ok) throw new Error('Page mapping unavailable');
        return r.json();
      }),
      fetch('./src/data/surahs.json').then(r => {
        if (!r.ok) throw new Error('Surah metadata unavailable');
        return r.json();
      })
    ]);

    state.corpus = q.map((a, i) => ({ ...a, globalNumber: i + 1 }));
    state.pages = p;
    state.surahs = s;
    state.ayahByKey = Object.create(null);

    for (const a of state.corpus) {
      state.ayahByKey[`${a.surahId}:${a.ayahId}`] = a;
    }
  }

  function byGlobal(global) { return state.corpus[global - 1]; }
  function byKey(key) { return state.ayahByKey[key] || null; }
  function keyOf(a) { return `${a.surahId}:${a.ayahId}`; }

  function pageForGlobal(global) {
    const starts = state.pages.pageStarts;
    let lo = 0, hi = starts.length - 1, best = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (starts[mid] <= global) { best = mid; lo = mid + 1; }
      else hi = mid - 1;
    }
    return best + 1;
  }

  function pageForKey(key) {
    const ayah = byKey(key);
    return ayah ? pageForGlobal(ayah.globalNumber) : 1;
  }

  async function renderPage(page, focusGlobal = state.selected) {
    await loadLocal();
    state.page = Math.max(1, Math.min(604, page));
    const root = $('readerContent');
    const title = $('readerTitle');
    if (!root) return;

    root.innerHTML = '<div class="mushaf"><div class="loading">جاري فتح صفحة المصحف…</div></div>';
    const number = String(state.page).padStart(3, '0');
    const response = await fetch(`${PAGE_DIR}${number}.svg`);
    if (!response.ok) throw new Error('Local Hafs page unavailable');

    const svgText = await response.text();
    const wrapper = document.createElement('div');
    wrapper.className = 'mushafSvgWrap';
    wrapper.innerHTML = svgText;
    const svg = wrapper.querySelector('svg');
    if (!svg) throw new Error('Invalid Mushaf SVG');
    svg.classList.add('tadabor-mushaf-page');

    const style = document.createElement('style');
    style.textContent = `
      .ayahPolygon{fill-opacity:0 !important;cursor:pointer;pointer-events:all}
      .ayahPolygon:hover{fill:#f5e6a3 !important;fill-opacity:.42 !important}
      .ayahPolygon.tadaborSelected{fill:#f0c94a !important;fill-opacity:.58 !important;stroke:#b58900 !important;stroke-width:1.5 !important}
      svg > g > *:not(.ayah_markers){pointer-events:none}
    `;
    svg.prepend(style);

    root.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'mushafSvgCard';
    card.appendChild(wrapper);
    root.appendChild(card);

    const focus = focusGlobal > 0 ? byGlobal(focusGlobal) : null;
    const polygons = [...svg.querySelectorAll('.ayahPolygon')];
    polygons.forEach(poly => {
      const surah = Number(poly.getAttribute('surah'));
      const ayah = Number(poly.getAttribute('ayah'));
      const current = byKey(`${surah}:${ayah}`);

      if (focus && surah === focus.surahId && ayah === focus.ayahId) {
        poly.classList.add('tadaborSelected');
        requestAnimationFrame(() => poly.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      }

      poly.addEventListener('click', event => {
        event.preventDefault();
        if (!current) return;
        state.selected = current.globalNumber;
        polygons.forEach(p => p.classList.remove('tadaborSelected'));
        poly.classList.add('tadaborSelected');
        showMenu(event, current.globalNumber);
      });
    });

    const firstGlobal = state.pages.pageStarts[state.page - 1];
    const first = firstGlobal ? byGlobal(firstGlobal) : null;
    const surahName = first ? state.surahs[first.surahId - 1]?.name : '';
    if (title) title.textContent = `صفحة ${state.page}${surahName ? ` — ${surahName}` : ''}`;
  }

  async function openReader(global) {
    try {
      await loadLocal();
      state.selected = global;
      state.scroll = window.scrollY;
      $('searchView')?.classList.add('hidden');
      $('reader')?.classList.add('active');
      document.body.classList.add('mushafMode');
      await renderPage(pageForGlobal(global), global);
      $('prevPage').onclick = () => renderPage(state.page - 1, state.selected);
      $('nextPage').onclick = () => renderPage(state.page + 1, state.selected);
      $('back').onclick = closeReader;
      $('copySelected').onclick = () => copyAyah(state.selected);
    } catch (error) {
      const root = $('readerContent');
      if (root) root.innerHTML = '<div class="error">تعذر فتح صفحة المصحف المحلية.</div>';
      console.error(error);
    }
  }

  function closeReader() {
    $('reader')?.classList.remove('active');
    $('searchView')?.classList.remove('hidden');
    document.body.classList.remove('mushafMode');
    document.getElementById('ayahMenu')?.classList.remove('show');
    if (typeof window.results === 'function') window.results();
    requestAnimationFrame(() => window.scrollTo(0, state.scroll));
  }

  async function copyAyah(global) {
    await loadLocal();
    const a = byGlobal(global);
    if (!a) return;
    const name = state.surahs[a.surahId - 1]?.name || a.surahId;
    const text = `﴿${a.text}﴾\nسورة ${name} — الآية ${a.ayahId}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
  }

  function showMenu(event, global) {
    state.selected = global;
    const menu = $('ayahMenu');
    if (!menu) return;
    menu.style.left = `${event.clientX || 20}px`;
    menu.style.top = `${event.clientY || 80}px`;
    menu.classList.add('show');
    const copy = $('menuCopy');
    if (copy) copy.onclick = () => {
      copyAyah(global);
      menu.classList.remove('show');
    };
  }

  window.openReader = openReader;
  window.TadaborOfflineMushaf = { open: openReader, close: closeReader, render: renderPage };
})();
