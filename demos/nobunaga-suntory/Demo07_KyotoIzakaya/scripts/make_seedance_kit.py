"""Build the user's ready-to-use keyframe + Seedance kit for Demo 7, 8 and 9 on the Desktop.

  python3 demos/nobunaga-suntory/Demo07_KyotoIzakaya/scripts/make_seedance_kit.py [out_dir]

Reads the three project/prompts_seedance.md tables (single source of truth) and writes, per shot:
  <out>/<Demo>/<Shot>/  参考图 (hard links to the character sheets / expression / pose / style refs),
                         1_关键帧prompt.txt  (common + shot + "avoid" — one paste),
                         2_Seedance动作prompt.txt, 3_Seedance负面prompt.txt
plus <out>/index.html (all shots on one page, thumbnails + copy buttons) and <out>/00_使い方.txt.
"""
import html, json, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
DEMOS = os.path.dirname(os.path.dirname(HERE))
CHAR = os.path.join(DEMOS, "../nobunaga-suntory/Demo09_SengokuBanquet", "assets", "characters")
STAGE = os.path.join(DEMOS, "../nobunaga-suntory/Demo09_SengokuBanquet", "assets", "stage")
WHISKY = os.path.join(DEMOS, "../nobunaga-suntory/Demo06_FutureWhisky", "assets", "whisky")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/Desktop/MoHeat_Demo7-9_Seedance素材")

DEMO_LIST = [  # folder, label, scene-only prefix (for shots without the warlords), extra refs per shot
    ("../nobunaga-suntory/Demo07_KyotoIzakaya", "Demo7_京都居酒屋",
     "Modern Kyoto on a snowy winter night: the Pontocho lantern alley by the Kamo River and a cozy izakaya. Premium Japanese 2D anime film illustration, richly detailed, warm cinematic lighting, soft bokeh.",
     {}),
    ("../nobunaga-suntory/Demo08_YamazakiDistillery", "Demo8_山崎蒸溜所",
     "A modern whisky distillery in a misty green valley near Kyoto where three rivers meet, bamboo groves and wooded hills. Premium Japanese 2D anime film illustration, richly detailed, soft volumetric light.",
     {s: [os.path.join(WHISKY, f) for f in ("yamazaki.png", "hakushu.png", "hibiki_glass.png")] for s in ("Y09", "Y10", "Y11")}),
    ("../nobunaga-suntory/Demo05_GifuCastle", "Demo5_岐阜城",
     "Summer of 1569 at Gifu Castle, Japan: Mt. Kinka, the Nagara River and the castle town. Detailed Japanese ukiyo-e inspired anime illustration with gold-leaf decoration, rich mineral colors, elegant line work, cinematic lighting.",
     {s: [os.path.join(STAGE, "banquet_bg.png")] for s in ("G02", "G03", "G06")}),
]


def parse(md):
    t = open(md, encoding="utf-8").read()
    blocks = re.findall(r"```\n(.*?)\n```", t, re.S)
    common, negative = blocks[0].strip(), blocks[1].strip()
    cover = blocks[2].strip() if len(blocks) > 2 else ""
    shots = []
    for line in t.splitlines():
        m = re.match(r"\|\s*([KYG]\d\d)\s*\|(.*)\|\s*$", line)
        if not m: continue
        cells = [c.strip() for c in m.group(2).split("|")]
        time_, dur, refs, key, motion = cells[:5]
        shots.append(dict(id=m.group(1), time=time_, dur=dur, refs=re.findall(r"`([^`]+\.png)`", refs), key=key, motion=motion))
    return common, negative, cover, shots


def link(src, dst):
    if os.path.exists(dst): os.remove(dst)
    try: os.link(src, dst)
    except OSError: shutil.copy2(src, dst)


