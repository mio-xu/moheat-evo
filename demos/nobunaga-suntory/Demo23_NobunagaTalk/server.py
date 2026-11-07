"""Local server for the live Nobunaga / Ieyasu talk demo (local only — it holds the ElevenLabs key).

  python3 demos/nobunaga-suntory/Demo23_NobunagaTalk/server.py      → http://localhost:8771/demos/nobunaga-suntory/Demo23_NobunagaTalk/

Serves the repo root as static files, plus:
  GET  /api/talk/status   usage today / this month and the limits
  POST /api/talk/session  → {sid, signed_url} for the text-only ElevenLabs agent (the conversation's brain), if the limits allow
  POST /api/talk/tts      {sid, who: 'N'|'I', text} → MP3 stream (eleven_v4, the confirmed cast voices), counted against the limits
  POST /api/talk/end      {sid}

Limits (limits.json, edit freely): sessions per day, characters per session / per day, and a monthly reserve: nothing runs once the
account has less than `month_reserve_chars` left. The account itself cannot go over its plan (overage is off on the Creator tier).
Usage is kept in local/usage.json (not in git)."""
import datetime, http.server, importlib.util, json, os, secrets, threading, time

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
sp = importlib.util.spec_from_file_location('eleven', os.path.join(REPO, 'tools', 'eleven', 'tts.py')); E = importlib.util.module_from_spec(sp); sp.loader.exec_module(E)

PORT = int(os.environ.get('PORT', 8771))
AGENT = json.load(open(os.path.join(HERE, 'agent.json')))['agent_id']
VOICE = {'N': E.voice('nobunaga'), 'I': E.voice('ieyasu')}
USAGE_P = os.path.join(HERE, 'local', 'usage.json')
LOCK = threading.Lock()
SESS = {}          # sid → {t0, chars}
_sub = {'t': 0, 'v': None}


def limits():
    return json.load(open(os.path.join(HERE, 'limits.json')))


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
    except Exception as e: used, lim = None, None
    return {'limits': L, 'today': {'sessions': u['sessions'], 'chars': u['chars']}, 'month': {'used': used, 'limit': lim},
            'left_sessions': max(0, L['daily_sessions'] - u['sessions']), 'blocked': (blocked(new_session=True) if used is not None else ('ElevenLabs に接続できません。', 'Cannot reach ElevenLabs.'))}


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=REPO, **k)

    def log_message(self, fmt, *a):
        if '/api/' in (self.path or ''): super().log_message(fmt, *a)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store'); super().end_headers()

    def _json(self, obj, code=200):
        b = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code); self.send_header('Content-Type', 'application/json; charset=utf-8'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)

    def _body(self):
        n = int(self.headers.get('Content-Length') or 0)
        return json.loads(self.rfile.read(n) or b'{}')

    def do_GET(self):
        if self.path.startswith('/api/talk/status'): return self._json(status())
        return super().do_GET()

    def do_POST(self):
        try:
            if self.path.startswith('/api/talk/session'): return self.session()
            if self.path.startswith('/api/talk/tts'): return self.tts()
            if self.path.startswith('/api/talk/end'):
                SESS.pop(self._body().get('sid'), None); return self._json({'ok': True})
            self._json({'error': 'not found'}, 404)
        except BrokenPipeError: pass
        except Exception as e:
            try: self._json({'error': str(e)[:300]}, 500)
            except Exception: pass

    def session(self):
        with LOCK:
            why = blocked(new_session=True)
            if why: return self._json({'blocked': why}, 429)
            url = E.client().conversational_ai.conversations.get_signed_url(agent_id=AGENT).signed_url
            sid = secrets.token_hex(8); SESS[sid] = {'t0': time.time(), 'chars': 0}
            u = usage(); u['sessions'] += 1; u['log'].append({'t': datetime.datetime.now().isoformat(timespec='seconds'), 'sid': sid}); save_usage(u)
        self._json({'sid': sid, 'signed_url': url, 'limits': limits()})

    def tts(self):
        b = self._body(); text = (b.get('text') or '').strip()[:300]; who = b.get('who') if b.get('who') in VOICE else 'N'; sid = b.get('sid')
        if not text: return self._json({'error': 'empty'}, 400)
        with LOCK:
            why = blocked(extra_chars=len(text), sid=sid)
            if why: return self._json({'blocked': why}, 429)
            SESS[sid]['chars'] += len(text); u = usage(); u['chars'] += len(text); save_usage(u)
        from elevenlabs import VoiceSettings
        gen = E.client().text_to_speech.stream(text=text, voice_id=VOICE[who], model_id=E.MODEL, language_code='ja', seed=E.SEED,
                                               output_format='mp3_44100_128', voice_settings=VoiceSettings(stability=.4, similarity_boost=.8))
        self.send_response(200); self.send_header('Content-Type', 'audio/mpeg'); self.end_headers()
        for ch in gen:
            if ch: self.wfile.write(ch)


if __name__ == '__main__':
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), H)
    print(f'Nobunaga talk demo: http://localhost:{PORT}/demos/nobunaga-suntory/Demo23_NobunagaTalk/   (Ctrl+C to stop)')
    srv.serve_forever()
