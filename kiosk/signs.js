// MoHeat Evo kiosk signs (user 2026-11-09, docs/kiosk/REQUIREMENTS.md §12): "touch OK" while staff are at the booth, "please do not
// touch" while it is unattended, and "photos OK" (or "no photos" where the venue forbids it). One component for every place:
//   kiosk/index.html  — a small corner badge on the welcome screen (visitor's language) + a bigger EN · 日本語 badge on the idle carousel,
//                       and the full "staff will be back soon · please do not touch" overlay while unattended (app.js)
//   kiosk/queue.html  — big signs next to the QR (live view) and inside the QR badge (promo video), EN + 日本語 for bystanders
//   kiosk/sign.html   — the printable stand-up sign (A4 / A5; both states, EN + 日本語 + 中文)
// Staff state + sign settings live in the kiosk settings (MoHeatKiosk.setCfg → localStorage 'moheat.kiosk.cfg', so the queue window
// gets a 'storage' event) and are also announced on the BroadcastChannel ({ t: 'staff', attended }). Attended / unattended periods are
// logged per day in 'moheat.kiosk.presence' (anonymous, this browser only; exported with the kiosk stats). Text = data (TX) below.
(() => {
  const K = window.MoHeatKiosk;
  // ---------------------------------------------------------------- text (EN default · 日本語 · 中文 · 한국어 slot); \u200b = where a CJK line may break (signs.css: keep-all)
  const TX = {
    touch: { en: 'Please try it!', ja: 'どうぞ体験して\u200bください', zh: '欢迎体验', ko: '체험해 보세요' },
    touchS: { en: 'Staff are here to help', ja: 'スタッフが\u200bご案内します', zh: '工作人员\u200b会为您引导', ko: '직원이 안내해 드립니다' },
    notouch: { en: 'Please do not touch', ja: 'お手を触れないで\u200bください', zh: '请勿触摸', ko: '만지지 마세요' },
    notouchS: { en: 'Staff will be back soon', ja: 'スタッフは\u200bまもなく戻ります', zh: '工作人员\u200b马上回来', ko: '직원이 곧 돌아옵니다' },
    photo: { en: 'Photos OK', ja: '撮影OK', zh: '欢迎拍照', ko: '사진 촬영 가능' },
    photoS: { en: 'Feel free to take photos', ja: '写真・動画を\u200b撮ってもかまいません', zh: '可以拍照、\u200b录像', ko: '자유롭게 촬영하세요' },
    nophoto: { en: 'No photos', ja: '撮影は\u200bご遠慮ください', zh: '请勿拍照', ko: '촬영 금지' },
    nophotoS: { en: 'Please do not take photos or videos', ja: '写真・動画の撮影は\u200bご遠慮ください', zh: '请勿拍照\u200b或录像', ko: '사진·동영상 촬영을 삼가 주세요' },
  };
  const tx = (k, l) => (TX[k] && (TX[k][l] || TX[k].en)) || '';
  // ---------------------------------------------------------------- settings (defaults; staff panel → "Signs")
  const DEF = { attended: true, signTouch: true, signPhoto: 'ok', signWelcome: true, signAttract: true, signQueue: true, signPos: 'tr' };
  const cfg = () => { const c = K ? K.cfg() : {}; const o = {}; for (const k in DEF) o[k] = c[k] ?? DEF[k]; return o; };
  const attended = () => cfg().attended !== false;
  // ---------------------------------------------------------------- pictograms (standard style: green disc = allowed, red ring + slash = prohibited)
  const GREEN = '#1e9e57', RED = '#d7263d', INK = '#17121f';
  const HAND = (fg, sep) => `<g fill="${fg}"><rect x="40" y="70" width="26" height="15" rx="3"/><rect x="-4.25" y="-27" width="8.5" height="30" rx="4.25" transform="translate(39 68) rotate(-38)"/>`
    + `<g stroke="${sep}" stroke-width="1.8"><rect x="35" y="24" width="8.5" height="34" rx="4.25"/><rect x="44.5" y="18.5" width="8.5" height="39" rx="4.25"/><rect x="54" y="21.5" width="8.5" height="36" rx="4.25"/><rect x="63.5" y="30" width="7.5" height="28" rx="3.75"/></g>`
    + `<rect x="35" y="44" width="36" height="31" rx="11"/></g>`;
  const CAMERA = (fg, bg) => `<g><path fill="${fg}" d="M38 35 l5 -8 h14 l5 8z"/><rect fill="${fg}" x="19" y="34" width="62" height="41" rx="8"/><circle fill="${bg}" cx="50" cy="55" r="13"/><circle fill="${fg}" cx="50" cy="55" r="7.5"/><rect fill="${bg}" x="67" y="39" width="8" height="4.5" rx="2"/></g>`;
  const ok = (sym) => `<circle cx="50" cy="50" r="48" fill="${GREEN}"/><g transform="translate(50 52) scale(.92) translate(-50 -52)">${sym}</g>`;
  const no = (sym) => `<circle cx="50" cy="50" r="44" fill="#fff" stroke="${RED}" stroke-width="9"/><g transform="translate(50 52) scale(.7) translate(-50 -52)">${sym}</g><path d="M20.5 20.5 L79.5 79.5" stroke="${RED}" stroke-width="9" stroke-linecap="butt"/>`;
  const ICON = { touch: ok(HAND('#fff', GREEN)), notouch: no(HAND(INK, '#fff')), photo: ok(CAMERA('#fff', GREEN)), nophoto: no(CAMERA(INK, '#fff')) };
  const icon = (kind) => `<svg class="ms-ic" viewBox="0 0 100 100" role="img" aria-label="${tx(kind, 'en')}">${ICON[kind]}</svg>`;
  // which signs show now: touch OK / do not touch (staff state) + the photo sign (ok / no / hidden)
  const kinds = (c = cfg(), state = c.attended !== false) => [c.signTouch ? (state ? 'touch' : 'notouch') : null, c.signPhoto === 'ok' ? 'photo' : c.signPhoto === 'no' ? 'nophoto' : null].filter(Boolean);
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  // one sign: pictogram + title (+ subline) in each of langs (e.g. ['en'] for the visitor, ['en', 'ja'] for bystanders)
  const sign = (kind, langs, sub = true) => `<div class="ms-sign" data-k="${kind}">${icon(kind)}<div class="ms-tx">${langs.map((l) => `<p lang="${l}"><b>${esc(tx(kind, l))}</b>${sub ? `<small>${esc(tx(kind + 'S', l))}</small>` : ''}</p>`).join('')}</div></div>`;
  // fill a container with the current signs; place = 'Welcome' | 'Attract' | 'Queue' (its show / hide setting), returns whether it shows
  function render(el, { langs = ['en'], sub = true, place = null, state } = {}) {
    if (!el) return false; const c = cfg(), list = kinds(c, state ?? c.attended !== false);
    const show = !!list.length && (!place || c['sign' + place] !== false);
    const html = list.map((k) => sign(k, langs, sub)).join(''), key = `${html}|${c.signPos}`;
    if (el.dataset.msKey !== key) { el.dataset.msKey = key; el.innerHTML = html; }
    el.dataset.pos = c.signPos; el.dataset.state = c.attended !== false ? 'on' : 'off'; el.hidden = !show; return show;
  }
  // the full "unattended" screen: big do-not-touch + "staff will be back soon" in every language, the photo sign small below
  function away(el, langs = ['en', 'ja', 'zh']) {
    if (!el) return; const c = cfg(), ph = c.signPhoto === 'ok' ? 'photo' : c.signPhoto === 'no' ? 'nophoto' : null;
    const html = `<div class="ms-away-in">${icon('notouch')}<div class="ms-away-tx">${langs.map((l) => `<p lang="${l}"><b>${esc(tx('notouch', l))}</b><small>${esc(tx('notouchS', l))}</small></p>`).join('')}</div>`
      + (ph ? `<div class="ms-away-ph">${sign(ph, langs.slice(0, 2), false)}</div>` : '') + '</div>';
    if (el.dataset.msKey !== html) { el.dataset.msKey = html; el.innerHTML = html; }
  }

  // ---------------------------------------------------------------- attended / unattended periods (anonymous, per day, this browser only)
  const LK = 'moheat.kiosk.presence';
  const day = (t) => (K ? K.day(new Date(t)) : new Date(t).toISOString().slice(0, 10));
  const hm = (t) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const load = () => { try { const v = JSON.parse(localStorage.getItem(LK)); return v && v.days ? v : { v: 1, cur: null, seen: 0, days: {} }; } catch { return { v: 1, cur: null, seen: 0, days: {} }; } };
  const save = (v) => { try { localStorage.setItem(LK, JSON.stringify(v)); } catch {} };
  const closeCur = (v, end) => { const c = v.cur; if (!c) return; end = Math.max(c.t0, end);
    const d = v.days[day(c.t0)] ||= { attended: 0, unattended: 0, periods: [] }; d[c.st] += end - c.t0;
    d.periods.push({ st: c.st, from: hm(c.t0), to: day(end) === day(c.t0) ? hm(end) : `${day(end)} ${hm(end)}`, min: Math.round((end - c.t0) / 6000) / 10 });
    if (d.periods.length > 300) d.periods.shift(); v.cur = null; };
  // the kiosk page (window 1) keeps the log: ensure() on load and every minute; a period still open from a closed browser ends at its last heartbeat
  function ensure() {
    const v = load(), now = Date.now(), st = attended() ? 'attended' : 'unattended';
    if (v.cur && v.seen && now - v.seen > 3 * 60000) closeCur(v, v.seen);
    if (v.cur && v.cur.st !== st) closeCur(v, now);
    if (!v.cur) v.cur = { st, t0: now };
    v.seen = now; save(v);
  }
  function setAttended(on) {
    on = !!on; if (on === attended()) return; const v = load(); closeCur(v, Date.now()); save(v);
    K.setCfg({ attended: on }); ensure(); K.post({ t: 'staff', attended: on });
  }
  // totals for 'today' or 'all' (ms, the open period counted up to now)
  function summary(which = 'today') {
    const v = load(), out = { attended: 0, unattended: 0, changes: 0 }, today = day(Date.now());
    for (const [d, x] of Object.entries(v.days)) if (which === 'all' || d === today) { out.attended += x.attended; out.unattended += x.unattended; out.changes += x.periods.length; }
    if (v.cur && (which === 'all' || day(v.cur.t0) === today)) out[v.cur.st] += Date.now() - v.cur.t0;
    return out;
  }
  const dur = (ms) => { const m = Math.round(ms / 60000); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; };
  const csv = () => { const v = load(), out = ['', 'staff presence periods (attended = staff at the booth, touch OK; unattended = do not touch)', 'date,state,from,to,minutes'];
    for (const [d, x] of Object.entries(v.days).sort()) for (const p of x.periods) out.push([d, p.st, p.from, p.to, p.min].join(','));
    if (v.cur) out.push([day(v.cur.t0), v.cur.st, hm(v.cur.t0), '(now)', Math.round((Date.now() - v.cur.t0) / 6000) / 10].join(','));
    return out.join('\n') + '\n'; };

  window.MoHeatSigns = { TX, tx, DEF, cfg, attended, setAttended, kinds, icon, sign, render, away, ensure, summary, dur, csv, log: load };
})();
