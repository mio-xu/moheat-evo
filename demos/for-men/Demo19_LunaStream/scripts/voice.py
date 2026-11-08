#!/usr/bin/env python3
"""Luna's voice: ElevenLabs (tools/eleven/cast.json "luna", r1_b, confirmed 2026-11-08).
Standard settings from tools/eleven/tts.py (eleven_v4, ja, stability 0.4, similarity 0.8, seed 7); delivery from the audio tags in
TAGGED below ([whispers] at your ear). Reads ../lines.js → media/voice/<id>.m4a (mono AAC) + media/voice.js. Only (re)synthesizes lines whose text or voice changed (cache: audio/voice_cache.json)."""
import importlib.util, json, os, subprocess, tempfile, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.abspath(os.path.join(ROOT, '..', '..', '..'))
sp = importlib.util.spec_from_file_location('eleven', os.path.join(REPO, 'tools', 'eleven', 'tts.py')); E = importlib.util.module_from_spec(sp); sp.loader.exec_module(E)
VOICE = E.voice('luna')
TAGGED = {
    'l01': '[softly] …ラストオーダー、もう過ぎてるけど。 [playful] …あなたは、特別。',
    'l02': '[softly] ここ、昼間はただのバー。 夜中のこの時間だけ…わたしがシェイカーを振るの。 [whispers] …ないしょね。',
    'l03': '[softly] …ご注文は？',
    'l04a': '[softly] …おまかせ、ね。 [playful] いい答え。',
    'l04b': '[laughs softly] …ふふ。 強がらなくていいのに。 [playful] …ちゃんと帰れる強さにしてあげる。',
    'l05': '[whispers] …つめたいの、好き？',
    'l06': '[laughs softly] …ふふ。 いい顔。 [softly] …それが見たかったの。',
    'l07': '[softly] …ねえ。 ひとつ言葉をちょうだい。 その言葉で、一杯つくってあげる。',
    'l08a': '[surprised] …月。 [softly] …わたしの名前、知ってて言ってる？ [playful] …ずるい人。',
    'l08b': '[softly] …夜明け。 …わたしがいちばん苦手な時間。 [whispers] …でも、あなたとなら、見てみたいかも。',
    'l09': '[softly] …灯り、落とすね。 [whispers] …よく見てて。 まばたき、しないで。',
    'l10': '[softly] …きれいでしょ。 …すぐ消えちゃうから、きれいなの。',
    'l10x': '[playful] …あ、まばたきした。 [laughs softly] …ふふ、もう一回、見せてあげる。',
    'l11': '[softly] …今夜はもう、閉店。 [shy] …となり、座ってもいい？',
    'l12': '[softly] …わたしも一杯だけ。 アイリッシュコーヒー。 …あったかいの、持ってて。',
    'l13': '[playful] …乾杯、しよっか。 なにに乾杯する？',
    'l14a': '[softly] …ふたりの夜に。 …乾杯。',
    'l14b': '[surprised] …わたしに？ [laughs softly] …ふふ、ずるい。 [softly] …乾杯。',
    'l15': '[whispers] …ねえ。 ルナって、本当の名前じゃないの。 …本当の名前、あなたにだけ、教えてあげる。',
    'l16': '[whispers] …「つき」。 …宵月、つき。 …ほかの人には、ないしょよ。',
    'l17a': '[flustered] …っ。 [whispers] …ずるい。 …もう一回、呼んで。',
    'l17b': '[whispers] …毎晩、この時間。 カウンターの、いちばん端の席、空けておくわ。',
}
src = open(os.path.join(ROOT, 'lines.js'), encoding='utf-8').read()
LINES = json.loads(src[src.index('window.LUNA_LINES = {') + 19:src.rindex('}') + 1])
out_dir = os.path.join(ROOT, 'media', 'voice'); os.makedirs(out_dir, exist_ok=True)
# Dubbed takes (user 2026-11-09: every demo voiced in ja / en / zh): python3 scripts/voice.py --lang en|zh [--count]
#   → media/voice/<lang>/<id>.m4a + index.json (tools/eleven/dub.py: same voice / settings, the ja tags moved into the en / zh text).
#   Text = the subtitles: en from lines.js, zh from l10n.js. Names stay Japanese-style (NAMES).
NAMES = {"zh": [["露娜", "Luna"]]}
OVERRIDE = {}                                                       # (lang, id) → hand-tagged text when retag() is not good enough
LANG = sys.argv[sys.argv.index('--lang') + 1] if '--lang' in sys.argv else 'ja'
if LANG != 'ja':
    sp = importlib.util.spec_from_file_location('dub', os.path.join(REPO, 'tools', 'eleven', 'dub.py')); D = importlib.util.module_from_spec(sp); sp.loader.exec_module(D)
    l10 = open(os.path.join(ROOT, 'l10n.js'), encoding='utf-8').read(); L10N = json.loads(l10[l10.index('= {') + 2:l10.rindex('}') + 1])
    sub = {k: (v[1] if LANG == 'en' else L10N['text'][LANG][v[0]]) for k, v in LINES.items()}
    lines = {k: (VOICE, OVERRIDE.get((LANG, k)) or D.retag(TAGGED[k], D.names(sub[k], LANG, NAMES), LANG)) for k in LINES}
    D.render(lines, LANG, os.path.join(out_dir, LANG), os.path.join(ROOT, 'audio', f'voice_cache.{LANG}.json'), count_only='--count' in sys.argv)
    sys.exit()
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
open(os.path.join(ROOT, 'media', 'voice.js'), 'w').write('window.LUNA_VOICE = ' + json.dumps({'credit': 'ElevenLabs', 'dur': durs}) + ';\n')
print(len(durs), 'lines,', round(sum(durs.values()), 1), 's')
