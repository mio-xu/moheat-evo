"""Create (or update) the ElevenLabs agent used as the live 'brain' of the Nobunaga talk demo.
Text-only: the agent is only the LLM + turn bookkeeping. Speech-to-text is the browser's, speech is our own ElevenLabs TTS
(per character, so each voice can be placed in 3D and drive its own ear). The real prompt is sent per session (override).
Writes the agent id to ../agent.json.  Run: python3 scripts/setup_agent.py"""
import importlib.util, json, os
HERE = os.path.dirname(os.path.abspath(__file__)); DEMO = os.path.dirname(HERE); REPO = os.path.dirname(os.path.dirname(os.path.dirname(DEMO)))
sp = importlib.util.spec_from_file_location('eleven', os.path.join(REPO, 'tools', 'eleven', 'tts.py')); E = importlib.util.module_from_spec(sp); sp.loader.exec_module(E)
LLM = 'claude-sonnet-5-5'
P = os.path.join(DEMO, 'agent.json')
cfg = {
    'agent': {'first_message': '', 'language': 'ja',
              'prompt': {'prompt': 'You are a character in a Japanese historical role-play. The scene is given per session.', 'llm': LLM, 'temperature': 0.8, 'max_tokens': 400}},
    'conversation': {'text_only': True, 'max_duration_seconds': 200},
    'tts': {'voice_id': E.voice('nobunaga'), 'model_id': 'eleven_flash_v2_5'},
}
platform = {
    'overrides': {'conversation_config_override': {'agent': {'prompt': {'prompt': True, 'llm': True}, 'first_message': True, 'language': True},
                                                   'conversation': {'text_only': True}}},
    'call_limits': {'agent_concurrency_limit': 1, 'daily_limit': 30},
}
c = E.client().conversational_ai.agents
old = json.load(open(P)) if os.path.exists(P) else {}
if old.get('agent_id'):
    c.update(agent_id=old['agent_id'], conversation_config=cfg, platform_settings=platform); aid = old['agent_id']
else:
    aid = c.create(name='MoHeat Nobunaga Talk (text-only)', conversation_config=cfg, platform_settings=platform).agent_id
json.dump({'agent_id': aid, 'llm': LLM}, open(P, 'w'), indent=1)
print('agent', aid)
