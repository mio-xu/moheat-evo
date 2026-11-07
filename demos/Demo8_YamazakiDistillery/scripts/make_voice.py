"""Every voiced line × 3 takes with the locked personas (信長 青山龍星 −1.5 st, 家康 黒沢冴白 −2 st) → audio/takes/
  python3 scripts/make_voice.py      Needs VOICEVOX. TAKE = {cue index: take} picks the take used in the film."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import yamazaki as ST
from sengoku import V, ROOT
SR = 48000
TAKE = {}
VOICED = ("say", "whisper", "laugh")


def main():
    d = os.path.join(ROOT, "audio", "takes"); os.makedirs(d, exist_ok=True); os.makedirs(V.CACHE, exist_ok=True)
    info = {}
    for i, c in enumerate(ST.CUES):
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
    seq = sorted((c["t"], c["t"] + info[i]["dur"], c["who"], i) for i, c in enumerate(ST.CUES) if i in info)
    for a, b in zip(seq, seq[1:]):
        if a[2] == b[2] and a[1] > b[0] - .1: print(f"  ! {a[2]} {a[0]:.1f}–{a[1]:.1f}s runs into {b[2]} {b[0]:.1f}s")
    json.dump(info, open(os.path.join(ROOT, "audio", "takes.json"), "w"), indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
