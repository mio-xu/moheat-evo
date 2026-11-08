#!/usr/bin/env python3
"""Remaining API resources for the hourly status report (user 2026-11-08: 每小时汇报近况 + 各 API 剩余资源).

  python3 tools/report/balances.py

Seedance: credits balance (via Demo10's seedance_images.py client, ~/.seedance_key).
ElevenLabs: characters used / limit this period (tools/eleven/tts.py client).
OpenAI: no balance API with a normal key → spend estimated from every demos/*/*/project/openai_log.json (count of images × ~$0.2;
        exact tokens where the log has usage). Check the real balance at platform.openai.com/settings/organization/billing.
"""
import glob, importlib.util, json, os

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def load(name, path):
    sp = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(sp); sp.loader.exec_module(m); return m


try:
    sd = load('sd', glob.glob(os.path.join(REPO, 'demos', '*', 'Demo10_CaveSpring', 'scripts', 'seedance_images.py'))[0])
    b = sd.unwrap(sd.call('GET', '/credits/balance', tries=2))
    print('Seedance credits:', b)
except Exception as e:
    print('Seedance credits: unavailable —', str(e)[:120])
try:
    E = load('eleven', os.path.join(REPO, 'tools', 'eleven', 'tts.py'))
    s = E.client().user.subscription.get()
    print(f'ElevenLabs: {s.character_count:,} / {s.character_limit:,} characters used, {s.character_limit - s.character_count:,} left'
          + (f' (resets {s.next_character_count_reset_unix})' if getattr(s, 'next_character_count_reset_unix', None) else ''))
except Exception as e:
    print('ElevenLabs: unavailable —', str(e)[:120])
n, today = 0, 0
for p in glob.glob(os.path.join(REPO, 'demos', '*', '*', 'project', 'openai_log.json')):
    try: n += len(json.load(open(p)))
    except Exception: pass
print(f'OpenAI images logged in all demos: {n} (≈ ${n * 0.2:.0f} total at ~$0.2/image; real balance: OpenAI billing page)')
