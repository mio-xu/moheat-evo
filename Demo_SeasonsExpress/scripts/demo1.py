"""Load Demo 1 modules by path (names collide with Demo 2's own tools). Demo 1 is never modified. (copied from Demo 3)"""
import importlib.util, os, sys
D1_TOOLS = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "ASMR Demo", "tools")


def load(name):
    key = f"demo1_{name}"
    if key in sys.modules: return sys.modules[key]
    if D1_TOOLS not in sys.path: sys.path.append(D1_TOOLS)      # for Demo 1's own imports (story, tts_voicevox)
    spec = importlib.util.spec_from_file_location(key, os.path.join(D1_TOOLS, name + ".py"))
    m = importlib.util.module_from_spec(spec); sys.modules[key] = m; spec.loader.exec_module(m)
    return m
