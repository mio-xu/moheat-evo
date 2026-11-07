#!/usr/bin/env python3
"""Desktop kit for the Seedance backgrounds (same idea as the Demo 7–9 kits): reads ../Seedance素材命令.md and builds
~/Desktop/MoHeat_Demo10_Seedance素材/ — one folder per clip with its first (and last) frame, style references,
the full positive prompt (general + shot) and the negative prompt as separate files, plus an index.html with copy buttons.
Re-run after editing the .md. The user drops the generated <name>.mp4 into the same folder."""
import html, json, os, re, shutil
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEMOS = os.path.dirname(ROOT)
KIT = os.path.expanduser('~/Desktop/MoHeat_Demo10_Seedance素材')
md = open(os.path.join(ROOT, 'Seedance素材命令.md'), encoding='utf-8').read()
blocks = re.findall(r'```\n(.*?)\n```', md, re.S)
general, negative = blocks[0].strip(), blocks[1].strip()
shots = re.findall(r'### (\d) · `([\w]+)\.mp4` · (.+?)\n```\n(.*?)\n```', md, re.S)
rows = {m[0]: m for m in re.findall(r'\| (\d) \| `[\w]+\.mp4` \| (.+?) \| (.+?) \|', md)}
STYLE = [('画风参考_A_Demo1房间.jpg', os.path.join(DEMOS, '../all-ages/Demo1_SnowFoxfire/art/chatgpt/room_bg.png')),
         ('画风参考_B_Demo3舞台.jpg', os.path.join(DEMOS, '../all-ages/Demo3_ShiningSmileConcert/assets/new_stage/concert_stage_split.png'))]
FRAMES = {'1': ['01_hut_night'], '2': ['02_hut_fire'], '3': ['03_gate_night'], '4': ['03_gate_night', '04_gate_open_end'],
          '5': ['05_tunnel_fork'], '6': ['06_spring_dark'], '7': ['07_spring_glow']}
PRIORITY = {'7': '★ 最优先', '3': '优先', '4': '优先'}
FIRE_OK = {'2'}   # hut_fire is the one clip that SHOULD show fire

def jpg(src, dst):
    im = Image.open(src).convert('RGB'); im.thumbnail((1920, 1920)); im.save(dst, 'JPEG', quality=90)

if os.path.isdir(KIT):
    for d in os.listdir(KIT):   # keep anything the user generated (*.mp4); rebuild the rest
        p = os.path.join(KIT, d)
        if os.path.isdir(p):
            for f in os.listdir(p):
                if not f.endswith(('.mp4', '.mov')): os.remove(os.path.join(p, f))
os.makedirs(KIT, exist_ok=True)
cards = []
for num, name, title, shot in shots:
    folder = f'{num}_{name}'; d = os.path.join(KIT, folder); os.makedirs(d, exist_ok=True)
    frames = FRAMES[num]; files = []
    for i, fr in enumerate(frames):
        lab = '首帧' if i == 0 else '尾帧'
        dst = f'{lab}_{fr}.jpg'; jpg(os.path.join(ROOT, 'project/layout_refs', fr + '.jpg'), os.path.join(d, dst)); files.append(dst)
    for dst, src in STYLE: jpg(src, os.path.join(d, dst)); files.append(dst)
    neg = negative if num not in FIRE_OK else negative.replace('fire (unless asked), ', '')
    pos = general + '\n\n' + shot.strip()
    open(os.path.join(d, 'prompt.txt'), 'w').write(pos + '\n')
    open(os.path.join(d, '负面提示词.txt'), 'w').write(neg + '\n')
    two = len(frames) > 1
    how = (f'图生视频 · 16:9 · 1080p · 5 s · 固定镜头 · 运动幅度小\n'
           f'首帧：{files[0]}' + (f'\n尾帧：{files[1]}（石门打开后的样子；只播一次，不用循环）' if two else '\n尾帧：同一张首帧（无缝循环；不支持首尾帧就只传首帧）') +
           '\n画风参考（支持多参考图时一起上传）：画风参考_A / B — 只学画风，不要照搬内容'
           f'\n生成后存成：{name}.mp4（放在这个文件夹里）')
    open(os.path.join(d, '00_做法.txt'), 'w').write(f'{num} · {name}.mp4 · {title}\n\n{how}\n\n—— 正面提示词：prompt.txt\n—— 负面提示词：负面提示词.txt\n')
    cards.append(dict(num=num, name=name, title=title, folder=folder, files=files, pos=pos, neg=neg, how=how, prio=PRIORITY.get(num, ''), two=two))

open(os.path.join(KIT, '00_使い方.txt'), 'w').write('''MoHeat Evo — 解谜 Demo《火をともして、ひみつの泉へ》Seedance 素材包

只做背景，共 7 段 5 秒视频（狐狸、蜡烛、火焰、道具都由程序画，视频里不要出现）。
画风和 Demo 1–4 一样：可爱日系 2D、粉彩、赛璐璐。

最方便：双击 index.html。每段一张卡片：参考图缩略图 +「复制提示词」「复制负面提示词」按钮 + 做完打勾。
每段也有自己的文件夹：
  首帧_*.jpg     构图参考（我程序画的简单版，物体位置要一致，请重画成精致插画）
  尾帧_*.jpg     只有第 4 段（石门打开）有
  画风参考_A/B   Demo 1 房间、Demo 3 舞台，只学画风
  prompt.txt / 负面提示词.txt / 00_做法.txt

参数：图生视频 · 16:9 · 1080p · 5 秒 · 固定镜头 · 运动幅度小。
优先顺序：7（地底湖发光，全片高潮）→ 3、4（洞口石门）→ 1、2（小屋）→ 5 → 6。

生成后：挑最好的一条，按文件夹里写的文件名（例：spring_glow.mp4）存进同一个文件夹，告诉我就行。
不能用的：出现人物/动物/文字、镜头在动、物体位置和首帧差很多。
''')

