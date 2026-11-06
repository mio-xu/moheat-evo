# キミだけのスペシャルファンミーティング — 分镜 & Seedance 提示词

150 s · 1920×1080 · 16:9 · 24/30 fps · first-person POV from the front row. The browser animatic (`index.html`, `output/animatic_1080p.mp4`) is the timing reference: **cut every generated shot to the animatic's timing.** The audio (`output/mix_48k.wav`) and the thermal track (`media/thermal.csv`) are already locked to it.

Thermal legend: 🔥 = heat from Ayane's voice at the ear she is near · ❄ = cooling SFX (fan / ice / magic) at their own side.

## How to generate
1. Image references for every shot: `art/A_Character.png` (design sheet), plus the matching pose or bust from `art/chatgpt/`, plus `art/chatgpt/stage_bg.png` or `stage_bg_live.png` (scene 5).
2. Generate image-to-video from the reference frame, 5–10 s per clip. Longer shots are split at "/".
3. Put the style block and the character block in front of every prompt.
4. Lip sync: keep the generated mouth neutral and fix it in the edit or with a lip-sync pass against `output/stems/heat_voice.wav`.
5. Assemble the clips in DaVinci Resolve over `output/mix_48k.wav`, with `animatic_1080p.mp4` on a reference track.

**Style block**
> Original Japanese 2D anime, chibi proportions (about 2.5 heads), clean cel shading, soft bloom, cute and warm. First-person POV from the front row of a small, cute idol fan-meeting stage: pink and lavender curtains, star garlands, balloons, a glossy stage floor, velvet rope and seats in the foreground. 16:9, no text, no watermark.

**Character block (Ayane)**
> Hoshino Ayane, a cheerful new idol: long pink twin tails, gold star hair clips and blue-white striped bows, large violet-pink eyes, small headset mic; idol outfit in blue, white and pink (white top with a blue-striped bow, pink-white layered frilly skirt), white thigh-high socks, white-blue stage boots. Same design in every shot.

| # | Time | Shot / camera | Action & acting | Position | 🔥/❄ | Seedance motion prompt |
|---|---|---|---|---|---|---|
| 01 | 0:00–0:06 | Wide, static | Stage lights up with a little jingle. Ayane runs in from backstage, waves | centre, 4→2.6 m | 🔥 faint, both | Stage lights brighten; the idol girl runs in from the back of the stage, stops at centre and waves happily at the camera. |
| 02 | 0:06–0:14 | Medium, push-in | Notices you're already here, surprised then delighted; "a special fan meeting just for you" | 2.3→1.2 m | 🔥 both | She tilts her head in surprise, then smiles brightly, clasps her hands and walks toward the camera. |
| 03 | 0:14–0:21 | ECU from left edge | Leans into the left ear, hand cupped, whispers hello; a soft warm "haa" | L ear, 0.17 m | 🔥 **left** | Extreme close-up: she leans in from the left edge, cups her hand by her mouth and whispers, then exhales a soft warm breath. |
| 04 | 0:21–0:25 | Whip pan → ECU right | Circles behind you, pops up at the right ear: "hello from this side too~!" | behind → R ear | 🔥 left → **right** | She dashes out of frame left and pops in at the right edge, very close, giggling. |
| 05 | 0:25–0:30 | Medium close | Shy, fidgeting: "I'll tell you a secret" | front-right, 0.6 m | 🔥 both, low | She fidgets shyly, blushes and glances to the side before looking back at the camera. |
| 06 | 0:30–0:41 | ECU left / | Whispers into the left ear: she was nervous, but forgot it when she saw you. Soft giggle | L ear, 0.17 m | 🔥 **left** | Close-up from the left, half-closed eyes, whispering behind her hand / she giggles softly. |
| 07 | 0:41–0:50 | Dash → ECU right | Runs across the front to the right ear: "I'll sing just for you!" then "…it's a secret" | R ear, 0.2 m | 🔥 **right** (louder) | She runs past the camera to the right edge, says something cheerful and loud, then winks and puts a finger to her lips. |
| 08 | 0:50–0:56 | Medium | Fans herself: "the stage lights are hot". Gets the fan out | front, 0.9 m | 🔥 both | She fans herself with her hand, then pulls out a pink star fan with a bright idea face. |
| 09 | 0:56–1:01 | Medium, she on the left | Fans your **left** ear: "flap flap~ nice and cool?" | she L, fan at L ear | ❄ **left** | Facing left, she flaps the pink fan vigorously toward the left edge of the frame; little breeze lines. |
| 10 | 1:01–1:06 | Medium, she on the right | Fans your **right** ear | she R, fan at R ear | ❄ **right** | She hops to the right side and fans toward the right edge. |
| 11 | 1:06–1:15 | Medium + insert | "Ta-da! An ice-cold drink!" She offers a blue soda; insert of the glass right in front of you, ice clinking, fizzing | front, glass at 0.26 m | ❄ **both ears** | She presents a glass of blue soda full of ice with both hands, pushing it toward the camera; ice cubes clink and bubbles rise. |
| 12 | 1:15–1:20 | Medium | Announces the game: "guess which side I'll talk from!" | front, 1 m | 🔥 both | She raises a finger with a playful grin, then darts behind the camera. |
| 13 | 1:20–1:27 | ECU right + magic fan left | Whispers "…right side ♪" at the right ear; a magic fan sweeps a breeze from the **left** | voice R · fan L | 🔥 **right** + ❄ **left** | Close-up from the right, whispering; a glowing pink fan floats in at the left edge and sweeps a sparkling breeze. |
| 14 | 1:27–1:34 | ECU left + magic fan right | "Next… left." Breeze from the **right**; "does it tickle?" | voice L · fan R | 🔥 **left** + ❄ **right** | Close-up from the left, whispering; the magic fan sweeps in from the right edge. |
| 15 | 1:34–1:40 | ECU right | "Right…" then a cool "fuu~" into the right ear | R ear | 🔥 → ❄ **right** | Close-up from the right: she whispers, then blows a cool, glittering breath. |
| 16 | 1:40–1:45 | ECU left → medium | "Left!" + breeze from the right; "you got them all, amazing!" | voice L · fan R → front | 🔥 **left** + ❄ **right** | She pops in at the left edge, then steps back to centre and claps, cheering. |
| 17 | 1:45–2:10 | Live: medium / medium | Lights dim, spotlights sweep; she sings an original melody. Verse on the **left**, chorus on the **right**; cool sparkle magic on the opposite side each time | sings L (−65°), then R (+65°) | 🔥 follows the song L→R, ❄ magic R then L | Stage goes into concert lighting with sweeping pink and blue spotlights; she sings into her headset mic, swaying on the beat, on stage left / then on stage right, sparkling snowflake magic bursts on the opposite side. |
| 18 | 2:10–2:15 | Medium | Bows shyly: "thanks for listening" | front, 0.8 m | 🔥 both | She bows with her hands in front of her and looks up shyly. |
| 19 | 2:15–2:25 | ECU left / ECU right | Thanks you at the left ear; circles behind; "come see me again… promise" at the right ear | L ear → R ear | 🔥 **left → right** | Close-up from the left whispering thanks / she reappears at the right edge and whispers a promise. |
| 20 | 2:25–2:30 | Wide | "Bye-bye~!" She waves the fan in a big arc; the breeze fades with the lights | front, 0.55 m → away | ❄ sweeps **left → right**, fades to 0 | She waves goodbye with the pink fan in a wide arc as the stage lights slowly dim. |
