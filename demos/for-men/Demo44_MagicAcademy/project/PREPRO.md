# PREPRO · Demo44 『まちがい召喚と、まほう学院の三人』 · Summoned by Mistake (for-men · crossover ②)

Pre-production (engine-independent parts) by agent `prepro`, 2026-11-09 (user: 「其他demo的部分可以先准备剧情设计，素材，配音等本身与引擎无关的准备」).
**Not in nav.js / the menu, no page, no cover render** — build stage only.

## Done
| Part | Where | Notes |
|---|---|---|
| Story, shot list, world rule card, DUAL thermal table, interactions, keep-talking plan | `project/script.md` | proposal M1-West; 椿 / ココア / ルナ each once in the crossover series |
| Every line (ja tagged + en + zh), story as data (`STEPS`: beats, interactions, '@events', free-talk windows), bridges, topics, place × cast (sky = Tsubaki only: her broom) | `scripts/script_data.py` → `lines.js` (`window.ACAD_LINES`), `project/zh_lines.json`, `l10n.js` (zh lines + answers + names + voice phrasings) | 144 lines |
| **Designs — confirmed by the user** (2026-11-09 「很满意」): 椿 A (academy uniform + crown braid), ココア A (alchemist apron, goggles on the beret, side braid), ルナ B (witch coat + hat) | `project/designs_contact.jpg`; bases `assets/art/<c>_base.png` | |
| Voices ja / en / zh (user 2026-11-09: the voice follows the subtitle language), ElevenLabs confirmed voices tsubaki `ydtidqvCazlHO8YgKhfx` · cocoa `Wvbdi4FXYZiHiu1iXnak` · luna `1blqWrqFcJagS9nJcCXc`, eleven_v4 / 0.4 / 0.8 / seed 7 | `scripts/voice.py [--lang ja\|en\|zh\|all] [--count]` → `media/voice/<lang>/<id>.m4a` + `index.json`, `media/voice.js` (`window.ACAD_VOICE`, durations per language) | **ja 144 lines 800.6 s · en 144 / 674.6 s · zh 144 / 671.4 s** — time each language separately at the build stage. en / zh: tags moved by `tools/eleven/dub.py`, zh speaks the names Tsubaki / Cocoa / Luna. ja + caches committed; **en / zh m4a (12 + 11 MB) kept local** until the coordinator decides on size |
| ElevenLabs characters used | `project/voice_log.json` | ja 5,520 (incl. re-renders) · en 9,577 · zh 4,301 |
| Thermal plan (data) + simulation with the real voice loudness | `project/thermal_plan.json` → `python3 tools/thermal/plan_sim.py <demo> [--alt] [--plot] [--lang ja\|en\|zh]` → `project/thermal_preview.csv` (+ `_alt`, `.png`) | ja: 322 s path; fast switch right 0.55 s, peaks cool .94 / warm .90, direction, same-ear DUAL — **all PASS** both paths |
| Art (OpenAI gpt-image-2; Seedance API 429 Retry-After 28,086 s) | `scripts/prompts.py` → `project/web_prompts.json`; raw PNGs in `assets/art/` (git-ignored) | 5 plates (hall, sky, lab, tower, dawn = edit of tower), 6 poses (3 bases + tsubaki_broom, cocoa_ear, luna_ear), masked blinks for all 6, cocoa_ear_blow (pursed lips, silent blow), cover art (three heroines + the fire salamander マシュマロ), `project/face_points.json`, `scripts/make_stage.py` → `project/stage.json` (23 views; `NOLP=1` first build), `project/placement.json` (cocoa_ear moved right) |
| Cover data draft | `project/cover_draft.json` | UI v2 format; copy to `cover.json` at the build stage |

## Left (in order)
1. Mouths + composition (paused by the coordinator 2026-11-09, resume next): `~/ml/LivePortrait/.venv/bin/python tools/art/lp_mouths.py demos/for-men/Demo44_MagicAcademy --sheet`
   (media/layers.js from the `NOLP=1` build exists) → `python3 scripts/make_stage.py && python3 tools/art/build_stage.py <demo> --preview`
   → `check_cut_body.py` / `check_patches.py` / `check_art.py` / `style_card.py check`; look at `assets/poses_preview.jpg`,
   `assets/lp_mouths/<pose>_sheet.jpg` and every `char_*.webp` on dark at 2×.
2. Build stage (UI v2, coordinator 2026-11-09): the page loads `../../shared/shell.js` (NOT `cover.js`, being deleted); no cover HTML /
   no `drawCover`; the cover = `cover.json` (template `tools/web/cover_template.json`, draft `project/cover_draft.json`) +
   `media/cover/art.webp` (from `assets/art/cover_art.png`, 1920×1080) + `python3 tools/web/covers.py Demo44_MagicAcademy --publish`;
   chapters ≥ 2 (the 5 `STEPS`); `check_demo` G7 **ui** row (`check_ui` / `check_device`) must pass.
3. `index.html` / `main.js` / `audio.js` from the pilot (Demo43) driven by `lines.js` `steps`; voices per language from
   `media/voice/<lang>/` (timing per language); thermal EVENTS / PLACE_AMB from `project/thermal_plan.json`; free talk via
   `demos/shared/talk.js` (+ `tools/talk/demos.json` and a `live/` page).
4. `l10n.js`: add the cover / page texts (table like Demo43 `scripts/make_l10n.py`).
5. Code FX: summoning circle glow (no temperature), wind streaks, furnace flare + steam, mug steam, frost mist, ice crystals (one
   slow crystal, then the 360° orbit), fireplace sparks, the salamander on Cocoa's shoulder (prop layer from the cover), dawn circle.
6. G4–G8: `check_demo.py --full`, credits, nav.js + menu + thumbnails, README, HANDOFF, WORKLOG.

## Open points
- Story path ≈ 5:20 including the three free-talk windows and auto-answer waits (lines alone ≈ 3:30): longer than the pilot; tighten
  waits at the build stage or cut keep-talking-only lines.
- `cover_art.png`: Luna's hat tip touches the top edge (crop at render).

## Spend (2026-11-09)
OpenAI ≈ **$4.14** / $15 (22 images, `project/openai_log.json`) · Seedance **0** · ElevenLabs ≈ 19.4k characters (ja + en + zh).
