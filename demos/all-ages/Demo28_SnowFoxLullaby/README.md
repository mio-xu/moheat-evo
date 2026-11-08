# ふたりの、こもりうた · A Lullaby for Two — MoHeat Evo ASMR demo

Interactive bedtime story (~1:45) with 小雪 Koyuki (snow spirit) and 焔 Homura (foxfire spirit) from Demo 1 *Whispers of Snow and Flame*. You can't sleep on a snowy night, and they turn putting you to sleep into a contest.

## Story
1. **Snowy night**: the irori hearth crackles in front of you and the garden doors are open to the snow. Koyuki walks in, then Homura pops out of the hearth.
2. **"Too warm or too cold?"**: your answer sets who goes first.
   - **Koyuki at your left ear**: close your eyes (hold), listen to the snow, then her cool "fuu…".
   - **Homura at your right ear**: turn your ear to her, then her warm whisper and "haa…".
3. **Same ear**: both squeeze into your left ear. "A little cool… a little warm… just right." Cool and warm on one ear at once (DUAL).
4. **Who stays?**
   - Koyuki stays at your left ear; Homura tends the hearth.
   - Homura stays at your right ear; Koyuki closes the doors and the cold draft stops.
5. **You say "Good night"**: they answer together, one at each ear. Fade out, then back to the cover with the ending.

Five interactions: choice · hold · action · choice · action. Each one works by tap or by voice (`shared/voice.js`), and each times out on its own.

## Thermal (DUAL, live)
| Source | Where | Type |
|---|---|---|
| Koyuki's voice (snow spirit: the special case in guide §0.2) | the ear she speaks at, × loudness and distance | cool |
| Homura's voice | the ear she speaks at, × loudness and distance | warm |
| Koyuki's breath "fuu" / Homura's breath "haa" | left / right ear | cool / warm |
| Their closeness (cheek by your ear) | that ear, ≤ 0.18 | cool / warm |
| Irori hearth in front of you | both ears, mild; stronger once Homura tends it | warm |
| Night air through the open garden doors | both ears, mild; stops when Koyuki closes them | cool |

## Assets (strict layers, 0 Seedance credits)
- **Art**: Demo 1's approved ChatGPT sprites and `room_bg`, loaded from the all-ages kit `../_kit/snowfox/art/`. Nothing is copied or changed.
  - Layers: background (zoom, blur and tint per view) → characters (VN frame swaps: blink, mouth from each girl's own voice level, expressions; ear close-ups mirrored for the right ear) → code effects (snow in the doorway, hearth and lantern flicker, foxfire wisps, snow sparkles, breath clouds, closing eyelids, paper doors sliding shut).
- **Voices**: ElevenLabs, the user's Demo 1 picks (`koyuki` r1_b, `homura` r1_c). `scripts/voice.py` → `media/voice/*.m4a`. Lines said together are voiced once per girl (`kh1_k` / `kh1_h`).
- **Sound**: Web Audio, HRTF (`audio.js`).

## Files
- `index.html` · `style.css` · `main.js` (story, drawing, thermal) · `audio.js` · `lines.js` · `l10n.js`
- `scripts/voice.py`: voices.
- `scripts/make_l10n.py`: zh / ja / en tables and voice phrasings → `l10n.js`.
- `scripts/make_cover.py`: `media/cover.jpg` and the site thumbnail.

## Testing
- `?auto` answers everything by itself; add `&pick=0|1` to fix the branch.
- `LULLABY.peek('share')` shows one view without the story.
- `LULLABY.log` holds the DUAL commands.
- `?cover=1` shows the poster.
