# 宵月ルナ · Yoizuki Runa (luna)

Cool, mature, quiet late-night type; few words, quietly teasing and tender; a secret bartender after hours.

```json
{
 "id": "luna",
 "name_ja": "宵月ルナ",
 "name_en": "Luna",
 "category": "for-men",
 "series_style": "男性向 · 直播（Demo14、17–19）: 柔和赛璐璐，手绘感，平涂 + 一层柔边阴影，深薰衣草色线；不要光泽、不要 bloom · 7 头身成年女性 · 每位一个主色",
 "demos": [
  "demos/for-men/Demo19_LunaStream"
 ],
 "refs": {
  "lock_face": "demos/for-men/Demo19_LunaStream/assets/art/luna_counter.png",
  "others": [
   "demos/for-men/Demo19_LunaStream/assets/art/ref_luna.png",
   "demos/for-men/Demo19_LunaStream/assets/art/ref_luna_close.png",
   "demos/for-men/Demo19_LunaStream/media/art/char_counter.webp"
  ]
 },
 "colours": {
  "hair": "long straight black with deep-blue inner streaks",
  "eyes": "dark sapphire blue, long lashes",
  "outfit": "white shirt (sleeves rolled, top button open), fitted black waistcoat, thin black choker, silver crescent-moon earring",
  "skin": "fair"
 },
 "backdrop": {
  "colour": "#00B140",
  "matte": "green",
  "why": "black hair but a white shirt: chroma green #00B140 + matte green (Demo19); run clean_cutout.py with --bg 8,158,65 (white-shirt black-dot lesson)"
 },
 "voice": {
  "engine": "ElevenLabs",
  "voice_id": "1blqWrqFcJagS9nJcCXc",
  "settings": {
   "model": "eleven_v4",
   "language_code": "ja",
   "stability": 0.4,
   "similarity_boost": 0.8,
   "seed": 7
  },
  "tags": "English square-bracket tags + ellipses (handoff §4): ear = [whispers]; gentle = [softly] / [warmly]; Demo19: mostly [softly] [whispers] [playful] [laughs softly] (pick r1_b)"
 },
 "personality": "Cool, mature, quiet late-night type; few words, quietly teasing and tender; a secret bartender after hours",
 "speech": {
  "first_person": "わたし",
  "endings": [
   "〜ね",
   "〜の",
   "…ないしょね"
  ],
  "habits": [
   "leading ellipses …, short sentences",
   "soft ふふ",
   "calls the player あなた, ずるい人"
  ]
 },
 "thermal": "Voice warm at the ear she speaks at; ambient Demo19: rainy draft from the door on the left (cool), iced shaker on your right cheek (cool, DUAL with her voice), blue flame in front (warm)",
 "notes": [
  "Main colour: deep blue-black (guide §5.1)",
  "Age 25 (prompts); cast: mid twenties",
  "Demo19 now = secret-cocktail story (built as Demo39_LunaBartender)"
 ]
}
```

## Look (prompt wording)

Luna, 25: long straight black hair falling past her shoulders with deep-blue inner streaks, dark sapphire-blue eyes with long lashes, a cool mature face with a faint teasing smile, a thin black choker, a small silver crescent-moon earring. Bartender outfit: crisp white shirt, sleeves rolled to the elbows, top button open, a fitted black waistcoat, no tie, no jacket.

## Personality and speech

- Calm, low, unhurried; teases with very few words.
- Example: 「…ラストオーダー、もう過ぎてるけど。 …あなたは、特別。」 (l01)
- Example: 「…きれいでしょ。 …すぐ消えちゃうから、きれいなの。」 (l10)

## Demos

- Demo19_LunaStream — 《ルナの、ひみつのカクテル》 hidden basement bar after last orders: iced shaker, word-cocktail, blue flame.
