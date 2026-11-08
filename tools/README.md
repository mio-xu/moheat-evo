# tools/ — production, QA and workflow scripts

One table of every tool (user 2026-11-08: easy to change / maintain / use, DEMO_DESIGN_GUIDE §14; every lesson becomes a check, §6
制作流程 v2). Details: each script's docstring (`python3 <tool> -h` or the top of the file), `tools/art/README.md`, `tools/animate/README.md`.
Rule: one QA entry point — new checks go **into** `tools/qa/check_demo.py`, not into a new command people must remember.

## QA (gates G4–G8)
| Tool | Use |
|---|---|
| `python3 tools/qa/check_demo.py <demo> [--quick\|--full] [--checklist] [--json]` | THE entry point: PASS / WARN / FAIL table; G4 layers / cut-body / patches / eyes / edges / fringe / blink / far-motion / looks, G5 syntax / refs / links / files / cache / l10n / voice / end, G6 browser rows, G7 cover / release / style, G8 hygiene (incl. budget, script.md) |
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
| `python3 tools/web/bump.py <files…> [--stage]` · `--auto [files…]` · `--check` | `?v=` numbers; `--auto` = content hash (8 hex), `--check` lists stale ones |
| `merge_remake.py` · `remake_page.py` · `thumbs.py` · `check_cover.py` · `cover_shots.js` · `check_shell.js` · `check_mobile.html` | remakes, thumbnails, cover standard, UI shell, mobile check |
| `node tools/l10n/check_missing.js <lang> [folder]` | untranslated strings |

## Workflow (several sessions, one working tree)
| Tool | Use |
|---|---|
| `python3 tools/git/commit_mine.py "<msg>" <paths…> [--match <file> <regex>] [--lines <file> A-B] [--patch x.diff] [--dry-run] [-F msg.txt]` | commit only your paths / change blocks via a private temp index from HEAD; `--match` (= old `--hunks`) / `--lines` select exact `-U0` change blocks, print them, and refuse (exit 4) when a selected block holds a changed line no selector matches (a neighbour's edit); `update-ref` with old value (rebuilds if HEAD moved); keeps the shared index in step; refuses empty commits; prints `git show --stat`. `MOHEAT_AGENT=<id>` warns on claimed paths. Tip: for a shared doc with others' edits, apply your edit to `git show HEAD:<file>` too and commit the `diff -u` of that as `--patch` |
| `python3 tools/git/claim.py claim\|release\|list\|check\|scratch` | claim table (`docs/CLAIMS.md`, live in `.git/moheat-claims.json`); per-agent scratch folder |
| `python3 tools/report/balances.py [--budget] [--write docs/budget.md] [--demo <demo>]` | Seedance / ElevenLabs balances + OpenAI spend per demo, ⚠ at 80 % of $10, stop over it |
| `python3 tools/cleanup/audit.py [--list cat] [--trash cat]` | clean-up report (§12.2) |

Python note: the system `python3` is 3.9 — a script written through a shell heredoc with long CJK lines can fail with
"Non-UTF-8 code … no encoding declared"; put `# -*- coding: utf-8 -*-` on line 1.
