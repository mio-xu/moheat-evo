// Diva Diary — this game's setup for the raise engine (2026-11-14): save namespace, languages, the song pack's live object, places.
window.GAME_SETUP = {
  id: 'divadiary', langs: ['zh', 'ja', 'en', 'ko'], live: 'AyaneLive',
  home: { scene: 'fan_room', pose: 'front' },                                               // chapter cards and the week plan
  title: { scene: 'riverside', x: 24, amb: { Lh: .25, Rc: .2 }, pose: 'photo', fx: 'petals', bgm: 'day' },
  stillsVersion: '?a=7',                                                                    // the old stills (only without WebGL2)
};
