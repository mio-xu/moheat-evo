# Demo30 · layer plan (DEMO_DESIGN_GUIDE §6.2 / §6.3) — same method and look as Gaku's Demo27 (user 2026-11-08)

Empty background plates, Saku on a plain grey background per pose, expression variants as Seedance edits (mouth open, eyes closed)
→ face patches (`tools/art/build_stage.py`), composed live by `demos/shared/layers.js`. No video.

| View | Pose (art) | Face patches | Background | L0 / L1 (code) | credits |
|---|---|---|---|---|---|
| stalls | saku_reach = same-face edit of saku_ref | saku_ref's talk + blink | bg_stalls | parallax, breathing, lantern flicker | 25 (+ ref 75) |
| fan | saku_fan (new pose, on your left) | own talk + blink | bg_steps | + cool haze where the fan's air goes | 75 |
| kakigori | saku_kakigori = same-face edit of saku_fan | saku_fan's | bg_steps | | 25 |
| breath_L | saku_breath2 (edit without the listener's hand) mirrored → saku_breathL | none (profile edge) | bg_steps | | 50 + 25 |
| whisper_R | saku_whisper2 (edit without the listener) | saku_whisper_talk | bg_steps_fw | + firework flashes | 50 + 25 |
| fireworks | saku_fan (saku_fw unused: its face came out smaller) | saku_fan's | bg_steps_fw | + firework flashes | (25 unused) |
| (plates) | bg_stalls, bg_steps, bg_steps_fw (= edit of bg_steps) | — | | | 75 |

Total ≈ 400 credits (one batch, `python3 scripts/seedance.py layers`). The first flat stills (`assets/art/flat_v1/`, 150 credits)
were replaced by this set. Video: none; candidates only if wanted after playing (him leaning in to blow on your ear — 64).
