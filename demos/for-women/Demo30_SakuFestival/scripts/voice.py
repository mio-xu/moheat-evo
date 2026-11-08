#!/usr/bin/env python3
"""Saku's voice: ElevenLabs (tools/eleven/cast.json "saku", the user's pick r1_a). Standard settings from tools/eleven/tts.py;
delivery from the audio tags in TAGGED ([whispers] at your ear). Reads ../lines.js → media/voice/<id>.m4a (mono AAC) + media/voice.js.
Only (re)synthesizes lines whose text or voice changed (cache: audio/voice_cache.json). Template: Demo22 scripts/voice.py."""
import importlib.util, json, os, subprocess, tempfile, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.abspath(os.path.join(ROOT, '..', '..', '..'))
sp = importlib.util.spec_from_file_location('eleven', os.path.join(REPO, 'tools', 'eleven', 'tts.py')); E = importlib.util.module_from_spec(sp); sp.loader.exec_module(E)
VOICE = E.voice('saku')
TAGGED = {
    'k01': '[shouting playfully] おーい、こっち！ [laughs] …ったく、毎年はぐれるよな、お前。',
    'k02': '[casually] ほら、手。 [softly] …はぐれるなよ。',
    'k03': '[laughs] 焼きそばの屋台、あっついな。 [sighs] …人、多すぎ。 上、行こうぜ。',
    'k04': '[exhales] ふう。 [softly] …ここ、昔よく二人で来たよな。',
    'k05': '[teasing] 暑いだろ。 あおいでやるよ。',
    'k06': '[playfully] どう、涼しい？ …ほら、反対側も。',
    'k07a': '[laughs softly] はいはい、お姫様。 …ったく、しょうがねえな。',
    'k07b': '[teasing] だーめ。 [softly] 今日は、俺にやらせて。',
    'k08': '[cheerfully] かき氷、買ってきた。 宇治金時。 [teasing] …ほら、あーん。',
    'k09a': '[chuckles] …今日は素直じゃん。 冷たい？',
    'k09b': '[laughs softly] 照れんなって。 …ほら、溶けるぞ。',
    'k10': '[mischievously] なあ。 かき氷食ったあとの息、冷たいって知ってる？',
    'k11': '[whispers] …な？ 冷たいだろ。 [chuckles softly] …顔、赤いぞ。',
    'k12': '[softly] 花火、毎年一緒に見てるけどさ。 今年は――',
    'k13': '[whispers] …今年は、幼なじみとしてじゃなくて、見たかったんだ。 …お前の隣で。',
    'k14': '[softly] [nervous] …返事、聞かせて。',
    'k15a': '[whispers] …来年も、再来年も。 [chuckles softly] 俺の隣、空けとけよ。',
    'k15b': '[whispers] …ずっと、な。 …もう、幼なじみには戻らねえから。',
}
src = open(os.path.join(ROOT, 'lines.js'), encoding='utf-8').read()
LINES = json.loads(src[src.index('= {') + 2:src.rindex('}') + 1])
out_dir = os.path.join(ROOT, 'media', 'voice'); os.makedirs(out_dir, exist_ok=True)
# Dubbed takes (user 2026-11-09: every demo voiced in ja / en / zh): python3 scripts/voice.py --lang en|zh [--count]
#   → media/voice/<lang>/<id>.m4a + index.json (tools/eleven/dub.py: same voice / settings, the ja tags moved into the en / zh text).
#   Text = the subtitles: en from lines.js, zh from l10n.js. Names stay Japanese-style (NAMES).
NAMES = {"zh": [["朔", "Saku"]]}
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
    text = TAGGED[lid]; key = f'eleven|{VOICE}|{E.MODEL}|{E.SEED}|{text}'
    m4a = os.path.join(out_dir, f'{lid}.m4a')
    if cache.get(lid) != key or not os.path.exists(m4a):
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: f.write(E.speak(text, VOICE)); wav = f.name
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-af', 'loudnorm=I=-18:TP=-2', '-ar', '48000', '-c:a', 'aac', '-b:a', '112k', m4a], check=True)
        os.remove(wav); cache[lid] = key; print('voiced', lid, text, flush=True)
    durs[lid] = dur(m4a)
for f in os.listdir(out_dir):
    if f.endswith('.m4a') and f[:-4] not in LINES: os.remove(os.path.join(out_dir, f))
json.dump(cache, open(cache_p, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(ROOT, 'media', 'voice.js'), 'w').write('window.SAKU_VOICE = ' + json.dumps({'credit': 'ElevenLabs', 'dur': durs}) + ';\n')
print(len(durs), 'lines,', round(sum(durs.values()), 1), 's')
