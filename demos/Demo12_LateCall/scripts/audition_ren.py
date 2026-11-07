"""Round 2: 青山龍星 tuned toward Ren (24, gentle, a little shy in private). Variants of style / pitch / intonation / speed,
each with a gentle line, a shy line, a whisper (囁き) and the gentle line through a phone filter (300–3400 Hz).

  python3 scripts/audition_ren.py   → audio/audition/ren/*.m4a + audio/audition/ren/index.html (local only)
"""
import json, os, subprocess, tempfile, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = 'http://127.0.0.1:50021'
OUT = os.path.join(ROOT, 'audio', 'audition', 'ren'); os.makedirs(OUT, exist_ok=True)
LINES = [
    ('gentle', 'もしもし？ …ごめん、起こしちゃった？ 今日のライブ、ちゃんと見ててくれた？'),
    ('shy', 'え、かっこよかった？ …そっか。 なんか、照れるな。'),
    ('whisper', 'ねえ…反対の耳でも、聞いてて。 …今、すごく会いたい。'),
]
# (label, description, style for gentle/shy, pitch, intonation, speed)
VARIANTS = [
    ('v1', '原声 · original (ノーマル)', 'ノーマル', 0.00, 1.00, 1.00),
    ('v2', 'しっとり · 稍高 · gentle, a bit higher', 'しっとり', 0.03, 1.10, 1.00),
    ('v3', 'しっとり · 更年轻 · gentle, younger', 'しっとり', 0.06, 1.20, 1.03),
    ('v4', '喜び · 明亮 · brighter, smiling', '喜び', 0.04, 1.15, 1.02),
    ('v5', 'ノーマル · 最年轻 · youngest', 'ノーマル', 0.08, 1.25, 1.05),
]


def tts(text, sid, pitch, inton, speed):
    q = json.loads(urllib.request.urlopen(urllib.request.Request(f'{API}/audio_query?' + urllib.parse.urlencode({'text': text, 'speaker': sid}), method='POST')).read())
    q.update(outputSamplingRate=48000, prePhonemeLength=.1, postPhonemeLength=.25, pitchScale=pitch, intonationScale=inton, speedScale=speed)
    return urllib.request.urlopen(urllib.request.Request(f'{API}/synthesis?speaker={sid}', data=json.dumps(q).encode(), headers={'Content-Type': 'application/json'})).read()


def save(wav_bytes, dst, phone=False):
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: f.write(wav_bytes); wav = f.name
    af = 'loudnorm=I=-18:TP=-2' if not phone else 'highpass=f=300,lowpass=f=3400,acompressor=threshold=-20dB:ratio=3,loudnorm=I=-18:TP=-2'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-af', af, '-c:a', 'aac', '-b:a', '128k', dst], check=True)
    os.remove(wav)


def main():
    sp = next(s for s in json.loads(urllib.request.urlopen(f'{API}/speakers').read()) if s['name'] == '青山龍星')
    st = {s['name']: s['id'] for s in sp['styles']}
    cards = []
    for vid, desc, style, pitch, inton, speed in VARIANTS:
        clips = []
        for lid, text in LINES:
            sid = st['囁き'] if lid == 'whisper' else st[style]
            sp_ = speed * (.9 if lid == 'whisper' else 1)
            wav = tts(text, sid, pitch, inton, sp_)
            f = f'{vid}_{lid}.m4a'; save(wav, os.path.join(OUT, f)); clips.append((lid, f))
            if lid == 'gentle': f2 = f'{vid}_gentle_phone.m4a'; save(wav, os.path.join(OUT, f2), phone=True); clips.append(('gentle · 📱 phone', f2))
        cards.append((vid, desc, f'style {style} · pitch {pitch:+.2f} · intonation {inton:.2f} · speed {speed:.2f}', clips))
        print('voiced', vid, desc)
    body = '\n'.join(f'<div class="c"><h2>{v} · {d}</h2><small>{p}</small>' + ''.join(f'<p>{l}</p><audio controls preload="none" src="{f}"></audio>' for l, f in cl) + '</div>' for v, d, p, cl in cards)
    html = f'''<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ren voice · round 2</title><style>
:root{{--bg:#16121c;--card:#221b2b;--ink:#f1eaf6;--soft:#b5a9c2}}body{{margin:0;padding:24px 16px;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,"Hiragino Sans",sans-serif}}
h1{{font-size:20px;margin:0 0 4px}}.lines{{color:var(--soft);margin:0 0 18px}}.g{{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}}
.c{{background:var(--card);border-radius:12px;padding:12px 14px}}.c h2{{font-size:16px;margin:0}}.c small{{color:var(--soft)}}.c p{{margin:8px 0 2px;color:var(--soft);font-size:13px}}audio{{width:100%}}
</style></head><body><h1>Ren · 青山龍星 · round 2</h1><p class="lines">{"<br>".join(t for _, t in LINES)}</p><div class="g">{body}</div></body></html>'''
    open(os.path.join(OUT, 'index.html'), 'w').write(html)


if __name__ == '__main__':
    main()
