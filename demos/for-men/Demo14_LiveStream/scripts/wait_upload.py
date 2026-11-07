"""Exit 0 as soon as POST /uploads is no longer rate-limited (probes every 5 minutes; a probe uploads nothing)."""
import json, os, time, urllib.request, urllib.error
key = open(os.path.expanduser('~/.seedance_key')).read().strip()
H = {'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'User-Agent': 'moheat-demo14/1.0'}
while True:
    req = urllib.request.Request('https://seedance2-5.com/api/v1/uploads', data=json.dumps({'files': [{'name': 'probe.png', 'type': 'image/png', 'size': 1000}]}).encode(), headers=H, method='POST')
    try: urllib.request.urlopen(req, timeout=60); print('upload open', time.strftime('%H:%M'), flush=True); break
    except urllib.error.HTTPError as e:
        if e.code != 429: print('upload open (status', e.code, ')', flush=True); break
        print('still limited', time.strftime('%H:%M'), 'retry-after', e.headers.get('Retry-After'), flush=True)
    except Exception as e: print('probe error', e, flush=True)
    time.sleep(300)
