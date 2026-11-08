# Demo27 · ガクの、焚き火キャンプ配信（レイヤー版） · Gaku's Campfire Stream, layered

[Demo24](../Demo24_GakuCamp/) redone from Gaku's design (look C) the new way — DEMO_DESIGN_GUIDE §6.2 (strict layers, drawn
expression variants) and §6.3 (Seedance only where needed). Same story, voice, thermal design and page as Demo24; the picture is
layers instead of video: **≈ 425 Seedance credits, no video** (Demo24's plan was 18 clips, 1152 credits). Demo24 stays as it is.

## How it is made

| Layer | Art | Moves by |
|---|---|---|
| background | one empty campsite plate (`bg_camp`) | depth-free parallax (mouse / tilt + slow sway), heat shimmer + flicker over the fire; zoomed / panned per view so its fire lands where Demo24's code draws sparks |
| Gaku | 8 poses on a plain grey background: `gaku_ref` (sit) and four same-face edits of it (coffee, sweet potato, blanket, wave), plus `gaku_log`, `gaku_left` (close-up), `gaku_whisper` (event CG) | breathing, a small bob while talking, warm rim light facing the fire (code) |
| face | Seedance edits of each pose: mouth slightly open, eyes closed (his fringe stays over his eye) → feathered patches | the mouth fades with the voice loudness, ~0.13 s blinks; the same-face poses share `gaku_ref`'s patches |
| effects | — | Demo24's own canvas code: sparks, snow, steam, wind / blanket washes |

- Build (Pillow + numpy, ~1 min, no GPU): `python3 tools/art/build_stage.py demos/for-women/Demo27_GakuFireside --preview`
  from `project/stage.json` (poses, near-hints for the face search, `erase` = the fire drawn in `gaku_log`, `keep` = the coffee
  steam, per-view placement). It writes `media/art/` (bg, `char_*`, `*_mouth` / `*_eyes`, the flat fallback stills `gaku_<view>.jpg`)
  and `media/layers.js`. Check `assets/patches_cfg/assets/patches_preview.jpg` after a rebuild.
- Art: `scripts/seedance.py` (API: `test`, `batch2`) — prompts also in `project/web_prompts.json`. 2026-11-08 the API output URL of
  `gaku_ref` expired before batch 2 (all 7 failed, not charged) and uploads were rate-limited, so batch 2 was made on the website
  with the same prompts (`scripts/web_take.py <name>` files each download). Raw PNGs in `assets/art/` (not in git).
- Page: `index.html` = Demo24's skeleton (same UI, §7.3); story / sound / thermal / languages are Demo24's files **by path**
  (`main.js`, `lines.js`, `audio.js`, `style.css`, `l10n.js`), unchanged. `../../shared/layers.js` draws the live composite wherever
  Demo24's code draws a still; `MOHEAT_LAYERS.skipVideo` stops Demo24's clip requests. `?flat` = the flat stills, `?cover=1` = poster
  (`media/cover.jpg`, headless Chrome). `media/voice` → Demo24 (symlink).

## Status

Tested in Chrome: both branches end to end (`?auto=1`, `?auto=1&alt=1`): all 8 views in order, 0 errors, no 404s; EN / 日本語 / 中文
(no missing strings); one screen at 1470×779. **In the menu in place of Demo24** (user, 2026-11-08: replace it): `nav.js` DEMOS, the site menu, thumbnails
(`assets/images/demos/Demo27_GakuFireside*.jpg`). Demo24 stays in the repo as the backup (not listed). Video: none; candidates only if wanted after playing (sitting down beside you, the blanket over the mic — 64 each).
