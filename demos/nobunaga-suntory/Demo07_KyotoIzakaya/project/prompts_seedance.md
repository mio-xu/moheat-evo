# Demo 7《信長と家康、京都の居酒屋へ》— 关键帧 + Seedance 素材命令

> **已停用（2026-11-07）**：用户觉得逐镜头做视频太麻烦，改为**可复用图片 + 浏览器动画**（和 Demo 1–6 一样）。新的素材清单见 `project/prompts_chatgpt.md`；这份只作参考保留。

剧情和台词见 `storyboard/script_150s.md`。共 14 个镜头（K01–K14），合计约 150 s。

---

## 做法（两步，人物最稳）

1. **关键帧**：用 ChatGPT（或任意生图工具）生成每个镜头的第一帧，1536×1024 横版。
   - 每次都上传**角色设定图**作为人物参考：
     - `demos/nobunaga-suntory/Demo09_SengokuBanquet/assets/characters/N_Character.png`（信长）
     - `demos/nobunaga-suntory/Demo09_SengokuBanquet/assets/characters/I_Character.png`（家康）
   - 需要特定表情或姿势时，再加上表格里列的 `N_bust_*` / `I_pose_*`（同一文件夹）。
2. **Seedance**：图生视频，首帧用第 1 步的关键帧，再加上该镜头的"动作提示词"。
   - 参数：16:9，1080p，固定镜头或缓慢运镜；时长按表格（5 s 或 10 s，我来剪）。
3. **交付**：
   - 关键帧放进 `demos/nobunaga-suntory/Demo07_KyotoIzakaya/assets/keyframes/K01.png` …
   - 视频放进 `demos/nobunaga-suntory/Demo07_KyotoIzakaya/video/seedance/K01.mp4` …
   - 然后告诉我。我按台词时间剪辑、叠字幕，再与双耳音频和冷热合成。

**口型说明**：Seedance 生成的说话口型不会和我们的配音逐字对上。所以说长句的镜头，提示词里写"说话、表情生动"，我按台词起止剪辑；耳语镜头用侧脸或贴耳构图，看不到嘴。

---

## 通用提示词（关键帧和 Seedance 都放在最前面）

```
Two historical Japanese warlords in modern Kyoto on a snowy winter night (the Pontocho lantern alley and a cozy izakaya): ODA NOBUNAGA (left, sharp-eyed, mustache, top-knot, crimson-and-gold kimono with gold-leaf flower crests) and TOKUGAWA IEYASU (right, round calm face, bald pate with small top-knot, deep green-and-gold kimono with hollyhock crests) — keep their faces, costumes and colors exactly as in the attached character sheets. First-person view of the viewer between them: Nobunaga front-left, Ieyasu front-right (at the izakaya they sit at the wooden counter). Warm paper lanterns, wooden interior, steam, soft bokeh, snow outside. Premium Japanese 2D anime film illustration, richly detailed, warm cinematic lighting, gold-leaf accents on the warlords' clothing, consistent character design across shots.
```

## 负面提示词（每次都填）

```
text, letters, readable signs, menu text, logos, brand names, watermark, subtitles, extra people in focus, modern clothes on the warlords, different faces, younger faces, armor, weapons drawn, photorealistic, 3D render, CGI, horror, distorted hands, extra fingers, warped mugs, inconsistent costume, flicker
```

---

## 镜头表

