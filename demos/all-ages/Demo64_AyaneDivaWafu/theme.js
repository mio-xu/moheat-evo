// Demo64_LL (staging) ← Demo64 Q4 和風「なつよい まつり」— unified scene 04 (lantern wall + taiko left, wind chimes + koto right) for ../_kit/diva/diva.js
window.DIVA_THEME = {
  plate: 'media/art/bg_stage.webp', floor: .86, height: .74, range: .44, spots: false, sideDim: 0.45, jumpPose: null, spot: '255,190,140',
  warm: { style: 'glow', at: { L: [.06, .45], R: [.83, .66] }, flames: false, ember: '255,180,90' },   // the lantern wall + taiko (left) · the lantern by the bridge (right)
  cool: { style: 'chime', at: { L: [.2, .4], R: [.92, .33] }, wash: '110,190,255', washK: 0.4 },       // night breeze · the wind chimes (right)
  hits: { w: 'firework', c: 'chime' },
};
// LL staging (2026-11-14): Ayane = the LivLiv festival model (media/ayane_festival.livliv) through ../_kit/diva/ll/diva_ll.js. The drawn poses
// hold (suzu bell at the chest) / shake (bell raised high) → library poses: hold → cheer, shake → raise (to draw later: bell_hold, bell_shake).
window.DIVA_THEME.ll = {
  model: 'media/ayane_festival.livliv?v=1', beat0: 13.297, range: .6,   // first downbeat (s)
  fig: { top: 563, bottom: 3458, raiseTop: 340,
    half: { x_idle: 530, x_sing: 675, x_wave: 608, x_cheer: 560, x_raise: 746, x_heart: 560, x_point: 630, x_clasp: 531, x_bow: 427, x_shy: 463 } },
  seq: ['x_sing', 'x_wave', 'x_sing', 'x_heart', 'x_point', 'x_wave'], chorusKeys: ['chorus'], chorus: ['x_sing', 'x_wave', 'x_cheer', 'x_heart'],
  marks: { shake: 'x_raise', hold: 'x_cheer' }, jumpPose: null, intro: 'x_wave',
  faces: { whisper: 'shy', first: 'surprise', arrive: [1], visitEnd: 'wink', poses: { x_raise: 'smile', x_cheer: 'smile', x_bow: 'smile' }, segs: { chorus: 'smile' } },
  // LivLiv built-in actions (2026-11-14; + an automatic look toward the ear on each whisper line): hop = 「見つけた」 / the drum break / the chorus, nod = yes / 「また らいねんも」 / promise, shy = 「…しーっ」 / 「えへへ」, tilt = the name ask
  acts: [[2.6, 'hop'], [5.2, 'nod'], [10.2, 'nod'], [37.9, 'hop'], [51.0, 'shy'], [53.3, 'hop'], [87.5, 'nod'], [101.6, 'nod'], [106.0, 'tilt'], [109.2, 'shy'], [112.4, 'nod']],
};
