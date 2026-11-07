#!/bin/bash
# Rebuild Demo 7 from scripts/izakaya.py (needs VOICEVOX: ../Demo1_SnowFoxfire/start_voicevox.command).
# Cast, voices and the thermal controller come from the Sengoku banquet demo (Demo 5, loaded by path, never modified).
set -e
cd "$(dirname "$0")"
python3 scripts/make_voice.py      # every line × 3 takes → audio/takes/
python3 scripts/make_audio.py      # voices + snow wind / cold beer / highball (cool) + grill / hot sake (warm) + murmur, tap, clink, koto
python3 scripts/make_thermal.py    # Nobunaga → L heat, Ieyasu → R heat, cool and warm ambience at their own side
python3 scripts/make_export.py     # backgrounds + props webp, subtitles ja + en (your lines text-only), media/data.js
python3 scripts/make_docs.py       # storyboard/script_150s.md
python3 scripts/check.py           # QA → analysis/qa_report.json
echo "done — open index.html (or ./start_demo.command); MP4: python3 scripts/render_mp4.py"
