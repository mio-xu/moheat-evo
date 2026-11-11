const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); } });
},{threshold:.12});
revealEls.forEach(el=>io.observe(el));

// Interactive demo: the menu on the left swaps the embedded player (demos/<name>/?embed=1). Demo 1 is the default.
// Numbers come from the menu order (insert a demo anywhere: everything after it renumbers itself); group labels get their range.
(() => {
  const items = [...document.querySelectorAll('.td-item')];
  items.forEach((item, i) => { const em = item.querySelector('.td-item-text em'); if (em) em.textContent = `Demo ${i + 1} · ${em.textContent}`; });
  const count = document.querySelector('.td-count'); if (count) count.textContent = `${items.length} demos`;
  document.querySelectorAll('.td-group').forEach((g) => {
    let n = g.nextElementSibling; const mine = [];
    while (n && !n.classList.contains('td-group')) { if (n.classList.contains('td-item')) mine.push(items.indexOf(n) + 1); n = n.nextElementSibling; }
    if (!mine.length) return;
    g.textContent = g.dataset.unit ? `${g.dataset.name} · ${mine.length} ${g.dataset.unit}` : (mine.length > 1 ? `${g.dataset.name} · ${mine[0]}–${mine[mine.length - 1]}` : `${g.dataset.name} · ${mine[0]}`);
  });
})();
// Two-level menu: level 1 = category tabs built from the .td-group headings (always visible), level 2 = the demos of the
// chosen category (the one holding the playing demo at first). The headings themselves stay in the HTML as the source of truth.
const tdGroups = [...document.querySelectorAll('.td-group')].map((g, gi) => {
  const items = []; let n = g.nextElementSibling;
  while (n && !n.classList.contains('td-group')) { if (n.classList.contains('td-item')) { items.push(n); n.dataset.g = gi; } n = n.nextElementSibling; }
  g.setAttribute('role', 'button'); g.tabIndex = 0;
  return { g, items, label: g.dataset.name };
});
const tdCats = document.createElement('div'); tdCats.className = 'td-cats'; tdCats.setAttribute('role', 'tablist');
tdCats.innerHTML = tdGroups.map((x, gi) => `<button type="button" role="tab" data-g="${gi}">${x.label}<i>${x.items.length}</i></button>`).join('');
document.querySelector('.td-menu-top')?.after(tdCats);
const tdPlace = () => { const m = document.querySelector('.td-menu'); if (m && getComputedStyle(m).position === 'absolute') m.style.top = `${tdCats.offsetTop + tdCats.offsetHeight}px`; else if (m) m.style.top = ''; };
addEventListener('resize', tdPlace);
const tdOpen = (gi, scroll = true) => {
  tdGroups.forEach((x, k) => {
    const on = k === gi; x.g.classList.toggle('is-open', on); x.g.setAttribute('aria-expanded', on);
    x.items.forEach((it) => it.classList.toggle('is-folded', !on));
  });
  tdCats.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', +b.dataset.g === gi));
  const menu = document.querySelector('.td-menu');
  if (scroll && menu) menu.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  setTimeout(() => { try { tdUpdateArrows(); } catch (e) { /* defined below */ } }, 50);
};
tdGroups.forEach((x, gi) => {
  x.g.addEventListener('click', () => tdOpen(gi));
  x.g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tdOpen(gi); } });
});
tdCats.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) tdOpen(+b.dataset.g); });
tdPlace(); tdOpen(+(document.querySelector('.td-item.is-active')?.dataset.g || 0), false);
const demoFrame = document.getElementById('demoFrame');
const demoOpen = document.getElementById('demoOpen');
document.querySelectorAll('.td-item').forEach((item) => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.td-item').forEach((x) => x.classList.toggle('is-active', x === item));
    demoFrame.src = `${item.dataset.demo}?embed=1&autoplay=1`;   // chosen by a click → starts playing right away
    demoOpen.href = item.dataset.demo;
    item.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  });
});
// menu scroll buttons: vertical list on desktop, horizontal strip on tablet / phone
const tdMenu = document.querySelector('.td-menu');
const tdArrows = document.querySelectorAll('.td-scroll');
const tdHorizontal = () => getComputedStyle(tdMenu).flexDirection === 'row';
const tdUpdateArrows = () => {
  const h = tdHorizontal(), pos = h ? tdMenu.scrollLeft : tdMenu.scrollTop;
  const max = h ? tdMenu.scrollWidth - tdMenu.clientWidth : tdMenu.scrollHeight - tdMenu.clientHeight;
  tdArrows[0].disabled = pos <= 2; tdArrows[1].disabled = pos >= max - 2;
};
tdArrows.forEach((b) => b.addEventListener('click', () => {
  const h = tdHorizontal(), step = (h ? tdMenu.clientWidth : tdMenu.clientHeight) * .8 * (+b.dataset.dir);
  tdMenu.scrollBy(h ? { left: step, behavior: 'smooth' } : { top: step, behavior: 'smooth' });
}));
tdMenu.addEventListener('scroll', tdUpdateArrows, { passive: true });
addEventListener('resize', tdUpdateArrows); tdUpdateArrows();

