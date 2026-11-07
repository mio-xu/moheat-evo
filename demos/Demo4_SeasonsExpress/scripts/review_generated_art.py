"""Inspect the generated source pack without changing images or player assets."""
import hashlib
import html
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / 'project'


def main():
    manifest = json.loads((PROJECT / 'generated_art_manifest.json').read_text())
    checks, cards = [], []
    for item in manifest['assets']:
        path = PROJECT / 'generated_art' / item['path']
        with Image.open(path) as image:
            image.load()
            width = 1024 if path.stem.startswith('fx_') or path.stem in ('clock_face', 'table_props', 'lamp') else 1536
            alpha_expected = path.stem.startswith('fx_') or path.stem.endswith(('_mid', '_near', '_overlay', '_corner')) or path.stem in ('clock_face', 'table_props', 'lamp')
            alpha = np.asarray(image.getchannel('A')) if 'A' in image.getbands() else None
            check = dict(path=item['path'], size=list(image.size), mode=image.mode,
                         dimensions_ok=image.size == (width, 1024),
                         alpha_expected=alpha_expected,
                         transparency_ok=not alpha_expected or (alpha is not None and bool(np.any(alpha == 0)) and bool(np.any(alpha > 0))),
                         sha256=hashlib.sha256(path.read_bytes()).hexdigest())
            if alpha is not None:
                check['fully_transparent_fraction'] = round(float(np.mean(alpha == 0)), 4)
            checks.append(check)
        name = html.escape(item['path'])
        url = 'generated_art/' + name
        origin = 'Reused existing asset' if item['provenance'].startswith('reused_') else 'AI generated'
        cards.append(f'<figure><a href="{url}" target="_blank"><img loading="lazy" src="{url}" alt="{name}"></a><figcaption>{name}<br>{image.width} × {image.height} · {image.mode} · {origin}</figcaption></figure>')
    report = dict(count=len(checks), expected_count=37,
                  newly_generated=manifest['newly_generated'], reused_existing=manifest['reused_existing'],
                  all_dimensions_ok=all(c['dimensions_ok'] for c in checks),
                  all_transparency_ok=all(c['transparency_ok'] for c in checks),
                  integration_status='Source pack only; not installed in player. Chroma key, geometry alignment and animated seam review remain before integration.',
                  assets=checks)
    (PROJECT / 'generated_art_qa.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    gallery = '''<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Demo 4 — Generated Art</title>
<style>body{margin:0;padding:32px;background:#171b29;color:#f4efff;font:15px system-ui}h1{font-size:28px}p{color:#bdc9dc}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px}figure{margin:0;border:1px solid #424a63;border-radius:12px;overflow:hidden}img{display:block;width:100%;aspect-ratio:3/2;object-fit:contain;background-color:#8e9aaa;background-image:linear-gradient(45deg,#acb6c4 25%,transparent 25%),linear-gradient(-45deg,#acb6c4 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#acb6c4 75%),linear-gradient(-45deg,transparent 75%,#acb6c4 75%);background-size:24px 24px;background-position:0 0,0 12px,12px -12px,-12px 0}figcaption{padding:12px;font-size:13px;overflow-wrap:anywhere}a{color:inherit}</style>
<h1>季節が暴走する魔法の列車 / Generated Art</h1><p>Source pack · 36 generated + 1 reused PNG · Click an image to inspect full size. Local source files are excluded from Git.</p><main>'''
    (PROJECT / 'generated_art_gallery.html').write_text(gallery + '\n'.join(cards) + '</main></html>\n')
    print(json.dumps({key: value for key, value in report.items() if key != 'assets'}, ensure_ascii=False))
    if len(checks) != 37 or not report['all_dimensions_ok'] or not report['all_transparency_ok']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
