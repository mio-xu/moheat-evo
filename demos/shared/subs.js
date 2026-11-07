// MoHeatSub — subtitle language for every demo (user 2026-11-08): English (default) / 日本語 / 中文, ONE language at a time,
// all three at the same size. Loaded by shared/nav.js on every demo page, so the demos' own code stays as it is:
//   · the demo keeps writing its ja + en subtitle (#subs .line > .ja / .en, or the speech #bubble > b / span); this script hides
//     both and shows one line (.one, styled as the demo's .ja line → same font size for every language) in the chosen language.
//   · 中文 comes from <demo>/subs_zh.js (window.MOHEAT_ZH: exact Japanese text → 简体中文; MOHEAT_NAMES: speaker labels;
//     MOHEAT_VOICE: voice-answer paraphrases for shared/voice.js) or from `zh` in media/data.js subtitles; missing → English.
//   · choice: the 字 button on the stage (EN → 日本語 → 中文), the demo's own Subtitles select (Demo 1–9, + Off), ?sub=ja|en|zh.
//     Saved in localStorage 'moheat.sublang' (shared by all demos); shared/voice.js listens in the same language.
(() => {
  if (window.MoHeatSub) return;
  const QS = new URLSearchParams(location.search);
  if (QS.has('cover') || QS.has('render')) return;
  const LANGS = ['en', 'ja', 'zh'], LABEL = { en: 'EN', ja: '日本語', zh: '中文', off: 'OFF' };
  const KEY = 'moheat.sublang';
  const load = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const save = (v) => { try { localStorage.setItem(KEY, v); } catch {} };
  const ok = (v) => LANGS.includes(v) || v === 'off';
  let lang = ok(QS.get('sub')) ? QS.get('sub') : ok(load()) ? load() : 'en';
  const root = document.documentElement;

  // ---------------------------------------------------------------- translations
  const NAMES = { 信長: { en: 'Nobunaga', zh: '信长' }, 家康: { en: 'Ieyasu', zh: '家康' }, あなた: { en: 'You', zh: '你' } };
  const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  let idx = null;
  function index() {
    if (idx) return idx;
    idx = new Map();
    const subs = window.DEMO_DATA?.anim?.subs || [];
    for (const s of subs) if (s.zh && s.ja) idx.set(norm(s.ja), s.zh);
    for (const [k, v] of Object.entries(window.MOHEAT_ZH || {})) if (v) idx.set(norm(k), v);
    return idx;
  }
  const missing = new Set();
  function zhOf(ja) {
    const k = norm(ja); if (!k) return '';
    const v = index().get(k);
    if (!v && !missing.has(k)) { missing.add(k); console.warn('[MoHeatSub] no 中文 for', k); }
    return v || '';
  }
  const nameOf = (ja, l) => { const n = { ...NAMES, ...(window.MOHEAT_NAMES || {}) }[norm(ja)]; return (n && n[l]) || ja; };

  // ---------------------------------------------------------------- one line per subtitle / answer
  // pairs: the demo writes ja + en into two elements → both hidden, one .one element (styled like the ja one) shows the chosen language
  const textOf = (el) => { if (!el) return ''; let t = ''; for (const n of el.childNodes) if (!(n.nodeType === 1 && n.classList.contains('who'))) t += n.textContent; return norm(t); };
  const BTN = '.ch, .act-btn, .chip-c, #micGate button, .toast, #toast';
  const KINDS = [   // [containers, ja, en, tag of .one, classes of .one]
    ['#subs .line', ':scope > .ja:not(.one)', ':scope > .en:not(.one)', null, 'ja'],
    ['#bubble, .bubble', ':scope > b:not(.one)', ':scope > span:not(.one)', 'b', ''],
    [BTN, ':scope > b:not(.one)', ':scope > span:not(.one)', 'b', ''],
    ['.ix-card', ':scope > .ix-line:not(.one)', ':scope > .ix-en:not(.one)', 'div', 'ix-line'],
  ];
  const pick = (jaT, enT) => (lang === 'en' ? enT || jaT : lang === 'zh' ? zhOf(jaT) || enT || jaT : jaT);
  function pair(c, jaSel, enSel, tag, cls) {
    const ja = c.querySelector(jaSel), en = c.querySelector(enSel);
    if (!ja && !en) return;
    const jaT = textOf(ja), enT = textOf(en), whoEl = ja?.querySelector('.who') || en?.querySelector('.who'), who = norm(whoEl?.textContent);
    const sig = `${lang}|${jaT}|${enT}|${who}`;
    let one = c.querySelector(':scope > .one');
    if (one && c.dataset.msub === sig) return;
    c.dataset.msub = sig;
    const src = ja || en;
    if (!one) one = document.createElement(tag || (src.tagName === 'DIV' ? 'div' : 'span'));
    one.className = [cls, 'one', ...(tag ? [] : [...src.classList].filter((x) => x !== 'ja' && x !== 'en'))].filter(Boolean).join(' ');
    const name = lang === 'ja' ? who : nameOf(who, lang === 'off' ? 'en' : lang);
    one.lang = lang === 'zh' ? 'zh-CN' : lang;
    one.textContent = '';
    if (whoEl && name) { const w = whoEl.cloneNode(false); w.removeAttribute('id'); w.textContent = name; one.appendChild(w); }
    one.appendChild(document.createTextNode(pick(jaT, enT)));
    const after = en || ja;   // after the originals: voice.js reads the first <b> / <span> of a button as its ja / en phrase
    if (one.previousSibling !== after) after.after(one);
  }
  // "日本語 · English" in one element (interact.js cards, some buttons) → the chosen part; both kept in data-voice for voice.js
  const SPLIT = '.ix-card .ix-tag, .ix-card .ix-how, .ix-card .ix-gauge b, .ix-btn, .ch, .act-btn, .chip-c, #micGate button';
  const UI = {   // interact.js (Demo 1–9) texts: ja → [en, zh]
    'スキップ': ['Skip', '跳过'], 'あなたの番': ['Your turn', '轮到你了'], '感じてみて': ['Feel it', '感受一下'], 'あなたのセリフ': ['Your line', '你的台词'],
    '耳で感じて、選んでね': ['Feel it on your ears, then choose', '用耳朵感受，然后选择'], '声に出して読んでください': ['Read it aloud', '请大声读出来'],
    '声に出して言ってみて': ['Say it aloud', '试着说出来'], 'マイクを許可してください': ['Allow the microphone (or tap to continue)', '请允许使用麦克风（或点击继续）'],
    '声に出して言ったら、タップ': ['Say it aloud, then tap', '说出来之后点一下'], '言いました': ['Said it', '说完了'], '熱い': ['HOT', '烫'],
    'マイクに「ふーっ」と息を吹きかけて': ['Blow into the mic — feel the cool on both ears', '对着麦克风"呼——"地吹气，感受双耳的凉意'],
    'ボタンを長押しして「ふーっ」': ['Press and hold to blow', '长按按钮"呼——"地吹'], 'ふーっ': ['Blow', '呼——'],
    '声に出して乾杯！ または グラスをタップ': ['Say it — or tap the glass', '大声说"干杯！"，或点一下酒杯'], 'グラスをタップして乾杯！': ['Tap the glass to toast', '点一下酒杯干杯！'], '乾杯！': ['Cheers!', '干杯！'],
  };
  const AFFIX = /^([^\p{L}\p{N}「]*)(.*?)([^\p{L}\p{N}」！？!?…。]*)$/su;   // emoji / arrows around the words stay in every language
  function split(el) {
    if (el.children.length) return;
    const t = el.textContent;
    if (el.dataset.mshown === undefined || t !== el.dataset.mshown) {   // new text from the demo
      const m = /^(.*?)\s[·・]\s(.*)$/s.exec(t), [, pre, core, post] = AFFIX.exec((m ? m[1] : t).trim());
      const ui = UI[norm(core)];
      if (!m && !ui) { delete el.dataset.mshown; return; }
      const en = m ? AFFIX.exec(m[2].trim()) : null;
      el.dataset.mpre = pre; el.dataset.mpost = post; el.dataset.mja = core;
      el.dataset.men = en ? en[2] : ui[0]; el.dataset.mzh = ui ? ui[1] : '';
      if (en && !pre && en[1]) el.dataset.mpre = en[1];
      if (m && !el.dataset.voice) el.dataset.voice = `${m[1].trim()}|${m[2].trim()}`;
      el.dataset.mlang = '';
    }
    if (el.dataset.mlang === lang) return;
    const full = `${el.dataset.mpre}${el.dataset.mja}${el.dataset.mpost}`.trim(), zFull = index().get(norm(full));
    const core = lang === 'zh' ? el.dataset.mzh || index().get(norm(el.dataset.mja)) || (zFull && AFFIX.exec(zFull)[2]) || el.dataset.men || el.dataset.mja
      : pick(el.dataset.mja, el.dataset.men);
    const v = lang === 'ja' ? `${el.dataset.mpre}${el.dataset.mja}${el.dataset.mpost}` : `${el.dataset.mpre}${core}${el.dataset.mpost}`;
    el.dataset.mlang = lang; el.dataset.mshown = v; el.textContent = v;
  }
  function renderAll() {
    for (const [sel, ja, en, tag, cls] of KINDS) for (const c of document.querySelectorAll(sel)) pair(c, ja, en, tag, cls);
    for (const el of document.querySelectorAll(SPLIT)) split(el);
  }
  const containers = () => [...document.querySelectorAll(KINDS.map((k) => k[0]).join(', '))];
  const mo = new MutationObserver(() => renderAll());
  function watch() {
    const roots = new Set([...document.querySelectorAll('#stage, .stage, #subs, #bubble, .bubble, #toast, .toast')].map((el) => el.closest('#stage, .stage') || el));
    for (const el of roots) mo.observe(el, { childList: true, subtree: true, characterData: true });
  }

  const css = document.createElement('style');
  css.textContent = `
  html.msub #subs .line > :is(.ja, .en):not(.one), html.msub :is(#bubble, .bubble, ${BTN}) > :is(b, span):not(.one),
  html.msub .ix-card > :is(.ix-line, .ix-en):not(.one) { display: none !important; }
  html.msub #subs .line > .one { display: block; }
  html.msub-zh :is(.one, [data-mlang="zh"]) { font-family: "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", "Zen Maru Gothic", sans-serif !important; }
  html.msub-off #subs { display: none !important; }
  html.msub-en .subs[data-who="staff"] .one::before { content: "Staff  "; } html.msub-zh .subs[data-who="staff"] .one::before { content: "工作人员  "; }   /* Demo20 */
  .msub-hud { position: absolute; top: 1.2cqw; right: 1.2cqw; z-index: 6; display: flex; gap: .6cqw; align-items: center; }
  .msub-hud .ix-chip { position: static !important; }   /* Demo 1–9: interact.js's 参加モード chip sits next to the 字 button */
  .stage:has(.intro:not(.hidden)) .msub-hud .ix-chip { display: none; }
  .msub-btn { cursor: pointer; border-radius: 999px; padding: .45cqw 1cqw; border: 1px solid rgba(255, 255, 255, .4); background: rgba(10, 8, 16, .6);
    color: #fff; font: 700 clamp(10px, 1.1cqw, 16px)/1.2 "Noto Sans JP", Inter, system-ui, sans-serif; backdrop-filter: blur(4px); white-space: nowrap; }
  .hud-btn.msub-btn { font: inherit; font-weight: 700; }
  .msub-btn:hover { background: rgba(255, 255, 255, .18); }
  @container (max-width: 620px) { .msub-btn:not(.hud-btn) { font-size: 2.4cqw; padding: 1cqw 2cqw; } }`;
  document.head.appendChild(css);

  // ---------------------------------------------------------------- controls
  let btn = null, sel = null;
  function button() {
    btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'msub-btn'; btn.title = 'Subtitles · 字幕';
    btn.addEventListener('click', (e) => { e.stopPropagation(); set(LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length]); });
    const hud = document.querySelector('.stage .hud-top');
    if (hud) { btn.classList.add('hud-btn'); hud.prepend(btn); return; }
    const stage = document.querySelector('#stage, .stage'); if (!stage) { btn = null; return; }
    const w = document.createElement('div'); w.className = 'msub-hud'; w.appendChild(btn); stage.appendChild(w);
    const chip = () => { const c = stage.querySelector(':scope > .ix-chip'); if (c) w.appendChild(c); return c; };
    if (!chip()) { let n = 0; const t = setInterval(() => { if (chip() || ++n > 40) clearInterval(t); }, 250); }
  }
  function select() {   // Demo 1–9: the side panel's Subtitles select becomes English / 日本語 / 中文 / Off
    sel = document.getElementById('subMode'); if (!sel) return;
    sel.innerHTML = '<option value="en">English</option><option value="ja">日本語</option><option value="zh">中文</option><option value="off">Off</option>';
    sel.addEventListener('change', () => set(sel.value));
  }
  function apply() {
    root.classList.add('msub');
    for (const l of [...LANGS, 'off']) root.classList.toggle(`msub-${l}`, l === lang);
    if (btn) btn.textContent = `字 ${LABEL[lang]}`;
    if (sel && sel.value !== lang) { sel.value = lang; sel.dispatchEvent(new Event('change')); }   // the demo re-renders its lines (ja + en for zh)
    renderAll();
    dispatchEvent(new CustomEvent('moheat:sublang', { detail: lang }));
  }
  function set(l) { if (!ok(l) || l === lang) { apply(); return; } lang = l; save(l); apply(); }

  window.MoHeatSub = {
    get lang() { return lang; }, set, LANGS,
    zh: zhOf, name: nameOf,
    /** for shared/voice.js: Chinese + paraphrases for a Japanese answer label */
    voice: (ja) => { const k = norm(ja), v = (window.MOHEAT_VOICE || {})[k] || Object.entries(window.MOHEAT_VOICE || {}).find(([x]) => norm(x) === k)?.[1] || [], z = index().get(k); return z ? [z, ...v] : v; },
    missing: () => [...missing],
  };

  function init() {
    select(); button(); watch();
    if (sel) { sel.value = lang; sel.dispatchEvent(new Event('change')); }   // the demo drops its old ja + en mode
    apply();
    const s = document.createElement('script');   // relative to the page (or its <base>): the demo's own Chinese file
    s.src = 'subs_zh.js?v=1';
    s.onload = () => { idx = null; missing.clear(); containers().forEach((c) => delete c.dataset.msub); document.querySelectorAll('[data-mlang]').forEach((e) => { e.dataset.mlang = ''; }); renderAll(); dispatchEvent(new CustomEvent('moheat:sublang', { detail: lang })); };
    document.head.appendChild(s);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
