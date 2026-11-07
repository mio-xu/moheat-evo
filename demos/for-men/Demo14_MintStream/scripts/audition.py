"""Voice audition for the 4 streamers: 3 VOICEVOX candidates each, a talk line + a close-mic whisper line.
Voices without a whisper style get the whisper line slower and softer. (ずんだもん is left out: Demo 1/2 already use it.)

  python3 scripts/audition.py   → audio/audition/ + index.html (local only, audio/ is git-ignored)
"""
import json, os, subprocess, tempfile, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = 'http://127.0.0.1:50021'
OUT = os.path.join(ROOT, 'audio', 'audition'); os.makedirs(OUT, exist_ok=True)

CHARS = [  # (key, name, feel, talk line, whisper line, [(id, speaker, talk style, whisper style|None, pitch, intonation, speed)])
    ('mint', '白深ミント Mint', 'ASMR 囁き · 安静、困倦、温柔',
     'こんばんは…ミントです。今日も、ねむれないひとのための、ささやき配信…はじめますね。',
     '…じゃあ、みぎのおみみから。…ふぅー。…つめたかった？',
     [('m1', 'ユーレイちゃん', 'ささやき', 'ささやき', .00, 1.00, .92),
      ('m2', '四国めたん', 'ささやき', 'ヒソヒソ', .00, 1.00, .92),
      ('m3', '暁記ミタマ', 'ノーマル', 'ささやき', .00, 1.05, .92),
      ('m4', '九州そら', 'ささやき', 'ささやき', .00, 1.00, .92)]),
    ('hinata', '火野ひなた Hinata', '元气游戏主播 · 活泼、大声、爱笑',
     'おっはひな〜！ きょうは激辛ラーメン、完食するまで終われません！ みんな、応援よろしくっ！',
     '…えへへ、ここだけのはなしね。ほんとは、ちょっとだけ緊張してるんだ。',
     [('h1', '満別花丸', '元気', 'ささやき', .02, 1.30, 1.08),
      ('h2', '春日部つむぎ', 'ノーマル', None, .02, 1.30, 1.08),
      ('h3', '雨晴はう', 'ノーマル', None, .02, 1.30, 1.06),
      ('h4', '櫻歌ミコ', 'ノーマル', None, .00, 1.30, 1.06)]),
    ('luna', '宵月ルナ Luna', '深夜唱歌杂谈 · 冷静、成熟、低声',
     '…こんばんは。夜ふかしさん、いらっしゃい。今夜も、ゆっくりはなそうか。',
     '…ねえ、きこえてる？ 今夜は、きみのためだけに、うたうね。',
     [('l1', '冥鳴ひまり', 'ノーマル', None, -.02, 1.00, .95),
      ('l2', '夜語トバリ', 'ノーマル', None, .00, 1.00, .95),
      ('l3', '波音リツ', 'ノーマル', None, .00, .95, .95),
      ('l4', '四国めたん', 'セクシー', 'ささやき', -.02, 1.00, .95)]),
    ('cocoa', '甘音ココア Cocoa', '甜系咖啡杂谈 · 甜、暖、会撒娇',
     'ココアいれたよ〜！ あったかいうちに、いっしょにのもっ？ ふーふーしてあげる！',
     '…ふーっ、ふーっ。…はい、あーん。やけどしないでね？',
     [('c1', '九州そら', 'あまあま', 'ささやき', .00, 1.20, 1.00),
      ('c2', 'ユーレイちゃん', '甘々', 'ささやき', .00, 1.20, 1.00),
      ('c3', '満別花丸', 'ぶりっ子', 'ささやき', .00, 1.15, 1.00),
      ('c4', '四国めたん', 'あまあま', 'ささやき', .00, 1.20, 1.00)]),
]


def tts(text, sid, pitch, inton, speed):
    q = json.loads(urllib.request.urlopen(urllib.request.Request(f'{API}/audio_query?' + urllib.parse.urlencode({'text': text, 'speaker': sid}), method='POST')).read())
    q.update(outputSamplingRate=48000, prePhonemeLength=.1, postPhonemeLength=.25, pitchScale=pitch, intonationScale=inton, speedScale=speed)
    return urllib.request.urlopen(urllib.request.Request(f'{API}/synthesis?speaker={sid}', data=json.dumps(q).encode(), headers={'Content-Type': 'application/json'})).read()


def save(wav_bytes, dst, soft=False):
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: f.write(wav_bytes); wav = f.name
    af = (['volume=0.8'] if soft else []) + ['loudnorm=I=-18:TP=-2']
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-af', ','.join(af), '-c:a', 'aac', '-b:a', '128k', dst], check=True)
    os.remove(wav)


def main():
    spk = {s['name']: {t['name']: t['id'] for t in s['styles']} for s in json.loads(urllib.request.urlopen(f'{API}/speakers').read())}
    sections = []
    for key, name, feel, talk, whisper, cands in CHARS:
        cards = []
        for vid, sp, st, wst, pitch, inton, speed in cands:
            clips = []
            for lid, text in (('talk', talk), ('whisper', whisper)):
                w = lid == 'whisper'
                sid = spk[sp][wst] if w and wst else spk[sp][st]
                wav = tts(text, sid, pitch, inton * (.85 if w and not wst else 1), speed * (.88 if w else 1))
                f = f'{vid}_{lid}.m4a'; save(wav, os.path.join(OUT, f), soft=w and not wst)
                clips.append(('囁き whisper' + ('' if wst else ' (no whisper style: slow + soft)') if w else 'talk', f))
            cards.append(f'<div class="c"><h3>{vid} · {sp}</h3><small>{st} / {wst or st} · pitch {pitch:+.2f} · inton {inton:.2f} · speed {speed:.2f}</small>'
                         + ''.join(f'<p>{l}</p><audio controls preload="none" src="{f}"></audio>' for l, f in clips) + '</div>')
            print('voiced', vid, sp, flush=True)
        img = f'../../assets/art/design_{"ABCD"["mint hinata luna cocoa".split().index(key)]}_{key}.png'
        sections.append(f'<section><img src="{img}" alt=""><div><h2>{name}</h2><p class="feel">{feel}</p><p class="lines">{talk}<br>{whisper}</p>'
                        f'<div class="g">{"".join(cards)}</div></div></section>')
    html = f'''<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Streamer voices</title><style>
:root{{--bg:#17131d;--card:#231c2c;--ink:#f3ecf7;--soft:#b8acc5}}body{{margin:0;padding:24px 16px;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,"Hiragino Sans",sans-serif}}
h1{{font-size:20px;margin:0 0 16px}}section{{display:grid;grid-template-columns:220px 1fr;gap:16px;margin:0 0 28px}}section img{{width:100%;border-radius:12px}}
h2{{font-size:18px;margin:0;color:#ffc2d8}}.feel{{margin:2px 0;color:var(--soft)}}.lines{{margin:6px 0 10px;font-size:13px;color:var(--soft)}}
.g{{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}}.c{{background:var(--card);border-radius:12px;padding:10px 12px}}
.c h3{{font-size:14px;margin:0}}.c small{{color:var(--soft)}}.c p{{margin:6px 0 2px;color:var(--soft);font-size:12px}}audio{{width:100%}}
@media(max-width:640px){{section{{grid-template-columns:1fr}}section img{{max-width:240px}}}}</style></head><body><h1>Demo 14 · 主播声音试听 / streamer voices</h1>
{"".join(sections)}</body></html>'''
    open(os.path.join(OUT, 'index.html'), 'w').write(html)
    print('→', os.path.join(OUT, 'index.html'))


if __name__ == '__main__':
    main()
