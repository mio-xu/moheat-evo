#!/usr/bin/env node
// Motion / physics check of a layered demo (DEMO_DESIGN_GUIDE §6.4 animation physics checklist; user 2026-11-08
// "人物细节检查，特别是嘴和眼睛，动画是否符合现实物理"). Lip-sync has its own check: tools/art/check_mouth.js.
//
//   node tools/art/check_motion.js demos/for-men/Demo25_HatsumodeDate [seconds=60] [--shots] [--alt]
//
// Runs the demo in its own headless Chrome (own http.server port, ?auto=1&nomic), then:
//  static, every view of media/layers.js (MoHeatLayers.debug forces the pose):
//   EDGE-GAP      the plate is replaced by magenta and the parallax / breathing pushed to their extremes: magenta ON the frame edge
//                 where the character was at rest (and still is just inside) = the cut-off body / head comes away from the frame edge
//   NO-BLINK      (info) a view without an 'eyes' patch never blinks — fine only if the eyes are drawn closed or hidden
//   --shots       <demo>/assets/motion_check/<stem>_eyes.png: the eyes open | closed | |difference| ×4, cropped from the real
//                 composite at 2× — look for seams, colour shifts, a ghost of the open eye, lashes that do not match
//  while the story plays (sampled every frame from MoHeatLayers.motion()):
//   BLINK-TIME    closed < 0.08 s or > 0.2 s;  BLINK-RATE  mean interval outside 2–6.5 s (≈ 10–30 / min)
//   BLINK-AT-CUT  the eyes are closed in the frame of a view cut (or the cross-fade's first 0.3 s)
//   BREATH        breathing outside 12–20 / min
//   FRAME-DRIFT   the page itself zooms / bobs the layered still (> 0.15 % size or > 0.6 px): the background breathes with her
// Exit code 1 if anything (not info) is flagged.
require('../qa/chrome_guard');   // closes its browser on any exit; one browser per agent (MOHEAT_MAX_BROWSERS)
const { spawn } = require('child_process');
const path = require('path'), fs = require('fs'), net = require('net');
const ROOT = path.resolve(__dirname, '..', '..');
const args = process.argv.slice(2), flags = new Set(args.filter((a) => a.startsWith('--')));
const pos = args.filter((a) => !a.startsWith('--'));
if (!pos[0]) { console.error('usage: node tools/art/check_motion.js <demo folder> [seconds] [--shots] [--alt]'); process.exit(2); }
const DEMO = path.resolve(pos[0]), SECS = +(pos[1] || 60), REL = path.relative(ROOT, DEMO).split(path.sep).join('/');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });

