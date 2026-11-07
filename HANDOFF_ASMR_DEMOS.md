# MoHeat Evo — 冷热触觉 ASMR Demo 系列：交接文档 / Handoff

> 写给接手的 agent（Claude Code、Codex 等）和项目负责人。**先读完"必须遵守的约定"再动手。**
> **设计总则**（做新 Demo / 更新旧 Demo 的可复用标准：结构、冷热双层、声音、美术、动画、版式、流程、验收清单）见 [`DEMO_DESIGN_GUIDE.md`](DEMO_DESIGN_GUIDE.md)。
> 最后更新：2026-11-07（Demo 4 / Demo 9 已按用户要求互换编号：四季列车 = Demo 4，安土酒宴 = Demo 9）。状态：Demo 1–5 全部完成。Demo 4（四季列车）：程序绘制美术、16 条合成音轨、冷热 CSV、同步报告、播放器、MP4；Demo 9（安土酒宴）可选补 3 张道具图。

---

## 0. 必须遵守的约定（用户明确要求过）

| 约定 | 说明 |
|---|---|
| **用中文和用户沟通** | 代码、commit message、站点英文文案可以用英文 |
| **字幕只用日语 + 英文** | 适用于 Demo 2 及之后所有 Demo。播放器字幕、MP4 内嵌字幕、场景标题、封面都**不要中文**。内部文档可以保留中文列 |
| **Seedance 只在用户要求时用** | Demo 1–3 和 Demo 9：浏览器动画渲染出的 MP4 就是正式成品。Demo 4（四季列车）：用户（2026-11-07）想要更精致、有穿梭感的画面，要求给 Seedance 提示词；clip 到位之前浏览器 MP4 仍是现行成品 |
| **图片 / 视频默认用 Seedance：API 优先，不行就用网页端**（2026-11-08） | API（`~/.seedance_key`）能用就用；上传 429 且 `Retry-After` 很长或 401 时，立刻改用 seedance2-5.com 网页端（Chrome 扩展，用户本人登录）。提示词两边通用。视频省 credits / token 的细节见 `DEMO_DESIGN_GUIDE.md` §6.1。差分图必须"编辑上一张图"生成，保证构图一致。（早期 Demo 的美术是用户用 ChatGPT 按我们写的命令生成的）|
| **不修改、不覆盖之前的 Demo** | 新 Demo 复用旧素材用**符号链接/只读引用**，复用旧代码用**按路径 import**（见各 Demo 的 `demo1.py`）|
| **每次改动自动 commit 并 push 到 `origin main`** | 这是 GitHub Pages 站点仓库（`moheat-evo.github.io`），push 即公开。大文件（WAV/MP4/原始音乐）已在 `.gitignore` 中排除 |
| ~~Demo 1 的配音保持不变~~ | 2026-11-08 用户改为：Demo 1 也换成 ElevenLabs（见 §4 配音标准）|
| **Demo 2 的绫音 = ずんだもん 原声** | 不改音高、语调、音色；说话ノーマル，耳语ささやき |
| **配音默认一律用 ElevenLabs**（2026-11-08） | 新角色和重配音都用；旧 Demo 也已全部换成 ElevenLabs。标准和做法全在 §4「配音标准：ElevenLabs」，照做即可，不用重新研究 |
| **VOICEVOX 署名** | 使用 VOICEVOX 的 Demo 必须显示 `VOICEVOX:<角色名>`（播放器已自动显示） |
| **冷热：旧指令每只耳朵同一时间只能冷或热；DUAL 指令可同时** | 旧 Demo 的控制数据都经过"同侧冷热仲裁"（同侧冲突帧 = 0）。2026-11-08 起固件（`arduino/MoHeatEvoArduino.ino`，仅本地，备份 `.bak-20261108`）支持 `DUAL LC60 LH120 RC0 RH40`：四路独立、互不清零；旧写法不变。用户希望新 Demo 用它：**人贴着耳朵说话时，这只耳朵的热度跟着声音大小走**；环境（门外冷风、围巾、雪人…）作为另一层冷热，可与人声的暖同时出现在同一只耳朵。需要用户重新烧录固件 |

---

## 1. 仓库结构（`/Users/jiayixu/Desktop/MoHeat Evo`）

```
index.html, styles.css, script.js        品牌官网（不要随意改动风格；商业文案简短）
control.html/js, test.html/js, device.js 设备控制页、输出测试页、Web Serial 公共代码（所有 Demo 共用 device.js）
arduino/MoHeatEvoArduino.ino             ESP32 固件（.gitignore 排除，仅本地）
demos/all-ages/Demo1_SnowFoxfire/                 Demo 1《雪と狐火のひそひそ話》（原 `ASMR Demo/`）
demos/all-ages/Demo2_FanMeeting/                  Demo 2《キミだけのスペシャルファンミーティング》（原 `ASMR Demo 2/`）
demos/all-ages/Demo3_ShiningSmileConcert/         Demo 3《Shining Smile Melody — Ice & Fire Concert》
demos/all-ages/Demo4_SeasonsExpress/              Demo 4《四季暴走列車 / The Runaway Seasons Express》（原 `Demo_SeasonsExpress/`）
demos/nobunaga-suntory/Demo9_SengokuBanquet/              Demo 9《安土最後の酒宴》
demos/nobunaga-suntory/Demo7_KyotoIzakaya/                Demo 7《信長と家康、京都の居酒屋へ》（完成）
demos/nobunaga-suntory/Demo8_YamazakiDistillery/          Demo 8《信長と家康、山崎蒸溜所へ》（完成）
demos/nobunaga-suntory/Demo5_GifuCastle/                   Demo 5《信長の岐阜城へようこそ》（完成）
demos/all-ages/Demo10_CaveSpring/                 纯交互解谜《火をともして、ひみつの泉へ》（可玩，等 Seedance 背景）
demos/healing/Demo11_Naomi/                      纯交互治愈小游戏《ナオミと、ふわふわの一日》（用户家的猫 Naomi，Seedance 美术）
demos/for-women/Demo12_LateCall/                   纯交互深夜电话《もしもし、きこえる？》（原创男偶像 蓮，ElevenLabs）
demos/for-women/Demo20_HinataHandshake/           纯交互握手会《あと10秒だけ、ね？》（原创男偶像 陽向，ElevenLabs）
demos/for-women/Demo21_JinLounge/                 纯交互 VIP 休息室《俺だけ見てろ》（原创男偶像 迅，ElevenLabs，Seedance 2.5 Lite 动画）
demos/for-women/Demo22_ShionRain/                 纯交互雨夜《雨が止むまで》（原创男偶像 紫苑，ElevenLabs，Seedance 动画）
demos/healing/Demo15_FamilyCall/                 纯交互家庭电话《もしもし、おばあちゃん？》（外婆ハナ VOICEVOX:もち子さん，外公ゲン VOICEVOX:ちび式じい）
demos/healing/Demo13_NaomiCam/                   Naomi 监控摄像头版《ナオミ、いまなにしてる？》（复用 Demo 11 美术和音频）
demos/healing/Demo26_NekoNiNatta/                Naomi 第三作《ねこになった日》（你就是 Naomi，第一人称猫视角；主人 ElevenLabs kainushi）
demos/for-men/Demo14_LiveStream/                 女主播直播间 ①《ミントの、ささやき配信》（共用代码、美术、配音都在这里；详见该目录 README）
demos/for-men/Demo17_CocoaStream/                直播间 ②《ココアの、ほっこりカフェ配信》（只有页面+封面，<base href> 指向 Demo14）
demos/for-men/Demo18_HinataStream/               直播间 ③《ひなたの、激辛チャレンジ配信》（同上）
demos/for-men/Demo19_LunaStream/                 直播间 ④《ルナの、よふかし配信》（同上）
HANDOFF_ASMR_DEMOS.md                    本文件
AGENTS.md / CLAUDE.md                    给 agent 的入口（指向本文件）
```
- 官网首页 “INTERACTIVE DEMO / Every whisper, felt.” 区：左侧封面菜单（`assets/images/demos/demoN.jpg`）切换右侧 iframe（`demos/<name>/?embed=1`，只显示画面和进度条；点选时加 `&autoplay=1` 直接播放），默认 Demo 1。播放器下方的“设备输出示意图”（左/右耳冷热 %、耳罩发光、设备指令）直接读取 iframe 里 Demo 自己的 `#vLc/#vLh/#vRc/#vRh/#cmd`（同源），与真机输出一致。现在有 Demo 1–5 共 5 项；新 Demo 完成后在 `index.html` 的 `.td-menu` 里加一项，缩略图用该 Demo 的 `media/cover.jpg` 缩到 480×270。每个 Demo 的 `index.html` 都要有 `?embed=1` 那段 script + style。
- 2026-11-07 起所有 Demo 统一放在 `demos/DemoN_英文名/`。Demo 之间互相引用用同级路径（如 `demos/all-ages/Demo1_SnowFoxfire/tools`），播放器引用 `../../device.js`，`render_mp4.py` 的服务器根目录是仓库根。
每个 Demo 文件夹里都有自己的 `README.md`（运行方法、管线、交付物清单），本文件是总览和交接。

---

## 2. 环境（本机 macOS 26，Apple Silicon）

| 项目 | 状态 / 位置 |
|---|---|
| Python | 系统 `python3` 3.9；已有 numpy 2.0、scipy 1.13、matplotlib 3.9、Pillow 11。**没有** librosa / soundfile / torch / pyserial（Demo 3 的音乐分析特意只用 numpy/scipy）|
| ffmpeg / ffprobe | 9.0（Homebrew）|
| Chrome | `/Applications/Google Chrome.app`，headless 用于截图和逐帧渲染 MP4 |
| Swift | `/usr/bin/swift`，`demos/all-ages/Demo1_SnowFoxfire/tools/lift_subject.swift` 用 macOS Vision 抠图（素材是绿底时可用）|
| **VOICEVOX 引擎** | 0.26.1，`~/VOICEVOX-engine/engine`（3.9 GB，不在仓库里）。**agent 不能自己启动下载的二进制**（权限拦截），需要用户双击 `demos/all-ages/Demo1_SnowFoxfire/start_voicevox.command`。端口 `http://127.0.0.1:50021`。检查：`curl -s http://127.0.0.1:50021/version` |
| **ElevenLabs** | 已接好（2026-11-08）：key 在仓库根目录 `.env.local`（gitignore，**不要打开/打印**；验证用 `npx -y @elevenlabs/cli@latest onboard check --env-path .env.local`）；系统 python3 已装 `elevenlabs` 2.x + `python-dotenv`（`requirements.txt`）。不用再跑 onboard、不用再下载 skills |
| 本地预览服务器 | 在仓库根目录 `python3 -m http.server 8765`，然后打开 `http://localhost:8765/demos/<Demo 文件夹>/`。各 Demo 的 `start_demo.command` 会自动做这件事 |
| MP4 渲染端口 | Demo 1: 8766，Demo 2: 8767，Demo 3: 8768，Demo 9: 8769，Demo 4: 8770（`render_mp4.py` 自带服务器）|

---

## 3. 设备与协议（所有 Demo 通用）

- 固件命令（115200 baud，每行一条）：`LC<35..80> RH<0..200>` 等，`L/R/B` + `C`(冷)/`H`(热) + PWM；`stop` 全关。**写同一侧的 C 会清掉 H，反之亦然**。
- 默认 PWM 范围：冷 35–80，热 0–200（固件上限）。`test.html` 设置的范围保存在浏览器 localStorage（`moheat.range`），所有播放器共用。
- 播放器：Web Serial（`device.js`），最多 10 条命令/秒，变化时才发；暂停/结束/切走页面/断开/Esc/STOP → `stop`。
- 无浏览器播放：`python3 "demos/all-ages/Demo1_SnowFoxfire/tools/play_thermal_csv.py" --csv <csv> --audio <wav> --port /dev/cu.…`（需 `pip3 install pyserial`；`--dry-run` 可测试）。
- CSV 统一格式：`time_s, L_cool, R_cool, L_heat, R_heat, *_pwm, command`，20 Hz，已含设备延迟补偿（冷提前 0.35 s，热提前 0.60 s）。

