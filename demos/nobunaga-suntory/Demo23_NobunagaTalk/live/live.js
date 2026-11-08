// The LIVE brain (private page, see ../main.js for the interface): a text-only ElevenLabs agent (Claude) over a WebSocket writes
// every line ("N|position|[tag] せりふ|English", "@|gust", "#END"); server.py voices each line with ElevenLabs TTS (eleven_v4, the
// confirmed cast voices) within limits.json. Works only when served by server.py after the password login (session cookie);
// on GitHub Pages or without the login every /api/talk/* call fails and the page says so.
window.TALK_BRAIN = (() => {
  const T = window.TALK;
  let E = null, ws = null, sid = null, url = null, buf = '', parts = false, sc = null, cast = null, my = 0;
  const wsSend = (o) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
  const B = {
    limits: { session_seconds: 120 }, showLimit: true, silenceSec: 14, maxSilent: 2,
    async status(ui) {
      const b = ui.budget;
      try {
        const r = await fetch('/api/talk/status', { cache: 'no-store', credentials: 'same-origin' });
        if (r.status === 401) throw 401; if (!r.ok) throw 0; const s = await r.json();
        B.limits = s.limits;
        if (s.blocked) { b.textContent = `${s.blocked[0]} · ${s.blocked[1]}`; b.classList.add('warn'); ui.startBtn.disabled = true; return; }
        const left = s.month.limit - s.month.used;
        b.textContent = `本日あと ${s.left_sessions} 回 · ${s.left_sessions} talks left today · 今月の残り ${left.toLocaleString()} 字（上限を超えると止まります · stops at the limit）`;
        b.classList.remove('warn'); ui.startBtn.disabled = false;
      } catch (e) {
        b.classList.add('warn'); ui.startBtn.disabled = true;
        b.textContent = e === 401 ? '🔒 ログインしてください · Please log in (server.py)' : '🔒 非公開ページ：server.py で開いてください · Private page — open it through server.py';
      }
    },
    async begin(scene, c, eng, ui) {
      E = eng; sc = scene; cast = c;
      try {
        const r = await fetch('/api/talk/session', { method: 'POST', credentials: 'same-origin' }); const j = await r.json(); if (!r.ok) throw j;
        sid = j.sid; url = j.signed_url; B.limits = j.limits || B.limits; return true;
      } catch (e) {
        ui.budget.textContent = e?.blocked ? `${e.blocked[0]} · ${e.blocked[1]}` : `接続できません · cannot start (${e?.error || 'server'})`; ui.budget.classList.add('warn'); return false;
      }
    },
    open() {
      const me = ++my;
      ws = new WebSocket(url);
      ws.onopen = () => wsSend({ type: 'conversation_initiation_client_data', conversation_config_override: { agent: { prompt: { prompt: T.prompt(sc, cast) }, first_message: '', language: 'ja' }, conversation: { text_only: true } } });
      ws.onmessage = (e) => { try { onWs(JSON.parse(e.data)); } catch (err) { console.error(err); } };
      ws.onclose = (e) => { const S = E.S; if (S && !S.done && me === my) { console.warn('ws closed', e.code, e.reason); if (!E.playing()) E.finish('lost'); else E.endAfter(); } };
    },
    ask(kind, said) {
      buf = ''; parts = false;
      const text = kind === 'user' ? T.USER(said) : kind === 'silent' ? T.SILENT : kind === 'close' ? T.CLOSE(said) : T.OPEN(sc);
      wsSend({ type: 'user_message', text });
    },
    async voice(it) {
      try {
        const r = await fetch('/api/talk/tts', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sid, who: it.who, text: it.ja }) });
        if (r.status === 429) { const j = await r.json(); E.limitHit(j.blocked); return null; }
        if (!r.ok) return null;
        return await window.TKAudio.decode(await r.arrayBuffer());
      } catch { return null; }
    },
    end() {
      my++; try { ws && ws.close(); } catch {} ws = null;
      if (sid) fetch('/api/talk/end', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sid }) }).catch(() => {});
      sid = null;
    },
  };
  function onWs(m) {
    if (m.type === 'ping') return wsSend({ type: 'pong', event_id: m.ping_event.event_id });
    if (m.type === 'conversation_initiation_metadata') return B.ask('open');
    if (m.type === 'agent_chat_response_part') {
      const p = m.text_response_part || {}; parts = true;
      if (p.text) { buf += p.text; let n; while ((n = buf.indexOf('\n')) >= 0) { E.line(buf.slice(0, n)); buf = buf.slice(n + 1); } }
      if (p.type === 'stop') { if (buf.trim()) E.line(buf); buf = ''; E.done(); }
      return;
    }
    if (m.type === 'agent_response') {   // the full text of the turn (used only if no streamed parts came)
      if (!parts) for (const l of (m.agent_response_event?.agent_response || '').split('\n')) E.line(l);
      E.done();
    }
  }
  return B;
})();
