# Demo 6 · 未来の酒と、安土の夜 — Future Whisky at Azuchi

150 s binaural ASMR × thermal haptics. You have slipped back 400 years to Azuchi Castle with three bottles of modern
Suntory whisky — **Yamazaki** (on the rocks), **Hakushu** (highball) and **Hibiki** — and taste them with **織田信長**
(front-left) and **徳川家康** (front-right). Both talk to you; your own lines are **subtitles only** (no voice).
Japanese + English subtitles. The browser-rendered MP4 is the final film.

## Reuse (nothing in the Sengoku demo is modified)
- Cast, room and props: the Sengoku banquet demo's `media/art` (the player loads it via `artBase` in `media/data.js`).
- Voices: the same locked personas (信長 = VOICEVOX 青山龍星 −1.5 st, 家康 = 黒沢冴白 −2 st), `voice.perform()`.
- SFX, HRTF renderer, thermal controller and checks: loaded by file path in `scripts/sengoku.py`
  (the folder is found as `demos/Demo*_SengokuBanquet`, so a renumbering does not break this demo; re-run `make_export.py`
  and update the two `../Demo9_SengokuBanquet/` paths in `index.html` / `demo.css` if it moves).
- New art: the user's Suntory renders in `demos/suntory/`, cut out by `scripts/cutout_whisky.py` → `assets/whisky/`.

## Run / rebuild
```
./start_demo.command                 # or http://localhost:8765/demos/nobunaga-suntory/Demo6_FutureWhisky/
./build_all.sh                       # needs VOICEVOX
python3 scripts/render_mp4.py        # → video/final/final_future_whisky_150s.mp4
```

## Thermal
- 信長's voice → **L heat**, 家康's → **R heat** (laugh > speech > whisper; whispers at the ear ×1.5 so they are felt).
- Cold whisky moments sit on the opposite ear: ice for Nobunaga's glass (L) while Ieyasu talks (R), the highball fizz (R)
  while Nobunaga talks (L), and in the Hibiki round the two lords whisper at your ears in turn with a chilled glass on the other side.
- 29 left↔right switches, 22 moments of opposite temperatures, 0 same-ear conflicts (`thermal/thermal_checks.json`).

## QA
`scripts/check.py` → `analysis/qa_report.json`: no clipped / overlapping lines, your 9 lines text-only, ja + en for all 43 lines,
whispers at the correct ear, heat follows voice energy, alternation, 3000 rows ending at `stop`, mix exactly 150 s @ 48 kHz.

Voice: VOICEVOX:青山龍星 / VOICEVOX:黒沢冴白 · Suntory whisky artwork: provided by the user.
