# Agent guide — MoHeat Evo

This repo is the public GitHub Pages site for MoHeat Evo (thermal headphones) **and** the production workspace of the thermal-haptic ASMR demo series.

**Before making or updating any demo, read [`DEMO_DESIGN_GUIDE.md`](DEMO_DESIGN_GUIDE.md) (reusable design rules) and [`HANDOFF_ASMR_DEMOS.md`](HANDOFF_ASMR_DEMOS.md)**: it covers the user's standing rules, the environment, the device protocol, the shared pipeline, the status of Demo 1–4 and the next steps.

Key rules (details in the handoff):
- Talk to the user in **Chinese**.
- Subtitles are **Japanese + English only** (no Chinese).
- **Seedance only when the user asks**: for Demo 1–3 and Demo 9 the browser-rendered MP4 is the final film. For Demo 4 (Seasons Express) the user asked (2026-11-07) for Seedance prompts (`demos/all-ages/Demo4_SeasonsExpress/Seedance素材命令.md`); the browser MP4 stays the current film until the clips arrive.
- **Images and video: Seedance, API first** (`~/.seedance_key`); if the API is unavailable (upload 429 / long Retry-After, 401) switch at once to the seedance2-5.com website via Chrome (user, 2026-11-08). Details and the credit / token-saving checklist for video: `DEMO_DESIGN_GUIDE.md` §5.3 and §6.1. (Earlier art came from ChatGPT prompt lists the user ran.)
- **Never modify earlier demos**: reuse art by symlink and code by import-by-path.
- **Commit and push every change to `origin main`.** Large media stay out of git.
- **Every demo page fits exactly one screen** on desktop and on phones / tablets in portrait and landscape, with the player as large as possible (shared `series.css` / `nav.js`, DEMO_DESIGN_GUIDE §7.1).
- **Keep the repo tidy** (user, 2026-11-08): new files follow the folder layout in `DEMO_DESIGN_GUIDE.md` §12; after each finished demo run `python3 tools/cleanup/audit.py` and, with the user's OK, move unneeded resources to the Trash (`--trash`).
- The device firmware allows **one mode per ear** (cool or heat). Every thermal CSV must have 0 same-ear conflicts.
