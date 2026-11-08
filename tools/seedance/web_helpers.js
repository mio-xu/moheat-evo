// Seedance website helpers (seedance2-5.com/image-to-image, logged in). Paste once per page load with the javascript tool, then:
//   window.__P = { name: prompt, … }; window.__K = { name: a unique phrase of that prompt, … };
//   await __prep(name)  → fills the prompt, picks 16:9 + 2K, returns { opts, imgs: "(n/8)", btn }     (check btn says 25 credits)
//   await __submit()    → clicks Generate only when it says 25 credits
//   __status(name)      → "Generating 0 / 1" | "1 / 1 done" | …    __dl(name) → clicks that card's Download (then run web_take.py)
//   __clearImg()        → empties the file input (click the thumbnail's "Remove image" button first)
// Prompts that are identical for two jobs cannot be told apart: download the first before submitting the second.
(() => {
  const radios = () => [...document.querySelectorAll('[role=radiogroup]')].map((g) => [...g.querySelectorAll('[role=radio]')]);
  const lab = (r) => { const l = r.id && document.querySelector(`label[for="${r.id}"]`); return (l ? l.textContent : r.parentElement.textContent).trim(); };
  window.__opts = () => radios().map((g) => g.map((r) => lab(r) + (r.getAttribute('aria-checked') === 'true' ? '*' : '')));
  const genBtn = () => [...document.querySelectorAll('button')].find((b) => /Generate \d+ image/.test(b.textContent));
  window.__prep = async (name) => {
    const ta = document.querySelector('textarea'); const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    set.call(ta, window.__P[name]); ta.dispatchEvent(new Event('input', { bubbles: true }));
    const g = radios(); g[0][0].click(); await new Promise((r) => setTimeout(r, 300)); g[1][1].click(); await new Promise((r) => setTimeout(r, 300));
    return { opts: __opts().map((o) => o.find((x) => x.endsWith('*'))).join(' '), imgs: (document.body.innerText.match(/\((\d+)\/8\)/) || [])[0], btn: genBtn()?.textContent };
  };
  window.__submit = async () => { const b = genBtn(); if (!b || !/25 credits/.test(b.textContent) || b.disabled) return 'not ready: ' + (b && b.textContent); b.click(); await new Promise((r) => setTimeout(r, 2500)); return 'submitted'; };
  window.__card = (name) => { for (const b of document.querySelectorAll('button')) { if (!/Reuse prompt/.test(b.textContent)) continue; let c = b;
    for (let i = 0; i < 6 && c; i++) { c = c.parentElement; if ((c.innerText || '').length > 300) break; }
    if (c && c.innerText.replace(/\s+/g, ' ').includes(window.__K[name])) return c; } return null; };
  window.__status = (name) => (__card(name)?.innerText.split('\n')[0]) || 'none';
  window.__dl = (name) => { const c = __card(name); const b = c && [...c.querySelectorAll('button')].find((x) => /Download/.test(x.textContent)); if (!b) return name + ': no card / button'; b.click(); return name + ': clicked'; };
  window.__clearImg = () => { const i = document.querySelector('input[type=file]'); if (i) i.value = ''; return (document.body.innerText.match(/\((\d+)\/8\)/) || [])[0]; };
  return 'helpers ready';
})();
