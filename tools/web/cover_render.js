#!/usr/bin/env node
// Browser half of tools/web/covers.py (UI v2 finished covers, DEMO_DESIGN_GUIDE §7.3). Prints ONE JSON object.
//   node tools/web/cover_render.js <out dir> <demo folder>… [--langs en,ja,zh]
// Own http.server + own headless Chrome. For every demo × language it opens tools/web/cover_tpl.html and writes
//   <out>/<dir>.<lang>.wide.png      1280×720 CSS px × 1.5 = 1920×1080
//   <out>/<dir>.<lang>.compact.png   400×225 CSS px × 3 = 1200×675
// and reports window.TPL (does the copy block end above the live controls? h1 size used).
require('../qa/chrome_guard');   // closes its browser on any exit; one browser per agent (MOHEAT_MAX_BROWSERS)
const { spawn } = require('child_process');
const path = require('path'), fs = require('fs'), net = require('net'), os = require('os');
const ROOT = path.resolve(__dirname, '..', '..');
const argv = process.argv.slice(2), li = argv.indexOf('--langs'), LANGS = li >= 0 ? argv.splice(li, 2)[1].split(',') : ['en', 'ja', 'zh'];
const [OUT, ...DEMOS] = argv;
if (!OUT || !DEMOS.length) { console.error('usage: node tools/web/cover_render.js <out dir> <demo folder>… [--langs en,ja,zh]'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const out = { demos: {}, errors: [] };
(async () => {
  const hp = await freePort(), dp = await freePort();
  const http = spawn('python3', ['-m', 'http.server', String(hp), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'coverr-'));
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${dp}`, `--user-data-dir=${prof}`, '--hide-scrollbars', '--font-render-hinting=none', 'about:blank'], { stdio: 'ignore' });
  const done = (code = 0) => { try { chrome.kill(); } catch {} try { http.kill(); } catch {} try { fs.rmSync(prof, { recursive: true, force: true }); } catch {}
    process.stdout.write(JSON.stringify(out) + '\n'); process.exit(code); };
  setTimeout(() => { out.errors.push('timeout'); done(1); }, (120 + DEMOS.length * LANGS.length * 45) * 1000);
  let ws;
  for (let i = 0; i < 80 && !ws; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${dp}/json/list`)).json(); const pg = l.find((x) => x.type === 'page'); if (pg) ws = pg.webSocketDebuggerUrl; } catch {} }
  if (!ws) { out.errors.push('Chrome did not start'); return done(1); }
  const sock = new WebSocket(ws); await new Promise((r) => sock.addEventListener('open', r));
  let id = 0; const wait = {};
  sock.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && wait[m.id]) { wait[m.id](m); delete wait[m.id]; } });
  const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; wait[i] = r; sock.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => { const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result?.result?.value; };
  await cdp('Page.enable'); await cdp('Runtime.enable');
  for (const d of DEMOS) {
    const rel = path.relative(ROOT, path.resolve(d)).split(path.sep).join('/'), dir = rel.split('/').pop(), R = (out.demos[dir] = { rel });
    for (const l of LANGS) for (const [lay, w, h, s] of [['wide', 1280, 720, 1.5], ['compact', 400, 225, 3]]) {
      await cdp('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: s, mobile: false });
      await cdp('Page.navigate', { url: `http://127.0.0.1:${hp}/tools/web/cover_tpl.html?demo=${encodeURIComponent(rel)}&lang=${l}&layout=${lay}` });
      let tpl = null; for (let i = 0; i < 80 && !tpl?.done; i++) { await sleep(150); tpl = await ev('window.TPL || null'); }
      await sleep(150);
      const r = await cdp('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(OUT, `${dir}.${l}.${lay}.png`), Buffer.from(r.result.data, 'base64'));
      R[`${l}.${lay}`] = tpl || { err: 'template did not finish' };
    }
  }
  done();
})();
