# Script · Demo44 『まちがい召喚と、まほう学院の三人』 · Summoned by Mistake · 错误召唤：魔法学院的三人

> Template: `tools/qa/SCRIPT_TEMPLATE.md` (G1). Crossover ② = `docs/proposals/2026-11-08_crossover.md` **M1-West** (approved with M1).
> Pre-production by agent `prepro` (2026-11-09). Lines (ja + en + zh, one source): `scripts/script_data.py` → `lines.js` / `l10n.js`.
> Thermal data: `project/thermal_plan.json` → `python3 tools/thermal/plan_sim.py <this folder>` → `project/thermal_preview.csv`.

## 1. Pitch
- Category / series: **for-men · crossover (穿越篇) ② Western fantasy**, the for-men streamer art style (Demo43 pilot, guide §5.1).
  Cast (each appears once in the crossover series, per the user): **椿** (`docs/characters/tsubaki.md`, voice `tsubaki`), **ココア**
  (`cocoa.md`, voice `cocoa`), **ルナ** (`luna.md`, voice `luna`). Face, eye / hair colour, personality and voice unchanged; outfit,
  hairstyle and identity changed (design options → `project/designs_contact.jpg`).
- Core identities, built on each character's core (USER_PREFERENCES「剧情贴着人设核心」):
  - **椿** — princess and top student of the summoning class; tried to summon a dragon and got *you*. Polite keigo, airhead
    (「ていねいに…最高速で参りますわ！」). Look: white-gold academy uniform + capelet, camellia crest, crown braid + red camellia.
  - **ココア** — master of the underground alchemy workshop; brews the "makes-everything-sweet potion" (= hot cocoa) for you.
    Sweet, doting, a little teasing. Look: leather alchemist apron, goggles on a cream beret, one big side braid + cream ribbon.
  - **ルナ** — professor of ice and night magic; runs a secret night tea salon at the top of the astronomy tower (no alcohol).
    Cool, few words, quietly teasing. Look: navy scholar robe with black fur collar, crescent earring, low bun with the blue inner layer.
- The "wow" per scene: the summoning circle flaring around you · flying over the academy at dusk, a dive and a sharp turn · the
  furnace flame flaring orange · ice crystals forming in Luna's palm and circling your head · the return circle opening at dawn.
- Length ≈ 2:50 (5 parts) + three short free-talk windows; then 「もっと話す」 = 5 places × 椿 / ココア / ルナ / 三人.
- Interactions (8): choice ×3 (+ the 3-way ending), action ×1, long-press ×2, say-it-aloud ×1, free talk ×3. Every answer can be
  tapped or said (EN / 日本語 / 中文; `l10n.js` voice phrasings). Default = interactive; pure mode auto-answers (first option) and
  the windows get the silence bridge.

