# Demo 5 · 四季暴走列車 / The Runaway Seasons Express

You sit in a magic train car and face forward for 150 s. Outside the left and right windows the seasons run wild:
- winter;
- summer;
- a tropical downpour;
- a tunnel of ice and fire;
- seasons out of control;
- a cherry-blossom station.

There are no characters and no dialogue. **The temperature in each ear comes from the sounds around you.** Wind, snow, ice and rain cool you. Summer breeze, fire, lava and steam warm you. Each effect is felt on the side where you hear it.

Spec: 150 s · 1920×1080 · 30 fps · 48 kHz binaural · thermal CSV at 20 Hz (3000 rows).

## Status
- ✅ Art (procedural, see `storyboard/visual_prompts.md`)
- ✅ 16 audio stems + binaural mix
- ✅ Thermal CSV
- ✅ Sync report (all checks pass)
- ⏳ Browser player + MP4 render (next step)

## Pipeline
```
scripts/art_train.py, art_scenery.py, make_style_sheet.py  ──► assets/**  (+ style_sheet.png, storyboard/frames/)
scripts/seasons.py      timeline: scenes, 16 sources (envelope, azimuth, distance, thermal role), designed envelopes, silence gap
scripts/build_audio.py  ──► audio/source_stems/*.wav (dry), audio/spatialized/*_binaural.wav, audio/final/final_binaural_150s.wav, mix.m4a
scripts/thermal.py      ──► thermal/thermal_4ch.csv, thermal/thermal_mapping_config.json, analysis/audio_features.csv,
                            analysis/thermal_energy_curves.png
scripts/check_sync.py   ──► analysis/synchronization_report.md, analysis/sync_report.json
```
Full rebuild (about 1 min, no VOICEVOX needed):
`python3 scripts/art_train.py && python3 scripts/art_scenery.py && python3 scripts/make_style_sheet.py && python3 scripts/build_audio.py && python3 scripts/thermal.py && python3 scripts/check_sync.py`

Play on the device without a browser:
`python3 "../ASMR Demo/tools/play_thermal_csv.py" --csv thermal/thermal_4ch.csv --audio audio/final/final_binaural_150s.wav --port /dev/cu.…`

## Audio stems (all synthesised, seeded)

| Drives cooling | Drives heating | Never drives thermal |
|---|---|---|
| winter_wind, snow, ice_cracking, tropical_rain, water_drops | summer_breeze, fire_crackling, lava, steam, spring_breeze (weight 0.22) | ocean_waves, thunder, birds, train_wheels, train_interior, background_music |

Silent visuals use **designed envelopes**, marked `audio_derived: false` in the config:
- `sunlight_right`: sunshine through the right window, 22–60 s.
- `frost_residual_left`: melting frost on the left window, 19–31 s.

## Thermal
The thermal controller works in this order:
1. Per-source RMS (50 ms) feeds Demo 1's `level()`: gate, curve, hold, attack and release.
2. Each source is multiplied by its weight and by Demo 2's ear split, using the **same azimuth as the binaural render**.
3. The sources are summed per ear and per mode.
4. A soft saturation keeps sustained scenes at about 0.7, which avoids dose-limiter chopping.
5. Device lead: cool 0.35 s, heat 0.60 s.
6. Per-ear arbitration ensures that **each ear is only cooling or heating at any moment**.
7. Dose limit: 8 s window, 0.85 maximum.
8. 110–114 s is forced to exactly 0, then PWM conversion (cool 35–80, heat 0–200).

## Acceptance (analysis/synchronization_report.md)
| Check | Result |
|---|---|
| ≥ 4 clear left/right moves | 10 |
| ≥ 2 opposite-temperature moments | 7 segments |
| Ice/fire reversal | L cool / R heat, then a neutral gap, then L heat / R cool |
| Silent segment | Audio −∞ dB and all channels 0 |
| Spring ending | Calm (heat ≤ 0.27, no cooling) and 0 at 150 s |
| Same-ear conflicts | 0 |
| Every driving sound is lateralised to the side it heats or cools | ILD > 3 dB, 1.5 kHz+ |

Large media (`audio/`, `video/`) stay out of git and can be rebuilt with the scripts above.
