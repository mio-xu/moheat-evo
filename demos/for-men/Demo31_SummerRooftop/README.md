# Demo31 · なつの、おくじょうで · Up on the Summer Roof (for-men, interactive)

A first-person summer night on the roof of the old apartment block you grew up in, with **早瀬渚 Nagisa** (original character):
20, your tomboyish childhood friend, home for the summer, blunt and quick to say 「バカ」 (ツンデレ寄り) — tonight, for once, in a yukata.
User's picks (2026-11-08): story A (summer rooftop · childhood friend), look **A** (chestnut high ponytail, orange hair tie, navy
firework-pattern yukata, orange obi; `project/designs_contact.jpg`), personality a (嘴硬), voice ElevenLabs **nagisa r1_b**.

## Story (5 steps, ~2:25)
1. **屋上で** — crickets, the town below, a train far off; the steel roof door, geta on concrete — she turns up in a yukata · choice
   「浴衣、似合ってる」/「…誰かと思った」.
2. **ソーダアイス** — she snaps a soda twin popsicle and presses your half to your right cheek (right cool) · action 「受け取る」.
3. **うちわ** — she squeezes onto the bench and fans you from your left (cool puffs on the left ear, one per stroke) · 「もっと」/「もういいよ」.
4. **線香花火** (signature) — two senko-hanabi a hand's width in front of your face (faint warmth on both ears, flickering) · whoever's
   ball drops first does what the other says: **press and hold 「動かない」**; let go and yours drops.
5. **花火の夜** — fireworks over the town drown out what she says (subtitle 「（花火の音でよく聞こえない）」) · 「今、なんて？」/「…もう一回、言って」 ·
   she says it again at your left ear (left warm) · ending 「…俺も」 (her head on your left shoulder) / 「…知ってた」 (she laughs and shouts).

## Thermal (firmware DUAL)
- Voice: warm at the ear she speaks at, `(0.1 + 0.8 × level)` × distance (ear 1 / ≤ 50 cm 0.6 / further 0.28), × 0.5 in front.
- Ambient: sea-breeze gusts across the head (cool 0.4, moving), popsicle on the right cheek (cool 0.7, gone when you take it), fan strokes
  on the left (cool 0.25–0.6 per stroke), the two sparklers in front (warm 0.3 shared, flicker, off when a ball drops), her face a hand's
  width away (≤ 0.2), her cheek at your left ear, her head on your left shoulder (0.3). Not heated / cooled: far fireworks, her blush.

## Files
- `index.html`, `style.css`, `main.js` (Demo25's framework: choices / action / hold, clip player, thermal, device), `audio.js` (HRTF +
  synthesized summer night), `lines.js`, `l10n.js` (from `scripts/make_l10n.py`), `media/voice` (`scripts/voice.py`).
- Art = the standard way (DEMO_DESIGN_GUIDE §6, Demo27): plan `project/layers.md`, prompts `scripts/seedance.py` (`JOBS3`) /
  `project/web_prompts.json` (`_layered`), build `python3 tools/art/build_stage.py demos/for-men/Demo31_SummerRooftop --preview` from
  `project/stage.json` → `media/layers.js` + `media/art/`; `scripts/clean_variant.py` keeps only the mouth / eyes of an edit that redrew
  too much. Raw PNGs in `assets/` (not in git).
- `?auto=1` / `?auto=1&alt=1` test both branches, `?flat` = flat stills, `?cover=1` poster.

## Status (2026-11-08)
- **Done and in the menu** (nav.js DEMOS after Demo25, site menu, credits, cover, thumbnails). Both branches pass (`?auto=1` 2:26,
  `?auto=1&alt=1` 2:17, 0 errors).
- Art: 8 layered views — `bg_roof` + `nagisa_ref` (Seedance web) and 15 poses / variants (OpenAI gpt-image-2 API, `scripts/gpt_image.py`;
  new demos: `tools/openai/images.py`). Build: `python3 tools/art/build_stage.py demos/for-men/Demo31_SummerRooftop` **then**
  `python3 demos/for-men/Demo31_SummerRooftop/scripts/clean_cutout.py` (night-scene cleaning: grey fringe, enclosed grey patches,
  light specks on thin strands; flat stills recomposed). `keep` boxes protect the arrive forearm and the popsicle hand (light skin at
  the picture edge). Sparkler pose: `scripts/flatten_bg.py` first (its "plain" background came back as a gradient).
- Fireworks: `demos/shared/fireworks.js` (rising shells, 6 burst shapes, additive trails), clipped to each view's empty sky (`SKY` in main.js).
- Video: none (§6.3); candidates only if wanted after playing (she leans in to whisper — 64 credits).
- Cost: Seedance ≈ 345 credits (200 of them on the first flat stills, before the layered standard); OpenAI ≈ 22 images 2560×1440 high.
