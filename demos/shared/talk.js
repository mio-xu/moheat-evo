// shared/talk.js — MoHeatTalk: the reusable "talk with the characters" engine (extracted from Demo23 信長と、語らう, 2026-11-08, for
// the crossover demos: docs/proposals/2026-11-08_crossover.md §0.3). A page keeps its own pictures / story; this file gives it:
//   · topic(said, topics, {yn}) → the topic key of what you said (topics = [[key, regex source], …] in order; yes / no only after a
//     yes-no question: yn: true, keys listed in yn_only)                                                   — the scripted "brain"
//   · bridges(pools) → { pick(who, key) → line id }: a bridge line for that topic not used yet in this play (else generic)
//   · listen({ host, prompt, silenceSec, quietMs }) → Promise<string|null>: ONE turn of yours — speech recognition in the display
//     language (shared/subs.js: EN / 日本語 / 中文) or typing; ends ~1.2 s after you stop talking, after `silenceSec` of nothing
//     (→ null) or on "▶ 続ける · Continue". Draws its own small panel (.mh-turn) inside `host`. ?auto → null after 1 s (?say=… → that text).
//   · live({ demo }) → the LIVE brain client for the private server (tools/talk/server.py): begin() → session (password cookie),
//     open(prompt, { onLine, onDone, onReady, onClose }) a text-only ElevenLabs agent (Claude) over a WebSocket; send(text);
//     tts(who, text) → ArrayBuffer | { blocked } (ElevenLabs TTS with the character's confirmed voice, counted against limits.json);
//     status(); end(). Lines arrive one per callback as the agent writes them ("X|position|[tag] せりふ|English", "@|event", "#END").
// Public pages use the scripted brain (pre-rendered voices, 0 cost); only the private live pages call live() (user 2026-11-08).
(() => {
  if (window.MoHeatTalk) return;
  const QS = new URLSearchParams(location.search);
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const ZH = { 'あなたの番 — 声で話すか、入力してください': '轮到你了 — 用声音说，或者打字', '話しかけてください': '跟她们说点什么吧', 'ここに入力して Enter': '在这里输入，按 Enter', '▶ 続ける': '▶ 继续', 'マイクが使えません — 入力してください': '麦克风不可用 — 请打字' };
  const KO = { 'あなたの番 — 声で話すか、入力してください': '당신 차례 — 목소리로 말하거나 입력해 주세요', '話しかけてください': '말을 걸어 보세요', 'ここに入力して Enter': '여기에 입력하고 Enter', '▶ 続ける': '▶ 계속', 'マイクが使えません — 入力してください': '마이크를 쓸 수 없어요 — 입력해 주세요' };
  const T = (ja, en) => (window.MoHeatSub ? window.MoHeatSub.pick({ ja, en, zh: ZH[ja] || window.MoHeatSub.tr(ja, 'zh', false) || undefined, ko: KO[ja] || window.MoHeatSub.tr(ja, 'ko', false) || undefined }) : en) || en;

  // ---------------------------------------------------------------- scripted brain helpers
  const rx = new Map();
  // 한국어 (2026-11-11): Korean words for the topic keys the demos use (ja / en / zh live in each demo's data); a demo can add its own
  // in l10n.js "topics": { ko: { <key>: 'regex' } }. Single syllables that sit inside other words (해 / 달 / 별 / 눈 / 문 / 차) are written with a particle.
  const KO_TOPICS = {
    leave: '돌아가|집에 가|집에 갈|가야 해|갈래', thanks: '고마|감사|땡큐', name: '이름|누구야|누구세요|누구예요',
    future: '미래|스마트폰|핸드폰|휴대폰|인터넷|컴퓨터|자동차|전철|기차|비행기|게임기|유행',
    game: '게임|내기|주사위|승부|놀자|놀이', magic: '마법|마녀|빗자루|소환|연금|주문|지팡이',
    food: '밥|먹|맛있|배고|음식|코코아|달콤|단 거|과자|케이크|초콜릿|홍차|녹차|차 마|쿠키|수프|국물|전골|만두|스콘|과일|열매',
    sleep: '졸려|졸리|잠|자고 싶|피곤|꿈', cold: '추워|춥|차가|얼음|바람|눈이|눈보라|따뜻|더워|뜨거|시원',
    praise: '귀여|예뻐|예쁘|아름다|멋있|멋지|잘생|대단|좋아해|사랑|최고',
    no: '^(아니|아뇨|노)|아니야|아니요|없어|싫어|안 보여|못 봤', yes: '^(네|예|응|그래|맞아|좋아)|물론|진짜|정말|있어|보여',
    wind: '바람|눈보라|하늘|높아|높이|빨라|빠르|빗자루|망토|모피', pot: '김이|화로|숯|불이|불 |냄비', cure: '뜸|박하|연고|약|귀',
    door: '문을|문이|문 |보초|망보|밤', sun: '해가|해님|햇|아침|일출|태양|눈부|문을|문이',
    circle: '마법진|빛|화로|돌', lab: '화덕|가마|냄비|불이|불 |얼음 창고|김이|연금', tower: '벽난로|창문|별이|별빛|별을|달이|달빛|얼음|차 ',
    dawn: '해가|해님|햇|아침|일출|태양|눈부|빛|마법진|책|문을|고리', pond: '연못|얼음|연꽃|달이|달빛',
    room: '불이|불 |숯|화로|창문|병풍|용이|용 ', stars: '별이|별빛|별을|별자리|별똥|바람|향|토끼|하늘',
    hall: '회랑|기둥|횃불|불빛|그림자|자객', study: '책|서재|벽난로|창문|계약', valley: '용이|용 |용의|드래곤|날개|바람|봉화|불이', lake: '호수|얼음|노래|별이|별빛|오로라',
  };
  const koOf = (k) => [KO_TOPICS[k], window.MOHEAT_L10N?.topics?.ko?.[k]].filter(Boolean).join('|');
  function topic(said, topics, opt = {}) {
    if (said && window.MoHeatSub?.lang === 'ko') topics = topics.map(([k, re]) => { const x = koOf(k); return [k, x ? `${re}|${x}` : re]; });
    if (!said) return 'silence';
    const yn = opt.yn_only || ['yes', 'no'];
    const order = opt.yn ? [...topics.filter(([k]) => yn.includes(k)), ...topics.filter(([k]) => !yn.includes(k))] : topics.filter(([k]) => !yn.includes(k));
    for (const [k, re] of order) {
      if (!rx.has(re)) rx.set(re, new RegExp(re, 'iu'));
      if (rx.get(re).test(said)) return k;
    }
    return 'generic';
  }
  function bridges(pools) {
    const used = new Set();
    const list = (who, k) => [].concat((pools[who] || {})[k] || []);
    return {
      reset: () => used.clear(),
      pick(who, key) {
        for (const k of [key, key === 'silence' ? 'generic' : null, 'generic']) {
          const free = k ? list(who, k).filter((id) => !used.has(id)) : [];
          if (free.length) { const id = free[Math.floor(Math.random() * free.length)]; used.add(id); return id; }
        }
        const g = list(who, 'generic'); return g[Math.floor(Math.random() * g.length)] || null;
      },
    };
  }

  // ---------------------------------------------------------------- one turn of yours: voice (display language) or typing
  let css = false;
  function style() {
    if (css) return; css = true;
    const s = document.createElement('style');
    s.textContent = `.mh-turn{position:absolute;left:50%;bottom:11cqw;transform:translateX(-50%);z-index:5;width:min(62cqw,720px);display:grid;gap:.6cqw;
      padding:1cqw 1.4cqw;border-radius:1.4cqw;background:rgba(14,16,30,.82);border:1px solid rgba(255,255,255,.28);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);color:#fff}
      .mh-turn .k{font:700 clamp(11px,1.25cqw,18px)/1.3 Inter,"Noto Sans JP",sans-serif;color:#ffd9a8;display:flex;align-items:center;gap:.8cqw}
      .mh-turn .k i{display:inline-flex;gap:3px;height:14px;align-items:flex-end}.mh-turn .k i b{width:3px;height:30%;background:#ffd9a8;border-radius:2px;transition:height .08s}
      .mh-turn .t{font:600 clamp(12px,1.5cqw,22px)/1.35 "Zen Maru Gothic","Noto Sans JP",sans-serif;min-height:1.3em}.mh-turn .t.interim{opacity:.6}
      .mh-turn .row{display:flex;gap:.8cqw}.mh-turn input{flex:1;min-width:0;min-height:44px;font:500 clamp(12px,1.3cqw,18px) Inter,"Noto Sans JP",sans-serif;
      padding:0 1cqw;border-radius:.8cqw;border:1px solid rgba(255,255,255,.3);background:rgba(0,0,0,.35);color:#fff}
      .mh-turn button{min-height:44px;padding:0 1.4cqw;border-radius:.8cqw;border:1px solid rgba(255,255,255,.4);background:rgba(255,255,255,.12);color:#fff;
      font:700 clamp(11px,1.2cqw,17px) Inter,"Noto Sans JP",sans-serif;cursor:pointer}
      @container (max-width:620px){.mh-turn{width:88cqw;bottom:13cqw}.mh-turn .k{font-size:2.6cqw}.mh-turn .t{font-size:3.2cqw}}`;
    document.head.append(s);
  }
  function listen(opt = {}) {
    style();
    const host = opt.host || document.querySelector('.stage') || document.body;
    const silenceSec = opt.silenceSec ?? 10, quietMs = opt.quietMs ?? 1200;
    const box = document.createElement('div'); box.className = 'mh-turn';
    const [pja, pen] = opt.prompt || ['話しかけてください', 'Say something'];
    box.innerHTML = `<div class="k"><span></span><i><b></b><b></b><b></b><b></b><b></b></i></div><div class="t interim"></div>
      <div class="row"><input type="text" enterkeyhint="send" autocomplete="off"><button type="button"></button></div>`;
    const k = box.querySelector('.k span'), t = box.querySelector('.t'), input = box.querySelector('input'), skip = box.querySelector('button'), bars = box.querySelectorAll('.k i b');
    const paint = () => { k.textContent = T('あなたの番 — 声で話すか、入力してください', 'Your turn — speak or type'); if (!heard && !interim) t.textContent = T(pja, pen); input.placeholder = T('ここに入力して Enter', 'Type here, then Enter'); skip.textContent = T('▶ 続ける', '▶ Continue'); };
    let heard = '', interim = '', rec = null, done = false, quietT = 0, silentT = 0, raf = 0;
    paint(); host.append(box);
    return new Promise((res) => {
      const finish = (v) => {
        if (done) return; done = true; clearTimeout(quietT); clearTimeout(silentT); cancelAnimationFrame(raf);
        if (rec) { try { rec.onend = null; rec.abort(); } catch {} }
        box.remove(); res(v && v.trim() ? v.trim() : null);
      };
      silentT = setTimeout(() => { if (!heard && !interim && !input.value) finish(null); }, silenceSec * 1000);
      input.addEventListener('keydown', (e) => { clearTimeout(silentT); if (e.key === 'Enter' && !e.isComposing && input.value.trim()) finish(input.value); });
      skip.addEventListener('click', () => finish(input.value || heard + interim));
      if (QS.has('auto')) { setTimeout(() => finish(QS.get('say')), 1000); return; }
      if (SR && !opt.noMic && window.MoHeatVoice?.enabled !== false) {
        const start = () => {
          if (done) return;
          rec = new SR(); rec.lang = window.MoHeatSub?.speech?.() || 'en-US'; rec.continuous = true; rec.interimResults = true;
          rec.onresult = (e) => {
            let fin = '', tmp = '';
            for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) fin += r[0].transcript; else tmp += r[0].transcript; }
            if (fin) heard += fin; interim = tmp; clearTimeout(silentT);
            t.textContent = (heard + interim) || '…'; t.className = interim ? 't interim' : 't';
            clearTimeout(quietT); if (heard || interim) quietT = setTimeout(() => finish(heard + interim), quietMs);
          };
          rec.onerror = (e) => { if (/not-allowed|service-not-allowed/.test(e.error)) { rec = null; t.textContent = T('マイクが使えません — 入力してください', 'No microphone — please type'); } };
          rec.onend = () => { if (!done && rec) setTimeout(start, 150); };
          try { rec.start(); } catch {}
        };
        start();
      }
      const lv = () => { const v = window.MoHeatTalk._micLevel?.() || (interim ? .5 + .5 * Math.random() : 0); bars.forEach((b, i) => { b.style.height = `${30 + 70 * Math.max(0, Math.min(1, v * 1.2 - i * .12))}%`; }); raf = requestAnimationFrame(lv); };
      raf = requestAnimationFrame(lv);
    });
  }

  // ---------------------------------------------------------------- LIVE brain client (private server only: tools/talk/server.py)
  function live({ demo } = {}) {
    let ws = null, sid = null, url = null, buf = '', parts = false, cb = {}, my = 0;   // parts: this reply came streamed (its agent_response is only a recap)
    const post = (p, body) => fetch(p, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, demo }) });
    const wsSend = (o) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
    const line = (l) => { if (l.trim()) cb.onLine?.(l.trim()); };
    function onWs(m) {
      if (m.type === 'ping') return wsSend({ type: 'pong', event_id: m.ping_event.event_id });
      if (m.type === 'conversation_initiation_metadata') return cb.onReady?.();
      if (m.type === 'agent_chat_response_part') {
        const p = m.text_response_part || {}; parts = true;
        if (p.type === 'start') buf = '';   // a new reply: anything left over belongs to one that was cut off
        if (p.text) { buf += p.text; let n; while ((n = buf.indexOf('\n')) >= 0) { line(buf.slice(0, n)); buf = buf.slice(n + 1); } }
        if (p.type === 'stop') { line(buf); buf = ''; cb.onDone?.(); }
        return;
      }
      if (m.type === 'interruption') { buf = ''; return; }   // the server cut the reply off
      if (m.type === 'agent_response') {   // the full text of the reply: used only when no streamed parts came (else it would repeat them, late, into the next turn)
        if (parts) { parts = false; return; }
        for (const l of (m.agent_response_event?.agent_response || '').split('\n')) line(l); cb.onDone?.();
      }
    }
    return {
      async status() {
        const r = await fetch(`/api/talk/status${demo ? `?demo=${encodeURIComponent(demo)}` : ''}`, { cache: 'no-store', credentials: 'same-origin' });
        if (r.status === 401) throw 401; if (!r.ok) throw 0; return r.json();
      },
      async begin() {
        const r = await post('/api/talk/session', {}); const j = await r.json(); if (!r.ok) throw j;
        sid = j.sid; url = j.signed_url; return j;
      },
      open(prompt, callbacks) {
        cb = callbacks || {}; const me = ++my; buf = ''; parts = false;
        ws = new WebSocket(url);
        ws.onopen = () => wsSend({ type: 'conversation_initiation_client_data', conversation_config_override: { agent: { prompt: { prompt }, first_message: '', language: 'ja' }, conversation: { text_only: true } } });
        ws.onmessage = (e) => { try { onWs(JSON.parse(e.data)); } catch (err) { console.error(err); } };
        ws.onclose = (e) => { if (me === my) cb.onClose?.(e); };
      },
      send(text) { wsSend({ type: 'user_message', text }); },   // the reply in progress may carry on: its half-received line stays in buf
      async tts(who, text) {
        try {
          const r = await post('/api/talk/tts', { sid, who, text });
          if (r.status === 429) return { blocked: (await r.json()).blocked };
          return r.ok ? await r.arrayBuffer() : null;
        } catch { return null; }
      },
      end() {
        my++; try { ws && ws.close(); } catch {} ws = null;
        if (sid) post('/api/talk/end', { sid }).catch(() => {});
        sid = null;
      },
    };
  }

  window.MoHeatTalk = { topic, bridges, listen, live };
})();
