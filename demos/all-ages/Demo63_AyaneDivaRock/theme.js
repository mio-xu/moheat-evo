// Demo63 Q2 storm「ストーム・ハート」— unified scene 02 (amps + red lights left, lightning right) for ../_kit/diva/diva.js
window.DIVA_THEME = {
  plate: 'media/art/bg_rooftop.webp', floor: .86, height: .74, range: .5, spots: false, jumpPose: 'jump', spot: '255,150,210',
  warm: { style: 'amp', at: { L: [.07, .55], R: [.93, .55] } },          // the amp stacks (left) · the light tower (right)
  cool: { style: 'storm', at: { L: [.2, .4], R: [.85, .35] }, wash: '80,140,255', washK: .34 },   // driving rain, gusts, lightning
  hits: { w: 'flame', c: 'lightning' },
};
// LL staging (2026-11-14): Ayane = the LivLiv rock model (media/ayane_rock.livliv) through ../_kit/diva/ll/diva_ll.js. The drawn guitar poses
// sing (fist + guitar) / point (+ guitar) / jump (+ guitar) → GTR below: the model's guitar poses when it has them (REPLACE_PLAN extras
// guitar_strum / guitar_point / guitar_jump), else the closest library poses (sing / point / cheer).
(() => {
  const GTR = { strum: 'x_guitar_strum', point: 'x_guitar_point', jump: 'x_guitar_jump' };   // the model's guitar poses (MODELS.md 2026-11-14; page copy without x_sing / x_cheer, scripts/trim_model.py)
  window.DIVA_THEME.ll = {
    model: 'media/ayane_rock.livliv?v=2', beat0: 13.912, range: .6,   // first downbeat (s), 160 bpm
    fig: { top: 563, bottom: 3535, raiseTop: 276,
      half: { x_idle: 520, x_sing: 655, x_wave: 627, x_cheer: 728, x_raise: 787, x_heart: 455, x_point: 482, x_clasp: 448, x_bow: 443, x_shy: 437, x_guitar_strum: 923, x_guitar_point: 797, x_guitar_jump: 883 } },
    // verses / pre-chorus: mostly guitar, a heart / wave in between; chorus + final chorus: guitar jump, point at you, fist up (raise)
    seq: [GTR.strum, GTR.point, GTR.strum, 'x_heart', GTR.strum, 'x_wave'], chorusKeys: ['chorus', 'final'], chorus: [GTR.strum, 'x_raise', GTR.point, GTR.jump],
    jumpPose: 'jump', jump: GTR.jump, intro: GTR.strum,   // the drops (old jump marks 43.67 / 71.67 / 90.77 s) = guitar jump + jump arc
    faces: { whisper: 'shy', first: 'surprise', arrive: [1], visitEnd: 'wink',
      poses: { x_raise: 'smile', x_bow: 'smile', [GTR.jump]: 'smile' }, segs: { verse: 'serious', pre: 'serious', chorus: 'smile', bridge: 'serious', final: 'smile', outro: 'smile' } },
    // LivLiv built-in actions (+ an automatic look toward the ear on each whisper line): nod = yes / promise, shake = 「まけない」, tilt = a question,
    // hop = the chorus kicks in, shy = 「…そばにいて」 / 「えへへ、届いた」
    acts: [[4.4, 'nod'], [9.4, 'nod'], [11.3, 'shy'], [46.5, 'hop'], [56.2, 'shake'], [74.2, 'tilt'], [77.0, 'nod'], [79.9, 'hop'], [91.3, 'shake'],
      [103.8, 'nod'], [107.6, 'tilt'], [110.2, 'shy'], [115.0, 'nod']],
  };
})();
