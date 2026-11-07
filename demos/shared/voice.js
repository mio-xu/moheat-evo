// MoHeatVoice — answer by VOICE in every demo with dialogue (DEMO_DESIGN_GUIDE §2.1, user 2026-11-08).
// The browser's speech recognition (Web Speech API, ja-JP; en-US when the browser language is English or ?vlang=en-US)
// listens only while it is your turn, and the words you say are matched against the answers on screen:
//   · auto mode: any visible answer button — .ch (choices) · .act-btn (actions, not the press-and-hold ones) · .chip-c (chat /
//     gift chips) · #micGate button ("say …" gates) · [data-voice] — is picked by saying it; the button is then clicked, so the
//     demo's own code runs exactly as for a tap. Extra words for a button: data-voice="word|word".
//   · API (interact.js, Demo 1–9): MoHeatVoice.listen({ phrases: [[ja, en, …], …], single, lenient, anchor, onHit, onHeard }).
// Matching: kana-folded character bigrams (said ⊇ answer → 1), a small kana ↔ kanji table, ordinals (「1番」「ふたつめ」, first /
// second) for choices, yes / OK for a single action. A single line / action is accepted after 2 tries that were heard but not
// matched but came close (recognition of short lines is not perfect, the demo must never get stuck; unrelated talk in the room
// does not count); a choice needs a clear winner.
// Keys too: 1 / 2 / 3 / 4 pick an answer, Enter a single action. No recognition (Firefox, mic denied, ?embed without the
// microphone permission): everything stays a tap, nothing changes. Off in ?cover / ?render / ?auto. Toggle: the 🎙 pill (saved).
// The audio is processed by the browser's speech service (Chrome / Edge: Google / Microsoft; Safari: Apple); nothing is stored here.
(() => {
  if (window.MoHeatVoice) return;
  const QS = new URLSearchParams(location.search);
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const OFF = QS.has('cover') || QS.has('render') || QS.has('auto');
  const LANG = QS.get('vlang') || (/^en/i.test(navigator.language || '') ? 'en-US' : 'ja-JP');
  const store = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v === '1'; } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, v ? '1' : '0'); } catch {} } };
  let enabled = store.get('moheat.voice', true);

  // ---------------------------------------------------------------- matching
  const norm = (s) => String(s || '').normalize('NFKC').toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))   // katakana → hiragana
    .replace(/[ー〜~を]/g, '').replace(/[^\p{L}\p{N}]/gu, '');
  const SYN = [   // kana in the answers ↔ what recognition usually writes (and back)
    ['ひだり', '左'], ['みぎ', '右'], ['つめた', '冷た'], ['あったか', '暖か|温か|あたたか'], ['かわいい', '可愛い'], ['ありがとう', '有難う'],
    ['おやすみ', 'お休み'], ['すごく', '凄く'], ['すごい', '凄い'], ['かっこよかった', '格好良かった|カッコよかった'], ['かっこいい', '格好いい|カッコいい'],
    ['ごめん', '御免'], ['ちがう', '違う'], ['はなす', '離す|放す'], ['あける', '開ける'], ['あけて', '開けて'], ['しめる', '閉める'],
    ['すすむ', '進む'], ['にぎる', '握る'], ['ねてた', '寝てた'], ['おきてた', '起きてた'], ['みてた', '見てた'], ['きれい', '綺麗|奇麗'],
    ['さむい', '寒い'], ['ちかい', '近い'], ['また', '又'], ['だいすき', '大好き'], ['かんぱい', '乾杯'], ['さいこう', '最高'],
    ['やくそく', '約束'], ['うれしい', '嬉しい'], ['いっしょ', '一緒'], ['ひさしぶり', '久しぶり|久し振り'], ['げんき', '元気'], ['たべ', '食べ'],
    ['かえる', '帰る'], ['ゆき', '雪'], ['こんばんは', '今晩は'], ['はじめまして', '初めまして'], ['おきる', '起きる'], ['ひみつ', '秘密'], ['まど', '窓'], ['てはな', '手はな|手離|手放'], ['てにぎ', '手にぎ|手握'],
  ].map(([a, b]) => [norm(a), b.split('|').map(norm)]);
  function variants(p) {   // the answer plus kana / kanji spellings of it
    const out = new Set([p]);
    for (const [kana, kanji] of SYN) for (const v of [...out]) {
      if (v.includes(kana)) for (const k of kanji) out.add(v.split(kana).join(k));
      for (const k of kanji) if (v.includes(k)) out.add(v.split(k).join(kana));
      if (out.size > 24) break;
    }
    return [...out];
  }
  const grams = (s) => { if (s.length < 2) return s ? [s] : []; const g = []; for (let i = 0; i < s.length - 1; i++) g.push(s.slice(i, i + 2)); return g; };
  function overlap(a, b) { const m = new Map(); for (const x of b) m.set(x, (m.get(x) || 0) + 1); let n = 0; for (const x of a) { const c = m.get(x); if (c) { n++; m.set(x, c - 1); } } return n; }
  function sim1(h, p) {
    if (!h || !p) return 0;
    if (h.includes(p)) return 1;
    if (p.includes(h) && h.length >= Math.min(3, p.length)) return .5 + .45 * h.length / p.length;
    const A = grams(p), B = grams(h), n = overlap(A, B);
    return Math.max(2 * n / (A.length + B.length), .85 * n / A.length);
  }
  const prep = (phrase) => variants(norm(phrase)).filter(Boolean);
  const score = (heard, preps) => { const h = norm(heard); let s = 0; for (const p of preps) s = Math.max(s, sim1(h, p)); return s; };
  const ORD = [/(^|[^0-9])1(番|ばん|つめ|つ目|個目|st)|一番目|一つ目|ひとつめ|いちばんめ|最初|さいしょ|first|ファースト|^いち$|^one$/,
    /(^|[^0-9])2(番|ばん|つめ|つ目|個目|nd)|二番|二つ目|ふたつめ|にばんめ|second|^に$|^two$/,
    /(^|[^0-9])3(番|ばん|つめ|つ目|個目|rd)|三番|三つ目|みっつめ|third/, /(^|[^0-9])4(番|ばん|つめ|つ目|個目|th)|四番|四つ目|よっつめ|fourth/];
  const YES = /^(はい|うん|ええ|おっけ|ok|okay|yes|yeah|いいよ|よし|go|いく|いこう|了解|りょうかい|お願い|おねがい)/;

  // ---------------------------------------------------------------- pill (status + what was heard), anchored above the answers
  const css = document.createElement('style');
  css.textContent = `
  .mv-pill{position:absolute;z-index:30;transform:translate(-50%,-100%);display:flex;align-items:center;gap:.6em;max-width:min(92%,640px);
    padding:.42em .95em;border-radius:999px;background:rgba(12,10,16,.78);border:1px solid rgba(255,255,255,.22);color:#fff;
    font:600 clamp(10px,1.12cqw,16px)/1.3 "Noto Sans JP",Inter,system-ui,sans-serif;white-space:nowrap;cursor:pointer;
    backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);box-shadow:0 .4em 1.6em rgba(0,0,0,.4);pointer-events:auto;transition:opacity .2s}
  .mv-pill.fixed{position:fixed}
  .mv-pill .dot{width:.62em;height:.62em;border-radius:50%;background:#ff5a6e;flex:none;animation:mvPulse 1.2s ease-in-out infinite}
  .mv-pill.off .dot{background:#777;animation:none}.mv-pill.off{opacity:.6}
  .mv-pill .heard{overflow:hidden;text-overflow:ellipsis;color:#ffe9a8;font-weight:700}
  .mv-pill.ok{border-color:#7be0a0}.mv-pill.ok .dot{background:#7be0a0;animation:none}
  .mv-pill.retry{border-color:#ffc46b}
  @keyframes mvPulse{0%,100%{transform:scale(.8);opacity:.55}50%{transform:scale(1.15);opacity:1}}
  .mv-hit{outline:3px solid #7be0a0!important;outline-offset:2px;box-shadow:0 0 1.2em rgba(123,224,160,.8)!important}
  @container (max-width:620px){.mv-pill{font-size:2.9cqw}}`;
  document.head.appendChild(css);
  let pill = null, pillTimer = 0;
  function host(anchorEls) {
    const a = anchorEls[0];
    return document.fullscreenElement || a?.closest('#stage, .stage') || document.body;
  }
  function showPill(state, text, anchorEls) {
    if (!anchorEls || !anchorEls.length) return;
    const h = host(anchorEls);
    if (!pill) { pill = document.createElement('div'); pill.className = 'mv-pill'; pill.addEventListener('click', (e) => { e.stopPropagation(); setEnabled(!enabled); }); }
    if (pill.parentNode !== h) h.appendChild(pill);
    pill.className = `mv-pill ${state}`;
    pill.innerHTML = `<span class="dot"></span><span class="heard"></span>`;
    pill.querySelector('.heard').textContent = text;
    pill.title = enabled ? 'Voice input on — click to turn off' : 'Voice input off — click to turn on';
    place(anchorEls);
  }
  function place(anchorEls) {
    if (!pill || !anchorEls?.length) return;
    let l = 1e9, t = 1e9, r = -1e9, b = -1e9;
    for (const el of anchorEls) { const q = el.getBoundingClientRect(); if (!q.width) continue; l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom); }
    if (l > r) return;
    const h = pill.parentNode, fixed = h === document.body || getComputedStyle(h).position === 'static';
    pill.classList.toggle('fixed', fixed);
    const hr = fixed ? { left: 0, top: 0 } : h.getBoundingClientRect(), ph = pill.offsetHeight || 28;
    let y = t - hr.top - 8, below = false;
    if (t - ph - 8 < (fixed ? 0 : hr.top) + 4) { y = b - hr.top + 8; below = true; }
    pill.style.left = `${(l + r) / 2 - hr.left}px`; pill.style.top = `${y}px`; pill.style.transform = below ? 'translate(-50%,0)' : 'translate(-50%,-100%)';
  }
  function hidePill() { clearTimeout(pillTimer); pill?.remove(); }

  // ---------------------------------------------------------------- recognition
  let rec = null, recOn = false, denied = !SR, netFails = 0, sess = null;
  const micAllowed = () => { const m = document.getElementById('micOn'); return !m || m.checked; };
  const active = () => !OFF && enabled && !denied && micAllowed();
  function make() {
    const r = new SR(); r.continuous = true; r.interimResults = true; r.maxAlternatives = 4; r.lang = LANG;
    r.onstart = () => { netFails = 0; };
    r.onresult = (e) => {
      if (!sess || sess.done) return;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i], alts = Array.from(res, (a) => a.transcript).filter((x) => x && x.trim());
        if (!alts.length) continue;
        judge(alts, res.isFinal);
        if (!sess || sess.done) break;
      }
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'language-not-supported') { denied = true; if (sess) idle(); hidePill(); }
      else if (e.error === 'network' && ++netFails > 3) { denied = true; hidePill(); }
    };
    r.onend = () => { recOn = false; if (sess && !sess.done && active()) setTimeout(startRec, 250); };
    return r;
  }
  function startRec() {
    if (!active() || recOn || !sess || sess.done) return;
    rec = rec || make();
    try { rec.start(); recOn = true; } catch { /* still ending: onend restarts it */ }
  }
  function stopRec() { if (rec && recOn) { try { rec.abort(); } catch {} } }

  // ---------------------------------------------------------------- a listening session = one "your turn"
  const hint = (s) => (s.single ? '🎙 声でもOK · Or say it' : '🎙 声で答えてOK · Answer by voice');
  function idle() { if (sess) showPill(active() ? '' : 'off', active() ? hint(sess) : '🎙 OFF · タップで声入力 · Tap for voice', sess.anchor()); }
  function begin(o) {
    end();
    sess = { ...o, preps: o.phrases.map((ph) => ph.flatMap(prep)), fails: 0, done: false, anchor: o.anchor || (() => []) };
    if (OFF) { sess = null; return null; }
    if (!SR) { notice(o); return sess; }
    idle(); startRec();
    return sess;
  }
  function end() { if (sess) { sess.done = true; sess = null; } stopRec(); hidePill(); }
  let noticed = false;
  function notice(o) {   // once: this browser has no speech recognition
    if (noticed || OFF) return; noticed = true;
    const els = (o.anchor || (() => []))(); showPill('off', '🎙 音声入力は Chrome / Edge / Safari で · Voice input: Chrome, Edge or Safari', els);
    pillTimer = setTimeout(hidePill, 4500);
  }
  function judge(alts, final) {
    const s = sess, heard = alts[0].trim();
    s.onHeard?.(heard, final);
    const sc = s.preps.map((p) => Math.max(...alts.map((a) => score(a, p))));
    const order = sc.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]);
    const [s1, i1] = order[0], s2 = order[1] ? order[1][0] : 0;
    let pick = -1;
    if (s.single) { if (s1 >= (final ? .34 : .62) || (final && YES.test(norm(heard)))) pick = 0; }
    else if (final ? (s1 >= .3 && s1 - s2 >= .1 && s1 >= 1.4 * s2) : (s1 >= .62 && s1 - s2 >= .25)) pick = i1;
    if (pick < 0 && final && !s.single) { const o = ORD.findIndex((re, k) => k < sc.length && alts.some((a) => re.test(norm(a)))); if (o >= 0) pick = o; }
    if (pick < 0 && final && s1 >= .12) {   // a near miss (unrelated talk in the room does not count)
      s.fails++;
      if (s.single && s.lenient !== false && s.fails >= 2) pick = 0;
    }
    if (pick >= 0) { hit(pick, heard); return; }
    showPill(final ? 'retry' : '', final ? `🤔「${heard}」 もう一度 · Try again` : `「${heard}」`, s.anchor());
  }
  function hit(i, heard) {
    const s = sess; s.done = true; stopRec();
    showPill('ok', `✓「${heard}」`, s.anchor());
    const el = s.els?.[i]; el?.classList.add('mv-hit');
    setTimeout(() => { el?.classList.remove('mv-hit'); if (sess === s) { sess = null; hidePill(); } s.onHit?.(i, heard); }, 320);
  }

  // ---------------------------------------------------------------- auto mode: answer buttons on the page
  const SEL = '.ch, .act-btn:not(.hold), .chip-c, #micGate button, [data-voice]';
  const visible = (el) => {
    if (!el.isConnected || el.disabled || el.closest('.ix-card, .intro:not(.hidden), [hidden]')) return false;
    const q = el.getBoundingClientRect(); if (q.width < 2 || q.height < 2) return false;
    if (getComputedStyle(el).pointerEvents === 'none') return false;
    if (el.checkVisibility) return el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
    for (let n = el; n && n !== document.body; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < .05) return false; }
    return true;
  };
  function phrasesOf(el) {
    const out = [], b = el.querySelector('b'), sp = el.querySelector('span');
    if (b) out.push(b.textContent); if (sp && sp !== b) out.push(sp.textContent);
    if (!b && !sp) out.push(...el.textContent.split(/\s[·・]\s/));
    if (el.dataset.voice) out.push(...el.dataset.voice.split('|'));
    return out.map((x) => x.trim()).filter(Boolean);
  }
  let autoSig = '', autoEls = [], manual = false;
  function scan() {
    if (manual) return;
    const els = OFF ? [] : [...document.querySelectorAll(SEL)].filter(visible);
    if (!els.length) { if (autoSig) { autoSig = ''; autoEls = []; end(); } return; }
    const sig = els.map((e) => e.textContent).join('|');
    if (sig !== autoSig) {
      autoSig = sig; autoEls = els;
      begin({ phrases: els.map(phrasesOf), single: els.length === 1, lenient: true, anchor: () => autoEls.filter((e) => e.isConnected), onHit: (i) => els[i]?.click() });
      if (sess) sess.els = els;
    } else if (pill) place(autoEls);
  }
  setInterval(scan, 250);
  addEventListener('keydown', (e) => {   // 1–4 pick an answer, Enter a single action (not while typing)
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable) return;
    const els = manual ? (sess?.els || []) : autoEls.filter((x) => x.isConnected);
    if (!els.length) return;
    const n = /^Digit([1-4])$/.exec(e.code)?.[1] || /^Numpad([1-4])$/.exec(e.code)?.[1];
    if (n && els[n - 1]) { e.preventDefault(); els[n - 1].click(); }
    else if (e.code === 'Enter' && els.length === 1 && e.target.tagName !== 'BUTTON') { e.preventDefault(); els[0].click(); }
  });

  // ---------------------------------------------------------------- warm up: ask for the microphone with the Start tap
  document.addEventListener('click', (e) => {
    if (!e.target.closest?.('#startBtn') || !active() || !navigator.mediaDevices?.getUserMedia) return;
    navigator.mediaDevices.getUserMedia({ audio: true }).then((st) => st.getTracks().forEach((t) => t.stop())).catch(() => { denied = true; });
  }, true);

  function setEnabled(v) {
    enabled = v; store.set('moheat.voice', v);
    if (!sess) return;
    if (v) { idle(); startRec(); } else { stopRec(); idle(); }
  }

  // ---------------------------------------------------------------- API
  window.MoHeatVoice = {
    supported: !!SR && !OFF,
    get enabled() { return enabled; }, setEnabled,
    /** listening for this turn right now (use it to skip a level-only fallback) */
    judging: () => !!(sess && !sess.done && active() && recOn),
    /** listen({ phrases: [[ja, en, ...extra], ...], single, lenient, anchor: () => [elements], els, onHit(i, heard), onHeard(text, final) }) → { stop } */
    listen(o) {
      manual = true;
      const s = begin(o);
      if (s) { s.els = o.els; const hit0 = s.onHit; s.onHit = (i, h) => { manual = false; hit0?.(i, h); }; }
      return { stop: () => { if (sess === s) end(); manual = false; } };
    },
    score: (heard, phrase) => score(heard, prep(phrase)),
    /** testing: feed a transcript as if it had been heard */
    _hear: (text, final = true) => { if (sess && !sess.done) judge([text], final); },
  };
})();
