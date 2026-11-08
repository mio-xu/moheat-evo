# 工作日志 · Work log

> 用户 2026-11-08：「每次工作结束都要写日志，方便如果以后我换 agent 了也可以看懂」。
> **每次工作结束**（一轮对话的任务告一段落时）在最上面加一条：日期、会话 / 主题、做了什么、现在的状态、下一步、遇到的问题（问题的详细教训写进 `DEMO_DESIGN_GUIDE.md` §11.1）。
> 写给不了解上下文的人看：写清文件路径和命令，不写"上面那个""刚才"。多个会话同时工作时各写各的条目，最新的在最上面。
> 用户偏好在 `USER_PREFERENCES.md`，整体状态在 `HANDOFF_ASMR_DEMOS.md`，用户任务清单在 `TASKS.md`。

---

## 2026-11-08 · 女性向重制 莲 / 仁 / 紫苑（Demo33→12、Demo34→21、Demo35→22）· 交接（统筹要求转后台）

**现在的状态（三个都是暂存文件夹，还没合并上线）**
- 画面全部用 OpenAI gpt-image-2 做完（空背景、各姿势、张嘴 / 闭眼差分）：`demos/for-women/Demo33_RenNightCall`、`Demo34_JinVipRoom`、`Demo35_ShionRainyNight`。规格：`project/stage.json`；成品：`media/art/*` + `media/layers.js`（build_stage 生成）；原图在 `assets/art/`（不进 git）。
- 截断的身体已补（extend_pose）：`python3 tools/art/check_cut_body.py` 对三个 Demo 都是 0 报告。
- 嘴 / 眼补丁：自动找位置在 莲 close/door 和 紫苑 dryer/window 上找错了（补丁贴到头发上 / 两张嘴），已经在 stage.json 里写死 `regions_mouth` / `regions_eyes` 并重建。`check_patches.py` 现在：莲 嘴 0.3–1.2、眼 3.0–3.8；仁 全部 1.4–2.3；紫苑 嘴 0.4–0.5、眼 seam 3.3–4.0，100 % 表（`assets/patch_check/*.png`）目视干净。教训在 `DEMO_DESIGN_GUIDE.md` §11.1（最后一条，**还没提交**：指南里有别的会话未提交的改动，我没有一起提交）。
- 页面的数据钩子：莲 `CALL.S.view` / `CALL.FW.mouth`；仁 `JIN.S.view` / `JIN.S.lv`；紫苑 `SHION.S.view` / `SHION.S.lv`。

**还要做（按顺序）**
1. 运行时 2× 检查，在自己新开的标签页（不要用用户的标签页）：本地 `python3 -m http.server` 打开每个暂存页 `?auto=1` 和 `?auto=1&alt=1`；每个画面：张嘴补丁正好在闭嘴上、没有两张嘴 / 方框 / 色缝、只在说话时动、安静时闭上、切画面不闪、两只眼都眨。另外看紫苑 dryer 马尾后面有没有淡光晕。
2. 完整测试：EN / 日本語 / 中文；无 404；一屏；手机竖 390×844、横 844×390（播放器尽量大、按钮 ≥ 44 px、无横向滚动、触摸长按可用；`tools/web/check_mobile.html` / `tools/art/check_mouth.js` 是我做的辅助，未提交，可用可删）；2× 深色底看抠图；`assets/poses_preview.jpg` 看近远景一致和剧情连贯。
3. 合并：`python3 tools/web/merge_remake.py demos/for-women/Demo12_LateCall demos/for-women/Demo33_RenNightCall`（以及 Demo21_… ← Demo34、Demo22_… ← Demo35）。合并时不要删掉已有的热感事件。
4. 每个：封面 headless Chrome `?cover=1` → `media/cover.jpg` + `assets/images/demos/<folder>.jpg`；`python3 tools/web/thumbs.py <folder>`；需要的话 `python3 tools/web/bump.py --stage demos/shared/nav.js`（shared 文件本身要显式提交）；README；本地提交（统筹说不要 push / pull），把 hash 发给统筹。

**未提交、归属不确定的改动**：`tools/art/build_stage.py`、`tools/art/check_patches.py`、`tools/openai/images.py`（`--mask`）有工作区改动，部分是我的、部分可能是别的会话的——提交前先看 `git diff`。

**花费**：OpenAI 约 29 次图像调用（莲 8、仁 11、紫苑 10，详见各自的 `project/openai_log.json`）+ 约 8 次补身体，估计 $6–9（以账单为准，每个 Demo 预算 ≤ $10）。Seedance 只在开头用了少量（见 `project/seedance_log.json`），≤ 1500 credits 的预算远没用完。

