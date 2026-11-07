#!/usr/bin/env python3
"""Jin's voice — the user's pick "j6": 青山龍星 不機嫌, pitch −0.02, intonation 1.20, speed 0.90, pauses ×1.4, close-mic EQ.
mode 'c' (closer): pitch −0.01 more, intonation ×0.9, speed ×0.92 · mode 'w' (at your ear): 囁き, slower, light breath.
Reads ../lines.js → media/voice/<id>.m4a + media/voice.js. Only re-voices changed lines (audio/voice_cache.json). Needs VOICEVOX."""
import importlib.util, json, os, subprocess, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('vt', os.path.join(ROOT, 'scripts', 'vtools.py'))
V = importlib.util.module_from_spec(spec); spec.loader.exec_module(V)
PITCH, INTON, SPEED, PAUSE = -.02, 1.20, .90, 1.4
MODES = {'n': ('不機嫌', 0, 1.0, 1.0, 0), 'c': ('不機嫌', -.01, .9, .92, 0), 'w': ('囁き', -.01, 1.0, .9, .35)}
src = open(os.path.join(ROOT, 'lines.js'), encoding='utf-8').read()
LINES = json.loads(src[src.index('= {') + 2:src.rindex('}') + 1])
out = os.path.join(ROOT, 'media', 'voice'); os.makedirs(out, exist_ok=True)
cache_p = os.path.join(ROOT, 'audio', 'voice_cache.json'); cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}
st = {t['name']: t['id'] for s in json.loads(urllib.request.urlopen(f'{V.API}/speakers').read()) if s['name'] == '青山龍星' for t in s['styles']}


def dur(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True)
    return round(float(r.stdout.strip().strip(',')), 3)


durs = {}
for lid, v in LINES.items():
    mode = v[2]; text = v[3] if len(v) > 3 else v[0]
    style, po, io, so, br = MODES[mode]
    key = json.dumps([text, mode, PITCH, INTON, SPEED, PAUSE, MODES[mode]])
    dst = os.path.join(out, lid + '.m4a')
    if cache.get(lid) != key or not os.path.exists(dst):
        w = V.tts(text, st[style], PITCH + po, INTON * io, SPEED * so, PAUSE)
        if br: w = V.breathe(w, br)
        V.save(w, dst, 1.0, True); cache[lid] = key; print('voiced', lid, text)
    durs[lid] = dur(dst)
for f in os.listdir(out):
    if f.endswith('.m4a') and f[:-4] not in LINES: os.remove(os.path.join(out, f))
json.dump(cache, open(cache_p, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(ROOT, 'media', 'voice.js'), 'w').write('window.JIN_VOICE = ' + json.dumps({'credit': 'VOICEVOX:青山龍星', 'dur': durs}) + ';\n')
print(len(durs), 'lines,', round(sum(durs.values()), 1), 's')
