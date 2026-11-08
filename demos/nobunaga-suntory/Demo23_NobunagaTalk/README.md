# 信長と、語らう — Talk with Nobunaga (+ Demo41 家康と、語らう · Demo42 信長と家康の、座談会)

**Three demos, one engine** (user, 2026-11-08: "only Nobunaga / only Ieyasu / a round-table, as three separate demos"):

| Demo | Title | Cast | Public page (GitHub Pages, in the menu) | Private live page (server.py) |
|---|---|---|---|---|
| 23 | 信長と、語らう · Talk with Nobunaga | `N` | `demos/nobunaga-suntory/Demo23_NobunagaTalk/` | `/live` → `live/index.html` |
| 41 | 家康と、語らう · Talk with Ieyasu | `I` | `demos/nobunaga-suntory/Demo41_IeyasuTalk/` | `/live/ieyasu` → `live/ieyasu.html` |
| 42 | 信長と家康の、座談会 · Round Table with Nobunaga & Ieyasu | `NI` | `demos/nobunaga-suntory/Demo42_SengokuRoundtable/` | `/live/roundtable` → `live/roundtable.html` |

- Everything lives in THIS folder. Demo41 / Demo42 hold only an `index.html` with `<base href="../Demo23_NobunagaTalk/">` (engine,
  script, voices, l10n by path — nothing copied). The cast is fixed per page by `<body data-cast="N|I|NI">` (main.js reads it); the
  cover only picks the place.
- **All six pages are generated** by `node scripts/pages.js` from the templates `index.html` (public) and `live/index.html` (live) —
  change the layout there, run it, never hand-edit Demo41 / Demo42 / live/ieyasu.html / live/roundtable.html. Titles / cover lines per
  cast are in its `PAGES` table; new cover texts need ja / en / zh in `l10n.js`.

Two versions of each (user, 2026-11-08: a free placeholder on the site, the real live talk private):

| | Public scripted preview | Private live talk |
|---|---|---|
| Page | `index.html` + `lines.js` (script) + `scripted.js` (brain) | `live/*.html` (`<base href="../">`) + `live/live.js` (brain) |
| Lines | fixed scripts: 5 places × the page's cast, about 2 min each | written live by an ElevenLabs agent (Claude), same 5 places |
| Voices | pre-rendered once: `media/voice/*.m4a` (`scripts/voice.py`) | ElevenLabs TTS per line through `server.py` |
| Cost per play | 0 | ≈ 600–700 ElevenLabs credits (round-table) |

Shared engine (all pages): `main.js` (pictures, positions — they walk around you —, HRTF voices, DUAL thermal, radar, device,
your turn by speech recognition or typing), `scenes.js`, `audio.js`, `style.css`, `l10n.js`. Art: Demo 5 / 9 by path.

## Cover (all pages, same UI)
- Pick the **place** (5 short buttons: 🌇 天守 Gifu keep at sunset · 🍵 茶室 tea room · 🍶 先斗町 Kyoto izakaya · 🥃 山崎 Yamazaki
  distillery · 🌕 安土 Azuchi banquet); remembered in localStorage (`moheat.talk.scene`). Who you talk with = the page (above).
  The warm / cool chips on the cover and the Thermal output note follow the place (`scenes.js` `chips` / `note`). Language = the
  shared 🌐 / cover language row (EN / 日本語 / 中文); speech recognition uses the same language (no separate "you speak" picker).
- Phone / small player (≤ 620 px): title, the place row, then Start, all ≥ 44 px; ≤ 940 px drops the small print.

## Public scripted preview (no server, no keys)
- `lines.js` `scenes.<place>`: one duo script per place; each solo plays that character's duo lines plus a few solo-only lines
  (`"in": ["N"]` / `["I"]`; duo-only lines `["NI"]`). Topics come from the place (sunset view, Gifu's name, the Tenka Fubu seal,
  konpeito, cormorant fires · tea caddies, tea · yakitori, snow on the Kamo, Honnoji, highball vs warm sake · casks, Rikyu's Taian,
  the stills, an iced glass · gold screens, the moon, the ship across the sea, a wish).
