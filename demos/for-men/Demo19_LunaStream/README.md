# ルナの、ひみつのカクテル · Luna's Secret Cocktail (for-men, interactive)

Lives at `demos/for-men/Demo19_LunaStream/` (same URL as the old late-night stream, which it replaced on 2026-11-08 — user: the stream
rooms become stories like Demo25 / Demo31, one stays a stream (Mint); old version backed up outside the repo). Built as staging folder
Demo39_LunaBartender. Self-contained: no `<base href>`, nothing is loaded from Demo14.

**Luna (宵月ルナ), 25** — original character, unchanged look / personality / voice from the stream: long straight black hair with deep-blue
inner streaks, sapphire eyes, thin black choker, crescent-moon earring; cool, mature, quietly teasing; ElevenLabs `luna` r1_b. Outfit for the
place: white shirt with rolled sleeves + black waistcoat. Character reference = her stream art, copied from Demo14 to `assets/ref/` before
Demo14 was replaced.

## Story (5 steps, ~2:15) — a small basement bar after last orders, rain outside; you at the counter, the door on your LEFT, the jukebox on your RIGHT
1. **ラストオーダーのあと** — the last guest leaves (door, bell, rainy draft on the left) · 「おまかせで」/「いちばん強いのを」.
2. **シェイカー** — ice, shaking · she leans across and presses the frosted shaker to your RIGHT cheek while she whispers · action 「グラスを受け取る」.
3. **あなたのためのカクテル** — one word: 「月」/「夜明け」 · lights down, a blue flame in front of you · **hold** 「見つめる」 (let go = you
   blinked, she lights it again) · the flame goes out and the door bangs open in the wind (rainy draft on the left), she shuts it.
4. **カウンターのこっち側** — closed for tonight; she sits on the stool on your LEFT, two Irish coffees · toast, **say it**: 「ふたりの夜に」/「ルナに」.
5. **本当の名前** — at your LEFT ear: her real name is つき · ending 「「つき」と呼ぶ」/「また来てもいい？」 → fade → this demo's cover.
All answers by tap or voice (`shared/voice.js`, `l10n.js` VOICE + `data-voice` readings); EN / 日本語 / 中文.

## Thermal (firmware DUAL)
- Voice: warm at the ear she speaks at, `(0.1 + 0.8 × level)` × distance (ear 1 / ≤ 50 cm 0.6 / further 0.28), × 0.5 in front.
- Ambient: the rainy draft while the door on the left is open (left cool 0.45) · the iced shaker on your right cheek (right cool 0.65 —
  while her voice warms the same ear: DUAL) · the blue flame in front (both warm 0.3 ± 0.1 flicker) → right after it, the door bangs open
  (warm → cool in about a second) · the hot Irish coffee in front (both warm 0.25) · her shoulder on your left (left warm 0.2).
- Not heated: the alcohol, the "strong" drink, her blush.

## Files
- `index.html`, `style.css`, `main.js` (Demo17 framework: choices / action / hold, thermal, device; the code flame over the flame view),
  `audio.js` (HRTF + synthesized bar: rain, door, bell, stairs, jukebox jazz, ice, shaker, pour, slide, lighter, flame, clink, stool),
  `lines.js`, `l10n.js` (`scripts/make_l10n.py`), `media/voice` (`scripts/voice.py`, 22 lines, 118 s), script `project/script.md`.
- Art = the layered standard (DEMO_DESIGN_GUIDE §6): `scripts/prompts.py` → `project/web_prompts.json` → `python3 tools/openai/images.py
  <this folder> <jobs>` (OpenAI gpt-image-2; 2 plates, 6 poses on chroma green, 12 masked mouth / blink variants from
  `project/face_points.json`; `bg_bar_dim` = `bg_bar` darkened in Pillow, free) → `python3 tools/art/build_stage.py <this folder> &&
  python3 tools/art/clean_cutout.py <this folder> --bg 8,158,65` (`project/stage.json`, `"matte": "green"`) → `media/art/` + `media/layers.js`.
  Raw PNGs in `assets/` (not in git).
- `?auto=1` / `?auto=1&alt=1` test both branches, `?flat` flat stills, `?cover=1` poster (`scripts/make_cover.py`).
