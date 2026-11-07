#!/usr/bin/env python3
"""Kohaku's voice: ElevenLabs, the user's pick "kohaku r1_b" (2026-11-08, tools/eleven/cast.json; earlier VOICEVOX:猫使ビィ).
Standard settings from tools/eleven/tts.py. Tag per line: OVERRIDE, else '!' → [excited], leading '…' → [softly], else [cheerful].
Reads ../lines.js → media/voice/<id>.m4a (mono AAC) and media/voice.js (durations, s). Only changed lines are re-voiced."""
import importlib.util, json, os, subprocess, tempfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.abspath(os.path.join(ROOT, '..', '..', '..'))
sp = importlib.util.spec_from_file_location('eleven', os.path.join(REPO, 'tools', 'eleven', 'tts.py')); E = importlib.util.module_from_spec(sp); sp.loader.exec_module(E)
VOICE = E.voice('kohaku')
OVERRIDE = {
    'intro2': '[shivers] さむいね…。[cheerful] まずは火をおこそう',
    'window': '[shivers] すきま風、つめたいね…',
    'ember2': '[whispers] そーっと、ふーってして',
    'blowIt': '[whispers] 息を、ふーっ',
    'dark': '[nervous] 外はまっくら。あかりがいるよ',
    'tunnel1': '[nervous] まっくら…。どっちに行こう',
    'tunnel2': '[whispers] 耳をすませて。水の音がするほうへ',
    'wrong1': '[surprised] あっ、それはまことの火…！',
    'empty': '[disappointed] からっぽ…',
}
src = open(os.path.join(ROOT, 'lines.js'), encoding='utf-8').read()
LINES = json.loads(src[src.index('= {') + 2:src.rindex('}') + 1])
out_dir = os.path.join(ROOT, 'media', 'voice'); os.makedirs(out_dir, exist_ok=True)
cache_p = os.path.join(ROOT, 'audio', 'voice_cache.json'); os.makedirs(os.path.dirname(cache_p), exist_ok=True)
cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}


def tagged(lid, ja):
    if lid in OVERRIDE: return OVERRIDE[lid]
    return ('[excited] ' if '！' in ja else '[softly] ' if ja.startswith('…') else '[cheerful] ') + ja


def dur(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True)
    return round(float(r.stdout.strip().strip(',')), 3)


durs = {}
for lid, v in LINES.items():
    text = tagged(lid, v[0]); key = f'eleven|{VOICE}|{E.MODEL}|{E.SEED}|{text}'
    m4a = os.path.join(out_dir, f'{lid}.m4a')
    if cache.get(lid) != key or not os.path.exists(m4a):
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: f.write(E.speak(text, VOICE)); wav = f.name
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-af', 'loudnorm=I=-18:TP=-2', '-ar', '48000', '-c:a', 'aac', '-b:a', '96k', m4a], check=True)
        os.remove(wav); cache[lid] = key; print('voiced', lid, text)
    durs[lid] = dur(m4a)
for f in os.listdir(out_dir):
    if f.endswith('.m4a') and f[:-4] not in LINES: os.remove(os.path.join(out_dir, f))
json.dump(cache, open(cache_p, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(ROOT, 'media', 'voice.js'), 'w').write('window.KOHAKU_VOICE = ' + json.dumps({'credit': 'ElevenLabs', 'dur': durs}) + ';\n')
print(len(durs), 'lines,', round(sum(durs.values()), 1), 's')
