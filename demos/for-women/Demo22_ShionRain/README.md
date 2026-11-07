# 雨が止むまで · Until the Rain Stops

An interactive scene with **Shion (紫苑)**, an original character: the soft-spoken, elegant and quietly dangerous keyboardist of the
idol group (long platinum hair in a low ponytail, beauty mark, open white silk shirt, glasses sometimes). Third of the male idols
(Demo20 Hinata, Demo21 Jin). A rainy night: you arrive at his flat soaked, he towels your hair, then dries it with a hair dryer.
No timeline: his ElevenLabs lines play live with HRTF, room sounds are synthesized, thermal (firmware **DUAL**) is computed live. About 1:45.

**Play**: `python3 -m http.server 8765` at the repo root → `http://localhost:8765/demos/for-women/Demo22_ShionRain/`. Headphones on.
`?cover` = cover only, `?autoplay`, `?embed=1` = stage only (site menu).

| Moment | Thermal |
|---|---|
| His voice (always) | warms the ear he speaks at, with its loudness: × 0.6 close, × 1 at your ear, halved straight in front |
| Rain-wet hair | both ears cool, fades with the towel and the hot air |
| Towel rubbing | both mildly warm (friction) |
| Hair dryer, hot — you aim it by dragging, then it circles behind your head to the right | heat on the side the nozzle points at |
| He says something you can't hear over the dryer, then repeats it at your left ear | left warm (voice + breath) |
| Cool air to finish, while he talks close to your right ear | cool circling both ears + right warm (DUAL) |
| He takes off his glasses, face a hand's width away | both mildly warm |

Files: `index.html`, `rain.css` (+ Demo 10's `demo.css` and `../../shared/series.css` by path), `game.js`, `audio.js` (SRAudio), `lines.js`.
Voice: `scripts/voice.py` — ElevenLabs, the user's pick `shion r1_c` (tools/eleven/cast.json), audio tags per line.
Art: Seedance web, GPT Image 2 image-to-image from the user's sheet `shion_v4_platinum.png` (prompts: `project/web_prompts.json`,
`scripts/seedance.py`; raw PNGs in `assets/art/`, not in git) → `scripts/prepare_art.sh` → `media/art/shion_*.jpg`. The right-side
dryer view is the dryer still mirrored. Stills only for now; Seedance animation is the last step (handoff §4b).
