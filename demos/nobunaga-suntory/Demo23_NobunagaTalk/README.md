# 信長と、語らう — Talk with Nobunaga (live AI, local only)

A live, unscripted voice conversation with 織田信長, 徳川家康, or both (three of you), about two minutes, in one of five places.
They open the talk with a topic from the place, wait for you after every turn, walk around you while they talk, and close it themselves.

## Run (local only — the server holds the ElevenLabs key)
- Double-click `start_demo.command` (or `python3 server.py`) → http://localhost:8771/demos/nobunaga-suntory/Demo23_NobunagaTalk/
- Chrome, headphones, microphone (or type in the box). Connect MoHeat Evo top right.
- Not in nav.js / the site: GitHub Pages has no server, the page says "local only" there.

## How it works
- **Brain**: a text-only ElevenLabs agent (`agent.json`, LLM claude-sonnet-5-5, created by `scripts/setup_agent.py`). The real prompt is built per session in `scenes.js` (place, cast, rules) and sent as an override. Output lines: `N|position|[tag] せりふ|English`, `@|gust` / `@|fire` for events, `#END` to finish.
- **Ears**: the browser's speech recognition (日本語 / English / 中文); a turn ends after ~1.2 s of quiet. 14 s of silence → they nudge you (twice at most).
- **Voices**: each line goes to `server.py` → ElevenLabs TTS (`eleven_v4`, confirmed voices nobunaga r1_a / ieyasu r1_a) as soon as it is parsed → played on the speaker's own HRTF panner.
- **Positions**: seat / near / left_ear / right_ear / left / right / window / behind (scenes.js `POS`); the voice glides with him, footsteps when he gets up, the picture switches bust ↔ ear close-up ↔ standing ↔ far at the window (Demo 9 art by path).
- **Thermal (DUAL)**: voice loudness warms the ear he speaks at (×1 at the ear, ×0.6 within 60 cm, ×0.3 at the seat, ×0.1 at the window, his breath 0.15 when silent at your ear) + the place's real warm / cool (`amb` per scene) + gusts / fire for 5 s.
- **Time**: 2:00 (`limits.json` `session_seconds`) after his first line → the next turn is a farewell; hard stop at +75 s; "■ End" lets you leave early (they say goodbye).

## Limits (`limits.json`, enforced by server.py; usage in `local/usage.json`, not in git)
20 talks/day, 1,500 voice chars per talk, 15,000 chars/day, and nothing starts when the month has < 10,000 left.
The Creator account cannot go over its plan anyway (no overage). Agent: 1 concurrent call, 30/day, 200 s max.
Measured: one full 2-minute three-way talk ≈ 600–700 credits.
