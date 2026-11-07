"""Shared ElevenLabs helpers for all demos (import by path). Key = ELEVENLABS_API_KEY in the repo's .env.local.

    import importlib.util, os
    sp = importlib.util.spec_from_file_location('eleven', os.path.join(REPO, 'tools', 'eleven', 'tts.py')); E = importlib.util.module_from_spec(sp); sp.loader.exec_module(E)
    wav = E.speak('[whispers] …ねえ', E.voice('ren'))     # mono 24 kHz WAV bytes

Standard (handoff §4 "配音标准：ElevenLabs"): eleven_v4, ja, stability 0.4, similarity 0.8, seed 7, audio tags in the text."""
import io, json, os, wave

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
CAST_P = os.path.join(HERE, 'cast.json')
MODEL, SEED = 'eleven_v4', 7
_c = []


def client():
    if not _c:
        from dotenv import load_dotenv
        load_dotenv(os.path.join(REPO, '.env.local'))
        from elevenlabs import ElevenLabs
        _c.append(ElevenLabs())
    return _c[0]


def cast():
    return json.load(open(CAST_P, encoding='utf-8'))


def save_cast(c):
    json.dump(c, open(CAST_P, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


def voice(char):
    v = cast()[char].get('voice_id')
    if not v: raise SystemExit(f'{char}: no confirmed voice yet (tools/eleven/audition.py, then pick.py)')
    return v


def speak(text, voice_id, seed=SEED, stability=.4, similarity=.8):
    from elevenlabs import VoiceSettings
    pcm = b''.join(client().text_to_speech.convert(text=text, voice_id=voice_id, model_id=MODEL, language_code='ja', seed=seed,
                                                   output_format='pcm_24000', voice_settings=VoiceSettings(stability=stability, similarity_boost=similarity)))
    b = io.BytesIO()
    with wave.open(b, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm)
    return b.getvalue()
