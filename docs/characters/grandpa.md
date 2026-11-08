# ゲン（じいちゃん） · Gen (grandpa)

Lovable, clumsy, stubborn countryside grandfather in his seventies; grabs the phone, loud, big わっはっは laugh, secretly misses the grandchild and is shy about it.

```json
{
 "id": "grandpa",
 "name_ja": "ゲン（じいちゃん）",
 "name_en": "Grandpa Gen",
 "category": "healing",
 "series_style": "癒し · 家人（Demo15、16）: 柔和赛璐璐，手绘感，平涂 + 一层柔边阴影，暖棕色线 · 5 头身，圆润可爱（不是 Q 版）· 暖橙室内 + 窗外雪的冷蓝",
 "demos": [
  "demos/healing/Demo15_FamilyCall",
  "demos/healing/Demo16_FamilyCall2",
  "demos/healing/Demo29_FamilyVisit",
  "demos/healing/_kit/familycall"
 ],
 "refs": {
  "lock_face": "demos/healing/Demo15_FamilyCall/assets/art/gp_snow.png",
  "others": [
   "demos/healing/Demo15_FamilyCall/assets/art/duo_call.png",
   "demos/healing/Demo15_FamilyCall/assets/art/design_A_classic.png",
   "demos/healing/_kit/familycall/media/art/gp_snow.webp"
  ]
 },
 "colours": {
  "hair": "bald on top, fluffy white hair at the sides, big bushy white eyebrows, round white moustache",
  "eyes": "small round sparkly black",
  "outfit": "navy padded hanten with white cross pattern over a grey sweater (red knitted hat + gloves outdoors)",
  "skin": "round red nose"
 },
 "backdrop": {
  "colour": "#00B140",
  "matte": "green",
  "why": "white hair / moustache → green #00B140 + matte green if he is ever layered (Demo15/29 art is full scenes, no cutout)"
 },
 "voice": {
  "engine": "ElevenLabs",
  "voice_id": "PFMwAC8IdFchAimQPSXb",
  "settings": {
   "model": "eleven_v4",
   "language_code": "ja",
   "stability": 0.4,
   "similarity_boost": 0.8,
   "seed": 7
  },
  "tags": "English square-bracket tags + ellipses (handoff §4): ear = [whispers]; gentle = [softly] / [warmly]; cast key gen (pick r1_a); [laughs heartily] [proudly] [excited]"
 },
 "personality": "Lovable, clumsy, stubborn countryside grandfather in his seventies; grabs the phone, loud, big わっはっは laugh, secretly misses the grandchild and is shy about it",
 "speech": {
  "first_person": "じいちゃん / わし",
  "endings": [
   "〜じゃ",
   "〜けえ",
   "〜かろう",
   "〜んか？"
  ],
  "habits": [
   "calls grandma ばあさん",
   "ほうか、ほうか",
   "わっはっは / ふっふっふ",
   "boastful then shy (…ばあさんから切れ)"
  ]
 },
 "thermal": "Voice warm at the receiver ear; his mailed snowman pressed to your cheek (cool, DUAL with the hand warmer on the same ear in part 2); snowball past the right ear (cool); snoring on the right in Demo29",
 "notes": [
  "Original character (user pick A)",
  "Before ElevenLabs: VOICEVOX ちび式じい",
  "cast.json key gen"
 ]
}
```

## Look (prompt wording)

Grandpa Gen, a cute countryside grandfather, small, soft and round (about 5 heads tall, not chibi): bald on top with fluffy white hair at the sides, big bushy white eyebrows, a round white moustache, a round red nose, small round sparkly black eyes; a navy padded hanten jacket with a white cross pattern over a grey sweater.

## Personality and speech

- Loud, proud, clumsy; competes with grandma for your attention.
- Example: 「とけとらん！ クール便じゃけえ！」 (p07)
- Example: 「…ばあさん、これ、どこ押したら切れるんじゃ」 (p16)

## Demos

- Demo15_FamilyCall — part 1: grabs the phone, blue box.
- Demo16_FamilyCall2 — part 2: mailed snowman on your cheek.
- Demo29_FamilyVisit — New Year visit: station pick-up, snowball fight, snoring.
- healing/_kit/familycall — shared code / art / voices.
