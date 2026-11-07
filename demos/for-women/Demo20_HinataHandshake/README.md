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

Files: `index.html` (+ Demo 10's `demo.css` and Demo 12's `call.css` by path, then `style.css`), `main.js` (story, choices / mic / actions, thermal layers, device),
`audio.js` (HRTF voices, synthesized hall: crowd, stage music, entrance draft, door, breath, timer), `lines.js` (ja / en / style / reading).

Voice: `scripts/voice.py` — Hinata = **ElevenLabs** voice "v2" (the user's pick 2026-11-08 from `scripts/eleven_audition.py`, a Voice Design
young male idol; earlier VOICEVOX:暁記ミタマ "m1"), `eleven_v4`, Japanese, delivery from audio tags per line (`[whispers]` at the ear, `[playful]`,
`[giggles]` …). Key = `ELEVENLABS_API_KEY` in the repo's `.env.local` (gitignored; set up with `npx -y @elevenlabs/cli@latest onboard init`).
Staff = ElevenLabs `staff_f` (user pick r1_a; earlier VOICEVOX:春日部つむぎ).

Art: `scripts/seedance.py` (Seedance GPT Image 2, 2K 16:9). The upload API was rate-limited, so `hina_booth` is text-to-image and every other picture
uses its generation URL as the reference (outputs: the new picture is the last one). Raw PNGs in `assets/art/` (not in git) →
`scripts/prepare_art.py` (patch positions in `project/patches.json`) → `media/art/*.webp`. The right-ear lean is the left one mirrored.

Animation (v2, 2026-11-08, handoff §4b): 11 Seedance 2.5 Lite **1080p** clips, First & Last Frame = the stills (web page; prompts and frames in
`project/web_video_prompts.json`). Loops: `v_booth_talk`, `v_hands_talk`, `v_hands_idle` (only while he waits for your answer), `v_lean_whisper`
(mirrored for the right ear), `v_wave`. One-shots, each from one still to the next: `v_take_hand` (booth→hands), `v_hands_breath`, `v_lean_in`
(→left ear), `v_lean_back` (→hands), `v_lean_in_r` (→right ear, last frame = the mirrored lean still), `v_leave` (→wave).
`scripts/prepare_video.py`: per clip, position + colour drift corrected and the first / last frames blended onto the stills (exact), 1920×1080.
`main.js` switches clips only at a clip's end (identical frames → hard cut); `go(clip, view)` queues a transition for the next end.
Raw downloads in `assets/video/` (not in git). `?stills` = stills + mouth patches.
