// PG.story — plays a story.json: the asmr-love short demos and the ASMR scenes inside a game (2026-11-14; format: the repo's
// demos/asmr-love/_kit/STORY_FORMAT.md, pack: PACK_SCHEMA.md). Generic: names come from the character pack (CHAR_PACK), numbers from
// engine/rules.js (PG_RULES.story; thermal numbers live in PG_RULES.thermal, used by the planner PG.thermalPlan in pg.thermal.js).
//
//   PG.story.compile(list, from, ctx)  → { timeline, beats, stop }    pure (node + browser): one SEGMENT = the beats up to the next ask
//   PG.story.walk(story, ctx, pick)    → [{ id, timeline, … }]         pure: the segments along one path (pick(ask) → option index; default = each ask's default)
//   await PG.story.run(story, opts)                                   browser: plays it (stage, voice, subtitles, asks, thermal); resolves at the end
//     opts: { pack: CHAR_PACK, base (pack folder url), media: { voice: dir url, dur: { lang: { clip: s } }, env: { lang: { clip: [0..1 @rate] } } },
//             text: { clip: { ja, en, zh, ko } }, ui: 'site' | 'pg', lang: () => voice language, onStep(i), onEnd(result) }
//
// Thermal = ONE implementation: each segment's timeline goes through PG.thermalPlan(timeline, { start, warmOnly, rate }) → { frames, end };
// the frames are played on the segment clock through PG.Therm.direct(), and `end` carries every ear's state into the next segment.
(function (root) {
  const RULES = () => ((root.PG_RULES || {}).story) || {};
  const swapLR = (s) => (typeof s === 'string' ? s.replace(/[LR]/g, (c) => (c === 'L' ? 'R' : 'L')) : s);

  // ------------------------------------------------------------------ pure part (node + browser)
  /** One segment: the beats of `list` from index `from` up to (and including) the next ask, or the end.
   *  ctx: { pack, dur: { clip: s }, env: { clip: [..] }, state: { scene, props: { id: side }, mirror } } (state is updated). */
  function compile(list, from, ctx) {
    const R = RULES(), P = ctx.pack, st = ctx.state, tl = [], beats = [];
    const sideOf = (s) => (st.mirror ? swapLR(s) : s);
    const clipOf = (c) => (st.mirror && ctx.dur[c + 'm'] != null ? c + 'm' : c);
    const thermOf = (id) => (P.props?.[id]?.thermal) || null;
    // the place: declared to the planner once (its plan's `end` carries the ambient and the props into the next segment)
    if (st.scene && st.declared !== st.scene) { st.declared = st.scene; tl.push({ t: 0, type: 'scene', ambient: (P.scenes?.[st.scene]?.ambient || []).map((a) => ({ ...a, side: sideOf(a.side) })) }); }
    let t = 0, i = from, stop = null;
    for (; i < list.length; i++) {
      const b = list[i], at = t, ear = sideOf(b.ear || 'C');
      if (b.scene && b.scene !== st.scene) { st.scene = st.declared = b.scene; tl.push({ t, type: 'scene', ambient: (P.scenes?.[b.scene]?.ambient || []).map((a) => ({ ...a, side: sideOf(a.side) })) }); }
      if (b.prop) {
        for (const o of b.prop.off || []) { const [id, s] = o.split(':'); const side = s ? sideOf(s) : null; if (!s || st.props[id] === side) delete st.props[id]; const th = thermOf(id); if (th) tl.push({ t, type: 'prop', id, side, on: false, ...th }); }   // no side = the whole prop
        for (const [id, s] of Object.entries(b.prop.on || {})) { const side = sideOf(s); st.props[id] = side; const th = thermOf(id); if (th) tl.push({ t, type: 'prop', id, side, on: true, ...th }); }
      }
      let clip = b.clip ? clipOf(b.clip) : null, dur = clip != null ? ctx.dur[clip] : 0;
      if (clip != null && dur == null) throw new Error(`story: no voice clip "${clip}"`);
      if (b.breath) tl.push({ t, type: 'breath', ear, mode: b.breath, dur: dur || R.breathSecs || 1.2 });   // haa · fuu · blow (levels: rules.thermal.breath)
      if (clip != null && !b.breath) tl.push({ t, type: 'voice', ear, dist: b.dist || 'mid', dur, env: ctx.env?.[clip] || null, over: !!b.over });
      beats.push({ ...b, clip, ear, at, dur });
      t += dur + (b.wait || 0) + (clip != null || b.wait ? (b.gap ?? R.gap ?? .6) : 0);
      if (b.ask) { stop = b.ask; i++; break; }
    }
    tl.sort((a, b) => a.t - b.t);
    return { timeline: { dur: t, events: tl }, beats, next: i, stop, secs: t };
  }

  /** Follow one path through the story (no browser): pick(askId, ask) → option index (default: the ask's default option). */
  function walk(story, ctx, pick) {
    const out = [], stack = [{ list: story.beats, i: 0 }];
    ctx.state = ctx.state || { scene: story.scene || null, props: {}, mirror: false };
    for (let guard = 0; stack.length && guard < 500; guard++) {
      const top = stack[stack.length - 1];
      if (top.i >= top.list.length) { stack.pop(); if (top.then) jump(stack, story, top.then); continue; }
      const seg = compile(top.list, top.i, ctx); top.i = seg.next; out.push(seg);
      if (seg.stop) {
        const ask = story.asks?.[seg.stop]; if (!ask) throw new Error(`story: no ask "${seg.stop}"`);
        if (ask.type === 'game') { out.push(...gameSegments(ask, ctx)); continue; }
        const k = pick ? pick(seg.stop, ask) : Math.max(0, (ask.options || []).findIndex((o) => o.id === ask.default));
        const o = ask.options?.[k]; if (!o) continue;
        if (o.mirror) ctx.state.mirror = true;
        if (o.goto) branch(stack, story, o.goto);
      }
    }
    return out;
  }
  const branch = (stack, story, id) => { const br = story.branches?.[id]; if (br) stack.push({ list: br.beats, i: 0, then: br.then }); else jump(stack, story, id); };
  function jump(stack, story, id) {   // continue the main line at the beat with this id
    const k = story.beats.findIndex((b) => b.id === id); if (k < 0) return;
    stack.length = 0; stack.push({ list: story.beats, i: k });
  }
  /** The which-side game's rounds as segments (for the build check: every round answered on time). */
  function gameSegments(ask, ctx) {
    const segs = [];
    for (const r of ask.rounds || []) {
      const beats = [];
      if (r.intro) beats.push({ clip: r.intro, ear: 'C', dist: 'mid' });
      beats.push({ wait: r.lead ?? 1.4 });
      beats.push({ clip: r.clip, ear: r.ear, dist: 'close', breath: r.do === 'blow' ? 'blow' : undefined, gap: (RULES().game || {}).answer ?? 2.5 });
      if (r.then) beats.push({ clip: r.then, ear: r.ear, dist: 'close', breath: r.thenDo === 'blow' ? 'blow' : undefined });
      segs.push(compile(beats, 0, ctx));
    }
    return segs;
  }

  const api = { compile, walk };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  const PG = root.PG; if (!PG) return;

  // ------------------------------------------------------------------ browser part
  const $ = (id) => document.getElementById(id), sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));
  const T = (o) => { if (!o) return ''; const l = (root.MoHeatSub && root.MoHeatSub.lang) || PG.lang || 'en'; return o[l] || o.en || o.ja || ''; };

  // UI adapters: the site page (UI v2 shell owns the bar; subtitles #subJa / #subEn via subs.js, asks = .ch buttons judged by shared/voice.js,
  // chapters = #steps for the shell) or a PG game (PG.ui).
  const UI = {
    site: {
      sub(tx) { const s = $('subs'); if (!s) return; $('subJa').textContent = tx ? tx.ja || '' : ''; $('subEn').textContent = tx ? tx.en || '' : ''; s.classList.toggle('show', !!tx); },
      choose(ask, story) {
        return new Promise((done) => {
          const box = $('choices'), opts = ask.options || [], esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
          const voice = (o) => Object.values(o.accept || {}).flat().join('|');
          box.innerHTML = opts.map((o, i) => `<button class="ch" type="button" data-i="${i}" data-voice="${esc(voice(o))}"><b>${esc(o.button?.ja || o.id)}</b><span>${esc(T(o.button) || o.id)}</span></button>`).join('');
          box.classList.add('show');
          let tapL = null, tapR = null;
          const fin = (i) => { clearTimeout(tm); box.classList.remove('show'); box.innerHTML = ''; if (tapL) PG.app.removeEventListener('pointerdown', tapL); done(i); };
          box.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => fin(+b.dataset.i)));
          if (ask.type === 'tap') {   // a tap on the left / right half of the stage answers too
            tapL = (e) => { if (e.target.closest('button')) return; const r = PG.app.getBoundingClientRect(), side = e.clientX - r.left < r.width / 2 ? 'L' : 'R'; const k = opts.findIndex((o) => o.id === side); if (k >= 0) fin(k); };
            PG.app.addEventListener('pointerdown', tapL);
          }
          const def = Math.max(0, opts.findIndex((o) => o.id === ask.default));
          const tm = setTimeout(() => fin(def), (ask.timeout || 8) * 1000);
          if (PG.AUTO) setTimeout(() => fin(def), 300); else if (root.MoHeatPlay && root.MoHeatPlay.pure) setTimeout(() => fin(def), (RULES().pureWait ?? 1.6) * 1000);   // "Just listen" mode
        });
      },
      steps(list, i) {
        const el = $('steps'); if (!el || !list) return;
        el.innerHTML = list.map((s, k) => `<li class="${k < i ? 'done' : k === i ? 'now' : ''}">${s.ja} · <small>${s.en}</small></li>`).join('');
      },
    },
    pg: {
      sub(tx) { const d = $('dlg'); if (!d) return; if (!tx) { d.hidden = true; return; } PG.ui.sheet('dlg'); $('dlgName').textContent = PG.ui.speaker(); $('dlgText').textContent = PG.T(tx); },
      choose(ask) { return PG.ui.choose((ask.options || []).map((o) => ({ t: o.button || { en: o.id } }))); },
      steps() {},
    },
  };

  /** Stage for a beat: outfit / pose / face / camera / action / props, all names from the pack. */
  function stageFor(b, S, opts) {
    const P = opts.pack, R = RULES(), cams = Object.assign({}, (root.PG_RULES || {}).cams || {}, P.cams || {});   // engine cams ← the character's body type
    const DIST = (((root.PG_RULES || {}).presets || {})['asmr-love'] || {}).dist || {}, camName = DIST[b.dist || 'mid'] || 'talk';
    const cam = cams[camName === 'ear' ? (b.ear && b.ear[b.ear.length - 1] === 'R' ? 'earR' : b.ear && b.ear[b.ear.length - 1] === 'L' ? 'earL' : 'bust') : camName];
    const ps = b.pose ? (P.poses || {})[b.pose] : null, pose = ps ? ps[1] : null, face = b.face || (ps ? ps[2] : null);
    const o = { cam }; if (pose) o.pose = pose; if (face) o.face = face;
    const hand = Object.keys(S.props).find((id) => ['hand', 'front', 'back'].includes(P.props?.[id]?.layer));
    o.prop = hand ? { src: opts.base + P.props[hand].src, h: P.props[hand].h, dx: P.props[hand].dx, dy: P.props[hand].dy } : null;
    if (PG.ll && PG.ll.ok !== false) PG.ll.set(o);
    if (b.act && PG.ll) setTimeout(() => PG.ll.act(b.act), (b.at || 0) * 1000);
    userProps(S, opts);
  }
  /** Props on YOU (layer "user": a scarf round your neck, a cool towel on your forehead / at an ear) are seen first-person, never as a small
   *  object in the scene: a soft band along that edge of the frame, fading in. Placement = data: PG_RULES.story.anchors[<anchor>[_<side>]]
   *  { pov: 'bottom' | 'top' | 'left' | 'right' | 'glow', show (% of the frame), fade (% of the band fading toward the middle), opacity, blur },
   *  overridden per prop by the pack's prop.pov. The band is the prop's colour (pov.color, a soft tint) — or, when the pack gives a picture
   *  drawn for it (pov.src: a first-person close-up, e.g. the scarf's knit filling the bottom edge), that picture (zoom, pos). 'glow' = nothing
   *  drawn (the thermal edge glow alone). */
  function userProps(S, opts) {
    const P = opts.pack, A = RULES().anchors || {}; let box = $('storyProps');
    if (!box) { box = document.createElement('div'); box.id = 'storyProps'; Object.assign(box.style, { position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' });
      const fxEl = $('fx'); if (fxEl) fxEl.after(box); else PG.app.appendChild(box); }   // above the scene and him, under every sheet / button
    const want = Object.entries(S.props).filter(([id]) => P.props?.[id]?.layer === 'user');
    for (const el of [...box.children]) if (!want.some(([id, side]) => el.dataset.k === `${id}:${side}`)) { el.style.opacity = 0; el.style.transform = el.dataset.off || ''; setTimeout(() => el.remove(), 900); }
    for (const [id, side] of want) {
      if (box.querySelector(`[data-k="${id}:${side}"]`)) continue;
      const pr = P.props[id], an = { pov: 'bottom', show: 18, zoom: 2.4, pos: '50% 20%', blur: 5, fade: 75, opacity: .6, ...(A[`${pr.anchor}_${side}`] || A[pr.anchor] || {}), ...(pr.pov || {}) };
      if (an.pov === 'glow') continue;
      const el = document.createElement('div'), e = an.pov, vert = e === 'left' || e === 'right', grad = { bottom: 'to top', top: 'to bottom', left: 'to right', right: 'to left' }[e];
      el.dataset.k = `${id}:${side}`; el.dataset.off = { bottom: 'translateY(30%)', top: 'translateY(-30%)', left: 'translateX(-30%)', right: 'translateX(30%)' }[e];
      const mask = `linear-gradient(${grad}, #000 ${100 - an.fade}%, transparent)`, pic = an.src ? { backgroundImage: `url("${opts.base + an.src}")`, backgroundRepeat: 'no-repeat',
        backgroundSize: vert ? `auto ${an.zoom * 100}%` : `${an.zoom * 100}% auto`, backgroundPosition: an.pos, filter: `blur(${an.blur}px)` } : { background: an.color || 'rgba(255,255,255,.5)' };
      Object.assign(el.style, { position: 'absolute', [e]: `-${an.blur * 2}px`, ...(vert ? { top: 0, bottom: 0, width: `${an.show}%` } : { left: `-${an.blur * 2}px`, right: `-${an.blur * 2}px`, height: `${an.show}%` }),
        ...pic, webkitMaskImage: mask, maskImage: mask, opacity: 0, transform: el.dataset.off, transition: 'opacity .9s ease, transform .9s ease' });
      box.appendChild(el); requestAnimationFrame(() => requestAnimationFrame(() => { el.style.opacity = an.opacity; el.style.transform = 'none'; }));
    }
  }

  /** Thermal for one segment: plan it, then feed the frames on the segment clock (re-aligned at every beat start). */
  function feeder(seg, S, opts) {
    if (!PG.thermalPlan) { console.warn('[story] no PG.thermalPlan: thermal off'); return { align() {}, stop() {} }; }
    const plan = PG.thermalPlan(seg.timeline, { start: S.therm, warmOnly: !!opts.warmOnly, rate: RULES().rate || 20 });
    S.therm = plan.end;
    const F = plan.frames, rate = RULES().rate || 20; let t0 = performance.now(), off = 0;
    const tick = () => { const t = (performance.now() - t0) / 1000 + off, k = Math.min(F.length - 1, Math.max(0, Math.round(t * rate))), f = F[k]; if (f) PG.Therm.direct({ Lc: f[1], Lh: f[2], Rc: f[3], Rh: f[4] }); };
    const iv = setInterval(tick, 1000 / rate); tick();
    return { align(at) { t0 = performance.now(); off = at; }, stop() { clearInterval(iv); } };
  }

  async function playSegment(seg, S, opts, ui) {
    const fd = feeder(seg, S, opts), lang = opts.lang ? opts.lang() : 'ja', R = RULES();
    try {
      for (const b of seg.beats) {
        fd.align(b.at);
        if (opts.steps && b.step != null && b.step !== S.stepI) { S.stepI = b.step; ui.steps(opts.steps, b.step); opts.onStep?.(b.step); }   // a chapter can start mid-segment
        if (b.scene && opts.pack.scenes?.[b.scene]) { S.scene = b.scene; const sc = opts.pack.scenes[b.scene]; PG.stage.place(opts.base + sc.src); PG.fx.ambient((sc.ambient || []).map((a) => a.fx).find(Boolean) || sc.fx || null); }
        if (b.prop) { for (const o of b.prop.off || []) delete S.props[o.split(':')[0]]; for (const [id, s] of Object.entries(b.prop.on || {})) S.props[id] = S.mirror ? swapLR(s) : s; }   // off first: a prop can move in one beat
        stageFor(b, S, opts);
        if (b.sfx && opts.sfx) opts.sfx(b.sfx, b.ear);
        if (b.clip != null) {
          ui.sub(opts.text?.[b.clip] || opts.text?.[b.clip.replace(/m$/, '')] || null);
          PG.stage.talking = true;
          const url = `${opts.media.voice}${lang === 'ja' ? '' : lang + '/'}${b.clip}.m4a`;
          await Promise.all([PG.voice.play(url, { ear: b.ear, dist: b.dist }), sleep(b.dur * .2)]);
          PG.stage.talking = false; ui.sub(null);
        }
        const rest = (b.wait || 0) + (b.clip != null || b.wait ? (b.gap ?? R.gap ?? .6) : 0); if (rest) await sleep(rest);
      }
    } finally { fd.stop(); }
  }

  /** The which-side game: rounds of "where is he?", taps on the left / right half (and an optional "behind" button), scored by speed. */
  async function whichSide(ask, S, opts, ui) {
    const G = RULES().game || {}, score = [], lang = opts.lang ? opts.lang() : 'ja';
    // "I give up" at any time: a judged button (shared/voice.js hears the accept phrases) → the give-up branch after this round
    let quit = null;
    if (ask.giveUp && opts.ui !== 'pg') { quit = document.createElement('button'); quit.className = 'ch'; quit.type = 'button'; quit.dataset.ws = 'quit'; quit.dataset.voice = Object.values(ask.giveUp.accept || {}).flat().join('|');
      quit.innerHTML = `<b>${(ask.giveUp.button || {}).ja || ''}</b><span>${T(ask.giveUp.button)}</span>`; quit.addEventListener('click', () => { S.gaveUp = true; quit.disabled = true; }); $('choices')?.appendChild(quit); $('choices')?.classList.add('show'); }
    const url = (c) => `${opts.media.voice}${lang === 'ja' ? '' : lang + '/'}${c}.m4a`;
    for (const [n, r] of (ask.rounds || []).entries()) {
      const seg = compile([{ clip: r.intro, ear: 'C', dist: 'mid' }, { wait: r.lead ?? 1.4 }, { clip: r.clip, ear: r.ear, dist: 'close', breath: r.do === 'blow' ? 'blow' : undefined, gap: 0 },
        ...(r.then ? [{ clip: r.then, ear: r.ear, dist: 'close', breath: r.thenDo === 'blow' ? 'blow' : undefined, gap: 0 }] : [])].filter((b) => b.clip !== undefined || b.wait), 0, { pack: opts.pack, dur: opts.media.dur[lang], env: opts.media.env?.[lang], state: S });
      const fd = feeder(seg, S, opts); let hitAt = 0, answer = null;
      const zone = (e) => { if (answer || !hitAt || e.target.closest('button:not([data-ws])') || e.target.dataset?.ws === 'quit') return; const rc = PG.app.getBoundingClientRect(); answer = e.target.dataset?.ws || (e.clientX - rc.left < rc.width / 2 ? 'L' : 'R'); answer = { side: answer, secs: (performance.now() - hitAt) / 1000 }; };
      PG.app.addEventListener('pointerdown', zone);
      let behindBtn = null;
      if (r.ear === 'C') { behindBtn = document.createElement('button'); behindBtn.className = 'ch'; behindBtn.dataset.ws = 'C'; behindBtn.dataset.voice = Object.values(ask.behind || {}).flat().join('|'); behindBtn.textContent = T(ask.behindLabel) || 'Behind'; $('choices')?.appendChild(behindBtn); $('choices')?.classList.add('show'); }
      try {
        for (const b of seg.beats) {
          fd.align(b.at); stageFor(b, S, opts);
          if (b.clip == null) { await sleep(b.wait || 0); continue; }
          ui.sub(opts.text?.[b.clip] || null); if (b.clip === r.clip) hitAt = performance.now();
          await PG.voice.play(url(b.clip), { ear: b.ear, dist: b.dist }); ui.sub(null);
        }
        const until = performance.now() + (G.answer ?? 2.5) * 1000; while (!answer && performance.now() < until) await sleep(.05);
        if (PG.AUTO && !answer) answer = { side: r.ear, secs: .7 };
      } finally { fd.stop(); PG.app.removeEventListener('pointerdown', zone); if (behindBtn) behindBtn.remove(); }
      const ok = answer && answer.side === r.ear, pts = !ok ? 0 : (G.points || [[.8, 3], [1.5, 2], [2.5, 1]]).find(([s]) => answer.secs < s)?.[1] || 0;
      score.push(pts);
      const react = ok && pts >= 2 ? ask.react?.fast : ask.react?.miss || [];
      const c = react && react.length ? react[n % react.length] : null;
      if (c) { ui.sub(opts.text?.[c] || null); await PG.voice.play(url(c), { ear: 'C', dist: 'mid' }); ui.sub(null); }
      await sleep(G.between ?? .8);
      if (S.gaveUp) break;
    }
    if (quit) { quit.remove(); $('choices')?.classList.remove('show'); }
    if (S.gaveUp) return ask.giveUp.goto;
    const total = score.reduce((a, b) => a + b, 0), stars = Math.round(total / Math.max(1, (ask.rounds || []).length * 3) * (ask.rounds || []).length);
    const res = (ask.result || []).find(([min]) => stars >= min);
    return res ? res[1] : null;
  }

  /** Play the whole story. Resolves with { path: [option ids], score } at the end. */
  async function run(story, opts) {
    const ui = UI[opts.ui || 'site'], lang = () => (opts.lang ? opts.lang() : 'ja');
    const S = { scene: story.scene || null, props: {}, mirror: false, therm: null, path: [] };
    const ctx = () => ({ pack: opts.pack, dur: opts.media.dur[lang()] || opts.media.dur.ja, env: (opts.media.env || {})[lang()], state: S });
    if (S.scene && opts.pack.scenes?.[S.scene]) { const sc = opts.pack.scenes[S.scene]; PG.stage.place(opts.base + sc.src); PG.fx.ambient((sc.ambient || []).map((a) => a.fx).find(Boolean) || null); }
    const outfit = story.outfit || opts.pack.defaultOutfit;
    if (PG.ll && opts.pack.models?.[outfit]) await PG.ll.show(opts.base + opts.pack.models[outfit], { pose: (opts.pack.poses?.idle || [])[1] || null, cam: ((root.PG_RULES || {}).cams || {}).talk });
    const steps = story.steps || null; S.stepI = -1; opts = { ...opts, steps };
    const stack = [{ list: story.beats, i: 0 }];
    while (stack.length) {
      const top = stack[stack.length - 1];
      if (top.i >= top.list.length) { stack.pop(); if (top.then) jump(stack, story, top.then); continue; }
      const cs = { ...S, props: { ...S.props } }, seg = compile(top.list, top.i, { ...ctx(), state: cs }); top.i = seg.next; S.declared = cs.declared;
      await playSegment(seg, S, opts, ui);
      if (!seg.stop) continue;
      const ask = story.asks?.[seg.stop]; if (!ask) continue;
      if (ask.type === 'game') { const goto = await whichSide(ask, S, opts, ui); S.path.push(`${seg.stop}:${goto}`); if (goto) branch(stack, story, goto); continue; }
      const k = await ui.choose(ask, story), o = (ask.options || [])[k]; S.path.push(`${seg.stop}:${o ? o.id : '-'}`);
      if (o?.mirror) S.mirror = true;
      if (o?.goto) branch(stack, story, o.goto);
    }
    ui.sub(null); PG.Therm.direct(null); PG.Therm.quiet?.();
    if (steps) ui.steps(steps, steps.length);
    const res = { path: S.path }; opts.onEnd?.(res); return res;
  }

  PG.story = { ...api, run };
})(typeof window !== 'undefined' ? window : globalThis);
