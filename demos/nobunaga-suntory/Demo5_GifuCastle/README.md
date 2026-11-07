# Demo 5 · 信長の岐阜城へようこそ — Welcome to Nobunaga's Gifu Castle

**Status: ✅ done (2026-11-07).** Rebuild: `./build_all.sh` (VOICEVOX) then `python3 scripts/render_mp4.py` (`--at 10,30` for stills). **Picture plan:**
- no Seedance clips; this is a browser animatic like Demo 1–6;
- the two warlords reuse all of Demo 9's character art;
- the user makes only new backgrounds and a few props (`ChatGPT素材命令.md`).

Voices are generated (`scripts/make_voice.py`).

## The film
- 150 s, binaural ASMR × thermal haptics, 1920×1080, 30 fps, 48 kHz.
- Summer of 1569. Nobunaga has just renamed Inabayama "Gifu" and started sealing his letters 「天下布武」. You arrive as a guest from the future. He shows you round himself, with his ally 徳川家康 along for the visit:
  1. the four-storey palace at the foot of Mt. Kinka, with its garden and waterfall;
  2. the climb to the mountaintop castle and the wind over the Nōbi plain;
  3. tea served by Nobunaga's own hand, with a summer treat of ice from the ice-house (氷室);
  4. at night, cormorant fishing (鵜飼) on the Nagara River, the boats' fire baskets blazing past;
  5. a parting gift: a sheet stamped 「天下布武」.
- Inspired by the historical visit of the missionary Luís Fróis (1569). Nobunaga personally showed him the palace and the mountaintop and served him food with his own hands.
- Demo 7 and 8 bring the lords to the present. Demo 5 takes you back to Nobunaga's own castle at its height.

## Cast and position
| | Where | Voice (locked) | Thermal |
|---|---|---|---|
| 織田信長 (host) | front-left | VOICEVOX:青山龍星, −1.5 st persona | his voice → **L heat** |
| 徳川家康 (visiting ally) | front-right | VOICEVOX:黒沢冴白, −2 st persona | his voice → **R heat** |
| You (guest from the future) | centre | subtitles only | — |

**Art:** the same detailed ukiyo-e / gold-leaf style and character design as Demo 9.

**Subtitles:** Japanese + English only, and the Japanese has kana.

## Thermal sources
| Cool | Warm |
|---|---|
| waterfall mist in the palace garden | evening sun on the mountaintop |
| strong summit wind over the plain (sweeping L→R) | hot tea from Nobunaga's own hand |
| ice from the ice-house (氷室), held to your right | **cormorant-fishing fire baskets** passing from left to right on the river: the heat travels across your ears with the boats |
| night river breeze, fireflies | the golden glow of the time slip |

## Pipeline (planned)
Same as Demo 7 and 8. The script and voices come first. Then the user's keyframes and Seedance clips are cut to the voice timeline. Binaural audio, SFX and thermal are reused from Demo 1/5. The result is assembled into the MP4 and a browser player.
