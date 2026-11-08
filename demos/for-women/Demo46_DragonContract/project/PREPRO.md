# PREPRO · Demo46 『竜の王と、エルフの王と、小悪魔』 (for-women · crossover ④)

Pre-production by `prepro`, 2026-11-09. Not in the menu, no page.

## Done
- `project/script.md` (story, world rule card with the one special setting — a dragon's wing holds fire inside, told in g07 + shown —, shot list, DUAL table, interactions), `scripts/script_data.py` → `lines.js` (`window.DRAGON_LINES`) / `l10n.js` / `project/zh_lines.json` (124 lines).
- `project/thermal_plan.json` (study window L / fire R, take-off gust = cold peak, dragon breath = warm peak, wing = left ear cold → warm in < 1 s, lake ice + cloak, song from the far right).
- `scripts/voice.py` (hinata = 陽向 for-women voice, gaku, ren; ja / en / zh switch). **ja only for now** (coordinator: en / zh wait for the rollout / quota decision).
- **Design options for the user** `project/designs_options.jpg` (陽向 / 岳 / 蓮 × A / B / C, gpt-image-2 high; prompts `scripts/design_options.py`). Recommendation was 陽向 B · 岳 C · 蓮 C; **USER PICK (final, 2026-11-09): 陽向 C (plum page-boy butler + half-cape + tea tray) · 岳 C (high-collar black royal coat, his own fringe, dragon tail) · 蓮 A (silver-white robe + ice-crystal crown, long hair)** → copied to `assets/art/<c>_base.png` (option backdrop #d8d8d8: Hinata / Ren to be redrawn on green #00B140 for the cut-out).

## Done since
- Bases redrawn from the picks at thighs-up on the card screens (Hinata's open grin closed: mouth-only composite, his star stud kept), plates study / valley / lake / dawn, close poses hinata_ear (right), gaku_wing (left, glowing wing), ren_ear (right), masked blinks for all six, cover art. Face points `project/face_points.json`, `scripts/make_stage.py` (28 views; Gaku placed left so the beacon shows), LivePortrait mouth sets (Hinata's fang kept by a `fang` polygon), build_stage, Gaku's grey fringe unmixed. Thermal sim 4/4 PASS (ja voices).

## Left
- After the last rebuild: confirm checks (cut-body / patches / art) and look at `project/stills_contact.jpg` at 2×; grade the 'night' study views darker at the build stage.
1. Base poses at high quality from the picked option (+ lock-face refs), plates (study, valley, lake, dawn), close poses (hinata_ear right, gaku_wing left, ren_ear right), masked blinks, face points, stage, LP mouths, checks, cover art (+ a story creature: a tiny bat familiar / the beacon).
2. After the ja voices: `python3 tools/thermal/plan_sim.py demos/for-women/Demo46_DragonContract --plot` (+ `--alt`); listen to r01 / r05a (`[singing]`).
3. Build stage = Demo44 PREPRO "Left" items 2–6 (UI v2: shell.js, cover.json + art.webp + covers.py --publish, chapters ≥ 2, G7 ui).

## Spend (2026-11-09)
OpenAI ≈ $7.3 / $15 · Seedance 0 · ElevenLabs ja ≈ 4.3k chars (en / zh pending the rollout decision).
