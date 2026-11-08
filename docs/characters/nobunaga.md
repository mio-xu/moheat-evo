# 織田信長 · Oda Nobunaga (nobunaga)

Charismatic, proud, bold and theatrical warlord; big hearty laughs, also low conspiratorial murmurs; curious about the 'future guest'.

```json
{
 "id": "nobunaga",
 "name_ja": "織田信長",
 "name_en": "Nobunaga",
 "category": "nobunaga-suntory",
 "series_style": "信長シリーズ（Demo5–9）: 浮世绘风动漫插画 + 金箔装饰，线条精细，电影感光线 · 坐姿立绘（共用 Demo9 的人物图）· 矿物色：朱红、靛蓝、深绿、金",
 "demos": [
  "demos/nobunaga-suntory/Demo05_GifuCastle",
  "demos/nobunaga-suntory/Demo06_FutureWhisky",
  "demos/nobunaga-suntory/Demo07_KyotoIzakaya",
  "demos/nobunaga-suntory/Demo08_YamazakiDistillery",
  "demos/nobunaga-suntory/Demo09_SengokuBanquet",
  "demos/nobunaga-suntory/Demo23_NobunagaTalk",
  "demos/nobunaga-suntory/Demo42_SengokuRoundtable",
  "demos/nobunaga-suntory/_kit"
 ],
 "refs": {
  "lock_face": "demos/nobunaga-suntory/Demo09_SengokuBanquet/assets/characters/N_bust_base.png",
  "others": [
   "demos/nobunaga-suntory/Demo09_SengokuBanquet/assets/characters/N_Character.png",
   "demos/nobunaga-suntory/_kit/art/N_bust_base.webp",
   "demos/nobunaga-suntory/_kit/art/faces.json"
  ]
 },
 "colours": {
  "hair": "long black, tied high at the back, a few strands over the forehead",
  "eyes": "deep red, sharp",
  "outfit": "black and deep-red kimono with gold lines, red-outside / black-inside nanban cape with high collar, tachi; gold Oda mokkō crest",
  "skin": "unknown"
 },
 "backdrop": {
  "colour": "#c8c8c8",
  "matte": null,
  "why": "black hair and black / crimson clothes → light grey #c8c8c8 if new layered art is made; current art = ChatGPT transparent cut-outs (prepare_art.py), no stage.json"
 },
 "voice": {
  "engine": "ElevenLabs",
  "voice_id": "GunRCVU2DD99MoNH24tx",
  "settings": {
   "model": "eleven_v4",
   "language_code": "ja",
   "stability": 0.4,
   "similarity_boost": 0.8,
   "seed": 7
  },
  "tags": "English square-bracket tags + ellipses (handoff §4): ear = [whispers]; gentle = [softly] / [warmly]; [laughs] [proud] [excited] [playful] [curious] [whispers]; one [tag] per talk line; Voice Design must describe him as a fictional samurai lord (real names blocked)"
 },
 "personality": "Charismatic, proud, bold and theatrical warlord; big hearty laughs, also low conspiratorial murmurs; curious about the 'future guest'",
 "speech": {
  "first_person": "わし",
  "endings": [
   "〜じゃ",
   "〜のじゃ",
   "〜よ",
   "〜い (口を開けい)"
  ],
  "habits": [
   "calls the guest そなた / 未来の客人",
   "はっはっは",
   "ほれ",
   "old-fashioned Japanese"
  ]
 },
 "thermal": "Voice warm at the ear he speaks at, loudness-driven: big laugh > talk > whisper (whisper mix −25.5 dB keeps that order); fan wind / props as ambient",
 "notes": [
  "Must sound low (user said earlier takes were not low enough)",
  "Art shared via nobunaga-suntory/_kit/art (busts, poses, ears, faces.json face ellipses)",
  "Main colours: black, deep red, gold"
 ]
}
```

## Look (prompt wording)

Oda Nobunaga, an original anime-style Sengoku daimyo in fine ukiyo-e-inspired anime illustration with gold-leaf ornament, realistic adult proportions: a mature man with sharp eyes and a bold, slightly mischievous grin; long black hair tied high at the back with a few strands over the forehead, deep red eyes; a black and deep-red kimono with gold lines, a red-outside / black-inside nanban cape with a high collar, a tachi at the waist; gold Oda mokkō crest. Colours: black, deep red, gold.

## Personality and speech

- Proud and theatrical, generous host, loves showing off.
- Example: 「[laughs] はっはっは！この風がよいのじゃ。そなた、高いところは平気か？」 (talk)
- Example: 「[whispers] …ここから天下を取る。そういう名よ。」 (talk)

## Demos

- Demo05_GifuCastle — 《信長の岐阜城へようこそ》
- Demo06_FutureWhisky
- Demo07_KyotoIzakaya — 《信長と家康、京都の居酒屋へ》
- Demo08_YamazakiDistillery — 《信長と家康、山崎蒸溜所へ》
- Demo09_SengokuBanquet — 《安土最後の酒宴》 (source of the character art)
- Demo23_NobunagaTalk — 《信長と、語らう》 scripted public + private live AI talk
- Demo42_SengokuRoundtable — 《信長と家康の、座談会》
