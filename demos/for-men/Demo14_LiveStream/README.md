# Live-stream demos — Demo 14 / 17 / 18 / 19 (one streamer each)

| Demo | Page | Title |
|---|---|---|
| 14 | `demos/for-men/Demo14_LiveStream/` | ミントの、ささやき配信 · Mint's Whisper Stream |
| 17 | `demos/for-men/Demo17_CocoaStream/` | ココアの、ほっこりカフェ配信 · Cocoa's Cozy Café Stream |
| 18 | `demos/for-men/Demo18_HinataStream/` | ひなたの、激辛チャレンジ配信 · Hinata's Super-Spicy Challenge |
| 19 | `demos/for-men/Demo19_LunaStream/` | ルナの、よふかし配信 · Luna's Late-Night Stream |

You are a viewer in the streamer's live room: chat comments and Super Chats, she answers you. Her binaural mic is your head,
so her voice, whispers and triggers come from her side.

**Thermal (firmware `DUAL`, cool and heat independent on each ear; user 2026-11-08: rich but plausible)** — two layers:
- *voice* (a voice is always warm, user 2026-11-08): her loudness (0.1 + 0.8 × envelope) warms the ear she is at — full at the ear, ×0.6 within 30 cm, a mild ×0.28 from her desk;
- *ambient*: only real warm / cold things next to the binaural mic (mug and steam, cold bottle, ice, towel, blanket, heater,
  night wind gusting with the wind sound, desk fan, blown breath). Nothing for what only she feels (spicy food, a topping she tastes).
Both layers can hit the same ear at once (Mint's menthol whisper, Cocoa's fu-fu next to the steaming mug). `STREAM.both()` counts those frames.
This folder holds the shared code, art and voices; Demo 17/18/19 hold only `index.html` + `media/cover.jpg` and use
`<base href="./">`; `<body data-ch="…">` picks the streamer. All four pages come from `scripts/make_pages.py`
(edit there, not in the pages). The stream-end screen links to the next streamer (Mint → Cocoa → Hinata → Luna → Mint).
Art style = Demo 12's soft-cel pick. Covers: `?cover=1` → `media/cover.jpg` (headless Chrome 1920×1080).

## Channels (final)

| Channel | Feel | Voice (until 2026-11-08 VOICEVOX; now ElevenLabs, see below) | Story · thermal |
|---|---|---|---|
| 白深ミント Mint | calm, sleepy, ASMR whisper | 四国めたん ささやき / ヒソヒソ | dummy head "みみくん": ear blowing with mint lip balm on the ear you pick (cool), ice Super Chat (cool, moves L→R), warm towel on both ears, a secret in each ear |
| 甘音ココア Cocoa | sweet café chat | ユーレイちゃん 甘々 / ささやき | hot cocoa (warm), fu-fu blowing (cool right), "aah" (warm), topping Super Chat (marshmallow warm / ice cream cool), rain → shared blanket, her hands on your right ear (warm) |
| 火野ひなた Hinata | genki gamer | 春日部つむぎ | spicy ramen challenge (warm, both ears), rescue Super Chat (milk = cool front / desk fan = cool left), paper-fan flaps L/R (cool), a secret at the right ear |
| 宵月ルナ Luna | cool, mature, late night | 九州そら あまあま / ささやき (round 3 "n5": pitch −0.07, intonation 1.20, formant ×0.96) | night wind from the open window (cool left), music box or hot tea request (warm), she sits on your left (warm), a confession before dawn |

Voices now (2026-11-08, user picks): ElevenLabs mint r1_a / cocoa r1_a / hinata_s r1_b / luna r1_b (`tools/eleven/cast.json`), audio tags per line in `scripts/voice.py`. No voice is shared. Lines: `lines.js` (ja + en); voices: `scripts/voice.py` → `media/voice/` (only changed lines are re-synthesized).

## Files

- `index.html`, `stream.css` (+ Demo 10's `demo.css` by path), `stream.js` (stories, chat, Super Chats, thermal, face animation), `audio.js` (HRTF + synthesized triggers), `lines.js`.
- `?embed=1` site menu · `?cover=1` poster (`media/cover.jpg`) · `?auto=1` auto-picks every choice (testing). Without `data-ch` the page would show the 4-channel lobby (not used any more). `window.STREAM.conflicts()` = same-ear conflict frames (0 in every channel).
- Face animation: `scripts/prepare_art.py` blends only the eyes (blink / half) or only the mouth (talk / talk_s) of each extra frame into its base, using the eye and mouth boxes in `FACES`, so colour and hair never jump. Blush is a soft overlay drawn in `stream.js` (`CHEEKS`).

## Art (Seedance, gpt-image-2, 16:9 2K)

Prompts: `scripts/seedance.py` (`SCENES`). Raw PNGs in `assets/art/` stay out of git; `media/art/*.webp` are the game frames.
- API: `python3 scripts/seedance.py scenes <names>`. The upload endpoint has a request-count limit (≈10 h reset) and accepts ≤5 files per request; external image URLs are refused.
- Website (used on 2026-11-08 when the API upload was limited): prompts in `project/web_jobs.json`; on seedance2-5.com Image-to-Image upload the refs from `assets/art/web/`, paste the prompt, 16:9 + 2K, generate, Download; `scripts/web_take.py <name>` / `web_take_many.py <names…>` move the downloads into `assets/art/`. Then `python3 scripts/prepare_art.py`.

Large media (`assets/art/`, `audio/`) stay out of git.
