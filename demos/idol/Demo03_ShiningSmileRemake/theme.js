// Demo03 remake (Q1 joy)「きらきら こおりとほのお」— unified scene 01 (fire braziers left, ice crystals right) for ../_kit/diva/diva.js
window.DIVA_THEME = {
  plate: 'media/art/bg_stage.webp', floor: .86, height: .74, range: .5, spots: false, jumpPose: 'jump', spot: '255,170,220',
  warm: { style: 'glow', at: { L: [.12, .5], R: [.88, .58] }, flames: { L: true, R: true }, ember: '255,170,80' },   // the fire braziers (left) · stage-side fire bursts (right)
  cool: { style: 'ice', at: { L: [.15, .45], R: [.85, .45] }, wash: '110,190,255', washK: .36 },                    // snow + ice glints (the crystals, right)
  hits: { w: 'flame', c: 'snow' },
};
// LL staging (2026-11-14): Ayane = the LivLiv idol model through the kit driver ../_kit/diva/ll/diva_ll.js (idol defaults built in; the page's
// own copy diva_ll.js + livliv/ are no longer loaded). acts = LivLiv built-in actions (+ an automatic look toward the ear on each whisper line).
window.DIVA_THEME.ll = { model: '../_kit/characters/ayane/models/idol.livliv?v=2fde8335', beat0: 14.375,
  acts: [[2.6, 'hop'], [4.9, 'nod'], [11.0, 'nod'], [49.6, 'shy'], [52.4, 'hop'], [104.0, 'nod'], [108.2, 'tilt'], [111.6, 'shy'], [112.9, 'tilt'], [114.8, 'nod']] };
