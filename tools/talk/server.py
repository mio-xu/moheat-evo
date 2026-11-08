"""PRIVATE server for every live-talk demo (it holds the ElevenLabs key — never deploy it; GitHub Pages only gets the public scripted
pages). Extracted from Demo23 (信長と、語らう) on 2026-11-08 so one server, one password and one set of limits serve all live demos;
the demos are listed in tools/talk/demos.json (routes → pages, speaker letters → confirmed ElevenLabs voices).

  python3 tools/talk/server.py   → http://localhost:8771/live (Nobunaga) · /live/ieyasu · /live/roundtable · /live/inn (Demo43) …
  (demos/nobunaga-suntory/Demo23_NobunagaTalk/server.py + start_demo.command still work: they run this file.)

Password: ~/.moheat_live_pass (outside git; created with a random password on the first start and printed once in the terminal;
`cat ~/.moheat_live_pass` shows it again; delete the file to get a new one — that also logs out every browser).
Override the file with MOHEAT_LIVE_PASS_FILE=… (tests). Bound to 127.0.0.1 only (HOST=… to change, not recommended).

Everything this server serves needs the session cookie (14 days, HttpOnly, SameSite=Strict, HMAC of the password): pages → the
login form, /api/* → 401. Never served, even after login: dot files (.env.local, .git), local/, *.py, *.command, *.log.
  GET  <route in demos.json>  → that demo's live page
  GET  /login · POST /login · GET /logout
  GET  /api/talk/status     usage today / this month and the limits
  POST /api/talk/session    → {sid, signed_url} for the text-only ElevenLabs agent (the conversation's brain), if the limits allow
  POST /api/talk/tts        {sid, demo, who, text} → MP3 stream (eleven_v4, the demo's confirmed voice for `who`), counted against the limits
  POST /api/talk/end        {sid}
Limits (demos.json "limits", edit freely): sessions per day, characters per session / per day, and a monthly reserve: nothing runs once
the account has less than `month_reserve_chars` left. Usage is kept in demos.json "usage" (a local/ file, not in git)."""
import datetime, hashlib, hmac, html, http.server, importlib.util, json, os, secrets, threading, time, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
REG = json.load(open(os.path.join(HERE, 'demos.json')))
sp = importlib.util.spec_from_file_location('eleven', os.path.join(REPO, 'tools', 'eleven', 'tts.py')); E = importlib.util.module_from_spec(sp); sp.loader.exec_module(E)

PORT = int(os.environ.get('PORT', 8771))
HOST = os.environ.get('HOST', '127.0.0.1')
ROUTES = {r: '/' + d['dir'].strip('/') + '/' + d['live'] + page for d in REG['demos'].values() for r, page in d['routes'].items()}   # URL → live page
HOME = REG.get('home', '/live')
AGENT = json.load(open(os.path.join(REPO, REG['agent'])))['agent_id']
USAGE_P = os.path.join(REPO, REG['usage'])
LIMITS_P = os.path.join(REPO, REG['limits'])
PASS_P = os.path.expanduser(os.environ.get('MOHEAT_LIVE_PASS_FILE', '~/.moheat_live_pass'))
COOKIE, COOKIE_DAYS = 'moheat_live', 14
LOCK = threading.Lock()
SESS = {}          # sid → {t0, chars}
FAILS = []         # times of wrong passwords (all clients): ≥ 8 in 15 min → logins refused until they age out
_sub = {'t': 0, 'v': None}
_voice = {}


def voice(demo, who):
    """the confirmed ElevenLabs voice of speaker `who` in `demo` (demos.json), or None"""
    d = REG['demos'].get(demo or REG['default']) or {}; key = (d.get('voices') or {}).get(who)
    if not key: return None
    if key not in _voice: _voice[key] = E.voice(key)
    return _voice[key]


