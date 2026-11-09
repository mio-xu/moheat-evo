"""The viewer's spoken turns for the promo (ElevenLabs account voice 'saku', male; ~30 characters,
cached: a file that exists is not rendered again). The same words are typed into the scripted page (TALKDEMO.say) — on a real
device they come from speech recognition. Usage: python3 user_voice.py <outdir>"""
import importlib.util, os, sys
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), *['..'] * 5))
sp = importlib.util.spec_from_file_location('eleven', os.path.join(REPO, 'tools', 'eleven', 'tts.py')); E = importlib.util.module_from_spec(sp); sp.loader.exec_module(E)
LINES = {'u7': '[casual] 焼き鳥の、ねぎまがおすすめです！', 'u8': '[casual] こたつで、みかんです。', 'u9': '[nervous] えっ…いや、何も知らないです…'}
VOICE = 'saku'   # a native-sounding young Japanese man from the account (tools/eleven/cast.json, not a public character); v4 you = AI voice
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
for k, t in LINES.items():
    p = os.path.join(out, k + '.wav')
    if os.path.exists(p): continue
    open(p, 'wb').write(E.speak(t, E.voice(VOICE))); print('rendered', k, len(t), 'chars')
