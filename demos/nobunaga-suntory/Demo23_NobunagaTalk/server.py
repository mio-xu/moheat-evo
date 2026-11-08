"""PRIVATE live-talk server — moved to tools/talk/server.py on 2026-11-08 (one server, one password, one set of limits for every
live-talk demo: Demo23 / 41 / 42 here and the crossover demos; list in tools/talk/demos.json). This file only runs it, so
`python3 server.py`, start_demo.command and start_remote.command keep working exactly as before (same port 8771, same /live URLs,
same ~/.moheat_live_pass, same limits.json and local/usage.json of this folder)."""
import os, runpy
runpy.run_path(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'tools', 'talk', 'server.py'), run_name='__main__')
