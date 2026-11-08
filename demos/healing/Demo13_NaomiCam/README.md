# ナオミ、いまなにしてる？ · What's Naomi Up To? · Pet Cam

The pet-camera version of the Naomi game. You are out; Naomi is home alone. You watch her through the camera on the shelf
and hear her through the camera's mic. Everything is placed **relative to where the camera looks**: pan the camera and her
purr, the window and the rain move around your head, and the thermal output turns with them. No timeline, no MP4.

**Play**: double-click `start_demo.command` (or `python3 -m http.server 8765` at the repo root → `http://localhost:8765/demos/healing/Demo13_NaomiCam/`).

## Flow
| Step | What you do | Thermal |
|---|---|---|
| Connect | radio static, then the live picture (camera looks at the cat tower) | — |
| Find | she hides in the cat house (right). Sounds and a flicking tail tip give hints; turn on 🌡 **Thermal view** (false-colour heat map) and tap the warm spot | her warmth on the right; window = cool left |
| Call | hold 🎤 Talk (Space) and say "Naomi!" (mic level, or just hold ~0.6 s). 1st: she lifts her head, *mew?*; 2nd: she walks to the camera (auto track) | warmth grows as she comes closer |
| Lens | she sniffs the lens (fog), **cold nose on the lens**, then you stroke her face on the screen: she rubs her left cheek, then her right on the camera (camera shakes) | both ears cool → left warm → right warm |
| Laser | turn on 🔴, tap / drag on the floor; she runs and pounces (3 catches; move the dot after each catch) | warmth follows her left / right |
| Cool | after the laser she flops down, too hot (38.8℃ in the thermal view). Turn on 🌀 the fan and drag to aim the wind; when it hits her she cools down | the wind is cool **where you aim it** (left / right / both ears) |
| Feed | 🍚 food dispenser: motor, kibble rattling into the bowl, she runs over and eats | warm at the bowl side |
| Night | 21:08, IR night vision, rain; the room gets cold and she shivers. Turn on 🔥 the heated blanket: warmth spreads, she rolls over; then hold 🎤 and say good night | cold room + rain = cool → heated blanket = warm, both ears |
| Home | keys and the front door off-screen right, her eyes shine in the IR, she runs out of the picture to greet you, the IR turns off | hallway air = cool right, her warmth leaves to the right |
📸 saves a snapshot (JPEG with the camera's OSD). Per ear only the stronger mode is sent → 0 same-ear conflicts (`NAOMICAM.conflicts()`).

## Files
- `index.html`, `style.css` (+ Demo 10's `demo.css` by path); `?embed=1` site menu, `?cover=1` poster, `?step=find|call|lens|laser|cool|feed|night|home` jump (testing).
- `main.js` — thermal view (a grey heat map drawn with the same camera transform, coloured in the shader; her temperature on screen), fan and heated blanket; camera (1.5× view into the room picture, pan, auto track), WebGL camera look (barrel lens, colour fringes, grain, vignette, IR, static), OSD (LIVE, time, Wi-Fi, PAN), steps, Naomi, thermal engine, device output.
- `audio.js` — camera sounds (static, pan motor, talk chime, laser, electric fan (motor at the fan + breeze at the aim), food dispenser, IR click, shutter, front door) on Demo 11's AudioContext.
- Reused read-only by path: `../_kit/naomi/audio.js` (purr, mews, paw steps, rain, birds) and `../_kit/naomi/art/*.webp` (Seedance art). Nothing in Demo 11 is changed.
