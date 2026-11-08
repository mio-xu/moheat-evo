# ハルフユ車掌 · Conductor Halfy (halfy)

The Season Spirit Conductor of the magic Seasons Express: a tiny chibi spirit, half snow / half sun, who announces every stop. Friendly, playful, a sing-song train-announcer voice; brave in the power cut.

```json
{
 "id": "halfy",
 "name_ja": "ハルフユ車掌",
 "name_en": "Conductor Halfy (season spirit)",
 "category": "all-ages",
 "series_style": "全年齢（Demo1–4、10）: 可爱日系 2D，粉彩赛璐璐，Q 版偶像 / 妖精 · 2–3 头身，大眼 · 明亮饱和的粉、蓝、橙；不能用浮世绘金箔风",
 "demos": [
  "demos/all-ages/Demo04_SeasonsExpress"
 ],
 "refs": {
  "lock_face": "demos/all-ages/Demo04_SeasonsExpress/assets/art/cond_opt_a.png",
  "others": [
   "demos/all-ages/Demo04_SeasonsExpress/assets/art/cond_holo.png",
   "demos/all-ages/Demo04_SeasonsExpress/assets/art/cond_wave.png",
   "demos/all-ages/Demo04_SeasonsExpress/assets/art/cond_ear.png"
  ]
 },
 "colours": {
  "hair": "split down the middle: light ice-blue half (snowflake clip) on the viewer's left, sunny orange half (sun clip) on the viewer's right",
  "eyes": "big sparkling; viewer's-left eye ice-blue, viewer's-right eye amber-orange",
  "outfit": "conductor cap half white / half orange with a golden locomotive badge; coat half white with blue trim and a snowflake button, half orange with a sun button; scarf half white / half orange; white gloves; silver whistle; brown boots",
  "skin": "fair, pink blush"
 },
 "backdrop": {
  "colour": "#00B140",
  "matte": "green",
  "why": "white / orange / light-blue figure, nothing green"
 },
 "looks": [
  {"id": "default", "what": "the outfit above, all film long"}
 ],
 "voice": {
  "engine": "ElevenLabs",
  "voice_id": "vjNv4mFdGd9ZFsf2MEK6",
  "pick": "r1_a (of 3 auditions, picked by the Demo04 agent 2026-11-09: highest, widest pitch range and the biggest whisper ↔ excited contrast; the user may override — auditions in demos/all-ages/Demo04_SeasonsExpress/project/voice_audition/)",
  "settings": {"model": "eleven_v4", "language_code": "en / ja / zh (the announcer speaks the subtitle language)", "stability": 0.4, "similarity_boost": 0.8, "seed": 7},
  "tags": "[cheerful] announcements, [playful], [excited], [surprised], [warmly]; at the ear [whispers]"
 },
 "personality": "Cheerful, playful season spirit and train announcer; proud of its train; brave and gentle in the power cut",
 "speech": {
  "first_person": "ぼく",
  "endings": ["つぎは〜、…！", "〜ね", "〜よ〜！"],
  "habits": ["sing-song station calls (つぎは〜)", "short, bouncy lines"]
 },
 "thermal": "Hologram announcements = light only, no warmth. In person its voice is warm like any voice (0.1 + 0.8 × loudness; ×1 at the ear, ×0.28 × 0.5 from the aisle in front).",
 "notes": ["Chibi spirit, 2.5 heads tall, gender-neutral", "Design option A of two (B = a round fluffy sprite in a navy jacket, kept in project/ for the user)"]
}
```

## Look (prompt wording)

A tiny chibi season-spirit train conductor, 2.5 heads tall, gender-neutral, big sparkling eyes (viewer's-left eye ice-blue, viewer's-right eye amber-orange), hair split down the middle (light ice-blue with a snowflake clip / sunny orange with a sun clip), a conductor's peaked cap half white / half orange with a golden locomotive badge, a coat split down the middle (snow-white with blue trim and a snowflake button / sunny orange with a sun button), a scarf half white / half orange, white gloves, a silver whistle on a cord, brown boots.

## Demos

- Demo04_SeasonsExpress — 《季節が、暴走する。The Runaway Seasons Express》: announces every season from the hologram screen, whispers at your ear in the power cut, waves goodbye in the aisle at Cherry Blossom Station.
