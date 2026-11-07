"""Reusable IMAGE assets for Demo 7, 8, 9 (replaces the per-shot Seedance plan; user, 2026-11-07:
"too many prompts — can we just make reusable images?").

The two warlords are NOT redrawn: all of Demo 9's character art (busts, expressions, poses, ear close-ups) is reused.
Only new backgrounds and a few props are needed, all in Demo 9's ukiyo-e / gold-leaf style, composed like Demo 9's
banquet room so the existing seated characters drop in on the left and right.

  python3 demos/nobunaga-suntory/Demo7_KyotoIzakaya/scripts/make_image_kit.py
→ ~/Desktop/MoHeat_Demo7-9_图片素材/  (one folder per image: reference images + one copy-ready prompt; index.html)
→ demos/Demo{7,8,9}_*/ChatGPT素材命令.md (same content, for the repo)
"""
import json, os, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
DEMOS = os.path.dirname(os.path.dirname(HERE))
CHAR = os.path.join(DEMOS, "../nobunaga-suntory/Demo9_SengokuBanquet", "assets", "characters")
STAGE = os.path.join(DEMOS, "../nobunaga-suntory/Demo9_SengokuBanquet", "assets", "stage")
WHISKY = os.path.join(DEMOS, "../nobunaga-suntory/Demo6_FutureWhisky", "assets", "whisky")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/Desktop/MoHeat_Demo7-9_图片素材")

STYLE = ("Same art style as the attached reference images: detailed Japanese ukiyo-e inspired anime illustration with gold-leaf "
         "decoration, rich mineral colors (vermilion, indigo, deep green, gold), fine elegant line work, soft cinematic lighting, "
         "highly detailed. No people, no animals, no text, no letters, no logos, no watermark.")
BG = ("Landscape 1536×1024. Composition like the attached banquet room: the viewer sits on the floor in the centre looking "
      "forward; keep the LEFT third and the RIGHT third of the foreground clear and uncluttered (two seated characters will be "
      "composited there later, at the size of the attached character sheets); the floor is visible at the bottom; the "
      "interesting view sits in the upper centre.")
PROP = "A single object, centred, on a fully transparent background (PNG), square 1024×1024, no shadow on the ground, no text."
STYLE_REFS = [os.path.join(STAGE, "banquet_bg.png"), os.path.join(CHAR, "N_Character.png")]
PROP_REFS = [os.path.join(CHAR, "N_Character.png"), os.path.join(STAGE, "prop_tokkuri.png")]

