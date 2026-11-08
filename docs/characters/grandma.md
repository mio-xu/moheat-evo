# ハナ（おばあちゃん） · Hana (grandma)

Cute countryside grandmother in her seventies: chatty, fussing, warm and caring; soft ふふふ laugh; gentle rural dialect.

```json
{
 "id": "grandma",
 "name_ja": "ハナ（おばあちゃん）",
 "name_en": "Grandma Hana",
 "category": "healing",
 "series_style": "癒し · 家人（Demo15、16）: 柔和赛璐璐，手绘感，平涂 + 一层柔边阴影，暖棕色线 · 5 头身，圆润可爱（不是 Q 版）· 暖橙室内 + 窗外雪的冷蓝",
 "demos": [
  "demos/healing/Demo15_FamilyCall",
  "demos/healing/Demo16_FamilyCall2",
  "demos/healing/Demo29_FamilyVisit",
  "demos/healing/_kit/familycall"
 ],
 "refs": {
  "lock_face": "demos/healing/Demo15_FamilyCall/assets/art/gm_call.png",
  "others": [
   "demos/healing/Demo15_FamilyCall/assets/art/duo_call.png",
   "demos/healing/Demo15_FamilyCall/assets/art/design_A_classic.png",
   "demos/healing/_kit/familycall/media/art/gm_call.webp"
  ]
 },
 "colours": {
  "hair": "silver-white, small round bun, red ball hairpin",
  "eyes": "crescent smiling eyes behind round gold-rimmed glasses",
  "outfit": "soft pink hand-knitted cardigan over lavender round-collar blouse, white apron",
  "skin": "rosy cheeks"
 },
 "backdrop": {
  "colour": "#00B140",
  "matte": "green",
  "why": "silver-white hair + pastel pink → green #00B140 + matte green if she is ever layered (Demo15/29 art is full scenes, no cutout)"
 },
 "voice": {
  "engine": "ElevenLabs",
  "voice_id": "0ArRIvpaZd8rF5mRKY2I",
  "settings": {
   "model": "eleven_v4",
   "language_code": "ja",
   "stability": 0.4,
   "similarity_boost": 0.8,
   "seed": 7
  },
  "tags": "English square-bracket tags + ellipses (handoff §4): ear = [whispers]; gentle = [softly] / [warmly]; cast key hana (pick r1_c); tags auto-set from punctuation + OVERRIDE; [giggles] [warmly] [excited]"
 },
 "personality": "Cute countryside grandmother in her seventies: chatty, fussing, warm and caring; soft ふふふ laugh; gentle rural dialect",
 "speech": {
  "first_person": "おばあちゃん (self-reference); わたし",
  "endings": [
   "〜じゃろ",
   "〜けん / 〜けんね",
   "〜んさい",
   "〜とる"
  ],
  "habits": [
   "calls the player あんた / 孫",
   "calls him おじいさん",
   "あらまあ / まあまあ",
   "ふふふ"
  ]
 },
 "thermal": "Receiver at your ear: that ear warm with her voice (0.1 + 0.8 × envelope); hand-knit red scarf (both warm), hand warmer (left warm), hug at the genkan (left)",
 "notes": [
  "Original character (user pick A)",
  "Before ElevenLabs: VOICEVOX もち子さん",
  "cast.json key hana"
 ]
}
```

## Look (prompt wording)

Grandma Hana, a cute countryside grandmother, small, soft and round (about 5 heads tall, not chibi): silver-white hair in a small round bun with a red ball hairpin, round gold-rimmed glasses, crescent smiling eyes, rosy cheeks, gentle wrinkles drawn with a few soft lines; a soft pink hand-knitted cardigan over a lavender blouse with a round collar, a white apron.

## Personality and speech

- Chatty, worries whether you eat properly, teases grandpa lovingly.
- Example: 「…あらまあ！ あんたかい！ まあまあ、元気にしとった？」 (g02)
- Example: 「こたつ、あっためて待っとるけんね」 (g16)

## Demos

- Demo15_FamilyCall — 《もしもし、おばあちゃん？》 phone call part 1: parcel, red scarf.
- Demo16_FamilyCall2 — 《じいちゃんの、ゆきだるま》 part 2 (reuses Part 1 via <base>).
- Demo29_FamilyVisit — 《ただいま、じいちゃん・ばあちゃん》 New Year visit: genkan hug, kotatsu, futon story.
- healing/_kit/familycall — shared code / art / voices of Demo15–16.
