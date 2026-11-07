#!/usr/bin/env python3
"""ElevenLabs audition for Hinata (陽向): designs a few young-male idol voices with Voice Design, saves them to the
account, then speaks 4 representative lines with each (eleven_v4 + audio tags) next to the current VOICEVOX takes.

Output (local only, audio/ is gitignored): audio/eleven_audition/index.html + <voice>_<line>.mp3.
The key comes from ELEVENLABS_API_KEY in the repo's .env.local (never in code). Re-runs reuse the designed voices
(state.json) and skip clips that already exist, so credits are only spent on what is new.
Run: python3 scripts/eleven_audition.py"""
import base64, json, os, sys
from dotenv import load_dotenv

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.abspath(os.path.join(ROOT, '..', '..', '..'))
load_dotenv(os.path.join(REPO, '.env.local'))
from elevenlabs import ElevenLabs, VoiceSettings  # noqa: E402

OUT = os.path.join(ROOT, 'audio', 'eleven_audition'); os.makedirs(OUT, exist_ok=True)
STATE_P = os.path.join(OUT, 'state.json')
state = json.load(open(STATE_P)) if os.path.exists(STATE_P) else {}
client = ElevenLabs()

DESCRIPTION = ("A young Japanese male idol, about 20 years old, native Japanese speaker. Light, sweet, boyish tenor with a "
               "soft airy texture and a charming smile in the voice; bright and cute in public, but he can drop into a low, "
               "slow, intimate whisper right at the listener's ear with a slightly dark, possessive edge. "
               "Clean close-mic studio recording, no background noise.")
SAMPLE = ("あっ、お姉さん、来てくれたんだ！ えへへ、すっごく嬉しい。…ねえ、手、冷たいね。外、寒かった？ "
          "じゃあ、俺があっためてあげる。…さっき、他のメンバーの列にも並んでたでしょ。見てたよ、ステージの上から、ずーっと。")

# line key → (label, text with audio tags, VOICEVOX takes in media/voice/)
LINES = {
    'sweet': ('人前：甘い · sweet', '[excited] 次の…あっ！ お姉さん、来てくれたんだ！ [giggles] えへへ、すっごく嬉しい！ はい、握手！', ['h01', 'h02']),
    'breath': ('哈气 · breath', '[sighs softly] はぁー……。[softly] …どう？ あったかい？', ['h05']),
    'tease': ('小悪魔 · teasing', '[playful] あれ、手、離さないの？ [chuckles softly] …ふふ、お姉さんのほうが、離したくないんだ', ['h10b']),
    'dark': ('耳元：黒い · dark whisper', '[whispers] …ねえ。さっき、他のメンバーの列にも並んでたでしょ。 …見てたよ。ステージの上から、ずーっと', ['h07', 'h08']),
}
MODELS = ['eleven_v4', 'eleven_v3']   # v4 first; falls back if the account cannot use it


def design():
    if state.get('voices'):
        return
    res = client.text_to_voice.design(voice_description=DESCRIPTION, text=SAMPLE, model_id='eleven_ttv_v3')
    voices = []
    for i, p in enumerate(res.previews[:3]):
        key = 'v%d' % (i + 1)
        open(os.path.join(OUT, key + '_preview.mp3'), 'wb').write(base64.b64decode(p.audio_base_64))
        v = client.text_to_voice.create(voice_name='Hinata %s (MoHeat audition)' % key.upper(),
                                        voice_description=DESCRIPTION, generated_voice_id=p.generated_voice_id)
        voices.append({'key': key, 'voice_id': v.voice_id})
        print('designed', key, v.voice_id)
    state['voices'] = voices
    json.dump(state, open(STATE_P, 'w'), indent=1)


def speak(voice_id, text, path):
    if os.path.exists(path):
        return
    err = None
    for m in ([state['model']] if state.get('model') else MODELS):
        try:
            audio = client.text_to_speech.convert(text=text, voice_id=voice_id, model_id=m, language_code='ja',
                                                  output_format='mp3_44100_128',
                                                  voice_settings=VoiceSettings(stability=0.4, similarity_boost=0.8))
            data = b''.join(audio)
            state['model'] = m; json.dump(state, open(STATE_P, 'w'), indent=1)
            open(path, 'wb').write(data)
            print('spoke', os.path.basename(path), m)
            return
        except Exception as e:  # noqa: BLE001 - try the next model
            err = e
    raise SystemExit('TTS failed: %s' % err)


def page():
    vv = '../../media/voice/'
    cards = ['<div class="c"><h3>现在 · VOICEVOX 暁記ミタマ（m1）</h3><small>current</small>' + ''.join(
        '<p>%s</p>' % lab + ''.join('<audio controls preload="none" src="%s%s.m4a"></audio>' % (vv, t) for t in takes)
        for lab, _, takes in LINES.values()) + '</div>']
    for v in state['voices']:
        k = v['key']
        cards.append('<div class="c"><h3>%s · ElevenLabs</h3><small>%s · %s</small><p>设计样本 · design preview</p>'
                     '<audio controls preload="none" src="%s_preview.mp3"></audio>' % (k, state.get('model', ''), v['voice_id'], k) + ''.join(
            '<p>%s</p><audio controls preload="none" src="%s_%s.mp3"></audio>' % (lab, k, lk) for lk, (lab, _, _) in LINES.items()) + '</div>')
    lines = '<br>'.join('%s：%s' % (lab, txt) for lab, txt, _ in LINES.values())
    html = ('<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            '<title>日向 ElevenLabs 试听</title><style>:root{--bg:#16121c;--card:#221b2b;--ink:#f1eaf6;--soft:#b5a9c2}'
            'body{margin:0;padding:24px 16px;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,"PingFang SC",sans-serif}'
            'h1{font-size:20px;margin:0}.l{color:var(--soft);margin:6px 0 16px;font-size:13px}'
            '.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}.c{background:var(--card);border-radius:12px;padding:12px 14px}'
            '.c h3{font-size:15px;margin:0}.c small{color:var(--soft);word-break:break-all}.c p{margin:8px 0 2px;color:var(--soft);font-size:13px}audio{width:100%%}'
            '</style></head><body><h1>日向 · ElevenLabs vs VOICEVOX</h1><p class="l">%s</p><div class="g">%s</div></body></html>') % (lines, ''.join(cards))
    open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(html)
    print(os.path.join(OUT, 'index.html'))


if __name__ == '__main__':
    if not os.environ.get('ELEVENLABS_API_KEY'):
        sys.exit('ELEVENLABS_API_KEY missing: run `npx -y @elevenlabs/cli@latest onboard init` in the repo root')
    design()
    for v in state['voices']:
        for lk, (_, text, _) in LINES.items():
            speak(v['voice_id'], text, os.path.join(OUT, '%s_%s.mp3' % (v['key'], lk)))
    page()
