# 工作日志 · Work log

> 用户 2026-11-08：「每次工作结束都要写日志，方便如果以后我换 agent 了也可以看懂」。
> **每次工作结束**（一轮对话的任务告一段落时）在最上面加一条：日期、会话 / 主题、做了什么、现在的状态、下一步、遇到的问题（问题的详细教训写进 `DEMO_DESIGN_GUIDE.md` §11.1）。
> 写给不了解上下文的人看：写清文件路径和命令，不写"上面那个""刚才"。多个会话同时工作时各写各的条目，最新的在最上面。
> 用户偏好在 `USER_PREFERENCES.md`，整体状态在 `HANDOFF_ASMR_DEMOS.md`，用户任务清单在 `TASKS.md`。

---

## 2026-11-08（夜）· 展示模式 Kiosk（TASKS #54，agent `kiosk`，统筹分派）
- **已提交（未推送，统筹推）**：8772c46 展示模式全部代码；下一个提交 = 37 个页面的 `nav.js?v=` 内容哈希 + qrcode 许可头；再下一个 = 文档（本条、`docs/kiosk.md`、`docs/kiosk_staff_card.md`、`docs/kiosk/REQUIREMENTS.md` §9、指南 §7.4 + §11.1 两条、TASKS #54、tools/README）。
- **做了什么**：`kiosk/`（`?kiosk=1` 进入，对这台浏览器一直有效）= 欢迎（三语、三步图示、推荐 3 个 + 全部号码、角落二维码、卫生标识）→ 2 秒片头（冷→暖扫过两耳）→ 30 秒引导（`demos/shared/thermintro.js`：戴耳机 L/R、音量、左暖、右凉、冷热切换、同耳 DUAL、强度；不靠声音也能看懂；`kiosk/intro.html` 是非展示模式版）→ Demo（`demos/shared/kiosk.js`，只在展示模式由 `nav.js` 加载：默认互动、精华版 80 秒、✕ 结束、音量滑块、强度上限、自动连设备、连续 120 秒停 10 秒、断开大提示、空闲重置）→ 体验卡（一屏一题：星级 → 想买吗 → 价位 → 场景 ≤ 2 → 最喜欢的瞬间；15 秒自动关闭）→ 重置 → 空闲轮播。工作人员面板（左上角 5 下 + PIN `0000`）：设置、统计（今天 / 累计 最多的 Demo、购买意愿 / 价位 / 场景、留言）、导出 CSV / JSON、日报 `report.html`、排队屏 `queue.html`（屏幕 2，BroadcastChannel 同步：大二维码、画面镜像、两耳冷热大图、正在体验、推荐 3 个）、A4 海报 `poster.html`、离线缓存（根目录 `kiosk-sw.js` + `kiosk/precache.json`）、退出。手机选号 `pick.html?o=<Demo 编号>`（不用服务器，号码和展示机一致）、带走页 `summary.html`。
- **测试**：`node tools/web/check_kiosk.js`（完整一轮：引导冷热指令、Demo28 精华版 76 s 后自动到体验卡、体验卡 3 s 答完、统计 / CSV、轮播、Demo 封面空闲回欢迎、PIN、面板、退出）1440×900 全过；`--quick` 在 1024×768（平板）全过。排队屏 1920×1080、手机选号 390×844 截图检查过。截图在 scratchpad `kiosk/shots/`。
- **没做 / 下一步**：① 真机真设备走一遍（Web Serial 自动连接、断开提示、电量提示要固件回 `BAT nn` 才有）；② 精华版的起点现在是「本机学到的最强章节 → 第 2 章」，可以给重点 Demo 在 `kiosk.js` 的 `SHOWCUT` 里写死起点；③ 画面镜像只在舞台是 canvas / video 时有实时帧，DOM 分层的 Demo 显示封面；④ 统一外壳改成底部控制条后，`MoHeatShell.setVolume` 出来时展示模式自动改用它（已留钩子），届时复测；⑤ service worker 要和 UI 重做 agent 的「封面优先加载」协调（目前 `kiosk-sw.js` 只在面板点「离线保存」后注册）；⑥ 新 Demo 要在 `kiosk/pitches.js` 加一行并重跑 `python3 tools/web/kiosk_precache.py`。
- **问题**：shell 暂停时冻结 `Date.now` / `setTimeout`，空闲重置跟着冻住 → 用真实时间（指南 §11.1）；CSS `font: … inherit` 整条无效 → `var(--ff)`；两次「行尾注释吞掉后面的代码」（python 拼接时把语句接在 `//` 注释后面）→ 改完跑一次完整测试才发现，以后用 `node --check` 之外再跑 `check_kiosk.js --quick`。

## 2026-11-08（夜）· 统一外壳第 2 段：游戏自动演示、进度条总开关、菜单排序、封面切边（ui-shell 2，统筹分派）
- **已提交（未推送，统筹推）**：a8ecf26 进度条总开关 `MoHeatShell.BAR_ENABLED = false`（统一进度条 + 影片自带播放条全站隐藏，`?bar=1` 测试时显示；check_shell 用 `?bar=1`）+ 「手」（`MoHeatShell.hand`：游戏纯聆听时可见的手指，真实 pointer / mouse 事件，`G.tap / hold / drag / move / wait(secs, until)`）；ed830b7 + 0df3c67 六个游戏自动演示（Demo10 / 11 / 13 / 15 / 16 / 26 的 `MoHeatShell.autoplay` 钩子）+ **默认模式改为「互动」**（纯聆听为可选，记住的选择优先）；9562449 + a4c8aaa Demo22 封面（整张画 outpaint，无切边，统筹已认可）；7f4a9a7 菜单自动排序（nav.js `series / part / cast / featured / new` + `tools/qa/thermal_score.py` + `tools/web/check_nav.py`）；9b88584 对谈 kit 纯聆听自动回答（talk 页面还没加载 shell.js，暂不生效）。
- **测试**：`node tools/web/check_shell.js <demo>`：Demo10 / 15 / 16 / 26 全过（纯聆听零输入走完 101–177 s、无麦克风、暂停、章节前后跳）；Demo11 / 13 走完、无麦克风、暂停 OK，各有一次 seek 腿不稳（Demo11 后退偶尔超过、Demo13 前进 ×16 时 🎤 长按已加 until，未复测）。盘点表 `scratchpad/ui-shell/shell2_invA/B.jsonl` + 截图 `shell2_inv/`（33 个 Demo，开关加入前）。
- **未提交（等统筹审图）**：Demo12 / Demo20 封面改成整张画（`tools/art/cover_plate.py`，各 ≈ $0.3 已记账），check_cover PASS；`shared/cover.js` layered() 切边检测 + `check_cover.py`「cut edge in frame」FAIL（等另一 agent 的封面共享代码修复合入后再提交，避免冲突）。
- **没做 / 交接**（用户新定的 UI 标准，见统筹消息与 USER_PREFERENCES：一个数据驱动封面模板、常驻底部控制条、⚙ 设置、播放中切模式、像素级一致性检查）：这是全站重构，建议新 agent 接手。现有可复用件：`shell.js` 的虚拟时钟 / 暂停 / seek / 手 / 模式；影片章节在 `DEMO_DATA.anim.scenes`（Demo03 / 04 用 `anim.segments` 的 t0）；Demo28 / 29 没有 #steps，需要按关卡定义章节；对谈 23 / 41 / 42 + Demo43 还没加载 shell.js；Demo18 index.html 的 shell.js ?v 还是旧的（同一块里有别人的 cover.js ?v 改动）；nav.js ?v 未更新（kiosk agent 有未提交行）；thermal 分数还没跑（`python3 tools/qa/thermal_score.py --all`，约 30–60 分钟，2 个 Chrome）。
- **Demo12 / 20 封面**：已提交（统筹审过全尺寸），同样是整张画 + `tools/art/cover_plate.py`（通用版）。
- **UI 重构交接（新 agent 接手；用户最新决定）**：
  1. **先审样再铺开**：做一个 UI「样品页」（每个组件、3 种语言、手机 / 桌面）+ 一个「封面墙」页，用户批准后才改 Demo；上线前给一个预览网址。
  2. **一个封面模板（数据驱动）**：`demos/shared/cover.js` + css 只按每个 Demo 的一条 `cover` 数据（标题 / 副标题 ×3 语言、chips、选项行：对谈的地点 / 对象、Demo43 的地点 × 对象）+ 一张做好的 `cover_art.webp`（背景 + 人物已按 2b 数值合成，或整张画；`tools/art/cover_plate.py` 可直接出图）+ 焦点生成封面；所有 Demo 的 `drawCover()` 去掉。左：标题 + 副标题，右：人物，下面固定一行 ▶ 开始 · 模式（**默认互动**，纯聆听可选）· 语言。`media/cover.jpg` 和菜单缩略图由脚本用同一份数据 + 模板生成（`tools/web/thumbs.py`）。注意 fix2 的提醒：保留 `html.l10n-ready` 类和 series.css 的淡入；Demo10 首帧会先画旧的舞台图，模板必须保证 cover_art 之前不画任何旧封面源。
  3. **一个底部控制条，始终显示**（不自动隐藏；⚙ 里可选「隐藏控件」，默认关；全屏也显示）：▶/⏸ · 章节进度条 · 模式切换（播放中可切：纯→互动 = 下一个提示等用户，麦克风到那时才问、可拒绝；互动→纯 = 待答的提示短暂停顿后自动答）· 🔊 音量 · 🌡 开关 + 强度 · ⚙ · ⛶。字幕和选项按钮在控制条上方，不被遮挡。替换影片自带 transport 和舞台上的 🌐 / ⛶ / 🔊 / 字幕 / 减少动态按钮（手机上 ≥ 44 px）。
  4. ⚙ 设置：字幕开关 + 大小、减少动态、头部追踪（Beta，以后）、语言、设备连接、隐藏控件。状态统一：加载 → 封面 → 播放 → 暂停 → 结束（回自己的封面：再玩一次 / 换模式 / 结局图鉴）。侧边信息栏（雷达、温冷表）桌面可折叠，手机 / 平板默认折叠。一套图标、一套措辞、一套尺寸，3 种语言。
  5. **检查**：DOM 结构 + 固定尺寸截图对比（封面 / 控制条 / 设置 / 结束画面；只允许画面区和标题文字不同），有任何偏差就 FAIL；`check_shell.js` 对没有统一进度条的 Demo 也 FAIL。写进 §7.3（附示意图）+ 新 Demo 模板。
  6. **铺开顺序**：分层剧情 → 直播 → 影片（章节 = `DEMO_DATA.anim.scenes`，Demo03 / 04 用 `anim.segments`）→ 游戏（Demo28 / 29 按关卡补章节）→ 对谈 23 / 41 / 42（章节 = 开场 / 对谈 / 告别；`_kit/talk` 已有纯聆听自动回答）→ Demo43（统筹协调）。盘点表（`scratchpad/ui-shell/shell2_inventory.js` 可复用）证明全部一致后，**一次提交**把 `MoHeatShell.BAR_ENABLED` 改成 true，交统筹发布。
  7. **文件地图**：`demos/shared/shell.js`（时钟 / 暂停 / seek / 模式 / 手 / 进度条开关）、`cover.js`（fit / layered / 切边检测未提交）、`nav.js`（菜单排序、HEAT）、`subs.js`（语言）、`fullscreen.js` / `guide.js` / `thermocheck.js`（会被控制条取代的按钮）、`kiosk.js`（展会模式，基于 shell 的钩子：`MoHeatShell.pause / paused / chapter / seekTo / hand`、`MoHeatPlay.mode`、`moheat:playmode` 事件——改动时保持兼容）；工具 `tools/web/check_shell.js`（含 `--record`）、`check_cover.py`、`thumbs.py`、`bump.py --auto`、`tools/qa/thermal_score.py`、`tools/web/check_nav.py`、`tools/art/cover_plate.py`。
