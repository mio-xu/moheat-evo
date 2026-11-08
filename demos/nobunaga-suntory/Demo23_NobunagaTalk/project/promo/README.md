# Promo video — 信長と、語らう (real-time AI talk × MoHeat Evo), ~62 s

Built from the REAL demo, not re-drawn: two live sessions are recorded on the private live pages, then replayed frame by frame in
the same pages under a virtual clock, so the real engine draws every frame (pictures, mouths, voice-driven DUAL warmth, #cmd).
Large outputs stay outside git (work folder = any scratch folder, e.g. `$W`).

| Step | Command | Output |
|---|---|---|
| 0 | `python3 ../../server.py` (private live server :8771, password file `~/.moheat_live_pass`) | |
| 1 record (costs ElevenLabs credits, a few short turns) | `node record.js /live azuchi $W/rec/solo.json "信長様、あなたの夢は何ですか？" "ちょっと寒くなってきました…"` · `node record.js /live/roundtable kyoto $W/rec/rt.json "見てください、外は雪ですよ！窓を開けてみませんか？" "お二人は、熱燗とハイボール、どっちが好きですか？"` | every agent line, timing, TTS mp3 |
| 2 your voice | `python3 user_voice.py $W/user` (ElevenLabs `kainushi`, ~84 chars), then trim silences (`*_t.wav`) | |
| 3 state passes | `node render.js replay $W/rec/solo.json $W/r_solo --say-delay 3.45,3.35` · `… rt.json $W/r_rt --say-delay 4.5,1.5` · `node render.js script /demos/nobunaga-suntory/Demo23_NobunagaTalk/ $W/s_gifu --scene gifu` (+ Demo42 yamazaki `s_yama`, Demo41 tea `s_tea`) | state.jsonl, audio.json |
| 4 edit | `python3 edit.py $W` (prints the capture ranges) | frames.json, audio_plan.json |
| 5 frames | the same render.js commands with `--ranges <printed ranges>` (deterministic: same frames as the state pass) | frames/*.jpg (3840 × 2160) |
| 6 composite | `node comp.js $W` | comp/*.png (1920 × 1080) |
| 7 sound | `python3 mix.py $W` | mix.wav |
| 8 encode | `ffmpeg -framerate 30 -i $W/comp/%05d.png -i $W/mix.wav -c:v libx264 -profile:v high -preset slow -crf 15 -pix_fmt yuv420p -c:a aac -b:a 256k -movflags +faststart out.mp4` | |

Files: `cdp.js` (headless Chrome over CDP), `hooks.js` (record / replay / virtual clock / audio patch, injected before the page),
`record.js`, `render.js`, `edit.py` (the cut on the 128 BPM grid + overlays), `comp.html` + `comp.js` (vector overlays in the
style of the user's MoHeat Evo film: STYLE in the work folder), `mix.py` (voices panned where the engine placed them, room sounds,
the film's soundtrack ducked under the demo sound), `user_voice.py`.
Music: "EDM Detection Mode" by Kevin MacLeod (incompetech.com), CC BY 4.0 — the 60 s edit used by the MoHeat Evo film.
