# Demo 9 · 安土最後の酒宴 — The Last Banquet at Azuchi

150 s binaural ASMR × thermal haptics. Azuchi Castle, spring 1582: you sit between **織田信長** (front-left) and **徳川家康** (front-right)
for a night of warm sake, whispered secrets, a rising wind and rain. Ukiyo-e gold-leaf art (ChatGPT, see `project/prompts_chatgpt.md`).
Subtitles: Japanese + English. The browser-rendered MP4 is the final film.

## Run
- `./start_demo.command` (or serve the repo root: `python3 -m http.server 8765` → `http://localhost:8765/Demo09_SengokuBanquet/`).
- Connect MoHeat Evo (top right, Web Serial, Chrome/Edge). `?t=95` = still frame at 1:35 · `?cover=1` = cover only.

## Rebuild
```
./build_all.sh                    # needs VOICEVOX (../../all-ages/Demo01_SnowFoxfire/start_voicevox.command)
python3 scripts/render_mp4.py     # → video/final/final_banquet_150s.mp4 (≈10 min)
```
| Step | Script | Output |
|---|---|---|
| Art | `scripts/prepare_art.py` | `media/art/*.webp`, `faces.json` (variants aligned, face-only composite, stray backgrounds removed) |
| Script / timeline | `scripts/banquet.py` | single source of truth: lines (speaker, emotion, delivery, position, addressee), positions, warm/cold cues |
| Voices | `scripts/voice.py` | 3 takes per line → `audio/takes/`; `TAKE = {line: k}` picks a take |
| Audio | `scripts/build_audio.py` | stems, HRTF binaural mix → `audio/final/mix_48k.wav`, `media/mix.m4a` |
| Thermal | `scripts/thermal.py` | `thermal/thermal_4ch.csv` (= `media/thermal.csv`), intent, config, overview plot, checks |
| Player data | `scripts/export.py` | `media/subs_{ja,en}.vtt`, `media/anim.json`, `media/data.js` |
| Docs / QA | `scripts/docs.py`, `scripts/check_sync.py` | `storyboard/script_150s.md`, `analysis/qa_report.json` |

## Voices (locked)
- 信長 = VOICEVOX **青山龍星**, VOICEVOX pitch −0.06, post shift **−1.5 st**, chest +5 dB, grit 0.24 (`voice_personas.py` → `FINAL`).
- 家康 = VOICEVOX **黒沢冴白**, pitch −0.1, post shift **−2 st**, tempo ×0.88, chest +5 dB, slight tremor.
- Laughs are built mora by mora (falling pitch, glottal catches, breath), not read as text.

## Thermal mapping
- 信長's dry voice → heat at his position → mostly **L_Heat**; 家康's → mostly **R_Heat**. One loudness scale per character, so
  laugh > speech > whisper (whisper weak but felt). Proximity factor 0.75 seated → 1.0 at the ear (closeness never by volume alone).
- Warm: hot-sake steam (right, 25–32 s), brazier (right, 109–114 s). Cold: ice bucket (right, 55–60 s), wind (front → left → right, 82–102 s),
  rain (left 104–114 s → right 115–129 s).
- Device lead (cool 0.35 s, heat 0.60 s), per-ear arbitration (0 same-ear conflicts), 8 s dose limit, ends at `stop`.

## QA (`analysis/qa_report.json`)
Distinct voices (F0 77 vs 96 Hz) · no clipped / overlapping lines · ja + en for all 30 lines · lip sync · whisper lines at the correct ear ·
heat follows voice energy (r = 0.99 / 0.83), laugh 0.70 > speech 0.55 > whisper 0.34 · 3000 thermal rows, 19 opposite-temperature moments,
16 left↔right switches · mix exactly 150.000 s @ 48 kHz.

## Credits
Voice: ElevenLabs (since 2026-11-08; earlier VOICEVOX:青山龍星 / 黒沢冴白). Original script, koto phrase and SFX (synthesised). Art: ChatGPT, original designs.
