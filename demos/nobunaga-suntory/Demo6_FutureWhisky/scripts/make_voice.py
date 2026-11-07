"""Every voiced line × 3 takes (same personas as the Sengoku demo) → audio/takes/ (symlinks to audio/cache).
  python3 scripts/make_voice.py      Needs VOICEVOX.  TAKE = {cue index: take} picks a take for the film."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import whisky as WK
from sengoku import V, ROOT
SR = 48000
TAKE = {}
VOICED = ("say", "whisper", "laugh")


def main():
    d = os.path.join(ROOT, "audio", "takes"); os.makedirs(d, exist_ok=True); os.makedirs(V.CACHE, exist_ok=True)
    info = {}
    for i, c in enumerate(WK.CUES):
        if c["kind"] not in VOICED: continue
        durs = []
        for k in range(3):
            x = V.perform(c, k); durs.append(round(len(x) / SR, 2))
            dst = os.path.join(d, f"{i:02d}_{c['who']}_{c['emo']}_t{k}.wav")
            if os.path.lexists(dst): os.remove(dst)
            os.symlink(os.path.relpath(V._last_path[0], d), dst)
        use = TAKE.get(i, 0)
        info[i] = dict(who=c["who"], t=c["t"], kind=c["kind"], durs=durs, take=use, dur=durs[use])
    # report overlaps (same speaker, and any two voices) so the timeline can be laid out around the real performances
    seq = sorted(((c["t"], c["t"] + info[i]["dur"], c["who"], i) for i, c in enumerate(WK.CUES) if i in info))
    for a, b in zip(seq, seq[1:]):
        if a[1] > b[0] - .1: print(f"  ! {a[2]} {a[0]:.1f}–{a[1]:.1f}s runs into {b[2]} {b[0]:.1f}s")
    for i, x in info.items(): print(f"{i:02d} {x['t']:6.1f}s {x['who']} {x['kind']:7s} {x['durs']}  ends {x['t'] + x['dur']:6.1f}")
    json.dump(info, open(os.path.join(ROOT, "audio", "takes.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
