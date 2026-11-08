# -*- coding: utf-8 -*-
"""Demo 4 v2: the Season Spirit Conductor's announcements (ElevenLabs, voice `halfy` r1_a) in EN / JA / ZH.

  python3 scripts/voice.py            # synthesise what is missing (cache: audio/voice_cache.json), write media/voice/<id>.<lang>.m4a
                                      # + media/voice.js (times, texts, loudness envelopes for lip-sync and voice warmth)

User rule 2026-11-09: all voice acting is in JAPANESE (every demo); en / zh are subtitles only — the page and the MP4 play the
Japanese voice. The en / zh takes are kept (rendered once, unused by the page): `--langs ja,en,zh` (re)renders them; default = ja.
Standard: handoff §4 (eleven_v4, stability .4, similarity .8, seed 7, English bracket tags). Text = project/script.md §6.
"""
import hashlib, io, json, os, subprocess, sys, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.dirname(os.path.dirname(os.path.dirname(ROOT)))
sys.path.insert(0, os.path.join(REPO, "tools", "eleven"))
import tts as E  # noqa: E402

# id: (film time s, where: holo (hologram, no warmth) | ear (in person at your right ear) | aisle (in person behind your table), {lang: tagged text})
LINES = {
    "a1": (0.9, "holo", {"en": "[cheerful] Next stop, winter! Wrap up your scarf!", "ja": "[cheerful] つぎは〜、ふゆ！ マフラー、しっかり巻いてね！", "zh": "[cheerful] 下一站，冬天！围巾要围好哦！"}),
    "a2": (7.9, "aisle", {"en": "[playful] Cold hands? Hold your warm tea!", "ja": "[playful] 手がつめたい？ あったかい紅茶をどうぞ！", "zh": "[playful] 手冷吗？捧着热茶吧！"}),
    "a3": (12.3, "holo", {"en": "[cheerful] Next stop, summer! Vents open — it's getting hot!", "ja": "[cheerful] つぎは〜、なつ！ 通気口オープン、あつくなるよ〜！", "zh": "[cheerful] 下一站，夏天！通风口打开——要变热啦！"}),
    "a4": (37.4, "aisle", {"en": "[excited] Squall ahead! [warmly] I'll switch on the cosy lamp.", "ja": "[excited] スコールだ！ [warmly] あったかいランプ、つけておくね。", "zh": "[excited] 前方暴雨！[warmly] 我把暖暖的灯打开。"}),
    "a5": (62.3, "holo", {"en": "[excited] Ice-and-fire tunnel! The car splits in two — pick a window!", "ja": "[excited] 氷と炎のトンネル！ 車両がふたつに分かれるよ。窓をえらんで！", "zh": "[excited] 冰火隧道！车厢要一分为二啦——选一扇窗吧！"}),
    "a6": (90.3, "holo", {"en": "[surprised] Uh-oh! The seasons are out of control!", "ja": "[surprised] わわっ！ 季節が暴走してる〜！", "zh": "[surprised] 糟糕！四季失控啦！"}),
    "a7": (118.6, "ear", {"en": "[whispers] Psst… it's really me. Shout “Spring!” with me, and the train comes back.", "ja": "[whispers] ねえ…ほんものの、ぼくだよ。いっしょに「春！」ってさけんで。列車がもどるから。", "zh": "[whispers] 嘘……是真的我哦。和我一起喊「春天！」，列车就会回来。"}),
    "a8": (126.3, "aisle", {"en": "[cheerful] Next stop, spring! Cherry Blossom Station!", "ja": "[cheerful] つぎは〜、はる！ さくら駅〜！", "zh": "[cheerful] 下一站，春天！樱花站！"}),
    "a9": (146.6, "aisle", {"en": "[cheerful] We've arrived! Thanks for riding the Seasons Express!", "ja": "[cheerful] とうちゃく〜！ 季節急行に乗ってくれて、ありがとう！", "zh": "[cheerful] 到站啦！谢谢你乘坐四季特快！"}),
}
LANG = {"en": "en", "ja": "ja", "zh": "zh"}
CACHE = os.path.join(ROOT, "audio", "voice_cache.json")
RAW = os.path.join(ROOT, "audio", "voice")
OUT = os.path.join(ROOT, "media", "voice")
ENV_RATE = 50


def speak(text, lang, vid):
    from elevenlabs import VoiceSettings
    pcm = b"".join(E.client().text_to_speech.convert(text=text, voice_id=vid, model_id=E.MODEL, language_code=LANG[lang], seed=E.SEED,
                                                    output_format="pcm_24000", voice_settings=VoiceSettings(stability=.4, similarity_boost=.8)))
    return np.frombuffer(pcm, np.int16).astype(np.float32) / 32768


def trim(x, sr=24000):
    a = np.abs(x); thr = max(.01, a.max() * .02); idx = np.where(a > thr)[0]
    if not len(idx): return x
    x = x[max(0, idx[0] - int(.03 * sr)): idx[-1] + int(.12 * sr)].copy()
    n = int(.01 * sr); x[:n] *= np.linspace(0, 1, n); m = int(.06 * sr); x[-m:] *= np.linspace(1, 0, m)
    return x


def envelope(x, sr=24000):
    hop = sr // ENV_RATE; n = len(x) // hop
    r = np.array([np.sqrt((x[i * hop:(i + 1) * hop] ** 2).mean()) for i in range(n)])
    db = 20 * np.log10(np.maximum(r, 1e-5)); ref = np.percentile(db[db > -60], 95) if (db > -60).any() else -20
    return np.clip((db - (ref - 30)) / 30, 0, 1).round(3).tolist()


VOICED = sys.argv[sys.argv.index("--langs") + 1].split(",") if "--langs" in sys.argv else ["ja"]


def main():
    vid = E.voice("halfy")
    cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    os.makedirs(RAW, exist_ok=True); os.makedirs(OUT, exist_ok=True)
    data, chars = {}, 0
    for lid, (t, where, texts) in LINES.items():
        data[lid] = dict(t=t, where=where, text={}, dur={}, env={})
        for lang, text in texts.items():
            import re
            data[lid]["text"][lang] = re.sub(r"\[[^\]]*\]\s*", "", text).strip()
            if lang not in VOICED: continue                             # subtitles only
            key = hashlib.sha1(f"{vid}|{lang}|{text}".encode()).hexdigest()[:12]
            wav = os.path.join(RAW, f"{lid}.{lang}.wav")
            if cache.get(f"{lid}.{lang}") != key or not os.path.exists(wav):
                x = trim(speak(text, lang, vid)); chars += len(text)
                with wave.open(wav, "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())
                cache[f"{lid}.{lang}"] = key; print("tts", lid, lang, f"{len(x) / 24000:.2f}s", flush=True)
                json.dump(cache, open(CACHE, "w"), indent=1)
            with wave.open(wav) as w: x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
            m4a = os.path.join(OUT, f"{lid}.{lang}.m4a")
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-c:a", "aac", "-b:a", "64k", "-ar", "24000", m4a], check=True)
            data[lid]["dur"][lang] = round(len(x) / 24000, 3); data[lid]["env"][lang] = envelope(x)
    with open(os.path.join(ROOT, "media", "voice.js"), "w", encoding="utf-8") as f:
        f.write("// generated by scripts/voice.py — do not edit\nwindow.D04_VOICE = ")
        json.dump(dict(rate=ENV_RATE, lines=data), f, ensure_ascii=False, separators=(",", ":")); f.write(";\n")
    print("characters this run:", chars)


if __name__ == "__main__":
    main()
