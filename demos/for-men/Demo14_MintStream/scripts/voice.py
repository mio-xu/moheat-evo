#!/usr/bin/env python3
"""Streamer voices: ElevenLabs, the user's picks (2026-11-08, tools/eleven/cast.json; earlier VOICEVOX):
Mint m.. = mint r1_a · Cocoa c.. = cocoa r1_a · Hinata h.. = hinata_s r1_b · Luna l.. = luna r1_b.
Standard settings from tools/eleven/tts.py. Delivery = audio tags: TALK[prefix] for 'n' lines, [whispers] for 'w' lines, OVERRIDE for
special lines (blowing, spicy shouts, laughs). Reads ../lines.js → media/voice/<id>.m4a + media/voice.js. Only changed lines are re-voiced."""
import importlib.util, json, os, subprocess, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.abspath(os.path.join(ROOT, '..', '..', '..'))
sp = importlib.util.spec_from_file_location('eleven', os.path.join(REPO, 'tools', 'eleven', 'tts.py')); E = importlib.util.module_from_spec(sp); sp.loader.exec_module(E)
CAST = {'m': 'mint', 'c': 'cocoa', 'h': 'hinata_s', 'l': 'luna'}
NAME = {'m': 'ミント', 'c': 'ココア', 'h': 'ひなた', 'l': 'ルナ'}
TALK = {'m': '[softly]', 'c': '[cheerful]', 'h': '[excited]', 'l': '[softly]'}
OVERRIDE = {
    'm07': '[whispers] …いきますよ。[blows softly] …ふぅー',
    'm10': '[blows softly] …ふぅー。…ふぅー',
    'm18': '[chuckles softly] …ふふ。[whispers] じゃあ、さいごに、ないしょばなし',
    'c05': '[giggles] …あ、コメント。「ふーふーして」？ もう、あまえんぼさんだなあ',
    'c06': '[blows] …ふーっ、ふーっ',
    'c08': '[softly] …おいしい？ [giggles] えへへ。いっしょにのむと、もっとおいしいね',
    'c10': '[curious] …あれ？ おそと、あめ、ふってきたみたい',
    'c11': '[softly] ちょっと、さむくなってきたね。…ブランケット、いっしょに、はいろ？',
    'h03b': '[giggles] えへへ、やさしい〜。[determined] でも、やるって決めたからっ！',
    'h05': '[shouting] …からっ！ からいからい！ 口から火が出そうっ！',
    'h06m': '[relieved] 牛乳！ たすかる〜！ [sighs happily] …ぷはーっ、ひんやり〜',
    'h06f': '[relieved] 扇風機！ ありがと〜！ [sighs happily] …あ〜、風きもちいい〜',
    'h10': '[shy] [whispers] …えへへ、ここだけのはなしね。ほんとは、ちょっとだけ緊張してたんだ',
    'l03': '[chuckles softly] …ふふ。[softly] 夜の風って、すき。…でも、冷えすぎないでね',
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
