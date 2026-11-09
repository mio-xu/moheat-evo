#!/usr/bin/env node
// Browser half of tools/qa/check_demo.py (DEMO_DESIGN_GUIDE §6 制作流程 v2, gate G6 / G7). Prints ONE JSON object on stdout.
//
//   node tools/qa/page_probe.js <demo folder> [--secs 300] [--alt] [--no-play] [--no-mobile] [--no-drag] [--block-gesture]
//
// Own python http.server + own headless Chrome (never a tab someone is looking at, §11.1), so it can run next to other sessions.
//  play    <demo>/?auto=1&nomic&sub=zh (&alt=1): clicks Start, lets the story answer itself until it ends (or --secs), and records
//          · every request that fails or returns ≥ 400 (404 scan of what the page REALLY loads),
//          · uncaught exceptions + console.error, '[MoHeatSub] no zh for …' (visible text without a Chinese translation),
//          · the #cmd text every 100 ms (the thermal command the device would get: DUAL showcase analysis in check_demo.py),
//          · the end: the page is still this demo, the cover (#intro) is back and Start says Play again (§7.3 ends on own cover).
//  mobile  tools/web/check_mobile.html for this one folder at its 7 sizes (scroll / overflow / 44 px / guide / drawer), with
//          nav.js's DEMOS list replaced by this folder for that page only (so a staging folder that is not in the menu is checked too).
//  drag    touch emulation at 390×844 / 844×390: CDP finger strokes on the picture → no page scroll / zoom / pointercancel (shared/gesture.js).
require('./chrome_guard');   // closes its browser on any exit; one browser per agent (MOHEAT_MAX_BROWSERS)
const { spawn } = require('child_process');
const path = require('path'), fs = require('fs'), net = require('net'), os = require('os');
const ROOT = path.resolve(__dirname, '..', '..');
const argv = process.argv.slice(2), flag = (f) => argv.includes(f);
const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const pos = argv.filter((a, i) => !a.startsWith('--') && !(i && argv[i - 1] === '--secs'));
if (!pos[0]) { console.error('usage: node tools/qa/page_probe.js <demo folder> [--secs N] [--alt] [--no-play] [--no-mobile] [--no-drag] [--block-gesture]'); process.exit(2); }
const DEMO = path.resolve(pos[0]), REL = path.relative(ROOT, DEMO).split(path.sep).join('/');
const [, CAT, DIR] = REL.split('/');
const SECS = +opt('--secs', 300);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const out = { demo: REL, play: null, mobile: null, errors: [] };

