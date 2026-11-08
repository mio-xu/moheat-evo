// Queue screen (window 2 on the second display, opened from the staff panel; docs/kiosk.md "两块屏幕"). Same computer, same browser
// profile: everything arrives over BroadcastChannel 'moheat-kiosk' (kiosk/app.js + shared/kiosk.js on the demo pages) and the
// staff settings come from the same localStorage. Shows: the big "scan to choose while you wait" QR (kiosk/pick.html), a mirror of
// the visitor's picture (canvas frames when the stage is a canvas, else the demo's cover), the subtitle line, a big two-ear thermal
// view (warm = orange + heat waves, cool = blue + snowflakes), the demo now playing with its number, the top 3; idle = attract loop.
// Text rotates EN → 日本語 → 中文 every 8 s (people in line speak different languages). Readable from 2–3 m (vh-based sizes).
(() => {
  const K = window.MoHeatKiosk, D = window.MoHeatDemos || { DEMOS: [] };
  const $ = (s) => document.querySelector(s);
  const LANGS = ['en', 'ja', 'zh']; let li = 0; const L = () => LANGS[li];
  const T = { tag: { en: 'Feel warm and cool on each ear', ja: '左右の耳で、温かさと冷たさを', zh: '左右耳感受冷与热' },
    qr: { en: 'Scan to choose your demo while you wait', ja: '待っている間にスキャンして選ぼう', zh: '排队时扫码，先选好故事' },
    qrS: { en: 'Then tap the same number at the machine', ja: '順番が来たら同じ番号をタップ', zh: '轮到你时点同样的号码' },
    top: { en: 'Try these first', ja: 'まずはこちら', zh: '推荐先体验' }, now: { en: 'Now playing', ja: '体験中', zh: '正在体验' },
    idle: { en: 'Next visitor: you?', ja: '次はあなたの番かも', zh: '下一位就是你？' }, intro: { en: 'Device intro', ja: 'デバイス案内', zh: '设备引导' },
    card: { en: 'Feedback', ja: 'アンケート', zh: '体验反馈' },
    ears: { en: 'What the visitor feels now', ja: 'いま体験者が感じている温冷', zh: '体验者此刻感受到的冷热' }, L: { en: 'LEFT', ja: '左', zh: '左' }, R: { en: 'RIGHT', ja: '右', zh: '右' } };
  const t = (k) => T[k][L()] || T[k].en;
  const st = { view: 'attract', dir: null, sub: '', th: { l: { h: 0, c: 0 }, r: { h: 0, c: 0 } }, frameAt: 0, seen: Date.now() };
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel('moheat-kiosk') : null;
  bc?.addEventListener('message', (e) => { const m = e.data || {}; st.seen = Date.now();
    if (m.t === 'state') { st.view = m.view; st.dir = m.dir || null; if (m.view !== 'demo') st.sub = ''; paint(); }
    if (m.t === 'thermal') st.th = m.th;
    if (m.t === 'sub') { st.sub = m.text || ''; $('#sub').textContent = st.sub; }
    if (m.t === 'frame') { st.frameAt = Date.now(); frame.src = m.url; } });
  setInterval(() => bc?.postMessage({ t: 'hello' }), 2000); bc?.postMessage({ t: 'hello' });
  // anything quiet for 10 min (kiosk closed) → attract
  setInterval(() => { if (Date.now() - st.seen > 600000 && st.view !== 'attract') { st.view = 'attract'; paint(); } }, 5000);

  const offered = () => K.offered(D.DEMOS), top3 = () => K.top3(D.DEMOS);
  const frame = document.createElement('img'); frame.className = 'frame';
  const mirror = $('#mirror'); mirror.prepend(frame);
  let slides = [], si = 0;
  const thumb = (d) => `../assets/images/demos/${d.dir}.jpg`;
  function paint() {
    $('#tag').textContent = t('tag'); $('#qrT').textContent = t('qr'); $('#qrS').textContent = t('qrS'); $('#topH').textContent = t('top'); $('#earsLab').textContent = t('ears');
    const d = st.dir && D.DEMOS.find((x) => x.dir === st.dir);
    $('#now').innerHTML = d && st.view === 'demo' ? `${t('now')}: <span class="no">${K.num(D.DEMOS, d)}</span>${d[L()] || d.en}` : st.view === 'intro' ? t('intro') : st.view === 'card' ? t('card') : t('idle');
    $('#mtag').textContent = st.view === 'demo' ? '● LIVE' : ''; $('#mtag').hidden = st.view !== 'demo';
    $('#top').innerHTML = top3().map((x) => { const p = (window.MOHEAT_PITCH || {})[x.dir]; return `<li><span class="no">${K.num(D.DEMOS, x)}</span><span>${x[L()] || x.en}${p?.hot ? `<small>${p.hot[L()] || p.hot.en}</small>` : ''}</span></li>`; }).join('');
    const q = K.pickUrl(D.DEMOS); const box = $('#qr'); if (box.dataset.q !== q) { box.dataset.q = q; try { const qq = qrcode(0, 'M'); qq.addData(q); qq.make(); box.innerHTML = qq.createSvgTag({ cellSize: 6, margin: 2, scalable: true }); } catch { box.textContent = q; } }
    // the picture: live frames while a demo plays (when they arrive), else its cover, else the attract slides
    const want = d && st.view === 'demo' ? [d] : offered();
    const key = want.map((x) => x.dir).join(',');
    if (mirror.dataset.k !== key) { mirror.dataset.k = key; slides.forEach((x) => x.remove()); slides = want.map((x) => { const im = new Image(); im.className = 'kb'; im.src = thumb(x); mirror.insertBefore(im, frame); return im; }); si = 0; slide(); }
    if (st.view !== 'demo') $('#sub').textContent = '';
  }
  function slide() { slides.forEach((x, j) => x.classList.toggle('on', j === si % slides.length && Date.now() - st.frameAt > 3000)); si++; }
  setInterval(() => { frame.classList.toggle('on', Date.now() - st.frameAt < 3000); if (slides.length > 1 || Date.now() - st.frameAt > 3000) slide(); }, 6000);
  setInterval(() => { frame.classList.toggle('on', Date.now() - st.frameAt < 3000); if (Date.now() - st.frameAt < 3000) slides.forEach((x) => x.classList.remove('on')); }, 500);
  setInterval(() => { li = (li + 1) % LANGS.length; paint(); }, 8000);

  // ---------------------------------------------------------------- the big two-ear view: colour + snowflakes / heat waves
  const cv = $('#ears'), cx = cv.getContext('2d'); let parts = [];
  const sm = { l: { h: 0, c: 0 }, r: { h: 0, c: 0 } };
  function draw() {
    const w = cv.width = cv.clientWidth * devicePixelRatio, h = cv.height = cv.clientHeight * devicePixelRatio; cx.clearRect(0, 0, w, h);
    for (const s of ['l', 'r']) for (const k of ['h', 'c']) sm[s][k] += ((st.view === 'demo' || st.view === 'intro' ? st.th[s][k] : 0) - sm[s][k]) * .08;
    const R = Math.min(w * .15, h * .26), y = h * .6, X = { l: w * .2, r: w * .8 };
    // head + band
    cx.strokeStyle = 'rgba(255,255,255,.5)'; cx.lineWidth = R * .14; cx.lineCap = 'round'; cx.beginPath(); cx.arc(w / 2, y + R * .1, w * .3, Math.PI * 1.08, Math.PI * 1.92); cx.stroke();
    cx.fillStyle = 'rgba(255,255,255,.06)'; cx.beginPath(); cx.ellipse(w / 2, y + R * .4, w * .2, h * .36, 0, 0, Math.PI * 2); cx.fill();
    for (const s of ['l', 'r']) {
      const v = sm[s], x = X[s];
      const g = cx.createRadialGradient(x, y, R * .1, x, y, R * 1.9);
      const warm = `rgba(255,120,50,${.15 + .75 * v.h})`, cool = `rgba(80,170,255,${.15 + .75 * v.c})`;
      g.addColorStop(0, v.h > v.c ? warm : cool); g.addColorStop(.5, v.h > .05 && v.c > .05 ? (v.h > v.c ? cool : warm) : 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, R * 1.9, 0, Math.PI * 2); cx.fill();
      // the ear cup: split when both (DUAL)
      cx.lineWidth = R * .06; cx.strokeStyle = 'rgba(255,255,255,.7)';
      if (v.h > .05 && v.c > .05) { cx.fillStyle = `rgb(${90},${170},${255})`; cx.beginPath(); cx.arc(x, y, R * .7, Math.PI * .5, Math.PI * 1.5); cx.fill(); cx.fillStyle = 'rgb(255,130,60)'; cx.beginPath(); cx.arc(x, y, R * .7, -Math.PI * .5, Math.PI * .5); cx.fill(); }
      else { cx.fillStyle = v.h > .05 ? `rgba(255,130,60,${.35 + .65 * v.h})` : v.c > .05 ? `rgba(90,170,255,${.35 + .65 * v.c})` : 'rgba(255,255,255,.12)'; cx.beginPath(); cx.arc(x, y, R * .7, 0, Math.PI * 2); cx.fill(); }
      cx.beginPath(); cx.arc(x, y, R * .7, 0, Math.PI * 2); cx.stroke();
      cx.fillStyle = '#fff'; cx.font = `800 ${R * .38}px Inter, sans-serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(t(s === 'l' ? 'L' : 'R'), x, y);
      // particles: heat waves rise, snowflakes fall, both by intensity
      if (Math.random() < v.h * .7) parts.push({ k: 'h', x: x + (Math.random() - .5) * R * 1.6, y: y - R * .6, vy: -(1 + Math.random()) * h * .004, life: 1 });
      if (Math.random() < v.c * .7) parts.push({ k: 'c', x: x + (Math.random() - .5) * R * 2, y: y - R * 1.6, vy: (1 + Math.random()) * h * .003, life: 1, r: Math.random() * 6.28 });
    }
    parts = parts.filter((p) => (p.life -= .012) > 0);
    for (const p of parts) {
      p.y += p.vy; cx.globalAlpha = p.life;
      if (p.k === 'h') { cx.strokeStyle = '#ffa060'; cx.lineWidth = R * .05; cx.beginPath(); for (let i = 0; i < 6; i++) { const yy = p.y - i * R * .08; cx[i ? 'lineTo' : 'moveTo'](p.x + Math.sin((yy + p.life * 200) / 18) * R * .08, yy); } cx.stroke(); }
      else { cx.strokeStyle = '#d6f1ff'; cx.lineWidth = R * .03; const r = R * .1; p.r += .02; for (let i = 0; i < 3; i++) { const a = p.r + i * Math.PI / 3; cx.beginPath(); cx.moveTo(p.x - Math.cos(a) * r, p.y - Math.sin(a) * r); cx.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r); cx.stroke(); } }
    }
    cx.globalAlpha = 1; requestAnimationFrame(draw);
  }
  addEventListener('keydown', (e) => { if (e.key === 'f' || e.key === 'F') (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch?.(() => {}); });
  addEventListener('dblclick', () => document.documentElement.requestFullscreen?.().catch?.(() => {}));
  addEventListener('storage', paint);   // staff changed the offered demos / settings in window 1
  paint(); draw();
  window.MoHeatQueue = { st };
})();
