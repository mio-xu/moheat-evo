# Agent guide — MoHeat Evo

This repo is the public GitHub Pages site for MoHeat Evo (thermal headphones) **and** the production workspace of the thermal-haptic ASMR demo series.

**Before making or updating any demo, read [`DEMO_DESIGN_GUIDE.md`](DEMO_DESIGN_GUIDE.md)** (the reusable design rules: story shape, DUAL thermal layers, voice, art, animation, layout, workflow, checklist) **and [`HANDOFF_ASMR_DEMOS.md`](HANDOFF_ASMR_DEMOS.md)**: it covers the user's standing rules, the environment, the device protocol, the shared pipeline, the status of Demo 1–4 and the next steps.

Key rules (details in the handoff):
- Talk to the user in **Chinese**.
- Subtitles are **Japanese + English only** (no Chinese).
- **Seedance only when the user asks**: for Demo 1–3 and Demo 9 the browser-rendered MP4 is the final film. For Demo 4 (Seasons Express) the user asked (2026-11-07) for Seedance prompts (`demos/all-ages/Demo4_SeasonsExpress/Seedance素材命令.md`); the browser MP4 stays the current film until the clips arrive.
- **Voices: ElevenLabs by default for everything** (user, 2026-11-08), already set up; all earlier demos have been re-voiced with it too. Follow the handoff §4 "配音标准：ElevenLabs" (template code, settings, tag conventions, audition flow) instead of re-researching.
- **Images and video: Seedance, API first** (`~/.seedance_key`); if the API is unavailable (upload 429 / long Retry-After, 401) switch at once to the seedance2-5.com website via Chrome (user, 2026-11-08). Details and the credit / token-saving checklist for video: `DEMO_DESIGN_GUIDE.md` §5.3 and §6.1. (Earlier art came from ChatGPT prompt lists the user ran.)
- **Never modify earlier demos**: reuse art by symlink and code by import-by-path.
- **Commit and push every change to `origin main`.** Large media stay out of git.
- **Keep the repo tidy** (user, 2026-11-08): new files follow the folder layout in `DEMO_DESIGN_GUIDE.md` §12; after each finished demo run `python3 tools/cleanup/audit.py` and, with the user's OK, move unneeded resources to the Trash (`--trash`).
- Thermal output per ear: the old commands (`LC50 RH0`) are one mode per ear (cool or heat), and every old thermal CSV must keep 0 same-ear conflicts. Since 2026-11-08 the firmware (`arduino/`, local only) also takes `DUAL LC.. LH.. RC.. RH..`: cool and heat independent on the same ear. The user prefers new demos to use it: a voice close to your ear warms it with its loudness, and ambient warm / cool shows the surroundings.
- **Every demo page fits exactly one screen** (no page scroll at common desktop sizes) with a layout as consistent as possible across demos; thermal mappings must be physically plausible (no warmth just because a character eats something spicy), and a human voice is always warm (strongest at the ear, milder with distance) unless the character has a special setting such as a snow spirit. Applies to all new demos (user, 2026-11-08).
- **Character animation (Seedance video)**: follow handoff §4b first time — Seedance 2.5 Lite **1080p**, First & Last Frame = the demo stills, a transition clip for every cut, loops snapped back to the still in post, switch clips only at the still (user, 2026-11-08).