// Live device-output diagram: reads the embedded player's own thermal meters (same origin), i.e. exactly what is sent to the headset.
const WARM = '255,99,69', COOL = '96,178,255';
const outEars = ['L', 'R'].map((s) => {
  const el = document.querySelector(`.td-ear[data-side="${s}"]`);
  return { s, value: el.querySelector('b'), meter: el.querySelector('.td-meter i'), cup: document.querySelector(`.td-cup[data-side="${s}"]`) };
});
const tdCmd = document.getElementById('tdCmd');
const readOutput = () => {
  let doc = null;
  try { doc = demoFrame.contentDocument; } catch (e) { /* not reachable */ }
  const num = (id) => Number((doc && doc.getElementById(id) || {}).textContent) || 0;
  outEars.forEach((e) => {
    const c = num(`v${e.s}c`), h = num(`v${e.s}h`), a = Math.max(c, h), cool = c > h, rgb = cool ? COOL : WARM;
    e.value.textContent = a ? `${a}% ${cool ? 'cooling' : 'warmth'}` : 'Off';
    e.value.className = a ? (cool ? 'cool' : '') : 'off';
    e.meter.style.width = `${a}%`; e.meter.style.background = `rgb(${rgb})`;
    e.cup.style.fill = a ? `rgba(${rgb},${.45 + a / 180})` : '';
    e.cup.style.filter = a ? `drop-shadow(0 0 ${4 + a / 8}px rgba(${rgb},${.4 + a / 160}))` : '';
  });
  const cmd = doc && doc.getElementById('cmd');
  const c = cmd ? cmd.textContent.trim() : ''; tdCmd.textContent = !c || /^stop$/i.test(c) ? 'Idle' : c;   // "stop" means nothing is on: say so in words
  requestAnimationFrame(readOutput);
};
readOutput();

const modal = document.getElementById('videoModal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = modal.querySelector('.modal-player');
const heroVideo = document.querySelector('.campaign-video video');
document.querySelectorAll('.vid-card').forEach((card) => {
  const preview = card.querySelector('video');
  // Muted hover preview on devices that can hover; the full video opens in the modal.
  if (matchMedia('(hover: hover)').matches) {
    card.addEventListener('mouseenter', () => preview.play().catch(() => {}));
    card.addEventListener('mouseleave', () => { preview.pause(); preview.currentTime = 0; });
  }
  card.addEventListener('click', () => {
    preview.pause();
    if (heroVideo) heroVideo.pause();
    modalTitle.textContent = card.dataset.title;
    modalBody.innerHTML = `<video class="modal-video${card.classList.contains('vertical') ? ' is-vertical' : ''}" src="${card.dataset.src}" controls autoplay playsinline></video>`;
    modal.showModal();
  });
});
const closeVideoModal = () => {
  modal.close();
  modalBody.innerHTML = '';
};
document.getElementById('closeModal').addEventListener('click', closeVideoModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeVideoModal(); });
modal.addEventListener('cancel', () => { modalBody.innerHTML = ''; });

// Contact form → email via Web3Forms (static site, no backend).
// Until WEB3FORMS_KEY is set, "Send" opens the visitor's mail app with the message pre-filled to CONTACT_EMAIL.
const CONTACT_EMAIL = 'moheat-evo@outlook.com';
const WEB3FORMS_KEY = 'fcf3ea12-26c7-4df8-9a20-4d70452b606f';
const contactForm = document.getElementById('contactForm');
const cfStatus = document.getElementById('cfStatus');
const setStatus = (html, cls = '') => { cfStatus.innerHTML = html; cfStatus.className = `cf-status ${cls}`; };
const mailtoFallback = (d) => `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`[MoHeat Evo] ${d.topic}`)}&body=${encodeURIComponent(`${d.message}\n\n— ${d.name} (${d.email})`)}`;

