#!/usr/bin/env node
// Browser half of tools/web/check_cover.py (DEMO_DESIGN_GUIDE §7.3 "封面构图标准"). Prints ONE JSON object on stdout.
//
//   node tools/web/cover_shots.js <out dir> <demo folder>…      (demo folder = demos/<cat>/<dir>)
//
// Own python http.server + own headless Chrome (never a tab someone is looking at, §11.1). For every demo it writes
//   <out>/<dir>.export.png   ?cover=1&sub=en at 1920×1080 (what media/cover.jpg and the thumbnails are made from)
//   <out>/<dir>.art.png      the same frame with the cover copy, language row and HUD hidden (the art the measurer segments)
//   <out>/<dir>.desk.png     the full page at 1440×900 (?sub=en), cover showing
//   <out>/<dir>.phone.png    the full page at 390×844 (touch, no Web Serial), cover showing
// and measures the DOM of each view: the stage, h1 (rect + font size), the copy block, Start, the language buttons (all relative
// to the stage, in % of its width / height), so check_cover.py can compare it with the standard.
const { spawn } = require('child_process');
const path = require('path'), fs = require('fs'), net = require('net'), os = require('os');
const ROOT = path.resolve(__dirname, '..', '..');
const [OUT, ...DEMOS] = process.argv.slice(2);
if (!OUT || !DEMOS.length) { console.error('usage: node tools/web/cover_shots.js <out dir> <demo folder>…'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const out = { demos: {}, errors: [] };
const HIDE = '.intro .cover-copy, .intro .msub-row, .msub-hud, .hud-top, .ix-hud, .stage .subs, .stage #subs, .glow, .dn-rights { visibility: hidden !important; }';
const MEASURE = `(() => {
  const st = document.querySelector('.stage-col .stage') || document.querySelector('.stage'); if (!st) return { err: 'no .stage' };
  const S = st.getBoundingClientRect(), vis = (e) => e && e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden' && e.getBoundingClientRect().width > 0;
  const R = (e) => { if (!vis(e)) return null; const r = e.getBoundingClientRect();
    return { x: +((r.left - S.left) / S.width * 100).toFixed(1), y: +((r.top - S.top) / S.height * 100).toFixed(1), w: +(r.width / S.width * 100).toFixed(1), h: +(r.height / S.height * 100).toFixed(1), px: Math.round(r.height) }; };
  const intro = document.getElementById('intro') || document.querySelector('.intro'), h1 = intro && intro.querySelector('h1');
  const copy = intro && intro.querySelector('.cover-copy'), start = document.getElementById('startBtn') || (intro && intro.querySelector('.btn.primary'));
  const langs = [...document.querySelectorAll('.intro .msub-lang')].filter(vis);
  const heroes = [...document.querySelectorAll('.intro .hero')].filter(vis).map(R);
  return { stage: { w: Math.round(S.width), h: Math.round(S.height), x: Math.round(S.left), y: Math.round(S.top) }, scrollY: document.documentElement.scrollHeight - innerHeight,
    introShown: vis(intro), h1: R(h1), h1Font: h1 ? +(parseFloat(getComputedStyle(h1).fontSize) / S.width * 100).toFixed(2) : null, h1Px: h1 ? parseFloat(getComputedStyle(h1).fontSize) : null,
    h1Align: h1 ? getComputedStyle(h1).textAlign : null, copy: R(copy), start: R(start), langs: langs.map(R), langOn: (langs.find((b) => b.classList.contains('on')) || {}).dataset?.l || null,
    kicker: R(intro && intro.querySelector('.kicker')), en: R(intro && intro.querySelector('.en')), chips: [...(intro ? intro.querySelectorAll('.cast .chip') : [])].filter(vis).length,
    heroes, std: !!document.querySelector('.intro.cv-std'), placed: (window.MoHeatCover && window.MoHeatCover.placed) || null,
    hud: [...document.querySelectorAll('.stage .msub-hud, .stage .hud-top')].filter(vis).map(R) };
})()`;

(async () => {
  const hp = await freePort(), dp = await freePort();
  const http = spawn('python3', ['-m', 'http.server', String(hp), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'covershots-'));
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${dp}`, `--user-data-dir=${prof}`, '--hide-scrollbars', '--mute-audio',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--window-size=1920,1080', 'about:blank'], { stdio: 'ignore' });
  const done = (code = 0) => { try { chrome.kill(); } catch {} try { http.kill(); } catch {} try { fs.rmSync(prof, { recursive: true, force: true }); } catch {}
    process.stdout.write(JSON.stringify(out) + '\n'); process.exit(code); };
  setTimeout(() => { out.errors.push('timeout'); done(); }, (120 + DEMOS.length * 120) * 1000);
  let ws;
  for (let i = 0; i < 80 && !ws; i++) {
    await sleep(250);
    try { const l = await (await fetch(`http://127.0.0.1:${dp}/json/list`)).json(); const pg = l.find((x) => x.type === 'page'); if (pg) ws = pg.webSocketDebuggerUrl; } catch {}
  }
  if (!ws) { out.errors.push('Chrome did not start'); return done(1); }
  const sock = new WebSocket(ws); await new Promise((r) => sock.addEventListener('open', r));
  let id = 0; const wait = {};
  sock.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && wait[m.id]) { wait[m.id](m); delete wait[m.id]; } });
  const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; wait[i] = r; sock.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => { const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result?.result?.value; };
  const base = `http://127.0.0.1:${hp}`;
  await cdp('Page.enable'); await cdp('Runtime.enable');
  await cdp('Page.navigate', { url: `${base}/tools/web/cover_shots.js` }); await sleep(300);
  await ev(`(localStorage.setItem('moheat.guide', 'done'), localStorage.setItem('moheat.sublang', 'en'), 1)`);
  const size = async (w, h, phone) => {
    await cdp('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: !!phone });
    await cdp('Emulation.setTouchEmulationEnabled', { enabled: !!phone, maxTouchPoints: phone ? 5 : 0 });
  };
  const shot = async (file) => { const r = await cdp('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(file, Buffer.from(r.result.data, 'base64')); };
  const load = async (url, phone) => {
    // phones have no Web Serial: hide it before the page runs, as on a real phone (nav.js → html.no-serial)
    if (phone) await cdp('Page.addScriptToEvaluateOnNewDocument', { source: 'try { delete Navigator.prototype.serial } catch (e) {}' }).then((r) => (load.sid = r.result?.identifier));
    await cdp('Page.navigate', { url });
    for (let i = 0; i < 60; i++) { await sleep(250); if (await ev('document.readyState') === 'complete') break; }
    await ev('document.fonts.ready.then(() => 1)'); await sleep(2600);
    if (load.sid) { await cdp('Page.removeScriptToEvaluateOnNewDocument', { identifier: load.sid }); load.sid = null; }
  };
  for (const d of DEMOS) {
    const rel = path.relative(ROOT, path.resolve(d)).split(path.sep).join('/'), dir = rel.split('/').pop(), R = (out.demos[dir] = { rel });
    try {
      await size(1920, 1080); await load(`${base}/${rel}/?cover=1&sub=en`);
      R.export = await ev(MEASURE); await shot(path.join(OUT, `${dir}.export.png`));
      await ev(`(() => { const s = document.createElement('style'); s.id = 'cvhide'; s.textContent = ${JSON.stringify(HIDE)}; document.head.appendChild(s); return 1; })()`);
      await sleep(250); await shot(path.join(OUT, `${dir}.art.png`));
      await size(1440, 900); await load(`${base}/${rel}/?sub=en`);
      R.desk = await ev(MEASURE); await shot(path.join(OUT, `${dir}.desk.png`));
      await size(390, 844, true); await load(`${base}/${rel}/?sub=en`, true);
      R.phone = await ev(MEASURE); await shot(path.join(OUT, `${dir}.phone.png`));
    } catch (e) { R.err = String(e); }
  }
  done();
})();
