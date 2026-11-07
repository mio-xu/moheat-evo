"""Round 2: grandma = もち子さん のんびり made older (formant lowered ×K, slower, tremor); grandpa = ちび式じい variants.
Formant trick (as Demo 12): synthesize at pitch − ln K, then asetrate ×K + atempo 1/K → same pitch, formants ×K (K < 1 = older, larger).
  python3 scripts/audition2.py   → audio/audition2/ + index.html (local only)"""
import json, math, os, subprocess, tempfile, urllib.parse, urllib.request
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = 'http://127.0.0.1:50021'
OUT = os.path.join(ROOT, 'audio', 'audition2'); os.makedirs(OUT, exist_ok=True)
GM = ['はいはい、もしもし〜？ …あらまあ！ あんたかい！ げんきにしとった？', 'ちゃんとごはん、たべとる？ さむいけん、あったかくしときんさいよ。']
GP = ['もしもし！ じいちゃんだぞ！ ばあさん、はよかわらんか！', 'じいちゃんはな、ゆきだるまをおくったんじゃ。 ちっこいけど、かわいかろう？']
# (id, speaker, style, pitch, intonation, speed, formant K, tremor depth, note)
CHARS = [
 ('おばあちゃん ハナ — もち子さん のんびり', GM, [
  ('g1', 'もち子さん', 'のんびり', -.06, 1.15, .84, .94, .07, 'やや年配'),
  ('g2', 'もち子さん', 'のんびり', -.05, 1.20, .82, .91, .09, 'もっと年配'),
  ('g3', 'もち子さん', 'のんびり', -.09, 1.30, .86, .92, .06, '年配・明るい'),
  ('g4', 'もち子さん', 'のんびり', -.03, 1.15, .80, .88, .11, 'かなり年配・ゆっくり'),
  ('g5', 'もち子さん', 'のんびり', -.10, 1.10, .84, .93, .08, '低め・やわらか'),
  ('g6', 'もち子さん', 'のんびり', -.07, 1.35, .83, .90, .10, '年配・おしゃべり')]),
 ('おじいちゃん ゲン — ちび式じい', GP, [
  ('j0', 'ちび式じい', 'ノーマル', .00, 1.10, .95, 1.00, 0, '原声'),
  ('k1', 'ちび式じい', 'ノーマル', -.04, 1.20, .90, .95, 0, '少し低く・どっしり'),
  ('k2', 'ちび式じい', 'ノーマル', .03, 1.35, 1.00, 1.00, 0, '元気・明るい'),
  ('k3', 'ちび式じい', 'ノーマル', -.02, 1.15, .88, .93, .06, 'よぼよぼ・震え'),
  ('k4', 'ちび式じい', 'ノーマル', .00, 1.30, .95, 1.04, 0, '小さくてかわいい'),
  ('k5', 'ちび式じい', 'ノーマル', -.06, 1.00, .85, .97, 0, 'ゆっくり・まったり'),
  ('k6', 'ちび式じい', 'ノーマル', .02, 1.45, 1.05, 1.00, .04, 'せっかち・はしゃぐ')]),
]
spk = {s['name']: {t['name']: t['id'] for t in s['styles']} for s in json.loads(urllib.request.urlopen(f'{API}/speakers').read())}
def tts(text, sid, pitch, inton, speed):
    q = json.loads(urllib.request.urlopen(urllib.request.Request(f'{API}/audio_query?' + urllib.parse.urlencode({'text': text, 'speaker': sid}), method='POST')).read())
    q.update(outputSamplingRate=48000, prePhonemeLength=.1, postPhonemeLength=.25, pitchScale=pitch, intonationScale=inton, speedScale=speed)
    return urllib.request.urlopen(urllib.request.Request(f'{API}/synthesis?speaker={sid}', data=json.dumps(q).encode(), headers={'Content-Type': 'application/json'})).read()
html = ['<meta charset=utf-8><title>Family call voices 2</title><style>body{font:15px sans-serif;background:#f6efe6;padding:20px}.c{background:#fff;border-radius:10px;padding:10px 14px;margin:8px 0}</style>']
for name, lines, cands in CHARS:
    html.append(f'<h2>{name}</h2>')
    for vid, sp, st, pitch, inton, speed, K, trem, note in cands:
        html.append(f'<div class=c><b>{vid} · {note}</b> <small>pitch {pitch:+.2f} · inton {inton} · speed {speed} · formant ×{K}{f" · tremor {trem}" if trem else ""}</small><br>')
        for i, text in enumerate(lines):
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: f.write(tts(text, spk[sp][st], pitch - math.log(K), inton, speed)); wav = f.name
            af = ([f'asetrate={round(48000 * K)}', 'aresample=48000', f'atempo={1 / K:.5f}'] if K != 1 else []) + ([f'vibrato=f=5.5:d={trem}'] if trem else []) + ['loudnorm=I=-18:TP=-2']
            dst = f'{vid}_{i}.m4a'
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-af', ','.join(af), '-c:a', 'aac', '-b:a', '128k', os.path.join(OUT, dst)], check=True); os.remove(wav)
            html.append(f'<audio controls src="{dst}"></audio> ')
        html.append('</div>')
open(os.path.join(OUT, 'index.html'), 'w').write('\n'.join(html)); print('ok', OUT)