**已知问题**：OpenAI 遮罩编辑仍会整图轻微重画，所以补丁位置一定要用 `regions_*` 写死并看 check_patches；build_stage 偶尔在 0 % CPU 卡住（这次 紫苑 卡了 5 分钟，杀掉重跑就好）。

## 2026-11-08 · 补全"半截身体"的画面（Demo24 岳 / Demo20 陽向 / Demo31 渚）· 后台 agent（统筹会话审查）

**做了什么**
- 用户：「有的画面人物全出现在画面里，但身体只有半截——补完整，可以调用 API 做完整的素材」。
- 新工具：`tools/art/check_cut_body.py`（列出截断处落在画面里的人物层；不带参数 = 全部 Demo）和 `tools/art/extend_pose.py`（gpt-image-2 补画缺的身体：发送正好 16:9 的窗口、留白透明；回答用 NCC 自动对位回原图，因为模型总会整体缩放 / 平移；沿差异最小的缝拼接；张嘴 / 闭眼差分同样补边；`--place` 恢复旧像素的屏幕位置；`--reraw` 重用存下的回答不花钱）。
- `tools/art/build_stage.py`（由 moheat-evo-24 提交）里我加了两处：face_patches 按图片尺寸分组运行（补宽的姿势以前差分错位）；"纯色底"的中性判断改成和底色本身比较（Demo20 的底是暖灰 #cec7c4，新规则会在头发旁留灰块）。
- 修好的画面：Demo24 `left`（右肩 + 皮夹克）、`blanket`（毯子右侧垂下）；Demo20 `wave`（左袖 + 手肘）、`hands`（左臂）；Demo31 `sparkler`（左袖）、`whisper`（"你"的后脑和肩）、`shoulder`（"你"的肩膀和上臂）。其他画面的文件和 layers.js 条目保持 HEAD 原样。每个 Demo 的 `media/layers.js?v=` 已加 1。
- 文档：`DEMO_DESIGN_GUIDE.md` §6 标准流程第 5 步（check_cut_body + extend_pose）、§11.1 新教训。

**现在的状态**
- 三个 Demo `check_cut_body.py` 0 报告，`check_patches.py` 补过的姿势 rim diff 都很低；页面在本地自己的标签页里看过 left / blanket / wave / hands / sparkler / whisper / shoulder。
- `demos/for-men/Demo18_HinataStream hinata_booth` 由 Demo18 会话自己补好了（提交 fab9c00）。Demo33/34/35 的 layers.js 当时是空的（别的会话在建），检查会显示 unreadable。
- OpenAI 花费：11 次调用（2 次 high 2560×1440 ≈ 7.4k 输出 token，9 次 medium ≈ 1.8k，含 1 次被安全系统拒绝、2 次构图对不上的试验），按用量估计约 1–1.5 美元（以账单为准）。

**下一步**
- 新 Demo 出姿势图时提示词写 "full figure inside the frame with margin"。

**问题**：gpt-image-2 遮罩编辑不保留构图 / 留灰边时什么都不画；whisper 第一次被安全系统误拒（提示词改成中性描述后通过）；build_stage 的两处问题见上。教训在 §11.1。
## 2026-11-08 · Demo18 ひなた抓娃娃机重做 + Demo39 ルナ（会话 moheat-evo-60）· 交接（统筹要求转后台）

**Demo18_HinataStream（ゲーセンデート，已上线 73f870a）· 用户反馈「抓娃娃机动画很奇怪，用高质量生成素材做」**
- 做法：抓娃娃机画面换成空机台背景 + 两个道具层，代码做动画（不用 Seedance）。素材（OpenAI gpt-image-2，`scripts/art.py` / `project/web_prompts.json`）：`assets/art/bg_crane_empty.png`（去掉爪子和白猫的机台，→ `media/art/bg_crane.webp`，stage.json 的 crane 背景）、`prop_claw_open.png`、`prop_cat.png`（绿幕 → `python3 demos/for-men/Demo18_HinataStream/scripts/props.py` → `media/art/prop_*.webp`）。`prop_claw_closed` 画得不配套（外壳变了）→ 不用，合拢靠代码挤爪。
- 代码 `main.js`（约 296–331 行 `CLAW` / `CAT` / `drawCrane`，故事在约 150–175 行）：长按移动爪子 → 下降到 `grabY()` → 合拢 → 第 1 次提起后滑落（bounce）→ 第 2 次提到出口 → 掉下 → GET!。绘制顺序：中间那根爪（玩偶后面）→ 玩偶 → 两边的爪（前面，只收拢到头宽 `pw = w × (1 − .2·closeK)`）→ 吊绳 → 外壳。`CLAW.w = 300`，`HEAD = −.02`（外壳停在头顶上方）。`index.html` 里 `main.js?v=8`。
- 状态：猫玩偶正常显示（之前以为没画，是取样时机不对）；放大检查过「刚抓住」一帧：两边的爪卡住头的两侧，看起来对；**中间爪移到玩偶后面（v=8）之后还没截图确认**，「提起来 / 移到出口 / 掉落」几帧也没放大看。没有发给统筹看帧。
- 检查方法（避免截图延迟抓不到）：自己的新标签页打开 `http://localhost:8765/demos/for-men/Demo18_HinataStream/index.html?auto=1`，JS 里等 `ARCADE.S.view==='crane' && ARCADE.crane.carry`，然后 `window.requestAnimationFrame = f => 0` 冻结画面再放大截图（单次 JS 调用超过 45 秒会超时：先等到 taiko 结束再等 crane）。
- 包厢（booth）画面的截断边：已用 `tools/art/extend_pose.py` 延长（`hin_booth_ext`，stage.json booth x .5865 y 1.041 h 1.041），`check_cut_body.py` 通过；`check_patches.py` 包厢贴片边缘差 6.2 / 9.8，**还没放大看** `demos/for-men/Demo18_HinataStream/assets/patch_check/booth_*.png`。注意：统筹说 QA 会话在查所有 Demo 的嘴（可能改 `shared/layers.js` / stage.json），重新 build Demo18 前先问统筹。
- 下一步：① 按上面方法截 2 帧（抓住、提起来）发统筹；② 看 booth 贴片；③ 手机竖 / 横屏再跑一次 crane 长按；④ 本地提交，统筹推送。

