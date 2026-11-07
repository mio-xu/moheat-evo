"""Round 3 around v3 (青山龍星 しっとり, pitch +0.06, intonation 1.20, speed 1.03) + other voices tuned the same way.

Formant lift (younger, softer timbre at the SAME pitch): synthesize with pitch lowered by ln(k), then asetrate ×k (pitch and
formants up by k) + atempo 1/k (duration back) → pitch unchanged, formants +(k−1).

  python3 scripts/audition_ren3.py   → audio/audition/ren3/ + index.html (local only)
"""
import json, math, os, subprocess, tempfile, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = 'http://127.0.0.1:50021'
OUT = os.path.join(ROOT, 'audio', 'audition', 'ren3'); os.makedirs(OUT, exist_ok=True)
LINES = [
    ('gentle', 'もしもし？ …ごめん、起こしちゃった？ 今日のライブ、ちゃんと見ててくれた？'),
    ('shy', 'え、かっこよかった？ …そっか。 なんか、照れるな。'),
    ('whisper', 'ねえ…反対の耳でも、聞いてて。 …今、すごく会いたい。'),
]
# (id, title, speaker, style, whisper style, pitch, intonation, speed, formant k)
V = [
    ('a1', 'v3 そのまま · v3 as is (reference)', '青山龍星', 'しっとり', '囁き', .06, 1.20, 1.03, 1.00),
    ('a2', 'v3 + 声质年轻一点 · formant +4%', '青山龍星', 'しっとり', '囁き', .06, 1.20, 1.03, 1.04),
    ('a3', 'v3 + 声质更年轻 · formant +8%', '青山龍星', 'しっとり', '囁き', .06, 1.20, 1.03, 1.08),
    ('a4', '音高低一点 + 声质年轻 · lower pitch, formant +6%', '青山龍星', 'しっとり', '囁き', .03, 1.20, 1.02, 1.06),
    ('a5', '更温柔、慢一点 · tender, slower', '青山龍星', 'しっとり', '囁き', .05, 1.30, .97, 1.04),
    ('a6', '更甜、更有起伏 · sweeter, more melodic', '青山龍星', 'しっとり', '囁き', .07, 1.40, 1.00, 1.05),
    ('b1', '玄野武宏 · 年轻自然 · young, natural', '玄野武宏', 'ノーマル', None, .00, 1.15, 1.00, 1.00),
    ('b2', '猫使アル おちつき · 沉稳温柔 · calm, soft', '猫使アル', 'おちつき', None, -.02, 1.15, 1.00, 1.00),
    ('b3', '剣崎雌雄 · 清爽 · clear, cool', '剣崎雌雄', 'ノーマル', None, .00, 1.15, 1.00, 1.00),
    ('b4', '雀松朱司 · 柔和低音 · soft, low', '雀松朱司', 'ノーマル', None, .02, 1.15, 1.00, 1.00),
]


def tts(text, sid, pitch, inton, speed):
    q = json.loads(urllib.request.urlopen(urllib.request.Request(f'{API}/audio_query?' + urllib.parse.urlencode({'text': text, 'speaker': sid}), method='POST')).read())
    q.update(outputSamplingRate=48000, prePhonemeLength=.1, postPhonemeLength=.25, pitchScale=pitch, intonationScale=inton, speedScale=speed)
    return urllib.request.urlopen(urllib.request.Request(f'{API}/synthesis?speaker={sid}', data=json.dumps(q).encode(), headers={'Content-Type': 'application/json'})).read()


def save(wav_bytes, dst, k=1.0, phone=False, whisper=False):
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: f.write(wav_bytes); wav = f.name
    af = []
    if k != 1.0: af += [f'asetrate={round(48000 * k)}', 'aresample=48000', f'atempo={1 / k:.5f}']
    if whisper: af += ['volume=0.8']
    if phone: af += ['highpass=f=300', 'lowpass=f=3400', 'acompressor=threshold=-20dB:ratio=3']
    af += ['loudnorm=I=-18:TP=-2']
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-af', ','.join(af), '-c:a', 'aac', '-b:a', '128k', dst], check=True)
    os.remove(wav)


def main():
    speakers = {s['name']: {t['name']: t['id'] for t in s['styles']} for s in json.loads(urllib.request.urlopen(f'{API}/speakers').read())}
    cards = []
    for vid, title, spk, style, wstyle, pitch, inton, speed, k in V:
        st = speakers[spk]; clips = []
        for lid, text in LINES:
            whisper = lid == 'whisper'
            sid = st[wstyle] if whisper and wstyle else st[style]
            p = pitch - math.log(k) if k != 1.0 else pitch                     # formant lift keeps the pitch
            wav = tts(text, sid, p, inton * (.9 if whisper and not wstyle else 1), speed * (.9 if whisper else 1))
            f = f'{vid}_{lid}.m4a'; save(wav, os.path.join(OUT, f), k, whisper=whisper); clips.append((lid if not (whisper and not wstyle) else 'whisper (no 囁き style: slow + soft)', f))
            if lid == 'gentle': f2 = f'{vid}_gentle_phone.m4a'; save(wav, os.path.join(OUT, f2), k, phone=True); clips.append(('gentle · 📱 phone', f2))
        cards.append((vid, title, f'{spk} {style} · pitch {pitch:+.2f} · intonation {inton:.2f} · speed {speed:.2f} · formant ×{k:.2f}', clips))
        print('voiced', vid, title)
    sec = lambda pre, h: f'<h2 class="s">{h}</h2><div class="g">' + '\n'.join(
        f'<div class="c"><h3>{v} · {t}</h3><small>{p}</small>' + ''.join(f'<p>{l}</p><audio controls preload="none" src="{f}"></audio>' for l, f in cl) + '</div>'
        for v, t, p, cl in cards if v.startswith(pre)) + '</div>'
    html = f'''<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ren voice · round 3</title><style>
:root{{--bg:#16121c;--card:#221b2b;--ink:#f1eaf6;--soft:#b5a9c2}}body{{margin:0;padding:24px 16px;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,"Hiragino Sans",sans-serif}}
h1{{font-size:20px;margin:0 0 4px}}h2.s{{font-size:16px;margin:22px 0 10px;color:#ffc2d8}}.lines{{color:var(--soft);margin:0}}.g{{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}}
.c{{background:var(--card);border-radius:12px;padding:12px 14px}}.c h3{{font-size:15px;margin:0}}.c small{{color:var(--soft)}}.c p{{margin:8px 0 2px;color:var(--soft);font-size:13px}}audio{{width:100%}}
</style></head><body><h1>Ren · voice round 3</h1><p class="lines">{"<br>".join(t for _, t in LINES)}</p>
{sec('a', 'A · 青山龍星, around v3')}{sec('b', 'B · other voices, tuned like v3')}</body></html>'''
    open(os.path.join(OUT, 'index.html'), 'w').write(html)


if __name__ == '__main__':
    main()
