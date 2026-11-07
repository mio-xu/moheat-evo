# Demo 14 — Live stream room (working title 「きみだけの配信、はじまるよ」 / *Your Stream, Live*)

Interactive demo: you are a viewer in a live-stream room of a female streamer. You switch between **four channels**,
send chat comments and gift items (super-chat style), and the streamer reacts to you by name. She uses a binaural
(dummy-head) mic, so her voice, whispers and breath come from your left or right ear, and the headphones answer with
**per-ear cool / warm** (one mode per ear, 0 same-ear conflicts).

Art style = Demo 12's soft-cel pick (`assets/art/ref_style3.png` → symlink to Demo 12's `style_3_softcel.png`).
Art via Seedance API (`scripts/seedance.py`), voices via VOICEVOX (`scripts/audition.py` for the audition).

## Streamers (design round 1)

| | Name | Feel | Stream | Thermal flavour | Voice candidates |
|---|---|---|---|---|---|
| A | 白深ミント Shiromi Mint | calm, sleepy, gentle | ASMR whisper stream, dummy-head mic | ear blowing / mint / ice = cool, one ear at a time | ユーレイちゃん, 四国めたん, 暁記ミタマ, 九州そら (ささやき) |
| B | 火野ひなた Hino Hinata | genki gamer, loud, laughs a lot | spicy-ramen challenge + game | spicy = warm, fan / cold drink = cool | 満別花丸 元気, 春日部つむぎ, 雨晴はう, 櫻歌ミコ |
| C | 宵月ルナ Yoizuki Luna | cool, mature, low voice | late-night singing & chat | night wind from the window = cool, a blanket = warm | 冥鳴ひまり, 夜語トバリ, 波音リツ, 四国めたん セクシー |
| D | 甘音ココア Amane Cocoa | sweet, warm, a bit teasing | cosy café chat with hot cocoa | hot cocoa / heater = warm, fu-fu blowing = cool | 九州そら あまあま, ユーレイちゃん 甘々, 満別花丸 ぶりっ子, 四国めたん あまあま |

ずんだもん is left out (Demo 1/2). Audition page: `audio/audition/index.html` (local only).

Large media (`assets/art/`, `audio/`) stay out of git.
