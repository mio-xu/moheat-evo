# もしもし、おばあちゃん？ · Hello, Grandma? (Part 1 of 2)

The call is split into two episodes (2026-11-08): Part 1 here (call → grandpa grabs the phone → parcel → front door → scarf, ends with "open my blue box!" — to be continued);
Part 2 is [`../Demo16_FamilyCall2/`](../Demo16_FamilyCall2/) (snowman → phone back to your ear → New Year → nobody hangs up). One `main.js` runs both (`PART`, from `<body data-part>` or `?part=`).

An interactive phone call home to **grandma Hana and grandpa Gen** (original characters) in their snowy countryside house.
No timeline, no MP4: their lines are ElevenLabs files played live through a phone filter (at your ear, or on speaker on the table);
room sounds are synthesized live with HRTF. Thermal (2026-11-08) has two layers sent with the firmware's `DUAL` command (cool and heat independent on each ear):
a **voice layer** — the voice at the ear the receiver is pressed to warms that ear with its loudness (0.1 + 0.8 × envelope; shouting away from the phone ×0.35; none on speaker) —
and an **ambient layer** — front door (left cool), scarf (both warm), snowman (right cool). `FAMILY.both()` counts frames with warm + cool on one ear.

**Play**: `python3 -m http.server 8765` at the repo root → `http://localhost:8765/demos/healing/Demo15_FamilyCall/` (or `start_demo.command`). Headphones on; mic optional.

| Moment | Thermal |
|---|---|
| You call their landline; the phone at your left ear | left warm |
| Grandma shouts for grandpa, he runs over and grabs the receiver; they end up sharing it cheek to cheek | left warm |
| Their parcel arrives mid-call: put them on speaker, open the front door (left) | left cool |
| Wrap grandma's hand-knitted scarf around your neck | both ears warm (slowly, like wool) |
| Grandpa's refrigerated mini snowman, pressed to your right cheek | right cool, left still warm |
| Phone back to your ear, a New Year promise, nobody wants to hang up first | left warmest, right warm |

Files: `index.html`, `style.css` (+ Demo 10's `demo.css` and Demo 12's `call.css` by path), `main.js` (story, choices / mic / actions, thermal, device),
`audio.js` (Demo 12's CallAudio copied and extended: speakerphone, dial / ringback / pickup, grandpa running through the phone, parcel sounds),
`lines.js` (who / ja / en / reading). Voices: `scripts/voice.py` — ElevenLabs, the user's picks `hana r1_c` / `gen r1_a` (tools/eleven/cast.json; earlier VOICEVOX もち子さん / ちび式じい), tags per line.
Art: Seedance GPT Image 2 in Demo 12's soft-cel style; design A chosen from 3 (`project/designs_contact.jpg`). On 2026-11-07 the API upload limit was
reached, so most frames were made on the seedance2-5.com website with the same prompts (`project/web_prompts.json`). Raw PNGs in `assets/art/` (not in git)
→ `scripts/prepare_art.py` → `media/art/*.webp` + face patches (grandma / grandpa mouths, grandpa's blink).
