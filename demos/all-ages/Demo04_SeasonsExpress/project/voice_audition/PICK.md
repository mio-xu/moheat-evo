# Conductor voice auditions (ElevenLabs Voice Design, 2026-11-09)

Brief: a friendly, playful announcer — tiny season spirit, youthful gender-neutral anime voice, sing-song station calls, warm whisper.
Sample text: tools/eleven/cast.json → halfy.sample.

| take | F0 median | range p10–p90 | dynamics | note |
|---|---|---|---|---|
| **r1_a ← picked** | 421 Hz | 333–571 Hz | 15.9 dB | brightest and most sing-song, the biggest contrast between announcement and whisper |
| r1_b | 356 Hz | 250–471 Hz | 11.7 dB | calmer, flatter |
| r1_c | 368 Hz | 262–552 Hz | 12.2 dB | in between |

Picked by the Demo04 agent (the user said not to wait); saved as voice `vjNv4mFdGd9ZFsf2MEK6`. To switch: `python3 tools/eleven/pick.py halfy r1_b`
(or r1_c), then `python3 scripts/voice.py` (and `--langs ja,en,zh` for the kept en / zh takes) and `python3 scripts/export.py`.
