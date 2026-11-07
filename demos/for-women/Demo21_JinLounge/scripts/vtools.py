"""Shared VOICEVOX helpers (tts with pause scaling, breath layer, formant + close-mic EQ save) — copied from Demo16 audition4.py.
slower + longer pauses (pauseLengthScale), wider intonation, lower pitch, optional deeper formant,
close-mic EQ (+low warmth, +air) and an optional breath layer (band-passed noise following the voice envelope).
→ audio/audition/round4/ + index.html (local only)."""
import io, json, math, os, subprocess, tempfile, urllib.parse, urllib.request, wave
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = 'http://127.0.0.1:50021'
OUT = os.path.join(ROOT, 'audio', 'audition', 'round4')
LINES = [
    ('invite', '誘う', '濡れたまま、来たの？ …ふふ。 おいで。 髪、乾かしてあげる。'),
    ('whisper', '耳元', '動かないで。 …君の髪、いい匂いがする。'),
    ('tease', '意味深', 'この曲は、君にしか聴かせない。 …意味、わかるよね？'),
    ('laugh', '笑み', 'ふっ…。 そんな顔されたら、帰したくなくなるな。'),
]
# (id, title, pitch, intonation, speed, pause ×, formant k, EQ, breath)
VARIANTS = [
    ('s0', '原声对照 · plain', 0, 1.0, 1.0, 1.0, 1.0, False, 0),
    ('s1', '慢、停顿长、起伏大 · slow, emotional', -.03, 1.3, .86, 1.6, 1.0, True, 0),
    ('s2', 's1 + 声音更低更厚 · deeper chest', -.04, 1.3, .86, 1.6, .96, True, 0),
    ('s3', 's1 + 气声 · breathy', -.03, 1.3, .86, 1.6, 1.0, True, .55),
    ('s4', '更厚 + 气声 + 起伏更大 · deeper, breathy, very expressive', -.04, 1.45, .84, 1.7, .96, True, .7),
]


def tts(text, sid, pitch, inton, speed, pause):
    q = json.loads(urllib.request.urlopen(urllib.request.Request(f'{API}/audio_query?' + urllib.parse.urlencode({'text': text, 'speaker': sid}), method='POST')).read())
    q.update(outputSamplingRate=48000, prePhonemeLength=.15, postPhonemeLength=.35, pitchScale=pitch, intonationScale=inton, speedScale=speed)
    if 'pauseLengthScale' in q: q['pauseLengthScale'] = pause
    else:
        for ph in q['accent_phrases']:
            if ph.get('pause_mora'): ph['pause_mora']['vowel_length'] *= pause
    return urllib.request.urlopen(urllib.request.Request(f'{API}/synthesis?speaker={sid}', data=json.dumps(q).encode(), headers={'Content-Type': 'application/json'})).read()


def breathe(wav_bytes, amount):
    """add a soft breath layer: 1.5–7 kHz noise shaped by the voice envelope (slightly delayed / smoothed)."""
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


def main():
    sid = next(t['id'] for s in json.loads(urllib.request.urlopen(f'{API}/speakers').read()) if s['name'] == '剣崎雌雄' for t in s['styles'])
    os.makedirs(OUT, exist_ok=True); cards = []
    for vid, title, pitch, inton, speed, pause, k, eq, br in VARIANTS:
        clips = []
        for lid, lab, text in LINES:
            soft = lid in ('whisper', 'laugh')
            w = tts(text, sid, pitch - math.log(k) - (.01 if soft else 0), inton * (.92 if soft else 1), speed * (.93 if soft else 1), pause)
            if br: w = breathe(w, br * (1.3 if soft else 1))
            f = f'{vid}_{lid}.m4a'; save(w, os.path.join(OUT, f), k, eq); clips.append((lab, f))
        cards.append((f'{vid} · {title}', f'pitch {pitch:+.2f} · intonation {inton:.2f} · speed {speed:.2f} · pause ×{pause} · formant ×{k} · EQ {"on" if eq else "off"} · breath {br}', clips))
        print('voiced', vid)
    body = '<p class="l">' + '<br>'.join(f'{lab}：{x}' for _, lab, x in LINES) + '</p><div class="g">' + ''.join(
        f'<div class="c"><h3>{h}</h3><small>{p}</small>' + ''.join(f'<p>{l}</p><audio controls preload="none" src="{f}"></audio>' for l, f in cl) + '</div>' for h, p, cl in cards) + '</div>'
    src = open(os.path.join(ROOT, 'audio', 'audition', 'round2', 'index.html')).read()
    open(os.path.join(OUT, 'index.html'), 'w').write(src[:src.index('<body>')] + f'<body><h1>紫苑 · 剣崎雌雄 · 更有感情、更性感 · 第 4 轮</h1>{body}</body></html>')


if __name__ == '__main__':
    main()
