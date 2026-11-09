#!/usr/bin/env node
// Language flash check (user 2026-11-08: "every time I switch demos, the cover first shows Japanese, then the chosen language").
// check_demo.py row G6 l10n-flash. Prints ONE JSON object on stdout.
//
//   node tools/qa/l10n_flash.js <demo folder> [<demo folder> …] [--langs en,zh] [--sizes 1440x900,390x844] [--secs 4]
//
// Own python http.server + own headless Chrome (never a tab someone is looking at). Per language × size: the language is put in
// localStorage + sessionStorage ('moheat.sublang', what shared/subs.js remembers across demos and visits), then every demo given is opened one after the
// other in the SAME tab (= switching demos with ‹ › / the menu). A script injected before any page script samples, in every
// requestAnimationFrame from document start (= what each painted frame shows), the visible text with Japanese in it
// (en: kana or kanji, zh: kana). A FLASH = such a text visible in an early frame that is gone from the settled page (it was
// replaced by the translation after it had been painted). Japanese that stays on screen is not a flash (l10n row / translators).
require('./chrome_guard');   // closes its browser on any exit; one browser per agent (MOHEAT_MAX_BROWSERS)
const { spawn } = require('child_process');
const path = require('path'), fs = require('fs'), net = require('net'), os = require('os');

const ROOT = path.resolve(__dirname, '..', '..');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const DEMOS = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--'))).map((d) => path.relative(ROOT, path.resolve(d)).replace(/\\/g, '/'));
const LANGS = opt('--langs', 'en,zh').split(',');
const SIZES = opt('--sizes', '1440x900,390x844').split(',').map((s) => s.split('x').map(Number));
const SECS = Number(opt('--secs', 4));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const out = { demos: DEMOS, runs: [], flashes: 0, errors: [] };

// injected into every document before its own scripts
const SAMPLER = `(() => {
  if (window.top !== window) return;
  const lang = (() => { const q = new URLSearchParams(location.search).get('sub'); if (q) return q;
    try { return localStorage.getItem('moheat.sublang') || sessionStorage.getItem('moheat.sublang') || 'en'; } catch { return 'en'; } })();
  if (lang === 'ja' || lang === 'off') return;
  const JA = lang === 'en' ? /[\\u3040-\\u30ff\\u3400-\\u9fff]/ : /[\\u3040-\\u30ff]/;
  const L = window.__l10nFlash = { lang, frames: 0, seen: {}, t0: performance.now() };
  const skip = '.msub-row, .msub-lang, [data-l], script, style, noscript, template, title, option';   // the language picker names every language
  function sample() {
    if (!document.body) return;
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) {
      const t = n.data.replace(/\\s+/g, ' ').trim(); if (!t || !JA.test(t)) continue;
      const el = n.parentElement; if (!el || el.closest(skip)) continue;
      if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
      const k = t.slice(0, 60); if (!(k in L.seen)) L.seen[k] = Math.round(performance.now() - L.t0);
    }
    L.frames++;
  }
  const loop = () => { sample(); if (performance.now() - L.t0 < ${SECS * 1000}) requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  L.now = () => { const keep = L.seen; L.seen = {}; sample(); const settled = L.seen; L.seen = keep; return settled; };
})();`;

(async () => {
  if (!DEMOS.length) { out.errors.push('usage: l10n_flash.js <demo folder> [...]'); console.log(JSON.stringify(out)); process.exit(2); }
  const hp = await freePort(), dp = await freePort();
  const http = spawn('python3', [require('path').join(__dirname, 'serve.py'), String(hp), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'l10nflash-'));
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${dp}`, `--user-data-dir=${prof}`, '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    '--window-size=1440,900', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
  const done = (code = 0) => { try { chrome.kill(); } catch {} try { http.kill(); } catch {} try { fs.rmSync(prof, { recursive: true, force: true }); } catch {}
    process.stdout.write(JSON.stringify(out) + '\n'); process.exit(code); };
  setTimeout(() => { out.errors.push('timeout'); done(); }, (60 + LANGS.length * SIZES.length * DEMOS.length * (SECS + 8)) * 1000);
  let ws;
  for (let i = 0; i < 160 && !ws; i++) {
    await sleep(250);
    try { const l = await (await fetch(`http://127.0.0.1:${dp}/json/list`)).json(); const pg = l.find((x) => x.type === 'page'); if (pg) ws = pg.webSocketDebuggerUrl; } catch {}
  }
  if (!ws) { out.errors.push('Chrome did not start'); return done(); }
  const sock = new WebSocket(ws); await new Promise((r) => sock.addEventListener('open', r));
  let id = 0; const wait = {};
  sock.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && wait[m.id]) { wait[m.id](m); delete wait[m.id]; } });
  const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; wait[i] = r; sock.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => { const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result?.result?.value; };
  const base = `http://127.0.0.1:${hp}`;
  await cdp('Page.enable'); await cdp('Runtime.enable');
  await cdp('Network.setCacheDisabled', { cacheDisabled: false });
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: SAMPLER });
  for (const lang of LANGS) for (const [w, h] of SIZES) {
    const mobile = w < 900;
    await cdp('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile });
    await cdp('Emulation.setTouchEmulationEnabled', { enabled: mobile });
    await cdp('Page.navigate', { url: `${base}/tools/qa/l10n_flash.js` }); await sleep(300);
    await ev(`(localStorage.setItem('moheat.sublang', ${JSON.stringify(lang)}), sessionStorage.setItem('moheat.sublang', ${JSON.stringify(lang)}), localStorage.setItem('moheat.guide', 'done'), 1)`);
    for (const [k, demo] of DEMOS.entries()) {
      const run = { lang, size: `${w}x${h}`, demo, switched: k > 0, frames: 0, flash: [], firstText: null };
      await cdp('Page.navigate', { url: `${base}/${demo}/` });
      await sleep(SECS * 1000 + 400);
      const r = await ev(`(() => { const L = window.__l10nFlash; if (!L) return null; return { frames: L.frames, seen: L.seen, now: L.now() }; })()`);
      if (!r) { run.error = 'sampler did not run'; out.runs.push(run); continue; }
      run.frames = r.frames;
      for (const [t, at] of Object.entries(r.seen)) if (!(t in r.now)) run.flash.push({ text: t, ms: at });
      run.flash.sort((a, b) => a.ms - b.ms); run.flash = run.flash.slice(0, 8);
      out.flashes += run.flash.length; out.runs.push(run);
    }
  }
  done();
})();
