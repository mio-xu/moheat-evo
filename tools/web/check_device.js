#!/usr/bin/env node
// Device connection = ONE source of truth (device.js MoHeatDevice.state + window event 'moheat:device'; user 2026-11-09: the header
// 🔌 status, ⚙ "MoHeat Evo" row, kiosk panel / queue all agree, demo switches reconnect silently). Prints ONE JSON object; exit 1 on FAIL.
//   node tools/web/check_device.js [demoA] [demoB]      (defaults: Demo24_GakuCamp → Demo05_GifuCastle)
// No hardware: a mock navigator.serial (one granted port that opens, writes, can be unplugged / replugged) is injected before every page.
// Steps: A → Connect → header + ⚙ say connected → switch to B → reconnects with no prompt → unplug → both say disconnected + toast →
// replug → reconnects → Disconnect (manual) → next page does NOT reconnect.
const { spawn } = require('child_process'); const path = require('path'), fs = require('fs'), net = require('net'), os = require('os');
const ROOT = path.resolve(__dirname, '..', '..');
const A = process.argv[2] || 'demos/for-women/Demo24_GakuCamp', B = process.argv[3] || 'demos/nobunaga-suntory/Demo05_GifuCastle';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const MOCK = `(() => {
  const serial = new EventTarget(); let open = false;
  const port = Object.assign(new EventTarget(), { getInfo: () => ({ usbVendorId: 0x303a, usbProductId: 0x1001 }),
    open: async () => { if (window.__unplugged) throw new Error('device not found'); open = true; },
    setSignals: async () => {}, close: async () => { open = false; },
    get writable() { return new WritableStream({ write(c) { (window.__sent ||= []).push(new TextDecoder().decode(c).trim()); } }); },
    get readable() { return new ReadableStream({ start() {} }); } });
  serial.getPorts = async () => (window.__unplugged ? [] : [port]); serial.requestPort = async () => { window.__prompted = (window.__prompted || 0) + 1; return port; };
  window.__unplug = () => { window.__unplugged = true; const e = new Event('disconnect'); e.port = port; serial.dispatchEvent(e); };
  window.__replug = () => { window.__unplugged = false; const e = new Event('connect'); e.port = port; serial.dispatchEvent(e); };
  Object.defineProperty(Navigator.prototype, 'serial', { configurable: true, get: () => serial });
})();`;
const out = { steps: [], fails: [] };
(async () => {
  const hp = await freePort(), dp = await freePort();
  const http = spawn('python3', [require('path').join(__dirname, '..', 'qa', 'serve.py'), String(hp), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'checkdev-'));
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${dp}`, `--user-data-dir=${prof}`, '--mute-audio', '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });
  const done = () => { try { chrome.kill(); } catch {} try { http.kill(); } catch {} try { fs.rmSync(prof, { recursive: true, force: true }); } catch {}
    process.stdout.write(JSON.stringify(out) + '\n'); process.exit(out.fails.length ? 1 : 0); };
  setTimeout(() => { out.fails.push('timeout'); done(); }, 180000);
  let ws; for (let i = 0; i < 80 && !ws; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${dp}/json/list`)).json(); ws = l.find((x) => x.type === 'page')?.webSocketDebuggerUrl; } catch {} }
  const sock = new WebSocket(ws); await new Promise((r) => sock.addEventListener('open', r)); let id = 0; const wait = {};
  sock.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && wait[m.id]) { wait[m.id](m); delete wait[m.id]; } });
  const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; wait[i] = r; sock.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (x) => (await cdp('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true })).result?.result?.value;
  await cdp('Page.enable'); await cdp('Page.addScriptToEvaluateOnNewDocument', { source: MOCK });
  const go = async (d) => { await cdp('Page.navigate', { url: `http://127.0.0.1:${hp}/${d}/` }); for (let i = 0; i < 60; i++) { await sleep(250); if (await ev(`document.readyState === 'complete' && !!document.querySelector('.u2')`)) break; } await sleep(1500); };
  // what every surface shows right now
  const SEE = `(() => { const st = window.MoHeatDevice?.state || {}, hdr = document.getElementById('deviceStatus')?.textContent.trim() || '';
    document.querySelector('.u2-gear')?.click(); const set = document.querySelector('.u2-devst')?.textContent.trim() || ''; document.querySelector('.u2-gear')?.click();
    const toast = [...document.querySelectorAll('.sh-toast')].filter((t) => !t.hidden).map((t) => t.textContent).join(' ');
    return { state: st.state, header: hdr, settings: set, toast, prompted: window.__prompted || 0, sent: (window.__sent || []).length }; })()`;
  const step = async (name, want) => { await sleep(900); const s = await ev(SEE); out.steps.push({ name, ...s });
    const ok = (re, v) => re.test(v || ''); const bad = [];
    if (want.state && s.state !== want.state) bad.push(`state ${s.state} ≠ ${want.state}`);
    if (want.header && !ok(want.header, s.header)) bad.push(`header "${s.header}"`); if (want.settings && !ok(want.settings, s.settings)) bad.push(`⚙ "${s.settings}"`);
    if (want.toast && !ok(want.toast, s.toast)) bad.push(`no toast (${s.toast})`); if (want.prompts != null && s.prompted !== want.prompts) bad.push(`permission prompt shown ${s.prompted}×`);
    if (bad.length) out.fails.push(`${name}: ${bad.join('; ')}`); };
  await go('index.html'.replace('/index.html', '') && A); await ev(`(localStorage.setItem('moheat.guide','done'), localStorage.removeItem('moheat.device.auto'), 1)`); await go(A);
  await step('A before connect', { state: 'off', settings: /not connected/i });
  await ev(`document.getElementById('connectBtn').click(), 1`); await step('A connected', { state: 'connected', header: /connected/i, settings: /connected/i, prompts: 0 });
  await go(B); await step('B after the switch (silent reconnect)', { state: 'connected', header: /connected/i, settings: /connected/i, prompts: 0 });
  await ev(`window.__unplug(), 1`); await step('B unplugged', { state: 'lost', header: /disconnected/i, settings: /disconnect/i, toast: /disconnect/i });
  await ev(`window.__replug(), 1`); await sleep(800); await step('B replugged', { state: 'connected', header: /connected/i, settings: /connected/i, prompts: 0 });
  await ev(`document.getElementById('connectBtn').click(), 1`); await step('B manual disconnect', { state: 'off', settings: /not connected/i });
  await go(A); await step('A after a manual disconnect (no auto reconnect)', { state: 'off', settings: /not connected/i });
  done();
})();
