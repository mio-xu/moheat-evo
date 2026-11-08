// Tiny headless-Chrome driver for the promo capture (raw CDP over the built-in WebSocket, no puppeteer).
// One browser only (user / coordinator rule): launch() starts a private headless Chrome on a free port with its own profile.
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path'), net = require('net');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });

async function launch({ width = 1920, height = 1080, dpr = 2, onEvent } = {}) {
  const dp = await freePort(), prof = fs.mkdtempSync(path.join(os.tmpdir(), 'promo23-'));
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${dp}`, `--user-data-dir=${prof}`, '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--mute-audio',
    '--hide-scrollbars', '--force-color-profile=srgb', `--window-size=${width},${height}`, 'about:blank'], { stdio: 'ignore' });
  let ws;
  for (let i = 0; i < 80 && !ws; i++) {
    await sleep(250);
    try { const l = await (await fetch(`http://127.0.0.1:${dp}/json/list`)).json(); const pg = l.find((x) => x.type === 'page'); if (pg) ws = pg.webSocketDebuggerUrl; } catch {}
  }
  if (!ws) throw new Error('Chrome did not start');
  const sock = new WebSocket(ws); await new Promise((r) => sock.addEventListener('open', r));
  let id = 0; const wait = {};
  sock.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && wait[m.id]) { wait[m.id](m); delete wait[m.id]; return; }
    if (onEvent) onEvent(m);
    if (m.method === 'Runtime.exceptionThrown') console.error('[page exception]', (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text || '').split('\n')[0]);
  });
  const cdp = (method, params = {}) => new Promise((r, j) => { const i = ++id; wait[i] = (m) => (m.error ? j(new Error(`${method}: ${m.error.message}`)) : r(m.result)); sock.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => { const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result?.value; };
  await cdp('Page.enable'); await cdp('Runtime.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile: false });
  const close = () => { try { sock.close(); } catch {} try { chrome.kill(); } catch {} try { fs.rmSync(prof, { recursive: true, force: true }); } catch {} };
  process.on('exit', close);
  const shot = async (file, { format = 'jpeg', quality = 94 } = {}) => {
    const r = await cdp('Page.captureScreenshot', { format, ...(format === 'jpeg' ? { quality } : {}), optimizeForSpeed: true });
    fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
  };
  return { cdp, ev, shot, close, sleep };
}

module.exports = { launch, sleep };