---

## 4. 通用技术（Demo 1 建立，后续复用）

**管线**：时间轴文件（台词/音效/位置关键帧）→ `build_audio.py`（配音、音效、HRTF 双耳渲染、母带）→ `thermal.py`（四通道 CSV）→ `export.py`（字幕 + `media/data.js`）→ 浏览器播放器 → `render_mp4.py`（headless Chrome 逐帧 → MP4）。

- **双耳渲染**：`demos/all-ages/Demo1_SnowFoxfire/tools/build_audio.py::render()`，球形头模型（Brown–Duda ITD + 头影滤波）+ 近场 ILD + 房间混响，位置由时间轴模块的 `positions(times)` 提供（复用时把 `B.S` 替换成新 Demo 的时间轴模块）。
- **冷热控制器**：`demos/all-ages/Demo1_SnowFoxfire/tools/thermal.py`：50 ms RMS → 噪声门 → 归一化 → 曲线 → hold/attack/release → 距离 → 左右权重 → 设备延迟 → 同侧仲裁 `resolve_ear` → 8 s 剂量限制 → PWM。Demo 2 的 `ear_weights` 更锐利（归一化到较近的耳朵）。
- **美术处理**：`demos/all-ages/Demo1_SnowFoxfire/tools/prepare_art.py`：差分图对齐（缩放搜索 + 相位相关）→ 自动找脸部区域（眨眼/张嘴差异）→ **只合成脸部** → WebP（`media/art/` + `faces.json`）。手/道具也变化的差分要列入 `FULL_FRAME` 保留整张。
- **播放器**（`demo.js`）：Live2D 风格（呼吸、说话弹动、条带网格摆动、镜像、交叉淡化）；按配音 RMS 切换眨眼/口型/表情帧；粒子特效；冷热边缘光晕、雷达、四通道表、时间轴；URL 参数：`?t=95` 定格预览、`?cover=1` 封面导出、`?render=1` 离线渲染。
- **配音**：`demos/all-ages/Demo1_SnowFoxfire/tools/tts_voicevox.py`（`CAST` 配置、按表情选风格、停顿上限、音色 tone）；唱歌：Demo 2 `build_audio.py::sing()` 逐 mora 设定音高和时长。
- **封面**：`?cover=1` 截图 → `media/cover.jpg`（分享图、MP4 开头 2–3 s 标题卡、MP4 内嵌缩略图）。

### 配音标准：ElevenLabs（新角色默认；2026-11-08 用户确定）
- **共用工具 `tools/eleven/`（2026-11-08，全部 Demo 重配音用）**：`cast.json` = 所有角色的登记表（人设、Voice Design 英文描述、≥100 字日文样本、对比用旧音频、确认后的 voice_id）；`audition.py <角色…> [--again]` 每轮出 3 个预览（不占声音名额），汇总到 `tools/eleven/out/index.html`（本地）；用户说"角色 + 编号" → `pick.py <角色> <编号>` 存声音并写入 voice_id；`tts.py` 的 `speak()` / `voice()` 供各 Demo 的 `voice.py` 按路径 import。**模板**：`demos/for-women/Demo12_LateCall/scripts/voice.py`（`TAGGED = {id: 带标签台词}` + 缓存 + m4a）。
- **用户要求（2026-11-08）**：以前和新做的全部人声都用 ElevenLabs 重做，顺序 女性向 → 男性向 → 信长 → 其他；**每个角色先出试听、用户确认声音后才重做台词**，声音必须符合用户给的人设。
- **参数**：`eleven_v4`，`language_code='ja'`，`stability 0.4`，`similarity_boost 0.8`，`seed 7`。v4 只认 stability / similarity（没有 style、speed、SSML），语气全靠**英文方括号标签** + 省略号。台词用**带汉字的日文原文**（不用 lines.js 第 4 列的假名读音）。不加 VOICEVOX 时代的 EQ / 气声 / 变调。
- **标签约定**：每句写在 `ELEVEN = {id: '带标签台词'}` 里。人前甜 `[excited]` `[giggles]` `[surprised]`；撩 / 坏笑 `[playful]` `[chuckles softly]` `[laughs]`；**贴耳 `[whispers]`**；哈气 / 叹气 `[sighs softly]`；温柔 `[softly]` `[warmly]`；撒娇不满 `[pouting]`；好奇 `[curious]`。一句里可以换标签（如 `[laughs] あはは… [whispers] …かわいい`）。
- **进度**：女性向完成：陽向（Demo20）、蓮 ren r1_c（Demo12）、迅 jin r1_a（Demo21）、握手会女工作人员 staff_f r1_a（Demo20）。男性向完成：ミント mint r1_a、ココア cocoa r1_a、ひなた hinata_s r1_b、ルナ luna r1_b（Demo14 `scripts/voice.py`：每人一个默认标签 + 耳语 `[whispers]` + 个别句 OVERRIDE）。紫苑 shion r1_c（Demo22）。信长系列：信長 nobunaga r1_a、家康 ieyasu r1_a；Demo 9 已重做（`scripts/voice.py::perform()` 换成 ElevenLabs，文本用 cue 的假名读音 `tts` + 情绪标签 `TAG`，**不再强制 150 s**（用户 2026-11-08）：台词按自然长度，`voice.py::retime()` 在会撞到下一句的地方把后面整体往后推，写 `audio/retime.json`；`banquet.py` 末尾用 `W()` 把所有时间（cue、环境音时长、场景、位置关键帧、DURATION）映射过去，`CUES0` / `DURATION0` 是剧本原时间；Demo 9 现在 151.1 s；之后 `./build_all.sh` + `render_mp4.py`，QA 全过）。Demo 5–8 也已重做（共用 `tools/eleven/retime.py`：`make_voice.py` 写 `retime.json`，时间轴模块末尾 `_R.apply(globals(), ROOT)`；顺延规则算上耳语前 0.45 s 的吸气；`perform()` 加 10 ms 淡入 / 60 ms 淡出；耳语混音电平 Demo 5/6/7 −25.5 dB、Demo 8 −27 dB，保持 大笑 > 说话 > 耳语 的热度）。片长：5 = 150.1 s、6 = 164.3 s、7 = 157.3 s、8 = 152.5 s、9 = 151.1 s。QA：6–9 全过；Demo 5 家康"声音↔热度相关度"0.68（门槛 0.70，ElevenLabs 停顿更长），未降门槛，如实保留。Demo 6 的 `build_all.sh` 第一步 `cutout_whisky.py` 需要仓库外的 `../suntory/*.png`，没有时从 `make_voice.py` 开始逐步运行。其他：コハク kohaku r1_b（Demo10）、ハナ hana r1_c + ゲン gen r1_a（Demo15/16）已重做（按标点自动配标签 + OVERRIDE）。用户（2026-11-08）决定 **Demo 1 也换**（推翻"Demo 1 配音不变"）、**綾音的说话和歌都换**（歌用 ElevenLabs 音乐生成重做）：小雪 koyuki r1_b + 焔 homura r1_c（Demo 1，160.5 s：`tools/retime_voices.py` + `story.py` 的 W()，`build_audio.py` 的 `BACKEND = "eleven"`、`EL_TAG` 按表情配标签）；綾音 ayane r1_a（Demo 2，150.8 s），迷你演唱会的歌 = ElevenLabs Music `song_a`（`project/song/`，原 4 句歌词；整首歌跟着綾音左→右，只有分离出的人声 `vocal_a.mp3` 驱动热；字幕按歌里的词时间；人声和伴奏直接相减分不开，所以不做伴奏分轨）。Demo 3 用真实授权歌曲、没有 TTS；Demo 4、Naomi 没有人声。**全部人声已换成 ElevenLabs（2026-11-08）。** 注意：Demo 2 加载 Demo 1 的 build_audio 时要设 `B.N`（片长不再都是 150 s）；渲染端口被别的会话占用时 Demo 7 可用 `RENDER_PORT=…`。
- **已有声音**：全部在 `tools/eleven/cast.json`（陽向 = `lODKQ6pXINFtajDz9nqR`；Demo20 试听时存下的 v1 / v3 没用上，名额满时可删，先问用户）。
- **额度**：账号是 **Creator 档**（每月 12 万字符，30 个声音名额，可商用）；一轮试听 3 个预览，一个 Demo 全部台词约 500–1000 字符。
- **坑**：`pcm_44100` / `pcm_48000` 要 Pro 账号，用 `pcm_24000`；页面署名写 `<角色> ElevenLabs`（VOICEVOX 角色仍写 `VOICEVOX:<名>`）。 Voice Design 会拒绝含真实人物名字的描述（信长、家康）：描述里写成"虚构的战国武将角色"。

---

## 4b. 角色动画标准（Seedance 视频，2026-11-08 用户确认，所有新 Demo 必须照做，避免返工浪费 credits）

用户对 Demo20 的反馈：画质低（Lite 720p 被拉伸）、镜头之间衔接不顺。以后**第一次就按下面做**：

1. **模型 / 价格**（seedance2-5.com，4 秒一段）：默认 **Seedance 2.5 Lite 1080p = 64 credits**（720p = 40，画质不够，不要用）。2.0 Pro 720p ≈ 244、2.0 Pro 1080p = 604、Seedance 2.5 1080p = 680：只有用户点名才用。账户 credits 多个会话共用，大批量（> 约 1000）先问用户。
2. **首尾帧模式**：Image to Video → First & Last Frame → 打开 Add end frame，16:9，4 s，关掉不需要的选项。首帧 / 尾帧 = demo 里实际显示的静帧（1920×1080 JPG）。
3. **每个镜头切换都要有过渡动作片段**（首帧 = 前一画面静帧，尾帧 = 后一画面静帧），不能只靠叠化：例如 握手台→握手、握手→左耳、左耳→握手、握手→右耳、右耳→挥手。左右对称的画面用镜像图做首尾帧（只镜像循环片段，过渡片段要单独生成）。
4. **循环片段**：首帧 = 尾帧 = 同一张静帧；每个画面一段"说话"、需要时再一段"安静"。
5. **后处理**（`Demo20_HinataHandshake/scripts/prepare_video.py` 可复用）：模型的尾帧色调会比首帧漂一点 → 逐帧把片段的开头 / 结尾混合回对应的静帧，保证每段首帧、尾帧和静帧完全一致；输出 1920×1080 H.264（不要再缩到 720p）。
6. **播放**：同一画面内的片段只在"回到静帧"的那一刻切换（片段结尾），不在中途交叉叠化（会有重影）；剧情要换画面时等当前循环播完再播过渡。
7. **网页操作**：上传用 `file_upload` 到隐藏的 file input（删掉一侧图片再上传会补到空的那一侧）；下载用详情面板的 Download（文件到 ~/Downloads，名字是 `video_batch_xx.mp4`，按提示词 / 画面核对后再改名）。API `GET /generations/<id>` 约 10 分钟后会 503，API 上传有长时间限流 → 视频优先用网页。
8. 提示词模板和每段的首尾帧记录在 `Demo20_HinataHandshake/project/web_video_prompts.json`，新角色照抄改动作描述即可。

## 5. 各 Demo 状态

### 所有 Demo 共用的封面和字幕样式：`demos/shared/series.css`（2026-11-07）
- 每个 Demo 的 `index.html` 都在 `demo.css` 之后加载 `../shared/series.css?v=N`。`.stage` 设为容器（`container-type: inline-size`），封面和字幕的尺寸全部用 `cqw`，随**播放画面宽度**缩放：手机嵌入、官网菜单、整页、1920×1080 封面截图看起来一样。
- **统一的封面版式**：
  - 标题居中；只有一个角色在右边时（`.hero.a`），标题居中在左边的空白里。
  - 顶部小字统一为 `MoHeat Evo · Binaural ASMR × Thermal Haptics · Demo N`。
  - 信长系列在小字上方加金色徽章 `<p class="series">信長シリーズ 第N話 · Nobunaga Series Ep. N / 5</p>`。
  - 道具排、标签、按钮使用同一套尺寸。
