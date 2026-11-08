# MoHeat Demo Engine：统一模板 + Demo 之间零依赖（方案 B）· 第 1 阶段：分析与计划

> 用户 2026-11-08：「所有 Demo 应该来自同一个标准模板，像引擎一样；但 Demo 之间不能互相依赖，要全面整理修好。」
> 追加（同日，用户确认 **方案 B**）：**共用引擎 + 每个品类一个共用 kit**；Demo 永远不从**另一个 Demo 的文件夹**加载任何东西。
> 本文件只是分析 + 计划，还没有改任何代码。作者：后台 agent（统筹会话安排）。

## 一屏摘要

| 项目 | 结论 |
|---|---|
| **现状** | 39 个 Demo 文件夹里，**17 个在运行时依赖别的 Demo**（`<base href>` 3 个、跨文件夹加载 css/js 8 个、加载别的 Demo 的图 / 声音 10 个、页面里写死跳到别的 Demo 2 个；有重叠；其中 Demo33–35 是重做暂存、合并后自然消失）。另有 ~15 处**制作脚本**（`scripts/`）按路径引用别的 Demo（seedance.py、demo1.py 管线），~10 个 `assets/` 参考图符号链接。 |
| **重复** | 游戏 / 剧情类 ~20 个 Demo 的 `audio.js`、`main.js` 是"复制上一个再改"：兄弟 Demo 之间 `main.js` 40–50 %、`audio.js` ~55 %、`index.html` ~80 % 的行完全相同；影片类 Demo05–08 的 `main.js` ~80 %、`style.css` ~92 % 相同。修一个 bug 要改 20 份。 |
| **目标结构（B）** | ① `demos/shared/`（现有共用 UI）+ **`demos/shared/engine/`**（新：故事运行器、互动、DUAL 冷热、声音底座、舞台 / 封面、影片播放器、对话引擎）——所有 Demo 用；② **`demos/<品类>/_kit/`**（新）——同一品类共用的样式、封面风格、角色 / 场景素材库、品类专用 UI（直播间、信长对话）；③ Demo 文件夹 = **只有自己的内容**（`demo.js` 配置、`story.js`、`lines.js`、`l10n.js`、`style.css` 主题变量、`media/`），`index.html` 由 `tools/web/new_demo.py` / `build_pages.py` 从模板生成。 |
| **规则** | 页面 / 代码 / 素材只能来自：自己的文件夹、`demos/shared/**`、**自己品类**的 `demos/<品类>/_kit/**`、根目录 `device.js`。禁止：别的 Demo 文件夹、别的品类的 `_kit`、`<base href>`、指向文件夹外的符号链接（`media/` 内）。Demo 之间的跳转只能通过 `nav.js` 的数据（例如"下一集"），不能写死在剧情里。`check_demo.py` 的 `refs` 检查按此改写、不再接受 `allow_foreign` 例外，并新增全站 `tools/qa/check_deps.py`。 |
| **迁移顺序** | P0 工具与护栏（0.5 天）→ **P1 先解耦不重构**（把共用素材 / 样式搬进 `_kit`，修 `<base>`，1–1.5 天，最急的是 Demo20/15/16 依赖 Demo12 的 style.css，必须在 Demo12 重做合并前修）→ P2 引擎核心 + 一个试点（Demo31 或 Demo25，2–3 天）→ P3 按品类迁移（~25 个 Demo × 约 2–3 小时）→ P4 制作脚本搬进 `tools/`。合计约 **10–13 个 agent 工作日**，P3 可按品类并行。 |
| **验证** | 每个 Demo 迁移前后：`check_demo.py --full` 0 FAIL；新工具 `tools/qa/trace_demo.js` 在 `?auto=1`（+`&alt=1`）、固定随机种子下录下字幕时间线 + `#cmd` 冷热指令流 + 固定时刻截图，迁移前后**逐项一致**才算过。 |
| **需要决定** | 见文末 §6（7 条）：最重要的是改写 CLAUDE.md「不改旧 Demo、按路径 / 符号链接复用」这条规则；index.html 是否改为生成文件；影片类 1–9 只解耦还是也换播放器；引擎是否分版本。 |

---

## 1. 依赖清单（2026-11-08 扫描）

扫描方法：`grep` 所有 `index.html / *.js / *.css` 里的 `../DemoNN_…`、`../../<品类>/DemoNN_…`、`<base href>`；`find demos -type l` 看符号链接目标；`scripts/ project/` 里的 `DemoNN_` 字样。下面"类型"：**R** = 运行时（网页真的会请求，坏了网站就坏）、**L** = 页面里写死的链接（违反 §7.3"结束回本 Demo 封面"）、**B** = 只有制作脚本用（不影响网站）。