- **问题 / 教训**：① zsh 里 `for g in $G` 不按空格拆分，commit_mine 少带了一半文件（0df3c67 补上）——列表用数组或 Python 生成；② 游戏的帧步长被限制（dt ≤ 0.05），×16 快进时游戏状态比时钟慢，固定时长的长按 / 等待会卡住 → 「手」的 hold / wait 用游戏自身状态 `until` 结束；③ layered() 封面：姿势图上沿切边离眼睛太近时任何缩放都无法同时满足 2b 数值和「切边在画外」→ 用整张画 + outpaint。

## 2026-11-08（晚）· 素材检查结果修复（fix2，统筹分派）
- **Demo24 岳（标杆，FAIL → 0 FAIL）**：char_sit / log / coffee / imo / bye 的浅灰幕布毛边（边缘 40–57 %）→ 0 %，用新的 `python3 tools/art/clean_cutout.py <demo> --unmix --only …`（af36a9d）。
- **Demo12 蓮 / 21 仁 / 22 紫苑**：灰底残边 / 发缝灰块同法清掉（Demo22 毛巾不动：幕布和毛巾阴影同色）；Demo12 call / hug、Demo22 dryer 的直线切口通过移动人物移出画面；Demo25 椿 omikuji 的毛领切口是 stage.json `"erase"` 框太宽 → 只框签架，在临时副本里重建、只取 omikuji 的层（其他视图逐字节相同）。全部 0 美元。
- **Demo17 可可**：LivePortrait 嘴套按现在的默认参数重做（最小开口、口腔平涂）+ `build_stage --mouths-only`；check_patches OK，check_mouth OK。
- **Demo18**：断链 `assets/art/ref_hinata.png` 换成备份里的真文件；Demo18 / 25 / 30 的 `?v=` 过期（cache FAIL）一并修好。
- **工具**：clean_cutout（`--unmix`、`--only`，平面图按 fire 缩放 + stage.json 文件名）；check_art（直线切口：二值化 alpha、只跳过 2 px、按视图位置判断是否在画面内）。教训：指南 §11.1「抠图检查修好了一处、又藏住了另一处」。
- **剩下**：jin_jacket（Demo21）/ saku_breath_L（Demo30）的 blink WARN：放大 3–4 倍看过，闭眼下没有瞳孔（羽化 / 发丝半透明造成），没改；Demo22 毛巾的 fringe WARN；几处 edge-margin WARN（离画框 < 1.5 %）没在这次范围内。证据图：scratchpad `fix2/evidence/`。

## 2026-11-08（晚）· 统一外壳 + 封面标准：第 2–4 批 + 菜单缩略图（ui-shell）
- **完成**：直播间 14 / 17 / 18 / 24（2d40842）、影片 01–09（119a6c0：章节标记合进时间轴、影片结束回封面、纯聆听不开麦）、故事封面 Demo10 狐狸 / Demo26 直美（164860f，现有抠图合成，OpenAI 0 美元）、Demo28 / 29 接入外壳；Ren / Hinata / Shion / Gaku 的封面用 `MoHeatCover.layered()`（空场景 + 姿势抠图）达标；全站菜单缩略图 + media/cover.jpg 重新生成（`tools/web/thumbs.py --base`，Demo04 除外）；check_cover：没有角色 / 生物脸的封面 = FAIL；check_demo release：缩略图比封面旧 = FAIL。
- **没做 / 下一步**：① 游戏 Demo10 / 11 / 13 / 15 / 16 / 26 的纯聆听会卡住（抚摸、吹气、找东西这类玩法要每个游戏写一个 `MoHeatShell.autoplay` 钩子），所以这几个暂时**没有**加载 shell.js（仍是旧封面按钮）；② 对谈 23 / 41 / 42（听众回合自动跳过）和 Demo43；③ 菜单顺序（nav.js 加 series / cast / part + 自动排序，"推荐先体验"用 check_demo --full 写的 tools/qa/thermal_scores.json）；④ 结局图鉴、音量记忆、`_kit/style.js` 接进外壳和封面配色；⑤ Demo13 封面（WebGL 摄像头画面：要在摄像头启动前画一张直美贴近镜头的合成封面）；⑥ check_mobile.html 测新按钮。
- **测试**：`node tools/web/check_shell.js <demo>`（纯聆听零输入走完、不请求麦克风、← / → 只在封面、空格暂停、章节跳转）；`python3 tools/web/check_cover.py --all --sheet x.jpg`。

## 2026-11-08 · Demo43 白嶺の峠：もっと話す = 地点 × 对象 + 多人同框口型 · 后台 agent "d43b"（统筹分派）

**做了什么**
- もっと話す 从「选人」扩成**地点 × 对象**（同 Demo23）：吹雪の峠 / 宿・火鍋 / 女医の部屋 / 夜の戸口 / 夜明けの峠 × ミント / ひなた / 渚 / 三人 = 20 种。
  数据在 `demos/for-men/Demo43_BlizzardInn/scripts/script_data.py` `PLACES`（每个对象的 beats、`'@事件'`、场地话题 + 每人一句场地过渡句）；故事台词复用（tm / th / tn / tt），新台词 59 句、ElevenLabs 2,241 字（确认过的声音）。
  冷热按场地（`main.js` `PLACE_AMB` + `EVENTS`：渚挡左边的风、ミント双手捂右耳、温石贴右脸、汤碗、加炭、艾灸 → 薄荷膏、门被风撞开 / 披外褂 / 顶门、太阳出山）。
  纯聆听模式（`MoHeatPlay.pure`，测试 `?sample`）：结局后自动放一段三人示范（信物主人的场地：开场 → 一次沉默 → 告别），再回封面。
- 私密实时版：`live/live.js` `begin({ place, cast })`，prompt 只写这个场地、只放选中的人、这个场地能触发的冷热事件 `@|key`；`node demos/for-men/Demo43_BlizzardInn/scripts/live_prompt.mjs all` 免费检查 20 种 prompt（没有跑付费长对话）。
- 多人同框（共用）：`tools/art/build_stage.py` 视图 `"who"` + `"more"`（+ `"small"` 小平面图）、`demos/shared/layers.js` 每人一层（各自 LivePortrait 嘴型组、眨眼、呼吸相位），`hooks.who` 让只有说话的人动嘴（单人视图也一样，画外的人说话时画面里的人不动嘴）；一张背景板一个纹理。旧 Demo 不变（Demo31 check_mouth / check_motion 回归通过）。
  `tools/art/check_mouth.js` 新增 WRONG-MOUTH / FIG-NO-MOVE 和 `--query=`，`check_patches.py` 检查每个角色。Demo43 新增 21 个地点 × 对象视图（0 美元，用已有图层拼）。黎明三人 h09 / m11 / n17 现在三人各自动嘴。
- `shared/layers.js?v=` 改成内容指纹 f71de857（14 个分层页面，只改那一行）。README、`docs/engine/crossover_standard_draft.md`（§1、§4、§4.1、§8、§10）、指南 §11.1 一条。

**状态**：check_mouth 故事 / 对话（hall、pass × 三人）/ 纯聆听示范都 ✓；check_demo --full 结果见 README QA 段。预算：OpenAI 0 美元新增（Demo43 仍约 $7.3），ElevenLabs +2,241 字。

**下一步**：UI 外壳 agent 给 Demo43 接 `shared/shell.js` 后，跑 `node tools/web/check_shell.js demos/for-men/Demo43_BlizzardInn`，确认纯聆听示范和章节条兼容；实时版有密码时可用 `scripts/live_smoke.mjs` 跑一次地点 × 对象（花 credits，需批准）。

**问题**：`commit_mine.py --hunks` 会把同一个 diff hunk 里别人相邻的改动一起带走（898e5bd 带上了另一会话在指南 ひなた刘海条目上的一处改动）——工作区没受影响，但以后改共用文档要离别人的改动远一点，或先 `--dry` 看清。

## 2026-11-08 · 流程标准 → 门禁和工具（素材标准 14 条、提效标准 13 条、成品要求、造型、类别风格卡）· 后台 agent "workflow"（统筹分派）

