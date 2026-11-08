# 穿越篇 Demo 标准（草稿）· Crossover demo standard — draft

> 来源：第一个试点 `demos/for-men/Demo43_BlizzardInn/`（白嶺の峠、ひと晩の宿，M1-East，2026-11-08）做下来的实际做法。
> 用户 2026-11-08：「Demo43 先确认没问题，再总结设计标准和制作模式，然后再做后面的」——本文件是那份总结的草稿，等统筹 / 用户确认后
> 合进 `DEMO_DESIGN_GUIDE.md`（§1 选题、§6 流程、§7 页面）。后面三个穿越 Demo（② 魔法学院、③ 月宫天女、④ 龙与精灵）照这里做。
> 方案和共用设计：`docs/proposals/2026-11-08_crossover.md`（顶部「用户回答后的修订」+ 第一版 §0）。

## 1. 故事骨架（约 2:40 + 3 个自由对话窗口，5 段，每段一个场地）

| 段 | 内容 | 互动 | Demo43 的做法 |
|---|---|---|---|
| 1 到达 | 现代的东西把"你"带过去；第一位角色发现你；一句交代"语言相通" | 二选一 + 动作 | 吹雪の峠：白茫茫 → 渚的脚步 → 「助けて…」/「あなたは…？」→ 手をとる → 毛皮披肩 |
| 2 角色 A 的地方 | A 的核心身份 + 招牌互动 + **对话窗口 ①** | 说出口的二选一（判定） | 雪見亭：火锅 + 赌大小（说「大！」「小！」）+ 贴右耳坦白出老千 |
| 3 角色 B 的地方 | 全片最强的 DUAL + **对话窗口 ②**（是 / 否问题） | 长按（松手重来） | ミント：艾灸（移动的热）→ 一口气吹凉（快速热 → 冷）→ 艾灸回到薄荷膏上（同耳冷热）→ 闭眼左耳低语 |
| 4 角色 C 的地方 | 夜里的心动 / 危险一幕 + **对话窗口 ③**（是 / 否） | 说出口的二选一 | 门被风撞开（左冷）→ 渚站到左边挡风 → 「おつかれさま」/「ありがとう」→ 左耳 |
| 5 回去之前 | 三人同框；三选一信物 = 3 个结局 → 那个人贴耳最后一句 → 白光、回到现代 → **本 Demo 封面**显示结局文字 | 三选一 | 夜明けの峠：星の簪 / サイコロ / 髪紐 |

- 互动 6 次 + 3 个窗口；每次等待有超时（15–25 s），窗口 10 s 不说话自动继续。
- 结束后封面多一排「💬 もっと話す · Keep talking」：选**人**（每人在自己的场地；"三人"在黎明的山口）。假版 / 真版同一套选择。
- 所有人是人类（东方）；狐面之类只当道具；无酒精；架空地名，不贴朝代。

## 2. 特别版人物设计规则

- **不变**：脸（眼型、瞳色、脸型、表情风格）、发色、性格、ElevenLabs 声音（用 `tools/eleven/cast.json` 已确认的 voice_id，不再试听）。
- **要变、而且变化越大越好**：服装、发型、身份；身份必须让核心性格发挥（ひなた = 比胜负、ミント = 照顾耳朵哄睡、渚 = 嘴硬护人）。
- **每人 2 个造型**（A 较保守、B 变化更大），拼成 `project/designs_contact.jpg`（原版 | A | B），选「脸和发色保住、和原版差别最大」的一个——Demo43 选了 ミント B（盘发 + 深青斗篷）、ひなた A（双丸子 + 橙红棉袄）、渚 B（短发 + 橙头带 + 黑毛领大衣）。
- 提示词固定写：`SAME`（脸照参考图不变，只换衣服和发型）+ `WORLD`（架空、不是某朝代、无现代物件）+ 角色的识别锚点（星形簪、红缎带 + 虎牙、橙色发圈）。
- 选中的设计图**直接当这个人的基准姿势**（`<char>_base.png`，设计图就按立绘规格出：大腿以上、正面、纯色幕、场景光），不另花一张。
- 幕布：头发有绿色的角色用品红幕（ミント），其他用绿幕；黑发深衣也能用绿幕。

## 3. 锁脸方法（同一个人）

1. 设计图参考 = [原角色立绘, 原角色近景]（`assets/art/ref_<char>.png` + `ref_<char>_close.png`，**复制**进本 Demo，不链接）。
2. 之后每个新姿势参考 = [选中的基准, 原角色近景]，提示词写「同一个人、同一画风、不要更写实、同发色」。
3. **闭眼**一律遮罩编辑（`project/face_points.json` 量出的椭圆 → `prompts.py` 写进 job 的 `mask`）。**嘴 = LivePortrait 嘴型组**（2026-11-08 新标准，`tools/art/lp_mouths.py`）：`stage.json` 每个姿势写 `"mouth": "lp"`，闭嘴 + 3 级张嘴都从这张图自己变形出来，切成同一个固定块，所以不会跳。LivePortrait 找不到脸的姿势（Demo43 ひなた贴耳：侧脸大特写）才用画出来的张嘴差分（遮罩编辑 + `regions_mouth`）。
4. 检查：`scripts/face_compare.py` → `project/face_compare.jpg`（原版脸 | 每个姿势的脸），`assets/poses_preview.jpg`。不像就只重画那一张。

