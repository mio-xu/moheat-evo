"""One demo per streamer (user, 2026-11-08): writes the four pages from one template.

  python3 scripts/make_pages.py

Demo14_MintStream = Mint (holds the shared code, art and voices). Demo17/18/19 hold only index.html + media/cover.jpg and use
<base href="../Demo14_MintStream/"> so every relative path (code, art, voices) resolves here. <body data-ch="…"> picks the channel.
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEMOS = os.path.dirname(ROOT)   # demos/for-men (all four pages live there)
PAGES = {   # dir: channel, ja title (2 lines), en title, chips [(class, text)], hint, note, credit, theme colour
    'Demo14_MintStream': ('mint', ('ミントの、', 'ささやき配信'), "Mint's Whisper Stream",
                          [('p', '🎧 ASMR live · Interactive'), ('k', '❄ 耳ふー · ear blowing'), ('h', '♨ タオル · warm towel')],
                          'Headphones on · comment and send a Super Chat from the chat · connect MoHeat Evo to feel her breath, the ice and the towel',
                          "DUAL, two layers: her whisper warms the ear she is at with its loudness (with mint balm on, a cool menthol breath at the same time); her fuu, the glass of ice and the warm towel are the room layer.",
                          'Mint is an original character · voice VOICEVOX:四国めたん · art made with Seedance', '#1a1530'),
    'Demo17_CocoaStream': ('cocoa', ('ココアの、', 'ほっこりカフェ配信'), "Cocoa's Cozy Café Stream",
                           [('p', '☕ café live · Interactive'), ('h', '☕ ココア · warm'), ('k', '💨 ふーふー · cool')],
                           'Headphones on · comment and send a Super Chat from the chat · connect MoHeat Evo to feel the cocoa, her fu-fu and the blanket',
                           "DUAL, two layers: her voice warms the ear she is close to; the hot mug and its steam, the shared blanket, the heater and her hands are warm, her fu-fu is a cool breath.",
                           'Cocoa is an original character · voice VOICEVOX:ユーレイちゃん · art made with Seedance', '#2a1a1c'),
    'Demo18_HinataStream': ('hinata', ('ひなたの、', '激辛チャレンジ配信'), "Hinata's Super-Spicy Challenge",
                            [('p', '🍜 game live · Interactive'), ('h', '🌶 激辛 · spicy'), ('k', '🥛 牛乳・うちわ · cool')],
                            'Headphones on · cheer her on and rescue her with a Super Chat · connect MoHeat Evo to feel the spice, the milk and her paper fan',
                            "DUAL, two layers: her secret warms your right ear with her voice; the steaming bowl beside the mic is mildly warm, the cold milk bottle, the desk fan and her paper fan are cool.",
                            'Hinata is an original character · voice VOICEVOX:春日部つむぎ · art made with Seedance', '#1c1630'),
    'Demo19_LunaStream': ('luna', ('ルナの、', 'よふかし配信'), "Luna's Late-Night Stream",
                          [('p', '🌙 late-night live · Interactive'), ('k', '🌙 夜風 · night wind'), ('h', '🖤 となり · next to you')],
                          'Headphones on · talk with her in the chat and send a request · connect MoHeat Evo to feel the night wind, the tea and her by your side',
                          "DUAL, two layers: her whisper warms the ear she is at; the night wind from the window cools your left ear as it gusts, the hot tea and Luna sitting next to you are warm.",
                          'Luna is an original character · voice VOICEVOX:九州そら · art made with Seedance', '#12142a'),
}
ORDER = list(PAGES)

TEMPLATE = '''<!doctype html>
<html lang="ja">
<head>
{base}  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="{theme}" />
  <meta name="robots" content="noindex" />
  <meta property="og:title" content="{en} · MoHeat Evo ASMR Demo" />
  <meta property="og:image" content="../{dir}/media/cover.jpg" />
  <title>{ja1}{ja2} · {en} · MoHeat Evo ASMR Demo</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+JP:wght@400;500;700&family=Zen+Maru+Gothic:wght@500;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../../shared/game.css?v=1" />
  <link rel="stylesheet" href="style.css?v=2" />
  <link rel="stylesheet" href="../../shared/series.css?v=3" />
  <script>if (/[?&]embed\\b/.test(location.search)) document.documentElement.classList.add('embed');</script>
  <style>/* ?embed=1 — used by the site's demo menu: stage only */
    html.embed .bar, html.embed .side {{ display: none !important; }}
    html.embed body {{ background: #000; overflow: hidden; }}
    html.embed .layout {{ display: block; padding: 0; max-width: none; }}
    html.embed .stage {{ border-radius: 0; border: 0; box-shadow: none; }}
    html.embed .intro .hint {{ display: none; }}
  </style>
</head>
<body data-ch="{ch}">
  <header class="bar">
    <a class="brand" href="../../../">MoHeat <span>Evo</span> <em>ASMR Game · Live stream</em></a>
    <div class="device">
      <select id="portSelect" aria-label="Serial port"></select>
      <button class="btn sm" id="addPort" type="button" title="Authorize a USB or Bluetooth serial port">+ Add</button>
      <button class="btn sm primary" id="connectBtn" type="button" disabled>Connect</button>
      <p class="status" id="deviceStatus"><i></i><span>Not connected</span></p>
    </div>
    <button class="estop" id="estop" type="button" title="Esc">■ STOP</button>
  </header>

  <main class="layout">
    <section class="stage-col">
      <div class="stage" id="stage">
        <canvas id="scene" width="1920" height="1080"></canvas>
        <i class="glow l" id="glowL"></i><i class="glow r" id="glowR"></i>

        <div class="live-head" id="liveHead">
          <span class="live">● LIVE</span><span class="viewers" id="viewers">👁 0</span>
          <b class="ch-name" id="chName"></b><span class="ch-title" id="chTitle"></span>
        </div>
        <div class="hud-top"><button class="hud-btn" id="soundBtn" type="button">🔊</button></div>

        <aside class="chat" id="chat">
          <div class="chat-head"><span>チャット · Live chat</span></div>
          <ol class="chat-list" id="chatList"></ol>
          <div class="chat-input" id="chatInput">
            <p class="chat-hint" id="chatHint"></p>
            <div class="chips" id="chips"></div>
            <div class="chat-row">
              <span class="me">YOU</span><span class="fake-input" id="fakeInput">コメントする… · Say something…</span>
              <button class="gift-btn" id="giftBtn" type="button" title="Super Chat">💝</button>
            </div>
          </div>
        </aside>
        <div class="hearts" id="hearts"></div>
        <div class="act" id="act"></div>
        <div class="subs" id="subs"><p class="line"><span class="ja" id="subJa"></span><span class="en" id="subEn"></span></p></div>
        <p class="vv" id="vv"></p>

        <div class="ended" id="ended">
          <p class="e-title">配信は終了しました · Stream ended</p>
          <p class="e-sub" id="endedSub"></p>
          <div class="e-actions">
            <button class="btn" id="againBtn" type="button">↺ もう一度 · Watch again</button>
            <a class="btn primary" id="nextBtn" href="../{next_dir}/">▶ {next_name}の配信へ · {next_en}</a>
          </div>
        </div>

        <div class="intro" id="intro">
          <div class="cover-copy">
            <p class="kicker">MoHeat Evo · Binaural ASMR × Thermal Haptics</p>
            <h1><span>{ja1}</span><span>{ja2}</span></h1>
            <p class="en">{en}</p>
            <p class="cast">{chips}</p>
            <div class="intro-actions">
              <button class="btn primary big" id="startBtn" type="button">▶ 配信を見る · Watch</button>
              <button class="btn" id="lrBtn" type="button">🎧 Left / Right check</button>
            </div>
            <p class="hint">{hint}</p>
            <p class="draft" id="credits">{credit}</p>
          </div>
        </div>
      </div>
    </section>

    <aside class="side">
      <div class="card"><div class="card-head"><span>Sounds around you</span><b id="posInfo"></b></div><canvas id="radar" width="480" height="420"></canvas></div>
      <div class="card">
        <div class="card-head"><span>Thermal output</span><b id="cmd" class="mono">stop</b></div>
        <div class="meters">
          <div class="meter-row"><span>L cool</span><div class="m cool"><i id="mLc"></i></div><b id="vLc">0</b></div>
          <div class="meter-row"><span>L warm</span><div class="m heat"><i id="mLh"></i></div><b id="vLh">0</b></div>
          <div class="meter-row"><span>R cool</span><div class="m cool"><i id="mRc"></i></div><b id="vRc">0</b></div>
          <div class="meter-row"><span>R warm</span><div class="m heat"><i id="mRh"></i></div><b id="vRh">0</b></div>
        </div>
        <p class="note">{note}</p>
      </div>
      <div class="card"><div class="card-head"><span>Stream</span><b id="clock" class="mono">0:00</b></div><ol class="steps" id="steps"></ol></div>
      <div class="card">
        <label class="row"><span>Intensity</span><input id="intensity" type="range" min="0" max="100" value="100" /><b id="intensityVal">100%</b></label>
        <label class="row check"><input id="sendOn" type="checkbox" checked /> <span>Send to device</span></label>
      </div>
    </aside>
  </main>

  <script src="../../../device.js?v=1"></script>
  <script src="lines.js?v=2"></script>
  <script src="audio.js?v=2"></script>
  <script src="media/art/faces.js?v=1"></script>
  <script src="main.js?v=4"></script>
  <script src="../../shared/nav.js?v=6"></script>
</body>
</html>
'''
NAMES = {'mint': ('ミント', 'Mint'), 'cocoa': ('ココア', 'Cocoa'), 'hinata': ('ひなた', 'Hinata'), 'luna': ('ルナ', 'Luna')}

for i, (d, (ch, (ja1, ja2), en, chips, hint, note, credit, theme)) in enumerate(PAGES.items()):
    nd = ORDER[(i + 1) % len(ORDER)]; nch = PAGES[nd][0]
    html = TEMPLATE.format(base='' if d == 'Demo14_MintStream' else '  <base href="../Demo14_MintStream/">\n', theme=theme, en=en, dir=d, ja1=ja1, ja2=ja2,
                           ch=ch, next_dir=nd, next_name=NAMES[nch][0], next_en=NAMES[nch][1] + "'s stream", hint=hint, note=note, credit=credit,
                           chips=''.join(f'<span class="chip {c}">{t}</span>' for c, t in chips))
    os.makedirs(os.path.join(DEMOS, d), exist_ok=True)
    open(os.path.join(DEMOS, d, 'index.html'), 'w').write(html)
    print('wrote', d)
