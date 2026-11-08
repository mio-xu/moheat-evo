# PREPRO · Demo50 『なつやすみ、じいちゃんちの すいかわり』 (healing · ⑧, proposal G1)

Pre-production by `prepro`, 2026-11-09 — **design stage only**. Same faces as Demo15 / 16 / 29; only summer clothes change.

## Done
- Options `project/designs_options.jpg`: grandma A / B / C, grandpa A / B / C. **USER PICK (2026-11-09): grandma C (housedress + white apron + uchiwa) · grandpa A (jinbei + straw hat)** → `assets/art/grandma_base.png` / `grandpa_base.png` (option backdrop #d8d8d8; redraw on the card's screen before the cut-out stage if needed).

## Done since
- Script + steps (23 lines, hana / gen ja voices), thermal plan + sim 4/4 PASS. Art: bus stop / stream / yard / rice-field plates, grandma C + grandpa A bases, grandma_fan (left, uchiwa) and grandpa_melon.

## Left
- Face points + blinks (grandma's eyes are drawn closed in a smile; grandpa needs a blink), mouth sets (grandpa's mouth sits under his moustache: `warp: false` likely), stage, watermelon props, page (UI v2).
After the picks: script (G1), lines (hana / gen voices, unchanged), thermal plan, plates (bus stop, river, yard + veranda, rice field at night), poses, build stage.

## G4 composition (agent `compose`, 2026-11-09) — DONE
- Face points (`project/face_points.json`); grandpa's masked blinks (base / melon, `scripts/variant_prompts.py`). Grandma's eyes are drawn
  closed in her smile (her look since Demo15) → no blink by design (qa.json note).
- Mouth sets: grandma = LivePortrait, small openings, rotate auto (her night copy: warp:false, LP opened only the middle); grandpa =
  warp:false on the short line UNDER his moustache + `hide` = the moustache polygon (the moustache stays over the opening) + `search` so the
  moustache outline is not taken for the mouth line (first melon set opened under the moustache).
- Night (part 5): `scripts/night_grade.py` moon-graded copies of both poses (own mouth sets); the stream plate gets a soft depth of field
  (style card: line density 0.22 vs the family anchor 0.09 → ok).
- `scripts/make_stage.py` → 13 views per the shot list (bus stop near / left ear, stream front / melon from the right / duo, yard front /
  blindfold duo, veranda near / uchiwa at your left ear / duo, rice fields at night ×3). Grandpa with the melon is a full figure scaled to
  the same face size as his knees-up base (eye distance), feet below the frame.
- Checks: check_cut_body 0 · check_patches 0 · check_art 0 FAIL (WARN: grandpa_melon "outfit colour" = his bare legs vs the shorts, same
  look) · style_card ok.
- Coordinator QA round 2: ONE night grade for both (`night_grade.py`: half desaturated, highlights rolled off to ≤ 45 % so her apron never
  out-shines the window / fireflies, moon-blue tint, a thin rim on the moon side; figure mean ≈ 65–98 vs plate p99 82); the night mouth sets
  use a low "dark" + light .65 (fainter lines); ambient-occlusion pools at the frame bottom under the knees-up figures (build_stage `"shadow"`,
  their feet are below the frame).
- Contact sheet: `project/stills_contact.jpg`.

## Left (G5+)
- Page (UI v2), watermelon split / fireflies / mosquito net / fan in code, check_mouth / check_motion / plan_sim on the page.

## Spend (2026-11-09)
OpenAI ≈ $3.8 / $15 (G4: 2 masked blinks ≈ $0.45) · ElevenLabs ≈ 0.8k chars.
