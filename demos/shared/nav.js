// Demo switcher for the full demo pages (all MoHeat Evo demos load this). Adds a "Demos" panel and ‹ › buttons to the top bar.
// Hidden in ?embed=1 (site menu) and ?cover=1 (cover export) — the bar is hidden there anyway. Add new demos to DEMOS.
(() => {
  const DEMOS = [   // folders: demos/<cat>/<dir>/ ; groups (in this order): 0 all ages · 1 healing · 2 for him · 3 for her · 4 Nobunaga × Suntory
    { cat: 'all-ages', dir: 'Demo01_SnowFoxfire', ja: '雪と狐火のひそひそ話', en: 'Whispers of Snow and Flame', zh: '雪与狐火的悄悄话', group: 0 },
    { cat: 'all-ages', dir: 'Demo02_FanMeeting', ja: 'キミだけのスペシャルファンミーティング', en: 'Your Special Fan Meeting', zh: '只属于你的特别见面会', group: 0 },
    { cat: 'all-ages', dir: 'Demo03_ShiningSmileConcert', ja: '氷と炎の星光コンサート', en: 'Ice & Fire Concert', zh: '冰与火的星光演唱会', group: 0 },
    { cat: 'all-ages', dir: 'Demo04_SeasonsExpress', ja: '季節が暴走する魔法の列車', en: 'The Runaway Seasons Express', zh: '四季失控的魔法列车', group: 0 },
    { cat: 'all-ages', dir: 'Demo28_SnowFoxLullaby', ja: 'ふたりの、こもりうた', en: 'A Lullaby for Two', zh: '两个人的摇篮曲', group: 0 },
    { cat: 'all-ages', dir: 'Demo10_CaveSpring', ja: '火をともして、ひみつの泉へ', en: 'Kindle the Fire, Find the Hidden Spring', zh: '点燃火光，寻找秘密之泉', group: 0 },
    { cat: 'healing', dir: 'Demo11_Naomi', ja: 'ナオミと、ふわふわの一日', en: 'A Fluffy Day with Naomi', zh: '和直美的毛茸茸一天', group: 1 },
    { cat: 'healing', dir: 'Demo13_NaomiCam', ja: 'ナオミ、いまなにしてる？', en: "What's Naomi Up To? · Pet Cam", zh: '直美，你在干嘛呀？', group: 1 },
    { cat: 'healing', dir: 'Demo26_BecomeNaomi', ja: 'ねこになった日', en: 'The Day I Became Naomi', zh: '变成猫咪的那一天', group: 1 },
    { cat: 'healing', dir: 'Demo15_FamilyCall', ja: 'もしもし、おばあちゃん？', en: 'Hello, Grandma? · A Call Home, Part 1', zh: '喂，奶奶吗？', group: 1 },
    { cat: 'healing', dir: 'Demo16_FamilyCall2', ja: 'じいちゃんの、ゆきだるま', en: "Grandpa's Little Snowman · A Call Home, Part 2", zh: '爷爷的小雪人', group: 1 },
    { cat: 'for-men', dir: 'Demo14_MintStream', ja: 'ミントの、ささやき配信', en: "Mint's Whisper Stream", zh: '薄荷的耳语直播', group: 2 },
    { cat: 'for-men', dir: 'Demo17_CocoaStream', ja: 'ココアの、ほっこりカフェ配信', en: "Cocoa's Cozy Café Stream", zh: '可可的暖心咖啡馆直播', group: 2 },
    { cat: 'for-men', dir: 'Demo18_HinataStream', ja: 'ひなたの、激辛チャレンジ配信', en: "Hinata's Super-Spicy Challenge", zh: '日向的超辣挑战直播', group: 2 },
    { cat: 'for-men', dir: 'Demo19_LunaStream', ja: 'ルナの、よふかし配信', en: "Luna's Late-Night Stream", zh: '露娜的深夜直播', group: 2 },
    { cat: 'for-men', dir: 'Demo25_HatsumodeDate', ja: 'はじめての、初詣デート', en: 'My First Hatsumode', zh: '第一次的新年参拜约会', group: 2 },
    { cat: 'for-women', dir: 'Demo12_LateCall', ja: 'もしもし、きこえる？', en: 'Can You Hear Me?', zh: '喂，听得到吗？', group: 3 },
    { cat: 'for-women', dir: 'Demo20_HinataHandshake', ja: 'あと10秒だけ、ね？', en: 'Just Ten More Seconds?', zh: '再多10秒，好吗？', group: 3 },
    { cat: 'for-women', dir: 'Demo21_JinLounge', ja: '俺だけ見てろ', en: 'Look Only at Me', zh: '只准看着我', group: 3 },
    { cat: 'for-women', dir: 'Demo22_ShionRain', ja: '雨が止むまで', en: 'Until the Rain Stops', zh: '直到雨停', group: 3 },
    { cat: 'for-women', dir: 'Demo24_GakuCamp', ja: 'ガクの、焚き火キャンプ配信', en: "Gaku's Campfire Stream", zh: '岳的篝火露营直播', group: 3 },
    { cat: 'nobunaga-suntory', dir: 'Demo05_GifuCastle', ja: '信長の岐阜城へようこそ', en: "Welcome to Nobunaga's Gifu Castle", zh: '欢迎来到信长的岐阜城', group: 4, ep: 1 },
    { cat: 'nobunaga-suntory', dir: 'Demo06_FutureWhisky', ja: '未来の酒と、安土の夜', en: 'Future Whisky at Azuchi', zh: '未来之酒与安土之夜', group: 4, ep: 2 },
    { cat: 'nobunaga-suntory', dir: 'Demo07_KyotoIzakaya', ja: '信長と家康、京都の居酒屋へ', en: 'Two Warlords in a Kyoto Izakaya', zh: '信长与家康，京都居酒屋之夜', group: 4, ep: 3 },
    { cat: 'nobunaga-suntory', dir: 'Demo08_YamazakiDistillery', ja: '信長と家康、山崎蒸溜所へ', en: 'Two Warlords at the Yamazaki Distillery', zh: '信长与家康，探访山崎蒸馏所', group: 4, ep: 4 },
    { cat: 'nobunaga-suntory', dir: 'Demo09_SengokuBanquet', ja: '安土最後の酒宴', en: 'The Last Banquet at Azuchi', zh: '安土最后的酒宴', group: 4, ep: 5 },
  ];
  // rights notes shown under each demo's cover credits (full pages only); the full list is the site's credits.html
  const HIST = 'Oda Nobunaga and Tokugawa Ieyasu are portrayed as fictional characters', ADULT = 'お酒は20歳になってから · 20+ only';
  const RIGHTS = {
    Demo01_SnowFoxfire: 'Art: ChatGPT (OpenAI) · original characters', Demo02_FanMeeting: 'Art: ChatGPT (OpenAI) · original character and song',
    Demo28_SnowFoxLullaby: 'Art: ChatGPT (OpenAI), from Whispers of Snow and Flame · original characters',
    Demo05_GifuCastle: `${HIST} · art: ChatGPT (OpenAI)`,
    Demo06_FutureWhisky: `${HIST} · Suntory, Yamazaki, Hibiki and Hakushu (names and bottle designs) are trademarks of Suntory Holdings Limited · ${ADULT}`,
    Demo07_KyotoIzakaya: `${HIST} · art: ChatGPT (OpenAI) · ${ADULT}`,
    Demo08_YamazakiDistillery: `${HIST} · Suntory and Yamazaki are trademarks of Suntory Holdings Limited · ${ADULT}`,
    Demo09_SengokuBanquet: `${HIST} · art: ChatGPT (OpenAI) · ${ADULT}`,
  };
  const GROUPS = ['全年齢 · All ages', '癒し · Healing', '男性向け · For him', '女性向け · For her', '信長シリーズ · Nobunaga Series'];   // numbers are the list order
  const qs = new URLSearchParams(location.search);
  { const me = document.currentScript?.src;   // subtitle language EN / 日本語 / 中文 (also in ?embed): shared/subs.js next to this file
    if (me && !window.MoHeatSub && !qs.has('cover') && !qs.has('render')) for (const f of ['subs.js?v=13', 'fullscreen.js?v=3', 'guide.js?v=4', 'thermocheck.js?v=1']) {   // display language + ⛶ fullscreen + first-visit guide + 🌡 thermal check (tools/web/bump.py updates these numbers)
      const s = document.createElement('script'); s.src = me.replace(/nav\.js(\?.*)?$/, f); s.async = false; document.head.appendChild(s); } }
  if (qs.has('embed') || qs.has('cover') || qs.has('render')) return;
  // one screen: measure the bar and what sits below the stage, series.css sizes the stage and the side panel from these
  if (!('serial' in navigator)) document.documentElement.classList.add('no-serial');   // phones: no Web Serial → series.css hides the device controls
  const root = document.documentElement, fit = () => {
    const bar = document.querySelector('header.bar'), lay = document.querySelector('.layout'), stage = document.querySelector('.stage-col .stage') || document.querySelector('.stage');
    if (!lay || !stage) return;
    root.classList.add('fit');   // first, so the column is no longer stretched to the side panel's height when measured
    const col = stage.closest('.stage-col') || stage.parentElement, cs = getComputedStyle(lay);
    root.style.setProperty('--fit-bar', `${bar ? bar.offsetHeight : 0}px`);
    root.style.setProperty('--fit-pad', `${parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)}px`);
    root.style.setProperty('--fit-below', `${Math.max(0, col.getBoundingClientRect().height - stage.getBoundingClientRect().height)}px`);
  };
  fit(); addEventListener('resize', fit); addEventListener('load', fit); setTimeout(fit, 600);
  { const dir = (DEMOS.find((d) => location.pathname.includes(`/${d.dir}/`)) || {}).dir, cr = document.getElementById('credits');
    if (cr && RIGHTS[dir] && !document.querySelector('.dn-rights')) { const r = document.createElement('p'); r.className = 'draft dn-rights'; r.textContent = RIGHTS[dir]; cr.after(r); } }
  const bar = document.querySelector('header.bar'); if (!bar) return;
  const cur = DEMOS.findIndex((d) => location.pathname.includes(`/${d.dir}/`));
  const href = (d) => `../../${d.cat}/${d.dir}/`, thumb = (i) => `../../../assets/images/demos/${DEMOS[i].dir}.jpg`;   // pages live at demos/<cat>/<dir>/   // named by folder, so inserting a demo renames nothing

  const css = document.createElement('style');
  css.textContent = `
  .dnav{display:flex;align-items:center;gap:6px;margin-left:6px}
  .dnav a.dn-step,.dnav button{display:inline-flex;align-items:center;justify-content:center;gap:4px;height:32px;min-width:32px;padding:0 10px;border-radius:999px;border:1px solid rgba(255,255,255,.16);
    background:rgba(255,255,255,.05);color:inherit;font:600 13px/1 Inter,system-ui,sans-serif;text-decoration:none;cursor:pointer;white-space:nowrap}
  .dnav a.dn-step{padding:0;width:32px;font-size:17px}
  .dnav a.dn-step[aria-disabled=true]{opacity:.3;pointer-events:none}
  .dnav a.dn-step:hover,.dnav button:hover,.dnav button[aria-expanded=true]{border-color:#ff9a7a;background:rgba(255,140,110,.14)}
  .dn-panel{position:fixed;left:50%;top:62px;transform:translateX(-50%);width:min(980px,calc(100vw - 24px));max-height:calc(100vh - 80px);overflow:auto;z-index:50;
    padding:16px;border-radius:18px;background:rgba(20,13,16,.97);border:1px solid rgba(255,255,255,.12);box-shadow:0 24px 70px rgba(0,0,0,.6);color:#f4ece8}
  .dn-panel[hidden]{display:none}
  .dn-panel h4{margin:6px 4px 10px;font:800 11px/1 Inter,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#ffab93}
  .dn-panel section+section h4{margin-top:18px}
  .dn-tabs{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,.08)}
  .dn-tabs button{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.05);color:#cbbfb8;font:700 12px/1 Inter,"Noto Sans JP",sans-serif;cursor:pointer}
  .dn-tabs button i{font-style:normal;font-size:11px;opacity:.65}
  .dn-tabs button:hover{color:#fff;border-color:rgba(255,255,255,.35)}
  .dn-tabs button[aria-selected=true]{border-color:#ff9a7a;background:rgba(255,140,110,.16);color:#ffd2c4}
  .dn-panel section[hidden]{display:none}
  .dn-foot{margin:14px 4px 2px;padding-top:10px;border-top:1px solid rgba(255,255,255,.08);font:500 12px/1.4 Inter,sans-serif;color:#a99e93}.dn-foot a{color:#ffc4b2}
  .dn-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}
  .dn-card{display:block;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:inherit;text-decoration:none;transition:transform .15s,border-color .15s}
  .dn-card:hover{transform:translateY(-2px);border-color:rgba(255,255,255,.35)}
  .dn-card.is-cur{border-color:#ff9a7a;box-shadow:0 0 0 1px #ff9a7a inset}
  .dn-card img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}
  .dn-card span{display:block;padding:8px 10px 10px}
  .dn-card em{display:block;font:800 9.5px/1.2 Inter,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#a99e93;font-style:normal}
  .dn-card.is-cur em{color:#ffab93}
  .dn-card b{display:block;margin-top:4px;font:700 14px/1.3 "Noto Sans JP",sans-serif}
  .dn-card small{display:block;margin-top:2px;font:500 12px/1.3 Inter,sans-serif;color:#cbbfb8}
  .dn-card small.dn-now{color:#ffd58a;font-weight:600}   /* under the title, so every card's title lines up */
  @media (max-width:700px){.dnav .dn-label{display:none}.dn-panel{top:110px}.dn-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.dn-card b{font-size:12.5px}.dn-card small{display:none}}`;
  document.head.appendChild(css);

  // the switcher shows ONE language, the display language of shared/subs.js (user: it showed Japanese + small English)
  const LG = () => window.MoHeatSub?.lang || (() => { try { return sessionStorage.getItem('moheat.sublang'); } catch { return null; } })() || 'en';
  const pickT = (o) => { const l = LG(); return o[l] || (l === 'zh-Hant' && o.zh) || o.en; };
  const TITLE = (d) => pickT({ ja: d.ja, en: d.en, zh: d.zh });
  const GZH = ['全年龄', '治愈', '男性向', '女性向', '信长系列'];
  const GT = (gi) => { const [ja, en] = GROUPS[gi].split(' · '); return pickT({ ja, en, zh: GZH[gi] }); };
  const W = { all: { ja: 'すべて', en: 'All', zh: '全部' }, now: { ja: '▶ 再生中', en: '▶ Now playing', zh: '▶ 正在播放' }, ep: { ja: '第', en: 'Ep ', zh: '第' },
    demos: { ja: 'デモ', en: 'Demos', zh: '演示' }, credits: { ja: '権利表記', en: 'Credits', zh: '版权与署名' },
    rights: { ja: '声・イラスト・音楽・商標', en: 'voices, art, music, trademarks', zh: '配音、美术、音乐、商标' }, prev: { ja: '前へ', en: 'Previous', zh: '上一个' }, next: { ja: '次へ', en: 'Next', zh: '下一个' } };
  const nav = document.createElement('nav'); nav.className = 'dnav'; nav.setAttribute('aria-label', 'Choose another demo');
  const prev = DEMOS[cur - 1], next = DEMOS[cur + 1];
  nav.innerHTML = `<a class="dn-step" href="${prev ? href(prev) : '#'}" title="${prev ? 'Previous: ' + prev.en : ''}" aria-label="Previous demo" ${prev ? '' : 'aria-disabled="true"'}>‹</a>`
    + `<button type="button" aria-expanded="false" aria-haspopup="true">☰ <span class="dn-label" data-w="demos">Demos</span>&nbsp;${cur + 1} / ${DEMOS.length}</button>`
    + `<a class="dn-step" href="${next ? href(next) : '#'}" title="${next ? 'Next: ' + next.en : ''}" aria-label="Next demo" ${next ? '' : 'aria-disabled="true"'}>›</a>`;
  const panel = document.createElement('div'); panel.className = 'dn-panel'; panel.hidden = true;
  const span = (gi) => { const n = DEMOS.map((d, i) => (d.group === gi ? i + 1 : 0)).filter(Boolean); return gi < 4 ? (n.length > 1 ? ` · ${n[0]}–${n[n.length - 1]}` : ` · ${n[0]}`) : ''; };
  const count = (gi) => DEMOS.filter((d) => d.group === gi).length;   // level 1: category tabs (+ "all"); level 2: that category's demos
  panel.innerHTML = `<div class="dn-tabs" role="tablist"><button type="button" role="tab" data-g="all"><span data-w="all"></span><i>${DEMOS.length}</i></button>`
    + GROUPS.map((g, gi) => `<button type="button" role="tab" data-g="${gi}"><span data-gt="${gi}"></span><i>${count(gi)}</i></button>`).join('') + '</div>'
    + GROUPS.map((g, gi) => `<section data-g="${gi}"><h4><span data-gt="${gi}"></span>${span(gi)}</h4><div class="dn-grid">` + DEMOS.map((d, i) => d.group !== gi ? '' :
    `<a class="dn-card${i === cur ? ' is-cur' : ''}" href="${href(d)}"><img src="${thumb(i)}" alt="" loading="lazy"><span><em>Demo ${i + 1}${d.ep ? ` · <span data-ep="${d.ep}"></span>` : ''}</em><b data-d="${i}"></b>${i === cur ? '<small class="dn-now" data-w="now"></small>' : ''}</span></a>`).join('') + '</div></section>').join('')
    + '<p class="dn-foot"><a href="../../../credits.html" data-w="credits"></a> · <span data-w="rights"></span> · © 2026 MoHeat Evo</p>';
  function paint() {   // texts in the display language; again whenever it changes
    for (const r of [nav, panel]) {
      r.querySelectorAll('[data-w]').forEach((e) => { e.textContent = pickT(W[e.dataset.w]); });
      r.querySelectorAll('[data-gt]').forEach((e) => { e.textContent = GT(+e.dataset.gt); });
      r.querySelectorAll('[data-d]').forEach((e) => { e.textContent = TITLE(DEMOS[+e.dataset.d]); });
      r.querySelectorAll('[data-ep]').forEach((e) => { const l = LG(), n = e.dataset.ep; e.textContent = l === 'en' ? `Ep ${n} / 5` : l === 'ja' ? `第${n}話 / 全5話` : `第${n}集 / 共5集`; });
    }
    const st = nav.querySelectorAll('.dn-step');
    if (prev) st[0].title = `${pickT(W.prev)}: ${TITLE(prev)}`; if (next) st[1].title = `${pickT(W.next)}: ${TITLE(next)}`;
  }
  paint(); addEventListener('moheat:sublang', paint);
  const show = (g) => { panel.querySelectorAll('.dn-tabs button').forEach((b) => b.setAttribute('aria-selected', b.dataset.g === String(g))); panel.querySelectorAll('section').forEach((x) => { x.hidden = g !== 'all' && x.dataset.g !== String(g); }); };
  panel.querySelector('.dn-tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { e.stopPropagation(); show(b.dataset.g); } });
  show(cur >= 0 ? DEMOS[cur].group : 'all');
  const brand = bar.querySelector('.brand');
  (brand ? brand.after(nav) : bar.prepend(nav)); document.body.appendChild(panel);
  const btn = nav.querySelector('button');
  const open = (v) => { panel.hidden = !v; btn.setAttribute('aria-expanded', String(v)); };
  btn.addEventListener('click', (e) => { e.stopPropagation(); open(panel.hidden); });
  document.addEventListener('click', (e) => { if (!panel.hidden && !panel.contains(e.target)) open(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') open(false); });
  if (location.hash === '#demos') open(true);
})();
