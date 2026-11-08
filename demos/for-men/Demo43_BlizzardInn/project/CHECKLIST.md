# QA checklist · demos/for-men/Demo43_BlizzardInn

> Written by `python3 tools/qa/check_demo.py <demo> --checklist` (template: `tools/qa/CHECKLIST_TEMPLATE.md`; flow: `DEMO_DESIGN_GUIDE.md` §6 制作流程 v2).
> The **automatic** table below is replaced on every `--checklist` run. The **manual** items are what no script can judge: tick them
> (`[x]`) with a date and who looked, and keep them ticked only while they stay true (new art → look again).

## Automatic (check_demo.py)

<!-- qa:auto -->
Last run: `python3 tools/qa/check_demo.py demos/for-men/Demo43_BlizzardInn` · 2026-11-08 19:18 · **FAIL** (1 fail, 0 warn)

| gate | check | result | summary |
|---|---|---|---|
| G4 | layers | PASS | 10 views, in step with stage.json |
| G4 | cut-body | PASS | no half bodies |
| G4 | patches | PASS | all patches aligned (still look at assets/patch_check/mouths.jpg 2×) |
| G4 | eyes | PASS | every eyes patch spans two eyes |
| G5 | syntax | PASS | 5 JS files parse |
| G5 | refs | PASS | self-contained (own folder + demos/shared + demos/for-men/_kit only) |
| G5 | links | PASS | no broken links |
| G5 | files | PASS | every named local file exists |
| G5 | cache | PASS | every ?v= is current |
| G5 | l10n | PASS | ja / en / zh present, static scan clean · ko not yet (room kept: subs.js LANGS) |
| G5 | voice | PASS | shared/voice.js loaded (answers by voice, judged) |
| G5 | end | PASS | ends on its own cover (static) |
| G6 | runtime | FAIL | the browser probe did not answer (Chrome / port problem?) |
| G7 | release | PASS | cover, thumbs, menu, credits |
| G7 | cover | PASS | face size / eye line / side, copy column, shade, phone |
| G8 | hygiene | PASS | assets ignored, no big files, budget logged, checklist present |
<!-- /qa:auto -->

## Manual — G0 plan (before any spend)
- [ ] 2–4 options shown to the user (character + story), one chosen · date:
- [ ] `project/layers.md`: views × layers × L0–L4, credits / $ total approved (Seedance ≤ 1500 · OpenAI ≤ $10 per demo unless the user says more)
- [ ] Story built on the character's core identity; cast / voice / look unchanged on a remake

## Manual — G1 script + thermal
- [ ] Every thermal moment has a physical source next to that ear (no heat for "spicy" / "blushing"); a human voice is warm, strongest at the ear
- [ ] DUAL showcase planned: fast hot↔cold on one ear · strong peaks · clear left / right direction · cool + heat at the same time
- [ ] Every answer is a 2-way choice and can be said aloud (voice judged, close in meaning passes)

## Manual — G3 / G4 art (look at 100 % / 2×, not thumbnails)
- [ ] `assets/poses_preview.jpg`: same person in every close-up and wide shot — hair, eyes, face, accessories, clothes, line / shading style; story continuity (glasses off stays off)
- [ ] No extra props / background pieces drawn into a pose (cups, door frames, someone else's hand)
- [ ] `assets/patch_check/mouths.jpg`: each mouth closed | open at 2× — no double lip, no jump, opens on the closed mouth
- [ ] Both eyes close in every eyes patch (`assets/patch_check/*_eyes.png`)
- [ ] Every `media/art/char_*.webp` on a dark plate, hair / hands / collar at 2×: no grey / green / magenta fringe, no holes
- [ ] Animation physics: geometry computed first (park / grab heights, travel > 0, nothing clipped); the WHOLE sequence rendered frame by frame with a virtual clock (not one frame); pivots / hinges, never squashed; props in front / behind correctly (claw, fireworks behind buildings), nothing floats

## Manual — G6 play
- [ ] Watched one talking stretch and blinks myself (mouth follows syllables, closes in pauses; both eyes blink)
- [ ] Played on a phone-size view: answer buttons, long-press and mic usable; guide never off-screen
- [ ] EN / 日本語 / 中文 each seen once on the cover and in play (room for 한국어: strings in `l10n.js`, language in `shared/subs.js` LANGS)
- [ ] Felt the thermal moments with the device (or read the #cmd stream) — plausible, strong, fast

## Manual — G7 / G8 release
- [ ] Cover title has kana, not on the face; thumbnails match the language
- [ ] Credits (cover `#credits`, `nav.js` RIGHTS, `credits.html`) match the real voice / art tools
- [ ] Budget logged (README / WORKLOG): Seedance credits, OpenAI $, ElevenLabs characters
- [ ] Committed only my own files (`git show --stat HEAD`); WORKLOG entry; lessons → `DEMO_DESIGN_GUIDE.md` §11.1 + a check
