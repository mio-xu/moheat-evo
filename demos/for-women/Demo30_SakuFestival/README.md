# Demo30 · なつまつり、ふたりで · Summer Festival, Just Us

For-women series. **Saku (宮代 朔)**, 20, heir of the local shrine and your childhood friend — teasing, and tonight serious. The first
summer demo. Design (story, stages, thermal table): `project/DESIGN.md`. Made like Gaku's Demo27 (user 2026-11-08: same final look
and method): layered stills, drawn expression variants, no video.

## Story (≈ 2:00, 5 stages)
festival stalls (he reaches back for your hand) → the shrine steps (**he fans you: the uchiwa's cool air sweeps around your head**) →
shaved ice (he feeds you), then **his cold breath after the ice at your left ear** → fireworks: his words drowned by the boom, you
ask "え、なに？", he repeats them at your right ear → your answer (2 endings) at your right ear.
Interactions: action (take his hand), hold (let him fan you), 3 choices, 1 "say it" action — all by click or voice (`shared/voice.js`).

## Thermal (DUAL, two layers)
- Voice: always warm at the ear he speaks at, with loudness (× 1 at the ear, × 0.6 ≤ 50 cm, × 0.28 further; × 0.5 straight ahead).
- Ambient: warm crowd (both, 0.15) · yakisoba griddle (right ≈ 1 m, slides behind as you walk on) · uchiwa fan (cool, moving
  az, pulsing with the strokes) · shaved ice in front of your face (cool 0.22) · his cold breath after the ice (left ear, 0.6) · his
  warm breath when he whispers. Fireworks are far: sound and light only. Holding hands: no heat.

## How it is made
| Layer | Art | Moves by |
|---|---|---|
| backgrounds | `bg_stalls`, `bg_steps`, `bg_steps_fw` (= edit of bg_steps) | parallax (shared/layers.js); lantern flicker, firework flashes (main.js) |
| Saku | poses on plain grey: `saku_reach` (= same-face edit of `saku_ref`), `saku_fan`, `saku_kakigori` (same-face edit of fan), `saku_breath2` (close-up, used mirrored = `saku_breathL`, `scripts/prepare_poses.py`), `saku_whisper2` (close-up) | breathing, talk bob (layers.js) |
| face | talk / blink edits → patches; kakigori and fireworks share the fan pose's patches; the breath close-up has no mouth patch (profile edge) | mouth follows the voice envelope, blinks |

- Art: `python3 scripts/seedance.py layers` (all bases and edits in one batch — output URLs expire) + `fix …`; raw PNGs in
  `assets/art/` (not in git). Then `python3 scripts/prepare_poses.py` → `python3 tools/art/build_stage.py demos/for-women/Demo30_SakuFestival --preview`
  (`project/stage.json`: `matte: ai` for every pose — the plain grey key left a light halo on the night scenes; fixed mouth ellipses
  `centre_mouth` where a hand / prop pulled the search away).
- Voice: ElevenLabs `saku` r1_a (`7R01hi42FiEiqOj5XqSE`) — `python3 scripts/voice.py`. Languages: `python3 scripts/make_l10n.py`.
- Cover / thumbnails: `python3 scripts/make_cover.py` (needs the repo-root server on :8765) + `python3 tools/web/thumbs.py Demo30_SakuFestival`.
- Credits used: ≈ 775 (looks 75, a first flat-still set 175 — replaced, layered set 400, close-up fixes 125 incl. 75 of failed edits).

## Status (2026-11-08)
Both branches end to end in Chrome (`?auto=1&pick=0|1`): 6 views in order, 0 errors, ends on `stop`; 中文 no missing strings; one
screen at 1470×779; voice answers judged (unrelated speech ignored). In nav.js, the site menu and credits.html.
Known: the left-ear close-up is the right-ear art mirrored (mask / mole swap sides, ~5 s); a faint edge remains around the hair.
