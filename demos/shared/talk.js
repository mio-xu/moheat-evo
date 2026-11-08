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
  const T = (ja, en) => (window.MoHeatSub ? window.MoHeatSub.pick({ ja, en, zh: ZH[ja] || window.MoHeatSub.tr(ja, 'zh', false) || undefined }) : en) || en;

  // ---------------------------------------------------------------- scripted brain helpers
  const rx = new Map();
  function topic(said, topics, opt = {}) {
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
        if (p.text) { buf += p.text; let n; while ((n = buf.indexOf('\n')) >= 0) { line(buf.slice(0, n)); buf = buf.slice(n + 1); } }
        if (p.type === 'stop') { line(buf); buf = ''; cb.onDone?.(); }
        return;
      }
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
      send(text) { buf = ''; wsSend({ type: 'user_message', text }); },
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
