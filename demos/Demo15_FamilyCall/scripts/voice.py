#!/usr/bin/env python3
"""Voices for the family call (user's picks from scripts/audition2.py):
  grandma Hana = VOICEVOX:もち子さん のんびり "g3": pitch −0.09, intonation 1.30, speed 0.86, formant ×0.92, tremor 0.06
  grandpa Gen  = VOICEVOX:ちび式じい "k1":        pitch −0.04, intonation 1.20, speed 0.90, formant ×0.95
Formant trick (as Demo 12): synthesize at pitch − ln K, then asetrate ×K + atempo 1/K → same pitch, formants ×K.
Reads ../lines.js → media/voice/<id>.m4a (mono AAC, dry; the phone filter is applied live) + media/voice.js.
Only (re)synthesizes lines whose text or settings changed (cache: audio/voice_cache.json). Needs VOICEVOX on :50021."""
import json, math, os, subprocess, tempfile, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = 'http://127.0.0.1:50021'
CAST = {'gm': ('もち子さん', 'のんびり', -.09, 1.30, .86, .92, .06), 'gp': ('ちび式じい', 'ノーマル', -.04, 1.20, .90, .95, 0)}
src = open(os.path.join(ROOT, 'lines.js'), encoding='utf-8').read()
LINES = json.loads(src[src.index('= {') + 2:src.rindex('}') + 1])
out_dir = os.path.join(ROOT, 'media', 'voice'); os.makedirs(out_dir, exist_ok=True)
cache_p = os.path.join(ROOT, 'audio', 'voice_cache.json'); os.makedirs(os.path.dirname(cache_p), exist_ok=True)
cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}
spk = {s['name']: {t['name']: t['id'] for t in s['styles']} for s in json.loads(urllib.request.urlopen(f'{API}/speakers').read())}


def tts(text, sid, pitch, inton, speed):
    q = json.loads(urllib.request.urlopen(urllib.request.Request(f'{API}/audio_query?' + urllib.parse.urlencode({'text': text, 'speaker': sid}), method='POST')).read())
    q.update(outputSamplingRate=48000, prePhonemeLength=.08, postPhonemeLength=.2, pitchScale=pitch, intonationScale=inton, speedScale=speed)
    return urllib.request.urlopen(urllib.request.Request(f'{API}/synthesis?speaker={sid}', data=json.dumps(q).encode(), headers={'Content-Type': 'application/json'})).read()


def dur(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True)
    return round(float(r.stdout.strip().strip(',')), 3)


durs = {}
for lid, v in LINES.items():
    who, text = v[0], (v[3] if len(v) > 3 else v[1])
    sp, st, pitch, inton, speed, K, trem = CAST[who]
    key = f'{text}|{CAST[who]}'
    m4a = os.path.join(out_dir, f'{lid}.m4a')
    if cache.get(lid) != key or not os.path.exists(m4a):
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: f.write(tts(text, spk[sp][st], pitch - math.log(K), inton, speed)); wav = f.name
        af = [f'asetrate={round(48000 * K)}', 'aresample=48000', f'atempo={1 / K:.5f}'] + ([f'vibrato=f=5.5:d={trem}'] if trem else []) + ['loudnorm=I=-18:TP=-2']
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-af', ','.join(af), '-ar', '48000', '-c:a', 'aac', '-b:a', '112k', m4a], check=True)
        os.remove(wav); cache[lid] = key; print('voiced', lid, text)
    durs[lid] = dur(m4a)
for f in os.listdir(out_dir):
    if f.endswith('.m4a') and f[:-4] not in LINES: os.remove(os.path.join(out_dir, f))
json.dump(cache, open(cache_p, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(ROOT, 'media', 'voice.js'), 'w').write('window.FAMILY_VOICE = ' + json.dumps({'credit': 'VOICEVOX:もち子さん / VOICEVOX:ちび式じい', 'dur': durs}) + ';\n')
print(len(durs), 'lines,', round(sum(durs.values()), 1), 's')
