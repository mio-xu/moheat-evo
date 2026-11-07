# Demo 5《The Runaway Seasons Express / 季節が、暴走する。》— Seedance 视频生成命令

目标：在**不改声音和冷热时间轴**的前提下，把画面换成更精致、有穿梭感的动画。
- 视角始终是第一人称：坐在车厢里朝前看（朝向车头）。车厢本身不动，只有**左右两扇大窗外的世界**在高速掠过。
- 左窗和右窗的季节**必须和下表一致**：冷热设备按这个顺序在左耳/右耳出冷或热，左右画错了，画面就和体感对不上。

---

## 用法

1. **模式**：图生视频（Image-to-Video）。每个镜头上传对应的**首帧图**。
   - 标了"首尾帧"的镜头，如果你的 Seedance 版本支持首尾帧，就再上传**尾帧图**；不支持就只传首帧。
2. **参数**：16:9，1080p，时长 **10 s**（S11、S15 要 8 s；只有 5 s/10 s 可选时选 10 s，我来剪）。
   - 运镜选 **固定 / Static camera**。如果有"运动幅度"选项，选中等。
3. **首帧图**：放在 `project/seedance_refs/`，文件名和镜头编号对应（`S01_start.jpg`、`S02_end.jpg` …）。这些图是我从现有车厢渲染出的干净画面，没有字幕和发光边。
4. **提示词**：每个镜头先粘贴下面的**通用提示词**，再接该镜头自己的提示词。负面提示词每次都填。
5. **交付**：生成好的视频放进 `video/seedance/`，命名 `S01.mp4` … `S15.mp4`，然后告诉我。
   - 我会按时间轴剪辑、调速，叠加开场封面、场景标题、熄灯段和结尾卡，再和现有的双耳音频、冷热 CSV 合成最终 MP4。
6. **不满意**：可以多生成几次，挑最好的一条。车厢变形、左右季节画反、出现人物或文字的都不能用。

---

## 通用提示词（每个镜头都放在最前面）

```
First-person view from a passenger seat inside a magical fairy-tale train car, looking straight down the aisle toward the front door with a round brass clock above it. Keep the train interior exactly as in the reference image: cream walls, wooden wainscoting, pink velvet seats with white lace covers, mint-green aisle carpet, brass tulip lamps, pink tied-back curtains, two huge panoramic side windows. The interior stays perfectly still and undistorted; only gentle rhythmic train vibration and a soft sway on the rail joints.
The train is racing at high speed: the scenery in both windows rushes past the viewer toward the back of the car — in the LEFT window it streams from right to left, in the RIGHT window from left to right — with strong parallax (near objects whip past with motion blur, far mountains drift slowly). Light and shadows from the passing world sweep across the seats, floor and ceiling.
Style: premium Japanese 2D anime film background art, cute and dreamy, soft pastel palette, clean line art, cel shading, luminous atmospheric lighting, sparkling particles, highly detailed, consistent with the reference image. Cinematic, 24 fps, smooth motion.
```

## 负面提示词（每次都填）

```
people, characters, passengers, animals, faces, hands, text, letters, signs with writing, logo, watermark, subtitles, photorealistic, 3D render, CGI look, realistic train, camera pan, camera zoom, camera moving forward, dolly, rotating view, interior changing shape, seats morphing, extra windows, windows swapping sides, scenery moving the wrong direction, flicker artifacts, jitter, blurry interior, low detail, horror, dark gritty
```

---

## 分镜与提示词（时间 = 成片时间，总长 150 s）

> 熄灯段 107.5–111.5 s 是纯黑，我直接合成，不需要生成。开场 0–1.8 s 用现有封面盖住。

### S01 · 0–10 s · 冬の雪林 / Winter Forest　首帧 `S01_start.jpg`
```
Both windows: a snowy pine forest in a blizzard flashes past, snow-laden pines, distant blue-white mountains, thick snow swirling diagonally. Delicate frost crystals spread at the corners of the glass. Cold blue-white daylight fills the car; snowflakes sparkle against the windows. Exhilarating speed from the very first second.
```

### S02 · 10–20 s · 季节交替　首尾帧 `S02_start.jpg` → `S02_end.jpg`
```
LEFT window: still the snowy pine forest, but the frost on the glass slowly melts into droplets. RIGHT window: at second 2 the train bursts out of the snow into a bright tropical summer coast — dazzling sun, turquoise sea, palm trees whipping past, sun flare. Warm golden light floods in from the right side of the car while the left side stays cool blue.
```

### S03 · 20–30 s · 真夏の海岸 / Summer Coast　首帧 `S03_start.jpg`
```
LEFT window: the last of the winter, melting snow and dripping frost, turning wet and bright. RIGHT window: sparkling summer sea under huge white cumulonimbus clouds, golden beach and palm trees racing past, glittering waves, strong sun glare and lens flare. Warm sunbeams sweep across the pink seats from the right.
```

### S04 · 30–40 s · 进入雨林　首尾帧 `S04_start.jpg` → `S04_end.jpg`
```
At second 7 both windows plunge into a lush tropical rainforest: giant leaves and ferns slap past close to the glass. LEFT window: dark storm clouds roll in and heavy rain starts to hit the left glass. RIGHT window: sunny jungle with golden light shafts through the canopy. The car light turns warm dusk-orange.
```

