# Demo 7 · 信長と家康、京都の居酒屋へ — Two Warlords in a Kyoto Izakaya

**Status: 📝 planning.** The story, script and Seedance shot list are written. Waiting for the user's keyframes and Seedance clips.

## The film
- 150 s, binaural ASMR × thermal haptics, 1920×1080, 30 fps, 48 kHz.
- 織田信長 and 徳川家康 slip 400 years forward into a winter night in modern Kyoto. You take them to a small izakaya on 先斗町 by the 鴨川.
- For the first time they meet:
  - draft beer and the beer tap;
  - a highball full of ice;
  - charcoal yakitori, oden, hot sake;
  - a city full of lights.
- Demo 6 was "you bring the future's drinks to Azuchi". Demo 7 is the reverse: **they come to the future**.

## Cast and position
| | Where | Voice (locked, same as Demo 5 / 6) | Thermal |
|---|---|---|---|
| 織田信長 | front-left at the counter | VOICEVOX:青山龍星, −1.5 st persona | his voice → **L heat** (laugh > speech > whisper) |
| 徳川家康 | front-right | VOICEVOX:黒沢冴白, −2 st persona | his voice → **R heat** |
| You | centre, seated at the counter | subtitles only (no voice) | — |

Both lords keep their Demo 5 design and costume (rich kimono, gold-leaf patterns), which is the joke: Sengoku lords in a modern izakaya.

**Subtitles:** Japanese + English only. Japanese display text must contain kana.

## Thermal sources (beyond the two voices)
| Cool | Warm |
|---|---|
| Kamogawa winter wind when the sliding door opens (L) | charcoal yakitori grill in front (R) |
| ice-cold draft beer mugs at the toast (both) | hot sake (熱燗) and oden steam (R) |
| highball ice and fizz (L, then both) | the warm glow of the time slip at the end |

The cool and warm sources are placed on opposite ears as much as possible, as in Demo 5 / 6.

## Pipeline (planned)
1. Script and timeline: `storyboard/script_150s.md`. After the user approves it, it becomes `scripts/izakaya.py`.
2. Voices: VOICEVOX with the locked personas from `../Demo5_SengokuBanquet/scripts/voice_personas.py`, several takes per line. The user starts VOICEVOX.
3. Picture: the user makes keyframes (`ChatGPT / 任意生图`) and Seedance clips, following `Seedance素材命令.md`. We cut the clips to the voice timeline.
4. Audio: binaural mix with Demo 1's HRTF renderer, plus synthesised SFX (door, wind, beer tap, grill, ice, fizz, crowd murmur).
5. Thermal: Demo 1's controller, run on voice + SFX stems.
6. Video: ffmpeg assembly of the clips, ja/en subtitles, cover. The final MP4 and a browser player (thermal + Web Serial).
