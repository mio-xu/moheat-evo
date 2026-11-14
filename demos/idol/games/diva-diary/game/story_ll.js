// Diva Diary — how Ayane acts in THIS story (2026-11-14). Read by the raise engine (../../engine/raise/flow.js). Who she is (models, poses,
// faces) is her character pack ../../packs/ayane/pack.js; the camera distances and timings are engine rules (../../engine/rules.js).
//   lines     line id (content.js lines()) → { face, act, at (s after the line starts), secs, pose } — expression and LivLiv action per line
//   layersAt  place → head-bound layers of the pack she wears there (the radio booth: headphones)
//   propAt    place → a scene prop under her face (follows the camera, not her head; sizes in face heights)
//   lessonSeq activity → the poses she changes to every 2 bars during its rhythm part
window.STORY_LL = {
  layersAt: { radio: ['phones'] },
  propAt: { radio: 'radio_mic' },   // the character pack's own prop (packs/<name>/pack.js props)
  lessonSeq: { vocal: ['x_score', 'x_clasp', 'x_score', 'x_heart'], dance: ['x_cheer', 'x_point', 'x_raise', 'x_wave'] },
  lines: {
    e0_0: { face: 'smile', act: 'hop' }, e0_1: { face: 'smile' }, e0_2: { face: 'serious', act: 'nod', at: 1.6 }, e0_3: { face: 'shy' },
    e1_0: { face: 'sad', pose: 'x_shy' }, e1_1: { face: 'sad', act: 'tilt', at: 1.4 }, e1_c0: { face: 'surprise', act: 'hop' }, e1_c1: { face: 'shy', act: 'nod', pose: 'x_bow' },
    e2_0: { face: 'serious' }, e2_1: { face: 'shy' }, e2_c0: { face: 'smile', act: 'nod' }, e2_c1: { face: 'serious', act: 'nod', at: 1.2 }, e2_a0: { face: 'wink', act: 'hop' },
    e3_0: { face: 'smile', act: 'hop', at: 1.4 }, e3_1: { face: 'tired', act: 'lookL', at: 1.2, secs: 2.4 }, e3_c0: { face: 'shy', pose: 'x_shy' }, e3_c1: { face: 'smile', act: 'nod' },
    e4_0: { face: 'surprise', act: 'lookR', secs: 2.2 }, e4_1: { face: 'sad' }, e4_c0: { face: 'smile', act: 'nod' }, e4_c1: { face: 'shy' }, e4_a0: { face: 'wink', act: 'hop' },
    e5_0: { face: 'sad', pose: 'x_shy' }, e5_1: { face: 'pout', act: 'tilt', at: 2.2 }, e5_c0: { face: 'surprise', act: 'hop', at: .9 }, e5_c1: { face: 'pout', act: 'shake', at: .6 },
    e6_0: { face: 'serious', act: 'lookR', secs: 2 }, e6_1: { face: 'wink' }, e6_c0: { face: 'serious', act: 'nod' }, e6_c1: { face: 'pout', act: 'shake' }, e6_a0: { face: 'smile', act: 'hop', pose: 'x_raise' },
    e7_0: { face: 'tired', pose: 'x_shy' }, e7_1: { face: 'shy', act: 'shy', at: 1.4 }, e7_2: { face: 'shy' }, e7_c0: { face: 'shy', act: 'nod', at: 1 }, e7_c1: { face: 'smile', act: 'nod' },
    e8_0: { face: 'shy', act: 'shy', at: 1.8 }, e8_1: { face: 'smile', pose: 'x_heart' }, e8_2: { face: 'serious', act: 'nod', at: 1.2 }, e8_a0: { face: 'wink' }, e8_a1: { face: 'smile', act: 'hop' },
    act_vocal: { face: 'surprise', act: 'tilt', at: 1.2 }, act_dance: { face: 'smile', act: 'hop', at: 1.6 }, act_acting: { face: 'wink', act: 'tilt', at: 1.6 },
    act_band: { face: 'serious', act: 'nod' }, act_write: { face: 'serious', act: 'lookL', at: .6, secs: 2.4 }, act_street: { face: 'smile', act: 'hop' },
    act_radio: { face: 'shy', act: 'nod', at: .5 }, act_rest: { face: 'smile', act: 'tilt', at: 1.4 }, act_outing: { face: 'smile', act: 'nod', at: 1.4 },
    tired: { face: 'tired', act: 'shake', at: 1.2 },
    end_S_0: { face: 'surprise', act: 'lookL' }, end_S_1: { face: 'smile', act: 'nod', pose: 'x_bow' }, end_A_0: { face: 'shy', act: 'shake', at: 1 }, end_A_1: { face: 'smile', act: 'nod' },
    end_B_0: { face: 'sad', act: 'tilt' }, end_B_1: { face: 'serious', act: 'nod' }, end_C_0: { face: 'sad', pose: 'x_bow' }, end_C_1: { face: 'serious', act: 'tilt', at: 1.4 },
    end_secret_0: { face: 'shy' }, end_secret_1: { face: 'shy', act: 'shy', at: 1.2 },
  }
};
