# Task claims — who edits what (live)

User 2026-11-08 (提效标准): a claim table so parallel sessions do not edit the same files. Several sessions share **one working tree
and one index**, so the live table is kept inside the clone (`.git/moheat-claims.json`, seen by every session at once, never
committed) and read / written only through the tool:

```
python3 tools/git/claim.py claim   <agent> <path…> --note "what for"   # before you start editing; ⚠ + exit 1 if someone else holds it
python3 tools/git/claim.py list                                         # who holds what (claims older than 12 h are marked STALE)
python3 tools/git/claim.py release <agent>                              # when your task is committed
python3 tools/git/claim.py scratch <agent> <scratchpad>                 # your own scratch folder <scratchpad>/<agent>/
```

Rules
- **One id per session** (`ui-shell`, `lp-mouths`, `demo43`, `workflow`, …); `export MOHEAT_AGENT=<id>` so `tools/git/commit_mine.py`
  warns before you commit a path someone else claimed.
- Claim the **smallest** thing: a demo folder, one `_kit/` folder, one shared file. Shared hot spots (`demos/shared/*.js`,
  `DEMO_DESIGN_GUIDE.md`, `WORKLOG.md`, `tools/qa/check_demo.py`) are not claimed whole: edit them in small hunks right after
  re-reading, and commit only your hunks (`commit_mine.py --hunks <file> <regex>`).
- A claim held by someone else = talk to them (SendMessage / the coordinator) before editing; never revert their changes.
- **Scratchpad prefix rule** (2026-11-08: two agents' same-named `commit.sh` in one shared scratchpad → a wrong commit): every
  temp script / file goes under `<scratchpad>/<agent>/`; no bare `commit.sh` / `tmp.py` at the scratchpad root.
- Release when done (`release <agent>`); the coordinator may release STALE claims.

`docs/engine/MIGRATION.md` keeps its own claim column for engine migrations (one demo per session).
