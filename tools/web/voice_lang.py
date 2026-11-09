#!/usr/bin/env python3
"""Wire a demo's voice loader to the shared voice-language setting (MoHeatVoice in demos/shared/shell.js; user 2026-11-09).

    python3 tools/web/voice_lang.py [--dry] [--check] [file.js …]     (default: every demos/**/audio.js + the talk kit's scripted.js)

Every interactive demo has the same loader one-liner
    for (const id of ids) if (!voices[id]) voices[id] = fetch(`media/voice/${id}.m4a`).then(…)
and a say() that reads voices[id]. This rewrites them mechanically:
  · fetch(`<base>${id}.m4a<q>`)  → VF(id, '<base>', '<q>')   = MoHeatVoice.fetch: media/voice/<lang>/<id>.m4a, ja on 404
  · voices[id]                   → voices[VK(id)]            = one cache entry per language (a switch mid-play loads lazily)
  · say(): a line not loaded in the current voice language is loaded on demand (inserted `if (voices[VK(id)] === undefined) loadVoices([id]);`)
  · VF / VK are defined once next to `const voices = {}` and fall back to the old behaviour on a page without the shell.
Japanese (the default for a demo without dubs) plays exactly as before: same URLs, same cache keys (VK(id) === id for ja).
--check: exit 1 if a file still has an unwired loader (check_demo G-voice uses the same test).
"""
import glob, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HELP = ("  // voice language (shared/shell.js MoHeatVoice; tools/web/voice_lang.py): one cache entry per language, ja fallback, a switch preloads the lines used so far\n"
        "  const VF = (id, base, q = '') => (window.MoHeatVoice ? MoHeatVoice.fetch(id, base, q) : fetch(`${base}${id}.m4a${q}`));\n"
        "  const VIDS = new Set(), VK = (id) => (VIDS.add(id), window.MoHeatVoice ? MoHeatVoice.key(id) : id);\n"
        "  addEventListener('moheat:voicelang', () => loadVoices([...VIDS]));\n")
FETCH = re.compile(r"fetch\(`([^`$]*)\$\{id\}\.m4a([^`]*)`\)")
UNWIRED = re.compile(r"fetch\(`[^`$]*\$\{id\}\.m4a")


def files():
    out = sorted(glob.glob(os.path.join(ROOT, 'demos', '**', 'audio.js'), recursive=True))
    return [f for f in out if '/project/' not in f and '/scripts/' not in f]


def wire(s):
    if 'MoHeatVoice' in s or not UNWIRED.search(s): return s, False
    m = re.search(r"^(\s*)const voices = \{\}[^\n]*\n", s, re.M)
    if not m: raise ValueError('no `const voices = {};`')
    s = s[:m.end()] + HELP + s[m.end():]
    s = FETCH.sub(lambda m: f"VF(id, '{m.group(1)}', '{m.group(2)}')", s)
    # the loader: the cache key is fixed when the fetch starts (a language switch while it loads must not file it under the new language)
    s = re.sub(r"for \(const id of ids\) (if \(!voices\[id\]\) voices\[id\] = VF\(.*)$",
               lambda m: 'for (const id of ids) for (const k of [VK(id)]) ' + m.group(1).replace('voices[id]', 'voices[k]'), s, flags=re.M)
    s = s.replace('voices[id]', 'voices[VK(id)]')
    # say(): load on demand in the current language (a switch mid-play); the loaders already skip loaded entries
    s, n = re.subn(r"^(\s*)if \(voices\[VK\(id\)\] instanceof Promise\) await voices\[VK\(id\)\];",
                   lambda m: f"{m.group(1)}if (voices[VK(id)] === undefined) loadVoices([id]);   // not loaded in this voice language yet\n{m.group(0)}", s, flags=re.M)
    s = s.replace('if (!voices[VK(id)]) loadVoices([id]);\n    if (voices[VK(id)] === undefined) loadVoices([id]);   // not loaded in this voice language yet\n',
                  'if (!voices[VK(id)]) loadVoices([id]);\n')
    return s, True


def main(a):
    dry, check = '--dry' in a, '--check' in a
    fs = [os.path.abspath(x) for x in a if not x.startswith('--')] or files()
    bad = []
    for f in fs:
        s = open(f, encoding='utf-8').read()
        if check:
            if UNWIRED.search(s) and 'MoHeatVoice' not in s: bad.append(f)
            continue
        try: t, ch = wire(s)
        except ValueError as e: print(f'SKIP {os.path.relpath(f, ROOT)}: {e}'); continue
        if not ch: continue
        print(('would wire ' if dry else 'wired ') + os.path.relpath(f, ROOT))
        if not dry:
            open(f + '.tmp', 'w', encoding='utf-8').write(t); os.replace(f + '.tmp', f)
    if check:
        for f in bad: print('unwired voice loader:', os.path.relpath(f, ROOT))
        sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main(sys.argv[1:])