def main():
    os.makedirs(OUT, exist_ok=True)
    cards = []
    for folder, label, scene_only, extra in DEMO_LIST:
        common, negative, cover, shots = parse(os.path.join(DEMOS, folder, "project/prompts_seedance.md"))
        droot = os.path.join(OUT, label); os.makedirs(droot, exist_ok=True)
        all_txt = []
        for s in shots + ([dict(id="COVER", time="封面", dur="—", refs=[], key=cover, motion="")] if cover else []):
            has_chars = s["id"] not in ("K01", "K14", "Y01", "G01")
            refs = ([os.path.join(CHAR, "N_Character.png"), os.path.join(CHAR, "I_Character.png")] if has_chars else []) + \
                   [os.path.join(CHAR, r) for r in s["refs"]] + extra.get(s["id"], [])
            refs = [r for r in dict.fromkeys(refs) if os.path.exists(r)]
            sdir = os.path.join(droot, s["id"]); os.makedirs(sdir, exist_ok=True)
            for f in os.listdir(sdir):
                if f.startswith("参考图_"): os.remove(os.path.join(sdir, f))
            names = []
            for i, r in enumerate(refs, 1):
                n = f"参考图_{i}_{os.path.basename(r)}"; link(r, os.path.join(sdir, n)); names.append(n)
            if s["id"] == "COVER":
                key = s["key"]
            else:
                key = (common if has_chars else scene_only) + "\n\nTHIS SHOT: " + s["key"] + "\n\nAVOID: " + negative + \
                      ("\n\nUse the attached character sheets for the two warlords' faces and costumes." if has_chars else "")
            key += "\n\nFormat: 16:9 landscape image, 1536×1024."
            motion = ""
            if s["motion"]:
                who = ("Oda Nobunaga (left, crimson-and-gold kimono) and Tokugawa Ieyasu (right, green-and-gold kimono) exactly as in the first frame. "
                       if has_chars else "")
                motion = who + s["motion"] + " Keep the faces, costumes, colors and art style of the first frame unchanged; smooth, gentle motion; premium Japanese anime film quality."
            open(os.path.join(sdir, "1_关键帧prompt.txt"), "w").write(key)
            if motion:
                open(os.path.join(sdir, "2_Seedance动作prompt.txt"), "w").write(motion)
                open(os.path.join(sdir, "3_Seedance负面prompt.txt"), "w").write(negative)
            all_txt.append(f"==================== {s['id']}  ({s['time']} s, Seedance {s['dur']}) ====================\n"
                           f"[参考图] {', '.join(names) or '无'}\n\n[1 关键帧 prompt]\n{key}\n\n"
                           + (f"[2 Seedance 动作 prompt]\n{motion}\n\n[3 Seedance 负面 prompt]\n{negative}\n" if motion else ""))
            cards.append(dict(demo=label, id=s["id"], time=s["time"], dur=s["dur"], refs=[f"{label}/{s['id']}/{n}" for n in names],
                              key=key, motion=motion, neg=negative if motion else ""))
        open(os.path.join(droot, "全部prompt一览.txt"), "w").write("\n".join(all_txt))
    write_index(cards); write_howto()
    print(f"{len(cards)} shots → {OUT}")


def write_howto():
    open(os.path.join(OUT, "00_使い方.txt"), "w").write("""MoHeat Evo Demo 7 / 8 / 9 — 关键帧 + Seedance 素材包

最方便：双击 index.html 用浏览器打开。每个镜头都有参考图缩略图和「复制」按钮。

每个镜头一个文件夹（如 Demo7_京都居酒屋/K03/），里面有：
  参考图_*.png            这个镜头要上传的参考图（全选拖进去即可）
  1_关键帧prompt.txt      ChatGPT（或任意生图）用：上传参考图 + 粘贴这段 → 生成第一帧
  2_Seedance动作prompt.txt Seedance 图生视频用：首帧 = 上一步的关键帧
  3_Seedance负面prompt.txt Seedance 的负面提示词（有这个栏位就填）

步骤（每个镜头）：
  1. ChatGPT：上传「参考图_*」→ 粘贴 1_关键帧prompt → 选最好的一张，存成  <镜头号>_关键帧.png  放回这个文件夹
  2. Seedance：图生视频，首帧 = <镜头号>_关键帧.png，粘贴 2_Seedance动作prompt（+ 3_负面），16:9 / 1080p，时长见 index.html
  3. 视频存成  <镜头号>.mp4  放回这个文件夹（例：Demo7_京都居酒屋/K03/K03.mp4）
做完一批告诉我，我直接从这个文件夹收素材、剪辑、配声音和冷热。

配音试听/：三个 Demo 的配音（锁定声线，每句 3 个候选）。先听「00_台词连播_*.m4a」，想换哪句的候选就告诉我编号和候选号。
注意：左右位置很重要（信长 = 画面左 = 左耳热，家康 = 画面右 = 右耳热）；画面里不要文字和商标。
""")


