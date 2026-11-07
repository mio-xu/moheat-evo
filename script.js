const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); } });
},{threshold:.12});
revealEls.forEach(el=>io.observe(el));

// Interactive demo: the menu on the left swaps the embedded player (demos/<name>/?embed=1). Demo 1 is the default.
const demoFrame = document.getElementById('demoFrame');
const demoOpen = document.getElementById('demoOpen');
document.querySelectorAll('.td-item').forEach((item) => {
  item.addEventListener('click', () => {
    if (item.classList.contains('is-active')) return;
    document.querySelectorAll('.td-item').forEach((x) => x.classList.toggle('is-active', x === item));
    demoFrame.src = `${item.dataset.demo}?embed=1&autoplay=1`;   // chosen by a click → starts playing right away
    demoOpen.href = item.dataset.demo;
  });
});

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
  tdCmd.textContent = cmd ? cmd.textContent : 'stop';
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
