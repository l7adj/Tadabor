/* Tadabor — Mushaf Layer
 * Standard 604-page Madinah-style Uthmani reader backed by Quran.com verse/page data.
 * Search remains independent from the reader.
 */
export class MushafReader {
  constructor({ root, title, onSelect }) {
    this.root = root;
    this.title = title;
    this.onSelect = onSelect;
    this.page = 1;
    this.selectedKey = null;
    this.cache = new Map();
  }

  async pageFor(surah, ayah) {
    const key = `${surah}:${ayah}`;
    const url = `https://api.quran.com/api/v4/verses/by_key/${key}?fields=text_uthmani,page_number,verse_key,verse_number_in_chapter`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('verse metadata unavailable');
    const data = await res.json();
    return data.verse?.page_number || 1;
  }

  async loadPage(page) {
    if (this.cache.has(page)) return this.cache.get(page);
    const url = `https://api.quran.com/api/v4/verses/by_page/${page}?language=ar&fields=text_uthmani,verse_key,verse_number_in_chapter,page_number&per_page=50`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('page unavailable');
    const data = await res.json();
    const verses = data.verses || [];
    this.cache.set(page, verses);
    return verses;
  }

  async open({ surah, ayah, selectedKey = `${surah}:${ayah}` }) {
    this.selectedKey = selectedKey;
    this.page = await this.pageFor(surah, ayah);
    await this.render();
    requestAnimationFrame(() => this.root.querySelector('.mushafAyah.selected')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }

  async render() {
    this.root.innerHTML = '<div class="mushafLoading">جاري فتح صفحة المصحف…</div>';
    try {
      const verses = await this.loadPage(this.page);
      const first = verses[0];
      const last = verses[verses.length - 1];
      const surah = first?.verse_key?.split(':')[0] || '';
      const sameSurah = verses.every(v => v.verse_key?.startsWith(`${surah}:`));
      let html = `<div class="mushafPage" data-page="${this.page}">`;
      html += `<div class="pageHeader"><span>الجزء ${this.juzForPage(this.page)}</span><strong>صفحة ${this.page}</strong><span>حزب ${this.hizbForPage(this.page)}</span></div>`;
      html += '<div class="mushafText">';
      if (this.page === 1 || (sameSurah && first?.verse_key?.endsWith(':1'))) html += '<div class="mushafBasmala">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>';
      for (const v of verses) {
        const selected = v.verse_key === this.selectedKey ? ' selected' : '';
        const safe = this.escape(v.text_uthmani || '');
        html += `<span class="mushafAyah${selected}" data-key="${v.verse_key}" title="${v.verse_key}">${safe} <span class="mushafAyahNumber">${v.verse_number_in_chapter}</span></span> `;
      }
      html += '</div><div class="pageFooter"><span>﴿ ${first?.verse_key || ''} — ${last?.verse_key || ''} ﴾</span></div></div>';
      this.root.innerHTML = html;
      this.root.querySelectorAll('.mushafAyah').forEach(el => {
        el.addEventListener('click', () => {
          this.selectedKey = el.dataset.key;
          this.root.querySelectorAll('.mushafAyah.selected').forEach(x => x.classList.remove('selected'));
          el.classList.add('selected');
          this.onSelect?.(this.selectedKey);
        });
      });
    } catch (error) {
      this.root.innerHTML = '<div class="mushafError">تعذر تحميل صفحة المصحف. تحقق من الاتصال بالإنترنت ثم حاول مرة أخرى.</div>';
      throw error;
    }
  }

  async previous() { if (this.page > 1) { this.page--; await this.render(); } }
  async next() { if (this.page < 604) { this.page++; await this.render(); } }
  async goTo(page) { this.page = Math.max(1, Math.min(604, Number(page) || 1)); await this.render(); }

  // Standard Madinah mushaf juz/hizb boundaries are represented approximately here;
  // the page itself remains authoritative for navigation and verse identity.
  juzForPage(page) { return Math.min(30, Math.floor((page - 1) / 20) + 1); }
  hizbForPage(page) { return Math.min(60, Math.floor((page - 1) / 10) + 1); }
  escape(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }
}
