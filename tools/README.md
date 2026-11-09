# tools/ — production, QA and workflow scripts

One table of every tool (user 2026-11-08: easy to change / maintain / use, DEMO_DESIGN_GUIDE §14; every lesson becomes a check, §6
制作流程 v2). Details: each script's docstring (`python3 <tool> -h` or the top of the file), `tools/art/README.md`, `tools/animate/README.md`.
Rule: one QA entry point — new checks go **into** `tools/qa/check_demo.py`, not into a new command people must remember.

## QA (gates G4–G8)
| Tool | Use |
|---|---|
| `python3 tools/qa/check_demo.py <demo> [--quick\|--full] [--parallel] [--checklist] [--json]` | THE entry point (one headless Chrome at a time; `--parallel` = main + alt together, max 2): PASS / WARN / FAIL table; G4 layers / cut-body / patches / eyes / edges / fringe / blink / far-motion / looks, G5 syntax / refs / links / files / cache / l10n / voice / end, G6 browser rows, G7 cover / release (thumbnails vs cover by content: `assets/images/demos/<dir>.thumbs.json`) / style, G8 hygiene (incl. budget, script.md) |
| `python3 tools/qa/check_deps.py [--fail] [--json] [--scripts]` | dependency rule (§12.1): a demo loads only its folder, `demos/shared`, its category `_kit` |
| `python3 tools/qa/changed.py <since> [--worktree] [--json]` | which demos × QA areas (art / mouth / thermal / ui / mobile) changed → tester roles + checks |
| `python3 tools/qa/ci_report.py <since> [--all]` | CI half (`.github/workflows/qa.yml`): check_deps + check_demo --quick on changed demos, annotations + summary, always exit 0 (never blocks Pages) |
| `node tools/qa/trace_demo.js` · `drive_story.js` · `page_probe.js` · `device_matrix.js` | behaviour trace / diff, drive demos without `?auto`, browser half of check_demo, device matrix |
| `tools/qa/CHECKLIST_TEMPLATE.md` · `SCRIPT_TEMPLATE.md` · `QA_TEAM_BRIEF.md` | manual checklist per demo · G1 script (world rule card, shot list with look, thermal table) · tester roles |

## Art (G3 / G4)
| Tool | Use |
|---|---|
| `python3 tools/art/prompts/fill.py <template> <character> field=value … [look_id=] [--job <demo> <job>] [--ref] [--mask]` · `--list` | prompt templates: base_pose, full_figure, lock_face_edit, masked_blink, masked_outpaint, empty_plate; filled from `docs/characters/<id>.md` |
| `python3 tools/openai/images.py <demo> <job…> [--mask]` | gpt-image-2 (logs usage to `project/openai_log.json`, re-runs kept as `prior_usage`) |
| `python3 tools/art/build_stage.py <demo> [--preview] [--mouths-only]` | stage.json → `media/layers.js` + layers |
| `lp_mouths.py` · `clean_cutout.py` · `clear_pockets.py` · `extend_pose.py` · `complete_cutout.py` · `align_variant.py` · `recolor_rim.py` · `face_patches.py` | mouth sets, cut-out cleaning, body completion, variant alignment (see `tools/art/README.md`) |
| `python3 tools/art/check_art.py <demo> [--verbose]` | asset-standard checks: edges (flat head / near-edge cuts), fringe (backdrop colour on the rim), blink (one-eye, iris through lids), far-motion, looks (hair across poses, outfit within a look) |
| `check_cut_body.py` · `check_patches.py` · `node check_mouth.js` · `node check_motion.js` | cut bodies, patch alignment, lip-sync, animation physics |
| `python3 tools/art/style_card.py build \| check <demo>\|--all \| sheet [cat]` | category style cards `demos/<cat>/_kit/style.json` / `STYLE.md` / `style.js`, drift vs the series anchor, family portrait `style_family.jpg` |

## Data
| Path | Use |
|---|---|
| `docs/characters/<id>.md` | character cards (lock-face ref, colours, backdrop, looks, voice, speech, thermal) |
| `python3 tools/library/index.py` → `docs/library.md` | asset library: plates, props / FX, character layers, synthesized SFX, music |
| `tools/eleven/` (`cast.json`, `audition.py`, `pick.py`, `tts.py`) | ElevenLabs voices (handoff §4) |

