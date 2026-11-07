#!/usr/bin/env python3
"""Voices for Hinata's handshake event. Reads ../lines.js → media/voice/<id>.m4a (mono AAC) + media/voice.js (durations).

Hinata = ElevenLabs voice "v2" (user's pick 2026-11-08 from scripts/eleven_audition.py: a Voice Design young male idol), eleven_v4,
Japanese, stability 0.4 / similarity 0.8, fixed seed; delivery comes from the audio tags in ELEVEN below (sweet / teasing / whispers
at the ear). Key = ELEVENLABS_API_KEY in the repo's .env.local. Staff = ElevenLabs staff_f (user's pick r1_a; earlier VOICEVOX:春日部つむぎ).
The old VOICEVOX Hinata ("m1": 暁記ミタマ) settings are kept in MODES for reference.
Only (re)synthesizes changed lines (cache: audio/voice_cache.json)."""
import io, json, math, os, subprocess, tempfile, urllib.parse, urllib.request, wave
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = 'http://127.0.0.1:50021'
BASE_PITCH, K, PAUSE = -.03, .95, 1.4
MODES = {   # style: (speaker, VOICEVOX style, pitch offset, intonation, speed, breath)
    's': ('暁記ミタマ', 'ノーマル', +.02, 1.25, 1.04, 0),
    't': ('暁記ミタマ', 'ノーマル', 0, 1.15, .96, .2),
    'd': ('暁記ミタマ', 'ささやき', -.04, .95, .85, .5),
    'staff': ('春日部つむぎ', 'ノーマル', 0, 1.1, 1.05, 0),
}
src = open(os.path.join(ROOT, 'lines.js'), encoding='utf-8').read()
LINES = json.loads(src[src.index('= {') + 2:src.rindex('}') + 1])
out_dir = os.path.join(ROOT, 'media', 'voice'); os.makedirs(out_dir, exist_ok=True)
cache_p = os.path.join(ROOT, 'audio', 'voice_cache.json'); os.makedirs(os.path.dirname(cache_p), exist_ok=True)
cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}
_sp = {}
def SP(spk, style):
    if not _sp: _sp.update({s['name']: {t['name']: t['id'] for t in s['styles']} for s in json.loads(urllib.request.urlopen(f'{API}/speakers').read())})
    return _sp[spk][style]


HINATA_VOICE, HINATA_MODEL, SEED = 'lODKQ6pXINFtajDz9nqR', 'eleven_v4', 7
ELEVEN = {   # line id → text with eleven_v4 audio tags (ja text from lines.js)
    'h01': '[surprised] 次の…あっ！ [excited] お姉さん、来てくれたんだ！',
    'h02': '[giggles] えへへ、すっごく嬉しい！ はい、握手！',
    'h03': '[curious] …あれ、手、冷たいね。[softly] 外、寒かった？',
    'h04a': '[softly] ずっと並んでてくれたの？ …[warmly] じゃあ、俺があっためてあげる',
    'h04b': '[chuckles softly] …ふふ、知ってる。[playful] じゃあ、ごほうびに、あっためてあげる',
    'h05': '[sighs softly] はぁー……。[softly] …どう？ あったかい？',
    'h06': '[pouting] えっ、もう？ やだなあ…',
    'h07': '[whispers] …ねえ。さっき、他のメンバーの列にも並んでたでしょ',
    'h08': '[whispers] …見てたよ。ステージの上から、ずーっと',
    'h09a': '[laughs] あはは、慌てすぎ。[whispers] …かわいい',
    'h09b': '[chuckles softly] …ふふ、素直。[softly] …いいよ、許してあげる',
    'h10a': '[playful] …だーめ。[whispers] まだ、離してあげない',
    'h10b': '[playful] あれ、手、離さないの？ [chuckles softly] …ふふ、お姉さんのほうが、離したくないんだ',
    'h11': '[whispers] …次は、俺の列だけに並んでね',
    'h12': '[whispers] 約束。…破ったら、また耳元で怒っちゃうから',
    'h13': '[whispers] …ふふ。いい子',
    'h14': '[excited] お姉さん、またね！ 絶対だよー！',
}
STAFF_VOICE = 'yPc0NYDQ3YY6sY4bxZwS'   # tools/eleven/cast.json staff_f (user's pick r1_a)
STAFF = {
    's01': '[cheerful] 次の方、どうぞー',
    's02': '[politely] そろそろお時間でーす',
    's03': '[firmly] お時間でーす、お手を離してくださーい',
    's04': '[cheerful] はい、ありがとうございましたー',
}
_el = []
def eleven(text, voice=None):
    if not _el:
        from dotenv import load_dotenv
        load_dotenv(os.path.join(ROOT, '..', '..', '..', '.env.local'))
        from elevenlabs import ElevenLabs
        _el.append(ElevenLabs())
    from elevenlabs import VoiceSettings
    pcm = b''.join(_el[0].text_to_speech.convert(text=text, voice_id=voice or HINATA_VOICE, model_id=HINATA_MODEL, language_code='ja', seed=SEED,
                                                 output_format='pcm_24000', voice_settings=VoiceSettings(stability=.4, similarity_boost=.8)))
    b = io.BytesIO()
    with wave.open(b, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm)
    return b.getvalue()


