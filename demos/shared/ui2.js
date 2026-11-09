// UI v2 — the ONE interface of every MoHeat Evo demo (DEMO_DESIGN_GUIDE §7.3 "UI v2", user 2026-11-08, decisions A–F):
//   · COVER: one finished image per language (art + title + tagline + chips baked in by tools/web/covers.py from the demo's cover.json),
//     shown at once; the live controls sit on it at fixed template positions: ▶ Start · mode (Interactive default / Just listen) ·
//     the option row (cover.json "options") · language. Switching language swaps to the pre-cached image of that language.
//   · CONTROL BAR, always visible (⚙ "hide controls" is opt-in): ▶/⏸ · chapter progress (seekable; Interactive: back / reached only) ·
//     mode · volume · thermal on/off + intensity · ⚙ · ⛶.
//   · ⚙ SETTINGS: language, subtitles on/off + size, reduce motion, hide controls, device connect.
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
    voice: { en: 'Voice', ja: '音声', zh: '配音' }, voiceOnly: { en: '日本語 only for now', ja: '今は日本語のみ', zh: '目前仅日语' }, jaOnly: { en: '日本語 only', ja: '日本語のみ', zh: '仅日语' }, subsOn: { en: 'Show subtitles', ja: '字幕を表示', zh: '显示字幕' },
    language: { en: 'Language', ja: '言語', zh: '语言' }, subs: { en: 'Subtitles', ja: '字幕', zh: '字幕' }, size: { en: 'Size', ja: 'サイズ', zh: '大小' },
    on: { en: 'On', ja: 'オン', zh: '开' }, off: { en: 'Off', ja: 'オフ', zh: '关' },
    motion: { en: 'Reduce motion', ja: '動きを減らす', zh: '减少动态' }, motionHint: { en: 'Calmer picture, no shaking', ja: '画面の揺れをおさえる', zh: '画面更平稳，不晃动' },
    hide: { en: 'Hide controls', ja: '操作バーを隠す', zh: '隐藏控制条' }, hideHint: { en: 'While playing, after 3 s without input', ja: '再生中、3 秒操作がないとき', zh: '播放中 3 秒无操作时' },
    device: { en: 'MoHeat Evo', ja: 'MoHeat Evo', zh: 'MoHeat Evo' }, connect: { en: 'Connect', ja: '接続', zh: '连接' }, connected: { en: 'Connected', ja: '接続中', zh: '已连接' },
    noSerial: { en: 'Connect from Chrome or Edge on a computer', ja: 'パソコンの Chrome / Edge から接続できます', zh: '请在电脑的 Chrome / Edge 中连接' },
    notConn: { en: 'Not connected', ja: '未接続', zh: '未连接' }, reconnecting: { en: 'Reconnecting…', ja: '再接続中…', zh: '正在重新连接…' },
    lost: { en: 'Disconnected — plug it back in', ja: '切断されました — 挿し直してください', zh: '已断开 — 请重新插上' }, devError: { en: 'Could not open', ja: '開けませんでした', zh: '无法打开' },
    disconnect: { en: 'Disconnect', ja: '切断', zh: '断开' },
    side: { en: 'Info panel', ja: '情報パネル', zh: '信息面板' }, sideHint: { en: 'Sound map and thermal meters', ja: '音の位置と温冷メーター', zh: '声音方位与温冷表' },
    lr: { en: 'Left / right check', ja: '左右チェック', zh: '左右声道检查' }, thermo: { en: 'Thermal check', ja: '温冷チェック', zh: '温冷检查' }, run: { en: 'Test', ja: 'テスト', zh: '测试' },
    credits: { en: 'Credits', ja: 'クレジット', zh: '制作名单' },
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
        <div class="u2-ctl u2-row-lang"></div>
        <button type="button" class="u2-chipb u2-gal" hidden></button>
        <span class="u2-chipb u2-clear" hidden></span>
      </div>
      <button type="button" class="u2-paused" tabindex="-1"><span>${I.play}</span></button>
      <div class="u2-bar" role="toolbar">
        <button type="button" class="u2-ib u2-pp"></button>
        <div class="u2-prog"><span class="u2-now"></span><div class="u2-track" role="slider" tabindex="0" aria-valuemin="1"></div></div>
        <span class="u2-seg u2-mode-b" role="group"></span><button type="button" class="u2-ib u2-mode-t"></button>
        <button type="button" class="u2-ib u2-opt-vol" aria-haspopup="true" aria-expanded="false"></button>
        <button type="button" class="u2-ib u2-heat" aria-haspopup="true" aria-expanded="false">${I.heat}</button>
        <button type="button" class="u2-ib u2-gear" aria-haspopup="true" aria-expanded="false">${I.gear}</button>
        <button type="button" class="u2-ib u2-fs"></button>
        <div class="u2-load"><i></i></div>
      </div>
      <div class="u2-pop u2-pop-vol" hidden></div><div class="u2-pop u2-pop-heat" hidden></div><div class="u2-pop u2-set" hidden></div><div class="u2-pop u2-pop-opt" hidden></div>`;
    stage.appendChild(root);
    // the control bar sits UNDER the picture (user 2026-11-09: a bar over the picture covered the demos' own buttons — Demo10 / 13):
    // its own strip right below the stage, same width; in fullscreen it is fixed to the bottom of the screen
    const under = document.createElement('div'); under.className = 'u2 u2-under' + (root.classList.contains('u2-touch') ? ' u2-touch' : ''); if (A.cat) under.dataset.cat = A.cat;
    under.appendChild(root.querySelector('.u2-bar')); stage.after(under);
    const $ = (s) => root.querySelector(s) || under.querySelector(s);
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
    // small players (phones): ⚙ opens as a bottom sheet over the whole page (the 210 px picture is too small for it)
    const sheet = document.createElement('div'); sheet.className = 'u2 u2-sheet'; sheet.hidden = true; if (A.cat) sheet.dataset.cat = A.cat; document.body.appendChild(sheet);
    sheet.addEventListener('pointerdown', (e) => { if (e.target !== sheet) return; close();   // the sheet is gone before the click lands: that click must not hit what was under it (phones opened ☰, then switched demo)
      const eat = (c) => { c.stopPropagation(); c.preventDefault(); removeEventListener('click', eat, true); }; addEventListener('click', eat, true); setTimeout(() => removeEventListener('click', eat, true), 700); });
    const close = () => { Object.keys(pops).forEach((k) => { pops[k].hidden = true; owners[k]?.setAttribute('aria-expanded', 'false'); }); sheet.hidden = true; if (pops.set.parentElement !== root) root.appendChild(pops.set); };
    // a popover opens above its button: bar buttons right-aligned to it, cover option pickers left-aligned (phones: full width)
    const open = (k, ownerEl) => { const was = !pops[k].hidden && (k !== 'opt' || ownerEl?.dataset.pick === optKey); close(); if (was) return;
      if (k === 'opt') { owners.opt = ownerEl; optKey = ownerEl.dataset.pick; }
      renderPop(k); pops[k].hidden = false; owners[k]?.setAttribute('aria-expanded', 'true');
      if (k === 'set' && big() <= 620) { sheet.lang = root.lang; sheet.appendChild(pops.set); sheet.hidden = false; return; }
      const b = owners[k].getBoundingClientRect(), r = root.getBoundingClientRect(), wide = big() > 620;
      if (k === 'opt') { pops.opt.style.left = wide ? `${b.left - r.left}px` : ''; pops.opt.style.right = wide ? 'auto' : ''; pops.opt.style.bottom = `${Math.max(6, r.bottom - b.top + 6)}px`; }
      else if (k !== 'set') pops[k].style.right = wide ? `${Math.max(4, r.right - b.right)}px` : ''; };
    document.addEventListener('pointerdown', (e) => { if (sheet.contains(e.target)) return; if (!(root.contains(e.target) || under.contains(e.target)) || (!e.target.closest('.u2-pop') && !e.target.closest('[aria-haspopup]'))) close(); });
    addEventListener('keydown', (e) => { if (e.key !== 'Escape' || !(!sheet.hidden || Object.values(pops).some((p) => !p.hidden))) return; close(); e.stopImmediatePropagation(); e.preventDefault(); }, true);   // Esc with a panel open only closes it (not ■ STOP)
    const sw = (on, k) => `<button type="button" class="u2-sw" role="switch" aria-checked="${!!on}" data-k="${k}"></button>`;
    const range = (k, v, cls = '') => `<input class="u2-range ${cls}" type="range" min="0" max="100" step="1" value="${Math.round(v * 100)}" data-k="${k}" style="--v:${Math.round(v * 100)}%">`;
    // the cover's two selectors (the same picker chip as the demo's options): subtitle language and voice, independent
    const selectors = () => [{ key: '__subs', label: T.subs, items: langs.map((l) => ({ v: l, label: NAMES[l] || l, on: l === lang() })) },
      ...(A.voice ? [{ key: '__voice', label: T.voice, items: (A.voiceLangs || []).map((v) => ({ v, label: NAMES[v] || v, on: v === A.voice() })) }] : [])];
    const renderPop = (k) => {
      if (k === 'vol') pops.vol.innerHTML = `<h3>${t('volume')}</h3><div class="u2-line">${range('vol', A.volume?.() ?? 1)}<span class="u2-val">${Math.round((A.volume?.() ?? 1) * 100)}</span></div>`;
      if (k === 'heat') pops.heat.innerHTML = `<h3>${t('thermal')}</h3><div class="u2-line"><span>${t((A.heat?.() ?? true) ? 'on' : 'off')}</span>${sw(A.heat?.() ?? true, 'heat')}</div>
        <div class="u2-line"><span>${t('intensity')}</span></div><div class="u2-line">${range('int', A.intensity?.() ?? .6, 'u2-heat-range')}<span class="u2-val">${Math.round((A.intensity?.() ?? .6) * 100)}%</span></div>`;
      if (k === 'set') {
        const d = A.device?.() || {}, sv = A.subs?.() ?? 'm';
        pops.set.innerHTML = `<h3>${t('settings')}</h3>
          <div class="u2-line"><span>${t('subs')}</span><span class="u2-seg" role="group">${langs.map((l) => `<button type="button" data-lang="${l}" aria-pressed="${l === lang()}">${NAMES[l] || l}</button>`).join('')}</span></div>
          ${A.voice ? `<div class="u2-line u2-line-wrap"><span>${t('voice')}</span><span class="u2-seg" role="group">${(A.voiceLangs || []).map((v) => `<button type="button" data-voice="${v}" aria-pressed="${v === (A.voiceFixed?.() ? 'ja' : A.voice())}" ${A.voiceFixed?.() ? 'disabled' : ''}>${NAMES[v] || v}</button>`).join('')}</span>${A.voiceFixed?.() ? `<span class="u2-note">${t('voiceOnly')}</span>` : ''}</div>` : ''}
          <div class="u2-line"><span>${t('subsOn')}</span>${sw(sv !== 'off', 'subs')}</div>
          <div class="u2-line"><span>${t('size')}</span><span class="u2-seg" role="group">${['s', 'm', 'l'].map((s) => `<button type="button" data-size="${s}" aria-pressed="${sv === s}" ${sv === 'off' ? 'disabled' : ''}>${s.toUpperCase()}</button>`).join('')}</span></div>
          <div class="u2-line u2-vol-line"><span>${t('volume')}</span>${range('vol', A.volume?.() ?? 1)}</div>
          <div class="u2-line"><span>${t('motion')}<small>${t('motionHint')}</small></span>${sw(A.reduced?.(), 'motion')}</div>
          <div class="u2-line"><span>${t('hide')}<small>${t('hideHint')}</small></span>${sw(A.autohide?.(), 'hide')}</div>
          <div class="u2-line"><span>${t('device')}<small class="u2-devst">${d.serial === false ? t('noSerial') : `<i class="u2-dot ${d.connected ? 'ok' : ''}"></i>${t({ connected: 'connected', reconnecting: 'reconnecting', connecting: 'reconnecting', lost: 'lost', error: 'devError' }[d.state] || 'notConn')}${d.connected && d.name ? ' · ' + esc(d.name) : ''}`}</small></span>
            ${d.serial === false ? '' : `<button type="button" class="u2-btn2" data-k="connect">${t(d.connected ? 'disconnect' : 'connect')}</button>`}</div>
          <div class="u2-line"><span>${t('lr')}</span><button type="button" class="u2-btn2" data-k="lr">${t('run')}</button></div>
          <div class="u2-line"><span>${t('thermo')}</span><button type="button" class="u2-btn2" data-k="thermo" ${d.connected ? '' : 'disabled'}>${t('run')}</button></div>
          ${A.creditsUrl ? `<div class="u2-line"><span>${t('credits')}</span><a class="u2-btn2" href="${esc(A.creditsUrl)}" target="_blank" rel="noopener">↗</a></div>` : ''}`;
      }
      if (k === 'opt') { const o = [...(A.options?.() || []), ...selectors()].find((x) => x.key === optKey); if (!o) return;
        pops.opt.innerHTML = `<h3>${esc(pickL(o.label))}</h3><div class="u2-chips u2-wrap">${o.items.map((it) =>
          `<button type="button" class="u2-chipb" data-opt="${esc(o.key)}" data-v="${esc(it.v)}" aria-pressed="${!!it.on}">${esc(pickL(it.label))}</button>`).join('')}</div>`; }
    };
    const onInput = (e) => { const r = e.target.closest('.u2-range'); if (!r) return; const v = r.value / 100; r.style.setProperty('--v', `${r.value}%`);
      const val = r.parentElement.querySelector('.u2-val');
      if (r.dataset.k === 'vol') { A.setVolume?.(v); if (val) val.textContent = r.value; }
      if (r.dataset.k === 'int') { A.setIntensity?.(v); if (val) val.textContent = `${r.value}%`; }
      paint(); };
    const onClick = (e) => {
      const b = e.target.closest('button'); if (!b || b.disabled || b.closest('.u2-track')) return;
      const k = b.dataset.k;
      if (b.classList.contains('u2-sw')) { const on = b.getAttribute('aria-checked') !== 'true';
        if (k === 'heat') A.setHeat?.(on); if (k === 'subs') A.setSubs?.(on ? 'm' : 'off'); if (k === 'motion') A.setReduced?.(on); if (k === 'hide') A.setAutohide?.(on); if (k === 'side') A.setSide?.(on);
        const owner = Object.keys(pops).find((p) => pops[p].contains(b)); renderPop(owner); paint(); return; }
      if (b.dataset.lang) { A.setLang?.(b.dataset.lang); renderPop('set'); paint(); return; }
      if (b.dataset.voice) { A.setVoice?.(b.dataset.voice); renderPop('set'); return; }
      if (b.dataset.size) { A.setSubs?.(b.dataset.size); renderPop('set'); return; }
      if (k === 'connect') { A.connect?.(); return; }
      if (k === 'lr') { A.lrCheck?.(); return; }
      if (k === 'thermo') { A.thermoCheck?.(); return; }
      if (b.dataset.mode) { A.setMode?.(b.dataset.mode); paint(); return; }
      if (b.dataset.opt) { if (b.dataset.opt === '__subs') A.setLang?.(b.dataset.v); else if (b.dataset.opt === '__voice') A.setVoice?.(b.dataset.v); else A.pick?.(b.dataset.opt, b.dataset.v); close(); paint(); return; }
      if (b.dataset.pick) return open('opt', b);
      if (b.classList.contains('u2-start')) { A.start?.(); paint(); return; }
      if (b.classList.contains('u2-pp')) { if (['cover', 'ended', 'loading'].includes(A.state?.())) A.start?.(); else A.togglePause?.(); paint(); return; }
      if (b.classList.contains('u2-paused')) { A.togglePause?.(); paint(); return; }
      if (b.classList.contains('u2-opt-vol')) return open('vol');
      if (b.classList.contains('u2-heat')) return open('heat');
      if (b.classList.contains('u2-gear')) return open('set');
      if (b.classList.contains('u2-fs')) { A.toggleFullscreen?.(); paint(); return; }
      if (b.classList.contains('u2-mode-t')) { A.setMode?.((A.mode?.() || 'interactive') === 'interactive' ? 'pure' : 'interactive'); paint(); return; }
      if (b.classList.contains('u2-gal')) { A.openEndings?.(); return; }
    };
    for (const el of [root, sheet, under]) { el.addEventListener('input', onInput); el.addEventListener('click', onClick); }

    // ------------------------------------------------ the chapter track: ONE control (a slider of chapters; 44 px tall, whole width), so even
    // tiny segments on a phone are reachable — a tap goes to the chapter under the finger, ← / → step when it has focus
    const track = $('.u2-track');
    const segAt = (x) => { const kids = [...track.children]; let best = -1, d = Infinity; kids.forEach((k, i) => { const r = k.getBoundingClientRect(), c = (r.left + r.right) / 2; if (Math.abs(x - c) < d) { d = Math.abs(x - c); best = i; } }); return best; };
    const go = (i) => { const k = track.children[i]; if (k && !k.classList.contains('lock')) { A.seek?.(i); paint(); } };
    track.addEventListener('click', (e) => go(segAt(e.clientX)));
    track.addEventListener('keydown', (e) => { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault(); e.stopPropagation(); go((A.chapter?.() ?? 0) + (e.key === 'ArrowRight' ? 1 : -1)); });

    // ------------------------------------------------ auto-hide (opt-in)
    let idleT = 0; const wake = () => { root.classList.remove('u2-idle'); clearTimeout(idleT); idleT = setTimeout(() => root.classList.add('u2-idle'), 3000); };
    ['pointermove', 'pointerdown', 'keydown'].forEach((ev) => { stage.addEventListener(ev, wake, { passive: true }); under.addEventListener(ev, wake, { passive: true }); });

    // ------------------------------------------------ paint: everything from the adapter's state
    let sig = '';
    // paint runs every tick: rewriting a button's content between press and release loses the click (a press on the old <span>, the release on a new one), so only real changes are written
    const H = (el) => ({ set innerHTML(v) { if (el.__h !== v) { el.__h = v; el.innerHTML = v; } } });
    const paint = () => {
      const st = A.state?.() || 'cover', L = lang(); root.dataset.state = st; root.lang = L;
      root.classList.toggle('u2-autohide', !!A.autohide?.()); under.classList.toggle('u2-autohide', !!A.autohide?.()); under.dataset.state = st;
      showPic();
      // cover controls
      const ld = A.loaded?.() ?? 1, ready = A.ready?.() ?? ld >= 1, s = $('.u2-start');
      s.disabled = !ready;
      H(s).innerHTML = st === 'ended' && !A.picked?.() ? `${I.again}<span>${t('again')}</span>` : ready ? `${I.play}<span>${t('start')}</span>` : `${I.play}<span>${t('start')}</span><span class="u2-ld">${Math.round(ld * 100)}%</span>`;
      $('.u2-load').style.setProperty('--p', `${Math.round(ld * 100)}%`);
      const m = A.mode?.() || 'interactive';
      const modeHtml = `<button type="button" data-mode="interactive" aria-pressed="${m === 'interactive'}" title="${esc(t('interHint'))}">${I.hand}<span>${t('inter')}</span></button>`
        + `<button type="button" data-mode="pure" aria-pressed="${m === 'pure'}" title="${esc(t('pureHint'))}">${I.ear}<span>${t('pure')}</span></button>`;
      H($('.u2-mode-c')).innerHTML = modeHtml; H($('.u2-mode-b')).innerHTML = modeHtml;
      const mt = $('.u2-mode-t'); H(mt).innerHTML = m === 'interactive' ? I.hand : I.ear; mt.title = mt.ariaLabel = `${t(m === 'interactive' ? 'inter' : 'pure')} — ${t(m === 'interactive' ? 'interHint' : 'pureHint')}`;
      // option groups (cover.json "options"): one picker chip each — "label  current ▾" — that opens the list above it
      const opts = A.options?.() || [];
      const picks = opts.map((o) => { const cur = o.items.find((it) => it.on) || o.items[0];
        return `<button type="button" class="u2-chipb u2-pick" data-pick="${esc(o.key)}" aria-haspopup="true"><small>${esc(pickL(o.label))}</small><span>${esc(pickL(cur.label))}</span>${I.chev}</button>`; }).join('');
      H($('.u2-row-opt')).innerHTML = picks; H($('.u2-picks-c')).innerHTML = picks;
      H($('.u2-row-lang')).innerHTML = selectors().map((o) => { const fixed = o.key === '__voice' && A.voiceFixed?.(), cur = o.items.find((it) => it.on) || o.items[0];
        return `<button type="button" class="u2-chipb u2-pick" data-pick="${esc(o.key)}" aria-haspopup="true" ${fixed ? `disabled title="${esc(t('voiceOnly'))}"` : ''}><small>${esc(pickL(o.label))}</small><span>${esc(fixed ? t('jaOnly') : pickL(cur.label))}</span>${fixed ? '' : I.chev}</button>`; }).join('');
      const clr = $('.u2-clear'), ct = st === 'ended' ? A.cleared?.() : ''; clr.hidden = !ct; if (ct) clr.textContent = ct;   // e.g. "🎉 Cleared in 1:40" (the demo's own #cleared)
      const en = A.endings?.();
      root.querySelectorAll('.u2-gal').forEach((gal) => { gal.hidden = !(en && en.total > 1 && st === 'ended');
        if (!gal.hidden) { H(gal).innerHTML = `${I.star}<span>${t('endings')}</span> ${en.got} / ${en.total}`; gal.title = t('endings'); } });
      // bar
      const playing = st === 'playing';
      const pp = $('.u2-pp'); H(pp).innerHTML = playing ? I.pause : st === 'ended' && !A.picked?.() ? I.again : I.play; pp.title = pp.ariaLabel = t(playing ? 'pause' : 'play');
      $('.u2-paused').title = t('resume');
      const cs = A.chapters?.() || [], c = A.chapter?.() ?? -1, reached = A.reached?.() ?? c, inter = m === 'interactive', live = st === 'playing' || st === 'paused';
      const key = `${cs.length}|${L}`;
      if (key !== sig) { sig = key; track.innerHTML = cs.map((ch, i) => `<span class="u2-seg-c" data-i="${i}"><i></i><span class="u2-tip"></span></span>`).join(''); track.setAttribute('aria-valuemax', cs.length); }
      track.setAttribute('aria-valuenow', Math.max(1, c + 1)); track.setAttribute('aria-label', t('chapter')); track.classList.toggle('lock', !live);
      [...track.children].forEach((b, i) => {
        const lock = !live || (inter && i > reached);
        b.classList.toggle('lock', lock); b.classList.toggle('done', live && i < c); b.classList.toggle('now', live && i === c);
        b.querySelector('i').style.setProperty('--p', live && i === c ? `${Math.round((A.progress?.() ?? 0) * 100)}%` : '0%');
        const lab = `${NUM[i] || i + 1} ${pickL(cs[i].label)}`; b.querySelector('.u2-tip').textContent = lock && live ? `${lab} · ${t('locked')}` : lab; b.ariaLabel = lab;
      });
      H($('.u2-now')).innerHTML = live && c >= 0 && cs[c] ? `<b>${NUM[c] || c + 1}</b>${esc(pickL(cs[c].label))}` : '';
      const vol = A.volume?.() ?? 1, vb = $('.u2-opt-vol'); H(vb).innerHTML = vol > 0 ? I.vol : I.mute; vb.title = vb.ariaLabel = t('volume');
      const hb = $('.u2-heat'); hb.classList.toggle('off', !(A.heat?.() ?? true)); hb.title = hb.ariaLabel = t('thermal');
      $('.u2-gear').title = $('.u2-gear').ariaLabel = t('settings');
      const fs = A.fullscreen?.(), fb = $('.u2-fs'); H(fb).innerHTML = fs ? I.exitFull : I.full; fb.title = fb.ariaLabel = t(fs ? 'exitFull' : 'full');
    };
    addEventListener('resize', () => { showPic(); });
    paint();
    const refresh = () => { if (!pops.set.hidden) renderPop('set'); paint(); };
    return { root, under, paint, open, close, refresh, T };
  }
  window.MoHeatUI2 = { mount, T, I, NAMES };
})();
