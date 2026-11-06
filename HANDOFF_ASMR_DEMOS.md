# MoHeat Evo — 冷热触觉 ASMR Demo 系列：交接文档 / Handoff

> 写给接手的 agent（Claude Code、Codex 等）和项目负责人。**先读完"必须遵守的约定"再动手。**
> 最后更新：2026-11-07。状态：Demo 1/2/3 已完成；Demo 4 美术制作中，配音试听已生成，等用户选声线；Demo 5 已建目录、已出 ChatGPT 素材命令，等素材。

---

## 0. 必须遵守的约定（用户明确要求过）

| 约定 | 说明 |
|---|---|
| **用中文和用户沟通** | 代码、commit message、站点英文文案可以用英文 |
| **字幕只用日语 + 英文** | 适用于 Demo 2 及之后所有 Demo。播放器字幕、MP4 内嵌字幕、场景标题、封面都**不要中文**。内部文档可以保留中文列 |
| **不用 Seedance / 外部视频生成** | 浏览器动画渲染出的 MP4 就是正式成品，不要再提"最终影片待制作" |
| **美术素材由用户用 ChatGPT 生成** | 我们写"ChatGPT 素材命令.md"（文件名、提示词、优先级、放哪个文件夹），用户生成后放进指定文件夹。差分图必须"编辑上一张图"生成，保证构图一致 |
| **不修改、不覆盖之前的 Demo** | 新 Demo 复用旧素材用**符号链接/只读引用**，复用旧代码用**按路径 import**（见各 Demo 的 `demo1.py`）|
| **每次改动自动 commit 并 push 到 `origin main`** | 这是 GitHub Pages 站点仓库（`moheat-evo.github.io`），push 即公开。大文件（WAV/MP4/原始音乐）已在 `.gitignore` 中排除 |
| **Demo 1 的配音保持不变** | 小雪 / 小焰 = ずんだもん（调过音高与语气区分两人）。用户明确说不要改回原声 |
| **Demo 2 的绫音 = ずんだもん 原声** | 不改音高、语调、音色；说话ノーマル，耳语ささやき |
| **VOICEVOX 署名** | 使用 VOICEVOX 的 Demo 必须显示 `VOICEVOX:<角色名>`（播放器已自动显示） |
| **冷热：固件每只耳朵同一时间只能冷或热** | 所有控制数据都经过"同侧冷热仲裁"，检查脚本要求同侧冲突帧 = 0 |

---

## 1. 仓库结构（`/Users/jiayixu/Desktop/MoHeat Evo`）

```
index.html, styles.css, script.js        品牌官网（不要随意改动风格；商业文案简短）
control.html/js, test.html/js, device.js 设备控制页、输出测试页、Web Serial 公共代码（所有 Demo 共用 device.js）
arduino/MoHeatEvoArduino.ino             ESP32 固件（.gitignore 排除，仅本地）
ASMR Demo/                               Demo 1《雪と狐火のひそひそ話》
ASMR Demo 2/                             Demo 2《キミだけのスペシャルファンミーティング》
Demo3_ShiningSmileConcert/               Demo 3《Shining Smile Melody — Ice & Fire Concert》
Demo4_SengokuBanquet/                    Demo 4《安土最后的酒宴》（制作中）
Demo_SeasonsExpress/                     Demo 5《四季暴走列車 / The Runaway Seasons Express》（等美术素材）
HANDOFF_ASMR_DEMOS.md                    本文件
AGENTS.md / CLAUDE.md                    给 agent 的入口（指向本文件）
```
每个 Demo 文件夹里都有自己的 `README.md`（运行方法、管线、交付物清单），本文件是总览和交接。

---

## 2. 环境（本机 macOS 26，Apple Silicon）

