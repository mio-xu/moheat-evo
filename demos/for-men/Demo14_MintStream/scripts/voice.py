#!/usr/bin/env python3
"""Mint's voice: ElevenLabs (tools/eleven/cast.json "mint", r1_a, the user's pick from the audition).
Standard settings from tools/eleven/tts.py (eleven_v4, ja, stability 0.4, similarity 0.8, seed 7); delivery from the audio tags in
TAGGED below ([whispers] at your ear). Reads ../lines.js → media/voice/<id>.m4a (mono AAC) + media/voice.js. Only (re)synthesizes lines whose text or voice changed (cache: audio/voice_cache.json)."""
import importlib.util, json, os, subprocess, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.abspath(os.path.join(ROOT, '..', '..', '..'))
sp = importlib.util.spec_from_file_location('eleven', os.path.join(REPO, 'tools', 'eleven', 'tts.py')); E = importlib.util.module_from_spec(sp); sp.loader.exec_module(E)
VOICE = E.voice('mint')
TAGGED = {
    'm01': '[softly] …いらっしゃいませ。 [whispers] おみみ専門店、ミントへ、ようこそ。',
    'm02': '[softly] 今夜のお客さまは…みみくん。 [whispers] …つまり、画面のまえの、あなたです。',
    'm03': '[whispers] …まずは、どっちのおみみから、ほぐしましょうか。 コメントで、おしえてね。',
    'm04': '[whispers] …はーい。 こっちのおみみ、さわりますね。 手、あっためておいたから。',
    'm05': '[whispers] …むに、むに。 [giggles softly] …ふふ、やわらかい。 [whispers] …ちから、ぬいてね。',
    'm06t': '[softly] …ご注文ありがとう。 蒸しタオル、ふたつのおみみに。 [sighs contentedly] …ふわぁ、あったかい、ね。',
    'm06s': '[softly] …ご注文ありがとう。 冷やしておいた、スプーン。 [whispers] …ぴと。 [giggles softly] …ひゃっ、てなった？',
    'm07': '[whispers] …つぎは、おみみかき。 …ちょっとだけ、動かないでね。',
    'm08': '[whispers] …かり、かり。 …すー。 …はい、きれいになりました。 いいこ、いいこ。',
    'm08x': '[whispers] …あ、うごいた。 …あぶないから、もうすこし、じっとしてて？',
    'm09w': '[whispers] …あったかい石、おみみのそばに、おいておくね。 …じんわり。',
    'm09m': '[whispers] …ミントのリップ、ぬったの。 …いくよ。 [blows softly] …ふぅー。 [whispers] …すーすー、するでしょ。',
    'm10': '[whispers] …はんたいがわも、しないとね。 …ごろん、ってしてくれる？',
    'm11': '[whispers] …こっちのおみみも、さっきと、おなじに。 …むに、むに。 かり、かり。',
    'm12': '[whispers] …しゅっ。 ひんやりミスト、さいごに。 [softly] …おつかれさま、でした。',
    'm13': '[softly] …コメント、いっぱい。 「ねむくなってきた」… [giggles softly] ふふ、よかった。',
    'm14a': '[whispers] …ひみつ。 …このお店、ほんとは、あなたのために、ひらいたの。',
    'm14b': '[hums softly] …ん、ん〜…。 [whispers] …こもりうた、ミントの、オリジナル。',
    'm15': '[whispers] …ブランケット、かけるね。 …さいごに、おやすみって、いって？',
    'm16': '[whispers] …おやすみなさい。 …またのご来店、まってます。',
    'm17a': '[whispers] …うん。 …やくそく、ね。',
    'm17b': '[surprised, softly] …えっ、延長…？ [giggles softly] …ふふ、しかたないなあ。 [whispers] …じゃあ、あなたが眠るまで、ここにいるね。',
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
open(os.path.join(ROOT, 'media', 'voice.js'), 'w').write('window.MINT_VOICE = ' + json.dumps({'credit': 'ElevenLabs', 'dur': durs}) + ';\n')
print(len(durs), 'lines,', round(sum(durs.values()), 1), 's')
