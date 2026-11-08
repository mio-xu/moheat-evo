#!/usr/bin/env python3
"""Local test server with HTTP Range support: python3 tools/qa/serve.py <port> [--bind 127.0.0.1] [--directory <root>]

`python3 -m http.server` ignores Range, so Chrome cannot seek an <audio>/<video> it serves (seekable = 0): a film's
"jump to the resume point" lands back at 0 and an interact.js gate fires again forever (Demo09 under page_probe, 2026-11-09,
DEMO_DESIGN_GUIDE §11.1). GitHub Pages serves ranges, so the QA browsers use this server instead.
"""
import argparse, functools, http.server, os, re, socketserver


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def send_head(self):
        rng = self.headers.get('Range')
        m = re.match(r'bytes=(\d*)-(\d*)$', rng or '')
        path = self.translate_path(self.path)
        if not m or os.path.isdir(path) or not os.path.isfile(path):
            return super().send_head()
        size = os.path.getsize(path)
        a, b = m.groups()
        if a == '':
            start, end = max(0, size - int(b or 0)), size - 1
        else:
            start, end = int(a), min(size - 1, int(b) if b else size - 1)
        if start >= size or start > end:
            self.send_response(416); self.send_header('Content-Range', f'bytes */{size}'); self.end_headers(); return None
        f = open(path, 'rb'); f.seek(start)
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(end - start + 1))
        self.end_headers()
        self._left = end - start + 1
        return f

    def copyfile(self, src, dst):
        left = getattr(self, '_left', None)
        if left is None:
            return super().copyfile(src, dst)
        while left > 0:
            buf = src.read(min(65536, left))
            if not buf:
                break
            dst.write(buf); left -= len(buf)
        self._left = None

    def end_headers(self):
        if not getattr(self, '_left', None) and self.command in ('GET', 'HEAD'):
            self.send_header('Accept-Ranges', 'bytes')
        super().end_headers()


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('port', type=int)
    p.add_argument('--bind', default='127.0.0.1')
    p.add_argument('--directory', default=os.getcwd())
    o = p.parse_args()
    Server((o.bind, o.port), functools.partial(Handler, directory=o.directory)).serve_forever()