- **小屏规则**（`@container (max-width:620px)`）：隐藏小字、提示和署名，标签排成一行，道具缩小，确保 Start 和 Left/Right check 按钮完整显示。
- **字幕**：日语 2cqw、英文 1.3cqw；小屏时分别为 3.2cqw、2.4cqw。九个 Demo 一致。
- 字体和配色仍由各 Demo 自己决定：前四部用圆体，信长系列用金色明朝体。
- 改封面后要重新截图（`?cover=1`，用 `--timeout=7000`，带动画循环的页面不能用 virtual-time），并更新 `assets/images/demos/demoN.jpg`。新 Demo 也要加载这个样式表。

### 信长系列：剧情顺序 = 编号顺序（2026-11-07 用户要求剧情连贯，按剧情重新编号）
| # | 文件夹 | 剧情 | 承上 / 启下 |
|---|---|---|---|
| 5 | `Demo5_GifuCastle`（原 Demo 9） | 1569 年岐阜城，**第一次见面**："光里走出来一个人……你说你来自未来？" | 结尾送你"天下布武"印 |
| 6 | `Demo6_FutureWhisky` | 你带未来的威士忌回访安土："哦，未来的客人！自岐阜一别以来啊" | "后会有期" |
| 7 | `Demo7_KyotoIzakaya` | 两人来到现代京都的居酒屋 | 结尾："下次，带我们去好酒诞生的地方！" |
| 8 | `Demo8_YamazakiDistillery` | 山崎蒸馏所，认出"那晚在安土喝的酒" | 家康想带一桶回安土；你："下次我带这桶酒去安土拜访" |
| 9 | `Demo9_SengokuBanquet`（原 Demo 5） | 安土最后的酒宴，你："约好的酒桶，带来了"；信长："等你很久了" | 系列结局（暴风雨之夜、"这样的夜晚不会再有"） |
- 改编号时对调了文件夹、全仓库文字引用、缩略图和官网菜单。Demo 6–8 和 Demo 5 用 `sengoku.py` 按 `Demo*_SengokuBanquet` 名称找安土酒宴的模块，不受影响；封面上的人物图路径已改为 `../Demo9_SengokuBanquet/`。
- 以后改信长系列的台词，要先确认它和前后两部的承接不冲突。

### Demo 1 · `demos/all-ages/Demo1_SnowFoxfire/` ✅ 完成
- 角色：小雪（冷）/ 小焰（热）；ChatGPT 美术在 `art/chatgpt/`，设定图 `art/Character.jpg`，房间背景 `room_bg`。
- 配音：ずんだもん（两人用音高/风格区分）。字幕：日 + 英。
- 重建：`./build_all.sh`（需 VOICEVOX）→ `python3 tools/render_mp4.py`。成品：`output/final_1080p.mp4`（本地）。

### Demo 2 · `demos/all-ages/Demo2_FanMeeting/` ✅ 完成
- 角色：星乃綾音（`A_` 前缀），ChatGPT 美术 `art/chatgpt/`（35 张），设定图 `art/A_Character.png`。
- 热 = 绫音人声（含原创歌曲，VOICEVOX 逐音唱）随她的位置；冷 = 扇子/冰饮/冷气/魔法，各自独立位置。检查：左右同时异温 4 次、左右交替 17 次、同侧冲突 0（`output/thermal_checks.json`）。
- 配音：ずんだもん 原声。字幕：日 + 英。萌妹音试听保留在 `output/audition/`（本地）。
- 重建：`./build_all.sh` → `python3 tools/render_mp4.py`。成品：`output/final_1080p.mp4`。
- 代码复用 Demo 1：`tools/demo1.py` 按路径加载（同名模块冲突，不能直接 import）。

### Demo 3 · `demos/all-ages/Demo3_ShiningSmileConcert/` ✅ 完成
- 真实歌曲 *Shining Smile Melody – Jpop*（ZTMusic, Pixabay），来源/许可/哈希见 `assets/music_original/SOURCE.md`；原曲 MP3 不提交。
- 音乐分析（numpy/scipy）→ 88.2 BPM 半拍（≈176），剪辑 170.04 → 150.000 s（去掉 131.33–150.43 s 间奏 7 小节）。
- 两种冷热模式：A 纯音乐、B 音乐 × 舞台位置（默认）。`scripts/check_sync.py` 全部通过。
- 美术：Demo 2 素材通过 `project/art_src/` 符号链接只读引用 + Demo 3 新素材（舞蹈、麦克风、演唱会舞台四状态、观众、特效）。
- 重建命令见 `README.md`；成品 `video/final/final_concert_150s.mp4`、`audio/final/final_stereo_150s.wav`（本地）。
- 无歌词字幕（没有授权的歌词文本），只有段落标题（日/英）和片尾音乐署名。

### Demo 4 · `demos/all-ages/Demo4_SeasonsExpress/` ✅ 完成 —《四季暴走列車 / The Runaway Seasons Express》
- **任务书要点**（用户提供的完整制作指令）：
  - 150 s，1920×1080，30 fps，48 kHz 双耳声。第一人称坐在魔法列车车厢里朝前看，**无角色、无台词、无旁白**。
  - 画风必须和 Demo 1–3 一致：可爱日系 2D、粉彩、赛璐璐。**不要浮世绘或金箔风**（那是 Demo 9 的风格）。
  - 车厢全程不变，只变左右两扇窗外的季节。
  - 时间轴：
    - 0–20 冬（左冷）
    - 20–45 夏（右热、左窗残霜）
    - 45–70 热带暴雨（左雨冷、右阳光热，冷感随雨从左移到右）
    - 70–95 冰火隧道（左冷右热 → 短暂中性 → 左热右冷）
    - 95–125 四季失控（快速左右变化，含一段**全静音、冷热归零**）
    - 125–150 春天樱花站（轻柔，150 s 时全部归零）
  - 冷热来自各环境音的**独立音轨** RMS（风、雪、冰、雨 → 冷；夏风、火、熔岩、蒸汽 → 热）。阳光、热浪这类无声的视觉事件用**设计好的包络**，不能假装从音频推出温度。背景音乐和列车声不驱动冷热。
  - 音轨要求：winter_wind, snow, ice_cracking, summer_breeze, ocean_waves, tropical_rain, water_drops, thunder, fire_crackling, lava, steam, spring_breeze, birds, train_wheels, train_interior, background_music。
  - 交付物：thermal_4ch.csv（3000 点，0–149.95 s）、thermal_mapping_config.json、audio_features.csv、thermal_energy_curves.png、storyboard_150s.md、visual_prompts.md、reuse_inventory.md、synchronization_report.md、README.md；目录结构已按任务书建好。
  - 验收：至少 4 次清晰的左右环境移动、至少 2 次左右同时相反温度、一次清楚的冰火左右反转、一段静音零输出、平静的春天结尾。