## 2. World rule card (§0.1)
| Rule | Value |
|---|---|
| World / phenomenon | 王立セレスタ魔法学院 in an invented storybook Western-fantasy kingdom. Magic: summoning circles, brooms, alchemy, ice magic. Everyone speaks Japanese (t04 says it once). |
| Cool or warm, how strong | **Summoning / return circle light: NO temperature** (light + sound only; said in-world by Tsubaki in the keep-talking `ht2`, and by Luna `bl_p_circle`). **Ice magic = real ice crystals**: cool, ≤ 0.55 at the ear, ≤ the real-source limit. **Fire only from real flames** (braziers, furnace, fireplace). Broom = real wind, strength ∝ speed (≤ 0.92 in the dive). |
| Physics | Ice: has a source (Luna's palm), a direction (it orbits your head: the cold moves with it), falls off with distance, melts in ~3 s when dropped. Fire flare: front-right, rises 0.25 s, fades 1.6 s. Wind: front at cruise, swings left → right in the turn, drops when landing. |
| What you see | Cold = blue-white (frost on the cold cabinet, ice crystals, the night window, blue wind streaks); hot = orange-red (braziers, furnace flare, fireplace, steam from the mug). |
| First appearance, slow | Ice magic: `@crystal_show` before `l04` — one crystal forms in her palm in front of you over 3 s, she names it (「本物の氷だから、近づくと…つめたいでしょ」), only then the 6 s orbit. Wind: take-off ramps 0 → 0.3 over 2 s before cruise and dive. |
| Real sources (≥ half) | braziers, stone draught, wind, furnace + flare, cold cabinet frost, hot cocoa mug, her breath (blow), fireplace, night air, sun, every voice → 11 of 12 sources are real; magic = only the ice crystals. |
| Special-setting exception | None: every voice is warm (strongest at the ear). Cocoa's blow = breath, not voice (cool, guide §0 rule 2). |

## 3. Scenes and shot list (§6.5 S5)
| # | Scene / place | Shot | Where "you" are | Character side + pose | Look | Holding | NOT holding / not in the layer | Who talks | Plate | Pose |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 召喚の大広間 | mid (thighs up) | sitting in the middle of the circle on the floor | 椿 centre, standing, wand at chest; t07 = leans to your LEFT ear (voice only, same view) | tsubaki `academy` (design pick) | slim white wand | no circle / brazier / floor in the layer | 椿 | `bg_hall` (braziers L + R, circle glow) | `tsubaki_base` (= design pick) |
| 2 | 学院の上空 | close, from behind on the broom | behind her on the same broom | 椿 lower centre, back to you, looking back over her LEFT shoulder (face on the left) | `academy` | broom handle (both hands) | no sky / clouds in the layer | 椿 | `bg_sky` | `tsubaki_broom` (new, lock-face from the base) |
| 3a | 錬金工房 | mid | on a stool | ココア centre; 椿 off-screen left (t18 voice from the left) | cocoa `alchemist` | wooden ladle | no cauldron / furnace / shelves | ココア (椿 off-screen) | `bg_lab` (furnace + cauldron RIGHT, cold cabinet LEFT) | `cocoa_base` |
| 3b | 錬金工房 · mug | close at your RIGHT cheek | same | ココア right, leaning in, mug below her chin; the blow = `cocoa_ear_blow` (pursed lips) | `alchemist` | round mug of hot cocoa (steam = code FX) | nothing across her face | ココア | `bg_lab` | `cocoa_ear` (+ `cocoa_ear_blow` masked edit) |
| 4a | 塔の上の夜のお茶会 | mid | armchair by the tea table | ルナ centre, one palm raised (the crystal = code FX on the palm) | luna `professor` | nothing (palm up) | no crystals / table / fire in the layer | ルナ | `bg_tower` (fireplace LEFT, open window RIGHT) | `luna_base` |
| 4b | 塔の上 · whisper | close at your RIGHT ear | same | ルナ right, leaning in | `professor` | tall glass of iced tea, low | no ice crystals drawn (FX) | ルナ | `bg_tower` | `luna_ear` |
| 5 | 夜明けの塔 | wide, three together | standing by the return circle | 椿 left · ルナ centre · ココア right (multi-character view from the base poses, `dawn_3`) | all default looks | as their bases | — | each in turn (own mouth set) | `bg_dawn` (edit of `bg_tower`) | reuse bases |
| 5e | ending whisper | the chosen one at your ear | same | 椿 → LEFT ear (`tsubaki_base`), ココア → RIGHT (`cocoa_ear`), ルナ → RIGHT (`luna_ear`) | — | — | — | the chosen one | `bg_dawn` | reuse |

One look per character for the whole demo (they don't change clothes). Every talking pose gets a LivePortrait mouth set with anime
teeth (`"mouth": "lp"`); `tsubaki_broom` is a three-quarter look-back → expect `"view": {"rotate": "auto"}`; `cocoa_ear_blow` is
used as a still (no mouth set while blowing — no line plays then).

## 4. Thermal table (DUAL) — data: `project/thermal_plan.json`
| Time / line | Source (physical, visible) | Ear L | Ear R | Mode | Peak | Why plausible |
|---|---|---|---|---|---|---|
| 1 · t01–t08 | stone draught · braziers left + right | .12 + .15 | .12 + .15 | cool + warm | .3 | a cold stone floor; two real fires at your sides; the circle's light is only light |
| 1 · t07 | 椿 whispers at your LEFT ear | voice | — | warm | .9 | voice at the ear |
| 2 · take-off → cruise | head wind ∝ speed | .3–.35 | .3–.35 | cool | .35 | flying in the open |
| 2 · hold「しがみつく」 | the dive at full speed | **.92** | **.92** | cool | **PEAK** | fastest flight, both ears in the wind |
| 2 · t15 left turn | wind swings from your LEFT ear across to the RIGHT (1.6 s) | .6 → 0 | 0 → .6 | cool, moving | .6 | the broom banks left, the wind comes round |
| 2 · her lines | 椿 in front-left (40 cm) | voice ×.6 | small | warm | — | she turns back to talk |
| 3 · whole scene | cold cabinet LEFT · furnace RIGHT | cool .25 | warm .3 | **direction** | — | frost spills from the cabinet; the fire under the cauldron |
| 3 · after c04 | furnace flare (salamander scale), front-right | .1 | **.88** | warm | **PEAK** | a real flame jumps up and dies down in 1.6 s |
| 3 · c07–c08 | hot mug pressed to your RIGHT cheek | — | .6 | warm | .6 | a hot drink at the cheek |
| 3 · after c08 (silent) | she takes the mug away and **blows** on your right cheek | — | warm .6 → 0, cool → .75 in < 1 s | **fast switch** | .75 | breath on the skin; mug gone (heat fades 0.5 s) |
| 3 · c09 / c11 | her whisper at your RIGHT ear | — | voice | warm | .9 | voice at the ear |
| 4 · whole scene | fireplace LEFT · open night window RIGHT | warm .35 | cool .2 | direction | — | real fire; cold night air through the window |
| 4 · @crystal_show | ONE ice crystal forming in her palm in front (slow, 3 s) | .15 | .15 | cool | .3 | real ice, first shown slowly |
| 4 · hold「じっとする」 | crystals orbit your head 360° in 6 s | passes the LEFT ear **while the fire warms it** | passes the RIGHT ear | cool moving + warm | .55 | real ice moving round you; the fireplace stays on the left → **same-ear cool + warm** |
| 4 · l07 | her whisper at your LEFT ear by the fire | voice + fire | — | warm | .9 | — |
| 4 · l10 | her whisper at your RIGHT ear, by the open window | — | voice warm + night cool .3 | **same-ear DUAL** | .9 | voice + night air |
| 5 · dawn | sun in front · morning air · embers left | .08 + .08 | .08 | warm + cool | .2 | sunrise, cool morning |
| 5 · ending | the chosen one at your ear (椿 LEFT / ココア RIGHT / ルナ RIGHT) | voice | voice | warm | .9 | voice at the ear |

DUAL showcase planned: [x] fast hot↔cold on one ear (right cheek: mug → blow, silent moment) · [x] a peak at the top (dive .92 cool,
flare .88 warm) · [x] clear left / right direction (cabinet ↔ furnace, wind sweep L → R, fire ↔ window) · [x] cool + warm at the same
time on one ear (orbit past the fire, l10 by the window). Simulated with the real voice loudness: `project/thermal_preview.csv`
(see §7). Not heated: blushes, sweetness, the circle's light, the "sweetening potion" name.

## 5. Interactions
| # | Prompt | Choices (each sayable; voice phrasings in l10n.js) | Kind | What changes |
|---|---|---|---|---|
| 1 | after t02 | 「ドラゴンじゃないです」 / 「ここ、どこ？」 | choice | apology + intro (t03a) / straight to the intro |
| 2 | after t08 | 「ほうきに乗る」 | action | take-off |
| 3 | t11 | 「もっと速く！」 / 「ゆっくりで…」 | choice | t12a / t12b (she goes full speed either way — airhead) |
| 4 | the dive | 「しがみつく（長押し）」 4 s | hold | let go = t13x and again; the cold peak lasts while you hold |
| 5 | window ① t16 | anything (flying things in your world? yes / no / topics) | free talk | bridge line by topic (`lines.js` topics / bridges) |
| 6 | after c09 | say 「いただきます」 | say aloud | she lets you drink (sip warmth) |
| 7 | window ② c12 | anything (sweets of your world) | free talk | bridge |
| 8 | l05 | 「じっとする（長押し）」 6 s | hold | the crystal orbit; let go = l06x and again |
| 9 | after l08 | 「きれい」 / 「つめたい！」 | choice | l09a / l09b |
| 10 | window ③ l11 | anything (stars at night? yes / no) | free talk | bridge |
| 11 | l12 | 椿の髪飾り / ココアのリボン / ルナの耳飾り | 3-way ending | her whisper at your ear (L / R / R) → present day → cover with the ending token |

## 6. もっと話す · keep talking (place × cast, like Demo43)
5 places (✨ 召喚の大広間 · 🧹 学院の上空 · ⚗️ 錬金工房 · 🌙 塔の上のお茶会 · 🌅 夜明けの塔) × 椿 / ココア / ルナ / 三人 = 20 talks,
data in `scripts/script_data.py` `PLACES` (beats per cast, `'@event'` from `thermal_plan.json`, own topic + one bridge per person).
Live AI version = the same choices via `tools/talk/server.py` (build stage; `tools/talk/demos.json` entry).

## 7. Review
- Script + shot list + thermal table: written by `prepro` 2026-11-09 (coordinator rule: no waiting; reviewed against §0.1 and the
  proposal). Sample view: build stage (G3 S12 / G4).
