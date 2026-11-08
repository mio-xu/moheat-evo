// shared/layers.js — layered stills for canvas demos (DEMO_DESIGN_GUIDE §6.2 strict layers + face patches, §6.3 no video by default).
//
// Whenever the page draws one of its stills on a 2D canvas (ctx.drawImage(<img …/gaku_live.jpg>)), this draws a live composite of
// that view's layers instead, at the same place and size:
//   background  one plate per location, zoomed / panned per view so its fire lands where the page expects it; depth parallax
//               (mouse / phone tilt + slow sway), heat shimmer and flicker over the fire
//   character   a cut-out pose (plain-background art), breathing (code), a small bob while talking, warm rim light facing the fire
//   face        expression patches cut from Seedance variants (tools/art/face_patches.py): the mouth fades with the voice loudness,
//               the eyes close for ~0.13 s blinks — the grandparents-call method
// Everything else the page draws on top (sparks, snow, steam, glows, UI) stays as it is, so an existing demo's main.js can be reused
// BY PATH without changes.
//
// Use, before the demo's main.js:  <script src="media/layers.js"></script> (data)  <script src="../../shared/layers.js"></script>
// Data (window.MOHEAT_LAYERS):
//   skipVideo: "regex"                      <video> sources of the base demo this page does not use (answered with 'error', no request)
//   views: { <still file stem>: { view, alias?: [other view names drawing the same still], fire: [x, y] (where the fire must appear, frame fraction) or null,
//            bg: { src, depth?, fire: [x, y] (fire in the plate, fraction), zoom? },
//            char: { src, w, h, x, y, height } (anchored at its bottom centre: x, y = frame fraction, height = fraction of the frame),
//            patches: [ { src, rect: [x, y, w, h] in char pixels, kind: "mouth" | "eyes" } ] } }
// Data hooks (optional): hooks: { view: "HINA.S.view", mouth: "HINA.FW.mouth" (0..1) | lv: "JIN.S.lv" (+ lvGain, default 25), level / raw: paths } — where the base demo keeps its state.
// Hooks (optional): MoHeatLayers.level() → 0..1 talking envelope (default window.STREAM.S.env), MoHeatLayers.raw() → raw voice level
// (default window.STREAM.S.lv), MoHeatLayers.current() → the view on screen (default window.STREAM.S.view).
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
uniform sampler2D bg,dep,chr;uniform vec2 off,fire,bgO,bob;uniform vec4 crect;uniform float bgZ,t,flick,hasFire,hasDep,breath;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
vec2 toBg(vec2 u){return (u-bgO)/bgZ;}
vec4 charAt(vec2 u){   // crect = x, y (top-left), w, h in frame fractions; breathing stretches up from the bottom edge
  float h=crect.w*(1.+breath);vec2 b=vec2((u.x-crect.x)/crect.z,(u.y-(crect.y+crect.w-h))/h);
  if(b.x<0.||b.y<0.||b.x>1.||b.y>1.)return vec4(0.);return texture2D(chr,b);}
