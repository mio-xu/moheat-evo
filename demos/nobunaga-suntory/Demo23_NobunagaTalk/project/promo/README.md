# Promo video — 信長と、語らう × MoHeat Evo, 62.5 s

All footage comes from the PUBLIC scripted pages (Demo23 / 41 / 42): each page is replayed frame by frame in headless Chrome
under a virtual clock (`hooks.js`), so the real engine draws every frame (pictures, mouths, the voice-driven DUAL warmth, `#cmd`).
Your turns are typed through the page's own input (`TALKDEMO.say`); their spoken versions are ElevenLabs lines (`user_voice.py`).
Large outputs stay outside git (work folder `$W`, e.g. a scratch folder). No server keys, no live session needed.

| Step | Command | Output |
|---|---|---|
| 0 | `python3 -m http.server 8790 --bind 127.0.0.1` (repo root) | |
| 1 your voice | `python3 user_voice.py $W/user` (~46 chars), trim silences → `u5_t.wav`, `u6_t.wav`; `levels.json` (20 Hz RMS, see STATE) | |
| 2 state passes | `node render.js /demos/nobunaga-suntory/Demo23_NobunagaTalk/ $W/s_gifu --scene gifu` (hook) · `… Demo23 $W/n_tea --scene tea --say "はい\|茶器です\|こたつで温まります！\|はい\|おいしいです" --say-delay 1,1,2.07,1,1 --fix-stand` · `… Demo42 $W/k_rt --scene kyoto --say "はい\|焼き鳥のねぎまがおすすめです！\|こたつでみかんです\|はい" --say-delay 1,2.43,1,1 --fix-stand` · `… Demo42 $W/s_yama --scene yamazaki` · `… Demo41 $W/s_tea --scene tea` | state.jsonl, audio.json |
| 3 edit | `python3 edit.py $W` (prints the capture ranges) | frames.json, audio_plan.json |
| 4 frames | the same render.js commands + `--ranges <printed>` (+ `--max`) | frames/*.jpg (3840 × 2160) |
| 5 composite | `node comp.js $W --out comp4k --dpr 2 --jpg` | 4K frames |
| 6 sound | `python3 mix.py $W`, then loudnorm (−16 LUFS, −1.5 dBTP, linear two-pass) → `mix_norm.wav` | |
| 7 encode | 1080p: `ffmpeg -framerate 30 -i comp4k/%05d.jpg -i mix_norm.wav -vf scale=1920:1080:flags=lanczos,format=yuv420p -c:v libx264 -profile:v high -preset slow -crf 15 -c:a aac -b:a 256k` · 4K: same without scale, crf 16 | |
| 8 QA | `python3 qa.py out.mp4 $W/qa` (contact sheet, loudness, true peak) | |

Files: `cdp.js` (headless Chrome over CDP), `hooks.js` (virtual clock, audio patch, `fixStand` framing fix), `render.js`,
`edit.py` (the cut on the 128 BPM grid + all overlays), `comp.html` + `comp.js` (vector overlays in the style of the MoHeat Evo
film), `mix.py` (voices panned where the engine placed them, room sounds, the film's soundtrack ducked under the demo sound),
`user_voice.py`, `qa.py`.
`--fix-stand`: the engine's standing pose (`_kit/talk/main.js` frame() 'left' / 'right') is drawn so tall that his head is cut off;
the capture draws it 14 % smaller from the same feet line (kit bug reported, not fixed here).
Music: "EDM Detection Mode" by Kevin MacLeod (incompetech.com), CC BY 4.0 — the 60 s edit used by the MoHeat Evo film.
