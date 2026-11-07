#!/usr/bin/env python3
"""Desktop kit for generating Ren's animation loops on the Seedance website (the API was rate-limited / unstable, and Lite
drifted the camera). Builds ~/Desktop/MoHeat_Demo12_Seedance动画/ — one folder per clip with its first = last frame,
the prompt and the negative prompt, plus an index.html with copy buttons and the settings to use.
The clips' motion text comes from scripts/seedance.py (VIDEOS). The user drops <name>.mp4 into the clip's folder;
then `python3 scripts/make_seedance_kit.py --collect` copies them to assets/video/ and runs compress_video.sh."""
import html, importlib.util, os, shutil, subprocess, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KIT = os.path.expanduser('~/Desktop/MoHeat_Demo12_Seedance动画')
spec = importlib.util.spec_from_file_location('sd12', os.path.join(ROOT, 'scripts', 'seedance.py'))
SD = importlib.util.module_from_spec(spec); spec.loader.exec_module(SD)
ORDER = [('v_close_whisper', '★ 最优先', '耳语特写（贴近说话）'), ('v_call_talk', '★ 最优先', '街头·说话'), ('v_call_idle', '优先', '街头·待机（听你说话）'),
         ('v_door_talk', '优先', '门口·说话'), ('v_door_idle', '', '门口·待机'), ('v_call_shy', '', '街头·害羞'), ('v_room_open', '', '房间·窗户打开（无人）')]
BASE = {'v_call_talk': 'ren_call', 'v_call_shy': 'ren_call'}      # on the website we upload the real base still
EXTRA = ("IMPORTANT: the camera must not move at all — no zoom in, no zoom out, no pan, no dolly; the character stays exactly the same "
         "size and in exactly the same place in the frame for the whole clip; the background does not move or change.")


def collect():
    os.makedirs(os.path.join(ROOT, 'assets', 'video'), exist_ok=True); n = 0
    for name, *_ in ORDER:
        src = os.path.join(KIT, name, name + '.mp4')
        if not os.path.exists(src):
            cands = [f for f in os.listdir(os.path.join(KIT, name)) if f.lower().endswith('.mp4')] if os.path.isdir(os.path.join(KIT, name)) else []
            src = os.path.join(KIT, name, cands[0]) if cands else None
        if src: shutil.copy2(src, os.path.join(ROOT, 'assets', 'video', name + '.mp4')); n += 1; print('collected', name)
    subprocess.run([os.path.join(ROOT, 'scripts', 'compress_video.sh')], check=True); print(n, 'clips')


def build():
    os.makedirs(KIT, exist_ok=True); cards = []
    for i, (name, prio, ja) in enumerate(ORDER, 1):
        base, sec, motion = SD.VIDEOS[name]; base = BASE.get(name, base)
        d = os.path.join(KIT, name); os.makedirs(d, exist_ok=True)
        im = Image.open(os.path.join(ROOT, 'assets', 'art', base + '.png')).convert('RGB'); im.thumbnail((1920, 1920))
        im.save(os.path.join(d, '首帧_尾帧_first_last.jpg'), 'JPEG', quality=92)
        prompt = '\n\n'.join([SD.VLOOK, EXTRA, motion]); neg = SD.VAVOID.replace('Avoid: ', '') + ', zoom, camera pan, dolly, character getting smaller, background change'
        open(os.path.join(d, 'prompt.txt'), 'w').write(prompt); open(os.path.join(d, 'negative.txt'), 'w').write(neg)
        e = html.escape
        cards.append(f'''<section class="c"><h2>{i}. {e(ja)} <code>{name}.mp4</code> <em>{prio}</em></h2>
<img src="{name}/首帧_尾帧_first_last.jpg" alt="">
<p class="lbl">Prompt <button onclick="cp(this)">copy</button></p><pre>{e(prompt)}</pre>
<p class="lbl">Negative <button onclick="cp(this)">copy</button></p><pre>{e(neg)}</pre>
<p class="out">生成后把视频放进 <code>{name}/</code>，文件名 <code>{name}.mp4</code></p></section>''')
    page = f'''<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Demo12 Seedance 动画</title><style>
:root{{--bg:#16121c;--card:#221b2b;--ink:#f1eaf6;--soft:#b5a9c2}}body{{margin:0;padding:24px 16px;background:var(--bg);color:var(--ink);font:15px/1.6 system-ui,"PingFang SC",sans-serif}}
main{{max-width:980px;margin:0 auto}}h1{{font-size:22px;margin:0 0 8px}}.how{{background:var(--card);border-radius:12px;padding:12px 16px;margin-bottom:18px}}
.c{{background:var(--card);border-radius:12px;padding:14px 16px;margin:14px 0}}.c h2{{font-size:17px;margin:0 0 10px}}.c h2 em{{color:#ffc2d8;font-style:normal;font-size:14px}}
img{{width:100%;max-width:640px;border-radius:8px;display:block}}pre{{white-space:pre-wrap;background:#141019;border-radius:8px;padding:10px;font-size:13px;color:#e6dcf0}}
.lbl{{margin:10px 0 4px;color:var(--soft)}}button{{margin-left:8px;border:0;border-radius:6px;padding:2px 10px;background:#8f7bff;color:#fff;cursor:pointer}}.out{{color:#bfe4ff}}code{{color:#ffd58a}}
</style></head><body><main><h1>Demo 12 · 蓮的动画（Seedance 网页版）</h1>
<div class="how"><b>每段的设置：</b><br>
· 模式：<b>图生视频 · 首尾帧</b>，首帧和尾帧都放同一张 <code>首帧_尾帧_first_last.jpg</code>（这样能无缝循环）<br>
· 模型：选质量高的（Seedance 2.0 Pro / 2.5）；Lite 会自己拉镜头，不要用<br>
· <b>固定镜头 / Camera fixed：打开</b>（如果有这个选项）<br>
· 时长 5 秒 · 16:9 · 720p 或 1080p · 不要音频<br>
· 生成后如果镜头还是动了、人变小了、背景变了 → 重新生成那一段<br>
做完后告诉我，我把视频收进游戏里（自动压缩、正反播放循环）。</div>
{''.join(cards)}</main><script>function cp(b){{navigator.clipboard.writeText(b.parentElement.nextElementSibling.textContent);b.textContent='copied';setTimeout(()=>b.textContent='copy',1200)}}</script></body></html>'''
    open(os.path.join(KIT, 'index.html'), 'w').write(page)
    print('kit →', KIT)


if __name__ == '__main__':
    collect() if '--collect' in sys.argv else build()