**Demo39_LunaBartender（ルナ秘密调酒师 → 合并进 Demo19_LunaStream）：还没开始做画面**
- 现有：只有 `demos/for-men/Demo39_LunaBartender/project/script.md`（剧本，统筹已审）。
- 要求：照 Demo18 的做法（分层：空背景 + 绿 / 灰幕姿势 + 遮罩差分 → `build_stage.py`）；声音 ElevenLabs `luna` r1_b（`1blqWrqFcJagS9nJcCXc`，不试音）；人物参考 `demos/for-men/Demo14_MintStream/assets/art/luna_*`（**要先复制进 Demo39**，Demo14 马上会被 Mint 新版替换）；DUAL：冰摇壶贴右脸、门口冷风左、flambé、爱尔兰咖啡、她坐在你左边；语音判定的干杯「说出来」；结尾回到自己的封面；关键画面先给统筹看再批量出；嘴 2 倍检查（只在说话时动、停顿闭上、没有双嘴 / 方框 / 接缝）；手机 390×844 / 844×390。
- 合并：备份 `Demo19_LunaStream` 到 `~/Desktop/MoHeat Evo 备份/for-men/Demo19_LunaStream_<时间>/`（`cp -RL`），`git mv` 接管；**页面完全独立**：去掉 `<base href="../Demo14_MintStream/">`，html / js / css / 图 / 音频都不能从 Demo14 读；nav.js 标题、菜单、credits、`tools/web/thumbs.py`、TASKS #35/#37；合并后告诉统筹 moheat-evo-c9 和 moheat-evo-55。预算：OpenAI ≤ $10、Seedance ≤ 1500。

**未提交、不是本会话该提交的**：`demos/for-men/Demo31_SummerRooftop/` 的 media / stage.json / layers.js 改动（stage.json 现在是 `*_flat_ext`，是别的会话的 extend_pose + QA 正在改，14:21 还有写入）。本会话只提交了 `tools/art/clean_cutout.py`（从 Demo31 移到 tools，Demo 文件夹是必填参数）和 Demo31 的 `scripts/clean_cutout.py` 包装。

**花费**：Demo18 OpenAI 共约 17 张（`project/openai_log.json`，约 $3.4，含抓娃娃机 4 张、包厢延长 1 张）；Demo39 0；Seedance 0；ElevenLabs 本轮 0。没有在跑的出图 / 视频任务。

---
## 2026-11-08 · 男性向 4 位女主播改剧情 + 椿分层重做（本会话：Demo25 / Demo17 / Demo37，Demo18 / 19 交给 moheat-evo-60）· 交接

**用户的指令**（TASKS #33–37）：男性向直播间的女主角（ミント / ココア / ひなた / ルナ）只留一个直播间，其余改成像渚（Demo31）、椿（Demo25）那样丰富的剧情；人设（外表、性格、声音）不变，剧本重写；大小姐（椿 Demo25）剧本不改、画面改成新的分层做法；做好后**直接替换旧版上线**（同一网址，旧版备份到仓库外）。用户选定：ココア A 情人节前夜做巧克力 · ひなた B 游戏厅约会 · ルナ B 秘密调酒师 · ミント 仍是直播，形式换成 C「耳朵专门店」角色扮演直播。剧本初稿由统筹会话 moheat-evo-c9 代用户审过（用户醒来后可以再改）。