- **2026-11-07 进展（ChatGPT 没有额度，用户要求直接生成素材）**：
  - **美术全部由代码绘制**：`scripts/art_train.py`、`art_scenery.py`（Python → SVG → headless Chrome → PNG），文件名和尺寸与 `ChatGPT素材命令.md` 一一对应，以后有 ChatGPT 图可以直接替换。
    - 车厢是真实的一点透视投影；`train_interior_{day,dusk,night}` 的窗玻璃是透明的；`master` 是绿幕版；另有 `window_mask.png` 和 `window_geometry.json`（窗/门玻璃多边形、时钟、吊灯位置）。
    - 四个季节的 far/mid/near 横向无缝；另有冰墙/熔岩墙、春天车站、5 张玻璃层、8 张特效图；Demo 3 的 4 张特效用符号链接复用。
    - `scripts/make_style_sheet.py` → `assets/style_sheet.png` + `storyboard/frames/*.jpg`（6 个场景的合成预览）。
  - **音频**：`scripts/seasons.py` 是唯一时间轴（音源包络、方位、距离、冷热角色、设计包络、静音段 110–114 s、乱季窗户表 `CHAOS`）。`scripts/build_audio.py` 程序合成 16 条音轨，用 Demo 1 的 HRTF 双耳渲染混音（约 20 s）。
  - **冷热**：`scripts/thermal.py` 计算各音轨 RMS × 权重 × Demo 2 左右分配（与双耳渲染用同一方位），加两个设计包络（右窗阳光、左窗残霜），再软饱和，最后经过 Demo 1 的延迟补偿、同侧仲裁和剂量限制，输出 `thermal/thermal_4ch.csv`（3000 行）。
  - **验收**：`scripts/check_sync.py` 全部通过（10 次左右移动、7 段左右相反温度、冰火反转、静音全零、春天平静归零、同侧冲突 0、每个驱动声源的 ILD 方向与冷热侧一致、冷热比声音提前约 0.3/0.6 s）。
  - **播放器**（`index.html` / `demo.js` / `demo.css`，基于 Demo 3）：
    - 窗户按 `window_geometry.json` 的玻璃多边形裁剪，里面是视差滚动的景色（左窗向左滚、右窗向右滚），加上程序绘制的天气、玻璃层和闪电。
    - 车厢日 / 黄昏 / 夜交叉淡化，叠加窗外颜色溢光和灯光；时钟指针由程序绘制（乱季时快转，熄灯时停住，之后倒转）。
    - 列车晃动和车轮声使用同一个速度积分；樱花站随刹车滑入；110–114 s 熄灯。
    - `scripts/export.py` → `media/`；`scripts/render_mp4.py`（端口 8770）→ `video/final/final_seasons_express_150s.mp4`；`--at 10,30` 只渲染预览静帧。
    - 封面：`?cover=1` 截图 → `media/cover.jpg`（cover 模式不跑动画循环，headless 截图才不会卡住）。
  - **成品**：`video/final/final_seasons_express_150s.mp4`（本地，98 MB）：1920×1080、30 fps、4500 帧、48 kHz 双耳声，音画都是 150.000 s，内嵌封面。
  - **文件夹整理**：已从根目录 `Demo_SeasonsExpress/` 移到 `demos/all-ages/Demo4_SeasonsExpress/`，根目录的临时兼容链接（`ASMR Demo`、`ASMR Demo 2`、`Demo3_ShiningSmileConcert`）已删除。
    - `scripts/demo1.py` 会向上找到含 `device.js` 的仓库根，再在 `demos/` 或旧路径里找 Demo 1/2/3，所以以后再移动也能用。
    - 复用特效链接：`assets/reused_assets/*.png → ../../../Demo3_ShiningSmileConcert/assets/effects/`。
    - 官网菜单已加第 5 项（`assets/images/demos/demo4.jpg`）。
  - **用户反馈修改（2026-11-07）**：
    - **封面看起来像中文**：标题「四季暴走列車」全是汉字。现在日语用带假名的「季節が、暴走する。」，英文 *THE RUNAWAY SEASONS EXPRESS* 做大标题（冰蓝→火橙渐变）；结尾卡改为「終点・さくら駅」，场景名改为「春のさくら駅」。**以后日语标题一定要有假名**，避免被看成中文。
    - **冲击力不够**：封面背景改用 68 s 的冰火隧道帧（左冰右火，`scripts/make_cover.py`），加强冷暖对比光、速度线和粗体斜体大字。
    - **车窗太小**（用户说了两次）：第一次的放大因为修改脚本中途报错其实没有写进去，只移开了窗帘。现在 `art_train.py` 是大观景窗：`WIN` z 1.08–4.3、y −0.34–0.95，天花板起拱线 `CORN` 抬到 1.14，去掉行李架，壁灯移到 z 5.1。两扇窗占画面左右的大部分，仍保留窗框和窗帘。
      - 播放器里窗外景色不再按窗户大小缩放，而是把图层的地平线（y≈590）对齐视线高度（消失点），比例 1.05；隧道墙按窗高缩放。`BOX` 只取画面内可见的部分，天气和玻璃层画在这个范围内。
      - 教训：一个修改脚本里有多处 assert 时，前面失败会导致后面全部没写入；改完要 grep 确认。
    - **开头太慢太长**：所有时间按原任务书网格编写，再由 `seasons.tw()` 统一映射（`WARP_OLD → WARP_NEW`）：冬 20→12 s，多出的 8 s 分给隧道（+3）和乱季（+5），熄灯仍是 4 s（现在是 107.5–111.5 s），春天不变。播放器 `TW()`、`build_audio.py`、`check_sync.py` 用同一映射。冬天风雪不再淡入、列车快 20 %，封面只停 1.8 s，景色滚动速度 V 从 520 提到 660。
    - 新时间：冬 0–12、夏 12–37、暴雨 37–62、隧道 62–90（中性 73–77）、乱季 90–125、春 125–150。验收全部通过（12 次左右移动、9 段相反温度）。
  - **全景玻璃车厢（用户要求，2026-11-07）**：`art_train.py` 改为观景车。
    - 腰板很低（`SILL` −0.80；用户说车底部分太高，从 −0.36 降下来），腰板以上的侧墙和整个拱顶都是玻璃。景色比例改为 1.35，填满更低的玻璃。：木质拱肋（`RIBS` 间隔 0.78 m）、纵向黄铜横杆、车顶木梁挂吊灯，窗台上有小盆花；窗帘、壁灯、行李架都已去掉。
    - 没画的地方就是透明玻璃。`window_geometry.json` 的 left/right_glass 现在是左右半个画面，播放器按半边铺景色，所以头顶也能看到天空和隧道顶。
  - **节奏和标题页（用户反馈，2026-11-07）**：
    - **断电段**：原来 4 s 全黑无声，看起来像结束了。现在是 108.5–110.5 s 共 2 s：车厢灯灭、车厢暗到一半左右，玻璃外是明亮的蓝紫色极光夜空和飞驰的星星（`dark` 外观 = `stars`）。第一版太暗，平均亮度 20，用户仍觉得是全黑；现在约 86。检查方法：用 ffmpeg 抽 2 fps 灰度图算平均亮度，低于 70 的段就是"黑屏"；前有下滑的"断电"音，后有上升的"通电"音（在 `train_interior` 音轨，不驱动冷热）。冷热仍是 0。
    - **乱季每 2 s 切换**：`seasons.py` 的 `CHAOS_FILM` 表直接按成片时间生成乱季段的音源包络、方位、蒸汽和打雷，同一个声音不会在相邻两格里跳到另一侧。
    - **前段节奏**：各音源都有 2–3 s 的阵风或脉冲（`PULSE`），阳光有云影明暗，冬天整片暴风雪（风、雪、冰）每 2–3 s 左右扫一次，夏风两次扫到左边。窗外天气的浓淡跟着对应音源的包络变化（demo.js 的 `gust()`）。
    - **冷热算法**：改为同一侧、同一种冷或热的音源能量先相加，再整体换算成强度（参考电平取 99.5 百分位、动态范围 30 dB、曲线 1.5、峰值 0.95）。原来是每个音源各自归一化后相加，几个音源一叠就顶在 0.8，没有强弱。春风功率权重 0.05。
    - **标题页**：和其他 Demo 统一（Demo 1 的居中版式；Zen Maru 圆体日语大标题「季節が暴走する／魔法の列車」、英文副标题、日英双语冷暖胶囊标签）。背景用 68 s 的冰火隧道帧，左冰右火代替 Demo 1 两侧的角色。
  - **ChatGPT 美术命令 v2（2026-11-07）**：`ChatGPT素材命令.md` 已按现在的设计重写（全景玻璃车厢、玻璃区域 #00FF00、钟不画指针、景色地平线在 y≈590、上半大片天空可透过车顶看到、新增 `night_aurora_far.png`）。做法是"按现有版式重画成高质量插画"：版式参考图是当前程序画的整套 PNG，备份在 `project/chatgpt_layout_refs/`（仅本地，已加入 .gitignore）。
    - 用户把新图按同名放回 `assets/` 后要做的事：从 master 抠绿幕得到 day/dusk/night 的透明玻璃；重新测量时钟中心和半径、吊灯位置、门窗多边形，写入 `window_geometry.json`；接上 `night_aurora_far`（目前 `dark` 外观的天空是程序绘制的 `stars`）；然后 `export.py`、`make_cover.py`、`render_mp4.py`。
  - **Codex 生成美术初版（用户要求，2026-11-07）**：内置 image_gen 按 v2 清单及现有布局生成 **36 张**新 PNG，保存在 `project/generated_art/`（仅本地，gitignore）。包含车厢母版与三种光线、四季远中近景、暴雨、极光、冰火墙、樱花站、道具、玻璃层及粒子。最后一张 `fx_season_swirl.png` 遇到 `usage_limit_reached`（429），按清单兜底规则符号链接引用现有程序版本，所以包内共 37 项。`project/generated_art_manifest.json` 记录逐张提示词、来源与限制；`scripts/review_generated_art.py` 检查尺寸/透明度并生成 `project/generated_art_qa.json` 和本地 `project/generated_art_gallery.html`。尺寸与透明通道检查全部通过。**尚未接入播放器或重渲染成片**：需要抠绿、重新测量几何、光线差分对齐、滚动接缝检查；车厢远处第三盏灯不够清晰，可用独立 `lamp.png` 补足。方形素材的生成器原始输出保留在默认生成目录，工作区副本已用 sips 统一为 1024×1024，保留 alpha。Demo 1–3、5 未修改。
  - **魔法漩涡已替换（2026-11-07）**：用户将 3 个 Seedance 候选放在桌面 `Demo4_魔法漩涡参考图/`，选用 `video_batch_9a (1).mp4` 的 **1.1 s** 帧（蓝色冰晶与粉色花瓣清楚、轮廓完整）。原片复制到本地 `video/seedance/fx_season_swirl_selected.mp4`；`scripts/import_season_swirl.py` 用 ffmpeg 居中裁切、缩至 1024、抠黑底 → `assets/seasonal_chaos/fx_season_swirl.png`，再由 `export.py` 导出 WebP。播放器保留两次触发、2.4 s 旋转/扩大/淡出，漩涡改用 `screen` 滤色叠加，避免原 `lighter` 过曝；声音和冷热不变。生成素材包中的符号链接也指向新版，manifest/QA 已更新为 36 张内置生成 + 1 张用户 Seedance 素材。已检查两处出现画面；本地正式 MP4 同步重渲染。其余 36 张美术初版仍未接入。
  - **Seedance 暂停**：用户说"先不管 Seedance"。`Seedance素材命令.md` 和 `project/seedance_refs/` 还是旧的大车窗版本，以后要用时需要按全景车厢重新生成首帧图，并把提示词里的 "two huge panoramic side windows" 改掉。
  - **Seedance（用户要求，2026-11-07，已暂停）**：`Seedance素材命令.md` 里有 15 个图生视频镜头（S01–S15，每个 ≤10 s，熄灯段 107.5–111.5 s 不生成）。内容包括通用提示词、负面提示词、每个镜头左右窗的季节和事件时间，都与 `seasons.py` 一致。
    - 首帧和尾帧图：`scripts/make_seedance_refs.py` → `project/seedance_refs/S##_{start,end}.jpg`（播放器 `?clean=1` 干净渲染，`render_mp4.py --at … --clean`）。
    - 用户把生成的视频放进 `video/seedance/S01.mp4` … `S15.mp4` 之后：**下一步**写合成脚本，按时间轴剪辑和调速（24→30 fps），叠加 0–1.8 s 封面、场景标题、熄灯黑场和结尾卡，再与 `audio/final/final_binaural_150s.wav` 合成。冷热 CSV 不变。还要检查每个 clip 的左右季节是否画反。
  - **以后可选**：如果 ChatGPT 有额度，可按 `ChatGPT素材命令.md` 生成同名文件替换程序绘制的图，然后运行 `export.py` 和 `render_mp4.py`。

### Demo 9 · `demos/nobunaga-suntory/Demo9_SengokuBanquet/` ✅ 完成 —《安土最後の酒宴 / The Last Banquet at Azuchi》
- **第一人称台词（2026-11-07，用户："少了我的参与"）**：`banquet.py` 的 `CUES` 末尾追加了 7 句 `Y`（你）的台词，只出字幕、不配音，都放在两位大名说话的空档里并回应他们：失礼します／乾杯／ひとくちだけ／その先……ですか？／あったかい／ずっとここにいたい／はい、必ず。追加在末尾是为了让已配音台词的序号（`TAKE`）不变。`build_audio`、`export`、`docs`、`check_sync`、CSS 都已支持 `you` 类型；QA 检查你的台词是否压在配音上。
- **方向**：以 `demo9.jpg` 设定板为准，**B 细密浮世绘·金箔装饰风**、写实成年人比例（Q 版已淘汰，见 `project/discarded_chibi_drafts/`）。
- **角色与冷热**：織田信長坐左前方 → 他的声音主要驱动 **L_Heat**；徳川家康坐右前方 → **R_Heat**。冷感来自风/雨/冰镇等环境（按设定板：冷气、风、雨；热：火焰、热酒蒸汽、炭火）。
- **已有素材**（用户仍在陆续生成，开工前先 `ls assets/*/` 确认）：`assets/characters/N_Character.png`、`I_Character.png`、`N_bust_base.png`、`I_bust_base.png`、`N_ear.png`、`I_ear.png`；`assets/stage/banquet_bg.png`。
- **素材命令**：`ChatGPT素材命令.md`（已更新为浮世绘金箔风，含设定板追加的道具/场景/特效）。还缺：信长其余口型与表情、家康全部半身/表情、贴耳特写、动作、道具、风雨夜背景、特效。
- **配音（用户的 Demo 9 配音要求要点）**：
  - 必须有情感，不能是平淡机械的 TTS。每个角色全片只用一个声线。
  - 每句台词要定义：说话人、情绪、语气、空间位置、对谁说。尽量生成多个候选，挑最自然的。
  - 信长：低沉、有威严、有魅力，会豪爽大笑，也会低声说话。家康：中低音、温和沉稳，语气更柔。
  - 先生成自然的表演，再调整时间轴、动画和环境音来配合，总长严格 150 s。允许停顿、呼吸、轻笑，必要时可以对话重叠。
  - 不能只靠音量制造近距离感，要用 HRTF、距离衰减、直达声/混响比；靠近耳朵时，动作、朝向、声音位置、音量、热感要同步。
  - 热感用各角色独立的干声轨计算 RMS：大笑最热，普通说话中等，轻声弱但能感觉到。
  - QA 检查项：两个声音能区分、发音自然、情绪对、没有切音、口型对、位置对、热感和语音能量一致。
- **配音试听已生成**：`audio/audition/`（本地，`scripts/voice_audition.py` 可重建，需 VOICEVOX）。候选：
  - 信長：**青山龍星**（低沉；有熱血/喜び/しっとり/囁き 等 7 种风格，首选）、玄野武宏、剣崎雌雄、麒ヶ島宗麟、離途。
  - 家康：雀松朱司、麒ヶ島宗麟、玄野武宏、青山龍星（しっとり/囁き）、暁記ミタマ（有ささやき）、黒沢冴白。
  - 用户反馈（2026-11-07）：家康选 **黒沢冴白**，但要更苍老；信长在 **青山龍星 / 玄野武宏** 之间，旧版笑声不自然；两人的声音都要贴合历史人设。
  - v2 人设试听：`scripts/voice_personas.py` → `audio/audition/v2/`。人设参数（音高、语速、胸腔共鸣、沙哑颗粒、暗化、轻微颤音）都在 `PERSONAS` 里。笑声改为逐 mora 合成：「はっはっは」音高逐个下降，加促音停顿和呼气声。家康有 3 档苍老程度（年長 / 更年長 / 老成）。
  - **信長 = 青山龍星（已选定，v2/v3 人设参数）**。
  - 家康在 v2 里仍然"太高"。v3 先把 VOICEVOX 音高压到 −0.1，再做合成后变调（`shift()`：ffmpeg asetrate + atempo，语速不变、共鸣也变低沉），做了 −2 / −3.5 / −5 半音三档，平均音高约 104 / 96 / 88 Hz（信长约 107 Hz）。
  - **家康 = 黒沢冴白「低沈-2」（已选定）**：VOICEVOX pitch −0.1、合成后 −2 半音、语速 ×0.88、胸腔 +5 dB、轻微颤音。
  - 用户又反馈"信长不够低"：v4 做了青山龍星降 1.5 / 3 / 4.5 半音三档，**用户选定 −1.5 档**（VOICEVOX pitch −0.06、合成后 −1.5 半音、胸腔 +5 dB、沙哑颗粒 0.24）。
  - **最终声线已锁定**：`scripts/voice_personas.py` 的 `FINAL = {"N": "信長_青山龍星_低沈-1.5", "I": "家康_黒沢冴白_低沈-2"}`；正式配音直接用这两个 `PERSONAS` 参数和 `laugh()`。
