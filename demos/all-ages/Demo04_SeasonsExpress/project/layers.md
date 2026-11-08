# Layers · Demo04 v2 (magic × cyber carriage + Season Spirit Conductor)

Standard: guide §6 (Gaku method) + §6.2 strict layers. No Seedance (no clip passes §6.3: every motion is told by stills + code).

| Layer | Source | Made by | Animated by (code, main.js) | Cost |
|---|---|---|---|---|
| L0 seasons behind the glass | old Demo04 scenery (winter / summer / rainforest / tunnel / spring / aurora, far · mid · near) | reused | parallax scroll with the train speed, weather particles, glass overlays | 0 |
| L0 ice shield | procedural crystal lattice | main.js (ICE) | rises 2.6 s / 5.4 s, melts at 12.5 s | 0 |
| L1 carriage | `car_closed` (gpt-image-2, glass = #00B140) → `car_base` | prepare_art.py (green key) | rail-joint sway; split in two in the tunnel | $0.2 |
| L1 rune panels | `car_open` (masked-free edit of car_closed) → `car_runes_ice` / `car_runes_fire` (+ `runes_glow`) | prepare_art.py (diff mask, blue → orange recolour) | 26 panels flip on hinges (L 2–4.5 s, R 5–7 s, close 128–132 s); colour = what that ear feels; chaos = hue glitch | $0.2 |
| L1 frame glow | window-mask ring → `frame_glow` | prepare_art.py | tinted blue / orange by the live thermal output per side | 0 |
| L2 hologram screen | code + conductor `holo` pose | main.js | announcer bust + mouth set, scanlines, beam; icons between lines | — |
| L2 props | `toys` (snowman, sun pinwheel) · tea cup / globe from the old table props | gpt-image-2 (medium) / reused | spring pop-down, pinwheel spins with the summer breeze; tea lift in the gate, soft steam | $0.07 |
| L3 conductor | `cond_opt_a` (design A) → `cond_holo`, `cond_wave`, `cond_ear` + masked blink variants | gpt-image-2 + build_stage.py + lp_mouths.py (warp: false, drawn line) | blink 2–6 s, breathing, mouth set lv 0–3 from the Japanese voice level | ~$1.4 |
| FX | old fx sprites + code (steam, breath, embers, hot air, seam, glitch) | — | particles with drag / gravity | 0 |

Total OpenAI ≈ $2.2 (project/openai_log.json), Seedance 0, ElevenLabs ≈ 2,000 characters (auditions + 9 lines × 3 languages; only ja is played).
