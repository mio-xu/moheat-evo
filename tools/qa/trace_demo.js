#!/usr/bin/env node
// Behaviour trace of one demo page — proves that a migration (move to a category _kit, remove <base>, engine port) changes NOTHING
// the viewer sees / feels (docs/engine/2026-11-08_engine_plan.md §4.2, DEMO_DESIGN_GUIDE §14).
//
//   node tools/qa/trace_demo.js <demo folder> [--out trace.json] [--secs 90] [--alt] [--lang en] [--shots 0,4,12,30] [--seed 1] [--click] [--root DIR]
//   node tools/qa/trace_demo.js --diff before.json after.json [--tol 1.5] [--px 0.5]      → exit 1 when they differ
//
// Record: own python http.server + own headless Chrome on free ports (never a tab someone is using, §11.1), Math.random replaced by a
// seeded PRNG before any page script runs, <demo>/?auto=1&nomic&sub=<lang>(&alt=1); clicks #startBtn and samples every 100 ms:
//   subs     the #subs text (subtitle timeline: [t, text] on every change)
//   cmd      the #cmd text (the thermal command stream the device would get)
//   ui       the visible answer buttons (.ch / .act-btn / .chip-c / #micGate) — when choices appear
//   reqs     every response: path + bytes (a moved file shows up as same name + same size under a new path)
//   shots    PNG screenshots of the stage at fixed seconds (0 = the cover before Start), written next to --out
//   errors   uncaught exceptions, console.error, failed requests (≥ 400 / network errors)
// Diff: same subtitle and command sequences (order exact, times within --tol s — real time, not virtual), same answer-button
// sequence, same files by name + size (paths may change), screenshots differ in < --px % of pixels (python3 + Pillow), no new errors.
const { spawn, spawnSync } = require('child_process');
const path = require('path'), fs = require('fs'), net = require('net'), os = require('os');
const ROOT = path.resolve(__dirname, '..', '..');
const argv = process.argv.slice(2), flag = (f) => argv.includes(f);
const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const OPTS = ['--root', '--out', '--secs', '--lang', '--shots', '--seed', '--tol', '--px'];
const pos = argv.filter((a, i) => !a.startsWith('--') && !(i && OPTS.includes(argv[i - 1])));

if (flag('--diff')) process.exit(diff(pos[0], pos[1]));
if (!pos[0]) { console.error('usage: node tools/qa/trace_demo.js <demo folder> [--out f.json] [--secs 90] [--alt] [--lang en] [--shots 0,4,12,30]\n       node tools/qa/trace_demo.js --diff a.json b.json'); process.exit(2); }

const DEMO = path.resolve(pos[0]), REL = path.relative(ROOT, DEMO).split(path.sep).join('/');
const SECS = +opt('--secs', 90), LANG = opt('--lang', 'en'), SEED = +opt('--seed', 1);
const SHOTS = opt('--shots', '0,4,12,30').split(',').map(Number).filter((x) => x <= SECS);
const OUT = path.resolve(opt('--out', path.join(os.tmpdir(), `trace_${path.basename(DEMO)}${flag('--alt') ? '_alt' : ''}.json`)));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const CLICK = flag('--click');   // pages without ?auto: click the first visible answer button after it has been shown for 2 s
const T = { demo: REL, lang: LANG, alt: flag('--alt'), seed: SEED, secs: SECS, start: null, ended: false, subs: [], cmd: [], ui: [], reqs: {}, shots: {}, errors: [] };

const SEEDED = `(() => { let a = ${SEED} >>> 0 || 1; Math.random = function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; try { localStorage.setItem('moheat.guide', 'done'); } catch (e) {} })();`;