void main(){
  vec2 u=(uv-.5)/1.02+.5;
  vec2 q=u;
  if(hasDep>.5){for(int i=0;i<3;i++){float d=texture2D(dep,toBg(q)).r;q=u+off*(d-.3)*.6;}}else q=u+off*.15;
  float zone=0.,up=0.;
  if(hasFire>.5){vec2 dv=(q-fire)*vec2(16./9.,1.);zone=smoothstep(.12,0.,length(dv*vec2(1.,.75)))*step(q.y,fire.y+.07);up=clamp((fire.y+.07-q.y)*8.,0.,1.);}
  vec2 wob=vec2(noise(vec2(q.x*40.,q.y*25.+t*3.))-.5,noise(vec2(q.x*30.+9.,q.y*40.+t*4.))-.5)*.012*up*zone;
  vec3 col=texture2D(bg,toBg(q+wob)).rgb;
  float warm=clamp(col.r-col.b,0.,1.);
  col*=1.+hasFire*(flick-1.)*(.35*warm+.5*zone);
  vec2 cu=u-off*.55-bob;
  vec4 ch=charAt(cu);
  float rim=0.;
  if(hasFire>.5){vec2 dir=normalize((fire-cu)*vec2(1.7778,1.)+1e-5);rim=ch.a*(1.-charAt(cu+dir*vec2(.0035,.0062)).a);}
  vec3 cc=ch.rgb+rim*vec3(1.,.55,.22)*.8*flick+hasFire*ch.a*smoothstep(.25,.9,cu.x)*vec3(.06,.025,0.)*(flick-.6);
  gl_FragColor=vec4(mix(col,cc,ch.a),1.);}`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error('[layers]', gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const ap = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(ap); gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0);
  const U = {}; for (const n of ['bg', 'dep', 'chr', 'off', 'fire', 'bgO', 'bob', 'crect', 'bgZ', 't', 'flick', 'hasFire', 'hasDep', 'breath']) U[n] = gl.getUniformLocation(pr, n);
  ['bg', 'dep', 'chr'].forEach((n, i) => gl.uniform1i(U[n], i));
  const newTex = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); return t; };
  const upload = (tex, src) => { gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); };
  const chrTex = newTex();
  const cc = document.createElement('canvas'), cx2 = cc.getContext('2d');   // the character + its face patches, composed each frame

  // ---------------------------------------------------------------- layers per view (loaded on demand, all preloaded after the page load)
  const base = 'media/';
  const L = {}, IMGS = {};
  const img = (src) => IMGS[src] || (IMGS[src] = new Promise((res) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => res(null); im.src = base + src; }));
  function load(stem) {
    if (L[stem]) return L[stem];
    const c = D.views[stem], o = L[stem] = { c, ready: false };
    Promise.all([img(c.bg.src), c.bg.depth ? img(c.bg.depth) : null, img(c.char.src), ...(c.patches || []).map((p) => img(p.src))]).then(([b, d, ch, ...ps]) => {
      if (!b || !ch) { o.failed = true; return; }
      o.bgT = newTex(); upload(o.bgT, b); if (d) { o.depT = newTex(); upload(o.depT, d); }
      o.ch = ch; o.ps = (c.patches || []).map((p, i) => ({ ...p, im: ps[i] })).filter((p) => p.im);
      // the plate's zoom + offset: its fire lands on the view's fire, never showing an edge
      const f = c.fire, bf = c.bg.fire; let z = c.bg.zoom || 1, ox, oy;
      if (f && bf) {
        for (const k of [0, 1]) z = Math.max(z, f[k] / bf[k], (1 - f[k]) / (1 - bf[k]));
        ox = f[0] - bf[0] * z; oy = f[1] - bf[1] * z;
      } else { ox = (1 - z) / 2; oy = (1 - z) / 2; }
      o.z = z; o.o = [ox, oy];
      const hf = c.char.height, wf = hf * (c.char.w / c.char.h) * (9 / 16);
      o.rect = [c.char.x - wf / 2, c.char.y - hf, wf, hf];
      o.ready = true;
    });
    return o;
  }
  const byView = {}; for (const [stem, c] of Object.entries(D.views)) for (const v of [c.view, ...(c.alias || [])]) byView[v] = stem;
  addEventListener('load', () => { for (const s of Object.keys(D.views)) load(s); });

  // ---------------------------------------------------------------- input, breathing, voice, blinks
  let tx = 0, ty = 0, px = 0, py = 0;
  addEventListener('pointermove', (e) => { tx = (e.clientX / innerWidth - .5) * 2; ty = (e.clientY / innerHeight - .5) * 2; }, { passive: true });
  addEventListener('deviceorientation', (e) => { if (e.gamma == null) return; tx = Math.max(-1, Math.min(1, e.gamma / 25)); ty = Math.max(-1, Math.min(1, (e.beta - 45) / 25)); });
  let lastT = 0, t = 0, frameT = -1, flick = 1, env = 0, mouth = 0, blinkUntil = 0, nextBlink = 2;
  function step(now) {
    t = now / 1000; const dt = Math.min(.05, t - lastT || .016); lastT = t;
    flick = 1 + .10 * Math.sin(t * 7.3) + .07 * Math.sin(t * 13.1 + 1.7) + .05 * Math.sin(t * 23.7 + .4);
    px += (tx - px) * .06; py += (ty - py) * .06;
    env = Math.max(0, Math.min(1, +API.level() || 0));
    const tgt = API.mouth ? Math.max(0, Math.min(1, API.mouth())) : env > .05 ? Math.max(0, Math.min(1, ((+API.raw() || 0) - .005) / .05)) : 0;   // the mouth fades in fast, out fast
    mouth += (tgt - mouth) * (1 - Math.exp(-dt / (tgt > mouth ? .03 : .06)));
    if (t > nextBlink) { blinkUntil = t + .13; nextBlink = t + 2.6 + Math.random() * 3.2; }
  }
  function render(stem) {
    const o = load(stem); if (!o.ready) return null;
    const now = performance.now(); if (now !== frameT) { frameT = now; step(now); }
    const c = o.c, active = byView[API.current()] === stem;
    // compose the character with its face patches
    if (cc.width !== o.ch.width || cc.height !== o.ch.height) { cc.width = o.ch.width; cc.height = o.ch.height; }
    cx2.clearRect(0, 0, cc.width, cc.height); cx2.drawImage(o.ch, 0, 0);
    for (const p of o.ps) {
      const a = p.kind === 'mouth' ? (active ? Math.min(1, mouth * 1.4) : 0) : (t < blinkUntil ? 1 : 0);
      if (a > .01) { cx2.globalAlpha = a; cx2.drawImage(p.im, p.rect[0], p.rect[1], p.rect[2], p.rect[3]); cx2.globalAlpha = 1; }
    }
    upload(chrTex, cc);
    gl.viewport(0, 0, glc.width, glc.height);
    [o.bgT, o.depT || o.bgT, chrTex].forEach((tx_, i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tx_); });
    const ix = Math.sin(t * .5) * .25, iy = Math.sin(t * .37) * .15;
    gl.uniform2f(U.off, -(px + ix) * .010, -(py + iy) * .007);
    gl.uniform2f(U.bob, 0, active ? -.004 * mouth : 0);
    gl.uniform1f(U.breath, .006 * Math.sin(t * 1.55));
    gl.uniform2f(U.fire, ...(c.fire || [0, 0])); gl.uniform1f(U.hasFire, c.fire ? 1 : 0); gl.uniform1f(U.hasDep, o.depT ? 1 : 0);
    gl.uniform2f(U.bgO, ...o.o); gl.uniform1f(U.bgZ, o.z); gl.uniform4f(U.crect, ...o.rect);
    gl.uniform1f(U.t, t); gl.uniform1f(U.flick, flick);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return glc;
  }
  API.render = render;

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
          return drawImage.call(this, c, ...r);
        }
      }
    }
    return drawImage.call(this, im, ...r);
  };
})();
