#!/bin/bash
# Rebuild Demo 6 from scripts/whisky.py (voices: ElevenLabs, key in the repo .env.local).
# Cast, room art, voices and the thermal controller come from the Sengoku banquet demo (loaded by path, never modified).
set -e
cd "$(dirname "$0")"
python3 scripts/cutout_whisky.py   # ../suntory/*.png (black background) → assets/whisky/*.png
python3 scripts/make_voice.py      # every line × 3 takes → audio/takes/
python3 scripts/make_audio.py      # voices + ice / highball / chilled glass (cool) + foley + koto → binaural mix
python3 scripts/make_thermal.py    # Nobunaga → L heat, Ieyasu → R heat, cold whisky moments at their own side
python3 scripts/make_export.py     # whisky webp, subtitles ja + en (your lines text-only), media/data.js
python3 scripts/make_docs.py       # storyboard/script_150s.md
python3 scripts/check.py           # QA → analysis/qa_report.json
echo "done — open index.html (or ./start_demo.command); MP4: python3 scripts/render_mp4.py"
