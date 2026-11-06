# 雪と狐火のひそひそ話 · Whispers of Snow and Flame — MoHeat Evo ASMR demo

A 150 s first-person binaural ASMR story. 小雪 Koyuki (snow spirit) cools you and 焔 Homura (foxfire spirit) warms you. Each character's own voice drives MoHeat Evo, on whichever ear she is at.

## Run it
- **Double-click `start_demo.command`.** It starts a local server and opens Chrome. Or open `index.html` directly, or visit `https://moheat-evo.github.io/ASMR%20Demo/`.
- Headphones on → **Start**. To get thermal feedback: **+ Add** → choose the MoHeat Evo port → **Connect** (desktop Chrome/Edge, Web Serial).
- Keys: `Space` play/pause · `←/→` ±5 s · `Esc` emergency stop (press again to re-arm).
- **Intensity** scales all output. **Device lead** shifts the thermal track against the picture: + = earlier. The PWM range is the one set on `../test.html` (shared).
- **Load MP4…** swaps the animatic for the finished film. The film plays with its own audio, and the thermal track follows its clock.
- Without a browser: `python3 tools/play_thermal_csv.py --port /dev/cu.… ` plays the WAV and streams the CSV (needs `pip3 install pyserial`; `--list`, `--dry-run`, `--intensity`, `--offset`).

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
`./build_all.sh` (≈1 min) regenerates voices, mix, thermal CSV, subtitles and `media/data.js`. Then:
- `python3 tools/docs.py` regenerates `production/01_script.md`.
- `python3 tools/render_mp4.py` (≈5–10 min) regenerates `output/animatic_1080p.mp4`.

## Deliverables

| # | Item | Where | Status |
|---|---|---|---|
| 1 | 150 s 1080p MP4 | `output/animatic_1080p.mp4` | **Animatic** (cel-shaded vector art, burned-in ja/en subs). Final film = manual step A |
| 2 | 48 kHz stereo binaural WAV | `output/mix_48k.wav` (24-bit) | Done (VOICEVOX when the engine runs; Kyoko draft otherwise) |
| 3 | Separate voice / breath / magic stems | `output/stems/{K,H}_{voice,breath,magic,foley,dry,binaural}.wav`, `ambience_binaural.wav` | Done, draft voices |
| 4 | Subtitles ja / en (+ zh) | `media/subs_{ja,en}.vtt`, `output/subs_{ja,en,zh}.{srt,vtt}` | Done |
| 5 | Script ja + en + zh, shot list | `production/01_script.md`, `production/02_storyboard_seedance.md` | Done |
| 6 | Character / scene sheets, AI prompts | `production/03_characters_scenes.md` | Done (text). Reference images = manual step A |
| 7 | 4-channel thermal CSV | `media/thermal.csv` (= `output/thermal_control.csv`) | Done (20 Hz, normalised + PWM + firmware command) |
| 8 | RMS mapping / position / sync code | `tools/thermal.py`, `tools/story.py` | Done |
| 9 | ESP32 interface | Existing firmware protocol; `tools/play_thermal_csv.py`, `demo.js` (Web Serial) | Done (not yet tested on hardware) |
| 10 | Editable project | `tools/` (Python), `index.html` / `demo.js` / `demo.css` | Done |

`output/` holds large files and is not committed; run `./build_all.sh` to recreate it.

## Manual steps still needed
**A. Final animation (Seedance or similar).** Log in to the video tool and follow `production/02_storyboard_seedance.md`:
- Generate references, then 18 shots image-to-video.
- Cut each shot to the animatic timing in DaVinci Resolve over `output/mix_48k.wav`.
- Export 1920×1080 MP4 and load it with **Load MP4…**.

**B. Voices: VOICEVOX (emotional anime TTS, recommended).**
1. The engine is already downloaded to `~/VOICEVOX-engine/engine`. Double-click `start_voicevox.command`, or run `cd ~/VOICEVOX-engine/engine && ./run`. Leave it running.
2. `./build_all.sh`. The build detects the engine and regenerates every line with a style per emotion:
   - Koyuki = 九州そら (あまあま / ツンツン / **ささやき**)
   - Homura = 四国めたん (ノーマル / ツンツン / **ささやき**)
3. To change voices, edit `CAST` in `tools/tts_voicevox.py`. `python3 tools/tts_voicevox.py --audition` writes comparison clips to `output/audition/`.
4. Credit required by the voice terms: the demo shows `VOICEVOX:九州そら / VOICEVOX:四国めたん` automatically. Keep it in the film credits too.

Without the engine running, the build falls back to macOS Kyoko (draft). For the final release, voice actors can still replace lines: put the takes at the cue times in `tools/story.py` and rebuild.

**C. Optional pro spatial mix.** The included renderer is a spherical-head HRTF model (Brown–Duda ITD/head shadow, near-field ILD, room tail). For a REAPER mix:
- Import the `{K,H}_dry.wav` stems.
- Automate an HRTF panner (e.g. IEM BinauralDecoder / dearVR) from the azimuth/distance columns in `output/thermal_intent.csv`.
- Keep the stems unchanged so the thermal CSV stays valid.

**D. Hardware calibration (on the real device).**
1. On `../test.html`, find the lowest cool and heat PWM you can just feel, and the highest that stays comfortable. Set them as the output range; the demo uses it automatically.
2. Measure latency: send `LC80`, then `LH200`, and time the moment the skin feels the change. Put the values in `COOL_LEAD` / `HEAT_LEAD` and rebuild, or fine-tune live with **Device lead**.
3. Play the full demo with headphones. Check the left/right match in scenes 2, 4 and 5.
