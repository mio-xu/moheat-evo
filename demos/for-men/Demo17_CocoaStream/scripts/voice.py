#!/usr/bin/env python3
"""Cocoa's voice: ElevenLabs (tools/eleven/cast.json "cocoa", r1_a, the user's pick from the audition).
Standard settings from tools/eleven/tts.py (eleven_v4, ja, stability 0.4, similarity 0.8, seed 7); delivery from the audio tags in
TAGGED below ([whispers] at your ear). Reads ../lines.js → media/voice/<id>.m4a (mono AAC) + media/voice.js. Only (re)synthesizes lines whose text or voice changed (cache: audio/voice_cache.json)."""
import importlib.util, json, os, subprocess, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.abspath(os.path.join(ROOT, '..', '..', '..'))
sp = importlib.util.spec_from_file_location('eleven', os.path.join(REPO, 'tools', 'eleven', 'tts.py')); E = importlib.util.module_from_spec(sp); sp.loader.exec_module(E)
VOICE = E.voice('cocoa')
TAGGED = {
    'c01': '[cheerful] いらっしゃいませ〜…って、 [surprised] あなたか！ [giggles] ふふ、来てくれたんだ。 [softly] さむかったでしょ？',
    'c02': '[sweetly] あしたはバレンタインでしょ？ [shy] だから今夜は、チョコ作り、てつだってほしいの。',
    'c03a': '[excited] やったぁ！ [sweetly] じゃあエプロン、つけてあげるね。 …はい、うしろ向いて。',
    'c03b': '[flustered] えっ…ひ、ひみつ！ [pouting] …ほら、手伝うの、手伝わないの？',
    'c04': '[softly] 湯せんでね、ゆーっくり溶かすの。 [happy sigh] …いいにおい。',
    'c05': '[sweetly] ちょっと味見してみて？ [blows softly] …ふーっ、ふーっ。 [whispers] …はい、あーん。',
    'c06a': '[proud] でしょ〜？ [sweetly] あなたの好きな甘さ、ちゃんと覚えてるんだから。',
    'c06b': '[giggles] えへへ、あまえんぼさんだなあ。 [playful] …じゃあ、お砂糖もうひとさじ。',
    'c07': '[shivers] さむっ…！ 冷蔵庫、ひんやりだね。 [cheerful] …生クリーム、いっしょに泡立てよ？',
    'c08': '[whispers] うしろから、手、そえるね。 …そう、そのまま。 止めちゃだめだよ？',
    'c09': '[excited] わぁ、ツノ立った！ 上手〜！ [giggles] …あ、ほっぺにクリームついてる。 [softly] …とってあげる。',
    'c09x': '[playful] あっ、まだだよ〜。 もうちょっとがんばろ？',
    'c10': '[cheerful] 焼けた〜！ ハートのクッキー。 [sweetly] …あつあつだから、ふーふーしてあげる。',
    'c11': '[blows softly] ふーっ、ふーっ。 [whispers] …はい、あーん。',
    'c12': '[hopeful] …おいしい？ よかったぁ。 [shy] …あのね、これ、ほんとはね… [flustered] ううん、なんでもない。',
    'c13': '[softly] 最後は、ハートのチョコに、メッセージを書くの。 [flustered] …見ちゃだめ！ 目、つぶってて。',
    'c14a': '[whispers] …いい子。',
    'c14b': '[pouting] こーら、ずるい！ [embarrassed] …もう、見えちゃったでしょ。',
    'c15': '[shy] …さっき、誰にあげるのって聞いたよね。 [softly] …答え、言うね。',
    'c16': '[whispers] …あなた、だよ。 ずっと前から、あなたのために練習してたの。',
    'c17': '[shy] あしたまで待てなかった。 [whispers] …ねえ、なにか言って？',
    'c18a': '[surprised] …ほんと？ [giggles] …えへへ。 [sweetly] あしたのチョコ、いちばんおっきいの、あなたのだからね。',
    'c18b': '[softly] …うん。 来年も、さらいねんも、ずっと。 [whispers] …約束だよ？',
    'c19': '[whispers] …あ、12時。 ハッピーバレンタイン。',
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
open(os.path.join(ROOT, 'media', 'voice.js'), 'w').write('window.COCOA_VOICE = ' + json.dumps({'credit': 'ElevenLabs', 'dur': durs}) + ';\n')
print(len(durs), 'lines,', round(sum(durs.values()), 1), 's')
