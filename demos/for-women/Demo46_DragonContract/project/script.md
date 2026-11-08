# Script · Demo46 『竜の王と、エルフの王と、小悪魔』 · The Dragon King, the Elf King and the Little Devil · 黑龙王、精灵王与小恶魔

> Template: `tools/qa/SCRIPT_TEMPLATE.md` (G1). Crossover ④ = `docs/proposals/2026-11-08_crossover.md` **F1-West**. Pre-production by
> `prepro` (2026-11-09). Lines: `scripts/script_data.py` → `lines.js` / `l10n.js`. Thermal: `project/thermal_plan.json` →
> `python3 tools/thermal/plan_sim.py <this folder>`. **Designs wait for the user's pick** (option sheet `project/designs_options.jpg`).

## 1. Pitch
- for-women · crossover ④, storybook Western fantasy. "You" = the woman player; an old book in a bookshop is a devil's contract.
- Cast (each once in the series): **陽向** (`docs/characters/hinata_m.md`, voice `hinata`) — the little-devil butler bound to you:
  sweet 「ご主人様っ」 in public, dark at the ear 「契約は…解除、できないよ？」. **岳** (`gaku.md`, voice `gaku`) — the Black Dragon King:
  few words 「…寒いか」, deflects compliments 「顔の話は、いいって」. **蓮** (`ren.md`, voice `ren`) — the Elf King of the snow forest
  who sings (his song walks in across the frozen lake).
- Wow per scene: the study's candles flaring as the devil appears in black smoke · the dragon valley at dusk, his breath lighting the
  stone beacon · his wing closing around you with a faint orange glow inside · the aurora over the frozen lake with stars under the ice
  · dawn through the frosted window.
- ≈ 3:00 (5 parts) + 3 free-talk windows; 「もっと話す」 4 places × 陽向 / 岳 / 蓮 / 三人.

## 2. World rule card (§0.1)
| Rule | Value |
|---|---|
| World | Invented storybook Western fantasy (the devil's study, the dragon valley, the elves' snow forest). Everyone speaks Japanese (h04). |
| Cool / warm | Hinata's black smoke and the glowing contract book: NO temperature. Dragon breath = real fire lighting a real beacon (a few metres ahead, warm). **Special setting: a dragon's wing holds fire inside** — told by Gaku (g07) and shown (faint orange glow through the membrane): his closed wing is warm at your left ear. Everything else real: fireplace, frosted window, cliff wind, wing downdraft, tea, frozen lake, cloak, sun, voices. |
| Physics | Wind from the LEFT (north peaks) .5; take-off downdraft .9 for 1.6 s; breath .82 rises .4 s, then the beacon burns on .28; wing: wind cut to .04 and warm .45 at the left ear in < 1 s; lake ice .3 both, cloak cuts it to .12 (+ cloth .15); his song from the far right is barely warm, warmer as he arrives. |
| First appearance, slow | The wing's warmth: g07 says it, then a silent 2.4 s close (`@wing`) before anything else. |
| Real sources | All but the wing's inner fire (one special setting). |
| Exception | None for voices: all warm. |

## 3. Scenes and shot list
| # | Place | Shot | You | Character side + pose | Holding | Talks | Plate | Pose |
|---|---|---|---|---|---|---|---|---|
| 1 | 契約の書斎 | mid → close | in an armchair | 陽向 centre (tea), then at your RIGHT ear (h06) | teacup / tray | 陽向 | `bg_study` (window LEFT, fireplace RIGHT) | `hinata_base`, `hinata_ear` |
| 2 | 竜の谷 | mid → close | at the cliff edge | 岳 centre (wings folded), 陽向 off-screen right (h08); then his wing around you from the LEFT, his face at your left (g09) | — | 岳 | `bg_valley` (wind LEFT, beacon ahead) | `gaku_base`, `gaku_wing` |
| 3 | 氷の湖 | far → mid → close | on the ice | 蓮 far right (walking in, singing) → centre → at your RIGHT ear | — | 蓮 | `bg_lake` | `ren_base`, `ren_ear` |
| 4 | 書斎・夜更け | close | armchair | 陽向 at your RIGHT ear | — | 陽向 | `bg_study` graded to late night | `hinata_ear` |
| 5 | 夜明け | wide three | by the glowing book | 岳 left · 蓮 centre · 陽向 right (`dawn_3`) → ending whisper (岳 LEFT / 蓮 RIGHT / 陽向 RIGHT) | — | each | `bg_dawn` (edit of `bg_study`) | reuse |

