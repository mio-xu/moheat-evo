// PG.night — one ASMR episode inside a raise game (2026-11-14, asmr-love genre): an evening call, a stream night, a visit. The episode is a
// story.json (the shared format: repo demos/asmr-love/_kit/STORY_FORMAT.md) played by PG.story (engine/pg.story.js, its 'pg' adapter) —
// the same player and the same thermal planner as the site demos. This file only adds the GAME parts around it:
//   · gifts: an ask { type: 'gift', side, then, react: { <item>: clip }, stat } becomes a choice of the items in your inventory (bought /
//     found in the day places); the picked item becomes a prop on that side (its own warmth / coolness from the pack) and the story goes on at `then`
//   · stats: an option's `stat` ({ affection: +3 }) and a game ask's `stat` (× its score) go to the raise numbers (onStat)
//   · voices: the story's own folder (game.json "stories": voice dir + durations, built by tools/new_game.js into window.PG_STORIES)
//   await PG.night.run(id, { inventory: [...], onStat: (fx) => …, onBeat: (beat) => …, lang: () => 'ja' | 'en' })   → { path, gift }
(function (root) {
  const T3 = { zh: '下次再给', ja: 'またこんど', en: 'Maybe later', ko: '다음에' };
  /** The story with its gift asks turned into ordinary choices (pure: a copy). */
  function withGifts(story, P, inv) {
    const S = JSON.parse(JSON.stringify(story)); S.branches = S.branches || {};
    for (const [id, A] of Object.entries(S.asks || {})) {
      if (A.type !== 'gift') continue;
      const have = [...new Set(inv)].filter((g) => (P.props || {})[g]);
      const opts = have.map((g) => { const br = `__gift_${id}_${g}`;
        S.branches[br] = { beats: [{ prop: { on: { [g]: A.side || (P.props[g].side === 'story' ? 'C' : P.props[g].side) || 'C' } }, ...(A.react && A.react[g] ? { clip: A.react[g], ear: A.ear || 'C', dist: A.dist || 'close' } : { wait: .8 }) }], then: A.then };
        return { id: g, button: P.props[g].label || { en: g }, img: (P.base || '') + P.props[g].src, goto: br, stat: A.stat || null, heart: true }; });
      opts.push({ id: '-', button: A.skip || T3, goto: A.skipGoto || A.then, stat: null });
      S.asks[id] = { type: 'choice', options: opts, default: '-', timeout: A.timeout || 20 };
    }
    return S;
  }
  /** A game episode may start with a gift (game.json stories[].gift = { side, react, stat }): a gift ask in front of the first beat. Pure. */
  function addGift(story, g) {
    if (!g) return story; const S = JSON.parse(JSON.stringify(story)); S.asks = S.asks || {};
    const first = S.beats[0] || {}; if (!first.id) first.id = '__start';
    S.asks.__gift = { type: 'gift', side: g.side || 'C', then: first.id, react: g.react || {}, stat: g.stat || null, ear: g.ear, dist: g.dist };
    S.beats.unshift({ ask: '__gift' }); return S;
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = { withGifts, addGift }; return; }
  const PG = root.PG;
  async function run(id, o = {}) {
    const ST = (root.PG_STORIES || {})[id]; if (!ST) { console.warn('[night] no story', id); return { path: [] }; }
    const P = root.CHAR_PACK, inv = o.inventory || [], story = withGifts(ST.story, P, inv);
    const lang = () => { const l = (o.lang ? o.lang() : PG.lang); return (ST.dur[l] ? l : 'ja'); };
    PG.Therm.direct(null);
    const res = await PG.story.run(story, { pack: P, base: P.base || '', media: { voice: ST.voice, dur: ST.dur, env: ST.env }, text: ST.text, ui: 'pg', lang, onBeat: o.onBeat,
      warmOnly: !!((root.PG_RULES || {}).thermal || {}).warmOnly });
    let gift = null;
    for (const step of res.path || []) {   // "askId:optionId"
      const [aid, oid] = step.split(':'), A = story.asks[aid]; if (!A) continue;
      const opt = (A.options || []).find((x) => x.id === oid);
      if (opt && opt.stat && o.onStat) o.onStat(opt.stat);
      if (ST.story.asks[aid] && ST.story.asks[aid].type === 'gift' && oid !== '-') { gift = oid; const k = inv.indexOf(oid); if (k >= 0) inv.splice(k, 1); }
    }
    PG.Therm.direct(null); PG.Therm.clearSources();
    return { path: res.path, gift };
  }
  PG.night = { run, withGifts, addGift };
})(typeof window !== 'undefined' ? window : globalThis);