def tts(text, sid, pitch, inton, speed, pause):
    q = json.loads(urllib.request.urlopen(urllib.request.Request(f'{API}/audio_query?' + urllib.parse.urlencode({'text': text, 'speaker': sid}), method='POST')).read())
    q.update(outputSamplingRate=48000, prePhonemeLength=.15, postPhonemeLength=.35, pitchScale=pitch, intonationScale=inton, speedScale=speed)
    if 'pauseLengthScale' in q: q['pauseLengthScale'] = pause
    else:
        for ph in q['accent_phrases']:
            if ph.get('pause_mora'): ph['pause_mora']['vowel_length'] *= pause
    return urllib.request.urlopen(urllib.request.Request(f'{API}/synthesis?speaker={sid}', data=json.dumps(q).encode(), headers={'Content-Type': 'application/json'})).read()


def breathe(wav_bytes, amount):
    """a soft breath layer: 1.5–7 kHz noise shaped by the voice envelope."""
    with wave.open(io.BytesIO(wav_bytes)) as w: sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    env = np.abs(x); k = int(sr * .03); env = np.convolve(env, np.ones(k) / k, 'same')
    n = np.random.default_rng(1).standard_normal(len(x)).astype(np.float32)
    n = sosfilt(butter(4, [1500, 7000], 'bandpass', fs=sr, output='sos'), n)
    y = x + amount * 2.2 * n * env
    y = y / max(1e-6, np.max(np.abs(y))) * .9
    b = io.BytesIO()
    with wave.open(b, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((y * 32767).astype(np.int16).tobytes())
    return b.getvalue()


def save(wav_bytes, dst, k, eq):
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: f.write(wav_bytes); p = f.name
    af = ([f'asetrate={round(48000 * k)}', 'aresample=48000', f'atempo={1 / k:.5f}'] if k != 1 else [])
    if eq: af += ['equalizer=f=160:t=q:w=1:g=4', 'equalizer=f=3200:t=q:w=1.5:g=-2', 'highshelf=f=9000:g=3']
    af += ['loudnorm=I=-18:TP=-2']
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', p, '-ac', '1', '-af', ','.join(af), '-c:a', 'aac', '-b:a', '128k', dst], check=True); os.remove(p)


def dur(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True)
    return round(float(r.stdout.strip().strip(',')), 3)


durs = {}
for lid, v in LINES.items():
    style = v[2]; text = v[3] if len(v) > 3 else v[0]
    staff = style == 'staff'
    if staff:
        key = json.dumps(['eleven', STAFF_VOICE, HINATA_MODEL, SEED, STAFF[lid]], ensure_ascii=False)
    else:
        if lid not in ELEVEN: raise SystemExit(f'{lid}: add its tagged text to ELEVEN')
        key = json.dumps(['eleven', HINATA_VOICE, HINATA_MODEL, SEED, ELEVEN[lid]], ensure_ascii=False)
    dst = os.path.join(out_dir, lid + '.m4a')
    if cache.get(lid) != key or not os.path.exists(dst):
        if staff:
            save(eleven(STAFF[lid], STAFF_VOICE), dst, 1.0, False)
        else:
            save(eleven(ELEVEN[lid]), dst, 1.0, False)
        cache[lid] = key; print('voiced', lid, text)
    durs[lid] = dur(dst)
for f in os.listdir(out_dir):
    if f.endswith('.m4a') and f[:-4] not in LINES: os.remove(os.path.join(out_dir, f))
json.dump(cache, open(cache_p, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(ROOT, 'media', 'voice.js'), 'w').write('window.HINA_VOICE = ' + json.dumps({'credit': 'ElevenLabs', 'dur': durs}) + ';\n')
print(len(durs), 'lines,', round(sum(durs.values()), 1), 's')
