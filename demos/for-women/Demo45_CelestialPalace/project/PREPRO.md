# PREPRO · Demo45 『てんにょ様は、未来から』 · A Celestial from the Future (for-women · crossover ③)

Pre-production by agent `prepro`, 2026-11-09. **Not in nav.js / the menu, no page, no cover render.**

## Done
| Part | Where | Notes |
|---|---|---|
| Story, shot list, world rule card (no magical temperature at all: the mirror / ring of light = light only), DUAL thermal table, interactions | `project/script.md` | proposal F1-East; unnamed fictional East (蒼月国・白露宮) |
| Lines ja + en + zh, story as data, bridges, place × cast (5 places) | `scripts/script_data.py` → `lines.js` (`window.PALACE_LINES`), `l10n.js`, `project/zh_lines.json` | 142 lines; SAY readings for names / palace words |
| **Designs = user decision 2026-11-09**: 迅 A (gold-dragon robe, topknot + crown) · 紫苑 A **without glasses** (user: 古代人不会戴眼镜 → `shion_base.png` = masked edit of `design_shion_a`) · 朔 B (black hooded cloak, low tie, fox mask at the belt) | `project/designs_picked.jpg`, `project/designs_contact.jpg` | first team picks (Shion B / Saku A) and everything drawn from them moved to `assets/art/discarded/` (≈ $1.3 wasted, logged) |
| Voices ja / en / zh (jin `l1hVja3dChhcMKwBT6Nx`, shion `wrMX0OkmDIInpPC5f1Hx`, saku `7R01hi42FiEiqOj5XqSE`) | `scripts/voice.py` → `media/voice/<lang>/`, `media/voice.js` (`window.PALACE_VOICE`) | ja 142 lines 777.9 s; en / zh rendering (see `project/voice_log.json`); zh speaks Jin / Shion / Saku |
| Thermal plan + simulation | `project/thermal_plan.json` → `tools/thermal/plan_sim.py` → `project/thermal_preview.csv` (+ `_alt`, `.png`) | fast switch right 0.6 s (the fan), peaks cool .92 (plunge) / warm .90, direction, same-ear DUAL — **all PASS** |
| Art kept | `assets/art/` | plates pond / chamber / terrace / corridor / dawn; `jin_base` + `jin_ear` (+ blinks); `shion_base` (no glasses); `saku_base` (= design B) |

## Left (in order, after the Demo44 detail work)
1. Redraw from the new bases: `shion_ear` (face in the LEFT third, no glasses), `saku_ear` (from design B), their masked blinks +
   `shion_base_blink` / `saku_base_blink` (measure `project/face_points.json` for the new bases first), cover art (three men + the jade
   rabbit, no glasses). Then `NOLP=1 python3 scripts/make_stage.py` → `build_stage.py` → `lp_mouths.py --sheet` → `make_stage.py` →
   `build_stage.py --preview` → checks (cut-body, patches, art, style) + 2× looks. Placement: `jin_ear` / `saku_ear` to the right.
2. Build stage: same UI v2 notes as Demo44's PREPRO (shell.js, cover.json + art.webp + covers.py --publish, chapters ≥ 2, G7 ui),
   voices per language, thermal from `thermal_plan.json`, talk engine, l10n page texts, FX (snow, ice, brazier flare, incense smoke,
   fan stroke, torches, the ring of light), jade rabbit prop layer.

## Spend (2026-11-09)
OpenAI ≈ **$4.6** / $15 (incl. ≈ $1.3 discarded) · Seedance 0 · ElevenLabs: see `project/voice_log.json`.
