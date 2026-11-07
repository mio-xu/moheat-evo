#!/usr/bin/env python3
"""Streamer voices (the user's picks from the audition):
  Mint  m.. = VOICEVOX 四国めたん "m2": talk ささやき, whisper ヒソヒソ, pitch 0, intonation 1.00, speed 0.92 (whispers ×0.88)
  Cocoa c.. = VOICEVOX ユーレイちゃん "c2": talk 甘々, whisper ささやき, pitch 0, intonation 1.20, speed 1.00 (whispers ×0.88)
Reads ../lines.js → media/voice/<id>.m4a (mono AAC, dry; placed live in the browser with HRTF) + media/voice.js.
Only (re)synthesizes lines whose text or settings changed (cache: audio/voice_cache.json). Needs VOICEVOX on :50021."""
import json, os, subprocess, tempfile, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = 'http://127.0.0.1:50021'
VOICE = {  # prefix: (speaker, talk style, whisper style, pitch, intonation, speed)
    'm': ('四国めたん', 'ささやき', 'ヒソヒソ', .00, 1.00, .92),
    'c': ('ユーレイちゃん', '甘々', 'ささやき', .00, 1.20, 1.00),
}
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
    sp, st, wst, pitch, inton, speed = VOICE[lid[0]]
    style = v[2]; text = v[3] if len(v) > 3 else v[0]
    key = f'{sp}|{text}|{style}|{pitch}|{inton}|{speed}'
    m4a = os.path.join(out_dir, f'{lid}.m4a')
    if cache.get(lid) != key or not os.path.exists(m4a):
        w = style == 'w'
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: f.write(tts(text, spk[sp][wst if w else st], pitch, inton, speed * (.88 if w else 1))); wav = f.name
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-af', 'loudnorm=I=-18:TP=-2', '-ar', '48000', '-c:a', 'aac', '-b:a', '112k', m4a], check=True)
        os.remove(wav); cache[lid] = key; print('voiced', lid, text)
    durs[lid] = dur(m4a)
for f in os.listdir(out_dir):
    if f.endswith('.m4a') and f[:-4] not in LINES: os.remove(os.path.join(out_dir, f))
json.dump(cache, open(cache_p, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(ROOT, 'media', 'voice.js'), 'w').write('window.STREAM_VOICE = ' + json.dumps({'credit': {'m': 'VOICEVOX:四国めたん', 'c': 'VOICEVOX:ユーレイちゃん'}, 'dur': durs}) + ';\n')
print(len(durs), 'lines,', round(sum(durs.values()), 1), 's')
