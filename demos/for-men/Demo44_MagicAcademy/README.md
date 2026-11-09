# まちがい召喚と、まほう学院の三人 · Summoned by Mistake (for-men · crossover ②)

Cast: 椿 / ココア / ルナ. Story: hall → sky (broom) → lab → tower → dawn; 3-way ending; もっと話す 5 places × cast (sky = Tsubaki only).

Everything but the effects is data, driven by the shared engine `demos/shared/story.js` (+ `story.css`):
- `scripts/script_data.py` → `lines.js`, `project/zh_lines.json`, `l10n.js` (page texts: `PAGE` table there)
- `project/thermal_plan.json` → `python3 tools/thermal/plan_js.py <this folder>` → `media/plan.js`; simulation `tools/thermal/plan_sim.py`
- `scripts/voice.py` → `media/voice/<lang>/` + `media/voice.js`; the page plays the subtitle language, Japanese when that language is not published
- art: `project/stage.json` → `tools/art/build_stage.py` → `media/layers.js`; cover: `cover.json` + `media/cover/art.webp` → `tools/web/covers.py`
- `main.js`: per-demo FX (positions in 1920 × 1080), sounds per event, sound beds, event → view
- `live/` = private AI-talk page (`python3 scripts/pages.py` regenerates `live/index.html`; `live/live.js` = data for `demos/shared/story_live.js`; served only by `tools/talk/server.py`, entry in `tools/talk/demos.json`)

Tests: `?auto=1` · `&alt=1` · `&end=N` · `?talk=<cast>&place=<place>` · `window.<ns>.show(view, ...events)` holds one picture .