**做了什么**（每项一个提交，`git log --oneline` 搜 "commit_mine" 之后）：
- **Demo23 / 41 / 42 的 `banquet_bg` 404 是误报**：`_kit/talk/scenes.js` 用 `ART + 'banquet_bg.webp'`，headless Chrome 实测三页所有场景图 200。`check_demo.py` 的 files 扫描现在解析同文件的前缀常量；全站 files 0 FAIL。
- **工具**：`tools/git/commit_mine.py`（只提交自己的路径 / hunk / patch，本次所有提交都用它）、`tools/git/claim.py` + `docs/CLAIMS.md`（认领表、scratch 前缀）、`.github/workflows/qa.yml` + `tools/qa/ci_report.py`（推送自动检查，只提示）、`bump.py --auto / --check`（内容哈希 ?v）、`tools/report/balances.py --budget / --demo`（每 Demo OpenAI 估算，80 % 预警；images.py / extend_pose.py 重跑留 `prior_usage`）、`tools/qa/changed.py`（按改动派测试）、`tools/art/check_art.py`（edges / fringe / blink / far-motion / looks → check_demo G4）、`tools/art/prompts/`（6 个模板 + fill.py）、`docs/characters/`（20 张角色卡）、`tools/library/index.py` → `docs/library.md`、`tools/art/style_card.py`（各类别 `_kit/style.json` / `STYLE.md` / `style.js` + `style_family.jpg` 全家福 + check_demo G7 style）、`tools/qa/SCRIPT_TEMPLATE.md`（世界规则卡、镜头表含 look 列、冷热表）、`tools/README.md`（全部工具一张表）。
- **指南**：§0.1 成品要求（含魔法世界 6 条）；§5.1 类别风格卡；§6 G1 / G3 / G4 / G6 / G7 / G8 门禁更新（剧本 + 镜头表 + 冷热表审过才出图；先 1 个完整画面打样再批量）；§6.5 素材标准 S1–S15；§6.6 效率工具 + 多会话规则（认领、scratch 前缀、用量上限前先存进度）；§7.2 自动 ?v；§14；§11.1 两条教训。

**新检查报出的问题（交给各自的会话 / 统筹）**：
- Demo24 Gaku：`char_sit / log / coffee / imo / bye` 抠图边缘有一圈浅灰（灰幕 #c8c8c8 残色，40–57 % 的边缘像素）→ fringe FAIL；要 `clean_cutout.py` 或换绿幕重抠。
- Demo12 / 21 / 22（灰幕）边缘残色 WARN；Demo21 jin_jacket、Demo30 saku_breath_L 闭眼下瞳孔半遮 WARN；Demo25 omikuji、Demo12 call / hug 直线切口 WARN。
- Demo25：OpenAI 估算 $8.5（85 %）→ 预警。
- 全站 37 处 `?v=` 落后（多为 `nav.js?v=42` vs 43，UI 外壳会话进行中）：`python3 tools/web/bump.py --check`。
- 风格漂移 WARN：Demo04 封面、Demo20 hina_booth、Demo29 visit_yard（看 `_kit/style_family.jpg`）。
- `Demo18_HinataStream/assets/art/ref_hinata.png` 是断开的符号链接（指向已删除的 Demo14 文件）。

**下一步**：UI 外壳会话把 `_kit/style.js`（`window.MOHEAT_STYLE`）接进封面 / 外壳；新 Demo 用 `SCRIPT_TEMPLATE.md` + `fill.py`；check_art 的 looks 是粗查（颜色），以 `poses_preview.jpg` 为准；角色卡里 Cocoa / Mint / Luna 姓氏读音是猜的，需要确认。CI 第一次推送后看 Actions 页的运行摘要。

---

## 2026-11-08 · 嘴型统一改用 LivePortrait 嘴套组（12 个分层 Demo）· 后台 agent（统筹分派）

**问题**（用户）：很多 Demo 说话时，闭嘴的线到张嘴永远对不上——闭嘴和张嘴是两张分别画的图，嘴角和形状不同，换贴片时会跳；遮罩、对位只能减轻。

**做了什么**
- 新工具 `tools/art/lp_mouths.py`（用 `~/ml/LivePortrait/.venv/bin/python` 运行，每个姿势约 10 秒，不花钱）：从姿势自己的图变形出 3 档张嘴，只取几何；没变的地方还原底图像素，口腔平涂并按皮肤受光调色；闭嘴 = 底图原像素；所有档一个矩形一个羽化（统筹 / 用户的「嘴部模块整块替换」）。`--sheet` 出 2 倍对照图 `assets/lp_mouths/<pose>_sheet.jpg`。选项：`"lp": {"lips", "minh", "light", "pad", "centre"/"radius"}`。
- `tools/art/build_stage.py`：`"mouth": "lp"` → `mouth_lv` 贴片（level 0..3）；新 `--mouths-only`（只换嘴套，其他层不动）；源图改过就拒绝旧嘴套。`tools/animate/lp_pose.py`：`Puppet(share=…)` 共用模型、`frame(raw=True)`。
- `demos/shared/layers.js`（?v=8）：每次只画套组里的一块；档位按「当前音量 ÷ 说话时平均音量」选（> 1.1 第 2 档，> 2.1 第 3 档）。`check_patches.py` / `check_mouth.js` 认识 `mouth_lv`，`check_mouth` 打印各档比例。
- 逐个上线（每个 Demo 单独提交）：Demo17 4fa757e、Demo18 e1bbce8、Demo19 27a296d、Demo14 81d3f75、Demo12 b09bfed、Demo24 df3e9c2、Demo20 14bd50c、Demo30 a1b8388、Demo25 ab80c80、Demo21 9fff061、Demo22 66d3acd、Demo31 71509fb。全部 check_patches 0 报告；check_mouth（有 ?auto）或 tools/qa/drive_story.js（Demo12/20/21/22）0 问题、结束回到自己的封面。
- 保留旧差分的姿势：Demo18 wave / race（露齿咧嘴）、Demo25 pray（近侧脸低头）、Demo21 wrist（开口落在鼻影）、Demo20 hands（手指挡嘴）、Demo30 breath（侧脸）、Demo31 laugh（大笑本身是看点）。
- Demo18：`tools/art/clean_cutout.py --bg 6,162,73`；新工具 `tools/art/recolor_rim.py` 把原图里画好的青色霓虹边缘光在 booth（白色环形灯）/ street（自动售货机冷白光）改成该场景的光，其他画面保留（统筹决定），d8551c9。

**现在的状态**：以上都已本地提交，统筹负责 push。

**下一步 / 遗留**
- Demo17 是第一个做的，用的是较早的参数（没有 `minh` / 口腔调色）；想统一可以重跑 `lp_mouths.py demos/for-men/Demo17_CocoaStream --sheet` + `build_stage.py --mouths-only`。
- 新 Demo 合成时直接给姿势写 `"mouth": "lp"`（guide §6 第 5 步 ④）。
- 3d3e602 的提交说明写错了（实际是 Demo43 的内容，原因见 guide §11.1），09ba937 是更正说明。

**遇到的问题**（详见 `DEMO_DESIGN_GUIDE.md` §11.1）：LivePortrait 渲染偏软、画照片牙齿；某些动画脸只张开一条缝；口腔颜色在男性脸上像口红；最宽档用得太多；完整重建冲掉精修过的层；scratchpad 脚本被另一个 agent 覆盖导致错误提交。

---

## 2026-11-08 · 封面构图标准 + 统一外壳（shell）第 1 批
- **做了什么**：① 封面标准 `demos/shared/cover.js`（文字左 / 人物右、脸高 27 %、眼睛 (72 %, 30 %)、压暗、手机竖屏版）+ 检查 `tools/web/check_cover.py`（SCRFD + isnet-anime 量脸，`--all --sheet` 对照表）+ check_demo G7 `cover`；30 个 Demo 已上标准（提交 d914e15、832f5b2）。② 统一外壳 `demos/shared/shell.js`：纯聆听（默认）/ 互动、章节进度条可跳转（×16 静音快进）、空格 / 点画面暂停（冻结时钟 + 音频 + 设备）、冷热开关、设置记忆、字幕大小、减少动态、加载遮罩、错误提示、← / → 只在封面；`tools/web/check_shell.js` + check_demo G6 `shell`。第 1 批（分层剧情）：Demo12 / 20 / 21 / 22 / 25 / 31 / 19 / 30 已加 shell。实测 Demo30、Demo31：纯聆听零输入约 2 分钟走完、无麦克风、暂停冻结、章节前后跳转都成功。规则写进指南 §7.3「2b / 2c」。
- **状态 / 下一步**：等统筹看过第 1 批截图后继续：直播间（14 / 17 / 18 / 24）→ 影片 1–9（已有 transport，章节进度条要和 scrub 合并）→ 游戏（11 / 13 / 26 / 10 / 28 / 15 / 16 / 29：纯聆听要能自动演示）→ 对谈（23 / 41 / 42）→ Demo43。之后：菜单顺序（nav.js DEMOS 加 series / cast / part + 自动排序、"推荐先体验" 按 check_demo --full 的冷热得分自动选）、结局图鉴（1/2）、结束画面切换模式。
- **未达标的封面**：Demo12 / 20 脸高 34–36 %、Demo22 脸 42 % 眼睛 16 %（原图太近，需要更宽的封面图，可用 OpenAI 扩图，预算 ≤ 3 美元）；Demo13（WebGL 摄像头画面，猫脸 18 %、眼睛 40 %）。直播间 14 / 17 / 18 / 24 和 Demo43 还没上封面标准。
- **问题**：会话中途重启，scratchpad 被清空（对照表要重跑）；临时索引提交后要把共享索引里自己的路径同步到新 HEAD，否则 `git status` 显示成"已暂存的回退"。

## 2026-11-08 · 信长系列共用素材补全：I_ear / I_bust / N_bust / N_ear 的直线切口 · 后台 agent（本地提交未推送）

**发现的瑕疵**（无头 Chrome 渲染真实画面：对话 Demo 按 `_kit/talk/main.js` 的 frame() / drawChar() / drawCover() 几何在 4 个地点底图上逐位置渲染，电影 Demo05–09 用 `?t=` 静帧）
- **家康贴耳特写 I_ear / I_ear_smile**：右边（肩膀）和下边是直线切口。Demo23 / 41 / 42 的 left_ear / right_ear 把切口放在画面 40–60 % 处——身体在半空被一条竖线切断（最明显）。电影里 I_ear 的切口在画外。
- **I_bust_\***：下摆停在图片底边上方 76 px，对话封面 / seat 位置膝下露出 1–2 % 的地板，电影的胸像露出最多约 50 px（坐着的人悬空）。N_bust 少（20 px），电影里笑的时候会露。
- **N_ear**：下边直线切口，只差 0.4 % 就进画面（贴耳 + 大声说话的上下晃动）。
- 全身姿势（pose_*）、道具没有问题；嘴 / 眨眼 / 表情差分和底图对齐（只脸部不同）。

