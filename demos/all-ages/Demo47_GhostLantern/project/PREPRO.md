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

## Spend (2026-11-09)
OpenAI ≈ $4.5 / $15 · ElevenLabs ≈ 1.1k chars + 2 auditions.
