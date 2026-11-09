# QA team brief

Testers of the MoHeat Evo demos. Devs build, testers only find and report bugs, the coordinator assigns fixes (user, 2026-11-08). The computer handles at most 4 background agents, so run 1–2 testers at a time.

**Rules**
- Do not edit, stage, commit, reset, push or pull anything in the repo. Do not stop processes, servers or Chrome tabs you did not start.
- Use your own headless Chrome or new tab and your own `python3 -m http.server <free port>` from the repo root.
- Save screenshots and evidence in the session scratchpad, in a folder named after your role.
- Read first: `CLAUDE.md`, `USER_PREFERENCES.md`, `DEMO_DESIGN_GUIDE.md` §6 制作流程 v2, §6.4, §7, §9.

**What to test**: the coordinator runs `python3 tools/qa/changed.py <last tested commit>` (demos × areas → roles). **Tools**: `python3 tools/qa/check_demo.py <demo> [--quick|--full]`, `node tools/qa/drive_story.js` (demos without `?auto`), `node tools/art/check_mouth.js`, `node tools/art/check_motion.js`, `python3 tools/art/check_patches.py`, `python3 tools/art/check_cut_body.py`, `tools/web/check_mobile.html`, `python3 tools/qa/check_deps.py`, `python3 tools/art/check_art.py <demo> --verbose`, `python3 tools/art/style_card.py check <demo>` (+ `demos/<cat>/_kit/style_family.jpg`). All tools: `tools/README.md`.

**Roles**
| Role | Covers |
|---|---|
| QA-功能 | story, both branches, interactions, three languages, console errors, 404s, ending on the demo's own cover, replay, top-bar buttons |
| QA-画面 | same character in every view, mouth, eyes, cut-outs, cut-off bodies, hands and props, layer order, animation physics, covers and thumbnails, at 2× |
| QA-冷热 | thermal + audio: plausible sources, direction matches picture and sound, fast hot↔cold, intensity, cool + warm on one ear, output stops at the end / on STOP, no clipping or double playback |
| QA-手机 | iPhone (WebKit, iOS Simulator) and Android, portrait + landscape, touch drag does not move the page, fullscreen + rotate prompt, tap targets ≥ 44 px, guide tappable |
| QA-平板 | iPad and Android tablet, both orientations, drawer, guide |
| QA-电脑 | Chrome, Safari (WebKit), Firefox at 1280×720, 1440×900, 1920×1080, keyboard (F / Esc / space), device connect UI |

**Report** (final message, in Chinese): a bug table with severity (P0 site broken, P1 user-visible, P2 polish), demo, exact repro (URL, steps, screen size, language), expected vs actual, evidence path, suspected file. No fixes. List passing demos briefly.

**机器负载（用户 2026-11-09）**：重活（`check_demo --full`、build_stage、lp_mouths、render_mp4、covers 批量）自动排队，同一时间全机只跑 1 个，负载高时等待，退出码 75 = 没跑 / 机器忙，要重试。结果 `BUSY` 不是 PASS 也不是 FAIL。默认只测改动：`python3 tools/qa/changed.py <since> --run`。全量放云端：`gh workflow run qa-full.yml`。巡查：`python3 tools/qa/patrol.py`。

**浏览器（用户 2026-11-09）**：每个 agent 同时最多 1 个无头浏览器（`tools/qa/chrome_guard.js` 自动排队，设 `MOHEAT_AGENT=<你的 id>`）；新写的工具在 `require('child_process')` 之前先 `require` 它；QA 结束跑 `python3 tools/qa/reap_chrome.py --kill`。
