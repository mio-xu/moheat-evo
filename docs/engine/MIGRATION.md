# Engine migration status

Plan: [`2026-11-08_engine_plan.md`](2026-11-08_engine_plan.md). Claim a demo here before migrating it; `demos/shared/engine/**` and each `_kit/**` are edited by one session at a time.

| Phase | State |
|---|---|
| P0 guards | Done: `tools/qa/check_deps.py`, `check_demo.py` refs (FAIL since P1), `tools/qa/trace_demo.js` |
| P1 decouple | Done 2026-11-08: `check_deps.py --fail` = 0 runtime violations, 34 of 34 demo folders |
| P2 engine core + pilot | Not started |
| P3 per family | Not started |
| P4 build scripts | Not started (`check_deps.py --scripts` lists the B references) |

## Verify a migration

```
node tools/qa/trace_demo.js <demo> --secs 60 [--click] --out before.json     # pages without ?auto: --click
# … change …
node tools/qa/trace_demo.js <demo> --secs 60 [--click] --out after.json
node tools/qa/trace_demo.js --diff before.json after.json
python3 tools/qa/check_deps.py --fail
python3 tools/qa/check_demo.py <demo> --quick
```

Run traces when `uptime` shows a load below ~50: on a saturated machine samples are lost and every comparison fails. Random auto-branches (Demo28's turn order, the talk demos' silence bridges) can differ between two runs of the same code: run it again before calling it a regression.

## Open items

- `live/` per demo (Demo41 / 42): the three private pages are still in `Demo23_NobunagaTalk/live/`; move them when the talk-server session has committed `tools/talk/` (its `demos.json` holds the routes).
- `tools/l10n/check_missing.js` scans a demo's own folder, so it finds nothing for thin pages (Demo15 / 16 / 23 / 41 / 42): teach it the kit in P2.

## Proposed pre-commit hook (not installed)

`.git/hooks/pre-commit`:

```sh
#!/bin/sh
python3 "$(git rev-parse --show-toplevel)/tools/qa/check_deps.py" --fail >/dev/null || { echo "check_deps: a demo loads from outside its folder / shared / its category _kit (python3 tools/qa/check_deps.py)"; exit 1; }
```

Note: the check reads the working tree, so another session's half-done work can block a commit; `git commit --no-verify` is the way out.
