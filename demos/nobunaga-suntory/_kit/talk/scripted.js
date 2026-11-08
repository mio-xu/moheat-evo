// The scripted brain of the public page (see main.js for the interface). Plays lines.js beat by beat with the pre-rendered voices
// (media/voice/<id>.m4a) for the place and cast picked on the cover (5 places × both / Nobunaga only / Ieyasu only): a solo plays
// that character's lines of the duo script plus its own solo-only lines (lines.js "in"). After every beat it is your turn; whatever
// you say (voice in the display language, or typed), or a silence, gets a short bridge line from whoever opens the next beat —
// matched by a light keyword layer (yes / no, the place's own topics, tea, sake, the realm, warm / cold, the future, praise,
// leaving), else a generic one — and the script goes on. No server, no keys, no cost.
window.TALK_BRAIN = (() => {
  const D = window.TALK_SCRIPT, VOICE = '../_kit/talk/media/voice/';
  const strip = (s) => s.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
  const flat = (B) => Object.values(B || {}).flatMap((k) => Object.values(k).flat());
  // 中文 subtitles: ja (as shown, without the tag) → zh, read by shared/subs.js (MOHEAT_ZH)
  const ZH = (window.MOHEAT_ZH = window.MOHEAT_ZH || {});
  const all = [...flat(D.bridges), ...Object.values(D.scenes).flatMap((p) => [...p.beats.flatMap((b) => b.lines), ...flat(p.bridges)])];
  for (const l of all) if (l.ja && l.zh) ZH[strip(l.ja)] = l.zh;
  const rx = (list) => list.map(([k, re]) => [k, new RegExp(re, 'iu')]);

  let E = null, i = 0, used = new Set(), P = null, beats = [], TOPICS = [];
  const buf = {};   // id → Promise<AudioBuffer|null>
  const fetchVoice = (id) => buf[id] || (buf[id] = fetch(`${VOICE}${id}.m4a`).then((r) => (r.ok ? r.arrayBuffer() : null)).then((a) => (a ? window.TKAudio.decode(a) : null)).catch(() => null));
  const think = (a = .45, b = 1) => new Promise((r) => setTimeout(r, (a + Math.random() * (b - a)) * 1000));

  // the beats of this place for this cast: a line plays when "in" lists the cast, or (no "in") when its speaker is there
  function cut(place, cast) {
    const key = cast.join(''), keep = (l) => (l.in ? l.in.includes(key) : l.ev ? true : cast.includes(l.who));
    return place.beats.map((b) => ({ ...b, lines: b.lines.filter(keep) })).filter((b) => b.lines.some((l) => l.id));
  }
  function topic(said, beat) {
    if (!said) return 'silence';
    for (const [k, re] of TOPICS) {
      if (D.yn_only.includes(k) && !(beat && beat.ask === 'yn')) continue;
      if (re.test(said)) return k;
    }
    return 'generic';
  }
  const pool = (who, k) => (P.bridges[who] && P.bridges[who][k]) || (D.bridges[who] && D.bridges[who][k]) || [];   // the place's own pool replaces the shared one
  function bridge(who, kind) {   // a line not used yet in this talk (generic when the topic has none left)
    for (const k of [kind, kind === 'silence' ? 'generic' : null, 'generic']) {
      const free = k ? pool(who, k).filter((l) => !used.has(l.id)) : [];
      if (free.length) { const l = free[Math.floor(Math.random() * free.length)]; used.add(l.id); return l; }
    }
    const g = pool(who, 'generic'); return g[Math.floor(Math.random() * g.length)];
  }
  const firstWho = (beat) => (beat.lines.find((l) => l.who) || {}).who || 'N';
  function play(beat) {
    for (const l of beat.lines) if (l.ev) E.event(l.ev); else E.push({ who: l.who, key: l.pos, ja: l.ja, en: l.en, id: l.id });
    if (beat.final) E.endAfter();
    E.done();
    const next = beats[i + 1];   // warm the cache for what comes next
    if (next) next.lines.forEach((l) => l.id && fetchVoice(l.id));
  }
  const final = () => beats.find((b) => b.final);

  return {
    limits: { session_seconds: 240 },   // only a safety net: the script ends the talk itself (about two minutes)
    showLimit: false, silenceSec: D.silence_seconds || 11, maxSilent: 99,
    status(ui) { ui.startBtn.disabled = false; ui.budget.classList.remove('warn'); },
    async begin(sc, cast, eng) {
      E = eng; i = 0; used = new Set();
      P = D.scenes[sc.id] || D.scenes.tea; beats = cut(P, cast);
      const yes = D.topics.findIndex(([k]) => k === 'yes') + 1;   // leave, no, yes → the place's topics → the shared ones
      TOPICS = rx([...D.topics.slice(0, yes), ...(P.topics || []), ...D.topics.slice(yes)]);
      for (const who of cast) for (const k of new Set([...Object.keys(D.bridges[who] || {}), ...Object.keys(P.bridges[who] || {})])) pool(who, k).forEach((l) => fetchVoice(l.id));
      await Promise.all(beats[0].lines.filter((l) => l.id).map((l) => fetchVoice(l.id)));
      return true;
    },
    async open() { await think(.6, 1); play(beats[0]); },
    async ask(kind, said) {
      const me = E.S;
      const fin = final(), closing = kind === 'close';
      let beat = closing ? fin : beats[i + 1];
      if (!beat) { E.endAfter(); E.done(); return; }
      const k = closing ? (said ? (topic(said, null) === 'leave' ? 'leave' : 'generic') : null) : topic(said, beats[i]);
      await think(); if (E.S !== me || !me || me.done) return;
      if (k) { const b = bridge(firstWho(beat), k); if (b) E.push({ who: firstWho(beat), ja: b.ja, en: b.en, id: b.id }); }
      i = beats.indexOf(beat); play(beat);
    },
    // pure listening: what "you" say on your turn (display language) — yes on a yes / no question, else a short nudge to go on
    pureReply() {
      const b = beats[i], L = window.MoHeatSub?.lang || 'en', k = L === 'ja' ? 0 : L === 'zh' ? 2 : 1;
      if (b && b.ask === 'yn') return ['はい、もちろん', 'Yes, of course', '嗯，当然'][k];
      const R = [['なるほど…', 'I see…', '原来如此…'], ['もっと聞かせてください', 'Please, tell me more', '再多讲一点吧'], ['ええ、いい話ですね', 'What a lovely story', '真是个好故事'], ['ふふ、それで？', 'Heh, and then?', '呵呵，然后呢？']];
      return R[i % R.length][k];
    },
    voice: (it) => (it.id ? fetchVoice(it.id) : Promise.resolve(null)),
    end() {},
    _cut: (id, cast) => cut(D.scenes[id], cast),   // testing
  };
})();