# ---------------------------------------------------------------- password + cookie
def password():
    """The password from PASS_P; created (random, mode 600) and printed once when the file does not exist."""
    if not os.path.exists(PASS_P):
        pw = '-'.join(secrets.token_urlsafe(4).replace('-', 'x').replace('_', 'y') for _ in range(3))
        fd = os.open(PASS_P, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as f: f.write(pw + '\n')
        print(f'\n  New password for the private live page: {pw}\n  (saved in {PASS_P}; it is not shown again — `cat {PASS_P}`)\n')
    return open(PASS_P).read().strip()


def _key(): return hashlib.sha256(b'moheat-live-cookie|' + password().encode()).digest()


def make_cookie():
    exp = str(int(time.time()) + COOKIE_DAYS * 86400)
    return f'{exp}.{hmac.new(_key(), exp.encode(), hashlib.sha256).hexdigest()}'


def cookie_ok(v):
    try:
        exp, sig = v.split('.', 1)
        return int(exp) > time.time() and hmac.compare_digest(sig, hmac.new(_key(), exp.encode(), hashlib.sha256).hexdigest())
    except Exception: return False


# ---------------------------------------------------------------- limits
def limits():
    return json.load(open(LIMITS_P))


def usage():
    today = datetime.date.today().isoformat()
    try: u = json.load(open(USAGE_P))
    except Exception: u = {}
    if u.get('date') != today: u = {'date': today, 'sessions': 0, 'chars': 0, 'log': u.get('log', [])[-200:]}
    return u


def save_usage(u):
    os.makedirs(os.path.dirname(USAGE_P), exist_ok=True)
    json.dump(u, open(USAGE_P, 'w'), ensure_ascii=False, indent=1)


def month():
    """(used, limit) characters/credits of the ElevenLabs plan this month, cached for a minute."""
    if time.time() - _sub['t'] > 60 or not _sub['v']:
        s = E.client().user.subscription.get()
        _sub['v'] = (s.character_count, s.character_limit); _sub['t'] = time.time()
    return _sub['v']


def blocked(extra_chars=0, new_session=False, sid=None):
    """→ None if allowed, else (ja, en) reason."""
    L, u = limits(), usage()
    used, lim = month()
    if lim - used - extra_chars < L['month_reserve_chars']:
        return ('今月の利用枠の上限に達しました。', 'This month\'s allowance is used up.')
    if new_session and u['sessions'] >= L['daily_sessions']:
        return (f'本日の会話回数（{L["daily_sessions"]}回）に達しました。', f'Today\'s limit of {L["daily_sessions"]} conversations is reached.')
    if u['chars'] + extra_chars > L['daily_chars']:
        return ('本日の音声の上限に達しました。', 'Today\'s voice limit is reached.')
    if sid is not None:
        s = SESS.get(sid)
        if not s: return ('会話が見つかりません。', 'Unknown conversation.')
        if s['chars'] + extra_chars > L['session_chars']: return ('この会話の音声の上限に達しました。', 'This conversation\'s voice limit is reached.')
        if time.time() - s['t0'] > L['session_seconds'] + 120: return ('会話の時間が終わりました。', 'This conversation has ended.')
    return None


def status():
    L, u = limits(), usage()
    try: used, lim = month()
    except Exception: used, lim = None, None
    return {'limits': L, 'today': {'sessions': u['sessions'], 'chars': u['chars']}, 'month': {'used': used, 'limit': lim},
            'left_sessions': max(0, L['daily_sessions'] - u['sessions']), 'blocked': (blocked(new_session=True) if used is not None else ('ElevenLabs に接続できません。', 'Cannot reach ElevenLabs.'))}


LOGIN = '''<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>Login · MoHeat Evo live talk</title><style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#120a06;color:#f4ead6;font:16px/1.5 -apple-system,"Noto Sans JP",sans-serif}
form{width:min(340px,88vw);display:grid;gap:12px;padding:28px;border:1px solid #4a3418;border-radius:14px;background:#1e140c}
h1{margin:0;font-size:19px;color:#d9a84a}p{margin:0;color:#c8b48e;font-size:13px}input,button{font:inherit;padding:10px 12px;border-radius:8px;border:1px solid #4a3418}
input{background:#120a06;color:#fff}button{background:linear-gradient(135deg,#a8321c,#d9a84a);color:#fff;border:0;font-weight:700;cursor:pointer}.e{color:#ffb4a0}
</style></head><body><form method="post" action="/login"><h1>MoHeat Evo · Live talk</h1><p>非公開ページ · Private page — password</p>
<input type="hidden" name="next" value="{next}"><input type="password" name="pw" autocomplete="current-password" autofocus required placeholder="Password">
<button type="submit">ログイン · Log in</button>{err}</form></body></html>'''
DENY_EXT = ('.py', '.pyc', '.command', '.log', '.env', '.key', '.pem')


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=REPO, **k)

    def log_message(self, fmt, *a):
        if '/api/' in (self.path or '') or '/login' in (self.path or ''): super().log_message(fmt, *a)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store'); self.send_header('X-Robots-Tag', 'noindex, nofollow'); self.send_header('Referrer-Policy', 'no-referrer'); super().end_headers()

    def list_directory(self, path):   # no directory listings
        self.send_error(404); return None

    def _json(self, obj, code=200):
        b = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code); self.send_header('Content-Type', 'application/json; charset=utf-8'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)

    def _html(self, s, code=200, headers=()):
        b = s.encode()
        self.send_response(code); self.send_header('Content-Type', 'text/html; charset=utf-8'); self.send_header('Content-Length', str(len(b)))
        for k, v in headers: self.send_header(k, v)
        self.end_headers(); self.wfile.write(b)

    def _redirect(self, to, headers=()):
        self.send_response(303); self.send_header('Location', to)
        for k, v in headers: self.send_header(k, v)
        self.send_header('Content-Length', '0'); self.end_headers()

    def _body(self):
        n = min(int(self.headers.get('Content-Length') or 0), 20000)
        return self.rfile.read(n) if n else b''

    def _authed(self):
        for part in (self.headers.get('Cookie') or '').split(';'):
            k, _, v = part.strip().partition('=')
            if k == COOKIE and cookie_ok(v): return True
        return False

    def _denied(self, path):
        segs = [s for s in urllib.parse.unquote(path).split('/') if s]
        return any(s.startswith('.') or s == 'local' or s.lower().endswith(DENY_EXT) for s in segs)

    def _login_page(self, nxt='/live', err=''):
        self._html(LOGIN.replace('{next}', html.escape(nxt, quote=True)).replace('{err}', f'<p class="e">{err}</p>' if err else ''), 401 if err else 200)

    # ------------------------------------------------------------ GET
    def do_GET(self):
        path = urllib.parse.urlsplit(self.path).path
        if path == '/login': return self._login_page(urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query).get('next', ['/live'])[0])
        if path == '/logout': return self._redirect('/login', [('Set-Cookie', f'{COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict')])
        if path == '/favicon.ico': self.send_error(404); return
        if not self._authed():
            if path.startswith('/api/'): return self._json({'error': 'login required'}, 401)
            return self._redirect('/login?next=' + urllib.parse.quote(self.path))
        if path in ('/', '/live/'): path = HOME
        if path in ROUTES: return self._redirect(ROUTES[path])   # every live demo (demos.json), same password + limits
        if self._denied(path): self.send_error(404); return
        if path.startswith('/api/talk/status'): return self._json(status())
        return super().do_GET()

    def do_HEAD(self):
        if not self._authed() or self._denied(urllib.parse.urlsplit(self.path).path): self.send_error(404); return
        return super().do_HEAD()

    # ------------------------------------------------------------ POST
    def do_POST(self):
        path = urllib.parse.urlsplit(self.path).path
        try:
            if path == '/login': return self.login()
            if not self._authed(): return self._json({'error': 'login required'}, 401)
            if path == '/api/talk/session': return self.session()
            if path == '/api/talk/tts': return self.tts()
            if path == '/api/talk/end':
                SESS.pop(json.loads(self._body() or b'{}').get('sid'), None); return self._json({'ok': True})
            self._json({'error': 'not found'}, 404)
        except BrokenPipeError: pass
        except Exception as e:
            try: self._json({'error': str(e)[:300]}, 500)
            except Exception: pass

    def login(self):
        f = urllib.parse.parse_qs(self._body().decode('utf-8', 'replace'))
        nxt = f.get('next', ['/live'])[0]
        if not nxt.startswith('/') or nxt.startswith('//'): nxt = '/live'
        now = time.time()
        with LOCK:
            FAILS[:] = [t for t in FAILS if now - t < 900]
            if len(FAILS) >= 8: return self._login_page(nxt, '試行回数が多すぎます。15分後に · Too many tries, wait 15 minutes')
        if hmac.compare_digest((f.get('pw', [''])[0]).strip().encode(), password().encode()):
            secure = '; Secure' if 'https' in (self.headers.get('X-Forwarded-Proto') or '') or self.headers.get('Cf-Visitor') else ''
            return self._redirect(nxt, [('Set-Cookie', f'{COOKIE}={make_cookie()}; Max-Age={COOKIE_DAYS * 86400}; Path=/; HttpOnly; SameSite=Strict{secure}')])
        with LOCK: FAILS.append(now)
        time.sleep(1)
        self._login_page(nxt, 'パスワードが違います · Wrong password')

    def session(self):
        with LOCK:
            why = blocked(new_session=True)
            if why: return self._json({'blocked': why}, 429)
            url = E.client().conversational_ai.conversations.get_signed_url(agent_id=AGENT).signed_url
            sid = secrets.token_hex(8); SESS[sid] = {'t0': time.time(), 'chars': 0}
            u = usage(); u['sessions'] += 1; u['log'].append({'t': datetime.datetime.now().isoformat(timespec='seconds'), 'sid': sid}); save_usage(u)
        self._json({'sid': sid, 'signed_url': url, 'limits': limits()})

    def tts(self):
        b = json.loads(self._body() or b'{}'); text = (b.get('text') or '').strip()[:300]; sid = b.get('sid')
        vid = voice(b.get('demo'), b.get('who')) or voice(b.get('demo'), next(iter((REG['demos'].get(b.get('demo') or REG['default']) or {}).get('voices', {'N': 0}))))
        if not text: return self._json({'error': 'empty'}, 400)
        if not vid: return self._json({'error': 'unknown demo / speaker'}, 400)
        with LOCK:
            why = blocked(extra_chars=len(text), sid=sid)
            if why: return self._json({'blocked': why}, 429)
            SESS[sid]['chars'] += len(text); u = usage(); u['chars'] += len(text); save_usage(u)
        from elevenlabs import VoiceSettings
        gen = E.client().text_to_speech.stream(text=text, voice_id=vid, model_id=E.MODEL, language_code='ja', seed=E.SEED,
                                               output_format='mp3_44100_128', voice_settings=VoiceSettings(stability=.4, similarity_boost=.8))
        self.send_response(200); self.send_header('Content-Type', 'audio/mpeg'); self.end_headers()
        for ch in gen:
            if ch: self.wfile.write(ch)


if __name__ == '__main__':
    fresh = not os.path.exists(PASS_P); password()
    if not fresh: print(f'Password: in {PASS_P}  (cat {PASS_P})')
    srv = http.server.ThreadingHTTPServer((HOST, PORT), H)
    print(f'Private live talk: ' + ' · '.join(f'http://localhost:{PORT}{r}' for r in ROUTES) + '   (Ctrl+C to stop)', flush=True)
    srv.serve_forever()
