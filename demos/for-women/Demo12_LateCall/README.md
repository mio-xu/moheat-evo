# もしもし、きこえる？ · Can You Hear Me?

An interactive late-night phone call with **Ren (蓮)**, an original character: the 24-year-old lead vocalist of an idol group.
No timeline, no MP4: his voice lines are ElevenLabs files played live through a phone filter at one ear (or "for real" in the room at the end);
room sounds are synthesized live with HRTF; the thermal output is computed live from the same directions.

**Play**: `python3 -m http.server 8765` at the repo root → `http://localhost:8765/demos/for-women/Demo12_LateCall/` (or `start_demo.command`). Headphones on; mic optional.

| Moment | Thermal |
|---|---|
| Phone at your left ear (band-limited voice right at the ear) | left warm, a bit more when he talks / whispers |
| Open the window to the same snow he sees (window on the right) | right cool, left still warm |
| Switch the phone to your other ear | voice and warmth move to the right |
| Doorbell (on the phone and in your hallway), open the door | cold rush, both ears |
| He is at your door; hold him; "…会いたかった" at your left ear (his face is on the left of the hug picture) | both warm, left warmest |

Files: `index.html`, `call.css` (+ Demo 10's `demo.css` by path), `game.js` (story runner, choices / mic / actions, thermal, device), `audio.js` (phone path, HRTF, synthesized sounds),
`lines.js` (ja / en / style / reading). Voice: `scripts/voice.py` — ElevenLabs, the user's pick `ren r1_c` (tools/eleven/cast.json; earlier VOICEVOX:青山龍星), audio tags per line ([whispers] at the ear).
Art: `scripts/seedance.py scenes` (Seedance GPT Image 2, style 3 soft cel; raw PNGs in `assets/art/`, not in git) → `scripts/prepare_art.py` → `media/art/*.webp`.
Animation (redone 2026-11-08, DEMO_DESIGN_GUIDE §6): 11 Seedance 2.5 Lite 1080p 4 s clips, first & last frame = the stills (`assets/frames/`, prompts in
`project/web_video_prompts.json`; raw in `assets/video/`, not in git) → `scripts/prepare_video.py` → `media/video/*.mp4`: talk / quiet loops per view,
`t_room_open`, `t_room_close`, `t_door_hug` for the cuts in the same place; a change of place (your room ↔ his street ↔ your door) cross-fades.