| # | 时间 | 时长 | 参考图（除两张设定图外） | 关键帧提示词 | Seedance 动作提示词 |
|---|---|---|---|---|---|
| K01 | 0–4 | 5 s | — | Narrow Pontocho alley in Kyoto at night, light snow, rows of glowing paper lanterns, wooden machiya fronts, the Kamo River glimpse at the end; no people yet | Snow drifts down, lanterns sway; suddenly a burst of golden sparkles in the middle of the alley and two silhouettes appear in it. Slow push in. |
| K02 | 4–13 | 10 s | `N_pose_alert.png`, `I_pose_calm.png` | The two warlords standing in the snowy lantern alley, looking around in wonder at the modern lights, breath visible in the cold | Nobunaga turns his head, amazed, and speaks; then Ieyasu, hugging his sleeves against the cold, sniffs the air and smiles. Snow falls; lanterns flicker. |
| K03 | 16–24 | 10 s | `N_pose_invite.png` | They step through a navy noren curtain into a small bustling izakaya: wooden counter, hanging lanterns, shelves of bottles (no readable labels), a blurred cook behind the counter | Nobunaga pushes the noren aside with a big grin and spreads his arms, speaking excitedly; Ieyasu follows politely; warm light and steam. |
| K04 | 24–30 | 5 s | `N_bust_surprise.png` | Close-up of a shiny draft-beer tap pouring golden beer with thick white foam into a frosted glass mug; Nobunaga's astonished face leaning in at the left | The beer pours and foams over; Nobunaga's eyes go wide and he points at it, talking. Condensation drips. |
| K05 | 30–42 | 10 s | `N_bust_laugh.png`, `I_bust_chuckle.png` | First-person: three frosted beer mugs clinking in the centre of frame; Nobunaga (left) and Ieyasu (right) raising theirs | The mugs clink, foam splashes, sparkles; Nobunaga takes a big gulp and bursts into laughter, Ieyasu chuckles. |
| K06 | 42–50 | 5 s | `I_pose_offer.png` | Charcoal yakitori grill on the counter right in front, glowing embers, skewers sizzling, smoke rising; Ieyasu on the right offering a skewer | Flames flare, fat sizzles, smoke curls up; Ieyasu holds out a skewer kindly and speaks. Warm orange light. |
| K07 | 50–62 | 10 s | `I_ear.png`, `N_bust_suspicious.png` | Ieyasu leaning very close to the viewer's RIGHT ear, hand cupped, whispering with a mischievous smile; Nobunaga in soft focus on the left | Ieyasu whispers secretly (mouth hidden by his hand); then Nobunaga in the background narrows his eyes and points at him, protesting. |
| K08 | 62–76 | 10 s | `N_bust_surprise.png`, `N_bust_grin.png` | Nobunaga on the left holding a tall highball glass full of clear ice and bubbles up to the lantern light, fascinated | Ice cubes clink and bubbles rise; Nobunaga listens to the fizz, takes a sip, shivers with delight and grins. |
| K09 | 76–84 | 5 s | `I_bust_thoughtful.png` | Ieyasu on the right holding a small cup of hot sake, a steaming oden pot in front of him | Steam curls from the sake and the oden; Ieyasu sips, closes his eyes and sighs happily. |
| K10 | 84–92 | 5 s | `N_ear.png` | Nobunaga leaning in to the viewer's LEFT ear, whispering with a sly grin, hand raised to hide his mouth | Nobunaga whispers conspiratorially, glancing toward Ieyasu; lantern light flickers. |
| K11 | 98–116 | 10 s ×2 | `I_pose_wind.png`, `N_pose_stand.png` | A wooden window slid open onto the Kamo River at night: modern Kyoto lights reflected in the water, light snow; the two warlords seen from behind / three-quarter, looking out | Snowflakes blow in, the river shimmers; Ieyasu speaks softly, moved; Nobunaga, arms folded, nods slowly and smiles. (Make 2 clips: one with Ieyasu talking, one with Nobunaga.) |
| K12 | 116–132 | 10 s | `N_bust_laugh.png`, `I_bust_chuckle.png` | First-person: three highball glasses raised together at the centre, the warlords laughing on both sides, warm izakaya behind | Glasses clink, ice and bubbles sparkle, both laugh heartily; a festive, golden moment. |
| K13 | 132–146 | 10 s | `I_bust_polite.png`, `N_bust_proud.png` | The two warlords at the counter turning toward the viewer to say goodbye, faint golden particles starting to rise around them | Ieyasu bows gently and speaks; Nobunaga grins proudly and says something with a beckoning gesture; golden particles thicken. |
| K14 | 146–150 | 5 s | — | The counter with two empty cups (a sake cup and a highball glass) glowing softly where the warlords sat | The last golden particles drift up and fade; steam rises from the cups; calm and warm. |

> K01 和 K14 不用角色设定图。我的台词（"寒いでしょう…"、"窓を開けると…"）不需要单独镜头，我用前后镜头延长或做淡入淡出。

---

## 可选：封面关键帧

```
Key visual, 16:9: Oda Nobunaga (left) and Tokugawa Ieyasu (right) in their gold-leaf kimono, laughing and raising frosted beer mugs at the counter of a cozy Kyoto izakaya on a snowy night, lanterns, steam, warm golden light; premium Japanese anime illustration; leave the upper centre calm for a title; no text.
```
（标题文字我用代码叠加：日语大标题带假名 + 英文副标题，和 Demo 1–6 统一。）