(async () => {
  const hp = await freePort(), dp = await freePort();
  // --root DIR: serve another tree laid out like the repo (e.g. a mirror where only the files of the old version are swapped in) —
  // the "before" trace of a change that is already in the working tree, without touching the shared working tree
  const http = spawn('python3', ['-m', 'http.server', String(hp), '--bind', '127.0.0.1'], { cwd: path.resolve(opt('--root', ROOT)), stdio: 'ignore' });
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'qatrace-'));
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${dp}`, `--user-data-dir=${prof}`, '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    '--window-size=1440,900', '--mute-audio', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  const done = (code = 0) => { try { chrome.kill(); } catch {} try { http.kill(); } catch {} try { fs.rmSync(prof, { recursive: true, force: true }); } catch {}
    fs.writeFileSync(OUT, JSON.stringify(T, null, 1)); console.log(`trace: ${OUT}  (${T.subs.length} subtitles, ${T.cmd.length} commands, ${T.ui.length} answer sets, ${Object.keys(T.reqs).length} files, ${T.errors.length} errors)`); process.exit(code); };
  setTimeout(() => { T.errors.push('trace timeout'); done(1); }, (SECS + 120) * 1000);
  let ws;
  for (let i = 0; i < 60 && !ws; i++) {
    await sleep(250);
    try { const l = await (await fetch(`http://127.0.0.1:${dp}/json/list`)).json(); const pg = l.find((x) => x.type === 'page'); if (pg) ws = pg.webSocketDebuggerUrl; } catch {}
  }
  if (!ws) { T.errors.push('Chrome did not start'); return done(1); }
  const sock = new WebSocket(ws); await new Promise((r) => sock.addEventListener('open', r));
  let id = 0; const wait = {}, reqs = {};
  const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; wait[i] = r; sock.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => { const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result?.result?.value; };
  const base = `http://127.0.0.1:${hp}`;
  sock.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && wait[m.id]) { wait[m.id](m); delete wait[m.id]; return; }
    const p = m.params || {};
    if (m.method === 'Network.responseReceived') {
      const u = p.response.url.replace(base, '').split('?')[0];
      reqs[p.requestId] = u;
      if (p.response.status >= 400 && !/favicon/.test(u)) T.errors.push(`request ${p.response.status} ${u}`);
    } else if (m.method === 'Network.loadingFinished' && reqs[p.requestId]) {
      const u = reqs[p.requestId]; if (u.startsWith('/')) T.reqs[decodeURIComponent(u)] = Math.max(T.reqs[decodeURIComponent(u)] || 0, p.encodedDataLength);
    } else if (m.method === 'Network.loadingFailed' && !p.canceled && !/ERR_ABORTED|ERR_CACHE_MISS/.test(p.errorText)) T.errors.push(`request ${p.errorText}`);
    else if (m.method === 'Runtime.exceptionThrown') { const d = p.exceptionDetails; T.errors.push(`exception ${(d.exception?.description || d.text || '').split('\n')[0]}`.slice(0, 200)); }
    else if (m.method === 'Runtime.consoleAPICalled' && p.type === 'error') T.errors.push(`console ${p.args.map((a) => a.value ?? a.description ?? '').join(' ')}`.slice(0, 200));
  });
  await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Network.enable'); await cdp('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: SEEDED });
  await cdp('Page.navigate', { url: `${base}/${REL}/?auto=1&nomic&sub=${LANG}${T.alt ? '&alt=1' : ''}` });
  for (let i = 0; i < 80; i++) { await sleep(250); if (await ev(`!!document.getElementById('startBtn') && document.readyState === 'complete'`)) break; }
  await sleep(2000);
  const stem = OUT.replace(/\.json$/, '');
  const shot = async (sec) => {
    const r = await cdp('Page.captureScreenshot', { format: 'png' });
    if (r.result?.data) { const f = `${stem}_${String(sec).padStart(3, '0')}s.png`; fs.writeFileSync(f, Buffer.from(r.result.data, 'base64')); T.shots[sec] = path.basename(f); }
  };
  if (SHOTS.includes(0)) await shot(0);
  T.start = await ev(`(() => { const b = document.getElementById('startBtn'); if (!b) return null; b.click(); return b.textContent.trim(); })()`);
  const t0 = Date.now(); let last = {}; const pending = SHOTS.filter((s) => s > 0);
  while (Date.now() - t0 < SECS * 1000) {
    await sleep(100);
    const s = await ev(`(() => { const q = (s) => document.querySelector(s), vis = (e) => e && e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden';
      const ui = [...document.querySelectorAll('.ch, .act-btn, .chip-c, #micGate')].filter(vis).map((e) => e.textContent.replace(/\\s+/g, ' ').trim()).join(' | ');
      const i = q('#intro') || q('.intro'), b = q('#startBtn');
      return [q('#subs') ? q('#subs').innerText.replace(/\\s+/g, ' ').trim() : '', q('#cmd') ? q('#cmd').textContent.trim() : '', ui,
        !!(i && !i.classList.contains('hidden') && getComputedStyle(i).display !== 'none') && /もう一度|Play again|再玩/.test(b ? b.textContent : '')]; })()`);
    if (!s) continue;
    const t = +((Date.now() - t0) / 1000).toFixed(1), [sub, cmd, ui, end] = s;
    if (sub !== last.sub) { if (sub) T.subs.push([t, sub]); last.sub = sub; }
    if (cmd !== last.cmd) { T.cmd.push([t, cmd]); last.cmd = cmd; }
    if (ui !== last.ui) { if (ui) T.ui.push([t, ui]); last.ui = ui; last.uiT = t; }
    if (CLICK && ui && t - last.uiT >= 2) { last.uiT = t + 3; await ev(`(() => { const e = [...document.querySelectorAll('.ch, .act-btn, .chip-c, #micGate')].find((e) => e.offsetParent !== null);
      if (!e) return; for (const n of ['pointerdown', 'mousedown']) e.dispatchEvent(new MouseEvent(n, { bubbles: true }));
      setTimeout(() => { for (const n of ['pointerup', 'mouseup', 'click']) e.dispatchEvent(new MouseEvent(n, { bubbles: true })); }, 2500); })()`); }
    while (pending.length && t >= pending[0]) await shot(pending.shift());
    if (t > 8 && end) { T.ended = true; break; }
  }
  T.errors = [...new Set(T.errors)];
  done(0);
})().catch((e) => { T.errors.push(String(e && e.stack || e)); fs.writeFileSync(OUT, JSON.stringify(T, null, 1)); process.exit(1); });

