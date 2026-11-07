#!/usr/bin/env python3
"""Voices for the family call: ElevenLabs, the user's picks (2026-11-08, tools/eleven/cast.json; earlier VOICEVOX もち子さん / ちび式じい):
grandma Hana 'gm' = hana r1_c, grandpa Gen 'gp' = gen r1_a. Standard settings from tools/eleven/tts.py.
Tag per line: OVERRIDE, else '!' → [excited], leading '…' → [softly], else the speaker's default (Hana [warmly], Gen [gruffly]).
Reads ../lines.js → media/voice/<id>.m4a (mono AAC, dry; the phone filter is applied live) + media/voice.js. Only changed lines re-voiced."""
import importlib.util, json, os, subprocess, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.abspath(os.path.join(ROOT, '..', '..', '..'))
sp = importlib.util.spec_from_file_location('eleven', os.path.join(REPO, 'tools', 'eleven', 'tts.py')); E = importlib.util.module_from_spec(sp); sp.loader.exec_module(E)
VOICES = {'gm': E.voice('hana'), 'gp': E.voice('gen')}
DEFAULT = {'gm': '[warmly]', 'gp': '[gruffly]'}
OVERRIDE = {
    'g07b': '[worried] まあ！ そりゃいけん！ 野菜も食べんさいよ',
    'g12': '[giggles] ふふふ、よかったぁ。夜なべして編んだかいがあったわ',
    'g19': '[giggles] ふふ、いやよ。あんたから切って？',
    'g20': '[softly] おばあちゃんも、だーいすきよ',
    'p00': '[surprised] なにぃ？ 孫じゃと！？',
    'p04b': '[excited] ほうか！ [chuckles] ふっふっふ…それならええもんがあるぞ',
    'p08b': '[proudly] …どうじゃ、つめたかろう！ [laughs heartily] わっはっは',
    'p11a': '[moved] …そうか。…そうか',
    'p14': '[shy] …ばあさんから切れ',
}
src = open(os.path.join(ROOT, 'lines.js'), encoding='utf-8').read()
LINES = json.loads(src[src.index('= {') + 2:src.rindex('}') + 1])
out_dir = os.path.join(ROOT, 'media', 'voice'); os.makedirs(out_dir, exist_ok=True)
cache_p = os.path.join(ROOT, 'audio', 'voice_cache.json'); os.makedirs(os.path.dirname(cache_p), exist_ok=True)
cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}


def tagged(lid, who, ja):
    if lid in OVERRIDE: return OVERRIDE[lid]
    return ('[excited] ' if '！' in ja else '[softly] ' if ja.startswith('…') else DEFAULT[who] + ' ') + ja


def dur(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True)
    return round(float(r.stdout.strip().strip(',')), 3)


durs = {}
for lid, v in LINES.items():
    who = v[0]; text = tagged(lid, who, v[1]); key = f'eleven|{VOICES[who]}|{E.MODEL}|{E.SEED}|{text}'
    m4a = os.path.join(out_dir, f'{lid}.m4a')
    if cache.get(lid) != key or not os.path.exists(m4a):
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: f.write(E.speak(text, VOICES[who])); wav = f.name
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-af', 'loudnorm=I=-18:TP=-2', '-ar', '48000', '-c:a', 'aac', '-b:a', '112k', m4a], check=True)
        os.remove(wav); cache[lid] = key; print('voiced', lid, text)
    durs[lid] = dur(m4a)
for f in os.listdir(out_dir):
    if f.endswith('.m4a') and f[:-4] not in LINES: os.remove(os.path.join(out_dir, f))
json.dump(cache, open(cache_p, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(ROOT, 'media', 'voice.js'), 'w').write('window.FAMILY_VOICE = ' + json.dumps({'credit': 'ElevenLabs', 'dur': durs}) + ';\n')
print(len(durs), 'lines,', round(sum(durs.values()), 1), 's')
