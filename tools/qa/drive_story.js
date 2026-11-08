#!/usr/bin/env node
// Play a game demo to its end in headless Chrome BY ANSWERING ITS BUTTONS like a viewer (DEMO_DESIGN_GUIDE §6 step 7, §11.1):
// for demos whose main.js has no ?auto mode (Demo12 Ren / Demo21 Jin / Demo22 Shion: tools/qa/page_probe.js's ?auto=1 playthrough
// stalls at the first action button and reports "no thermal output"). Own http.server + own Chrome (never a tab someone uses).
//   node tools/qa/drive_story.js <demo folder> [--alt] [--lang en|ja|zh] [--secs 420] [--shots <dir>]
// Answers: #answerBtn (incoming call) · .ch choices (first; --alt = last) · .act-btn (click; .hold = pointer held down; .aim = drags
// across the stage) · #micGate button. Samples MoHeatLayers.state() every frame → same lip-sync rules as tools/art/check_mouth.js
// (SILENT-OPEN, STUCK-OPEN, NO-MOVE, NO-PATCH, UNMAPPED, HALF, FLICKER) + per view: seconds talking / open / blinking.
// Also: failed requests, exceptions, console errors, '[MoHeatSub] no <lang>', ends on its OWN cover with Play again.
// --shots: the canvas the first time each view is open / closed / blinking → <dir>/<view>_{open,closed,blink}.png (look 2×).
// Prints one JSON object; exit 1 when issues / failed requests / exceptions / not ended.
const { spawn } = require('child_process');
const path = require('path'), fs = require('fs'), net = require('net'), os = require('os');
const ROOT = path.resolve(__dirname, '..', '..');
const argv = process.argv.slice(2), flag = (f) => argv.includes(f), opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const REL = path.relative(ROOT, path.resolve(argv[0] || '.')).split(path.sep).join('/'), ALT = flag('--alt'), LANG = opt('--lang', 'en'), SECS = +opt('--secs', 420), SHOTS = opt('--shots', null);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
(async () => {
  const hp = await freePort(), dp = await freePort();
  const http = spawn('python3', ['-m', 'http.server', String(hp), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'drv-'));
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${dp}`, `--user-data-dir=${prof}`, '--autoplay-policy=no-user-gesture-required',
    '--use-angle=metal', '--enable-gpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--window-size=1440,900', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
  const done = (c) => { try { chrome.kill(); } catch {} try { http.kill(); } catch {} try { fs.rmSync(prof, { recursive: true, force: true }); } catch {} process.exit(c); };
  let ws;
  for (let i = 0; i < 60 && !ws; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${dp}/json/list`)).json(); const pg = l.find((x) => x.type === 'page'); if (pg) ws = pg.webSocketDebuggerUrl; } catch {} }
  const sock = new WebSocket(ws); await new Promise((r) => sock.addEventListener('open', r));
  let id = 0; const wait = {}, H = [];
  sock.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && wait[m.id]) { wait[m.id](m); delete wait[m.id]; } else if (m.method) H.forEach((h) => h(m)); });
  const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; wait[i] = r; sock.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => { const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result?.result?.value; };
  const base = `http://127.0.0.1:${hp}`;
  await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Network.enable');
  await cdp('Page.navigate', { url: `${base}/tools/qa/page_probe.js` }); await sleep(400);
  await ev(`(localStorage.setItem('moheat.guide', 'done'), 1)`);
  const bad = [], exc = [], nozh = [], cons = [], reqs = {};
  H.push((m) => {
    if (m.method === 'Network.requestWillBeSent') reqs[m.params.requestId] = m.params.request.url;
    else if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) bad.push(`${m.params.response.status} ${m.params.response.url}`);
    else if (m.method === 'Network.loadingFailed' && !/ERR_ABORTED/.test(m.params.errorText) && !m.params.canceled) bad.push(`${m.params.errorText} ${reqs[m.params.requestId]}`);
    else if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; exc.push(`${d.exception?.description || d.text}`.slice(0, 200)); }
    else if (m.method === 'Runtime.consoleAPICalled') { const t = m.params.args.map((a) => a.value ?? a.description ?? '').join(' '); if (/no (zh|ja|en) for/.test(t)) nozh.push(t); else if (m.params.type === 'error') cons.push(t.slice(0, 200)); }
  });
  await cdp('Page.navigate', { url: `${base}/${REL}/?nomic&sub=${LANG}` });
  for (let i = 0; i < 80; i++) { await sleep(250); if (await ev(`!!document.getElementById('startBtn') && document.readyState === 'complete'`)) break; }
  await sleep(2000);
  await ev(`(() => { const m = document.getElementById('micOn'); if (m) m.checked = false; return 1 })()`);
  await ev(`document.getElementById('startBtn').click(), 1`);
  await ev(`(() => { const L = window.__mouth = []; const t0 = performance.now(); const f = () => { const s = MoHeatLayers.state();
    L.push([(performance.now() - t0) / 1000, s.mouth, s.tgt, s.view, s.stem || '', s.patches.join('+'), s.blink ? 1 : 0]); requestAnimationFrame(f); }; requestAnimationFrame(f); return 1; })()`);
  const pick = ALT ? 'b[b.length-1]' : 'b[0]';
  const shots = {}, subsSeen = new Set(); let ended = false, label = '';
  const t0 = Date.now();
  while (Date.now() - t0 < SECS * 1000) {
    await sleep(150);
    const r = await ev(`(() => { const vis = (e) => e && e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden' && +getComputedStyle(e).opacity > .05;
      const st = document.getElementById('stage');
      const inc = document.getElementById('answerBtn'); if (vis(inc) && document.getElementById('incoming').classList.contains('show')) { inc.click(); return 'answer'; }
      let b = [...document.querySelectorAll('#choices.show .ch')]; if (b.length) { ${pick}.click(); return 'choice ' + ${pick}.textContent; }
      const hb = document.querySelector('#act.show .act-btn.hold'); if (hb) { if (!hb.__d) { hb.__d = 1; hb.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); } return 'hold'; }
      const ab = document.querySelector('#act.show .act-btn.aim'); if (ab) { const r = st.getBoundingClientRect(); const x = r.left + r.width * (0.5 + 0.45 * Math.sin(performance.now() / 300)); st.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: x, clientY: r.top + r.height / 2, buttons: 1, pointerType: 'touch' })); return 'aim'; }
      const a = document.querySelector('#act.show button.act-btn'); if (a) { a.click(); return 'act ' + a.textContent; }
      const g = document.querySelector('#micGate.show button'); if (g) { g.click(); return 'mic'; }
      return '' })()`);
    if (r && r !== 'aim' && r !== 'hold') console.log(((Date.now() - t0) / 1000).toFixed(0) + 's', r);
    const s = await ev(`(() => { const s = MoHeatLayers.state(); const i = document.getElementById('intro'); const b = document.getElementById('startBtn');
      const sj = document.getElementById('subs'); return [s.view, s.mouth, s.blink ? 1 : 0, !i.classList.contains('hidden') && getComputedStyle(i).display !== 'none', b.textContent, sj ? sj.innerText.trim() : ''] })()`);
    if (!s) continue;
    if (s[5]) subsSeen.add(s[5]);
    if (SHOTS) for (const [k, ok] of [['open', s[1] >= 1], ['closed', s[1] <= 0 && !s[2]], ['blink', s[2]]]) if (ok && !shots[`${s[0]}_${k}`]) {
      const png = await ev(`(() => { const c = [...document.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height)[0]; return c && c.toDataURL('image/png'); })()`);
      if (png) { fs.mkdirSync(SHOTS, { recursive: true }); fs.writeFileSync(path.join(SHOTS, `${s[0]}_${k}.png`), Buffer.from(png.split(',')[1], 'base64')); shots[`${s[0]}_${k}`] = 1; }
    }
    if ((Date.now() - t0) > 10000 && s[3] && /もう一度|Play again|再/.test(s[4])) { ended = true; label = s[4]; break; }
  }
  const L = await ev(`window.__mouth`) || [];
  const issues = [], per = {}; let silent = 0, sw = 0, last = 0, half = 0, tf = 0, run = 0;
  for (let i = 0; i < L.length; i++) {
    const [t, m, tgt, view, stem, pk, bl] = L[i], dt = i ? t - L[i - 1][0] : 0;
    const v = per[view] || (per[view] = { talk: 0, open: 0, blink: 0, stem, pk });
    if (tgt > .32) { v.talk += dt; tf++; if (m > .05 && m < .95) half++; }
    if (m >= .95) v.open += dt; if (bl) v.blink += dt;
    silent = m > .5 && tgt <= .001 ? silent + dt : 0;
    if (silent >= .15 && !issues.some((x) => x.startsWith(`SILENT-OPEN ${view}`))) issues.push(`SILENT-OPEN ${view} at ${t.toFixed(1)}`);
    const o = m > .5 ? 1 : 0; if (o !== last) { sw++; last = o; } run = o ? run + dt : 0;
    if (run > 1.2 && !issues.some((x) => x.startsWith(`STUCK-OPEN ${view}`))) issues.push(`STUCK-OPEN ${view} at ${t.toFixed(1)}`);
  }
  const T = L.length ? L[L.length - 1][0] : 0;
  for (const [view, v] of Object.entries(per)) {
    if (!v.stem) { if (v.talk >= .6) issues.push(`UNMAPPED ${view} talks ${v.talk.toFixed(1)}`); continue; }
    if (v.talk >= .6 && !/mouth/.test(v.pk)) issues.push(`NO-PATCH ${view}`); else if (v.talk >= .6 && v.open === 0) issues.push(`NO-MOVE ${view}`);
  }
  if (tf > 30 && half / tf > .08) issues.push(`HALF ${(100 * half / tf).toFixed(0)}%`);
  if (T > 5 && sw / T > 14) issues.push(`FLICKER ${(sw / T).toFixed(1)}/s`);
  console.log(JSON.stringify({ demo: REL, alt: ALT, lang: LANG, ended, label, secs: Math.round((Date.now() - t0) / 1000), fps: +(L.length / (T || 1)).toFixed(0),
    views: Object.fromEntries(Object.entries(per).map(([k, v]) => [k, `talk ${v.talk.toFixed(1)} open ${v.open.toFixed(1)} blink ${v.blink.toFixed(1)} ${v.pk}`])),
    issues, bad: [...new Set(bad)].filter((u) => !/favicon/.test(u)), exc, cons, nozh: [...new Set(nozh)].slice(0, 20), subs: subsSeen.size, sampleSubs: [...subsSeen].slice(0, 3) }, null, 1));
  done(issues.length || bad.filter((u) => !/favicon/.test(u)).length || exc.length || !ended ? 1 : 0);
})();
