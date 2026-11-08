# 工作日志 · Work log

> 用户 2026-11-08：「每次工作结束都要写日志，方便如果以后我换 agent 了也可以看懂」。
> **每次工作结束**（一轮对话的任务告一段落时）在最上面加一条：日期、会话 / 主题、做了什么、现在的状态、下一步、遇到的问题（问题的详细教训写进 `DEMO_DESIGN_GUIDE.md` §11.1）。
> 写给不了解上下文的人看：写清文件路径和命令，不写"上面那个""刚才"。多个会话同时工作时各写各的条目，最新的在最上面。
> 用户偏好在 `USER_PREFERENCES.md`，整体状态在 `HANDOFF_ASMR_DEMOS.md`，用户任务清单在 `TASKS.md`。

---

## 2026-11-08 · Demo31_SummerRooftop（男性向：夏夜屋顶 · 青梅竹马 渚）· 进行中

**做了什么**
- 用户要一个新的男性向剧情 → 4 个方案，用户选 A「夏夜屋顶 · 青梅竹马」；女主 早瀬渚（20 岁、嘴硬型），造型 A（栗色高马尾、藏青烟花纹浴衣），声音 ElevenLabs `nagisa` r1_b。
- 文件夹 `demos/for-men/Demo31_SummerRooftop/`：剧情、22 句配音（`scripts/voice.py`）、页面（以 Demo25 为底：`main.js` / `audio.js` / `lines.js` / `l10n.js` 由 `scripts/make_l10n.py` 生成）、DUAL 冷热、三语、语音回答。
- 美术按 ガク（Demo24，原 Demo27）的分层标准：`project/layers.md`（计划）、`project/stage.json`（摆位）、`scripts/seedance.py` 的 `JOBS3`（提示词）。背景 + 站立基准用 Seedance 网页出；Seedance 上传每日上限用完后，其余 13 张 + 4 张补充差分用 OpenAI API（`scripts/gpt_image.py`，以后用共用的 `tools/openai/images.py`）。
- 合成：`python3 tools/art/build_stage.py demos/for-men/Demo31_SummerRooftop` → 再跑 `python3 demos/for-men/Demo31_SummerRooftop/scripts/clean_cutout.py`（夜景去灰边、重做平面静帧）。辅助脚本：`clean_variant.py`（差分只保留嘴 / 眼）、`flatten_bg.py`（渐变"纯色底"刷平）。
- 两条分支自动通关（`?auto=1` / `?auto=1&alt=1`）都通过，0 报错。

**现在的状态**
- 8 个画面都是分层合成；用户指出「抠图有问题，烟花不够华丽」→ 抠图已用 `clean_cutout.py` 修（灰边、头发缝、"登场"前臂被抠掉用 `keep` 框保护）；**烟花还没重做**（`main.js` 里的 `burst()` 只是一圈线条）。
- 还没做：封面 `media/cover.jpg`、缩略图（`tools/web/thumbs.py`）、加入 `demos/shared/nav.js` 的 DEMOS 和官网菜单、README / 交接文档最终更新。

**下一步**
1. 烟花做华丽：粒子烟花（多色、拖尾、闪烁、下垂、升空轨迹、连发），只画在每个画面天空空着的区域（`SKY`），坐着的画面在右边、笑的结局在左边，特写画面只用闪光。
2. 再看一遍每个画面 100% 放大的头发边缘；递冰棒的冰棒边缘还有一点锯齿。
3. 封面、缩略图、菜单、提交；更新 README 和 `HANDOFF_ASMR_DEMOS.md`。

**遇到的问题**（详细在 §11.1）
- 把「和岳保持一致」理解成"和约会那一集一致"，先做了 8 张整图（Seedance 200 credits 浪费）。
- Seedance 每日上传上限：网页上生成按钮变灰，脚本点击却"成功"了。
- 新图和旧整图重名，脚本跳过 → 差分做在了旧图上。
- 从剪贴板读东西，把用户的 OpenAI key 打印到了输出里 → 已提醒用户换 key；以后不读剪贴板。
- 提交共用文档时带上了别的会话没提交的改动。
- 夜景上抠图灰边明显（纯灰底残留）。
- 花费：Seedance 约 345 credits；OpenAI 约 18 张 2560×1440 high（账单以 OpenAI 为准）。
