# Character cards (角色资料卡)

One card per recurring character (user 2026-11-08, 提效标准「角色资料卡」): everything needed to draw, voice and write a character again
without re-reading old demos — the **lock-face reference** image to attach, the **backdrop** colour / matte for plain-background poses,
the **voice** (ElevenLabs voice_id + settings + tag habits), **speech habits** (first person, endings) and how the character maps to
**warm / cool**. Cards are data: `tools/art/prompts/fill.py` reads the first ```json block of each card.

## Format

`docs/characters/<id>.md`:

1. Title `# <Name in Japanese> · <romaji> (<id>)` and a one-line summary.
2. A fenced ```json block with exactly these keys:

| Key | Content |
|---|---|
| `id` | file name / key (lower-case; cast.json key may differ — see `notes`) |
| `name_ja`, `name_en` | names |
| `category` | `all-ages` · `healing` · `for-men` · `for-women` · `nobunaga-suntory` |
| `series_style` | the matching line of DEMO_DESIGN_GUIDE §5.1 |
| `demos` | repo-relative demo folders (and kits) the character appears in |
| `refs` | `lock_face`: best existing full-face reference image (repo-relative, must exist); `others`: more refs |
| `colours` | `hair`, `eyes`, `outfit`, `skin` |
| `backdrop` | `colour` (`#00B140` / `#FF00FF` / `#c8c8c8` / `#707070`), `matte` (`green` / `magenta` / `ai` / null), `why` |
| `voice` | `engine` (ElevenLabs / VOICEVOX / none), `voice_id`, `settings` (eleven_v4, ja, stability 0.4, similarity 0.8, seed 7 unless a demo overrides), `tags` |
| `personality` | one line |
| `speech` | `first_person`, `endings` [...], `habits` [...] |
| `thermal` | how the character maps to warm / cool (voice warm at the ear unless a special setting, e.g. snow spirit = cool) |
| `notes` | anything else (history, name variants, cautions) |

3. `## Look (prompt wording)` — a reusable English prompt fragment, condensed from the prompts that drew the character.
4. `## Personality and speech` — 2–5 bullets with 1–2 quoted lines from `lines.js`.
5. `## Demos` — one line per demo.

Backdrop rule (guide §6 / §11.1): light / silver / pastel figures → chroma green `#00B140` + `"matte": "green"`; anything green on the
figure (hair, clothes) → magenta `#FF00FF` + `"matte": "magenta"`; dark figures → light grey `#c8c8c8`; mixed → mid grey `#707070`;
never grey for light hair. Where an existing demo used an older choice, the card says so in `backdrop.why`.

## Adding a card

1. Copy a card of the same category, change the id / file name.
2. Fill from: `tools/eleven/cast.json` (voice_id, persona), HANDOFF §4 and the demo section, the demo README, `project/stage.json`
   (`matte`, pose `src`), `project/web_prompts.json` / `scripts/seedance.py` (look wording), `lines.js` (speech), guide §5.1.
   Write "unknown" / leave empty when a fact is not found — never invent.
