# ココアの、バレンタイン前夜 · Valentine's Eve with Cocoa (for-men, interactive)

Lives at `demos/for-men/Demo17_CocoaStream/` (same URL as the old café stream, which it replaced on 2026-11-08 — user: the stream rooms
become stories like Demo25 / Demo31, one stays a stream (Mint); old version backed up outside the repo). Built as staging folder Demo36.

**Cocoa (甘音ココア), 22** — original character, unchanged look / personality / voice from the stream: long fluffy wavy chestnut hair with
cream ribbons, small cream beret, warm pink eyes, sweet and a little teasing; ElevenLabs `cocoa` r1_a. Outfit for the place: frilly
blouse + pink patisserie apron.

## Story (5 steps, ~2:40) — the night before Valentine's Day, after closing, snow outside, her little sweets shop
1. **閉店後のお店で** — the door bell, snowy wind; she lets you in (the door shuts, the cold stops) · 「いいよ、手伝う」/「…誰にあげるの？」.
2. **チョコを溶かす** — chocolate chopped and melted in a bain-marie in front of you (steam) · a spoonful, fu-fu (cool puffs) · 「ちょうどいい」/「もっと甘くして」.
3. **生クリーム** — the walk-in fridge on your LEFT (cold) · she whisks with you from behind, at your RIGHT ear · **hold** 「混ぜる」 (let go too early → she nudges you).
4. **焼きたてクッキー** — the oven timer on your RIGHT, the door opens (hot rush) · heart cookie, fu-fu · action 「食べる」.
5. **メッセージ** — she writes on a heart chocolate · 「目をつぶる」/「…ちょっとだけ見る」 · the answer at your LEFT ear · ending 「…俺も、好き」/「来年も、一緒に作ろう」 · midnight chime.
All answers by tap or voice (`shared/voice.js`, `l10n.js` VOICE); EN / 日本語 / 中文.

## Thermal (firmware DUAL)
- Voice: warm at the ear she speaks at, `(0.1 + 0.8 × level)` × distance (ear 1 / ≤ 50 cm 0.6 / further 0.28), × 0.5 in front.
- Ambient: snowy night at the open door (both cool 0.4) · oven on the right (warm 0.2 steady, +0.5 rush when its door opens) · bain-marie
  steam in front (both warm 0.2) · her fu-fu (quick cool puffs 0.3 on both ears — with the oven still warming the right one: DUAL) · fridge door
  on the left (cool 0.5 while open, while her voice warms the left: DUAL) · her cheek at your left ear in the ending (0.3).
- Not heated: the taste of chocolate, the cookie in your mouth, her blush.

## Files
- `index.html`, `style.css`, `main.js` (Demo31 / Demo25 framework: choices / action / hold, thermal, device), `audio.js` (HRTF + synthesized
  shop: door bell, wind, clock, oven, bain-marie, fridge, whisk, timer, crunch, piping bag, midnight chime), `lines.js`, `l10n.js`
  (`scripts/make_l10n.py`), `media/voice` (`scripts/voice.py`, 24 lines, 148 s), script draft `project/script.md`.
- Art = the layered standard (DEMO_DESIGN_GUIDE §6): `scripts/prompts.py` → `project/web_prompts.json` → `python3 tools/openai/images.py
  <this folder> <jobs>` (OpenAI gpt-image-2; 2 plates, 7 poses on chroma green, 14 masked mouth / blink variants from `project/face_points.json`)
  → `python3 tools/art/build_stage.py <this folder>` (`project/stage.json`, `"matte": "green"`) → `media/art/` + `media/layers.js`.
  Raw PNGs in `assets/` (not in git).
- `?auto=1` / `?auto=1&alt=1` test both branches, `?flat` flat stills, `?cover=1` poster (`scripts/make_cover.py`).
