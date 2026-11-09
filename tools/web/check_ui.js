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
require('../qa/chrome_guard');   // closes its browser on any exit; one browser per agent (MOHEAT_MAX_BROWSERS)
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
const OLD = '.stage .intro, .sh-mode, .sh-heat, .sh-bar, .sh-pause, .hud-top .msub-btn, .hud-top .mfs-btn, .hud-top #soundBtn, .msub-hud, .ix-chip, .stage-col > .transport, .stage-col > .legend, .sh-marks, .msub-btn, #lrBtn';
const MEASURE = `((OLD) => {
  const st = document.querySelector('.stage-col .stage') || document.querySelector('.stage'), u = st && st.querySelector(':scope > .u2'); if (!u) return { err: 'no .u2 on the stage' };
  const S = st.getBoundingClientRect(), col = (v) => { const d = document.createElement('i'); d.style.color = getComputedStyle(u).getPropertyValue(v).trim(); u.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; };
  const acc = col('--u2-accent'), on = col('--u2-on-accent');   // the category theme (allowed to differ, DEMO_DESIGN_GUIDE §7.3 F)
  const norm = (v) => (v || '').split(acc).join('ACCENT').split(on).join('ON-ACCENT').replace(/rgba?\\(([^)]+)\\)/g, (m) => m.replace(/\\s+/g, ''));
  const vis = (e) => { for (let p = e; p && p !== st; p = p.parentElement) { const c = getComputedStyle(p); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) return false; } const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const SKIP = '.u2-pic, .u2-track > *, .u2-now, .u2-row-opt, .u2-picks, .u2-pop-opt, .u2-tip, .u2-load i';
  const out = {}, sh = document.querySelector('.u2-sheet:not([hidden])'), un = document.querySelector('.u2-under'), strip = document.querySelector('.u2-strip');
  const ALL = [...u.querySelectorAll('*'), ...(un ? un.querySelectorAll('*') : []), ...(sh ? sh.querySelectorAll('*') : [])];
  if (strip) out['u2-strip|box'] = (() => { const r = strip.getBoundingClientRect(); return [Math.round(r.left - S.left), Math.round(r.top - S.top), Math.round(r.width), Math.round(r.height)].join(' ¦ '); })();
  ALL.forEach((e, i) => {
    if (e.closest(SKIP) || !vis(e)) return; if (e.closest('svg') && e.tagName !== 'svg') return;
    const r = e.getBoundingClientRect(), c = getComputedStyle(e), key = (e.className?.baseVal ?? e.className) + '|' + (e.dataset.mode || e.dataset.lang || e.dataset.k || e.dataset.size || '') + '|' + i;
    out[key.replace(/\\|\\d+$/, '|' + ALL.filter((x) => x.className === e.className && !x.closest(SKIP)).indexOf(e))] = [Math.round(r.left - S.left), Math.round(r.top - S.top), Math.round(r.width), Math.round(r.height),
      c.fontFamily, c.fontSize, c.fontWeight, norm(c.color), norm(c.backgroundColor), norm(c.backgroundImage).slice(0, 80), norm(c.borderTopColor) + ' ' + c.borderTopWidth, c.borderTopLeftRadius, c.opacity,
      e.tagName === 'svg' ? e.innerHTML.length : '', e.children.length ? '' : (e.textContent || '').trim()].join(' ¦ ');
  });
  const old = [...document.querySelectorAll(OLD)].filter(vis).map((e) => (e.id ? '#' + e.id : '.' + [...e.classList].join('.')) + ':' + (e.textContent || '').trim().slice(0, 20));
  // the demo's own controls must never sit under the bar (they could not be pressed): any visible button / input on the stage whose
  // centre is inside the bar's box = FAIL
  // every interactive element of the demo must be reachable: elementFromPoint at its centre must hit it (not the shared interface on top)
  const under = [];
  for (const e of st.querySelectorAll('button, input, select, a[href], [role=button], .act-btn, .ch, .chip-c, .slot, [onclick]')) {
    if (e.closest('.u2') || !vis(e) || e.closest('.intro')) continue; const r = e.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) continue;
    const hit = document.elementFromPoint(cx, cy); if (hit && !e.contains(hit) && hit.closest('.u2, .u2-under, .sh-toast')) under.push((e.className || e.tagName) + ':' + (e.textContent || '').trim().slice(0, 16)); }
  // nothing of the demo's own may disappear because of the shared interface: every demo button that shows with ui2.css switched off must
  // show with it on (Demo10's 💡 Hint was hidden with the old corner buttons, 2026-11-09). Replaced on purpose: 🔊 #soundBtn (bar volume), #lrBtn / #playBtn (⚙ / bar)
  const REPLACED = new Set(['soundBtn', 'lrBtn', 'playBtn', 'startBtn']), shown = (e) => !!(e.offsetParent || getComputedStyle(e).position === 'fixed') && getComputedStyle(e).visibility !== 'hidden';
  const own = [...st.querySelectorAll('button[id], [role=button][id]')].filter((e) => !e.closest('.u2, .intro') && !REPLACED.has(e.id));
  const before = own.map(shown), sheets = [...document.querySelectorAll('link[href*="ui2.css"], style#moheat-ui2-early')];
  sheets.forEach((x) => { x.disabled = true; }); const without = own.map(shown); sheets.forEach((x) => { x.disabled = false; });
  const lost = own.filter((e, i) => without[i] && !before[i]).map((e) => '#' + e.id);
  // the ORIGINAL page layout (user 2026-11-09): side panel on the right (desktop), no page scroll, no empty band above / below the player column > 10 % of the window
  const colR = document.querySelector('.stage-col')?.getBoundingClientRect(), side = document.querySelector('aside.side'), sr = side?.getBoundingClientRect(), hdr = document.querySelector('header.bar')?.getBoundingClientRect();
  const lay = { scroll: document.documentElement.scrollHeight - innerHeight, side: side && getComputedStyle(side).display !== 'none' ? [Math.round(sr.left), Math.round(sr.top), Math.round(sr.width), Math.round(sr.height)] : null,
    bandTop: colR && hdr ? Math.round(colR.top - hdr.bottom) : null, bandBottom: colR ? Math.round(innerHeight - colR.bottom) : null, vh: innerHeight, vw: innerWidth };
  return { lay, lost, stage: [Math.round(S.left), Math.round(S.top), Math.round(S.width), Math.round(S.height)], state: u.dataset.state, els: out, old, under, chapters: document.querySelectorAll('.u2-track > *').length };
})(${JSON.stringify(OLD)})`;
const res = { ref: REF, sizes: SIZES, demos: {}, fails: [], errors: [] };
(async () => {
  const hp = await freePort(), dp = await freePort();
  const http = spawn('python3', [require('path').join(__dirname, '..', 'qa', 'serve.py'), String(hp), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
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
          R[st] = (await ev(MEASURE)) || { err: 'MEASURE threw (see the page console)' }; R[st].shot = await shot(`${n}.${sz}.${st}`);
          if (st === 'playing') R.subsZoom = await ev(`(() => { const el = document.querySelector('.stage :is(.subs, .bubble, #bubble)'); if (!el) return null;
            const z = ['s', 'm', 'l'].map((v) => { MoHeatShell.setSubs(v); const r = el.getBoundingClientRect(); return [+(getComputedStyle(el).zoom || 1), Math.round(r.width)]; }); MoHeatShell.setSubs('m'); return z; })()`);
        }
      } catch (e) { res.errors.push(`${n} ${sz}: ${e}`); }
    }
  }
  // equal, allowing ±1 px on the box (sub-pixel rounding of the same layout; everything else must match exactly)
  const same = (x, y) => { if (!x || !y) return false; const X = x.split(' ¦ '), Y = y.split(' ¦ '); return X.length === Y.length && X.every((v, i) => (i < 4 ? Math.abs(+v - +Y[i]) <= 1 : v === Y[i])); };
  // compare with the reference
  for (const sz of SIZES) for (const [n, D] of Object.entries(res.demos)) {
    if (n === REF) continue; const ref = res.demos[REF]?.[sz], cur = D[sz]; if (!ref || !cur) continue;
    for (const st of Object.keys(ref)) {
      if (st === 'subsZoom') continue;
      const a = ref[st], b = cur[st]; if (!b || b.err) { res.fails.push(`${n} ${sz} ${st}: ${b?.err || 'not measured'}`); continue; }
      if (a.state !== b.state) res.fails.push(`${n} ${sz} ${st}: state ${b.state} ≠ ${a.state}`);
      if (b.old?.length) res.fails.push(`${n} ${sz} ${st}: old interface visible: ${b.old.join(', ')}`);
      if (st === 'playing' && b.lost?.length) res.fails.push(`${n} ${sz} ${st}: hidden by the shared interface (must stay): ${b.lost.join(', ')}`);
      if (st === 'playing' && b.under?.length) res.fails.push(`${n} ${sz} ${st}: the demo's own control(s) under the bar: ${b.under.join(', ')}`);
      if (a.stage.some((v, i) => Math.abs(v - b.stage[i]) > 1)) res.fails.push(`${n} ${sz} ${st}: stage box ${b.stage.join(',')} ≠ ${a.stage.join(',')}`);
      if (st === 'subsZoom') continue;
      for (const k of new Set([...Object.keys(a.els), ...Object.keys(b.els)])) {
        if (a.els[k] !== b.els[k] && !same(a.els[k], b.els[k])) res.fails.push(`${n} ${sz} ${st}: ${k.split('|')[0] || '?'} ${b.els[k] ? '' : 'missing'}${a.els[k] ? '' : 'extra'}\n      ref ${a.els[k] || '—'}\n      got ${b.els[k] || '—'}`);
      }
      if (st === 'playing' && b.chapters < 2) res.fails.push(`${n} ${sz}: ${b.chapters} chapters in the bar (every demo needs ≥ 2)`);
    }
  }
  for (const sz of SIZES) for (const [n, D] of Object.entries(res.demos)) { const m = D[sz]?.playing?.lay; if (!m) continue;
    if (m.scroll > 0) res.fails.push(`${n} ${sz}: the page scrolls by ${m.scroll} px`);
    if (m.vw > 1100 && !m.side) res.fails.push(`${n} ${sz}: the side panel is gone (the original layout keeps it on the right)`);
    if (m.vw > 1100 && Math.abs(m.bandTop - m.bandBottom) > 24) res.fails.push(`${n} ${sz}: one-sided empty band (${m.bandTop} px above, ${m.bandBottom} px below the player): the original layout centres the player column`); }
  // subtitle size S / M / L must really change the subtitles (zoom .85 / 1 / 1.3, phones L 1.18), in every demo that has subtitles
  for (const sz of SIZES) for (const [n, D] of Object.entries(res.demos)) { const z = D[sz]?.subsZoom; if (!z) continue;
    const want = [.85, 1, (D[sz]?.playing?.stage?.[2] || 999) <= 620 ? 1.18 : 1.3]; /* the phone cap is for players ≤ 620 px */ if (z.some((v, i) => Math.abs(v[0] - want[i]) > .01)) res.fails.push(`${n} ${sz}: subtitle size S / M / L gives zoom ${z.map((v) => v[0]).join(' / ')} (want ${want.join(' / ')})`); }
  for (const sz of SIZES) for (const [st, m] of Object.entries(res.demos[REF]?.[sz] || {})) {   // the reference demo itself: nothing covered, old UI gone
    if (st === 'playing' && m?.under?.length) res.fails.push(`${REF} ${sz} ${st}: the demo's own control(s) under the shared interface: ${m.under.join(', ')}`);
    if (m?.old?.length) res.fails.push(`${REF} ${sz} ${st}: old interface visible: ${m.old.join(', ')}`);
    if (st === 'playing' && m?.lost?.length) res.fails.push(`${REF} ${sz} ${st}: hidden by the shared interface (must stay): ${m.lost.join(', ')}`); }
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
  for (const D of Object.values(res.demos)) for (const R of Object.values(D)) for (const s of Object.values(R)) if (s && s.els && !Array.isArray(s)) s.els = Object.keys(s.els).length;
  done();
})();
