# 信長と、語らう — Talk with Nobunaga

Two versions in one folder (user, 2026-11-08: a free placeholder on the site, the real live talk private):

| | Public scripted preview | Private live talk |
|---|---|---|
| URL | `demos/nobunaga-suntory/Demo23_NobunagaTalk/` (GitHub Pages, in the menu) | `http://localhost:8771/live` (only via `server.py`, password) |
| Page | `index.html` + `lines.js` (script) + `scripted.js` (brain) | `live/index.html` (`<base href="../">`) + `live/live.js` (brain) |
| Lines | fixed script, tea room by the hearth, Nobunaga + Ieyasu, about 2 min | written live by an ElevenLabs agent (Claude), any cast / place |
| Voices | pre-rendered once: `media/voice/*.m4a` (`scripts/voice.py`) | ElevenLabs TTS per line through `server.py` |
| Cost per play | 0 | ≈ 600–700 ElevenLabs credits |

Shared engine (both pages): `main.js` (pictures, positions — they walk around you —, HRTF voices, DUAL thermal, radar, device,
your turn by speech recognition or typing), `scenes.js`, `audio.js`, `style.css`, `l10n.js`. Art: Demo 5 / 9 by path.

## Public scripted preview (no server, no keys)
- After every beat it is your turn: say anything (speech recognition in the display language EN / 日本語 / 中文) or type, or stay
  silent (9 s). A short **bridge line** acknowledges it — chosen by a light keyword layer (`lines.js` `topics`: yes / no on yes-no
  questions, tea, sake, the realm, warm / cold, the future, praise, leaving) or a generic / silence one, never twice — spoken by
  whoever opens the next beat, and the script goes on. "■ End" → a leaving bridge + the farewell.
- Script draft with positions, thermal notes and the bridge pool: `project/script_scripted.md`. Edit `lines.js`, then
  `python3 scripts/voice.py --count` and `python3 scripts/voice.py` (only changed lines are rendered; cache `audio/voice_cache.json`).
- First render 2026-11-08: 52 lines, 1,495 characters.
- Cover says "台本プレビュー · Preview · scripted".

## Private live talk
- **Local**: double-click `start_demo.command` (or `python3 server.py`) → Chrome opens `http://localhost:8771/live` → log in.
- **Password**: `~/.moheat_live_pass` (outside git). Created with a random password on the first start and printed once in the
  terminal; later `cat ~/.moheat_live_pass`. Delete the file to get a new password (logs every browser out).
- **From a phone**: `brew install cloudflared` once, then double-click `start_remote.command` (= `./start_demo.command --remote`).
  It prints a `https://….trycloudflare.com/live` address (new every time); open it on the phone and log in. Closing the terminal
  window stops server and tunnel.
- **Security**: server bound to 127.0.0.1; every page and `/api/*` needs the session cookie (14 days, HttpOnly, SameSite=Strict,
  HMAC of the password) — without it pages go to the login form and the API answers 401; 8 wrong passwords in 15 min block logins
  for 15 min; dot files (`.env.local`, `.git`), `local/`, `*.py`, `*.command`, `*.log` are never served; no directory listings.
  The static files in git hold no key or secret; on GitHub Pages `live/` only says "Private page — open it through server.py".

### How the live brain works
- **Brain**: a text-only ElevenLabs agent (`agent.json`, LLM claude-sonnet-5-5, created by `scripts/setup_agent.py`). The real prompt is built per session in `scenes.js` (place, cast, rules) and sent as an override. Output lines: `N|position|[tag] せりふ|English`, `@|gust` / `@|fire` for events, `#END` to finish.
- **Ears**: the browser's speech recognition (日本語 / English / 中文); a turn ends after ~1.2 s of quiet. 14 s of silence → they nudge you (twice at most).
- **Voices**: each line goes to `server.py` → ElevenLabs TTS (`eleven_v4`, confirmed voices nobunaga r1_a / ieyasu r1_a) as soon as it is parsed → played on the speaker's own HRTF panner.
- **Positions**: seat / near / left_ear / right_ear / left / right / window / behind (scenes.js `POS`); the voice glides with him, footsteps when he gets up, the picture switches bust ↔ ear close-up ↔ standing ↔ far at the window (Demo 9 art by path).
- **Thermal (DUAL)**: voice loudness warms the ear he speaks at (×1 at the ear, ×0.6 within 60 cm, ×0.3 at the seat, ×0.1 at the window, his breath 0.15 when silent at your ear) + the place's real warm / cool (`amb` per scene) + gusts / fire for 5 s.
- **Time**: 2:00 (`limits.json` `session_seconds`) after his first line → the next turn is a farewell; hard stop at +75 s; "■ End" lets you leave early (they say goodbye).

### Limits (`limits.json`, enforced by server.py; usage in `local/usage.json`, not in git)
20 talks/day, 1,500 voice chars per talk, 15,000 chars/day, and nothing starts when the month has < 10,000 left.
The Creator account cannot go over its plan anyway (no overage). Agent: 1 concurrent call, 30/day, 200 s max.
Measured: one full 2-minute three-way talk ≈ 600–700 credits.
