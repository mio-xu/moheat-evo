# 火をともして、ひみつの泉へ · Kindle the Fire, Find the Hidden Spring

An interactive puzzle (no timeline, no MP4) with Kohaku the guide fox. Binaural sounds are synthesized live in the browser
(Web Audio, HRTF panner); the thermal output is computed live from the same sources and directions.

**Play**: double-click `start_demo.command` (or `python3 -m http.server 8765` at the repo root → `http://localhost:8765/demos/Demo10_CaveSpring/`).
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
- `index.html`, `demo.css` — page (player chrome like Demo 4; `?embed=1` for the site menu, `?cover=1` poster, `?shot=<bg>` clean background, `?scene=gate|tunnel|spring` jump for testing).
- `game.js` — puzzle state, hit areas, Kohaku's speech queue, thermal engine, device output (same protocol / range as all demos).
- `art.js` — code-drawn pastel cel-shaded scenes; Seedance clips in `assets/video/<name>.mp4` replace them automatically (see `Seedance素材命令.md`; layout references in `project/layout_refs/`). When clips arrive: re-measure `GEO`, skip the code-drawn hearth flames when `hut_fire` is present, compress to 720p before committing.
- `audio.js` — synthesized sounds (wind, fire, candle, foxfire, stream, waterfall, drips, bats, door rumble…) + Kohaku's voice playback.
- `lines.js` — Kohaku's lines (ja / en / TTS reading). `scripts/voice.py` → `media/voice/<id>.m4a` + `media/voice.js` (needs VOICEVOX).
- Voice: **VOICEVOX:猫使ビィ ノーマル** (user's pick, default parameters). Auditions: `audio/audition/` (local only).
