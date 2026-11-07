#!/usr/bin/env python3
"""Voice every say / whisper line (ElevenLabs, cached by Demo 1's tts) at its natural length, count the sung lines of the ElevenLabs song,
and write audio/retime.json so the film grows where a line would run into the next (user, 2026-11-08: no need to keep 150 s)."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fanmeeting as FM
import build_audio as BA

BA.B.BACKEND = "eleven"
durs = {}
for i, c in enumerate(FM.CUES0):
    if c["kind"] in ("say", "whisper"): durs[i] = len(BA.B.tts(c["tts"], "A", whisper=(c["kind"] == "whisper"), expr=c["expr"])) / BA.SR
    elif c["kind"] == "sing": p0, p1 = FM.SONG_PHRASES[c["phrase"]]; durs[i] = p1 - p0
pts = FM._R.compute(FM.CUES0, durs)
os.makedirs(os.path.join(FM._ROOT, "audio"), exist_ok=True)
json.dump(pts, open(os.path.join(FM._ROOT, "audio", "retime.json"), "w"))
print(f"retime: {len(pts)} gaps, +{sum(e for _, e in pts):.1f} s → film {FM.DURATION0 + sum(e for _, e in pts):.1f} s")
