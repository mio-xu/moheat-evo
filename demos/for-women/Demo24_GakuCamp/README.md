# Demo24 · ガクの、焚き火キャンプ配信 · Gaku's Campfire Stream

The for-women live-stream room: a male streamer. Same stream UI as the for-men rooms (Demo 14 / 17–19: chat, Super Chats, viewer count),
art in the for-women idol style (No. 3 soft cel).

**Gaku (月嶋ガク), 26** — an original character: a strikingly handsome solo winter-camping streamer, cool and quiet (kuudere), with no idea
how good-looking he is (the chat keeps praising his face, he keeps telling them to watch the fire). Black hair with a hidden deep-green
inner colour, a black shearling-collar aviator jacket, a silver chain (user's pick: look C, `project/designs_contact.jpg`).
Voice: ElevenLabs `gaku r2_a` (user's pick, `tools/eleven/cast.json`).

## Story (≈ 2:15, five steps)

His binaural mic sits on a camp chair by the fire = your head. Fire on your **right**, the lake wind from your **left**.

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

## Files

- `index.html`, `camp.css` (on top of Demo 14's `stream.css` and Demo 10's `demo.css`, both by path), `game.js`, `audio.js` (Demo 14's audio.js + campfire, lake wind, snow steps, log, foil), `lines.js`.
- `scripts/voice.py` → `media/voice/*.m4a` (ElevenLabs, tags per line); `scripts/seedance.py` (prompts: `designs`, `scenes`; also in `project/web_prompts.json` for the website); `scripts/prepare_art.sh` → `media/art/*.jpg`.
- Art: 8 stills, Seedance website (GPT Image 2, 16:9 2K, image 1 = `assets/art/ref_gaku.jpg`), 2026-11-08 — the API upload was rate-limited. Raw PNGs in `assets/` stay out of git.
- `?embed=1` site menu · `?cover=1` poster (`media/cover.jpg`, headless Chrome 1920×1080) · `?auto=1` auto-picks the first option, `?auto=1&alt=1` the last (testing).

## Status

Stills version done and auto-tested (both branches, 0 errors). Next (user's call): feedback, then Seedance animation (handoff §4b) as the last step.
