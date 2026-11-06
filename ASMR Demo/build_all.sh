#!/bin/bash
# Rebuild every generated asset from tools/story.py (≈1 min). Order matters.
set -e
cd "$(dirname "$0")"
python3 tools/build_audio.py   # voices, breaths, magic, binaural mix  → output/, media/mix.m4a
python3 tools/thermal.py       # RMS × position → 4-channel CSV        → media/thermal.csv, output/
python3 tools/export.py        # subtitles + animation data            → media/*.vtt, media/data.js
echo "done — open index.html (or ./start_demo.command)"
