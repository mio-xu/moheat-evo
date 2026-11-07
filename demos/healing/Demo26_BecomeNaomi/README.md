# Demo26 · ねこになった日 / The Day I Became Naomi

Healing series, third Naomi demo (after Demo11 and Demo13). **You are Naomi** for one winter Saturday: the headphones are her ears,
the picture is her eyes (25 cm above the floor). Design and thermal plan: [`project/DESIGN.md`](project/DESIGN.md).

Run: `python3 -m http.server 8765` in the repo root → http://localhost:8765/demos/healing/Demo26_BecomeNaomi/
(`?cover=1&embed=1` = cover for the 1920×1080 export, `?autoplay`).

## Flow (~2:00, 5 steps)
1. **あさ・耳をすませる** — curled in the cat bed (both ears mildly warm). Drag the **ear dials** (or A / D, ← / →) until an ear points
   at the kitchen; the can opens and she calls you. Turning the ears changes what you hear (focus gain per direction), never the heat.
2. **まどべのひなた** — frosted glass beside your left ear (cool) + winter sun from the upper left (warm) = cool and warm on the same
   ear (DUAL). Clouds pass; tap the patch of sunlight twice to hop into it.
3. **れいぞうこ** — the open fridge's cold air flows along the floor into your face. Choice: peek inside (colder) / rub her leg (milder,
   a little warmth on that side).
4. **ふわふわダイブ** — the dryer beeps, she dumps the warm laundry; dive in and **hold to burrow** (warmer and more muffled the deeper).
   She looks for you (muffled), lifts the towel (brief room-air cool), whispers 「みーつけた」 at your left ear; meow back.
5. **よる・おなかのうえ** — lying on her chest at night (heartbeat, warmth from below). Choice: knead / curl up → 「おやすみ、ナオミ」 → fade → cover, `stop`.

A 🐾 にゃ button lets you meow any time (your own voice: no heat).

## Files
| | |
|---|---|
| `index.html` `style.css` `main.js` `audio.js` `lines.js` | page. `audio.js` loads Demo11's `audio.js` **by path** (purr, meows, paw steps, birds, room) into one shared AudioContext whose master bus can be low-passed (inside the laundry) |
| `media/art/*.jpg` | 6 stills, 1920×1080, from `scripts/prepare_art.py` (picks in `PICK`) |
| `media/voice/*.m4a`, `media/voice.js` | the owner: ElevenLabs `kainushi` r1_a (user pick), `scripts/voice.py` (tagged text in `TAGGED`), 15 lines, 52.8 s |
| `scripts/make_jobs.py` | Seedance prompts; LOOK / NAOMI / AVOID / style board read from Demo11's `make_jobs.py` by path (same art style, user) |
| `project/seedance_jobs.json` | the prompts as submitted (web: Image to Image, GPT Image 2, 16:9, 2K, 25 credits each; refs = style board, Demo11 room, `window_sill` as the viewpoint anchor) |
| `assets/` (not in git) | raw 2K PNGs, reference JPGs, `stills_sheet.jpg` |

QA (2026-11-08): auto-run both branches, 1:54 / 1:48, 0 errors, ends on `stop`; same-ear cool + warm on the windowsill; one screen at
1280×720, 1440×800, 1920×1080 and (no-serial) 390×844, 844×390, 768×1024. Video: not made (stills first; Seedance only when asked).
