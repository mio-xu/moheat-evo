// shared/story_live.js — the LIVE brain of a crossover story (private live/ page only, served by tools/talk/server.py after the password login;
// the public page is the scripted preview with the same choices). From Demo43's live/live.js, as data:
//   MoHeatStoryLive.make({ demo, world, audience, who: { T: '椿', … }, persona: { T: '…' }, place: { hall: '…' }, topics: { hall: '…' },
//                          events: { hall: { flare: '…' } }, own: { flare: 'C' }, positions, positionRule, trio })
// A text-only agent writes "X|position|[tag] せりふ|English", "@|event", "#END"; the server voices each line with the character's confirmed voice.
// story.js uses: begin(ctx?) → bool · turn({ mode, who, place, said, kind }) → [{ who, pos, ja, en, audio }] · ended() · end() · prompt(ctx) (dry runs).
window.MoHeatStoryLive = { make(cfg) {
  const C = window.MoHeatTalk.live({ demo: cfg.demo }), NAME = cfg.who, KEYS = Object.keys(NAME).join('');
  const evs = (c) => Object.fromEntries(Object.entries(cfg.events[c.place] || {}).filter(([k]) => !cfg.own?.[k] || c.cast.includes(cfg.own[k])));
  let ctx = null, cb = null, lines = [], over = false;
  const persona = (ks) => ks.map((w) => `- ${cfg.persona[w]}`).join('\n');
  const rules = `# 出力形式（厳守。これ以外の文字は一切出力しない）
1行に1つのせりふ： 記号|位置|[英語の感情タグ] 日本語のせりふ|English translation
- 記号：${Object.entries(NAME).map(([k, v]) => `${k} = ${v}`).join('、')}。指示された人物だけが話す。
- 位置：${cfg.positions || 'front（正面1m）/ near（目の前50cm）/ left / right（隣50cm）/ left_ear / right_ear（耳元、必ず [whispers]）'}。${cfg.positionRule || ''}
- 感情タグ：[softly] [whispers] [laughs] [excited] [playful] [curious] [embarrassed] [sighs] [surprised] [cheerful] など。
- 会話を締めくくるよう指示されたら、別れのせりふの後に最後の行として #END

# ルール
- 1ターンは1〜3行。1行は日本語40字以内、話し言葉で短く。${cfg.audience}の言葉の中身に具体的に反応する。
- 世界観を壊さない：AI・台本・現代の固有名詞には触れない。酒は出さない。
- 下品・残酷な話題は人物らしく軽くかわして場の話題に戻す。`;
  const storyPrompt = () => `# 役割\nあなたは音声ドラマのリアルタイム脚本家兼役者。${cfg.world} ${cfg.audience}の声は音声認識でテキスト化されて届く（誤認識もあるので意味を汲む。中国語や英語で話されても理解し、返事は日本語）。\n\n# 登場人物\n${persona(Object.keys(NAME))}\n\n${rules}`;
  const talkPrompt = ({ place, cast }) => {
    const ks = cast.split(''), ev = evs({ place, cast });
    return `# 役割\nあなたは音声ドラマのリアルタイム脚本家兼役者。${cfg.world} 物語はもう終わっている（「もっと話す」）。${cfg.audience}の声は音声認識でテキスト化されて届く（意味を汲む。中国語や英語で話されても返事は日本語）。\n\n# 場面\n${cfg.place[place]}\n話題はこの場所で見える・聞こえる・感じるもの（${cfg.topics[place]}）と、その人物の役目に結びつける。\n\n# 登場人物（この場にいるのは${ks.map((w) => NAME[w]).join('・')}だけ）\n${persona(ks)}\n${ks.length > 1 ? `- ${cfg.trio || '三人の会話。互いにも話しかけ、掛け合いで場を盛り上げる。'}` : ''}\n\n# この場所で起こせること（体に感じる温冷。必要なときだけ、1ターンに最大1つ、そのせりふの前の行に単独で書く）\n${Object.entries(ev).map(([k, v]) => `@|${k}  … ${v}`).join('\n') || '（なし）'}\n\n${rules}`;
  };
  const prompt = () => (ctx ? talkPrompt(ctx) : storyPrompt());
  function parse(raw) {
    if (/#END/.test(raw)) { over = true; raw = raw.replace('#END', '').trim(); if (!raw) return; }
    const m = /^@\|\s*([a-z_]+)/.exec(raw); if (m) { if (ctx && evs(ctx)[m[1]]) lines.push({ ev: m[1] }); return; }
    const p = raw.split('|').map((x) => x.trim()); if (p.length < 4 || !p[2] || !p[3] || !KEYS.includes(p[0]) || p[0].length !== 1) return;   // a cut-off fragment is dropped
    const it = { who: p[0], pos: p[1], ja: p[2].replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim(), en: p[3] };
    it.audio = C.tts(p[0], p[2]).then((r) => (r && !r.blocked ? window.MoHeatStory.audio.decode(r).catch(() => null) : null));
    lines.push(it);
  }
  return {
    ended: () => over, prompt: (c) => { ctx = c || null; return prompt(); },
    async begin(c) {
      over = false; ctx = c || null;
      try { await C.begin(); } catch (e) {
        const el = document.getElementById('cleared'); el.hidden = false;
        el.textContent = e?.blocked ? `${e.blocked[0]} · ${e.blocked[1]}` : '非公開ページ：tools/talk/server.py で開いてください · Private page: open it through the live server';
        return false;
      }
      await new Promise((res) => C.open(prompt(), { onReady: res, onLine: parse, onDone: () => cb?.(), onClose: () => { over = true; cb?.(); } }));
      return true;
    },
    turn({ mode, who, place, said, kind }) {
      const names = who.split('').map((w) => NAME[w]).join('と'), where = cfg.place[place] || '', A = cfg.audience;
      const msg = mode === 'window'
        ? `[SYSTEM] 物語の途中の短い自由会話（場所：${where}）。話すのは${names}だけ。${kind === 'silent' ? `${A}は黙っている。軽く促すか、ひとこと添える。` : ''}1〜2行で応え、話が物語に戻れるように軽く締める（問いかけで終えない）。${said ? `\n${A}：${said}` : ''}`
        : kind === 'open' ? `[SYSTEM] 物語のあと、「もっと話す」。場所：${where}。相手：${names}。あなたから話しかけて会話を始める。`
          : kind === 'close' ? `${said ? `${A}：${said}\n` : ''}[SYSTEM] そろそろ時間。別れのせりふで締めくくり（1〜3行）、最後の行に #END。`
            : kind === 'silent' ? `[SYSTEM] ${A}はしばらく黙っている。軽く促すか、話題を少し変えて話しかける（短く）。` : `${A}：${said}`;
      lines = [];
      return new Promise((res) => { const t = setTimeout(() => { cb = null; res(lines); }, 25000); cb = () => { clearTimeout(t); cb = null; res(lines); }; C.send(msg); });
    },
    end() { C.end(); },
  };
} };
