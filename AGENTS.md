# Agent guide — MoHeat Evo

This repo is the public GitHub Pages site for MoHeat Evo (thermal headphones) **and** the production workspace of the thermal-haptic ASMR demo series.

**Before working on any demo, read [`HANDOFF_ASMR_DEMOS.md`](HANDOFF_ASMR_DEMOS.md)**: it covers the user's standing rules, the environment, the device protocol, the shared pipeline, the status of Demo 1–4 and the next steps.

Key rules (details in the handoff):
- Talk to the user in **Chinese**.
- Subtitles are **Japanese + English only** (no Chinese).
- **Seedance only when the user asks**: for Demo 1–3 and Demo 5 the browser-rendered MP4 is the final film. For Demo 4 (Seasons Express) the user asked (2026-11-07) for Seedance prompts (`demos/Demo4_SeasonsExpress/Seedance素材命令.md`); the browser MP4 stays the current film until the clips arrive.
- Character art comes from **ChatGPT prompt lists** that the user runs.
- **Never modify earlier demos**: reuse art by symlink and code by import-by-path.
- **Commit and push every change to `origin main`.** Large media stay out of git.
- The device firmware allows **one mode per ear** (cool or heat). Every thermal CSV must have 0 same-ear conflicts.
