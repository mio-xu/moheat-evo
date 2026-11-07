#!/usr/bin/env python3
"""Gaku's voice: ElevenLabs gaku r2_a (user's pick 2026-11-08, tools/eleven/cast.json). Standard settings from tools/eleven/tts.py.
Delivery = audio tags: [softly] for 'n' lines, [whispers] for 'w' lines, OVERRIDE for special lines.
Reads ../lines.js → media/voice/<id>.m4a + media/voice.js. Only changed lines are re-voiced (audio/voice_cache.json)."""
import importlib.util, json, os, subprocess, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.abspath(os.path.join(ROOT, '..', '..', '..'))
sp = importlib.util.spec_from_file_location('eleven', os.path.join(REPO, 'tools', 'eleven', 'tts.py')); E = importlib.util.module_from_spec(sp); sp.loader.exec_module(E)
CAST = {'g': 'gaku'}
TALK = {'g': '[softly]'}
OVERRIDE = {
    'g01': '[surprised] …あ。[softly] もう、映ってる？',
    'g03': '[sighs softly] …顔の話は、いいって。[softly] …焚き火、見てくれ',
    'g10': '[softly] …ほら。[warmly] 俺が、壁になるから',
    'g12a': '[shy] [whispers] …べつに。…風よけ、なだけ',
    'g12b': '[chuckles softly] [whispers] …近いか。…悪い。…でも、どかない',
    'g15': '[shy] …ひとりキャンプなのに、…ひとりじゃないみたいだ',
    'g16': '[surprised] [softly] …雪だ',
    'g21': '[whispers] …顔、顔って言われるけどさ。[sighs softly] …ほんとは、声、聞いてほしかった。…お前に',
}
src = open(os.path.join(ROOT, 'lines.js'), encoding='utf-8').read()
LINES = json.loads(src[src.index('= {') + 2:src.rindex('}') + 1])
out_dir = os.path.join(ROOT, 'media', 'voice'); os.makedirs(out_dir, exist_ok=True)
cache_p = os.path.join(ROOT, 'audio', 'voice_cache.json'); os.makedirs(os.path.dirname(cache_p), exist_ok=True)
cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}
VOICES = {p: E.voice(c) for p, c in CAST.items()}


def dur(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True)
    return round(float(r.stdout.strip().strip(',')), 3)


durs = {}
for lid, v in LINES.items():
    p = lid[0]; text = OVERRIDE.get(lid) or ('[whispers] ' if v[2] == 'w' else TALK[p] + ' ') + v[0]
    key = f'eleven|{VOICES[p]}|{E.MODEL}|{E.SEED}|{text}'
    m4a = os.path.join(out_dir, f'{lid}.m4a')
    if cache.get(lid) != key or not os.path.exists(m4a):
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: f.write(E.speak(text, VOICES[p])); wav = f.name
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-af', 'loudnorm=I=-18:TP=-2', '-ar', '48000', '-c:a', 'aac', '-b:a', '112k', m4a], check=True)
        os.remove(wav); cache[lid] = key; print('voiced', lid, text)
    durs[lid] = dur(m4a)
for f in os.listdir(out_dir):
    if f.endswith('.m4a') and f[:-4] not in LINES: os.remove(os.path.join(out_dir, f))
json.dump(cache, open(cache_p, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(ROOT, 'media', 'voice.js'), 'w').write('window.STREAM_VOICE = ' + json.dumps({'credit': {p: 'ElevenLabs' for p in CAST}, 'dur': durs}) + ';\n')
print(len(durs), 'lines,', round(sum(durs.values()), 1), 's')
