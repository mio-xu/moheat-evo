# PREPRO · Demo48 『ゆけむり どうぶつおんせん』 (all-ages · ⑥, proposal B3)

Pre-production by `prepro`, 2026-11-09 — **design stage only**.

## Done
- New characters in `tools/eleven/cast.json` (yuzujii, penguin, monkey, fox) + 3 auditions each.
- Design options `project/designs_options.jpg` (ゆずじい / penguin / monkeys / fox × A / B / C). Recommendation was ゆずじい A · penguin B · monkeys B · fox A; **USER PICK (2026-11-09): ゆずじい A · penguin B · monkeys C · fox B** → `assets/art/<c>_base.png`; the fox was made to read unlike Kohaku (no red rope / bell, + a folded onsen towel on its head and a light-blue flower clip: `fox_base` = masked edit of `opt_fox_b`). Voices still pending.

## Done since
- Script + stages (21 lines), thermal plan (hot pipe LEFT / cold pipe RIGHT), ja voices (yuzujii b, penguin b, fox b, monkey = staff_f reused). Art: onsen plate + rain edit; Yuzu-jii, penguin, monkeys, towel fox on green.

## Left
- Cut the sprites, water-line masks (guests sit in the bath), valves / thermometer UI in code, game page (UI v2).
After the picks: script (hot pipe LEFT / cold spring RIGHT, the guests' temperatures, autumn rain), lines, voices, thermal plan, plates, poses, build stage.

## G4 composition (agent `compose`, 2026-11-09) — DONE
- Face points (`project/face_points.json`) → masked blinks (`scripts/variant_prompts.py` → `images.py --composite`): Yuzu-jii (his sleepy
  half-closed eyes close fully), penguin (redone once: the first left arcs of the open eye), both monkeys (one edit, 4 eyes), fox.
- `scripts/split_monkeys.py`: mother / child → two sprites (two separate figures in the source; each in its own pail).
- Guests SIT in the water: `scripts/bath_cut.py` → bath variants (soft wavy water line for the open bath, the pail's front-rim arc for
  the pails), placed with their visible bottom on the plate's water / rim. Yuzu-jii stands (open / rain) and bathes (ending).
- Mouth sets: animal / chibi faces → `"warp": false` LP sets on the drawn line (Yuzu-jii ω, mum ω, fox ω; the penguin opens its BEAK
  along the line between upper and lower beak, no teeth = qa.json exception); the monkey child never talks (qa.json).
- `scripts/grade_plates.py`: plates graded (colour × 1.2 / rain × 1.3) — style_card measured 0.33 saturation vs the fairy anchor 0.55.
- `scripts/make_stage.py` → 7 views: opening, penguin, monkeys in the two pails, rain (Yuzu-jii / fox), Yuzu-jii's own bath, and the
  ending with everyone where their temperature is (penguin under the COLD right pipe, mum in the left hot-side pail, fox lukewarm middle).
- Monkey voice: m01–m04 re-rendered at stability 0.3 (cast.json setting; `scripts/voice.py` now passes per-voice stability), 155 chars.
- Checks: check_cut_body 0 · check_patches 0 FAIL (NO-MOUTH warnings = the silent child) · check_art 0 / 0 · style_card ok.
- Contact sheet: `project/stills_contact.jpg`.

## Left (G5+)
- Game page (UI v2): valves / thermometer / steam / rain in code, the guests' ripples; check_mouth / check_motion / plan_sim once it runs.

## Spend (2026-11-09)
OpenAI ≈ $5.6 / $15 (G4: 5 masked blinks ≈ $1.1) · ElevenLabs ≈ 1.05k chars + 4 auditions.
