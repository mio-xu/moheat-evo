# Script · Demo47 『ひやっと！おばけやしきの ちょうちんばん』 · Lantern Keeper of the Spooky House (all-ages ⑤, proposal A2)

> Pre-production by `prepro` 2026-11-09. Lines + stages: `scripts/script_data.py` → `lines.js` (`window.LANTERN_LINES`) / `l10n.js`.
> Thermal: `project/thermal_plan.json` (a game: sources driven by the game state). Designs = user picks (ぼんちゃん C, ghosts C, ゆらり B).

## Pitch
A summer-festival "haunted house" full of cute prankster ghosts. You carry ぼんちゃん, a talking paper lantern whose candle is warm.
A ghost approaching chills the ear on its side → turn the warm lantern that way and it squeals and flees. 5 stages (≈ 2:30): gate
(tutorial) → corridor (left / right, faster, pick up 3 sweets) → tatami room (ghosts from behind = both ears cool → hold the lantern
up; a false alarm = draught + wind chime, no giggle: answer 「風だ」/「おばけだ」) → dark storehouse (screen dark, ears only) → ゆらり
(the lonely ghost girl floats to your left ear: 「…いっしょに、あそんでくれる？」 → 「いいよ、あそぼう」/「こわくないよ」 → all the ghosts
come out, fireworks through the window). Hearts (3) + oil; ★1–3.

## World rule card
| Rule | Value |
|---|---|
| Special setting | Ghosts are chilly (b03 「おばけって ひんやり してるの」, y02 「わたし、つめたいでしょ」) — their cold arrives with them on that side; Yurari's whisper is cool. |
| Warm | The lantern's real candle (where you point it, 0.5), Bon-chan's voice, the summer night air. |
| Physics | Cold rises 1.5–2 s before the ghost arrives (device cool rise 0.2 s), a touch = 0.9 puff 0.4 s; warm fades 0.5 s after you turn away. |
| Visible | Ghosts glow pale blue-white, the lantern orange; the storehouse is dark but the lantern's ring of light stays. |
| Real sources | Candle, voices, draught, summer air (4 of 6). |

## Interactions
Turn the lantern left / right (tap or tilt), hold up (behind), drag sweets, say 「あっちいけ〜！」 (voice-judged), false alarm choice,
the dark stage, the final choice (sayable), 「またね」 at the end.

## Left (build stage)
Plates (gate with festival lights, corridor, tatami room, storehouse), sprites from the picked designs (bon-chan expressions, the
three ghosts, Yurari poses: far / ear / happy), game engine page (UI v2), SFX (giggles, wind chime, taiko, fireworks).