**做了什么**
- 新工具 `tools/art/complete_cutout.py`：已抠好的 RGBA 素材组补全——只让 `--zone` 里的透明像素 + `--redo` 切口带被 gpt-image-2 遮罩编辑重画，品红幕布、对位（窗口内缩放 + 平移，误差 > 10 拒绝写入）、抠色；其他像素一个不变，所有差分得到完全相同的新像素；原图备份在 `~/Desktop/MoHeat Evo 备份/complete_cutout/<时间>/`。
- I_ear×2：画布 1024→1536 宽（两边各加 256 px，居中绘制的对话页面位置不变），补出远侧肩膀和袖子、闭合轮廓，补到底边；`_kit/art/faces.json` 和 Demo05–09 `media/data.js` 的 I_ear.cx 462→718（电影按 cx 定位，画面位置不变）。
- I_bust×10、N_bust×10、N_ear×2：裤裙 / 袍子一直画到图片底边（尺寸不变）。
- `tools/art/check_cut_body.py`：没有 layers.js 的 Demo 也检查类别 `_kit/art` 的胸像 / 贴耳图（身体到达底边、没有长直线切口）→ check_demo 的 cut-body 现在会抓到这类问题。`tools/art/README.md`、`_kit/README.md`、指南 §11.1（合并进「人物身体只有半截」条）、USER_PREFERENCES。
- 命令（重跑 `Demo09/scripts/prepare_art.py` 后需要再补一次，`--reraw` 用保存的答案不花钱，答案在会话草稿目录，丢了就重新调用）：
  `complete_cutout.py I_ear.webp --variants I_ear_smile.webp --pad 256,0,256,0 --zone=900,600,1280,1536 --zone=-256,1360,1280,1536 --zone=-256,960,60,1536 --redo=975,700,1024,1536 --redo=0,1375,1024,1536 --redo=0,980,45,1536`；
  胸像：`--pad 0,0,0,448 --trim 0,0,0,448 --zone=0,1380,1024,1984 --redo=0,1420,1024,1536 --window=0,1000,1024,1984 --scale 1.5`（N_bust zone 从 1440、redo 从 1490）；N_ear：`--zone=0,1380,1024,1984 --redo=0,1470,1024,1536 --redo=880,1380,1024,1536 --window=0,1150,1024,1984 --quality medium --max-err 12`。

**检查**：渲染后 2 倍看：贴耳左右、两人同框、封面、seat / near / left / right / window、电影 5 部的胸像 / 贴耳 / 笑——没有切口、接缝、光晕、底边空隙；差分和底图只在脸部不同；check_cut_body 0；`check_deps.py` PASS；`check_demo.py --quick` 8 个 Demo 的 cut-body 都 PASS（其余 FAIL 是原来就有的：nav.js ?v、结束画面、talk 的 voice.js / 静态扫描 banquet_bg，与本次无关）。

**花费**：OpenAI gpt-image-2 7 次（2 次胸像被模型整个重画小、1 次 N_ear 同样，均被拒绝没写入），输出约 5.8 万 image tokens ≈ $2.4。

**没做 / 下一步**
- 页面里素材 URL 没有 `?v=`，GitHub Pages 缓存最多约 10 分钟内可能新旧混用（I_ear 新宽度 + 旧 cx）；`data.js?v=1` 没有加号（各 index.html 有别的会话未提交的改动）。需要的话由统筹用 `tools/web/bump.py` 统一加。
- 电影的 MP4（若有导出）是旧素材渲染的，页面是实时 canvas 不受影响；要更新 MP4 需重跑各 Demo 的 render_mp4。
- N_ear 右下角（y > 1380，画面外）有一个袍角折点，可接受。

## 2026-11-08 · 细节修正：闭眼重影 / 抠图缺口 / 嘴 / Demo18 页面动画 / 仁"不动" / 椿 close + stole · 后台 agent（统筹会话审查，本地提交未推送）

**做了什么（提交 40faf50、805bb72、c4c6002、af73c6e、f051f4c）**
- **闭眼发灰 / 透出瞳孔**（Demo17 全部、Demo25、Demo18 booth、Demo20 lean）：差分图本身是干净的，原因是 `tools/art/face_patches.py` 眼睛贴片羽化太软（0.3），睁眼的瞳孔在半透明那圈透出来；`regions_eyes` 又比实际眼睛小 / 偏。→ 眼睛（和新的 `mouth_quiet`）贴片改硬边（0.12），`regions_eyes` 按原图和闭眼图的差异范围重新量。没花钱。
- **结束后封面全黑**（Demo17 / 18 / 25 / 31）：`finish()` 里补 `S.fade = 0; S.fadeA = 0;`，`?auto=1` 跑完封面亮度 52–95。
- **Demo18**：drawView 用 `LIVE()` 去掉分层画面上的页面漂移；抓娃娃机的爪子 / 玩偶经 `bgToCanvas()`（`MoHeatLayers.toFrame('hinata_crane', …, 'bg')` × 页面缩放）画，视差时贴住机台；罐子热气减速、扩散、随风、渐隐。爪子 v9 行为不变。`main.js?v=10`。
- **Demo24 log**：矩形 `erase` 切掉手和木柴的一角 → `scripts/clean_log.py` 沿轮廓把火涂成底色（`gaku_log_clean.png`）；left 眼睛区域写死。
- **Demo31**：popsicle 的 `keep` 框缩到"你"的手里（灰色底板消失）；`clean_cutout` 重跑（毛边）；shoulder 加张嘴 + 闭眼差分；laugh / whisper（画成张嘴）加闭嘴差分 → `build_stage.py` 新的 `"quiet"` → 贴片 `mouth_quiet`；fan / sit 嘴椭圆缩小（OUTSIDE 1.3 % → 0）；arrive 高度 1.05（头顶平切）。`scripts/face_variants.py`（宽于 16:9 的姿势用 2560 窗口编辑再贴回）。
- **Demo20** booth / wave 高度 1.05（头顶平切）。**Demo22** dryer / window：`scripts/fill_hair_pockets.py` 填"你的头发"之间的暗洞、清掉眼镜片里剩下的灰；towel：抠图把盖在画面上沿的毛巾丢了（手臂在半空断开）→ 同一脚本从原图把毛巾放回。
- **Demo21 仁"不动"**：在线上网址用无头 Chrome 查过，分层画面每帧都在画、嘴跟声音、呼吸 15 / 分——不是坏了，是太安静：原来 16 段 Seedance 视频换成静帧后，开场 lounge（远景）只有很小的嘴和 6 px 呼吸，lounge / whisper / glasses 也没有眨眼。→ lounge、whisper 加闭眼差分（`scripts/blink_variants.py`），glasses 眼睛在墨镜后不加。drive_story en 0 问题。
- **Demo25 椿**：close——为去掉"你"的头用的矩形 erase 连外套肩膀也切掉一块 → `scripts/clean_close.py` 只沿轮廓去掉头和脖子 + 遮罩编辑补发梢（`tsubaki_close_hair`）；stole——她抱着的是一团看不出是人的白毛 → 遮罩重画成"你"的深色外套肩膀（与 close 同一件）、围巾搭在你肩上、她的手放在外套上；新张嘴 / 闭眼差分。
- 指南 §11.1：闭眼发灰的真正原因、矩形 erase 的坑、mouth_quiet。

**检查**：check_patches / check_cut_body 全部通过；check_motion（17 / 18 / 20 / 24 / 25 / 31）眨眼 0.11–0.15 s、呼吸 15 / 分；drive_story Demo21（zh + en）、Demo31（en，含 whisper 的 mouth_quiet）跑完 0 问题；check_demo --quick：17 / 18 / 20 / 22 / 24 / 25 / 31 都是 0 FAIL。

**花费（OpenAI gpt-image-2）**：Demo31 3 张 high + 1 张 medium；Demo21 3 张 high（lounge 第一次眼睛位置量错，重画 1 次）；Demo25 4 张 high。约 $2–3。

**没做 / 下一步**
- **Demo18 头发边缘的青色描边**（绿幕溢色）：LivePortrait 嘴部会话正在改 Demo18 的 `media/layers.js` / `stage.json`（未提交的 `*_mouth0-3.webp`），我没动。做法：那个会话提交后跑 `python3 tools/art/clean_cutout.py demos/for-men/Demo18_HinataStream --bg 6,162,73`（边缘像素从里面的颜色重新上色），再 2 倍看切镜头时她的左边缘。
- Demo24 gaku_coffee、Demo20 hina_hands 还有极限视差时的 EDGE-GAP（小，之前就有）。
- Demo25 OpenAI 总用量接近 $10 上限（`project/openai_log.json` 36 次）。

---

## 2026-11-08 · 手机全屏 → 提示横屏 · 后台 agent（统筹会话安排）

**做了什么**（用户：「手机上点全屏时自动提示横屏，让用户把手机横过来」；iPhone 上也显示转动动画 +「请把手机横过来，体验更好」）
- `demos/shared/fullscreen.js`（?v=4）：触屏且屏幕短边 ≤ 600 px 算手机。点 ⛶ → 进入全屏（iPhone 没有 Fullscreen API，用原来的铺满窗口模式）→ 试 `screen.orientation.lock('landscape')`（失败就忽略）→ 还竖着就盖一层卡片（转动的手机动画、当前显示语言的文字，字符串在 `ROT`，已写 en / ja / zh / ko），横过来自动消失，竖回去再出现；「继续竖屏观看」关掉后本次全屏不再出现。全屏画面在安全区内取最大 16:9；退出时解锁方向。不暂停、不重载，桌面不变。
- `demos/shared/guide.js`（?v=6）：⛶ 那一步加了手机横屏的说明。
- `tools/web/check_mobile.html`：手机尺寸（短边 ≤ 600）新增全屏检查（`?fs=0` 跳过）；iframe 不是真手机，用 `MoHeatFullscreen.testPhone = true`。
- `DEMO_DESIGN_GUIDE.md` §7.1 加规则，`USER_PREFERENCES.md` 加偏好（那一行被 49daf09 一起提交了，内容没问题）。

**测试**（自己的 http.server + headless Chrome，390×844 ↔ 844×390，模拟触屏和方向变化）：Demo24 / Demo31（分层）、Demo17（直播间）、Demo01（影片）、Demo11、Demo23：卡片出现、语言正确（en / ja / zh）、横过来消失、画面 693×390（16:9 占满高度）、⤡ 点得到、无页面滚动、canvas 没有重建、Demo01 的 video 时间继续走、竖回去卡片再现、「继续竖屏」生效、退出恢复；桌面 1440×900 没有卡片。`check_mobile.html?only=Demo24,Demo17,Demo01,Demo23&sizes=390x844,844x390,1440x900&guide=0` 0 问题。

