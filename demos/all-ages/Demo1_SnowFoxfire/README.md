# 雪と狐火のひそひそ話 · Whispers of Snow and Flame — MoHeat Evo ASMR demo

A 150 s first-person binaural ASMR story. 小雪 Koyuki (snow spirit) cools you and 焔 Homura (foxfire spirit) warms you. Each character's own voice drives MoHeat Evo, on whichever ear she is at.

## Run it
- **Double-click `start_demo.command`.** It starts a local server and opens Chrome. Or open `index.html` directly, or visit `https://moheat-evo.github.io/demos/all-ages/Demo1_SnowFoxfire/`.
- Headphones on → **Start**. To get thermal feedback: **+ Add** → choose the MoHeat Evo port → **Connect** (desktop Chrome/Edge, Web Serial).
- Keys: `Space` play/pause · `←/→` ±5 s · `Esc` emergency stop (press again to re-arm).
- **Intensity** scales all output. **Device lead** shifts the thermal track against the picture: + = earlier. The PWM range is the one set on `../../test.html` (shared).
- Without a browser: `python3 tools/play_thermal_csv.py --port /dev/cu.… ` plays the WAV and streams the CSV (needs `pip3 install pyserial`; `--list`, `--dry-run`, `--intensity`, `--offset`).

## Characters
- Art: `art/Character.jpg` (approved design sheet) → ChatGPT asset set in `art/chatgpt/` (37 PNGs, prompts in `generation-prompts.json`, request list in `production/04_ChatGPT素材清单.md`).
- `python3 tools/prepare_art.py` aligns each bust/ear variant to its base, composites **only the face** (found automatically from where blink/mouth frames differ), and writes WebP to `media/art/` (+ `faces.json`). Blink, lip sync and expressions therefore change the face only, with no jitter.
- The player picks frames from the voice and the story: blink → talking mouth (half/open from the voice RMS) → expression. Ear close-ups use `*_ear*` (mirrored for the right ear), and the poses follow the story beats. Live2D-style motion: breathing, talk bounce, strip-mesh sway of hair and sleeves, lean, cross-fades between poses.
- Background: `room_bg`, with live snow in the window and hearth/lantern flicker.
- Cover: `?cover=1` renders the poster. `media/cover.jpg` is the share image, the MP4's 3 s opening title card and its file thumbnail.

## Folder layout
```
index.html · demo.js · demo.css      player (opens straight from disk or GitHub Pages)
start_demo.command                   double-click: local server + Chrome
start_voicevox.command               double-click: VOICEVOX engine (needed only to regenerate voices)
build_all.sh                         rebuild audio → thermal → subtitles/data
art/        Character.jpg, chatgpt/*.png        source art (never modified)
media/      mix.m4a, thermal.csv, subs_*.vtt, data.js, cover.jpg, art/*.webp   web assets (generated)
tools/      story.py (timeline) · build_audio.py · tts_voicevox.py · thermal.py · export.py · prepare_art.py · render_mp4.py · docs.py · play_thermal_csv.py · lift_subject.swift
production/ 01 script · 02 storyboard · 03 characters · 04 ChatGPT art list
output/     mix_48k.wav, stems/, final_1080p.mp4, thermal_control.csv, subtitles (local, not committed)
```

## How the thermal control works
```
tools/story.py ── cues (lines, breaths, magic) + position key-frames (azimuth, distance)
   │
   ├─ build_audio.py → per-character dry stems (voice / breath / magic) → spherical-head HRTF render → mix_48k.wav
   │
   └─ thermal.py  (per character, 20 Hz, 50 ms RMS)
        RMS dB → noise gate (ref −30 dB) → normalise to her loud passages → x^2.2 (high contrast)
        → hold 150 ms + attack 80 ms / release 450 ms → × proximity(distance) → × ear weights(azimuth)
        → Koyuki → L/R COOL,  Homura → L/R HEAT
        → device lead (cool 0.35 s, heat 0.60 s earlier) → per-ear conflict resolution → safety → thermal.csv
```
- **Type** comes from the character, **strength** from her own stem's loudness, **left/right** from where she is. Ambience and footsteps never drive output.
- **Same-ear conflict.** The firmware allows one mode per ear: writing `LC…` clears left heat. The stronger request wins, and the weaker one subtracts 50 %. Flipping polarity needs a 0.08 margin and ≥ 0.4 s in the current mode, and every flip passes through 0.15 s of zero output. Different ears can be cool and warm at the same time; that's the scene-4 highlight.
- **Safety.**
  - Every channel is capped at 100 % of the calibrated range: cool PWM 35–80, heat 0–200, the firmware maxima. The CLI player refuses higher values.
  - An 8 s running-dose limit of 70 % applies per channel.
  - Output goes to `stop` on pause, end, tab hidden, disconnect, page close, `Esc`/STOP and Ctrl-C.
  - The firmware also cuts output when the skin-contact sensor is open.