3. Check that the JSON parses and every `refs` path exists (e.g. extract the first ```json block, `json.loads`, `os.path.exists`).
4. Add a row to the table below.

## Cards

| id | name | category | demos | voice | backdrop |
|---|---|---|---|---|---|
| [nagisa](nagisa.md) | 早瀬渚 · Nagisa | for-men | Demo31_SummerRooftop, Demo43_BlizzardInn | ElevenLabs `IRIujaFF31qohpDbrkrj` | #00B140 (green) |
| [tsubaki](tsubaki.md) | 白銀椿 · Tsubaki | for-men | Demo25_HatsumodeDate | ElevenLabs `ydtidqvCazlHO8YgKhfx` | #00B140 (green) |
| [cocoa](cocoa.md) | 甘音ココア · Cocoa | for-men | Demo17_CocoaStream | ElevenLabs `Wvbdi4FXYZiHiu1iXnak` | #00B140 (green) |
| [hinata](hinata.md) | 火野ひなた · Hinata | for-men | Demo18_HinataStream, Demo43_BlizzardInn | ElevenLabs `J7YQSku966ZQUlAwM2Zi` | #00B140 (green) |
| [luna](luna.md) | 宵月ルナ · Luna | for-men | Demo19_LunaStream | ElevenLabs `1blqWrqFcJagS9nJcCXc` | #00B140 (green) |
| [mint](mint.md) | 白深ミント · Mint | for-men | Demo14_MintStream, Demo43_BlizzardInn | ElevenLabs `o9ShAxsqSyRBJWLn4hAF` | #FF00FF (magenta) |
| [ren](ren.md) | 蓮 · Ren | for-women | Demo12_LateCall | ElevenLabs `7Wkt5Mmmpwr2sLss90Sx` | #00B140 (green) |
| [jin](jin.md) | 迅 · Jin | for-women | Demo21_JinLounge | ElevenLabs `l1hVja3dChhcMKwBT6Nx` | #c8c8c8 |
| [shion](shion.md) | 紫苑 · Shion | for-women | Demo22_ShionRain | ElevenLabs `wrMX0OkmDIInpPC5f1Hx` | #00B140 (green) |
| [hinata_m](hinata_m.md) | 陽向 · Hinata (idol) | for-women | Demo20_HinataHandshake | ElevenLabs `lODKQ6pXINFtajDz9nqR` | #00B140 (green) |
| [gaku](gaku.md) | 月嶋ガク（岳） · Gaku | for-women | Demo24_GakuCamp | ElevenLabs `rR0Ih88ACkRAdbFhLe7c` | #c8c8c8 |
| [saku](saku.md) | 宮代朔 · Saku | for-women | Demo30_SakuFestival | ElevenLabs `7R01hi42FiEiqOj5XqSE` | #00B140 (green) |
| [naomi](naomi.md) | ナオミ · Naomi (cat) | healing | Demo11_Naomi, Demo13_NaomiCam, Demo26_BecomeNaomi | none | #00B140 (green) |
| [grandma](grandma.md) | ハナ（おばあちゃん） · Grandma Hana | healing | Demo15_FamilyCall, Demo16_FamilyCall2, Demo29_FamilyVisit, familycall | ElevenLabs `0ArRIvpaZd8rF5mRKY2I` | #00B140 (green) |
| [grandpa](grandpa.md) | ゲン（じいちゃん） · Grandpa Gen | healing | Demo15_FamilyCall, Demo16_FamilyCall2, Demo29_FamilyVisit, familycall | ElevenLabs `PFMwAC8IdFchAimQPSXb` | #00B140 (green) |
| [nobunaga](nobunaga.md) | 織田信長 · Nobunaga | nobunaga-suntory | Demo05_GifuCastle, Demo06_FutureWhisky, Demo07_KyotoIzakaya, Demo08_YamazakiDistillery, Demo09_SengokuBanquet, Demo23_NobunagaTalk, Demo42_SengokuRoundtable, _kit | ElevenLabs `GunRCVU2DD99MoNH24tx` | #c8c8c8 |
| [ieyasu](ieyasu.md) | 徳川家康 · Ieyasu | nobunaga-suntory | Demo05_GifuCastle, Demo06_FutureWhisky, Demo07_KyotoIzakaya, Demo08_YamazakiDistillery, Demo09_SengokuBanquet, Demo41_IeyasuTalk, Demo42_SengokuRoundtable, _kit | ElevenLabs `1UDxZiI0jgOqBg3Be8m1` | #c8c8c8 |
| [kohaku](kohaku.md) | コハク · Kohaku (guide fox) | all-ages | Demo10_CaveSpring | ElevenLabs `Y1xZ6kdD3JsECPUYssHD` | #00B140 (green) |
| [koyuki](koyuki.md) | 小雪 · Koyuki (snow spirit) | all-ages | Demo01_SnowFoxfire, Demo28_SnowFoxLullaby | ElevenLabs `H3Ypqqga9vocRHHJBe4D` | #00B140 (green) |
| [homura](homura.md) | 焔 · Homura (foxfire spirit) | all-ages | Demo01_SnowFoxfire, Demo28_SnowFoxLullaby | ElevenLabs `bcDrwll7LWOQ3rPALZGg` | #00B140 (green) |