**做完并上线（本地提交，统筹会话推送）**
- **椿 Demo25_HatsumodeDate**（e64411c）：剧本、配音、冷热不变；8 张空背景（从旧静帧去掉人物）+ 8 个姿势（绿幕，以新画的 torii 姿势为人物参考、旧静帧只参考构图）+ 遮罩差分 → `build_stage.py`；15 段 Seedance 视频去掉。旧版备份 `~/Desktop/MoHeat Evo 备份/for-men/Demo25_HatsumodeDate_20261108-1356/`。两条分支自动通关 0 报错。
- **ココア Demo17_CocoaStream**（1f3d699，在临时文件夹 Demo36 做好后 `git mv` 接管）：《ココアの、バレンタイン前夜》5 段、24 句（ElevenLabs cocoa r1_a）、6 次互动、DUAL（烤箱右 / 冰箱左 / 蒸汽 / ふーふー / 声音）；2 张背景 + 7 个绿幕姿势 + 14 张遮罩差分。旧直播页备份 `…/Demo17_CocoaStream_20261108-1410/`。两条分支通关（2:40 / 2:44），嘴 2 倍检查过。
- **Demo24 岳**（324f579）：不再引用 Demo14 的 style.css（复制为 `Demo24_GakuCamp/stream.css`）。
- 工具：`build_stage.py`（`"matte": "green"` / `"magenta"` 色键 + 去溢色；贴片按人物透明度裁、去溢色；`regions_eyes` 固定眼睛椭圆；视图不写 x/y/height 时保持原图取景）、`face_patches.py`（`regions`）、`merge_remake.py`（带上重做版的其他脚本；原版同名 project JSON 留作 `*_v1.json`）、`remake_page.py`（共用 layers.js 用当前版本号）、新 `tools/art/align_variant.py`（大范围对齐重新取景的差分）。

**进行中：ミント Demo37_MintEarSalon（之后接管 Demo14_MintStream）**
- 已有（afea14a / 380696f）：`project/script.md`（剧本）、`lines.js` + `media/voice/`（22 句，ElevenLabs mint r1_a）、`index.html` / `style.css`（直播覆盖层：LIVE、观看数、多语弹幕、Super Chat 卡片）、`main.js`（Demo17 ココア的框架；投票 / 点单选项、掏耳朵长按（松手会提醒一次 m08x）、翻身、说「おやすみ」、两种结局；DUAL：手 / 热毛巾 / 冰勺子 / 温石 / 薄荷气息 / 喷雾 / 毯子）、`audio.js`、`l10n.js`（`scripts/make_l10n.py`，三语 + 语音答案）、`scripts/prompts.py` → `project/web_prompts.json`。
- 画面：她是薄荷绿头发，姿势用**品红幕 #FF00FF**（`"matte": "magenta"`）。已出 `assets/art/mint_greet.png`（人物参考）、`bg_salon.png`、姿势 `mint_towel` `mint_spoon` 等（统筹已审 key 图）。交接时后台任务还在出剩下的姿势（`python3 tools/openai/images.py demos/for-men/Demo37_MintEarSalon mint_towel mint_spoon mint_earL mint_earR mint_lullaby mint_goodnight`，已存在的会跳过；中断了就重跑这条）。
- **还要做**：
  1. 看 6 个姿势和 greet 是否同一个人、earL / earR 是否真在左 / 右耳边、没有多余道具（拼图对照，不对的 `--force` 重出）。
  2. 量脸：给 7 个姿势写 `project/face_points.json`（格式同 `demos/for-men/Demo17_CocoaStream/project/face_points.json`：`eyes` 两个椭圆 + `mouth` 一个，单位是 2560×1440 原图像素），画椭圆核对后 `python3 scripts/prompts.py`（自动给差分加 mask），再出 14 张差分：`for v in greet towel spoon earL earR lullaby goodnight; do python3 tools/openai/images.py demos/for-men/Demo37_MintEarSalon mint_${v}_talk mint_${v}_blink; done`。
  3. 写 `project/stage.json`（照 Demo17 的：`hooks` 用 `MINT.S.view` / `MINT.S.lv`；1 个背景 `salon`（`"fire": [0.5, 0.5]`，视图 `fire: null`）；姿势 `"matte": "magenta"`、`centre_mouth` / `radius_mouth` / `regions_eyes` 从 face_points 来，半径 ×0.8），`python3 tools/art/build_stage.py demos/for-men/Demo37_MintEarSalon`，再跑 `tools/art/check_patches.py` 和 `tools/art/check_cut_body.py`；夜景要放大看发丝边缘有没有品红残留。
  4. 测试（自己的新标签页）：`?auto=1`、`?auto=1&alt=1` 都要回到封面；7 个画面都出现；嘴 2 倍检查（只在说话时动、停顿闭上、没有方框 / 接缝）；两只眼都眨；弹幕 / Super Chat 卡片不挡字幕；`?sub=zh` / `ja`；手机竖屏 / 横屏。
  5. **合并进 Demo14**（只在统筹会话确认 moheat-evo-60 已把 ルナ 并入 Demo19、Demo19 不再 `<base href>` 到 Demo14 之后）：备份 Demo14 到 `~/Desktop/MoHeat Evo 备份/for-men/Demo14_MintStream_<时间>/`（`cp -RL`）→ `git rm -r` Demo14 → `git mv demos/for-men/Demo37_MintEarSalon demos/for-men/Demo14_MintStream` → 写 `scripts/make_cover.py`（复制 Demo17 的，它按文件夹名取网址）并运行 → `python3 tools/web/thumbs.py Demo14_MintStream` → `demos/shared/nav.js` 改 Demo14 的标题（ja ミントの、おみみ専門店 / en Mint's Ear Salon / zh 薄荷的耳朵专门店；**只暂存这一行**：HEAD 版本 + 改动 → `git hash-object -w` + `git update-index --cacheinfo`）→ `python3 tools/web/bump.py --stage demos/shared/nav.js` → 根目录 `index.html` 菜单文字、`credits.html`（「ミント / ルナ の配信」行）→ `.gitignore` 里 Demo37 路径改成 Demo14 → README（照 `demos/for-men/Demo17_CocoaStream/README.md`）→ 本地提交，哈希发给统筹会话。`tools/cleanup/audit.py` 里还有 `Demo14_MintStream/project/box_*.jpg` 的条目，合并后检查是否还需要。

