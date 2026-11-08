"""Every voiced line × 3 takes with the ElevenLabs voices (nobunaga r1_a / ieyasu r1_a via Demo 9 perform(); was VOICEVOX) → audio/takes/
  python3 scripts/make_voice.py      Needs ELEVENLABS_API_KEY in the repo .env.local. TAKE = {cue index: take} picks the take used in the film."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gifu as ST
from sengoku import V, ROOT
SR = 48000
TAKE = {}
VOICED = ("say", "whisper", "laugh")


def main():
    d = os.path.join(ROOT, "audio", "takes"); os.makedirs(d, exist_ok=True); os.makedirs(V.CACHE, exist_ok=True)
    info = {}
    for i, c in enumerate(ST.CUES0):
        if c["kind"] not in VOICED: continue
        durs = []
        for k in range(3):
            x = V.perform(c, k); durs.append(round(len(x) / SR, 2))
            dst = os.path.join(d, f"{i:02d}_{c['who']}_{c['emo']}_t{k}.wav")
            if os.path.lexists(dst): os.remove(dst)
            os.symlink(os.path.relpath(V._last_path[0], d), dst)
        use = TAKE.get(i, 0)
        info[i] = dict(who=c["who"], t=c["t"], kind=c["kind"], ja=c["ja"], durs=durs, take=use, dur=durs[use])
        print(f"{i:02d} {c['t']:6.1f}s {c['who']} {c['kind']:7s} {durs}  ends {c['t'] + durs[use]:6.1f}  {c['ja']}", flush=True)
    seq = sorted((c["t"], c["t"] + info[i]["dur"], c["who"], i) for i, c in enumerate(ST.CUES0) if i in info)
    for a, b in zip(seq, seq[1:]):
        if a[2] == b[2] and a[1] > b[0] - .1: print(f"  ! {a[2]} {a[0]:.1f}–{a[1]:.1f}s runs into {b[2]} {b[0]:.1f}s")
    json.dump(info, open(os.path.join(ROOT, "audio", "takes.json"), "w"), indent=1, ensure_ascii=False)
    pts = ST._R.compute(ST.CUES0, {i: v["dur"] for i, v in info.items()})
    json.dump(pts, open(os.path.join(ROOT, "audio", "retime.json"), "w"))
    print(f"retime: {len(pts)} gaps, +{sum(e for _, e in pts):.1f} s → film {ST.DURATION0 + sum(e for _, e in pts):.1f} s")


# ---------------------------------------------------------------- dubbed takes (user 2026-11-09: every demo voiced in ja / en / zh)
# --lang ja|en|zh [--count] → media/voice/<lang>/c<NN>.m4a (NN = cue index in CUES0) + index.json: one dry mono file per spoken line,
# same ElevenLabs voice / settings / emotion tag as the film (ja = the film's cached takes, 0 credits; en / zh = the subtitles with the ja
# tag moved in, tools/eleven/dub.py; trimmed + loudnorm like each other). Laughs stay ja (no words). Inputs for the per-language re-mix
# (one shared timeline = the longest language per line, see the rollout notes); not mixed into the film yet.
DUB_NAMES = {"zh": [("织田信长", "Oda Nobunaga"), ("信长", "Nobunaga"), ("德川家康", "Tokugawa Ieyasu"), ("家康", "Ieyasu")]}
DUB_OVERRIDE = {}                                  # (lang, cue id) → hand-tagged text when retag() is not good enough


def dub(lang, count_only=False):
    import importlib.util
    _V = V
    sp = importlib.util.spec_from_file_location("dub", os.path.join(ROOT, "..", "..", "..", "tools", "eleven", "dub.py"))
    D = importlib.util.module_from_spec(sp); sp.loader.exec_module(D)
    l10 = open(os.path.join(ROOT, "l10n.js"), encoding="utf-8").read(); Z = json.loads(l10[l10.index("= {") + 2:l10.rindex("}") + 1])["text"].get("zh", {})
    cues = {f"c{i:02d}": c for i, c in enumerate(ST.CUES0) if c["kind"] in ("say", "whisper", "laugh")}
    out = os.path.join(ROOT, "media", "voice", lang)
    if lang == "ja":
        wavs = {}
        for k, c in cues.items():
            w = os.path.join(_V.CACHE, f"{c['who']}_el_{_V._key(_V.el_text(c), _V.EL_VOICE[c['who']], _V.E.MODEL, _V.E.SEED)}.wav")
            if os.path.exists(w): wavs[k] = w
            else: print("  ! no cached ja take for", k, c["ja"])
        print(f"[ja] {len(wavs)} / {len(cues)} cached takes")
        if not count_only: D.export_ja(wavs, out, {k: _V.el_text(c) for k, c in cues.items()}, af=D.FILM_AF)
        return
    lines = {}
    for k, c in cues.items():
        if c["kind"] == "laugh": continue
        sub = c["en"] if lang == "en" else Z.get(c["ja"]) or c.get(lang)
        if not sub: raise SystemExit(f"{k}: no {lang} subtitle for {c['ja']}")
        lines[k] = (_V.EL_VOICE[c["who"]], DUB_OVERRIDE.get((lang, k)) or D.retag(_V.el_text(c), D.names(sub, lang, DUB_NAMES), lang))
    D.render(lines, lang, out, os.path.join(ROOT, "audio", f"voice_cache.{lang}.json"), count_only=count_only, af=D.FILM_AF)


if __name__ == "__main__":
    if "--lang" in sys.argv: dub(sys.argv[sys.argv.index("--lang") + 1], "--count" in sys.argv)
    else: main()
