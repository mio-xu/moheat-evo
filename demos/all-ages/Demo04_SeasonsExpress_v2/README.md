# Demo 4 · 季節が、暴走する。 The Runaway Seasons Express (v2, 2026-11-09)

**v2 = the upgrade the user approved (TASKS #49, "都做"):** a retro wooden **magic × cyber carriage** that transforms with every season,
the **Season Spirit Conductor「ハルフユ車掌 / Conductor Halfy」** (chibi, half snow / half sun; card `docs/characters/halfy.md`) as the
announcer, **DUAL thermal** (cool + warm independent on each ear), three light interactions and the unified UI v2 cover. Script, world
rule card, shot list and thermal table: `project/script.md`; layer plan and costs: `project/layers.md`.

- **The carriage** (`scripts/prepare_art.py`): wooden panels flip open on their hinges to glowing rune circuits — ice-blue runes and an
  ice-crystal shield rising over the windows in winter, orange runes and opening ceiling vents blowing hot air in summer; in the tunnel the
  car **splits in two** (ice cabin LEFT / fire cabin RIGHT, a glowing seam between); the seasons' chaos glitches the runes neon; the panels
  close again at the cherry-blossom station. Window frames glow blue / orange with what each ear feels right now. Roof-hatch toys (a
  snowman in winter, a sun pinwheel spinning with the summer breeze), a brass wall lamp, the tea cup, icicles, your breath cloud.
- **The conductor**: announces every stop from the **hologram screen** above the door (light only — no warmth); in the power cut it
  hops out of the dead screen and **whispers at your RIGHT ear** (warm voice), and at the station it waves goodbye from your table.
  Voice: ElevenLabs `halfy` r1_a (three auditions + the pick: `project/voice_audition/`), **always Japanese** (user 2026-11-09; en / zh
  are subtitles; the en / zh takes stay in `media/voice/`, unused). Lip-sync: mouth sets from `tools/art/lp_mouths.py`, blinks, breathing.
- **World rule** (magic, §0.1): a window's season reaches the car only through that side's **open** rune panels (first shown slowly:
  left panels 2–4.5 s → left ear cools, right panels 5–7 s → right ear). Real warm sources: sunlight, the tea, the wall lamp, the
  conductor's voice in person.
- **Thermal (DUAL `DUAL LC.. LH.. RC.. RH..`)**: winter sweeps L↔R; tea held in winter = cool + warm on both ears; storm = rain spray cool
  + lamp warm on the LEFT ear; tunnel = ice cabin cool + tea steam warm on the LEFT ear, fire cabin warm on the right; chaos = 2-s
  swaps then a **1-s hot↔cold block** (100–108 s, both ears in opposite phase); power cut = 0 except the whisper's warmth on the right ear.
- **Interactions** (interactive = default, pure mode answers itself): hold ☕ the tea (winter) · open the ❄ LEFT / 🔥 RIGHT window
  (tunnel; that side ×1.3) · shout 「春！」 "Spring!" (voice-judged, tap fallback) to bring the train back.

Rebuild (v2): `python3 scripts/prepare_art.py && python3 tools/art/build_stage.py . && python3 scripts/voice.py && python3 scripts/build_audio.py &&
python3 scripts/thermal.py && python3 scripts/check_sync.py && python3 scripts/export.py`; cover art `python3 scripts/render_mp4.py --cover`
→ `python3 tools/web/covers.py Demo04_SeasonsExpress --publish`; film `python3 scripts/render_mp4.py` (soundtrack = mix + Japanese voice).

---

## v1 notes (scenery, sound and thermal pipeline — still valid unless v2 above says otherwise)


You sit in a magic train car and face forward for 150 s. Outside the left and right windows the seasons run wild:
- winter;
- summer;
- a tropical downpour;
- a tunnel of ice and fire;
- seasons out of control;
- a cherry-blossom station.

There are no characters and no dialogue. **The temperature in each ear comes from the sounds around you.** Wind, snow, ice and rain cool you. Summer breeze, fire, lava and steam warm you. Each effect is felt on the side where you hear it.

Spec: 150 s · 1920×1080 · 30 fps · 48 kHz binaural · thermal CSV at 20 Hz (3000 rows).

## Run it
- Double-click `start_demo.command`, or open `index.html`, or visit `https://moheat-evo.github.io/demos/all-ages/Demo04_SeasonsExpress/`.
- Connect MoHeat Evo (top right, Chrome / Edge), press **Start**.
- Keys: `Space` play/pause, `←/→` ±5 s, `Esc` emergency stop.
- Final film: `video/final/final_seasons_express_150s.mp4` (local, rebuild with `scripts/render_mp4.py`).

## Status
- ✅ Art: the regenerated art pack (`project/generated_art/`, 37 PNGs) installed by `scripts/import_generated_art.py` (2026-11-07)
- ✅ 16 audio stems + binaural mix
- ✅ Thermal CSV
- ✅ Sync report (all checks pass)
- ✅ Browser player (`index.html`, `main.js`)
- ✅ MP4 (`scripts/render_mp4.py`)

## Player
Scenery layers are **mirror-tiled** (every other copy flipped) so the painted layers scroll without a seam; the painted heat
haze and sun glare are blended with `screen` at reduced strength; the power cut shows the painted aurora (`night_aurora_far`).

The player draws, back to front:
1. Each window, clipped to its glass polygon from `window_geometry.json`.
   - Parallax scenery: far 0.12×, mid 0.45×, near 1.2× of the train speed. The tunnel walls move at 1.5×.
   - The left window scrolls left and the right window scrolls right, as seen when facing forward.
   - Weather drawn in code: snow, rain streaks, ice glitter, embers, petals, tunnel lights.
   - Glass layers: frost thaws away, rain drips, sun haze pulses, fog drifts.
   - Lightning flashes at the thunder cues.
2. Warm light in the door window.
3. The interior: day → dusk → night → day, cross-faded.
4. Window colour spill and lamp glow.
5. The clock hands, drawn in code: one gentle hour; they spin forward in the chaos, stop in the blackout and spin back after it.
6. Table props with steaming tea.
7. Particles inside the car:
   - steam puffs from the window the steam comes from;
   - the season swirl when control is lost;
   - ice and flame on the matching sides in the tunnel;
   - sakura petals in spring.

**Shared timing:**
- The train sways on every rail joint, using the same speed integral as the wheel clacks in the mix.
- The station slides in as the train brakes (139–146 s).
- 108.5–110.5 s is a power cut: a power-down sweep, the lamps die and the car dims to about half, but the glass shows a bright blue-violet aurora night with stars streaming past (mean frame brightness ≈ 86/255, never black). It is 2 s of total silence with all thermal channels at 0, then a power-up sweep. It used to be 4 s of black, which looked like the end of the film.
- Each window's season comes from `seasons.py` (`SEGMENTS` + `CHAOS`), the same table that places the sounds, so what you see on a side is what you hear and feel there.

**Previews:** `python3 scripts/render_mp4.py --at 10,30,75` renders stills to `video/clips/preview/`.

**Cover:** `python3 scripts/make_cover.py` (the 8765 server must be running).
- The background is a rendered frame at 68 s: ice tunnel on the left, lava on the right.
- On top: the Japanese tagline in kana, 「季節が、暴走する。」, and a big English title.
- The cover is also the film's first 1.8 s.
- Outputs: `media/cover.jpg` and the site menu thumbnail `assets/images/demos/demo4.jpg`.

**Pacing:**
- All times are authored on the brief's grid and remapped once by `seasons.tw()`.
- Winter lasts 12 s with no slow fade-in, and the train is 20 % faster in winter.
- The player (`TW()` in main.js) and the audio use the same remap.

**Car:** a panorama glass observation car (user, 2026-11-07).
- Above a low wooden wainscot and sill (0.8 m below eye level, roughly seat-cushion height), the side walls and the whole arched roof are glass.
- The glass is held by arched wooden ribs every 0.78 m, longitudinal brass bars and a roof spine that carries the lamps.
- Each side's scenery fills its half of the frame, so the seasons are visible beside you and overhead.
- The scenery is anchored to eye level: the layers' horizon (y≈590) sits at the vanishing point and is drawn at 1.35×, tall enough to fill the low glass.

## Pipeline
```
project/generated_art/ ──► scripts/import_generated_art.py ──► assets/**  (green glass keyed, window_mask + window_geometry re-measured)
   (the old procedural generators art_train.py / art_scenery.py are no longer run: they would overwrite the new art)
scripts/seasons.py      timeline: scenes, 16 sources (envelope, azimuth, distance, thermal role), designed envelopes, silence gap
scripts/build_audio.py  ──► audio/source_stems/*.wav (dry), audio/spatialized/*_binaural.wav, audio/final/final_binaural_150s.wav, mix.m4a
scripts/thermal.py      ──► thermal/thermal_4ch.csv, thermal/thermal_mapping_config.json, analysis/audio_features.csv,
                            analysis/thermal_energy_curves.png
scripts/check_sync.py   ──► analysis/synchronization_report.md, analysis/sync_report.json
scripts/export.py       ──► media/art/*.webp, media/data.js, media/mix.m4a, media/thermal.csv
scripts/render_mp4.py   ──► video/final/final_seasons_express_150s.mp4
```
Full rebuild (assets + audio ≈ 1 min, MP4 ≈ 10 min; no VOICEVOX needed):
`python3 scripts/import_generated_art.py && python3 scripts/build_audio.py && python3 scripts/thermal.py && python3 scripts/check_sync.py && python3 scripts/export.py && python3 scripts/render_mp4.py`

Play on the device without a browser:
`python3 ../Demo01_SnowFoxfire/tools/play_thermal_csv.py --csv thermal/thermal_4ch.csv --audio audio/final/final_binaural_150s.wav --port /dev/cu.…`

## Audio stems (all synthesised, seeded)

| Drives cooling | Drives heating | Never drives thermal |
|---|---|---|
| winter_wind, snow, ice_cracking, tropical_rain, water_drops | summer_breeze, fire_crackling, lava, steam, spring_breeze (power weight 0.05: a calm ending) | ocean_waves, thunder, birds, train_wheels, train_interior, background_music |

Silent visuals use **designed envelopes**, marked `audio_derived: false` in the config:
- `sunlight_right`: sunshine through the right window, 13–52 s.
- `frost_residual_left`: melting frost on the left window, 11–23 s.

## Thermal
The thermal controller works in this order:
1. Per source, the 50 ms power of its own dry stem is weighted and split between the ears with Demo 2's ear split, using the **same azimuth as the binaural render**.
2. The powers are summed per ear and per mode, then turned into a drive once: dB → gate 30 dB under the 99.5th percentile → curve 1.5 → hold 0.12 s, attack 0.08 s, release 0.5 s → peak 0.95.
   - A gust is therefore felt as a gust, and a loud scene is stronger than a quiet one.
   - An earlier version summed per-source levels that were each already normalised, so every scene flattened to a constant ≈ 0.8.
3. The silent visuals (sunlight, which flickers with passing clouds, and melting frost) are combined with the audio drive as a soft union.
4. Every source has a 2–3 s gust or pulse rhythm (`PULSE` in seasons.py). The winter blizzard (wind, snow, ice) sweeps left ↔ right every 2–3 s, and the summer breeze swings to the left twice.
5. Device lead: cool 0.35 s, heat 0.60 s.
6. Per-ear arbitration ensures that **each ear is only cooling or heating at any moment**.
7. Dose limit: 8 s window, 0.85 maximum.
8. The power cut (108.5–110.5 s) is forced to exactly 0, then PWM conversion (cool 35–80, heat 0–200).

## Acceptance (analysis/synchronization_report.md)
| Check | Result |
|---|---|
| ≥ 4 clear left/right moves | 32 (incl. 4 winter sweeps) |
| ≥ 2 opposite-temperature moments | 16 segments |
| Ice/fire reversal | L cool / R heat, then a neutral gap, then L heat / R cool |
| Silent segment | Audio −∞ dB and all channels 0 |
| Spring ending | Calm (heat ≤ 0.32, no cooling) and 0 at 150 s |
| Fast chaos | 15 rows of 2–2.5 s, 22 left/right flips of cool or warm |
| Same-ear conflicts | 0 |
| Every driving sound is lateralised to the side it heats or cools | ILD > 3 dB, 1.5 kHz+ |

Large media (`audio/`, `video/`) stay out of git and can be rebuilt with the scripts above.