- **已完成（2026-11-07）**：
  - 素材检查：第 1–4 优先、4 道具、2 背景、3 特效齐全；6 张差分的暗色背景残留由 `prepare_art.py`（base 透明遮罩）自动清除。设定板追加的 12 张未生成，播放器用程序绘制的火焰/蒸汽/冷气/风/雨/金箔代替；若用户补 `prop_brazier` / `prop_ice_bucket` / `prop_hot_sake`，播放器自动换用。
  - 剧本与时间轴 `scripts/banquet.py`（6 场景、30 句；每句含说话人、情绪、语气、位置、对谁说）→ `storyboard/script_150s.md`（`scripts/docs.py` 生成）。
  - 配音 `scripts/voice.py`：锁定声线，每句 3 个 take 在 `audio/takes/`，`TAKE` 字典选用；先生成表演再按实际长度排时间轴。
  - 音频 `scripts/build_audio.py`：两人干声、热酒蒸汽/炭火（热）、冰镇/风/雨（冷）、琴、铃虫、雷 → HRTF 双耳 → `audio/final/mix_48k.wav`（-18 LUFS）。
  - 冷热 `scripts/thermal.py`：信长声 → L_Heat、家康声 → R_Heat（同一人一个响度标尺：大笑 > 说话 > 耳语），环境冷热按各自位置；同侧冲突 0、左右反温 19 次、左右切换 16 次。
  - 播放器 `index.html / demo.js / demo.css`，封面 `media/cover.jpg`，渲染 `scripts/render_mp4.py`（端口 8769）→ `video/final/final_banquet_150s.mp4`（本地）。
  - QA `scripts/check_sync.py` → `analysis/qa_report.json` 全部通过。一键重建 `./build_all.sh`。
- **可选后续**：用户试听 `audio/takes/` 后换 take；补 3 张道具图后重跑 build + 渲染。

---

### Demo 7 · `demos/nobunaga-suntory/Demo7_KyotoIzakaya/` ✅ 完成 —《信長と家康、京都の居酒屋へ》
- **Demo 7 已完成（2026-11-07）**：
  - **素材**：用户的 7 张图从桌面收进 `assets/bg/`（`d7_bg_pontocho`、`d7_bg_izakaya`，另有备选 `d7_bg_pontocho_alt`）和 `assets/props/`（beer、yakitori、highball、atsukan）。嗨棒图的格子底是画进去的，已抠掉。"开窗"背景没做，播放器用推近窗户代替。
  - **结构**：照搬 Demo 6（Demo 9 的角色图通过 `artBase` 读取），时间轴 `scripts/izakaya.py`，`build_all.sh` 约 30 s，渲染端口 8771。
  - **场景**：先斗町 → 居酒屋 → 推近窗户看鸭川 → 居酒屋；道具依次出现，带日英名称牌；穿越金光让角色出现、消失（`PRESENT`）；干杯时你举起当时的道具。
  - **冷热**：冷是雪夜风（左右交替）、冰啤、嗨棒、窗外河风；热是两人的声音，加上炭火（左前）和热燗蒸汽（右）。QA 全部通过：左右切换 23 次、相反温度 36 段、0 冲突。
  - **注意**：暖的环境音不要和同侧那位大名的台词重叠，否则 QA 的"声音和热的相关性"会掉到 0.7 以下；把暖源放在说话者的另一侧。
  - 你的字幕台词 7 句；`render_mp4.py --at …` 可以只渲染预览静帧；封面用 `--timeout=7000` 截图；官网菜单已加第 7 项。
### Demo 8 · `demos/nobunaga-suntory/Demo8_YamazakiDistillery/` ✅ 完成 —《信長と家康、山崎蒸溜所へ》
- 用户（2026-11-07）：信长和家康穿越到现代，京都居酒屋和三得利山崎蒸馏所"各做一个，剧情不一样"。两部都和 Demo 6（你带威士忌去安土）呼应；Demo 8 是时间环：两人尝到这酒，才认出是"那晚在安土喝过的"。
- 每个文件夹里有：`README.md`（剧情、角色位置、冷热来源、管线）、`storyboard/script_150s.md`（日英台词 + 时间 + 冷热）、`Seedance素材命令.md`（Demo 7 有 14 个镜头 K01–K14，Demo 8 有 12 个镜头 Y01–Y12）。
- 画面由用户制作：先用 ChatGPT 或任意生图工具做关键帧（以 Demo 9 的 `N_Character.png` / `I_Character.png` 和表情、姿势图为人物参考），再用 Seedance 图生视频。交付位置：`assets/keyframes/`、`video/seedance/`。
- 声音和冷热沿用前几个 Demo：信长在左前（声音 → 左耳热），家康在右前（→ 右耳热），声线锁定；"你"的台词只出字幕。冷热来源：Demo 7 是冰啤酒、嗨棒冰块、鸭川夜风 / 炭火、热燗、关东煮；Demo 8 是晨雾、熟成库、泉水、冰块 / 发酵桶蒸汽、铜制蒸馏器。
- **2026-11-07 进展**：
  - **桌面素材包** `~/Desktop/MoHeat_Demo7-9_Seedance素材/`（`demos/nobunaga-suntory/Demo7_KyotoIzakaya/scripts/make_seedance_kit.py` 生成，直接读三份 `Seedance素材命令.md`）。每个镜头一个文件夹：放好要上传的参考图（硬链接）、完整的关键帧 prompt、Seedance 动作 prompt 和负面 prompt；`index.html` 一页列出所有镜头，带复制按钮、"已完成"勾选和参考图缩略图。
  - 用户把关键帧存成 `<镜头号>_关键帧.png`、视频存成 `<镜头号>.mp4`，放回同一个镜头文件夹。之后从桌面收素材。
  - **台词表已写成代码**：`scripts/izakaya.py`（Demo 7，23 句配音）、`yamazaki.py`（Demo 8，20 句）、`gifu.py`（Demo 5，15 句），格式和 Demo 6 一样（`cues_common.py`）。
  - **配音已生成**：`scripts/make_voice.py` 按名称找到安土酒宴的 `voice.perform`，用锁定声线每句 3 个候选，写入 `audio/takes/` 和 `takes.json`（时长）。试听文件复制到桌面素材包的 `配音试听/`，每个 Demo 有一份 `00_台词连播_*.m4a`。
  - 草稿时间偏短：不少句子比预留时间长（例如 Demo 5 家康第二句 10 s），正式时间轴要按 `takes.json` 的实际时长重排，150 s 里可能要删减或合并台词。
- **画面方案改了（2026-11-07）**：用户觉得逐镜头的 Seedance prompt 太多。现在不做视频，改为**可复用图片 + 浏览器动画**，和 Demo 1–6 一样。
  - 角色**不重画**，直接复用 Demo 9 的信长、家康全部角色图（参照 Demo 6 用 `artBase` 读取 Demo 9 `media/art` 的做法）。
  - 新素材只有背景和道具，共 21 张：Demo 7 有背景 3 张（其中 1 张是编辑上一张）、道具 4 个；Demo 8 有背景 4 张、道具 2 个；Demo 5 有背景 4 张、道具 4 个，其中鹈饲船是横向的透明道具，播放器里让它从左滑到右。
  - 背景都按 Demo 9 宴会厅的构图画（你坐在中间，左右三分之一前景留空），并尽量设计成坐着的场景（居酒屋包间、品酒室、观赏船、茶室），这样 Demo 9 的坐姿图可以直接用。画风统一用 Demo 9 的浮世绘金箔风。
  - 清单和提示词由 `demos/nobunaga-suntory/Demo7_KyotoIzakaya/scripts/make_image_kit.py` 生成，写到每个 Demo 的 `ChatGPT素材命令.md` 和桌面 `~/Desktop/MoHeat_Demo7-9_图片素材/`（每张图一个文件夹：参考图 + `prompt.txt`；`index.html` 带复制按钮；`配音试听/` 也移到了这里）。旧的桌面 Seedance 素材包已改名为 `（旧方案_可删除）`。三份 `Seedance素材命令.md` 都标了"已停用"。
- **下一步**：用户听配音、挑候选或改台词，并生成背景和道具 → 按实际时长排正式时间轴 → 播放器（复用 Demo 9/6 的播放器，按场景切换背景） → 配音（需要用户启动 VOICEVOX）→ 拿到 clip 后按台词剪辑，合成双耳音频和冷热，生成 MP4 和播放器。
- Seedance 的口型不会和配音对上：长台词剪在说话镜头上，耳语用遮嘴或侧脸构图。
- Demo 8 涉及三得利商标：AI 画面里不出现可读的商标，酒瓶用 Demo 6 的真实图合成；公开前需向三得利确认。

### Demo 5 · `demos/nobunaga-suntory/Demo5_GifuCastle/` ✅ 完成 —《信長の岐阜城へようこそ》
- **Demo 8 / 9 已完成（2026-11-07）**：
  - **共用播放器**：Demo 7 的 `demo.js` 已改成通用版，三个 Demo 都用它。各 Demo 的不同之处写在时间轴模块的 `VIS` 里，由 `make_export` 传给播放器：每个背景的天气（`bgfx`：snow / mist / dust / fireflies）、推近镜头（`zoomRect`）、道具的日英名称和尺寸、哪些道具冒热气。新增 `boat` 类提示，让图片横穿画面并带篝火光（Demo 5 的鹈饲船）。
  - **素材**：Demo 8 的 6 张、Demo 5 的 8 张都已收进各自的 `assets/`。Demo 8 品酒时的山崎酒瓶用 Demo 6 抠好的图，干杯的嗨棒用 Demo 7 的。
  - **规则**：暖的环境音放在说话者**同一侧**，并和他的台词对齐（Demo 8 的蒸馏器）；如果放在不说话的那一侧，那位大名的"声音和热的相关性"会掉到 0.6。冷的放在对侧。你的字幕台词那里各加一阵冷风，增加左右切换。
  - **QA 全部通过**：Demo 8 左右切换 21 次、相反温度 37 段；Demo 5 左右切换 22 次、相反温度 45 段。
  - 渲染端口：Demo 7 是 8771，Demo 8 是 8772，Demo 5 是 8773。官网菜单已有 9 项。三个 Demo 的封面都补了暖色 `.chip.h` 样式。
- 用户（2026-11-07）："再来个岐阜城的？"。设定：1569 年夏天的岐阜城（刚改名、开始用"天下布武"印），你是来自未来的客人，信长亲自导览，盟友家康同行。灵感来自弗洛伊斯 1569 年访问岐阜：信长亲自带他参观宫殿和山顶，还亲手上菜。
- 场景顺序：山脚宫殿、庭院瀑布 → 登金华山顶看浓尾平原 → 信长亲手点茶、家康拿到冰室的冰 → 夜晚长良川鹈饲 → 送你一张盖了"天下布武"印的纸。画风和 Demo 9 一样（浮世绘金箔），11 个镜头 G01–G11。
- 冷热亮点：鹈饲的篝火船从左划到右，热感跟着船从左耳移到右耳。冷：瀑布水雾、山顶大风（左→右）、冰室之冰、夜晚河风。
- 印章文字后期叠加（AI 生成的字会变形）。其余流程和 Demo 7、8 相同。

