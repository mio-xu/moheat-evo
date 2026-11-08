#!/usr/bin/env node
// The unified shell at runtime (DEMO_DESIGN_GUIDE §2 "纯聆听 / 互动" + §7.3 "统一外壳"; check_demo.py G6 `shell` row). Prints ONE JSON object.
//   node tools/web/check_shell.js <demo folder> [--secs 420] [--shots DIR]
// Own http.server + own headless Chrome. Opens the page with NO ?auto, picks PURE mode on the cover, clicks Start and touches nothing:
//   · the story must end on its own cover (intro back) with zero input, and never ask for the microphone (getUserMedia / SpeechRecognition);
//   · ← / → during playback must not leave the page; on the cover → must (it is undone right away);
//   · Space pauses: performance.now() and the #cmd thermal text freeze for 2 s, then resume;
//   · if the demo registered chapters (MoHeatShell.chapters + seek), seeking to the last chapter must move the story there.
// --shots DIR saves cover / playing / end screenshots (for reviews).
// --record: none of the tests above — one plain pure-mode run from Start to the end, the #cmd thermal text sampled every 100 ms
//   → { cmds: [[secs, cmd], …], ended, secs } (tools/qa/thermal_score.py: the thermal-use score behind the menu's "Try these first").
const { spawn } = require('child_process');
const path = require('path'), fs = require('fs'), net = require('net'), os = require('os');
const ROOT = path.resolve(__dirname, '..', '..');
const argv = process.argv.slice(2), opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const DEMO = path.resolve(argv.find((a, i) => !a.startsWith('--') && !['--secs', '--shots'].includes(argv[i - 1])) || '');
const REL = path.relative(ROOT, DEMO).split(path.sep).join('/'), SECS = +opt('--secs', 420), SHOTS = opt('--shots', null);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const out = { demo: REL, shell: false, pureEnded: false, secs: 0, mic: [], navDuringPlay: null, navOnCover: null, pause: null, seek: null, errors: [] };
(async () => {
  const hp = await freePort(), dp = await freePort();
  const http = spawn('python3', ['-m', 'http.server', String(hp), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'shellprobe-'));
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${dp}`, `--user-data-dir=${prof}`, '--autoplay-policy=no-user-gesture-required', '--mute-audio',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });
  const done = () => { try { chrome.kill(); } catch {} try { http.kill(); } catch {} try { fs.rmSync(prof, { recursive: true, force: true }); } catch {}
    process.stdout.write(JSON.stringify(out) + '\n'); process.exit(0); };
  setTimeout(() => { out.errors.push('timeout'); done(); }, (SECS + 240) * 1000);
  let ws; for (let i = 0; i < 80 && !ws; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${dp}/json/list`)).json(); ws = l.find((x) => x.type === 'page')?.webSocketDebuggerUrl; } catch {} }
  if (!ws) { out.errors.push('no Chrome'); return done(); }
  const sock = new WebSocket(ws); await new Promise((r) => sock.addEventListener('open', r));
  let id = 0; const wait = {}; const hand = [];
  sock.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && wait[m.id]) { wait[m.id](m); delete wait[m.id]; } else hand.forEach((h) => h(m)); });
  const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; wait[i] = r; sock.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (x) => { const r = (await cdp('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true })).result;
    if (r?.exceptionDetails && out.errors.length < 8) out.errors.push(`eval: ${(r.exceptionDetails.exception?.description || r.exceptionDetails.text || '').slice(0, 160)}`); return r?.result?.value; };
  const shot = async (n) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); const r = await cdp('Page.captureScreenshot', { format: 'jpeg', quality: 80 }); fs.writeFileSync(path.join(SHOTS, `${path.basename(DEMO)}.${n}.jpg`), Buffer.from(r.result.data, 'base64')); };
  const key = async (k, code) => { for (const type of ['keyDown', 'keyUp']) await cdp('Input.dispatchKeyEvent', { type, key: k, code, windowsVirtualKeyCode: { ArrowRight: 39, ArrowLeft: 37, ' ': 32 }[k] }); };
  const base = `http://127.0.0.1:${hp}`, url = `${base}/${REL}/?sub=en&bar=1`;   // bar=1: the chapter bar even while MoHeatShell.BAR_ENABLED is off
  await cdp('Page.enable'); await cdp('Runtime.enable');
  await cdp('Page.navigate', { url: `${base}/tools/web/check_shell.js` }); await sleep(300);
  await ev(`(localStorage.setItem('moheat.guide', 'done'), localStorage.setItem('moheat.mode', '"pure"'), 1)`);
  // the microphone must never be asked for in pure mode
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `window.__mic = []; const gum = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
    if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = (c) => { window.__mic.push('getUserMedia'); return gum ? gum(c) : Promise.reject(); };
    for (const k of ['SpeechRecognition', 'webkitSpeechRecognition']) if (window[k]) { const S = window[k]; window[k] = class extends S { start() { window.__mic.push('SpeechRecognition.start'); return super.start(); } }; }` });
  const load = async () => { await cdp('Page.navigate', { url }); for (let i = 0; i < 80; i++) { await sleep(250); if (await ev('document.readyState') === 'complete') break; } await sleep(2500); };
  await load();
  out.shell = !!(await ev('!!window.MoHeatShell && !!document.querySelector(".sh-mode")'));
  if (argv.includes('--record')) {   // the thermal stream of one pure run (no seek / pause, real speed)
    await ev(`(document.querySelector('.sh-mode [data-m=pure]')?.click(), document.getElementById('startBtn').click(), 1)`);
    const cmds = [], r0 = Date.now(); let last = null, gone = 0;
    while ((Date.now() - r0) / 1000 < SECS) {
      await sleep(100); const t = (Date.now() - r0) / 1000;
      const [c, cover] = (await ev(`[document.getElementById('cmd')?.textContent || '', !document.getElementById('intro').classList.contains('hidden')]`)) || ['', false];
      if (c !== last) { cmds.push([+t.toFixed(1), c]); last = c; }
      if (cover && t > 5) { if (++gone > 5) { out.pureEnded = true; break; } } else gone = 0;
    }
    out.cmds = cmds; out.secs = Math.round((Date.now() - r0) / 1000); out.mic = (await ev('window.__mic')) || [];
    return done();
  }
  await shot('cover');
  // ← / → on the cover switch demos (go back right after)
  await key('ArrowRight', 'ArrowRight'); await sleep(1500);
  out.navOnCover = (await ev('location.pathname')) !== `/${REL}/`;
  if (out.navOnCover) await load();
  await ev(`(document.querySelector('.sh-mode [data-m=pure]')?.click(), document.getElementById('startBtn').click(), 1)`);
  await sleep(4000);
  await key('ArrowRight', 'ArrowRight'); await sleep(1200);
  out.navDuringPlay = (await ev('location.pathname')) !== `/${REL}/`;
  // pause: the clock and the thermal text freeze
  const a = await ev(`[performance.now(), document.getElementById('cmd')?.textContent || '']`);
  await key(' ', 'Space'); await sleep(2000);
  const b = await ev(`[performance.now(), document.getElementById('cmd')?.textContent || '', MoHeatShell.paused]`);
  await shot('paused');
  await key(' ', 'Space'); await sleep(800);
  const c = await ev(`[performance.now(), MoHeatShell.paused]`);
  const film = await ev('!!document.getElementById("timelineWrap")');   // films: Space is their own play / pause (the media element is the clock)
  out.pause = film ? { frozen: !!(await ev('(() => { const m = ["mix", "film"].map((k) => document.getElementById(k)).find((e) => e instanceof HTMLMediaElement); return m && !m.paused; })()')), resumed: true, film: true }
    : !a || !b || !c ? { frozen: false, resumed: false } : { frozen: b[2] === true && b[0] - a[0] < 400, resumed: c[1] === false && c[0] > b[0] };
  await shot('playing');
  const t0 = Date.now();
  const nch = await ev('document.querySelectorAll(".sh-bar button").length');
  if (nch > 1) {   // pure mode: jump to the last chapter (fast-forward), then back to chapter 2 (restart + forward)
    const t1 = Date.now(); await ev(`(MoHeatShell.seekTo(${nch - 1}), 1)`);
    while (Date.now() - t1 < 90000 && (await ev('MoHeatShell.chapter()')) < nch - 1) await sleep(500);
    const fwd = await ev('MoHeatShell.chapter()'), fwdS = Math.round((Date.now() - t1) / 1000);
    await ev('(MoHeatShell.seekTo(1), 1)'); await sleep(2500);
    const t2 = Date.now(); while (Date.now() - t2 < 60000 && (await ev('MoHeatShell.chapter()')) < 1) await sleep(500);
    out.seek = { chapters: nch, forward: fwd === nch - 1, forwardSecs: fwdS, back: (await ev('MoHeatShell.chapter()')) === 1 };
    await shot('seek');
  }
  while ((Date.now() - t0) / 1000 < SECS) {
    await sleep(1000);
    if (await ev(`!document.getElementById('intro').classList.contains('hidden')`)) { out.pureEnded = true; break; }
  }
  out.secs = Math.round((Date.now() - t0) / 1000) + 4;
  out.mic = (await ev('window.__mic')) || [];
  await sleep(800); await shot('end');
  done();
})();
