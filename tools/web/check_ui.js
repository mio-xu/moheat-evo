#!/usr/bin/env node
// STRICT UI check (DEMO_DESIGN_GUIDE §7.3 "UI v2"; user 2026-11-08: "any difference in position, size, spacing, font, icon, wording or
// colour of the same element is a bug"). Prints ONE JSON object; exit 1 on any FAIL.
//   node tools/web/check_ui.js [demo folders…] [--sizes 1440x900,390x844t] [--sheet out.jpg] [--shots DIR] [--ref Demo24_GakuCamp]
//   (no folders = every demo in nav.js DEMOS)
// Own http.server + own headless Chrome (one). Every demo is opened with UI v2 on (?ui=2), at each size (t = touch phone), in the states
// cover → playing → paused → ⚙ open → ended, and every element of the shared interface (.u2) is measured: box relative to the stage
// (px), font family / size / weight, colours, background, border, radius, text, icon markup. The result must be IDENTICAL to the
// reference demo, except: the picture (cover image / scene), chapter count + labels, option-picker contents (talk demos), the category
// accent colour (normalised to ACCENT), and the stage box itself is compared separately (layout of the page). Old interface pieces
// that must be gone (the old cover, 🌐 ⛶ 🔊 corner, mode buttons, thermal chip, chapter bar, film transport) = FAIL when visible.
const { spawn } = require('child_process'); const path = require('path'), fs = require('fs'), net = require('net'), os = require('os');
const ROOT = path.resolve(__dirname, '..', '..');
const argv = process.argv.slice(2), opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const SIZES = opt('--sizes', '1440x900,390x844t').split(','), SHEET = opt('--sheet', null), SHOTS = opt('--shots', null), REF = opt('--ref', 'Demo24_GakuCamp');
let DEMOS = argv.filter((a) => !a.startsWith('--'));
if (!DEMOS.length) DEMOS = [...fs.readFileSync(path.join(ROOT, 'demos/shared/nav.js'), 'utf8').matchAll(/\{ cat: '([^']+)', dir: '([^']+)'/g)].map((m) => `demos/${m[1]}/${m[2]}`);
DEMOS = DEMOS.map((d) => path.relative(ROOT, path.resolve(d)).split(path.sep).join('/'));
if (!DEMOS.some((d) => d.endsWith(REF))) DEMOS.unshift(`demos/for-women/${REF}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const OLD = '.stage .intro, .sh-mode, .sh-heat, .sh-bar, .sh-pause, .hud-top, .msub-hud, .ix-chip, .stage-col > .transport, .stage-col > .legend, .sh-marks, .msub-btn, #lrBtn';
const MEASURE = `((OLD) => {
  const st = document.querySelector('.stage-col .stage') || document.querySelector('.stage'), u = st && st.querySelector(':scope > .u2'); if (!u) return { err: 'no .u2 on the stage' };
  const S = st.getBoundingClientRect(), col = (v) => { const d = document.createElement('i'); d.style.color = getComputedStyle(u).getPropertyValue(v).trim(); u.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; };
  const acc = col('--u2-accent'), on = col('--u2-on-accent');   // the category theme (allowed to differ, DEMO_DESIGN_GUIDE §7.3 F)
  const norm = (v) => (v || '').split(acc).join('ACCENT').split(on).join('ON-ACCENT').replace(/rgba?\\(([^)]+)\\)/g, (m) => m.replace(/\\s+/g, ''));
  const vis = (e) => { for (let p = e; p && p !== st; p = p.parentElement) { const c = getComputedStyle(p); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) return false; } const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const SKIP = '.u2-pic, .u2-track > *, .u2-now, .u2-row-opt, .u2-picks, .u2-pop-opt, .u2-tip, .u2-load i';
  const out = {}, sh = document.querySelector('.u2-sheet:not([hidden])'), ALL = [...u.querySelectorAll('*'), ...(sh ? sh.querySelectorAll('*') : [])];
  ALL.forEach((e, i) => {
    if (e.closest(SKIP) || !vis(e)) return; if (e.closest('svg') && e.tagName !== 'svg') return;
    const r = e.getBoundingClientRect(), c = getComputedStyle(e), key = (e.className?.baseVal ?? e.className) + '|' + (e.dataset.mode || e.dataset.lang || e.dataset.k || e.dataset.size || '') + '|' + i;
    out[key.replace(/\\|\\d+$/, '|' + ALL.filter((x) => x.className === e.className && !x.closest(SKIP)).indexOf(e))] = [Math.round(r.left - S.left), Math.round(r.top - S.top), Math.round(r.width), Math.round(r.height),
      c.fontFamily, c.fontSize, c.fontWeight, norm(c.color), norm(c.backgroundColor), norm(c.backgroundImage).slice(0, 80), norm(c.borderTopColor) + ' ' + c.borderTopWidth, c.borderTopLeftRadius, c.opacity,
      e.tagName === 'svg' ? e.innerHTML.length : '', e.children.length ? '' : (e.textContent || '').trim()].join(' ¦ ');
  });
  const old = [...document.querySelectorAll(OLD)].filter(vis).map((e) => (e.id ? '#' + e.id : '.' + [...e.classList].join('.')) + ':' + (e.textContent || '').trim().slice(0, 20));
  return { stage: [Math.round(S.left), Math.round(S.top), Math.round(S.width), Math.round(S.height)], state: u.dataset.state, els: out, old, chapters: u.querySelectorAll('.u2-track > *').length };
})(${JSON.stringify(OLD)})`;
const res = { ref: REF, sizes: SIZES, demos: {}, fails: [], errors: [] };
(async () => {
  const hp = await freePort(), dp = await freePort();
  const http = spawn('python3', ['-m', 'http.server', String(hp), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'checkui-'));
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${dp}`, `--user-data-dir=${prof}`, '--hide-scrollbars', '--mute-audio',
    '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', 'about:blank'], { stdio: 'ignore' });
  const done = () => { try { chrome.kill(); } catch {} try { http.kill(); } catch {} try { fs.rmSync(prof, { recursive: true, force: true }); } catch {}
    process.stdout.write(JSON.stringify(res) + '\n'); process.exit(res.fails.length || res.errors.length ? 1 : 0); };
  setTimeout(() => { res.errors.push('timeout'); done(); }, (120 + DEMOS.length * SIZES.length * 60) * 1000);
  let ws; for (let i = 0; i < 80 && !ws; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${dp}/json/list`)).json(); ws = l.find((x) => x.type === 'page')?.webSocketDebuggerUrl; } catch {} }
  if (!ws) { res.errors.push('no Chrome'); return done(); }
  const sock = new WebSocket(ws); await new Promise((r) => sock.addEventListener('open', r)); let id = 0; const wait = {};
  sock.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && wait[m.id]) { wait[m.id](m); delete wait[m.id]; } });
  const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; wait[i] = r; sock.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (x) => { const r = (await cdp('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true })).result; return r?.result?.value; };
  const shot = async (n) => { if (!SHOTS && !SHEET) return; const dir = SHOTS || fs.mkdtempSync(path.join(os.tmpdir(), 'checkui-shots-')); SHOTS || (res.shotDir = dir);
    fs.mkdirSync(dir, { recursive: true }); const r = await cdp('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(dir, n + '.png'), Buffer.from(r.result.data, 'base64')); return path.join(dir, n + '.png'); };
  await cdp('Page.enable'); await cdp('Runtime.enable');
  await cdp('Page.navigate', { url: `http://127.0.0.1:${hp}/index.html` }); await sleep(400);
  await ev(`(localStorage.clear(), localStorage.setItem('moheat.guide','done'), localStorage.setItem('moheat.ui','2'), localStorage.setItem('moheat.sublang','en'), 1)`);
  const STATES = [['cover', ''], ['playing', `document.querySelector('.u2-start').click()`], ['paused', `MoHeatShell.pause(true)`],
    ['settings', `document.querySelector('.u2-gear').click()`], ['ended', `(MoHeatShell.pause(false), document.querySelector('.u2-gear').click(), (document.getElementById('intro') || document.querySelector('.stage .intro')).classList.remove('hidden'))`]];
  for (const sz of SIZES) {
    const touch = sz.endsWith('t'), [W, H] = sz.replace('t', '').split('x').map(Number);
    await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: touch });
    await cdp('Emulation.setTouchEmulationEnabled', { enabled: touch, maxTouchPoints: touch ? 5 : 0 });
    for (const d of DEMOS) {
      const n = d.split('/').pop(), R = ((res.demos[n] ||= {})[sz] = {});
      try {
        await cdp('Page.navigate', { url: `http://127.0.0.1:${hp}/${d}/?sub=en` });
        for (let i = 0; i < 120; i++) { await sleep(250); if (await ev(`!!document.querySelector('.u2') && ['cover','ended'].includes(document.querySelector('.u2').dataset.state)`)) break; }
        await ev('document.fonts.ready.then(() => 1)'); await ev(`(() => { const s = document.createElement('style'); s.textContent = '.u2, .u2 * { transition: none !important; animation: none !important; }'; document.head.appendChild(s); return 1; })()`); await sleep(800);
        for (const [st, act] of STATES) {
          if (act) { await ev(`(() => { try { ${act}; } catch (e) { return String(e); } return 1; })()`); await sleep(st === 'playing' ? 3500 : 700); }
          if (st === 'paused') await ev(`MoHeatShell.ui2view && MoHeatShell.ui2view.paint(), 1`);
          R[st] = await ev(MEASURE); R[st].shot = await shot(`${n}.${sz}.${st}`);
        }
      } catch (e) { res.errors.push(`${n} ${sz}: ${e}`); }
    }
  }
  // compare with the reference
  for (const sz of SIZES) for (const [n, D] of Object.entries(res.demos)) {
    if (n === REF) continue; const ref = res.demos[REF]?.[sz], cur = D[sz]; if (!ref || !cur) continue;
    for (const st of Object.keys(ref)) {
      const a = ref[st], b = cur[st]; if (!b || b.err) { res.fails.push(`${n} ${sz} ${st}: ${b?.err || 'not measured'}`); continue; }
      if (a.state !== b.state) res.fails.push(`${n} ${sz} ${st}: state ${b.state} ≠ ${a.state}`);
      if (b.old?.length) res.fails.push(`${n} ${sz} ${st}: old interface visible: ${b.old.join(', ')}`);
      if (a.stage.join() !== b.stage.join()) res.fails.push(`${n} ${sz} ${st}: stage box ${b.stage.join(',')} ≠ ${a.stage.join(',')}`);
      for (const k of new Set([...Object.keys(a.els), ...Object.keys(b.els)])) {
        if (a.els[k] !== b.els[k]) res.fails.push(`${n} ${sz} ${st}: ${k.split('|')[0] || '?'} ${b.els[k] ? '' : 'missing'}${a.els[k] ? '' : 'extra'}\n      ref ${a.els[k] || '—'}\n      got ${b.els[k] || '—'}`);
      }
      if (st === 'playing' && b.chapters < 2) res.fails.push(`${n} ${sz}: ${b.chapters} chapters in the bar (every demo needs ≥ 2)`);
    }
  }
  if (SHEET) {   // comparison sheet: per demo one row = the states at the first size, the playing state at the others
    // each cell = the player only (+ the ⚙ sheet on phones, which covers the page): [file, crop box]
    const cell = (D, sz, st) => { const m = D[sz]?.[st]; if (!m?.shot) return ['', null]; const g = m.stage; return [m.shot, st === 'settings' && sz.endsWith('t') ? null : [g[0], g[1], g[0] + g[2], g[1] + g[3]]]; };
    const rows = Object.entries(res.demos).map(([n, D]) => [n, ...SIZES.flatMap((sz, i) => (i ? ['cover', 'playing', 'settings'] : ['cover', 'playing', 'paused', 'settings', 'ended']).map((st) => cell(D, sz, st)))]);
    const py = spawn('python3', ['-c', `
import json, sys
from PIL import Image, ImageDraw
rows = json.load(sys.stdin); W = 360
sheet = None; y = 0; parts = []
for r in rows:
    ims = []
    for f, box in r[1:]:
        try: im = Image.open(f).convert('RGB')
        except Exception: im = Image.new('RGB', (W, 225), '#400')
        if box: im = im.crop(tuple(box))
        w = W if im.width >= im.height else W // 2
        ims.append(im.resize((w, round(w * im.height / im.width))))
    h = max(i.height for i in ims) + 24; row = Image.new('RGB', (sum(i.width + 8 for i in ims) + 8, h), '#15131b'); d = ImageDraw.Draw(row); d.text((8, 4), r[0], fill='#ddd')
    x = 8
    for im in ims: row.paste(im, (x, 22)); x += im.width + 8
    parts.append(row)
S = Image.new('RGB', (max(p.width for p in parts), sum(p.height for p in parts)), '#15131b'); y = 0
for p in parts: S.paste(p, (0, y)); y += p.height
S.save(${JSON.stringify(SHEET)}, quality=78)
`], { stdio: ['pipe', 'inherit', 'inherit'] });
    py.stdin.end(JSON.stringify(rows)); await new Promise((r) => py.on('close', r)); res.sheet = SHEET;
  }
  for (const D of Object.values(res.demos)) for (const R of Object.values(D)) for (const s of Object.values(R)) if (s && s.els) s.els = Object.keys(s.els).length;
  done();
})();
