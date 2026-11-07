"""Generate Demo 10 art with the Seedance 2.5 API (seedance2-5.com, same credits as the website).

  python3 scripts/seedance_images.py 06 10 11        # only these jobs
  python3 scripts/seedance_images.py all             # every job whose output does not exist yet
  python3 scripts/seedance_images.py 07 --ref2 assets/art/kohaku_base.png   # override reference image 2
  python3 scripts/seedance_images.py 05 --again      # a new variant (new idempotency key, charges again)

Key: ~/.seedance_key (one line; never commit it). Jobs: project/seedance_jobs.json (prompts, ratios, reference images).
Flow per image: POST /uploads → PUT bytes → POST /uploads/complete → POST /quotes → POST /images (Idempotency-Key)
→ poll GET /generations/{id} → download to assets/art/<name>.png. Retries reuse the same Idempotency-Key (no double charge).
"""
import json, os, sys, time, mimetypes, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = 'https://seedance2-5.com/api/v1'
JOBS = os.path.join(ROOT, 'project', 'seedance_jobs.json')
OUT = os.path.join(ROOT, 'assets', 'art')
LOG = os.path.join(ROOT, 'project', 'seedance_log.json')
MODEL, MAX_COST = 'gpt-image-2', 60
res_of = lambda name: '2K' if name.startswith('bg_') else '1K'   # backgrounds fill the 1920 canvas; sprites are shown at 250–500 px


def key():
    with open(os.path.expanduser('~/.seedance_key')) as f:
        return f.read().strip()


def call(method, path, body=None, headers=None, tries=40):   # 429 = one generation at a time / rate limit: wait and resend the same request
    h = {'Authorization': f'Bearer {key()}', 'Accept': 'application/json', 'User-Agent': 'moheat-demo10/1.0'}
    data = None
    if body is not None:
        data = json.dumps(body).encode(); h['Content-Type'] = 'application/json'
    h.update(headers or {})
    for i in range(tries):
        req = urllib.request.Request(BASE + path, data=data, headers=h, method=method)
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                txt = r.read().decode() or 'null'
                return json.loads(txt)
        except urllib.error.HTTPError as e:
            txt = e.read().decode(errors='ignore')
            if e.code in (429, 503) or e.code >= 500:
                wait = max(int(e.headers.get('Retry-After') or 0), 15 if path in ('/images', '/uploads') else 3); print(f'  {e.code}, retry in {wait}s'); time.sleep(wait); continue
            raise SystemExit(f'{method} {path} → HTTP {e.code}: {txt[:400]}')
        except urllib.error.URLError as e:
            print(f'  network error {e}, retry'); time.sleep(10 * (i + 1))
    raise SystemExit(f'{method} {path}: gave up')


def unwrap(x):
    return x['data'] if isinstance(x, dict) and 'data' in x and len(x) <= 3 else x


def upload(paths):
    files = [{'name': os.path.basename(p), 'type': mimetypes.guess_type(p)[0] or 'image/jpeg', 'size': os.path.getsize(p)} for p in paths]
    prep = unwrap(call('POST', '/uploads', {'files': files}))
    for item, p in zip(prep, paths):
        with open(p, 'rb') as f: raw = f.read()
        req = urllib.request.Request(item['upload_url'], data=raw, headers=item.get('upload_headers') or {}, method='PUT')
        with urllib.request.urlopen(req, timeout=120): pass
    done = unwrap(call('POST', '/uploads/complete', {'asset_ids': [i['asset_id'] for i in prep]}))
    return [d['url'] for d in done]


def run(job_id, job, ref2=None, again=False):
    name = job['name']; dst = os.path.join(OUT, name + '.png')
    refs = [os.path.expanduser(r) for r in job['refs']]
    if ref2: refs = refs[:1] + [os.path.join(ROOT, ref2) if not os.path.isabs(ref2) else ref2]
    for r in refs:
        if not os.path.exists(r): raise SystemExit(f'{job_id}: missing reference {r}')
    print(f'[{job_id}] {name}: uploading {len(refs)} reference(s)')
    urls = upload(refs)
    body = {'model': MODEL, 'mode': 'image-to-image', 'prompt': job['prompt'], 'inputs': [{'type': 'image', 'url': u} for u in urls],
            'parameters': {'resolution': res_of(name), 'aspect_ratio': job['ratio']}, 'max_cost_credits': MAX_COST}
    q = unwrap(call('POST', '/quotes', body)); print(f'  quote: {json.dumps(q)[:160]}')
    log = json.load(open(LOG)) if os.path.exists(LOG) else {}
    n = log.get(name, {}).get('variant', 1) + (1 if again else 0)
    idem = f'moheat-d10-{name}-v{n}'.replace('_', '-')
    g = unwrap(call('POST', '/images', body, {'Idempotency-Key': idem}))
    gid = g['id']; print(f'  generation {gid} ({idem}) cost {g.get("credits")}')
    log[name] = {'variant': n, 'generation': gid, 'idempotency_key': idem, 'ratio': job['ratio'], 'refs': refs}
    json.dump(log, open(LOG, 'w'), indent=1, ensure_ascii=False)
    return wait_save(gid, dst, job_id)


def wait_save(gid, dst, job_id=''):
    while True:
        time.sleep(12)
        g = unwrap(call('GET', f'/generations/{gid}'))
        if g['status'] in ('pending', 'processing'): print('  …', g['status']); continue
        if g['status'] != 'success': raise SystemExit(f'  {job_id} {g["status"]}: {g.get("error")}')
        os.makedirs(OUT, exist_ok=True)
        tmp = dst + '.part'
        urllib.request.urlretrieve(g['outputs'][0]['url'], tmp); os.replace(tmp, dst)
        print(f'  saved {os.path.relpath(dst, ROOT)}'); return dst


def main():
    args = sys.argv[1:]; again = '--again' in args
    if '--fetch' in args:   # download already-submitted jobs from the log (no new charge)
        log = json.load(open(LOG)); jobs = json.load(open(JOBS))
        for i in [a for a in args if not a.startswith('--')]:
            name = jobs[i]['name']; wait_save(log[name]['generation'], os.path.join(OUT, name + '.png'), i)
        return
    ref2 = args[args.index('--ref2') + 1] if '--ref2' in args else None
    ids = [a for a in args if not a.startswith('--') and a != ref2]
    jobs = json.load(open(JOBS))
    if ids == ['all']: ids = [k for k, j in jobs.items() if not os.path.exists(os.path.join(OUT, j['name'] + '.png'))]
    bal = unwrap(call('GET', '/credits/balance')); print('balance:', bal)
    for i in ids: run(i, jobs[i], ref2, again)
    print('balance:', unwrap(call('GET', '/credits/balance')))


if __name__ == '__main__':
    main()
