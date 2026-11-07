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

Voice: `scripts/voice.py` — Hinata **VOICEVOX:白上虎太郎 ふつう** (the user's pick from the Demo16_HandshakeEvent audition), variant v4 "ギャップ強め"
(base intonation ×1.15) with per-line styles: s sweet (+0.03, ×1.25, ×1.03), t tease (0, ×1.10, ×0.95), d dark at the ear (−0.05, ×0.85, ×0.88).
Staff **VOICEVOX:春日部つむぎ**.

Art: `scripts/seedance.py` (Seedance GPT Image 2, 2K 16:9). The upload API was rate-limited, so `hina_booth` is text-to-image and every other picture
uses its generation URL as the reference (outputs: the new picture is the last one). Raw PNGs in `assets/art/` (not in git) →
`scripts/prepare_art.py` (patch positions in `project/patches.json`) → `media/art/*.webp`. The right-ear lean is the left one mirrored.
