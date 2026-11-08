#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Voices of the kiosk intro's thermal samples (DEMO_DESIGN_GUIDE §7.4; REQUIREMENTS: kiosk intro steps 5–6): 焰 Homura (fox-fire spirit,
warm voice at the LEFT ear) and 小雪 Koyuki (snow spirit, cool breath at the RIGHT ear) from Demo01 / Demo28, their confirmed ElevenLabs
voices (docs/characters/homura.md / koyuki.md, handoff §4: eleven_v4, stability .4, similarity .8, seed 7, [whispers] at the ear),
voiced per language. Output: kiosk/media/voice/<key>_<lang>.m4a (homura / koyuki = the samples; *_lr = L / R check; koyuki_vol = volume) (mono AAC 64 kb/s). Lines = LINES below (also the on-screen text in
kiosk/app.js T.sampleH / sampleK). Existing files are kept unless --force.   python3 kiosk/scripts/voice.py [--force] [--dry]"""
import io, json, os, subprocess, sys, tempfile, wave
HERE = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(os.path.dirname(HERE)); OUT = os.path.join(REPO, 'kiosk', 'media', 'voice')
VOICE = {'homura': 'bcDrwll7LWOQ3rPALZGg', 'koyuki': 'H3Ypqqga9vocRHHJBe4D'}
who = lambda key: key.split('_')[0]
LINES = {
    # L / R check (Homura on the left, Koyuki on the right) + the volume line (Koyuki): every intro voice in the visitor's language
    'homura_lr': {'ja': '[whispers] …こっち、左だよ。聞こえる？', 'en': "[whispers] …over here, on your left. Can you hear me?", 'zh': '[whispers] …在这里，左边哦。听得到吗？'},
    'koyuki_lr': {'ja': '[whispers] …わたしは、右です。聞こえますか？', 'en': "[whispers] …and I'm on your right. Can you hear me?", 'zh': '[whispers] …我在右边。听得到吗？'},
    'koyuki_vol': {'ja': '[softly] この声が…やさしく、はっきり聞こえるくらいにしてね。', 'en': "[softly] Set my voice so it's soft… but clear.", 'zh': '[softly] 把我的声音调到…柔和又清楚就好。'},
    'homura': {'ja': '[whispers] …ねえ、ほむらだよ。[softly] 左の耳、ぽかぽかしてきた？ [whispers] 狐火のぬくもり…わたしの声といっしょに、近づくでしょ。',
               'en': "[whispers] …hey, it's Homura. [softly] Is your left ear getting warm? [whispers] My foxfire warmth… it comes closer with my voice.",
               'zh': '[whispers] …嘿，我是焰。[softly] 左耳是不是暖起来了？ [whispers] 狐火的温度…会跟着我的声音靠近哦。'},
    'koyuki': {'ja': '[whispers] …こゆきです。[softly] 右の耳に…ふぅーっ。 [whispers] 雪のいき…ひんやりして、気持ちいいでしょう？',
               'en': "[whispers] …it's Koyuki. [softly] Your right ear… fuuu. [whispers] My snowy breath… cool and gentle, isn't it?",
               'zh': '[whispers] …我是小雪。[softly] 在你右耳边…呼——。 [whispers] 雪的气息…凉凉的，很舒服吧？'},
}

def main():
    force, dry = '--force' in sys.argv, '--dry' in sys.argv
    todo = [(c, l) for c in LINES for l in LINES[c] if force or not os.path.exists(os.path.join(OUT, f'{c}_{l}.m4a'))]
    print('characters:', sum(len(LINES[c][l]) for c, l in todo), 'in', len(todo), 'clips')
    if dry or not todo: return
    from dotenv import load_dotenv; load_dotenv(os.path.join(REPO, '.env.local'))
    from elevenlabs import ElevenLabs, VoiceSettings
    cl = ElevenLabs(); os.makedirs(OUT, exist_ok=True)
    for c, l in todo:
        pcm = b''.join(cl.text_to_speech.convert(text=LINES[c][l], voice_id=VOICE[who(c)], model_id='eleven_v4', language_code=l, seed=7, output_format='pcm_24000',
                                                 voice_settings=VoiceSettings(stability=.4, similarity_boost=.8)))
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
            with wave.open(f, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm)
            wav = f.name
        dst = os.path.join(OUT, f'{c}_{l}.m4a')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-af', 'loudnorm=I=-20:TP=-2', '-ac', '1', '-c:a', 'aac', '-b:a', '64k', dst], check=True); os.unlink(wav)
        print('wrote', os.path.relpath(dst, REPO), round(len(pcm) / 48000, 1), 's')

if __name__ == '__main__': main()
