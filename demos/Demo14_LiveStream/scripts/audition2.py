"""Voice audition round 2: Mint (四国めたん m2) a bit lower, and Luna with voices nobody else uses, tuned low and mature.
Taken: Mint 四国めたん, Cocoa ユーレイちゃん, Hinata 春日部つむぎ. Formant k < 1 = deeper, more mature timbre at the same pitch
(synthesize at pitch − ln k, then asetrate ×k + atempo 1/k).

  python3 scripts/audition2.py   → audio/audition/r2/index.html (local only)
"""
import json, math, os, subprocess, tempfile, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = 'http://127.0.0.1:50021'
OUT = os.path.join(ROOT, 'audio', 'audition', 'r2'); os.makedirs(OUT, exist_ok=True)
MINT = ('こんばんは…ミントです。今日も、ねむれないひとのための、ささやき配信…はじめますね。', '…じゃあ、みぎのおみみから。…ふぅー。…つめたかった？')
LUNA = ('…こんばんは。夜ふかしさん、いらっしゃい。今夜も、ゆっくりはなそうか。', '…ねえ。この配信、ほんとは、きみに会いたくて、つけてるの。')
# (id, title, lines, speaker, talk style, whisper style|None, pitch, intonation, speed, formant k)
V = [
    ('m2', 'ミント · m2 いまのまま (reference)', MINT, '四国めたん', 'ささやき', 'ヒソヒソ', .00, 1.00, .92, 1.00),
    ('m2a', 'ミント · m2 すこし低く · pitch −0.03', MINT, '四国めたん', 'ささやき', 'ヒソヒソ', -.03, 1.00, .92, 1.00),
    ('m2b', 'ミント · m2 もっと低く · pitch −0.05, deeper ×0.96', MINT, '四国めたん', 'ささやき', 'ヒソヒソ', -.05, 1.00, .92, .96),
    ('L1', 'ルナ · 冥鳴ひまり low · pitch −0.05', LUNA, '冥鳴ひまり', 'ノーマル', None, -.05, .95, .93, 1.00),
    ('L2', 'ルナ · 冥鳴ひまり low + deeper ×0.95', LUNA, '冥鳴ひまり', 'ノーマル', None, -.04, .95, .93, .95),
    ('L3', 'ルナ · 夜語トバリ low · pitch −0.05', LUNA, '夜語トバリ', 'ノーマル', None, -.05, 1.00, .93, 1.00),
    ('L4', 'ルナ · 九州そら セクシー low (close to l4)', LUNA, '九州そら', 'セクシー', 'ささやき', -.05, 1.00, .93, 1.00),
    ('L5', 'ルナ · 九州そら セクシー low + deeper ×0.95', LUNA, '九州そら', 'セクシー', 'ささやき', -.04, 1.00, .93, .95),
    ('L6', 'ルナ · 波音リツ low + deeper ×0.96', LUNA, '波音リツ', 'ノーマル', None, -.04, .95, .93, .96),
    ('L7', 'ルナ · No.7 · calm adult', LUNA, 'No.7', 'ノーマル', None, -.03, 1.00, .95, 1.00),
]


def tts(text, sid, pitch, inton, speed):
    q = json.loads(urllib.request.urlopen(urllib.request.Request(f'{API}/audio_query?' + urllib.parse.urlencode({'text': text, 'speaker': sid}), method='POST')).read())
    q.update(outputSamplingRate=48000, prePhonemeLength=.1, postPhonemeLength=.25, pitchScale=pitch, intonationScale=inton, speedScale=speed)
    return urllib.request.urlopen(urllib.request.Request(f'{API}/synthesis?speaker={sid}', data=json.dumps(q).encode(), headers={'Content-Type': 'application/json'})).read()


def save(wav_bytes, dst, k=1.0, soft=False):
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: f.write(wav_bytes); wav = f.name
    af = ([f'asetrate={round(48000 * k)}', 'aresample=48000', f'atempo={1 / k:.5f}'] if k != 1 else []) + (['volume=0.8'] if soft else []) + ['loudnorm=I=-18:TP=-2']
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-af', ','.join(af), '-c:a', 'aac', '-b:a', '128k', dst], check=True)
    os.remove(wav)


def main():
    spk = {s['name']: {t['name']: t['id'] for t in s['styles']} for s in json.loads(urllib.request.urlopen(f'{API}/speakers').read())}
    cards = []
    for vid, title, lines, sp, st, wst, pitch, inton, speed, k in V:
        clips = []
        for lid, text in zip(('talk', 'whisper'), lines):
            w = lid == 'whisper'
            sid = spk[sp][wst] if w and wst else spk[sp][st]
            wav = tts(text, sid, pitch - math.log(k), inton * (.85 if w and not wst else 1), speed * (.88 if w else 1))
            f = f'{vid}_{lid}.m4a'; save(wav, os.path.join(OUT, f), k, soft=w and not wst); clips.append((lid, f))
        cards.append(f'<div class="c{" m" if vid.startswith("m") else ""}"><h3>{vid} · {title}</h3><small>{sp} {st}/{wst or st} · pitch {pitch:+.2f} · inton {inton:.2f} · speed {speed:.2f} · formant ×{k:.2f}</small>'
                     + ''.join(f'<p>{l}</p><audio controls preload="none" src="{f}"></audio>' for l, f in clips) + '</div>')
        print('voiced', vid, flush=True)
    html = f'''<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Streamer voices · round 2</title><style>
:root{{--bg:#17131d;--card:#231c2c;--ink:#f3ecf7;--soft:#b8acc5}}body{{margin:0;padding:24px 16px;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,"Hiragino Sans",sans-serif}}
h1{{font-size:20px;margin:0 0 6px}}h2{{font-size:16px;color:#ffc2d8;margin:20px 0 10px}}.note{{color:var(--soft);margin:0}}
.g{{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px}}.c{{background:var(--card);border-radius:12px;padding:10px 12px}}.c.m{{border:1px solid #5fd3b8}}
.c h3{{font-size:14px;margin:0}}.c small{{color:var(--soft)}}.c p{{margin:6px 0 2px;color:var(--soft);font-size:12px}}audio{{width:100%}}</style></head><body>
<h1>Demo 14 · 声音 第2轮 / voices round 2</h1><p class="note">已定：ミント 四国めたん · ココア ユーレイちゃん · ひなた 春日部つむぎ（h2）。ルナ只用其他声音，不重复。</p>
<h2>ミント · 四国めたん 低一点？</h2><div class="g">{"".join(c for c in cards if ' m"' in c)}</div>
<h2>ルナ · 低沉成熟（不重复的声音）</h2><div class="g">{"".join(c for c in cards if ' m"' not in c)}</div></body></html>'''
    open(os.path.join(OUT, 'index.html'), 'w').write(html)
    print('→', os.path.join(OUT, 'index.html'))


if __name__ == '__main__':
    main()
