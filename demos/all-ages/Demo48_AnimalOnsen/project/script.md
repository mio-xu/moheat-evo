# Script · Demo48 『ゆけむり どうぶつおんせん』 · Steamy Animal Hot Spring (all-ages ⑥, proposal B3)

> Pre-production by `prepro` 2026-11-09. Lines + stages: `scripts/script_data.py` → `lines.js` (`window.ONSEN_LINES`) / `l10n.js`.
> Thermal: `project/thermal_plan.json` (game-driven). Designs = user picks (ゆずじい A, penguin B, monkeys C, fox B + towel).
> Voices (ja): yuzujii / penguin / fox (new, picked), monkey = staff_f reused.

## Pitch
An autumn mountain hot spring for animals. You help the slow capybara owner Yuzu-jii: the HOT pipe is on your left, the COLD mountain
pipe on your right; feel the bath with your ears and keep each guest happy. 5 stages: opening (learn the valves) → the penguin (almost
cold) → the monkey family (mother HOT, child lukewarm: two baths, left / right) → autumn rain (cold rain into the bath, keep it warm; the
fox wants it lukewarm for its tail) → your own bath, set by voice (「もうちょっと あつく / ぬるく」) → 「いい ゆじゃのう…」.

## World rule card
Real world (talking animals only). Every warm / cool source is physical: steam, cold water, rain, wind, voices.

## Interactions
Hold left / right valve, drag a board against the rain, answer guests (sayable), say 「いらっしゃいませ」, set your bath by voice, final choice.

## Left (build stage)
Plates (open-air bath by day, rain / evening = graded), the animal sprites from the picked designs (in the water, upper body), valve /
thermometer UI in code, SFX (water, steam, rain, maple leaves), game page (UI v2). Monkey lines render at the default stability 0.4 through
voice.py (the 8 s sample used 0.3) — set a per-character stability in voice.py if the build-stage listen says it is too flat.