(async () => {
  const hp = await freePort(), dp = await freePort();
  const http = spawn('python3', ['-m', 'http.server', String(hp), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  const prof = fs.mkdtempSync(path.join(require('os').tmpdir(), 'motionchk-'));
  const url = `http://127.0.0.1:${hp}/${REL}/?auto=1&nomic&sub=en${flags.has('--alt') ? '&alt=1' : ''}`;
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${dp}`, `--user-data-dir=${prof}`, '--autoplay-policy=no-user-gesture-required',
    '--use-angle=metal', '--enable-gpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--window-size=1600,900', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
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
  for (let i = 0; i < 60; i++) { await sleep(250); if (await ev(`document.readyState === 'complete'`)) break; }
  await sleep(2500);
  if (!await ev(`typeof (window.MoHeatLayers || {}).motion === 'function'`)) {
    console.error(`${REL}: MoHeatLayers.motion() missing — not a layered page, WebGL off, or an old shared/layers.js (cache / ?v=)`); done(1);
  }
  const issues = [], info = [];
  // ---------------------------------------------------------------- static: every view, forced extremes
  const outDir = path.join(DEMO, 'assets', 'motion_check');
  const stems = await ev(`Object.keys(MOHEAT_LAYERS.views)`);
  for (const stem of stems) {
    const r = await ev(`(async () => {
      const API = MoHeatLayers, V = MOHEAT_LAYERS.views['${stem}'];
      for (let i = 0; i < 100 && !API.render('${stem}'); i++) await new Promise((r) => setTimeout(r, 50));
      const grab = (dbg) => { API.debug = dbg; const g = API.render('${stem}'); const c = document.createElement('canvas'); c.width = g.width; c.height = g.height;
        const x = c.getContext('2d'); x.drawImage(g, 0, 0); return { c, d: x.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height }; };
      const mag = (d, i) => d[i] > 200 && d[i + 1] < 60 && d[i + 2] > 200;
      const rest = grab({ solid: 1, off: [0, 0], lift: 0, blink: 0 }), W = rest.w, H = rest.h;
            let gap = 0, worst = '', gapShot = null;
      for (const [ox, oy, lift] of [[.0125, .008, .0045], [-.0125, .008, .0045], [.0125, -.008, -.0045], [-.0125, -.008, -.0045], [0, .008, .0085], [0, -.008, -.003]]) {
        const e = grab({ solid: 1, off: [ox, oy], lift, blink: 0 }); let n = 0; const pts = [];
        // a gap = a pixel ON the frame edge that was the character at rest, is the plate now, while the character is still there
        // 12 px further in (the body came away from the edge). A silhouette sliding along the edge is not a gap (inside = plate too).
        const K = 12, chk = (x, y, ix, iy) => { const i = (y * W + x) * 4, j = (iy * W + ix) * 4; if (mag(e.d, i) && !mag(rest.d, i) && !mag(e.d, j)) { n++; pts.push([x, y]); } };
        // the longest run along one edge counts (a body cut coming away = a strip; hair strands / thin props = scattered pixels)
        const run = (fn, len) => { let r = 0, m = 0; for (let k = 0; k < len; k++) { const b = n; fn(k); r = n > b ? r + 1 : 0; m = Math.max(m, r); } return m; };
        const runs = [run((x) => chk(x, H - 1, x, H - 1 - K), W), run((x) => chk(x, 0, x, K), W), run((y) => chk(0, y, K, y), H), run((y) => chk(W - 1, y, W - 1 - K, y), H)];
        n = Math.max(...runs);
        if (n > gap) { gap = n; worst = [ox, oy, lift].join(',');
          if (${flags.has('--shots')}) { const x = e.c.getContext('2d'); x.strokeStyle = '#0f0'; x.lineWidth = 3; for (const [px, py] of pts) { x.beginPath(); x.arc(px, py, 14, 0, 7); x.stroke(); } gapShot = e.c.toDataURL('image/jpeg', .8); } }
      }
      let shot = null;
      const eyes = (V.patches || []).filter((p) => p.kind === 'eyes');
      if (${flags.has('--shots')} && eyes.length) {
        const o = grab({ off: [0, 0], lift: 0, blink: 0 }), cl = grab({ off: [0, 0], lift: 0, blink: 1 });
        const ch = V.char, hf = ch.height, wf = hf * (ch.w / ch.h) * (9 / 16), rx = ch.x - wf / 2, ry = ch.y - hf;
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (const p of eyes) { x0 = Math.min(x0, p.rect[0]); y0 = Math.min(y0, p.rect[1]); x1 = Math.max(x1, p.rect[0] + p.rect[2]); y1 = Math.max(y1, p.rect[1] + p.rect[3]); }
        const fx = (px) => ((rx + px / ch.w * wf) - .5) * 1.02 + .5, fy = (py) => ((ry + py / ch.h * hf) - .5) * 1.02 + .5;
        const pad = (x1 - x0) * .15, X0 = Math.max(0, fx(x0 - pad) * W), Y0 = Math.max(0, fy(y0 - pad) * H), X1 = Math.min(W, fx(x1 + pad) * W), Y1 = Math.min(H, fy(y1 + pad) * H);
        const cw = X1 - X0, chh = Y1 - Y0, s = Math.min(2, 1600 / (3 * cw)), out = document.createElement('canvas'); out.width = Math.round(cw * s * 3); out.height = Math.round(chh * s);
        const q = out.getContext('2d'); q.imageSmoothingQuality = 'high';
        q.drawImage(o.c, X0, Y0, cw, chh, 0, 0, cw * s, chh * s); q.drawImage(cl.c, X0, Y0, cw, chh, cw * s, 0, cw * s, chh * s);
        const dc = document.createElement('canvas'); dc.width = W; dc.height = H; const dx = dc.getContext('2d'), id = dx.createImageData(W, H);
        for (let i = 0; i < o.d.length; i += 4) { for (let k = 0; k < 3; k++) id.data[i + k] = Math.min(255, 4 * Math.abs(o.d[i + k] - cl.d[i + k])); id.data[i + 3] = 255; }
        dx.putImageData(id, 0, 0); q.drawImage(dc, X0, Y0, cw, chh, 2 * cw * s, 0, cw * s, chh * s);
        shot = out.toDataURL('image/png');
      }
      API.debug = null;
      return { gap, worst, eyes: eyes.length, shot, gapShot: gap >= 40 ? gapShot : null, view: V.view };
    })()`);
    if (!r) { issues.push(`${stem}: could not render`); continue; }
    if (r.gap >= 40) issues.push(`EDGE-GAP ${stem}: a ${r.gap} px strip of the plate show at the frame edge when the pose moves (off/lift ${r.worst}) — extend the cut-out or set char.y / height past the edge`);
    if (!r.eyes) info.push(`NO-BLINK ${stem} (${r.view}): no eyes patch — OK only if the eyes are drawn closed / hidden`);
    if (r.gapShot) { fs.mkdirSync(outDir, { recursive: true }); fs.writeFileSync(path.join(outDir, `${stem}_edge.jpg`), Buffer.from(r.gapShot.split(',')[1], 'base64')); }
    if (r.shot) { fs.mkdirSync(outDir, { recursive: true }); fs.writeFileSync(path.join(outDir, `${stem}_eyes.png`), Buffer.from(r.shot.split(',')[1], 'base64')); }
  }
  // ---------------------------------------------------------------- dynamic: play the story, sample every frame
  await ev(`(document.getElementById('startBtn') || document.querySelector('[data-start], .start, #start'))?.click(), 1`);
  await ev(`(() => { const L = window.__motion = []; const t0 = performance.now(); const f = () => { const m = MoHeatLayers.motion();
    L.push([(performance.now() - t0) / 1000, m.view, m.blink ? 1 : 0, m.phase, m.draw ? [m.draw.x, m.draw.y, m.draw.w, m.draw.h, m.draw.a, m.draw.t] : null, m.t, m.liveT]);
    if (L.length < 60 * ${SECS + 10}) requestAnimationFrame(f); }; requestAnimationFrame(f); return 1; })()`);
  const t0 = Date.now();
  while (Date.now() - t0 < SECS * 1000) { await sleep(1000); if (await ev(`!!(window.__done || document.querySelector('.ending.show, #end.show, #outro.show, #cleared:not([hidden])'))`)) break; }
  const L = await ev(`window.__motion`) || [], blinks = await ev(`MoHeatLayers.motion().blinks`) || [];
  const T = L.length ? L[L.length - 1][0] : 0;
  // cuts (in the layers' own clock: m.t), blinks against them
  const cuts = []; for (let i = 1; i < L.length; i++) if (L[i][1] !== L[i - 1][1]) cuts.push(L[i][5]);
  const durs = blinks.map(([a, b]) => b - a), starts = blinks.map((b) => b[0]);
  const ls = blinks.map((b) => b[3]), ivs = ls.slice(1).map((s, i) => s - ls[i]).filter((x) => x > .35);   // in animated time   // a double blink's second one is not an interval
  const doubles = starts.slice(1).filter((s, i) => s - starts[i] <= .35).length;
  if (durs.some((d) => d < .08 || d > .2)) issues.push(`BLINK-TIME closed ${Math.min(...durs).toFixed(3)}–${Math.max(...durs).toFixed(3)} s (want 0.08–0.2)`);
  const mean = ivs.length ? ivs.reduce((a, b) => a + b, 0) / ivs.length : 0;
  if (ivs.length >= 4 && (mean < 2 || mean > 6.5)) issues.push(`BLINK-RATE mean interval ${mean.toFixed(1)} s (want 2–6.5)`);
  // frames with the eyes closed in the cut's frame or the 0.3 s after it (a blink started earlier is cut short by layers.js)
  const atCut = []; for (let i = 1; i < L.length; i++) if (L[i][2] && cuts.some((c) => L[i][5] >= c && L[i][5] <= c + .3)) atCut.push(L[i][5]);
  if (atCut.length) issues.push(`BLINK-AT-CUT eyes closed in ${atCut.length} frame(s) right after a view cut (at ${[...new Set(atCut.map((x) => x.toFixed(1)))].join(', ')} s)`);
  // breathing: phase wraps
  let wraps = 0, span = 0; for (let i = 1; i < L.length; i++) { const d = L[i][3] - L[i - 1][3]; if (d < -3) wraps++; span = L[i][6] - L[0][6]; }
  const bpm = span > 0 ? (wraps + (L.length ? (L[L.length - 1][3] - L[0][3]) / (2 * Math.PI) : 0)) / span * 60 : 0;
  if (span > 20 && (bpm < 12 || bpm > 20)) issues.push(`BREATH ${bpm.toFixed(1)} / min (want 12–20 at rest)`);
  // page drift: the active still's draw rect while it is fully shown (alpha 1), per view
  const per = {};
  for (const [, view, , , d] of L) { if (!d || d[4] < .999) continue; const p = per[view] || (per[view] = { w: [], y: [], x: [] }); p.w.push(d[2]); p.y.push(d[1]); p.x.push(d[0]); }
  for (const [view, p] of Object.entries(per)) {
    if (p.w.length < 30) continue;
    const rw = (Math.max(...p.w) - Math.min(...p.w)) / (p.w.reduce((a, b) => a + b, 0) / p.w.length), dy = Math.max(...p.y) - Math.min(...p.y), dx = Math.max(...p.x) - Math.min(...p.x);
    if (rw > .0015 || dy > .6 || dx > .6) issues.push(`FRAME-DRIFT ${view}: the page zooms / moves the layered still (size ±${(50 * rw).toFixed(2)} %, y ${dy.toFixed(1)} px, x ${dx.toFixed(1)} px) — the background breathes; skip the page drift when MoHeatLayers.live`);
  }
  console.log(`${REL}: ${L.length} frames, ${T.toFixed(0)} s (${(L.length / (T || 1)).toFixed(0)} fps), ${cuts.length} cuts`);
  console.log(`  blinks ${blinks.length} (doubles ${doubles}), closed ${durs.length ? Math.min(...durs).toFixed(3) + '–' + Math.max(...durs).toFixed(3) : '-'} s, mean interval ${mean.toFixed(1)} s; breathing ${bpm.toFixed(1)} / min`);
  if (flags.has('--shots')) console.log(`  eye shots: ${path.relative(ROOT, outDir)}/<stem>_eyes.png (open | closed | difference ×4)`);
  for (const x of info) console.log('  · ' + x);
  // starved machine: below 20 fps blink / breathing timing can't be measured. Those failures are "machine busy, retry" (exit 75), never a FAIL; tolerances stay as they are
  const fps = L.length / (T || 1), timing = /^(BLINK-TIME|BLINK-RATE|BLINK-AT-CUT|BREATH) /;
  if (fps < 20 && issues.length && issues.every((x) => timing.test(x))) { console.log(issues.map((x) => '  ? ' + x).join('\n') + `\n  machine busy, retry: only ${fps.toFixed(0)} fps, blink / breathing timing can't be trusted either way`); done(75); return; }
  console.log(issues.length ? issues.map((x) => '  ✗ ' + x).join('\n') : '  ✓ motion OK');
  done(issues.length ? 1 : 0);
})();
