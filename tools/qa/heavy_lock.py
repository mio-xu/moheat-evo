#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""One heavy job at a time on this machine, across all agents and sessions (user 2026-11-09: the computer was overloaded; DEMO_DESIGN_GUIDE §11.1).

Heavy = check_demo --full, lp_mouths / LivePortrait, build_stage, render_mp4 / video export / long ffmpeg, covers.py batches.

  python3 tools/qa/heavy_lock.py run "<job name>" -- <command …>   # any command (a long ffmpeg, node render.js …): queue, load guard, background priority
  python3 tools/qa/heavy_lock.py status                            # who holds it
  from Python:  import heavy_lock; heavy_lock.guard('build_stage Demo22')      # first line of the job; held until the process ends
  from node:    require('…/tools/qa/heavy_lock.js').wrapSelf('promo render')   # first line of the script; re-runs the script under `run`

What a job goes through, in this order:
  1. queue: an flock on ~/.moheat_heavy/heavy.lock (outside the repo, MOHEAT_HEAVY_DIR overrides). The kernel drops it when the holder dies, however it
     dies (SIGKILL included), so a dead holder can never block the queue. Waiters print who holds it. Waited > MOHEAT_HEAVY_WAIT_SEC (default 7200) → exit 75.
     A job run by a job that already holds the lock does not queue again (MOHEAT_HEAVY_HOLDER, inherited).
  2. load guard: waits while the 1-min load is above MOHEAT_LOAD_MAX (default MOHEAT_LOAD_FACTOR 1.5 × CPU cores), up to MOHEAT_LOAD_WAIT_SEC (default 1800).
     Still too high → exit 75 with "NOT run". A job is never skipped silently.
  3. low priority, inherited by child processes, so the user's own work wins: `taskpolicy -b` on macOS + nice 10 for number crunching; nice 10 only for jobs that drive a
     browser (guard(job, browser=True), MOHEAT_QA_PRIORITY=nice for `run`), because -b drops headless Chrome from 60 to 6-8 fps even on an idle machine. MOHEAT_QA_PRIORITY=normal turns it off.
Exit code 75 (EX_TEMPFAIL) always means: the job did NOT run, machine busy, try again.
"""
import errno, fcntl, json, os, signal, subprocess, sys, time

DIR = os.environ.get('MOHEAT_HEAVY_DIR') or os.path.expanduser('~/.moheat_heavy')
LOCK = os.path.join(DIR, 'heavy.lock')
ENV = 'MOHEAT_HEAVY_HOLDER'
BUSY = 75
_fd = None


def say(msg): print(f'[heavy] {msg}', file=sys.stderr, flush=True)
def num(name, default): return float(os.environ.get(name) or default)
def load_limit(): return num('MOHEAT_LOAD_MAX', 0) or num('MOHEAT_LOAD_FACTOR', 1.5) * (os.cpu_count() or 4)
def load_now(): return os.getloadavg()[0]
def overloaded(): return load_now() > load_limit()


def alive(pid):
    try: os.kill(pid, 0); return True
    except ProcessLookupError: return False
    except PermissionError: return True


def holder():
    """None when free, else the holder's {pid, job, agent, since} (from the lock file; the flock itself decides whether anyone holds it)."""
    try: fd = os.open(LOCK, os.O_RDONLY)
    except FileNotFoundError: return None
    try:
        try: fcntl.flock(fd, fcntl.LOCK_SH | fcntl.LOCK_NB)
        except OSError: pass
        else: return None
        try: return json.loads(os.read(fd, 4096).decode() or '{}')
        except ValueError: return {}
    finally: os.close(fd)


def describe(h):
    return f"{h.get('job', '?')} (pid {h.get('pid', '?')}, agent {h.get('agent', '?')}, {int((time.time() - h.get('since', time.time())) / 60)} min)"


def _lock(job):
    global _fd
    limit = num('MOHEAT_HEAVY_WAIT_SEC', 7200)
    try: os.makedirs(DIR, exist_ok=True); fd = os.open(LOCK, os.O_RDWR | os.O_CREAT, 0o644)
    except OSError as e: say(f'cannot open {LOCK} ({e}): set MOHEAT_HEAVY_DIR. "{job}" NOT run'); sys.exit(BUSY)
    t0 = last = time.time(); shown = None
    while True:
        try: fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB); break
        except OSError as e:
            if e.errno not in (errno.EWOULDBLOCK, errno.EAGAIN): raise
        now = time.time(); h = holder() or {}
        if h.get('pid') != shown or now - last >= 60:
            shown, last = h.get('pid'), now; say(f'"{job}" waits for the heavy-job lock, held by {describe(h)}; waited {int(now - t0)} s')
        if now - t0 > limit: say(f'"{job}" NOT run: lock still held after {int(limit)} s by {describe(h)}. Machine busy, retry'); sys.exit(BUSY)
        time.sleep(2)
    os.ftruncate(fd, 0); os.lseek(fd, 0, 0)
    os.write(fd, json.dumps({'pid': os.getpid(), 'job': job, 'agent': os.environ.get('MOHEAT_AGENT', ''), 'since': time.time()}).encode())
    _fd = fd


def _wait_load(job):
    limit, wait, t0, last = load_limit(), num('MOHEAT_LOAD_WAIT_SEC', 1800), time.time(), 0
    while load_now() > limit:
        now = time.time()
        if now - t0 > wait: say(f'"{job}" NOT run: 1-min load {load_now():.1f} stayed above {limit:.1f} for {int(wait)} s. Machine busy, retry'); sys.exit(BUSY)
        if now - last >= 30: last = now; say(f'"{job}" waits: 1-min load {load_now():.1f} > {limit:.1f} (MOHEAT_LOAD_MAX overrides)')
        time.sleep(5)


def low_priority(browser=False):
    mode = os.environ.get('MOHEAT_QA_PRIORITY')
    if mode == 'normal': return
    try: os.nice(10)
    except OSError: pass
    if sys.platform == 'darwin' and not browser and mode != 'nice': subprocess.run(['/usr/sbin/taskpolicy', '-b', '-p', str(os.getpid())], check=False)


def guard(job, browser=False):
    """Queue + load guard + low priority for this process; returns once it may run, exits 75 if it may not. Held until the process ends. browser=True: the job drives a browser."""
    h = os.environ.get(ENV, '')
    if _fd is not None or (h.isdigit() and alive(int(h))): return
    _lock(job); _wait_load(job); low_priority(browser)
    os.environ[ENV] = str(os.getpid())


def run(job, cmd):
    guard(job)
    parent = os.getppid(); watch = os.environ.pop('MOHEAT_HEAVY_WATCH_PARENT', '')
    p = subprocess.Popen(cmd)
    def stop(sig, _=None):
        try: p.send_signal(sig)
        except ProcessLookupError: pass
    for s in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP): signal.signal(s, stop)
    while p.poll() is None:
        try: p.wait(1)
        except subprocess.TimeoutExpired: pass
        if watch and os.getppid() != parent: stop(signal.SIGTERM); watch = ''   # the node script that re-ran itself under us was killed
    return p.returncode if p.returncode >= 0 else 128 - p.returncode


def main():
    a = sys.argv[1:]
    if a[:1] == ['status']:
        h = holder(); print(f'held by {describe(h)}' if h is not None else 'free'); return 0
    if a[:1] == ['run'] and len(a) >= 4 and a[2] == '--': return run(a[1], a[3:])
    print(__doc__); return 2


if __name__ == '__main__':
    sys.exit(main())
