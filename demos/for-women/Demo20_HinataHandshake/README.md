# あと10秒だけ、ね？ · Just Ten More Seconds?

An interactive handshake event with **Hinata (陽向)**, an original character: 19, the sweet younger member of an idol group,
sweet in public and a little dark and teasing at your ear (年下・腹黒). Design = the user's pick (pink hair, amber eyes, small fang,
star stud earring, cream cable-knit cardigan), from `../Demo16_HandshakeEvent/assets/art/hinata_pink_sheet.png`.

**Play**: `python3 -m http.server 8765` at the repo root → `http://localhost:8765/demos/for-women/Demo20_HinataHandshake/` (or `start_demo.command`). Headphones on; mic optional.

| Moment | Thermal (DUAL: cool and heat independent per ear) |
|---|---|
| Queue in a winter hall, the automatic doors on your right open | right cool (draft + gust) |
| Across the table, he greets you | both ears warm a little with his voice |
| You take his hand; he blows on your cold hands ("はぁー"), face close to yours | both warm (a breath swell; his voice close in front) |
| He leans to your **left** ear: "you were in another member's line…" | left warm, following his voice |
| Staff calls time; he does not let go (the timer runs into overtime) | his voice close in front: both mildly warm |
| He leans to your **right** ear for a promise; someone comes in through the doors | right **warm (voice) + cool (gust) at once** |
| You say "約束する" (mic or button), he waves goodbye | warmth fades |

Files: `index.html` (+ Demo 10's `demo.css` and Demo 12's `call.css` by path, then `style.css`), `main.js` (story, choices / mic / actions, thermal layers, device),
`audio.js` (HRTF voices, synthesized hall: crowd, stage music, entrance draft, door, breath, timer), `lines.js` (ja / en / style / reading).

Voice: `scripts/voice.py` — Hinata = **ElevenLabs** voice "v2" (the user's pick 2026-11-08 from `scripts/eleven_audition.py`, a Voice Design
young male idol; earlier VOICEVOX:暁記ミタマ "m1"), `eleven_v4`, Japanese, delivery from audio tags per line (`[whispers]` at the ear, `[playful]`,
`[giggles]` …). Key = `ELEVENLABS_API_KEY` in the repo's `.env.local` (gitignored; set up with `npx -y @elevenlabs/cli@latest onboard init`).
Staff = ElevenLabs `staff_f` (user pick r1_a; earlier VOICEVOX:春日部つむぎ).

## Picture: layers (2026-11-08, the standard way — DEMO_DESIGN_GUIDE §6 标准制作流程)

Redone as layers instead of video (user: "重做版直接接管原版"; the first version — scene stills, mouth / blink patches, 11 Seedance clips — is
backed up outside the repo: `~/Desktop/MoHeat Evo 备份/for-women/Demo20_HinataHandshake_20261108-1220/`). No video.

| Layer | Art | Moves by |
|---|---|---|
| background | the queue picture (no Hinata, used as is) and an empty booth plate (`bg_booth`: balloons + fairy lights, Hinata removed from the first version's still) | parallax (mouse / tilt + slow sway); the booth plate is zoomed for the close views |
| Hinata | 4 poses on a plain grey background (the first version's stills as pose references): `hina_ref` (booth, hand held out), `hina_hands`, `hina_lean` (mirrored by `main.js` for the right ear), `hina_wave` (a same-face edit of `hina_ref`); the table edge is part of the pose | breathing, a small bob while talking (code) |
| face | edits of each pose: mouth slightly open (his fang shows), eyes closed → feathered patches (both eyes, also under the fringe / with the head tilted) | the mouth follows `HINA.FW.mouth` (the voice), ~0.13 s blinks |
| effects | — | `main.js`'s canvas code: snow through the doors, the overtime heart glow, the timer |

- Art: Seedance website (bg + 3 poses, 100 credits) — then the uploads were rate-limited, so the variants and the wave came from the OpenAI API
  (`python3 tools/openai/images.py demos/for-women/Demo20_HinataHandshake <job>`, gpt-image-2, 2560×1440) and one from ChatGPT. Prompts:
  `scripts/seedance_layers.py prompts` → `project/web_prompts.json` (references: `assets/art/web/d20_*.jpg` = the first version's stills).
  Raw PNGs in `assets/art/` (not in git).
- Build (Pillow + numpy + the isnet-anime matte for this pastel figure): `python3 tools/art/build_stage.py demos/for-women/Demo20_HinataHandshake --preview`
  from `project/stage.json` (`matte: ai`, `hooks` → `HINA.S.view` / `HINA.FW.mouth`, the wave's near-hints, placements) → `media/art/` + `media/layers.js`.
- `media/layers.js` + `../../shared/layers.js` (before `main.js`) draw the composite wherever `main.js` draws a still; `?flat` = the flat stills.
