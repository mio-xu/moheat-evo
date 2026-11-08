// The LIVE brain (private page, see ../main.js for the interface): a text-only ElevenLabs agent (Claude) over a WebSocket writes
// every line ("N|position|[tag] せりふ|English", "@|gust", "#END"); the private server voices each line with ElevenLabs TTS
// (eleven_v4, the confirmed cast voices) within limits.json. The connection itself is the shared live client
// (demos/shared/talk.js MoHeatTalk.live, extracted from this file 2026-11-08; server: tools/talk/server.py). Works only when served
// by the server after the password login (session cookie); on GitHub Pages or without the login every /api/talk/* call fails and the page says so.
window.TALK_BRAIN = (() => {
  const T = window.TALK, C = window.MoHeatTalk.live({ demo: 'nobunaga' });
  let E = null, sc = null, cast = null;
  const B = {
    limits: { session_seconds: 120 }, showLimit: true, silenceSec: 14, maxSilent: 2,
    async status(ui) {
      const b = ui.budget;
      try {
        const s = await C.status();
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
      try { const j = await C.begin(); B.limits = j.limits || B.limits; return true; } catch (e) {
        ui.budget.textContent = e?.blocked ? `${e.blocked[0]} · ${e.blocked[1]}` : `接続できません · cannot start (${e?.error || 'server'})`; ui.budget.classList.add('warn'); return false;
      }
    },
    open() {
      C.open(T.prompt(sc, cast), {
        onReady: () => B.ask('open'),
        onLine: (l) => E.line(l),
        onDone: () => E.done(),
        onClose: (e) => { const S = E.S; if (S && !S.done) { console.warn('ws closed', e.code, e.reason); if (!E.playing()) E.finish('lost'); else E.endAfter(); } },
      });
    },
    ask(kind, said) { C.send(kind === 'user' ? T.USER(said) : kind === 'silent' ? T.SILENT : kind === 'close' ? T.CLOSE(said) : T.OPEN(sc)); },
    async voice(it) {
      const r = await C.tts(it.who, it.ja);
      if (r && r.blocked) { E.limitHit(r.blocked); return null; }
      return r ? window.TKAudio.decode(r).catch(() => null) : null;
    },
    end() { C.end(); },
  };
  return B;
})();