### S05 · 40–50 s · 熱帯のスコール / Tropical Downpour　首帧 `S05_start.jpg`
```
LEFT window: torrential tropical downpour, rain streaks and water rivulets racing across the glass, a bright lightning flash at second 4 lights the whole car. RIGHT window: still sunny rainforest with glowing light beams; near the end dark clouds start creeping in from the left edge of the right window.
```

### S06 · 50–60 s · 雨云向右移动　首帧 `S06_start.jpg`
```
The storm moves across to the RIGHT: rain sweeps onto the right window, lightning flashes on the right at seconds 3.5 and 9. LEFT window: the rain eases, wet glass with sliding droplets, light breaking through. The rainforest keeps rushing past both windows.
```

### S07 · 60–70 s · 冰火隧道入口 / Tunnel of Ice & Fire　首尾帧 `S07_start.jpg` → `S07_end.jpg`
```
At second 2 the train dives into a magical tunnel with a whoosh of light. LEFT window: a glowing wall of blue ice crystals and icicles streaks past at very high speed, frost spreading on the glass. RIGHT window: a wall of glowing orange lava rivers and little flames streaks past, embers flying. The car is lit by cold blue light from the left and warm orange light from the right; the brass lamps glow.
```

### S08 · 70–80 s · 隧道反转　首尾帧 `S08_start.jpg` → `S08_end.jpg`
```
Seconds 0–2: LEFT ice wall, RIGHT lava wall, still racing. Seconds 3–6: both walls turn into a dark stone tunnel with warm tunnel lamps flashing past in rhythm, the car dim. Seconds 7–10: the sides SWAP — LEFT window becomes glowing lava with a burst of white steam puffing against the left glass, RIGHT window becomes glowing blue ice.
```

### S09 · 80–90 s · 反转后的隧道　首帧 `S09_start.jpg`
```
LEFT window: lava wall with glowing rivers and dancing flames rushing past, embers. RIGHT window: glittering blue ice crystals and icicles rushing past, frost on the glass. Strong orange light from the left, blue light from the right sweeping across the interior. Maximum speed, intense but cute.
```

### S10 · 90–100 s · 季節の暴走 1 / Seasons Out of Control　首帧 `S10_start.jpg`
```
The seasons go haywire: a sparkling magical swirl of snowflakes and cherry petals bursts in the aisle at second 0. The windows jump between seasons with quick magical wipes, the clock above the door spins wildly, lamps flicker.
Seconds 0–3.5: LEFT snowstorm, RIGHT snowstorm. Seconds 3.5–7: LEFT snowstorm, RIGHT lava. Seconds 7–10: LEFT white steam clouds over lava, RIGHT tropical rainstorm with a lightning flash.
```

### S11 · 100–107.5 s · 季節の暴走 2（8 s）　首帧 `S11_start.jpg`
```
Seconds 0–0.5: LEFT steam, RIGHT rainstorm. Seconds 0.5–4: LEFT bright summer sea, RIGHT blue ice. Seconds 4–5.75: LEFT lava, RIGHT ice. Seconds 5.75–7.5: LEFT lava, RIGHT snowstorm. The lamps flicker harder and harder and at the very end everything goes completely black.
```

### S12 · 111.5–121.5 s · 恢复照明　首帧 `S12_start.jpg`
```
Lights flicker back on from darkness. Seconds 0–2.5: LEFT soft spring meadow, RIGHT a cloud of white steam with a puff hitting the right glass. Seconds 2.5–6: LEFT lava, RIGHT snowstorm. Seconds 6–10: LEFT blue ice, RIGHT bright summer coast. A second magical season swirl spins in the aisle at second 0.5; the clock spins backwards.
```

### S13 · 121.5–131.5 s · 春の訪れ　首尾帧 `S13_start.jpg` → `S13_end.jpg`
```
The chaos calms: at second 0.5 both windows bloom into spring — rows of cherry blossom trees in full bloom, green meadows, soft morning sky. Dawn light turns the car from night-blue to warm morning cream. Pink petals drift past the windows and a few float into the car. Still fast, but gentle and joyful.
```

### S14 · 131.5–141.5 s · 春のさくら駅 / Cherry Blossom Station　首帧 `S14_start.jpg`
```
Both windows: cherry blossom trees and flower fields streaming past, petals swirling. From second 7 the train begins to slow down; in the RIGHT window a tiny fairy-tale wooden station platform with flower beds and a blank sign starts sliding in from the left. Warm sunlight, peaceful.
```

### S15 · 141.5–150 s · 到站（8.5 s）　首尾帧 `S15_start.jpg` → `S15_end.jpg`
```
The train gently brakes and comes to a full stop at second 4.5: the RIGHT window settles on the small cherry-blossom station with a little cottage and clock, the LEFT window on a quiet blossom meadow. Petals keep drifting down slowly, sparkles in the sunlight, everything becomes calm and still.
```

---

## 可选：封面 / 宣传用静帧（任意生图工具）

```
Key visual, 16:9: inside a cute magical anime train car, first-person view down the aisle; the LEFT panoramic window shows a glowing blue ice-crystal tunnel and blizzard, the RIGHT window a glowing orange lava tunnel with flames; speed streaks, sparkles, dramatic split cold-blue and warm-orange lighting; premium Japanese 2D anime film art, pastel, cel shading; no people, no text.
```
（标题文字我用代码叠加：「季節が、暴走する。」 + THE RUNAWAY SEASONS EXPRESS）
