#!/usr/bin/env node
// Leaving the page or a phone call must never leave a silent stuck demo (user 2026-11-09, iPhone). shared/shell.js: hidden / pagehide → pause (thermal stop), back → the same pause → play sequence by itself, the big
// play only if the context did not come back; an 'interrupted' context while visible pauses too. Simulated in headless Chrome: a hidden → visible page with a suspended context, then a fake 'interrupted' state.
// Prints ONE JSON object { demo, steps, fails }; exit 1 on FAIL.   node tools/web/check_background.js <demo folder>
require('../qa/chrome_guard');
const { spawn } = require('child_process'); const path = require('path'), fs = require('fs'), net = require('net'), os = require('os');
const ROOT = path.resolve(__dirname, '..', '..'), REL = path.relative(ROOT, path.resolve(process.argv[2] || '')).split(path.sep).join('/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const out = { demo: REL, steps: {}, fails: [] };
(async () => {
  const hp = await freePort(), dp = await freePort();
  const http = spawn('python3', [path.join(__dirname, '..', 'qa', 'serve.py'), String(hp), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'checkbg-'));
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${dp}`, `--user-data-dir=${prof}`, '--autoplay-policy=no-user-gesture-required', '--mute-audio', '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });
  const done = () => { try { chrome.kill(); } catch {} try { http.kill(); } catch {} try { fs.rmSync(prof, { recursive: true, force: true }); } catch {} process.stdout.write(JSON.stringify(out) + '\n'); process.exit(out.fails.length ? 1 : 0); };
  setTimeout(() => { out.fails.push('timeout'); done(); }, 90000);
  let ws; for (let i = 0; i < 80 && !ws; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${dp}/json/list`)).json(); ws = l.find((x) => x.type === 'page')?.webSocketDebuggerUrl; } catch {} }
  const sock = new WebSocket(ws); await new Promise((r) => sock.addEventListener('open', r)); let id = 0; const wait = {};
  sock.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && wait[m.id]) { wait[m.id](m); delete wait[m.id]; } });
  const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; wait[i] = r; sock.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (x) => (await cdp('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true })).result?.result?.value;
  const state = () => ev(`(() => { const c = MoHeatShell.contexts?.() || [], m = ['mix', 'film'].map((k) => document.getElementById(k)).find((e) => e instanceof HTMLMediaElement); return { st: document.querySelector('.u2')?.dataset.state, paused: document.documentElement.classList.contains('shell-paused'), ctx: c.map((x) => x.state), cmd: document.getElementById('cmd')?.textContent, media: m ? !m.paused : null, t: m ? m.currentTime : performance.now() / 1000 }; })()`);
  const hide = (on) => ev(`Object.defineProperty(document, 'hidden', { configurable: true, get: () => ${on} }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => '${on ? 'hidden' : 'visible'}' }); document.dispatchEvent(new Event('visibilitychange')); 1`);
  const tap = async () => { const b = await ev(`(() => { const r = document.querySelector('.u2-paused').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`); for (const type of ['mousePressed', 'mouseReleased']) await cdp('Input.dispatchMouseEvent', { type, x: b[0], y: b[1], button: 'left', clickCount: 1 }); };
  const check = (name, ok, s) => { out.steps[name] = s; if (!ok) out.fails.push(`${name}: ${JSON.stringify(s)}`); };
  await cdp('Page.enable');
  await cdp('Page.navigate', { url: `http://127.0.0.1:${hp}/${REL}/?nomic&pure` });
  for (let i = 0; i < 60; i++) { await sleep(250); if (await ev(`!!document.querySelector('.u2-start') && !document.querySelector('.u2-start').disabled`)) break; }
  await sleep(500); await ev(`[...document.querySelectorAll('button')].find((b) => /^Skip$/i.test(b.textContent.trim()))?.click(); document.querySelector('.u2-start').click(); 1`); await sleep(5000);
  let s = await state(); check('playing', s.st === 'playing' && !s.paused, s);
  const stops0 = await ev(`MoHeatShell.stops || 0`);
  await hide(true); await sleep(1200); s = await state(); check('hidden → paused, thermal stop', s.paused && s.st === 'paused' && (await ev(`MoHeatShell.stops || 0`)) > stops0, s);
  let before = s.t; await hide(false); await sleep(2200); s = await state(); check('back → carries on by itself', !s.paused && s.st === 'playing' && s.ctx.every((x) => x === 'running') && s.t > before && (s.media === null || s.media), s);
  if (s.ctx.length) {   // the context can't be resumed without a tap (iOS): the big play shows, the tap carries on
    await ev(`(() => { const c = MoHeatShell.contexts()[0]; c.__r = c.resume; c.resume = () => Promise.resolve(); return 1; })()`); await hide(true); await sleep(400); await hide(false); await sleep(2200); s = await state();
    check('back, no auto-resume → big play', s.paused && s.st === 'paused' && await ev(`getComputedStyle(document.querySelector('.u2-paused')).display !== 'none'`), s);
    await ev(`(() => { const c = MoHeatShell.contexts()[0]; c.resume = c.__r; return 1; })()`); before = s.t; await tap(); await sleep(2500); s = await state(); check('tap → playing on', !s.paused && s.st === 'playing' && s.ctx.every((x) => x === 'running') && s.t > before, s);
  }
  // while visible: the OS interrupts the context
  await ev(`(() => { const c = (MoHeatShell.contexts?.() || [])[0]; if (!c) return 0; Object.defineProperty(c, 'state', { configurable: true, get: () => 'interrupted' }); c.__own = false; c.dispatchEvent(new Event('statechange')); return 1; })()`);
  await sleep(1200); s = await state(); const hasCtx = s.ctx.length > 0; if (hasCtx) { check('interrupted → paused', s.paused && s.st === 'paused', s);
    await ev(`(() => { const c = MoHeatShell.contexts()[0]; delete c.state; return 1; })()`); const b2 = s.t; await tap(); await sleep(2500); s = await state(); check('tap after interruption → playing on', !s.paused && s.st === 'playing' && s.t > b2, s); } else out.steps.interrupted = 'no AudioContext in this demo: skipped';
  done();
})();
