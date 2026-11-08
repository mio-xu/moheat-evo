# Demo24 · ガクの、焚き火キャンプ配信 · Gaku's Campfire Stream

The for-women live-stream room: a male streamer. Same stream UI as the for-men rooms (Demo 14 / 17–19: chat, Super Chats, viewer count),
art in the for-women idol style (No. 3 soft cel).

**Gaku (月嶋ガク), 26** — an original character: a strikingly handsome solo winter-camping streamer, cool and quiet (kuudere), with no idea
how good-looking he is (the chat keeps praising his face, he keeps telling them to watch the fire). Black hair with a hidden deep-green
inner colour, a black shearling-collar aviator jacket, a silver chain (user's pick: look C, `project/designs_contact.jpg`).
Voice: ElevenLabs `gaku r2_a` (user's pick, `tools/eleven/cast.json`).

## Story (≈ 2:15, five steps)

His phone streams from a tripod at his eye level, a binaural mic clipped under it = your head (v2 stills, user 2026-11-08: the first, low camera made him look down oddly; the phone rig stays out of the picture — you are the lens). Fire on your **right**, the lake wind from your **left**.

1. **あいさつ** — he notices the stream is live; you say hi (choice).
2. **焚き火** — he adds a log (right ear warmer, crackle), asks if you're cold (choice); the wind picks up.
3. **風よけ** (signature) — he sits down on your **left** to be your windbreak: the left ear's cold fades and his voice warms it; a whisper at the left ear (choice).
4. **差し入れ** — Super Chat: hot coffee (steam in front) or a roasted sweet potato (opened in front-right).
5. **雪の夜** — snow (both ears lightly cool); he puts his blanket over the mic (both warm, wind gone); right-ear whisper, hold "I'm still here", the last line; he takes the blanket back and says good night.

## Thermal (firmware DUAL)

| Source | Ear | | Why |
|---|---|---|---|
| his voice | the ear he is at | warm | 0.1 + 0.8 × loudness × distance (ear 1, ≤ 30 cm 0.6, by the fire 0.28; front halved) |
| campfire | right | warm 0.32 (fresh log 0.62 → burns down; later 0.2 / 0.14) | the fire ~1 m right of the mic |
| lake wind | left | cool 0.4–0.55 × gust (0.17 Hz, same LFO as the wind sound) | blocked 85 % by his body, 90 % by the blanket |
| his body beside you | left | warm 0.2 | he sits right next to the mic |
| coffee steam / sweet potato | front / front-right | warm 0.35 / 0.4 | held right in front of the mic |
| snow | both | cool 0.12 | snow on the mic (not under the blanket) |
| blanket | both | warm 0.4 | his blanket over the mic |

Nothing for being shy or praised. `STREAM.both()` counts frames with cool + warm on the same ear; `STREAM.log()` lists every command sent.

## Picture: layers (2026-11-08, the standard way — DEMO_DESIGN_GUIDE §6 标准制作流程)

Redone from Gaku's design (look C) as layers instead of video (user: "重做版直接接管原版"; the first version — 8 scene stills + 3 of 18
Seedance clips — is backed up outside the repo: `~/Desktop/MoHeat Evo 备份/for-women/Demo24_GakuCamp_20261108-1217/`). ≈ 425 Seedance credits, no video.

| Layer | Art | Moves by |
|---|---|---|
| background | one empty campsite plate (`bg_camp`) | parallax (mouse / tilt + slow sway), heat shimmer + flicker over the fire; zoomed / panned per view so its fire lands where `main.js` draws sparks |
| Gaku | 8 poses on a plain grey background: `gaku_ref` (sit) and four same-face edits of it (coffee, sweet potato, blanket, wave), plus `gaku_log`, `gaku_left` (close-up), `gaku_whisper` (event CG) | breathing, a small bob while talking, warm rim light facing the fire (code) |
| face | Seedance edits of each pose: mouth slightly open, eyes closed (his fringe stays over his eye) → feathered patches | the mouth fades with the voice loudness, ~0.13 s blinks; same-face poses share `gaku_ref`'s patches |
| effects | — | `main.js`'s canvas code: sparks, snow, steam, wind / blanket washes |

## Files

- `index.html` (+ `../../for-men/Demo14_MintStream/style.css` and `../../shared/game.css` by path), `style.css`, `main.js` (story, chat, thermal),
  `audio.js`, `lines.js`, `l10n.js` — unchanged by the layered picture. `media/layers.js` + `../../shared/layers.js` (loaded before `main.js`)
  draw the live composite wherever `main.js` draws a still (`media/art/gaku_<view>.jpg`, now the flat fallbacks); `?flat` = those stills.
- Art build (Pillow + numpy, ~1 min): `python3 tools/art/build_stage.py demos/for-women/Demo24_GakuCamp --preview` from `project/stage.json`
  (poses, near-hints, `erase` = the fire drawn in `gaku_log`, `keep` = the coffee steam, placements) → `media/art/` + `media/layers.js`.
- Prompts: `scripts/seedance_layers.py` (imports the first version's `scripts/seedance.py` for the look; `prompts` → `project/web_prompts.json`),
  layer plan `project/layers.md`. Raw PNGs in `assets/art/` (not in git). Voices: `scripts/voice.py` (ElevenLabs `gaku r2_a`).
- `?embed=1` site menu · `?cover=1` poster (`media/cover.jpg`, headless Chrome) · `?auto=1` / `?auto=1&alt=1` auto-pick the first / last option.

## Status

Layered version tested in Chrome (both branches, 0 errors, no 404s, EN / 日本語 / 中文, one screen). In the menu under this folder.
Video: none; dynamic CGs only if the user asks after playing (sitting down beside you, the blanket over the mic — 64 each).
