#!/usr/bin/env python3
"""Voices of Demo43: ElevenLabs with each character's confirmed voice (tools/eleven/cast.json — mint r1_a, hinata_s r1_b, nagisa r1_b;
HANDOFF §4: eleven_v4, ja, stability 0.4, similarity 0.8, seed 7). Text + delivery tags: scripts/script_data.py (L / TAGGED).
→ media/voice/<id>.m4a (mono AAC) + media/voice.js. Only lines whose text or voice changed are (re)synthesized (audio/voice_cache.json).
  python3 scripts/voice.py [--count]"""
import importlib.util, json, os, subprocess, sys, tempfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.abspath(os.path.join(ROOT, '..', '..', '..'))
def load(name, path):
    sp = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(sp); sp.loader.exec_module(m); return m
E = load('eleven', os.path.join(REPO, 'tools', 'eleven', 'tts.py')); SD = load('script_data', os.path.join(ROOT, 'scripts', 'script_data.py'))
CAST = {'M': 'mint', 'H': 'hinata_s', 'N': 'nagisa'}
out_dir = os.path.join(ROOT, 'media', 'voice'); os.makedirs(out_dir, exist_ok=True)
cache_p = os.path.join(ROOT, 'audio', 'voice_cache.json'); os.makedirs(os.path.dirname(cache_p), exist_ok=True)
cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}
VOICES = {k: E.voice(v) for k, v in CAST.items()}
todo = [k for k, v in SD.L.items() if cache.get(k) != f'eleven|{VOICES[v[0]]}|{E.MODEL}|{E.SEED}|{v[1]}' or not os.path.exists(os.path.join(out_dir, k + '.m4a'))]
if '--count' in sys.argv: print(len(todo), 'lines to render,', sum(len(SD.L[k][1]) for k in todo), 'chars'); sys.exit()


def dur(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True)
    return round(float(r.stdout.strip().strip(',')), 3)


durs = {}
for lid, (who, tagged, en, zh) in SD.L.items():
    key = f'eleven|{VOICES[who]}|{E.MODEL}|{E.SEED}|{tagged}'; m4a = os.path.join(out_dir, f'{lid}.m4a')
    if lid in todo:
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: f.write(E.speak(tagged, VOICES[who])); wav = f.name
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-af', 'loudnorm=I=-18:TP=-2', '-ar', '48000', '-c:a', 'aac', '-b:a', '112k', m4a], check=True)
        os.remove(wav); cache[lid] = key; print('voiced', lid, who, tagged, flush=True)
        json.dump(cache, open(cache_p, 'w'), ensure_ascii=False, indent=1)
    durs[lid] = dur(m4a)
for f in os.listdir(out_dir):
    if f.endswith('.m4a') and f[:-4] not in SD.L: os.remove(os.path.join(out_dir, f))
open(os.path.join(ROOT, 'media', 'voice.js'), 'w').write('window.INN_VOICE = ' + json.dumps({'credit': 'ElevenLabs', 'dur': durs}) + ';\n')
print(len(durs), 'lines,', round(sum(durs.values()), 1), 's')
