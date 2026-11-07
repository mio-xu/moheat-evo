# Demo《火をともして、ひみつの泉へ》— Seedance 素材命令

这是一个可以玩的解谜游戏（没有时间轴）。Seedance 只生成**场景背景**，每段是 5 秒的循环视频：
- 火焰、蜡烛、道具、狐狸コハク、火花、涟漪、光照都由代码画在视频上面，所以视频里**不要出现**这些东西。
- 点击区域是按构图参考图定的，所以构图要尽量和参考图一致。

画风和 Demo 1–4 一致：可爱的日系 2D 动画、粉彩、赛璐璐、干净的描边。**不要浮世绘或金箔风**（那是信长系列的风格）。

---

## 用法

1. **模式**：图生视频（Image-to-Video）。首帧上传 `project/layout_refs/` 里对应的**构图参考图**（我用代码画的简单版）。
   - 它只用来定构图和物体位置，请让 Seedance 按下面的提示词**重画成精致的插画**，不是照着参考图做动画。
   - 如果你的版本支持「参考图 + 文生视频」，用参考图模式效果更好。
2. **参数**：16:9，1080p，**5 s**，运镜选**固定 / Static camera**，运动幅度选小。
3. **循环**：如果支持首尾帧，首帧和尾帧都填同一张图，这样能无缝循环；不支持也没关系，我来做交叉淡化。
4. **每段的提示词** = 通用提示词 + 该镜头自己的提示词；负面提示词每次都要填。
5. **交付**：按下表的文件名放进 `demos/all-ages/Demo10_CaveSpring/assets/video/`，播放器会**自动**用视频替换代码画的背景，不用改代码。
   - 放好以后告诉我。我会压成 720p 小文件（放到网站上用），重新测量点击区域，并检查光照的叠加效果。
6. **不能用的情况**：出现人物、动物、文字；运镜在动；物体位置和参考图差很多。

| # | 文件名 | 首帧参考图 | 用途 |
|---|---|---|---|
| 1 | `hut_night.mp4` | `01_hut_night.jpg` | 小屋，夜里，囲炉裏还没点火 |
| 2 | `hut_fire.mp4` | `02_hut_fire.jpg` | 同一个小屋，囲炉裏烧起来了，暖光（跟着火势和 1 交叉淡化） |
| 3 | `gate_night.mp4` | `03_gate_night.jpg` | 雪夜的洞口，石门关着 |
| 4 | `gate_open.mp4` | 首帧 `03_gate_night.jpg` → 尾帧 `04_gate_open_end.jpg` | 石门向左滑开，里面透出蓝光（只播一次，不循环） |
| 5 | `tunnel_fork.mp4` | `05_tunnel_fork.jpg` | 洞穴的分岔路（两个岔口共用，第二个我做左右镜像） |
| 6 | `spring_dark.mp4` | `06_spring_dark.jpg` | 地底湖，几乎全黑 |
| 7 | `spring_glow.mp4` | `07_spring_glow.jpg` | 同一个地底湖，湖水和洞顶发出蓝光（吹灭灯以后淡入） |

> 优先级：7 → 3/4 → 1/2 → 5 → 6。地底湖发光那一幕是全片的高潮，最值得做精致。

---

## 通用提示词（每段都放在最前面）

```
Cute Japanese 2D anime background art for a cozy fairy-tale puzzle game, soft pastel palette, clean dark outlines, cel shading with soft gradients, warm and dreamy, highly detailed, consistent with the reference image's composition — every object stays in the same place and the same size as in the reference. Fixed camera, no camera movement at all. Only gentle ambient motion in the scene. Seamless loop.
```

## 负面提示词（每次都填）

```
people, characters, animals, fox, faces, hands, text, letters, writing, signs, logo, watermark, subtitles, candles, candle flames, torches, fire (unless asked), photorealistic, 3D render, CGI, ukiyo-e, gold leaf, camera pan, camera zoom, dolly, rotating view, objects moving or changing shape, flicker, jitter, horror, gritty
```

---

## 各镜头提示词

### 1 · `hut_night.mp4` · 小屋（未生火）
```
Inside a small wooden Japanese mountain hut at night. Left: a lattice window showing a snowy pine forest under a full moon, with gentle snowfall outside and a faint cold draught. Strings of dried persimmons hang from the beam. Centre: a sunken irori hearth in the wooden floor with grey ash and a few charred logs (NOT burning), an iron kettle hanging from a wooden jizai-kagi hook above it. Front-left: an empty woven straw basket. Right of the hearth: a dark wooden tansu chest with three closed drawers (nothing on top). Far right: a wooden sliding door with a small paper charm. The room is dim, lit only by cool blue moonlight from the window. Ambient motion: snow falling outside the window, moonlight shimmering softly.
```

### 2 · `hut_fire.mp4` · 小屋（生火后）
```
The same hut, same composition. The irori hearth now has a cheerful crackling fire with dancing orange flames and floating sparks; warm orange firelight fills the whole room, flickering on the walls, kettle, chest and door; steam curls gently from the kettle spout. The window still shows the cold blue snowy night. Ambient motion: flames dancing, light flickering, steam rising, snow outside.
```

### 3 · `gate_night.mp4` · 洞口（门关着）
```
Outside on a snowy mountain at night under a big full moon and a starry violet sky. Centre: a huge rounded rock cliff with a cave entrance sealed by a tall smooth stone door carved with a round crest of a flame and a water drop. A thick sacred shimenawa straw rope with white zigzag shide papers hangs across the top of the doorway. In front: a long low flat stone ledge (empty — no candles). Snow-covered pine trees on both sides. Ambient motion: gentle snowfall, shide papers fluttering slightly in the wind, stars twinkling.
```

### 4 · `gate_open.mp4` · 石门打开（只播一次）
```
The same scene. Over 4 seconds the heavy stone door slowly slides to the LEFT into the rock with a puff of snow and dust, revealing a deep cave passage glowing with soft cyan-blue light from far inside; a cool blue mist drifts out of the doorway and the blue light spills onto the snow. Ends on the open doorway glowing blue.
```

### 5 · `tunnel_fork.mp4` · 洞穴岔路
```
Inside a cave tunnel, mauve-purple and dusty-rose rock walls, stalactites along the ceiling. The passage splits into two big dark round openings, left and right, with a tall rock pillar between them. Rocky floor with small stones. Lighting: warm candle-like glow from the lower right, the openings fade into deep darkness. Ambient motion: occasional water drops falling from the stalactites, faint dust in the light.
```

### 6 · `spring_dark.mp4` · 地底湖（暗）
```
A vast underground cavern, almost completely dark. A still dark lake fills the lower half; on the right a thin waterfall falls from a rock ledge into the lake; stalactites hang from the ceiling; dull crystal clusters on the near shore at both bottom corners; dark rocky shore at the bottom left. Very dim, only faint shapes visible. Ambient motion: the waterfall flowing, slow ripples on the dark water.
```

### 7 · `spring_glow.mp4` · 地底湖（发光）★
```
The same underground cavern, now magically glowing: the lake shines with luminous cyan and turquoise light from beneath, the waterfall glows bright white-blue, countless tiny glowworm lights twinkle like stars on the cave ceiling and stalactites, the crystal clusters on the shore glow pale blue, light ripples dance across the rock. Breathtaking, serene and magical. Ambient motion: shimmering water caustics, waterfall flowing, glowworms twinkling, floating light motes.
```