**花费**：OpenAI gpt-image-2 约 71 张（椿约 39、ココア 24、ミント 8，2560×1440 high，约 $0.2/张，合计约 $14；账单以 OpenAI 为准）；ElevenLabs ココア 24 句 + ミント 22 句；Seedance 0（上传仍限流）。

**遇到的问题**（都已写进 `DEMO_DESIGN_GUIDE.md` §11.1 / §6）
- 后台命令里又套 `( … ) &`，任务被一起结束。
- 按旧静帧重画姿势写了 "full figure"，人物缩成小全身像。
- 深灰底把银发之间的深色线稿抠掉 → 浅色角色用绿幕 + 色键；绿头发用品红幕。
- 差分贴片在侧脸轮廓处带进绿幕底色 → 贴片按人物透明度裁、去溢色。
- 特写的第二只眼自动截取太小、模型只闭一半 → `regions_eyes` + 只对那只眼再做一次遮罩编辑。
- 共用文件提交时带上了别的会话的改动（Demo37，推送前撤回）→ 共用文件一律「HEAD + 自己的几行」暂存。
- 本地 8765 服务器中途停了 → 在仓库根目录重新 `python3 -m http.server 8765`。
- 手机竖屏：顶栏设备控件把页面撑到 637 px 宽、开始按钮 30 px 高 —— 共用 CSS 的问题，统筹会话说另有 agent 在修。

---

## 2026-11-08（晚）· Demo23 信長と、語らう：剧本版和实时版都能选地点 × 对象 · 后台 agent（统筹会话审查）

**做了什么**（用户：假的也要支持更多场景，可以选地点、只和信长 / 只和家康 / 两人，真假两版都要，话题要和地点相关）
- 两版封面同一套选择（`main.js` picker）：地点 5 个（🌇 天守 / 🍵 茶室 / 🍶 先斗町 / 🥃 山崎 / 🌕 安土）× ふたり / 信長のみ / 家康のみ；冷热标签和右侧 Thermal 说明跟着地点变（`scenes.js` 的 `short` `chips` `note`）。实时版去掉了单独的"你说的语言"，识别跟显示语言走。手机：≤620 px 播放器只留标题、地点一行、对象 + 开始一行（全部 ≥44 px）；≤940 px 去掉小字。
- 剧本版 `lines.js` 改成 `scenes.<地点>`：每个地点一套两人剧本（6 段），单人版 = 该人物的两人版台词 + 少量 `"in"` 专用句；茶室两人版原样保留。过渡句：共用池 + 每地点 2 个话题（景色/甜食、吃的/雪、威士忌/雾、月/海和梦想），地点可以替换共用的"酒"池。`scripted.js` 按 cast 切剧本。
- 冷热（DUAL）：新事件 `fanL/fanR`（扇子，单耳凉）、`window`（开窗看雪，右冷）、`still`（蒸馏釜热气，左暖）、`glass`（冰杯贴右耳）；`main.js` 事件可写 `k`/`fx`/`icon`/`dur`；`audio.js` 加 fan / clink / steam 音效。剧本里安排了：凉风/冰杯/开窗时同一只耳朵上的耳语（同耳冷 + 热）、火盆→夜风（热→冷快速切换）、左热前冷（方向）。
- 配音：`scripts/voice.py`（支持多地点、`--max-chars`）新合成 178 句、5,580 字（ElevenLabs 实扣 2,305 credits，本月剩约 10 万），共 229 个声音文件。
- 实时版：prompt 加"话题必须和地点相关"；`node scripts/prompt_dry.js [--all | <地点> <NI|N|I>]` 不花钱打印 prompt。
- 工具：`scripts/script_md.py` 由 lines.js 生成 `project/script_scripted.md`。

