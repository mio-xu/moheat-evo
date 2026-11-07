# Demo 8 · 信長と家康、山崎蒸溜所へ — Two Warlords at the Yamazaki Distillery

**Status: ✅ done (2026-11-07).** Rebuild: `./build_all.sh` (VOICEVOX) then `python3 scripts/render_mp4.py` (`--at 10,30` for stills). **Picture plan:**
- no Seedance clips; this is a browser animatic like Demo 1–6;
- the two warlords reuse all of Demo 9's character art;
- the user makes only new backgrounds and a few props (`project/prompts_chatgpt.md`).

Voices are generated (`scripts/make_voice.py`).

## The film
- 150 s, binaural ASMR × thermal haptics, 1920×1080, 30 fps, 48 kHz.
- 織田信長 and 徳川家康 slip into the present on a misty morning at Suntory's **Yamazaki Distillery**, between Kyoto and Osaka. You guide them along the whisky's path:
  1. the misty valley;
  2. fermentation;
  3. the copper pot stills;
  4. the silent cask warehouse;
  5. the spring water;
  6. the tasting room.
- **Time loop with Demo 6:** in Demo 6 you brought Yamazaki, Hakushu and Hibiki to Azuchi. Here the lords taste it and realise: *this is the sake you brought us that night.*

## Cast and position
| | Where | Voice (locked) | Thermal |
|---|---|---|---|
| 織田信長 | front-left as you walk | VOICEVOX:青山龍星, −1.5 st persona | his voice → **L heat** |
| 徳川家康 | front-right | VOICEVOX:黒沢冴白, −2 st persona | his voice → **R heat** |
| You (the guide) | centre | subtitles only | — |

**Subtitles:** Japanese + English only, and the Japanese has kana.

## Thermal sources
| Cool | Warm |
|---|---|
| morning valley mist (both) | steam over the fermentation vats |
| the cool, dark cask warehouse (both, slow) | the copper pot stills: radiant heat, the strongest moment, one side then the other |
| the cold spring water | the warmth of a neat dram |
| the ice in the highball (L / R in turn) | the golden glow of the time slip |

## Brand note
- Suntory, Yamazaki, Hakushu and Hibiki are real trademarks. The site already shows the UTokyo × Suntory joint research, and Demo 6 uses the user's own Suntory renders.
- **Before public release, confirm with Suntory** that this distillery film and its brand mentions are OK.
- In generated clips, avoid readable logos: AI text comes out garbled. Bottles can be composited from the real renders in `../Demo06_FutureWhisky/assets/whisky/`.

## Pipeline (planned)
Same as Demo 7: the script and the voices come first, then the user's keyframes and Seedance clips are cut to the voice timeline. Binaural audio, SFX and thermal are reused from Demo 1/5; the result is assembled into the MP4 and a browser player.
