# 火をともして、ひみつの泉へ · Kindle the Fire, Find the Hidden Spring

An interactive puzzle (no timeline, no MP4) with Kohaku the guide fox. Binaural sounds are synthesized live in the browser
(Web Audio, HRTF panner); the thermal output is computed live from the same sources and directions.

**Play**: double-click `start_demo.command` (or `python3 -m http.server 8765` at the repo root → `http://localhost:8765/demos/all-ages/Demo10_CaveSpring/`).
Headphones on; mic optional (blow = fan the ember / blow out a candle; or hold the Blow button / Space).

## Story / puzzle
| Scene | What you do | Thermal |
|---|---|---|
| Mountain hut | find straw (basket) + flint (one of three drawers) → strike at the hearth ×3 → **blow** the ember into a fire → take the hand candle, light it at the fire → door | window draught = left cool; ember / fire = warm, front (both ears); hand candle = slight warm right |
| Cave mouth | four candles, one true flame and three foxfires. Select a candle: true = **warm** + crackle, foxfire = **cold** + glassy chime, on that candle's side. **Blow** out the foxfires (blowing out the true one relights everything) | focused candle; door opening = cool rush both ears |
| Tunnel ×2 | pick the opening with the water sound / cool air (random side each play); the other is a warm dead end with bats | water side cool, other side warm; drips = short cool pulses at their side |
| Spring | **blow** out your candle → the lake and ceiling light up; touch the water | waterfall (right) + lake = cool; touches = cool pulse at that side |
Then Kohaku thanks you and the page returns to the cover (device output `stop`).

Your breath always cools both ears. Per ear only the stronger mode is sent (hysteresis 0.06; switching sets the other channel to 0) → 0 same-ear conflicts (the page counts them: `CAVE.conflicts()`).

## Files
- `index.html`, `../../shared/game.css` — page (player chrome like Demo 4; `?embed=1` for the site menu, `?cover=1` poster, `?shot=<bg>` clean background, `?scene=gate|tunnel|spring` jump for testing).
- `main.js` — puzzle state, hit areas, Kohaku's speech queue, thermal engine, device output (same protocol / range as all demos).
- `art.js` — code-drawn pastel cel-shaded scenes; Seedance clips in `assets/video/<name>.mp4` replace them automatically (see `project/prompts_seedance.md`; layout references in `project/layout_refs/`). When clips arrive: re-measure `GEO`, skip the code-drawn hearth flames when `hut_fire` is present, compress to 720p before committing.
- `audio.js` — synthesized sounds (wind, fire, candle, foxfire, stream, waterfall, drips, bats, door rumble…) + Kohaku's voice playback.
- `lines.js` — Kohaku's lines (ja / en / TTS reading). `scripts/voice.py` → `media/voice/<id>.m4a` + `media/voice.js` (ElevenLabs, key in the repo .env.local).
- Voice: **ElevenLabs** `kohaku r1_b` (user's pick 2026-11-08, tools/eleven/cast.json; earlier VOICEVOX:猫使ビィ). Auditions: `audio/audition/` (local only).

## Painted art (images, 2026-11-07)
All scenes, Kohaku and the props are painted images in the Demo 1–4 style (no ukiyo-e), generated with the Seedance 2.5 site's
**GPT Image 2** image-to-image model through its API, with a Demo 1–4 style board + the code-drawn layout as references.
- `scripts/seedance_images.py <ids|all>` — generate (key in `~/.seedance_key`, never committed). Jobs, prompts, ratios and references:
  `project/seedance_jobs.json`, `project/seedance_refs/`; log with generation IDs: `project/seedance_log.json`.
  Backgrounds 2K (25 credits), sprites 1K (15 credits); `--again` = new variant, `--fetch` = download a submitted job.
- `scripts/prepare_art.py` — raw `assets/art/*.png` (git-ignored) → `media/art/*.webp`: backgrounds 1920×1080; sprites cut out
  (real alpha or macOS Vision lift); Kohaku's talk / blink / happy faces are aligned and blended onto `kohaku_base`, so frames never jump.
- `art.js` loads `media/art/*.webp`; when the backgrounds are present `GEO` switches to `ARTGEO` (positions measured on the paintings).
  Missing files fall back to the code drawing (`?noart=1` forces it). Flames, light, sparks and ripples stay code-drawn on top.
- The unlit spring is the glowing painting multiplied dark; tunnel 2 is the fork mirrored; the hut cross-fades to `bg_hut_fire` as the fire grows.