| 项目 | 状态 / 位置 |
|---|---|
| Python | 系统 `python3` 3.9；已有 numpy 2.0、scipy 1.13、matplotlib 3.9、Pillow 11。**没有** librosa / soundfile / torch / pyserial（Demo 3 的音乐分析特意只用 numpy/scipy）|
| ffmpeg / ffprobe | 9.0（Homebrew）|
| Chrome | `/Applications/Google Chrome.app`，headless 用于截图和逐帧渲染 MP4 |
| Swift | `/usr/bin/swift`，`ASMR Demo/tools/lift_subject.swift` 用 macOS Vision 抠图（素材是绿底时可用）|
| **VOICEVOX 引擎** | 0.26.1，`~/VOICEVOX-engine/engine`（3.9 GB，不在仓库里）。**agent 不能自己启动下载的二进制**（权限拦截），需要用户双击 `ASMR Demo/start_voicevox.command`。端口 `http://127.0.0.1:50021`。检查：`curl -s http://127.0.0.1:50021/version` |
| 本地预览服务器 | 在仓库根目录 `python3 -m http.server 8765`，然后打开 `http://localhost:8765/<Demo 文件夹>/`。各 Demo 的 `start_demo.command` 会自动做这件事 |
| MP4 渲染端口 | Demo 1: 8766，Demo 2: 8767，Demo 3: 8768（`render_mp4.py` 自带服务器）|

---

## 3. 设备与协议（所有 Demo 通用）

- 固件命令（115200 baud，每行一条）：`LC<35..80> RH<0..200>` 等，`L/R/B` + `C`(冷)/`H`(热) + PWM；`stop` 全关。**写同一侧的 C 会清掉 H，反之亦然**。
- 默认 PWM 范围：冷 35–80，热 0–200（固件上限）。`test.html` 设置的范围保存在浏览器 localStorage（`moheat.range`），所有播放器共用。
- 播放器：Web Serial（`device.js`），最多 10 条命令/秒，变化时才发；暂停/结束/切走页面/断开/Esc/STOP → `stop`。
- 无浏览器播放：`python3 "ASMR Demo/tools/play_thermal_csv.py" --csv <csv> --audio <wav> --port /dev/cu.…`（需 `pip3 install pyserial`；`--dry-run` 可测试）。
- CSV 统一格式：`time_s, L_cool, R_cool, L_heat, R_heat, *_pwm, command`，20 Hz，已含设备延迟补偿（冷提前 0.35 s，热提前 0.60 s）。

---

## 4. 通用技术（Demo 1 建立，后续复用）

**管线**：时间轴文件（台词/音效/位置关键帧）→ `build_audio.py`（配音、音效、HRTF 双耳渲染、母带）→ `thermal.py`（四通道 CSV）→ `export.py`（字幕 + `media/data.js`）→ 浏览器播放器 → `render_mp4.py`（headless Chrome 逐帧 → MP4）。

- **双耳渲染**：`ASMR Demo/tools/build_audio.py::render()`，球形头模型（Brown–Duda ITD + 头影滤波）+ 近场 ILD + 房间混响，位置由时间轴模块的 `positions(times)` 提供（复用时把 `B.S` 替换成新 Demo 的时间轴模块）。
- **冷热控制器**：`ASMR Demo/tools/thermal.py`：50 ms RMS → 噪声门 → 归一化 → 曲线 → hold/attack/release → 距离 → 左右权重 → 设备延迟 → 同侧仲裁 `resolve_ear` → 8 s 剂量限制 → PWM。Demo 2 的 `ear_weights` 更锐利（归一化到较近的耳朵）。
- **美术处理**：`ASMR Demo/tools/prepare_art.py`：差分图对齐（缩放搜索 + 相位相关）→ 自动找脸部区域（眨眼/张嘴差异）→ **只合成脸部** → WebP（`media/art/` + `faces.json`）。手/道具也变化的差分要列入 `FULL_FRAME` 保留整张。
- **播放器**（`demo.js`）：Live2D 风格（呼吸、说话弹动、条带网格摆动、镜像、交叉淡化）；按配音 RMS 切换眨眼/口型/表情帧；粒子特效；冷热边缘光晕、雷达、四通道表、时间轴；URL 参数：`?t=95` 定格预览、`?cover=1` 封面导出、`?render=1` 离线渲染。
- **配音**：`ASMR Demo/tools/tts_voicevox.py`（`CAST` 配置、按表情选风格、停顿上限、音色 tone）；唱歌：Demo 2 `build_audio.py::sing()` 逐 mora 设定音高和时长。
- **封面**：`?cover=1` 截图 → `media/cover.jpg`（分享图、MP4 开头 2–3 s 标题卡、MP4 内嵌缩略图）。