**没测到（要真机）**：headless 里 `orientation.lock` 不可用（locked 一直 false），Android 真锁定没测过；iPhone Safari 没测过（铺满窗口 + 转屏 + 地址栏 + 刘海安全区）；手机系统旋转锁打开时的提示是否够清楚。

**问题**：`shared/voice.js` 的 `place()` 在 `pill.parentNode` 为 null 时抛 getComputedStyle TypeError（Demo24 不进全屏 8 秒内 42 次，Demo17 / Demo11 也有），不是本次改动造成的，未修，需要有人处理。

**下一步**：真机确认上面三项；全部 Demo 跑一遍 `check_mobile.html`（本次只跑了 4 个）。

## 2026-11-08 · 引擎 P0 + P1：Demo 之间零依赖（方案 B）· 后台 agent

**做了什么**
- P0 工具：`tools/qa/check_deps.py`（全站依赖矩阵，`--fail` 给 pre-commit 用）、`tools/qa/trace_demo.js`（固定种子录字幕 / `#cmd` / 按钮 / 文件 / 截图，`--diff` 对比，`--root` 对比镜像目录）；`check_demo.py` 的 refs 用同一份扫描，现在是 FAIL 级，`qa.json` 的 `allow_foreign` 已取消。
- P1 搬动（新增 `demos/<品类>/_kit/`，各有 README）：`for-women/_kit/base.css`（Demo20）；`healing/_kit/phone.css`（Demo15 / 16）、`healing/_kit/familycall/`（Demo15 / 16 整套，去掉 `<base>`）、`healing/_kit/naomi/`（Demo11 / 13 / 26）；`all-ages/_kit/snowfox/art/`（Demo01 / 28）；`nobunaga-suntory/_kit/art/`（原 Demo09 的 art）、`_kit/places/`（4 张共用背景）、`_kit/talk/`（Demo23 / 41 / 42 的代码、文本、13 MB 配音，去掉 `<base>`）。
- 删掉 Demo24 指向 Demo12 的 `#nextBtn`；Demo15「第 2 话」的地址改从 `nav.js` 的 › 按钮读取。
- 规则改写：CLAUDE.md、AGENTS.md、指南第 5 条 / §10 / §12.1 / §14，§11.1 加两条教训。状态表和待办：`docs/engine/MIGRATION.md`。

**现在的状态**
- `python3 tools/qa/check_deps.py --fail`：0 违规，34 / 34 个 Demo 文件夹。构建脚本里还有 56 处 B 引用（P4）。
- 17 个改过的页面 `check_mobile` 7 种尺寸全过；trace 前后一致，例外见下；`tools/talk/server.py` 的 3 条 live 路由和全部脚本 / 样式 200。

**下一步**
- 封面会话：`demos/healing/_kit/familycall/main.js`、`demos/nobunaga-suntory/_kit/talk/main.js` 上的 drawCover 改动还没提交，要在新路径提交。
- `live/` 按 Demo 拆分：等对话服务器会话提交 `tools/talk/`（路由在它的 `demos.json`）。
- P2：引擎核心 + 试点（Demo31 或 Demo25）；教 `tools/l10n/check_missing.js` 读 kit（薄页面现在扫不到内容）。
- pre-commit 钩子只是提案，没有安装（文本在 MIGRATION.md）。

**遇到的问题**
- trace 没能完整覆盖的：Demo24 前后对比时机器负载 200–550，结果作废，只有改动后的一次运行（0 错误）加代码核对（`nextBtn` 已无引用）；Demo15 的 trace 停在「ヒーター」按钮，只覆盖到开场（同一份代码由 Demo16 的 trace 覆盖）；Demo28 和对话类的随机分支两次运行会不同。
- Xcode 许可证未同意时 `/usr/bin/git`、`python3` 不能用，改用 `/Library/Developer/CommandLineTools/usr/bin/` 下的。

---

## 2026-11-08 · 手机上的拖动 / 抚摸手势修复（shared/gesture.js）· 后台 agent

**用户原话**：手机 / 触屏上很难做抚摸动作，网页会跟着手指移动。
**原因**：`demos/shared/game.css` 的 `.stage` 是 `touch-action: manipulation`（允许平移），手指一拖，浏览器把手势当滚动接管，发 `pointercancel`，Demo 只收到开头几个 pointermove。
**做了什么**：
- 新文件 `demos/shared/gesture.js`（`window.MoHeatGesture`，nav.js 自动加载，`?embed` / `?cover` / `?render` 不生效）：每个 `.stage` + `#timelineWrap` 自动 `touch-action: none`、禁选字 / 长按菜单 / 拖图，`html, body` `overscroll-behavior: none`，非 passive `touchmove` 拦截，iOS `gesturestart` 拦截，手指按下时锁页面，屏幕左右 20 px 边缘起手的触摸在 touchstart 取消。API：`guard` / `drag`（Pointer Events + capture）/ `stroke`（距离 + 来回累加）/ `hint`（👆↔ 三语提示）。规则见 `DEMO_DESIGN_GUIDE.md` §7.1「拖动手势」，教训见 §11.1 G5。
- Demo11：头 / 肚子上显示 👆↔ 提示（第一下抚摸后消失），手指按住不动 0.8 s 也慢慢算（备用）。Demo13：抚摸那一步手机上隐藏 dock（两行按钮盖住了下半画面）。
- QA：`tools/qa/page_probe.js` 加 drag 探测（`--no-drag` 跳过，`--block-gesture` 看修复前），`tools/qa/check_demo.py` 加 `drag` 行。
**状态**：33 个 Demo 的 drag 探测全过（390×844 / 844×390：0 pointercancel、60 个 pointermove、不滚动 / 不缩放、真实点按 Start 有效）；修复前 Demo11 同样的手势是 3 次 pointercancel、4 个 move。Demo11 / 13 的 check_mobile 7 种尺寸通过。提交在本地，未 push（统筹会话负责）。
**下一步**：真机确认 iOS 边缘右滑返回（系统手势，网页只能尽量拦）、iOS 回弹、Android 下拉刷新、长按放大镜；Demo12/22 这类只点 / 瞄准的不用改。
**问题**：`/usr/bin/git`、`python3` 因 Xcode 许可失败时用 `/Library/Developer/CommandLineTools/usr/bin/` 下的；多会话时 headless Chrome 启动慢，page_probe 等待改成 40 s。

---

## 2026-11-08 · 穿越篇试点：Demo43 白嶺の峠、ひと晩の宿（男性向 · 架空东方 · 风雪客栈）+ 共用对话引擎 · 后台 agent

**做了什么**
- 新 Demo `demos/for-men/Demo43_BlizzardInn/`（方案 `docs/proposals/2026-11-08_crossover.md` M1-East）：渚（女镖师）/ ひなた（客栈小老板娘）/ ミント（游方女医）三位特别版，5 段 ≈ 2:40 + 3 个自由对话窗口 + 三选一信物结局（3 个结局）+ 结束后「もっと話す」（选人）。每人 2 个造型选一（`project/designs_contact.jpg`；选 ミント B、ひなた A、渚 B），`project/face_compare.jpg` 和原角色并排。
- 分层标准出图（Seedance 探测 429 → OpenAI gpt-image-2，共 30 次调用 ≈ $7.3，0 Seedance credits）；ElevenLabs 3,814 字（105 句，mint / hinata_s / nagisa 原声）。
- **共用对话引擎抽出**：`demos/shared/talk.js`（话题判定、过渡句、一轮语音 / 打字输入、实时 agent 客户端）+ `tools/talk/server.py`（所有实时 Demo 共用一个私密服务器，注册表 `tools/talk/demos.json`）。Demo23 的 `server.py` 变成运行它的薄壳，`live/live.js` 改用共用客户端（Demo23 / 41 / 42 路由、登录、status 实测正常）。Demo43 私密实时版入口 `/live/inn`；文字 agent 冒烟测试 `scripts/live_smoke.mjs`（3 轮，无 TTS）通过。
- 封面按新的 §7.3 封面标准（`shared/cover.js`，`scripts/make_trio.py` 排三人，`tools/web/check_cover.py` PASS）。菜单、官网、credits、三语缩略图都加了；交付表见下一步。

**现在的状态**：本地已提交（未 push，由统筹会话 push）。`check_demo.py` 见最终报告；`?auto` 两条分支通关，三语语音判定测过。

**下一步**：统筹审查；通过后按 TASKS #47 做 ② 魔法学院（复用 `scripts/script_data.py` 这套数据结构和 talk.js）。

**问题**（详见 §11.1）：实时回复在下一轮重复（已修）；thermal 快速切换要从"只热"切到"只冷"（已重排艾灸段）；thumbs.py 需要 8765 服务器；`xcode-select` 被切到未接受许可的 Xcode，`/usr/bin/git`、`python3` 报错（临时用 `DEVELOPER_DIR=/Library/Developer/CommandLineTools`，需要用户 `sudo xcodebuild -license accept`）；语音判定：英文长句里碰巧有 "he"+"el" 这样的字母对时，短选项「Help me」会被误判（`shared/voice.js` 的字母对匹配，影响所有 Demo，未改）。

---

## 2026-11-08 · 女性向重制收尾：莲 / 仁 / 紫苑 合并上线（Demo33→12、Demo34→21、Demo35→22）· 后台 agent（接 moheat-evo-24 的交接）

**做了什么**
- 三个暂存文件夹按交接清单逐个验收后用 `tools/web/merge_remake.py … --force` 并回原文件夹（同一网址），原版备份：`~/Desktop/MoHeat Evo 备份/for-women/Demo12_LateCall_20261108-1521/`、`Demo21_JinLounge_20261108-1533/`、`Demo22_ShionRain_20261108-1543/`。剧本、配音、冷热代码不变（各 `main.js` 只把静帧的 `?v=` 加 1，页面 `main.js?v=` 加 1）。暂存文件夹已删除。
- 验收中发现并修好的（交接时以为 OK 的）：
  - **眨眼没闭上**：莲 door、紫苑 dryer 写死的 `regions_eyes` 比眼睛高约 100 px；仁 can 自动搜索只闭了半只眼 → 在坐标网格并排图上重新量，写死在 `project/stage.json`。
  - **莲 close 张嘴时闭嘴线尾巴透出来**：`regions_mouth` 加大并往线的方向挪。
  - **头发被图片上边切成平线、挂在画面顶下 2 %**（莲 call/door、仁 lounge、紫苑 door/dryer/window）→ `height` 加 0.04；莲 call 右移到 x 0.71、仁 lounge 右移到 x 0.51（封面标题不压脸）；紫苑 door 放大到 1.12（举起的手上边那段抠得很碎，移到画外）。
  - **人物层里被包住的灰底 / 马尾后的暗灰光晕** → 新工具 `tools/art/clear_pockets.py`（莲 call/close、仁 lounge/glasses/wrist、紫苑 dryer/window --tol 30）。
  - 合并后的 `index.html` 带回了旧的 `series.css?v=8` → 改回 HEAD 的 9（教训见下）。
