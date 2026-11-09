#!/usr/bin/env python3
"""Leftover test browsers: headless Chromes whose parent is gone (ppid = 1) and that run on a temporary QA profile.

    python3 tools/qa/reap_chrome.py          # list them
    python3 tools/qa/reap_chrome.py --kill   # close them

Run it at the end of any QA session (user 2026-11-09: close the browsers when done). A Chrome without --headless, with a live parent or
without a --user-data-dir in the temp folder is never touched, so the user's own Chrome and running tests are safe.
"""
import os, re, shutil, signal, subprocess, sys, tempfile, time

TMP = tuple({os.path.realpath(tempfile.gettempdir()), '/private/tmp', '/tmp', '/private/var/folders', '/var/folders'})


def leftovers():
    out = []
    for line in subprocess.run(['ps', '-axo', 'pid=,ppid=,etime=,command='], capture_output=True, text=True).stdout.splitlines():
        m = re.match(r'\s*(\d+)\s+(\d+)\s+(\S+)\s+(.*)', line)
        if not m: continue
        pid, ppid, etime, cmd = int(m[1]), int(m[2]), m[3], m[4]
        if ppid != 1 or 'Google Chrome' not in cmd or '--headless' not in cmd or '--type=' in cmd: continue
        p = re.search(r'--user-data-dir=(\S+)', cmd)
        if p and os.path.realpath(p[1]).startswith(TMP): out.append((pid, etime, p[1]))
    return out


def main():
    found = leftovers()
    for pid, etime, prof in found: print(pid, etime, prof)
    print(f'{len(found)} leftover headless Chrome(s)')
    if '--kill' not in sys.argv or not found: return
    for pid, _, _ in found:
        try: os.kill(pid, signal.SIGTERM)
        except ProcessLookupError: pass
    time.sleep(2)
    for pid, _, prof in found:
        try: os.kill(pid, signal.SIGKILL)
        except ProcessLookupError: pass
        shutil.rmtree(prof, ignore_errors=True)
    print('closed')


if __name__ == '__main__':
    main()
