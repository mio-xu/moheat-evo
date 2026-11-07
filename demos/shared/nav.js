// Demo switcher for the full demo pages (all MoHeat Evo demos load this). Adds a "Demos" panel and ‹ › buttons to the top bar.
// Hidden in ?embed=1 (site menu) and ?cover=1 (cover export) — the bar is hidden there anyway. Add new demos to DEMOS.
(() => {
  const DEMOS = [
    { dir: 'Demo1_SnowFoxfire', ja: '雪と狐火のひそひそ話', en: 'Whispers of Snow and Flame', group: 0 },
    { dir: 'Demo2_FanMeeting', ja: 'キミだけのスペシャルファンミーティング', en: 'Your Special Fan Meeting', group: 0 },
    { dir: 'Demo3_ShiningSmileConcert', ja: '氷と炎の星光コンサート', en: 'Ice & Fire Concert', group: 0 },
    { dir: 'Demo4_SeasonsExpress', ja: '季節が暴走する魔法の列車', en: 'The Runaway Seasons Express', group: 0 },
    { dir: 'Demo10_CaveSpring', ja: '火をともして、ひみつの泉へ', en: 'Kindle the Fire, Find the Hidden Spring', group: 0 },
    { dir: 'Demo11_Naomi', ja: 'ナオミと、ふわふわの一日', en: 'A Fluffy Day with Naomi', group: 0 },
    { dir: 'Demo12_LateCall', ja: 'もしもし、きこえる？', en: 'Can You Hear Me?', group: 0 },
    { dir: 'Demo13_NaomiCam', ja: 'ナオミ、いまなにしてる？', en: "What's Naomi Up To? · Pet Cam", group: 0 },
    { dir: 'Demo5_GifuCastle', ja: '信長の岐阜城へようこそ', en: "Welcome to Nobunaga's Gifu Castle", group: 1, ep: 1 },
    { dir: 'Demo6_FutureWhisky', ja: '未来の酒と、安土の夜', en: 'Future Whisky at Azuchi', group: 1, ep: 2 },
    { dir: 'Demo7_KyotoIzakaya', ja: '信長と家康、京都の居酒屋へ', en: 'Two Warlords in a Kyoto Izakaya', group: 1, ep: 3 },
    { dir: 'Demo8_YamazakiDistillery', ja: '信長と家康、山崎蒸溜所へ', en: 'Two Warlords at the Yamazaki Distillery', group: 1, ep: 4 },
    { dir: 'Demo9_SengokuBanquet', ja: '安土最後の酒宴', en: 'The Last Banquet at Azuchi', group: 1, ep: 5 },
  ];
  const GROUPS = ['Short stories', '信長シリーズ · Nobunaga Series'];   // numbers are the list order: insert a demo anywhere in DEMOS
  const qs = new URLSearchParams(location.search);
  if (qs.has('embed') || qs.has('cover') || qs.has('render')) return;
  const bar = document.querySelector('header.bar'); if (!bar) return;
  const cur = DEMOS.findIndex((d) => location.pathname.includes(`/${d.dir}/`));
  const href = (d) => `../${d.dir}/`, thumb = (i) => `../../assets/images/demos/${DEMOS[i].dir}.jpg`;   // named by folder, so inserting a demo renames nothing

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
  .dn-panel h4:not(:first-child){margin-top:18px}
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
  const span = (gi) => { const n = DEMOS.map((d, i) => (d.group === gi ? i + 1 : 0)).filter(Boolean); return gi === 0 ? ` · ${n[0]}–${n[n.length - 1]}` : ''; };
  panel.innerHTML = GROUPS.map((g, gi) => `<h4>${g}${span(gi)}</h4><div class="dn-grid">` + DEMOS.map((d, i) => d.group !== gi ? '' :
    `<a class="dn-card${i === cur ? ' is-cur' : ''}" href="${href(d)}"><img src="${thumb(i)}" alt="" loading="lazy"><span><em>Demo ${i + 1}${d.ep ? ' · Ep ' + d.ep + ' / 5' : ''}${i === cur ? ' · now playing' : ''}</em><b>${d.ja}</b><small>${d.en}</small></span></a>`).join('') + '</div>').join('');
  const brand = bar.querySelector('.brand');
  (brand ? brand.after(nav) : bar.prepend(nav)); document.body.appendChild(panel);
  const btn = nav.querySelector('button');
  const open = (v) => { panel.hidden = !v; btn.setAttribute('aria-expanded', String(v)); };
  btn.addEventListener('click', (e) => { e.stopPropagation(); open(panel.hidden); });
  document.addEventListener('click', (e) => { if (!panel.hidden && !panel.contains(e.target)) open(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') open(false); });
  if (location.hash === '#demos') open(true);
})();
