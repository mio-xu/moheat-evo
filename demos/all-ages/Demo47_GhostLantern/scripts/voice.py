#!/usr/bin/env python3
"""Voices of Demo47 in ja / en / zh (user 2026-11-09: the voice follows the subtitle language): ElevenLabs, each character's confirmed
voice (tools/eleven/cast.json — bonchan, yurari (new voices, picked 2026-11-09); HANDOFF §4: eleven_v4, stability 0.4, similarity 0.8, seed 7), the same voice id /
settings in every language. Text + delivery tags: scripts/script_data.py (L; SAY = kana readings for names / rare kanji, ja only).
en / zh = the subtitle columns with the ja tags moved in (tools/eleven/dub.py retag), names kept Japanese-style (NAMES).
→ media/voice/<id>.m4a (ja) · media/voice/<lang>/<id>.m4a (en / zh; same ids) + index.json per language + media/voice.js (durations per language).

  python3 scripts/voice.py [--lang ja|en|zh|all] [--count]        (default: all three; only changed lines are rendered)
ElevenLabs quota is shared (~74k chars until 2026-12-08, coordinator): run --count first; the character use is logged in
project/voice_log.json."""
import importlib.util, json, os, sys, time
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.abspath(os.path.join(ROOT, '..', '..', '..'))
def load(name, path):
    sp = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(sp); sp.loader.exec_module(m); return m
E = load('eleven', os.path.join(REPO, 'tools', 'eleven', 'tts.py')); SD = load('script_data', os.path.join(ROOT, 'scripts', 'script_data.py'))
D = load('dub', os.path.join(REPO, 'tools', 'eleven', 'dub.py'))
CAST = {'B': 'bonchan', 'Y': 'yurari'}
GLOBAL = 'LANTERN_VOICE'
NAMES = {'zh': [('灯笼小盆', 'Bon-chan'), ('悠悠', 'Yurari')], 'en': []}
OVERRIDE = {}                                                                       # (lang, id) → hand-tagged text
arg = sys.argv[sys.argv.index('--lang') + 1] if '--lang' in sys.argv else 'all'
LANGS = ['ja', 'en', 'zh'] if arg == 'all' else [arg]
VOICES = {k: E.voice(v) for k, v in CAST.items()}
VDIR = os.path.join(ROOT, 'media', 'voice')
vdir = lambda lang: VDIR if lang == 'ja' else os.path.join(VDIR, lang)   # one convention site-wide: ja flat, dubs in media/voice/<lang>/ (MoHeatVoice)


def text(lid, lang):
    who, ja, en, zh = SD.L[lid]
    if (lang, lid) in OVERRIDE: return OVERRIDE[(lang, lid)]
    if lang == 'ja': return SD.spoken(ja, 'ja')
    return D.retag(ja, D.names(en if lang == 'en' else zh, lang, NAMES), lang)


used = {}
for lang in LANGS:
    lines = {k: (VOICES[v[0]], text(k, lang)) for k, v in SD.L.items()}
    cache_p = os.path.join(ROOT, 'audio', f'voice_cache.{lang}.json')
    before = json.load(open(cache_p)) if os.path.exists(cache_p) else {}
    todo = [k for k, (vid, t) in lines.items() if before.get(k) != D.key(vid, lang, t) or not os.path.exists(os.path.join(VDIR, lang, k + '.m4a'))]
    used[lang] = sum(len(lines[k][1]) for k in todo)
    D.render(lines, lang, vdir(lang), cache_p, count_only='--count' in sys.argv)
if '--count' in sys.argv: sys.exit()
durs = {}
for lang in ('ja', 'en', 'zh'):
    p = os.path.join(vdir(lang), 'index.json')
    if os.path.exists(p): durs[lang] = json.load(open(p))['dur']
open(os.path.join(ROOT, 'media', 'voice.js'), 'w').write(f'window.{GLOBAL} = ' + json.dumps({'credit': 'ElevenLabs', 'langs': list(durs), 'dur': durs}) + ';\n')
logp = os.path.join(ROOT, 'project', 'voice_log.json'); log = json.load(open(logp)) if os.path.exists(logp) else []
log.append({'t': time.strftime('%Y-%m-%d %H:%M'), 'chars': used, 'note': 'ElevenLabs characters sent (≈ credits)'})
tmp = logp + '.tmp'; json.dump(log, open(tmp, 'w'), ensure_ascii=False, indent=1); os.replace(tmp, logp)
print({l: f'{len(d)} lines, {round(sum(d.values()), 1)} s' for l, d in durs.items()}, 'chars used now:', used)
