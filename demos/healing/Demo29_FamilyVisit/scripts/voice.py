#!/usr/bin/env python3
"""Voices for the New Year visit: ElevenLabs, the user's picks for Demo15/16 (tools/eleven/cast.json): grandma Hana 'gm' = hana r1_c,
grandpa Gen 'gp' = gen r1_a. Standard settings from tools/eleven/tts.py; delivery from the tags in TAGGED ([whispers] at your ear).
Reads ../lines.js → media/voice/<id>.m4a (mono AAC) + media/voice.js. Only changed lines are re-voiced (cache: audio/voice_cache.json)."""
import importlib.util, json, os, subprocess, tempfile, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.abspath(os.path.join(ROOT, '..', '..', '..'))
sp = importlib.util.spec_from_file_location('eleven', os.path.join(REPO, 'tools', 'eleven', 'tts.py')); E = importlib.util.module_from_spec(sp); sp.loader.exec_module(E)
VOICES = {'gm': E.voice('hana'), 'gp': E.voice('gen')}
TAGGED = {
    'p01': '[shouting] おーい！ こっちじゃ、こっちー！',
    'p02': '[excited] よう来たのう！ [curious] …ん？ そのマフラー、ばあさんが編んだやつじゃな',
    'p03a': '[happy] おう、おかえり！ [laughs] …わっはっは、照れくさいのう',
    'p03b': '[proudly] 当たり前じゃ！ 一時間前から待っとったわい',
    'p04': '[gruffly] ほれ、寒いけえ、早う帰るぞ。 [chuckles] ばあさんが待ちくたびれとる',
    'g01': '[excited] はいはいはい…！ まあまあまあ！',
    'g02': '[whispers] おかえり…。 まあ、大きゅうなって…',
    'g03': '[giggles] ふふ、よう帰ってきたねえ。 [warmly] ほら、早う上がりんさい。 こたつ、ぬくめといたけんね',
    'g04': '[warmly] はい、おしるこ。 熱いけん、ふーふーしてから食べんさいよ',
    'p05': '[proudly] ばあさんのおしるこは日本一じゃ。 [gruffly] …わしのみかんも、食うか？',
    'p06a': '[happy] よしよし、じいちゃんがむいちゃる。 [proudly] …ほれ、白いすじまで取ったぞ',
    'g05b': '[excited] まあ、うれしいねえ！ [warmly] たーんと食べんさい',
    'g06': '[giggles] ストーブの前、ぬくいじゃろ？ 右のほっぺ、まっかよ',
    'p07': '[excited] おはようさん！ ほれ、雪だるま、つくるぞ！ じいちゃんのは、でかいぞー！',
    'p08': '[mischievously] …すきありっ！',
    'p09': '[laughs heartily] わっはっは！ 当たらんかったか！',
    'p10': '[surprised] うおっ！？ つ、冷たっ！ [chuckles] …やるのう、さすがわしの孫じゃ',
    'g07': '[shouting] ふたりとも、風邪ひくよー！ 甘酒、できたけんねー！',
    'g08': '[whispers] …まだ起きとる？ ふふ、ばあちゃんもよ',
    'g09': '[whispers] …おじいさんね、若いころ、雪の日に「うちに来てくれ」って、それだけ言うて、真っ赤になっとったんよ',
    'g10': '[whispers] ふふ…。 ほら、耳まで、ふとん、かけちゃろうね',
    'g11': '[whispers] …あした、帰るんじゃろ？',
    'g12a': '[whispers] …うん。 待っとるけんね。 じいちゃんも、ばあちゃんも',
    'g12b': '[whispers] …ふふ、うれしいこと言うてくれるねえ。 いつでも帰っておいで。 ここは、あんたの家じゃけん',
    'p11': '[sleepy] …むにゃ…孫は…日本一じゃ…',
    'g13': '[whispers] ふふ…。 おやすみ',
}
src = open(os.path.join(ROOT, 'lines.js'), encoding='utf-8').read()
LINES = json.loads(src[src.index('= {') + 2:src.rindex('}') + 1])
out_dir = os.path.join(ROOT, 'media', 'voice'); os.makedirs(out_dir, exist_ok=True)
cache_p = os.path.join(ROOT, 'audio', 'voice_cache.json'); os.makedirs(os.path.dirname(cache_p), exist_ok=True)
cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}
# Dubbed takes (user 2026-11-09: every demo voiced in ja / en / zh): python3 scripts/voice.py --lang en|zh [--count]
#   → media/voice/<lang>/<id>.m4a + index.json (tools/eleven/dub.py: same voice / settings, the ja tags moved into the en / zh text).
#   Text = the subtitles: en from lines.js, zh from l10n.js. Names stay Japanese-style (DUB_NAMES).
DUB_NAMES = {}
DUB_OVERRIDE = {}                                                   # (lang, id) → hand-tagged text when retag() is not good enough
LANG = sys.argv[sys.argv.index('--lang') + 1] if '--lang' in sys.argv else 'ja'
if LANG != 'ja':
    sp = importlib.util.spec_from_file_location('dub', os.path.join(REPO, 'tools', 'eleven', 'dub.py')); D = importlib.util.module_from_spec(sp); sp.loader.exec_module(D)
    l10 = open(os.path.join(ROOT, 'l10n.js'), encoding='utf-8').read(); L10N = json.loads(l10[l10.index('= {') + 2:l10.rindex('}') + 1])
    lines = {}
    for lid, v in LINES.items():
        sub = v[2] if LANG == 'en' else L10N['text'][LANG][v[1]]
        lines[lid] = (VOICES[v[0]], DUB_OVERRIDE.get((LANG, lid)) or D.retag(TAGGED[lid], D.names(sub, LANG, DUB_NAMES), LANG))
    D.render(lines, LANG, os.path.join(out_dir, LANG), os.path.join(ROOT, 'audio', f'voice_cache.{LANG}.json'), count_only='--count' in sys.argv)
    sys.exit()


def dur(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True)
    return round(float(r.stdout.strip().strip(',')), 3)


durs = {}
for lid, (who, ja, en) in LINES.items():
    if lid not in TAGGED: raise SystemExit(f'{lid}: add its tagged text to TAGGED')
    key = f'eleven|{VOICES[who]}|{E.MODEL}|{E.SEED}|{TAGGED[lid]}'
    m4a = os.path.join(out_dir, f'{lid}.m4a')
    if cache.get(lid) != key or not os.path.exists(m4a):
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: f.write(E.speak(TAGGED[lid], VOICES[who])); wav = f.name
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-af', 'loudnorm=I=-18:TP=-2', '-ar', '48000', '-c:a', 'aac', '-b:a', '112k', m4a], check=True)
        os.remove(wav); cache[lid] = key; print('voiced', lid, TAGGED[lid], flush=True)
    durs[lid] = dur(m4a)
for f in os.listdir(out_dir):
    if f.endswith('.m4a') and f[:-4] not in LINES: os.remove(os.path.join(out_dir, f))
json.dump(cache, open(cache_p, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(ROOT, 'media', 'voice.js'), 'w').write('window.VISIT_VOICE = ' + json.dumps({'credit': 'ElevenLabs', 'dur': durs}) + ';\n')
print(len(durs), 'lines,', round(sum(durs.values()), 1), 's')
