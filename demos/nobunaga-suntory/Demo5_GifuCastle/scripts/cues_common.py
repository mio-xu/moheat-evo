"""Cue helpers shared by Demo 7–9 (same format as Demo 6's whisky.py)."""


def L(t, who, kind, ja="", en="", emo="calm", tts=None, to="you", tone="", **kw):
    c = dict(t=t, who=who, kind=kind, ja=ja, en=en, emo=emo, tts=tts or ja, to=to, tone=tone)
    c.update(kw); return c


def Y(t, ja, en, dur=3.0):   # your own line: subtitle only, no voice
    return L(t, "Y", "you", ja, en, dur=dur)


NAMES = {"N": {"ja": "信長", "en": "Nobunaga"}, "I": {"ja": "家康", "en": "Ieyasu"}, "Y": {"ja": "あなた", "en": "You"}}