def esc(s): return html.escape(s, quote=True)
items = ''.join(f'''
<article class="card" data-id="{c['name']}">
  <header><span class="num">{c['num']}</span><div><h2>{esc(c['title'])} {f'<em>{c["prio"]}</em>' if c['prio'] else ''}</h2>
    <p class="save">生成后存成 <code>{c['folder']}/{c['name']}.mp4</code></p></div>
    <label class="done"><input type="checkbox"> 完成</label></header>
  <div class="refs">{''.join(f'<figure><a href="{c["folder"]}/{f}" target="_blank"><img src="{c["folder"]}/{f}" alt=""></a><figcaption>{esc(f)}</figcaption></figure>' for f in c['files'])}</div>
  <pre class="how">{esc(c['how'])}</pre>
  <div class="btns"><button data-copy="pos">📋 复制提示词</button><button data-copy="neg">🚫 复制负面提示词</button><a href="{c['folder']}/" target="_blank">📂 打开文件夹</a></div>
  <details><summary>查看提示词</summary><pre>{esc(c['pos'])}</pre><pre class="neg">{esc(c['neg'])}</pre></details>
</article>''' for c in cards)
data = json.dumps({c['name']: {'pos': c['pos'], 'neg': c['neg']} for c in cards}, ensure_ascii=False)
open(os.path.join(KIT, 'index.html'), 'w').write(f'''<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Seedance 素材 · 火をともして、ひみつの泉へ</title>
<style>
:root{{--bg:#16121c;--card:#211b2a;--line:#3a3046;--ink:#f1ecf5;--soft:#b3a9c0;--acc:#ffb36b;--cool:#8fd8ff}}
*{{box-sizing:border-box}} body{{margin:0;background:var(--bg);color:var(--ink);font:14px/1.6 -apple-system,"Hiragino Sans","PingFang SC",sans-serif}}
main{{max-width:1180px;margin:0 auto;padding:24px 16px 60px}} h1{{margin:0 0 4px;font-size:24px}} .lead{{color:var(--soft);margin:0 0 6px}}
.params{{display:inline-block;margin:6px 0 18px;padding:6px 12px;border-radius:999px;background:rgba(143,216,255,.12);border:1px solid rgba(143,216,255,.4);color:var(--cool)}}
.card{{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px;margin:0 0 16px}} .card.is-done{{opacity:.55}}
.card header{{display:flex;gap:12px;align-items:flex-start}} .num{{flex:none;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:var(--acc);color:#2a1606;font-weight:800}}
.card h2{{margin:0;font-size:17px}} .card h2 em{{font-style:normal;font-size:12px;color:#2a1606;background:#ffd36a;border-radius:999px;padding:1px 8px;margin-left:6px;vertical-align:2px}}
.save{{margin:2px 0 0;color:var(--soft)}} code{{background:#0f0c14;padding:1px 6px;border-radius:6px;color:#ffe0b8}}
.done{{margin-left:auto;white-space:nowrap;cursor:pointer;color:var(--soft)}}
.refs{{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin:12px 0}} figure{{margin:0}}
figure img{{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:10px;border:1px solid var(--line);display:block}} figcaption{{font-size:11.5px;color:var(--soft);margin-top:3px;word-break:break-all}}
pre{{white-space:pre-wrap;margin:8px 0;padding:10px 12px;border-radius:10px;background:#0f0c14;border:1px solid var(--line);font:12.5px/1.55 ui-monospace,Menlo,monospace}} pre.neg{{color:#ffb3b3}} .how{{color:#d8f1ff}}
.btns{{display:flex;flex-wrap:wrap;gap:8px}} .btns button,.btns a{{cursor:pointer;border:1px solid var(--line);background:#2d2538;color:var(--ink);border-radius:10px;padding:8px 14px;font:inherit;text-decoration:none}}
.btns button:hover,.btns a:hover{{border-color:var(--acc)}} .btns button.ok{{background:#2f6b45;border-color:#3ddc84}} summary{{cursor:pointer;color:var(--soft);margin-top:8px}}
</style></head><body><main>
<h1>Seedance 素材 · 火をともして、ひみつの泉へ</h1>
<p class="lead">7 段背景循环视频（5 秒）。画风同 Demo 1–4：可爱日系 2D、粉彩、赛璐璐。狐狸、蜡烛、火焰、道具都由程序画，视频里不要出现。</p>
<span class="params">图生视频 · 16:9 · 1080p · 5 s · 固定镜头 · 运动幅度小 · 优先：7 → 3/4 → 1/2 → 5 → 6</span>
{items}
</main><script>
const P = {data};
document.querySelectorAll('.card').forEach((c) => {{
  const id = c.dataset.id, cb = c.querySelector('.done input'), key = 'd10kit.' + id;
  try {{ cb.checked = localStorage.getItem(key) === '1'; }} catch {{}}
  c.classList.toggle('is-done', cb.checked);
  cb.addEventListener('change', () => {{ c.classList.toggle('is-done', cb.checked); try {{ localStorage.setItem(key, cb.checked ? '1' : '0'); }} catch {{}} }});
  c.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', async () => {{
    const t = P[id][b.dataset.copy];
    try {{ await navigator.clipboard.writeText(t); }} catch {{ const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); }}
    const o = b.textContent; b.textContent = '✓ 已复制'; b.classList.add('ok'); setTimeout(() => {{ b.textContent = o; b.classList.remove('ok'); }}, 1400);
  }}));
}});
</script></body></html>''')
print(KIT, [c['folder'] for c in cards])
