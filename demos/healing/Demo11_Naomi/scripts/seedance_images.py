"""Generate the Naomi demo art with the Seedance 2.5 API — Demo 10's client loaded by path, pointed at this demo's folders.

  python3 scripts/seedance_images.py 01 02         # these jobs
  python3 scripts/seedance_images.py all           # every job whose PNG does not exist yet (in job order)
  python3 scripts/seedance_images.py 06 --again    # a new variant (charges again)
  python3 scripts/seedance_images.py 06 --fetch    # download an already-submitted generation (no new charge)

Key: ~/.seedance_key. Jobs: project/seedance_jobs.json (scripts/make_jobs.py). Raw PNGs: assets/art/ (not in git).
"""
import importlib.util, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('d10_seedance', os.path.join(os.path.dirname(ROOT), '../for-kids/Demo10_CaveSpring', 'scripts', 'seedance_images.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
m.JOBS = os.path.join(ROOT, 'project', 'seedance_jobs.json')
m.OUT = os.path.join(ROOT, 'assets', 'art')
m.LOG = os.path.join(ROOT, 'project', 'seedance_log.json')

if __name__ == '__main__':
    m.main()
