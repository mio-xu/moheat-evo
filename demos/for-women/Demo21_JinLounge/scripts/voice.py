#!/usr/bin/env python3
"""Jin's voice: ElevenLabs, the user's pick "jin r1_a" (2026-11-08, tools/eleven/cast.json; earlier VOICEVOX:青山龍星 不機嫌 "j6").
Standard settings from tools/eleven/tts.py (eleven_v4, ja, stability 0.4, similarity 0.8, seed 7); delivery from the audio tags in
TAGGED below ([whispers] for the 'w' line). Reads ../lines.js → media/voice/<id>.m4a (mono AAC) + media/voice.js. Only (re)synthesizes lines whose text or voice changed (cache: audio/voice_cache.json)."""
import importlib.util, json, os, subprocess, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.abspath(os.path.join(ROOT, '..', '..', '..'))
sp = importlib.util.spec_from_file_location('eleven', os.path.join(REPO, 'tools', 'eleven', 'tts.py')); E = importlib.util.module_from_spec(sp); sp.loader.exec_module(E)
VOICE = E.voice('jin')
TAGGED = {
    'j01': '[annoyed] 遅えよ。 [smirks] …俺を待たせていいのは、お前だけだ。',
    'j02': '[commanding] 突っ立ってねえで、こっち来い。',
    'j03': '[low voice] …ほら。',
    'j04': '[chuckles] はっ…。いい反応。[teasing] 冷たいの、嫌いじゃねえだろ。',
    'j05': '[confident] 今日のライブ、どこ見てた？',
    'j06a': '[smirks] …当然だ。俺以外、見る必要ねえからな。',
    'j06b': '[annoyed] は？ …ふざけんな。[firmly] 今日から、俺だけ見てろ。',
    'j07': '[low voice] 目、逸らすな。',
    'j08': '[chuckles softly] …顔、真っ赤じゃねえか。[low voice] 可愛いな、お前。',
    'j09': '[gruffly] 寒そうにしてんじゃねえよ。[softly] …ほら、着とけ。',
    'j10': '[whispers] …今日はもう、帰さねえから。',
    'j11': '[chuckles] …冗談だ。送ってく。[smirks] …半分はな。',
}
src = open(os.path.join(ROOT, 'lines.js'), encoding='utf-8').read()
LINES = json.loads(src[src.index('= {') + 2:src.rindex('}') + 1])
out_dir = os.path.join(ROOT, 'media', 'voice'); os.makedirs(out_dir, exist_ok=True)
cache_p = os.path.join(ROOT, 'audio', 'voice_cache.json'); os.makedirs(os.path.dirname(cache_p), exist_ok=True)
cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}


def dur(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True)
    return round(float(r.stdout.strip().strip(',')), 3)


durs = {}
for lid in LINES:
    if lid not in TAGGED: raise SystemExit(f'{lid}: add its tagged text to TAGGED')
    key = f'eleven|{VOICE}|{E.MODEL}|{E.SEED}|{TAGGED[lid]}'
    m4a = os.path.join(out_dir, f'{lid}.m4a')
    if cache.get(lid) != key or not os.path.exists(m4a):
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: f.write(E.speak(TAGGED[lid], VOICE)); wav = f.name
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-af', 'loudnorm=I=-18:TP=-2', '-ar', '48000', '-c:a', 'aac', '-b:a', '112k', m4a], check=True)
        os.remove(wav); cache[lid] = key; print('voiced', lid, TAGGED[lid])
    durs[lid] = dur(m4a)
for f in os.listdir(out_dir):
    if f.endswith('.m4a') and f[:-4] not in LINES: os.remove(os.path.join(out_dir, f))
json.dump(cache, open(cache_p, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(ROOT, 'media', 'voice.js'), 'w').write('window.JIN_VOICE = ' + json.dumps({'credit': 'ElevenLabs', 'dur': durs}) + ';\n')
print(len(durs), 'lines,', round(sum(durs.values()), 1), 's')
