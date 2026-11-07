// MoHeatSub — one display language for every demo (user 2026-11-08): English (default) / 日本語 / 简体中文.
// ADDING A LANGUAGE (user: keep it easy): 1) one entry in LANGS below (name, button label, speech-recognition code, font, fallback),
// 2) text.<code> (+ voice.<code>) in each demo's l10n.js — tools/l10n/ extracts the strings and reports what is missing,
// 3) add the code to DEFAULT_LANGS (all demos) or to "langs" in one demo's l10n.js. Nothing else in the code needs to change.
// ONE language at a time, same size. Loaded by shared/nav.js on every demo page; the demos' own code stays as it is:
//   · subtitles: the demo writes ja + en (#subs .line > .ja / .en, speech #bubble > b / span) → both hidden, one .one line (styled
//     as the demo's ja line → same size in every language) shows the chosen language.
//   · answers: <b>ja</b><span>en</span> buttons (.ch .act-btn .chip-c #micGate .toast) the same way; "日本語 · English" texts
//     (interact.js cards, .ix-btn) show the chosen part; the cover (.intro: title, tagline, chips, buttons, hint) from l10n.js.
//   · data: <demo>/l10n.js — window.MOHEAT_L10N = { langs, text: { <lang>: { "<text as on the page>": "…" } },
//     names: { "<ja name>": { <lang>: "…" } }, voice: { <lang>: { "<ja answer>": ["same meaning", …] } } }. Missing → English.
//   · choice: the 字 button on the stage (each tap = next language), the demo's Subtitles select (Demo 1–9, + Off), ?sub=<lang>. Saved in localStorage
//     'moheat.sublang' (all demos); a demo without that language shows English. shared/voice.js listens in the same language.
(() => {
  if (window.MoHeatSub) return;
  const QS = new URLSearchParams(location.search);
  if (QS.has('cover') || QS.has('render')) return;
  // ---------------------------------------------------------------- the language registry (the only place that knows languages)
  // name: native name · short: label on the 字 button · bcp: lang attribute · speech: Web Speech recognition code (voice.js)
  // font: CSS font stack for this script (optional) · fallback: language used when a text has no translation (default English)
  const CJK_SC = '"PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", "Zen Maru Gothic", sans-serif';
  const LANGS = {
    en: { name: 'English', short: 'EN', bcp: 'en', speech: 'en-US' },
    ja: { name: '日本語', short: '日本語', bcp: 'ja', speech: 'ja-JP' },
    zh: { name: '简体中文', short: '中文', bcp: 'zh-CN', speech: 'zh-CN', font: CJK_SC },
    'zh-Hant': { name: '繁體中文', short: '繁中', bcp: 'zh-TW', speech: 'zh-TW', font: '"PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif', fallback: 'zh' },
    ko: { name: '한국어', short: '한국어', bcp: 'ko', speech: 'ko-KR', font: '"Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif' },
    es: { name: 'Español', short: 'ES', bcp: 'es', speech: 'es-ES' }, fr: { name: 'Français', short: 'FR', bcp: 'fr', speech: 'fr-FR' },
    de: { name: 'Deutsch', short: 'DE', bcp: 'de', speech: 'de-DE' }, pt: { name: 'Português', short: 'PT', bcp: 'pt-BR', speech: 'pt-BR' },
    id: { name: 'Bahasa Indonesia', short: 'ID', bcp: 'id', speech: 'id-ID' }, vi: { name: 'Tiếng Việt', short: 'VI', bcp: 'vi', speech: 'vi-VN' },
    th: { name: 'ไทย', short: 'ไทย', bcp: 'th', speech: 'th-TH', font: 'Thonburi, "Noto Sans Thai", Tahoma, sans-serif' },
  };
  const DEFAULT_LANGS = ['en', 'ja', 'zh'];   // what every demo offers unless its l10n.js lists "langs"
  const chain = (l) => { const out = []; for (let x = l; x && !out.includes(x); x = LANGS[x]?.fallback || (x === 'en' ? null : 'en')) out.push(x); return out; };
  /** value for language l from { en, zh, … }, following the fallback chain (zh-Hant → zh → en) */
  const pickL = (obj, l) => { if (!obj) return undefined; for (const x of chain(l)) if (obj[x] != null) return obj[x]; return undefined; };
  const KEY = 'moheat.sublang';
  const load = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const save = (v) => { try { localStorage.setItem(KEY, v); } catch {} };
  const L10N = () => window.MOHEAT_L10N || {};
  const langs = () => { const l = (L10N().langs || DEFAULT_LANGS).filter((x) => LANGS[x]); return l.includes('en') ? l : ['en', ...l]; };
  let pref = QS.get('sub') || load() || 'en';   // what the viewer chose (any demo)
  const eff = () => (pref === 'off' || langs().includes(pref) ? pref : 'en');   // what this demo can show
  let lang = eff();
  const root = document.documentElement;

  // ---------------------------------------------------------------- translations
  const NAMES = { 信長: { en: 'Nobunaga', zh: '信长', 'zh-Hant': '信長' }, 家康: { en: 'Ieyasu', zh: '家康' }, あなた: { en: 'You', zh: '你' } };
  const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  let maps = {};
  function map(l) {   // normalized "page text" → text in language l
    if (maps[l]) return maps[l];
    const m = maps[l] = new Map();
    if (l === 'zh') {
      for (const s of window.DEMO_DATA?.anim?.subs || []) if (s.zh && s.ja) m.set(norm(s.ja), s.zh);
      for (const [k, v] of Object.entries(window.MOHEAT_ZH || {})) if (v) m.set(norm(k), v);   // older subs_zh.js format
    }
    for (const src of [window.MOHEAT_L10N_COMMON?.text?.[l], L10N().text?.[l]])   // shared/l10n_common.js (page chrome) then the demo's own l10n.js
      for (const [k, v] of Object.entries(src || {})) if (typeof v === 'string') { m.set(norm(k), v); const ns = k.replace(/\s/g, ''); if (!m.has(ns)) m.set(ns, v); }
    return m;
  }
  const missing = new Set();
  function tr(text, l = lang, warn = true) {
    const k = norm(text); if (!k) return '';
    const v = map(l).get(k);
    if (v == null && warn && !missing.has(`${l}|${k}`)) { missing.add(`${l}|${k}`); console.warn(`[MoHeatSub] no ${l} for`, k); }
    return v ?? '';
  }
  const nameOf = (ja, l = lang) => {
    if (!ja || l === 'ja') return ja;
    const n = { ...NAMES, ...(window.MOHEAT_NAMES || {}), ...(L10N().names || {}) }[norm(ja)];
    return pickL(n, l) || ja;
  };

  // ---------------------------------------------------------------- one line per subtitle / answer
  const textOf = (el) => { if (!el) return ''; let t = ''; for (const n of el.childNodes) if (!(n.nodeType === 1 && n.classList.contains('who'))) t += n.textContent; return norm(t); };
  const BTN = '.ch, .act-btn, .chip-c, #micGate button, .toast, #toast, .hud-goal, #goal';
  const KINDS = [   // [containers, ja, en, tag of .one, classes of .one]
    ['#subs .line', ':scope > .ja:not(.one)', ':scope > .en:not(.one)', null, 'ja'],
    ['#bubble, .bubble', ':scope > b:not(.one)', ':scope > span:not(.one)', 'b', ''],
    [BTN, ':scope > b:not(.one)', ':scope > span:not(.one)', 'b', ''],
    ['.ix-card', ':scope > .ix-line:not(.one)', ':scope > .ix-en:not(.one)', 'div', 'ix-line'],
  ];
  const pick = (jaT, enT) => (lang === 'ja' ? jaT : lang === 'en' || lang === 'off' ? enT || jaT : tr(jaT) || enT || jaT);
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
    const name = nameOf(who, lang === 'off' ? 'en' : lang);
    one.lang = LANGS[lang]?.bcp || 'en';
    one.textContent = '';
    if (whoEl && name) { const w = whoEl.cloneNode(false); w.removeAttribute('id'); w.textContent = name; one.appendChild(w); }
    one.appendChild(document.createTextNode(pick(jaT, enT)));
    const after = en || ja;   // after the originals: voice.js reads the first <b> / <span> of a button as its ja / en phrase
    if (one.previousSibling !== after) after.after(one);
  }

  // "日本語 · English" in one element (interact.js cards, some buttons) → the chosen part; both kept in data-voice for voice.js
  const SPLIT = '.ix-card .ix-tag, .ix-card .ix-how, .ix-card .ix-gauge b, .ix-btn, .ch, .act-btn, .chip-c, #micGate button, .intro .ix-toggle span, .pick > p > small, .stage button:not(.opt):not(.msub-btn), .stage :is(em, span, small, b, p, label, div, li):not(.one)';   // any leaf on the stage written "日本語 · English"
  const UI = {   // interact.js (Demo 1–9) texts: ja → { en, zh, … }
    'スキップ': { en: 'Skip', zh: '跳过', 'zh-Hant': '跳過' }, 'あなたの番': { en: 'Your turn', zh: '轮到你了', 'zh-Hant': '輪到你了' }, '感じてみて': { en: 'Feel it', zh: '感受一下' },
    'あなたのセリフ': { en: 'Your line', zh: '你的台词' }, '耳で感じて、選んでね': { en: 'Feel it on your ears, then choose', zh: '用耳朵感受，然后选择' },
    '声に出して読んでください': { en: 'Read it aloud', zh: '请大声读出来' }, '声に出して言ってみて': { en: 'Say it aloud', zh: '试着说出来' },
    'マイクを許可してください': { en: 'Allow the microphone (or tap to continue)', zh: '请允许使用麦克风（或点击继续）' },
    '声に出して言ったら、タップ': { en: 'Say it aloud, then tap', zh: '说出来之后点一下' }, '言いました': { en: 'Said it', zh: '说完了' }, '熱い': { en: 'HOT', zh: '烫' },
    'マイクに「ふーっ」と息を吹きかけて': { en: 'Blow into the mic — feel the cool on both ears', zh: '对着麦克风"呼——"地吹气，感受双耳的凉意' },
    'ボタンを長押しして「ふーっ」': { en: 'Press and hold to blow', zh: '长按按钮"呼——"地吹' }, 'ふーっ': { en: 'Blow', zh: '呼——' },
    '声に出して乾杯！ または グラスをタップ': { en: 'Say it — or tap the glass', zh: '大声说"干杯！"，或点一下酒杯' }, 'グラスをタップして乾杯！': { en: 'Tap the glass to toast', zh: '点一下酒杯干杯！' },
    '乾杯！': { en: 'Cheers!', zh: '干杯！' }, 'あなたも参加する': { en: 'Interactive — answer & play along', zh: '参与互动 — 回答并一起玩' },
    '声援で参加する': { en: 'Cheer along (mic or tap)', zh: '一起应援（麦克风或点击）' },
    '相手': { en: 'With', zh: '对象' }, '場所': { en: 'Where', zh: '地点' }, 'あなたの言葉': { en: 'You speak', zh: '你的语言' },   // Demo23 pickers
    '正解！': { en: 'Correct!', zh: '答对了！' }, 'ざんねん…': { en: 'Not quite — listen!', zh: '可惜……再听听！' }, 'ちょうどいい！': { en: 'Just right!', zh: '刚刚好！' },
    'いいね！': { en: 'Nice!', zh: '很好！' }, 'ありがとう〜！': { en: 'Thank you~!', zh: '谢谢～！' },   // interact.js feedback pops
    'ヒント': { en: 'Hint', zh: '提示' }, '着信': { en: 'Incoming call', zh: '来电' }, '出る': { en: 'Answer', zh: '接听' }, 'かける': { en: 'Call', zh: '拨打' }, 'なかよし': { en: 'bond', zh: '亲密度' },
    'もう一度': { en: 'Play again', zh: '再玩一次', 'zh-Hant': '再玩一次', ko: '다시 하기', es: 'Jugar de nuevo', fr: 'Rejouer', de: 'Nochmal', pt: 'Jogar de novo', id: 'Main lagi', th: 'เล่นอีกครั้ง', vi: 'Chơi lại' },
  };
  function pickSplit(t) {   // "↺ 日本語 · English" written by the demo at run time (e.g. the replay button) → the chosen language, or null
    const m = /^(.*?)\s[·・]\s(.*)$/s.exec(t); if (!m || !CJK.test(m[1])) return null;
    const [, pre, core, post] = AFFIX.exec(m[1].trim()), en = AFFIX.exec(m[2].trim())[2], ui = UI[norm(core)];
    const c = lang === 'ja' ? core : lang === 'en' || lang === 'off' ? en : (lang !== 'en' && ui && chain(lang).slice(0, -1).map((x) => ui[x]).find(Boolean)) || tr(core, lang, false) || en;
    return `${pre}${c}${post}`;
  }
  const CJK = /[぀-ヿ㐀-鿿]/;
  const AFFIX = /^([^\p{L}\p{N}「]*)(.*?)([^\p{L}\p{N}」！？!?…。]*)$/su;   // emoji / arrows around the words stay in every language
  function split(el) {
    if (el.children.length || (el.closest('.intro') && !el.closest('.ix-toggle, .pick, .cleared')) || el.closest('#chatList, #subs, #bubble, .bubble')) return;   // cover buttons: cover() below
    const t = el.textContent;
    if (el.dataset.mshown === undefined || t !== el.dataset.mshown) {   // new text from the demo
      const m = /^(.*?)\s[·・]\s(.*)$/s.exec(t), [, pre, core, post] = AFFIX.exec((m ? m[1] : t).trim());
      const ui = UI[norm(core)];
      if ((!m || !CJK.test(m[1])) && !ui) { delete el.dataset.mshown; return; }   // "▶ Start · 2:30" is not ja · en
      const en = m ? AFFIX.exec(m[2].trim()) : null;
      el.dataset.mpre = pre || (en ? en[1] : ''); el.dataset.mpost = post; el.dataset.mja = core;
      el.dataset.men = en ? en[2] : ui.en;
      if (m && !el.dataset.voice) el.dataset.voice = `${m[1].trim()}|${m[2].trim()}`;
      el.dataset.mlang = '';
    }
    if (el.dataset.mlang === lang) return;
    const { mpre, mja, men, mpost } = el.dataset, ui = UI[norm(mja)];
    let core = mja;
    if (lang === 'en' || lang === 'off') core = men || mja;
    else if (lang !== 'ja') { const z = tr(`${mpre}${mja}${mpost}`, lang, false); core = (ui && chain(lang).slice(0, -1).map((x) => ui[x]).find(Boolean)) || tr(mja, lang, false) || (z && AFFIX.exec(z)[2]) || men || mja; }
    const v = `${mpre}${core}${mpost}`;
    el.dataset.mlang = lang; el.dataset.mshown = v; el.textContent = v;
  }
  const CHIP = /^(🎙 参加|📣 声援)モード (ON|OFF)$/;   // interact.js's stage chip
  const CHIP_T = { en: ['🎙 Interactive', '📣 Cheer'], zh: ['🎙 互动模式', '📣 应援模式'], 'zh-Hant': ['🎙 互動模式', '📣 應援模式'] };
  function chip(el) {
    const m = CHIP.exec(el.textContent.replace(/^(🎙 Interactive|📣 Cheer|🎙 互动模式|📣 应援模式|🎙 互動模式|📣 應援模式) (ON|OFF)$/, (s, a, b) => `${a.startsWith('📣') ? '📣 声援' : '🎙 参加'}モード ${b}`));
    if (!m) return;
    const t = lang === 'ja' ? null : pickL(CHIP_T, lang), v = t ? `${t[m[1].startsWith('📣') ? 1 : 0]} ${m[2]}` : `${m[1]}モード ${m[2]}`;
    if (el.textContent !== v) el.textContent = v;
  }

  // the cover: every text in .intro that l10n.js translates ("" = hidden); the title shrinks when the new text is longer
  const COVER = '.intro h1, .intro p:not(.draft):not(.cleared):not(.dn-rights), .intro .chip, .intro button:not(.opt), .intro .opt:not(:has(small))';
  const units = (s) => [...s].reduce((n, c) => n + (/[　-鿿가-힯＀-￯]/.test(c) ? 1 : c === ' ' ? .3 : .56), 0);
  function cover(el) {
    if (el.closest('.ix-toggle') || el.querySelector(COVER)) return;   // a box of chips: the chips themselves
    const changed = el.dataset.morig === undefined || (el.dataset.mshown !== undefined ? el.textContent !== el.dataset.mshown : el.innerHTML !== el.dataset.mhtml);
    if (changed) {
      const lines = el.tagName === 'H1' ? (el.innerHTML.split(/<br\s*\/?>|<\/span>\s*<span/i).map((x) => x.replace(/<[^>]+>/g, '').trim()).filter(Boolean)) : [];
      el.dataset.morig = norm(el.innerHTML.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')); el.dataset.mhtml = el.innerHTML; el.dataset.mlang = '';
      if (lines.length) el.dataset.mcap = String(Math.max(...lines.map(units)) * Math.max(2, lines.length));
      delete el.dataset.mshown;
    }
    if (el.dataset.mlang === lang) return;
    el.dataset.mlang = lang;
    const l = lang === 'off' ? 'en' : lang, M = map(l), v = M.get(el.dataset.morig) ?? M.get(el.dataset.morig.replace(/\s/g, ''));
    el.classList.toggle('msub-hide', v === '');
    const sp = v == null && !el.children.length ? pickSplit(el.dataset.morig) : null;
    if (sp) { el.textContent = sp; el.dataset.mshown = sp; return; }
    if (v == null || v === '') { if (el.innerHTML !== el.dataset.mhtml) el.innerHTML = el.dataset.mhtml; delete el.dataset.mshown; el.style.removeProperty('font-size'); return; }
    el.textContent = v; el.dataset.mshown = v;
    if (el.dataset.mcap) {   // the title: shrink by length, then until it really fits the cover's width (wide fonts, long English titles)
      el.style.removeProperty('font-size'); const f = Math.min(1, Math.max(.42, +el.dataset.mcap / units(v))); if (f < 1) el.style.setProperty('font-size', `${parseFloat(getComputedStyle(el).fontSize) * f}px`, 'important');
      const box = el.closest('.cover-copy') || el.parentElement, fit = () => { const room = box.clientWidth * .96, need = Math.max(el.scrollWidth, el.getBoundingClientRect().width);
        if (room > 0 && need > room) el.style.setProperty('font-size', `${parseFloat(getComputedStyle(el).fontSize) * Math.max(.4, room / need)}px`, 'important'); };
      fit(); requestAnimationFrame(fit);
    }
  }

  // "日本語 <small>English</small>" in one element: the progress list (<li>ja · <small>en</small>), Demo 1–9 scene titles
  // ("3　ja<small>en</small>", the number stays), the stream's chat hint
  const SMALL = '#steps > li, #sceneTitle, .scene-title, #chatHint, .pick .opt, .ix-done';
  function step(li) {
    const sm = li.querySelector(':scope > small');
    if (sm && (li.dataset.mshown === undefined || li.textContent !== li.dataset.mshown)) {
      const first = li.firstChild?.nodeType === 3 ? li.firstChild.textContent.replace(/\s[·・]\s*$/, '') : '', num = /^(?:[\d一二三四五六七八九十]+[\s　]+)?/.exec(first)[0];
      li.dataset.mnum = num; li.dataset.mja = norm(first.slice(num.length)); li.dataset.men = norm(sm.textContent); li.dataset.mlang = '';
    } else if (!sm && li.dataset.mshown !== undefined && li.textContent !== li.dataset.mshown) { delete li.dataset.mja; delete li.dataset.mshown; }
    if (li.dataset.mja === undefined || li.dataset.mlang === lang) return;
    li.dataset.mlang = lang;
    const ui = UI[norm(li.dataset.mja)], uiT = ui && chain(lang).slice(0, -1).map((x) => ui[x]).find(Boolean);
    const t = lang === 'ja' ? li.dataset.mja : lang === 'en' || lang === 'off' ? li.dataset.men : uiT || tr(li.dataset.mja, lang, false) || li.dataset.men;
    li.textContent = `${li.dataset.mnum}${t}`; li.dataset.mshown = li.textContent;
  }

  // everything else on the page (top bar, side cards, notes, legend, demo switcher, device status, placeholders): a text node whose whole
  // text is in the dictionary (shared/l10n_common.js + the demo's l10n.js) shows that language; it is re-checked whenever the page changes it
  const SKIP = 'script, style, #subs, #bubble, .bubble, #chatList, .one, .intro, .ix-card, .ix-done, #steps, #sceneTitle, .scene-title, #chatHint, .mono, [data-mshown], [data-morig], [data-voice], ' + BTN;
  const orig = new WeakMap(), shown = new WeakMap();
  function textNode(n) {
    const el = n.parentElement; if (!el || el.closest(SKIP)) return;
    const cur = n.nodeValue;
    if (!orig.has(n) || cur !== shown.get(n)) orig.set(n, cur);
    const o = orig.get(n), k = norm(o); if (!k || k.length < 2 || !/\p{L}/u.test(k)) return;
    const v = map(lang === 'off' ? 'en' : lang).get(k), lead = /^\s*/.exec(o)[0], tail = /\s*$/.exec(o)[0];
    const out = v == null ? o : `${lead}${v}${tail}`;
    if (cur !== out) n.nodeValue = out;
    shown.set(n, out);
  }
  function chrome(root = document.body) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) textNode(n);
    for (const el of (root.querySelectorAll ? root.querySelectorAll('[placeholder]') : [])) {
      if (el.dataset.mph === undefined || (el.placeholder !== el.dataset.mphs)) el.dataset.mph = el.placeholder;
      const v = map(lang === 'off' ? 'en' : lang).get(norm(el.dataset.mph)); el.placeholder = v ?? el.dataset.mph; el.dataset.mphs = el.placeholder;
    }
  }
  const chromeMo = new MutationObserver((recs) => {
    for (const r of recs) {
      if (r.type === 'characterData') textNode(r.target);
      else for (const a of r.addedNodes) { if (a.nodeType === 3) textNode(a); else if (a.nodeType === 1) chrome(a); }
    }
  });
  // text drawn on a <canvas> (prop labels, direction hints, radar names, camera overlay): fillText / strokeText look the text up in the same
  // dictionary; "" = not drawn in this language (e.g. the English line under a Japanese prop label). Off in ?render (MP4 export).
  for (const fn of ['fillText', 'strokeText']) {
    const orig2 = CanvasRenderingContext2D.prototype[fn];
    CanvasRenderingContext2D.prototype[fn] = function (text, ...rest) {
      if (typeof text === 'string' && text.length > 1 && root.classList.contains('msub')) {
        const v = map(lang === 'off' ? 'en' : lang).get(norm(text));
        if (v === '') return;
        if (v != null) text = v;
      }
      return orig2.call(this, text, ...rest);
    };
  }
  function renderAll() {
    for (const li of document.querySelectorAll(SMALL)) step(li);
    for (const [sel, ja, en, tag, cls] of KINDS) for (const c of document.querySelectorAll(sel)) pair(c, ja, en, tag, cls);
    for (const el of document.querySelectorAll(SPLIT)) split(el);
    for (const el of document.querySelectorAll('.ix-chip')) chip(el);
    for (const el of document.querySelectorAll(COVER)) cover(el);
  }
  const containers = () => [...document.querySelectorAll(KINDS.map((k) => k[0]).join(', '))];
  const mo = new MutationObserver(() => renderAll());
  function watch() {
    const roots = new Set([...document.querySelectorAll('#stage, .stage, #subs, #bubble, .bubble, #toast, .toast, #steps, #sceneTitle, #chatHint')].map((el) => el.closest('#stage, .stage') || el));
    for (const el of roots) mo.observe(el, { childList: true, subtree: true, characterData: true });
    chromeMo.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  // speaker labels that a demo's CSS writes as .ja::before (Demo20 staff, Demo15/16 grandma / grandpa): the same label on .one, translated
  const WHO = { staff: { en: 'Staff', zh: '工作人员', 'zh-Hant': '工作人員', ko: '스태프' }, gm: { en: 'Grandma', zh: '奶奶' }, gp: { en: 'Grandpa', zh: '爷爷' } };
  const whoCss = () => Object.entries(WHO).map(([w, t]) => Object.keys(LANGS).filter((l) => l !== 'ja')
    .map((l) => `html.msub.msub-${l} .subs[data-who="${w}"] .one::before { content: "${pickL(t, l)}  "; }`).join(' ')).join('\n  ');
  const fontCss = () => Object.entries(LANGS).filter(([, i]) => i.font).map(([l, i]) => `html.msub-${l} :is(.one, [data-mlang="${l}"]) { font-family: ${i.font} !important; }`).join('\n  ');
  const css = document.createElement('style');
  css.textContent = `
  html.msub #subs .line > :is(.ja, .en):not(.one), html.msub :is(#bubble, .bubble, ${BTN}) > :is(b, span):not(.one),
  html.msub .ix-card > :is(.ix-line, .ix-en):not(.one), .msub-hide { display: none !important; }
  html.msub #subs .line > .one { display: block; }
  ${fontCss()}
  html.msub-off #subs { display: none !important; }
  ${whoCss()}
  .msub-hud { position: absolute; top: 1.2cqw; right: 1.2cqw; z-index: 6; display: flex; gap: .6cqw; align-items: center; }
  .msub-hud .ix-chip { position: static !important; }   /* Demo 1–9: interact.js's 参加モード chip sits next to the 字 button */
  .stage:has(.intro:not(.hidden)) .msub-hud .ix-chip { display: none; }
  .stage:has(.intro:not(.hidden)) .hud-top:has(.msub-btn) { display: flex !important; z-index: 30 !important; }   /* the 字 button stays on the cover */
  .stage:has(.intro:not(.hidden)) .hud-top:has(.msub-btn) > :not(.msub-btn) { display: none !important; }
  .msub-hud { z-index: 30; }
  .msub-btn { cursor: pointer; border-radius: 999px; padding: .45cqw 1cqw; border: 1px solid rgba(255, 255, 255, .4); background: rgba(10, 8, 16, .6);
    color: #fff; font: 700 clamp(10px, 1.1cqw, 16px)/1.2 "Noto Sans JP", Inter, system-ui, sans-serif; backdrop-filter: blur(4px); white-space: nowrap; }
  .hud-btn.msub-btn { font: inherit; font-weight: 700; }
  .msub-btn:hover { background: rgba(255, 255, 255, .18); }
  @container (max-width: 620px) { .msub-btn:not(.hud-btn) { font-size: 2.4cqw; padding: 1cqw 2cqw; } }`;
  document.head.appendChild(css);

  // ---------------------------------------------------------------- controls: the 字 button on the stage (each tap = next language)
  let btn = null, sel = null;
  const options = (withOff) => [...langs(), ...(withOff ? ['off'] : [])].map((l) => `<option value="${l}">${l === 'off' ? 'Off' : LANGS[l]?.name || l}</option>`).join('');
  function button() {
    const wrap = btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'msub-btn'; btn.title = 'Subtitles · 字幕 — tap for the next language';
    btn.addEventListener('click', (e) => { e.stopPropagation(); const L = langs(); set(L[(L.indexOf(lang) + 1) % L.length]); });
    const hud = document.querySelector('.stage .hud-top');
    if (hud) { btn.classList.add('hud-btn'); hud.prepend(btn); return; }
    const stage = document.querySelector('#stage, .stage'); if (!stage) { btn = null; return; }
    const w = document.createElement('div'); w.className = 'msub-hud'; w.appendChild(wrap); stage.appendChild(w);
    const ix = () => { const c = stage.querySelector(':scope > .ix-chip'); if (c) w.appendChild(c); return c; };
    if (!ix()) { let n = 0; const t = setInterval(() => { if (ix() || ++n > 40) clearInterval(t); }, 250); }
  }
  function select() { sel = document.getElementById('subMode'); if (sel) sel.addEventListener('change', () => set(sel.value)); }   // Demo 1–9 side panel
  function fill() {
    if (sel) sel.innerHTML = options(true);
  }
  function apply() {
    root.classList.add('msub');
    for (const c of [...root.classList]) if (c.startsWith('msub-')) root.classList.remove(c);
    root.classList.add(`msub-${lang}`);
    if (btn) btn.textContent = `字 ${lang === 'off' ? 'OFF' : LANGS[lang]?.short || lang}`;
    if (sel && sel.value !== lang) { sel.value = lang; sel.dispatchEvent(new Event('change')); }   // the demo re-renders its lines (ja + en for other languages)
    renderAll(); chrome(); root.lang = LANGS[lang]?.bcp || 'en';
    dispatchEvent(new CustomEvent('moheat:sublang', { detail: lang }));
  }
  function set(l) { if (!(l === 'off' || langs().includes(l))) return; if (l !== pref) { pref = l; save(l); } lang = eff(); apply(); }

  window.MoHeatSub = {
    get lang() { return lang; }, get langs() { return langs(); }, set, LANGS, pick: (obj) => pickL(obj, lang), speech: () => LANGS[lang]?.speech,
    tr, zh: (ja) => tr(ja, 'zh'), name: nameOf,
    /** for shared/voice.js: what else counts for a Japanese answer label — its translation + same-meaning phrasings */
    voice: (ja) => {
      const k = norm(ja), out = [], add = (v) => { if (v && !out.includes(v)) out.push(v); };
      if (lang !== 'ja' && lang !== 'en') add(tr(k, lang, false));
      add(tr(k, 'zh', false));
      const V = L10N().voice || {};
      for (const l of [lang, 'all', 'zh']) for (const [x, list] of Object.entries(V[l] || {})) if (norm(x) === k) list.forEach(add);
      for (const [x, list] of Object.entries(window.MOHEAT_VOICE || {})) if (norm(x) === k) list.forEach(add);
      return out;
    },
    missing: () => [...missing],
  };

  function init() {
    select(); button(); fill(); watch();
    if (sel) { sel.value = lang; sel.dispatchEvent(new Event('change')); }   // the demo drops its old ja + en mode
    apply();
    const me = document.currentScript?.src || [...document.scripts].map((x) => x.src).find((x) => /shared\/subs\.js/.test(x));
    if (me) { const c = document.createElement('script'); c.src = me.replace(/subs\.js(\?.*)?$/, 'l10n_common.js?v=4'); c.onload = () => { maps = {}; apply(); }; document.head.appendChild(c); }
    const s = document.createElement('script');   // relative to the page (or its <base>): the demo's own languages
    s.src = 'l10n.js?v=3';
    s.onload = () => {
      maps = {}; missing.clear(); lang = eff(); fill();
      containers().forEach((c) => delete c.dataset.msub); document.querySelectorAll('[data-mlang]').forEach((e) => { e.dataset.mlang = ''; });
      apply();
    };
    document.head.appendChild(s);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