---

## 5. 各 Demo 状态

### Demo 1 · `ASMR Demo/` ✅ 完成
- 角色：小雪（冷）/ 小焰（热）；ChatGPT 美术在 `art/chatgpt/`，设定图 `art/Character.jpg`，房间背景 `room_bg`。
- 配音：ずんだもん（两人用音高/风格区分）。字幕：日 + 英。
- 重建：`./build_all.sh`（需 VOICEVOX）→ `python3 tools/render_mp4.py`。成品：`output/final_1080p.mp4`（本地）。

### Demo 2 · `ASMR Demo 2/` ✅ 完成
- 角色：星乃綾音（`A_` 前缀），ChatGPT 美术 `art/chatgpt/`（35 张），设定图 `art/A_Character.png`。
- 热 = 绫音人声（含原创歌曲，VOICEVOX 逐音唱）随她的位置；冷 = 扇子/冰饮/冷气/魔法，各自独立位置。检查：左右同时异温 4 次、左右交替 17 次、同侧冲突 0（`output/thermal_checks.json`）。
- 配音：ずんだもん 原声。字幕：日 + 英。萌妹音试听保留在 `output/audition/`（本地）。
- 重建：`./build_all.sh` → `python3 tools/render_mp4.py`。成品：`output/final_1080p.mp4`。
- 代码复用 Demo 1：`tools/demo1.py` 按路径加载（同名模块冲突，不能直接 import）。

### Demo 3 · `Demo3_ShiningSmileConcert/` ✅ 完成
- 真实歌曲 *Shining Smile Melody – Jpop*（ZTMusic, Pixabay），来源/许可/哈希见 `assets/music_original/SOURCE.md`；原曲 MP3 不提交。
- 音乐分析（numpy/scipy）→ 88.2 BPM 半拍（≈176），剪辑 170.04 → 150.000 s（去掉 131.33–150.43 s 间奏 7 小节）。
- 两种冷热模式：A 纯音乐、B 音乐 × 舞台位置（默认）。`scripts/check_sync.py` 全部通过。
- 美术：Demo 2 素材通过 `project/art_src/` 符号链接只读引用 + Demo 3 新素材（舞蹈、麦克风、演唱会舞台四状态、观众、特效）。
- 重建命令见 `README.md`；成品 `video/final/final_concert_150s.mp4`、`audio/final/final_stereo_150s.wav`（本地）。
- 无歌词字幕（没有授权的歌词文本），只有段落标题（日/英）和片尾音乐署名。

### Demo 4 · `Demo4_SengokuBanquet/` 🚧 制作中 —《安土最后的酒宴》
- **方向**：以 `demo4.jpg` 设定板为准，**B 细密浮世绘·金箔装饰风**、写实成年人比例（Q 版已淘汰，见 `project/discarded_chibi_drafts/`）。
- **角色与冷热**：織田信長坐左前方 → 他的声音主要驱动 **L_Heat**；徳川家康坐右前方 → **R_Heat**。冷感来自风/雨/冰镇等环境（按设定板：冷气、风、雨；热：火焰、热酒蒸汽、炭火）。
- **已有素材**（用户仍在陆续生成，开工前先 `ls assets/*/` 确认）：`assets/characters/N_Character.png`、`I_Character.png`、`N_bust_base.png`、`I_bust_base.png`、`N_ear.png`、`I_ear.png`；`assets/stage/banquet_bg.png`。
- **素材命令**：`ChatGPT素材命令.md`（已更新为浮世绘金箔风，含设定板追加的道具/场景/特效）。还缺：信长其余口型与表情、家康全部半身/表情、贴耳特写、动作、道具、风雨夜背景、特效。
- **配音（用户的 Demo 4 配音要求要点）**：
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
- **下一步建议**：
  1. 用户选声线。
  2. 写完整 150 s 日语剧本（日/英字幕，可附中文对照列）和时间轴 `scripts/banquet.py`（信长左、家康右，含贴耳、敬酒、大笑、起风等）。
  3. 配音（复用 Demo 1 `tts_voicevox` + Demo 2 的 `demo1.py` 加载方式），每句多候选。
  4. 环境音：炭火、热酒蒸汽（热）；风、雨、冰镇（冷）。
  5. thermal：信长 → L_Heat、家康 → R_Heat，风雨等 → 冷，Demo 2 风格的位置分配。
  6. 播放器复用 Demo 2/3 结构，背景 `banquet_bg` / 风雨版，特效按设定板。
  7. 渲染、检查脚本（参考 Demo 3 `check_sync.py`）、README，commit/push。

