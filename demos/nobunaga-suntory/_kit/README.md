# Nobunaga × Suntory kit

Shared by the Nobunaga series only (rule: DEMO_DESIGN_GUIDE §12.1). Demo → kit → `demos/shared/`; a kit never loads from a demo.

| Path | What | Used by |
|---|---|---|
| `art/` | Nobunaga / Ieyasu busts, poses, ears, banquet room, props, `faces.json` | Demo05–09 (films), Demo23 / 41 / 42 (talk) |
| `places/` | Plates used by a film and by the talk demos: `d9_bg_summit`, `d9_bg_tearoom`, `d7_bg_izakaya`, `d8_bg_tasting` | Demo05 / 07 / 08, Demo23 / 41 / 42 |
| `talk/` | Talk demos: `main.js`, `scenes.js`, `scripted.js`, `audio.js`, `lines.js`, `style.css`, `l10n.js`, `media/voice/` (229 lines) | Demo23_NobunagaTalk, Demo41_IeyasuTalk, Demo42_SengokuRoundtable + their private `live/` pages |

Each thin page keeps `index.html` and a stub `l10n.js` (`shared/subs.js` always requests `<page>/l10n.js`; the page loads `talk/l10n.js` first). Generator: `Demo23_NobunagaTalk/scripts/pages.js`.
Build: `Demo09_SengokuBanquet/scripts/prepare_art.py` writes `art/`; `Demo05–08/scripts/make_export.py` set `artBase`; `Demo23_NobunagaTalk/scripts/voice.py` writes `talk/media/voice/`.
Note: `prepare_art.py` of Demo05 / 07 / 08 still writes their plates to `media/art/`; copy a regenerated plate to `places/` by hand until P4.
