# Demo31 · layer plan (DEMO_DESIGN_GUIDE §6 standard = Demo27 Gaku, §6.2 / §6.3)

Nagisa (look A: chestnut high ponytail, orange hair tie, navy firework-pattern yukata, orange obi) made the Gaku way:
one empty rooftop plate, Nagisa on a plain light-grey background per pose, same-face edits for poses that only change the hands,
drawn Seedance variants (mouth slightly open, eyes closed) → face patches → `tools/art/build_stage.py` → `media/layers.js` +
`../../shared/layers.js`. Effects in code. No video.

Lighting for every pose: cool blue summer-night light from above-right, a soft warm light from the open roof door on the LEFT.

| View (story) | Pose (art) | Face patches | Code (L0 / L1) | credits |
|---|---|---|---|---|
| arrive | `nagisa_ref`: standing, eye level, one hand rubbing the back of her neck, a grumpy blush, glancing aside | own talk + blink | parallax, breathing, crickets / breeze sway | 25 + 50 |
| popsicle | `nagisa_popsicle` = same-face edit of ref: half a light-blue soda popsicle in her hand, held out toward your right cheek (right edge), her half in the other hand | ref's | frost shimmer | 25 |
| fireworks | `nagisa_sit`: sitting on the bench, slightly left of centre, turned to you, hands in her lap, a shy serious look | own talk + blink | fireworks bloom in the sky on the right (code), coloured flashes on her | 25 + 50 |
| fan | `nagisa_fan` = same-face edit of sit: a round light-blue paper uchiwa in her hand at the LEFT edge, fanning | sit's | fan swing blur, breeze | 25 |
| laugh (ending B) | `nagisa_laugh`: sitting, flustered laugh, pointing at you, red face | own talk | fireworks | 25 + 25 |
| sparkler | `nagisa_sparkler` (event CG): close in front of you, her senko-hanabi hanging in front of her chest, the viewer's hand with the other one at lower right; warm light from below | own talk + blink | the two fireballs, sparks, the drop (code, as now) | 25 + 50 |
| whisper | `nagisa_whisper` (event CG): her face beside your left ear, eyes half closed, lips parted | own talk | fireworks glow | 25 + 25 |
| shoulder (ending A) | `nagisa_shoulder` (event CG): her forehead on your left shoulder, red ear, gripping your sleeve | — (face hidden) | breathing, fireworks glow | 25 |
| (all) | `bg_roof`: empty rooftop at night — steel door with light on the LEFT, water tank, railing, wooden bench, town lights, sea, starry sky, NO people, no fireworks | — | parallax | 25 |

Total ≈ 425 credits (test: ref + bg + ref talk / blink = 100; then the batch = 325). Video: none; candidates only if wanted after
playing (sitting down beside you / leaning in to whisper — 64 each).

The 8 flat stills made first (200 credits, `assets/art/nagisa_*.png`, before the standard was set) are not used for the page; they
stay in `assets/` only as reference for composition.
