#!/usr/bin/env node
// The demo menu is plain text (user 2026-11-09): no emoji / pictographs / dingbats in the open panel, in any language.
// The ONE permanent exception (user confirmed 2026-11-09): the ★ at the start of the "★ Recommended" tab label ([data-w=rec]).
// © ® ™ are typography, not symbols to remove. Thumbnails are images and are not covered here.
//   node tools/web/check_menu_text.js [demo folder]     prints ONE JSON object { fails }; exit 1 on FAIL
const { spawn } = require('child_process'); const path = require('path'), fs = require('fs'), net = require('net'), os = require('os');
const ROOT = path.resolve(__dirname, '..', '..'), REL = process.argv[2] ? path.relative(ROOT, path.resolve(process.argv[2])) : 'demos/for-women/Demo24_GakuCamp';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const SCAN = `(() => { const RE = /[\\p{Extended_Pictographic}\\u2190-\\u21FF\\u2460-\\u24FF\\u2600-\\u27BF\\u2B00-\\u2BFF\\uFE0F]/u, bad = [], clean = (t) => t.replace(/[©®™]/g, '');
  const P = document.querySelector('.dn-panel'); if (!P) return ['no .dn-panel'];
  const w = document.createTreeWalker(P, NodeFilter.SHOW_TEXT); let n, seen = 0;
  while ((n = w.nextNode())) { let t = clean(n.nodeValue); if (t.trim()) seen++; if (n.parentElement.closest('[data-w=rec]')) t = t.replace(/^\\s*★\\s*/, ''); if (RE.test(t)) bad.push(t.trim().slice(0, 60)); }
  for (const e of P.querySelectorAll('[title], [aria-label], img[alt]')) for (const a of ['title', 'aria-label', 'alt']) { const v = clean(e.getAttribute(a) || ''); if (RE.test(v)) bad.push(a + ': ' + v.slice(0, 60)); }
  return seen < 10 ? ['menu text did not render (' + seen + ' text nodes)'] : bad; })()`;
const out = { demo: REL, fails: [] };
(async () => {
  const hp = await freePort(), dp = await freePort();
  const http = spawn('python3', [path.join(__dirname, '..', 'qa', 'serve.py'), String(hp), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'checkmenu-'));
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${dp}`, `--user-data-dir=${prof}`, '--mute-audio', '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });
  const done = () => { try { chrome.kill(); } catch {} try { http.kill(); } catch {} try { fs.rmSync(prof, { recursive: true, force: true }); } catch {} process.stdout.write(JSON.stringify(out) + '\n'); process.exit(out.fails.length ? 1 : 0); };
  setTimeout(() => { out.fails.push('timeout'); done(); }, 120000);
  let ws; for (let i = 0; i < 80 && !ws; i++) { await sleep(250); try { ws = (await (await fetch(`http://127.0.0.1:${dp}/json/list`)).json()).find((x) => x.type === 'page')?.webSocketDebuggerUrl; } catch {} }
  const sock = new WebSocket(ws); await new Promise((r) => sock.addEventListener('open', r)); let id = 0; const wait = {};
  sock.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && wait[m.id]) { wait[m.id](m); delete wait[m.id]; } });
  const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; wait[i] = r; sock.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (x) => (await cdp('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true })).result?.result?.value;
  await cdp('Page.enable');
  for (const l of ['en', 'ja', 'zh']) {
    await cdp('Page.navigate', { url: `http://127.0.0.1:${hp}/${REL.split(path.sep).join('/')}/?sub=${l}` });
    for (let i = 0; i < 80; i++) { await sleep(250); if (await ev(`document.readyState === 'complete' && !!document.querySelector('.dn-panel [data-d]')?.textContent`)) break; }
    await sleep(800);
    for (const b of (await ev(SCAN)) || ['scan gave no result']) out.fails.push(`${l}: ${b}`);
  }
  done();
})();
