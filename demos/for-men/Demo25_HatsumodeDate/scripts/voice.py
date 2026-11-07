#!/usr/bin/env python3
"""Tsubaki's voice: ElevenLabs (tools/eleven/cast.json "tsubaki", r1_b, the user's pick from the audition).
Standard settings from tools/eleven/tts.py (eleven_v4, ja, stability 0.4, similarity 0.8, seed 7); delivery from the audio tags in
TAGGED below ([whispers] at your ear). Reads ../lines.js → media/voice/<id>.m4a (mono AAC) + media/voice.js. Only (re)synthesizes lines whose text or voice changed (cache: audio/voice_cache.json)."""
import importlib.util, json, os, subprocess, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.abspath(os.path.join(ROOT, '..', '..', '..'))
sp = importlib.util.spec_from_file_location('eleven', os.path.join(REPO, 'tools', 'eleven', 'tts.py')); E = importlib.util.module_from_spec(sp); sp.loader.exec_module(E)
VOICE = E.voice('tsubaki')
TAGGED = {
    't01': '[breathless] お待たせしました…！ [giggles] 振袖って、こんなに走りにくいんですのね。',
    't02': '[shy] あの…どう、でしょう。 似合って、いますか？',
    't03a': '[surprised] き、綺麗…!? [shy] …ありがとうございます。 顔が、熱いです…。',
    't03b': '[giggles] ふふ、平気です。 [warmly] このショール、祖母のお下がりで、とっても温かいの。',
    't04': '[excited] あっ、あと五秒です！ 一緒に、数えましょう？',
    't05': '[warmly] あけましておめでとうございます。 [shy] 今年は…もっと、仲良くしてくださいね。',
    't07': '[embarrassed] あの…私、現金を持っていなくて。 [curious] …カードは、使えないのかしら？',
    't08a': '[surprised] まあ…！ [warmly] では、このお返しは、来年必ず。',
    't08b': '[curious] すみません、カードは…え、だめ？ [giggles] …ふふっ、やっぱり、おごっていただけます？',
    't09': '[playful] はい、あなたの分。 …ほっぺ、冷たいでしょう？ えいっ。',
    't10': '[softly] …ふー、ふー。 [surprised] あつっ…！ [giggles] ふふ、私、猫舌なんです。',
    't11': '[softly] 焚き火、あったかい…。 手をかざすと、指先がじんわりしますね。',
    't12': '[surprised] きゃっ…！ [whispers] ご、ごめんなさい。 人が多くて…。 …もう少しだけ、このままでも、いいですか？',
    't14': '[curious] …何を、お願いしたんですか？',
    't15a': '[pouting] ずるいです。 [giggles] …じゃあ、私も秘密です。',
    't15b': '[surprised] …っ！ [shy] …同じ、です。 私も、それをお願いしました。',
    't16': '[sad] …凶。 生まれて初めて引きました、凶…。',
    't17a': '[surprised] えっ、交換…いいんですか？ [warmly] …ふふ、あなたの大吉、大切にしますね。',
    't17b': '[excited] はい…！ 二人で結べば、きっと吉に変わりますよね。',
    't18': '[softly] 風、冷たい…。 寒いでしょう？ [warmly] …ほら、半分こ。',
    't19a': '[whispers] …さっきの秘密、少しだけ教えます。 来年も、あなたの隣にいられますように、って。',
    't19b': '[whispers] 来年も、その次の年も…。 初詣は、あなたと来たいです。',
}
src = open(os.path.join(ROOT, 'lines.js'), encoding='utf-8').read()
LINES = json.loads(src[src.index('= {') + 2:src.rindex('}') + 1])
out_dir = os.path.join(ROOT, 'media', 'voice'); os.makedirs(out_dir, exist_ok=True)
cache_p = os.path.join(ROOT, 'audio', 'voice_cache.json'); os.makedirs(os.path.dirname(cache_p), exist_ok=True)
cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}


def dur(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True)
    return round(float(r.stdout.strip().strip(',')), 3)


durs = {}
for lid in LINES:
    if lid not in TAGGED: raise SystemExit(f'{lid}: add its tagged text to TAGGED')
    key = f'eleven|{VOICE}|{E.MODEL}|{E.SEED}|{TAGGED[lid]}'
    m4a = os.path.join(out_dir, f'{lid}.m4a')
    if cache.get(lid) != key or not os.path.exists(m4a):
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: f.write(E.speak(TAGGED[lid], VOICE)); wav = f.name
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-af', 'loudnorm=I=-18:TP=-2', '-ar', '48000', '-c:a', 'aac', '-b:a', '112k', m4a], check=True)
        os.remove(wav); cache[lid] = key; print('voiced', lid, TAGGED[lid])
    durs[lid] = dur(m4a)
for f in os.listdir(out_dir):
    if f.endswith('.m4a') and f[:-4] not in LINES: os.remove(os.path.join(out_dir, f))
json.dump(cache, open(cache_p, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(ROOT, 'media', 'voice.js'), 'w').write('window.TSUBAKI_VOICE = ' + json.dumps({'credit': 'ElevenLabs', 'dur': durs}) + ';\n')
print(len(durs), 'lines,', round(sum(durs.values()), 1), 's')
