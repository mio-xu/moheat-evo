#!/usr/bin/env node
// Composite every video frame: comp.html renders one descriptor of <work>/frames.json (edit.py), headless Chrome screenshots it.
//   node comp.js <work> [--from 0] [--to N] [--every 1] [--dpr 1] [--out comp] [--jpg]   → <work>/<out>/<frame>.png  (--dpr 2 --jpg → the 3840 × 2160 master)
const fs = require('fs'), path = require('path');
const { launch } = require('./cdp.js');
const argv = process.argv.slice(2), opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const W = argv[0], FR = JSON.parse(fs.readFileSync(path.join(W, 'frames.json'), 'utf8'));
const from = +opt('--from', 0), to = Math.min(+opt('--to', FR.length), FR.length), every = +opt('--every', 1), dpr = +opt('--dpr', 1);
const OUT = path.join(W, opt('--out', 'comp')); fs.mkdirSync(OUT, { recursive: true });
const JPG = argv.includes('--jpg');   // 4K master frames: JPEG q96 (PNG would be ~25 GB)
(async () => {
  const B = await launch({ dpr });
  await B.cdp('Page.navigate', { url: 'file://' + path.join(__dirname, 'comp.html') });
  for (let i = 0; i < 60; i++) { await B.sleep(200); if (await B.ev(`typeof render === 'function' && document.readyState === 'complete'`)) break; }
  await B.ev(`document.fonts.ready.then(() => true)`);
  const t0 = Date.now();
  for (let f = from; f < to; f += every) {
    await B.ev(`render(${JSON.stringify(FR[f])})`);
    const r = await B.cdp('Page.captureScreenshot', JPG ? { format: 'jpeg', quality: 96 } : { format: 'png', optimizeForSpeed: true });
    fs.writeFileSync(path.join(OUT, `${String(f).padStart(5, '0')}.${JPG ? 'jpg' : 'png'}`), Buffer.from(r.data, 'base64'));
    if (f % 150 === 0) console.log(`frame ${f}/${to} ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  B.close(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