- 新 / 改的工具：`tools/qa/drive_story.js`（没有 `?auto` 的旧 Demo 按按钮自动通关 + 嘴部检查 + 404 / 报错 / 漏翻 / 回到自己封面 + 每个画面张嘴 / 闭嘴 / 眨眼截图）、`tools/art/clear_pockets.py`、`tools/art/check_cut_body.py` 增加**上边**检查。
- 封面 `media/cover.jpg`（headless Chrome `?cover=1`）+ 菜单缩略图 + `tools/web/thumbs.py` 三语缩略图，三个都重做。nav.js / 官网菜单不用改（文件夹和标题不变）。

**现在的状态**：三个都已本地提交（acaba89 莲、ea7c82d 仁、598cc12 紫苑；文档另一提交），**没有 push**（统筹推送）。测试：每个 Demo 两条分支 × 不同语言（莲 zh/ja/en、仁 zh/en/ja、紫苑 ja/zh/en）用 drive_story.js 跑完，嘴部 0 问题（只在说话时动、静音闭上、没有半透明双嘴 / 卡住 / 闪烁），每个有眼差分的画面两眼都闭，0 个 404 / 报错 / 漏翻，结束回到自己的封面（↺ Play again）；check_patches / check_cut_body 0 报告；手机 / 平板 7 种尺寸（page_probe --no-play）一屏、≥ 44 px、引导在屏内。

**下一步 / 遗留**
- `check_demo.py --full` 对这三个仍会报：自动通关停在第一个按钮（旧 main.js 没有 `?auto`）→ thermal "no output"；建议 check_demo 在页面不支持 `?auto` 时改用 `tools/qa/drive_story.js` 的点击逻辑（或给 main.js 加 `?auto`，属于改剧情代码，需统筹决定）。冷热仍是旧的"每耳一种模式"，不是 DUAL（用户要求剧情/冷热不变）。
- check_cut_body 的上边检查顺带报出别的 Demo：Demo31 nagisa_arrive（顶部 4 %）、Demo20 hina_booth（2 %）、hina_wave（7 %）——交给各自的会话。
- 紫苑 dryer/window 左下"你的头发"之间清掉灰底后透出深色地板，看起来像几块暗洞（之前是灰块）；仁 can 的铝罐和幕布同色，没清；紫苑 towel / door 的取色不可靠，没清。
- 旧版视频（`media/video/*.mp4`）已随合并从仓库删除（备份里有）。

**花费**：本轮 OpenAI 0 次（全部修复都是重新量区域 / 摆位 / 代码清理）；三个 Demo 累计仍按交接估计 $6–9。Seedance 0。

**问题 / 教训**（写进 `DEMO_DESIGN_GUIDE.md` §11.1 末尾）：眨眼区域量错但 check_patches 全绿；羽化带里的闭嘴线；头发上边切平；包住的灰底；暂存 index.html 的旧 `?v=`；旧 Demo 没有 `?auto`；同名静帧缓存。另外：会话中途 `/usr/bin/python3`、`/usr/bin/git` 开始报 "You have not agreed to the Xcode license agreements"（有人装了 Xcode）→ 用 `/Library/Developer/CommandLineTools/usr/bin/python3` / `git` 直接调用；需要用户在终端运行 `sudo xcodebuild -license` 同意一次。

## 2026-11-08 · ミント「おみみ専門店」接管 Demo14_MintStream（原 Demo37）· 后台 agent（统筹会话审查）

**做了什么**（接 moheat-evo-55 的交接）
- 出图（OpenAI gpt-image-2，品红幕）：补出 `mint_goodnight`，量 7 个姿势的脸写 `project/face_points.json`，14 张遮罩差分（张嘴 / 闭眼）；7 个姿势是同一个人、earL / earR 在对的耳朵边、没有多余道具（`assets/poses_preview.jpg`）。
- `project/stage.json`（`"matte": "magenta"`、`regions_eyes`、`centre_mouth`）→ `build_stage.py`：0 截断、贴片全过、0 品红残留；2 倍看过嘴和发丝边缘。
- 页面修正：`main.js` 缺 `thermal()`（页面开始后就卡住）、`finish()` 清 `S.fade`（封面不黑）、分层后不再整页漂移、薄荷喷雾紧接着暖手（同一只耳朵热→冷）、右耳画面弹幕移到左边、观看人数 / 位置标签三语（`T()` + `make_l10n.py`）、`project/qa.json`（弹幕是观众自己的语言）。
- 合并：旧 Demo14 备份 `~/Desktop/MoHeat Evo 备份/for-men/Demo14_MintStream_20261108-1509/`；Demo37 → `demos/for-men/Demo14_MintStream`；封面、三语缩略图、nav.js 标题（?v=41）、官网菜单、credits、README、`.gitignore`。提交 7128905（有问题，见下）+ 修复 f7822a3 + 本条。
- `tools/openai/images.py`：写用量记录前重新读文件（并行出图不再互相覆盖）。

**测试**：`check_demo.py --full`（两条分支）0 FAIL；`check_mouth.js` 两条分支 lip-sync OK；`check_motion.js` OK；`check_mobile.html?only=Demo14` 7 种尺寸 0 问题；`?sub=ja / zh` 标签和字幕都对；结束回到本 Demo 封面「↺ Play again」。

**花费**：OpenAI 本 Demo 共 22 张 2560×1440 high（约 $4.4，`project/openai_log.json`），Seedance 0。

**问题**（§11.1 已写）：临时索引提交时 HEAD 变了，7128905 把 ad48144（手机界面大改）撤回并被推上线 → f7822a3 修复；页面缺函数；并行出图日志覆盖；弹幕挡脸。

**下一步**：`tools/eleven/cast.json` 里 cocoa / hinata_s / luna 的 `compare` 试听文件还指向旧 Demo14 的 `media/voice/c01…l11.m4a`（已不在仓库，在备份里），只是试听参考，需要时改路径；`tools/cleanup/audit.py` 的 `Demo14_MintStream/project/box_*.jpg` 条目已无匹配，可删。

## 2026-11-08 · 制作流程 v2 + 一个 QA 入口 tools/qa/check_demo.py · 后台 agent（统筹会话安排）

**做了什么**
- `DEMO_DESIGN_GUIDE.md` §6 新增「制作流程 v2」：G0 开工 → G1 剧本 / 冷热 / 语言 → G2 声音 → G3 出图 → G4 合成 → G5 页面 → G6 测试 → G7 上线 → G8 收尾，每步写明门禁（查什么、用什么工具、怎样算过）和它防住的 §11.1 教训；§8 / §9 / §14 指向它。§11.1 按步骤合并重复（约 55 条 → 约 30 条），每条标出防住它的门禁〔check_demo: …〕/〔CHECKLIST〕。
- 新工具 `tools/qa/check_demo.py <demo> [--quick|--full|--remake-of <原>|--checklist]`：layers / cut-body / patches / eyes / syntax / refs / links / files（静态 404）/ cache（?v=）/ l10n（静态 + 运行时 no zh）/ voice / end（回本 Demo 封面）/ runtime（异常、失败请求）/ thermal（读 `#cmd` 实测 DUAL 展示）/ mobile（check_mobile.html 7 种尺寸，失败自动再跑一次）/ mouth（--full）/ release / hygiene。浏览器部分 `tools/qa/page_probe.js`（自己的 http.server + headless Chrome）。例外写在 `project/qa.json`。
- `tools/qa/CHECKLIST_TEMPLATE.md` → `project/CHECKLIST.md`（自动表 + 手动项：人物一致、嘴眼 2×、动画物理整段逐帧、DUAL 四项、语音判定、三语 + 韩语位置、手机、结束回封面、预算）。
- `tools/web/merge_remake.py`：合并前自动跑 `check_demo.py <重做版> --remake-of <原> --full`，FAIL 就拒绝（`--force` 要写理由）。
- CLAUDE.md / AGENTS.md：QA 门禁规则 + 提交硬规则（只提交自己的路径、临时索引、HEAD 只往前走、共用文档写临时文件再替换）；USER_PREFERENCES：每条教训都要变成检查。

**现在的状态（check_demo 默认模式，15:00）**：Demo17 / 18 / 25 / 30 0 FAIL；Demo20 FAIL refs（加载 `../Demo12_LateCall/style.css`，Demo12 被重做就会坏）；Demo24 FAIL refs（封面 `#nextBtn` 链到 Demo12 = 违反"结束回本 Demo 封面"）；Demo31 FAIL patches（fan / sit 嘴补丁 OUTSIDE 1.3 %，别的会话正在改）。常见 WARN：credits.html 没写 layered（20/24/25/30）、静态漏翻（Demo24 弹幕 69 条、Demo20 17 条）、Demo17 冷峰值 49 %、Demo20 没有 3 s 内的冷热切换、Demo31 assets/ 没进 .gitignore、各 Demo 没有 CHECKLIST.md。没改任何 Demo 内容。

**问题**：我的第一次提交 f02fb0c 用了不带路径的 `git commit`，带走了别的会话已暂存的文件（内容是对的、只是挂在我的提交下）；之后 `git reset --soft` 退掉了别人刚做的 8553937（内容已由其作者在 2570f61 补回，没有丢东西；d3a1079 的说明文字是复制来的、不准）。教训已写进 §11.1 和 CLAUDE.md 硬规则。

**下一步**：各 Demo 负责的会话按上表修 FAIL；新 Demo / 重做版上线前跑 `--full`；修好 `shared/subs.js` 的启动竞争（第一句台词在 l10n.js 加载前显示）。

## 2026-11-08 · 手机一屏 + 屏幕自适应 UI + 新手引导在手机上可点 · 后台 agent（统筹会话审查）

