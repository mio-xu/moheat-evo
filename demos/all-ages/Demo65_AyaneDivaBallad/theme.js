// Demo65_LL (staging) ← Demo65 Q3 ballad「まどべの ゆき」— unified scene 03 (snowy arched window left, piano lamp + fireplace right) for ../_kit/diva/diva.js
window.DIVA_THEME = {
  plate: 'media/art/bg_stage.webp', floor: .86, height: .74, range: .42, spots: false, sideDim: 0.4, jumpPose: null, spot: '255,200,170',
  warm: { style: 'glow', at: { L: [.28, .44], R: [.96, .76] }, flames: { R: true }, embers: { L: false }, ember: '255,170,80' },   // the wall sconce (left) · the fireplace (right)
  cool: { style: 'snow', at: { L: [.1, .38], R: [.75, .3] }, wash: '120,170,255', washK: 0.38,
          box: { L: [.03, .04, .2, .66] } },                                                                                    // snow past the window (left)
  hits: { w: 'flare', c: 'snow' },
};
// LL staging (2026-11-14): Ayane = the LivLiv gown model (media/ayane_gown.livliv) through ../_kit/diva/ll/diva_ll.js. The drawn poses
// sing (hands clasped) / open (arms wide) / reach (hand toward you) → library poses: open → raise / wave (in turn), reach → point (to draw later: open, reach).
window.DIVA_THEME.ll = {
  model: 'media/ayane_gown.livliv?v=1', beat0: 15.095, range: .6, hop: .75,   // first downbeat (s)
  fig: { top: 563, bottom: 3500, raiseTop: 273,
    half: { x_idle: 555, x_sing: 650, x_wave: 705, x_cheer: 645, x_raise: 710, x_heart: 570, x_point: 607, x_clasp: 607, x_bow: 493, x_shy: 682 } },
  seq: ['x_sing', 'x_clasp', 'x_sing', 'x_heart', 'x_sing', 'x_wave'], chorusKeys: ['peak'], chorus: ['x_sing', 'x_heart', 'x_raise', 'x_clasp'],
  marks: { open: ['x_raise', 'x_wave'], reach: 'x_point' }, jumpPose: null, intro: 'x_wave',
  faces: { whisper: 'shy', first: 'surprise', arrive: [], visitEnd: 'smile', poses: { x_raise: 'smile', x_wave: 'smile', x_bow: 'smile' }, segs: { verse2: 'sad', peak: 'serious' } },
  // LivLiv built-in actions (2026-11-14; + an automatic look toward the ear on each whisper line; no hops in the ballad): nod = 「外、雪だよ」 / 「キミのために歌うね」 / 「おやすみ」 / thanks / promise, shy = 「キミにだけ」 / 「えへへ」, tilt = 「どうか あなたへ」 / the name ask / 「応援してくれる？」
  acts: [[4.3, 'nod'], [12.4, 'nod'], [47.0, 'shy'], [74.5, 'tilt'], [91.0, 'nod'], [105.0, 'nod'], [109.4, 'tilt'], [112.2, 'shy'], [114.6, 'tilt'], [116.4, 'nod']],
};
