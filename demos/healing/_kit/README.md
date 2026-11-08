# healing kit

Shared by the healing demos only (rule: DEMO_DESIGN_GUIDE §12.1). Demo → kit → `demos/shared/`; a kit never loads from a demo.

| Path | What | Used by |
|---|---|---|
| `phone.css` | Phone-call page styles (copy of the old Demo12 `style.css`) | Demo15, Demo16 |
| `familycall/` | "A Call Home": `main.js`, `audio.js`, `lines.js`, `style.css`, `l10n.js`, `media/art`, `media/voice`, `media/voice.js` (Part 2 = `<body data-part="2">`) | Demo15_FamilyCall, Demo16_FamilyCall2 |
| `naomi/` | Naomi the cat: `art/`, `audio.js` (purr, mews, paw steps, rain, birds) | Demo11_Naomi, Demo13_NaomiCam; `audio.js` also Demo26_BecomeNaomi |

Each thin page keeps `index.html`, `media/cover.jpg` and a stub `l10n.js` (`shared/subs.js` always requests `<page>/l10n.js`; the page loads the kit's dictionary first).
Build: `Demo15_FamilyCall/scripts/voice.py` + `prepare_art.py` write `familycall/`; `Demo11_Naomi/scripts/prepare_art.py` writes `naomi/art/`.
