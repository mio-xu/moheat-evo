// The idol games' song loader (published by tools/publish_idol.py): fetches each songs/<id>/timeline.json, then makes the live object
// (PG.live.create) the game asks for. The game's flow waits for window.PG_READY.
(function (root) { const base = new URL('..', document.currentScript.src).href, ver = new URL(document.currentScript.src).search, IDS = {"q1": "q1_sparkling", "q2": "q2_storm_heart", "q3": "q3_madobe", "q4": "q4_natsuyoi"};
  root.PG_READY = Promise.all(Object.entries(IDS).map(([q, id]) => fetch(base + 'songs/' + id + '/timeline.json' + ver).then((r) => r.json()).then((t) => [q, t]))).then((list) => {
    const P = { base, ver, songs: {}, charts: {}, stage: {}, mouth: {}, stills: root.SONG_STILLS };
    for (const [q, t] of list) { P.songs[q] = t.song; P.charts[q] = t.chart; P.stage[q] = t.stage; P.mouth[q] = t.mouth; }
    // seated poses (stage.settings = outfit): the offset is the kit's models/settings.json fig.poseDy, the same number the pages use
    const need = Object.values(P.stage).some((s) => s.settings);
    return (need ? fetch(base + 'models/settings.json' + ver).then((r) => r.json()).catch(() => null) : Promise.resolve(null)).then((K) => {
      for (const s of Object.values(P.stage)) if (s.settings) s.poseOffset = (K && K.outfits[s.settings] && K.outfits[s.settings].fig && K.outfits[s.settings].fig.poseDy) || {};
      return P; });
  }).then((P) => {
    root["AyaneLive"] = root.PG.live.create(P);
  });
})(window);
