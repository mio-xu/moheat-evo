"""Voice audition for grandma Hana + grandpa Gen: 4 VOICEVOX candidates each, two lines each.
Grandma candidates get a slight age tremor (ffmpeg vibrato) since VOICEVOX has no elderly female voice.
  python3 scripts/audition.py   → audio/audition/ + index.html (local only)"""
import json, os, subprocess, tempfile, urllib.parse, urllib.request
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = 'http://127.0.0.1:50021'
OUT = os.path.join(ROOT, 'audio', 'audition'); os.makedirs(OUT, exist_ok=True)
CHARS = [
 ('gm', 'おばあちゃん ハナ', ['はいはい、もしもし〜？ …あらまあ！ あんたかい！ げんきにしとった？', 'ちゃんとごはん、たべとる？ さむいけん、あったかくしときんさいよ。'],
  [('b1', 'もち子さん', 'のんびり', -.05, 1.15, .86, True), ('b2', '東北イタコ', 'ノーマル', -.06, 1.1, .86, True),
   ('b3', '春日部つむぎ', 'ノーマル', -.09, 1.1, .85, True), ('b4', '四国めたん', 'ノーマル', -.08, 1.05, .85, True)]),
 ('gp', 'おじいちゃん ゲン', ['もしもし！ じいちゃんだぞ！ ばあさん、はよかわらんか！', 'じいちゃんはな、ゆきだるまをおくったんじゃ。 ちっこいけど、かわいかろう？'],
  [('j1', 'ちび式じい', 'ノーマル', .0, 1.1, .95, False), ('j2', 'ちび式じい', 'ノーマル', -.03, 1.25, .9, False),
   ('j3', '麒ヶ島宗麟', 'ノーマル', -.02, 1.1, .9, True), ('j4', '玄野武宏', 'ノーマル', -.1, 1.0, .86, True)]),
]
def tts(text, sid, pitch, inton, speed):
    q = json.loads(urllib.request.urlopen(urllib.request.Request(f'{API}/audio_query?' + urllib.parse.urlencode({'text': text, 'speaker': sid}), method='POST')).read())
    q.update(outputSamplingRate=48000, prePhonemeLength=.1, postPhonemeLength=.25, pitchScale=pitch, intonationScale=inton, speedScale=speed)
    return urllib.request.urlopen(urllib.request.Request(f'{API}/synthesis?speaker={sid}', data=json.dumps(q).encode(), headers={'Content-Type': 'application/json'})).read()
spk = {s['name']: {t['name']: t['id'] for t in s['styles']} for s in json.loads(urllib.request.urlopen(f'{API}/speakers').read())}
html = ['<meta charset=utf-8><title>Family call voices</title><style>body{font:15px sans-serif;background:#f6efe6;padding:20px}.c{background:#fff;border-radius:10px;padding:10px 14px;margin:8px 0}</style>']
for key, name, lines, cands in CHARS:
    html.append(f'<h2>{name}</h2>')
    for vid, sp, st, pitch, inton, speed, trem in cands:
        html.append(f'<div class=c><b>{vid} · {sp} {st}</b> <small>pitch {pitch:+.2f} inton {inton} speed {speed}{" + tremor" if trem else ""}</small><br>')
        for i, text in enumerate(lines):
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: f.write(tts(text, spk[sp][st], pitch, inton, speed)); wav = f.name
            af = (['vibrato=f=5.5:d=0.06'] if trem else []) + ['loudnorm=I=-18:TP=-2']
            dst = f'{vid}_{i}.m4a'
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-af', ','.join(af), '-c:a', 'aac', '-b:a', '128k', os.path.join(OUT, dst)], check=True); os.remove(wav)
            html.append(f'<audio controls src="{dst}"></audio> ')
        html.append('</div>')
open(os.path.join(OUT, 'index.html'), 'w').write('\n'.join(html)); print('ok', OUT)
