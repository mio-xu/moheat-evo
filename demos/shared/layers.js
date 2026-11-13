// shared/layers.js — layered stills for canvas demos (DEMO_DESIGN_GUIDE §6.2 strict layers + face patches, §6.3 no video by default).
//
// Whenever the page draws one of its stills on a 2D canvas (ctx.drawImage(<img …/gaku_live.jpg>)), this draws a live composite of
// that view's layers instead, at the same place and size:
//   background  one plate per location, zoomed / panned per view so its fire lands where the page expects it; depth parallax
//               (mouse / phone tilt + slow sway), heat shimmer and flicker over the fire
//   character   a cut-out pose (plain-background art), breathing (code), a small bob while talking, warm rim light facing the fire
//   face        expression patches cut from Seedance variants (tools/art/face_patches.py): the mouth fades with the voice loudness,
//               the eyes close for ~0.13 s blinks — the grandparents-call method. The mouth is open OR closed (never half-faded: a double
//               mouth), only in the view on screen, only while the voice level says so; patches are clipped to the character's alpha.
// Everything else the page draws on top (sparks, snow, steam, glows, UI) stays as it is, so an existing demo's main.js can be reused
// BY PATH without changes.
//
// Use, before the demo's main.js:  <script src="media/layers.js"></script> (data)  <script src="../../shared/layers.js"></script>
// Data (window.MOHEAT_LAYERS):
//   skipVideo: "regex"                      <video> sources of the base demo this page does not use (answered with 'error', no request)
//   views: { <still file stem>: { view, alias?: [other view names drawing the same still], fire: [x, y] (where the fire must appear, frame fraction) or null,
//            bg: { src, depth?, fire: [x, y] (fire in the plate, fraction), zoom? },
//            char: { src, w, h, x, y, height } (anchored at its bottom centre: x, y = frame fraction, height = fraction of the frame),
//            patches: [ { src, rect: [x, y, w, h] in char pixels, kind: "mouth" | "eyes" | "mouth_quiet" | "mouth_lv", level? } ] } }   (mouth_quiet: closed mouth over an open-mouth pose, shown in silence;
//            mouth_lv: a LivePortrait mouth SET, tools/art/lp_mouths.py — level 0 = closed, 1..n wider; exactly one block of the set is drawn)
// Several characters in one view (Demo43 dawn trio, 2026-11-08; tools/art/build_stage.py "more"): views.<stem>.more = [{ char, patches }, …]
//   drawn after the main one (back → front), each with its own breathing phase, blinks and mouth set; char.who = its speaker key, and with
//   hooks.who (where the page keeps the speaker, e.g. "INN.S.who") a figure's mouth moves only while that one speaks. No who = as before.
// Data hooks (optional): hooks: { view: "HINA.S.view", mouth: "HINA.FW.mouth" (0..1) | lv: "JIN.S.lv" (+ lvGain, default 25), level / raw: paths } — where the base demo keeps its state.
// Hooks (optional): MoHeatLayers.level() → 0..1 talking envelope (default window.STREAM.S.env), MoHeatLayers.raw() → raw voice level
// (default window.STREAM.S.lv), MoHeatLayers.current() → the view on screen (default window.STREAM.S.view).
// Motion (DEMO_DESIGN_GUIDE §6.4 physics checklist): breathing lifts the head + shoulders and stretches only the torso below the
// shoulder line (the head is never scaled; ~15 breaths / min, inhale 40 %, exhale 60 %); the talking nod moves the head only;
// blinks 0.11–0.15 s every 2–6 s, ~15 % doubles, never across a view cut; a pose cut by the frame edge is extended at that edge
// (no gap when it moves). char: { chin, shoulder } (fractions of the pose height) override the lines found from the face patches.
// MoHeatLayers.toFrame(stem, x, y, 'char' | 'bg') → where a point of the still (1920×1080 px) is drawn right now (effects attached
// to a hand / prop follow the parallax and breathing); MoHeatLayers.flicker() → the fire flicker (page glows in sync);
// MoHeatLayers.live → the page must not add its own zoom / bob drift (the background would breathe). Tests: tools/art/check_motion.js.
// ?flat (or ?cover / ?stills / ?render) = the page's own stills. No WebGL or a layer still loading = the page's own still too.
(() => {
  const D = window.MOHEAT_LAYERS; if (!D || !D.views) return;
  const qs = new URLSearchParams(location.search);
  if (qs.has('flat') || qs.has('cover') || qs.has('stills') || qs.has('render')) return;
  const API = window.MoHeatLayers = window.MoHeatLayers || {};
  const get = (path) => String(path).split('.').reduce((o, k) => (o == null ? o : o[k]), window);   // "HINA.FW.mouth" → its value
  const H = D.hooks || {};   // per page: where the base demo keeps its state (default: Demo24-style window.STREAM)
  API.level = API.level || (() => +(H.level ? get(H.level) : window.STREAM?.S?.env) || 0);
  API.raw = API.raw || (() => +(H.raw ? get(H.raw) : window.STREAM?.S?.lv) || 0);
  API.mouth = API.mouth || (H.mouth ? () => +get(H.mouth) || 0                                // a ready 0..1 mouth opening (Demo20 / 12's FW.mouth)
    : H.lv ? () => Math.max(0, Math.min(1, ((+get(H.lv) || 0) - .006) * (H.lvGain || 25)))       // or the raw voice level (Demo21 / 22's S.lv)
    : null);
  // the raw voice level (syllables): hooks.lv / hooks.raw, MoHeatLayers.raw(), or next to a mouth hook's state (HINA.FW.mouth → HINA.S.lv)
  const voiceRaw = H.lv ? () => get(H.lv) : H.raw ? () => get(H.raw) : H.mouth && H.view ? () => get(H.view.replace(/view$/, 'lv')) : () => API.raw();
  API.speaker = API.speaker || (H.who ? () => get(H.who) : () => null);   // multi-character views: whose mouth may move
  API.current = API.current || (() => (H.view ? get(H.view) : window.STREAM?.S?.view) || Object.values(D.views)[0].view);

  if (D.skipVideo) {   // the base demo's own clips are not part of this page: no requests, an 'error' instead
    const re = new RegExp(D.skipVideo), desc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
    Object.defineProperty(HTMLMediaElement.prototype, 'src', { configurable: true, get() { return desc.get.call(this); },
      set(v) { if (re.test(String(v))) { setTimeout(() => this.dispatchEvent(new Event('error')), 0); return; } desc.set.call(this, v); } });
  }

  // ---------------------------------------------------------------- WebGL
  const big = Math.max(screen.width, screen.height) * (devicePixelRatio || 1) >= 1600;
  const glc = document.createElement('canvas'); glc.width = big ? 1920 : 1280; glc.height = big ? 1080 : 720;
  const gl = glc.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false });
  if (!gl) return;
  const VS = 'attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;uv.y=1.-uv.y;gl_Position=vec4(p,0,1);}';
  const FS = `precision highp float;varying vec2 uv;
uniform sampler2D bg,dep,chr;uniform vec2 off,fire,bgO,bob;uniform vec4 crect;uniform float bgZ,t,flick,hasFire,hasDep,breath,only;uniform vec2 neck;uniform vec4 edge;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
vec2 toBg(vec2 u){return (u-bgO)/bgZ;}
vec4 charAt(vec2 u){   // crect = x, y (top-left), w, h in frame fractions. Breathing (breath = lift, frame fraction) moves the head and
  // shoulders up unscaled and stretches only the torso below the shoulder line (neck.y); the talking nod (-bob.y) moves the head
  // above the chin (neck.x) only, the neck band between them takes up the difference. The bottom edge never moves.
  float y=(u.y-crect.y)/crect.w,c=neck.x,s=neck.y,Lb=breath/crect.w,Lt=Lb-bob.y/crect.w,v;
  if(y<=c-Lt)v=y+Lt;else if(y<=s-Lb){float k=(Lb-Lt)/(s-c);v=(y+Lt-k*c)/(1.-k);}else{float m=Lb/(1.-s);v=(y+m)/(1.+m);}
  vec2 b=vec2((u.x-crect.x)/crect.z,v);
  if(edge.x>.5)b.x=max(b.x,.001);if(edge.y>.5)b.x=min(b.x,.999);if(edge.z>.5)b.y=max(b.y,.001);if(edge.w>.5)b.y=min(b.y,.999);   // cut by the frame: extend
  if(b.x<0.||b.y<0.||b.x>1.||b.y>1.)return vec4(0.);return texture2D(chr,b);}
void main(){
  vec2 u=(uv-.5)/1.02+.5;
  vec2 q=u;
  if(hasDep>.5){for(int i=0;i<3;i++){float d=texture2D(dep,toBg(q)).r;q=u-off*(d-.3)*.6;}}else q=u+off*.15;
  float zone=0.,up=0.;
  if(hasFire>.5){vec2 dv=(q-fire)*vec2(16./9.,1.);zone=smoothstep(.12,0.,length(dv*vec2(1.,.75)))*step(q.y,fire.y+.07);up=clamp((fire.y+.07-q.y)*8.,0.,1.);}
  vec2 wob=vec2(noise(vec2(q.x*40.,q.y*25.+t*3.))-.5,noise(vec2(q.x*30.+9.,q.y*40.+t*4.))-.5)*.012*up*zone;
  vec3 col=texture2D(bg,toBg(q+wob)).rgb;
  float warm=clamp(col.r-col.b,0.,1.);
  col*=1.+hasFire*(flick-1.)*(.35*warm+.5*zone);
  vec2 cu=u-off*.55;
  vec4 ch=charAt(cu);
  float rim=0.;
  if(hasFire>.5){vec2 dir=normalize((fire-cu)*vec2(1.7778,1.)+1e-5);rim=ch.a*(1.-charAt(cu+dir*vec2(.0035,.0062)).a);}
  vec3 cc=ch.rgb+rim*vec3(1.,.55,.22)*.8*flick+hasFire*ch.a*smoothstep(.25,.9,cu.x)*vec3(.06,.025,0.)*(flick-.6);
  gl_FragColor=only>.5?vec4(cc,ch.a):vec4(mix(col,cc,ch.a),1.);}`;   // only: a further character over the frame drawn so far
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error('[layers]', gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const ap = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(ap); gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0);
  const U = {}; for (const n of ['bg', 'dep', 'chr', 'off', 'fire', 'bgO', 'bob', 'crect', 'bgZ', 't', 'flick', 'hasFire', 'hasDep', 'breath', 'neck', 'edge', 'only']) U[n] = gl.getUniformLocation(pr, n);
  ['bg', 'dep', 'chr'].forEach((n, i) => gl.uniform1i(U[n], i));
  const newTex = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); return t; };
  const upload = (tex, src) => { gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); };
  const chrTex = newTex();
  let solid = null; const solidTex = () => solid || (solid = (() => { const t_ = newTex(); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 0, 255, 255])); return t_; })());
  const blinkOn = () => (API.debug && API.debug.blink != null ? !!API.debug.blink : t < blinkUntil);
  const cc = document.createElement('canvas'), cx2 = cc.getContext('2d');   // the character + its face patches, composed each frame

  // ---------------------------------------------------------------- layers per view (loaded on demand, all preloaded after the page load)
  const base = 'media/';
  const L = {}, IMGS = {}, BGT = {};
  const img = (src) => IMGS[src] || (IMGS[src] = new Promise((res) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => res(null); im.src = base + src; }));
  function fig(cd, pats, ch, ims) {   // one character layer: cut-out + face patches, placement, chin / shoulder lines
    const g = { who: cd.who || null, ch, ps: (pats || []).map((p, i) => ({ ...p, im: ims[i] })).filter((p) => p.im), bu: 0, nb: -1, seen: -9 };
    g.order = [...g.ps.filter((p) => p.kind === 'eyes'), ...g.ps.filter((p) => p.kind !== 'eyes')];
    g.nLv = Math.max(0, ...g.ps.filter((p) => p.kind === 'mouth_lv').map((p) => p.level || 0));
    const hf = cd.height, wf = hf * (cd.w / cd.h) * (9 / 16);
    g.rect = [cd.x - wf / 2, cd.y - hf, wf, hf];
    // chin + shoulder lines (fractions of the pose height) from the face patches: breathing lifts what is above the shoulders
    const H0 = ch.height, cy_ = (p) => (p.rect[1] + p.rect[3] / 2) / H0, pm = g.ps.find((p) => /^mouth/.test(p.kind)), pe = g.ps.filter((p) => p.kind === 'eyes');
    let cn = cd.chin, sn = cd.shoulder;
    if (cn == null && pm) { const ym = cy_(pm), f = pe.length ? Math.max(.03, ym - pe.reduce((a, p) => a + cy_(p), 0) / pe.length) : 1.6 * pm.rect[3] / H0; cn = ym + .45 * f; sn = sn ?? ym + 1.4 * f; }
    cn = Math.max(.05, Math.min(.8, cn ?? .25)); sn = Math.min(.92, Math.max(cn + .04, sn ?? cn + .13)); g.neck = [cn, sn];
    g.edge = [g.rect[0] <= .01, g.rect[0] + g.rect[2] >= .99, g.rect[1] <= .01, g.rect[1] + g.rect[3] >= .99].map(Number);   // touches L / R / top / bottom
    return g;
  }
  function load(stem) {
    if (L[stem]) return L[stem];
    const c = D.views[stem], o = L[stem] = { c, ready: false };
    const more = c.more || [];
    Promise.all([img(c.bg.src), c.bg.depth ? img(c.bg.depth) : null, img(c.char.src), ...(c.patches || []).map((p) => img(p.src)),
      Promise.all(more.map((m) => Promise.all([img(m.char.src), ...(m.patches || []).map((p) => img(p.src))])))]).then(([b, d, ch, ...rest]) => {
      const ms = rest.pop(), ps = rest;
      if (!b || !ch) { o.failed = true; return; }
      const tex = (src, im) => BGT[src] || (BGT[src] = (() => { const t_ = newTex(); upload(t_, im); return t_; })());   // one texture per plate, shared by its views
      o.bgT = tex(c.bg.src, b); if (d) o.depT = tex(c.bg.depth, d);
      // the plate's zoom + offset: its fire lands on the view's fire, never showing an edge
      const f = c.fire, bf = c.bg.fire; let z = c.bg.zoom || 1, ox, oy;
      if (f && bf) {
        for (const k of [0, 1]) z = Math.max(z, f[k] / bf[k], (1 - f[k]) / (1 - bf[k]));
        ox = f[0] - bf[0] * z; oy = f[1] - bf[1] * z;
      } else { ox = (1 - z) / 2; oy = (1 - z) / 2; }
      o.z = z; o.o = [ox, oy];
      o.figs = [fig(c.char, c.patches, ch, ps), ...more.map((m, i) => ms[i][0] && fig(m.char, m.patches, ms[i][0], ms[i].slice(1))).filter(Boolean)];
      Object.assign(o, o.figs[0]);   // ch, ps, order, nLv, rect, neck, edge of the main character (toFrame, motion, tests)
      o.ready = true;
    });
    return o;
  }
  const byView = {}; for (const [stem, c] of Object.entries(D.views)) for (const v of [c.view, ...(c.alias || [])]) byView[v] = stem;
  addEventListener('load', () => { for (const s of Object.keys(D.views)) load(s); });

  // ---------------------------------------------------------------- input, breathing, voice, blinks
  let tx = 0, ty = 0, px = 0, py = 0, bph = 0, liveT = 0, breathY = .5, lastCv = null, dbl = 0, lastDraw = null;
  const blinkLog = [];
  addEventListener('pointermove', (e) => { tx = (e.clientX / innerWidth - .5) * 2; ty = (e.clientY / innerHeight - .5) * 2; }, { passive: true });
  addEventListener('deviceorientation', (e) => { if (e.gamma == null) return; tx = Math.max(-1, Math.min(1, e.gamma / 25)); ty = Math.max(-1, Math.min(1, (e.beta - 45) / 25)); });
  let dl = 0, dlPrev = 0, dlSince = -9, ampEnv = 0, quietAt = 0, nf = .01, openSince = 0;   // mouth SETS (mouth_lv): the smoothed driver below
  const HAS_SET = Object.values(D.views).some((v) => [v, ...(v.more || [])].some((f) => (f.patches || []).some((p) => p.kind === 'mouth_lv')));
  let lastT = 0, t = 0, frameT = -1, flick = 1, env = 0, mouth = 0, mouthOpen = false, mouthHold = 0, talk = 0, lastTgt = 0, lastV = 0, peak = .012, openedAt = 0, lvl = 1, lvlHold = 0, vAvg = .02, blinkUntil = 0, nextBlink = 2;
  function step(now) {
    t = now / 1000; const dt = Math.min(.05, t - lastT || .016); lastT = t;
    flick = 1 + .10 * Math.sin(t * 7.3) + .07 * Math.sin(t * 13.1 + 1.7) + .05 * Math.sin(t * 23.7 + .4);
    px += (tx - px) * .06; py += (ty - py) * .06;
    env = Math.max(0, Math.min(1, +API.level() || 0));
    const tgt = API.mouth ? Math.max(0, Math.min(1, API.mouth())) : env > .05 ? Math.max(0, Math.min(1, ((+API.raw() || 0) - .005) / .05)) : 0;
    // open / closed with hysteresis + a minimum hold (anime lip flap). A half-transparent open mouth over the closed one is a double
    // mouth (two lip lines), so the patch is never half-faded: it switches in one frame and holds ≥ 60 ms (no frame-to-frame flicker).
    // Syllables, not phrases: the level relative to its recent peak (slow decay) — a plain threshold kept the mouth open through
    // whole sentences (Demo25 2026-11-08: open 95 % of the talking time). No raw level available (mouth hook only) → the 0..1 signal.
    const v = Math.max(0, +voiceRaw() || 0);
    peak = Math.max(v, peak * Math.exp(-dt / 1.2), .012);
    const rel = tgt > .05 && v > 0 ? v / peak : tgt;
    // a long loud vowel keeps rel high: after 0.45 s open the mouth closes for ~0.09 s anyway (flaps, never a frozen open mouth)
    if (t >= mouthHold && (mouthOpen ? rel < .55 || tgt < .05 || t - openedAt > .45 : rel > .7 && tgt > .2)) {
      mouthOpen = !mouthOpen; mouthHold = t + (mouthOpen ? .06 : .09); if (mouthOpen) openedAt = t; }
    mouth = mouthOpen ? 1 : 0;   // a hard switch: any in-between alpha shows both lip lines
    // mouth sets (mouth_lv): how wide, from the loudness — normal speech on levels 1–2, only loud peaks reach the widest; held ≥ 80 ms
    // (the voice level against its own running average while talking: a peak is a syllable, not "loud speech" — Demo18 sat on lv3 51 %)
    if (tgt > .05 && v > 0) vAvg += (v - vAvg) * (1 - Math.exp(-dt / 3));
    if (mouthOpen && t >= lvlHold) { const amp = v > 0 ? v / Math.max(vAvg, 1e-4) : tgt * 1.6, want = amp > 2.1 ? 3 : amp > 1.1 ? 2 : 1;
      if (want !== lvl) { lvl = want; lvlHold = t + .08; } }
    // mouth SETS (2026-11-13, user: "the mouth switches too fast, the closed line and the open mouth flip back and forth"): a smoothed
    // loudness (attack 40 ms / release 140 ms), hysteresis (down thresholds ~15 % under the up ones), one level step at a time held
    // ≥ 165 ms (≤ 6 changes / s), a 70 ms cross-fade of the two neighbouring blocks; inside a phrase the mouth stays at least slightly open,
    // and closes at once in real silence (0.1 s), in a gap ≥ 250 ms under the voice's own noise floor, or for a breath after 1.1 s open. Single open / closed patches ("mouth") keep the flap above.
    if (HAS_SET) {
      // a gate on THIS voice's own noise floor (a slow lower envelope of the raw level ×2): reverb tails / a noisy stem are silence
      if (v > 0) nf = v < nf ? v : nf + (v - nf) * (1 - Math.exp(-dt / 6));
      const voiced = tgt > .05 && (v <= 0 || v > Math.max(nf * 2, nf + .002));
      const amp = voiced ? (v > 0 ? v / Math.max(vAvg, 1e-4) : tgt * 1.6) : 0;
      ampEnv += (amp - ampEnv) * (1 - Math.exp(-dt / (amp > ampEnv ? .04 : .14)));
      if (voiced) quietAt = null; else if (quietAt == null) quietAt = t;
      const quiet = quietAt == null ? 0 : t - quietAt;
      let want = dl;
      if (dl === 0) { if (voiced && t - dlSince >= .12) want = 1; }   // open via the small level
      else if ((tgt <= .001 && quiet >= .1) || quiet >= .25 || t - openSince > 1.1) want = 0;   // real silence / a gap ≥ 250 ms / a breath after 1.1 s open: close now
      else if (dl < 3 && ampEnv > (dl === 1 ? 1.1 : 2.1)) want = dl + 1;
      else if (dl > 1 && ampEnv < (dl === 2 ? .95 : 1.85)) want = dl - 1;
      if (want !== dl && (want === 0 || t - dlSince >= .165)) { if (dl === 0) openSince = t; dlPrev = dl; dl = want; dlSince = t; }
    }
    lastTgt = tgt; lastV = v / peak;
    talk += (tgt - talk) * (1 - Math.exp(-dt / .12));   // smooth: drives the talking bob only
    // a view cut ends a blink and holds the next one ≥ 0.7 s (the cross-fade): eyes never close in the frame of a cut
    const cv = API.current(); if (cv !== lastCv) { if (lastCv != null) { blinkUntil = Math.min(blinkUntil, t); nextBlink = Math.max(nextBlink, t + .7); } lastCv = cv; }
    // blinks: closed 0.11–0.15 s, every 2–6 s (≈ 15 / min), ~15 % a double blink 0.12–0.22 s later
    if (t > nextBlink) { blinkUntil = t + .11 + Math.random() * .04; blinkLog.push([t, blinkUntil, cv, liveT]); if (blinkLog.length > 300) blinkLog.shift();
      nextBlink = !dbl && Math.random() < .15 ? (dbl = 1, blinkUntil + .12 + Math.random() * .1) : (dbl = 0, t + 2 + Math.random() * 4); }
    // breathing ≈ 15 / min with a slow drift of the rate; inhale 40 % of the cycle, exhale 60 % (eased, no pause-free sine)
    liveT += dt;   // time actually animated (a page that shows a non-layered view pauses all this)
    bph = (bph + dt * 1.57 * (1 + .08 * Math.sin(t * .21) + .05 * Math.sin(t * .53))) % (2 * Math.PI);
    breathY = breathAt(bph);
  }
  function breathAt(ph) { const c = ph / (2 * Math.PI); return c < .4 ? .5 - .5 * Math.cos(Math.PI * c / .4) : .5 + .5 * Math.cos(Math.PI * (c - .4) / .6); }
  let lastFigs = null;
  function render(stem) {
    const o = load(stem); if (!o.ready) return null;
    const now = performance.now(); if (now !== frameT) { frameT = now; step(now); }
    const c = o.c, active = byView[API.current()] === stem, spk = API.speaker(), many = o.figs.length > 1 || o.figs.some((g) => g.who);
    gl.viewport(0, 0, glc.width, glc.height);
    const ix = Math.sin(t * .5) * .25, iy = Math.sin(t * .37) * .15, D_ = API.debug || {};
    const off = D_.off || [-(px + ix) * .010, -(py + iy) * .007];   // tests: forced parallax extremes (tools/art/check_motion.js)
    const shown = [];
    o.figs.forEach((g, i) => {
      // this figure talks: its view is on screen and (with a speaker hook + its own key) it is the one speaking
      const me = active && (!g.who || spk == null || spk === g.who);
      let blink = blinkOn();
      if (i > 0 && !(API.debug && API.debug.blink != null)) {   // a further figure blinks on its own (never across a view cut)
        if (t - g.seen > .3) { g.bu = 0; g.nb = Math.max(g.nb, t + .7 + Math.random() * 2.5); }
        if (t > g.nb) { g.bu = t + .11 + Math.random() * .04; g.nb = t + 2 + Math.random() * 4; }
        blink = t < g.bu;
      }
      g.seen = t;
      // compose the character with its face patches
      if (cc.width !== g.ch.width || cc.height !== g.ch.height) { cc.width = g.ch.width; cc.height = g.ch.height; }
      cx2.clearRect(0, 0, cc.width, cc.height); cx2.drawImage(g.ch, 0, 0);
      // eyes first, then the mouth (an eye patch that reaches down to the lips must not cover the open mouth during a blink);
      // 'source-atop' clips every patch to the character's own alpha (no patch pixels on the background / beyond the jaw or hair).
      // kind 'mouth_quiet' = a closed-mouth patch for a pose drawn mid-laugh / mid-word: shown while she / he is NOT talking.
      cx2.globalCompositeOperation = 'source-atop';
      // a mouth set: the previous block, then the current one fading in over 70 ms (neighbouring levels of one mouth: no second line)
      const cur = me ? Math.min(dl, g.nLv) : 0, prv = me ? Math.min(dlPrev, g.nLv) : 0, fa = me ? Math.min(1, (t - dlSince) / .07) : 1;
      for (const p of g.order) {
        if (p.kind === 'mouth_lv') continue;
        const a = p.kind === 'mouth' ? (me ? mouth : 0) : p.kind === 'mouth_quiet' ? 1 - (me ? mouth : 0) : (blink ? 1 : 0);
        if (a > .01) { cx2.globalAlpha = a; cx2.drawImage(p.im, p.rect[0], p.rect[1], p.rect[2], p.rect[3]); cx2.globalAlpha = 1; }
      }
      const blk = (lv_) => g.order.find((p) => p.kind === 'mouth_lv' && (p.level || 0) === lv_);
      if (fa < 1 && prv !== cur && blk(prv)) cx2.drawImage(blk(prv).im, ...blk(prv).rect);
      if (blk(cur)) { cx2.globalAlpha = fa < 1 && prv !== cur ? fa : 1; cx2.drawImage(blk(cur).im, ...blk(cur).rect); cx2.globalAlpha = 1; }
      cx2.globalCompositeOperation = 'source-over';
      shown.push([g.who, me && (g.nLv ? dl > 0 : mouthOpen && g.ps.some((p) => /^mouth/.test(p.kind) && p.kind !== 'mouth_quiet')) ? 1 : 0]);
      upload(chrTex, cc);
      [o.bgT, o.depT || o.bgT, chrTex].forEach((tx_, k) => { gl.activeTexture(gl.TEXTURE0 + k); gl.bindTexture(gl.TEXTURE_2D, tx_); });
      gl.uniform2f(U.off, ...off);
      gl.uniform2f(U.bob, 0, me ? -.004 * talk : 0);
      // head + shoulders rise ~6 px (1080p) per breath; a further figure breathes in its own phase
      const by = i ? breathAt((bph + 2.1 * i) % (2 * Math.PI)) : breathY, lift = D_.lift ?? .006 * g.rect[3] * (by - .5);
      gl.uniform1f(U.breath, lift); gl.uniform2f(U.neck, ...g.neck); gl.uniform4f(U.edge, ...g.edge); gl.uniform4f(U.crect, ...g.rect);
      if (D_.solid) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, solidTex()); gl.activeTexture(gl.TEXTURE2); }   // tests: a magenta plate shows every gap
      if (i === 0) o.live = { ox: off[0], oy: off[1], lift };
      gl.uniform1f(U.only, i ? 1 : 0);
      if (i) { gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE); }
      if (i < o.figs.length - 1) { setRest(c, o); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
    });
    if (active) lastFigs = { stem, many, figs: shown };
    setRest(c, o); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disable(gl.BLEND); gl.uniform1f(U.only, 0);
    return glc;
  }
  function setRest(c, o) {   // the per-view uniforms (same for every figure of the view)
    gl.uniform2f(U.fire, ...(c.fire || [0, 0])); gl.uniform1f(U.hasFire, c.fire ? 1 : 0); gl.uniform1f(U.hasDep, o.depT ? 1 : 0);
    gl.uniform2f(U.bgO, ...o.o); gl.uniform1f(U.bgZ, o.z);
    gl.uniform1f(U.t, t); gl.uniform1f(U.flick, flick);
  }
  API.render = render;
  API.live = true;   // the page must not add its own zoom / bob drift on top (the background would breathe with her)
  API.flicker = () => flick;
  // where a point of the still (px of a W×H still) is drawn now: 'char' = attached to the character (a held sparkler, a mug's
  // steam), 'bg' = part of the plate. Mirrors the shader: the 1.02 over-scan, parallax, breathing / nod above the lines.
  API.toFrame = (stem, x, y, layer = 'char', W = 1920, H = 1080) => {
    const o = L[stem]; if (!o || !o.ready || !o.live) return [x, y];
    const lv = o.live; let u = x / W, v = y / H;
    if (layer === 'bg') { u -= lv.ox * .15; v -= lv.oy * .15; }
    else {
      const r = o.rect, [c, s] = o.neck, bob = (gl.getUniform(pr, U.bob) || [0, 0])[1], Lb = lv.lift / r[3], Lt = Lb - bob / r[3], w = (v - r[1]) / r[3];
      const D = w <= c ? Lt : w <= s ? Lt + (Lb - Lt) * (w - c) / (s - c) : Lb * (1 - Math.min(1, w)) / (1 - s);
      u += lv.ox * .55; v = r[1] + (w - D) * r[3] + lv.oy * .55;
    }
    return [((u - .5) * 1.02 + .5) * W, ((v - .5) * 1.02 + .5) * H];
  };
  API.motion = () => { const o = L[byView[API.current()]]; return { t, liveT, blink: blinkOn(), blinks: blinkLog.slice(), breath: breathY, phase: bph, flick,
    view: API.current(), stem: byView[API.current()], rect: o?.rect, neck: o?.neck, edge: o?.edge, live: o?.live, draw: lastDraw }; };   // tests
  API.state = () => { const st = byView[API.current()], F = lastFigs && lastFigs.stem === st && lastFigs.many ? lastFigs : null; return {
    mouth: F ? (F.figs.some((x) => x[1]) ? 1 : 0) : HAS_SET ? (dl > 0 ? 1 : 0) : mouth, open: HAS_SET ? dl > 0 : mouthOpen, speaker: API.speaker(), figs: F ? F.figs : null, level: HAS_SET ? dl : mouthOpen ? lvl : 0, tgt: lastTgt, rel: lastV, env, blink: t < blinkUntil, view: API.current(), stem: byView[API.current()],
    patches: (D.views[byView[API.current()]]?.patches || []).map((p) => p.kind) }; };   // tests (tools/art/check_mouth.js); figs = [[who, open], …] in multi-character views

  // ---------------------------------------------------------------- the hook: a known still → its live composite (same place / size)
  const drawImage = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function (im, ...r) {
    if (im instanceof HTMLImageElement && im.src && this.canvas !== cc) {
      const m = /\/([^/?#]+)\.(?:jpe?g|png|webp)(?:[?#]|$)/i.exec(im.src), stem = m && m[1];
      if (stem && D.views[stem]) {
        const c = render(stem);
        if (c) {
          if (r.length === 2) r = [r[0], r[1], im.naturalWidth, im.naturalHeight];
          if (r.length === 8) { const k = c.width / (im.naturalWidth || 1920); r = [r[0] * k, r[1] * k, r[2] * k, r[3] * k, ...r.slice(4)]; }
          if (byView[API.current()] === stem) { const m = this.getTransform(), d = r.length === 8 ? r.slice(4) : r;   // tests: page drift
            lastDraw = { t, x: m.a * d[0] + m.e, y: m.d * d[1] + m.f, w: m.a * d[2], h: m.d * d[3], a: this.globalAlpha }; }
          return drawImage.call(this, c, ...r);
        }
      }
    }
    return drawImage.call(this, im, ...r);
  };
})();
