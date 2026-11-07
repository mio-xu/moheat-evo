# Visual prompts & art record — Demo 5

## How the art was made
ChatGPT image generation was not available for Demo 5, so the user asked us to make the assets directly.
Every image is therefore **drawn in code**:
- The Python scripts emit SVG. Headless Chrome renders it to an RGBA PNG.
- The output is deterministic, so each asset can be regenerated with one command.
- Filenames, folders and sizes match `ChatGPT素材命令.md`. If ChatGPT art is generated later, it can replace any file 1:1.

```
python3 scripts/art_train.py          # interior, glass mask, clock, lamp, table props
python3 scripts/art_scenery.py        # 4 seasons × far/mid/near, storm sky, tunnel walls, station, overlays, FX
python3 scripts/make_style_sheet.py   # assets/style_sheet.png + storyboard/frames/*.jpg
```

## Style rules (same world as Demo 1–3)
- Cute Japanese 2D animation backgrounds: pastel palette, cel shading (flat light and shade shapes), soft warm outlines (`#7a5446` interior, `#6f5a6e` exterior), rounded shapes and soft glows.
- **Not** ukiyo-e or gold leaf (that is Demo 4). No photorealism, 3D, horror, people, animals, text or logos.
  - The only text is the style-sheet title.
  - The station sign is deliberately blank.

## Assets

| File | What | Notes |
|---|---|---|
| `train_interior/train_interior_master.png` | Panorama glass observation car, glass = #00FF00 | True one-point 3-D projection (f = 610, VP 768,418). Glass side walls and arched glass roof on wooden ribs and brass bars, wooden wainscot and sill with flower pots, pink velvet seats with lace covers, mint carpet, end door with a round clock |
| `train_interior/train_interior_{day,dusk,night}.png` | Same, glass **transparent** | Lighting is a per-pixel tint plus lamp glow (`tint()` in art_train.py), so the composition is identical |
| `train_interior/window_mask.png`, `window_geometry.json` | Glass mask and polygons | Left/right/door glass polygons, clock centre and radius, lamp positions, used by the player |
| `train_interior/seat_foreground.png` | Near table alone | For a parallax / shake layer |
| `train_interior/clock_face.png`, `clock_hands.png` | Clock without hands; two separate hands | The hands are drawn by code in the player |
| `train_interior/lamp.png`, `table_props.png` | Tulip lamp; tea, book, snow globe | |
| `winter/winter_{far,mid,near}.png` | Snowy peaks / snowy pines with icicles / snow mounds | Every far/mid/near layer tiles seamlessly in x (elements are wrapped at ±1536 px) |
| `summer/summer_{far,mid,near}.png` | Sky, cumulonimbus and sea / beach and palms / grass and flowers | |
| `rainforest/rainforest_{far,storm_far,mid,near}.png` | Sunny hills with light beams; the **same** hills under storm clouds with lightning and rain / trees and big leaves / ferns | |
| `spring/spring_{far,mid,near}.png`, `spring_station.png` | Morning hills / cherry trees and petals / flowers; a small station (blank sign, clock, flower beds, lamp, bench) | |
| `ice_fire/tunnel_{ice,lava}_wall.png` | Glowing ice crystals and icicles; rosy rock with glowing lava streams and small flames (cute, not scary) | Seamless |
| `winter/frost_overlay.png`, `frost_corner.png` | Dendritic frost from the edges (centre clear); corners only | Glass layers |
| `rainforest/raindrops_overlay.png`, `summer/heat_haze_overlay.png`, `seasonal_chaos/fog_overlay.png` | Drops and trails; golden sun haze and bokeh; breath fog | Glass layers |
| `*/fx_*.png` (8) | Sakura petal, tropical leaf, lightning, lava bubble, steam, icicle, sun glare, season swirl | 1024², centred |
| `reused_assets/fx_{snowflake,ice_crystal,flame,star}.png` | Symlinks to the Demo 3 FX | Read-only reuse |
| `style_sheet.png` | Six scene previews, title and palette | |

## Original prompt texts
The full prompt list, for re-generating any asset with ChatGPT, is in `../ChatGPT素材命令.md`.
