// Visit counter + "online now" for antoniodimasi.com and Set Builder (/app/).
// Data lives in Antonio's Supabase project: page_hits table (visits) and Realtime presence (online now).
(() => {
  const SUPABASE_URL = 'https://oqanymbortpoafjmryub.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_hq5RvqKNNfexKBKNC7imTg_Sky9PjPo';   // public key, made to live in web pages
  // Shown to everyone when SHOW is true; otherwise only to whoever opened the site once with ?stats
  const SHOW = true;

  let show = SHOW;
  try {
    if (/[?&#]stats\b/.test(location.search + location.hash)) localStorage.setItem('ad:stats', '1');
    if (localStorage.getItem('ad:stats') === '1') show = true;
  } catch (e) {}

  const page = location.pathname.startsWith('/app') ? 'app' : 'site';
  const stats = { site: null, app: null, online: null, onlineApp: null };

  // where the numbers go: the page's #liveStats spot (hero on the site, under the header in the app)
  let box = null;
  function mount() {
    if (!show) return;
    box = document.getElementById('liveStats');
    if (!box) { box = document.createElement('div'); box.id = 'liveStats'; document.body.appendChild(box); }
    box.style.cssText += ';display: flex; flex-wrap: wrap; gap: 8px; font: 600 13px/1.3 Inter, system-ui, sans-serif;';
    new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    render();
  }
  const pill = html => `<span style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:99px;background:rgba(11,10,16,.55);border:1px solid rgba(255,255,255,.14);color:#eee8f5;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)">${html}</span>`;
  const fmt = n => n == null ? '…' : n.toLocaleString(document.documentElement.lang === 'en' ? 'en-US' : 'it-IT');
  function render() {
    if (!box) return;
    const en = document.documentElement.lang === 'en';
    const dot = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#34d399;box-shadow:0 0 8px #34d399"></span>';
    box.innerHTML =
      pill(`${dot}${fmt(stats.online)} ${en ? 'online now' : 'online adesso'}` +
        (stats.onlineApp ? ` <small style="color:#a8a1b8;font-weight:500">(${fmt(stats.onlineApp)} ${en ? 'on Set Builder' : 'su Set Builder'})</small>` : '')) +
      pill(`👁 ${fmt(stats.site)} ${en ? (stats.site === 1 ? 'site visit' : 'site visits') : (stats.site === 1 ? 'visita al sito' : 'visite al sito')}`) +
      pill(`🎧 ${fmt(stats.app)} ${en ? (stats.app === 1 ? 'Set Builder open' : 'Set Builder opens') : (stats.app === 1 ? 'apertura di Set Builder' : 'aperture di Set Builder')}`);
  }

  function loadLib() {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/dist/umd/supabase.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  async function start() {
    mount();
    try { await loadLib(); } catch (e) { return; }
    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // visits: one per browser, per page, per day, so refreshing doesn't inflate the number
    const day = new Date().toISOString().slice(0, 10);
    let counted = false;
    try { counted = localStorage.getItem('ad:hit:' + page) === day; } catch (e) {}
    if (!counted) {
      const { error } = await sb.rpc('hit', { p: page });
      if (!error) try { localStorage.setItem('ad:hit:' + page, day); } catch (e) {}
    }
    if (show) {
      const { data } = await sb.from('page_hits').select('page,hits');
      (data || []).forEach(r => { if (r.page in stats) stats[r.page] = Number(r.hits); });
      if (stats.site == null) stats.site = 0;
      if (stats.app == null) stats.app = 0;
      render();
    }

    // online now: everyone with the site or the app open joins the same presence channel
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const ch = sb.channel('online', { config: { presence: { key: id } } });
    ch.on('presence', { event: 'sync' }, () => {
      const people = Object.values(ch.presenceState());
      stats.online = people.length;
      stats.onlineApp = people.filter(p => p.some(m => m.page === 'app')).length;
      render();
    }).subscribe(s => { if (s === 'SUBSCRIBED') ch.track({ page }); });
  }

  if (document.readyState === 'complete') start(); else addEventListener('load', start);
})();
