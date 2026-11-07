#!/usr/bin/env python3
"""Kohaku's voice: VOICEVOX 猫使ビィ ノーマル (speaker 58), default parameters (the voice the user picked, unchanged).
Reads ../lines.js → media/voice/<id>.m4a (mono AAC) and media/voice.js (durations, s). Needs the VOICEVOX engine on :50021.
Only (re)synthesizes lines whose text changed (cache: audio/voice_cache.json)."""
import json, os, re, subprocess, sys, tempfile, urllib.parse, urllib.request
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API, SPEAKER = 'http://127.0.0.1:50021', 58
src = open(os.path.join(ROOT, 'lines.js'), encoding='utf-8').read()
LINES = json.loads(src[src.index('= {') + 2:src.rindex('}') + 1])
out_dir = os.path.join(ROOT, 'media', 'voice'); os.makedirs(out_dir, exist_ok=True)
cache_p = os.path.join(ROOT, 'audio', 'voice_cache.json'); os.makedirs(os.path.dirname(cache_p), exist_ok=True)
cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}

def tts(text):
    q = json.loads(urllib.request.urlopen(urllib.request.Request(f'{API}/audio_query?' + urllib.parse.urlencode({'text': text, 'speaker': SPEAKER}), method='POST')).read())
    q['outputSamplingRate'] = 48000; q['prePhonemeLength'] = .05; q['postPhonemeLength'] = .15
    return urllib.request.urlopen(urllib.request.Request(f'{API}/synthesis?speaker={SPEAKER}', data=json.dumps(q).encode(), headers={'Content-Type': 'application/json'})).read()

def dur(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True)
    return round(float(r.stdout.strip().strip(',')), 3)

durs = {}
for lid, v in LINES.items():
    text = v[2] if len(v) > 2 else v[0]
    m4a = os.path.join(out_dir, f'{lid}.m4a')
    if cache.get(lid) != text or not os.path.exists(m4a):
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: f.write(tts(text)); wav = f.name
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-af', 'loudnorm=I=-18:TP=-2', '-ar', '48000', '-c:a', 'aac', '-b:a', '96k', m4a], check=True)
        os.remove(wav); cache[lid] = text; print('voiced', lid, text)
    durs[lid] = dur(m4a)
for f in os.listdir(out_dir):
    if f.endswith('.m4a') and f[:-4] not in LINES: os.remove(os.path.join(out_dir, f))
json.dump(cache, open(cache_p, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(ROOT, 'media', 'voice.js'), 'w').write('window.KOHAKU_VOICE = ' + json.dumps({'credit': 'VOICEVOX:猫使ビィ', 'dur': durs}) + ';\n')
print(len(durs), 'lines,', round(sum(durs.values()), 1), 's')
