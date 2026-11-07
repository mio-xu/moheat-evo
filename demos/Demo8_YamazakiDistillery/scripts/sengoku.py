"""Load the Sengoku banquet demo's modules by path (never modified): voices, SFX, binaural renderer, thermal controller.
The folder is found by name pattern, so a renumbering (Demo4_/Demo5_SengokuBanquet) does not break this demo."""
import glob, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEMOS = os.path.dirname(ROOT)
SENGOKU = sorted(glob.glob(os.path.join(DEMOS, "Demo*_SengokuBanquet")))[-1]
sys.path.insert(1, os.path.join(SENGOKU, "scripts"))      # after this demo's own scripts/ (all names here are distinct)

import importlib.util


def _load(name):
    """By file path under a unique key: Demo 1's tools (also named build_audio / thermal) get onto sys.path first."""
    key = f"sengoku_{name}"
    if key in sys.modules: return sys.modules[key]
    spec = importlib.util.spec_from_file_location(key, os.path.join(SENGOKU, "scripts", name + ".py"))
    m = importlib.util.module_from_spec(spec); sys.modules[key] = m; spec.loader.exec_module(m)
    return m


V = _load("voice")           # locked personas (信長 青山龍星 −1.5 st, 家康 黒沢冴白 −2 st), perform(), 3 takes
sys.modules.setdefault("voice", V)
BA = _load("build_audio")    # SFX: ice, clink, pour, koto, insects … + Demo 1 helpers (BA.B) + HRTF renderer
TH = _load("thermal")        # level(), ear_weights(), proximity(), checks(), plot() + Demo 1 controller (TH.T1)
B = BA.B

V.CACHE = os.path.join(ROOT, "audio", "cache")             # keep this demo's takes in its own folder
