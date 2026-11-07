#!/usr/bin/env python3
"""Save the preview the user confirmed as a voice in the account and record its voice_id in cast.json.
Run: python3 tools/eleven/pick.py ren r1_b"""
import datetime, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tts as E  # noqa: E402

char, key = sys.argv[1], sys.argv[2]
p = next(p for p in json.load(open(os.path.join(E.HERE, 'out', char, 'previews.json'))) if p['key'] == key)
cast = E.cast(); c = cast[char]
v = E.client().text_to_voice.create(voice_name=f'{c["name"]} (MoHeat)', voice_description=p['description'][:1000], generated_voice_id=p['generated_voice_id'])
c.update(voice_id=v.voice_id, confirmed=str(datetime.date.today()), pick=key)
E.save_cast(cast); print(char, key, '→', v.voice_id)
