#!/usr/bin/env python3
"""Voices of Demo44: ElevenLabs with each character's confirmed voice (tools/eleven/cast.json — tsubaki, cocoa, luna; HANDOFF §4:
eleven_v4, stability 0.4, similarity 0.8, seed 7). Text + delivery tags: scripts/script_data.py (L / TAGGED; SAY = kana readings
for names / rare kanji, spoken only). → media/voice/<id>.m4a (mono AAC, loudnorm −18 LUFS) + media/voice.js (durations).
Only lines whose text or voice changed are (re)synthesized (audio/voice_cache.json).

  python3 scripts/voice.py [--count] [--only id,id] [--lang ja|en|zh]

Japanese only for now (user 2026-11-09: every voice in Japanese; en / zh are subtitles). `--lang en|zh` is the one-flag switch for a
later multilingual dub: it speaks the en / zh column (same voice, language_code en / zh) into media/voice_<lang>/ — NOT rendered now."""
import importlib.util, json, os, subprocess, sys, tempfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.abspath(os.path.join(ROOT, '..', '..', '..'))
def load(name, path):
    sp = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(sp); sp.loader.exec_module(m); return m
E = load('eleven', os.path.join(REPO, 'tools', 'eleven', 'tts.py')); SD = load('script_data', os.path.join(ROOT, 'scripts', 'script_data.py'))
arg = lambda k, d=None: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
LANG = arg('--lang', 'ja'); ONLY = set(filter(None, (arg('--only', '') or '').split(',')))
CAST = {'T': 'tsubaki', 'C': 'cocoa', 'L': 'luna'}
out_dir = os.path.join(ROOT, 'media', 'voice' if LANG == 'ja' else f'voice_{LANG}'); os.makedirs(out_dir, exist_ok=True)
cache_p = os.path.join(ROOT, 'audio', 'voice_cache.json' if LANG == 'ja' else f'voice_cache_{LANG}.json'); os.makedirs(os.path.dirname(cache_p), exist_ok=True)
cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}
VOICES = {k: E.voice(v) for k, v in CAST.items()}
text = {k: SD.spoken(v[1], LANG, k) for k, v in SD.L.items()}
key = lambda k: f'eleven|{VOICES[SD.L[k][0]]}|{E.MODEL}|{E.SEED}|{LANG}|{text[k]}'
todo = [k for k in SD.L if (not ONLY or k in ONLY) and (cache.get(k) != key(k) or not os.path.exists(os.path.join(out_dir, k + '.m4a')))]
if '--count' in sys.argv: print(len(todo), 'lines to render,', sum(len(SD.strip(text[k])) for k in todo), 'chars'); sys.exit()


def speak(t, vid):
    if LANG == 'ja': return E.speak(t, vid)
    import io, wave
    from elevenlabs import VoiceSettings
    pcm = b''.join(E.client().text_to_speech.convert(text=t, voice_id=vid, model_id=E.MODEL, language_code=LANG, seed=E.SEED,
                                                     output_format='pcm_24000', voice_settings=VoiceSettings(stability=.4, similarity_boost=.8)))
    b = io.BytesIO()
    with wave.open(b, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm)
    return b.getvalue()


def dur(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True)
    return round(float(r.stdout.strip().strip(',')), 3)


durs = {}
for lid, (who, tagged, en, zh) in SD.L.items():
    m4a = os.path.join(out_dir, f'{lid}.m4a')
    if lid in todo:
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: f.write(speak(text[lid], VOICES[who])); wav = f.name
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-af', 'loudnorm=I=-18:TP=-2', '-ar', '48000', '-c:a', 'aac', '-b:a', '112k', m4a], check=True)
        os.remove(wav); cache[lid] = key(lid); print('voiced', lid, who, text[lid], flush=True)
        tmp = cache_p + '.tmp'; json.dump(cache, open(tmp, 'w'), ensure_ascii=False, indent=1); os.replace(tmp, cache_p)
    if os.path.exists(m4a): durs[lid] = dur(m4a)
for f in os.listdir(out_dir):
    if f.endswith('.m4a') and f[:-4] not in SD.L: os.remove(os.path.join(out_dir, f))
if LANG == 'ja':
    open(os.path.join(ROOT, 'media', 'voice.js'), 'w').write('window.ACAD_VOICE = ' + json.dumps({'credit': 'ElevenLabs', 'dur': durs}) + ';\n')
print(len(durs), 'lines,', round(sum(durs.values()), 1), 's')
