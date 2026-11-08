# コハク · Kohaku (kohaku)

Small shrine guide fox spirit; bright, cheerful, curious, a little timid in the dark but brave; encouraging.

```json
{
 "id": "kohaku",
 "name_ja": "コハク",
 "name_en": "Kohaku (guide fox)",
 "category": "all-ages",
 "series_style": "全年齢（Demo1–4、10）: 可爱日系 2D，粉彩赛璐璐，Q 版偶像 / 妖精 · 2–3 头身，大眼 · 明亮饱和的粉、蓝、橙；不能用浮世绘金箔风",
 "demos": [
  "demos/all-ages/Demo10_CaveSpring"
 ],
 "refs": {
  "lock_face": "demos/all-ages/Demo10_CaveSpring/assets/art/kohaku_base.png",
  "others": [
   "demos/all-ages/Demo10_CaveSpring/assets/art/kohaku_happy.png",
   "demos/all-ages/Demo10_CaveSpring/media/art/kohaku_base.webp"
  ]
 },
 "colours": {
  "hair": "fur: fluffy bright orange, cream-white chest / muzzle / tail tip, pink inner ears",
  "eyes": "big shiny amber",
  "outfit": "red silk cord round the neck with a small golden bell",
  "skin": "small black nose, pink blush"
 },
 "backdrop": {
  "colour": "#00B140",
  "matte": "green",
  "why": "orange / cream fur, nothing green → green #00B140 + matte green if redrawn; Demo10 sprites were generated as transparent PNGs"
 },
 "voice": {
  "engine": "ElevenLabs",
  "voice_id": "Y1xZ6kdD3JsECPUYssHD",
  "settings": {
   "model": "eleven_v4",
   "language_code": "ja",
   "stability": 0.4,
   "similarity_boost": 0.8,
   "seed": 7
  },
  "tags": "English square-bracket tags + ellipses (handoff §4): ear = [whispers]; gentle = [softly] / [warmly]; [cheerful] [excited] [nervous] [whispers] (pick r1_b); Voice Design must not state a child age — 'youthful, boyish anime-style voice'"
 },
 "personality": "Small shrine guide fox spirit; bright, cheerful, curious, a little timid in the dark but brave; encouraging",
 "speech": {
  "first_person": "ぼく",
  "endings": [
   "〜ね",
   "〜よう",
   "〜だ！"
  ],
  "habits": [
   "short game-hint lines",
   "ゲット！ / そーっと、ふーって",
   "exclamations when finding things"
  ]
 },
 "thermal": "No voice-heat layer documented; Demo10 thermal = sources: hearth / true flame (warm), foxfires (cold), window draught and cave water (cool), dead-end tunnel (warm)",
 "notes": [
  "A real little fox (animal), chibi proportions — not a fox girl",
  "Before ElevenLabs: VOICEVOX 猫使ビィ (user picked from 6 boyish voices)"
 ]
}
```

## Look (prompt wording)

Kohaku, a small cute guide fox spirit — a real little FOX (an animal, not a human, not a fox girl), chibi proportions with a slightly big round head: fluffy bright orange fur, cream-white chest, muzzle and tail tip, a big fluffy tail curling beside the body, pointed ears with pink inner ears, big shiny amber eyes with sparkly highlights, a small black nose, a gentle smile, soft pink blush; a red silk cord around the neck with a small golden bell; gentle warm golden glow on the fur edges.

## Personality and speech

- Cheerful helper, a bit scared of the dark.
- Example: 「こんばんは！ ぼく、きつねのコハク」 (intro1)
- Example: 「そーっと、ふーってして」 (ember2)

## Demos

- Demo10_CaveSpring — 《火をともして、ひみつの泉へ》 interactive puzzle: light the fire, blow out foxfires, find the hidden spring.
