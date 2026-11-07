// Demo 10 — picture layer. Cute pastel cel-shaded 2D (the Demo 1–4 look): flat fills, soft gradients, dark rounded outlines.
// Static backgrounds are drawn by code once and cached. When the Seedance clips exist (assets/video/<name>.mp4, see
// Seedance素材命令.md) they replace the cached backgrounds automatically; flames, items, light and particles stay code-drawn
// on top, at the positions in GEO (re-measure GEO when the clips arrive).
window.CaveArt = (() => {
  const W = 1920, H = 1080, INK = '#3a2638';
  const GEO = {
    hut: { window: [120, 170, 500, 520], basket: [290, 862], hearth: [960, 832], kettle: [960, 640], chest: [1150, 560, 1450, 930], candle: [1300, 545], door: [1530, 180, 1860, 930] },
    gate: { door: [770, 330, 1150, 800], ledgeY: 884, candles: [560, 820, 1100, 1360] },
    tunnel: { left: [560, 590, 230, 300], right: [1360, 590, 230, 300] },
    spring: { lakeY: 640, fall: [1430, 160, 1580, 660] },
    hand: [1640, 872],
  };
  // ---------------------------------------------------------------- painted art (Seedance/GPT Image 2 → media/art/*.webp, see scripts/seedance_images.py)
  // When the painted backgrounds load, GEO switches to positions measured on them (they follow the layout refs closely).
  const ARTGEO = {
    hut: { window: [110, 160, 505, 560], basket: [340, 860], hearth: [900, 866], kettle: [960, 680], chest: [1175, 567, 1470, 925], candle: [1322, 572], door: [1520, 150, 1865, 930],
      drawers: [[1200, 603, 1453, 693], [1200, 707, 1453, 797], [1200, 810, 1453, 900]] },
    gate: { door: [722, 305, 1205, 830], ledgeY: 860, candles: [560, 820, 1100, 1360] },
    tunnel: { left: [560, 575, 245, 280], right: [1355, 565, 240, 270] },
    spring: { lakeY: 700, fall: [1410, 160, 1590, 700] },
    hand: [1640, 872],
  };
  const PIC = {};
  let HAND_WICK = [.5, .08];   // wick tip position inside prop_hand_candle (fraction of width / height), measured after cut-out
  const ART_FILES = ['bg_hut_night', 'bg_hut_fire', 'bg_gate_open', 'bg_tunnel_fork', 'bg_spring_glow', 'kohaku_base', 'kohaku_talk', 'kohaku_blink', 'kohaku_happy',
    'prop_gate_door', 'prop_candle', 'prop_hand_candle', 'prop_straw', 'prop_flint', 'prop_drawer'];
  const NOART = new URLSearchParams(location.search).has('noart');
  if (!NOART) fetch('media/art/art_meta.json?v=1').then((r) => r.json()).then((m) => { if (m.prop_hand_candle) HAND_WICK = m.prop_hand_candle.wick; }).catch(() => {});
  if (!NOART) for (const n of ART_FILES) { const im = new Image(); im.src = `media/art/${n}.webp?v=1`; im.onload = () => { PIC[n] = im; if (n === 'bg_hut_night') Object.assign(GEO, ARTGEO); }; }
  const pic = (n) => PIC[n] || null;
  // sprite helpers: draw image n with its bottom centre at (x, y) and height h; returns the drawn box
  function sprite(c, n, x, y, h, a = 1) {
    const im = PIC[n]; if (!im) return null;
    const w = im.naturalWidth * h / im.naturalHeight;
    if (a < 1) { c.save(); c.globalAlpha *= a; }
    c.drawImage(im, x - w / 2, y - h, w, h);
    if (a < 1) c.restore();
    return [x - w / 2, y - h, w, h];
  }
  // ---------------------------------------------------------------- helpers
  let seed = 1;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const lin = (c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
  const rad = (c, x, y, r0, r1, stops) => { const g = c.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
  function shape(c, fill, path, line = 5, ink = INK) { c.beginPath(); path(c); c.fillStyle = fill; c.fill(); if (line) { c.lineWidth = line; c.strokeStyle = ink; c.lineJoin = 'round'; c.stroke(); } }
  const rr = (c, x, y, w, h, r) => { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  const blob = (c, cx, cy, rx, ry, n = 9, j = .18) => { for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, k = 1 + (rand() - .5) * j * 2; const x = cx + Math.cos(a) * rx * k, y = cy + Math.sin(a) * ry * k; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.closePath(); };
  function pine(c, x, y, h, col = '#4d6f8e', snow = '#eef4ff') {
    for (let i = 0; i < 3; i++) { const yy = y - h * (.25 + i * .27), w = h * (.42 - i * .1);
      shape(c, col, (p) => { p.moveTo(x, yy - h * .34); p.lineTo(x + w, yy + h * .08); p.lineTo(x - w, yy + h * .08); p.closePath(); }, 3);
      shape(c, snow, (p) => { p.moveTo(x, yy - h * .34); p.lineTo(x + w * .45, yy - h * .12); p.lineTo(x, yy - h * .17); p.lineTo(x - w * .45, yy - h * .12); p.closePath(); }, 0); }
    shape(c, '#6b4d45', (p) => p.rect(x - h * .04, y - h * .1, h * .08, h * .12), 3);
  }

  // ---------------------------------------------------------------- hut (night, cold hearth)
  function hutBg() {
    const cv = mk(), c = cv.getContext('2d'); seed = 11;
    c.fillStyle = lin(c, 0, 0, 0, 700, [[0, '#7d5c55'], [1, '#a07b66']]); c.fillRect(0, 0, W, 700);           // wall
    c.strokeStyle = 'rgba(70,42,40,.45)'; c.lineWidth = 4; for (let x = 60; x < W; x += 128) { c.beginPath(); c.moveTo(x, 170); c.lineTo(x, 700); c.stroke(); }
    c.fillStyle = 'rgba(255,230,200,.07)'; for (let x = 0; x < W; x += 128) c.fillRect(x + 10, 170, 18, 530);
    c.fillStyle = '#4a3036'; c.fillRect(0, 0, W, 130);                                                     // ceiling + rafters
    c.fillStyle = '#5d3e3d'; for (let x = -40; x < W; x += 240) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 70, 0); c.lineTo(x + 50, 130); c.lineTo(x + 20, 130); c.fill(); }
    shape(c, '#6a4540', (p) => p.rect(-10, 128, W + 20, 46), 5);                                           // beam
    shape(c, lin(c, 0, 690, 0, H, [[0, '#b38d6c'], [1, '#8a664f']]), (p) => p.rect(-10, 690, W + 20, H), 5); // floor
    c.strokeStyle = 'rgba(90,58,48,.45)'; c.lineWidth = 3; for (let i = -10; i <= 10; i++) { c.beginPath(); c.moveTo(960 + i * 70, 690); c.lineTo(960 + i * 260, H); c.stroke(); }
    // window with the snowy night outside
    const [wx0, wy0, wx1, wy1] = GEO.hut.window;
    c.save(); c.beginPath(); c.rect(wx0, wy0, wx1 - wx0, wy1 - wy0); c.clip();
    c.fillStyle = lin(c, 0, wy0, 0, wy1, [[0, '#33427d'], [1, '#8a9bd6']]); c.fillRect(wx0, wy0, wx1 - wx0, wy1 - wy0);
    c.fillStyle = '#fff7da'; c.beginPath(); c.arc(410, 240, 36, 0, 7); c.fill(); c.fillStyle = rad(c, 410, 240, 30, 120, [[0, 'rgba(255,247,218,.45)'], [1, 'rgba(255,247,218,0)']]); c.fillRect(wx0, wy0, 380, 350);
    shape(c, '#e4ecfb', (p) => { p.moveTo(wx0, 470); p.quadraticCurveTo(300, 420, wx1, 455); p.lineTo(wx1, wy1); p.lineTo(wx0, wy1); }, 0);
    pine(c, 190, 470, 150, '#55789a'); pine(c, 300, 455, 110, '#6687a6'); pine(c, 440, 470, 170, '#4d6f8e');
    c.restore();
    shape(c, 'transparent', (p) => p.rect(wx0, wy0, wx1 - wx0, wy1 - wy0), 22, '#5a3a36');
    c.strokeStyle = '#5a3a36'; c.lineWidth = 10; c.beginPath(); c.moveTo(250, wy0); c.lineTo(250, wy1); c.moveTo(375, wy0); c.lineTo(375, wy1); c.moveTo(wx0, 345); c.lineTo(wx1, 345); c.stroke();
    shape(c, '#8b5f4a', (p) => p.rect(wx0 - 30, wy1 + 4, wx1 - wx0 + 60, 26), 5);                           // sill
    // dried persimmons on strings
    for (const sx of [600, 680, 1500 - 760]) { c.strokeStyle = '#6b4f3a'; c.lineWidth = 3; c.beginPath(); c.moveTo(sx, 174); c.lineTo(sx, 420); c.stroke();
      for (let k = 0; k < 5; k++) { shape(c, '#f08a4b', (p) => p.ellipse(sx, 210 + k * 46, 19, 21, 0, 0, 7), 3); shape(c, '#6c7d3c', (p) => p.ellipse(sx, 192 + k * 46, 9, 5, 0, 0, 7), 2); } }
    // basket (straw is drawn live)
    const [bx, by] = GEO.hut.basket;
    shape(c, lin(c, 0, by - 60, 0, by + 70, [[0, '#e3c48a'], [1, '#b98f58']]), (p) => { p.moveTo(bx - 140, by - 50); p.lineTo(bx + 140, by - 50); p.lineTo(bx + 110, by + 70); p.lineTo(bx - 110, by + 70); p.closePath(); }, 5);
    c.strokeStyle = 'rgba(120,80,40,.55)'; c.lineWidth = 3; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(bx - 135 + k * 8, by - 25 + k * 25); c.lineTo(bx + 135 - k * 8, by - 25 + k * 25); c.stroke(); }
    shape(c, '#c9a067', (p) => p.ellipse(bx, by - 50, 140, 26, 0, 0, 7), 5);
    // hearth (irori): a sunken square with ash
    const [hx, hy] = GEO.hut.hearth;
    shape(c, '#6a4334', (p) => { p.moveTo(hx - 290, hy - 80); p.lineTo(hx + 290, hy - 80); p.lineTo(hx + 360, hy + 100); p.lineTo(hx - 360, hy + 100); p.closePath(); }, 6);
    shape(c, lin(c, 0, hy - 55, 0, hy + 75, [[0, '#9b948d'], [1, '#bdb4aa']]), (p) => { p.moveTo(hx - 240, hy - 55); p.lineTo(hx + 240, hy - 55); p.lineTo(hx + 295, hy + 72); p.lineTo(hx - 295, hy + 72); p.closePath(); }, 4);
    for (let k = 0; k < 7; k++) shape(c, '#8a8580', (p) => blob(p, hx - 150 + k * 50, hy + 18 + (k % 2) * 16, 22, 13), 3);
    for (const dx of [-60, 0, 60]) shape(c, '#5b3b30', (p) => { p.moveTo(hx + dx * 1.6 - 70, hy + 40); p.lineTo(hx + dx * .6 + 6, hy - 2); p.lineTo(hx + dx * .6 + 18, hy + 8); p.lineTo(hx + dx * 1.6 - 58, hy + 52); p.closePath(); }, 3);  // charred logs
    // jizai-kagi hook and iron kettle
    const [kx, ky] = GEO.hut.kettle;
    c.strokeStyle = '#4e3a30'; c.lineWidth = 10; c.beginPath(); c.moveTo(kx, 120); c.lineTo(kx, ky - 70); c.stroke();
    shape(c, '#7a5a3a', (p) => { p.moveTo(kx - 60, 420); p.lineTo(kx + 60, 420); p.lineTo(kx + 40, 450); p.lineTo(kx - 40, 450); p.closePath(); }, 4);   // wooden fish-shaped lever
    shape(c, lin(c, kx - 90, 0, kx + 90, 0, [[0, '#4a4248'], [.35, '#6d646c'], [1, '#2f2a30']]), (p) => p.ellipse(kx, ky, 92, 66, 0, 0, 7), 6);
    shape(c, '#3d363c', (p) => p.ellipse(kx, ky - 52, 52, 14, 0, 0, 7), 4);
    shape(c, '#3d363c', (p) => { p.moveTo(kx + 80, ky - 10); p.lineTo(kx + 140, ky - 40); p.lineTo(kx + 140, ky - 26); p.lineTo(kx + 86, ky + 10); p.closePath(); }, 4);
    c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 6; c.beginPath(); c.arc(kx - 30, ky - 10, 50, 3.6, 4.4); c.stroke();
    // tansu chest (drawers drawn live, so they can open)
    const [cx0, cy0, cx1, cy1] = GEO.hut.chest;
    shape(c, lin(c, cx0, 0, cx1, 0, [[0, '#8a5634'], [1, '#6c3f26']]), (p) => rr(p, cx0, cy0, cx1 - cx0, cy1 - cy0, 10), 6);
    for (let k = 0; k < 3; k++) shape(c, '#5a321f', (p) => p.rect(cx0 + 18, cy0 + 26 + k * 116, cx1 - cx0 - 36, 100), 4);
    // sliding door
    const [dx0, dy0, dx1, dy1] = GEO.hut.door;
    shape(c, '#6c4637', (p) => p.rect(dx0 - 16, dy0 - 16, dx1 - dx0 + 32, dy1 - dy0 + 16), 6);
    shape(c, lin(c, dx0, 0, dx1, 0, [[0, '#a3785c'], [1, '#8a624b']]), (p) => p.rect(dx0, dy0, dx1 - dx0, dy1 - dy0), 5);
    c.strokeStyle = 'rgba(80,48,38,.55)'; c.lineWidth = 4; for (let y = dy0 + 70; y < dy1; y += 70) { c.beginPath(); c.moveTo(dx0 + 8, y); c.lineTo(dx1 - 8, y); c.stroke(); }
    shape(c, '#d8b56a', (p) => rr(p, dx0 + 24, 520, 22, 90, 10), 4);
    shape(c, '#f6efe0', (p) => rr(p, dx1 - 120, dy0 + 70, 70, 120, 4), 3);   // ofuda charm
    c.fillStyle = '#c0504a'; c.fillRect(dx1 - 100, dy0 + 100, 30, 30);
    return cv;
  }

  // ---------------------------------------------------------------- gate (cave mouth, snowy night)
  function gateBg() {
    const cv = mk(), c = cv.getContext('2d'); seed = 23;
    c.fillStyle = lin(c, 0, 0, 0, 760, [[0, '#1d2150'], [.6, '#4b4f95'], [1, '#9b8ccc']]); c.fillRect(0, 0, W, H);
    c.fillStyle = '#fff'; for (let i = 0; i < 140; i++) { c.globalAlpha = .3 + rand() * .7; c.beginPath(); c.arc(rand() * W, rand() * 520, rand() * 2.2 + .5, 0, 7); c.fill(); } c.globalAlpha = 1;
    c.fillStyle = rad(c, 1640, 170, 40, 260, [[0, 'rgba(255,246,214,.5)'], [1, 'rgba(255,246,214,0)']]); c.fillRect(1300, 0, 620, 500);
    shape(c, '#fff6d6', (p) => p.arc(1640, 170, 58, 0, 7), 0);
    shape(c, '#7d74b5', (p) => { p.moveTo(0, 620); p.lineTo(260, 430); p.lineTo(470, 560); p.lineTo(700, 400); p.lineTo(980, 600); p.lineTo(W, 600); p.lineTo(W, H); p.lineTo(0, H); }, 0);
    shape(c, '#9a92cc', (p) => { p.moveTo(1150, 640); p.lineTo(1500, 420); p.lineTo(1720, 540); p.lineTo(W, 450); p.lineTo(W, H); p.lineTo(1150, H); }, 0);
    // cliff face
    shape(c, lin(c, 0, 100, 0, 900, [[0, '#7c86a8'], [1, '#56607f']]), (p) => { p.moveTo(330, 900); p.lineTo(400, 400); p.lineTo(560, 210); p.lineTo(760, 130); p.lineTo(1000, 110); p.lineTo(1240, 160); p.lineTo(1420, 260); p.lineTo(1560, 470); p.lineTo(1600, 900); p.closePath(); }, 6);
    c.fillStyle = 'rgba(255,255,255,.12)'; for (const [x, y, w, h] of [[470, 420, 120, 260], [640, 200, 140, 120], [1260, 240, 150, 160], [1400, 520, 110, 240]]) { c.beginPath(); blob(c, x, y, w / 2, h / 2, 7, .25); c.fill(); }
    c.strokeStyle = 'rgba(40,30,60,.35)'; c.lineWidth = 4; for (const [x0, y0, x1, y1] of [[500, 300, 600, 480], [1300, 350, 1380, 600], [700, 200, 680, 300], [1180, 190, 1230, 280]]) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
    shape(c, '#eef3ff', (p) => { p.moveTo(540, 225); p.quadraticCurveTo(700, 120, 1000, 112); p.quadraticCurveTo(1260, 140, 1420, 262); p.quadraticCurveTo(1200, 200, 1000, 150); p.quadraticCurveTo(740, 170, 540, 225); }, 3);
    // doorway (inside: deep blue glow — shows when the stone slides away)
    const [x0, y0, x1, y1] = GEO.gate.door;
    shape(c, '#3d4462', (p) => { p.moveTo(x0 - 40, y1 + 20); p.lineTo(x0 - 40, y0 + 80); p.quadraticCurveTo((x0 + x1) / 2, y0 - 90, x1 + 40, y0 + 80); p.lineTo(x1 + 40, y1 + 20); p.closePath(); }, 6);
    c.save(); c.beginPath(); c.moveTo(x0, y1); c.lineTo(x0, y0 + 90); c.quadraticCurveTo((x0 + x1) / 2, y0 - 50, x1, y0 + 90); c.lineTo(x1, y1); c.closePath(); c.clip();
    c.fillStyle = rad(c, (x0 + x1) / 2, y1 - 120, 20, 420, [[0, '#8fe6ff'], [.35, '#2f78b8'], [1, '#0b1430']]); c.fillRect(x0, y0 - 60, x1 - x0, y1 - y0 + 60);
    c.restore();
    // shimenawa rope with shide papers
    c.lineCap = 'round';
    for (const [w, col] of [[30, INK], [24, '#d9b86c']]) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x0 - 70, y0 + 10); c.quadraticCurveTo((x0 + x1) / 2, y0 + 70, x1 + 70, y0 + 10); c.stroke(); }
    c.strokeStyle = '#a8873f'; c.lineWidth = 3; for (let k = 0; k < 14; k++) { const t = k / 13, x = x0 - 70 + (x1 - x0 + 140) * t, y = y0 + 10 + 60 * 4 * t * (1 - t) * .5 * 2; c.beginPath(); c.moveTo(x - 8, y - 10); c.lineTo(x + 8, y + 10); c.stroke(); }
    for (const t of [.22, .5, .78]) { const x = x0 - 70 + (x1 - x0 + 140) * t, y = y0 + 22 + 60 * 4 * t * (1 - t) * .5 * 2;
      shape(c, '#fbf7ee', (p) => { p.moveTo(x - 14, y); p.lineTo(x + 14, y); p.lineTo(x + 14, y + 26); p.lineTo(x - 6, y + 26); p.lineTo(x - 6, y + 52); p.lineTo(x + 14, y + 52); p.lineTo(x + 14, y + 80); p.lineTo(x - 14, y + 80); p.closePath(); }, 3); }
    // snowy ground, pines, stone ledge
    shape(c, lin(c, 0, 820, 0, H, [[0, '#e6edfb'], [1, '#b9c5e8']]), (p) => { p.moveTo(0, 860); p.quadraticCurveTo(500, 800, 960, 840); p.quadraticCurveTo(1500, 880, W, 830); p.lineTo(W, H); p.lineTo(0, H); }, 5);
    pine(c, 150, 900, 360, '#3f6185'); pine(c, 300, 870, 240, '#4f739a'); pine(c, 1760, 900, 380, '#3f6185'); pine(c, 1620, 860, 230, '#4f739a');
    const ly = GEO.gate.ledgeY;
    shape(c, '#7884a3', (p) => rr(p, 420, ly, 1080, 46, 10), 5);
    shape(c, '#5f6a88', (p) => p.rect(470, ly + 46, 980, 40), 5);
    shape(c, '#f2f6ff', (p) => { p.moveTo(420, ly + 4); p.quadraticCurveTo(960, ly - 14, 1500, ly + 4); p.lineTo(1500, ly + 12); p.quadraticCurveTo(960, ly + 4, 420, ly + 12); }, 0);
    return cv;
  }
  function gateSlab(c, open) {                       // the stone door, slides left as it opens
    const [x0, y0, x1, y1] = GEO.gate.door, dx = -open * (x1 - x0 + 60);
    if (PIC.prop_gate_door) {   // painted door slab, clipped to the arched doorway
      c.save(); c.beginPath(); c.moveTo(x0, y1 + 4); c.lineTo(x0, y0 + (x1 - x0) * .42); c.quadraticCurveTo(x0, y0, (x0 + x1) / 2, y0); c.quadraticCurveTo(x1, y0, x1, y0 + (x1 - x0) * .42); c.lineTo(x1, y1 + 4); c.closePath(); c.clip();
      c.drawImage(PIC.prop_gate_door, x0 - 14 + dx, y0 - 10, x1 - x0 + 28, y1 - y0 + 22); c.restore(); return;
    }
    c.save(); c.beginPath(); c.moveTo(x0 - 40, y1 + 20); c.lineTo(x0 - 40, y0 + 80); c.quadraticCurveTo((x0 + x1) / 2, y0 - 90, x1 + 40, y0 + 80); c.lineTo(x1 + 40, y1 + 20); c.closePath(); c.clip();
    c.translate(dx, 0);
    shape(c, lin(c, x0, 0, x1, 0, [[0, '#8a95b4'], [1, '#6c7796']]), (p) => { p.moveTo(x0, y1); p.lineTo(x0, y0 + 90); p.quadraticCurveTo((x0 + x1) / 2, y0 - 50, x1, y0 + 90); p.lineTo(x1, y1); p.closePath(); }, 6);
    const cx = (x0 + x1) / 2, cy = y0 + 260;                                   // carved flame-and-drop crest
    c.strokeStyle = 'rgba(40,30,60,.55)'; c.lineWidth = 7; c.beginPath(); c.arc(cx, cy, 92, 0, 7); c.stroke();
    c.lineWidth = 6; c.beginPath(); c.moveTo(cx - 34, cy + 40); c.quadraticCurveTo(cx - 60, cy - 10, cx - 30, cy - 60); c.quadraticCurveTo(cx - 20, cy - 20, cx - 6, cy - 10); c.quadraticCurveTo(cx, cy + 30, cx - 34, cy + 40); c.stroke();
    c.beginPath(); c.moveTo(cx + 30, cy - 55); c.quadraticCurveTo(cx + 66, cy, cx + 40, cy + 34); c.quadraticCurveTo(cx + 14, cy + 44, cx + 16, cy + 10); c.quadraticCurveTo(cx + 18, cy - 20, cx + 30, cy - 55); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.14)'; c.fillRect(x0 + 20, y0 + 120, 26, y1 - y0 - 160);
    c.restore();
  }

  // ---------------------------------------------------------------- tunnel fork (two variants)
  function tunnelBg(v) {
    const cv = mk(), c = cv.getContext('2d'); seed = 37 + v * 13;
    if (v) { c.translate(W, 0); c.scale(-1, 1); }
    const wall = v ? ['#5d5070', '#43384f'] : ['#6b5466', '#4a3a4c'];
    c.fillStyle = lin(c, 0, 0, 0, H, [[0, wall[1]], [.5, wall[0]], [1, wall[1]]]); c.fillRect(0, 0, W, H);
    for (let i = 0; i < 46; i++) { c.fillStyle = `rgba(255,235,240,${.04 + rand() * .06})`; c.beginPath(); blob(c, rand() * W, rand() * H, 60 + rand() * 120, 40 + rand() * 90, 8, .3); c.fill(); }
    shape(c, lin(c, 0, 820, 0, H, [[0, '#7a6476'], [1, '#56455a']]), (p) => { p.moveTo(0, 900); p.quadraticCurveTo(960, 800, W, 900); p.lineTo(W, H); p.lineTo(0, H); }, 5);
    for (const k of ['left', 'right']) {
      const [ox, oy, rx, ry] = GEO.tunnel[k];
      shape(c, '#2a2032', (p) => blob(p, ox, oy, rx + 40, ry + 30, 14, .06), 6);
      c.save(); c.beginPath(); blob(c, ox, oy, rx, ry, 14, .05); c.clip();
      c.fillStyle = rad(c, ox, oy + 40, 10, ry * 1.1, [[0, '#06040a'], [.6, '#140e1c'], [1, '#2a2032']]); c.fillRect(ox - rx - 50, oy - ry - 50, rx * 2 + 100, ry * 2 + 100);
      c.restore();
    }
    shape(c, wall[0], (p) => { p.moveTo(820, 1000); p.quadraticCurveTo(860, 500, 930, 320); p.quadraticCurveTo(960, 280, 990, 320); p.quadraticCurveTo(1060, 500, 1100, 1000); p.closePath(); }, 6);   // centre pillar
    c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(900, 380, 18, 520);
    for (let i = 0; i < 16; i++) { const x = 40 + i * 122 + rand() * 40, h = 60 + rand() * 150;
      shape(c, wall[1], (p) => { p.moveTo(x - 30, -5); p.lineTo(x + 30, -5); p.lineTo(x + 4, h); p.lineTo(x - 4, h); p.closePath(); }, 4); }
    for (let i = 0; i < 8; i++) { const x = 60 + rand() * 1800, y = 930 + rand() * 120; shape(c, '#6f5a6c', (p) => blob(p, x, y, 40 + rand() * 50, 18 + rand() * 18, 8, .2), 4); }
    return cv;
  }

  // ---------------------------------------------------------------- underground spring: dark and glowing layers
  function springBg(glow) {
    const cv = mk(), c = cv.getContext('2d'); seed = 71;
    c.fillStyle = glow ? lin(c, 0, 0, 0, 700, [[0, '#1c2448'], [1, '#2d5b8a']]) : lin(c, 0, 0, 0, 700, [[0, '#2a2236'], [1, '#3b3046']]); c.fillRect(0, 0, W, H);
    for (let i = 0; i < 30; i++) { const x = rand() * W, h = 80 + rand() * 260; shape(c, glow ? '#2b3a66' : '#40344c', (p) => { p.moveTo(x - 40, -5); p.lineTo(x + 40, -5); p.lineTo(x + 3, h); p.lineTo(x - 3, h); p.closePath(); }, 4); }
    if (glow) { for (let i = 0; i < 260; i++) { const x = rand() * W, y = rand() * 420; c.fillStyle = `rgba(160,255,240,${.35 + rand() * .6})`; c.beginPath(); c.arc(x, y, 1 + rand() * 3, 0, 7); c.fill(); }
      c.fillStyle = rad(c, 960, 250, 50, 900, [[0, 'rgba(120,240,255,.18)'], [1, 'rgba(120,240,255,0)']]); c.fillRect(0, 0, W, 700); }
    // far shore rocks
    shape(c, glow ? '#33507a' : '#3a3044', (p) => { p.moveTo(0, 660); p.lineTo(220, 560); p.lineTo(420, 610); p.lineTo(640, 540); p.lineTo(860, 600); p.lineTo(1120, 560); p.lineTo(1380, 600); p.lineTo(1420, 660); p.lineTo(0, 680); }, 5);
    // waterfall
    const [fx0, fy0, fx1, fy1] = GEO.spring.fall;
    shape(c, glow ? '#3a5584' : '#3d3248', (p) => { p.moveTo(1340, 0); p.lineTo(1340, fy0); p.lineTo(fx0, fy0 - 20); p.lineTo(fx1, fy0 - 20); p.lineTo(1700, fy0 + 40); p.lineTo(1760, 700); p.lineTo(W, 700); p.lineTo(W, 0); }, 6);
    c.fillStyle = glow ? lin(c, fx0, 0, fx1, 0, [[0, '#9ff3ff'], [.5, '#ffffff'], [1, '#8fe2ff']]) : lin(c, fx0, 0, fx1, 0, [[0, '#5a6a88'], [1, '#6c7a96']]);
    c.beginPath(); c.moveTo(fx0, fy0 - 20); c.lineTo(fx1, fy0 - 20); c.lineTo(fx1 + 30, fy1); c.lineTo(fx0 - 30, fy1); c.closePath(); c.fill(); c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
    // lake
    c.fillStyle = glow ? lin(c, 0, 640, 0, H, [[0, '#7ff0ff'], [.35, '#2fa6d8'], [1, '#155a96']]) : lin(c, 0, 640, 0, H, [[0, '#2c3a52'], [1, '#18202e']]);
    c.beginPath(); c.moveTo(0, 680); c.quadraticCurveTo(960, 620, W, 690); c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fill(); c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
    if (glow) { c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 3; for (let i = 0; i < 26; i++) { const y = 700 + rand() * 360, x = rand() * W, w = 40 + rand() * 160; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.stroke(); } }
    // glowing crystals and the near shore
    for (const [x, y, s] of [[180, 980, 1], [300, 1010, .7], [1700, 1000, .9], [1820, 960, 1.2]]) {
      for (const a of [-.4, 0, .35]) { c.save(); c.translate(x + a * 60 * s, y); c.rotate(a);
        shape(c, glow ? '#b6f4ff' : '#5c6680', (p) => { p.moveTo(-18 * s, 0); p.lineTo(0, -120 * s * (a ? .7 : 1)); p.lineTo(18 * s, 0); p.closePath(); }, 4); c.restore(); }
    }
    shape(c, glow ? '#2a3f66' : '#30283a', (p) => { p.moveTo(0, 940); p.quadraticCurveTo(300, 900, 560, 1000); p.quadraticCurveTo(700, 1060, 760, H + 10); p.lineTo(0, H + 10); p.closePath(); }, 5);
    return cv;
  }

  // ---------------------------------------------------------------- live pieces
  function flame(c, x, y, s, t, kind = 'warm', a = 1, k = 0) {
    if (a <= .01 || s <= .01) return;
    const f = Math.sin(t * 13 + k * 3) * .06 + Math.sin(t * 7.3 + k) * .05, sway = Math.sin(t * 3.1 + k * 2) * 6 * s, h = 70 * s * (1 + f), w = 22 * s;
    const pal = kind === 'fox' ? ['rgba(120,210,255,', '#7fd6ff', '#c8f0ff', '#ffffff'] : ['rgba(255,150,60,', '#ff8a3d', '#ffc24d', '#fff6d0'];
    c.save(); c.globalAlpha = a;
    c.globalCompositeOperation = 'lighter'; c.fillStyle = rad(c, x, y - h * .4, 2, h * 1.6, [[0, pal[0] + '.45)'], [1, pal[0] + '0)']]); c.fillRect(x - h * 1.6, y - h * 2, h * 3.2, h * 3.2);
    c.globalCompositeOperation = 'source-over';
    const tear = (sc, col) => { c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x - w * sc, y, x - w * sc * 1.05, y - h * sc * .55, x + sway * sc, y - h * sc); c.bezierCurveTo(x + w * sc * 1.05, y - h * sc * .55, x + w * sc, y, x, y); c.fillStyle = col; c.fill(); };
    tear(1, pal[1]); tear(.68, pal[2]); tear(.36, pal[3]);
    c.restore();
  }
  function candle(c, x, y, h = 120, w = 34) {      // white candle standing on y
    if (PIC.prop_candle) { const H2 = h * 1.38; sprite(c, 'prop_candle', x, y + 8, H2); return [x, y + 8 - H2 + H2 * .03]; }
    shape(c, '#c7a052', (p) => p.ellipse(x, y, w * 1.4, 12, 0, 0, 7), 4);
    shape(c, lin(c, x - w / 2, 0, x + w / 2, 0, [[0, '#fff8ec'], [1, '#e9dcc8']]), (p) => rr(p, x - w / 2, y - h, w, h, 6), 4);
    c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y - h); c.lineTo(x, y - h - 12); c.stroke();
    return [x, y - h - 8];
  }
  function handCandle(c, t, lit, sway = 1) {        // 手燭 held at the bottom right: returns the flame base
    const [hx, hy] = GEO.hand, dx = Math.sin(t * .9) * 6 * sway, dy = Math.sin(t * 1.3) * 4 * sway;
    if (PIC.prop_hand_candle) {   // painted 手燭: dish resting just above the bottom edge, flame on the wick
      const im = PIC.prop_hand_candle, H2 = 270, w = im.naturalWidth * H2 / im.naturalHeight, x0 = hx + dx - w * HAND_WICK[0], y0 = H - 6 - H2 + dy;
      c.drawImage(im, x0, y0, w, H2); return [hx + dx, y0 + H2 * HAND_WICK[1] + 4]; }
    c.save(); c.translate(dx, dy);
    shape(c, '#d8a84f', (p) => p.ellipse(hx, hy + 170, 110, 26, 0, 0, 7), 5);
    shape(c, '#b98a3a', (p) => rr(p, hx + 90, hy + 160, 180, 22, 10), 4);
    shape(c, lin(c, hx - 24, 0, hx + 24, 0, [[0, '#fffaf0'], [1, '#eadcc4']]), (p) => rr(p, hx - 24, hy + 10, 48, 160, 8), 4);
    c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(hx, hy + 10); c.lineTo(hx, hy - 2); c.stroke();
    c.restore();
    return [hx + dx, hy + dy + 2];
  }
  // darkness with holes for light: lights = [{x,y,r,a}] (a = how much it clears), warm = [{x,y,r,a,col}] additive tint
  const lc = mk(), lx = lc.getContext('2d');
  function light(c, dark, lights, warm = []) {
    lx.globalCompositeOperation = 'source-over'; lx.clearRect(0, 0, W, H); lx.fillStyle = `rgba(6,6,22,${dark})`; lx.fillRect(0, 0, W, H);
    lx.globalCompositeOperation = 'destination-out';
    for (const L of lights) { if (L.a <= .01) continue; lx.fillStyle = rad(lx, L.x, L.y, 0, L.r, [[0, `rgba(0,0,0,${L.a})`], [.55, `rgba(0,0,0,${L.a * .6})`], [1, 'rgba(0,0,0,0)']]); lx.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2); }
    c.drawImage(lc, 0, 0);
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const L of warm) { if (L.a <= .01) continue; c.fillStyle = rad(c, L.x, L.y, 0, L.r, [[0, `rgba(${L.col || '255,140,60'},${L.a})`], [1, `rgba(${L.col || '255,140,60'},0)`]]); c.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2); }
    c.restore();
  }

  // ---------------------------------------------------------------- backgrounds: Seedance clip if present, else code-drawn (cached)
  const cache = {};
  const BG = { hut: () => hutBg(), gate: () => gateBg(), tunnel0: () => tunnelBg(0), tunnel1: () => tunnelBg(1), spring: () => springBg(false), springGlow: () => springBg(true) };
  const CLIPS = { hut: 'hut_night', hutFire: 'hut_fire', gate: 'gate_night', gateOpen: 'gate_open', tunnel0: 'tunnel_fork', tunnel1: 'tunnel_fork', spring: 'spring_dark', springGlow: 'spring_glow' };
  const video = {};
  const QS = new URLSearchParams(location.search);
  function loadClips() {
    if (QS.has('nofilm')) return;
    for (const name of new Set(Object.values(CLIPS))) {
      const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.loop = name !== 'gate_open'; v.preload = 'auto';
      v.addEventListener('loadeddata', () => { video[name] = v; if (v.loop) v.play().catch(() => {}); }, { once: true });
      v.addEventListener('error', () => {}, { once: true });
      v.src = `assets/video/${name}.mp4`;
    }
  }
  const BGART = { hut: 'bg_hut_night', hutFire: 'bg_hut_fire', gate: 'bg_gate_open', tunnel0: 'bg_tunnel_fork', tunnel1: 'bg_tunnel_fork', spring: 'bg_spring_glow', springGlow: 'bg_spring_glow' };
  function drawBg(c, key, a = 1, flip = false) {
    if (a <= 0) return;
    const v = video[CLIPS[key]];
    const im = !(v && v.readyState >= 2) && PIC[BGART[key]];
    if (im) {   // painted: tunnel1 is the same fork mirrored; the unlit spring is the glowing one, darkened
      c.save(); c.globalAlpha = a;
      if (flip !== (key === 'tunnel1')) { c.translate(W, 0); c.scale(-1, 1); }
      c.drawImage(im, 0, 0, W, H);
      if (key === 'spring') { c.globalCompositeOperation = 'multiply'; c.fillStyle = 'rgb(70,72,96)'; c.fillRect(0, 0, W, H); }
      c.restore(); return;
    }
    c.save(); c.globalAlpha = a;
    if (flip) { c.translate(W, 0); c.scale(-1, 1); }
    if (v && v.readyState >= 2) { if (v.paused && v.loop) v.play().catch(() => {}); const s = Math.max(W / v.videoWidth, H / v.videoHeight); c.drawImage(v, (W - v.videoWidth * s) / 2, (H - v.videoHeight * s) / 2, v.videoWidth * s, v.videoHeight * s); }
    else { if (flip) { c.translate(W, 0); c.scale(-1, 1); } c.drawImage(cache[key] || (cache[key] = BG[key]()), 0, 0); }
    c.restore();
  }
  const hasClip = (key) => !!video[CLIPS[key]];
  const hasArt = (key) => !!PIC[BGART[key]];
  return { W, H, INK, GEO, flame, candle, handCandle, gateSlab, light, drawBg, hasClip, hasArt, loadClips, video, shape, rr, lin, rad, blob, pic, sprite };
})();
