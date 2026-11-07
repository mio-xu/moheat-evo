#!/usr/bin/env python3
"""Voices for Hinata's handshake event. Reads ../lines.js → media/voice/<id>.m4a (mono AAC, dry) + media/voice.js (durations).

Hinata = VOICEVOX:白上虎太郎 ふつう (the user's pick for the 腹黒 年下 idol, Demo16_HandshakeEvent audition round 2),
variant v4 "ギャップ強め": base pitch 0, intonation ×1.15, speed ×1.0, with the per-line "two voices" of round 2:
  s sweet (public)   pitch +0.03, intonation ×1.25, speed ×1.03
  t teasing          pitch  0,    intonation ×1.10, speed ×0.95
  d dark (at ear)    pitch −0.05, intonation ×0.85, speed ×0.88, quieter
Staff = VOICEVOX:春日部つむぎ ノーマル. Only (re)synthesizes changed lines (cache: audio/voice_cache.json). Needs VOICEVOX on :50021."""
import json, os, subprocess, tempfile, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = 'http://127.0.0.1:50021'
BASE = (0, 1.15, 1.0)
STYLE = {'s': (.03, 1.25, 1.03, 0), 't': (0, 1.10, .95, 0), 'd': (-.05, .85, .88, 1), 'staff': (0, 1.0, 1.08, 0)}
src = open(os.path.join(ROOT, 'lines.js'), encoding='utf-8').read()
LINES = json.loads(src[src.index('= {') + 2:src.rindex('}') + 1])
out_dir = os.path.join(ROOT, 'media', 'voice'); os.makedirs(out_dir, exist_ok=True)
cache_p = os.path.join(ROOT, 'audio', 'voice_cache.json'); os.makedirs(os.path.dirname(cache_p), exist_ok=True)
cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}
SP = {s['name']: {t['name']: t['id'] for t in s['styles']} for s in json.loads(urllib.request.urlopen(f'{API}/speakers').read())}
HINA, STAFF = SP['白上虎太郎']['ふつう'], SP['春日部つむぎ']['ノーマル']


def tts(text, sid, pitch, inton, speed):
    q = json.loads(urllib.request.urlopen(urllib.request.Request(f'{API}/audio_query?' + urllib.parse.urlencode({'text': text, 'speaker': sid}), method='POST')).read())
    q.update(outputSamplingRate=48000, prePhonemeLength=.08, postPhonemeLength=.2, pitchScale=pitch, intonationScale=inton, speedScale=speed)
    return urllib.request.urlopen(urllib.request.Request(f'{API}/synthesis?speaker={sid}', data=json.dumps(q).encode(), headers={'Content-Type': 'application/json'})).read()


def dur(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True)
    return round(float(r.stdout.strip().strip(',')), 3)


durs = {}
for lid, v in LINES.items():
    style = v[2]; text = v[3] if len(v) > 3 else v[0]
    po, io, so, quiet = STYLE[style]
    if style == 'staff': sid, pitch, inton, speed = STAFF, po, io, so
    else: sid, pitch, inton, speed = HINA, BASE[0] + po, BASE[1] * io, BASE[2] * so
    key = f'{text}|{style}|{sid}|{pitch}|{inton}|{speed}'
    m4a = os.path.join(out_dir, f'{lid}.m4a')
    if cache.get(lid) != key or not os.path.exists(m4a):
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: f.write(tts(text, sid, pitch, inton, speed)); wav = f.name
        af = 'loudnorm=I=-18:TP=-2'   # 'd' lines are played quieter in the browser (they are right at your ear)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-af', af, '-ar', '48000', '-c:a', 'aac', '-b:a', '112k', m4a], check=True)
        os.remove(wav); cache[lid] = key; print('voiced', lid, text)
    durs[lid] = dur(m4a)
for f in os.listdir(out_dir):
    if f.endswith('.m4a') and f[:-4] not in LINES: os.remove(os.path.join(out_dir, f))
json.dump(cache, open(cache_p, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(ROOT, 'media', 'voice.js'), 'w').write('window.HINA_VOICE = ' + json.dumps({'dur': durs}) + ';\n')
print(len(durs), 'lines,', round(sum(durs.values()), 1), 's')
