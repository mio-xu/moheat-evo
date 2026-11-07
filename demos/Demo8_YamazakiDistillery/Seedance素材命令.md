# Demo 8《信長と家康、山崎蒸溜所へ》— 关键帧 + Seedance 素材命令

> **已停用（2026-11-07）**：用户觉得逐镜头做视频太麻烦，改为**可复用图片 + 浏览器动画**（和 Demo 1–6 一样）。新的素材清单见 `ChatGPT素材命令.md`；这份只作参考保留。

剧情和台词见 `storyboard/script_150s.md`。共 12 个镜头（Y01–Y12），合计约 150 s。做法和 Demo 7 一样。

---

## 做法

1. **关键帧**：用 ChatGPT（或任意生图工具）生成每个镜头的第一帧，1536×1024 横版。
   - 每次都上传角色设定图：
     - `demos/Demo9_SengokuBanquet/assets/characters/N_Character.png`
     - `demos/Demo9_SengokuBanquet/assets/characters/I_Character.png`
   - 加上表格里列的表情和姿势图（同一文件夹）。
   - 威士忌镜头另外上传 `demos/Demo6_FutureWhisky/assets/whisky/` 里的瓶子和杯子图，作为造型参考。
2. **Seedance**：图生视频，首帧用关键帧，再加动作提示词；16:9，1080p，时长按表格。
3. **交付**：
   - 关键帧放进 `demos/Demo8_YamazakiDistillery/assets/keyframes/Y01.png` …
   - 视频放进 `demos/Demo8_YamazakiDistillery/video/seedance/Y01.mp4` …
   - 然后告诉我。

**品牌注意**：
- 画面里不要让 AI 画可读的商标和酒标，AI 生成的文字一定会变形。
- 需要清楚露出酒瓶时，我用 Demo 6 里真实的酒瓶图合成上去。
- 公开发布前请向三得利确认可以使用。

---

## 通用提示词（关键帧和 Seedance 都放在最前面）

```
Two historical Japanese warlords visiting a modern whisky distillery in a misty green valley near Kyoto: ODA NOBUNAGA (left, sharp-eyed, mustache, top-knot, crimson-and-gold kimono with gold-leaf flower crests) and TOKUGAWA IEYASU (right, round calm face, bald pate with small top-knot, deep green-and-gold kimono with hollyhock crests) — keep their faces, costumes and colors exactly as in the attached character sheets. First-person view of the viewer (their guide) walking between them: Nobunaga front-left, Ieyasu front-right. Premium Japanese 2D anime film illustration, richly detailed, soft volumetric light, warm copper and amber tones indoors, cool misty greens outdoors, gold-leaf accents on the warlords' clothing, consistent character design across shots.
```

## 负面提示词（每次都填）

```
text, letters, readable labels, logos, brand names on bottles or buildings, watermark, subtitles, crowds of tourists in focus, modern clothes on the warlords, different faces, armor, weapons drawn, photorealistic, 3D render, CGI, horror, distorted hands, extra fingers, warped glasses, inconsistent costume, flicker
```

---

## 镜头表

| # | 时间 | 时长 | 参考图（除两张设定图外） | 关键帧提示词 | Seedance 动作提示词 |
|---|---|---|---|---|---|
| Y01 | 0–6 | 5 s | — | Early-morning mist over a green valley where three rivers meet, bamboo groves and wooded hills, a quiet red-brick distillery with copper roof details among the trees (no signs); no people yet | Mist drifts slowly across the valley, sunlight breaks through; a burst of golden sparkles appears on the path and two silhouettes take shape. Slow push in. |
| Y02 | 6–21 | 10 s | `N_pose_alert.png`, `I_pose_calm.png` | The two warlords on a stone path in the misty bamboo grove near the distillery, looking around curiously, dew sparkling | Nobunaga sniffs the air and speaks, intrigued; Ieyasu tilts his head toward the sound of water and nods; mist swirls around them. |
| Y03 | 21–38 | 10 s | `I_ear.png`, `I_bust_thoughtful.png` | Fermentation room: huge wooden washback vats with foaming, bubbling liquid, warm steam, wooden walkways; Ieyasu leaning toward the viewer's RIGHT ear | Foam bubbles and steam rises; Ieyasu inhales the sweet aroma, then leans close and whispers (mouth hidden by his hand). |
| Y04 | 38–54 | 10 s | `N_bust_surprise.png`, `N_pose_laugh.png` | The pot-still hall: a row of gleaming onion-shaped copper pot stills of different sizes, glowing warm, heat shimmer; Nobunaga on the left pointing in excitement | Heat haze ripples over the copper, light glints; Nobunaga strides forward pointing, shouts with delight and bursts into laughter, sleeves fluttering in the hot air. |
| Y05 | 54–60 | 5 s | `I_bust_surprise.png` | Close-up: a glass spirit safe with clear new spirit flowing, copper pipes; Ieyasu's amazed face reflected on the right | Clear spirit trickles; Ieyasu watches in wonder and speaks softly. |
| Y06 | 64–74 | 10 s | `N_pose_stand.png` | Cask warehouse: dim, cool, quiet aisles of stacked oak barrels, thin rays of light through high windows, dust motes; the warlords walking slowly | The camera glides slowly down the aisle; dust floats in the light beams; Nobunaga stops, looks up at the casks and speaks quietly. |
| Y07 | 74–90 | 10 s | `I_ear_smile.png`, `N_ear.png` | First-person among the barrels: Ieyasu close at the RIGHT ear, Nobunaga close at the LEFT ear, both whispering with playful smiles | First Ieyasu whispers at the right ear, then Nobunaga at the left ear with a mischievous grin; cool blue light, dust motes. |
| Y08 | 90–100 | 5 s | `I_pose_offer.png` | A small stone spring with crystal-clear water pouring from a bamboo spout, moss and ferns; Ieyasu cupping the cold water in his hands | Water splashes and sparkles; Ieyasu tastes it, shivers at the cold, smiles and speaks. |
| Y09 | 100–116 | 10 s | `N_bust_suspicious.png` | Tasting room: warm wooden bar, amber light, tulip nosing glasses of golden whisky in front of each warlord (use the attached glass references; no labels visible) | Nobunaga swirls the glass, sniffs, freezes — narrows his eyes, as if remembering something, and speaks slowly. |
| Y10 | 116–132 | 10 s | `I_bust_surprise.png`, `N_bust_laugh.png` | Same tasting room; Ieyasu turning to Nobunaga in sudden realisation; a highball glass with ice next to Nobunaga | Ieyasu gasps and speaks excitedly; Nobunaga slaps the bar and bursts out laughing; ice clinks. |
| Y11 | 132–140 | 5 s | `N_bust_grin.png`, `I_bust_chuckle.png` | First-person: three glasses (two highballs with ice and one neat dram) raised together in the centre, the warlords on both sides | Glasses clink, ice sparkles, both laugh warmly. |
| Y12 | 140–150 | 10 s | `I_bust_polite.png` | Back in the cask warehouse, one oak barrel glowing gold; the two warlords beside it, golden particles rising | Ieyasu pats the barrel and speaks wistfully; golden light swells, the two dissolve into sparkling mist; the glowing barrel remains. |

---

## 可选：封面关键帧

```
Key visual, 16:9: Oda Nobunaga (left) and Tokugawa Ieyasu (right) in their gold-leaf kimono, amazed in front of a row of glowing copper pot stills in a whisky distillery, warm amber light and heat shimmer, a misty green valley through a window; premium Japanese anime illustration; leave the upper centre calm for a title; no text, no logos.
```
