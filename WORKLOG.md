# 工作日志 · Work log

> 用户 2026-11-08：「每次工作结束都要写日志，方便如果以后我换 agent 了也可以看懂」。
> **每次工作结束**（一轮对话的任务告一段落时）在最上面加一条：日期、会话 / 主题、做了什么、现在的状态、下一步、遇到的问题（问题的详细教训写进 `DEMO_DESIGN_GUIDE.md` §11.1）。
> 写给不了解上下文的人看：写清文件路径和命令，不写"上面那个""刚才"。多个会话同时工作时各写各的条目，最新的在最上面。
> 用户偏好在 `USER_PREFERENCES.md`，整体状态在 `HANDOFF_ASMR_DEMOS.md`，用户任务清单在 `TASKS.md`。

---

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