### Demo10_CaveSpring ✅ 可玩 —《火をともして、ひみつの泉へ》（纯交互解谜，2026-11-07）
- 用户要求"纯交互的 demo、解谜：找火源、点亮、吹灭蜡烛、进山洞看到水"。**没有时间轴、没有 MP4**；声音在浏览器实时合成（Web Audio HRTF），冷热按同一方向实时计算，同侧冲突 0（`CAVE.conflicts()`）。
- 流程：小屋（篮子里的枯草 + 抽屉里的火打石 → 囲炉裏打火 3 下 → 吹气让火种烧起来 → 手燭借火 → 出门）→ 洞口（4 支蜡烛：真火热、狐火冷，选中后耳朵分辨，吹灭 3 支狐火；吹灭真火就全部复燃）→ 洞穴岔路 ×2（跟着水声和凉风走；另一边闷热的死路，有蝙蝠）→ 地底泉（吹灭手燭，湖水发光，摸水一侧变凉）→ 结束回到封面、设备 `stop`。
- 引路狐狸**コハク**：代码绘制（Q 版神社狐、红绳铃铛），台词气泡日 + 英，配音 **VOICEVOX:猫使ビィ ノーマル**（用户从 6 个正太音候选中选定，参数不改）。台词表 `lines.js`（第 3 列是 TTS 读音），`scripts/voice.py` → `media/voice/*.m4a`。
- 画风同 Demo 1–4（粉彩赛璐璐）。现在全部由 `art.js` 代码绘制；用户说 ChatGPT 没额度，**素材全部用 Seedance**：`Seedance素材命令.md` 有 7 段 5 s 背景循环（构图参考图在 `project/layout_refs/`）。放进 `assets/video/<名>.mp4` 后播放器自动替换背景；到货后要重新测 `GEO`、去掉重复的代码火焰、压成 720p 再提交。
- 麦克风只取音量；没有麦克风时长按 Blow 按钮或空格键。`?scene=gate|tunnel|spring` 跳关测试，`?cover=1` 封面，`?shot=<bg>` 干净背景。
- 已加入 `nav.js`（第三组 "Interactive game"）和官网菜单（缩略图 `assets/images/demos/Demo10_CaveSpring.jpg`）。

### Demo11_Naomi ✅ 可玩 —《ナオミと、ふわふわの一日 / A Fluffy Day with Naomi》（纯交互治愈小游戏，2026-11-07）
- 用户要求"和小猫动态交互的治愈向小游戏，小猫像我家的 Naomi"。Naomi 性格：**乖乖、软软、好欺负**。用户照片在 `demos/naomi/`（**不进 git**），拼成参考图 `project/seedance_refs/naomi_photos.jpg`（也不进 git）。
- Naomi 外观：长毛蓝灰 × 白双色，额头到鼻子白色倒 V，粉鼻子，黄绿色眼睛，白色大围脖，四只白手套，尾巴深灰蓬松。
- 流程：早上闭眼听脚步 → 左耳嗅嗅 → **冰凉鼻子碰左耳**（左冷）→ 睁眼摸头（呼噜 = 前方暖）→ 蹭左脸再蹭右脸（左暖 → 右暖）→ 白天叫名字（麦克风音量或按钮，她在右边猫爬架上回应后走过来）→ 逗猫棒抓 3 次（羽毛风 = 羽毛方向冷）→ 吹凉猫饭（呼气两耳冷）→ 戳 3 下（不生气）→ 翻肚皮、摸肚子 → 雨夜在腿上睡觉（两耳暖）→ 变暗、おやすみ → 回封面 `stop`。同侧冲突 0（`NAOMI.conflicts()`）。
- 声音全部浏览器实时合成（`audio.js`：呼噜、喵（共振峰合成）、肉垫脚步、嗅、雨、鸟…）。没有角色配音。以后如果用户提供 Naomi 真实的叫声 / 呼噜录音，可以替换合成音。
- 美术：**Seedance API 直接生成**（用户指定），`scripts/make_jobs.py` → `scripts/seedance_images.py`（按路径加载 Demo 10 的 API 客户端）→ `scripts/prepare_art.py` → `media/art/*.webp`。坐标/尺寸在 `game.js` 的 `POSE_H` 和各步骤的 `setPose(...)`。
- 已加入 `nav.js` 和官网菜单（缩略图 `assets/images/demos/Demo11_Naomi.jpg`）。

### Demo13_NaomiCam ✅ 可玩 —《ナオミ、いまなにしてる？ / What's Naomi Up To? · Pet Cam》（2026-11-07）
- 用户要求"监控版的 Naomi：相当于我在家里的摄像头看她"。你在外面，用手机看客厅摄像头；声音和冷热都**以摄像头朝向为准**（转动镜头，她的暖、窗边的风、雨声都跟着转）。
- 流程：接通（雪花噪声）→ 她躲在猫窝里，用 **🌡 サーモ（热成像）** 找到她（声音和露出的尾巴尖是提示）→ 按住 🎤 对讲叫两次 → 她走到镜头前（**冰凉鼻子碰镜头 = 两耳凉**，在屏幕上摸她 → 左脸/右脸蹭摄像头 = 左暖/右暖）→ 激光笔抓 3 次 → 她热得摊平 → **🌀 扇风机，拖动瞄准风向（风吹向哪边哪边凉）**把她吹凉 → 自动喂食器 → 21:08 红外夜视 + 雨，房间变冷她发抖 → **🔥 电热毯**（两耳由凉变暖）→ 说晚安 → 门口钥匙声（右）、她跑去迎接你 → 回封面 `stop`。📸 可保存截图。同侧冲突 0（`NAOMICAM.conflicts()`）。2026-11-07 完整通关测试：2:39、7 颗心、0 冲突、0 报错。
- 美术和音频**按路径复用 Demo 11**（`../Demo11_Naomi/media/art/`、`audio.js`），不改 Demo 11；摄像头效果是 WebGL 着色器（桶形畸变、色差、噪点、暗角、红外、雪花）+ OSD 画布。喂食器为代码绘制。
- 已加入 `nav.js` 和官网菜单（在 Naomi 之后，缩略图 `assets/images/demos/Demo13_NaomiCam.jpg`）。`Demo12_LateCall` 是另一个会话在做的，编号已被占用。

### Demo26_NekoNiNatta ✅ 可玩 —《ねこになった日 / The Day I Became Naomi》（2026-11-08）
- 用户要求"再给 Naomi 设计一个 demo"，从 4 个方案里选了"你就是 Naomi"。**第一人称猫视角**（离地 25 cm，画面里只有两只白爪子，Naomi 只在窗玻璃倒影里出现一次）；耳机 = 她的耳朵。冬天的星期六，主人（原创，20 多岁女生，用户指定；不露脸，只出现腿、手、毛衣）在家。
- 流程：猫窝醒来，**猫耳雷达**（拖动左右两个耳朵转盘 / A D ← →，耳朵朝向的声音变清楚；只改声音不改冷热）找到台所 → 窗台：霜花玻璃（左冷）+ 冬日阳光（左暖）同一只耳朵 DUAL，云遮住后点地上的光斑跳过去 2 次 → 冰箱冷气沿地面吹到猫的高度（二选一：凑近 / 蹭腿）→ 烘干的衣物，**长按往里钻**（越深越暖、越闷：共用 AudioContext 的总线低通）→ 主人找猫、掀开、左耳「みーつけた」→ 回「にゃ」→ 夜里趴在主人胸口（心跳、体温），二选一 ふみふみ / まるくなる → 贴耳「おやすみ」→ 封面 `stop`。
- 声音：主人 = ElevenLabs `kainushi` r1_a（用户选），15 句 52.8 s（`scripts/voice.py`）。Naomi 的呼噜 / 猫叫 / 脚步 / 鸟 / 室内底噪：**按路径加载 Demo11 的 `audio.js`**，在 `audio.js` 里把同一个 AudioContext（destination 换成本 Demo 的总线）交给它，所以闷声效果对所有声音都生效。其他（水壶、开罐头、冰箱、烘干机、布料、心跳）程序合成。
- 美术：画风与 Naomi 系列一致（用户）：`scripts/make_jobs.py` 按路径读取 Demo11 `make_jobs.py` 的 `LOOK` / `NAOMI` / `AVOID` / 风格图；参考图 = 风格图 + Demo11 客厅 + 确认过的 `window_sill`（视角锚点）。API 上传被限流（429，约 4.7 h）→ 网页端 GPT Image 2，16:9 2K，7 张（窗台第一版视角不对，重画一次），约 175 credits。
- QA：两条分支自动通关 1:54 / 1:48，0 报错，结束 `stop`；桌面三种尺寸 + 手机 / 平板（no-serial）一屏。视频没做（静帧优先，用户要求时再做）。
- 已加入 `nav.js`（Demo13 之后）、官网菜单（缩略图 `assets/images/demos/Demo26_NekoNiNatta.jpg`）、`credits.html`。没有给所有页面升 `nav.js?v=`（Demo24 / 25 加列表时也没升；别的会话正在改那些页面）。

### Demo12_LateCall ✅ 可玩 —《もしもし、きこえる？ / Can You Hear Me?》（纯交互，2026-11-07）
- 用户要求"和喜欢的男爱豆打电话，不要 Q 版"。**原创角色**「蓮（レン）」，24 岁人气偶像团体主唱（不能用真人偶像）。
- 造型：用户从 5 套 Seedance 设计里选了 **A（银白狼尾、淡紫灰眼、黑高领 + 长大衣）**；画风从 8 种里选了 **3 号柔和赛璐璐**（细的彩色线条、淡平涂阴影）。参考图 `assets/art/style_3_softcel.png`（不进 git）。注意：中途我误按 4 号生成了 2 张（50 credits 浪费），之后全部用 3 号。
- 声音：**VOICEVOX:青山龍星**，用户选的「a4」：しっとり（耳语句用 囁き），pitch +0.03、intonation 1.20、speed 1.02、**共振峰 ×1.06**（先以 pitch −ln1.06 合成，再 asetrate×1.06 + atempo 1/1.06，音高不变、声质更年轻）。`scripts/voice.py`；试听记录在 `scripts/audition*.py`（结果在 `audio/`，本地）。
- 流程：床头手机震动 → 接听（声音带电话音质、只在**左耳**，左耳热）→ 两次选择 → 他在雪夜回家路上 → **开窗看同一场雪（右耳凉，左耳仍热）**→ 关窗 → **换耳朵（声音和热度移到右耳）**→ 耳语秘密 → 说「おやすみ」（麦克风或按钮）→ 门铃（电话里和走廊同时响）→ 开门（两耳一凉）→ 真实立体声「来ちゃった」→ 拥抱（两耳热）→ 右耳「会いたかった」→ 回封面 `stop`。同侧冲突 0（`CALL.conflicts()`）。
- 美术 10 张：`scripts/seedance.py scenes`（2K，16:9）→ `scripts/prepare_art.py`（表情帧对齐只换脸，用 Demo 11 的对齐函数按路径加载）→ `media/art/*.webp`。
- **动画已按新标准重做（2026-11-08）**：11 段 Seedance 2.5 Lite 1080p 首尾帧（房间 / 开窗 / 街头说话·安静 / 特写 / 门口说话·安静 / 拥抱 + 过渡 `t_room_open`、`t_room_close`、`t_door_hug`），新静帧 `ren_hug`（他的脸在左 → 最后一句改到左耳）；换地点用叠化。`scripts/prepare_video.py`（读 `media/art/*.webp`）全部 `exact 0.0 / 0.0`；旧 `v_close_whisper` 已删。自动通关 3:17，0 报错。两个播放器修了一处：过渡结束后等一帧再选循环，让紧接着的台词直接用说话循环。

