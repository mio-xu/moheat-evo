// The scripted brain of the public page (see main.js for the interface). Plays lines.js beat by beat with the pre-rendered voices
// (media/voice/<id>.m4a). After every beat it is your turn; whatever you say (voice in the display language, or typed), or a silence,
// gets a short bridge line from whoever opens the next beat — matched to a few topics (yes / no, tea, sake, the realm, warm / cold,
// the future, praise, leaving) by a light keyword layer, else a generic one — and the script goes on. No server, no keys, no cost.
window.TALK_BRAIN = (() => {
  const D = window.TALK_SCRIPT, VOICE = 'media/voice/';
  const strip = (s) => s.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
  // 中文 subtitles: ja (as shown, without the tag) → zh, read by shared/subs.js (MOHEAT_ZH)
  const ZH = (window.MOHEAT_ZH = window.MOHEAT_ZH || {});
  const all = [...D.beats.flatMap((b) => b.lines), ...Object.values(D.bridges).flatMap((k) => Object.values(k).flat())];
  for (const l of all) if (l.ja && l.zh) ZH[strip(l.ja)] = l.zh;
  const TOPICS = D.topics.map(([k, re]) => [k, new RegExp(re, 'iu')]);

  let E = null, i = 0, used = new Set();
  const buf = {};   // id → Promise<AudioBuffer|null>
  const fetchVoice = (id) => buf[id] || (buf[id] = fetch(`${VOICE}${id}.m4a`).then((r) => (r.ok ? r.arrayBuffer() : null)).then((a) => (a ? window.TKAudio.decode(a) : null)).catch(() => null));
  const think = (a = .45, b = 1) => new Promise((r) => setTimeout(r, (a + Math.random() * (b - a)) * 1000));

  function topic(said, beat) {
    if (!said) return 'silence';
    for (const [k, re] of TOPICS) {
      if (D.yn_only.includes(k) && !(beat && beat.ask === 'yn')) continue;
      if (re.test(said)) return k;
    }
    return 'generic';
  }
  function bridge(who, kind) {   // a line not used yet in this talk (generic when the topic has none left)
    const B = D.bridges[who] || {};
    for (const k of [kind, kind === 'silence' ? 'generic' : null, 'generic']) {
      const free = (B[k] || []).filter((l) => !used.has(l.id));
      if (free.length) { const l = free[Math.floor(Math.random() * free.length)]; used.add(l.id); return l; }
    }
    const g = B.generic || []; return g[Math.floor(Math.random() * g.length)];
  }
  const firstWho = (beat) => (beat.lines.find((l) => l.who) || {}).who || 'N';
  function play(beat) {
    for (const l of beat.lines) if (l.ev) E.event(l.ev); else E.push({ who: l.who, key: l.pos, ja: l.ja, en: l.en, id: l.id });
    if (beat.final) E.endAfter();
    E.done();
    const next = D.beats[i + 1];   // warm the cache for what comes next
    if (next) next.lines.forEach((l) => l.id && fetchVoice(l.id));
  }
  const final = () => D.beats.find((b) => b.final);

  return {
    fixed: { cast: D.cast, scene: D.scene },
    limits: { session_seconds: 240 },   // only a safety net: the script ends the talk itself (about two minutes)
    showLimit: false, silenceSec: D.silence_seconds || 11, maxSilent: 99,
    status(ui) { ui.startBtn.disabled = false; ui.budget.classList.remove('warn'); },
    async begin(sc, cast, eng) {
      E = eng; i = 0; used = new Set();
      D.beats[0].lines.forEach((l) => l.id && fetchVoice(l.id));
      Object.values(D.bridges).forEach((k) => Object.values(k).flat().forEach((l) => fetchVoice(l.id)));
      await Promise.all(D.beats[0].lines.filter((l) => l.id).map((l) => fetchVoice(l.id)));
      return true;
    },
    async open() { await think(.6, 1); play(D.beats[0]); },
    async ask(kind, said) {
      const me = E.S;
      const fin = final(), closing = kind === 'close';
      let beat = closing ? fin : D.beats[i + 1];
      if (!beat) { E.endAfter(); E.done(); return; }
      const k = closing ? (said ? (topic(said, null) === 'leave' ? 'leave' : 'generic') : null) : topic(said, D.beats[i]);
      await think(); if (E.S !== me || !me || me.done) return;
      if (k) { const b = bridge(firstWho(beat), k); if (b) E.push({ who: firstWho(beat), ja: b.ja, en: b.en, id: b.id }); }
      i = D.beats.indexOf(beat); play(beat);
    },
    voice: (it) => (it.id ? fetchVoice(it.id) : Promise.resolve(null)),
    end() {},
  };
})();
