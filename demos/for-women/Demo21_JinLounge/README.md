# 俺だけ見てろ · Look Only at Me

An interactive scene with **Jin (迅)**, an original character: the domineering, red-haired rapper of an idol group, rich-heir type.
After the concert he calls you into his VIP lounge. No timeline: his ElevenLabs lines play live with HRTF, room sounds are synthesized,
the thermal output (firmware **DUAL**: cool and heat independent per ear) is computed live. About 65 s.

**Play**: `python3 -m http.server 8765` at the repo root → `http://localhost:8765/demos/for-women/Demo21_JinLounge/`. Headphones on.
`?cover` = cover only, `?autoplay`, `?stills` = no video, `?embed=1` = stage only (site menu).

| Moment | Thermal |
|---|---|
| His voice (always) | warms the ear he speaks at, with its loudness: × 0.6 close, × 1 at your ear, halved straight in front |
| Ice-cold can pressed to your right cheek | right cool |
| He takes off his sunglasses, "目、逸らすな" — hold his gaze (press and hold) | his face up close: both mildly warm, heartbeat |
| "…今日はもう、帰さねえから" at your right ear | right warm (voice + breath) |
| He wraps you in his leather jacket | both warm (the collar) |

Files: `index.html`, `lounge.css` (+ Demo 10's `demo.css` and `../../shared/series.css` by path), `game.js`, `audio.js` (JLAudio), `lines.js`.
Voice: `scripts/voice.py` — ElevenLabs, the user's pick `jin r1_a` (tools/eleven/cast.json; earlier VOICEVOX:青山龍星 "j6"), audio tags per line.
Art: Seedance web (GPT Image 2, style 3 soft cel; raw PNGs in `assets/art/`, not in git) → `media/art/jin_*.jpg` (stills / fallback).
Animation (redone 2026-11-08 to the DEMO_DESIGN_GUIDE §6 standard): 16 Seedance 2.5 Lite 1080p 4 s clips, first & last frame = the stills
(`assets/frames/`, prompts in `project/web_video_prompts.json`; raw in `assets/video/`, not in git) → `scripts/prepare_video.py` (colour / position
drift fixed, first and last frame = the still pixel for pixel) → `media/video/*.mp4` (1920×1080, 24 fps, CRF 23).
Clips: `v_<view>` = he talks, `v_<view>_idle` = he is silent, `t_<from>_<to>` = one transition for every cut. The player switches only at a clip's end;
`go()` plays the transition, then the next view's loop. `?stills` = stills only.
