#!/usr/bin/env python3
"""Hinata's voice: ElevenLabs (tools/eleven/cast.json "hinata_s", r1_b, the user's pick from the audition).
Standard settings from tools/eleven/tts.py (eleven_v4, ja, stability 0.4, similarity 0.8, seed 7); delivery from the audio tags in
TAGGED below ([whispers] at your ear). Reads ../lines.js → media/voice/<id>.m4a (mono AAC) + media/voice.js. Only (re)synthesizes lines whose text or voice changed (cache: audio/voice_cache.json)."""
import importlib.util, json, os, subprocess, tempfile, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.abspath(os.path.join(ROOT, '..', '..', '..'))
sp = importlib.util.spec_from_file_location('eleven', os.path.join(REPO, 'tools', 'eleven', 'tts.py')); E = importlib.util.module_from_spec(sp); sp.loader.exec_module(E)
VOICE = E.voice('hinata_s')
TAGGED = {
    'h01': '[excited] おっそーい！ [laughs] …って、うそうそ、ひなたも今来たとこ！ [playful] へへ、今日はオフだから、変装してきたっ。',
    'h02': '[playful] ばれない？ この帽子、かわいくない？',
    'h03a': '[excited] でしょでしょ〜！ よーし、今日はぜんぶ勝つからねっ！',
    'h03b': '[surprised] えーっ、うそ！ [softly] …まあいっか、あなたにバレるなら。 [excited] よーし、勝負だっ！',
    'h04': '[excited] まずは太鼓！ 負けたほうがジュースおごりね！ [shouting] …よーい、ドン！',
    'h05w': '[shouting] うそーっ!? 負けた…！ もう一回！ [sighs] …って言いたいけど、約束は約束。ジュース、おごるよ。',
    'h05l': '[excited] やったー！ ひなたの勝ちー！ [laughs] へへーん、ジュースよろしくっ！',
    'h06': '[excited] つぎ、レース！ となり座って！ [playful] …風、出るやつだよ、これ。',
    'h07a': '[shouting] ちょ、はやっ！ うそ、抜かれたー！',
    'h07b': '[annoyed] ちょっと！ ぶつけるのナシ！ [laughs] …ずるい〜っ、ひなたもやり返す！',
    'h08': '[breathless] はぁ、はぁ…楽しすぎ。 [softly] …あなたとだと、負けても楽しいの、なんでだろ。',
    'h09': '[excited] あっ、見て！ あのネコのぬいぐるみ、ほしい…！ [shy] …取ってくれる？',
    'h10x': '[disappointed] あー、おしい！ アーム弱すぎっ！ [excited] …もう一回！',
    'h10': '[excited] 取れたー！ すごいすごい！ [softly] …ありがと。 [shy] …この子、だいじにするね。',
    'h11': '[excited] ねえ、プリ撮ろ！ [laughs] …せまっ。 [shy] …もっとこっち寄って？',
    'h12': '[shy] …落書き、なんて書く？',
    'h13a': '[pouting] …えー、友だち？ …ふーん。 [playful] …ひなたは、ちがうこと書いちゃお。 [flustered] …見ちゃだめ！',
    'h13b': '[flustered] …っ!? な、なに書いてんの…！ [shy] …じゃあ、ひなたも、同じこと書く。',
    'h14': '[shivering] さむっ！ [playful] …はい、コーンスープ。 さっきのジュースの代わり。 …ぴとっ。',
    'h15': '[whispers] …ねえ。 今日のプリ、配信では、ぜったい見せないからね。 …あなたとひなただけの、ひみつ。',
    'h16a': '[excited] うんっ！ つぎは、ぜーったい負けないから！',
    'h16b': '[flustered] えっ…!? そ、それは…みんなにバレちゃうじゃん…！ [shy] …でも、ちょっとうれしい。',
}
src = open(os.path.join(ROOT, 'lines.js'), encoding='utf-8').read()
LINES = json.loads(src[src.index('= {') + 2:src.rindex('}') + 1])
out_dir = os.path.join(ROOT, 'media', 'voice'); os.makedirs(out_dir, exist_ok=True)
# Dubbed takes (user 2026-11-09: every demo voiced in ja / en / zh): python3 scripts/voice.py --lang en|zh [--count]
#   → media/voice/<lang>/<id>.m4a + index.json (tools/eleven/dub.py: same voice / settings, the ja tags moved into the en / zh text).
#   Text = the subtitles: en from lines.js, zh from l10n.js. Names stay Japanese-style (NAMES).
NAMES = {}
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
open(os.path.join(ROOT, 'media', 'voice.js'), 'w').write('window.HINATA_VOICE = ' + json.dumps({'credit': 'ElevenLabs', 'dur': durs}) + ';\n')
print(len(durs), 'lines,', round(sum(durs.values()), 1), 's')
