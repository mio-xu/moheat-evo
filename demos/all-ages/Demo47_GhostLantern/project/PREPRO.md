# PREPRO · Demo47 『ひやっと！おばけやしきの ちょうちんばん』 (all-ages · ⑤, proposal A2)

Pre-production by `prepro`, 2026-11-09 — **design stage only** (user 2026-11-09: the user picks every new character first).

## Done
- New characters registered in `tools/eleven/cast.json` (bonchan, yurari) + 3 Voice Design auditions each (`tools/eleven/out/<char>/r1_*.mp3`; 8 s clips in the scratchpad PICKS folder).
- Design options `project/designs_options.jpg` (ぼんちゃん / the small ghosts / ゆらり × A / B / C; `scripts/design_options.py`). Recommendation was ぼんちゃん B · ghosts B · ゆらり B; **USER PICK (2026-11-09): ぼんちゃん C (yellow cat-faced lantern, red ribbon) · ghosts C (karakasa umbrella yokai + white ghost + blue flame) · ゆらり B (white bob, goldfish yukata)** → `assets/art/<c>_base.png`. Voices still pending.

## Done since
- Script + stages as data (`scripts/script_data.py`, 29 lines), thermal plan (game-driven; ghosts cool = special setting told in lines), ja voices (bonchan c / yurari b). Art (`scripts/art_prompts.py`): plates gate / corridor / tatami / storehouse; bonchan base + scared, the three ghosts, Yurari base / ear / happy on green.

## Left
- Cut the sprites (chroma green) into layers, a happy Bon-chan variant if needed, game page (UI v2), SFX.
After the picks: `project/script.md` (proposal A2: 5 stages, ghosts are cool = special setting told in a line, the lantern is warm, the dark storehouse stage), lines + voices (pick.py the chosen voices), thermal plan + plan_sim, plates (gate, corridor, tatami room, storehouse), sprites, build stage (UI v2 notes as in Demo44 PREPRO).

## G4 composition (agent `compose`, 2026-11-09) — DONE
- Face points measured on 2× grids → `project/face_points.json`; masked variants (`scripts/variant_prompts.py` → `tools/openai/images.py --composite`):
  blinks for Bon-chan (base / scared), the three ghosts (one edit, 5 eyes), Yurari (base / ear / happy); Bon-chan is drawn with his mouth
  open → masked CLOSED edits `bonchan_base_quiet` (ω) / `bonchan_scared_quiet` (wavy) are his layers (`scripts/fix_quiet.py` removes one stray stroke).
- `scripts/split_ghosts.py`: ghosts_base (+ blink) → `ghost_kasa / ghost_white / ghost_wisp` (one layer + blink each, same coordinates).
- Mouth sets: all chibi → `"warp": false` LP sets on the drawn line (Bon-chan: ω / wavy line, flat teeth band; Yurari: thin smile,
  `scripts/bridge_mouth.py` bridges its 3–9 px highlight gap so both corners open). Ghosts never talk (qa.json mouth_exceptions).
- `scripts/make_stage.py` → `project/stage.json`: 13 views (gate / corridor / tatami / storehouse with Bon-chan + ghosts on their sides,
  Yurari far / ear / happy, finale with everyone), hooks `LANTERN.S.view / who`; `media/layers.js` + `media/art/` built.
- Checks: check_cut_body 0 · check_patches 0 FAIL (NO-MOUTH warnings = the silent ghosts only) · check_art 0 / 0 · style_card ok (fairy).
- Coordinator QA fix: Bon-chan's feet sit inside the frame (y .96) in every view; his candle lights the floor where he stands in every
  plate (`scripts/lantern_glow.py`: bg_<place>_b<x>h<h> = plate + warm screen-blended pool / halo; the storehouse plate has it baked).
- Contact sheet: `project/stills_contact.jpg`.

## Left (G5+)
- Game page (UI v2) moving the sprites (ghosts glide in from a side, the lantern turns), SFX, check_mouth / check_motion / plan_sim once the page runs.

## Spend (2026-11-09)
OpenAI ≈ $6.6 / $15 (G4: 9 masked edits ≈ $2.1) · ElevenLabs ≈ 1.1k chars + 2 auditions.
