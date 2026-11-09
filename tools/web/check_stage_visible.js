#!/usr/bin/env node
// Pages that use shared/series.css WITHOUT shell.js (the private live talk pages Demo23/live/*.html, Demo43/live/index.html …) must show
// their own cover / stage: the UI v2 pre-paint rule in series.css only applies to <html data-u2> pages (2026-11-09: it blacked them out).
// --export: pages WITH shell.js opened as ?embed=1 and ?render=1. shell.js skips UI v2 there, so .u2-on never comes and series.css would keep the stage hidden
// unless shell.js drops data-u2 (2026-11-09: the home-page player was black, sound only). FAIL when the picture (a hidden canvas / video / img, or the largest child) or the whole stage is hidden.
// Prints ONE JSON object { pages, fails }; exit 1 on FAIL.
//   node tools/web/check_stage_visible.js [page.html …]            (default: every such page under demos/)
//   node tools/web/check_stage_visible.js --export [page.html …]   (default: every shell.js page under demos/)
require('../qa/chrome_guard');   // closes its browser on any exit; one browser per agent (MOHEAT_MAX_BROWSERS)
const { spawn } = require('child_process'); const path = require('path'), fs = require('fs'), net = require('net'), os = require('os');
const ROOT = path.resolve(__dirname, '..', '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (/^(node_modules|assets|output|project)$/.test(e.name) ? [] : walk(path.join(d, e.name))) : e.name.endsWith('.html') ? [path.join(d, e.name)] : []));
const args = process.argv.slice(2), EXPORT = args.includes('--export'), named = args.filter((a) => a !== '--export'), QUERIES = EXPORT ? ['?embed=1', '?render=1'] : [''];
const pages = named.length ? named.map((p) => path.resolve(p))
  : walk(path.join(ROOT, 'demos')).filter((f) => { const s = fs.readFileSync(f, 'utf8'); return /shared\/series\.css/.test(s) && /shared\/shell\.js/.test(s) === EXPORT; });
const out = { pages: pages.map((p) => path.relative(ROOT, p)), fails: [] };
(async () => {
  if (!pages.length) { process.stdout.write(JSON.stringify(out) + '\n'); return; }
  const hp = await freePort(), dp = await freePort();
  const http = spawn('python3', [path.join(__dirname, '..', 'qa', 'serve.py'), String(hp), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'checkstage-'));
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${dp}`, `--user-data-dir=${prof}`, '--mute-audio', '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });
  const done = () => { try { chrome.kill(); } catch {} try { http.kill(); } catch {} try { fs.rmSync(prof, { recursive: true, force: true }); } catch {}
    process.stdout.write(JSON.stringify(out) + '\n'); process.exit(out.fails.length ? 1 : 0); };
  setTimeout(() => { out.fails.push('timeout'); done(); }, 30000 + 15000 * pages.length * QUERIES.length);
  let ws; for (let i = 0; i < 80 && !ws; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${dp}/json/list`)).json(); ws = l.find((x) => x.type === 'page')?.webSocketDebuggerUrl; } catch {} }
  const sock = new WebSocket(ws); await new Promise((r) => sock.addEventListener('open', r)); let id = 0; const wait = {};
  sock.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && wait[m.id]) { wait[m.id](m); delete wait[m.id]; } });
  const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; wait[i] = r; sock.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (x) => (await cdp('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true })).result?.result?.value;
  await cdp('Page.enable');
  for (const p of out.pages) for (const q of QUERIES) {
    await cdp('Page.navigate', { url: `http://127.0.0.1:${hp}/${p.split(path.sep).join('/')}${q}` });
    for (let i = 0; i < 40; i++) { await sleep(250); if (await ev(`document.readyState === 'complete'`)) break; }
    await sleep(3000);   // past the 2.5 s l10n fail-safe
    const r = await ev(`(() => { const st = document.querySelector('.stage'); if (!st) return { noStage: true };
      const kids = [...st.children].filter((e) => e.getBoundingClientRect().width > 0);
      const hidden = kids.filter((e) => getComputedStyle(e).visibility === 'hidden').map((e) => e.id || e.className || e.tagName);
      const area = (e) => { const b = e.getBoundingClientRect(); return b.width * b.height; }, big = [...kids].sort((a, b) => area(b) - area(a))[0];
      const hid = (e) => getComputedStyle(e).visibility === 'hidden', picture = kids.filter((e) => /^(CANVAS|VIDEO|IMG)$/.test(e.tagName) && hid(e)).map((e) => e.id || e.tagName);
      return { kids: kids.length, hidden, picture, bigHidden: !!big && hid(big), u2: document.documentElement.hasAttribute('data-u2') }; })()`);
    if (!r || r.noStage) continue;   // a page without a stage: nothing to hide
    if (EXPORT) {
      if (r.picture.length || r.bigHidden || (r.kids && r.hidden.length === r.kids)) out.fails.push(`${p}${q}: stage hidden, sound only (hidden: ${r.hidden.slice(0, 4).join(', ')}${r.u2 ? '; <html> still has data-u2' : ''}): shell.js must drop data-u2 when it skips UI v2`);
      continue;
    }
    if (r.u2) out.fails.push(`${p}: <html data-u2> but no shell.js (the stage stays hidden)`);
    else if (r.kids && r.hidden.length === r.kids) out.fails.push(`${p}: stage blacked out (hidden: ${r.hidden.slice(0, 4).join(', ')})`);
  }
  done();
})();
