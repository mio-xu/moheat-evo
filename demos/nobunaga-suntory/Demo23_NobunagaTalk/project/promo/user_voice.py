"""The viewer's spoken turns for the promo (ElevenLabs premade male voice 'Will'; ~30 characters,
cached: a file that exists is not rendered again). The same words are typed into the scripted page (TALKDEMO.say) — on a real
device they come from speech recognition. Usage: python3 user_voice.py <outdir>"""
import importlib.util, os, sys
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), *['..'] * 5))
sp = importlib.util.spec_from_file_location('eleven', os.path.join(REPO, 'tools', 'eleven', 'tts.py')); E = importlib.util.module_from_spec(sp); sp.loader.exec_module(E)
LINES = {'u5m': '[casual] 焼き鳥のねぎまがおすすめです！', 'u6m': '[casual] こたつで温まります！'}
VOICE = 'bIHbv24MWmeRgasZH58o'   # ElevenLabs premade 'Will' (young adult male, relaxed) — the viewer is a man (user 2026-11-09); not a cast character
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
for k, t in LINES.items():
    p = os.path.join(out, k + '.wav')
    if os.path.exists(p): continue
    open(p, 'wb').write(E.speak(t, VOICE)); print('rendered', k, len(t), 'chars')