**做了什么**（只改共用文件，所有 Demo 一起生效；用户：「手机版本都要改成不需要下滑的，一开始的指南不要跑到手机按不到的地方」「UI 能不能做成屏幕自适应」）
- `demos/shared/series.css`：屏幕自适应——播放器永远取最大 16:9；≤ 1100 px 时侧栏按剩下的空间放在播放器下面（`html.lay-below`）或收成从右边滑出的抽屉（`html.lay-drawer`，顶栏 🎛 打开）；手机横屏顶栏变成左边 56 px 竖条；有 Web Serial 的窄窗口设备控件收进 🔌 菜单；触屏上顶栏按钮 44 px、画面上的小按钮（🌐 ⛶ 🔊 等）用 `::before` 给 44 px 点击区、封面 / 语言 / 回答按钮 ≥ 44 px、侧栏滑块和勾选框整行 44 px；小播放器上字幕最小 13 px、封面隐藏角色 chip；长按按钮 `touch-action: none`；没有 Web Serial 时隐藏 🌡 温冷检查。
- `demos/shared/nav.js`：量出 `lay-below` / `lay-drawer`，插入 🎛 / 🔌 按钮（点外面 / Esc 关闭），横屏竖条时 `--fit-bar` = 0，Demo 列表面板位置跟着顶栏，长按画面 / 按钮不弹系统菜单。
- `demos/shared/guide.js`：提示框在 下 / 上 / 右 / 左 / 屏幕底 / 屏幕顶 里选完全在屏幕内、不挡高亮元素的位置；先把目标滚进可见范围；抽屉模式下自动打开侧栏讲冷热表等；触屏按钮 44 px；新增 🎛 一步，🔌 算作设备连接那一步。
- `demos/healing/Demo13_NaomiCam/style.css`：摄像头按钮条（Demo 自己的控件）触屏 44 px，窄时换两行。
- 新工具 `tools/web/check_mobile.html`（用法见 `DEMO_DESIGN_GUIDE.md` §7.1）：所有 Demo × 7 种尺寸，测页面滚动 / 横向溢出、真实点击测试（控件中心 ±21 px）、样例回答按钮、抽屉、引导每一步；`?only=`、`?serial=1`、`?view=`、`?resume=1`。
- 文档：`DEMO_DESIGN_GUIDE.md` §7.1（自适应做法 + 手机规则 + 检查工具）、§7.3 骨架、§9 清单、§11.1 两条教训；`USER_PREFERENCES.md` 一条。

**现在的状态**
- `check_mobile.html` 全部 30 个 Demo：390×844、844×390、768×1024、1024×768 下封面和开始后都没有滚动 / 横向溢出 / 点不到的按钮，引导每一步都通过；1280×720、1440×900、1920×1080 桌面不变（无滚动）。

**下一步**
- 新 Demo（Demo33–42 等）上线前跑 `tools/web/check_mobile.html?only=<文件夹>`。
- 真机（iPhone Safari / Android Chrome）上再摸一遍长按和 🎛 抽屉（iframe 测试模拟不了真正的触摸事件）。

**问题**（教训已写进 §11.1）：原来的一屏检查只看滚动条，没测按钮点不点得到；别的会话关掉 / 导航走了我的测试标签页（检查工具现在把结果存在 localStorage，`?resume=1` 续跑）；后台标签页的定时器被节流，检查要放在前台标签页跑。

## 2026-11-08 · ルナ「秘密调酒师」做完并接管 Demo19_LunaStream（后台 agent，统筹会话 moheat-evo-c9 审查）

**做了什么**
- 《ルナの、ひみつのカクテル · Luna's Secret Cocktail》在临时文件夹 Demo39_LunaBartender 做好，测试通过后接管 `demos/for-men/Demo19_LunaStream/`（同一网址）。旧直播页（只有 index.html + cover，代码 / 美术都在 Demo14）连同当时 Demo14 的代码（不含 assets）备份在 `~/Desktop/MoHeat Evo 备份/for-men/Demo19_LunaStream_20261108-1448/`。**新 Demo19 完全独立**：没有 `<base href>`，html / js / css / 图 / 音频都不从 Demo14 读（服务器日志 0 个 Demo14 请求）；ルナ 的参考图先从 Demo14 复制到 `Demo19_LunaStream/assets/ref/`（不进 git）。
- 剧本 = `project/script.md`（已审），5 段、22 句（ElevenLabs `luna` r1_b，118 s，`scripts/voice.py`），约 2:15。互动 7 次：点单二选一、接酒杯、给一个词（月 / 夜明け）、长按看火焰（松手 = 眨眼，她再点一次）、干杯说出来（ふたりの夜に / ルナに）、结局（「つき」と呼ぶ / また来てもいい？）；全部可用语音回答（l10n.js VOICE + `data-voice`）。三语。结束回本 Demo 封面。
- DUAL：右脸冰摇壶（右冷 0.65）+ 她在右边的耳语（右暖）同时；蓝色火焰（两耳暖、闪烁）→ 火一灭门被风吹开（左冷）= 一秒内热→冷；门口雨夜风（左冷）；爱尔兰咖啡（前方暖）；她坐在左边（左暖）+ 左耳耳语。
- 画面（标准分层，OpenAI gpt-image-2）：`bg_bar`、`bg_seat` 两张空背景（`bg_bar_dim` 用 Pillow 压暗，免费）、6 个绿幕姿势（counter / shake / lean / flame / sit / whisper）、12 张遮罩差分（`project/face_points.json`）→ `build_stage.py` → `tools/art/clean_cutout.py <demo> --bg 8,158,65`（本次给它加了 `--bg`：绿幕时不做灰底清除，见 §11.1）。check_cut_body 0、check_patches OK，嘴 2 倍看过（张嘴只在说话时出现、停顿闭上、无双嘴 / 方框）。
- 共用：nav.js 标题（ja ルナの、ひみつのカクテル / en Luna's Secret Cocktail / zh 露娜的秘密鸡尾酒）+ `bump.py --stage`、官网菜单文字、credits（拆成「ミントの配信」和本作一行）、封面 `media/cover.jpg` + `assets/images/demos/Demo19_LunaStream.jpg` + 三语缩略图（`tools/web/thumbs.py`）、TASKS #35/#37、HANDOFF 目录行、`.gitignore`。

**测试**（自己的标签页，端口 8797）：`?auto=1`（EN，真声音）2:13 通关、6 个画面都出现、说话时嘴开 96 %、沉默时 0；`?auto=1&alt=1&sub=zh` 通关，画面上 0 假名；`?alt` 快速版确认 l10x（眨眼重来）分支；同耳冷热同时出现（lean：RC64 + RH35）；结束回封面（修了黑屏）；0 报错，只有 favicon 404。

**手机**：`tools/web/check_mobile.html?only=Demo19` 7 种尺寸 0 问题。

**下一步**：Demo17 / 18 / 25 / 31 结束黑屏的同一个 bug 交给统筹分派（各自 `finish()` 加 `S.fade = 0`）。

**花费**：OpenAI 20 张 2560×1440 high（约 $4，`project/openai_log.json`）；ElevenLabs 22 句（约 900 字）；Seedance 0。

**问题**（教训已写进 §11.1）：分步暂存的删除被别的会话的提交带上线（Demo19 404，统筹恢复）；clean_cutout 在绿幕上把白衬衫边缘抠出黑点；结束后封面全黑；长按按钮挡住火焰；`?auto` 在 AudioContext 挂起时卡住。

---
## 2026-11-08 · Demo18 ひなた 抓娃娃机检查 + 修正（moheat-evo-60 交接的验收子任务）

- **问题（v8 实际画面）**：爪子 518 px 高、关在 635 px 的玻璃箱里，停车位置就已经插进玩偶堆里；`grabY()` 比停车位置还高 17 px → 「下降」其实往上走、「提起」往下走，猫根本没被提起；猫底部被玻璃下沿直线切掉；代码画的 3 px 细线接在图里 9 px 粗的吊绳上；两边的爪是横向挤压（铰链离开外壳）。
- **修正（`main.js` v9，e614bcd，`index.html` 的 `main.js?v=9` 已被 fc6ebd7 一起提交）**：爪子 220 px，外壳停在天花板下（`parkY()`），猫 185 px 坐在玩偶堆上（底 ≈ y 652，阴影）；整个爪子从天花板支点像钟摆一样挂着，摆动由滑轨加速度驱动（固定 10 ms 子步，帧率无关）；图里的吊绳条拉伸到天花板；两边的爪绕铰链旋转 0.17 rad（夹在脸颊下面，在猫前面；中间爪在猫后面）；抓娃娃机图层随画面淡入淡出（v8 切到包厢时瞬间消失）。剧情时间：长按 2.2 s → 稳 0.35 s → 下降 1.5 s → 合拢 0.45 s → 第 1 次提到一半滑落 / 第 2 次提起 1.2 s、移到出口 1.3 s、松开掉落。
- **检查**：虚拟时钟逐帧渲染整段（30 fps）+ 无头 Chrome 跑完三遍（`?auto=1` en、`&alt=1` ja、zh）：全部走完 6 个画面、0 JS 错误、DUAL 正常；手机 390×844 / 844×390 一屏检查 0 问题。审查图（不进 git）：`demos/for-men/Demo18_HinataStream/assets/review_claw_1_grab_2x.jpg` `_2_lift_2x` `_3_chute_2x` `_4_sequence`。
- **包厢**：QA 会话 fc6ebd7 重切了 booth 贴片；嘴 2 倍看过（闭 / 开都干净，无双嘴 / 方框）；**眨眼两眼都闭上，但闭眼线下面还透出一点橙色虹膜（约 2 倍时可见）** → 留给 QA 会话（贴片中心 alpha 不够 / 眼睛区域偏）。延长的身体自然。
- **问题**：`DEMO_DESIGN_GUIDE.md` 在 14:53 被别的会话写成 0 字节（工作区，HEAD 完好），本会话没动它，§11.1 教训见交接报告，等文件恢复后补。


## 2026-11-08 · 信长 AI 对话拆成三个 Demo（Demo23 信长 / Demo41 家康 / Demo42 座谈会）

