#!/usr/bin/env node
// Lip-sync check of a layered demo (DEMO_DESIGN_GUIDE §6 step 5, mouth QA; user 2026-11-08 "嘴的部分都要重点检查").
//
//   node tools/art/check_mouth.js demos/for-men/Demo25_HatsumodeDate [seconds=120] [--alt] [--shots]
//
// Runs the demo in its own headless Chrome (own http.server port, ?auto=1&nomic, autoplay allowed), samples
// MoHeatLayers.state() (demos/shared/layers.js) every frame while the lines play, and reports:
//   SILENT-OPEN   the mouth is open ≥ 0.15 s while the voice level is 0 (opens in silence / follows something else)
//   NO-MOVE       the voice speaks ≥ 0.6 s in a view but the mouth never opens (missing hook, wrong view, no mouth patch)
//   NO-PATCH      a view where the character talks has no 'mouth' patch at all
//   UNMAPPED      the voice talks in a view that is not in media/layers.js views / alias (its mouth can never move)
//   HALF          share of talking frames with a half-faded mouth (double lips) > 8 %
//   FLICKER       > 14 open/close switches per second
//   STUCK-OPEN    open > 1.2 s without closing (follows phrases, not syllables)
//   WRONG-MOUTH   several characters in one view (media/layers.js "more" / char.who): a figure's mouth is open while someone else speaks
//   FIG-NO-MOVE   …or a figure in the view speaks ≥ 0.6 s there and its own mouth never opens
// --query=a=1&b=2 adds page parameters (e.g. --query=talk=MHN&place=hall: the もっと話す group views of Demo43).
// --shots: when the mouth is open in a view for the first time, saves the canvas to <demo>/assets/mouth_check/<view>_open.png
// (and a closed one), so the open mouth can be looked at 2× in the real composite.
// Exit code 1 if anything is flagged. Static patch checks (alignment, seams, patch outside the character): tools/art/check_patches.py.
require('../qa/chrome_guard');   // closes its browser on any exit; one browser per agent (MOHEAT_MAX_BROWSERS)
const { spawn } = require('child_process');
const path = require('path'), fs = require('fs'), net = require('net');
const ROOT = path.resolve(__dirname, '..', '..');
const args = process.argv.slice(2), flags = new Set(args.filter((a) => a.startsWith('--')));
const pos = args.filter((a) => !a.startsWith('--'));
if (!pos[0]) { console.error('usage: node tools/art/check_mouth.js <demo folder> [seconds] [--alt] [--shots]'); process.exit(2); }
const DEMO = path.resolve(pos[0]), SECS = +(pos[1] || 120), REL = path.relative(ROOT, DEMO).split(path.sep).join('/');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });

