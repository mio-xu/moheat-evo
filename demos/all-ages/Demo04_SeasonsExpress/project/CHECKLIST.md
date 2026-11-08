# QA checklist · demos/all-ages/Demo04_SeasonsExpress_v2

> Written by `python3 tools/qa/check_demo.py <demo> --checklist` (template: `tools/qa/CHECKLIST_TEMPLATE.md`; flow: `DEMO_DESIGN_GUIDE.md` §6 制作流程 v2).
> The **automatic** table below is replaced on every `--checklist` run. The **manual** items are what no script can judge: tick them
> (`[x]`) with a date and who looked, and keep them ticked only while they stay true (new art → look again).

## Automatic (check_demo.py)

<!-- qa:auto -->
Last run: `python3 tools/qa/check_demo.py demos/all-ages/Demo04_SeasonsExpress_v2 --full` · 2026-11-09 04:16 · **FAIL** (1 fail, 3 warn)

| gate | check | result | summary |
|---|---|---|---|
| G4 | layers | PASS | 3 views, in step with stage.json |
| G4 | cut-body | PASS | no half bodies |
| G4 | patches | PASS | all patches aligned (still look at assets/patch_check/mouths.jpg + every assets/lp_mouths/<pose>_sheet.jpg 2×: teeth inside the lips, same place on lv2 / lv3) |
| G4 | eyes | PASS | every eyes patch spans two eyes |
| G4 | edges | PASS | no flat head / ruler cut, cut edges ≥ 1.5 % outside the frame |
| G4 | fringe | PASS | no backdrop colour on the cut-out rim |
| G4 | blink | PASS | both eyes close, no iris through the lids |
| G4 | far-motion | PASS | mouth / blink readable at 1080p on every view |
| G4 | looks | WARN | 2 × hair / outfit colour differs (coarse; confirm on poses_preview.jpg) — cond/holo: outfit colour (251, 212, 168) differs inside look "default" (Δ131) — a new outfit needs its own "look" in stage.json + the character card, motivated by the story; cond/wave: outfit colour (130, 75, 37) differs inside look "default" (Δ115) — a new outfit needs its own "look" in stage.json + the character card, motivated by the story |
| G5 | syntax | PASS | 6 JS files parse |
| G5 | refs | PASS | self-contained (own folder + demos/shared + demos/all-ages/_kit only) |
| G5 | links | PASS | no broken links |
| G5 | files | PASS | every named local file exists |
| G5 | cache | FAIL | 1 stale ?v= number(s) (shared / media/layers.js) — ../../../device.js?v=2: device.js changed in acbb9243 UI v2 RELEASE: one interface for every demo (switch on: MoHea after that number was set — bump; ../../shared/nav.js?v=b06a4ab3 = the committed demos/shared/nav.js; the working copy has uncommitted edits (bump when they are committed) |
| G5 | l10n | PASS | ja / en / zh present, static scan clean · ko not yet (room kept: subs.js LANGS) |
| G5 | voice | PASS | shared/voice.js loaded (answers by voice, judged) |
| G5 | end | PASS | ends on its own cover (static) |
| G5 | media | PASS | every file within budget, media 0 KB |
| G6 | runtime | PASS | 0 errors, 0 failed requests in 158 s (?auto=1, zh) |
| G6 | l10n-live | PASS | no "[MoHeatSub] no zh" during the playthrough |
| G6 | end-live | PASS | back on its own cover with Play again after 158 s |
| G6 | thermal | PASS | DUAL showcase: simultaneous, fast switch, direction, peaks |
| G6 | alt runtime | PASS | 0 errors, 0 failed requests in 159 s (?auto=1, zh) |
| G6 | alt l10n-live | PASS | no "[MoHeatSub] no zh" during the playthrough |
| G6 | alt end-live | PASS | back on its own cover with Play again after 159 s |
| G6 | alt thermal | PASS | DUAL showcase: simultaneous, fast switch, direction, peaks |
| G6 | mobile | PASS | 7 sizes: one screen, ≥ 44 px, guide on screen |
| G6 | drag | PASS | 2 sizes: strokes reach the page, no scroll / zoom / pointercancel |
| G6 | mouth | PASS | mouth opens only while talking |
| G6 | shell | PASS | pure run ends in 153 s, no mic, ←/→ gated, pause, seek ok |
| G6 | l10n-flash | PASS | no Japanese painted before the chosen language (en / zh, desktop / phone, switch) |
| G7 | release | SKIP | staging folder (remake of Demo04_SeasonsExpress): cover / thumbs / menu are checked on Demo04_SeasonsExpress after merge_remake.py |
| G7 | ui | PASS | finished covers current, shell.js, no own UI rules; identical to the reference in 5 states × 2 sizes |
| G7 | style | WARN | 1 view(s) drift from the category style anchor — compare in demos/all-ages/_kit/style_family.jpg — Demo04_SeasonsExpress_v2 is in no series of the all-ages style card — add it to CARDS in tools/art/style_card.py |
| G7 | cover | PASS | face size / eye line / side, copy column, shade, phone |
| G8 | hygiene | WARN | 1 note(s) — assets/ is not in .gitignore (raw art must stay out of git) |
<!-- /qa:auto -->

## Manual — G0 plan (before any spend)
- [ ] 2–4 options shown to the user (character + story), one chosen · date:
- [ ] `project/layers.md`: views × layers × L0–L4, credits / $ total approved (Seedance ≤ 1500 · OpenAI ≤ $10 per demo unless the user says more)
- [ ] Story built on the character's core identity; cast / voice / look unchanged on a remake

## Manual — G1 script + thermal
- [ ] `project/script.md` (template `tools/qa/SCRIPT_TEMPLATE.md`): world rule card, shot list (where "you" are, what is held / not held, far / close), thermal table — reviewed BEFORE any art · by / date:
- [ ] §0.1 成品要求 checked line by line: a "wow" sight per scene, thermal sources visible on screen, physics (thermal / sound / motion / light / space); magic: rule card, cold = blue-white / hot = orange-red, first use shown slowly, no higher intensity, ≥ half real sources
- [ ] Every thermal moment has a physical source next to that ear (no heat for "spicy" / "blushing"); a human voice is warm, strongest at the ear
- [ ] DUAL showcase planned: fast hot↔cold on one ear · strong peaks · clear left / right direction · cool + heat at the same time
- [ ] Every answer is a 2-way choice and can be said aloud (voice judged, close in meaning passes)

## Manual — G3 / G4 art (look at 100 % / 2×, not thumbnails)
- [ ] Lock-face reference (`docs/characters/<id>.md` refs.lock_face) sent with every new pose; backdrop by the card (light / silver hair → green, green hair → magenta, never grey for light hair)
- [ ] ONE fully finished sample view (plate + mouth set + blink + composite + playing in the page) approved before the batch · by / date:
- [ ] `assets/poses_preview.jpg`: same person in every close-up and wide shot — hair, eyes, face, accessories, clothes, line / shading style; story continuity (glasses off stays off)
- [ ] No extra props / background pieces drawn into a pose (cups, door frames, someone else's hand)
- [ ] `assets/patch_check/mouths.jpg`: each mouth closed | open at 2× — no double lip, no jump, opens on the closed mouth
- [ ] Every talking pose is a mouth BLOCK SET (`"mouth": "lp"`, check_patches OLD-MOUTH = 0; hard faces: `"warp": false` / `"view"` / `"hide"`); `assets/lp_mouths/<pose>_sheet.jpg` at 2×: anime teeth band on the mid + wide levels (flat, no tooth lines, inside the lips, same place on both levels), a hint of tongue only on the widest, colours match the character (subtle on realistic faces)
- [ ] Both eyes close in every eyes patch (`assets/patch_check/*_eyes.png`)
- [ ] Every `media/art/char_*.webp` on a dark plate, hair / hands / collar at 2×: no grey / green / magenta fringe, no holes
- [ ] Animation physics: geometry computed first (park / grab heights, travel > 0, nothing clipped); the WHOLE sequence rendered frame by frame with a virtual clock (not one frame); pivots / hinges, never squashed; props in front / behind correctly (claw, fireworks behind buildings), nothing floats

## Manual — G6 play
- [ ] §0.1 成品要求 again on the finished demo: fun / striking, DUAL showcase felt, flawless at 2×, real-world physics, special settings told in the story
- [ ] Watched one talking stretch and blinks myself (mouth follows syllables, closes in pauses; both eyes blink)
- [ ] Played on a phone-size view: answer buttons, long-press and mic usable; guide never off-screen
- [ ] EN / 日本語 / 中文 each seen once on the cover and in play (room for 한국어: strings in `l10n.js`, language in `shared/subs.js` LANGS)
- [ ] switch to this demo in EN and 中文 (desktop + phone): the cover shows the chosen language from its first frame, no Japanese / old cover flash (automatic: check_demo G6 l10n-flash)
- [ ] Felt the thermal moments with the device (or read the #cmd stream) — plausible, strong, fast

## Manual — G7 / G8 release
- [ ] Cover title has kana, not on the face; thumbnails match the language
- [ ] Credits (cover `#credits`, `nav.js` RIGHTS, `credits.html`) match the real voice / art tools
- [ ] Budget logged (README / WORKLOG): Seedance credits, OpenAI $, ElevenLabs characters
- [ ] Committed only my own files (`git show --stat HEAD`); WORKLOG entry; lessons → `DEMO_DESIGN_GUIDE.md` §11.1 + a check