**做了什么**
- 用户：「Keep the Nobunaga AI demo as THREE separate demos: only Nobunaga, only Ieyasu, and a multi-person round-table」（TASKS #46）。
- Demo23_NobunagaTalk = 「信長と、語らう」（只和信长，原网址）；新 `demos/nobunaga-suntory/Demo41_IeyasuTalk/` = 「家康と、語らう」；新 `demos/nobunaga-suntory/Demo42_SengokuRoundtable/` = 「信長と家康の、座談会」。
- 新文件夹只有 `index.html`（`<base href="../Demo23_NobunagaTalk/">`，引擎 / 剧本 / 声音 / l10n 全部按路径复用，没有复制）。对象由 `<body data-cast="N|I|NI">` 固定，`main.js` 读取；封面只剩地点选择（相手一行删掉）。
- 六个页面（3 公开 + 3 私密实时：`live/index.html` 信长、`live/ieyasu.html`、`live/roundtable.html`）全部由 `node demos/nobunaga-suntory/Demo23_NobunagaTalk/scripts/pages.js` 从两个模板生成。`server.py` 加短网址 `/live/nobunaga` `/live/ieyasu` `/live/roundtable`（同一密码、同一 limits）；`start_demo.command` 打印三个地址；`scripts/prompt_dry.js --all` 也检查三个实时页的 cast。
- nav.js DEMOS + RIGHTS、官网菜单（index.html）、credits.html、l10n.js（新标题 / 副标题三语；删掉旧的对象按钮词）、三语缩略图（`tools/web/thumbs.py` + 菜单用 `<dir>.jpg`）、README、HANDOFF。

**测试**：自己的标签页 + `python3 -m http.server 8793`：Demo41 京都（EN）开始 → 说「お酒が好きです」→ 过渡句 → 结束回到自己的封面；Demo42 安土（中文）开始 → 三人台词 → 过渡句 → 结束回封面；页面加载的 88 个资源无 404；`tools/web/check_mobile.html?only=Demo23,Demo41,Demo42` 7 种尺寸都是一屏。私密版：临时密码文件 + 端口 8794 跑 server.py，未登录跳登录页，登录后三个入口 303 到对应页面并 200，`server.py` / `local/` 仍 404；只做了 prompt 干跑，没有付费对话。

**下一步 / 注意**
- nav.js 的 `?v=` 没有在所有页面上提升（nav.js 里还有别的会话没提交的改动，由那个会话 / 统筹一起 bump）。subs.js 加载 `l10n.js?v=3` 是全站固定号，老访客最多缓存 10 分钟。
- `DEMO_DESIGN_GUIDE.md` 曾在 14:52 短暂变成 0 字节（别的会话正在重写），之后已由那个会话恢复；本会话的两条教训（缩略图截到未画好的封面、拆 Demo 用生成的薄页面）在 §11.1 末尾。

---

## 2026-11-08 · 嘴部专项 QA（上线中的分层 Demo：Demo17 / 18 / 20 / 24 / 25 / 30 / 31）

**用户**：「嘴的部分都要重点检查，我看了还是有 bug」。

**做了什么**
- 新工具（每次合成后必跑，指南 §6 第 5 步「嘴部 QA」、§9 清单）：
  - `python3 tools/art/check_patches.py <demo>`：每块差分 100 % 对照 + `assets/patch_check/mouths.jpg`（每张嘴 闭 | 张 2 倍）；退出码 1 = SEAM / OUTER（下巴线、脸颊、头发被重画）/ OUTSIDE / BORDER / BOUNDS；NO-MOUTH 列出没有嘴差分的画面。
  - `node tools/art/check_mouth.js <demo> [秒] [--alt] [--shots] [--dump]`：自己的 headless Chrome + 端口，`?auto=1&nomic` 跑剧情，逐帧读 `MoHeatLayers.state()`：SILENT-OPEN / NO-MOVE / NO-PATCH / UNMAPPED / STUCK-OPEN / HALF / FLICKER；`--shots` 存每个画面张 / 闭的整帧到 `assets/mouth_check/`。
- `demos/shared/layers.js`（现在 `?v=6`）：嘴按音节动（相对最近峰值，> 70 % 张、< 55 % 闭，最长张 0.45 s），张 / 闭硬切换并保持 ≥ 60 ms（不再半透明双唇）；差分 `source-atop` 裁到人物透明度；先画眼后画嘴；新的差分类型 `mouth_quiet`（张嘴底图的闭嘴差分，不说话时盖上）；`MoHeatLayers.state()` 给测试用。之前 Demo25 说话时间里嘴 95 % 张着（像定格）。
- Demo18 大头贴 booth：补宽的姿势（2696×1499）差分按旧尺寸截取 → 张嘴偏到左上、脸颊多一条下巴线；用按尺寸分组的 `build_stage.py` 重建（`media/layers.js?v=3`）。
- Demo30 朔 breath_L（侧脸贴左耳，他在说话却没有嘴 / 眼差分）：OpenAI 遮罩编辑 `saku_breathL_mtalk2`（嘴）+ `saku_breathL_blink`（眼），`project/web_prompts.json`；`stage.json` 加 talk / blink；重建（新的抠图规则顺带去掉了旧版头发的灰白边）；`media/layers.js?v=2`。OpenAI 3 张约 0.6 美元。
- 提交：fc6ebd7、（?v=4 补交）、47cb7fd（f02fb0c 用旧的暂存副本把 layers.js 的嘴部修改覆盖了，重新落地 + ?v=6）、本条目所在的提交（Demo30 + 指南 + 日志）。

**现在的状态**
- `check_patches.py`：Demo17 / 18 / 20 / 24 / 25 / 30 全部 ✓；`check_mouth.js` 两条分支：Demo17 / 18 / 20 / 24 / 25 / 30 ✓（Demo20 的 queue 画面没有人物，不算）。
- **Demo31 渚 没有改素材**（另一个会话在补身体、重建它的人物层）：剩下 ① 靠肩 shoulder 没有嘴 / 眼差分（她在那里说 n17a）；② 大笑 laugh、贴耳 whisper 的底图本身张着嘴，沉默时也张着 → 各出一张闭嘴差分，`stage.json` 里写 `mouth_quiet`（`layers.js` 已支持）；③ fan / sit 的嘴差分外圈带进了头发（check_patches 的 OUTER 待它重建后再看）。

**下一步**
- 等 Demo31 的补身体提交后：`images.py` 遮罩编辑 shoulder 张嘴 + 闭眼、laugh / whisper 闭嘴（约 0.8 美元）→ `build_stage.py` → `check_patches.py` + `check_mouth.js --alt`。
- 新 Demo（Demo37 Mint、Demo39 Luna）上线前同样跑这两个检查（`tools/qa/check_demo.py --full` 已调用 check_mouth）。

**问题**（教训在指南 §11.1）
- 我的一行 Python `open(p,'w').write(f(open(p).read()))` 把 `DEMO_DESIGN_GUIDE.md` 清成 0 字节（连同 QA 会话未提交的整段改写）；已从会话记录里的命令 + scratchpad 文件（`guide_before.md`、`new_v2.md`、`new_111.md`）原样重建。
- 并行提交互相覆盖：f02fb0c 把别的会话按旧 HEAD 暂存的 layers.js 一起提交，冲掉了 fc6ebd7 的嘴部修改；我的 `bump.py --stage` 暂存被别的提交带走一部分。以后：提交共用文件前后 `git show HEAD:<文件> | grep <自己的关键行>` 确认还在；用临时 index（`GIT_INDEX_FILE`）只提交自己的路径。

## 2026-11-08 · 人物细节 + 动画物理检查（眼睛 / 呼吸 / 视差 / 粒子），7 个分层 Demo

**做了什么**
- 新工具 `tools/art/check_motion.js <demo> [秒] [--shots]`：自己的 headless Chrome + 端口，检查眨眼时长 / 间隔 / 切镜头时闭眼、呼吸频率、页面整体漂移（FRAME-DRIFT）、人物移动时画框边露底（EDGE-GAP，洋红底板 + 极限视差）；`--shots` 输出每个姿势的睁 | 闭 | 差三联图到 `<demo>/assets/motion_check/`。
- `demos/shared/layers.js`（只改动作部分，口型那部分是另一个会话的未提交改动，没有一起提交）：呼吸改为只抬肩以上、拉伸躯干（头不再被拉长），约 15 次 / 分、吸短呼长；说话只抬头；被画框切掉的边移动时延伸；深度视差方向修正（近处跟人物同向，目前没有 Demo 用深度图）；眨眼 0.11–0.15 s、2–6 s、15 % 连眨、切镜头不眨；新 API `MoHeatLayers.live / toFrame / flicker / motion / debug`。
- 页面去掉分层画面上的整体缩放 / 晃动：Demo25、17、31、20、24、30 的 main.js（`LIVE()`）。Demo18 没改（夹娃娃机会话在改 main.js）。
- 粒子物理：Demo25 篝火火星（从火里出生、减速、随风、渐隐）；Demo24 火星 / 热气 / 雪随湖风向右、减速，热气起点跟着手（toFrame），火光闪烁和背景同步；Demo30 烟花先亮后响（闪光 0.4 s，轰声 1.05 s）；Demo31 线香花火球跟着线头（toFrame）。
- 指南 §6.4 动画物理检查清单，§11.1 三条教训。

**状态**：7 个 Demo 跑 `check_motion.js` 60 s：除 Demo18（页面漂移，未改）外 FRAME-DRIFT 全部消失，呼吸 15 / 分，眨眼间隔 2.7–4.2 s。

**下一步 / 交给别的会话**
- 闭眼差分要重画（遮罩编辑）：Demo17 可可全部姿势（闭眼处发灰），Demo25 tsubaki_stole / amazake（透出瞳孔），Demo18 hinata_booth，Demo20 hina_lean。图在各 Demo `assets/motion_check/<stem>_eyes.png`。
- Demo31 popsicle 人物层手后的灰色底板（`assets/motion_check/popsicle_grey_panel.jpg`）、多张姿势头发外圈有浅色毛边；Demo24 log 右下角矩形缺口（`assets/motion_check/log_notch.jpg`）——交给切身体 / 抠图的会话。
- Demo18（夹娃娃机会话做完后）：drawView 加 `LIVE()` 去掉漂移；罐子热气改成减速扩散；夹爪 / 娃娃按 bg 坐标画，要用 `MoHeatLayers.toFrame('hinata_crane', x, y, 'bg')` 再乘页面的 1.02，否则视差时会和机器错开。
- EDGE-GAP 剩两个小的（Demo20 hina_hands 右边袖子、Demo24 gaku_coffee 左下）只在极限视差出现，属于轮廓滑动，可忽略或延伸抠图。

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
