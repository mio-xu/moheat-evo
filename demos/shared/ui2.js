// UI v2 — the ONE interface of every MoHeat Evo demo (DEMO_DESIGN_GUIDE §7.3 "UI v2", user 2026-11-08, decisions A–F):
//   · COVER: one finished image per language (art + title + tagline + chips baked in by tools/web/covers.py from the demo's cover.json),
//     shown at once; the live controls sit on it at fixed template positions: ▶ Start · mode (Interactive default / Just listen) ·
//     the option row (cover.json "options") · language. Switching language swaps to the pre-cached image of that language.
//   · CONTROL BAR, always visible (⚙ "hide controls" is opt-in): ▶/⏸ · chapter progress (seekable; Interactive: back / reached only) ·
//     mode · volume · thermal on/off + intensity · ⚙ · ⛶.
//   · ⚙ SETTINGS: language, subtitles on/off + size, reduce motion, hide controls, device connect, head tracking (Beta, later).
//   · STATES on .u2[data-state]: loading → cover → playing ⇄ paused → ended (= the demo's own cover: Play again · mode · endings).
// The component knows nothing about a demo: it talks to an ADAPTER (MoHeatUI2.mount(stage, adapter)). The live adapter is built on
// shared/shell.js (MoHeatShell / MoHeatPlay / MoHeatSub / MoHeatDevice); preview/ui2/ uses a mock adapter. Adapter fields (all optional
// except cover):  cover: { base, langs, opt }   (base = '<demo>/media/cover/' → <base><lang>.<size>.webp, sizes w1920 / w1280 / c1200)
//   cat · state() · lang() / setLang(l) · mode() / setMode(m) · start() · togglePause() · chapters() → [{ label }] · chapter() · progress()
//   (0–1 inside the chapter) · reached() · seek(i) · volume() / setVolume(v) · heat() / setHeat(on) · intensity() / setIntensity(v)
//   subs() / setSubs('off'|'s'|'m'|'l') · reduced() / setReduced(b) · autohide() / setAutohide(b) · device() → { serial, connected, name }
//   connect() · fullscreen() / toggleFullscreen() · endings() → { got, total } · openEndings() · options() → [{ key, label, items: [{ v, label, on }] }]
//   pick(key, v) · loaded() (0–1) · ready() (Start enabled)
// Texts: T below, one column per language (en / ja / zh; add ko = one more entry per key, nothing else changes).
(() => {
  if (window.MoHeatUI2) return;
  const T = {
    start: { en: 'Start', ja: 'はじめる', zh: '开始' }, again: { en: 'Play again', ja: 'もう一度', zh: '再玩一次' },
    loading: { en: 'Loading', ja: '読み込み中', zh: '加载中' },
    inter: { en: 'Interactive', ja: 'いっしょに参加', zh: '互动' }, pure: { en: 'Just listen', ja: 'きくだけ', zh: '纯聆听' },
    play: { en: 'Play', ja: '再生', zh: '播放' }, pause: { en: 'Pause', ja: '一時停止', zh: '暂停' },
    volume: { en: 'Volume', ja: '音量', zh: '音量' }, mute: { en: 'Mute', ja: 'ミュート', zh: '静音' },
    thermal: { en: 'Thermal', ja: '温冷', zh: '温冷' }, intensity: { en: 'Intensity', ja: '強さ', zh: '强度' },
    settings: { en: 'Settings', ja: '設定', zh: '设置' }, full: { en: 'Fullscreen', ja: '全画面', zh: '全屏' }, exitFull: { en: 'Exit fullscreen', ja: '全画面を終了', zh: '退出全屏' },
    language: { en: 'Language', ja: '言語', zh: '语言' }, subs: { en: 'Subtitles', ja: '字幕', zh: '字幕' }, size: { en: 'Size', ja: 'サイズ', zh: '大小' },
    on: { en: 'On', ja: 'オン', zh: '开' }, off: { en: 'Off', ja: 'オフ', zh: '关' },
    motion: { en: 'Reduce motion', ja: '動きを減らす', zh: '减少动态' }, motionHint: { en: 'Calmer picture, no shaking', ja: '画面の揺れをおさえる', zh: '画面更平稳，不晃动' },
    hide: { en: 'Hide controls', ja: '操作バーを隠す', zh: '隐藏控制条' }, hideHint: { en: 'While playing, after 3 s without input', ja: '再生中、3 秒操作がないとき', zh: '播放中 3 秒无操作时' },
    device: { en: 'MoHeat Evo', ja: 'MoHeat Evo', zh: 'MoHeat Evo' }, connect: { en: 'Connect', ja: '接続', zh: '连接' }, connected: { en: 'Connected', ja: '接続中', zh: '已连接' },
    noSerial: { en: 'Connect from Chrome or Edge on a computer', ja: 'パソコンの Chrome / Edge から接続できます', zh: '请在电脑的 Chrome / Edge 中连接' },
    notConn: { en: 'Not connected', ja: '未接続', zh: '未连接' },
    head: { en: 'Head tracking', ja: 'ヘッドトラッキング', zh: '头部追踪' }, beta: { en: 'Beta', ja: 'ベータ', zh: '测试' }, soon: { en: 'Coming soon', ja: '近日公開', zh: '即将推出' },
    endings: { en: 'Endings', ja: 'エンディング', zh: '结局' }, chapter: { en: 'Chapter', ja: 'チャプター', zh: '章节' },
    locked: { en: 'Not reached yet', ja: 'まだ到達していません', zh: '尚未到达' }, resume: { en: 'Resume', ja: '再開', zh: '继续' },
    interHint: { en: 'Answer, tap and hold — by voice too', ja: '答える・タップ・長押し — 声でも', zh: '回答、点按、长按 — 也可用声音' },
    pureHint: { en: 'Plays through by itself — no mic', ja: '操作なしで最後まで — マイクなし', zh: '自动播完 — 不用麦克风' },
  };
  const NAMES = { en: 'English', ja: '日本語', zh: '中文', ko: '한국어' };
  const P = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const I = {   // ONE icon set (24 grid, 2 px stroke)
    play: P('<path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none"/>'), pause: P('<path d="M7.5 5v14M16.5 5v14" stroke-width="3.2"/>'),
    again: P('<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/>'),
    vol: P('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>'),
    mute: P('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>'),
    heat: P('<path d="M10 4.5a2 2 0 0 1 4 0v9.2a4 4 0 1 1-4 0z"/><path d="M12 10v6.2" stroke-width="2.6"/><circle cx="12" cy="17" r="1.6" fill="currentColor"/>'),
    gear: P('<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.9 1.9M16.6 16.6l1.9 1.9M5.5 18.5l1.9-1.9M16.6 7.4l1.9-1.9"/>'),
    full: P('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'), exitFull: P('<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>'),
    hand: P('<path d="M8.5 12.5V6a1.5 1.5 0 0 1 3 0v5.5M11.5 11V4.8a1.5 1.5 0 0 1 3 0V11M14.5 11V6.3a1.5 1.5 0 0 1 3 0v7.2c0 4-2.6 7-6.3 7-2.6 0-4-1.2-5.4-3.4L3.6 13.2a1.5 1.5 0 0 1 2.5-1.6l2.4 2.9"/>'),
    ear: P('<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="13.5" width="4.5" height="7" rx="1.8"/><rect x="16.5" y="13.5" width="4.5" height="7" rx="1.8"/>'),
    globe: P('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.6 2.6 14.4 0 17M12 3.5c-2.6 2.6-2.6 14.4 0 17"/>'),
    star: P('<path d="M12 3.8l2.5 5.3 5.7.7-4.2 3.9 1.1 5.7L12 16.6l-5.1 2.8 1.1-5.7-4.2-3.9 5.7-.7z"/>'),
    chev: P('<path d="M7 10l5 5 5-5"/>'),
    pin: P('<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>'),
  };
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const NUM = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫';

  function mount(stage, A) {
    const lang = () => A.lang?.() || 'en';
    const t = (k) => T[k][lang()] ?? T[k].en;
    const pickL = (o) => (o == null ? '' : typeof o === 'string' ? o : o[lang()] ?? o.en ?? '');
    const root = document.createElement('div'); root.className = 'u2'; if (A.cat) root.dataset.cat = A.cat;
    if (matchMedia('(pointer: coarse)').matches || A.touch) root.classList.add('u2-touch');
    const cv = A.cover || {}, langs = cv.langs || ['en', 'ja', 'zh'];
    root.innerHTML = `
      <div class="u2-cover">
        <img class="u2-pic" alt="" decoding="async" fetchpriority="high">
        <div class="u2-ctl u2-row-start"><button type="button" class="u2-start"></button><span class="u2-seg u2-mode-c" role="group"></span><span class="u2-picks u2-picks-c"></span><button type="button" class="u2-chipb u2-gal u2-gal-c" hidden></button></div>
        <div class="u2-ctl u2-row-opt"></div>
        <div class="u2-ctl u2-row-lang"><span class="u2-label u2-lang-l"></span><span class="u2-chips u2-langs"></span></div>
        <button type="button" class="u2-chipb u2-gal" hidden></button>
      </div>
      <button type="button" class="u2-paused" tabindex="-1"><span>${I.play}</span></button>
      <div class="u2-bar" role="toolbar">
        <button type="button" class="u2-ib u2-pp"></button>
        <div class="u2-prog"><span class="u2-now"></span><div class="u2-track" role="group"></div></div>
        <span class="u2-seg u2-mode-b" role="group"></span>
        <button type="button" class="u2-ib u2-opt-vol" aria-haspopup="true" aria-expanded="false"></button>
        <button type="button" class="u2-ib u2-heat" aria-haspopup="true" aria-expanded="false">${I.heat}</button>
        <button type="button" class="u2-ib u2-gear" aria-haspopup="true" aria-expanded="false">${I.gear}</button>
        <button type="button" class="u2-ib u2-fs"></button>
        <div class="u2-load"><i></i></div>
      </div>
      <div class="u2-pop u2-pop-vol" hidden></div><div class="u2-pop u2-pop-heat" hidden></div><div class="u2-pop u2-set" hidden></div><div class="u2-pop u2-pop-opt" hidden></div>`;
    stage.appendChild(root);
    const $ = (s) => root.querySelector(s);
    const pic = $('.u2-pic'), big = () => stage.getBoundingClientRect().width;

    // ------------------------------------------------ the finished cover image: the size that fits this player, every language pre-cached
    const size = () => (big() < 760 ? 'c1200' : big() * (devicePixelRatio || 1) > 1400 ? 'w1920' : 'w1280');
    const src = (l) => `${cv.base}${l}.${size()}.webp`;
    const cache = new Map();
    const warm = () => langs.forEach((l) => { const u = src(l); if (!cache.has(u)) { const im = new Image(); im.decoding = 'async'; im.src = u; cache.set(u, im); } });
    const showPic = () => { if (!cv.base) return; const u = src(lang()); if (pic.getAttribute('src') !== u) pic.src = u; };
    pic.addEventListener('load', () => (window.requestIdleCallback || setTimeout)(warm), { once: true });

    // ------------------------------------------------ popovers
    const pops = { vol: $('.u2-pop-vol'), heat: $('.u2-pop-heat'), set: $('.u2-set'), opt: $('.u2-pop-opt') }, owners = { vol: $('.u2-opt-vol'), heat: $('.u2-heat'), set: $('.u2-gear'), opt: null };
    let optKey = null;
    const close = () => Object.keys(pops).forEach((k) => { pops[k].hidden = true; owners[k]?.setAttribute('aria-expanded', 'false'); });
    // a popover opens above its button: bar buttons right-aligned to it, cover option pickers left-aligned (phones: full width)
    const open = (k, ownerEl) => { const was = !pops[k].hidden && (k !== 'opt' || ownerEl?.dataset.pick === optKey); close(); if (was) return;
      if (k === 'opt') { owners.opt = ownerEl; optKey = ownerEl.dataset.pick; }
      renderPop(k); pops[k].hidden = false; owners[k]?.setAttribute('aria-expanded', 'true');
      const b = owners[k].getBoundingClientRect(), r = root.getBoundingClientRect(), wide = big() > 620;
      if (k === 'opt') { pops.opt.style.left = wide ? `${b.left - r.left}px` : ''; pops.opt.style.right = wide ? 'auto' : ''; pops.opt.style.bottom = `${r.bottom - b.top + 6}px`; }
      else if (k !== 'set') pops[k].style.right = wide ? `${Math.max(4, r.right - b.right)}px` : ''; };
    document.addEventListener('pointerdown', (e) => { if (!root.contains(e.target) || (!e.target.closest('.u2-pop') && !e.target.closest('[aria-haspopup]'))) close(); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    const sw = (on, k, dis) => `<button type="button" class="u2-sw" role="switch" aria-checked="${!!on}" data-k="${k}" ${dis ? 'disabled' : ''}></button>`;
    const range = (k, v, cls = '') => `<input class="u2-range ${cls}" type="range" min="0" max="100" step="1" value="${Math.round(v * 100)}" data-k="${k}" style="--v:${Math.round(v * 100)}%">`;
    const renderPop = (k) => {
      if (k === 'vol') pops.vol.innerHTML = `<h3>${t('volume')}</h3><div class="u2-line">${range('vol', A.volume?.() ?? 1)}<span class="u2-val">${Math.round((A.volume?.() ?? 1) * 100)}</span></div>`;
      if (k === 'heat') pops.heat.innerHTML = `<h3>${t('thermal')}</h3><div class="u2-line"><span>${t((A.heat?.() ?? true) ? 'on' : 'off')}</span>${sw(A.heat?.() ?? true, 'heat')}</div>
        <div class="u2-line"><span>${t('intensity')}</span></div><div class="u2-line">${range('int', A.intensity?.() ?? .6, 'u2-heat-range')}<span class="u2-val">${Math.round((A.intensity?.() ?? .6) * 100)}%</span></div>`;
      if (k === 'set') {
        const d = A.device?.() || {}, sv = A.subs?.() ?? 'm';
        pops.set.innerHTML = `<h3>${t('settings')}</h3>
          <div class="u2-line"><span>${t('language')}</span><span class="u2-seg" role="group">${langs.map((l) => `<button type="button" data-lang="${l}" aria-pressed="${l === lang()}">${NAMES[l] || l}</button>`).join('')}</span></div>
          <div class="u2-line"><span>${t('subs')}</span>${sw(sv !== 'off', 'subs')}</div>
          <div class="u2-line"><span>${t('size')}</span><span class="u2-seg" role="group">${['s', 'm', 'l'].map((s) => `<button type="button" data-size="${s}" aria-pressed="${sv === s}" ${sv === 'off' ? 'disabled' : ''}>${s.toUpperCase()}</button>`).join('')}</span></div>
          <div class="u2-line u2-vol-line"><span>${t('volume')}</span>${range('vol', A.volume?.() ?? 1)}</div>
          <div class="u2-line"><span>${t('motion')}<small>${t('motionHint')}</small></span>${sw(A.reduced?.(), 'motion')}</div>
          <div class="u2-line"><span>${t('hide')}<small>${t('hideHint')}</small></span>${sw(A.autohide?.(), 'hide')}</div>
          <div class="u2-line"><span>${t('device')}<small>${d.serial === false ? t('noSerial') : `<i class="u2-dot ${d.connected ? 'ok' : ''}"></i>${d.connected ? `${t('connected')}${d.name ? ' · ' + esc(d.name) : ''}` : t('notConn')}`}</small></span>
            ${d.serial === false ? '' : `<button type="button" class="u2-btn2" data-k="connect">${t('connect')}</button>`}</div>
          <div class="u2-line"><span>${t('head')}<span class="u2-beta">${t('beta')}</span><small>${t('soon')}</small></span>${sw(false, 'head', true)}</div>`;
      }
      if (k === 'opt') { const o = (A.options?.() || []).find((x) => x.key === optKey); if (!o) return;
        pops.opt.innerHTML = `<h3>${esc(pickL(o.label))}</h3><div class="u2-chips u2-wrap">${o.items.map((it) =>
          `<button type="button" class="u2-chipb" data-opt="${esc(o.key)}" data-v="${esc(it.v)}" aria-pressed="${!!it.on}">${esc(pickL(it.label))}</button>`).join('')}</div>`; }
    };
    root.addEventListener('input', (e) => { const r = e.target.closest('.u2-range'); if (!r) return; const v = r.value / 100; r.style.setProperty('--v', `${r.value}%`);
      const val = r.parentElement.querySelector('.u2-val');
      if (r.dataset.k === 'vol') { A.setVolume?.(v); if (val) val.textContent = r.value; }
      if (r.dataset.k === 'int') { A.setIntensity?.(v); if (val) val.textContent = `${r.value}%`; }
      paint(); });
    root.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      const k = b.dataset.k;
      if (b.classList.contains('u2-sw')) { const on = b.getAttribute('aria-checked') !== 'true';
        if (k === 'heat') A.setHeat?.(on); if (k === 'subs') A.setSubs?.(on ? 'm' : 'off'); if (k === 'motion') A.setReduced?.(on); if (k === 'hide') A.setAutohide?.(on);
        const owner = Object.keys(pops).find((p) => pops[p].contains(b)); renderPop(owner); paint(); return; }
      if (b.dataset.lang) { A.setLang?.(b.dataset.lang); renderPop('set'); paint(); return; }
      if (b.dataset.size) { A.setSubs?.(b.dataset.size); renderPop('set'); return; }
      if (k === 'connect') { A.connect?.(); return; }
      if (b.dataset.mode) { A.setMode?.(b.dataset.mode); paint(); return; }
      if (b.dataset.opt) { A.pick?.(b.dataset.opt, b.dataset.v); close(); paint(); return; }
      if (b.dataset.pick) return open('opt', b);
      if (b.dataset.i != null) { A.seek?.(+b.dataset.i); paint(); return; }
      if (b.classList.contains('u2-start')) { A.start?.(); paint(); return; }
      if (b.classList.contains('u2-pp')) { if (['cover', 'ended', 'loading'].includes(A.state?.())) A.start?.(); else A.togglePause?.(); paint(); return; }
      if (b.classList.contains('u2-paused')) { A.togglePause?.(); paint(); return; }
      if (b.classList.contains('u2-opt-vol')) return open('vol');
      if (b.classList.contains('u2-heat')) return open('heat');
      if (b.classList.contains('u2-gear')) return open('set');
      if (b.classList.contains('u2-fs')) { A.toggleFullscreen?.(); paint(); return; }
      if (b.classList.contains('u2-gal')) { A.openEndings?.(); return; }
    });

    // ------------------------------------------------ auto-hide (opt-in)
    let idleT = 0; const wake = () => { root.classList.remove('u2-idle'); clearTimeout(idleT); idleT = setTimeout(() => root.classList.add('u2-idle'), 3000); };
    ['pointermove', 'pointerdown', 'keydown'].forEach((ev) => stage.addEventListener(ev, wake, { passive: true }));

    // ------------------------------------------------ paint: everything from the adapter's state
    let sig = '';
    const paint = () => {
      const st = A.state?.() || 'cover', L = lang(); root.dataset.state = st; root.lang = L;
      root.classList.toggle('u2-autohide', !!A.autohide?.());
      showPic();
      // cover controls
      const ld = A.loaded?.() ?? 1, ready = A.ready?.() ?? ld >= 1, s = $('.u2-start');
      s.disabled = !ready;
      s.innerHTML = st === 'ended' ? `${I.again}<span>${t('again')}</span>` : ready ? `${I.play}<span>${t('start')}</span>` : `${I.play}<span>${t('start')}</span><span class="u2-ld">${Math.round(ld * 100)}%</span>`;
      $('.u2-load').style.setProperty('--p', `${Math.round(ld * 100)}%`);
      const m = A.mode?.() || 'interactive';
      const modeHtml = `<button type="button" data-mode="interactive" aria-pressed="${m === 'interactive'}" title="${esc(t('interHint'))}">${I.hand}<span>${t('inter')}</span></button>`
        + `<button type="button" data-mode="pure" aria-pressed="${m === 'pure'}" title="${esc(t('pureHint'))}">${I.ear}<span>${t('pure')}</span></button>`;
      $('.u2-mode-c').innerHTML = modeHtml; $('.u2-mode-b').innerHTML = modeHtml;
      // option groups (cover.json "options"): one picker chip each — "label  current ▾" — that opens the list above it
      const opts = A.options?.() || [];
      const picks = opts.map((o) => { const cur = o.items.find((it) => it.on) || o.items[0];
        return `<button type="button" class="u2-chipb u2-pick" data-pick="${esc(o.key)}" aria-haspopup="true"><small>${esc(pickL(o.label))}</small><span>${esc(pickL(cur.label))}</span>${I.chev}</button>`; }).join('');
      $('.u2-row-opt').innerHTML = picks; $('.u2-picks-c').innerHTML = picks;
      $('.u2-lang-l').innerHTML = I.globe;
      $('.u2-langs').innerHTML = langs.map((l) => `<button type="button" class="u2-chipb" data-lang="${l}" aria-pressed="${l === L}" lang="${l}">${NAMES[l] || l}</button>`).join('');
      const en = A.endings?.();
      root.querySelectorAll('.u2-gal').forEach((gal) => { gal.hidden = !(en && en.total > 1 && st === 'ended');
        if (!gal.hidden) { gal.innerHTML = `${I.star}<span>${t('endings')}</span> ${en.got} / ${en.total}`; gal.title = t('endings'); } });
      // bar
      const playing = st === 'playing';
      const pp = $('.u2-pp'); pp.innerHTML = playing ? I.pause : st === 'ended' ? I.again : I.play; pp.title = pp.ariaLabel = t(playing ? 'pause' : 'play');
      $('.u2-paused').title = t('resume');
      const cs = A.chapters?.() || [], c = A.chapter?.() ?? -1, reached = A.reached?.() ?? c, inter = m === 'interactive', live = st === 'playing' || st === 'paused';
      const key = `${cs.length}|${L}`;
      if (key !== sig) { sig = key; $('.u2-track').innerHTML = cs.map((ch, i) => `<button type="button" class="u2-seg-c" data-i="${i}"><i></i><span class="u2-tip"></span></button>`).join(''); }
      [...$('.u2-track').children].forEach((b, i) => {
        const lock = !live || (inter && i > reached);
        b.disabled = lock; b.classList.toggle('done', live && i < c); b.classList.toggle('now', live && i === c);
        b.querySelector('i').style.setProperty('--p', live && i === c ? `${Math.round((A.progress?.() ?? 0) * 100)}%` : '0%');
        const lab = `${NUM[i] || i + 1} ${pickL(cs[i].label)}`; b.querySelector('.u2-tip').textContent = lock && live ? `${lab} · ${t('locked')}` : lab; b.ariaLabel = lab;
      });
      $('.u2-now').innerHTML = live && c >= 0 && cs[c] ? `<b>${NUM[c] || c + 1}</b>${esc(pickL(cs[c].label))}` : '';
      const vol = A.volume?.() ?? 1, vb = $('.u2-opt-vol'); vb.innerHTML = vol > 0 ? I.vol : I.mute; vb.title = vb.ariaLabel = t('volume');
      const hb = $('.u2-heat'); hb.classList.toggle('off', !(A.heat?.() ?? true)); hb.title = hb.ariaLabel = t('thermal');
      $('.u2-gear').title = $('.u2-gear').ariaLabel = t('settings');
      const fs = A.fullscreen?.(), fb = $('.u2-fs'); fb.innerHTML = fs ? I.exitFull : I.full; fb.title = fb.ariaLabel = t(fs ? 'exitFull' : 'full');
    };
    addEventListener('resize', () => { showPic(); });
    paint();
    return { root, paint, open, close, T };
  }
  window.MoHeatUI2 = { mount, T, I, NAMES };
})();
