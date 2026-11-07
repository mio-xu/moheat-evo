#!/usr/bin/env python3
"""Ren's voice: ElevenLabs, the user's pick "ren r1_c" (2026-11-08, tools/eleven/cast.json; earlier VOICEVOX:青山龍星 "a4").
Standard settings from tools/eleven/tts.py (eleven_v4, ja, stability 0.4, similarity 0.8, seed 7); delivery from the audio tags in
TAGGED below ([whispers] for the 'w' lines). Reads ../lines.js → media/voice/<id>.m4a (mono AAC, dry; the phone filter is applied live
in the browser) + media/voice.js. Only (re)synthesizes lines whose text or voice changed (cache: audio/voice_cache.json)."""
import importlib.util, json, os, subprocess, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.abspath(os.path.join(ROOT, '..', '..', '..'))
sp = importlib.util.spec_from_file_location('eleven', os.path.join(REPO, 'tools', 'eleven', 'tts.py')); E = importlib.util.module_from_spec(sp); sp.loader.exec_module(E)
VOICE = E.voice('ren')
TAGGED = {
    'c01': '[softly] …もしもし？',
    'c02': '[softly] ごめん、こんな時間に。起こしちゃった？',
    'c03a': '[relieved] よかった。[softly] …なんか、声が聞きたくなって',
    'c03b': '[laughs softly] あはは、ごめんね。[softly] …でも、どうしても声が聞きたくて',
    'c04': '[warmly] 今日のライブ、ちゃんと見ててくれた？',
    'c05a': '[surprised] え、かっこよかった？ [shy] …そっか。なんか、照れるな',
    'c05b': '[happy] やっぱり！ アンコールのとき、目が合った気がしたんだ',
    'c06': '[softly] 今ね、帰り道。外、すっごい寒くて…',
    'c07': '[curious] ねえ、窓の外、見てみて。雪、降ってない？',
    'c08': '[warmly] ね。同じ雪、見てる',
    'c09': '[softly] …でも寒いでしょ。風邪ひくから、窓、閉めて？',
    'c10': '[softly] …ねえ。反対の耳でも、聞いてて',
    'c11': '[whispers] …うん。こっちのほうが、近い気がする',
    'c12': '[whispers] 今から言うこと、誰にも内緒ね',
    'c13': '[whispers] ステージから、ずっと探してた。…きみのこと',
    'c14': '[whispers] …ねえ。おやすみって、言って？',
    'c15': '[chuckles softly] …ふふ。[whispers] ずるいな、その声',
    'c16': '[softly] …あのさ。まだ、切らないで',
    'c17': '[softly] …今の音、聞こえた？ 玄関、開けてみて',
    'c18': '[shy] …来ちゃった',
    'c19': '[out of breath] 雪の中、走ってきた。[softly] …寒かったから、あっためて？',
    'c20': '[whispers] …会いたかった',
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
open(os.path.join(ROOT, 'media', 'voice.js'), 'w').write('window.REN_VOICE = ' + json.dumps({'credit': 'ElevenLabs', 'dur': durs}) + ';\n')
print(len(durs), 'lines,', round(sum(durs.values()), 1), 's')
