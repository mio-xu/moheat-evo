"""Load earlier demos' modules by path (names collide with this demo's own scripts). Earlier demos are never modified.

Works before and after the repo re-organisation (Demo 1–4 moved into demos/DemoN_Name) and wherever this demo lives:
the site root is the first parent folder that contains device.js.
"""
import glob, importlib.util, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = HERE
while SITE != os.path.dirname(SITE) and not os.path.exists(os.path.join(SITE, "device.js")):
    SITE = os.path.dirname(SITE)


def demo_dir(*names):
    for n in names:
        for p in (os.path.join(SITE, "demos", n), os.path.join(SITE, n)) + tuple(glob.glob(os.path.join(SITE, "demos", "*", n))):   # demos/<category>/<name> since 2026-11-08
            if os.path.isdir(p): return p
    raise FileNotFoundError(names)


D1_TOOLS = os.path.join(demo_dir("Demo01_SnowFoxfire", "ASMR Demo"), "tools")
D2_TOOLS = os.path.join(demo_dir("Demo02_FanMeeting", "ASMR Demo 2"), "tools")
D3 = demo_dir("Demo03_ShiningSmileConcert")


def load(name):
    key = f"demo1_{name}"
    if key in sys.modules: return sys.modules[key]
    if D1_TOOLS not in sys.path: sys.path.append(D1_TOOLS)      # for Demo 1's own imports (story, tts_voicevox)
    spec = importlib.util.spec_from_file_location(key, os.path.join(D1_TOOLS, name + ".py"))
    m = importlib.util.module_from_spec(spec); sys.modules[key] = m; spec.loader.exec_module(m)
    return m


def load_path(key, path):
    if key in sys.modules: return sys.modules[key]
    spec = importlib.util.spec_from_file_location(key, path); m = importlib.util.module_from_spec(spec)
    sys.modules[key] = m; spec.loader.exec_module(m); return m
