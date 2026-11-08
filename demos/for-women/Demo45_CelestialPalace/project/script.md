# Script · Demo45 『てんにょ様は、未来から』 · A Celestial from the Future · 来自未来的天女

> Template: `tools/qa/SCRIPT_TEMPLATE.md` (G1). Crossover ③ = `docs/proposals/2026-11-08_crossover.md` **F1-East** (recommended, approved
> with the series order TASKS #47). Pre-production by agent `prepro` (2026-11-09). Lines (ja + en + zh, one source):
> `scripts/script_data.py` → `lines.js` / `l10n.js`. Thermal data: `project/thermal_plan.json` → `python3 tools/thermal/plan_sim.py <this folder>`.

## 1. Pitch
- Category / series: **for-women · crossover (穿越篇) ③ unnamed fictional East**, for-women style card (style_3 soft cel, otome card
  finish, idol-handsome men). "You" = the woman player, dropped from a museum's bronze mirror into the frozen lotus pond of
  蒼月国・白露宮 (invented; no real dynasty markers — user 2026-11-08). Everyone speaks Japanese (k06).
- Cast (each once in the series): **迅** (`docs/characters/jin.md`, voice `jin`) — the crown prince called a tyrant; domineering,
  blunt, protective (「天女、か。…なら、俺のものだ」). **紫苑** (`shion.md`, voice `shion`) — imperial astrologer / strategist; the
  softest keigo, the most dangerous words; a moon rabbit 玉兎 on his terrace. **朔** (`saku.md`, voice `saku`) — the prince's shadow
  guard; teases you in private, deadly serious when assassins come; his anchor = the white fox mask.
- "Wow" per scene: plunging through the ice under a huge moon · the brazier roaring up in the prince's dark gold chamber · the
  open star terrace with the Milky Way, the armillary sphere and the jade rabbit · torches gliding past the railing while you hide in
  a pillar's shadow · the ring of light opening in the thawing pond at dawn.
- Length ≈ 3:00 (5 parts) + 3 free-talk windows; then 「もっと話す」 5 places × 迅 / 紫苑 / 朔 / 三人.
- Interactions (9): long-press ×2 (grab his hand · hold your breath), choice ×4 (+ the 3-way ending), free talk ×3; every answer can be
  tapped or said (EN / 日本語 / 中文, `l10n.js` voice phrasings).

## 2. World rule card (§0.1)
| Rule | Value |
|---|---|
| World / phenomenon | Invented palace kingdom; the only "magic" = the bronze mirror / the ring of light in the pond that carries you between times. Shion "reads the stars" (no magic effects). |
| Cool or warm | **The mirror's flash and the ring of light: NO temperature** (light only). Everything else is a real source: pond water, winter night air, cloak, brazier + its flare, bronze hand-warmer, north wind, incense burner, his feather fan moving cold air, torches, sun, voices. |
| Physics | Plunge = icy water on skin and ears (.92, both) → out of the water but soaked (.45) → dry cloak (.12 + cloth warm .18). Brazier flare rises .3 s, fades 1.8 s. Fan: the incense warmth is swept off the cheek and cold air replaces it (< 1 s). Torches: a few metres away, warm .32 max, moving L → R over 5 s. |
| What you see | Cold = blue-white (ice, moonlight, snow at the lattice window, wind ribbons); hot = orange-red (brazier, hand-warmer glow, incense ember, torches, dawn). |
| First appearance, slow | The ring of light (no temperature) is first seen at the plunge as the mirror's flash, then explained by Shion (s12). |
| Real sources (≥ half) | 100 % — no magical temperature at all. |
| Special-setting exception | None: every voice is warm. The fan's air = moving night air, not a voice. |

## 3. Scenes and shot list (§6.5 S5)
| # | Scene / place | Shot | Where "you" are | Character side + pose | Look | Holding | NOT in the layer | Who talks | Plate | Pose |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 凍った蓮池 | mid | waist-deep in the broken ice, then on the edge | 朔 centre, reaching / standing; k08 whisper LEFT ear (voice only, same view) | saku `shadow_guard` | his blade at the hip (cloak over shoulder) | no ice / bridge / lanterns | 朔 | `bg_pond` | `saku_base` |
| 2a | 寝殿 | mid | on a floor cushion | 迅 centre, arms crossed; 朔 off-screen left (k10) | jin `crown_prince` | — | no brazier / screen / table | 迅 (朔 off-screen) | `bg_chamber` (window LEFT, brazier RIGHT) | `jin_base` |
| 2b | 寝殿 · hand-warmer | close at your RIGHT cheek | same | 迅 right, leaning in | `crown_prince` | small bronze hand-warmer, low | nothing across his face | 迅 | `bg_chamber` | `jin_ear` |
| 3a | 星見台 | mid | at the low table | 紫苑 centre with the feather fan | shion `astrologer` | feather fan (below chin) | no incense burner / sphere / rabbit (rabbit = prop layer at build) | 紫苑 | `bg_terrace` (open sky LEFT, incense RIGHT) | `shion_base` |
| 3b | 星見台 · whisper | close at your LEFT ear | same | 紫苑 left, leaning in | `astrologer` | fan low | — | 紫苑 | `bg_terrace` | `shion_ear` |
| 4 | 回廊 | close at your RIGHT ear | hidden in a pillar alcove | 朔 right, alert, finger near his chin ('shh', not over the lips) | `shadow_guard` | — | no pillar / railing | 朔 | `bg_corridor` (torches far LEFT) | `saku_ear` |
| 5 | 夜明けの池 | wide, three together | at the pond edge | 紫苑 left · 迅 centre · 朔 right (`dawn_3`, base poses) | all | as bases | — | each in turn | `bg_dawn` (edit of `bg_pond`) | reuse |
| 5e | ending whisper | at your ear | same | 迅 RIGHT (`jin_ear`), 紫苑 LEFT (`shion_ear`), 朔 RIGHT (`saku_ear`) | — | — | — | the chosen one | `bg_dawn` | reuse |

One look each for the whole demo. Talking poses = LivePortrait mouth sets with anime teeth (realistic-ish male faces → `teeth.alpha .75`
like Demo24 / 30); `saku_ear` has a finger near the chin → `"hide"` polygon if it overlaps the opening.

## 4. Thermal table (DUAL) — data: `project/thermal_plan.json`
| Time / line | Source (physical, visible) | Ear L | Ear R | Mode | Peak | Why plausible |
|---|---|---|---|---|---|---|
| 1 · @plunge | icy pond water | **.92** | **.92** | cool | **PEAK** | you went through the ice |
| 1 · hold「手をつかむ」 | out of the water, soaked in the winter air | .45 | .45 | cool | | wet skin in freezing air |
| 1 · @cloak + k08 | his dry cloak (cold drops, cloth warm) · his whisper at your LEFT ear | .12 cool + voice | .12 cool | cool + warm | .9 | cloak blocks the air; voice at the ear |
| 2 · whole scene | lattice window LEFT · brazier RIGHT | cool .25 | warm .3 | **direction** | | snowy window draught; real fire |
| 2 · @stoke | brazier flames leap (charcoal + pine), front-right | .2 | **.88** | warm | **PEAK** | real flame, fades in 1.8 s |
| 2 · j06–j07 | bronze hand-warmer at your RIGHT cheek + his whisper there | — | .5 + voice | warm | .9 | a hot hand-warmer + voice |
| 3 · whole scene | north wind LEFT (gusting) · incense burner RIGHT | cool .38 | warm .2 | direction | | open terrace |
| 3 · @by_incense → @fan_right (silent) | incense close to the right cheek → his fan sweeps the warmth away with cold night air | — | warm .5 → cool .7 in < 1 s | **fast switch** | .7 | moving cold air replaces radiant warmth |
| 3 · s08 | his whisper at your LEFT ear, in the north wind | wind .4 + voice | — | **same-ear DUAL** | .9 | |
| 4 · hold「息をひそめる」 | assassins' torches beyond the railing, LEFT → RIGHT over 5 s | → | → | warm, moving | .32 | a few metres away, so mild |
| 4 · k11–k16 | 朔 at your RIGHT ear in the cold corridor air | .18 | .18 + voice | cool + warm | .9 | |
| 5 · dawn | sun in front · morning chill | .08 + .07 | .08 + .07 | warm + cool | .16 | sunrise |
| 5 · ending | the chosen one at your ear (迅 RIGHT / 紫苑 LEFT / 朔 RIGHT) | voice | voice | warm | .9 | |

DUAL showcase: [x] fast hot↔cold on one ear (terrace fan, silent) · [x] peaks (plunge .92 cool, stoke .88 warm) · [x] direction
(window ↔ brazier, wind ↔ incense, torches L → R) · [x] cool + warm on one ear (s08 left ear in the wind; corridor). Not heated: the
prince's possessiveness, blushes, "tyrant", the mirror and the ring of light.

## 5. Interactions
| # | Prompt | Choices (sayable) | Kind | What changes |
|---|---|---|---|---|
| 1 | k02 | 「手をつかむ（長押し）」 3 s | hold | let go = k03x and again; pulled out of the water |
| 2 | after k04 | 「天女じゃない…」 / 「ここは、どこ？」 | choice | k05a + k05b / k05b |
| 3 | j02 | 「誰のものでもない」 / 「…あなたは？」 | choice | j03a (he likes your nerve) / j03b (introduces himself) |
| 4 | window ① j08 | anything (what's in fashion in the future) | free talk | bridge by topic |
| 5 | s08 | 「あたたかい」 / 「つめたい」 | choice | s09a / s09b |
| 6 | window ② s10 | anything (stars in your time? yes / no) | free talk | bridge |
| 7 | k12 | 「息をひそめる（長押し）」 5 s | hold | torches pass; let go = k13x and again |
| 8 | k14 | 「こわかった」 / 「平気」 | choice | k15a / k15b |
| 9 | window ③ k17 | anything | free talk | bridge |
| 10 | j10 | 迅の簪 / 紫苑の羽根 / 朔の狐の面 | 3-way ending | his whisper (R / L / R) → museum → cover with the token |

## 6. もっと話す · keep talking
5 places (❄️ 凍った蓮池 · 🔥 寝殿 · 🌙 星見台 · 🏮 回廊 · 🌅 夜明けの池) × 迅 / 紫苑 / 朔 / 三人 = 20 talks; data in
`scripts/script_data.py` `PLACES` (beats per cast, '@events', own topic + bridges). Live AI version via `tools/talk/server.py` at the
build stage.

## 7. Review
- Written by `prepro` 2026-11-09 against §0.1 and the proposal (coordinator rule: no waiting). Sample view at the build stage.