# id, kind (bg / bg_edit / prop), file name, what, extra refs
DEMOS_SPEC = [
    ("../nobunaga-suntory/Demo7_KyotoIzakaya", "Demo7_京都居酒屋", [
        ("D7-1", "bg", "d7_bg_pontocho.png", "Opening: the narrow Pontocho lantern alley in Kyoto on a snowy winter night, wooden machiya fronts, rows of glowing paper lanterns, the stone-paved lane leading into the distance toward a glimpse of the Kamo River, snow falling.", []),
        ("D7-2", "bg", "d7_bg_izakaya.png", "Main room: a cozy tatami private room (zashiki) of a modern Kyoto izakaya at night. A low wooden table runs across the bottom centre with small plates; warm paper lanterns hang from the ceiling; at the back a large wooden lattice window, half open, shows the Kamo River at night with modern city lights reflected in the water and light snow; a noren curtain and a glimpse of the busy counter with a beer tap on one side.", []),
        ("D7-3", "bg_edit", "d7_bg_izakaya_window.png", "EDIT the previous image (d7_bg_izakaya.png): keep the composition exactly the same; only slide the back window fully open — the Kamo River and the city lights are larger and brighter, snowflakes blow into the room, cool blue night light mixes with the warm lanterns.", []),
        ("D7-4", "prop", "d7_prop_beer.png", "A frosted glass beer mug full of golden draft beer with a thick white foam head, cold condensation droplets.", []),
        ("D7-5", "prop", "d7_prop_highball.png", "A tall highball glass full of clear ice cubes and sparkling soda with rising bubbles and a lemon slice.", []),
        ("D7-6", "prop", "d7_prop_yakitori.png", "A small rectangular plate of charcoal-grilled yakitori skewers, glossy with sauce, with wisps of smoke.", []),
        ("D7-7", "prop", "d7_prop_atsukan.png", "A hot-sake set: a ceramic tokkuri bottle and a small cup, with soft steam rising.", []),
    ]),
    ("../nobunaga-suntory/Demo8_YamazakiDistillery", "Demo8_山崎蒸溜所", [
        ("D8-1", "bg", "d8_bg_valley.png", "Opening: an early-morning misty green valley where three rivers meet, bamboo groves and wooded hills, a quiet red-brick distillery building among the trees (no signs), a stone path in front.", []),
        ("D8-2", "bg", "d8_bg_stillhouse.png", "The pot-still hall of a whisky distillery: a row of gleaming onion-shaped copper pot stills of different sizes along the back, warm glow and heat shimmer, wooden walkways; on one side tall wooden fermentation vats with foam and steam.", []),
        ("D8-3", "bg", "d8_bg_warehouse.png", "A dim, cool cask warehouse: long aisles of stacked oak barrels, thin rays of light from high windows, floating dust motes, quiet blue-grey atmosphere.", []),
        ("D8-4", "bg", "d8_bg_tasting.png", "A calm Japanese-style tasting room: tatami floor with a low wooden table across the bottom centre, warm amber light, a large window looking out on the misty green valley, a small shelf of whisky casks (no labels).", [os.path.join(WHISKY, "hibiki_glass.png")]),
        ("D8-5", "prop", "d8_prop_ladle.png", "A bamboo water ladle (hishaku) filled with crystal-clear cold spring water, droplets falling.", []),
        ("D8-6", "prop", "d8_prop_cask.png", "A single oak whisky cask lying on its side, softly glowing golden from within, a few golden sparkles.", []),
    ]),
    ("../nobunaga-suntory/Demo5_GifuCastle", "Demo5_岐阜城", [
        ("D9-1", "bg", "d9_bg_palace_garden.png", "Gifu Castle's palace at the foot of Mt. Kinka in summer, 1569: an open veranda room with gold-leaf sliding doors on both sides, looking out over a garden with a waterfall falling from a rock cliff into a pond, mist, a vermilion bridge, pine trees, cicada-summer light.", []),
        ("D9-2", "bg", "d9_bg_summit.png", "The summit of Mt. Kinka at golden late afternoon: a wooden lookout platform beside the castle keep, a vast view over the Nōbi plain with rivers, rice fields and distant mountains, banners in the wind, wind-swept clouds.", []),
        ("D9-3", "bg", "d9_bg_tearoom.png", "A small elegant tea room inside the mountaintop castle at sunset: tatami, a tea brazier with a steaming iron kettle in the centre, a round window glowing with the orange sunset over the plain.", []),
        ("D9-4", "bg", "d9_bg_nagara_night.png", "Night on the Nagara River seen from a wooden viewing boat with a tatami deck and a low table in the foreground: dark water reflecting stars and lantern light, Mt. Kinka's silhouette with the castle against the night sky, fireflies along the reeds; leave the middle of the river empty (fire boats will pass there).", []),
        ("D9-5", "prop", "d9_prop_ukai_boat.png", "Side view of a long wooden cormorant-fishing boat moving to the right, with a blazing iron fire basket hanging at the bow showering sparks, a fisherman as a dark silhouette and three cormorants on leashes. Wide object, transparent background.", []),
        ("D9-6", "prop", "d9_prop_teabowl.png", "A black raku tea bowl with frothy green matcha, gentle steam rising.", []),
        ("D9-7", "prop", "d9_prop_ice.png", "A black lacquer tray with blocks of glistening ice from a summer ice-house, cold mist curling up.", []),
        ("D9-8", "prop", "d9_prop_seal_paper.png", "A sheet of cream washi paper with a large red square seal stamp in the middle (an abstract seal pattern, no readable characters), slightly curled.", []),
    ]),
]


def prompt(kind, what):
    if kind == "prop":
        return f"{what}\n\n{PROP}\n\n{STYLE}"
    if kind == "bg_edit":
        return f"{what}\n\n{STYLE}"
    return f"{what}\n\n{BG}\n\n{STYLE}"


