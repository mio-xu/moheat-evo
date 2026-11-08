# tools/art — still-art helpers shared by every demo

- `face_patches.py` — face patches from expression variants (the grandparents-call method, DEMO_DESIGN_GUIDE §6.2): a pose is
  drawn once (the base), its variants (mouth open, eyes closed…) are Seedance image-to-image edits of that base; the script finds
  where each variant really changed (strongest separate area: one for a mouth, two for eyes), aligns it on that spot only and cuts a
  feathered ellipse. The page draws the base and fades the patches (mouth by the voice loudness, eyes for ~0.13 s blinks).
  Config: `<demo>/project/patches.json` (only names; `near` / `centre` + `radius` when the search is fooled — check
  `--preview`). Pillow + numpy only. Tested on Demo15's grandparents frames: grandma's mouth and grandpa's two eyes land within a
  few px of the hand-measured patches; a variant that came back zoomed needs a `centre` hint.
- `check_patches.py <demo>` — every patch at 100 % (base | base + patch | diff ×4 in `assets/patch_check/`) + `mouths.jpg` (each
  mouth closed | open at 2×). Exit code 1 on SEAM / OUTER (jaw, cheek or hair redrawn around the mouth) / OUTSIDE / BORDER / BOUNDS;
  lists NO-MOUTH views. Run after every `build_stage.py`.
- `check_mouth.js <demo> [seconds] [--alt] [--shots]` — the lip-sync at runtime: headless Chrome on its own port runs the story
  (`?auto=1&nomic`), samples `MoHeatLayers.state()` every frame and flags SILENT-OPEN / NO-MOVE / NO-PATCH / UNMAPPED / STUCK-OPEN /
  HALF / FLICKER; `--shots` saves each view's open / closed frame to `assets/mouth_check/`. Both branches (`--alt`).