(async () => {
  const hp = await freePort(), dp = await freePort();
  const http = spawn('python3', ['-m', 'http.server', String(hp), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  const prof = fs.mkdtempSync(path.join(require('os').tmpdir(), 'mouthchk-'));
  const extra = (args.find((a) => a.startsWith('--query=')) || '').slice(8);
  const url = `http://127.0.0.1:${hp}/${REL}/?auto=1&nomic&sub=en${flags.has('--alt') ? '&alt=1' : ''}${extra ? '&' + extra : ''}`;
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${dp}`, `--user-data-dir=${prof}`, '--autoplay-policy=no-user-gesture-required',
    ...(process.env.MOUTH_ANGLE === 'swiftshader' ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--use-angle=metal', '--enable-gpu']),
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--window-size=1280,720', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
  const done = (code) => { try { chrome.kill(); } catch {} try { http.kill(); } catch {} try { fs.rmSync(prof, { recursive: true, force: true }); } catch {} process.exit(code); };
  let ws;
  for (let i = 0; i < 50 && !ws; i++) {
    await sleep(200);
    try { const l = await (await fetch(`http://127.0.0.1:${dp}/json/list`)).json(); const pg = l.find((x) => x.type === 'page'); if (pg) ws = pg.webSocketDebuggerUrl; } catch {}
  }
  if (!ws) { console.error('Chrome did not start'); done(2); }
  const sock = new WebSocket(ws); await new Promise((r) => sock.addEventListener('open', r));
  let id = 0; const wait = {};
  sock.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && wait[m.id]) { wait[m.id](m); delete wait[m.id]; } });
  const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; wait[i] = r; sock.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => { const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result?.result?.value; };
  await cdp('Page.enable'); await cdp('Page.navigate', { url });
  for (let i = 0; i < 60; i++) { await sleep(250); if (await ev(`!!document.getElementById('startBtn') && document.readyState === 'complete'`)) break; }
  await sleep(1500);
  const has = await ev(`typeof (window.MoHeatLayers || {}).state === 'function'`);
  if (!has) { console.error(`${REL}: MoHeatLayers.state() missing — not a layered page, ?flat, WebGL off, or an old shared/layers.js (cache / ?v=)`); done(1); }
  await ev(`(() => { const b = document.getElementById('startBtn'); if (b.offsetParent !== null) b.click(); return 1; })()`);   // not when the page already started itself (?talk / ?autoplay)
  // the sampler: every animation frame, while a layered still is drawn
  await ev(`(() => { const L = window.__mouth = []; const t0 = performance.now(); const f = () => { const s = MoHeatLayers.state();
    L.push([(performance.now() - t0) / 1000, s.mouth, s.tgt, s.view, s.stem || '', s.patches.join('+'), s.rel, s.level || 0, s.speaker ?? null, s.figs || null]); if (L.length < 60 * ${SECS + 10}) requestAnimationFrame(f); }; requestAnimationFrame(f); return 1; })()`);
  const shots = {}; const outDir = path.join(DEMO, 'assets', 'mouth_check');
  const t0 = Date.now();
  while (Date.now() - t0 < SECS * 1000) {
    await sleep(flags.has('--shots') ? 120 : 1000);
    if (flags.has('--shots')) {
      const s = await ev(`(() => { const s = MoHeatLayers.state(); return [s.view, s.mouth] })()`);
      if (s) for (const [k, ok] of [['open', s[1] >= 1], ['closed', s[1] <= 0]]) if (ok && !shots[`${s[0]}_${k}`]) {
        const png = await ev(`(() => { const c = [...document.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height)[0]; return c && c.toDataURL('image/png'); })()`);
        if (png) { fs.mkdirSync(outDir, { recursive: true }); fs.writeFileSync(path.join(outDir, `${s[0]}_${k}.png`), Buffer.from(png.split(',')[1], 'base64')); shots[`${s[0]}_${k}`] = 1; }
      }
    }
    if (await ev(`!!(window.__done || document.querySelector('.ending.show, #end.show, #outro.show'))`)) break;
  }
  const L = await ev(`window.__mouth`) || [];
  if (flags.has('--dump')) { fs.mkdirSync(path.join(DEMO, 'assets', 'mouth_check'), { recursive: true }); fs.writeFileSync(path.join(DEMO, 'assets', 'mouth_check', 'trace.json'), JSON.stringify(L)); }
  // ---- analysis
  const issues = [], perView = {};
  let silentRun = 0, sw = 0, last = 0, half = 0, talkFrames = 0, openRun = 0;
  const T = L.length ? L[L.length - 1][0] : 0;
  for (let i = 0; i < L.length; i++) {
    const [t, m, tgt, view, stem, pk] = L[i], dt = i ? t - L[i - 1][0] : 0;
    const v = perView[view] || (perView[view] = { talk: 0, open: 0, stem, pk });

    if (tgt > .32) { v.talk += dt; talkFrames++; if (m > .05 && m < .95) half++; }
    if (m >= .95) v.open += dt;
    silentRun = m > .5 && tgt <= .001 ? silentRun + dt : 0;
    if (silentRun >= .15 && !issues.some((x) => x.startsWith(`SILENT-OPEN ${view}`))) issues.push(`SILENT-OPEN ${view} at ${t.toFixed(1)} s: mouth open with no voice`);
    const o = m > .5 ? 1 : 0; if (o !== last) { sw++; last = o; }
    openRun = o ? openRun + dt : 0;
    if (openRun > 1.2 && !issues.some((x) => x.startsWith(`STUCK-OPEN ${view}`))) issues.push(`STUCK-OPEN ${view} at ${t.toFixed(1)} s: open > 1.2 s without a break (a frozen mouth, not syllables)`);
  }
  // several characters in one view: only the speaker's mouth, and every speaker's mouth moves
  const figT = {};
  for (let i = 1; i < L.length; i++) {
    const [t, , tgt, view, , , , , spk, figs] = L[i], dt = t - L[i - 1][0];
    if (!figs) continue;
    for (const [who, open] of figs) {
      if (open && who && spk !== who && !issues.some((x) => x.startsWith(`WRONG-MOUTH ${view} ${who}`))) issues.push(`WRONG-MOUTH ${view} ${who} at ${t.toFixed(1)} s: open while ${spk || 'nobody'} speaks`);
      if (who && who === spk) { const k = `${view} ${who}`, f = figT[k] || (figT[k] = { talk: 0, open: 0 }); if (tgt > .32) f.talk += dt; if (open) f.open += dt; }
    }
  }
  for (const [k, f] of Object.entries(figT)) if (f.talk >= .6 && f.open === 0) issues.push(`FIG-NO-MOVE ${k}: speaks ${f.talk.toFixed(1)} s, that figure's mouth never opens`);
  for (const [view, v] of Object.entries(perView)) {
    if (!v.stem) { if (v.talk >= .6) issues.push(`UNMAPPED ${view}: talks ${v.talk.toFixed(1)} s in a view that is not in media/layers.js views / alias`); continue; }   // no character there (an empty queue) is fine
    if (v.talk >= .6 && !v.pk.split('+').some((k) => /^mouth/.test(k))) issues.push(`NO-PATCH ${view}: talks ${v.talk.toFixed(1)} s, no mouth patch`);
    else if (v.talk >= .6 && v.open === 0) issues.push(`NO-MOVE ${view}: talks ${v.talk.toFixed(1)} s, the mouth never opens`);
  }
  if (talkFrames > 30 && half / talkFrames > .08) issues.push(`HALF ${(100 * half / talkFrames).toFixed(0)} % of talking frames have a half-faded mouth (double lips)`);
  if (T > 5 && sw / T > 14) issues.push(`FLICKER ${(sw / T).toFixed(1)} switches / s`);
  console.log(`${REL}: ${L.length} frames, ${T.toFixed(0)} s (${(L.length / (T || 1)).toFixed(0)} fps)`);
  if (L.length / (T || 1) < 20) console.log('  (low frame rate: open / close timing is approximate)');
  for (const [k, f] of Object.entries(figT)) console.log(`  figure ${k.padEnd(12)} speaking ${f.talk.toFixed(1).padStart(5)} s  open ${f.open.toFixed(1).padStart(5)} s`);
  for (const [view, v] of Object.entries(perView)) console.log(`  ${view.padEnd(12)} talking ${v.talk.toFixed(1).padStart(5)} s  open ${v.open.toFixed(1).padStart(5)} s  patches ${v.pk || '-'}`);
  { const h = [0, 0, 0, 0, 0]; let n = 0; for (const r of L) if (r[1] >= .95 && r[7]) { h[Math.min(4, r[7])]++; n++; }   // mouth sets: how wide while open
    if (n) console.log(`  mouth-set levels while open: ${h.slice(1).map((c, i) => `lv${i + 1} ${(100 * c / n).toFixed(0)} %`).filter((x) => !/ 0 %$/.test(x)).join(', ')}`); }
  if (Object.keys(shots).length) console.log(`  shots: ${path.relative(ROOT, outDir)}/ (${Object.keys(shots).join(', ')})`);
  console.log(issues.length ? issues.map((x) => '  ✗ ' + x).join('\n') : '  ✓ lip-sync OK');
  done(issues.length ? 1 : 0);
})();