LIMIT = 3.5 * 1024 * 1024        # upload limit is 4 MB (Seedance / some tools): keep every reference safely below it


def place_ref(src, dst_noext):
    """hard-link small files; re-encode big ones (JPEG q90 if opaque, else a smaller PNG) so each stays < 4 MB. Returns path."""
    from PIL import Image
    ext = os.path.splitext(src)[1]
    if os.path.getsize(src) <= LIMIT:
        dst = dst_noext + ext
        if os.path.exists(dst): os.remove(dst)
        try: os.link(src, dst)
        except OSError: shutil.copy2(src, dst)
        return dst
    im = Image.open(src); im.load()
    has_alpha = im.mode in ("RGBA", "LA") and im.getchannel("A").getextrema()[0] < 250
    if not has_alpha:
        dst = dst_noext + ".jpg"; im.convert("RGB").save(dst, quality=90, optimize=True)
    else:
        dst = dst_noext + ".png"; k = 1.0
        while True:
            im.resize((int(im.width * k), int(im.height * k)), Image.LANCZOS).save(dst, optimize=True)
            if os.path.getsize(dst) <= LIMIT or k < .4: break
            k *= .85
    return dst


def main():
    os.makedirs(OUT, exist_ok=True)
    cards = []
    for folder, label, items in DEMOS_SPEC:
        droot = os.path.join(OUT, label); os.makedirs(droot, exist_ok=True)
        md = [f"# {label} — ChatGPT 图片素材（可复用，2026-11-07 起替代逐镜头 Seedance 方案）", "",
              "角色**不用重画**：直接复用 Demo 9 的信长、家康全部角色图（表情、坐姿、耳语、大笑）。这里只需要新背景和几个小道具。", "",
              "做法：新对话里上传每条列出的参考图 → 粘贴提示词 → 选最好的一张，按文件名存到 "
              f"`demos/{folder}/assets/`（或桌面素材包对应文件夹）。标「编辑」的那张要在上一张图上用「编辑」生成。", ""]
        for iid, kind, fname, what, extra in items:
            refs = (STYLE_REFS if kind != "prop" else PROP_REFS) + extra
            if kind == "bg_edit": refs = []
            refs = [r for r in refs if os.path.exists(r)]
            sdir = os.path.join(droot, f"{iid}_{fname[:-4]}"); os.makedirs(sdir, exist_ok=True)
            for f in os.listdir(sdir):
                if f.startswith("参考图_"): os.remove(os.path.join(sdir, f))
            names = []
            for i, r in enumerate(refs, 1):
                stem = f"参考图_{i}_{os.path.splitext(os.path.basename(r))[0]}"
                names.append(os.path.basename(place_ref(r, os.path.join(sdir, stem))))
            p = prompt(kind, what)
            open(os.path.join(sdir, "prompt.txt"), "w").write(p)
            kind_ja = {"bg": "背景", "bg_edit": "背景（编辑上一张）", "prop": "道具（透明背景）"}[kind]
            md += [f"## {iid} · `{fname}` · {kind_ja}", "", f"参考图：{', '.join(os.path.basename(r) for r in refs) or '（上一张图，用编辑）'}", "",
                   "```", p, "```", ""]
            cards.append(dict(demo=label, id=iid, file=fname, kind=kind_ja, refs=[f"{label}/{iid}_{fname[:-4]}/{n}" for n in names], prompt=p))
        open(os.path.join(DEMOS, folder, "ChatGPT素材命令.md"), "w").write("\n".join(md))
    howto = """MoHeat Evo Demo 7 / 8 / 9 — 图片素材包（可复用图片，不需要视频）

角色不用画！信长、家康直接复用 Demo 9 的全部角色图。这里只有：
  Demo 7 京都居酒屋：背景 3 张（其中 1 张是编辑上一张）+ 道具 4 个
  Demo 8 山崎蒸溜所：背景 4 张 + 道具 2 个
  Demo 5 岐阜城：背景 4 张 + 道具 4 个
共 21 张。

最方便：双击 index.html。每张图一张卡片：参考图缩略图 + 一个「复制提示词」按钮。
每张图也有自己的文件夹：里面的「参考图_*」全选拖进 ChatGPT（或 Seedance），再粘贴 prompt.txt。
参考图都已压到 4 MB 以内（大图另存为高质量 JPEG，原图不变）。

生成后：选最好的一张，按卡片上的文件名（例：d7_bg_izakaya.png）存进同一个文件夹，告诉我就行。
道具要透明背景；如果出来是白底也没关系，我来抠。

配音试听/：三个 Demo 的配音（先听 00_台词连播）。
"""
    open(os.path.join(OUT, "00_使い方.txt"), "w").write(howto)
    write_index(cards)
    print(f"{len(cards)} images → {OUT}")


