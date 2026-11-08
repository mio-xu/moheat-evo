# PREPRO · Demo49 『なつやすみ、ナオミと せんぷうき』 (healing · ⑦, proposal N1)

Pre-production by `prepro`, 2026-11-09 — **design stage only**. Naomi (the user's real cat) stays exactly herself; only the summer props differ.

## Done
- Options `project/designs_options.jpg`: A bamboo mat + oscillating fan with a streamer + wind chime · B towel-wrapped ice bottle + uchiwa + watermelon + mosquito-coil pig (option A was redrawn once: the first A lost the props). Recommendation was A; **USER PICK (2026-11-09): props B** (towel-wrapped ice-water bottle + watermelon + uchiwa + mosquito-coil pig; Naomi unchanged) → reference `assets/art/naomi_props_pick.png`. The script's oscillating fan stays (proposal N1) unless the user says otherwise; B's props lead the scenes.

## Done since
- `project/script.md` + thermal plan (fan sweep, ice bottle, rain window, Naomi warm). Art: three room plates with props B (day / rain / night), five Naomi poses on magenta (pancake, batting, cheek-on-cool, startled, on your shoulder).

## Left
- Cut-outs (long fur: check the rim on dark at 2×), eye-closed variants, the fan as its own prop layer, page (UI v2); Naomi sounds (user recordings if any, else Demo11's).
After the pick: script (N1), Naomi sounds (user's recordings if possible, else Demo11's synthesized), thermal plan, plates, poses (from Demo11 refs), build stage.

## G4 composition (agent `compose`, 2026-11-09) — DONE
- Naomi stays herself: the five poses are used as drawn (fur pattern / olive eyes checked side by side); masked blinks for all five
  (`scripts/variant_prompts.py`, composite: only the eye ellipses change). No mouth sets: she has no human speech (qa.json).
- The ice-water bottle is its own prop layer (`prop_bottle`, drawn on magenta) because the story drags it next to her; the three plates are
  masked edits without it (`bg_room_*_nobottle` → a 2nd pass for its foot `_nob` → `scripts/fix_plates.py` for a last towel sliver).
- `scripts/grade.py`: plates get a soft depth of field (`_soft`: the weave measured line density 0.178 vs the cat anchor 0.066 → ok);
  graded copies for the dusk shower / lamp-lit night (desaturate toward her own grey first — a plain colour gain turned her mauve-grey fur
  violet / pink). Cut-outs: `tools/art/clean_cutout.py --unmix` on every Naomi layer (re-run it after each build_stage).
- `scripts/make_stage.py` → 6 views: pancake (day), batting the fan's streamer (paw at the streamer), cheek on the cold bottle (she in front
  of it, her warm side to your right), thunder squeeze (left, rain), on your shoulder at your LEFT ear (night, ear 4 % below the top), night pancake.
  No 'fire' indoors. The fan stays in the plate (spinning blades = optional code overlay at G5).
- Checks: check_cut_body 0 · check_patches 0 (NO-MOUTH = by design) · check_art 0 FAIL (WARN looks: the rain-graded copy is darker — lighting,
  not a different cat) · style_card ok.
- Coordinator QA round 2: one camera distance → Naomi's head (eye distance) the same size in every room view (`make_stage.py` E = .1; the
  bottle prop stays .5); contact shadows + AO under her and the bottle (build_stage `"shadow"`, warm by day / grey in the rain / lamp-warm at
  night, offset away from the window light); the graded copies un-mix the magenta before grading (no pale rim); `"no_green": true` keys her
  mauve fur without the green rim the magenta un-mixing left (the earlier clean_cutout --unmix is no longer needed).
- Contact sheet: `project/stills_contact.jpg`.

## Left (G5+)
- Page (UI v2), fan sweep / streamer / rain / uchiwa in code, Naomi's sounds; check_motion (blinks) + plan_sim on the page.

## Spend (2026-11-09)
OpenAI ≈ $5.7 / $15 (G4: 5 blinks + bottle prop + 6 plate edits ≈ $2.8) · ElevenLabs 0.
