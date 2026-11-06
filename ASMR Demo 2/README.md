# キミだけのスペシャルファンミーティング · 星光偶像的特别见面会 · Your Special Idol Fan Meeting — MoHeat Evo ASMR Demo 2

A 150 s first-person binaural ASMR fan meeting with the idol 星乃綾音 Hoshino Ayane. **Her voice warms the ear she is at. The fan, the iced drink and her cool magic cool the ear they come from**, often the other one.

## Run it
- **Double-click `start_demo.command`**, or open `index.html`, or visit `https://moheat-evo.github.io/ASMR%20Demo%202/`.
- Headphones on → **Start**. For thermal feedback: **+ Add** → MoHeat Evo port → **Connect** (desktop Chrome/Edge).
- Keys: `Space` play/pause · `←/→` ±5 s · `Esc` emergency stop. Subtitles: 日本語+中文 (default), 日本語+English, ja / zh / en / off.
- Without a browser: `python3 "../ASMR Demo/tools/play_thermal_csv.py" --csv media/thermal.csv --audio output/mix_48k.wav --port /dev/cu.…`

## Thermal design
```
tools/fanmeeting.py  ── timeline: lines, whispers, song, warm breaths (source A = Ayane, moves around you)
                       fan flaps, swishes, ice, cool breath, cool magic  (source C = its own spot, often the other ear)
build_audio.py   → stems/heat_dry.wav (voice + song + warm breath)   stems/cool_dry.wav (all cooling SFX)
thermal.py       → heat = RMS(heat_dry) × position(A),  cool = RMS(cool_dry) × position(C)
                   50 ms RMS · 20 Hz · gate · normalise · x^2.2 · hold/attack/release · proximity · ear split
                   → device lead (cool 0.35 s, heat 0.60 s) → one-mode-per-ear arbitration → dose limit → PWM
```
- **Sharper left/right than Demo 1.** The ear split uses exponent 2.0 far and 3.5 near, normalised to the nearer ear. At the ear the other side is ≈ 0. A centred source (the iced drink) gives full output on both sides.
- **Checks** (`output/thermal_checks.json`, printed by `thermal.py`):
  - 0 same-ear cool+heat frames.
  - **4 moments of left/right different temperatures**: 1:24 voice R + fan L, 1:31 voice L + fan R, 1:57 song L + magic R, 2:05 song R + magic L.
  - **17 left↔right switches**.
  - Mean |L−R| while active: 0.36.
- `output/thermal_overview.png` plots the four channels; `output/mapping_config.json` holds every parameter. Intensities come from the actual audio RMS, never from fixed story values.

## What is reused from Demo 1 (`../ASMR Demo/tools`, never modified)
`tools/demo1.py` loads these modules by path:
- **Synthesis, HRTF and mastering**: `build_audio` — TTS with VOICEVOX, breaths, cool magic, footsteps, the spherical-head binaural renderer, 24-bit WAV, loudness chain.
- **Thermal controller**: `thermal` — RMS, gate, curve, smoothing, lead, conflict resolution, dose limit, PWM.
- **Art preparation**: `prepare_art` — variant alignment, face compositing, WebP.
- **Data export**: `export` — subtitle timestamps, envelopes.
- **Player and serial**: the player is Demo 1's, adapted. `device.js` (Web Serial) and `play_thermal_csv.py` work unchanged.

New in Demo 2:
- **Song**: an original melody sung by VOICEVOX, one note per mora.
- **Cooling SFX**: folding fan, swish, ice + fizz.
- **Music**: idol backing track.
- **Two sources**: separate heat and cool sources with independent positions.
- **Player**: stage background, concert lighting, cooling visuals.

## Files
```
index.html · demo.js · demo.css · start_demo.command · build_all.sh
art/        A_Character.png (design sheet), concept_board.jpg, chatgpt/*.png (35 ChatGPT assets + prompts)
media/      mix.m4a, thermal.csv, subs_{ja,zh,en}.vtt, data.js, cover.jpg, art/*.webp
tools/      fanmeeting.py (timeline) · build_audio.py · thermal.py · export.py · prepare_art.py · render_mp4.py · docs.py · demo1.py
production/ 01 ChatGPT asset prompts · 02 script (ja/zh/en) · 03 storyboard
output/     mix_48k.wav · stems/ (heat_voice, heat_breath, cool_fan, cool_ice, cool_breath, cool_magic, *_dry, *_binaural, music, foley, ambience)
            final_1080p.mp4 · thermal_control.csv · thermal_intent.csv · mapping_config.json · thermal_checks.json · subs_*.srt   (local, not committed)
```

## Deliverables

| Item | Where | Status |
|---|---|---|
| 150 s MP4 | `output/final_1080p.mp4` | Done: ChatGPT art, blink/lip sync, ja+zh subs burned in, cover title card |
| Binaural ASMR WAV, 48 kHz | `output/mix_48k.wav` | Done (−17 LUFS) |
| Separate voice / breath / cooling SFX stems | `output/stems/` | Done |
| Subtitles ja + zh (+ en) | `media/subs_*.vtt`, `output/subs_*.srt` | Done |
| Script and storyboard | `production/02_script.md`, `production/03_storyboard.md` | Done |
| Character sheet and reference art | `art/` | Done |
| 4-channel thermal CSV | `media/thermal.csv` | Done |
| RMS mapping and sync code | `tools/thermal.py` (+ Demo 1 controller) | Done |
| Project files | this folder | Done |

## Rebuild
- Start VOICEVOX (`../ASMR Demo/start_voicevox.command`), then `./build_all.sh` (≈1 min).
- MP4: `python3 tools/render_mp4.py` (≈5 min).
- After new art: `python3 tools/prepare_art.py && python3 tools/export.py`.
- Credit required by the voice terms: **VOICEVOX:満別花丸**. The demo shows it; keep it in any film credits.

## Manual
- **Hardware calibration**: set the comfortable PWM range on `../test.html`, then measure the device lead and set `COOL_LEAD` / `HEAT_LEAD` in `tools/thermal.py`.