document.querySelectorAll('a[data-topic]').forEach((a) => a.addEventListener('click', () => {
  const radio = contactForm.querySelector(`input[name="topic"][value="${a.dataset.topic}"]`);
  if (radio) radio.checked = true;
}));

contactForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(contactForm));
  d.topic = d.topic || 'General';
  let ok = true;
  contactForm.querySelectorAll('.cf-field').forEach((f) => {
    const el = f.querySelector('input, textarea');
    const bad = !el.value.trim() || (el.type === 'email' && !el.checkValidity());
    f.classList.toggle('is-invalid', bad);
    if (bad && ok) { el.focus(); ok = false; }
  });
  if (!ok) { setStatus('Please fill in your name, a valid email and a message.', 'err'); return; }
  if (d._honey) return;

  if (!WEB3FORMS_KEY) {
    window.location.href = mailtoFallback(d);
    setStatus(`Your email app should open with the message ready to send. If it doesn't, write to <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.`, 'ok');
    return;
  }

  const btn = contactForm.querySelector('button[type="submit"]');
  btn.disabled = true;
  setStatus('Sending…');
  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        subject: `[MoHeat Evo] ${d.topic} — ${d.name}`,
        from_name: 'MoHeat Evo website',
        name: d.name, email: d.email, topic: d.topic, message: d.message,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success !== true) throw new Error(json.message || res.statusText);
    contactForm.reset();
    setStatus('Thanks! Your message has been sent — we\'ll get back to you soon.', 'ok');
  } catch (err) {
    setStatus(`Sorry, the message couldn't be sent. <a href="${mailtoFallback(d)}">Email us directly</a> instead.`, 'err');
  } finally {
    btn.disabled = false;
  }
});
contactForm.addEventListener('input', (e) => e.target.closest('.cf-field')?.classList.remove('is-invalid'));

// "Watch on this page" press cards open the matching video in the modal.
document.querySelectorAll('[data-play]').forEach((btn) => btn.addEventListener('click', () => {
  document.querySelector(`.vid-card[data-src*="${btn.dataset.play}"]`)?.click();
}));

// Looping visuals: play only while on screen; reduced-motion keeps the poster.
(function(){
  const vids = document.querySelectorAll('video.loop');
  if(!vids.length || matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const vo = new IntersectionObserver((es)=>es.forEach(e=>{
    if(e.isIntersecting){ const p=e.target.play(); if(p&&p.catch) p.catch(()=>{}); } else e.target.pause();
  }),{rootMargin:'120px'});
  vids.forEach(v=>{ v.muted=true; vo.observe(v); });
})();

// "Show more" blocks: open in place. Without this script the content simply stays visible.
document.querySelectorAll('.more-btn').forEach((btn) => {
  const box = document.getElementById(btn.getAttribute('aria-controls'));
  const label = btn.querySelector('span');
  const set = (open) => {
    btn.setAttribute('aria-expanded', open);
    box.classList.toggle('is-closed', !open);
    label.textContent = open ? 'Show less' : btn.dataset.more;
  };
  btn.hidden = false;
  set(false);
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
});

// the hero film: our own big play button on a text-free poster; the browser controls only once it plays (QA 2026-11-11)
(() => {
  const box = document.querySelector('.campaign-video'), v = box?.querySelector('video'), b = box?.querySelector('.film-play');
  if (!v || !b) return;
  b.addEventListener('click', () => { v.controls = true; box.classList.add('is-playing'); v.play().catch(() => {}); });
  v.addEventListener('play', () => { v.controls = true; box.classList.add('is-playing'); });
})();
// the fixed bar: see-through over the hero, a solid blurred bar once the page scrolls (no dark smear over light sections)
(() => {
  const bar = document.querySelector('.nav-wrap'); if (!bar) return;
  const on = () => bar.classList.toggle('is-scrolled', scrollY > 24); addEventListener('scroll', on, { passive: true }); on();
})();