function diff(a, b) {
  if (!a || !b) { console.error('usage: --diff before.json after.json'); return 2; }
  const A = JSON.parse(fs.readFileSync(a)), B = JSON.parse(fs.readFileSync(b)), TOL = +opt('--tol', 1.5), PX = +opt('--px', 0.5);
  const bad = [], ok = [];
  const seq = (name, x, y, num) => {
    // compare in the window both traces covered (the shorter one decides)
    const end = Math.min(x.length ? x[x.length - 1][0] : 0, y.length ? y[y.length - 1][0] : 0);
    const xs = x.filter((e) => e[0] <= end + TOL), ys = y.filter((e) => e[0] <= end + TOL);
    const n = Math.min(xs.length, ys.length); let worst = 0;
    for (let i = 0; i < n; i++) {
      if (xs[i][1] !== ys[i][1]) { bad.push(`${name} #${i}: "${xs[i][1].slice(0, 80)}" @${xs[i][0]}s ≠ "${ys[i][1].slice(0, 80)}" @${ys[i][0]}s`); return; }
      worst = Math.max(worst, Math.abs(xs[i][0] - ys[i][0]));
    }
    if (Math.abs(xs.length - ys.length) > 1) bad.push(`${name}: ${xs.length} vs ${ys.length} events in the common window`);
    else if (worst > TOL) bad.push(`${name}: same ${n} events but timing drifts up to ${worst.toFixed(1)} s (> ${TOL})`);
    else ok.push(`${name}: ${n} events identical (timing within ${worst.toFixed(1)} s)`);
  };
  seq('subtitles', A.subs, B.subs); seq('answer buttons', A.ui, B.ui); curve(A.cmd, B.cmd);
  // thermal: sampled every 100 ms while values ramp → compare as curves: every command of one run must be matched in the other run
  // by a command within ±TOL s whose LC / LH / RC / RH each differ by ≤ 12 (of 0–200), and the same STOP / mode words
  function curve(x, y) {
    const num = (c) => { const v = {}; for (const [, k, n] of c.matchAll(/\b([LR][CH])(\d+)/g)) v[k] = +n; return v; };
    const word = (c) => c.replace(/\d+/g, '#');
    const end = Math.min(x.length ? x[x.length - 1][0] : 0, y.length ? y[y.length - 1][0] : 0);
    const miss = (p, q) => p.filter(([t, c]) => t <= end && !q.some(([u, d]) => Math.abs(u - t) <= TOL && word(c) === word(d) &&
      ['LC', 'LH', 'RC', 'RH'].every((k) => Math.abs((num(c)[k] || 0) - (num(d)[k] || 0)) <= 12)));
    const m = [...miss(x, y), ...miss(y, x)];
    if (m.length) bad.push(`thermal #cmd: ${m.length} command(s) without a match within ${TOL} s / ±12, first "${m[0][1]}" @${m[0][0]}s`);
    else ok.push(`thermal #cmd: ${x.length} / ${y.length} samples, same curve (±${TOL} s, ±12)`);
  }
  // files: same set of (file name, bytes); a changed path with the same name + size = moved
  const key = (r) => Object.entries(r).map(([p, n]) => `${path.basename(p)}|${n}`);
  const ka = new Set(key(A.reqs)), kb = new Set(key(B.reqs));
  const gone = [...ka].filter((k) => !kb.has(k)), extra = [...kb].filter((k) => !ka.has(k));
  const moved = Object.keys(B.reqs).filter((p) => !(p in A.reqs)).length;
  // files that only load late (voices, clips) may fall outside the shorter run: only report files present in both runs' windows
  if (gone.length || extra.length) bad.push(`files: missing after [${gone.slice(0, 8).join(', ')}] · new after [${extra.slice(0, 8).join(', ')}]`);
  else ok.push(`files: ${ka.size} identical by name + size (${moved} under a new path)`);
  const ea = new Set(A.errors), newErr = B.errors.filter((e) => !ea.has(e));
  if (newErr.length) bad.push(`new errors: ${newErr.slice(0, 5).join(' · ')}`); else ok.push(`errors: no new ones (${B.errors.length} total)`);
  for (const s of Object.keys(A.shots)) {
    if (!B.shots[s]) { bad.push(`screenshot ${s}s missing after`); continue; }
    const fa = path.join(path.dirname(path.resolve(a)), A.shots[s]), fb = path.join(path.dirname(path.resolve(b)), B.shots[s]);
    const r = spawnSync('python3', ['-c', `import sys
from PIL import Image, ImageChops
a = Image.open(sys.argv[1]).convert('RGB'); b = Image.open(sys.argv[2]).convert('RGB')
if a.size != b.size: print(100.0); sys.exit()
d = ImageChops.difference(a, b).convert('L').point(lambda v: 255 if v > 24 else 0)
print(round(100 * d.histogram()[255] / (a.size[0] * a.size[1]), 3))`, fa, fb], { encoding: 'utf8' });
    const pct = parseFloat(r.stdout);
    if (isNaN(pct)) bad.push(`screenshot ${s}s: could not compare (${(r.stderr || '').trim().split('\n').pop()})`);
    else if (pct > PX) bad.push(`screenshot ${s}s: ${pct}% of pixels differ (> ${PX}%; animated layers move — look at both PNGs)`);
    else ok.push(`screenshot ${s}s: ${pct}% pixels differ`);
  }
  console.log(`${A.demo}  →  ${B.demo}`);
  for (const o of ok) console.log(`  ✓ ${o}`);
  for (const o of bad) console.log(`  ✗ ${o}`);
  console.log(bad.length ? `DIFFERENT (${bad.length})` : 'IDENTICAL');
  return bad.length ? 1 : 0;
}
