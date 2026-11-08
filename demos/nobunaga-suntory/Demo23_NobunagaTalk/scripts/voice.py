#!/usr/bin/env python3
"""Voices of the scripted (public) talk: every line and bridge of ../lines.js (5 places × 3 casts) → media/voice/<id>.m4a (mono AAC), rendered ONCE with
ElevenLabs (handoff §4 standard via tools/eleven/tts.py: eleven_v4, ja, stability 0.4, similarity 0.8, seed 7; confirmed voices
nobunaga r1_a / ieyasu r1_a). The page plays the files, so the public page costs nothing at run time.
Only lines whose text or voice changed are (re)synthesized (cache: audio/voice_cache.json).

  python3 scripts/voice.py --count   # characters that would be sent, nothing else
  python3 scripts/voice.py           # render (refuses when the month would drop below limits.json month_reserve_chars)"""
import importlib.util, json, os, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.abspath(os.path.join(ROOT, '..', '..', '..'))
sp = importlib.util.spec_from_file_location('eleven', os.path.join(REPO, 'tools', 'eleven', 'tts.py')); E = importlib.util.module_from_spec(sp); sp.loader.exec_module(E)
src = open(os.path.join(ROOT, '..', '_kit', 'talk', 'lines.js'), encoding='utf-8').read()
S = json.loads(src[src.index('window.TALK_SCRIPT = ') + 21:src.rindex('}') + 1])

items = {}   # id → (who, tagged text); every place's beats + the shared and per-place bridges
def add(lid, who, text):
    if lid in items and items[lid] != (who, text): sys.exit(f'{lid}: one id, two texts')
    items[lid] = (who, text)
def bridges(B):
    for who, kinds in (B or {}).items():
        for lst in kinds.values():
            for l in lst: add(l['id'], who, l['ja'])
bridges(S['bridges'])
for place in S['scenes'].values():
    for b in place['beats']:
        for l in b['lines']:
            if 'id' in l: add(l['id'], l['who'], l['ja'])
    bridges(place.get('bridges'))

out_dir = os.path.join(ROOT, '..', '_kit', 'talk', 'media', 'voice'); os.makedirs(out_dir, exist_ok=True)
cache_p = os.path.join(ROOT, 'audio', 'voice_cache.json'); os.makedirs(os.path.dirname(cache_p), exist_ok=True)
cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}
VOICE = {'N': 'nobunaga', 'I': 'ieyasu'}
todo = []
for lid, (who, text) in items.items():
    key = f'eleven|{E.voice(VOICE[who])}|{E.MODEL}|{E.SEED}|{text}'
    if cache.get(lid) != key or not os.path.exists(os.path.join(out_dir, f'{lid}.m4a')): todo.append((lid, who, text, key))
chars = sum(len(t) for _, _, t, _ in todo)
print(f'{len(items)} lines, {len(todo)} to render, {chars} characters')
if '--count' in sys.argv or not todo: sys.exit(0)

L = json.load(open(os.path.join(ROOT, 'limits.json')))
s = E.client().user.subscription.get(); left = s.character_limit - s.character_count
print(f'month: {left} left, reserve {L["month_reserve_chars"]}')
if left - chars < L['month_reserve_chars']: sys.exit('refused: would go below the monthly reserve (limits.json)')
CAP = next((int(a.split('=')[1]) for a in sys.argv if a.startswith('--max-chars=')), None)   # a job budget: stop before going over it
if CAP is not None and chars > CAP: sys.exit(f'refused: {chars} characters > --max-chars={CAP}')

for lid, who, text, key in todo:
    m4a = os.path.join(out_dir, f'{lid}.m4a')
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: f.write(E.speak(text, E.voice(VOICE[who]))); wav = f.name
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-af', 'loudnorm=I=-18:TP=-2', '-ar', '48000', '-c:a', 'aac', '-b:a', '96k', m4a], check=True)
    os.remove(wav); cache[lid] = key; print('voiced', lid, text)
    json.dump(cache, open(cache_p, 'w'), ensure_ascii=False, indent=1)
for f in os.listdir(out_dir):
    if f.endswith('.m4a') and f[:-4] not in items: os.remove(os.path.join(out_dir, f))
s2 = E.client().user.subscription.get()
print('done; month used', s.character_count, '→', s2.character_count, f'(+{s2.character_count - s.character_count})')
