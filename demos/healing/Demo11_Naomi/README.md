# ナオミと、ふわふわの一日 · A Fluffy Day with Naomi

A healing interactive game with **Naomi**, the project owner's real cat: a long-haired blue-grey and white girl who is soft, gentle
and easy to tease. No timeline, no MP4. Every sound is synthesized live in the browser (Web Audio, HRTF panner) and the thermal
output is computed live from the same sources and directions.

**Play**: double-click `start_demo.command` (or `python3 -m http.server 8765` at the repo root → `http://localhost:8765/demos/healing/Demo11_Naomi/`).
Headphones on; mic optional (call her name, blow on her food), or use the on-screen button / Space.

## Flow
| Step | What you do | Thermal |
|---|---|---|
| Morning, eyes closed | listen: paw steps come in from the left, a sniff at your left ear, then a **cold nose boop** | left cool pulse; her warmth grows on the left |
| Pet | stroke her head (drag); tap her nose to boop back | warm front (body + purr); nuzzles: **left cheek, then right** = warm on that side |
| Call | say "Naomi!" (mic level) or press 📣: she answers *mew?* from the cat tower (right), then walks over | small warm on the right, then growing toward the front |
| Play | move the teaser wand and wiggle it in front of her; 3 catches | the feather's wind = cool at the feather; Naomi = warm at her side |
| Feed | blow on her warm food (mic or hold the button) | hot bowl = warm front; your breath = cool, both ears |
| Poke / belly | poke her 3 times (she never gets angry), she rolls over; rub her tummy | her body + purr = warm |
| Night | rain on the window (left); she sleeps on your lap; stroke her or just listen | both ears warm, breathing with her purr |
Then the room dims, *おやすみ、ナオミ*, and the page returns to the cover (device output `stop`).

Per ear only the stronger mode is sent (hysteresis 0.06; switching sets the other channel to 0) → 0 same-ear conflicts (`NAOMI.conflicts()`).

## Files
- `index.html`, `style.css` (+ Demo 10's `demo.css` by path) — page; `?embed=1` site menu, `?cover=1` poster, `?step=pet|call|play|feed|poke|belly|sleep` jump (testing).
- `main.js` — steps, input (stroke / tap / wand), Naomi's sprite animation (breathing, blink, mew faces, squish, walk, pounce), thermal engine, device output.
- `audio.js` — synthesized purr (25 Hz pulse trains, inhale / exhale), mews (formant-filtered sawtooth: mew, ask, tiny, trill, long), paw steps, sniff, boop, fur brushing, feather + bell, crunching, rain, birds.
- Art: **Seedance (GPT Image 2, image-to-image)** from Naomi's photos + the Demo 1–4 style board.
  `scripts/make_jobs.py` → `project/seedance_jobs.json`; `scripts/seedance_images.py all` (Demo 10's API client loaded by path, key `~/.seedance_key`) → `assets/art/*.png` (not in git);
  `scripts/prepare_art.py` → `media/art/*.webp` (cut out, cropped, face frames aligned to their base).
- Naomi's original photos (`demos/naomi/`, `project/seedance_refs/naomi_photos.jpg`) stay local and out of git.
