# Demo25 · はじめての、初詣デート · My First Hatsumode (for-men, interactive)

A first-person New Year's Eve date with **白銀椿 Tsubaki** (original character): 20, the sheltered young lady of an old ryokan family —
polite and graceful, but a naive airhead on her very first crowded shrine visit. Kept apart from the four streamers (Mint / Cocoa /
Hinata / Luna) in look (silver-white side ponytail, white-to-crimson camellia furisode, fur stole), personality and setting.

## Story (5 steps, ~2:20)
1. **鳥居の前で** — she hurries in from the right on geta (cold night wind on both ears) · "does it suit me?" (choice) · 5-second countdown, crowd cheer, temple bell · you say 「あけましておめでとう！」 (tap).
2. **屋台と甘酒** — she only carries a black card (choice: treat her / ask if they take cards) · a hot amazake cup at your right cheek (right warm), she burns her tongue.
3. **焚き火** — bonfire on your left (steady warm left, sparks) · the crowd pushes her to your right ear · hold to steady her.
4. **お参り** — coin, ring the bell (3 taps), two claps, hold to pray · "what did you wish?" (choice).
5. **おみくじ** — you draw 大吉, she draws her first 凶 (choice: swap / tie it together) · a cold gust sweeps left → right · she wraps her fur stole round you both (warm both) · last whisper at your left ear (depends on your wish).

## Thermal (firmware DUAL)
- Voice: always warm at the ear she speaks at, `(0.1 + 0.8 × level)` × distance (ear 1 / ≤ 50 cm 0.6 / further 0.28), × 0.5 in front.
- Ambient: winter air (cool 0.24 both ears; less on the bonfire side; × 0.6 under the main hall's eaves while you pray; almost gone under the stole), gusts that move across the head (cool 0.6), bonfire left (warm 0.5, flicker), amazake cup at the right cheek (warm 0.65, 0.33 while she eases it off to sip), her face a hand's width away (≤ 0.35, until she steps back), fur stole (insulation + her body on your left: warm 0.3 left / 0.12 right).
- Timed to the picture: bonfire, cup, face and stole start / stop when their transition clip starts (`go(name, view, onStart)`), together with their sounds.
- Not heated: her blush, her burnt tongue, the steam of her own cup (45 cm away), the food stalls (metres away). Review 2026-11-08 (user): steam heat removed, stole made asymmetric, bonfire / stole / face timing fixed, less wind chill under the eaves.

## Files
- `index.html`, `style.css` (+ Demo10 `demo.css`, `shared/series.css`), `main.js`, `audio.js` (HRTF + synthesized shrine ambience), `lines.js` (ja + en).
- `scripts/voice.py` → `media/voice/*.m4a` (ElevenLabs `tsubaki` r1_b, user pick), `scripts/seedance.py` (design + scene prompts; `project/web_prompts.json`), `scripts/prepare_art.sh` → `media/art/*.jpg`, `scripts/make_cover.py` → `media/cover.jpg` + menu thumbnail.
- Look: user picked **D** (`project/designs_contact.jpg`); stills `project/scenes_contact.jpg`. Raw PNGs in `assets/` (git-ignored).
- `?auto=1` answers every choice / action itself (testing), `?cover=1` poster, `?embed=1` stage only.
- Animation (handoff §4b): 15 Seedance 2.5 Lite 1080p First & Last Frame clips (960 credits, web): a talk loop per view + a transition for each of the 7 cuts (`project/web_video_prompts.json`). `scripts/prepare_video.py` snaps every clip's ends onto its still (all exact 0.0 / 0.0); QA mid-frames `project/video_qa.jpg`. The player switches clips only at a clip's end (`go()`), `?stills` = no video. Auto run with video 3:13 (stills 2:31; each cut waits for the loop end + a 4 s transition), 0 errors.
- The amazake still was redone (user): she presses the cup to your right cheek herself (v1 had your hand holding it).
