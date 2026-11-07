// Demo switcher for the full demo pages (all MoHeat Evo demos load this). Adds a "Demos" panel and ‹ › buttons to the top bar.
// Hidden in ?embed=1 (site menu) and ?cover=1 (cover export) — the bar is hidden there anyway. Add new demos to DEMOS.
(() => {
  const DEMOS = [   // folders: demos/<cat>/<dir>/ ; groups (in this order): 0 all ages · 1 healing · 2 for him · 3 for her · 4 Nobunaga × Suntory
    { cat: 'all-ages', dir: 'Demo1_SnowFoxfire', ja: '雪と狐火のひそひそ話', en: 'Whispers of Snow and Flame', group: 0 },
    { cat: 'all-ages', dir: 'Demo2_FanMeeting', ja: 'キミだけのスペシャルファンミーティング', en: 'Your Special Fan Meeting', group: 0 },
    { cat: 'all-ages', dir: 'Demo3_ShiningSmileConcert', ja: '氷と炎の星光コンサート', en: 'Ice & Fire Concert', group: 0 },
    { cat: 'all-ages', dir: 'Demo4_SeasonsExpress', ja: '季節が暴走する魔法の列車', en: 'The Runaway Seasons Express', group: 0 },
    { cat: 'all-ages', dir: 'Demo10_CaveSpring', ja: '火をともして、ひみつの泉へ', en: 'Kindle the Fire, Find the Hidden Spring', group: 0 },
    { cat: 'healing', dir: 'Demo11_Naomi', ja: 'ナオミと、ふわふわの一日', en: 'A Fluffy Day with Naomi', group: 1 },
    { cat: 'healing', dir: 'Demo13_NaomiCam', ja: 'ナオミ、いまなにしてる？', en: "What's Naomi Up To? · Pet Cam", group: 1 },
    { cat: 'healing', dir: 'Demo15_FamilyCall', ja: 'もしもし、おばあちゃん？', en: 'Hello, Grandma? · A Call Home, Part 1', group: 1 },
    { cat: 'healing', dir: 'Demo16_FamilyCall2', ja: 'じいちゃんの、ゆきだるま', en: "Grandpa's Little Snowman · A Call Home, Part 2", group: 1 },
    { cat: 'for-men', dir: 'Demo14_LiveStream', ja: 'ミントの、ささやき配信', en: "Mint's Whisper Stream", group: 2 },
    { cat: 'for-men', dir: 'Demo17_CocoaStream', ja: 'ココアの、ほっこりカフェ配信', en: "Cocoa's Cozy Café Stream", group: 2 },
    { cat: 'for-men', dir: 'Demo18_HinataStream', ja: 'ひなたの、激辛チャレンジ配信', en: "Hinata's Super-Spicy Challenge", group: 2 },
    { cat: 'for-men', dir: 'Demo19_LunaStream', ja: 'ルナの、よふかし配信', en: "Luna's Late-Night Stream", group: 2 },
    { cat: 'for-women', dir: 'Demo12_LateCall', ja: 'もしもし、きこえる？', en: 'Can You Hear Me?', group: 3 },
    { cat: 'for-women', dir: 'Demo20_HinataHandshake', ja: 'あと10秒だけ、ね？', en: 'Just Ten More Seconds?', group: 3 },
    { cat: 'for-women', dir: 'Demo21_JinLounge', ja: '俺だけ見てろ', en: 'Look Only at Me', group: 3 },
    { cat: 'for-women', dir: 'Demo22_ShionRain', ja: '雨が止むまで', en: 'Until the Rain Stops', group: 3 },
    { cat: 'for-women', dir: 'Demo24_GakuCamp', ja: 'ガクの、焚き火キャンプ配信', en: "Gaku's Campfire Stream", group: 3 },
    { cat: 'nobunaga-suntory', dir: 'Demo5_GifuCastle', ja: '信長の岐阜城へようこそ', en: "Welcome to Nobunaga's Gifu Castle", group: 4, ep: 1 },
    { cat: 'nobunaga-suntory', dir: 'Demo6_FutureWhisky', ja: '未来の酒と、安土の夜', en: 'Future Whisky at Azuchi', group: 4, ep: 2 },
    { cat: 'nobunaga-suntory', dir: 'Demo7_KyotoIzakaya', ja: '信長と家康、京都の居酒屋へ', en: 'Two Warlords in a Kyoto Izakaya', group: 4, ep: 3 },
    { cat: 'nobunaga-suntory', dir: 'Demo8_YamazakiDistillery', ja: '信長と家康、山崎蒸溜所へ', en: 'Two Warlords at the Yamazaki Distillery', group: 4, ep: 4 },
    { cat: 'nobunaga-suntory', dir: 'Demo9_SengokuBanquet', ja: '安土最後の酒宴', en: 'The Last Banquet at Azuchi', group: 4, ep: 5 },
  ];
  // rights notes shown under each demo's cover credits (full pages only); the full list is the site's credits.html
  const HIST = 'Oda Nobunaga and Tokugawa Ieyasu are portrayed as fictional characters', ADULT = 'お酒は20歳になってから · 20+ only';
  const RIGHTS = {
    Demo1_SnowFoxfire: 'Art: ChatGPT (OpenAI) · original characters', Demo2_FanMeeting: 'Art: ChatGPT (OpenAI) · original character and song',
    Demo5_GifuCastle: `${HIST} · art: ChatGPT (OpenAI)`,
    Demo6_FutureWhisky: `${HIST} · Suntory, Yamazaki, Hibiki and Hakushu (names and bottle designs) are trademarks of Suntory Holdings Limited · ${ADULT}`,
    Demo7_KyotoIzakaya: `${HIST} · art: ChatGPT (OpenAI) · ${ADULT}`,
    Demo8_YamazakiDistillery: `${HIST} · Suntory and Yamazaki are trademarks of Suntory Holdings Limited · ${ADULT}`,
    Demo9_SengokuBanquet: `${HIST} · art: ChatGPT (OpenAI) · ${ADULT}`,
  };
  const GROUPS = ['全年齢 · All ages', '癒し · Healing', '男性向け · For him', '女性向け · For her', '信長シリーズ · Nobunaga Series'];   // numbers are the list order
  const qs = new URLSearchParams(location.search);
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
  @media (max-width:700px){.dnav .dn-label{display:none}.dn-panel{top:110px}.dn-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.dn-card b{font-size:12.5px}.dn-card small{display:none}}`;
  document.head.appendChild(css);

  const nav = document.createElement('nav'); nav.className = 'dnav'; nav.setAttribute('aria-label', 'Choose another demo');
  const prev = DEMOS[cur - 1], next = DEMOS[cur + 1];
  nav.innerHTML = `<a class="dn-step" href="${prev ? href(prev) : '#'}" title="${prev ? 'Previous: ' + prev.en : ''}" aria-label="Previous demo" ${prev ? '' : 'aria-disabled="true"'}>‹</a>`
    + `<button type="button" aria-expanded="false" aria-haspopup="true">☰ <span class="dn-label">Demos&nbsp;</span>${cur + 1} / ${DEMOS.length}</button>`
    + `<a class="dn-step" href="${next ? href(next) : '#'}" title="${next ? 'Next: ' + next.en : ''}" aria-label="Next demo" ${next ? '' : 'aria-disabled="true"'}>›</a>`;
  const panel = document.createElement('div'); panel.className = 'dn-panel'; panel.hidden = true;
  const span = (gi) => { const n = DEMOS.map((d, i) => (d.group === gi ? i + 1 : 0)).filter(Boolean); return gi < 4 ? (n.length > 1 ? ` · ${n[0]}–${n[n.length - 1]}` : ` · ${n[0]}`) : ''; };
  const count = (gi) => DEMOS.filter((d) => d.group === gi).length;   // level 1: category tabs (+ "all"); level 2: that category's demos
  panel.innerHTML = `<div class="dn-tabs" role="tablist"><button type="button" role="tab" data-g="all">すべて · All<i>${DEMOS.length}</i></button>`
    + GROUPS.map((g, gi) => `<button type="button" role="tab" data-g="${gi}">${g}<i>${count(gi)}</i></button>`).join('') + '</div>'
    + GROUPS.map((g, gi) => `<section data-g="${gi}"><h4>${g}${span(gi)}</h4><div class="dn-grid">` + DEMOS.map((d, i) => d.group !== gi ? '' :
    `<a class="dn-card${i === cur ? ' is-cur' : ''}" href="${href(d)}"><img src="${thumb(i)}" alt="" loading="lazy"><span><em>Demo ${i + 1}${d.ep ? ' · Ep ' + d.ep + ' / 5' : ''}${i === cur ? ' · now playing' : ''}</em><b>${d.ja}</b><small>${d.en}</small></span></a>`).join('') + '</div></section>').join('')
    + '<p class="dn-foot"><a href="../../../credits.html">Credits · 権利表記</a> · voices, art, music, trademarks · © 2026 MoHeat Evo</p>';
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