**测试**：15 种组合快速通关（假播放）全部回到本 Demo 封面、单人版只出现该人物、地点过渡句会触发；京都 × 信長のみ 实时通关（真声音、中文）1:53，0 假名，开窗 + 右耳耳语时 RC71 / RH140 同时输出；实时版静态页 9 种组合确认选择进到 prompt（没开付费对话）；`check_mobile.html?only=Demo23` 7 种尺寸 0 问题；`check_missing.js` zh / en 0。

**下一步**：统筹会话审查；用户想要的话，可以给更多地点（Demo 5–9 的其他背景）照同样格式加剧本（每个地点约 1,100 字）。

**问题**（教训已写进 §11.1）：lines.js 头注释里又写了赋值样子导致 voice.py 解析失败；地点按钮英文太长在手机横屏溢出；长测试在 javascript 工具里超时。


## 2026-11-08 · Demo23 拆成公开剧本版 + 私密实时版 · 后台 agent（统筹会话审查）

**做了什么**
- `demos/nobunaga-suntory/Demo23_NobunagaTalk/` 现在是**公开剧本版**（进 nav.js、官网菜单、credits.html，缩略图 `assets/images/demos/Demo23_NobunagaTalk*.jpg`）：茶室の囲炉裏、信長 + 家康、6 段剧本（`lines.js`，草稿 `project/script_scripted.md`）；玩家说什么（按显示语言识别 / 打字 / 沉默 9 秒）都由下一个开口的人说一句过渡句（关键词：是/否、茶、酒、天下、冷暖、未来、夸奖、告辞，否则通用句）再接回剧本。声音 `media/voice/*.m4a` 用 `scripts/voice.py` 一次合成（52 句，1,495 字符）。运行时零成本、无服务器。
- **私密实时版**移到 `live/index.html` + `live/live.js`；`server.py` 加密码登录（`~/.moheat_live_pass`，第一次启动生成并打印一次）、所有页面和 API 需要 cookie、不提供 `.env.local` / `.git` / `*.py` 等；`start_demo.command --remote` / `start_remote.command` 开 Cloudflare quick tunnel（没有启动过，需要 `brew install cloudflared`）。
- `main.js` 改成两版共用的引擎，"大脑"是 `window.TALK_BRAIN`（`scripted.js` / `live/live.js`）；侧栏对话记录跟随显示语言。

**现在的状态**
- 公开页测试：英文打字 + 沉默跑完一遍，过渡句按话题选对、结尾正常、DUAL 指令在变、无 404（只有站点的 favicon）；中 / 日 / 英封面和字幕都切过，`MoHeatSub.missing()` 为空；1440×800、1280×720、1920×1080、手机横屏无滚动。
- 私密页测试：无 cookie → 页面跳登录、`/api/*` 401；错误密码 401；登录后页面和状态正常，`/.env.local`、`server.py`、`local/usage.json` 404。没有开真正的付费对话。

**下一步**
- 用户第一次双击 `start_demo.command` 时会在终端看到密码；手机用要先 `brew install cloudflared`。
- 可以照 `lines.js` 的格式给其他 4 个地点各写一套剧本（每套约 1,500 字符）。

**问题**（教训已写进 `DEMO_DESIGN_GUIDE.md` §11.1）：旧 `server.py` 会把整个仓库（含 `.env.local`）当静态文件提供；`lines.js` 注释让 Python 解析失败；Chrome 窗口最大化时改尺寸无效，改用 iframe 测。

## 2026-11-08 · 分层做法定为标准；女性向 Demo 重做（岳、陽向完成，蓮 / 迅 / 紫苑待出图）· moheat-evo-24

