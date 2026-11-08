#!/usr/bin/env python3
"""Koyuki + Homura voices: ElevenLabs (tools/eleven/cast.json "koyuki" r1_b / "homura" r1_c — the user's picks for Demo 1, reused).
Standard settings from tools/eleven/tts.py (eleven_v4, ja, stability 0.4, similarity 0.8, seed 7); delivery from the audio tags in
TAGGED below ([whispers] at your ear). Reads ../lines.js → media/voice/<id>.m4a (mono AAC) + media/voice.js.
Lines spoken by both at once (who = "KH") are voiced twice: <id>_k.m4a and <id>_h.m4a, played together.
Only (re)synthesizes lines whose text or voice changed (cache: audio/voice_cache.json)."""
import importlib.util, json, os, subprocess, tempfile, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.abspath(os.path.join(ROOT, '..', '..', '..'))
sp = importlib.util.spec_from_file_location('eleven', os.path.join(REPO, 'tools', 'eleven', 'tts.py')); E = importlib.util.module_from_spec(sp); sp.loader.exec_module(E)
VOICE = {'K': E.voice('koyuki'), 'H': E.voice('homura')}
TAGGED = {
    'k01': '[softly] こんばんは…。 まだ、起きてるの？',
    'h01': '[excited] はいはーい！ 夜ふかしさん、みーつけた！',
    'k02': '[softly] 焔ちゃん、しーっ…。 この子、眠れないんだって。',
    'h02': '[playful] じゃあ、どっちが先に寝かしつけるか、勝負だね！',
    'k03': '[curious] ねえ…眠れないのは、暑いから？ 寒いから？',
    'k04': '[giggles softly] ふふ、じゃあ、わたしの番。',
    'h04': '[laughs] ほらね！ わたしの出番！',
    'k05': '[whispers] 目を閉じて…。 雪のふる音、聞こえる？',
    'k06': '[blows softly] ふぅー…。 [whispers] ふふっ、ひんやり、した？',
    'h05': '[whispers] こっちの耳は、わたしがあっためてあげる。',
    'h06': '[sighs softly] はぁー…。 [whispers] ぽかぽか、でしょ？',
    'k07': '[softly] …焔ちゃん、近い。',
    'h07': '[playful] 小雪こそ！ [whispers] …じゃあ、半分こね。',
    'k08': '[whispers] ひんやり、と…',
    'h08': '[whispers] ぽかぽか、で…',
    'kh1': '[whispers] …ちょうどいい、でしょ？',
    'k10': '[whispers] …眠くなってきた？ 最後は、どっちがそばにいてほしい？',
    'h11a': '[pouting] ちぇー。 [warmly] …じゃあ、いろりの火は、朝まで見ててあげる。',
    'k11a': '[whispers] …ありがとう。 朝まで、ずっとそばにいるね。',
    'k11b': '[giggles softly] ふふ、じゃあ、わたしは戸を閉めてくるね。',
    'h11b': '[whispers] …朝まで、ぎゅってしててあげる。',
    'kh2': '[whispers] おやすみなさい。',
}
src = open(os.path.join(ROOT, 'lines.js'), encoding='utf-8').read()
LINES = json.loads(src[src.index('= {') + 2:src.rindex('}') + 1])
out_dir = os.path.join(ROOT, 'media', 'voice'); os.makedirs(out_dir, exist_ok=True)
cache_p = os.path.join(ROOT, 'audio', 'voice_cache.json'); os.makedirs(os.path.dirname(cache_p), exist_ok=True)
cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}
# Dubbed takes (user 2026-11-09: every demo voiced in ja / en / zh): python3 scripts/voice.py --lang en|zh [--count]
#   → media/voice/<lang>/<id>.m4a + index.json (tools/eleven/dub.py: same voice / settings, the ja tags moved into the en / zh text).
#   Text = the subtitles: en from lines.js, zh from l10n.js. Names stay Japanese-style (DUB_NAMES).
DUB_NAMES = {"zh": [["小雪", "Koyuki"], ["小焰", "Homura"]]}
DUB_OVERRIDE = {}                                                   # (lang, id) → hand-tagged text when retag() is not good enough
LANG = sys.argv[sys.argv.index('--lang') + 1] if '--lang' in sys.argv else 'ja'
if LANG != 'ja':
    sp = importlib.util.spec_from_file_location('dub', os.path.join(REPO, 'tools', 'eleven', 'dub.py')); D = importlib.util.module_from_spec(sp); sp.loader.exec_module(D)
    l10 = open(os.path.join(ROOT, 'l10n.js'), encoding='utf-8').read(); L10N = json.loads(l10[l10.index('= {') + 2:l10.rindex('}') + 1])
    lines = {}
    for lid, v in {f: (v, w) for k, v in LINES.items() for f, w in ([(f'{k}_{x.lower()}', x) for x in v[2]] if len(v[2]) > 1 else [(k, v[2])])}.items():
        sub = v[0][1] if LANG == 'en' else L10N['text'][LANG][v[0][0]]
        lines[lid] = (VOICE[v[1]], DUB_OVERRIDE.get((LANG, lid)) or D.retag(TAGGED[lid.split('_')[0] if lid.endswith(('_k', '_h')) else lid], D.names(sub, LANG, DUB_NAMES), LANG))
    D.render(lines, LANG, os.path.join(out_dir, LANG), os.path.join(ROOT, 'audio', f'voice_cache.{LANG}.json'), count_only='--count' in sys.argv)
    sys.exit()


def dur(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True)
    return round(float(r.stdout.strip().strip(',')), 3)


jobs = []   # (file id, speaker)
for lid, (_, _, who) in LINES.items():
    if lid not in TAGGED: raise SystemExit(f'{lid}: add its tagged text to TAGGED')
    jobs += [(f'{lid}_{w.lower()}', w) for w in who] if len(who) > 1 else [(lid, who)]
durs = {}
for fid, who in jobs:
    lid = fid.split('_')[0] if fid.endswith(('_k', '_h')) else fid
    key = f'eleven|{VOICE[who]}|{E.MODEL}|{E.SEED}|{TAGGED[lid]}'
    m4a = os.path.join(out_dir, f'{fid}.m4a')
    if cache.get(fid) != key or not os.path.exists(m4a):
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: f.write(E.speak(TAGGED[lid], VOICE[who])); wav = f.name
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-af', 'loudnorm=I=-18:TP=-2', '-ar', '48000', '-c:a', 'aac', '-b:a', '112k', m4a], check=True)
        os.remove(wav); cache[fid] = key; print('voiced', fid, TAGGED[lid])
    durs[fid] = dur(m4a)
for f in os.listdir(out_dir):
    if f.endswith('.m4a') and f[:-4] not in durs: os.remove(os.path.join(out_dir, f))
json.dump(cache, open(cache_p, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(ROOT, 'media', 'voice.js'), 'w').write('window.LULLABY_VOICE = ' + json.dumps({'credit': 'ElevenLabs', 'dur': durs}) + ';\n')
print(len(durs), 'files,', round(sum(durs.values()), 1), 's')
