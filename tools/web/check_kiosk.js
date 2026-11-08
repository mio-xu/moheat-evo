#!/usr/bin/env node
// Exhibition (kiosk) mode, the whole visitor loop in a real browser (DEMO_DESIGN_GUIDE §7.4; TASKS #54). Prints ONE JSON object,
// exit 1 when a step fails.   node tools/web/check_kiosk.js [--demo all-ages/Demo28_SnowFoxLullaby] [--size 1440x900] [--shots DIR] [--quick]
// Own http.server + own headless Chrome (fresh profile). Steps:
//   welcome (?kiosk=1 sets the flag) → Start → intro: sting → left warm → right cool → hot↔cold → DUAL → auto-calibration: WARM ramp tapped after ~2.5 s, COOL ramp left to stop at the cap (separate scales) then
//   "just right" (the thermal lines the intro sent are checked) → menu → demo page (kiosk.js: switcher gone, ✕ End, guide off) →
//   Start (interactive, the default) → the show cut ends by itself → card (stars, buy, price, scenes, moment, comment) → Done → welcome with the
//   visitor's settings reset → stats (visitor, started / finished, rating, buy × price, scene × buy, CSV) → idle → attract
//   → tap → welcome → demo cover idle → back to the kiosk → 5 taps + PIN → staff panel → exit kiosk clears the flag.
// --quick skips the demo playback (card opened from a simulated visit).
const { spawn } = require('child_process');
const path = require('path'), fs = require('fs'), net = require('net'), os = require('os');
const ROOT = path.resolve(__dirname, '..', '..');
const argv = process.argv.slice(2), opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const DEMO = opt('--demo', 'all-ages/Demo28_SnowFoxLullaby'), SHOTS = opt('--shots', null), QUICK = argv.includes('--quick');
const [W, H] = opt('--size', '1440x900').split('x').map(Number);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const out = { size: `${W}x${H}`, demo: DEMO, ok: false, steps: {}, errors: [] };
const step = (k, v, detail) => { out.steps[k] = detail === undefined ? !!v : { ok: !!v, ...detail }; if (!v) out.errors.push(k); };
(async () => {
  const hp = await freePort(), dp = await freePort();
  const http = spawn('python3', ['-m', 'http.server', String(hp), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'kioskprobe-'));
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${dp}`, `--user-data-dir=${prof}`, '--autoplay-policy=no-user-gesture-required', '--mute-audio',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
  const done = () => { try { chrome.kill(); } catch {} try { http.kill(); } catch {} try { fs.rmSync(prof, { recursive: true, force: true }); } catch {}
    out.ok = !out.errors.length; process.stdout.write(JSON.stringify(out, null, 1) + '\n'); process.exit(out.ok ? 0 : 1); };
  setTimeout(() => { out.errors.push('timeout'); done(); }, 600 * 1000);
  let ws; for (let i = 0; i < 80 && !ws; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${dp}/json/list`)).json(); ws = l.find((x) => x.type === 'page')?.webSocketDebuggerUrl; } catch {} }
  if (!ws) { out.errors.push('no Chrome'); return done(); }
  const sock = new WebSocket(ws); await new Promise((r) => sock.addEventListener('open', r));
  let id = 0; const wait = {};
  sock.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && wait[m.id]) { wait[m.id](m); delete wait[m.id]; } else if (m.method === 'Runtime.exceptionThrown') out.errors.push('js: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).split('\n')[0]); });
  const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; wait[i] = r; sock.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (x) => { const r = await Promise.race([cdp('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }), sleep(3000).then(() => null)]); return r?.result?.result?.value; };   // no hang across navigations
  const shot = async (n) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); const r = await cdp('Page.captureScreenshot', { format: 'jpeg', quality: 82 }); fs.writeFileSync(path.join(SHOTS, `kiosk_${W}x${H}_${n}.jpg`), Buffer.from(r.result.data, 'base64')); };
  const until = async (x, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(x)) return true; await sleep(250); } return false; };
  const click = (sel) => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; e.click(); return true; })()`);
  const tap = async (x, y) => { for (const type of ['mousePressed', 'mouseReleased']) await cdp('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); };
  await cdp('Page.enable'); await cdp('Runtime.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  const base = `http://127.0.0.1:${hp}`;
  const nav = async (u) => { await cdp('Page.navigate', { url: base + u }); await until('document.readyState === "complete"', 20000); await sleep(600); };

  // 1 welcome
  await nav('/kiosk/?kiosk=1');
  await ev(`(localStorage.setItem('moheat.kiosk.cfg', JSON.stringify({ idle: 45 })), localStorage.setItem('moheat.intensity', '95'), localStorage.setItem('moheat.mode', '"pure"'), 1)`);
  await nav('/kiosk/');
  step('welcome', await ev(`localStorage.getItem('moheat.kiosk') === '1' && MoHeatKioskApp.view === 'welcome' && document.querySelectorAll('.picto li').length === 3`));
  step('resetOnLoad', await ev(`localStorage.getItem('moheat.intensity') === '100' && localStorage.getItem('moheat.warmScale') === '0.5' && localStorage.getItem('moheat.coolScale') === '0.5' && localStorage.getItem('moheat.mode') === '"interactive"'`));
  const fits = () => ev(`document.documentElement.scrollHeight <= innerHeight + 1 && document.documentElement.scrollWidth <= innerWidth + 1 && [...document.querySelectorAll('.view:not([hidden]) button')].every((b) => { const r = b.getBoundingClientRect(); return r.width === 0 || (r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1 && r.top >= -1); })`);
  step('welcomeFits', await fits());
  await click('.langs [data-l=ja]'); step('langJa', await ev(`document.getElementById('startVisit').textContent.includes('はじめる')`)); await shot('1_welcome_ja');
  await click('.langs [data-l=en]'); await shot('1_welcome');

  // 2 intro
  await click('#startVisit');
  step('intro', await until(`MoHeatKioskApp.view === 'intro' && document.querySelector('.mi')`, 3000));
  await until(`MoHeatKioskApp.intro.step === 'volume'`, 12000); await sleep(500); await shot('2_intro_volume');
  step('introVolume', await ev(`!!document.querySelector('.mi .vol input')`));
  await click('.mi .go'); await until(`MoHeatKioskApp.intro.step === 'left'`, 6000); await sleep(800); await shot('2_intro_left');
  await until(`MoHeatKioskApp.intro.step === 'dual'`, 20000); await sleep(600); await shot('2_intro_dual');
  await until(`MoHeatKioskApp.intro.step === 'warm'`, 10000); await sleep(2500); await shot('2_intro_warm');
  await tap(W / 2, H * .3); await sleep(300); await shot('2_intro_warm_tapped');   // a tap anywhere stops the warm ramp at once
  await until(`MoHeatKioskApp.intro.step === 'cool'`, 4000); await sleep(3000); await shot('2_intro_cool');
  await until(`MoHeatKioskApp.view === 'menu'`, 12000); await sleep(200);   // nobody taps: the cool ramp stops at the staff cap
  const log = await ev('MoHeatKioskApp.intro.log');
  step('introThermal', log && log.some((l) => /^LC\d+ RC\d+$/.test(l)) && log.some((l) => /^LH\d+ RH0$/.test(l)) && log.some((l) => /^LH0 RC\d+$/.test(l)) && log.some((l) => /^DUAL LC\d+ LH\d+ RC\d+ RH\d+$/.test(l)) && log.at(-1) === 'stop', { n: log && log.length });
  const sc = { warm: +(await ev(`localStorage.getItem('moheat.warmScale')`)), cool: +(await ev(`localStorage.getItem('moheat.coolScale')`)) };
  step('introLevel', sc.warm > .1 && sc.warm < .5 && Math.abs(sc.cool - .64) < .011, sc);   // warm: 80 % of the tapped level · cool: 80 % of the 80 % cap
  const warmRamp = log ? log.map((l) => (/^LH(\d+) RH0$/.exec(l) || [])[1]).filter(Boolean).map(Number) : [];
  const iw = log ? log.lastIndexOf('LH' + warmRamp.at(-1) + ' RH0') : -1;
  step('introRamp', warmRamp.length > 5 && warmRamp.at(-1) > warmRamp[warmRamp.length - 6] && log[iw + 1] === 'stop' && log.some((l) => l === 'LH0 RC71'), { warmTail: warmRamp.slice(-4), afterTap: log && log[iw + 1] });
  const cal = await ev(`MoHeatKiosk.stats.table('today').calib`); step('calibStats', cal && cal.n === 1 && cal.coolCapHits === 1 && cal.warmCapHits === 0, cal);
  step('menu', await until(`MoHeatKioskApp.view === 'menu' && document.querySelectorAll('.menu-grid button').length > 5`, 3000)); await shot('3_menu');
  step('menuFits', await ev(`document.documentElement.scrollHeight <= innerHeight + 1`));

  // 3 demo
  if (!QUICK) {
    await click(`.menu-grid [data-dir="${DEMO.split('/')[1]}"]`);
    await until(`location.pathname.includes('${DEMO}') && document.readyState === 'complete'`, 20000); await sleep(3500);
    step('demoKiosk', await ev(`!!window.MoHeatKiosk && !document.querySelector('.dnav') && !!document.querySelector('.mk-end') && localStorage.getItem('moheat.guide') === 'done' && !document.querySelector('.mg-tip:not([hidden])')`));
    step('demoScales', await ev(`(() => { const s = MoHeatKiosk.scales(); return MoHeatKiosk.scaleLine('DUAL LC80 LH200 RC0 RH100') === 'DUAL LC' + Math.max(35, Math.round(35 + 45 * s.cool)) + ' LH' + Math.round(200 * s.warm) + ' RC0 RH' + Math.round(100 * s.warm) && +document.getElementById('intensity').value === 100; })()`), { line: await ev(`MoHeatKiosk.scaleLine('DUAL LC80 LH200 RC0 RH100')`) });
    await shot('4_demo_cover');
    await ev(`(document.getElementById('startBtn').click(), 1)`);   // the visitor's default mode (interactive) await sleep(3000);
    step('volumeSlider', await ev(`(() => { const r = document.querySelector('.mk-vol input'); return !!r && r.getBoundingClientRect().height >= 44; })()`));
    await sleep(6000); await shot('4_demo_play');
    step('showCut', await ev(`!!document.querySelector('.mk-cut') && document.querySelector('.mk-cut').textContent.includes(':')`), { chip: await ev(`document.querySelector('.mk-cut')?.textContent`) });
    const t1 = Date.now();   // the show cut (kiosk default) ends by itself after ~80 s of story time → the card
    step('demoEndToCard', await until(`location.pathname.startsWith('/kiosk/') && window.MoHeatKioskApp?.view === 'card'`, 240000), { secs: Math.round((Date.now() - t1) / 1000) });
  } else {
    await ev(`(MoHeatKiosk.stats.started('Demo28_SnowFoxLullaby', 'interactive'), MoHeatKiosk.stats.finished('Demo28_SnowFoxLullaby'), MoHeatKiosk.visit.set({ dir: 'Demo28_SnowFoxLullaby', started: true, finished: true, moments: [{ k: 1, label: 'Snow falls', kind: 'cool' }, { k: 2, label: 'Foxfire', kind: 'warm' }] }), location.hash = 'card', location.reload(), 1)`);
    await sleep(1500); await until('document.readyState === "complete"'); await sleep(500);
    step('demoEndToCard', await ev(`MoHeatKioskApp.view === 'card'`));
  }
  // 4 card
  const vis = await ev('MoHeatKiosk.visit.get()');
  out.steps.visit = { started: vis?.started, finished: vis?.finished, moments: (vis?.moments || []).length };
  // one question per screen: a tap answers and moves on (time it: a first-time visitor must be done in < 10 s)
  const t0 = Date.now(), q = () => ev(`document.querySelector('#v-card .q').dataset.q`);
  await shot('5_card_rate'); step('cardFits', await fits());
  await sleep(300); const tClick = Date.now(); await click('#v-card .q [data-v="4"]'); await sleep(250);
  step('confirmHold', await ev(`document.querySelector('#v-card .q').dataset.q === 'rate' && !!document.querySelector('#v-card .q .stars .sel')`)); await shot('5_card_rate_picked');   // the pick stays lit, no instant jump
  step('dwell', await until(`document.querySelector('#v-card .q').dataset.q === 'buy'`, 4000) && Date.now() - tClick >= 700, { msAfterTap: Date.now() - tClick });
  await click('#v-card .q [data-v=no]'); await sleep(150); await click('#cardBack');   // back one question before the "no" moves on
  await sleep(200); step('back', await ev(`document.querySelector('#v-card .q').dataset.q === 'rate'`));
  await sleep(1500); await click('#v-card .q [data-v="4"]'); await until(`document.querySelector('#v-card .q').dataset.q === 'buy'`, 4000);
  await sleep(1500); await click('#v-card .q [data-v=yes]'); step('priceShown', await until(`document.querySelector('#v-card .q').dataset.q === 'price' && document.querySelectorAll('#v-card .q button').length >= 4`, 4000));
  await shot('5_card_price');
  await click('#v-card .q button:nth-child(2)'); await until(`document.querySelector('#v-card .q').dataset.q === 'scenes'`, 4000); await shot('5_card_scenes');
  await click('#v-card .q [data-v=games]'); await click('#v-card .q [data-v=travel]');
  step('scenesMax2', await until(`document.querySelector('#v-card .q').dataset.q === 'fav' || !document.querySelector('.q-thanks').hidden`, 4000));
  step('favMoments', await ev(`document.querySelector('#v-card .q').dataset.q === 'fav' && document.querySelectorAll('#v-card .q button').length > 0`)); await shot('5_card_fav');
  await click('#v-card .q button'); await until(`!document.querySelector('.q-thanks').hidden`, 4000);
  step('thanks', await ev(`!document.querySelector('.q-thanks').hidden`)); await shot('5_card_thanks');
  out.steps.cardSecs = Math.round((Date.now() - t0) / 100) / 10;
  await sleep(2000);
  step('cardToWelcome', await ev(`MoHeatKioskApp.view === 'welcome' && localStorage.getItem('moheat.warmScale') === '0.5' && !sessionStorage.getItem('moheat.sublang') && !sessionStorage.getItem('moheat.kiosk.visit')`));
  const st = await ev(`MoHeatKiosk.stats.table('today')`), row = st?.rows?.find((r) => r.dir === DEMO.split('/')[1]);
  step('stats', st && st.visitors >= 1 && row && row.started >= 1 && row.finished >= 1 && row.interactive >= 1 && row.avg === 4 && row.buy.yes === 1 && Object.keys(st.cross).length === 1 && st.scenes.travel === 1 && st.scenes.games === 1 && !!row.top,
    { visitors: st?.visitors, row: row && { started: row.started, finished: row.finished, pure: row.pure, avg: row.avg, buy: row.buy, price: row.price, scenes: row.scenes, top: row.top }, cross: st?.cross, sceneBuy: st?.sceneBuy });
  const csv = await ev('MoHeatKiosk.stats.csv()');
  step('csv', csv && csv.includes('buy_yes') && csv.includes('scene x purchase intent') && csv.includes(DEMO.split('/')[1]), { head: csv && csv.split('\n')[0] });

  // 5 idle → attract (idle 45 s), tap → welcome
  step('attract', await until(`MoHeatKioskApp.view === 'attract' && document.querySelector('.att-slides img.on')`, 60000)); await sleep(1500); await shot('6_attract');
  await tap(W / 2, H / 2); await sleep(400); step('attractTap', await ev(`MoHeatKioskApp.view === 'welcome'`));

  // 6 idle on a demo cover → back to the kiosk (no card when nothing was played)
  if (!QUICK) {
    await click('#skipIntro'); await sleep(300); await click(`.menu-grid [data-dir="${DEMO.split('/')[1]}"]`);
    await until(`location.pathname.includes('${DEMO}')`, 20000);
    step('demoIdleReset', await until(`location.pathname.startsWith('/kiosk/') && window.MoHeatKioskApp?.view === 'welcome'`, 70000));
  }

  // 7 staff panel: 5 taps top-left + PIN
  for (let i = 0; i < 5; i++) { await tap(20, 20); await sleep(120); }
  step('pin', await ev(`!document.getElementById('pinBox').hidden`));
  await ev(`(document.getElementById('pin').value = '1234', document.getElementById('pinOk').click(), 1)`);
  step('pinWrong', await ev(`document.getElementById('staff').hidden && document.getElementById('pinErr').textContent.length > 0`));
  await ev(`(document.getElementById('pin').value = '0000', document.getElementById('pinOk').click(), 1)`); await sleep(300);
  step('staff', await ev(`!document.getElementById('staff').hidden && document.querySelectorAll('#statBody tr').length >= 1 && /visitors/.test(document.getElementById('statSum').textContent)`));
  await shot('7_staff');
  await ev(`(document.getElementById('sCapW').value = 60, document.getElementById('sCapW').dispatchEvent(new Event('change', { bubbles: true })), 1)`);
  step('staffCap', await ev(`MoHeatKiosk.cfg().capWarm === 60 && MoHeatKiosk.cfg().startWarm <= 60 && MoHeatKiosk.cfg().capCool === 80`));
  await ev(`(window.confirm = () => true, document.getElementById('exitKiosk').click(), 1)`); await sleep(1500);
  step('exit', await ev(`localStorage.getItem('moheat.kiosk') === null`));
  await nav(`/demos/${DEMO}/`); await sleep(1500);
  step('exitDemoNormal', await ev(`!document.querySelector('.mk-end') && !window.MoHeatKiosk && !!document.getElementById('startBtn')`), { state: await ev(`JSON.stringify({ flag: localStorage.getItem('moheat.kiosk'), end: !!document.querySelector('.mk-end'), dnav: !!document.querySelector('.dnav'), path: location.pathname, k: !!window.MoHeatKiosk })`) });
  done();
})();
