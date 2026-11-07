# Storyboard (150 s) — The Runaway Seasons Express（季節が、暴走する。）

First person, seated in a fairy-tale train car, facing forward. No characters, no dialogue, no narration.
The car never changes. Only the two side windows change, and the left and right windows can show different seasons.
Timing source of truth: `scripts/seasons.py`. Times below are film times. The brief's original grid (winter 0–20 s …) was remapped after user feedback: the opening was too slow and long, so winter is now 12 s, and the tunnel (+3 s) and the chaos (+5 s) are longer. Preview frames are in `storyboard/frames/*.jpg`.

**Layers, back to front:**
1. Scenery `*_far`, `*_mid` and `*_near`, scrolling at 0.15×, 0.45× and 1.2× speed.
2. Interior `train_interior_{day,dusk,night}.png`, whose glass is transparent.
3. Glass overlays (frost, rain, sun haze, fog).
4. Particles.
5. `seat_foreground.png` and `table_props.png`.

**Motion:**
- The train sways slightly (±2 px, 1.05 s rail rhythm).
- The clock hands are drawn by code and spin faster during the chaos.
- Lamps flicker during the blackout.

| Time (s) | Scene | Left window | Right window | Interior light | Sound (position) | Thermal |
|---|---|---|---|---|---|---|
| 0–12 | **Winter forest** 冬の雪林 | winter far/mid/near + `frost_corner` | winter | day | winter wind, powder snow, ice cracks (left window) · train · music box (A minor) | **L cool** |
| 12–37 | **Summer coast** 真夏の海岸 | winter, then a thaw: `frost_overlay` fades out | summer coast + `heat_haze_overlay` + `fx_sun_glare` | day | summer breeze + waves (right) | **R heat** (breeze + *designed* sunlight). L cool fades (*designed* melting frost). Opposite temperatures at 12–20 s |
| 37–62 | **Tropical downpour** 熱帯のスコール | `rainforest_storm_far` + `raindrops_overlay`, lightning at 44 s | sunny rainforest; it turns stormy from 49 s as the rain moves over | dusk | tropical rain + drops sweep **left → right** (47–58 s) · thunder 44 / 53.5 / 59 s | L cool + R heat (sun), then **the cold travels to the right** |
| 62–73 | **Tunnel, ice ← → lava** | `tunnel_ice_wall`, `fx_icicle` | `tunnel_lava_wall`, `fx_lava_bubble` | night | ice cracks + icy wind (L) · fire + lava (R) | **L cool / R heat** |
| 73–77 | Tunnel, neutral | dark stone (blend) | dark stone | night | train only | ≈ 0 |
| 77–90 | **Tunnel reversed** | lava | ice | night | fire + lava + steam burst at 77.8 s (L) · ice + wind (R) | **L heat / R cool**, clearly reversed |
| 90–107.5 | **Seasons out of control** 季節の暴走 | snow → steam → summer → lava | snow → lava → storm → ice → winter | night, lamps flicker | jumps every 1.7–3.5 s (see `CHAOS` in seasons.py) | fast L/R changes, several opposite pairs |
| 107.5–111.5 | **Blackout** | dark | dark | lamps off | **complete silence** (music and train too) | **all four channels 0** |
| 111.5–125 | Out of control (2) | spring → lava → ice → spring | steam → winter → summer → spring | night → dawn | steam (R), wind (R) / fire (L), ice (L), breeze (centre) | fast changes, then settling |
| 125–150 | **Cherry blossom station** 春の桜駅 | spring far/mid/near, petals | spring, then `spring_station` from 140 s (the train brakes, 139–146 s) | day | spring breeze, birds, brakes, last music-box chord | gentle warmth on both ears → **0 at 150 s** |

**Title cards (ja / en only):**
- 0–1.8 s: the cover, 「季節が、暴走する。」 / *THE RUNAWAY SEASONS EXPRESS*. The Japanese line uses kana so it reads as Japanese, not Chinese.
- Each scene start shows its scene title, as in the Scene column above.
- 146–150 s: 「終点・さくら駅」 / *Last stop — Cherry Blossom Station*.
