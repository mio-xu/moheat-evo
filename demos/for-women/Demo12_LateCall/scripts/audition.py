"""Voice audition for Ren: every male VOICEVOX voice, a normal line + a whisper line, plus a listening page.

  python3 scripts/audition.py        → audio/audition/*.m4a + audio/audition/index.html (local only, not in git)

Needs the VOICEVOX engine on :50021 (double-click demos/all-ages/Demo1_SnowFoxfire/start_voicevox.command).
Whisper line uses the speaker's whisper / calm style when it has one.
"""
import json, os, subprocess, tempfile, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = 'http://127.0.0.1:50021'
OUT = os.path.join(ROOT, 'audio', 'audition'); os.makedirs(OUT, exist_ok=True)
MALE = ['玄野武宏', '白上虎太郎', '青山龍星', '剣崎雌雄', '雀松朱司', '麒ヶ島宗麟', '栗田まろん', '猫使アル', '黒沢冴白']
NORMAL = ['ノーマル', 'ふつう', 'おちつき']
WHISPER = ['囁き', 'ささやき', 'ヒソヒソ', 'しっとり', 'おちつき']
L1 = ('もしもし？ …ごめん、起こしちゃった？ 今日のライブ、ちゃんと見ててくれた？', "Hello? …Sorry, did I wake you? Did you watch the show tonight?")
L2 = ('ねえ…反対の耳でも、聞いてて。 …今、すごく会いたい。', "Hey… listen with your other ear too. …I really want to see you right now.")


def tts(text, sid, speed=1.0, pitch=0.0):
    q = json.loads(urllib.request.urlopen(urllib.request.Request(f'{API}/audio_query?' + urllib.parse.urlencode({'text': text, 'speaker': sid}), method='POST')).read())
    q.update(outputSamplingRate=48000, prePhonemeLength=.1, postPhonemeLength=.2, speedScale=speed, pitchScale=pitch)
    return urllib.request.urlopen(urllib.request.Request(f'{API}/synthesis?speaker={sid}', data=json.dumps(q).encode(), headers={'Content-Type': 'application/json'})).read()


def save(wav_bytes, dst):
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: f.write(wav_bytes); wav = f.name
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-af', 'loudnorm=I=-18:TP=-2', '-c:a', 'aac', '-b:a', '128k', dst], check=True)
    os.remove(wav)


def main():
    speakers = json.loads(urllib.request.urlopen(f'{API}/speakers').read())
    rows, n = [], 0
    for name in MALE:
        sp = next((s for s in speakers if s['name'] == name), None)
        if not sp: print('not installed:', name); continue
        styles = {s['name']: s['id'] for s in sp['styles']}
        normal = next((styles[k] for k in NORMAL if k in styles), sp['styles'][0]['id'])
        wname = next((k for k in WHISPER if k in styles), None)
        whisper = styles[wname] if wname else normal
        n += 1
        f1, f2 = f'{n:02d}_{name}_normal.m4a', f'{n:02d}_{name}_whisper.m4a'
        save(tts(L1[0], normal, speed=.95), os.path.join(OUT, f1))
        save(tts(L2[0], whisper, speed=.88, pitch=-.02), os.path.join(OUT, f2))
        rows.append((n, name, [k for k, v in styles.items() if v == normal][0], wname or '(normal style, slower)', f1, f2))
        print('voiced', n, name, 'styles:', ', '.join(styles))
    cards = '\n'.join(f'''<div class="c"><h2>{i:02d} · {nm}</h2>
  <p>Normal ({ns})</p><audio controls preload="none" src="{a}"></audio>
  <p>Whisper ({ws})</p><audio controls preload="none" src="{b}"></audio></div>''' for i, nm, ns, ws, a, b in rows)
    html = f'''<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ren voice audition</title><style>
:root{{--bg:#16121c;--card:#221b2b;--ink:#f1eaf6;--soft:#b5a9c2}}body{{margin:0;padding:24px 16px;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,"Hiragino Sans",sans-serif}}
h1{{font-size:20px;margin:0 0 4px}}.lines{{color:var(--soft);margin:0 0 18px}}.g{{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}}
.c{{background:var(--card);border-radius:12px;padding:12px 14px}}.c h2{{font-size:16px;margin:0 0 6px}}.c p{{margin:6px 0 2px;color:var(--soft);font-size:13px}}audio{{width:100%}}
</style></head><body><h1>Ren · voice audition (VOICEVOX)</h1>
<p class="lines">① {L1[0]}<br>② {L2[0]}</p><div class="g">
{cards}
</div></body></html>'''
    open(os.path.join(OUT, 'index.html'), 'w').write(html)
    print(len(rows), 'voices →', os.path.relpath(os.path.join(OUT, 'index.html'), ROOT))


if __name__ == '__main__':
    main()
