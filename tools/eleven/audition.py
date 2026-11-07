#!/usr/bin/env python3
"""Voice Design audition for characters in cast.json: 3 previews per character per round (they speak the cast 'sample'), saved under
out/<char>/rN_<k>.mp3 with their generated ids; one page out/index.html (all characters with previews) next to the current takes.
No voice slots are used until pick.py saves the chosen one. Run: python3 tools/eleven/audition.py ren jin [--again]"""
import base64, html, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tts as E  # noqa: E402

OUT = os.path.join(E.HERE, 'out')


def design(char, again):
    c = E.cast()[char]; d = os.path.join(OUT, char); os.makedirs(d, exist_ok=True)
    st_p = os.path.join(d, 'previews.json'); st = json.load(open(st_p)) if os.path.exists(st_p) else []
    if st and not again: return
    r = 1 + max([p['round'] for p in st] or [0])
    res = E.client().text_to_voice.design(voice_description=c['description'], text=c['sample'], model_id='eleven_ttv_v3')
    for i, p in enumerate(res.previews[:3]):
        k = f'r{r}_{chr(97 + i)}'
        open(os.path.join(d, k + '.mp3'), 'wb').write(base64.b64decode(p.audio_base_64))
        st.append({'key': k, 'round': r, 'generated_voice_id': p.generated_voice_id, 'description': c['description']})
        print('preview', char, k)
    json.dump(st, open(st_p, 'w'), indent=1)


def page():
    cast = E.cast(); cards = []
    for char, c in cast.items():
        st_p = os.path.join(OUT, char, 'previews.json')
        if char.startswith('_') or not os.path.exists(st_p) or c.get('voice_id'): continue
        st = json.load(open(st_p))
        cmp_ = ''.join(f'<audio controls preload="none" src="{os.path.relpath(os.path.join(E.REPO, p), OUT)}"></audio>' for p in c.get('compare', []))
        prev = ''.join(f'<div class="p"><b>{p["key"]}</b><audio controls preload="none" src="{char}/{p["key"]}.mp3"></audio></div>' for p in st)
        cards.append(f'<section><h2>{html.escape(c["name"])} <small>· {char}</small></h2><p class="l">{html.escape(c["persona"])}</p>'
                     f'<p class="s">{html.escape(c["sample"])}</p><div class="p"><b>现在</b><div>{cmp_ or "—"}</div></div>{prev}</section>')
    open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(
        '<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ElevenLabs 声音试听</title>'
        '<style>body{margin:0;padding:24px 16px;background:#16121c;color:#f1eaf6;font:15px/1.5 system-ui,"PingFang SC",sans-serif}h1{font-size:20px;margin:0 0 8px}'
        'section{background:#221b2b;border-radius:12px;padding:12px 16px;margin:14px 0}h2{font-size:18px;margin:0;color:#ffc2d8}h2 small{color:#b5a9c2;font-weight:400}'
        '.l{margin:4px 0;color:#e6d9f0}.s{margin:4px 0 10px;color:#b5a9c2;font-size:13px}.p{display:flex;gap:10px;align-items:center;margin:6px 0;flex-wrap:wrap}'
        '.p b{width:64px}audio{height:34px;max-width:100%}</style></head><body><h1>ElevenLabs 声音试听 · 选好后告诉我角色 + 编号（如 ren r1_b）</h1>'
        + ''.join(cards) + '</body></html>')
    print(os.path.join(OUT, 'index.html'))


if __name__ == '__main__':
    again = '--again' in sys.argv
    for ch in [a for a in sys.argv[1:] if not a.startswith('--')]: design(ch, again)
    page()
