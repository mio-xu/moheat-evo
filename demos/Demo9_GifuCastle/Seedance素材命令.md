# Demo 9《信長の岐阜城へようこそ》— 关键帧 + Seedance 素材命令

剧情和台词见 `storyboard/script_150s.md`。共 11 个镜头（G01–G11），合计约 150 s。做法和 Demo 7、8 一样。

---

## 做法

1. **关键帧**：用 ChatGPT（或任意生图工具）生成每个镜头的第一帧，1536×1024 横版。
   - 每次都上传角色设定图：
     - `demos/Demo5_SengokuBanquet/assets/characters/N_Character.png`
     - `demos/Demo5_SengokuBanquet/assets/characters/I_Character.png`
   - 加上表格里列的表情和姿势图（同一文件夹）。
   - 室内镜头再加 `demos/Demo5_SengokuBanquet/assets/stage/banquet_bg.png`，作为战国室内的画风参考。
2. **Seedance**：图生视频，首帧用关键帧，再加动作提示词；16:9，1080p，时长按表格。
3. **交付**：
   - 关键帧放进 `demos/Demo9_GifuCastle/assets/keyframes/G01.png` …
   - 视频放进 `demos/Demo9_GifuCastle/video/seedance/G01.mp4` …
   - 然后告诉我。

---

## 通用提示词（关键帧和 Seedance 都放在最前面）

```
Summer of 1569 at Gifu Castle, Japan. ODA NOBUNAGA (sharp-eyed, mustache, top-knot, crimson-and-gold kimono with gold-leaf flower crests) as the proud host and TOKUGAWA IEYASU (round calm face, bald pate with small top-knot, deep green-and-gold kimono with hollyhock crests) as his visiting ally — keep their faces, costumes and colors exactly as in the attached character sheets. First-person view of the viewer, a guest, with Nobunaga at front-left and Ieyasu at front-right. Detailed Japanese ukiyo-e inspired anime illustration with gold-leaf decoration, rich mineral colors, elegant line work, cinematic lighting, historically flavored Sengoku architecture, consistent character design across shots.
```

## 负面提示词（每次都填）

```
modern buildings, modern clothes, cars, power lines, text, letters, readable signs, logos, watermark, subtitles, different faces, younger faces, full armor, battle, blood, weapons drawn, photorealistic, 3D render, CGI, horror, distorted hands, extra fingers, inconsistent costume, flicker
```

---

## 镜头表

| # | 时间 | 时长 | 参考图（除两张设定图外） | 关键帧提示词 | Seedance 动作提示词 |
|---|---|---|---|---|---|
| G01 | 0–7 | 10 s | — | Summer evening view from the Nagara River: steep green Mt. Kinka with a white-and-black castle keep on its summit, golden sunset sky, the river shimmering, a wooden town at the foot; no people | Clouds drift, the river glitters, swallows fly; a burst of golden sparkles appears on the riverbank in the foreground. Slow push toward the mountain. |
| G02 | 7–21 | 10 s | `N_pose_invite.png`, `I_pose_calm.png` | The gate of a lavish four-storey palace at the foot of Mt. Kinka, gold-leaf sliding doors, pine trees; Nobunaga (left) welcoming the viewer with open arms, Ieyasu (right) smiling politely | Nobunaga spreads his arms and speaks proudly; Ieyasu bows slightly, then glances at the viewer with a wry smile and speaks. Summer cicada atmosphere, light breeze in the pines. |
| G03 | 21–38 | 10 s | `N_pose_stand.png`, `I_ear.png` | A palace garden with a waterfall falling from a rock cliff into a pond, mist, carp, a vermilion bridge; Nobunaga gesturing at it; Ieyasu leaning toward the viewer's RIGHT ear | The waterfall pours and mist drifts across; Nobunaga gestures grandly and talks; then Ieyasu leans in and whispers behind his hand. |
| G04 | 44–52 | 5 s | `N_pose_alert.png` | A steep stone mountain path through dense summer forest up Mt. Kinka, Nobunaga striding ahead and looking back, Ieyasu wiping his brow behind | Nobunaga climbs briskly and waves the viewer on; Ieyasu puffs behind; leaves rustle, sunbeams flicker. |
| G05 | 52–68 | 10 s | `N_pose_stand.png`, `I_pose_wind.png` | Summit of Mt. Kinka beside the castle keep: a vast view over the Nōbi plain, rivers, fields and distant mountains under a golden sky; Nobunaga pointing at the horizon, Ieyasu holding his sleeves in the strong wind | Strong wind sweeps from left to right, sleeves and banners whip; Nobunaga points at the plain and speaks with ambition; Ieyasu squints into the wind and nods. |
| G06 | 68–86 | 10 s | `N_bust_proud.png`, `I_bust_surprise.png` | A small elegant tea room in the castle at sunset: Nobunaga whisking matcha himself and offering a steaming tea bowl to the viewer; beside Ieyasu a lacquer tray with shaved ice from the ice-house | Steam rises from the tea bowl as Nobunaga offers it with a proud smile; Ieyasu picks up a piece of glistening ice in amazement, cold mist curling from it. |
| G07 | 92–104 | 10 s | `N_pose_laugh.png` | Night on the Nagara River: the viewer sits in a wooden viewing boat with Nobunaga on the left; in the distance on the left, cormorant-fishing boats with blazing iron fire baskets approach | Fire baskets flare and sparks fly over the dark water; the boats glide closer from the left; Nobunaga points and laughs excitedly. |
| G08 | 104–122 | 10 s | `I_bust_thoughtful.png` | Close view: a cormorant-fishing boat passing right in front of the viewer from left to right, the fisherman (seen from behind, in silhouette) with leashed cormorants diving, a roaring fire basket showering sparks onto the water; Ieyasu on the right watching, his face lit orange | The boat passes from left to right, the fire basket's light sweeps across the scene, cormorants dive and splash, sparks drift; Ieyasu watches, moved, and speaks softly. |
| G09 | 122–132 | 5 s | `N_ear.png` | Quiet river after the boats: fireflies over the reeds on the right, stars, embers on the water; Nobunaga leaning close to the viewer's LEFT ear | Fireflies float and blink; Nobunaga whispers gently behind his hand, his expression soft and wistful. |
| G10 | 132–142 | 5 s | `N_bust_grin.png` | Close-up: Nobunaga pressing a large red seal onto a sheet of washi paper by lantern light (the seal mark is an abstract red square, no readable characters) and handing it to the viewer | Nobunaga stamps the seal firmly, lifts it, grins and holds the paper out to the viewer. |
| G11 | 142–150 | 10 s | `I_bust_polite.png`, `N_bust_proud.png` | The two lords on the boat at night bidding farewell, golden particles rising around them, the river glowing with the last embers | Ieyasu bows and speaks; Nobunaga raises a hand in farewell; golden light swells and they dissolve into sparkles, leaving the lantern-lit river. |

> G10 的印章用"抽象的红色方印"。AI 生成的文字会变形，「天下布武」四个字我在后期用干净的图层叠上去。

---

## 可选：封面关键帧

```
Key visual, 16:9: Oda Nobunaga (left) and Tokugawa Ieyasu (right) in their gold-leaf kimono on the summit of Mt. Kinka at golden sunset, Gifu Castle's keep behind them, the vast Nōbi plain below and cormorant-fishing fire boats glowing on the Nagara River far below; detailed ukiyo-e inspired anime illustration with gold leaf; leave the upper centre calm for a title; no text.
```