### Demo 5 · `Demo_SeasonsExpress/` 📝 已立项 —《四季暴走列車 / The Runaway Seasons Express》
- **任务书要点**（用户提供的完整制作指令）：
  - 150 s，1920×1080，30 fps，48 kHz 双耳声。第一人称坐在魔法列车车厢里朝前看，**无角色、无台词、无旁白**。
  - 画风必须和 Demo 1–3 一致：可爱日系 2D、粉彩、赛璐璐。**不要浮世绘或金箔风**（那是 Demo 4 的风格）。
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
- **美术**：`ChatGPT素材命令.md`（车厢主图的窗玻璃用 #00FF00 填满 → 抠出窗户遮罩；窗外每个季节分远/中/近三层，可无缝横向滚动；霜花、雨滴等玻璃层；特效小图）。复用 Demo 3 的 fx_snowflake / fx_ice_crystal / fx_flame / fx_star。
- **计划**：
  - 播放器沿用 Demo 3 结构：车厢前景固定，左右窗遮罩后面滚动视差景色，叠加玻璃层和粒子；列车有轻微晃动；时钟指针由程序绘制。
  - 环境音由程序合成（风、雨、火等），双耳渲染沿用 Demo 1。
  - thermal 用"环境音轨 RMS + 设计包络"，按每个声源的位置分到左右，再经 Demo 1 的仲裁、限幅和延迟补偿。
  - 同步报告参考 Demo 3 的 `check_sync.py`。

---

## 6. 本地未提交的大文件（仅在本机，可用脚本重建）

| 文件 | 大小 | 重建 |
|---|---|---|
| `ASMR Demo/output/final_1080p.mp4`、`mix_48k.wav`、`stems/` | ~700 MB | `./build_all.sh` + `tools/render_mp4.py`（需 VOICEVOX）|
| `ASMR Demo 2/output/final_1080p.mp4`、`mix_48k.wav`、`stems/`、`audition/` | ~640 MB | 同上 |
| `Demo3_ShiningSmileConcert/video/final/final_concert_150s.mp4`、`audio/` | ~410 MB | README 中的命令（不需要 VOICEVOX）|
| `Demo3_ShiningSmileConcert/assets/music_original/*.mp3`、`music_edited/*.wav` | 5 MB + 43 MB | 原曲需从 Pixabay 手动下载（Cloudflare 拦截自动下载）|
| `Demo4_SengokuBanquet/audio/audition/` | 小 | `python3 scripts/voice_audition.py` |
| `~/VOICEVOX-engine/` | 3.9 GB | 官方 release 0.26.1 macos-arm64 `.vvpp`（zip）解压 |

---

## 7. 常见坑

- 同名模块冲突：新 Demo 的 `build_audio.py`/`thermal.py`/`export.py` 与 Demo 1 同名，**必须用 `demo1.py` 的 `load()` 按路径加载**；VOICEVOX 客户端要用 `B.VV`（与 Demo 1 build_audio 同一实例）。
- `ffprobe -of csv=p=0` 的输出可能带尾逗号，比较前要 `strip(",")`。
- `render_mp4.py` 内嵌封面缩略图要单独一遍 ffmpeg（1 帧的封面流会让 `-shortest` 把视频截短）。
- `prepare_art.py` 只合成脸部；手/道具也变化的差分（如 `A_ear_fan`）要放进 `FULL_FRAME`。
- 半身像只在身体能延伸出画面底部时使用（`bustReachesBottom`），否则用全身图，避免露出截断。
- headless 截图前确认 8765 服务器在运行（`curl localhost:8765`），否则截图静默失败。
- `.DS_Store`、`__pycache__` 提交前删掉。
