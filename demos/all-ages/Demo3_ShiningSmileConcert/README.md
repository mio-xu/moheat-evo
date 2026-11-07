# Demo 3 · Shining Smile Melody — Ice & Fire Concert · 氷と炎の星光コンサート

A 150 s first-person concert with Hoshino Ayane (Demo 2's idol, same design) to the real song **Shining Smile Melody – Jpop (ZTMusic, Pixabay)**.

**The music drives the thermal feedback:**
- The vocal, bass and drums warm you. The bright highs and the ice effects cool you.
- In Mode B, left/right follows where Ayane and the ice are on stage.

## Run it
- Double-click `start_demo.command`, or open `index.html`, or visit `https://moheat-evo.github.io/Demo3_ShiningSmileConcert/`.
- **Thermal** selector: **Mode B** (music × stage positions, default) or **Mode A** (music only, for comparison).
- `Space` play/pause, `←/→` ±5 s, `Esc` emergency stop.
- Without a browser: `python3 "../../all-ages/Demo1_SnowFoxfire/tools/play_thermal_csv.py" --csv thermal/thermal_mode_B.csv --audio audio/final/final_stereo_150s.wav --port /dev/cu.…`

## Pipeline (all reproducible)
```
assets/music_original/*.mp3 ── scripts/music_features.py ──► analysis/original_* (170.04 s, structure, overview)
        └─ scripts/edit_music.py ──► assets/music_edited/shining_smile_150s.wav  (cut 7 bars at a bar boundary, see edit_log.json)
scripts/music_features.py (edit) ──► analysis/music_features.csv (20 Hz × 3000), music_structure.json (BPM, beats, bars, sections)
scripts/concert.py   timeline aligned to the real sections; ONE position set for Ayane (heat) and the ice FX (cool)
scripts/build_audio.py ──► audio/final/final_stereo_150s.wav (song unchanged + quiet binaural ice-FX layer), audio/stems/
scripts/thermal.py   ──► thermal/thermal_mode_A.csv, thermal_mode_B.csv, mapping_config.json, drive_features.csv, thermal_checks.json
scripts/export.py    ──► media/data.js ;  scripts/render_mp4.py ──► video/final/final_concert_150s.mp4
scripts/check_sync.py  repeatable sync / consistency checks ──► analysis/sync_report.json (ALL PASS)
```
- **Music analysis** uses numpy/scipy only. Demucs/librosa were not needed:
  - HPSS by median filtering separates drums from the harmonic part.
  - A centre-channel (mid/side) harmonic mask in 250–3500 Hz serves as the vocal proxy.
  - Bass is 40–200 Hz, highs are 4–14 kHz, plus spectral-flux onset and L/R channel RMS.
  - Tempo comes from the onset autocorrelation and beats from dynamic programming (Ellis). Downbeats are the beats with the most kick+bass.
  - Sections come from novelty on a beat-synchronous chroma/energy self-similarity matrix.
  - Detected: **88.2 BPM half-time (≈176 BPM)**, bar = 2.73 s.
  - The separated features are used only for control. **The original mix is the listening output.**
- **Edit**: 170.04 s → 150.000 s.
  - 7 bars of the long interlude (131.33–150.43 s) were chosen by a bar-similarity search.
  - The join is transient-aligned (+15 ms) with an 80 ms equal-power cross-fade.
  - The natural fade-out is kept, so the big chorus stays at 1:36.
- **Thermal**: Heat = 0.65·vocal + 0.25·bass + 0.10·drums; Cool = 0.75·highs + 0.25·ice-FX. Processing order:
  1. Noise gate.
  2. Percentile normalisation (p10–p97).
  3. Curve.
  4. Hold / attack / release.
  5. Contrast re-normalisation.
  6. Device lead: cool 0.35 s, heat 0.60 s.
  7. Per-ear arbitration (firmware: one mode per ear).
  8. Dose limit and cap.
  9. PWM.

  Every weight and constant is in `thermal/mapping_config.json`. The controller code is Demo 1's, and the ear split is Demo 2's.
- **Mode A vs B** (`thermal/thermal_checks.json`):

  | | Mode A (music only) | Mode B (music × stage) |
  |---|---|---|
  | Mean \|L−R\| while active | 0.07 (centre vocals → both ears equal) | 0.24 |
  | Segments with left/right different temperatures | 0 | 15 |
  | Same-ear conflicts | 0 | 0 |

- **Sync** (`scripts/check_sync.py`):
  - Audio 150.0000 s at 48 kHz stereo; video 150.000 s at 30 fps, 4500 frames.
  - CSV: 3000 samples, 0–149.95 s.
  - Features vs final audio lag: 0 ms.
  - Heat side follows Ayane's stage side in 90% of one-sided samples; cooling follows the ice FX in 99%.
  - corr(heat, vocal) = 0.62.

## Timeline (aligned to the song, see `storyboard/storyboard_150s.md`)

| Time | Section | Stage | Thermal (Mode B) |
|---|---|---|---|
| 0:00–0:11 | Opening | normal | warmth rises with the intro |
| 0:11–0:39 | First song (verse 1) | normal, pink beams | heat follows the vocal; left while she is on stage left; runway close-up |
| 0:39–0:58 | Chorus 1 | **ice** | cooling sweeps L↔R with the crystals |
| 0:58–1:14 | Verse 2 | **ice & fire**: left ice / right warm | left cool + right heat |
| 1:14–1:36 | Interlude + breakdown | **swap**: left warm / right ice | left heat + right cool |
| 1:36–2:09 | Big chorus (climax) | ice opposite Ayane, flips every 2 bars | heat and cool swap sides every 2 bars |
| 2:09–2:30 | Outro | normal | decays to zero |

## Reuse

See `reuse_inventory.md`. Demo 1 and Demo 2 are never modified: art is linked read-only from `project/art_src`, and code is imported by path through `scripts/demo1.py`.
- **Reused from Demo 2**: the character, 13 bust frames, 13 poses, the heart mic (as a reference) and the player.
- **New**: 10 dance poses, 2 mic poses, 2 singing mouths, the concert stage (base, ice, warm, split), the audience, and 6 FX sprites.

## Deliverables

| | File |
|---|---|
| Final video | `video/final/final_concert_150s.mp4` |
| Final audio | `audio/final/final_stereo_150s.wav` (48 kHz / 24-bit) |
| Music features | `analysis/music_features.csv`, `analysis/music_structure.json`, `analysis/music_overview.png` |
| Thermal CSVs | `thermal/thermal_mode_A.csv`, `thermal/thermal_mode_B.csv` (+ `media/thermal.csv` = B) |
| Mapping config | `thermal/mapping_config.json` (copy in `project/`) |
| Storyboard | `storyboard/storyboard_150s.md` |
| Reuse inventory | `reuse_inventory.md` |
| Music source / licence | `assets/music_original/SOURCE.md` |

`audio/`, `video/` and the WAV/MP3 music files are local only (not committed). Rebuild with:

```
python3 scripts/edit_music.py && python3 scripts/music_features.py assets/music_edited/shining_smile_150s.wav analysis/music && python3 scripts/build_audio.py && python3 scripts/thermal.py && python3 scripts/export.py && python3 scripts/render_mp4.py && python3 scripts/check_sync.py
```

## Licence note
The song is used under the Pixabay Content License (see `SOURCE.md`). The web player streams the edited song (`media/mix.m4a`) as part of the demo. The raw MP3/WAV files are not published. Re-check the licence on the Pixabay page before a public release. Credit shown at the end: "Music: Shining Smile Melody — ZTMusic (Pixabay)". No lyrics are displayed.