### Demo15_FamilyCall + Demo16_FamilyCall2 ✅ 可玩 —《もしもし、おばあちゃん？》+《じいちゃんの、ゆきだるま》（纯交互两集，2026-11-07/08）
- 用户要求"和外公外婆打家庭电话，要可爱的爷爷奶奶"。原创角色：外婆**ハナ**（话多爱操心）、外公**ゲン**（笨拙嘴硬、爱抢电话），乡下雪天的老房子。
- 造型：用户从 3 套里选了 **A**（外婆银发圆髻 + 红珠发簪 + 圆金框眼镜 + 粉色毛衣开衫 + 围裙；外公秃顶 + 白眉白圆胡子 + 红鼻头 + 藏青半纏），画风沿用 Demo 12 的 3 号柔和赛璐璐。
- 声音：外婆 **VOICEVOX:もち子さん のんびり**（用户选的 g3：pitch −0.09、intonation 1.30、speed 0.86、共振峰 ×0.92、轻微颤音 vibrato 0.06）；外公 **VOICEVOX:ちび式じい**（k1：pitch −0.04、intonation 1.20、speed 0.90、共振峰 ×0.95）。`scripts/voice.py`，试听 `scripts/audition*.py`。
- 流程：给外婆家打电话（左耳暖）→ 外婆接 → 喊外公，外公跑来抢听筒，两人脸贴脸一起听 → 吃饭了吗 / 那边下雪 → 包裹到了：开免提放桌上，开门（左凉）→ 外婆织的红围巾（两耳慢慢变暖）→ 外公冷藏寄来的小雪人贴右脸（右凉、左暖）→ 听筒回耳边 → 过年回不回 → 谁都不肯先挂，"这个按哪里挂断" → 回封面 `stop`。2026-11-07 完整通关：约 5 分钟，0 报错，0 同侧冲突（`FAMILY.conflicts()`）。
- 美术：Seedance API 的上传接口当天达到上限（Retry-After 约 10 小时），之后 `~/.seedance_key` 被换成的新 key 返回 401；用户说**直接用网页端作图**：在 seedance2-5.com 的 Image to Image（GPT Image 2, 16:9, 2K）上传参考图、填 `project/web_prompts.json` 里的提示词、"Download all" 下载。注意：API 用"生成结果链接"当参考图时，返回的 outputs 里第一张是原样的参考图，新图是**最后一张**（`seedance.py` 的 `save_last`）。下载文件名不带场景名，按生成顺序对应，挪文件前先看清 Downloads 里有没有旧文件。
- 表情：`scripts/prepare_art.py`（按路径用 Demo 12 的函数）切口型/眨眼小块；外公说话帧生成时被放大了，用眼睛和鼻子区域求缩放（0.87）再切嘴；眨眼用固定偏移（局部搜索会漂）。
- **冷热改为双层 + DUAL（2026-11-08）**：人声层 = 听筒贴耳时这只耳朵的热度 = 0.1 + 0.8 × 声音包络（起 0.06 s / 落 0.3 s；对着别处喊的句子 ×0.35；免提时没有人声热）；环境层 = 门（左凉）、围巾（两侧暖）、雪人（右凉）。每只耳朵冷、热各自计算，发 `DUAL …`。`FAMILY.both()` = 同耳冷热同时出现的帧数。
- **2026-11-08 用户说太长，拆成两集**（同一通电话）：第 1 集 = 本文件夹（打电话 → 外公抢听筒 → 包裹 → 开门 → 围巾，结尾外公"看看我的蓝箱子"→「つづく」，约 2:50）；第 2 集 = `demos/healing/Demo16_FamilyCall2/`《じいちゃんの、ゆきだるま》（开场围巾已围着、免提 → 小雪人 → 听筒回耳边 → 过年 → 不肯先挂，约 2:05）。Demo16 文件夹只有页面和封面：`<base href="../Demo15_FamilyCall/">` + `<body data-part="2">`，代码/美术/配音全用第 1 集的（`game.js` 里 `PART`）。两集都已加入 `nav.js` 和官网菜单（缩略图按文件夹命名）。

### Demo20_HinataHandshake ✅ 可玩 —《あと10秒だけ、ね？ / Just Ten More Seconds?》（纯交互握手会，2026-11-08）
- 女性向男偶像系列第一位：**陽向**（19 岁，年下・腹黑：人前甜、耳边黑）。造型 = 用户定的粉毛设定图（`Demo16_HandshakeEvent/assets/art/hinata_pink_sheet.png`，复制为 `assets/art/ref_hinata.png`）。`Demo16_HandshakeEvent/`（三位男偶像的设计 / 试听工作区，未进 git）在三位都做完后，于 2026-11-08 经用户同意移到了废纸篓。
- **其余两位**：迅 = 用户选 **v2 造型（红发、墨镜推在头上、黑皮衣/黑衬衫、戒指，`project/shion_jin_v2.jpg` 右图 / `assets/art/jin_sheet_v2.png`）**，声线 雀松朱司（ツンデレ）；第三位（湊 / 紫苑）造型未定。每位一个独立 demo 文件夹。
- 声音（2026-11-08 再改）：陽向 = **ElevenLabs 试听 v2**（`lODKQ6pXINFtajDz9nqR`，见 §4 配音标准；之前是 VOICEVOX:暁記ミタマ「m1」）；工作人员 VOICEVOX:春日部つむぎ。`scripts/voice.py`，试听 `scripts/eleven_audition.py`。
- 动画 v2（2026-11-08，用户嫌第一版画质低、衔接不顺 → 定下 §4b 标准）：11 段 Seedance 2.5 Lite 1080p（5 循环 + 6 段一次性：握手台→握手、哈气、握手→左耳、左耳→握手、握手→右耳、右耳→挥手），约 704 credits。只在片段结尾切换。
- 曾与另一个会话撞车（Demo16_HandshakeEvent 里的 Haruto，同一粉毛角色）：用户决定保留 Demo20，那边改去做迅。
- 流程：冬天会场排队（右边自动门 → 右凉 + 开门时一阵冷风）→ 握手 → 「手好冰」→ 他对你手哈气（两耳暖的一波）→ 工作人员「快到时间了」→ 凑到**左耳**「你刚才也去排别人的队了吧…我都看见了」（左耳热跟着声音）→ 时间到他不放手（计时器变成"延長 +0:xx"）→ **右耳**「下次只排我的队，约好了」+ 有人进门的冷风（右耳同时暖 + 凉，DUAL）→ 说「約束する」（麦克风或按钮）→ 挥手再见。自动通关约 1:40，0 报错。
- 冷热：DUAL，三层 = 人声（离哪只耳朵近就暖哪只，跟响度）、哈气、门口冷风。牵手本身不加热（物理上不合理）。
- 美术：Seedance GPT Image 2（`scripts/seedance.py`）。**2026-11-08 上传接口被限流（Retry-After ≈ 8 h）**：锚点图 `hina_booth` 用文生图，其余用锚点的生成链接当参考（不用上传）。注意：**生成记录约 10 分钟后 GET 返回 503**，差分必须紧跟底图生成；用别的生成的 outputs[0] 代替锚点不可靠（握手台的两张差分因此取错了画面，已弃用，握手台没有口型/眨眼）。右耳的画面 = 左耳画面镜像。

## 6. 本地未提交的大文件（仅在本机，可用脚本重建）

| 文件 | 大小 | 重建 |
|---|---|---|
| `demos/all-ages/Demo1_SnowFoxfire/output/final_1080p.mp4`、`mix_48k.wav`、`stems/` | ~700 MB | `./build_all.sh` + `tools/render_mp4.py`（需 VOICEVOX）|
| `demos/all-ages/Demo2_FanMeeting/output/final_1080p.mp4`、`mix_48k.wav`、`stems/`、`audition/` | ~640 MB | 同上 |
| `demos/all-ages/Demo3_ShiningSmileConcert/video/final/final_concert_150s.mp4`、`audio/` | ~410 MB | README 中的命令（不需要 VOICEVOX）|
| `demos/all-ages/Demo3_ShiningSmileConcert/assets/music_original/*.mp3`、`music_edited/*.wav` | 5 MB + 43 MB | 原曲需从 Pixabay 手动下载（Cloudflare 拦截自动下载）|
| `demos/nobunaga-suntory/Demo9_SengokuBanquet/audio/`（选定声线试听、take 缓存、4 条干声 stem、mix）、`video/`（MP4、srt）| ~160 MB + ~520 MB | `./build_all.sh`（需 VOICEVOX）+ `scripts/render_mp4.py` |
| `demos/all-ages/Demo4_SeasonsExpress/audio/`（16 条干声、双耳 stem、混音）、`video/`（MP4、预览帧）| ~250 MB + ~100 MB | `scripts/build_audio.py` + `scripts/render_mp4.py`（不需要 VOICEVOX）|
| `~/VOICEVOX-engine/` | 3.9 GB | 官方 release 0.26.1 macos-arm64 `.vvpp`（zip）解压 |

---

## 7. 常见坑

- 同名模块冲突：新 Demo 的 `build_audio.py`/`thermal.py`/`export.py` 与 Demo 1 同名，**必须用 `demo1.py` 的 `load()` 按路径加载**；VOICEVOX 客户端要用 `B.VV`（与 Demo 1 build_audio 同一实例）。
- `ffprobe -of csv=p=0` 的输出可能带尾逗号，比较前要 `strip(",")`。
- `render_mp4.py` 内嵌封面缩略图要单独一遍 ffmpeg（1 帧的封面流会让 `-shortest` 把视频截短）。
- `prepare_art.py` 只合成脸部；手/道具也变化的差分（如 `A_ear_fan`）要放进 `FULL_FRAME`。
- 半身像只在身体能延伸出画面底部时使用（`bustReachesBottom`），否则用全身图，避免露出截断。
- 带动画循环（requestAnimationFrame）的播放器用 headless `--screenshot --virtual-time-budget` 会卡住：预览静帧用 `render_mp4.py --at …`，封面页的 cover 模式不要启动动画循环。
- headless 截图前确认 8765 服务器在运行（`curl localhost:8765`），否则截图静默失败。
- `.DS_Store`、`__pycache__` 提交前删掉。

### Demo21_JinLounge ✅ 可玩 —《俺だけ見てろ / Look Only at Me》（纯交互，2026-11-08）
- 男偶像系列第 2 人（同系列：Demo12 蓮、Demo20 陽向/春翔 另一会话）。**原创角色「迅」**：红发、霸道直接/邪魅狂狷（道明寺型富二代 rapper），黑皮衣 + 敞开黑衬衫 + 偶尔戴墨镜（用户选的 v3 造型）。
- 声音：VOICEVOX:青山龍星 不機嫌，用户选「j6」：pitch −0.02、intonation 1.20、speed 0.90、停顿 ×1.4，耳边句用 囁き + 轻呼吸。`scripts/voice.py`。
- 流程（约 65 s）：演唱会后被叫到休息室 → 「近づく」→ 冰罐贴右脸（右凉）→ 「今日のライブ、どこ見てた？」二选一 → 抓手腕 → 摘墨镜「目、逸らすな」长按对视（脸贴近：两耳微热 + 心跳）→ 右耳「…今日はもう、帰さねえから」（右热）→ 皮衣披上（两耳热）→「…冗談だ。送ってく。…半分はな。」
- 热：DUAL 两层（他的声音按响度暖说话那侧耳朵 + 真实冷热物体）；不再给"抓手腕"加热（不在耳边）。
- 美术：Seedance 网页 GPT Image 2（3 号柔和赛璐璐）6 张场景；动画：Seedance 2.0 Pro 首尾帧同图 4 s × 6（1464 credits）→ ping-pong 压缩。
- 补动画（用户选方案 C）：开场待机 / 皮衣待机（720p）、摘墨镜一次性片段 + 对视待机（1080p，新图 `jin_gaze`）；全部重压 CRF 20。另有一段多生成的皮衣待机放在 `assets/video_alt/`（多点了一次，浪费 244）。余额剩 5620。
- 用户 2026-11-08 规则：**以后先用静态图做完游戏，Seedance 视频放在最后做。**
- **动画已按新标准重做（2026-11-08）**：16 段 Seedance 2.5 Lite 1080p 首尾帧（10 段循环 + 6 段过渡，`project/web_video_prompts.json`），网页端提交（API 上传限流），`scripts/prepare_video.py` 全部 `exact 0.0 / 0.0`；播放器只在片段结尾切换、`go()` 播过渡。旧的 720p ping-pong 片段、`v_off`、`compress_video.sh` 已删。自动通关 1:41，0 报错。
- 另：Demo16_HandshakeEvent（未入 git）是我给春翔做的半成品，已交给另一个会话；那 6 段春翔动画（1464 credits）对方不用。
- 下一集计划：紫苑（白金长发、白衬衫大敞、偶尔眼镜；VOICEVOX:青山龍星「s9」），雨夜他家，用吹风机帮你吹头发（暖风绕头）。造型图在 Demo16 的 `shion_v4_platinum.png`。