(async () => {
  const hp = await freePort(), dp = await freePort();
  const http = spawn('python3', [require('path').join(__dirname, 'serve.py'), String(hp), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'qaprobe-'));
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${dp}`, `--user-data-dir=${prof}`, '--autoplay-policy=no-user-gesture-required',
    '--use-angle=metal', '--enable-gpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--window-size=1440,900', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
  const done = () => { try { chrome.kill(); } catch {} try { http.kill(); } catch {} try { fs.rmSync(prof, { recursive: true, force: true }); } catch {}
    process.stdout.write(JSON.stringify(out) + '\n', () => process.exit(0)); };   // exit only after the write: a pipe holds 64 KB (a long play's #cmd log is larger) and process.exit drops the rest
  setTimeout(() => { out.errors.push('probe timeout'); done(); }, (SECS + 900) * 1000);
  let ws;
  for (let i = 0; i < 160 && !ws; i++) {   // up to 40 s: Chrome starts slowly while other sessions run theirs
    await sleep(250);
    try { const l = await (await fetch(`http://127.0.0.1:${dp}/json/list`)).json(); const pg = l.find((x) => x.type === 'page'); if (pg) ws = pg.webSocketDebuggerUrl; } catch {}
  }
  if (!ws) { out.errors.push('Chrome did not start'); return done(); }
  const sock = new WebSocket(ws); await new Promise((r) => sock.addEventListener('open', r));
  let id = 0; const wait = {}, handlers = [];
  sock.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && wait[m.id]) { wait[m.id](m); delete wait[m.id]; } else if (m.method) handlers.forEach((h) => h(m)); });
  const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; wait[i] = r; sock.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => { const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result?.result?.value; };
  const base = `http://127.0.0.1:${hp}`;
  await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Network.enable');
  // the guide tour must not sit on top of the page (same origin for every page of the server)
  await cdp('Page.navigate', { url: `${base}/tools/qa/page_probe.js` }); await sleep(400);
  await ev(`(localStorage.setItem('moheat.guide', 'done'), 1)`);

  if (!flag('--no-play')) {
    const P = out.play = { url: '', bad: [], exceptions: [], console: [], nozh: [], cmds: [], ended: false, endOk: null, left: null, secs: 0 };
    const reqs = {};
    handlers.push((m) => {
      if (m.method === 'Network.requestWillBeSent') reqs[m.params.requestId] = m.params.request.url;
      else if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) P.bad.push(`${m.params.response.status} ${m.params.response.url}`);
      else if (m.method === 'Network.loadingFailed' && !/ERR_ABORTED|net::ERR_CACHE_MISS/.test(m.params.errorText) && !m.params.canceled)
        P.bad.push(`${m.params.errorText} ${reqs[m.params.requestId] || '?'}`);
      else if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; P.exceptions.push(`${d.exception?.description || d.text} @ ${d.url || ''}:${d.lineNumber}`.slice(0, 300)); }
      else if (m.method === 'Runtime.consoleAPICalled') {
        const txt = m.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
        if (/^\[MoHeatSub\] no zh/.test(txt)) P.nozh.push(txt.replace('[MoHeatSub] no zh for ', ''));
        else if (m.params.type === 'error') P.console.push(txt.slice(0, 300));
      }
    });
    P.url = `${base}/${REL}/?auto=1&nomic&sub=zh${flag('--alt') ? '&alt=1' : ''}`;
    await cdp('Page.navigate', { url: P.url });
    for (let i = 0; i < 80; i++) { await sleep(250); if (await ev(`!!document.getElementById('startBtn') && document.readyState === 'complete'`)) break; }
    await sleep(1500);
    const start = await ev(`(() => { const b = document.getElementById('startBtn'); if (!b) return 'no #startBtn'; b.click(); return b.textContent; })()`);
    P.start = start;
    const t0 = Date.now(); let last = null;
    while (Date.now() - t0 < SECS * 1000) {
      await sleep(100);
      const s = await ev(`(() => { const c = document.getElementById('cmd'), i = document.getElementById('intro') || document.querySelector('.intro'), b = document.getElementById('startBtn');
        return [c ? c.textContent.trim() : null, location.pathname, !!(i && !i.classList.contains('hidden') && getComputedStyle(i).display !== 'none'), b ? b.textContent : ''] })()`);
      if (!s) continue;
      const [cmd, where, cover, label] = s, t = (Date.now() - t0) / 1000;
      if (cmd !== null && cmd !== last) { P.cmds.push([+t.toFixed(1), cmd]); last = cmd; }
      if (!where.startsWith(`/${REL}`)) { P.left = where; break; }
      if (t > 8 && cover && /もう一度|Play again|再玩|다시/.test(label)) { P.ended = true; break; }
    }
    P.secs = Math.round((Date.now() - t0) / 1000);
    if (P.ended || P.left) P.endOk = P.ended && !P.left;
    P.bad = [...new Set(P.bad)].filter((u) => !/favicon\.ico/.test(u)); P.nozh = [...new Set(P.nozh)];
    handlers.length = 0;
  }

  if (!flag('--no-mobile')) {
    // check_mobile.html reads the demo list from nav.js with fetch() (no ?v=) → answer that one request with just this folder
    await cdp('Fetch.enable', { patterns: [{ urlPattern: '*/demos/shared/nav.js', requestStage: 'Request' }] });
    handlers.push(async (m) => {
      if (m.method !== 'Fetch.requestPaused') return;
      const body = Buffer.from(`const DEMOS = [\n  { cat: '${CAT}', dir: '${DIR}' },\n];\n`).toString('base64');
      cdp('Fetch.fulfillRequest', { requestId: m.params.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/javascript' }], body });
    });
    await cdp('Page.navigate', { url: `${base}/tools/web/check_mobile.html?only=${encodeURIComponent(DIR)}` });
    const t0 = Date.now();
    while (Date.now() - t0 < 600 * 1000) { await sleep(2000); if (await ev('!!window.DONE')) break; }
    const R = await ev('JSON.stringify(window.RESULTS || [])');
    const rows = JSON.parse(R || '[]');
    out.mobile = rows.map((r) => {
      const touch = +r.size.split('x')[0] <= 1100, scroll = (m) => m && (m.scrollY > 0 || m.scrollX > 0), p = [];
      if (scroll(r.cover)) p.push(`cover scroll Y+${r.cover.scrollY} X+${r.cover.scrollX}`);
      if (scroll(r.play)) p.push(`play scroll Y+${r.play.scrollY} X+${r.play.scrollX}`);
      for (const [k, m] of [['cover', r.cover], ['play', r.play], ['drawer', r.drawer], ['answers', r.answers]]) {
        if (m?.off?.length) p.push(`${k} off-screen: ${m.off.join(', ')}`);
        if (m?.small?.length && (touch || k === 'drawer')) p.push(`${k} <44px: ${m.small.join(', ')}`);
      }
      if (r.guide?.issues?.length) p.push(`guide: ${r.guide.issues.join('; ')}`);
      return { size: r.size, layout: r.layout, problems: p };
    });
    if (!rows.length) out.errors.push('check_mobile.html returned no rows (not finished in 600 s?)');
    handlers.length = 0; await cdp('Fetch.disable');
  }

  if (!flag('--no-drag')) {
    // drag doesn't scroll (guide §7.1, shared/gesture.js): a phone-sized page with touch emulation; real CDP touch strokes on the picture
    // (vertical zigzag, horizontal back-and-forth, a swipe from the left screen edge, a double tap) must reach the page as pointer events
    // without pointercancel, and the page scroll / visualViewport (offset + zoom) must not move. --block-gesture = the page without gesture.js.
    if (flag('--block-gesture')) {
      await cdp('Fetch.enable', { patterns: [{ urlPattern: '*/demos/shared/gesture.js*', requestStage: 'Request' }] });
      handlers.push((m) => { if (m.method === 'Fetch.requestPaused') cdp('Fetch.failRequest', { requestId: m.params.requestId, errorReason: 'BlockedByClient' }); });
    }
    const D = out.drag = [];
    const touch = (type, pts) => cdp('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y]) => ({ x, y, radiusX: 6, radiusY: 6, force: 1 })) });
    const swipe = async (path) => { await touch('touchStart', [path[0]]); for (const p of path.slice(1)) { await sleep(16); await touch('touchMove', [p]); } await sleep(16); await touch('touchEnd', []); await sleep(250); };
    const SNAP = `({ sx: scrollX, sy: scrollY, se: (document.scrollingElement || document.documentElement).scrollTop, vx: visualViewport.offsetLeft, vy: visualViewport.offsetTop, vs: visualViewport.scale })`;
    for (const [w, h] of [[390, 844], [844, 390]]) {
      await cdp('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 3, mobile: true });
      await cdp('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
      await cdp('Page.navigate', { url: `${base}/${REL}/?nomic&sub=en` });
      for (let i = 0; i < 80; i++) { await sleep(250); if (await ev(`!!document.querySelector('.stage') && document.readyState === 'complete'`)) break; }
      await sleep(1200);
      await ev(`(() => { const g = window.__dg = { down: 0, move: 0, up: 0, cancel: 0, ctx: 0 };
        for (const [k, n] of [['down', 'pointerdown'], ['move', 'pointermove'], ['up', 'pointerup'], ['cancel', 'pointercancel']]) addEventListener(n, (e) => { if (e.pointerType === 'touch') g[k]++; }, true);
        addEventListener('contextmenu', (e) => { if (!e.defaultPrevented) g.ctx++; });
        const b = document.getElementById('startBtn'); g.tap = 0; b?.addEventListener('click', () => g.tap++); return 1; })()`);
      const sb = await ev(`(() => { const b = document.querySelector('.u2-start') || document.getElementById('startBtn'); if (!b) return null; const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
      if (sb) { await touch('touchStart', [sb]); await sleep(40); await touch('touchEnd', []); await sleep(400); }   // a REAL tap: buttons on the guarded stage must still click
      await ev(`(() => { if (!window.__dg.tap) { document.getElementById('startBtn')?.click(); } return 1; })()`);
      await sleep(2500);
      const g = await ev(`(() => { const s = document.querySelector('.stage-col .stage') || document.querySelector('.stage'); const r = s.getBoundingClientRect();
        return { l: r.left, t: r.top, w: r.width, h: r.height, gesture: !!window.MoHeatGesture, ta: getComputedStyle(s).touchAction, before: ${SNAP} }; })()`);
      const R = { size: `${w}x${h}`, gesture: g.gesture, touchAction: g.ta, problems: [] };
      const cx = g.l + g.w / 2, cy = g.t + g.h / 2, ax = g.w * .3, ay = g.h * .3;
      const zig = [], hor = [], edge = [];
      for (let i = 0; i <= 24; i++) { zig.push([cx + ax * .3 * Math.sin(i / 5), cy + ay * Math.sin(i / 2)]); hor.push([cx + ax * Math.sin(i / 2), cy + 3 * Math.sin(i)]); }
      for (let i = 0; i <= 12; i++) edge.push([Math.max(2, g.l + 2) + i * 14, cy]);
      await swipe(zig); await swipe(hor); await swipe(edge);
      await touch('touchStart', [[cx, cy]]); await touch('touchEnd', []); await sleep(80); await touch('touchStart', [[cx, cy]]); await touch('touchEnd', []); await sleep(500);   // double tap
      const a = await ev(`({ after: ${SNAP}, c: window.__dg })`);
      Object.assign(R, { counts: a.c, before: g.before, after: a.after });
      const b = g.before, f = a.after;
      if (f.sx !== b.sx || f.sy !== b.sy || f.se !== b.se) R.problems.push(`page scrolled (${b.sx},${b.sy}) → (${f.sx},${f.sy})`);
      if (Math.abs(f.vx - b.vx) > .5 || Math.abs(f.vy - b.vy) > .5) R.problems.push(`visual viewport moved (${b.vx},${b.vy}) → (${f.vx},${f.vy})`);
      if (Math.abs(f.vs - b.vs) > .001) R.problems.push(`zoomed ×${b.vs} → ×${f.vs}`);
      if (a.c.cancel) R.problems.push(`${a.c.cancel} pointercancel (the browser took the gesture)`);
      if (a.c.move < 40) R.problems.push(`only ${a.c.move} touch pointermove reached the page`);
      if (a.c.ctx) R.problems.push(`${a.c.ctx} context menu(s)`);
      if (sb && !a.c.tap) R.problems.push('a real tap on Start produced no click');
      D.push(R);
    }
    await cdp('Emulation.setTouchEmulationEnabled', { enabled: false }); await cdp('Emulation.clearDeviceMetricsOverride');
  }
  done();
})().catch((e) => { out.errors.push(String(e && e.stack || e)); process.stdout.write(JSON.stringify(out) + '\n', () => process.exit(0)); });
