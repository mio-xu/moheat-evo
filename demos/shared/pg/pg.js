// PG — a small engine for portrait, touch-first story / raising games (shared by every game in ~/ClaudeWork/Games).
// This file: the frame (shared DOM), helpers, saved data, languages. Other parts: pg.audio.js · pg.fx.js · pg.thermal.js · pg.stage.js · pg.ui.js · pg.rhythm.js (optional).
// A game calls PG.mount({ id, langs, ... }) once, then uses PG.stage / PG.ui / PG.Therm. It writes no engine DOM itself.
// Debug in every game: ?auto (plays itself fast, for tests; &hold=choice|tap stops at that step for a screenshot) · ?lang=zh|ja|en ·
// ?timerframes (animation frames by timer: for headless screenshots of particles / rhythm) · ?portrait (phone layout on a wide screen).
(() => {
  const Q = new URLSearchParams(location.search), AUTO = Q.has('auto');
  if (Q.has('portrait')) document.documentElement.classList.add('portrait');   // keep the phone layout on a wide screen
  if (Q.has('timerframes')) { window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16); window.cancelAnimationFrame = clearTimeout; }   // tests: headless Chrome with virtual time renders almost no animation frames
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, AUTO ? Math.min(ms, 20) : ms));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const cache = new Map();
  /** Image by URL, loaded once. Resolves even when it fails (naturalWidth 0). */
  const ready = new Set();
  const load = (src) => { if (!cache.has(src)) cache.set(src, new Promise((res) => { const im = new Image(); im.onload = im.onerror = () => { ready.add(src); res(im); }; im.src = src; })); return cache.get(src); };
  load.ready = (src) => ready.has(src);   // already in memory: can be shown without a fade

  // Engine texts (settings, tap game). A game may add or replace keys: PG.mount({ text: { ... } }).
  const TEXT = {
    settings: { zh: '设置', ja: '設定', en: 'Settings' }, device: { zh: '冷热耳机 MoHeat Evo', ja: '温冷ヘッドホン MoHeat Evo', en: 'MoHeat Evo thermal headphones' },
    intensity: { zh: '强度', ja: '強さ', en: 'Strength' }, warmOnly: { zh: '只用温热（不制冷）', ja: 'あたたかさだけ（冷やさない）', en: 'Warm only (no cooling)' },
    stop: { zh: '温感全部停止', ja: '温冷をすべて止める', en: 'Stop all warm / cool' }, stopped: { zh: '温感已停止 · 再点一次恢复', ja: '温冷を止めました · もう一度押すと再開', en: 'Warm / cool stopped · press again to resume' }, close: { zh: '关闭', ja: 'とじる', en: 'Close' }, reset: { zh: '删除存档，回到标题', ja: 'セーブを消してタイトルへ', en: 'Delete save, back to title' },
    devNote: { zh: '连接需要电脑版 Chrome / Edge。手机上以画面两侧的颜色显示冷热。', ja: '接続は PC の Chrome / Edge が必要です。スマホでは画面の左右の色で表示します。', en: 'Connecting needs desktop Chrome / Edge. On phones the screen edges show warm and cool.' },
    rotate: { zh: '请竖着拿手机', ja: 'スマホを縦にしてください', en: 'Please hold your phone upright' },
    tap: { zh: '圆环重合时点一下！', ja: '輪がかさなったらタップ！', en: 'Tap when the rings meet!' },
    look: { zh: '界面风格', ja: '画面のスタイル', en: 'Look' }, skin_glass: { zh: '玻璃', ja: 'ガラス', en: 'Glass' }, skin_cream: { zh: '奶油', ja: 'クリーム', en: 'Cream' },
    sound: { zh: '声音', ja: 'サウンド', en: 'Sound' }, volBgm: { zh: '音乐', ja: '音楽', en: 'Music' }, volVoice: { zh: '语音', ja: 'ボイス', en: 'Voice' }, volSfx: { zh: '音效', ja: '効果音', en: 'Effects' },
    delay: { zh: '声音延迟（节奏游戏）', ja: '音のおくれ（リズムゲーム）', en: 'Sound delay (rhythm games)' }, calib: { zh: '点拍子校准', ja: 'タップで調整', en: 'Tap to set' },
    delayNote: { zh: '蓝牙耳机的声音会晚一点。点「点拍子校准」，跟着嘀声点屏幕 12 下。', ja: 'Bluetooth イヤホンは音が少しおくれます。「タップで調整」を押して、ピッという音に合わせて 12 回タップ。', en: 'Bluetooth earbuds play a little late. Press "Tap to set" and tap along with the 12 beeps.' },
    calibGo: { zh: '跟着嘀声点屏幕', ja: '音に合わせてタップ', en: 'Tap along with the beeps' }, calibDone: { zh: '已设为 {n} ms', ja: '{n} ms に設定しました', en: 'Set to {n} ms' }, calibFail: { zh: '点得太少，没有改动', ja: 'タップが足りません（変更なし）', en: 'Too few taps — unchanged' },
    keys: { zh: '节奏键（键盘）', ja: 'リズムのキー（キーボード）', en: 'Rhythm keys (keyboard)' }, keyL: { zh: '左耳', ja: '左耳', en: 'Left ear' }, keyR: { zh: '右耳', ja: '右耳', en: 'Right ear' },
    keysNote: { zh: '点一下按钮，再按想用的键。← → 方向键一直可用。Space / Enter = 继续、确定；数字键 = 选项。', ja: 'ボタンを押してから、使いたいキーを押してください。← → はいつでも使えます。Space / Enter = 次へ・決定、数字キー = 選択肢。', en: 'Click a button, then press the key you want. ← → always work too. Space / Enter = next / confirm; number keys = choices.' },
    bonus: { zh: '奖励时间！', ja: 'ボーナスタイム！', en: 'Bonus time!' },
    perfect: { zh: '完美！', ja: 'パーフェクト！', en: 'Perfect!' }, good: { zh: '不错', ja: 'グッド', en: 'Good' }, miss: { zh: '可惜', ja: 'おしい', en: 'Miss' },
  };
  const LANG_NAMES = { zh: '中文', ja: '日本語', en: 'English', ko: '한국어' };

  // The shared layers, back to front. Game-specific sections stay in the game's own index.html inside #app.
  const FRAME_BACK = `
    <div id="bg"><div class="plate" id="bgA"></div><div class="plate" id="bgB"></div></div><div id="shade"></div>
    <div id="rays"></div>
    <div id="char" hidden><img class="base" alt="" /><img class="eyes" alt="" /><img class="mouth" alt="" /></div>
    <canvas id="fxcv"></canvas>
    <div class="glow" id="glowL"><i class="warm"></i><i class="cool"></i></div><div class="glow" id="glowR"><i class="warm"></i><i class="cool"></i></div>
    <div id="fx"></div>`;
  const FRAME_FRONT = `
    <div id="flash"></div>
    <div id="place"></div><div id="toast"></div>
    <section class="sheet" id="dlg" hidden><b id="dlgName"></b><p id="dlgText"></p><i id="dlgNext">▼</i></section>
    <section class="sheet" id="choices" hidden></section>
    <section id="tapGame" hidden><p id="tapMsg"></p><div id="tapRing"><i id="tapTarget"></i><i id="tapMove"></i><b id="tapWord"></b></div></section>
    <section id="rhythm" hidden><canvas></canvas></section>
    <section id="gear" hidden><div class="panel">
      <h2 data-pg="settings"></h2><div class="langs" data-pg-langs></div>
      <h3 data-pg="look"></h3><div class="langs" data-pg-skins></div>
      <h3 data-pg="sound"></h3>
      <label class="rowl"><span data-pg="volBgm"></span><input type="range" id="vol_bgm" min="0" max="100" step="5" /><i></i></label>
      <label class="rowl"><span data-pg="volVoice"></span><input type="range" id="vol_voice" min="0" max="100" step="5" /><i></i></label>
      <label class="rowl"><span data-pg="volSfx"></span><input type="range" id="vol_sfx" min="0" max="100" step="5" /><i></i></label>
      <h3 data-pg="device"></h3>
      <div class="dev"><select id="portSelect"></select><button type="button" id="addPort">+</button><button type="button" id="connectBtn" disabled>Connect</button></div>
      <p class="status" id="deviceStatus"><span>Not connected</span></p>
      <label class="rowl"><span data-pg="intensity"></span><input type="range" id="intensity" min="0" max="100" step="5" value="100" /><b id="intensityVal">100%</b></label>
      <label class="rowl asmrOnly"><span data-pg="warmOnly"></span><input type="checkbox" id="warmOnly" /></label>
      <p class="fine" data-pg="devNote"></p>
      <h3 data-pg="delay"></h3>
      <label class="rowl"><button type="button" class="mini" id="btnCalib" data-pg="calib"></button><input type="range" id="offset" min="-100" max="400" step="5" value="0" /><b id="offsetVal">0 ms</b></label>
      <p class="fine" data-pg="delayNote"></p>
      <h3 data-pg="keys" class="kbOnly"></h3>
      <div class="keymap kbOnly"><span data-pg="keyL"></span><button type="button" class="mini" id="keyL">F</button><span data-pg="keyR"></span><button type="button" class="mini" id="keyR">J</button></div>
      <p class="fine kbOnly" data-pg="keysNote"></p>
      <button type="button" class="ghost" id="btnReset" data-pg="reset"></button><button type="button" class="go" id="btnClose" data-pg="close"></button>
    </div></section>
    <div id="rotate"><p>↻<br /><span data-pg="rotate"></span></p></div>`;

  const wideMQ = matchMedia('(min-aspect-ratio: 5/4) and (min-height: 280px)');
  const PG = window.PG = { Q, AUTO, HOLD: Q.get('hold'), $, sleep, clamp, load, TEXT, app: null, id: 'pg', langs: ['zh', 'ja', 'en'] };

  // wide = the landscape arrangement is on (desktop browser). PG.unit(W, H) = the base unit --u × 100 in pixels of a canvas of that size:
  // the frame width on a phone, the width of a portrait frame of that height on a wide screen. Canvas drawings size themselves by it.
  Object.defineProperty(PG, 'wide', { get: () => wideMQ.matches && !document.documentElement.classList.contains('portrait') });
  // touch = the main pointer is a finger (phones, tablets): rhythm lanes go to the two sides where the thumbs are; otherwise keys are shown
  Object.defineProperty(PG, 'touch', { get: () => matchMedia('(pointer: coarse)').matches || PG.Q.has('touch') });
  if (!PG.touch) document.documentElement.classList.add('keys');   // a keyboard: key caps on choices and lanes
  // layout numbers from engine/rules.js (one place for every game): --u on wide screens, the landscape frame's aspect range
  const LAYOUT = Object.assign({ uWide: .86, minAspect: 1.7778, maxAspect: 2.2 }, (window.PG_RULES || {}).layout || {}), rootStyle = document.documentElement.style;
  rootStyle.setProperty('--u-wide', `${LAYOUT.uWide}cqh`); rootStyle.setProperty('--aspect-min', LAYOUT.minAspect); rootStyle.setProperty('--aspect-max', LAYOUT.maxAspect);
  PG.unit = (W, H) => (PG.wide ? Math.min(W, H * LAYOUT.uWide) : W);   // phone landscape and desktop share one layout (2026-11-14)
  wideMQ.addEventListener('change', () => dispatchEvent(new CustomEvent('pg:wide', { detail: PG.wide })));

  // ---------------------------------------------------------------- saved data (one namespace per game)
  PG.store = {
    get: (k, d) => { try { return JSON.parse(localStorage.getItem(`${PG.id}.${k}`)) ?? d; } catch { return d; } },
    set: (k, v) => { try { v == null ? localStorage.removeItem(`${PG.id}.${k}`) : localStorage.setItem(`${PG.id}.${k}`, JSON.stringify(v)); } catch {} },
  };

  // ---------------------------------------------------------------- languages: every text is { zh, ja, en }; more languages by table (PG.addL10n). Voices are Japanese only.
  let lang = 'en';
  Object.defineProperty(PG, 'lang', { get: () => lang });
  /** Text in the current language; {name} placeholders filled from vars. */
  const dict = {};   // languages kept outside the text objects: { ko: { 'English text': '한국어' } }
  /** Add (or extend) a language by a table English text → that language (pg.l10n.<lang>.js, each game's game/l10n.<lang>.js). */
  PG.addL10n = (lg, table) => { dict[lg] = Object.assign(dict[lg] || {}, table); };
  PG.T = (o, vars) => { let s = typeof o === 'string' ? o : (o && (o[lang] ?? (dict[lang] && dict[lang][o.en]) ?? o.en)) || ''; for (const [k, v] of Object.entries(vars || {})) s = s.replace(`{${k}}`, v); return s; };
  PG.t = (key, vars) => PG.T(TEXT[key], vars);
  PG.setLang = (k) => { if (!PG.langs.includes(k)) return; lang = k; PG.store.set('lang', k); paint(); dispatchEvent(new CustomEvent('pg:lang', { detail: k })); };
  // the look of panels and buttons: 'glass' (dark frosted glass, light text) or 'cream' (light paper, dark text). Saved; ?skin= in the address wins.
  const SKINS = ['glass', 'cream']; let skin = 'glass';
  PG.setSkin = (k) => { if (!SKINS.includes(k)) return; skin = k; SKINS.forEach((n) => document.documentElement.classList.toggle('skin-' + n, n === k)); PG.store.set('skin', k); paint(); };
  function paint() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-pg-skins]').forEach((box) => { box.innerHTML = ''; for (const k of SKINS) { const b = document.createElement('button'); b.type = 'button'; b.textContent = PG.t('skin_' + k); b.className = k === skin ? 'on' : ''; b.onclick = () => PG.setSkin(k); box.append(b); } });
    document.querySelectorAll('[data-pg]').forEach((el) => { el.textContent = PG.t(el.dataset.pg); });
    document.querySelectorAll('[data-pg-langs]').forEach((box) => { box.innerHTML = ''; for (const k of PG.langs) { const b = document.createElement('button'); b.type = 'button'; b.textContent = LANG_NAMES[k] || k; b.className = k === lang ? 'on' : ''; b.onclick = () => PG.setLang(k); box.append(b); } });
  }

  // sound (effects, music, voice lines): pg.audio.js

  // ---------------------------------------------------------------- a title that must stay on one line: shrinks to fit (any language, any screen)
  const fitted = new Set();
  const refit = (el) => { el.style.whiteSpace = 'nowrap'; el.style.fontSize = ''; const room = el.parentElement.clientWidth, need = el.scrollWidth; if (need > room && room > 0) el.style.fontSize = `${parseFloat(getComputedStyle(el).fontSize) * room / need * .98}px`; };
  /** Keep this element's text on one line by making it smaller when needed. Call again after changing its text; resize and language changes are handled. */
  PG.fit = (el) => { fitted.add(el); refit(el); };
  addEventListener('resize', () => fitted.forEach(refit)); addEventListener('pg:lang', () => setTimeout(() => fitted.forEach(refit), 0));

  /** Build the frame inside <main id="app">. o: { id (save namespace), langs, text (extra engine texts), onReset() } */
  PG.mount = (o = {}) => {
    const app = PG.app = $('app'); PG.id = o.id || 'pg'; if (o.langs) PG.langs = o.langs; Object.assign(TEXT, o.text || {});
    app.insertAdjacentHTML('afterbegin', FRAME_BACK); if (!o.stage) app.insertAdjacentHTML('beforeend', FRAME_FRONT);   // stage: true = the picture layers only (a site page whose UI v2 shell owns the bar, ⚙ and the device ids)
    const n = (navigator.language || 'en').toLowerCase(), guess = PG.langs.find((k) => n.startsWith(k)) || 'en';
    lang = PG.langs.includes(Q.get('lang')) ? Q.get('lang') : PG.store.get('lang', null) || guess;
    // iPhones ignore touch-action for the page bounce and pinch: stop the page itself from moving (the settings panel may still scroll)
    const still = (e) => { if (!e.target.closest || !e.target.closest('.panel')) e.preventDefault(); };
    document.addEventListener('touchmove', still, { passive: false }); document.addEventListener('gesturestart', (e) => e.preventDefault()); document.addEventListener('dblclick', (e) => e.preventDefault());
    app.addEventListener('contextmenu', (e) => { if (!e.target.closest('input, select')) e.preventDefault(); });   // long press / right click: no browser menu over the game
    if (!o.stage) {
      $('btnClose').onclick = () => { $('gear').hidden = true; };
      $('gear').addEventListener('pointerdown', (e) => { if (e.target === $('gear')) $('gear').hidden = true; });
      $('btnReset').onclick = () => { $('gear').hidden = true; o.onReset && o.onReset(); };
    }
    PG.openSettings = () => { if ($('gear')) $('gear').hidden = false; };
    // the safety genres (rules.thermal.safety, e.g. asmr-love): warm-only setting in ⚙ + a ■ STOP button always on screen (#btnStop in the game page)
    const TR = (window.PG_RULES || {}).thermal || {}; app.classList.toggle('asmr', !!TR.safety);
    if ($('warmOnly')) { TR.warmOnly = !!PG.store.get('warmOnly', TR.warmOnly || false); $('warmOnly').checked = TR.warmOnly; $('warmOnly').onchange = (e) => { TR.warmOnly = e.target.checked; PG.store.set('warmOnly', TR.warmOnly); }; }
    if ($('btnStop')) { $('btnStop').hidden = !TR.safety; $('btnStop').onclick = () => { PG.Therm.halt(!PG.Therm.halted); $('btnStop').classList.toggle('on', PG.Therm.halted); if (PG.Therm.halted) PG.ui.toast(PG.t('stopped'), 2400); }; }
    skin = SKINS.includes(Q.get('skin')) ? Q.get('skin') : PG.store.get('skin', null) || o.skin || 'glass'; SKINS.forEach((n) => document.documentElement.classList.toggle('skin-' + n, n === skin));
    PG.stageOnly = !!o.stage; PG.audioInit(); PG.fx.init(); PG.Therm.init(); PG.stage.init(); PG.ui.init(); if (PG.rhythm && $('rhythm')) PG.rhythm.init();
    paint(); dispatchEvent(new CustomEvent('pg:lang', { detail: lang }));
  };
})();
