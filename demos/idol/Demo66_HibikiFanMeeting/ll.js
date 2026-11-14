// Demo66 Hibiki fan meeting (2026-11-14): Hibiki = the LivLiv casual model (../_kit/characters/hibiki/models/casual.livliv) through
// ../_kit/diva/ll/story_ll.js (story.js stays the engine). views → [pose, camera, face?]; lines → face / LivLiv action / push-in.
// Hibiki's faces: x_10dc1b gentle smile (G), x_3225d1 confident (C) + the shared names (smile shy surprise sad tired serious wink).
(() => {
  const G = 'x_10dc1b', C = 'x_3225d1';
  window.STORY_LL = {
    ns: 'HFM', model: '../_kit/characters/hibiki/models/casual.livliv?v=0de3a17f',
    fig: { top: 737, bottom: 3841, cx: 904, face: { x: 904, y: 1116, h: 325 } },
    cams: { full: { x: .5, y: .35, fh: .042 }, fountain: { x: .63, y: .39, fh: .052 }, half: { x: .5, y: .25, fh: .17 }, push: { x: .5, y: .42, fh: .3 },
      earL: { x: .34, y: .47, fh: .34 }, earR: { x: .66, y: .47, fh: .34 }, photo: { x: .38, y: .36, fh: .22 } },
    views: { stage: ['x_wave', 'full', 'smile'], front: ['x_clasp', 'half', G], hands: ['x_casual_hand', 'half', 'smile'], blanket: ['x_heart', 'half', G],
      fountain: ['x_point', 'fountain', 'smile'], earL: ['x_clasp', 'earL'], earR: ['x_clasp', 'earR'], photo: ['x_casual_peace', 'photo', 'smile'], rose: ['x_casual_rose', 'half', G] },
    ear: { earL: 'L', earR: 'R' }, faces: { ear: 'shy' }, mouth: { floor: .012, span: .12 },
    lines: {
      h01: { face: 'smile', act: 'nod', at: 1.0 }, h02: { face: 'surprise', act: 'tilt', at: .6 }, h03: { face: 'surprise', act: 'tilt', at: 1.0 },
      h04: { face: G, act: 'nod', at: .5 }, h05: { face: 'smile', act: 'tilt', at: 2.2 }, h06: { face: 'surprise' }, h07: { face: 'shy', act: 'shy', at: .6, push: .5 },
      h12: { face: 'wink' }, h13: { face: 'smile', act: 'nod', at: 1.6 }, h14: { face: 'smile', act: 'tilt', at: .3 }, h15: { face: C, act: 'nod', at: .3 },
      h16: { face: 'smile', act: 'shake', at: .1 }, h17: { face: 'smile' }, h18: { face: 'smile' }, h19: { face: 'smile' }, h20: { face: G, act: 'tilt', at: 1.0 },
      c1: { face: G }, c2: { face: G, act: 'tilt', at: .8 }, c3: { face: 'smile' }, b1: { face: 'smile' }, b2: { face: 'shy' }, h21: { face: G },
      h22: { face: 'surprise', act: 'hop', at: .2 }, h23: { face: 'smile' }, h24: { face: 'wink', act: 'nod', at: 1.0 }, h25: { face: 'shy', act: 'shy', at: .8 },
      h26: { face: G, act: 'nod', at: 1.6 }, h27: { face: 'shy', act: 'tilt', at: 1.4, push: .4 }, h28: { face: G, act: 'nod', at: .8 }, h29: { face: 'smile', act: 'nod', at: 1.4 },
      h30: { face: 'smile', act: 'nod', at: .6 },
    },
  };
})();
