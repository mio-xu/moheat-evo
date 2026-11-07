#!/usr/bin/env python3
"""Voice every say / whisper line (ElevenLabs, cached by build_audio.tts) at its natural length and write audio/retime.json, so the
film grows where a line would run into the next one (user, 2026-11-08: no need to keep 150 s). Run before build_audio.py."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import story as S
import build_audio as BA

durs = {i: len(BA.tts(c["tts"], c["who"], whisper=(c["kind"] == "whisper"), expr=c["expr"])) / BA.SR
        for i, c in enumerate(S.CUES0) if c["kind"] in ("say", "whisper")}
pts = S._R.compute(S.CUES0, durs)
os.makedirs(os.path.join(S._ROOT, "audio"), exist_ok=True)
json.dump(pts, open(os.path.join(S._ROOT, "audio", "retime.json"), "w"))
print(f"retime: {len(pts)} gaps, +{sum(e for _, e in pts):.1f} s → film {S.DURATION0 + sum(e for _, e in pts):.1f} s")