**做了什么**
- 试过 Live2D 的替代方案（LivePortrait、深度视差、JoyVASA），最后定下标准做法：空场景背景 + 纯色底姿势 + Seedance / GPT 画出来的张嘴、闭眼差分 → `python3 tools/art/build_stage.py <demo>` → `demos/shared/layers.js` 在旧 `main.js` 画静帧的地方画分层合成（视差、火光、呼吸、口型、眨眼）。写进 `DEMO_DESIGN_GUIDE.md` §6「标准制作流程」、§6.2、§6.3（Seedance 只给动态 CG）。
- 共用工具：`tools/art/face_patches.py`（自动截取嘴 / 两只眼的差分）、`tools/art/build_stage.py`（抠图、差分、背景摆位、备用静帧、`media/layers.js`；`matte: ai`、`erase` / `keep`、`hooks`、`alias`）、`tools/web/remake_page.py`（重做页面按路径复用原文件）、`tools/web/merge_remake.py`（重做版并回原文件夹，旧版备份到仓库外）、`tools/seedance/web_helpers.js` + `web_take.py`（网页端出图）、`tools/openai/images.py`（OpenAI gpt-image-2）。
- 岳：分层版接管 `demos/for-women/Demo24_GakuCamp`（约 425 Seedance credits，无视频）；陽向：分层版接管 `demos/for-women/Demo20_HinataHandshake`（Seedance 100 credits + OpenAI 6 张 + ChatGPT 1 张）。旧版都备份在 `~/Desktop/MoHeat Evo 备份/for-women/`。菜单、缩略图、封面已更新。

**现在的状态**
- 蓮 / 迅 / 紫苑的临时文件夹已准备好（提示词 `project/web_prompts.json`、分层表 `project/layers.md`、摆位 `project/stage.json`、页面）：`demos/for-women/Demo33_RenNightCall`、`Demo34_JinVipRoom`、`Demo35_ShionRainyNight`，还没出图。
- Seedance 上传限流中（约到 2026-11-09 上午）。

**下一步**
1. 等用户确认 OpenAI 费用（43 张，约 10 美元）后，`python3 tools/openai/images.py demos/for-women/Demo33_RenNightCall <job…>` 先出底图（背景 + 姿势），再出差分；迅、紫苑同样。
2. 每个：`build_stage.py --preview` → 看两只眼 / 嘴的截取预览 → 调 `stage.json` 摆位 → 在新标签页自动通关两条分支、确认口型和眨眼在动 → `merge_remake.py <原文件夹> <临时文件夹>` → 封面、`tools/web/thumbs.py`、`bump.py --stage demos/shared/nav.js` → 提交。
3. 四个都完成后，旧版视频已不在仓库里（都在备份中）；跟用户确认备份文件夹要不要长期保留。

**遇到的问题**（详细在 `DEMO_DESIGN_GUIDE.md` §11.1）
- 改了 `shared/layers.js` 没升 `?v=`，陽向的嘴不动；复用 Demo20 时没核对它的状态对象（`HINA` 不是 `STREAM`）。
- 只眨一只眼（刘海挡住 / 头歪着的那只没认出来）；自动测试没检查口型和眨眼。
- 浅色角色的衣服被浅灰底抠穿；占位链接差点让合成写进原 Demo 的文件；Seedance 输出链接过期导致 7 张失败；上传限流时网页端和 API 一起失效。
- 在用户正在看的标签页里跑测试，打断了用户。

---

## 2026-11-08（深夜）· Demo31_SummerRooftop 验收修正 · 已通过（协调者 moheat-evo-c9），已上线

**做了什么**
- 协调者验收指出：烟花在空中被一条直线切掉（天空遮罩的下边是 y 342 的直线，比真实山脊高约 40 px）。→ `scripts/make_sky_mask.py` 改成沿手描的山脊 + 海平线折线（`RIDGE`），羽化约 8 px；炮弹从海平线升起（`main.js` 的 `HORIZON`）。
- 画的烟花贴图使用前先处理（`main.js` 的 `prepSprite`：接近黑的噪点压成纯黑、圆形渐隐），叠加时不会露出方框。
- 复查"笑"、坐着、告白大连发三个画面：烟花沉到山脊 / 海平线 / 水塔 / 楼后面，边缘柔和，渚在最上层。
- 提交 2997bb4（协调者已推送）；指南 §11.1 加了"遮挡边界沿真实轮廓、贴图特效去方框"的教训。

**状态**：Demo31 完成并通过验收。审阅用的截图已移到废纸篓（`~/.Trash/Demo31_review2`）。

**交接要点**（给下一个接手的人）
- 改了人物图后的重建顺序：`python3 tools/art/build_stage.py demos/for-men/Demo31_SummerRooftop && python3 demos/for-men/Demo31_SummerRooftop/scripts/clean_cutout.py`，再 `scripts/make_cover.py` + `tools/web/thumbs.py Demo31_SummerRooftop`。
- 改了背景图后要重描 `scripts/make_sky_mask.py` 的 `OCCLUDERS` / `RIDGE`，跑 `--preview` 看 `assets/sky_preview.jpg`。
- 推送只由协调者做（用户规则，2026-11-08 起）：本地提交后把 hash 发给 moheat-evo-c9。