## Web / release (G5 / G7)
| Tool | Use |
|---|---|
| `python3 tools/web/bump.py <files…> [--stage]` · `--auto [files…]` · `--check [--shared]` | `?v=` numbers; `--auto` = content hash (8 hex), `--check` lists stale ones (wrong hash, lower number, or a number set before the file's last commit) |
| `merge_remake.py` · `remake_page.py` · `covers.py <demo> [--publish \| --publish-only \| --check]` (finished covers + menu thumbnails from `cover.json` + `media/cover/art.webp`, template `cover_tpl.html`; `thumbs.py` = alias) · `check_ui.js` (strict: every interface element identical to the reference demo) · `check_cover.py` (2b numbers on the art) · `check_shell.js` · `check_mobile.html` | remakes, finished covers, one-interface gate, UI shell, mobile check |
| `node tools/l10n/check_missing.js <lang> [folder]` | untranslated strings |
| `node tools/web/check_kiosk.js [--quick] [--size 1024x768] [--shots DIR]` · `python3 tools/web/kiosk_precache.py [--check]` | exhibition (kiosk) mode: the whole visitor loop in headless Chrome (guide §7.4) · offline file list `kiosk/precache.json` (rerun after adding / changing demos) |

## Workflow (several sessions, one working tree)
| Tool | Use |
|---|---|
| `python3 tools/qa/heavy_lock.py run "<job>" -- <cmd…>` · `status` (Python: `heavy_lock.guard(job)`, node: `heavy_lock.js wrapSelf(job)`) | one heavy job at a time on this machine, 1-min load guard (1.5 × cores), low priority; exit 75 = did NOT run, machine busy, retry. Built into check_demo --full, build_stage, lp_mouths, lp_pose, render_mp4, covers.py batches |
| `python3 tools/qa/changed.py <since> --run [--quick\|--full] [--all]` | check_demo only on the demos a commit range touches, one at a time; shared / device.js changes run the representative set unless --all |
| `python3 tools/qa/patrol.py [-v] [--clean]` | one line: load, orphan QA Chromes, heavy-lock holder, leftover QA servers / tools; --clean closes only what is provably ours |
| `gh workflow run qa-full.yml -f demos=Demo10,Demo22` (`tools/qa/ci_full.py`) | the full gate on GitHub's machines (manual); WebKit, mic, device, raw art, git-ignored media = SKIP-cloud, not passed |
| `python3 tools/git/commit_mine.py "<msg>" <paths…> [--match <file> <regex>] [--lines <file> A-B] [--patch x.diff] [--dry-run] [-F msg.txt]` | commit only your paths / change blocks via a private temp index from HEAD; `--match` (= old `--hunks`) / `--lines` select exact `-U0` change blocks, print them, and refuse (exit 4) when a selected block holds a changed line no selector matches (a neighbour's edit); `update-ref` with old value (rebuilds if HEAD moved); keeps the shared index in step; refuses empty commits; prints `git show --stat`. `MOHEAT_AGENT=<id>` warns on claimed paths. Tip: for a shared doc with others' edits, apply your edit to `git show HEAD:<file>` too and commit the `diff -u` of that as `--patch` |
| `python3 tools/git/claim.py claim\|release\|list\|check\|scratch` | claim table (`docs/CLAIMS.md`, live in `.git/moheat-claims.json`); per-agent scratch folder |
| `python3 tools/report/balances.py [--budget] [--write docs/budget.md] [--demo <demo>]` | Seedance / ElevenLabs balances + OpenAI spend per demo, ⚠ at 80 % of $10, stop over it |
| `python3 tools/cleanup/audit.py [--list cat] [--trash cat]` | clean-up report (§12.2) |

Python note: the system `python3` is 3.9 — a script written through a shell heredoc with long CJK lines can fail with
"Non-UTF-8 code … no encoding declared"; put `# -*- coding: utf-8 -*-` on line 1.