### 1.1 运行时依赖（R / L，必须修）

| Demo | 依赖什么 | 类型 | 为什么会这样 | 方案 B 里的去处 |
|---|---|---|---|---|
| nobunaga-suntory/**Demo41_IeyasuTalk** | `<base href="../Demo23_NobunagaTalk/">`：整页的 main/scenes/scripted/audio/lines/l10n/style + 13 MB 配音 | R | 三个对话 Demo 拆分时为了"代码只有一份"，用 base 指向 Demo23（`Demo23/scripts/pages.js` 生成） | 对话引擎 → `shared/engine/talk*`（通用）+ `nobunaga-suntory/_kit/talk/`（信长 / 家康的话题、场景、过渡句、配音）；41 = 薄页面 + `demo.js {cast:'I'}` |
| nobunaga-suntory/**Demo42_SengokuRoundtable** | 同上（`cast:'NI'`） | R | 同上 | 同上 |
| nobunaga-suntory/Demo23_NobunagaTalk | `scenes.js` 加载 Demo05 / 07 / 08 / 09 的背景图（`d9_bg_summit`、`d9_bg_tearoom`、`d7_bg_izakaya`、`d8_bg_tasting`、宴会背景）、Demo09 的人物立绘 | R | 地点 = 前几话的地点，直接借图 | 背景 → `nobunaga-suntory/_kit/places/`，立绘 → `_kit/cast/`（信长 / 家康，所有信长 Demo 共用） |
| nobunaga-suntory/Demo05–08 | `index.html`（互动卡片头像 `N_bust_grin` / `I_bust_chuckle`）、`media/data.js`（`ART='../Demo09_SengokuBanquet/media/art/'`）、Demo06 `style.css`（`banquet_bg.webp`） | R | 信长 / 家康的立绘最早在 Demo09 画，5–8 话重配音时直接借用 | `_kit/cast/`（Demo09 自己也改成从 kit 加载，见 §6 决定 1） |
| healing/**Demo16_FamilyCall2** | `<base href="../Demo15_FamilyCall/">`（整页代码、台词、声音）+ Demo12 的 style.css | R | 第 2 集与第 1 集同一套代码（`<body data-part="2">`） | 两集共用的电话剧情代码 → `healing/_kit/familycall/`；15、16 各自薄页面 + 各自台词 / 声音 |
| healing/Demo15_FamilyCall | `../../for-women/Demo12_LateCall/style.css`（**跨品类**）；结尾 HTML 写死 `<a href="../Demo16_FamilyCall2/">` | R + L | 当初复制了 Demo12 的电话 UI 样式；"未完待续"链到第 2 集 | 需要的样式搬进 `healing/_kit/phone.css`（或通用部分进 `shared/game.css`）；"下一集"改成 `nav.js` 的 `next:` 数据，由共用代码显示 |
| for-women/**Demo20_HinataHandshake** | `../Demo12_LateCall/style.css` | R | 同上（Demo12 的基础样式） | `for-women/_kit/base.css` |
| for-women/Demo24_GakuCamp | 封面 `#nextBtn href="../Demo12_LateCall/"`（"蓮からの電話へ"） | L | 旧"连播"设计遗留 | 删掉按钮（结束回本 Demo 封面，§7.3） |
| for-women/Demo33_RenNightCall · Demo34_JinVipRoom · Demo35_ShionRainyNight | 按路径加载原版 Demo12 / 21 / 22 的 style/lines/audio/main/l10n；`media/voice` 与背景图符号链接到原版 | R（临时） | 这三个是**重做暂存文件夹**（remake_page.py 生成），合并后消失 | 由 `merge_remake.py` 合并回 12 / 21 / 22 时自动变成本地文件；不需要单独处理，但合并必须在 Demo20/15/16 解耦**之后**做（见 P1） |
| healing/Demo13_NaomiCam | `../Demo11_Naomi/audio.js` + `ART='../Demo11_Naomi/media/art/'` | R | 宠物摄像头版复用直美的图和声音 | 直美素材 → `healing/_kit/naomi/`（art + 叫声合成），audio 底座 → 引擎 |
| healing/Demo26_BecomeNaomi | `../Demo11_Naomi/audio.js` | R | 同上 | 同上 |
| all-ages/Demo28_SnowFoxLullaby | `ART='../Demo01_SnowFoxfire/media/art/'` | R | 雪狐角色的图在 Demo01 | `all-ages/_kit/snowfox/`（Demo01 也从 kit 加载） |
| （已修）for-women/Demo24 ← for-men/Demo14 style.css | — | — | 2026-11-08 已修 | — |

**统计**：17 个 Demo 有 R/L 依赖（其中 3 个是重做暂存、会自然消失），被依赖最多的是 Demo12（5 处，跨品类 2 处）、Demo09（6 个 Demo）、Demo23（2 个 Demo 整页）、Demo11（2）、Demo15（1）、Demo01（1）。**所有共用素材都只在同一品类里使用**（唯一例外 Demo15/16 → Demo12 的 style.css 只是样式，可复制），所以"每个品类一个 kit"能装下所有合理的共用，不需要跨品类的素材库。

### 1.2 制作脚本依赖（B，不影响网站，P4 处理）

| 位置 | 依赖 | 去处 |
|---|---|---|
| Demo12 / 20 / 22 / 24 / 30 / 33 / 34 / 35 `scripts/seedance.py` | `import` Demo10 的 seedance 客户端（或 Demo16_HandshakeEvent 等已不存在的文件夹名） | `tools/seedance/client.py`（一份） |
| Demo03 / 04 / 09 `scripts/demo1.py`、`thermal.py`、`build_audio.py`、`prepare_art.py`；Demo08 `sengoku.py` | Demo01 / 02 / 09 的影片管线 | `tools/film/`（影片类管线） |
| Demo12 / 21 / 22 `scripts/prepare_video.py` | Demo20 的同名脚本 | `tools/seedance/prepare_video.py` |
| Demo10 / 12 `make_seedance_kit.py`、`prepare_art.py`、`audition.py` | Demo01 / 03 / 11 | `tools/` 或删除（一次性） |
| `assets/art/ref_style3.png`（Demo15 / 25 / 31）、`ref_hinata.png`（Demo18）、Demo04 `assets/reused_assets/fx_*`、Demo03 `project/art_src/*`（35 个） | 符号链接到 Demo12 / 14 / 03 / 02 的原图（`assets/` 不进 git） | 画风参考图 → `tools/art/refs/`（或各品类 `_kit/refs/`，不进 git）；其余保持（仅本机） |

## 2. 共同点清单（每个 Demo 都在重新实现的东西）

已经共用的（`demos/shared/`）：页面 UI 尺寸与一屏布局 `series.css`/`game.css`、顶栏切换 `nav.js`、语言 `subs.js`+`l10n_common.js`、语音回答 `voice.js`、影片类互动 `interact.js`/`scrub.js`、分层动画 `layers.js`、烟花 `fireworks.js`、全屏 / 引导 / 温冷检查、对话大脑 `talk.js`；根目录 `device.js`。

**还在每个 Demo 里复制的**（函数名在 20 个左右的 `main.js`/`audio.js` 里重复出现：`say` 34 次、`init/radar/output/command/stopOutput/emergencyStop/fresh/burst/panner/noiseSrc/lrCheck/finish/drawCover…` 各约 20 次）：

| 部件 | 现在的样子 | 引擎里的位置 |
|---|---|---|
| 页面骨架 `index.html` | 手抄（§7.3 写明"复制 Demo21 的骨架"），兄弟之间 ~80 % 相同 | 模板 `tools/web/templates/<family>.html` → 生成 |
| 故事运行器 | `run` 令牌 + `alive()`、`sleep`、`await say(id,{az,dist})`、`sub()`、`setStep()`、`start()`、`finish()` → 回封面 + Play again、`?auto / ?alt` 自动通关 | `engine/story.js` |
| 互动 | `choice()`（二选一 `.ch`）、`action()`（`.act-btn`）、`hold()`（长按，带 onTick）、说一句 `#micGate`、`pop()`、超时自动继续 | `engine/interact.js`（游戏类；影片类继续用 `shared/interact.js`） |
| DUAL 冷热 | `sources()` → 每耳 cool/heat；人声贴耳暖（按方位 / 距离 / 音量）、环境冷热、`breeze()` 渐变、强度滑杆、`command()` 生成 `DUAL LC.. LH.. RC.. RH..`、节流发送、STOP / 复位、四条表 | `engine/thermal.js`（`addSource`、`voiceWarmth`、`ramp`） |
| 雷达 | `radar(src, th)` 画声源方位 + 冷热光晕 | `engine/radar.js` |
| 声音底座 | `HTAudio`：AudioContext、压缩器、混响、HRTF `panner/place/chain`、噪声、`shot/burst/tone`、`loadVoices/say/voiceLevel`、`loops` 注册表、`lrCheck`、`setMuted` | `engine/audio.js`；常用环境声配方（雨、火、风、虫鸣、人群、街道）→ `engine/sfx/*.js` |
| 舞台 / 画面 | 16:9 canvas、`drawView` 视图交叉淡化、静帧 + `layers.js`、可选视频片段 `clips()/go()/playClip()`、`?cover=1` 封面 `drawCover()` | `engine/stage.js`、`engine/cover.js`（封面版式按 §7.3 统一，品类风格在 kit） |
| 主循环 | `loop()`：update → thermal → draw → output，`?render` 等参数 | `engine/core.js` |
| 字幕 / 语言 | 写 `.ja/.en`，`subs.js` 负责切换（已共用） | 不变 |
| 设备 | `device.js`（已共用） | 不变，引擎包一层 |

**家族**（迁移时分开处理）：
1. **分层剧情 / 约会类**（Demo12·20·21·22·24·25·28·29·30·31·15·16·26，以及在做的 33–35、43）——最大、最像，引擎的主要对象。
2. **直播间**（for-men Demo14·17·18·19；Demo24 的直播部分 `stream.css`）——在剧情类之上多一套聊天 / 礼物 UI → `for-men/_kit/stream/`。
3. **影片类 1–9**（`media/data.js` + `mix.m4a` + `thermal.csv` + `interact.js`/`scrub.js`，Demo05–08 的 `main.js` 80 % 相同；1–4 各自一套）——已是成片。
4. **游戏 / 解谜**（Demo10 洞窟、Demo11 直美、Demo13 宠物摄像头）——玩法各自不同，只能共用底座（声音、冷热、设备、封面）。
5. **对话引擎**（Demo23·41·42 + `live/` 私密实时版 + `server.py`）。

## 3. MoHeat Demo Engine 设计（方案 B）

### 3.1 三层结构与依赖规则

```
demos/
  shared/                         第 1 层：全站共用（所有品类都能用）
    series.css game.css nav.js subs.js l10n_common.js voice.js interact.js scrub.js layers.js fireworks.js
    fullscreen.js guide.js thermocheck.js talk.js            ← 现有文件，原地不动（避免全站 ?v 和路径大改）
    engine/                                                  ← 新
      boot.js        唯一入口：按 manifest 依次加载需要的模块（带版本号），再执行 demo.js
      manifest.json  模块 → 版本号（tools/web/bump.py 维护）
      core.js  story.js  interact.js  thermal.js  radar.js  audio.js  stage.js  cover.js  film.js  talkapp.js
      sfx/rain.js fire.js wind.js insects.js crowd.js …       可选的环境声配方
      templates/README.md                                    （模板本身放 tools/web/templates/）
  <品类>/
    _kit/                         第 2 层：本品类共用（只给本品类的 Demo 用）
      kit.css        品类主题（色、标题字体、封面风格）、品类专用控件
      kit.js         可选：品类专用 UI / 逻辑（例：直播间聊天、信长对话的地点和话题）
      cast/ places/ sfx/ refs/   本品类多个 Demo 共用的角色立绘 / 场景板 / 声音（谁也不"拥有"它们）
      README.md      kit 里有什么、哪些 Demo 在用
    DemoNN_Name/                  第 3 层：只放这个 Demo 自己的内容
      index.html     生成（tools/web/build_pages.py），不手改；只有 <!-- custom --> 块可手写
      demo.js        配置：品类、标题、角色、视图、声源、冷热、封面、credits、用到的 kit 模块
      story.js       剧情（async 函数，只调用引擎 API）
      lines.js  l10n.js  style.css（只放本 Demo 的特殊样式 / 主题变量）
      media/  scripts/  project/  assets/   与现在一样（§12.1）
```

各品类 `_kit` 的初始内容（来自 §1 的依赖）：

| 品类 | `_kit` 里放什么 |
|---|---|
| `all-ages/_kit` | 全年龄主题；`snowfox/`（Demo01 的雪狐 art，Demo01 + Demo28 用） |
| `healing/_kit` | 治愈系主题；`phone.css`（原 Demo12 的电话样式中 Demo15/16 用到的部分）；`familycall/`（Demo15/16/29 的电话剧情共用代码）；`naomi/`（直美 art + 叫声合成，Demo11/13/26） |
| `for-men/_kit` | 男性向主题；`stream/`（直播间 UI：聊天、礼物、配信画面，Demo14/17/18/19） |
| `for-women/_kit` | 女性向主题；`base.css`（原 Demo12 style.css 的公用部分，Demo20 等用）；Demo24 的 `stream.css` 若别的女性向直播也用就搬进来 |
| `nobunaga-suntory/_kit` | 信长系列主题（Shippori Mincho + 金色）；`cast/`（信长 / 家康立绘，原 Demo09）；`places/`（岐阜城天守、茶室、先斗町、山崎、宴会背景）；`talk/`（对话 Demo 的场景、话题表、过渡句、配音、live 页模板） |

**依赖规则**（写进 DEMO_DESIGN_GUIDE §12 / §14，check_demo 强制）：
1. Demo 的页面、代码、CSS、`media/` 只能引用：**自己文件夹**、`demos/shared/**`、**自己品类的** `demos/<品类>/_kit/**`、根目录 `device.js` / 站点首页链接。
2. 禁止：别的 Demo 文件夹（任何品类）、**别的品类的 `_kit`**、`<base href>`、`media/` 里指向文件夹外的符号链接（共用的东西一律放进 kit，不链接）。
3. `_kit` 只能引用 `demos/shared/**` 和本 kit 自己，**不能引用任何 Demo 文件夹**（kit 不依赖 Demo）。`shared/` 不能引用 kit 或 Demo。依赖只能向下：Demo → kit → shared。
4. 一份素材 / 代码被**同品类第二个 Demo** 需要时：搬进 `_kit`（原 Demo 也改从 kit 加载）；被**两个品类**需要时：通用的进 `shared/`，否则各自复制。
5. Demo 之间的跳转（"下一集"、系列顺序）只写在 `nav.js` 的 `DEMOS` 数据里（新字段 `next` / `series`），由共用代码显示；剧情代码和封面里不写别的 Demo 的地址。
6. `scripts/` 不 import 别的 Demo 的脚本；共用的制作脚本放 `tools/`。

### 3.2 引擎 API（草案）

```js
// demo.js — 一个 Demo = 一份配置 + 一个剧情函数
MoHeat.demo({
  id: 'Demo31_SummerRooftop', category: 'for-men', family: 'story',          // story | stream | film | game | talk
  kit: ['kit.css'],                                                           // 用到的本品类 kit 模块
  cover: { still: 'media/cover.jpg', titleSide: 'left' },                     // 封面文字在 index.html（生成）+ l10n.js
  cast: { nagisa: { lines: 'NAGISA_LINES', voice: 'media/voice/', warm: true } },   // 人声默认暖（§3 冷热规则）；雪女类 warm:false
  views: { arrive: { still: 'media/art/arrive.webp' }, fireworks: { still: '…', fx: ['fireworks'] } },  // 有 media/layers.js 时自动分层
  sounds: { crickets: { sfx: 'insects', az: -1.2, dist: 3 }, sea: { sfx: 'wind', move: true } },
  thermal: { ambient: { night: { cool: .15 } } },                             // 环境层；人声层自动
  update(S, dt) {}, draw(ctx, S, t) {},                                       // 可选钩子：本 Demo 的特殊画面 / 状态
  story: async (api, S) => {                                                  // 也可以写在 story.js
    await api.say('n01', { who: 'nagisa', az: -.6, dist: .5 });
    const c = await api.choice([['似合ってる', 'It suits you'], ['…なんで浴衣？', 'Why the yukata?']]);
    await api.hold('🍦', 'ほっぺに当てる', 'Hold it to your cheek', 4, (k) => api.thermal.ambient('ice', { R: { cool: k } }));
    api.thermal.ramp('breeze', { from: 'L', to: 'R', sec: 3, cool: .5 });
  },
});
```
- `api.say / choice / action / hold / sayIt / pop / sub / view / wait / sfx / loop / thermal.*` 统一；DOM class 不变（`.ch`、`.act-btn`、`#micGate`…），所以 `subs.js` / `voice.js` / `guide.js` / `check_mobile.html` 全部照旧工作。
- `?auto` / `?alt` / `?cover` / `?render` / `?sub` 由 `core.js` 统一处理，每个 Demo 自动可测。
- **影片类**：`MoHeat.demo({ family: 'film', data: 'media/data.js', mix: 'media/mix.m4a', thermal: 'media/thermal.csv' })`，`engine/film.js` 是 Demo05–08 播放器的合并版。
- **对话类**：`MoHeat.demo({ family: 'talk', kit: ['talk/'], cast: 'I' })`；`engine/talkapp.js`（通用对话循环 + `shared/talk.js` 的大脑）+ `nobunaga-suntory/_kit/talk/`（地点、话题、过渡句、配音、`live/` 模板）。三个 Demo 各自一个薄页面，**没有 `<base>`**；私密实时版 `live/` 页面由同一模板生成到各自文件夹（或 kit 里一份 live 页由 `server.py` 按网址选 cast，见决定 5）。
- **每个 Demo 的特殊需求**：先用配置和钩子（`update/draw/sources`）；还不够时在**本 Demo**的 `story.js` 里写；第二个 Demo 也要时搬进 kit；全站都有用时加进引擎（新选项默认关闭，旧 Demo 不受影响）。**不在 Demo 里改写引擎函数。**

### 3.3 页面由模板生成
- `tools/web/new_demo.py <品类> <DemoNN_Name> --family story|stream|film|game|talk`：建文件夹、`demo.js`/`story.js`/`lines.js`/`l10n.js`/`style.css` 骨架、`project/CHECKLIST.md`、`project/qa.json`，在 `nav.js` 的 `DEMOS` 里加一行（先隐藏）。
- `tools/web/build_pages.py [demo…|--all]`：从 `tools/web/templates/<family>.html` + `demo.js` 的封面字段生成 `index.html`（沿用 Demo23 `scripts/pages.js` 的做法，它会被这个工具取代）。改了 UI 骨架 → 全站重新生成一次，一个提交。
- `index.html` 只加载：`device.js`、`shared/engine/boot.js?v=N`、自己的 `demo.js`（+ `lines.js`、`l10n.js`、`media/layers.js`）。其余共用文件由 `boot.js` 按 `manifest.json` 带版本号加载 → **改了共用文件只要 `bump.py` 改 manifest 和 boot 的一个数字**，不用再改 40 个页面。

### 3.4 版本号与缓存
- `tools/web/bump.py`：改 `shared/**` 或 `_kit/**` 的文件时更新 `engine/manifest.json` 里对应条目，并把所有页面的 `boot.js?v=` 加 1（一个数字）。kit 的文件同样登记在 manifest（按品类分组）。
- 引擎**只有一个在用版本**（改一处全站生效）；保护旧 Demo 的办法是回归测试（§4.2 的 trace 对比在全站跑），不是冻结副本。真有不兼容的大改时才开 `engine/v2/`（决定 6）。

### 3.5 check_demo.py 怎么强制
- `refs`（G5，FAIL）按 §3.1 规则重写：解析 `index.html`、所有本 Demo 的 JS/CSS（含字符串里的 `'../DemoNN_…'`、`ART = '…'`、CSS `url()`）、`media/` 下的符号链接目标；允许前缀 = 自己、`../../shared/`、`../_kit/`、`../../../device.js`、`../../../`（首页）；其余一律 FAIL，并打印"搬进 `<品类>/_kit/` 或复制"的提示。**取消 `qa.json` 的 `allow_foreign`**（只保留 `--remake-of` 对重做暂存文件夹的临时放行）。
- `kit`（新，FAIL）：本 Demo 用到的 `_kit` 文件不能引用任何 Demo 文件夹；不能引用别的品类的 kit。
- `links`（G5）：`media/`、页面文件里的符号链接只能指向本文件夹内部。
- `nav-link`（新，FAIL）：剧情 / 封面里没有指向别的 Demo 的 `<a href>` 或 `location =`（Demo 之间的跳转只在 `nav.js` 数据里）。
- `engine`（新，迁移完成后从 WARN 升到 FAIL）：页面由模板生成（`index.html` 头部有生成标记且与 `build_pages.py --check` 一致），并且通过 `boot.js` 加载。
- 新工具 `tools/qa/check_deps.py`：全站扫描，输出依赖矩阵（Demo → 外部引用），`--fail` 在任何违规时返回 1；可以挂进 git pre-commit（决定 7）。`scripts/` 里跨 Demo 的 import 报 WARN（P4 后升 FAIL）。

## 4. 迁移计划

### 4.1 顺序（风险低的先做；每一步单独提交，可单独回退）

| 阶段 | 内容 | 涉及 | 估计（agent 时间） |
|---|---|---|---|
| **P0 护栏** | `tools/qa/check_deps.py`（输出 §1 的表）；`check_demo.py` 的 `refs/kit/links/nav-link` 按新规则（先 WARN 不挡人）；`tools/qa/trace_demo.js`（固定随机种子 + `?auto`：字幕时间线、`#cmd` 冷热流、固定时刻截图）；先给所有现有 Demo 录一份基准 trace | tools/ | 0.5 天 |
| **P1 解耦（不重构代码）** 按此顺序 | ① Demo24 删 `#nextBtn` ② **Demo20 / 15 / 16 不再加载 Demo12 的 style.css**（复制用到的规则进 `for-women/_kit/base.css`、`healing/_kit/phone.css`）——**必须在 Demo33→Demo12 重做合并之前** ③ Demo15 结尾"第 2 集"链接 → `nav.js` 的 `next` ④ Demo09 的信长 / 家康立绘 → `nobunaga-suntory/_kit/cast/`，Demo05–09、23 改路径；地点背景 → `_kit/places/` ⑤ Demo01 雪狐 art → `all-ages/_kit/snowfox/`，Demo01 + 28 改路径 ⑥ 直美 art + audio.js → `healing/_kit/naomi/`，Demo11 / 13 / 26 改路径 ⑦ Demo16 去掉 `<base>`：共用代码 → `healing/_kit/familycall/`，15 / 16 各自薄页面 ⑧ Demo41 / 42 去掉 `<base>`：对话代码 + 配音 → `nobunaga-suntory/_kit/talk/`，23 / 41 / 42 各自薄页面（这一步最大）。完成后 `check_deps.py` 应为 0，`refs` 升为 FAIL | 17 个 Demo | 1–1.5 天（①–⑥ 各 0.5–1 小时；⑦ 半天；⑧ 半天–1 天） |
| **P2 引擎核心 + 试点** | 从最新、最干净的剧情 Demo（Demo25 / 31 / 30 / 29）抽出 `engine/core/story/interact/thermal/radar/audio/stage/cover` + `boot.js` + 模板 + `new_demo.py` / `build_pages.py`；**试点：Demo31 或 Demo25**（已完成、没有会话在改）在暂存文件夹重做 → trace 一致 → `merge_remake.py` 合并 | shared/engine、tools/web | 2–3 天 |
| **P3 按家族迁移** | ① 分层剧情类：25 / 31 / 30 / 29 / 28 / 20 / 24（剧情部分）/ 26 / 15 / 16，然后 12 / 21 / 22（等重做合并后）、43（完成后）② 直播间：17 / 18 / 19 + `for-men/_kit/stream/`，14 等 Mint 重做合并后 ③ 对话类 23 / 41 / 42 → `talkapp.js` ④ 游戏 10 / 11 / 13：只换底座（声音 / 冷热 / 设备 / 封面），玩法代码留在本 Demo ⑤ 影片类 1–9：见 §4.3 | ~25 个 Demo | 剧情类每个 2–3 小时；直播间每个 ~2 小时；对话类 1 天；游戏每个半天；合计 6–8 天，可按家族并行（引擎本身只由一个会话改） |
| **P4 制作脚本** | `tools/seedance/client.py`、`tools/film/`、`tools/art/refs/`；各 Demo 的 `scripts/` 改成调用 tools；`check_deps` 的 scripts 项升为 FAIL | scripts/ | 0.5–1 天 |
| **收尾** | DEMO_DESIGN_GUIDE §6 / §7.3 第 6 点（"复制 Demo21 骨架" → `new_demo.py`）/ §12 / §14、CLAUDE.md、HANDOFF 更新；`audit.py` 清理被搬走的旧副本；§11.1 记教训 | 文档 | 0.5 天 |

**合计约 10–13 个 agent 工作日**；P1 做完网站上就已经"Demo 之间零依赖"，P2–P4 是"同一个引擎"。

### 4.2 每个 Demo 怎么验证
1. 迁移前：`trace_demo.js <demo>` 录基准（主分支 + `&alt=1` 分支，en/ja/zh 各一次封面截图）。
2. 迁移后（在暂存文件夹或分支上）：同样录一次，逐项比较：字幕出现的顺序与时刻（±50 ms）、`#cmd` DUAL 指令流（数值相同、时刻 ±1 帧）、选项 / 动作按钮出现的时刻、固定时刻截图（像素差 < 0.5 %，动画有随机的部分用种子固定）。
3. `python3 tools/qa/check_demo.py <demo> --full` 0 FAIL；`tools/web/check_mobile.html?only=<demo>` 7 种尺寸通过。
4. 合并用 `merge_remake.py`（同网址，旧版备份到仓库外），再跑一次 `check_deps.py`。

### 4.3 影片类 Demo 1–9
- P1 只做**解耦**（Demo05–08 的立绘改从 `nobunaga-suntory/_kit/cast/` 加载）；成片本身（`mix.m4a`、`thermal.csv`、`data.js`）不动。
- P3 建议：Demo05–09 共用 `engine/film.js`（它们的 `main.js` 80 % 相同，合并收益大、风险小）；Demo01–04 各自差别较大，**保持原样只解耦**，除非之后要改它们（决定 3）。

### 4.4 风险
- **行为细节丢失**：每个 Demo 复制后都有小改动（不同的冷热曲线、特殊画面）。→ trace 对比是硬门禁；先迁"最像引擎"的 Demo。
- **共用代码一改全站受影响**：→ 引擎改动必须在全站 trace 回归通过后才 bump；新功能默认关闭。
- **路径搬动造成断链 / Pages 打包失败**（§11.1 已有教训）：→ 每次搬动后 `find demos -xtype l`、`check_deps.py`、看 Pages build 状态。
- **缓存**：搬到 kit 的文件是新网址，不会有旧缓存问题；`boot.js` 的版本号必须由 bump.py 维护。
- **并行会话冲突**：见 §5。
- **对话类私密实时版**（`server.py`、`live/`、密码、limits）路径改变 → 一起测试 `start_demo.command` 三个地址。

## 5. 不和正在工作的会话撞车
| 正在进行的工作 | 冲突点 | 安排 |
|---|---|---|
| Mint → Demo14 重做（for-men 直播间，工作区有大量未提交改动） | Demo14 文件、直播间 kit | 直播间 kit 和 Demo14 迁移**等它合并后**再做；P1 不碰 Demo14 |
| Ren / Jin / Shion → Demo12 / 21 / 22（暂存 Demo33 / 34 / 35） | Demo12 的 style.css 被 20 / 15 / 16 加载 | **P1 第②步先做、尽快做**，并通知该会话：合并 Demo33→12 前确认 `check_deps.py` 里已没有指向 Demo12 的引用；12 / 21 / 22 的引擎迁移等重做合并后 |
| 眼睛 / 抠图修复 | `media/art`、`media/layers.js`、`shared/layers.js` | 引擎不改 `layers.js` 的行为，只把它纳入 boot 加载；P2 开始前确认修复已提交 |
| 手机 CSS（series.css / nav.js / guide.js） | 共用 UI 文件 | 这些文件**原地不动**；`boot.js` 上线前等手机 CSS 会话提交，并在同一个 bump 里改版本号 |
| 封面（cover.jpg / drawCover / check_cover.py） | 封面代码 | `engine/cover.js` 放在 P3 后段，按封面会话定下的版式抽取 |
| 新 Demo43+（Demo43_BlizzardInn 正在做，还没有 index.html） | 新 Demo 的写法 | 不阻塞：Demo43 按现在的方法做完，P3 再迁；P2 完成后的新 Demo 一律用 `new_demo.py` |

协作方式：在 `docs/engine/MIGRATION.md` 维护一张状态表（Demo → 阶段 → 负责会话 → trace 结果），迁移某个 Demo 前先在表里认领；`shared/engine/**` 和各品类 `_kit/**` 每次只由一个会话改；提交只带自己的路径（`git commit -- <paths>`），不 reset / rebase / amend；push 按统筹会话的规定。

## 6. 需要用户 / 统筹会话决定的事
1. **改写 CLAUDE.md 的旧规则**「Never modify earlier demos: reuse art by symlink and code by import-by-path」——它正是今天这些依赖的来源。建议改成：「Demo 之间零依赖；共用的东西放 `demos/shared/`（全站）或 `demos/<品类>/_kit/`（本品类）；为此可以改旧 Demo 的引用路径（行为不变，trace 验证）」。（必须决定，否则 P1 ④–⑧ 违反现有规则。）
2. **kit 文件夹名**：建议 `demos/<品类>/_kit/`（下划线开头，离 Demo 近，`../_kit/` 路径短；`nav.js` / 工具按 `Demo*` 匹配不会误认）。另一选项 `demos/shared/kits/<品类>/`。
3. **影片类 1–9**：只解耦（建议），还是 05–09 也合并成 `engine/film.js`（P3，约 1.5 天）。
4. **index.html 改为生成文件**（建议：是，手写只在 `<!-- custom -->` 块）。
5. **对话类私密实时版 `live/`**：每个 Demo 各有一份生成的 live 页（与公开版对称，建议），还是 kit 里一份由 `server.py` 按网址选 cast。
6. **引擎版本策略**：单一在用版本 + 全站回归（建议），还是每个 Demo 固定一个引擎版本（更稳但修 bug 不会全站生效，违背"改一处全站生效"）。
7. **pre-commit 钩子**：是否在 git pre-commit 里跑 `check_deps.py --fail`（建议在 P1 完成后开启，挡住新的跨 Demo 引用）。