def write_index(cards):
    page = """<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Demo 7–9 图片素材</title><style>
:root{--bg:#f6f3ee;--card:#fff;--ink:#2b2622;--soft:#7a6f66;--acc:#b5651d;--line:#e4ddd3}
@media (prefers-color-scheme:dark){:root{--bg:#1b1917;--card:#262320;--ink:#f1ebe4;--soft:#a99e93;--line:#3a3530}}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.55 -apple-system,"Hiragino Sans","PingFang SC",sans-serif}
header{position:sticky;top:0;background:var(--bg);border-bottom:1px solid var(--line);padding:10px 16px;z-index:2;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
header a{color:var(--acc);text-decoration:none;padding:4px 10px;border:1px solid var(--line);border-radius:999px}
main{max-width:1000px;margin:0 auto;padding:16px}h2{margin:26px 0 8px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px;margin:12px 0}
.top{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}.id{font-weight:800;font-size:17px}.file{font-family:ui-monospace,monospace;background:var(--bg);padding:1px 8px;border-radius:6px}
.meta{color:var(--soft)}.done{margin-left:auto}.refs{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.refs img{height:80px;border-radius:8px;border:1px solid var(--line)}
button{font:inherit;border:0;border-radius:8px;padding:5px 12px;background:var(--acc);color:#fff;cursor:pointer}button.ok{background:#2e8b57}
pre{white-space:pre-wrap;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px;margin:8px 0 0;max-height:130px;overflow:auto;font-size:12.5px}
</style></head><body><header><b>Demo 7–9 图片素材（角色复用 Demo 9）</b></header><main id="m"></main><script>
const C=__DATA__;const m=document.getElementById('m'),hd=document.querySelector('header');
const cp=async(t,b)=>{try{await navigator.clipboard.writeText(t)}catch(e){const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();document.execCommand('copy');a.remove()}const o=b.textContent;b.textContent='已复制 ✓';b.classList.add('ok');setTimeout(()=>{b.textContent=o;b.classList.remove('ok')},1200)};
let last='';for(const c of C){if(c.demo!==last){last=c.demo;const h=document.createElement('h2');h.id=c.demo;h.textContent=c.demo;m.appendChild(h);const a=document.createElement('a');a.href='#'+c.demo;a.textContent=c.demo;hd.appendChild(a)}
const k='img.done.'+c.id;let done=false;try{done=localStorage.getItem(k)==='1'}catch(e){}
const d=document.createElement('div');d.className='card';
d.innerHTML=`<div class="top"><span class="id">${c.id}</span><span class="file">${c.file}</span><span class="meta">${c.kind}</span><label class="done"><input type="checkbox" ${done?'checked':''}> 已完成</label></div>
<div class="refs">${c.refs.map(r=>`<img src="${encodeURI(r)}" title="${r.split('/').pop()}">`).join('')||'<span class="meta">参考图 = 上一张生成的图（用「编辑」）</span>'}</div>
<div><button>复制提示词</button></div><pre></pre>`;
d.querySelector('pre').textContent=c.prompt;d.querySelector('button').onclick=e=>cp(c.prompt,e.target);
d.querySelector('input').onchange=e=>{try{localStorage.setItem(k,e.target.checked?'1':'0')}catch(_){}};m.appendChild(d)}
</script></body></html>"""
    open(os.path.join(OUT, "index.html"), "w").write(page.replace("__DATA__", json.dumps(cards, ensure_ascii=False)))


if __name__ == "__main__":
    main()
