#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Hourly patrol, one line: load, orphan QA browsers, the heavy-job lock holder, leftover QA servers / tools (user 2026-11-09, machine overload).

  python3 tools/qa/patrol.py            # report only
  python3 tools/qa/patrol.py -v         # + one line per item
  python3 tools/qa/patrol.py --clean    # close only what is clearly ours

Clearly ours, and nothing else, is touched:
  · a headless Chrome with no parent (ppid 1) on a temporary QA profile (reap_chrome.py);
  · a server recorded by tools/qa/chrome_guard.js (~/.moheat_heavy/qa/<pid>.json, same pid AND same start time) whose owner tool is gone;
  · a recorded QA node tool with no parent, running > MOHEAT_PATROL_STALE_H hours (default 3; no QA tool legitimately runs that long).
The user's own Chrome, any Chrome without a temp profile and any process without a matching record are only ever counted ("unmatched").
"""
import glob, json, os, re, signal, subprocess, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import heavy_lock, reap_chrome

REG = os.path.join(heavy_lock.DIR, 'qa')
STALE = float(os.environ.get('MOHEAT_PATROL_STALE_H') or 3) * 3600


def secs(etime):
    m = re.match(r'(?:(\d+)-)?(?:(\d+):)?(\d+):(\d+)$', etime)
    return int(m[1] or 0) * 86400 + int(m[2] or 0) * 3600 + int(m[3]) * 60 + int(m[4]) if m else 0


def table():
    out = {}
    for line in subprocess.run(['ps', '-axo', 'pid=,ppid=,etime=,command='], capture_output=True, text=True).stdout.splitlines():
        m = re.match(r'\s*(\d+)\s+(\d+)\s+(\S+)\s+(.*)', line)
        if m: out[int(m[1])] = (int(m[2]), secs(m[3]), m[4])
    return out


def scan():
    ps, servers, tools, seen = table(), [], [], set()
    now = time.time()
    for f in glob.glob(os.path.join(REG, '*.json')):
        try: r = json.load(open(f))
        except (ValueError, OSError): continue
        p = ps.get(r.get('pid'))
        if not p or abs(p[1] - (now - r['started'] / 1000)) > 60:   # gone, or the pid was reused: the record means nothing
            try: os.unlink(f)
            except OSError: pass
            continue
        seen.add(r['pid'])
        if r['kind'] == 'server' and r.get('owner') not in ps: servers.append((r['pid'], p[1], f))
        if r['kind'] == 'tool' and p[0] == 1 and p[1] > STALE: tools.append((r['pid'], p[1], f, r.get('tool', '')))
    unmatched = [pid for pid, (ppid, _, cmd) in ps.items() if ppid == 1 and pid not in seen and re.search(r'-m http\.server|tools/(qa|art|web)/\w+\.js', cmd)]
    return servers, tools, unmatched


def main():
    clean, verbose = '--clean' in sys.argv, '-v' in sys.argv
    chromes = reap_chrome.leftovers(); servers, tools, unmatched = scan()
    h = heavy_lock.holder(); load, lim = heavy_lock.load_now(), heavy_lock.load_limit()
    print(f'load {load:.1f}/{lim:.0f}{" HIGH" if load > lim else ""} · heavy: {heavy_lock.describe(h) if h is not None else "free"} · orphan Chrome {len(chromes)} · stale QA servers {len(servers)} · stale QA tools {len(tools)} · unmatched (left alone) {len(unmatched)}')
    if verbose:
        for p, e, prof in chromes: print(f'  chrome {p} {e} {prof}')
        for p, s, _ in servers: print(f'  server {p} {s // 60} min')
        for p, s, _, t in tools: print(f'  tool {p} {s // 60} min {t}')
        for p in unmatched: print(f'  unmatched {p}')
    if not clean: return
    for p, _, f, *_x in servers + tools:
        try: os.kill(p, signal.SIGTERM)
        except ProcessLookupError: pass
        try: os.unlink(f)
        except OSError: pass
    if chromes:
        for p, _, _ in chromes:
            try: os.kill(p, signal.SIGTERM)
            except ProcessLookupError: pass
        time.sleep(2)
        import shutil
        for p, _, prof in chromes:
            try: os.kill(p, signal.SIGKILL)
            except ProcessLookupError: pass
            shutil.rmtree(prof, ignore_errors=True)
    print(f'closed: {len(chromes)} Chrome, {len(servers)} server(s), {len(tools)} tool(s)')


if __name__ == '__main__':
    main()
