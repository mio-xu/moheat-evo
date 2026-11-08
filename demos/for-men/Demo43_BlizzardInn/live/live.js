// The LIVE brain of 白嶺の峠、ひと晩の宿 (private page live/index.html, only through tools/talk/server.py after the password login —
// user 2026-11-08: the paid live talk stays private, the public page is the scripted preview with the same choices).
// A text-only ElevenLabs agent (Claude) writes the lines ("M|position|[tag] せりふ|English"), the server voices them with each
// character's confirmed ElevenLabs voice (tools/talk/demos.json "inn": M mint, H hinata_s, N nagisa) within limits.json.
// もっと話す = place × cast (user 2026-11-08): begin({ place, cast }) puts that place (what is warm / cool there, its events) and only
// those people into the prompt; the agent may trigger the place's events with a line "@|<event>" (main.js EVENTS: real warm / cool things).
// main.js uses: begin(ctx?) → bool · turn({ mode: 'window' | 'talk', who, place, said, kind: 'open' | 'user' | 'silent' | 'close' }) →
// [{ who, pos, ja, en, audio: Promise<AudioBuffer|null> }] · ended() · end(). Connection: demos/shared/talk.js MoHeatTalk.live.
window.INN_LIVE = (() => {
  const C = window.MoHeatTalk.live({ demo: 'inn' });
  const NAME = { M: 'ミント', H: 'ひなた', N: '渚' };
  const PERSONA = {
    M: 'ミント：旅の女医。二十代前半。薄荷色から白へ変わる長い髪を簪でまとめ、ねむそうな水色の目。いつも眠たげで、ゆっくり小声で話す（「…ん」「…ふぁ」）。耳の手当てと、眠らせるのが得意。一人称「わたし」、客人は「あなた」。語尾はやわらかく「〜ね…」「〜だよ…」。',
    H: 'ひなた：山の宿「雪見亭」の看板娘で火鍋の料理番、サイコロ賭けの胴元。二十歳前後。橙色の髪をふたつのお団子に赤いリボン、金色の目、八重歯。元気で負けず嫌い、大声で笑う（[laughs] あっはは！）、すぐ勝負を持ちかけ、負けると「今のなし！」。一人称「あたし」、客人は「あんた」。',
    N: '渚：峠で荷を守る女用心棒。二十歳。栗色の短い髪に橙の鉢巻と髪紐、琥珀色の目、毛皮の襟の外套と長い棒。ぶっきらぼうで口が悪く照れ屋、すぐ「バカ」と言うが面倒見がいい。一人称「あたし」、客人は「あんた」。',
  };
  const PLACE = {
    pass: '白嶺の峠。吹雪。突風が左から右へ吹き抜ける。客人は渚の毛皮の羽織を着ている。足元は深い雪、峠の旗が鳴っている。',
    hall: '雪見亭の広間。目の前で火鍋がぐつぐつ（生姜・なつめ・くこの実）、右に炭の火鉢、左の格子窓の外は雪。サイコロの壺。',
    room: '宿の奥の小部屋（ミントの診療部屋）。左に行灯、右に四十八の引き出しの薬箪笥、お灸（もぐさ）と薄荷の軟膏の道具、布団。',
    door: '夜の宿の入口。左の戸の外は吹雪で、すきまから冷たい風が入る。右に火鉢。渚が夜番をしている。',
    dawn: '夜明けの峠。朝日が尾根から昇る。雪がきらきら光り、峠の門の向こうが客人の帰り道。',
    dice: '雪見亭の広間（サイコロ勝負の最中）。', hear: '雪見亭の広間。', mear: '宿の奥の小部屋（耳の手当ての最中）。', trio: '夜明けの峠。朝日、雪、峠の門。',
  };
  // what may happen there ("@|key" on its own line, before the line it belongs to; at most one per turn): physically real warm / cool things
  const EVENTS = {
    pass: { guard: '渚が客人の左に立って風をさえぎる（左の冷たい風が弱まり、肩が温かい）', hands: 'ミントが両手で客人の右耳をつつむ（右耳が温かい）', stone: 'ひなたが温石を客人の右頬に当てる（右が温かい）' },
    hall: { bowl: '湯気の立つお椀を客人の顔の前に差し出す（正面が温かい）', stoke: '火鉢に炭を足す（右が温かくなる）' },
    room: { moxa: 'ミントがお灸を客人の右耳のまわりで回す（右耳が動く温かさ）', balm: 'ミントが薄荷の軟膏を右耳に塗る（右耳がひんやり）' },
    door: { gust: '戸が風でがたっと開く（左から冷たい突風）', shut: 'ひなたが戸につっかい棒をする（左の冷たい風が止む）', coat: 'ミントが自分の羽織を客人にかける（左の冷たさがやわらぐ）' },
    dawn: { sun: '朝日が尾根から顔を出す（正面が温かい）' },
  };
  const OWN = { guard: 'N', hands: 'M', stone: 'H', moxa: 'M', balm: 'M', shut: 'H', coat: 'M' };   // an event someone does: only when she is there
  const evs = (c) => Object.fromEntries(Object.entries(EVENTS[c.place] || {}).filter(([k]) => !OWN[k] || c.cast.includes(OWN[k])));
  let ctx = null;
  const prompt = () => (ctx ? talkPrompt(ctx) : storyPrompt());
  const storyPrompt = () => `# 役割
あなたは音声ドラマのリアルタイム脚本家兼役者。架空の東の国「霧蓮国」の北、雪山の峠「白嶺の峠」と山の宿「雪見亭」で、三人の女性を演じ、現代から迷い込んだ「客人」（ユーザー、男性）と生の会話をする。客人の声は音声認識でテキスト化されて届く（誤認識もあるので意味を汲む。中国語や英語で話されても理解し、返事は日本語）。この国では皆なぜか日本語が通じる。

# 登場人物
${Object.values(PERSONA).map((p) => `- ${p}`).join('\n')}

# 出力形式（厳守。これ以外の文字は一切出力しない）
1行に1つのせりふ： 記号|位置|[英語の感情タグ] 日本語のせりふ|English translation
- 記号：M = ミント、H = ひなた、N = 渚。指示された人物だけが話す。
- 位置：front（正面1m）/ near（目の前50cm）/ left / right（隣50cm）/ left_ear / right_ear（耳元、必ず [whispers]）。ミントとひなたは右耳、渚は左側・左耳を使う。
- 感情タグ：[softly] [sleepy] [whispers] [laughs] [excited] [playful] [curious] [gruff] [embarrassed] [sighs] [surprised] [cheerful] など。
- 会話を締めくくるよう指示されたら、別れのせりふの後に最後の行として #END

# ルール
- 1ターンは1〜3行。1行は日本語40字以内、話し言葉で短く。客人の言葉の中身に具体的に反応する。
- 話題は必ずその場所とその人物の役目に結びつける（火鍋、サイコロ、お灸、薄荷、吹雪、峠、見張り、未来から来た客人への好奇心）。
- 世界観を壊さない：AI・台本・現代の固有名詞には触れない。酒は出さない（温かい茶、汁、湯のみ）。
- 下品・残酷な話題は人物らしく軽くかわして場の話題に戻す。`;
  // もっと話す: one place, only the people picked (Demo23 place × cast)
  const talkPrompt = ({ place, cast }) => {
    const who = cast.split(''), ev = evs({ place, cast });
    return storyPrompt().replace(/# 登場人物[\s\S]*?# 出力形式/, `# 場面（物語のあとの「もっと話す」）
${PLACE[place]}
物語はもう終わっていて、客人は一晩を雪見亭で過ごした。話題はこの場所で見える・聞こえる・感じるもの（${place === 'pass' ? '吹雪、風、雪、峠、渚が客人を拾った場所' : place === 'hall' ? '火鍋、湯気、火鉢、サイコロ、宿の看板' : place === 'room' ? 'お灸、薄荷、薬草、薬箱、耳の手当て、眠り' : place === 'door' ? '夜番、戸口、すきま風、夜の雪の静けさ、火鉢' : '朝日、雪の輝き、峠の門、帰り道、別れ'}）と、その人物の役目に結びつける。

# 登場人物（この場にいるのは${who.map((w) => NAME[w]).join('・')}だけ。ほかの人物は話さない）
${who.map((w) => `- ${PERSONA[w]}`).join('\n')}
${who.length > 1 ? '- 三人の会話。三人は客人にも互いにも話しかけ、掛け合い・軽い言い合い・相槌で場を盛り上げる。毎ターン全員が話す必要はない。三人でいるとき、位置は渚が左（left）、ミントが正面（front）、ひなたが右（right）。耳元に行くときだけ left_ear / right_ear。' : ''}

# この場所で起こせること（体に感じる温冷。必要なときだけ、1ターンに最大1つ、そのせりふの前の行に単独で書く）
${Object.entries(ev).map(([k, v]) => `@|${k}  … ${v}`).join('\n') || '（なし）'}

# 出力形式`);
  };
  let ready = null, cb = null, lines = [], over = false;
  function parse(raw) {
    if (/#END/.test(raw)) { over = true; raw = raw.replace('#END', '').trim(); if (!raw) return; }
    { const m = /^@\|\s*([a-z]+)/.exec(raw); if (m) { if (ctx && evs(ctx)[m[1]]) lines.push({ ev: m[1] }); return; } }   // a place event
    const p = raw.split('|').map((x) => x.trim()); if (p.length < 4 || !p[2] || !p[3]) return;   // a cut-off fragment (no English half) is dropped
    const who = 'MHN'.includes(p[0]) ? p[0] : null; if (!who) return;
    const ja = p[2] || '', en = p[3] || '';
    const it = { who, pos: p[1], ja: ja.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim(), en };
    it.audio = C.tts(who, ja).then((r) => (r && !r.blocked ? window.INNAudio.decode(r).catch(() => null) : null));
    lines.push(it);
  }
  return {
    ended: () => over,
    prompt: (c) => { ctx = c || null; return prompt(); },   // tests: node scripts/live_prompt.mjs (dry run, no request)
    async begin(c) {
      over = false; ctx = c || null;
      try { await C.begin(); } catch (e) {
        const c = document.getElementById('cleared'); c.hidden = false;
        c.textContent = e?.blocked ? `${e.blocked[0]} · ${e.blocked[1]}` : '🔒 非公開ページ：tools/talk/server.py で開いてください · Private page — open it through the live server';
        return false;
      }
      ready = new Promise((res) => C.open(prompt(), { onReady: res, onLine: parse, onDone: () => cb?.(), onClose: () => { over = true; cb?.(); } }));
      await ready; return true;
    },
    turn({ mode, who, place, said, kind }) {
      const names = who.split('').map((w) => NAME[w]).join('と');
      const where = PLACE[place] || '';   // story windows: the view; もっと話す: the place picked
      const msg = mode === 'window'
        ? `[SYSTEM] 物語の途中の短い自由会話（場所：${where}）。話すのは${names}だけ。${kind === 'silent' ? '客人は黙っている。軽く促すか、ひとこと添える。' : ''}1〜2行で応え、話が物語に戻れるように軽く締める（問いかけで終えない）。${said ? `\n客人：${said}` : ''}`
        : kind === 'open' ? `[SYSTEM] 物語のあと、「もっと話す」。場所：${where}。相手：${names}。あなたから話しかけて会話を始める（出迎えのひとことから）。`
          : kind === 'close' ? `${said ? `客人：${said}\n` : ''}[SYSTEM] そろそろ時間。別れのせりふで締めくくり（1〜3行、耳元のひとことでもよい）、最後の行に #END。`
            : kind === 'silent' ? '[SYSTEM] 客人はしばらく黙っている。軽く促すか、話題を少し変えて話しかける（短く）。' : `客人：${said}`;
      lines = [];
      return new Promise((res) => { const t = setTimeout(() => { cb = null; res(lines); }, 25000); cb = () => { clearTimeout(t); cb = null; res(lines); }; C.send(msg); });
    },
    end() { C.end(); },
  };
})();