### Demo22_ShionRain ✅ 可玩—《雨が止むまで / Until the Rain Stops》（纯交互，2026-11-08）
- 男偶像系列第 3 人（最后一位）：**紫苑**，27 岁键盘手，斯文败类・妩媚神秘；造型 = 用户选的 `shion_v4_platinum.png`（复制为 `assets/art/ref_shion.png`）。
- 声音：ElevenLabs，用户选 **shion r1_c**（`wrMX0OkmDIInpPC5f1Hx`），`scripts/voice.py` 每句带标签，贴耳 `[whispers]`。
- 流程（约 1:45）：雨夜到他家门口（两耳湿冷）→ 进门 → 毛巾擦头（摩擦微暖 + 湿冷）→ 吹风机先左边，**拖动画面瞄准热风** → 他在风声里说了句听不清的话（字幕「ドライヤーの音で、よく聞こえない」）→ 关掉吹风机，选「なんて言ったの？」→ **左耳**重说 → 右边：热风**绕过后脑**转到右耳 → 冷风收尾 + 他在右耳边说话（同耳冷 + 暖，DUAL）→ 摘眼镜长按对视 → 沙发窗边二选一（回家 → 借伞"明天来还" / 留下 →「雨が止むまで」）→ 左耳「止まなければいいのに」。
- 美术：Seedance **网页** GPT Image 2 图生图（API 上传 2026-11-08 再次限流），6 张 2K 静帧，每张 25 credits；提示词 `project/web_prompts.json`。右侧吹风画面 = 吹风静帧镜像。封面用开门图右移 + 左侧压暗。
- 用户试过"重新打光"（以迅的静帧为光影参考重绘 6 张）后决定**保留原版静帧**（2026-11-08）。
- 动画（§4b）：15 段 Seedance 2.5 Lite 1080p 首尾帧（960 credits，网页端）：每个画面一段说话循环，吹风 / 眼镜 / 窗边再加安静循环，6 段过渡（门口→毛巾→吹风→左耳→右侧吹风（镜像帧）→眼镜→窗边）；右侧吹风循环 = 左侧镜像。`scripts/prepare_video.py`（Demo20 版，静帧用 media/art JPG）。网页上传小坑：同一 file input 连续上传要先把 `input.value=''`，否则每隔一次不生效；生图页提交后比例会被重置成 Auto，每次都要确认 16:9。
- 自动通关测试（带动画）：2:25，0 报错。

### Demo24_GakuCamp ✅ 可玩（静帧版）—《ガクの、焚き火キャンプ配信 / Gaku's Campfire Stream》（女性向直播间，2026-11-08）
- 用户要求：女性向加一个男主播直播间，人设、外表要和其他男角色拉开；**要帅哥人设**（第一版"粗犷大哥哥"被否）。原创角色 **月嶋ガク**，26 岁冬季单人露营主播，颜值天花板、高冷话少（クーデレ）、对自己的帅没自觉。造型 = 用户选的 **C**（黑短发 + 深绿内层挑染、银链、黑色羊毛领飞行员夹克，`project/designs_contact.jpg`）。
- 声音：ElevenLabs **gaku r2_a**（`rR0Ih88ACkRAdbFhLe7c`；r1 是作废的大哥哥人设）。`scripts/voice.py`（Demo14 版，单角色）。
- 直播 UI 用 Demo14 的 `stream.css`（按路径）+ 自己的 `camp.css`；`audio.js` 是 Demo14 的拷贝加篝火 / 湖风 / 雪地脚步 / 加柴 / 锡纸；`game.js` 单角色版 stream.js。
- 流程（约 2:15）：开播打招呼 → 加柴（右暖）→ "冷吗" → **招牌：坐到你左边当风墙**（左冷消失、换成他声音的暖）→ Super Chat 咖啡 / 烤红薯（前方暖）→ 下雪（两耳轻冷）→ 毯子盖住麦克风（两耳暖、风没了）→ 右耳贴耳 + 长按「まだ見てる」→ 道别（毯子拿回去）。DUAL 两层；冷热表在 README。
- 美术：8 张静帧，Seedance **网页** GPT Image 2（API 上传 2026-11-08 又被限流约 5 h，`/images` 也排队 429）。造型选项先用 3 号柔和赛璐璐风格图做参考（Demo12 `style_3_softcel.png`）。共 300 credits（造型 4 张 + 场景 8 张）。注意：同一个账号的网页历史里有别的会话的图，按提示词内容认图再下载；Downloads 里也会混进别人的文件。
- 镜头（用户 2026-11-08）：第一版麦克风放在椅子上、镜头太低，他看镜头像在往下看 → 改成**手机装在三脚架上、和他眼睛齐平，双耳麦克风夹在手机下面**，画面里不出现手机（你就是镜头）。做法：先按平视重出（模型把手机支架画进了画面），再用这批图做图生图编辑"去掉手机和支架、直视镜头"（提示词 `project/web_prompts.json` 的 `edit`）。静帧一共花了 700 credits。
- 自动通关：两条分支都跑过（`?auto=1` / `?auto=1&alt=1`），0 报错。已加入 nav.js（女性向最后）、官网菜单、credits.html。动画（§4b）还没做，等用户反馈。

### Demo25_HatsumodeDate ✅ 可玩 —《はじめての、初詣デート / My First Hatsumode》（男性向约会，纯交互，2026-11-08）
- 用户要求：男性向下面做一个和女生约会的 demo，第一人称、有互动、有趣，女生的性格和外表要和四位主播拉开差距。用户从 4 个方案里选了「和风大小姐 · 初詣」。
- 角色：**白銀椿**，20 岁，老字号旅馆的大小姐，端庄有礼但天然呆，第一次挤人潮的初诣。造型 = 用户选的 **D**（银白长发侧低马尾、红白绳、白→红椿花振袖、毛皮披肩；`project/designs_contact.jpg`）。声音 ElevenLabs **tsubaki r1_b**（`ydtidqvCazlHO8YgKhfx`）。
- 流程（自动通关 2:31，0 报错）：鸟居前倒数 → 小吃摊（只有黑卡）→ 热甘酒贴右脸 → 篝火（左暖）→ 被挤到右耳 → 参拜（摇铃、拍手、长按许愿）→ 抽签（你大吉、她凶）→ 冷风 → 毛皮披肩分你一半 → 左耳低语。细节见该目录 README。
- 美术：Seedance 网页 GPT Image 2 图生图（风格锚 Demo12 style_3 + 造型 D），8 张 2K 静帧；API 当天上传限流 + 每日额度用尽。甘酒一张按用户要求重做（她自己把杯子贴到你右脸）。
- 动画（§4b）：15 段 Seedance 2.5 Lite 1080p 首尾帧（8 段说话循环 + 7 段过渡，960 credits，网页端）；prepare_video 全部 exact 0.0 / 0.0；带动画自动通关 3:13，0 报错（每次换场景要等循环结束 + 4 s 过渡，比静帧版长约 40 s）。
- 坑：网页历史和 Downloads 是多个会话共用的，下载要按提示词认卡片、下载后马上核对画面（这次混进了别的会话的一张客厅图，已放回 Downloads）；cast.json 被别的会话同时写过，pick 之后要再确认 voice_id 还在。

### Demo23_NobunagaTalk ✅ 可玩（本机专用）—《信長と、語らう / Talk with Nobunaga》实时 AI 对话（2026-11-08）
- 用户要求：不是固定台词，能对用户说的话做出反应；讲完等用户讲；本机版 + 限额不许超；可选 信長 / 家康 / 三人で、可选场所（5 个：岐阜城天守夕暮れ、茶室囲炉裏、京都居酒屋、山崎蒸溜所、安土月夜の宴）；角色先按场所开话题；约 2 分钟由角色收尾；角色要走动（不在一个位置讲话）让冷热变化。
- 架构：`server.py`（端口 8771，持有 key，执行 `limits.json`）+ ElevenLabs **text-only agent**（`agent.json`，LLM claude-sonnet-5-5，prompt 每次在 `scenes.js` 生成后 override）+ 浏览器语音识别 + 每句 ElevenLabs v4 TTS → 每个角色独立 HRTF。细节见该目录 README。
- 不在 nav.js / 网站里（GitHub Pages 没有服务器）。`start_demo.command` 双击启动。
- 一次 2 分钟三人对话 ≈ 600–700 credits。

### Demo switcher (`demos/shared/nav.js`)
Every full demo page loads `../shared/nav.js`, which adds ‹ ☰ Demos N/9 › to the top bar and a thumbnail panel of all demos (thumbs = `assets/images/demos/demoN.jpg`). `#demos` in the URL opens the panel. Hidden with `?embed`, `?cover`, `?render`. **A new demo must be added to the `DEMOS` list in nav.js.**

### Interactive mode, all demos (`demos/shared/interact.js`)
Every full demo page waits for the viewer at hand-picked moments (cover toggle 「あなたも参加する」 / 「声援で参加する」 + stage chip, default on, localStorage):
- **read**: say a line aloud (mic level only: speech then ~0.5 s silence). Nobunaga series (5–9): **every "you" subtitle line** is a read gate (auto-generated), skipping the silent rest of the line. Demo 1/2/4: replies written in `GATES`.
- **toast** (乾杯 / Demo 2 拍手), **blow** (Demo 5 tea, Demo 7 yakitori, Demo 4 summer heat: breath cools both ears), **choice** (Demo 1/2 "which side will she come from?" with answer from the data; Demo 1 cool vs warm; Demo 4 "which ear is cold?" with `hold`: current thermal stays on while choosing).
- **Demo 3 = cheer mode** (song, never paused): cheering / 👏 tap → hearts + penlight glow and up to +30 % on heat that is already on (no new same-ear conflict).
- No mic → tap / press-and-hold; auto-continue after 15 s; ▶ skips. Nothing recorded or uploaded.
- Hook in each demo.js `loop()`: `MoHeatInteract.tick(t, media)` + `MoHeatInteract.out(th, ix)` (Demo 5–9 use the earlier tick-only form). Gates sit on dialogue gaps → audio and thermal CSVs unchanged.
- Off in `?embed`, `?cover`, `?render` → homepage player and MP4s stay linear.
- Note: Demo 3's demo.css paints every `.stage canvas` black → the cheer layer overrides it (`.stage canvas.ix-fx{background:transparent}`).

### Timeline drag (`demos/shared/scrub.js`)
All nine pages load it (also in `?embed`): drag the timeline to scrub (mouse or touch). It replays each demo's own `click` seek at the pointer, pauses during the drag, resumes on release, shows a time bubble, and sets `window.MoHeatScrubbing` so interact.js opens no gate mid-drag.

### No demo numbers on the pages (since 2026-11-07)
Covers, top bar and page titles carry **no demo number**, so a demo can be inserted anywhere without touching the others.
- Order = the `DEMOS` list in `demos/shared/nav.js` (switcher: "Demos N / M", ‹ ›) and the `.td-item` order in the site `index.html` (script.js writes "Demo N ·", the group ranges and "N demos").
- Thumbnails are named by folder: `assets/images/demos/<DemoFolder>.jpg` (480×270 from `media/cover.jpg`). Folder names keep their old numbers as IDs only.
- To insert a demo: add one entry to nav.js `DEMOS` and one `.td-item` in `index.html` at the wanted position, plus its thumbnail. Nothing else is renumbered.
- Nobunaga covers keep 「第N話 · Ep. N / 5」 (episode within the series).

### Demo 10 painted art (2026-11-07)
Demo10_CaveSpring now uses painted images (Demo 1–4 look) for all 4 scenes, Kohaku (4 face frames on one body) and 6 props.
Generated through the seedance2-5.com API with **GPT Image 2** image-to-image (`scripts/seedance_images.py`, key in `~/.seedance_key`,
backgrounds 2K / sprites 1K), processed by `scripts/prepare_art.py` → `media/art/*.webp` (raw PNGs git-ignored). Code drawing stays as fallback.
Details in `demos/all-ages/Demo10_CaveSpring/README.md` (Painted art). Note: GPT Image 2 often paints a fake checkerboard instead of alpha → Vision lift.