## 4. Thermal table (DUAL) — data: `project/thermal_plan.json`
| Line | Source | L | R | Mode | Peak | Why |
|---|---|---|---|---|---|---|
| 1 | frosted window LEFT · fireplace RIGHT | cool .18 | warm .25 | direction | | |
| 1 · h05 | hot tea held in front of your face | .2 | .2 | warm | .4 | steam |
| 1 · h06 | his whisper at the RIGHT ear by the fire | — | voice + fire | warm | .9 | |
| 2 | cliff wind from the LEFT | .5 | (~0) | cool | | north wind |
| 2 · @takeoff_gust | wing downdraft | **.9** | **.9** | cool | **PEAK** | |
| 2 · @breath | beacon lit by dragon fire ahead | .41 | .41 | warm | **.82** front | real flame, a few metres |
| 2 · @wing (silent) | wing closes from the left: wind cut + warm membrane | cool .5 → warm .45 | — | **fast switch** | | special setting, told + shown |
| 2 · g09 | his whisper at the LEFT ear inside the wing | wing + voice | — | warm | .9 | |
| 3 | frozen lake ice | .3 | .3 | cool | | |
| 3 · r01 → r02 | his song walks in from the far right | — | barely → .6 | warm, moving | | voice with distance |
| 3 · @cloak | half his cloak | .12 + .15 | .12 + .15 | **same-ear cool + warm** | | |
| 4 | fire low RIGHT · window LEFT · his voice RIGHT ear | cool .2 | warm .15 + voice | direction + DUAL | | |
| 5 | sun through the window (front-left) · morning chill · embers | | | warm + cool | .16 | |

DUAL showcase: [x] fast switch (wing, left ear) · [x] peaks (gust .9 cool, breath .82 warm) · [x] direction (wind, window ↔ fire, song
from the right) · [x] same-ear cool + warm (cloak on the ice, valley voices in the wind).

## 5. Interactions
| # | Prompt | Choices (sayable) | Kind |
|---|---|---|---|
| 1 | h02 | 「契約って、なに？」/「帰して」 | choice |
| 2 | h05 | 「紅茶を飲む」 | action |
| 3 | g04 | 「寒い」/「平気」 | choice |
| 4 | g07 | 「翼の中にいる（長押し）」 4 s | hold (let go = g08x) |
| 5 | window ① g10 | dragons in your world? (yes / no / topics) | free talk |
| 6 | r04 | 「歌って」/「お話しして」 | choice |
| 7 | window ② r07 | songs you like | free talk |
| 8 | h10 | 「消えないで」/「じゃあ、まだ決めない」 | choice |
| 9 | window ③ h12 | your world | free talk |
| 10 | r09 | 陽向の契約書 / 岳の鱗 / 蓮の氷の花 | 3-way ending |

## 6. もっと話す
4 places (📜 書斎 · 🐉 竜の谷 · ❄️ 氷の湖 · 🌅 夜明け) × 陽向 / 岳 / 蓮 / 三人, data in `PLACES`.

## 7. Review
Written by `prepro` 2026-11-09. Ren's song lines (r01, r05a) use the `[singing]` tag — listen before the build; if v4 does not sing,
the build stage keeps them as a hummed / spoken chant (or the user decides on ElevenLabs Music like Demo02).
