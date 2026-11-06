#!/bin/bash
# Rebuild Demo 4 from scripts/banquet.py (needs the VOICEVOX engine: ../ASMR Demo/start_voicevox.command).
set -e
cd "$(dirname "$0")"
python3 scripts/prepare_art.py   # assets/ → media/art/*.webp + faces.json (variants aligned, face-only composite)
python3 scripts/voice.py         # every line × 3 takes → audio/takes/ (locked personas: 青山龍星 −1.5 st / 黒沢冴白 −2 st)
python3 scripts/build_audio.py   # voices + steam/brazier (warm) + ice/wind/rain (cold) + koto/insects → HRTF binaural mix
python3 scripts/thermal.py       # N voice → L heat, I voice → R heat, warm/cold ambience at their own spots
python3 scripts/export.py        # subtitles ja + en, media/data.js
python3 scripts/docs.py          # storyboard/script_150s.md
python3 scripts/check_sync.py    # QA report → analysis/qa_report.json
echo "done — open index.html (or ./start_demo.command); MP4: python3 scripts/render_mp4.py"
