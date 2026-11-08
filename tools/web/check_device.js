#!/usr/bin/env node
// Device connection = ONE source of truth (device.js MoHeatDevice.state + window event 'moheat:device'; user 2026-11-09: the header
// 🔌 status, ⚙ "MoHeat Evo" row, kiosk panel / queue all agree, demo switches reconnect silently). Prints ONE JSON object; exit 1 on FAIL.
//   node tools/web/check_device.js [demoA] [demoB]      (defaults: Demo24_GakuCamp → Demo05_GifuCastle)
// No hardware: a mock navigator.serial (one granted port that opens, writes, can be unplugged / replugged) is injected before every page.
// Steps: A → Connect → header + ⚙ say connected → switch to B → reconnects with no prompt → unplug → both say disconnected + toast →
// replug → reconnects → Disconnect (manual) → next page does NOT reconnect.
//   node tools/web/check_device.js --kiosk [demo] [--shots DIR]      (exhibition pages, default demo Demo24_GakuCamp)
// Kiosk mode: tab 1 = kiosk/index.html (staff panel #deviceStatus + visitor screen #devdot / big #alertBig), tab 2 = kiosk/queue.html
// (status pill #qdev + big #qalert, fed over the BroadcastChannel). The same sequence: staff Connect → visitor goes to a demo (silent
// reconnect, kiosk mode) → unplug / replug there → back to the kiosk (silent reconnect) → unplug / replug → manual disconnect → reload
// stays off. Every surface must agree with MoHeatDevice.state at every step, 0 permission prompts.
const { spawn } = require('child_process'); const path = require('path'), fs = require('fs'), net = require('net'), os = require('os');
const ROOT = path.resolve(__dirname, '..', '..');
const ARGS = process.argv.slice(2), KIOSK = ARGS.includes('--kiosk'), SHOTS = ARGS.includes('--shots') ? path.resolve(ARGS[ARGS.indexOf('--shots') + 1]) : null;
const POS = ARGS.filter((a, i) => !a.startsWith('--') && ARGS[i - 1] !== '--shots');
const A = POS[0] || 'demos/for-women/Demo24_GakuCamp', B = POS[1] || 'demos/nobunaga-suntory/Demo05_GifuCastle';
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
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${dp}`, `--user-data-dir=${prof}`, '--mute-audio', '--window-size=1440,900',
    ...(KIOSK ? ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] : []), 'about:blank'], { stdio: 'ignore' });
  const done = () => { try { chrome.kill(); } catch {} try { http.kill(); } catch {} try { fs.rmSync(prof, { recursive: true, force: true }); } catch {}
    process.stdout.write(JSON.stringify(out) + '\n'); process.exit(out.fails.length ? 1 : 0); };
  setTimeout(() => { out.fails.push('timeout'); done(); }, 180000);
  let ws; for (let i = 0; i < 80 && !ws; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${dp}/json/list`)).json(); ws = l.find((x) => x.type === 'page')?.webSocketDebuggerUrl; } catch {} }
  const sock = new WebSocket(ws); await new Promise((r) => sock.addEventListener('open', r)); let id = 0; const wait = {};
  sock.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && wait[m.id]) { wait[m.id](m); delete wait[m.id]; } });
  const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; wait[i] = r; sock.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (x) => (await cdp('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true })).result?.result?.value;
  await cdp('Page.enable'); await cdp('Page.addScriptToEvaluateOnNewDocument', { source: MOCK });
  if (KIOSK) { await kiosk({ cdp, ev, hp, dp }); return done(); }
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

// ---------------------------------------------------------------- --kiosk: staff panel / visitor screen / queue screen agree at every step
async function kiosk({ cdp, ev, hp, dp }) {
  const base = `http://127.0.0.1:${hp}`;
  const until = async (x, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(x)) return true; await sleep(250); } return false; };
  const nav = async (u, ready) => { await cdp('Page.navigate', { url: base + u }); await sleep(400); await until(`document.readyState === 'complete' && (${ready})`, 20000); await sleep(1200); };
  // tab 2: the queue screen (no serial: it only listens on the BroadcastChannel)
  let qt = null; try { qt = await (await fetch(`http://127.0.0.1:${dp}/json/new?${encodeURIComponent(base + '/kiosk/queue.html')}`, { method: 'PUT' })).json(); } catch {}
  if (!qt?.webSocketDebuggerUrl) { out.fails.push('could not open the queue tab'); return; }
  const qs = new WebSocket(qt.webSocketDebuggerUrl); await new Promise((r) => qs.addEventListener('open', r)); let qid = 0; const qw = {};
  qs.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && qw[m.id]) { qw[m.id](m); delete qw[m.id]; } });
  const qcdp = (method, params = {}) => new Promise((r) => { const i = ++qid; qw[i] = r; qs.send(JSON.stringify({ id: i, method, params })); });
  const qev = async (x) => (await qcdp('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true })).result?.result?.value;
  const shot = async (n) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true });
    for (const [tab, c] of [['visitor', cdp], ['queue', qcdp]]) { const r = await c('Page.captureScreenshot', { format: 'jpeg', quality: 78 }); if (r.result?.data) fs.writeFileSync(path.join(SHOTS, `kioskdev_${n}_${tab}.jpg`), Buffer.from(r.result.data, 'base64')); } };
  // first run: kiosk flag on, no remembered connection, staff here (attended), long idle so the welcome screen stays
  await nav('/kiosk/?kiosk=1', `!!window.MoHeatKioskApp`);
  await ev(`(localStorage.removeItem('moheat.device.auto'), localStorage.removeItem('moheat.device.port'), localStorage.setItem('moheat.guide', 'done'),
    localStorage.setItem('moheat.kiosk.cfg', JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('moheat.kiosk.cfg') || '{}'), { idle: 600 }))), 1)`);
  await nav('/kiosk/', `!!window.MoHeatKioskApp`); await until(`!!window.MoHeatQueue`, 1000);
  // what each surface shows: K = kiosk page (staff panel status + visitor dot / big alert) or a demo page in kiosk mode; Q = the queue screen
  const SEEK = `(() => { const st = window.MoHeatDevice?.state || {}, vis = (e) => !!e && !e.hidden && getComputedStyle(e).display !== 'none';
    const dot = document.getElementById('devdot'), big = document.getElementById('alertBig'), mk = document.querySelector('.mk-alert');
    return { page: location.pathname, state: st.state, staff: document.getElementById('deviceStatus')?.textContent.trim() || '', dot: dot ? dot.className : null,
      alert: vis(big) || vis(mk), prompted: window.__prompted || 0 }; })()`;
  const SEEQ = `(() => { const p = document.getElementById('qdev'), a = document.getElementById('qalert'); return { qstate: p?.dataset.state, qtext: p?.textContent.trim(), qalert: !!a && !a.hidden }; })()`;
  const LABEL = { off: /not connected/i, connecting: /connecting/i, reconnecting: /reconnecting/i, connected: /^connected/i, lost: /disconnected/i };
  const DOT = { off: /^devdot\s*$/, connected: /\bok\b/, lost: /\berr\b/ };
  const kstep = async (name, want) => { await sleep(1200); let k = await ev(SEEK), q = await qev(SEEQ);
    for (let i = 0; i < 12 && (k.state !== want.state || (want.queue && q.qstate !== want.queue)); i++) { await sleep(500); k = await ev(SEEK); q = await qev(SEEQ); }
    out.steps.push({ name, ...k, ...q }); const bad = [];
    if (k.state !== want.state) bad.push(`state ${k.state} ≠ ${want.state}`);
    if (!LABEL[want.state].test(k.staff)) bad.push(`staff panel "${k.staff}"`);
    if (k.dot != null && DOT[want.state] && !DOT[want.state].test(k.dot)) bad.push(`visitor dot "${k.dot}"`);
    if (k.alert !== (want.state === 'lost')) bad.push(`visitor big alert ${k.alert ? 'shown' : 'missing'}`);
    if (want.queue && q.qstate !== want.queue) bad.push(`queue screen "${q.qstate}" ≠ ${want.queue}`);
    if (want.queue && q.qalert !== (want.queue === 'lost')) bad.push(`queue big alert ${q.qalert ? 'shown' : 'missing'}`);
    if (k.prompted) bad.push(`permission prompt shown ${k.prompted}×`);
    if (bad.length) out.fails.push(`${name}: ${bad.join('; ')}`); };
  await kstep('kiosk before connect', { state: 'off', queue: 'off' });
  await ev(`(MoHeatKioskApp.openStaff(), document.getElementById('connectBtn').click(), 1)`);
  await kstep('kiosk: staff Connect', { state: 'connected', queue: 'connected' }); await shot('1_connected');
  await ev(`(document.getElementById('staffClose').click(), 1)`);
  // the visitor opens a demo (kiosk mode): device.js reconnects silently; the queue keeps the last state, a demo page only reports 'alert'
  await nav(`/${A}/`, `!!document.querySelector('.u2')`);
  await kstep('demo (kiosk mode) after the switch', { state: 'connected', queue: 'connected' });
  await ev(`window.__unplug(), 1`); await kstep('demo unplugged', { state: 'lost', queue: 'lost' }); await shot('2_demo_lost');
  await ev(`window.__replug(), 1`); await sleep(1500); await kstep('demo replugged', { state: 'connected', queue: 'connected' });
  // back to the kiosk (✕ End / idle) → silent reconnect there too
  await nav('/kiosk/', `!!window.MoHeatKioskApp`);
  await kstep('kiosk after the demo (silent reconnect)', { state: 'connected', queue: 'connected' });
  await ev(`window.__unplug(), 1`); await kstep('kiosk unplugged', { state: 'lost', queue: 'lost' }); await shot('3_kiosk_lost');
  await ev(`window.__replug(), 1`); await sleep(800); await kstep('kiosk replugged', { state: 'connected', queue: 'connected' });
  await ev(`(MoHeatKioskApp.openStaff(), document.getElementById('connectBtn').click(), 1)`);
  await kstep('kiosk: staff Disconnect (manual)', { state: 'off', queue: 'off' }); await shot('4_off');
  await nav('/kiosk/', `!!window.MoHeatKioskApp`);
  await kstep('kiosk reload after a manual disconnect (no auto reconnect)', { state: 'off', queue: 'off' });
  try { qs.close(); } catch {}
}
