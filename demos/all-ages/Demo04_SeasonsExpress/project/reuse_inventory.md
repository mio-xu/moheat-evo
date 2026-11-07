# Reuse inventory — Demo 4 (The Runaway Seasons Express)

Priority: direct reuse > modify > new. Earlier demos are read-only (symlinks / import by path, never edited).

| Path | Type | Demo | Reuse | Action in Demo 4 |
|---|---|---|---|---|
| `demos/all-ages/Demo03_ShiningSmileConcert/assets/effects/fx_{snowflake,ice_crystal,flame,star}.png` | FX sprites | 3 | Direct (symlink) | `assets/reused_assets/`: snow, ice, fire and sparkle particles |
| `demos/all-ages/Demo01_SnowFoxfire/art/chatgpt/room_bg.png`, `demos/all-ages/Demo02_FanMeeting/art/chatgpt/stage_bg.png`, `demos/Demo3…/new_stage/concert_stage_base.png` | Background art | 1–3 | Reference | Style reference (palette, softness); not used in frame |
| `demos/all-ages/Demo01_SnowFoxfire/tools/build_audio.py` | Filters, 24-bit WAV writer, spherical-head HRTF renderer (Brown–Duda ITD + head shadow + near-field ILD + room) | 1 | Imported (`scripts/demo1.py`) | Binaural render of all 16 ambience stems. Positions come from `seasons.positions()` |
| `demos/all-ages/Demo01_SnowFoxfire/tools/thermal.py` | RMS → gate → curve → hold/attack/release, device lead, one-mode-per-ear arbitration, dose limit, PWM | 1 | Imported | The whole controller. Demo 4 only adds the source mix, soft saturation and the silence gate |
| `demos/all-ages/Demo02_FanMeeting/tools/thermal.py` | Sharp L/R ear split (normalised to the nearer ear) | 2 | Imported by path | Left/right weights from each sound's azimuth |
| `demos/all-ages/Demo03_ShiningSmileConcert/scripts/check_sync.py` | Sync report pattern | 3 | Pattern | `scripts/check_sync.py` (new checks for this brief) |
| `demos/all-ages/Demo03_ShiningSmileConcert/main.js`, `index.html` | Player (Web Serial, thermal UI, `?render=1` frame renderer) | 3 | Adapted | `main.js` / `index.html`: car + window masks + scrolling scenery |
| `demos/all-ages/Demo01_SnowFoxfire/tools/render_mp4.py`, `play_thermal_csv.py` | MP4 renderer; CSV → ESP32 without a browser | 1 | Direct | `play_thermal_csv.py --csv thermal/thermal_4ch.csv --audio audio/final/final_binaural_150s.wav` |
| `device.js` | Web Serial | site | Direct | Shared |

**New in Demo 4:**
- Art: all of `assets/` except `reused_assets/`, procedurally drawn (see `storyboard/visual_prompts.md`).
- Audio: 16 synthesised ambience stems. There are no recordings or third-party samples, so no licence to check.
- Timeline: `scripts/seasons.py`.
