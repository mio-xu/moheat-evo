#!/usr/bin/env python3
"""Ren's voice: VOICEVOX 青山龍星, the user's pick "a4": しっとり (whisper lines 囁き), pitch +0.03, intonation 1.20,
speed 1.02 (whispers ×0.9), formant ×1.06 (synthesized at pitch −ln 1.06, then asetrate ×1.06 + atempo 1/1.06 → same pitch).
Reads ../lines.js → media/voice/<id>.m4a (mono AAC, dry; the phone filter is applied live in the browser) + media/voice.js.
Only (re)synthesizes lines whose text or settings changed (cache: audio/voice_cache.json). Needs VOICEVOX on :50021."""
import json, math, os, subprocess, tempfile, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = 'http://127.0.0.1:50021'
PITCH, INTON, SPEED, K = .03, 1.20, 1.02, 1.06
src = open(os.path.join(ROOT, 'lines.js'), encoding='utf-8').read()
LINES = json.loads(src[src.index('= {') + 2:src.rindex('}') + 1])
out_dir = os.path.join(ROOT, 'media', 'voice'); os.makedirs(out_dir, exist_ok=True)
cache_p = os.path.join(ROOT, 'audio', 'voice_cache.json'); os.makedirs(os.path.dirname(cache_p), exist_ok=True)
cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}
styles = {t['name']: t['id'] for s in json.loads(urllib.request.urlopen(f'{API}/speakers').read()) if s['name'] == '青山龍星' for t in s['styles']}


def tts(text, sid, speed):
    q = json.loads(urllib.request.urlopen(urllib.request.Request(f'{API}/audio_query?' + urllib.parse.urlencode({'text': text, 'speaker': sid}), method='POST')).read())
    q.update(outputSamplingRate=48000, prePhonemeLength=.08, postPhonemeLength=.2, pitchScale=PITCH - math.log(K), intonationScale=INTON, speedScale=speed)
    return urllib.request.urlopen(urllib.request.Request(f'{API}/synthesis?speaker={sid}', data=json.dumps(q).encode(), headers={'Content-Type': 'application/json'})).read()


def dur(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True)
    return round(float(r.stdout.strip().strip(',')), 3)


durs = {}
for lid, v in LINES.items():
    style = v[2]; text = v[3] if len(v) > 3 else v[0]
    key = f'{text}|{style}|{PITCH}|{INTON}|{SPEED}|{K}'
    m4a = os.path.join(out_dir, f'{lid}.m4a')
    if cache.get(lid) != key or not os.path.exists(m4a):
        sid = styles['囁き' if style == 'w' else 'しっとり']
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: f.write(tts(text, sid, SPEED * (.9 if style == 'w' else 1))); wav = f.name
        af = f'asetrate={round(48000 * K)},aresample=48000,atempo={1 / K:.5f},loudnorm=I=-18:TP=-2'
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-af', af, '-ar', '48000', '-c:a', 'aac', '-b:a', '112k', m4a], check=True)
        os.remove(wav); cache[lid] = key; print('voiced', lid, text)
    durs[lid] = dur(m4a)
for f in os.listdir(out_dir):
    if f.endswith('.m4a') and f[:-4] not in LINES: os.remove(os.path.join(out_dir, f))
json.dump(cache, open(cache_p, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(ROOT, 'media', 'voice.js'), 'w').write('window.REN_VOICE = ' + json.dumps({'credit': 'VOICEVOX:青山龍星', 'dur': durs}) + ';\n')
print(len(durs), 'lines,', round(sum(durs.values()), 1), 's')