## 4. 对话部分（剧本版 + 实时版，共用 `demos/shared/talk.js`）

| | 公开剧本版（菜单里，0 成本） | 私密实时版（只在本机服务器） |
|---|---|---|
| 页面 | `index.html` | `live/index.html`（`scripts/pages.py` 从 index.html 生成，`<base href="../">`，加载 `live/live.js`） |
| 一轮输入 | `MoHeatTalk.listen()`：显示语言的语音识别或打字，1.2 s 安静结束、10 s 沉默 = 跳过 | 同左 |
| 回答 | `MoHeatTalk.topic()` 按关键词选话题 → `bridges().pick()` 取这个人这个话题没用过的过渡句（预合成语音），然后接回剧本 | `INN_LIVE.turn()`：ElevenLabs 文字 agent（Claude）写 1–3 行 `X|位置|[tag] せりふ|English`，服务器用该角色的声音 TTS |
| 话题表 | `script_data.py` 的 `TOPICS`（leave / thanks / future / game / food / sleep / cold / praise / name；yes / no 只在是否问题后）| prompt 规定话题贴着场地和身份、不出世界观 |
| 服务器 | — | `tools/talk/server.py`（所有实时 Demo 一个，密码 `~/.moheat_live_pass`，limits 共用），注册表 `tools/talk/demos.json` 加一项：路由 + 说话人 → 声音 |
| 过渡句数量 | 每人 12 句（9 话题 + 2 通用 + 沉默，可加 yes / no）；「もっと話す」每人 5 句 + 三人 6 句 | — |

- 实时版冒烟测试（不花 TTS）：`scripts/live_smoke.mjs`（登录 → 真实 agent 跑 3 轮，只看文字）。

## 5. DUAL 冷热时刻（每个穿越 Demo 都要有这四样）

| 要求 | Demo43 的时刻 | 物理来源 |
|---|---|---|
| 同一只耳朵同时冷 + 热 | 艾灸在右耳边画圈 + 同一只耳朵的薄荷膏 | 艾条（隔一段距离）、薄荷 |
| 快速冷热切换（≤ 3 s，从"只热"到"只冷"） | 只有艾灸几秒 → **不说话的瞬间**拿开、抹药、吹一口气（呼吸音效，不是台词）→ 0.7 s 内变冷 | 人声永远暖，所以切换要在没台词的时候 |
| 方向 / 移动的源 | 暴风雪阵风从左扫到右；艾灸绕着右耳转；门在左边被撞开 | 风、火、门 |
| 强度到顶 | 汤碗 + 火锅（两耳热 0.75）、她吹气（右冷 0.85）、门口风（左冷 0.65） | 真实靠近耳朵的东西 |
- 人声层：`(0.1 + 0.8 × 响度)` × 距离（贴耳 1 / ≤ 50 cm 0.6 / 更远 0.28），正前方 × 0.5。不加热：赌注、脸红、"辣"。
- `check_demo.py` 的 thermal 行要 PASS：同时冷热、快速切换、左右差、峰值 ≥ 50 %、结束是 stop。

## 6. 文件夹（照 Demo43 复制）

```
demos/<品类>/Demo<NN>_<Name>/
  index.html style.css main.js audio.js lines.js l10n.js README.md
  live/index.html (生成) live/live.js            私密实时版
  media/  art/ (build_stage 输出 + cover_trio.jpg + trio_dawn.jpg)  voice/*.m4a  voice.js  layers.js  cover.jpg
  scripts/ script_data.py (台词唯一来源) voice.py make_l10n.py prompts.py make_plates.py make_stage.py make_trio.py
           fix_variant.py despill.py face_compare.py cutout_sheet.py design_sheet.py pages.py make_cover.py live_smoke.mjs
  project/ web_prompts.json face_points.json placement.json stage.json zh_lines.json layers.md qa.json CHECKLIST.md
           designs_contact.jpg face_compare.jpg stills_contact.jpg cutouts_2x.jpg openai_log.json
  assets/ (不进 git) art/ (参考图、原始 PNG) logs/ patch_check/ motion_check/
共用：demos/shared/talk.js · layers.js · cover.js · voice.js · subs.js · nav.js   tools/talk/server.py + demos.json
```
- 下一个穿越 Demo 的 `main.js` / `audio.js` 从 Demo43 复制后只改剧情和音效；后面如果第三个 Demo 也一样，把故事运行框架（choice / action / hold / talkWindow / keepTalking / thermal / 面板）抽进 `demos/for-men/_kit/` 或 shared。

## 7. 工具和命令（按顺序）

