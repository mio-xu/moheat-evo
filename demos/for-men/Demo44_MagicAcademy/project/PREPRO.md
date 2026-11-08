# PREPRO · Demo44 『まちがい召喚と、まほう学院の三人』 · Summoned by Mistake (for-men · crossover ②)

Pre-production (engine-independent parts) by agent `prepro`, 2026-11-09 (user: 「其他demo的部分可以先准备剧情设计，素材，配音等本身与引擎无关的准备」).
**Not in nav.js / the menu, no page, no cover render** — build stage only.

## Done
| Part | Where | Notes |
|---|---|---|
| Story, shot list, world rule card, DUAL thermal table, interactions, keep-talking plan | `project/script.md` | proposal M1-West; 椿 / ココア / ルナ each once in the crossover series |
| Every line (ja tagged + en + zh), story as data (steps, interactions, '@events', free-talk windows), bridges, topics, place × cast | `scripts/script_data.py` → `lines.js` (`window.ACAD_LINES`), `project/zh_lines.json`, `l10n.js` (zh lines + answers + names + voice phrasings) | 146 lines; sky keep-talking = Tsubaki only (her broom) |
| Voices (Japanese, ElevenLabs, confirmed voices — no audition needed) | `scripts/voice.py` → `media/voice/*.m4a`, `media/voice.js` (`window.ACAD_VOICE` durations), cache `audio/voice_cache.json` | tsubaki `ydtidqvCazlHO8YgKhfx`, cocoa `Wvbdi4FXYZiHiu1iXnak`, luna `1blqWrqFcJagS9nJcCXc`; v4 / ja / 0.4 / 0.8 / seed 7; readings for rare kanji in `SAY` (spoken only). `--lang en|zh` = later dub switch (not rendered) |
| Thermal plan (data) + simulation with the real voice loudness | `project/thermal_plan.json` → `python3 tools/thermal/plan_sim.py <demo> [--alt]` → `project/thermal_preview.csv` (+ `_alt`) | see "Thermal check" |
| Art (layered standard, OpenAI gpt-image-2; Seedance API 429 Retry-After 28,086 s) | `scripts/prompts.py` → `project/web_prompts.json`; raw PNGs in `assets/art/` (git-ignored) | see "Art" |

## Build stage (what is left — engine / UI v2 dependent)
- **UI v2** (coordinator 2026-11-09): the page loads `../../shared/shell.js` (NOT `cover.js`, being deleted); no cover HTML / no
  `drawCover`; the cover = `cover.json` (template `tools/web/cover_template.json`; a draft is in `project/cover_draft.json`) +
  `media/cover/art.webp` (from `assets/art/cover_art.png`, 1920×1080) + `python3 tools/web/covers.py Demo44_MagicAcademy --publish`;
  chapters ≥ 2 (the 5 steps of `STEPS`); `check_demo` G7 **ui** row (`check_ui` / `check_device`) must pass.
- `index.html` / `main.js` / `audio.js` from the pilot structure (Demo43) driven by `lines.js` `steps`; thermal EVENTS / PLACE_AMB
  from `project/thermal_plan.json`; free talk via `demos/shared/talk.js` (+ `tools/talk/demos.json` entry and `live/` page for the
  private live version, `scripts/pages.py` like Demo43).
- `l10n.js`: add the cover / page texts (`text.ja / text.en` mixed keys) — regenerate from `scripts/script_data.py` + a build-stage
  table like Demo43 `scripts/make_l10n.py`.
- Code FX: summoning circle glow (no temperature), wind streaks (speed), furnace flare + steam, mug steam, frost mist from the cabinet,
  ice crystals (the slow single crystal, then the 360° orbit), fireplace sparks, dawn circle; cold = blue-white, hot = orange-red.
- Then G4–G8: `check_demo.py --full`, credits, nav.js + menu + thumbnails (only after review), README, HANDOFF, WORKLOG.

## Spend
(filled at the end)