- Tuned for **maximum contrast**: peaks reach 100 %, gaps return to 0, sharp L/R. To make it gentler, lower `CURVE`, `CAP` or `DOSE_MAX` in `tools/thermal.py`, or use the Intensity slider.

`output/thermal_overview.png` plots the whole track. `output/thermal_intent.csv` holds the per-character RMS, level, position and per-ear intent before conflict resolution.

## Rebuild after editing the story
`./build_all.sh` (≈1 min) regenerates voices, mix, thermal CSV, subtitles and `media/data.js`. After new art: `python3 tools/prepare_art.py && python3 tools/export.py`. Then:
- `python3 tools/docs.py` regenerates `production/01_script.md`.
- `python3 tools/render_mp4.py` (≈5–10 min) regenerates `output/final_1080p.mp4`.

## Deliverables

| # | Item | Where | Status |
|---|---|---|---|
| 1 | 150 s 1080p MP4 | `output/final_1080p.mp4` | Done: ChatGPT art with blink/lip sync, burned-in ja/en subs, cover title card |
| 2 | 48 kHz stereo binaural WAV | `output/mix_48k.wav` (24-bit) | Done (VOICEVOX when the engine runs; Kyoko draft otherwise) |
| 3 | Separate voice / breath / magic stems | `output/stems/{K,H}_{voice,breath,magic,foley,dry,binaural}.wav`, `ambience_binaural.wav` | Done, draft voices |
| 4 | Subtitles ja / en (+ zh) | `media/subs_{ja,en}.vtt`, `output/subs_{ja,en,zh}.{srt,vtt}` | Done |
| 5 | Script ja + en + zh, shot list | `production/01_script.md`, `production/02_storyboard.md` | Done |
| 6 | Character / scene sheets, AI prompts | `art/Character.jpg` (approved design), `art/chatgpt/`, `production/03_characters_scenes.md` | Done. The animatic and the prompts follow the sheet |
| 7 | 4-channel thermal CSV | `media/thermal.csv` (= `output/thermal_control.csv`) | Done (20 Hz, normalised + PWM + firmware command) |
| 8 | RMS mapping / position / sync code | `tools/thermal.py`, `tools/story.py` | Done |
| 9 | ESP32 interface | Existing firmware protocol; `tools/play_thermal_csv.py`, `demo.js` (Web Serial) | Done (not yet tested on hardware) |
| 10 | Editable project | `tools/` (Python), `index.html` / `demo.js` / `demo.css` | Done |

`output/` holds large files and is not committed; run `./build_all.sh` to recreate it.

## Optional / manual steps
**A. Voices: ElevenLabs (since 2026-11-08, user's picks koyuki r1_b / homura r1_c in `tools/eleven/cast.json`; before: VOICEVOX ずんだもん).**
1. Key = `ELEVENLABS_API_KEY` in the repo's `.env.local`. `./build_all.sh` runs `tools/retime_voices.py` first: every line at its natural length (cached in `output/cache/el_*.wav`), and wherever a line would run into the next one the film is pushed later (`audio/retime.json`; `story.py` maps every time through `W()`, script times in `CUES0`). Now 160.5 s.
2. Delivery comes from audio tags: `EL_TAG` / `EL_SMILE` in `tools/build_audio.py` (expression → tag, `[whispers]` for whispers). The old VOICEVOX path (`tools/tts_voicevox.py`) is kept; set `BACKEND = "voicevox"` to use it.

Without the engine running, the build falls back to macOS Kyoko (draft). For the final release, voice actors can still replace lines: put the takes at the cue times in `tools/story.py` and rebuild.

**B. Optional pro spatial mix.** The included renderer is a spherical-head HRTF model (Brown–Duda ITD/head shadow, near-field ILD, room tail). For a REAPER mix:
- Import the `{K,H}_dry.wav` stems.
- Automate an HRTF panner (e.g. IEM BinauralDecoder / dearVR) from the azimuth/distance columns in `output/thermal_intent.csv`.
- Keep the stems unchanged so the thermal CSV stays valid.

**C. Hardware calibration (on the real device).**
1. On `../../test.html`, find the lowest cool and heat PWM you can just feel, and the highest that stays comfortable. Set them as the output range; the demo uses it automatically.
2. Measure latency: send `LC80`, then `LH200`, and time the moment the skin feels the change. Put the values in `COOL_LEAD` / `HEAT_LEAD` and rebuild, or fine-tune live with **Device lead**.
3. Play the full demo with headphones. Check the left/right match in scenes 2, 4 and 5.