def write_index(cards):
    data = json.dumps(cards, ensure_ascii=False)
    page = """<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Demo 7–9 Seedance 素材</title><style>
:root{--bg:#f6f3ee;--card:#fff;--ink:#2b2622;--soft:#7a6f66;--acc:#c0392b;--line:#e4ddd3}
@media (prefers-color-scheme:dark){:root{--bg:#1b1917;--card:#262320;--ink:#f1ebe4;--soft:#a99e93;--line:#3a3530}}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.55 -apple-system,"Hiragino Sans","PingFang SC",sans-serif}
header{position:sticky;top:0;background:var(--bg);border-bottom:1px solid var(--line);padding:10px 16px;z-index:2;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
header b{margin-right:8px}header a{color:var(--acc);text-decoration:none;padding:4px 10px;border:1px solid var(--line);border-radius:999px}
main{max-width:1100px;margin:0 auto;padding:16px}h2{margin:28px 0 10px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px;margin:12px 0}
.top{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}.id{font-weight:800;font-size:18px}.meta{color:var(--soft)}
.done{margin-left:auto}.refs{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.refs img{height:90px;border-radius:8px;border:1px solid var(--line)}
.p{margin-top:8px}.p .h{display:flex;gap:8px;align-items:center;font-weight:700}
button{font:inherit;border:0;border-radius:8px;padding:5px 12px;background:var(--acc);color:#fff;cursor:pointer}button.ok{background:#2e8b57}
pre{white-space:pre-wrap;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px;margin:6px 0 0;max-height:140px;overflow:auto;font-size:12.5px}
</style></head><body><header><b>Demo 7–9 关键帧 + Seedance</b></header><main id="m"></main><script>
const C=__DATA__;const m=document.getElementById('m'),hd=document.querySelector('header');
const cp=async(t,b)=>{try{await navigator.clipboard.writeText(t)}catch(e){const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();document.execCommand('copy');a.remove()}const o=b.textContent;b.textContent='已复制 ✓';b.classList.add('ok');setTimeout(()=>{b.textContent=o;b.classList.remove('ok')},1200)};
const key=(d,i)=>'kit.done.'+d+'.'+i;let last='';
for(const c of C){if(c.demo!==last){last=c.demo;const h=document.createElement('h2');h.id=c.demo;h.textContent=c.demo;m.appendChild(h);const a=document.createElement('a');a.href='#'+c.demo;a.textContent=c.demo;hd.appendChild(a)}
const d=document.createElement('div');d.className='card';
let done=false;try{done=localStorage.getItem(key(c.demo,c.id))==='1'}catch(e){}
d.innerHTML=`<div class="top"><span class="id">${c.id}</span><span class="meta">${c.time} s · Seedance ${c.dur} · 文件夹 ${c.demo}/${c.id}/</span><label class="done"><input type="checkbox" ${done?'checked':''}> 已完成</label></div>
<div class="refs">${c.refs.map(r=>`<img src="${encodeURI(r)}" title="${r.split('/').pop()}">`).join('')||'<span class="meta">（无参考图，纯场景）</span>'}</div>`;
for(const [lab,t] of [['1 关键帧 prompt（ChatGPT）',c.key],['2 Seedance 动作 prompt',c.motion],['3 Seedance 负面 prompt',c.neg]]){if(!t)continue;
const p=document.createElement('div');p.className='p';p.innerHTML=`<div class="h">${lab} <button>复制</button></div><pre></pre>`;p.querySelector('pre').textContent=t;p.querySelector('button').onclick=e=>cp(t,e.target);d.appendChild(p)}
d.querySelector('input').onchange=e=>{try{localStorage.setItem(key(c.demo,c.id),e.target.checked?'1':'0')}catch(_){}};m.appendChild(d)}
</script></body></html>"""
    open(os.path.join(OUT, "index.html"), "w").write(page.replace("__DATA__", data))


if __name__ == "__main__":
    main()