## 2026-11-08（晚）· Demo31_SummerRooftop 第二轮：烟花中间层、近景一致、头发抠图 · 完成

**做了什么**（用户：烟花做中间层、只在不被建筑遮挡的天空、更华丽；近景和远景人物一致；头发抠图还有问题）
- 烟花 = 中间层：8 张画的烟花（OpenAI gpt-image-2，Seedance API 整体限流）+ 代码火花，`demos/shared/fireworks.js` v2 的 `drawLayer`；天空遮罩 `media/art/sky_roof.png`（`scripts/make_sky_mask.py`，手描遮挡物多边形，RGBA）；每个画面把渚的轮廓从遮罩里挖掉，所以她永远在最上层。
- 近景一致：贴耳、靠肩、贴耳张嘴按"远景 + 线香花火特写"两张参考 + 画风锁定重画（`tools/openai/images.py` 的 `ref` 支持列表），`stage.json` 换成 `nagisa_whisper2` / `nagisa_shoulder2`（先 `flatten_bg.py`）。
- 头发抠图：`scripts/clean_cutout.py` v3 用抠图公式（已知灰底 → 求 α），没有亮边、没有灰块；修了 build_stage 路径加 `?v=` 导致清理没跑的问题。
- 测试：中文第一分支 2:26、日文第二分支 2:17，0 报错，没有漏翻译，正好一屏；封面、缩略图重做。
- 花费：OpenAI 约 33 张（约 5–6 美元，在每个 Demo 10 美元以内）；Seedance 这一轮 0。

**状态**：完成，等用户 / 协调者（moheat-evo-c9）验收。审阅图：`demos/for-men/Demo31_SummerRooftop/assets/poses_preview.jpg`、`assets/review_*.jpg`（不进 git）。

**遇到的问题**（§11.1）：灰度遮罩裁剪无效；共用工具路径格式变了导致清理没跑；阈值清理头发总留亮边；Seedance 整体限流时脚本会等 20 小时。

## 2026-11-08 · Demo31_SummerRooftop（男性向：夏夜屋顶 · 青梅竹马 渚）· 完成，已上线菜单

**做了什么**
- 用户要一个新的男性向剧情 → 4 个方案，用户选 A「夏夜屋顶 · 青梅竹马」；女主 早瀬渚（20 岁、嘴硬型），造型 A（栗色高马尾、藏青烟花纹浴衣），声音 ElevenLabs `nagisa` r1_b。
- `demos/for-men/Demo31_SummerRooftop/`：剧情、22 句配音（`scripts/voice.py`）、页面（以 Demo25 为底）、DUAL 冷热、三语（`scripts/make_l10n.py` → `l10n.js`）、语音回答。
- 美术按 ガク（Demo24）分层标准：`project/layers.md`、`project/stage.json`、提示词 `scripts/seedance.py` 的 `JOBS3`。背景 + 站立基准 Seedance 网页；其余 15 张 OpenAI API（`scripts/gpt_image.py`）。
- 合成：`python3 tools/art/build_stage.py demos/for-men/Demo31_SummerRooftop` → `python3 demos/for-men/Demo31_SummerRooftop/scripts/clean_cutout.py`（夜景必跑）。
- 烟花：新共用模块 `demos/shared/fireworks.js`（用户：烟花不够华丽）。
- 菜单（`demos/shared/nav.js`、官网 `index.html`）、`credits.html`、封面 `scripts/make_cover.py`、缩略图 `tools/web/thumbs.py Demo31_SummerRooftop`。
- 规则类：`USER_PREFERENCES.md`、`WORKLOG.md`（本文件）建立；出图顺序最终版（Seedance API → OpenAI API → Seedance 网页）写进 CLAUDE.md / AGENTS.md / 指南 §5.3 / 交接文档。

**现在的状态**：完成，两条分支自动通关 0 报错；等用户试玩反馈。没有视频。

**下一步**（看用户反馈）：画面 / 台词 / 冷热微调；如果用户要动态 CG，按 §6.3 只做"她凑到耳边"一段。

**遇到的问题**（详细在 `DEMO_DESIGN_GUIDE.md` §11.1）
- 把「和岳保持一致」理解错，先做了 8 张整图（Seedance 200 credits 浪费）。
- Seedance 每日上传上限：网页上按钮变灰、脚本"成功"但没提交。
- 新图和旧整图重名，脚本跳过 → 差分做在旧图上。
- 从剪贴板读东西，把用户的 OpenAI key 打印到了输出 → 已提醒用户换 key；不再读剪贴板。
- 提交共用文档时带上了别的会话没提交的改动。
- 抠图在夜景上露出灰边（两轮）：碰边的浅色皮肤被抠掉、被围住的灰底块、发丝亮点 → `clean_cutout.py` + `keep` 框；检查方法写进 §11.1。
