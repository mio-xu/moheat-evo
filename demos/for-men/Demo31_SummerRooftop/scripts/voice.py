#!/usr/bin/env python3
"""Nagisa's voice: ElevenLabs (tools/eleven/cast.json "nagisa", r1_b, the user's pick from the audition).
Standard settings from tools/eleven/tts.py (eleven_v4, ja, stability 0.4, similarity 0.8, seed 7); delivery from the audio tags in
TAGGED below ([whispers] at your ear). Reads ../lines.js → media/voice/<id>.m4a (mono AAC) + media/voice.js. Only (re)synthesizes lines whose text or voice changed (cache: audio/voice_cache.json)."""
import importlib.util, json, os, subprocess, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.abspath(os.path.join(ROOT, '..', '..', '..'))
sp = importlib.util.spec_from_file_location('eleven', os.path.join(REPO, 'tools', 'eleven', 'tts.py')); E = importlib.util.module_from_spec(sp); sp.loader.exec_module(E)
VOICE = E.voice('nagisa')
TAGGED = {
    'n01': '[teasing] よっ、やっぱここにいた。 [suspicious] …なに、じろじろ見て。',
    'n02': '[flustered] べ、別にあんたに見せるために着たんじゃないし！ [annoyed] お母さんが無理やり着せたの！',
    'n03a': '[surprised] はっ…!? [flustered] な、なに急に。 …バカ。 [shy] …ふーん。 似合ってる、んだ。',
    'n03b': '[annoyed] はあ!? どういう意味よ、それ！ [pouting] …ちょっとは、可愛いとか言えっての。',
    'n04': '[sighs] にしても暑っつ…。 [playful] ほら、ソーダアイス買ってきた。 …半分こ。',
    'n05': '[teasing] はい、あんたの分。 [laughs] …ひゃっ、ってなった？ ちょろ。',
    'n06': '[nostalgic] 昔もこうやって、ここで半分こしたよね。 [teasing] あんた、いっつも大きいほう取ってさ。',
    'n07': '[annoyed] あー、もう暑い！ 扇いであげるから、ちょっと詰めて。',
    'n08': '[pouting] 別に、あんたのためじゃないし。 あたしが暑いだけだし。',
    'n09a': '[laughs] 調子乗んな。 [softly] …はいはい、もうちょっとだけね。',
    'n09b': '[pouting] …なによ。 せっかく扇いでやってんのに。',
    'n10': '[playful] じゃーん、線香花火。 去年のが残ってた。 [softly] …火、つけるよ。',
    'n11': '[teasing] 勝負ね。 先に落ちたほうが、相手の言うこと一個聞く。 [whispers] …動いたら負けだから。',
    'n12a': '[surprised] あっ…落ちた。 [sighs] …ちぇっ、あたしの負け。 いいよ、なんでも聞く。 [nervous] …でもその前に、一個だけ言わせて。',
    'n12b': '[laughs] はい、あんたの負けー！ [nervous] …じゃあ、あたしの言うこと、聞いて。 最後まで、ちゃんと。',
    'n13': '[softly] あ…花火、始まった。 [nervous] …ねえ。',
    'n14': '[nervous] あたしさ、ずっと前から、あんたのこと…',
    'n15a': '[flustered] な、なんでもない！ [sighs] …って、言いたいとこだけど。',
    'n15b': '[embarrassed] …絶対、聞こえてたでしょ。 [sighs] …もう、しょうがないな。',
    'n16': '[whispers] …ずっと、好き…だったかも。 …もう一回は、言わないからね。',
    'n17a': '[whispers] …っ、バカ。 …遅いよ。',
    'n17b': '[shouting] は!? なにそれ、ずるい！ [laughs] …もう、ほんっとバカ。',
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
open(os.path.join(ROOT, 'media', 'voice.js'), 'w').write('window.NAGISA_VOICE = ' + json.dumps({'credit': 'ElevenLabs', 'dur': durs}) + ';\n')
print(len(durs), 'lines,', round(sum(durs.values()), 1), 's')
