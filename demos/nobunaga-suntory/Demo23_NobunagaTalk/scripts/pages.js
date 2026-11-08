#!/usr/bin/env node
// The three talk demos share ONE engine and ONE page layout (user 2026-11-08: "only Nobunaga / only Ieyasu / a round-table, as three
// separate demos"). The templates are this folder's index.html (public, scripted) and live/index.html (private, server.py); this script
// writes every page from them with that page's cast (<body data-cast>, read by main.js) and its own titles:
//   public  Demo23_NobunagaTalk/index.html          N   (template itself, rewritten in place)
//           Demo41_IeyasuTalk/index.html            I   (thin page: engine, voices, l10n from ../_kit/talk/, nothing copied)
//           Demo42_SengokuRoundtable/index.html     NI
//   live    live/index.html · live/ieyasu.html · live/roundtable.html   (server.py: /live, /live/ieyasu, /live/roundtable)
// Change the layout in index.html / live/index.html, then:  node scripts/pages.js   (bump ?v= first with tools/web/bump.py).
// New cover texts need ja / en / zh entries in l10n.js (tools/l10n/check_missing.js lists what is missing).
const fs = require('fs'), path = require('path');
const HERE = path.join(__dirname, '..'), SERIES = path.join(HERE, '..');
const PAGES = [
  { cast: 'N', dir: 'Demo23_NobunagaTalk', live: 'index.html', h1: ['信長と、', '語らう'], title: '信長と、語らう · Talk with Nobunaga',
    en: 'Talk with Nobunaga — pick a place, just the two of you', vv: '信長 ElevenLabs', liveEn: 'Talk with Nobunaga — live, unscripted, about two minutes',
    hint: 'He speaks first, then waits for you · answer with your voice or type · headphones + microphone',
    credits: 'A scripted preview of the live AI talk: five places, he answers anything you say and steers back to the script · voice ElevenLabs · art ChatGPT (OpenAI)' },
  { cast: 'I', dir: 'Demo41_IeyasuTalk', live: 'ieyasu.html', h1: ['家康と、', '語らう'], title: '家康と、語らう · Talk with Ieyasu',
    en: 'Talk with Ieyasu — pick a place, just the two of you', vv: '家康 ElevenLabs', liveEn: 'Talk with Ieyasu — live, unscripted, about two minutes',
    hint: 'He speaks first, then waits for you · answer with your voice or type · headphones + microphone',
    credits: 'A scripted preview of the live AI talk: five places, he answers anything you say and steers back to the script · voice ElevenLabs · art ChatGPT (OpenAI)' },
  { cast: 'NI', dir: 'Demo42_SengokuRoundtable', live: 'roundtable.html', h1: ['信長と家康の、', '座談会'], title: '信長と家康の、座談会 · Round Table with Nobunaga & Ieyasu',
    en: 'Round table with Nobunaga & Ieyasu — pick a place, the three of you', vv: '信長・家康 ElevenLabs', liveEn: 'Round table with Nobunaga & Ieyasu — live, unscripted, about two minutes',
    hint: 'They speak first, then wait for you · answer with your voice or type · headphones + microphone',
    credits: 'A scripted preview of the live AI talk: five places, they answer anything you say and steer back to the script · voices ElevenLabs · art ChatGPT (OpenAI)' },
];
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
function sub(html, re, to, what) { if (!re.test(html)) throw new Error(`template: no ${what}`); return html.replace(re, to); }
function page(tpl, p, live) {
  let h = tpl;
  h = sub(h, /<title>[^<]*?(?= · (?:Live|MoHeat))/, `<title>${esc(p.title)}`, '<title>');
  h = sub(h, /<body[^>]*>/, `<body data-cast="${p.cast}">`, '<body>');
  // UI v2: the public pages have no cover text in the HTML any more (the cover is media/cover/, cover.json); only the private live/ template may still carry it
  h = h.replace(/<h1>.*?<\/h1>/, `<h1>${p.h1.map((s) => `<span>${s}</span>`).join('')}</h1>`);
  h = h.replace(/(<div class="cover-copy">[\s\S]*?<p class="en">)[^<]*/, `$1${esc(live ? p.liveEn : p.en)}`);
  h = sub(h, /(<p class="vv" id="vv">)[^<]*?(?=( · live AI)?<\/p>)/, `$1${p.vv}`, '#vv');
  h = h.replace(/\n\s*<p><small>相手 · With<\/small><span id="pickCast"><\/span><\/p>/, '');   // (old two-row picker)
  if (!live) {
    h = sub(h, /(<p class="hint" id="budget">)[^<]*/, `$1${esc(p.hint)}`, '#budget');
    h = sub(h, /(<p class="draft" id="credits">)[^<]*/, `$1${esc(p.credits)}`, '#credits');
    h = h.replace(/\n\s*<base href="[^"]*" \/>/, '');
  } else {
    h = sub(h, /(<p class="draft">)(?:They speak first, then wait|He speaks first, then waits) for you/, `$1${p.cast.length > 1 ? 'They speak first, then wait' : 'He speaks first, then waits'} for you`, 'live .draft');
  }
  return h;
}
const pub = fs.readFileSync(path.join(HERE, 'index.html'), 'utf8'), liv = fs.readFileSync(path.join(HERE, 'live', 'index.html'), 'utf8');
for (const p of PAGES) {
  const out = [[path.join(SERIES, p.dir, 'index.html'), page(pub, p, false)], [path.join(HERE, 'live', p.live), page(liv, p, true)]];
  for (const [f, h] of out) {
    fs.mkdirSync(path.dirname(f), { recursive: true });
    const old = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
    if (old !== h) { fs.writeFileSync(f, h); console.log('wrote', path.relative(SERIES, f)); } else console.log('same ', path.relative(SERIES, f));
  }
}
