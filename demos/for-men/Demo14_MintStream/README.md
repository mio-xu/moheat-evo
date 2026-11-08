# ミントの、おみみ専門店 · Mint's Ear Salon (for-men, interactive stream)

Lives at `demos/for-men/Demo14_MintStream/` (same URL as the old whisper stream room, which it replaced on 2026-11-08 — user: the
stream rooms become stories, Mint stays the one stream, in a new form: C — a role-play "ear salon" stream where the chat orders the
treatments; old version backed up to `~/Desktop/MoHeat Evo 备份/for-men/Demo14_MintStream_20261108-1509/`). Built as staging folder Demo37.

**Mint (白深ミント), 20** — original character, unchanged look / personality / voice: long silky mint-green hair fading to white, thin low
side braid, sleepy pale aqua eyes, small star hair clip, oversized white cable-knit cardigan; calm, sleepy, whispery; ElevenLabs `mint`
r1_a. Outfit for the place: cardigan over a mint salon apron.

## Story (5 steps, ~2:10) — her little salon set at night; you are the dummy head 「みみくん」
1. **ご来店** — greeting, the chat says hi · chat vote 「みぎ」/「ひだり」 (= ear A for the rest).
2. **ほぐす** — warmed hands on ear A · Super Chat menu 「蒸しタオル」 (both ears warm) / 「ひんやりスプーン」 (cool on ear A right after the warm hands).
3. **おみみかき** — **hold** 「動かない」 (let go → she nudges you once) · menu 「温石」 / 「ミントの吐息」 (cool breath on the ear her whisper warms).
4. **反対のおみみ** — action 「寝返り」 → ear B: hands, then a cool mist on both (warm → cool on ear B within a second, whisper still warm).
5. **ねかしつけ** — chat choice secret / lullaby at ear A · blanket · say 「おやすみ」 (voice, judged) · 「また来るね」 / Super Chat 「延長」.
Ends on its own cover (↺ Play again). All answers by tap or voice (`shared/voice.js`, `l10n.js` VOICE); EN / 日本語 / 中文 (chat
messages stay in the viewers' own languages — ambience, `project/qa.json`).

## Thermal (firmware DUAL)
- Voice: warm at the ear she leans to, `(0.1 + 0.8 × level)` × distance (ear 1 / ≤ 50 cm 0.6 / further 0.28), × 0.5 in front.
- Ambient: warmed hands (0.35, one ear) · steamed towel (both 0.6 → 0.3 over ~20 s) · chilled spoon (cool 0.6, short) · warm stone (0.4) ·
  mint-balm breath (cool 0.45, with the whisper warming the same ear) · cool mist (both 0.55) · blanket (both 0.2).
- Not heated: sleepiness, the chat.

## Files
- `index.html`, `style.css` (stream overlay: LIVE, viewers, chat, Super Chat cards; the chat moves left in the right-ear view),
  `main.js`, `audio.js`, `lines.js`, `l10n.js` (`scripts/make_l10n.py`), `media/voice` (`scripts/voice.py`, 22 lines), `project/script.md`.
- Art = the layered standard (DEMO_DESIGN_GUIDE §6): `scripts/prompts.py` → `project/web_prompts.json` → `python3 tools/openai/images.py
  <this folder> <jobs>` (OpenAI gpt-image-2: 1 plate, 7 poses on chroma MAGENTA — green hair, 14 masked mouth / blink variants from
  `project/face_points.json`) → `python3 tools/art/build_stage.py <this folder>` (`project/stage.json`, `"matte": "magenta"`) →
  `media/art/` + `media/layers.js`. Raw PNGs in `assets/` (not in git).
- Budget: OpenAI gpt-image-2 22 images (2560×1440 high, ≈ $0.2 each ≈ $4.4; `project/openai_log.json`), Seedance 0.
- `?auto=1` / `?auto=1&alt=1` test both branches, `?flat` flat stills, `?cover=1` poster (`scripts/make_cover.py`).
