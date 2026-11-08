#!/usr/bin/env python3
"""OpenAI gpt-image-2 (the same model as Seedance's "GPT Image 2") for the layered art, with the prompts of scripts/seedance.py JOBS3.
Used when Seedance's daily upload limit is reached (2026-11-08): the reference goes straight to /v1/images/edits, no upload quota.
Key: ~/.openai_key. Output: assets/art/<name>.png (not in git). Log: project/openai_log.json.

  python3 scripts/gpt_image.py nagisa_sit nagisa_laugh ...     # each job uses its reference from JOBS3 (base pose or design)
  python3 scripts/gpt_image.py --again nagisa_sit              # redo
"""
import base64, importlib.util, json, os, sys, time, urllib.request, uuid
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('sd', os.path.join(ROOT, 'scripts', 'seedance.py'))
SD = importlib.util.module_from_spec(spec); spec.loader.exec_module(SD)
ART = os.path.join(ROOT, 'assets', 'art'); LOG = os.path.join(ROOT, 'project', 'openai_log.json')
MODEL, SIZE, QUALITY = 'gpt-image-2', '2560x1440', 'high'


def key():
    return open(os.path.expanduser('~/.openai_key')).read().strip()


def edit(name, again=False):
    dst = os.path.join(ART, name + '.png')
    if os.path.exists(dst) and not again: return f'exists {name}'
    prompt, ref = SD.JOBS3[name]
    ref_p = os.path.join(ART, ref + '.png')
    if not os.path.exists(ref_p): return f'{name}: make {ref} first'
    b = uuid.uuid4().hex; parts = []
    def field(k, v): parts.append(f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
    for k, v in (('model', MODEL), ('prompt', prompt), ('size', SIZE), ('quality', QUALITY), ('n', '1')): field(k, v)
    parts.append(f'--{b}\r\nContent-Disposition: form-data; name="image[]"; filename="{ref}.png"\r\nContent-Type: image/png\r\n\r\n'.encode()
                 + open(ref_p, 'rb').read() + b'\r\n')
    body = b''.join(parts) + f'--{b}--\r\n'.encode()
    req = urllib.request.Request('https://api.openai.com/v1/images/edits', data=body, method='POST',
                                 headers={'Authorization': f'Bearer {key()}', 'Content-Type': f'multipart/form-data; boundary={b}'})
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=600) as r: d = json.loads(r.read())
    except urllib.error.HTTPError as e:
        return f'{name}: HTTP {e.code} {e.read().decode(errors="ignore")[:400]}'
    open(dst, 'wb').write(base64.b64decode(d['data'][0]['b64_json']))
    L = json.load(open(LOG)) if os.path.exists(LOG) else {}
    L[name] = {'model': MODEL, 'size': SIZE, 'quality': QUALITY, 'ref': ref, 'usage': d.get('usage'), 'seconds': round(time.time() - t0)}
    json.dump(L, open(LOG, 'w'), indent=1)
    return f'saved {name} ({round(time.time() - t0)} s)'


if __name__ == '__main__':
    again = '--again' in sys.argv; names = [a for a in sys.argv[1:] if not a.startswith('--')]
    with ThreadPoolExecutor(6) as ex:
        for r in ex.map(lambda n: edit(n, again), names): print(r, flush=True)
