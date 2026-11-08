# Script · Demo04_SeasonsExpress — 「季節が、暴走する。The Runaway Seasons Express」 (remake v2, 2026-11-09)

> G1 of 制作流程 v2 (template `tools/qa/SCRIPT_TEMPLATE.md`). Scope approved by the user (TASKS #49, "都做"): magic × cyber
> transforming carriage, chibi season-spirit conductor (announcer, ElevenLabs, 3 auditions), DUAL thermal showcases, light
> interactions, UI v2 cover with the conductor, MP4 re-export. Reviewed by the coordinator brief (user: don't wait for replies).

## 1. Pitch
- Category / series / main character: all-ages · film (150 s, the soundtrack is the clock) · **the Season Spirit Conductor「きせつ車掌 ハルフユ / Conductor Halfy」** (card `docs/characters/halfy.md`).
- Core identity: a tiny conductor spirit, half snow / half sun, who runs the magic train and announces every stop (a Japanese train announcer, playful).
- The "wow": the retro wooden carriage **transforms** — its wall panels flip open to glowing rune circuits (ice-blue / orange), an ice-crystal shield rises over the windows, ceiling vents open and blow hot air, the car **splits in two** in the ice-fire tunnel (ice cabin left / fire cabin right), the runes glitch neon when the seasons run wild; roof hatch toys pop out (snowman / sun pinwheel); a hologram screen at the front shows the conductor.
- Length / chapters: 150 s film + interaction pauses; 6 chapters = 6 seasons; interactions: 3 (hold the tea · pick the ice / fire window · shout "Spring!").

## 2. World rule card (magic world, guide §0.1)
| Rule | Value |
|---|---|
| World / phenomenon | **Rune circuits** in the carriage walls carry the season outside each window into the car (the train's magic). Closed wooden panels = no season comes in; open panels = it does. |
| Cool or warm, which ear, how strong | Ice runes (blue-white) cool the ear on their side; fire runes (orange-red) warm it. Strength follows the sound of that season (wind / rain / ice → cool, breeze / fire / lava / steam → warm), capped at the same limits as real sources (cool ≤ 1, warm ≤ 0.9). |
| How it behaves physically | Source = the open panel + window on that side; falls off across the car (the far ear gets ≤ 25 %); gusts every 2–3 s; heat fades slowly (release 0.5 s), cold arrives fast. The window frames glow in the colour and strength of what the ear on that side feels **right now** (they are driven by the thermal output). |
| What you see | cold = blue-white (runes, frame glow, frost, ice shield, breath cloud, icicles); hot = orange-red (runes, frame glow, sun glare, heat shimmer from the vents, embers, melting ice pop). |
| First appearance (slow demonstration) | 0–7 s: the LEFT panels flip first (2.0–4.5 s) and only the left ear slowly cools; then the RIGHT panels (5.0–7.0 s) and the right ear follows. Only after that the blizzard sweeps fast. Fire runes: 13–15.5 s, right side first, slowly. |
| Real sources in this demo (≥ half) | sunlight through the glass (summer, right), **the cup of tea** (steam, you hold it in winter, it stands by the left window in the tunnel), **the brass wall lamp** (storm, left), **the open tunnel window's draft** (the side you open), **the conductor's voice** (whisper at your ear, its talk in the aisle). Magic: the rune circuits (all window seasons), the season chaos. → 5 real / 2 magic. |
| Special-setting exception | The **hologram** is light only: the conductor's announcements from the screen carry no warmth (nobody is there). The conductor **in person** (the whisper in the blackout, the goodbye in the aisle) is warm like any voice (strongest at the ear). It is half snow / half sun but its breath is ordinary warm breath — told by its line 「ほんものの ぼくだよ」 "it's really me". |

## 3. Scenes and shot list (one fixed seat, facing forward; "you" sit at the front-row table, aisle in the middle)
| # | Time (film s) | Scene | Shot | You | Conductor | Who talks | Picture layers |
|---|---|---|---|---|---|---|---|
| 1 | 0–12 | Winter forest | fixed seat | table, tea in front | hologram (front, above the door), bust | conductor (holo) | carriage plate (closed) → rune plate (ice tint) per panel flip; ice shield rising in both windows (code); frost; snow; snowman pops from the roof hatch (6.5 s); breath cloud in front of you |
| 1b | 7.6–12 (gate ~11) | **Gate: hold the tea** | same | your hands round the cup (cup lifts toward you, steam thick) | **in person**, popped into the aisle behind your table (wave pose, cut at the knees by the table) | conductor (a2) | tea cup prop + steam (code) |
| 2 | 12–37 | Midsummer coast | same | | holo | holo | fire runes on the right first, then by thermal side; ceiling vents open (glow + hot-air shimmer, code); sun pinwheel pops out and spins; ice pop melting on the table (drip) |
| 3 | 37–62 | Tropical downpour | same | | **in person** in the left aisle 37–42 s (switches on the lamp), then holo | in person (a4) | rain on the left glass (open top light → spray), the brass wall lamp on the left glows warm; lightning |
| 4 | 62–90 | Ice-and-fire tunnel | same | | holo | holo | **the car splits**: left half slides left (blue tint, icicles, frost), right half slides right (orange tint, embers); glowing rune seam in the middle; tea stands by the LEFT window and steams |
| 4b | ~65.5 | **Gate: open a window** — LEFT (ice) / RIGHT (fire) | same | | holo | — | the chosen window slides down: its side's frame glows stronger, more particles blow in |
| 5 | 90–118.5 | Seasons out of control | same | | holo glitches | holo | runes glitch neon (hue cycling, RGB-split slices), seasons swap every 2 s, then **every 1 s** (100–108), clock spins |
| 6 | 118.5–126 | Power cut | dark car, aurora outside | | **in person**: hops out of the dead hologram, flies to your RIGHT ear (close-up `ear` pose, its own warm glow) | conductor whisper | close-up pose at the right edge |
| 6b | ~125.6 | **Gate: shout "Spring!"** (voice-judged; tap fallback) | | | at your ear | you | power-up sweep, runes flash white |
| 7 | 126–150 | Spring cherry station | | | **in person** in the aisle 126–130 s ("Next stop, spring!"), again at 145.6 s waving goodbye (behind your table) | in person | panels flip closed one by one (back to a cosy wooden car), petals, the station slides in, the train stops; end on the cover |

Poses (all `"mouth": "lp"` mouth sets with anime teeth, eyes-closed masked variants): `holo` (bust, front, mouth visible) · `ear` (close-up 3/4 at your right ear, mouth visible, not a profile) · `wave` (full figure in the aisle, waving, mouth visible). One look (`default`: cap, half snow-white / half sun-orange coat) all film long.

## 4. Thermal table (DUAL `DUAL LC.. LH.. RC.. RH..`)
| Time | Source (visible on screen) | Ear L | Ear R | Cool / warm | Peak | Why plausible |
|---|---|---|---|---|---|---|
| 2–7 | ice runes open, L then R (slow demo) | cool ramps 0→.7 | from 5 s | cool | .75 | rule card: the open panel brings the winter in |
| 7–12 | blizzard sweeps L↔R every 2–3 s (runes) | cool | cool | cool | .95 | wind / snow sound side = cold side |
| gate 1b | your hands round the tea, steam rising to your face | warm .35 (+ the frozen winter cool × .6) | warm .35 (+ cool × .6) | **cool + warm** | .35 | hot tea held under your chin |
| 12–37 | sun through the right glass + fire runes R; summer breeze swings to L twice; frost melting on L | cool (frost) → warm (breeze) | warm | both | .9 | sunlight is real radiant heat |
| 38–60 | rain at the open top light L + the brass wall lamp L | cool | — / warm (sunny side, later rain R) | **cool + warm on L** | .8 / .35 | spray through the open window; a lamp 30 cm from your ear |
| 62–90 | ice cabin L (runes) + **tea steam L**; fire cabin R (runes) | cool + warm | warm | **cool + warm on L** | .95 | the cup stands by the left window |
| gate 4b | the window you open | chosen side ×1.3 (cap) | other ×.85 | | .95 | a real draft through the opened window |
| 90–100 | chaos, seasons swap every 2 s | alternates | alternates | | .9 | runes, each window its own season |
| 100–108 | **1-s hot↔cold**: L lava/ice, R winter/summer in opposite phase | hot↔cold every 1 s | cold↔hot every 1 s | | .9 | fast switching showcase |
| 118.5–126 | power cut, everything 0 — then the conductor whispers at your RIGHT ear | — | warm (voice ×1, 0.1 + 0.8·loudness) | warm | .7 | a voice at the ear is warm |
| 126–150 | spring breeze (tiny), panels close 128–132 | — | — | warm .05 | .05 | calm ending |
| 146.5–149 | conductor in the aisle (~1.2 m, in front) | warm ×.28×.5 | same | warm | .1 | a voice in front, a little warm |

DUAL showcase planned: [x] fast hot↔cold on one ear (100–108) · [x] a peak at the top (tunnel, chosen window) · [x] clear left / right (winter sweeps, slow demo L→R) · [x] cool + warm at the same time (tea in winter, lamp in the storm, tea + ice in the tunnel)

## 5. Interactions (interactive = default; pure mode answers itself after a natural pause: tea held, LEFT window, "Spring!" said)
| # | Prompt (en / ja / zh) | Choices | Kind | What changes |
|---|---|---|---|---|
| 1 | Warm your hands on the tea · あったかい紅茶で、手をあたためよう · 用热茶暖暖手 | — | long press `.act-btn.hold` (2.5 s) | cup lifts, steam thick, both ears warm .35 under the winter cool (DUAL) |
| 2 | Which window will you open? · どっちの窓を開ける？ · 要打开哪一边的窗？ | ❄ LEFT · ice / 🔥 RIGHT · fire (say "left / ice" or "right / fire") | choice `.choices .ch` | chosen window slides down, its side stronger (thermal ×1.3, more particles, frame glow) |
| 3 | Shout "Spring!" with the conductor · 「春！」ってさけんで · 一起喊「春天！」 | — | voice `#micGate` (judged: spring / はる / 春 / 春天), tap fallback | power-up, runes flash white, spring begins |

## 6. Conductor lines (hologram unless noted). **Voice = Japanese only** (user 2026-11-09); en / zh are subtitles (en / zh takes rendered once and kept, unused)
| id | t (film s) | en | ja | zh |
|---|---|---|---|---|
| a1 | 0.9 | Next stop, winter! Wrap up your scarf! | つぎは〜、ふゆ！ マフラー、しっかり巻いてね！ | 下一站，冬天！围巾要围好哦！ |
| a2 (in person, aisle) | 7.9 | Cold hands? Hold your warm tea! | 手がつめたい？ あったかい紅茶をどうぞ！ | 手冷吗？捧着热茶吧！ |
| a3 | 12.3 | Next stop, summer! Vents open — it's getting hot! | つぎは〜、なつ！ 通気口オープン、あつくなるよ〜！ | 下一站，夏天！通风口打开——要变热啦！ |
| a4 (in person, aisle) | 37.4 | Squall ahead! I'll switch on the cosy lamp. | スコールだ！ あったかいランプ、つけておくね。 | 前方暴雨！我把暖暖的灯打开。 |
| a5 | 62.3 | Ice-and-fire tunnel! The car splits in two — pick a window! | 氷と炎のトンネル！ 車両がふたつに分かれるよ。窓をえらんで！ | 冰火隧道！车厢要一分为二啦——选一扇窗吧！ |
| a6 | 90.3 | Uh-oh! The seasons are out of control! | わわっ！ 季節が暴走してる〜！ | 糟糕！四季失控啦！ |
| a7 (in person, whisper, right ear) | 118.6 | [whispers] Psst… it's really me. Shout "Spring!" with me, and the train comes back. | [whispers] ねえ…ほんものの、ぼくだよ。いっしょに「春！」ってさけんで。列車がもどるから。 | [whispers] 嘘…是真的我哦。和我一起喊「春天！」，列车就会回来。 |
| a8 (in person, aisle) | 126.3 | Next stop, spring! Cherry Blossom Station! | つぎは〜、はる！ さくら駅〜！ | 下一站，春天！樱花站！ |
| a9 (in person, aisle) | 145.7 | We've arrived! Thanks for riding the Seasons Express! | とうちゃく〜！ 季節急行に乗ってくれて、ありがとう！ | 到站啦！谢谢你乘坐四季特快！ |

## 7. Review
- Reviewed by: coordinator brief (2026-11-09, user asked not to wait); conductor design + voice pick by this agent, the three auditions + pick saved in `project/` for the user to override.
- Sample view (G3: the winter transformation, fully finished) by / date: see `project/review/`.
