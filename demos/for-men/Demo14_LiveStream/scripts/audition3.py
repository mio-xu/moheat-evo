"""Luna voice round 3 (user: her voice sounds stiff). Same voice (九州そら セクシー / ささやき), more melody and breath.
  python3 scripts/audition3.py → audio/audition/r3/index.html (local only)"""
import importlib.util, json, math, os, urllib.request
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.environ['ROUND'] = 'r3'
spec = importlib.util.spec_from_file_location('a2', os.path.join(ROOT, 'scripts', 'audition2.py')); A = importlib.util.module_from_spec(spec); spec.loader.exec_module(A)
LINES = [('talk', '…こんばんは。夜ふかしさん、いらっしゃい。今夜も、ゆっくりはなそうか。'), ('talk2', '…ふふ。よるのかぜって、すき。…でも、ひえすぎないでね。'),
         ('whisper', '…ねえ。このはいしん、ほんとは、きみにあいたくて、つけてるの。')]
V = [  # id, title, talk style, whisper style, pitch, intonation, speed, formant k
    ('n0', 'いまの L4 · current (reference)', 'セクシー', 'ささやき', -.05, 1.00, .93, 1.00),
    ('n1', '抑扬多一点 · more melody', 'セクシー', 'ささやき', -.04, 1.20, .95, 1.00),
    ('n2', '更有起伏、稍快 · lively, a bit faster', 'セクシー', 'ささやき', -.03, 1.35, .98, 1.00),
    ('n3', '温柔起伏 · soft melody, deeper timbre', 'セクシー', 'ささやき', -.03, 1.25, .95, .96),
    ('n4', '平常声 + 起伏 · normal style, melodic', 'ノーマル', 'ささやき', -.05, 1.25, .95, .97),
    ('n5', 'あまあま 低め · sweet style, lower', 'あまあま', 'ささやき', -.07, 1.20, .94, .96),
]
spk = {s['name']: {t['name']: t['id'] for t in s['styles']} for s in json.loads(urllib.request.urlopen(f'{A.API}/speakers').read())}
cards = []
for vid, title, st, wst, pitch, inton, speed, k in V:
    clips = []
    for lid, text in LINES:
        w = lid == 'whisper'; sid = spk['九州そら'][wst if w else st]
        wav = A.tts(text, sid, pitch - math.log(k), inton, speed * (.9 if w else 1))
        f = f'{vid}_{lid}.m4a'; A.save(wav, os.path.join(A.OUT, f), k); clips.append((lid, f))
    cards.append(f'<div class="c"><h3>{vid} · {title}</h3><small>九州そら {st}/{wst} · pitch {pitch:+.2f} · intonation {inton:.2f} · speed {speed:.2f} · formant ×{k:.2f}</small>'
                 + ''.join(f'<p>{l}</p><audio controls preload="none" src="{f}"></audio>' for l, f in clips) + '</div>')
    print('voiced', vid, flush=True)
open(os.path.join(A.OUT, 'index.html'), 'w').write(f'''<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Luna voice · round 3</title><style>
:root{{--bg:#14121f;--card:#211c30;--ink:#efeaf7;--soft:#b3a9c6}}body{{margin:0;padding:24px 16px;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,"Hiragino Sans",sans-serif}}h1{{font-size:20px;margin:0 0 6px}}.note{{color:var(--soft)}}
.g{{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:10px}}.c{{background:var(--card);border-radius:12px;padding:10px 12px}}.c h3{{font-size:14px;margin:0}}.c small{{color:var(--soft)}}.c p{{margin:6px 0 2px;color:var(--soft);font-size:12px}}audio{{width:100%}}</style></head><body>
<h1>ルナ · 声音 第3轮 / Luna voice round 3</h1><p class="note">同一个声音（九州そら），调得更有起伏、更自然。n0 是现在的版本。</p><div class="g">{"".join(cards)}</div></body></html>''')
print('→', os.path.join(A.OUT, 'index.html'))