- Thermal per place (DUAL): voices warm the ear they speak at; place events show off fast hot ↔ cold, direction and cool + warm on one
  ear at once: Gifu — mountain gust from the right, a fan at the left ear while a whisper warms it; Kyoto — warm sake in front, window
  opened on the snow (right cold) while Ieyasu whispers left, door gust from behind; Yamazaki — stills' heat from the left + misty gust
  from the front, an iced glass at the right ear during a whisper; Azuchi — a brazier to the right, then the night wind from the front.
- After every beat it is your turn: say anything (speech recognition in the display language EN / 日本語 / 中文) or type, or stay
  silent (9 s). A short **bridge line** acknowledges it — chosen by a light keyword layer (`lines.js` `topics`: yes / no on yes-no
  questions, then the place's own topics — view / sweets, food / snow, whisky / mist, moon / sea & dreams —, then tea, sake, the
  realm, warm / cold, the future, praise, leaving; a place can replace a shared pool, e.g. "sake" while they are drinking) or a generic / silence one, never twice — spoken by
  whoever opens the next beat, and the script goes on. "■ End" → a leaving bridge + the farewell.
- Script draft with positions, thermal notes, which cast plays each line, and the bridges: `project/script_scripted.md`
  (regenerate: `python3 scripts/script_md.py`). Edit `lines.js`, then `python3 scripts/voice.py --count` and
  `python3 scripts/voice.py [--max-chars=N]` (only changed lines are rendered; cache `audio/voice_cache.json`; refuses below the
  `limits.json` month reserve or above `--max-chars`).
- Renders 2026-11-08: tea room 52 lines / 1,495 characters; 5 places × 3 casts +178 lines / 5,580 characters sent (ElevenLabs
  billed 2,305 credits). 229 voice files in total.
- Cover says "台本プレビュー · Preview · scripted".

## Private live talk
- **Local**: double-click `start_demo.command` (or `python3 server.py`) → Chrome opens `http://localhost:8771/live` → log in.
  Nobunaga `/live` · Ieyasu `/live/ieyasu` · round-table `/live/roundtable` (same password, same `limits.json`).
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
- **Dry run (no cost)**: `node scripts/prompt_dry.js <place> <NI|N|I>` prints the prompt and first message the page would send; `--all` checks every place × cast and the cast of each live entry page.
- **Brain**: a text-only ElevenLabs agent (`agent.json`, LLM claude-sonnet-5-5, created by `scripts/setup_agent.py`). The real prompt is built per session in `scenes.js` (place, cast, rules) and sent as an override. Output lines: `N|position|[tag] せりふ|English`, `@|gust` / `@|fire` for events, `#END` to finish.
- **Ears**: the browser's speech recognition (日本語 / English / 中文); a turn ends after ~1.2 s of quiet. 14 s of silence → they nudge you (twice at most).
- **Voices**: each line goes to `server.py` → ElevenLabs TTS (`eleven_v4`, confirmed voices nobunaga r1_a / ieyasu r1_a) as soon as it is parsed → played on the speaker's own HRTF panner.
- **Positions**: seat / near / left_ear / right_ear / left / right / window / behind (scenes.js `POS`); the voice glides with him, footsteps when he gets up, the picture switches bust ↔ ear close-up ↔ standing ↔ far at the window (Demo 9 art by path).
- **Thermal (DUAL)**: voice loudness warms the ear he speaks at (×1 at the ear, ×0.6 within 60 cm, ×0.3 at the seat, ×0.1 at the window, his breath 0.15 when silent at your ear) + the place's real warm / cool (`amb` per scene) + gusts / fire for 5 s.
- **Time**: 2:00 (`limits.json` `session_seconds`) after his first line → the next turn is a farewell; hard stop at +75 s; "■ End" lets you leave early (they say goodbye).

### Limits (`limits.json`, enforced by server.py; usage in `local/usage.json`, not in git)
20 talks/day, 1,500 voice chars per talk, 15,000 chars/day, and nothing starts when the month has < 10,000 left.
The Creator account cannot go over its plan anyway (no overage). Agent: 1 concurrent call, 30/day, 200 s max.
Measured: one full 2-minute three-way talk ≈ 600–700 credits. The three live pages share these limits (one budget).
