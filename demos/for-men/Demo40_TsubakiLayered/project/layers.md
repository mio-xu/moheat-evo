# Demo40 (staging) → replaces Demo25_HatsumodeDate · layer plan (DEMO_DESIGN_GUIDE §6 标准制作流程)

User 2026-11-08: Tsubaki's story stays as it is; only the picture is redone the new way, then it replaces Demo25 (same URL;
`python3 tools/web/merge_remake.py demos/for-men/Demo25_HatsumodeDate demos/for-men/Demo40_TsubakiLayered`, old version backed up
outside the repo). The 15 Seedance clips go; the page uses `demos/shared/layers.js` like Demo31 (which was built on Demo25's framework).

| View | Background (her removed from the Demo25 still) | Pose (dark grey #404040, matte ai) | Variants |
|---|---|---|---|
| torii | bg_torii | tsubaki_torii | talk, blink |
| stall | bg_stall | tsubaki_stall | talk, blink |
| amazake | bg_amazake | tsubaki_amazake (cup at your right cheek) | talk, blink |
| fire | bg_fire | tsubaki_fire | talk, blink |
| close | bg_close | tsubaki_close (pushed close) | talk, blink |
| pray | bg_pray | tsubaki_pray (eyes closed already) | talk |
| omikuji | bg_omikuji | tsubaki_omikuji | talk, blink |
| stole | bg_stole | tsubaki_stole (wrapping the stole) | talk, blink |

31 images (OpenAI gpt-image-2 while Seedance uploads are limited, ~$0.2 each). Prompts: `scripts/prompts.py` → `project/web_prompts.json`
→ `python3 tools/openai/images.py demos/for-men/Demo40_TsubakiLayered <jobs>`. First torii only, shown to the user, then the rest.