```
0  python3 demos/for-men/Demo31_SummerRooftop/scripts/seedance.py probe      # Seedance 上传探测：429 / 长 Retry-After → OpenAI
1  复制参考图 → assets/art/ref_<char>(_close).png
2  python3 scripts/prompts.py && python3 tools/openai/images.py <demo> design_<c>_a design_<c>_b … bg_…      # 并行，每个 job 一个进程
3  python3 scripts/design_sheet.py → project/designs_contact.jpg，选定 → cp design_<c>_x.png <c>_base.png
4  量脸：网格裁图 → project/face_points.json → prompts.py → images.py <c>_base_blink …（遮罩编辑闭眼；--quality medium 就够）
   新姿势：images.py <pose> → 量脸 → <pose>_blink
   嘴：~/ml/LivePortrait/.venv/bin/python tools/art/lp_mouths.py <demo> --probe（哪些姿势有脸）→ make_stage.py 给它们写 "mouth": "lp"
       → ~/ml/LivePortrait/.venv/bin/python tools/art/lp_mouths.py <demo> --sheet（看 assets/lp_mouths/*_sheet.jpg）；没脸的姿势才出 <pose>_talk 遮罩差分
5  python3 scripts/make_plates.py（调色版背景）→ python3 scripts/make_stage.py → python3 tools/art/build_stage.py <demo>
   → python3 scripts/despill.py（品红幕角色）→ python3 scripts/make_trio.py
   → python3 tools/art/check_patches.py <demo> · check_cut_body.py · node tools/art/check_motion.js <demo> 60 --shots · node tools/art/check_mouth.js <demo> 240 [--alt]
   页面引用 ../../shared/layers.js?v=7 起（LivePortrait 嘴型组需要）；每次重跑 build_stage 给 media/layers.js?v= 加 1
6  python3 scripts/script_data.py && python3 scripts/voice.py --count && python3 scripts/voice.py && python3 scripts/make_l10n.py
7  页面：main.js / audio.js / index.html / style.css；python3 scripts/pages.py（生成 live/index.html）
8  python3 -m http.server 8765（仓库根）· PORT=<port> python3 scripts/make_cover.py · python3 tools/web/thumbs.py <Dir>
   python3 tools/web/check_cover.py <demo>
9  nav.js DEMOS + index.html .td-menu + credits.html 一行
10 python3 tools/qa/check_demo.py <demo> --full --checklist   → 0 FAIL
11 实时版：tools/talk/demos.json 加一项；scripts/live_smoke.mjs
12 README / WORKLOG / TASKS / HANDOFF；只提交自己的路径
```

## 8. 预算和时间（Demo43 实际）

| 项 | 实际 | 上限 |
|---|---|---|
| OpenAI gpt-image-2 | 30 次调用（6 设计、4 背景、4 姿势、14 差分 + 1 张嘴巴重画 2 次）≈ **$7.3**（按标价估） | $10 |
| Seedance | **0**（没有视频；上传被限流） | 1500 |
| ElevenLabs | **3,814 字**（105 句，547 s）+ 实时冒烟测试 3 轮（只有文字 agent，无 TTS） | 只合成剧本 |
| 时间 | 约半天（含两次会话中断）；出图并行约 10 分钟一批，`build_stage` 约 3–4 分钟一次，`check_demo --full` 约 6 分钟 | — |
- 省钱点：选中的设计图直接当基准姿势；黎明 = 调色版；三人同框和封面用抠图拼（0 张）；差分用 medium（≈ 1/4 价钱）。

## 9. 遇到的问题（详见 `DEMO_DESIGN_GUIDE.md` §11.1）

- 刘海横过眼睛的闭眼差分：补丁区域要不小于遮罩（收小反而 SEAM 变大）。
- 嘴改用 LivePortrait 嘴型组之前，画出来的张嘴差分问题很多（下面两条）；现在只剩没脸的特写还用它。
- 斜的笑嘴：一个椭圆会让张嘴的两端变淡、出现两颗虎牙 → 沿嘴线放 3 个重叠椭圆（`regions_mouth`）。第一张张嘴差分几乎看不见、第二张张太大，第三张用更小的遮罩 + 「细缝」提示词才对；多出的鼻孔点用 `scripts/fix_variant.py` 贴回原像素。
- 实时 agent 的回复会在下一轮重复（流式片段 + 整段 recap）→ 已在 `shared/talk.js` 修好。
- thermal 快速切换：要从"只热"到"只冷"，且切换时不能有人说话。
- 封面三人：§7.3 标准是"眼线中点 (72 %, 30 %)、脸高 16–26 %、所有脸在右半边" → `make_trio.py` 按 `face_points.json` 排人；英文标题太长会缩字 → 英文标题用短名。
- 品红幕角色的白毛领偏粉 → `scripts/despill.py`。
- 环境：`thumbs.py` 写死 8765 端口；`xcode-select` 被切到没接受许可的 Xcode，`/usr/bin/git`、`python3` 报错 → `export DEVELOPER_DIR=/Library/Developer/CommandLineTools`。
- 语音判定：英文里一句无关长句偶尔会被判成短选项「Help me」（`shared/voice.js` 的字母对匹配，影响所有 Demo，未改，留给 voice.js 负责人）。

## 10. 待确认

- 「もっと話す」按**人**选（每人固定在自己的场地）——比方案里的"地点 × 对象"少了组合；真假两版一致。要不要扩成地点 × 对象？
- 故事运行框架第二次复制时是否抽进 `_kit`。
