// MoHeatVoice — answer by VOICE in every demo with dialogue (DEMO_DESIGN_GUIDE §2.1, user 2026-11-08).
// The browser's speech recognition (Web Speech API) in the subtitle language (shared/subs.js: en-US default / ja-JP / zh-CN; ?vlang= overrides)
// listens only while it is your turn, and the words you say are matched against the answers on screen:
//   · auto mode: any visible answer button — .ch (choices) · .act-btn (actions, not the press-and-hold ones) · .chip-c (chat /
//     gift chips) · #micGate button ("say …" gates) · [data-voice] — is picked by saying it; the button is then clicked, so the
//     demo's own code runs exactly as for a tap. Extra words for a button: data-voice="word|word".
//   · API (interact.js, Demo 1–9): MoHeatVoice.listen({ phrases: [[ja, en, …], …], single, lenient, anchor, onHit, onHeard }).
// Every answer also matches its 中文 and the paraphrases in <demo>/subs_zh.js (MOHEAT_VOICE), so an answer close in meaning passes.
// Matching: kana-folded character bigrams (said ⊇ answer → 1), a small kana ↔ kanji table, ordinals (「1番」「ふたつめ」, first /
// second) for choices, yes / OK for a single action. A single line / action is accepted after 2 tries that were heard but not
// matched but came close (recognition of short lines is not perfect, the demo must never get stuck; unrelated talk in the room
// does not count); a choice needs a clear winner.
// Keys too: 1 / 2 / 3 / 4 pick an answer, Enter a single action. No recognition (Firefox, mic denied, ?embed without the
// microphone permission): everything stays a tap, nothing changes. Off in ?cover / ?render / ?auto and in pure listening mode
// (shared/playmode.js: no microphone at all). Toggle: the 🎙 pill (saved).
// The audio is processed by the browser's speech service (Chrome / Edge: Google / Microsoft; Safari: Apple); nothing is stored here.
(() => {
  if (window.MoHeatVoice?.listen) return;   // shell.js also owns window.MoHeatVoice (the voice LANGUAGE: lang / url / fetch …), so check for this file's own API; the two are merged at the end
  const QS = new URLSearchParams(location.search);
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const OFF = QS.has('cover') || QS.has('render') || QS.has('auto');
  // listening language = the subtitle language (shared/subs.js: EN default / 日本語 / 中文; user 2026-11-08), ?vlang= overrides
  const subLang = () => { if (window.MoHeatSub) return window.MoHeatSub.lang; try { return sessionStorage.getItem('moheat.sublang') || 'en'; } catch { return 'en'; } };
  const LANG = () => QS.get('vlang') || window.MoHeatSub?.speech?.() || ({ ja: 'ja-JP', zh: 'zh-CN' })[subLang()] || 'en-US';   // codes: LANGS in subs.js
  const T = (ja, en, zh) => (window.MoHeatSub ? window.MoHeatSub.pick({ ja, en, zh }) : ({ ja, en, zh })[subLang()]) || en;   // pill texts; other languages fall back via subs.js
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
    // letter pairs of a short answer turn up by chance in a long unrelated sentence (EN "help me" in a 50-letter remark):
    // the one-sided score shrinks with the length ratio, and Latin letters (few distinct pairs) count less → no match = ask again
    const len = Math.min(1, Math.sqrt(2.5 * (A.length + 1) / (B.length + 1))), latin = /^[a-z0-9]+$/.test(p);
    return Math.max(2 * n / (A.length + B.length), .85 * n / A.length * len * (latin ? .75 : 1));
  }
  // English: also word by word (stems + a few synonyms), so a paraphrase with the same key words passes
  const STOP = new Set('i a an the to of is am are was were be it its that this so and or just do did really very me my'.split(' '));
  const WSYN = { look: 'see', watch: 'see', stare: 'see', saw: 'see', seen: 'see', closer: 'near', close: 'near', come: 'near', hot: 'warm', cozy: 'warm', cool: 'cold', chilly: 'cold', freezing: 'cold',
    thanks: 'thank', yeah: 'yes', yep: 'yes', okay: 'yes', ok: 'yes', sure: 'yes', hi: 'hello', hey: 'hello', bye: 'goodbye', night: 'goodnight', love: 'like', adore: 'like', beautiful: 'pretty', lovely: 'pretty', cute: 'pretty', stay: 'remain', more: 'longer' };
  // words that say nothing about WHICH answer: they alone can never pick one ("hello what is this" must not choose "What contract?"). An answer made only of them still matches itself.
  const GEN_EN = new Set("what who where when why how which whats hello hi hey um uh hmm oh ah well you your we our they them there here this that these those it its is are was were be do does did not no don't i'm im it's that's can could would will please a an the to of and or so just i me my".split(' '));
  const GEN_CJK = ['什么', '这个', '那个', '这是', '那是', '怎么', '为什么', '哪里', '哪个', '吗', '呢', '啊', '嗯', 'これ', 'それ', 'あれ', 'なに', 'なん', '何', 'どれ', 'どこ', 'だれ', '誰', 'いつ', 'どう', 'ねえ', 'あの', 'えっと'];
  const strip = (t) => { let s = String(t || '').toLowerCase().replace(/[a-z']+/g, (w) => (GEN_EN.has(w) ? ' ' : w)); for (const g of GEN_CJK) s = s.split(g).join(' '); return s; };
  const stem = (w) => { w = w.replace(/'s$/, ''); w = WSYN[w] || w; if (w.length > 4) w = w.replace(/(ing|ed|es|s)$/, ''); return WSYN[w] || w; };
  const words = (t) => (String(t || '').toLowerCase().match(/[a-z']+/g) || []).filter((w) => !STOP.has(w)).map(stem);
  const GEN_W = new Set([...GEN_EN].map(stem));   // the same words after stem()
  const wsim = (heard, W) => { const H = new Set(words(heard)); if (!H.size || !W.length) return 0; const C = W.filter((w) => !GEN_W.has(w)), T = C.length ? C : W; const n = T.filter((w) => H.has(w)).length; return Math.min(1, n / T.length) * (T.length === 1 ? .8 : 1); };
  const prep = (phrase) => { const core = norm(strip(phrase)); if (!core) return Object.assign([{ g: norm(phrase) }], { gen: true }); const out = variants(core).filter(Boolean), W = /[a-z]{2}/i.test(phrase) ? words(phrase) : []; if (W.length) out.push({ W }); return out; };
  const score = (heard, preps) => { const h = norm(strip(heard)), raw = norm(heard); let s = 0; for (const p of preps) s = Math.max(s, typeof p === 'string' ? sim1(h, p) : p.g ? (raw === p.g ? 1 : 0) : wsim(heard, p.W)); return s; };
  const ORD = [/(^|[^0-9])1(番|ばん|つめ|つ目|個目|st)|一番目|一つ目|ひとつめ|いちばんめ|最初|さいしょ|first|ファースト|^いち$|^one$/,
    /(^|[^0-9])2(番|ばん|つめ|つ目|個目|nd)|二番|二つ目|ふたつめ|にばんめ|second|^に$|^two$/,
    /(^|[^0-9])3(番|ばん|つめ|つ目|個目|rd)|三番|三つ目|みっつめ|third/, /(^|[^0-9])4(番|ばん|つめ|つ目|個目|th)|四番|四つ目|よっつめ|fourth/];
  const YES = /^(はい|うん|ええ|おっけ|ok|okay|yes|yeah|yep|sure|alright|letsgo|いいよ|よし|go|いく|いこう|了解|りょうかい|お願い|おねがい|好|行|嗯|对|是|可以|没问题|走|来吧|开始)/;
  const ORD_ZH = [/第一|一号|选一|^一$/, /第二|二号|选二|^二$/, /第三|三号|选三|^三$/, /第四|四号|选四|^四$/];

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
    if (!pill?.isConnected || !anchorEls?.length) return;   // a hidden (removed) pill: nothing to place (getComputedStyle(null) threw 4× a second)
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
  const pure = () => window.MoHeatPlay?.pure === true;   // pure listening mode (shared/playmode.js): no microphone, no recognition
  const paused = () => document.documentElement.classList.contains('shell-paused');   // nothing is heard while the demo is paused; scan() starts it again on resume
  const active = () => !OFF && !pure() && enabled && !denied && micAllowed() && !paused();
  function make() {
    const r = new SR(); r.continuous = true; r.interimResults = true; r.maxAlternatives = 4; r.lang = LANG();
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
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'language-not-supported') { denied = true; hidePill(); if (sess) micOff(); }
      else if (e.error === 'network' && ++netFails > 3) { denied = true; hidePill(); }
    };
    r.onend = () => { recOn = false; if (sess && !sess.done && active()) setTimeout(startRec, 250); };
    return r;
  }
  function startRec() {
    if (!active() || recOn || !sess || sess.done) return;
    rec = rec || make(); rec.lang = LANG();
    try { rec.start(); recOn = true; } catch { /* still ending: onend restarts it */ }
  }
  function stopRec() { if (rec && recOn) { try { rec.abort(); } catch {} } }

  // ---------------------------------------------------------------- a listening session = one "your turn"
  const hint = (s) => (s.single ? T('🎙 声でもOK', '🎙 Or say it', '🎙 也可以直接说') : T('🎙 声で答えてOK', '🎙 Answer by voice', '🎙 可以用说的回答'));
  function idle() { if (sess) showPill(active() ? '' : 'off', active() ? hint(sess) : T('🎙 OFF · タップで声入力', '🎙 OFF · Tap for voice', '🎙 OFF · 点击开启语音'), sess.anchor()); }
  function begin(o) {
    end();
    sess = { ...o, preps: o.phrases.map((ph) => { const l = expand(ph).map(prep), real = l.filter((x) => !x.gen); return (real.length ? real : l).flat(); }), /* an answer's generic-only spellings (data-voice "what") count only when the whole answer is generic, and then only said exactly */ fails: 0, done: false, anchor: o.anchor || (() => []) };
    if (OFF || pure()) { sess = null; return null; }
    if (denied) { micOff(); return sess; }   // no speech recognition, or the microphone refused: everything stays a tap
    idle(); startRec();
    return sess;
  }
  // every answer also matches its Chinese and the paraphrases in <demo>/subs_zh.js (MOHEAT_VOICE): close in meaning = a pass
  const expand = (ph) => { const out = [...ph]; for (const p of ph) for (const v of (window.MoHeatSub?.voice(p) || [])) if (!out.includes(v)) out.push(v); return out; };
  function end() { if (sess) { sess.done = true; sess = null; } stopRec(); hidePill(); }
  // once per page load, when the first answer appears (interactive only: begin() returns earlier in pure mode, ?auto, ?cover, ?render and the home-page player)
  let noticed = false;
  function micOff() { if (noticed || OFF || pure()) return; noticed = true; window.MoHeatShell?.toast?.('micOff'); }
  function judge(alts, final) {
    const s = sess, heard = alts[0].trim();
    s.onHeard?.(heard, final);
    const sc = s.preps.map((p) => Math.max(...alts.map((a) => score(a, p))));
    const order = sc.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]);
    const [s1, i1] = order[0], s2 = order[1] ? order[1][0] : 0;
    let pick = -1;
    if (s.strict) { if (final && s1 >= .6 && s1 - s2 >= .15) pick = i1; }   // controls that are always on screen (a camera dock, Hint): room talk must not press them
    else if (s.single) { if (s1 >= (final ? .28 : .6) || (final && YES.test(norm(heard)))) pick = 0; }
    else if (final ? (s1 >= .25 && s1 - s2 >= .08 && s1 >= 1.3 * s2) : (s1 >= .6 && s1 - s2 >= .25)) pick = i1;
    if (pick < 0 && final && !s.single && !s.strict) { const o = [ORD, ORD_ZH].map((L) => L.findIndex((re, k) => k < sc.length && alts.some((a) => re.test(norm(a))))).find((x) => x >= 0); if (o >= 0) pick = o; }
    if (pick < 0 && final && s1 >= .12) {   // a near miss (unrelated talk in the room does not count)
      s.fails++;
      if (s.single && !s.strict && s.lenient !== false && (s.fails >= 2 || s1 >= .2) && norm(heard).length <= 24) pick = 0;   // a long unrelated remark never counts as the answer
    }
    if (pick >= 0) { hit(pick, heard); return; }
    showPill(final ? 'retry' : '', final ? `🤔「${heard}」 ${T('もう一度', 'Try again', '再说一次')}` : `「${heard}」`, s.anchor());
  }
  function hit(i, heard) {
    const s = sess; s.done = true; stopRec();
    showPill('ok', `✓「${heard}」`, s.anchor());
    const el = s.els?.[i]; el?.classList.add('mv-hit');
    setTimeout(() => { el?.classList.remove('mv-hit'); if (sess === s) { sess = null; hidePill(); } s.onHit?.(i, heard); }, 320);
  }

  // ---------------------------------------------------------------- auto mode: answer buttons on the page
  const SEL = '.ch, .act-btn, .chip-c, #micGate button, .ix-cheer button, [data-voice]';
  // press-and-hold buttons: saying the words presses it, and it is held until the game takes it away (or data-voice-hold seconds, default 8), then released
  function press(el) {
    if (!el.matches('.hold, [data-voice-hold]')) return el.click();
    if (el.__mvHeld) return; el.__mvHeld = true;
    const fire = (t) => el.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, pointerType: 'mouse', button: 0, buttons: t === 'pointerdown' ? 1 : 0 }));
    fire('pointerdown');
    const t0 = performance.now(), max = (parseFloat(el.dataset.voiceHold) || 8) * 1000;
    const iv = setInterval(() => { if (el.isConnected && visible(el) && performance.now() - t0 < max) return; clearInterval(iv); el.__mvHeld = false; fire('pointerup'); }, 100);
  }
  const visible = (el) => {
    if (!el.isConnected || el.disabled || el.closest('.ix-card, .intro:not(.hidden), [hidden]')) return false;
    const q = el.getBoundingClientRect(); if (q.width < 2 || q.height < 2) return false;
    if (getComputedStyle(el).pointerEvents === 'none') return false;
    if (el.checkVisibility) return el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
    for (let n = el; n && n !== document.body; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < .05) return false; }
    return true;
  };
  function phrasesOf(el) {
    const out = [], b = el.querySelector('b:not(.one)'), sp = el.querySelector('span:not(.one)');   // .one = shared/subs.js's shown language
    if (b) out.push(b.textContent); if (sp && sp !== b) out.push(sp.textContent);
    if (!b && !sp) out.push(...el.textContent.split(/\s[·・]\s/));
    if (el.dataset.voice) out.push(...el.dataset.voice.split('|'));
    return out.map((x) => x.trim()).filter(Boolean);
  }
  let autoSig = '', autoEls = [], manual = false;
  // pause and resume (shell.js freezes this page's timers while paused, so also on the class change), and a recogniser that ended without telling us
  const syncRec = () => { if (sess && !sess.done) { if (active()) startRec(); else if (recOn) stopRec(); } };
  new MutationObserver(syncRec).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  function scan() {
    syncRec();
    if (manual) return;
    const els = OFF || pure() ? [] : [...document.querySelectorAll(SEL)].filter((e) => !e.parentElement?.closest('button') && !e.closest('.u2')).filter(visible);   // not the text inside a button (subs.js marks it), not the settings panel's Voice row
    if (!els.length) { if (autoSig) { autoSig = ''; autoEls = []; end(); } return; }
    const sig = els.map((e) => e.dataset.voice || [...e.querySelectorAll(':scope > b:not(.one), :scope > span:not(.one)')].map((x) => x.textContent).join('/') || e.textContent).join('|');
    if (sig !== autoSig) {
      autoSig = sig; autoEls = els;
      begin({ phrases: els.map(phrasesOf), single: els.length === 1, lenient: true, anchor: () => autoEls.filter((e) => e.isConnected), onHit: (i) => { if (els[i]) press(els[i]); autoSig = ''; } });   // autoSig: controls that stay on screen (Left / Right, valves) keep listening for the next word
      if (sess) { sess.els = els; sess.strict = els.some((e) => e.matches('[data-voice-strict]')); }
    } else if (pill?.isConnected) place(autoEls);
  }
  setInterval(scan, 250);
  addEventListener('moheat:playmode', () => { if (pure()) { autoSig = ''; autoEls = []; end(); } });   // switched to pure listening: stop listening at once
  addEventListener('moheat:sublang', () => { if (rec && recOn && rec.lang !== LANG()) stopRec(); /* onend restarts in the new language */ if (sess) idle(); });
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
  const API = {
    supported: !!SR && !OFF, micOff,
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
  window.MoHeatVoice = Object.defineProperties(window.MoHeatVoice || {}, Object.getOwnPropertyDescriptors(API));
})();
