"""Dubbed takes (en / zh / …) of a demo's Japanese ElevenLabs lines — same voice id, model, seed, settings and delivery tags as the ja take.

User 2026-11-09: voice acting stays Japanese on the pages for now; the dubbed takes are rendered so the user can compare (no page wiring yet).
Each demo's voice script gets `--lang <en|zh>` and calls this module (import by path, like tts.py):

    D = load('dub', os.path.join(REPO, 'tools', 'eleven', 'dub.py'))
    lines = {lid: (voice_id, D.retag(tagged_ja, D.names(subtitle_text, lang, NAMES), lang)) for …}   # OVERRIDE wins over retag
    D.render(lines, lang, out_dir=…/media/voice/<lang>, cache_p=…/audio/voice_cache.<lang>.json, count_only='--count' in argv)

retag(): the ja line's [tags] are moved into the translation at the same relative sentence position (a tag before the 3rd of 4 ja
phrases lands before the 3rd of 4 target sentences). names(): character names stay Japanese-style in every language
(zh: 渚 → Nagisa …), per-demo table. render(): cached per (voice, model, seed, lang, text); mono AAC like the ja takes; writes
<out_dir>/index.json = {lid: duration s} for re-timing at rollout. Prints the character count first (= ElevenLabs credits used)."""
import hashlib, importlib.util, json, os, re, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
_sp = importlib.util.spec_from_file_location('eleven_tts', os.path.join(HERE, 'tts.py')); E = importlib.util.module_from_spec(_sp); _sp.loader.exec_module(E)
TAG = re.compile(r'\[[^\]]*\]')
AF = 'loudnorm=I=-18:TP=-2'                       # same as the ja takes of Demo22 / 43
RESERVE = int(os.environ.get('MOHEAT_EL_RESERVE', '12000'))   # chars to keep on the ElevenLabs account; 0 = no check
BR = '64k'                                        # rollout 2026-11-09: dubs at 64 kb/s mono AAC (speech, half the size → small enough for git / Pages)


def lang_arg(argv=sys.argv, default='ja'):
    return argv[argv.index('--lang') + 1] if '--lang' in argv else default


def units(text, lang):
    """Split plain text into phrase units (ja: the space-separated phrases these scripts use; en / zh: sentences)."""
    text = text.strip()
    if lang == 'ja': parts = re.split(r'\s+', text)
    elif lang == 'zh': parts = re.split(r'(?<=[。！？!?～~])(?![。！？!?～~」』）)])', text)
    else: parts = re.findall(r'.+?(?:[.!?…]+["”’)]*(?=\s|$)|$)', text)
    return [p.strip() for p in parts if p.strip()]


def retag(tagged_ja, target, lang):
    """Copy the [tags] of the Japanese line into `target` at the same relative phrase position."""
    if TAG.search(target): return target                         # already tagged by hand
    segs = re.split(r'(\[[^\]]*\])', tagged_ja)
    marks, n = [], 0                                              # (phrase index in ja, tag)
    for s in segs:
        if TAG.fullmatch(s or ''): marks.append((n, s))
        elif s.strip(): n += len(units(s, 'ja'))
    tu = units(target, lang) or [target]
    out = {}
    for i, tag in marks:
        j = 0 if i == 0 or n == 0 else min(len(tu) - 1, max(1, round(i / n * len(tu))))
        out.setdefault(j, []).append(tag)
    sep = '' if lang in ('zh', 'ja') else ' '
    return sep.join(((' '.join(out[j]) + ' ') if j in out else '') + u for j, u in enumerate(tu)).strip()


def names(text, lang, table):
    """table = {lang: [(from, to), …]} — applied in order (put longer phrases first)."""
    for a, b in table.get(lang, []): text = text.replace(a, b)
    return text


def chars(lines):
    return sum(len(t) for _, t, *_ in lines.values())


def key(vid, lang, text):
    return hashlib.sha1(f'eleven|{vid}|{E.MODEL}|{E.SEED}|{lang}|{text}'.encode()).hexdigest()[:14]


def dur(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True)
    return round(float(r.stdout.strip().strip(',')), 3)


def render(lines, lang, out_dir, cache_p, count_only=False, af=AF, br=BR):
    """lines = {lid: (voice_id, tagged text[, ffmpeg -af])}. Synthesises only what changed; returns {lid: duration}."""
    os.makedirs(out_dir, exist_ok=True); os.makedirs(os.path.dirname(cache_p), exist_ok=True)
    cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}
    todo = [k for k, (vid, t, *_) in lines.items() if cache.get(k) != key(vid, lang, t) or not os.path.exists(os.path.join(out_dir, k + '.m4a'))]
    print(f'[{lang}] {len(lines)} lines, {chars(lines)} chars in total; to render now: {len(todo)} lines, {sum(len(lines[k][1]) for k in todo)} chars', flush=True)
    if count_only: return {}
    need = sum(len(lines[k][1]) for k in todo)
    if need and RESERVE:                                          # quota guard: never dip into the reserve (rollout 2026-11-09)
        sub = E.client().user.subscription.get(); left = sub.character_limit - sub.character_count
        print(f'[{lang}] account: {left:,} chars left, reserve {RESERVE:,}', flush=True)
        if left - need < RESERVE: raise SystemExit(f'[{lang}] STOP: {need} chars would leave {left - need:,} < reserve {RESERVE:,}')
    durs = {}
    for lid, (vid, text, *rest) in lines.items():
        m4a = os.path.join(out_dir, lid + '.m4a')
        if lid in todo:
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: f.write(E.speak(text, vid, lang=lang)); wav = f.name
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-af', rest[0] if rest else af, '-ar', '48000', '-c:a', 'aac', '-b:a', br, m4a], check=True)
            os.remove(wav); cache[lid] = key(vid, lang, text); print('voiced', lang, lid, text, flush=True)
            tmp = cache_p + '.tmp'; json.dump(cache, open(tmp, 'w'), ensure_ascii=False, indent=1); os.replace(tmp, cache_p)
        durs[lid] = dur(m4a)
    for f in os.listdir(out_dir):
        if f.endswith('.m4a') and f[:-4] not in lines: os.remove(os.path.join(out_dir, f))
    json.dump(dict(lang=lang, text={k: v[1] for k, v in lines.items()}, dur=durs), open(os.path.join(out_dir, 'index.json'), 'w'), ensure_ascii=False, indent=1)
    print(f'[{lang}] {len(durs)} lines, {round(sum(durs.values()), 1)} s', flush=True)
    return durs
