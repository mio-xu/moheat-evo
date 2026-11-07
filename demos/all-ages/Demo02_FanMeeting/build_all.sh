#!/bin/bash
# Rebuild Demo 2 from tools/fanmeeting.py (needs the VOICEVOX engine: ../Demo01_SnowFoxfire/start_voicevox.command).
set -e
cd "$(dirname "$0")"
python3 tools/retime_voices.py  # ElevenLabs voices + song at natural length → audio/retime.json
python3 tools/build_audio.py   # voice, song, warm breaths (heat) · fan / ice / magic (cool) · music · binaural mix
python3 tools/thermal.py       # heat = voice RMS × Ayane's position, cool = SFX RMS × the cooling source's position
python3 tools/export.py        # subtitles ja / zh / en + media/data.js
python3 tools/docs.py          # production/02_script.md
echo "done — open index.html (or ./start_demo.command); MP4: python3 tools/render_mp4.py"
