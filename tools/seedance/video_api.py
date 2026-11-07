#!/usr/bin/env python3
"""Seedance 2.5 Lite 1080p first & last frame clips through the API (DEMO_DESIGN_GUIDE §6: API first, the website only when the API
is blocked). Reads <demo>/project/web_video_prompts.json ({"clips": {name: {first, last, prompt}}}) and the frames
<demo>/assets/frames/<still>.jpg; saves <demo>/assets/video/<name>.mp4 right after each clip finishes (generation records answer 503
after ~10 min). Skips clips whose file already exists. Uploads every frame once (≤5 files per request; URLs cached in
<demo>/project/frame_urls.json). Idempotency keys make retries free.

  python3 tools/seedance/video_api.py demos/for-women/Demo21_JinLounge [clip …] [--probe] [--quote]
  --probe  only check that uploads work (one tiny request) and print the balance
  --quote  print the price of the first clip and stop
"""
import glob, importlib.util, json, os, sys, time, urllib.request, urllib.error

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
spec = importlib.util.spec_from_file_location('sd', glob.glob(os.path.join(REPO, 'demos', '*', 'Demo10_CaveSpring', 'scripts', 'seedance_images.py'))[0])
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)

args = [a for a in sys.argv[1:] if not a.startswith('--')]
ROOT = os.path.abspath(args[0]); only = args[1:]
JOBS = json.load(open(os.path.join(ROOT, 'project', 'web_video_prompts.json')))['clips']
URLS_P = os.path.join(ROOT, 'project', 'frame_urls.json')
OUT = os.path.join(ROOT, 'assets', 'video'); os.makedirs(OUT, exist_ok=True)
LOG = os.path.join(ROOT, 'project', 'video_api_log.json')


def balance(): return m.unwrap(m.call('GET', '/credits/balance', tries=3))


def probe():
    h = {'Authorization': f'Bearer {m.key()}', 'Content-Type': 'application/json', 'Accept': 'application/json'}
    body = json.dumps({'files': [{'name': 'probe.jpg', 'type': 'image/jpeg', 'size': 1000}]}).encode()
    try:
        urllib.request.urlopen(urllib.request.Request(m.BASE + '/uploads', data=body, headers=h, method='POST'), timeout=60); return True, ''
    except urllib.error.HTTPError as e:
        return False, f'{e.code} Retry-After={e.headers.get("Retry-After")}'


def frame_urls(names):
    urls = json.load(open(URLS_P)) if os.path.exists(URLS_P) else {}
    todo = [n for n in sorted(names) if n not in urls]
    for i in range(0, len(todo), 5):
        chunk = todo[i:i + 5]
        got = m.upload([os.path.join(ROOT, 'assets', 'frames', n + '.jpg') for n in chunk])
        urls.update(dict(zip(chunk, got))); json.dump(urls, open(URLS_P, 'w'), indent=1)
        print('uploaded', chunk, flush=True)
    return urls


def body(job, urls):
    return {'model': 'seedance-2.5-lite', 'mode': 'image-to-video', 'prompt': job['prompt'],
            'inputs': [{'type': 'image', 'url': urls[job['first']]}, {'type': 'image', 'url': urls[job['last']]}],
            'parameters': {'resolution': '1080p', 'aspect_ratio': '16:9', 'duration_seconds': 4, 'image_mode': 'first-last-frame'},
            'max_cost_credits': 80}


def main():
    if '--probe' in sys.argv:
        ok, why = probe(); print('uploads', 'OK' if ok else 'BLOCKED ' + why, '| balance', balance()); return
    names = [n for n in (only or list(JOBS)) if not os.path.exists(os.path.join(OUT, n + '.mp4'))]
    if not names: print('all clips present'); return
    urls = frame_urls({JOBS[n][k] for n in names for k in ('first', 'last')})
    if '--quote' in sys.argv:
        print(json.dumps(m.unwrap(m.call('POST', '/quotes', body(JOBS[names[0]], urls))))[:300]); return
    log = json.load(open(LOG)) if os.path.exists(LOG) else {}
    print('balance before', balance(), '| clips', len(names), flush=True)
    for n in names:
        idem = f'moheat-{os.path.basename(ROOT)}-{n}-v1'.replace('_', '-').lower()
        g = None
        for path in ('/videos', '/generations'):
            try: g = m.unwrap(m.call('POST', path, body(JOBS[n], urls), {'Idempotency-Key': idem}, tries=200)); break
            except SystemExit as e:
                if '404' not in str(e) and '405' not in str(e): raise
        log[n] = {'generation': g['id'], 'idempotency_key': idem, 'credits': g.get('credits')}; json.dump(log, open(LOG, 'w'), indent=1)
        print(f'[{n}] generation {g["id"]} cost {g.get("credits")}', flush=True)
        while True:
            time.sleep(12)
            r = m.unwrap(m.call('GET', f'/generations/{g["id"]}'))
            if r.get('outputs'):
                dst = os.path.join(OUT, n + '.mp4'); tmp = dst + '.part'
                urllib.request.urlretrieve(r['outputs'][-1]['url'], tmp); os.replace(tmp, dst); print('  saved', n, flush=True); break
            if r['status'] not in ('pending', 'processing', 'queued'): print(f'  {n} {r["status"]}: {r.get("error")}', flush=True); break
    print('balance after', balance())


if __name__ == '__main__':
    main()
