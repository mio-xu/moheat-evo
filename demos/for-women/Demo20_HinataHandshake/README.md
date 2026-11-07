# あと10秒だけ、ね？ · Just Ten More Seconds?

An interactive handshake event with **Hinata (陽向)**, an original character: 19, the sweet younger member of an idol group,
sweet in public and a little dark and teasing at your ear (年下・腹黒). Design = the user's pick (pink hair, amber eyes, small fang,
star stud earring, cream cable-knit cardigan), from `../Demo16_HandshakeEvent/assets/art/hinata_pink_sheet.png`.

**Play**: `python3 -m http.server 8765` at the repo root → `http://localhost:8765/demos/for-women/Demo20_HinataHandshake/` (or `start_demo.command`). Headphones on; mic optional.

| Moment | Thermal (DUAL: cool and heat independent per ear) |
|---|---|
| Queue in a winter hall, the automatic doors on your right open | right cool (draft + gust) |
| Across the table, he greets you | both ears warm a little with his voice |
| You take his hand; he blows on your cold hands ("はぁー"), face close to yours | both warm (a breath swell; his voice close in front) |
| He leans to your **left** ear: "you were in another member's line…" | left warm, following his voice |
| Staff calls time; he does not let go (the timer runs into overtime) | his voice close in front: both mildly warm |
| He leans to your **right** ear for a promise; someone comes in through the doors | right **warm (voice) + cool (gust) at once** |
| You say "約束する" (mic or button), he waves goodbye | warmth fades |

Files: `index.html` (+ Demo 10's `demo.css` and Demo 12's `call.css` by path, then `hs.css`), `game.js` (story, choices / mic / actions, thermal layers, device),
`audio.js` (HRTF voices, synthesized hall: crowd, stage music, entrance draft, door, breath, timer), `lines.js` (ja / en / style / reading).

Voice: `scripts/voice.py` — Hinata **VOICEVOX:暁記ミタマ**, the user's pick "m1" (2026-11-08, audition rounds 3–9 in Demo16_HandshakeEvent):
base pitch −0.03, formant ×0.95, pauses ×1.4, close-mic EQ; s sweet = ノーマル (+0.02, ×1.25, ×1.04), t tease = ノーマル (0, ×1.15, ×0.96, breath 0.2),
d dark at the ear = ささやき (−0.04, ×0.95, ×0.85, breath 0.5). Staff **VOICEVOX:春日部つむぎ**.

Art: `scripts/seedance.py` (Seedance GPT Image 2, 2K 16:9). The upload API was rate-limited, so `hina_booth` is text-to-image and every other picture
uses its generation URL as the reference (outputs: the new picture is the last one). Raw PNGs in `assets/art/` (not in git) →
`scripts/prepare_art.py` (patch positions in `project/patches.json`) → `media/art/*.webp`. The right-ear lean is the left one mirrored.

Animation: 8 Seedance 2.5 Lite clips (720p, first + last frame = the stills above), made on the seedance2-5.com web page (Image to Video →
First & Last Frame) except `v_take_hand` (API). Loops (first = last = one still): `v_booth_talk`, `v_hands_talk`, `v_hands_idle`, `v_hands_breath`,
`v_lean_whisper` (mirrored for the right ear), `v_wave`; transitions played once: `v_take_hand` (booth → hands), `v_lean_in` (hands → left ear).
Raw downloads in `assets/video/` (not in git) → `scripts/prepare_video.py` → `media/video/*.mp4` (1280×720; loops rebuilt so the loop point is
seamless: the model's last frame drifts a little in tone). `?stills` = the old stills + mouth patches.
