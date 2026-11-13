// Demo02 fan meeting (LL staging, 2026-11-14): Ayane = the LivLiv casual model through ../_kit/diva/ll/story_ll.js (story.js stays the engine).
// views → [pose, camera, face?]. The prop poses = REPLACE_PLAN extras hands / fan / drink / gift
// (POSE below). lines → face / LivLiv action / pose / push-in.
(() => {
  const POSE = { hands: 'x_hands', fan: 'x_fan', drink: 'x_drink', gift: 'x_gift' };   // the model's prop poses (MODELS.md 2026-11-14; page copy without x_write / x_sing / x_cheer / x_raise, scripts/trim_model.py)
  window.STORY_LL = {
    ns: 'AFM', model: 'media/ayane_casual.livliv?v=2',
    fig: { top: 563, bottom: 3423 },
    cams: { full: { x: .26, y: .33, fh: .06 }, half: { x: .5, y: .25, fh: .17 }, push: { x: .5, y: .42, fh: .3 },
      earL: { x: .34, y: .47, fh: .34 }, earR: { x: .66, y: .47, fh: .34 }, photo: { x: .62, y: .36, fh: .22 } },
    views: { stage: ['x_wave', 'full', 'smile'], front: ['x_clasp', 'half'], hands: [POSE.hands, 'half', 'smile'], fan: [POSE.fan, 'half', 'smile'],
      drink: [POSE.drink, 'half', 'smile'], gift: [POSE.gift, 'half', 'shy'], earL: ['x_clasp', 'earL'], earR: ['x_clasp', 'earR'], photo: ['x_heart', 'photo', 'smile'] },
    ear: { earL: 'L', earR: 'R' }, faces: { ear: 'shy' }, mouth: { floor: .012, span: .12 },
    lines: {
      a01: { face: 'smile', act: 'hop', at: .3 }, a02: { face: 'surprise', act: 'tilt', at: .6 }, a03: { face: 'surprise', act: 'tilt', at: 1.2 },
      a04: { face: 'smile', act: 'hop', at: .2 }, a05: { face: 'smile', act: 'nod', at: .4 }, a06: { face: 'surprise', act: 'tilt', at: 2.4 },
      a07: { face: 'shy', act: 'shy', at: .6, push: .5 }, a12: { face: 'wink' }, a13: { face: 'smile', act: 'nod', at: 2.0 }, a14: { face: 'smile', act: 'tilt', at: .3 },
      a15: { face: 'smile', act: 'hop', at: .1 }, a16: { face: 'pout', act: 'shake', at: .1 }, a17: { face: 'smile' }, a18: { face: 'smile' }, a19: { face: 'smile' },
      a20: { face: 'tired' }, a21: { face: 'smile', act: 'tilt', at: 3.6 }, d1: { face: 'smile', act: 'hop', at: .2 }, d2: { face: 'smile', act: 'tilt', at: 1.6 },
      d3: { face: 'shy' }, f1: { face: 'smile', act: 'hop', at: .3 }, f2: { face: 'smile' }, f3: { face: 'shy' },
      a22: { face: 'smile', act: 'tilt', at: .3 }, a23: { face: 'surprise', act: 'hop', at: .2 }, a24: { face: 'smile' }, a25: { face: 'wink', act: 'nod', at: 1.4 },
      a26: { face: 'shy', act: 'shy', at: .8 }, a27: { face: 'smile', act: 'nod', at: 1.8 }, a28: { face: 'shy', act: 'tilt', at: 1.4, push: .4 },
      a29: { face: 'shy', act: 'shy', at: .5 }, a30: { face: 'smile', act: 'nod', at: 1.6 }, a31: { face: 'smile', act: 'hop', at: .2 },
    },
  };
})();
