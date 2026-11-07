"""Local bridge for generating the Seedance art through the website (the API upload endpoint was rate-limited).

  python3 scripts/web_bridge.py      # http://127.0.0.1:8766  (CORS + Private-Network headers so the seedance2-5.com page can call it)

  GET  /next         → the first job in ORDER whose PNG is missing and whose reference images exist: {name, refs, prompt}
  GET  /ref/<n>.jpg  → assets/art/<n>.png as a JPG under 4 MB (the website's upload limit)
  POST /save         {name, url} → downloads the generated image to assets/art/<name>.png
Prompts and references are exactly those of scripts/seedance.py (loaded by path), so web and API results match.
"""
import importlib.util, io, json, os, sys, urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.argv = ['seedance.py']
spec = importlib.util.spec_from_file_location('sd', os.path.join(ROOT, 'scripts', 'seedance.py'))
SD = importlib.util.module_from_spec(spec); spec.loader.exec_module(SD)
ART = os.path.join(ROOT, 'assets', 'art')
DESIGN = {'mint': 'design_A_mint', 'cocoa': 'design_D_cocoa', 'hinata': 'design_B_hinata', 'luna': 'design_C_luna'}
ORDER = ('cocoa_live mint_lean_L mint_lean_R mint_ice mint_towel mint_bye cocoa_live_talk cocoa_live_blink cocoa_fufu cocoa_aan cocoa_blanket cocoa_bye '
         'hinata_live luna_live hinata_live_talk hinata_live_blink hinata_eat hinata_spicy hinata_cool hinata_fan hinata_whisper hinata_bye '
         'luna_live_talk luna_live_blink luna_window luna_tea luna_musicbox luna_close luna_bye mint_live_talk_s mint_live_half '
         'cocoa_live_talk_s cocoa_live_half mint_lean_L_talk_s mint_lean_R_talk_s mint_bye_talk cocoa_aan_talk_s cocoa_blanket_talk cocoa_bye_talk').split()
has = lambda n: os.path.exists(os.path.join(ART, n + '.png'))


def job(name):
    char, extra, parts = SD.SCENES[name]
    refs = ['mint_live', DESIGN[char]] + extra
    lead = [SD.LOOK2] + (["Image 3 shows her in this scene (same room, same camera): keep the room and camera the same."] if extra and not parts[0].startswith('Image 3') else [])
    return {'name': name, 'refs': refs, 'prompt': '\n\n'.join(lead + parts + [SD.AVOID])}


class H(BaseHTTPRequestHandler):
    def cors(self, code=200, ctype='application/json'):
        self.send_response(code)
        for k, v in (('Access-Control-Allow-Origin', '*'), ('Access-Control-Allow-Headers', '*'), ('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'),
                     ('Access-Control-Allow-Private-Network', 'true'), ('Content-Type', ctype)):
            self.send_header(k, v)
        self.end_headers()

    def do_OPTIONS(self): self.cors(204)

    def do_GET(self):
        if self.path == '/next':
            todo = [n for n in ORDER if not has(n)]
            ready = [n for n in todo if all(has(r) for r in job(n)['refs'])]
            self.cors(); self.wfile.write(json.dumps({'left': len(todo), 'job': job(ready[0]) if ready else None}).encode()); return
        if self.path.startswith('/ref/') and self.path.endswith('.jpg'):
            n = self.path[5:-4]
            if not has(n): self.cors(404); return
            im = Image.open(os.path.join(ART, n + '.png')).convert('RGB'); im.thumbnail((2048, 2048))
            b = io.BytesIO(); im.save(b, 'JPEG', quality=90)
            self.cors(ctype='image/jpeg'); self.wfile.write(b.getvalue()); return
        self.cors(404)

    def do_POST(self):
        if self.path != '/save': self.cors(404); return
        d = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        name, url = d['name'], d['url']
        if name not in SD.SCENES: self.cors(400); return
        raw = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'moheat-demo14/1.0'}), timeout=120).read()
        im = Image.open(io.BytesIO(raw)); im.load()
        tmp = os.path.join(ART, name + '.png.part'); im.save(tmp, 'PNG'); os.replace(tmp, os.path.join(ART, name + '.png'))
        print('saved', name, im.size, flush=True)
        self.cors(); self.wfile.write(json.dumps({'ok': True, 'size': im.size}).encode())

    def log_message(self, *a): pass


if __name__ == '__main__':
    print('bridge on http://127.0.0.1:8766', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 8766), H).serve_forever()
