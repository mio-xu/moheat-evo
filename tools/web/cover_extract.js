#!/usr/bin/env node
// One-time migration for the UI v2 cover standard (DEMO_DESIGN_GUIDE §7.3, user 2026-11-08 "one cover format, never drawn per demo"):
// pulls each demo's CURRENT cover apart into the two inputs of the shared cover renderer (tools/web/covers.py):
//   <out>/<dir>.art.png    the cover picture alone at 1920×1080 (?cover=1): the demo's own drawing / hero images, with the copy, language
//                          row, HUD, subtitles, glows AND the shade hidden (the template adds the standard shade)
//   <out>/<dir>.json       the cover texts as shown in each language (?sub=en / ja / zh): kicker / series, h1, tagline, chips, option rows
// Own http.server + own headless Chrome (never a tab someone is looking at).
//   node tools/web/cover_extract.js <out dir> <demo folder>…
const { spawn } = require('child_process');
const path = require('path'), fs = require('fs'), net = require('net'), os = require('os');
const ROOT = path.resolve(__dirname, '..', '..');
const [OUT, ...DEMOS] = process.argv.slice(2);
if (!OUT || !DEMOS.length) { console.error('usage: node tools/web/cover_extract.js <out dir> <demo folder>…'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const HIDE = `.intro .cover-copy, .intro .msub-row, .msub-hud, .hud-top, .ix-hud, .stage .subs, .stage #subs, .glow, .dn-rights, .intro > .cover-shade,
  .sh-veil, .sh-heat, .sh-bar, .sh-pause, .vv, .stage .hud-goal, .stage #toast, .stage .toast, .ix-chip, .stage .choices, .stage .act, .mgs-hint { visibility: hidden !important; }
  .sh-veil { display: none !important; }`;
const TEXTS = `(() => {
  const intro = document.getElementById('intro') || document.querySelector('.intro'); if (!intro) return { err: 'no intro' };
  const T = (s) => { const e = intro.querySelector(s); return e ? e.innerText.replace(/\\s+/g, ' ').trim() : null; };
  const chips = [...intro.querySelectorAll('.cast .chip')].map((c) => ({ k: [...c.classList].filter((x) => x !== 'chip').join(' '), t: c.innerText.replace(/\\s+/g, ' ').trim() }));
  const rows = [...intro.querySelectorAll('.pick, .talk-pick, .tp-row')].map((r) => ({ cls: r.className, id: r.id || null, hidden: r.hidden || r.closest('[hidden]') != null,
    label: (r.querySelector('small') || {}).innerText || null, opts: [...r.querySelectorAll('button')].map((b) => ({ t: b.innerText.replace(/\\s+/g, ' ').trim(), on: b.getAttribute('aria-pressed') === 'true' || b.classList.contains('on'), data: { ...b.dataset } })) }));
  return { kicker: T('.kicker'), series: T('.series'), h1: T('h1'), tagline: T('p.en'), chips, rows, start: T('#startBtn'), hint: T('.hint'), credits: T('#credits'),
    tone: getComputedStyle(document.documentElement).getPropertyValue('--cover-tone').trim() || null, placed: (window.MoHeatCover && window.MoHeatCover.placed) || null, lang: (window.MoHeatSub || {}).lang };
})()`;

(async () => {
  const hp = await freePort(), dp = await freePort();
  const http = spawn('python3', ['-m', 'http.server', String(hp), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'coverx-'));
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${dp}`, `--user-data-dir=${prof}`, '--hide-scrollbars', '--mute-audio',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--window-size=1920,1080', 'about:blank'], { stdio: 'ignore' });
  const done = (code = 0) => { try { chrome.kill(); } catch {} try { http.kill(); } catch {} try { fs.rmSync(prof, { recursive: true, force: true }); } catch {} process.exit(code); };
  setTimeout(() => { console.error('timeout'); done(1); }, (120 + DEMOS.length * 90) * 1000);
  let ws;
  for (let i = 0; i < 80 && !ws; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${dp}/json/list`)).json(); const pg = l.find((x) => x.type === 'page'); if (pg) ws = pg.webSocketDebuggerUrl; } catch {} }
  if (!ws) { console.error('Chrome did not start'); return done(1); }
  const sock = new WebSocket(ws); await new Promise((r) => sock.addEventListener('open', r));
  let id = 0; const wait = {};
  sock.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && wait[m.id]) { wait[m.id](m); delete wait[m.id]; } });
  const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; wait[i] = r; sock.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => { const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result?.result?.value; };
  const base = `http://127.0.0.1:${hp}`;
  await cdp('Page.enable'); await cdp('Runtime.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.navigate', { url: `${base}/tools/web/cover_extract.js` }); await sleep(300);
  await ev(`(localStorage.setItem('moheat.guide', 'done'), 1)`);
  const load = async (url) => {
    await cdp('Page.navigate', { url });
    for (let i = 0; i < 60; i++) { await sleep(250); if (await ev('document.readyState') === 'complete') break; }
    await ev('document.fonts.ready.then(() => 1)'); await sleep(2600);
  };
  for (const d of DEMOS) {
    const rel = path.relative(ROOT, path.resolve(d)).split(path.sep).join('/'), dir = rel.split('/').pop(), R = { rel, texts: {} };
    try {
      for (const l of ['en', 'ja', 'zh']) {
        await ev(`(localStorage.setItem('moheat.sublang', ${JSON.stringify(l)}), 1)`);
        await load(`${base}/${rel}/?cover=1&sub=${l}`);
        R.texts[l] = await ev(TEXTS);
        if (l === 'en') {
          await ev(`(() => { const s = document.createElement('style'); s.textContent = ${JSON.stringify(HIDE)}; document.head.appendChild(s); return 1; })()`);
          await sleep(300);
          const r = await cdp('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, `${dir}.art.png`), Buffer.from(r.result.data, 'base64'));
        }
      }
    } catch (e) { R.err = String(e); }
    fs.writeFileSync(path.join(OUT, `${dir}.json`), JSON.stringify(R, null, 1));
    console.log(dir, R.err || 'ok');
  }
  done();
})();
