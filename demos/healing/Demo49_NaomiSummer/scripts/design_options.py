#!/usr/bin/env python3
"""USER PICK (relayed 2026-11-09): Demo49 = props B (Naomi unchanged).

Design OPTIONS for the user to pick (user 2026-11-09: the user picks every character design from an option sheet; nothing else is
drawn for these characters until the pick is relayed). Writes this demo's project/web_prompts.json option jobs (opt_<char>_<a|b|c>),
rendered with python3 tools/openai/images.py <demo> <jobs…> --quality medium (cheap: options only; the picked design is redrawn at
high quality as the base pose later). Same file in Demo46–50; the table for this folder is chosen by the folder name.
Run: python3 scripts/design_options.py"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); NAME = os.path.basename(ROOT)
END = ("Wide 16:9 character design sheet image, ONE character (or the named group) standing in the centre, full figure from head to "
       "toe inside the frame with margin, plain flat light-grey background (#d8d8d8), nothing else. No text, no letters, no captions, no "
       "logo, no watermark, no UI.")
FW = ("Art style EXACTLY like image 1: soft modern anime illustration, thin coloured lineart, soft cel shading with one soft-edged shadow "
      "layer, romantic otome-game card quality, not glossy, no bloom, not realistic, not 3D. Realistic adult proportions (7.5 heads). He is "
      "EXTREMELY handsome: idol-level beautiful face, clear jawline, long lashes, no stubble. Keep his FACE exactly as in images 1 and 2 "
      "(eye shape and colour, brows, nose, mouth) — the same man. Only clothes, hairstyle and fantasy features change. A storybook "
      "Western-fantasy world: no modern objects, no glasses, no earbuds.")
AA = ("Art style EXACTLY like image 1: cute Japanese 2D anime, pastel cel shading, soft clean lineart, big expressive eyes, chibi "
      "proportions (2–3 heads tall), friendly and adorable for children — NOT scary, no blood, no sharp teeth, rounded shapes, a clear "
      "silhouette that reads at small size. Night-festival / onsen storybook mood.")
FAM = ("Art style EXACTLY like image 1: soft cel, hand-drawn feel, flat colour with one soft-edged shadow, warm brown lineart, about 5 "
       "heads tall, round and cute (not chibi). Keep the FACE, hair, glasses (if any) and body shape exactly as in image 1 — the same "
       "person; only the clothes change to summer clothes of the Japanese countryside today.")
CAT = ("Image 1 and 2 are the user's REAL cat Naomi: draw exactly this cat — a long-haired blue-grey and white bicolour cat, white "
       "inverted-V blaze on the forehead, white ruff, chest, belly and mittens, darker grey plush tail, big round olive / yellow-green eyes, "
       "small pink nose, no collar, no clothes. A realistic cat on four legs (not anthropomorphic), high-finish healing visual-novel "
       "illustration, warm afternoon summer light.")
T = {
 'Demo46_DragonContract': {'style': FW, 'chars': {
   'hinata': (['ref_hinata', 'ref_hinata_close'], "Hinata: fluffy messy soft PINK hair with long bangs, warm amber eyes, a sweet face with a tiny fang in a sly smile, a small silver star stud earring. Identity: a little-devil BUTLER bound to the viewer by a contract — sweet in public, dark and teasing at the ear.", {
      'a': "Outfit A: a neat black tailcoat butler uniform, white shirt, crimson cravat, white gloves; two small curved black horns in his pink hair, a pair of little black bat wings at his back, a thin devil tail with a heart tip.",
      'b': "Outfit B: a black-and-crimson gothic waistcoat with silver buttons, a long black coat with split tails lined in crimson, a pocket watch chain; larger curled horns with a small crimson ribbon tied on one, bat wings half-open, hair slightly longer at the nape.",
      'c': "Outfit C: a plum velvet page-boy butler outfit (short jacket, bow tie, knee breeches, white stockings), a short black half-cape; tiny horns peeking through the pink fluff, small round bat wings, holding a silver tea tray."}),
   'gaku': (['ref_gaku', 'ref_gaku_close'], "Gaku: sleek black hair with a FRINGE falling across one eye and a hidden DEEP-GREEN inner colour, cool dark long-lashed eyes, a calm cool face (quiet, unaware of how handsome he is). Identity: the Black Dragon King.", {
      'a': "Outfit A: a black battle robe with dark-green lining and a long deep-green cloak, a thin silver chain necklace; his black hair grown long and tied back with the green inner colour showing, two black dragon horns sweeping back, a few small dark scales on one cheekbone, large black dragon wings folded behind him.",
      'b': "Outfit B: black scaled half-armour over a dark tunic, a fur-lined deep-green mantle on one shoulder; a crown of black horns, long hair loose to the shoulder blades with the green inner streaks, black wings partly spread.",
      'c': "Outfit C: a long high-collared black royal coat with green-silver embroidery, black gloves; his hair at its usual length with the fringe over one eye, slim black horns curving back, a dragon tail behind him, wings folded like a cape."}),
   'ren': (['ref_ren', 'ref_ren_close'], "Ren: silver-white soft layered hair, pale lavender-grey eyes, a gentle, slightly shy face, a small silver ear cuff. Identity: the Elf King of the snow forest, who sings.", {
      'a': "Outfit A: a long silver-white robe with pale blue embroidery and a light cape, a crown of clear ice crystals; his silver hair grown LONG and straight, long pointed elf ears.",
      'b': "Outfit B: a pale blue-white layered elven tunic and hooded cloak (hood down) with snowflake embroidery, a circlet of frosted silver leaves; his hair a longer wolf cut with two thin braids, pointed elf ears.",
      'c': "Outfit C: a white fur-trimmed royal coat over a silver-grey tunic, a small silver lyre in one hand; hair half-up, long at the back, pointed elf ears, a delicate ice-flower ornament."}),
 }},
 'Demo47_GhostLantern': {'style': AA, 'chars': {
   'bonchan': (['style_kohaku', 'style_snowfox'], "Bon-chan: a talking paper-lantern yokai (chochin-obake) the player carries by its handle — a NEW mascot: cheerful, brave, a little boastful; the candle inside glows WARM ORANGE (it is the warm light of the game).", {
      'a': "Design A: a classic red-and-white paper lantern with one big friendly eye and a long playful tongue sticking out, tiny stubby arms, a black wooden handle on top.",
      'b': "Design B: a round orange paper lantern with two big sparkly eyes and pink blush cheeks, a little candle flame on top like a hair tuft, a tiny smile.",
      'c': "Design C: a yellow lantern with a cat-like face (small ears at the top rim), little paws, a red ribbon tied on the handle."}),
   'ghosts': (['style_kohaku', 'style_snowfox'], "The small ghosts of the spooky house: THREE little mischievous ghosts side by side as a group — all cute, round, giggling pranksters, cold-looking (pale blue-white glow) but adorable.", {
      'a': "Design A: three classic white sheet ghosts, round like mochi, dot eyes and little smiles, one wears the white triangle headband, one has a tiny blush.",
      'b': "Design B: three pastel wisp ghosts (pale blue, lavender, mint) with soft-serve-like curling tails, one with little cat ears.",
      'c': "Design C: a yokai trio: a one-eyed hopping paper umbrella ghost (karakasa), a round white ghost, and a small cold blue will-o'-wisp flame with a face."}),
   'yurari': (['style_kohaku', 'style_snowfox'], "Yurari: a shy little ghost GIRL who just wants a friend (a child, cute, floating, translucent at the bottom, no feet; her touch is cool — a snow-spirit-like special setting). Gentle and lonely, not scary.", {
      'a': "Design A: a pale blue-white summer kimono, long straight black hair with blunt bangs, a white triangle headband, big sad-sweet eyes.",
      'b': "Design B: a pale lavender yukata with a goldfish pattern, a short white bob, translucent sleeves that fade into mist.",
      'c': "Design C: a pastel summer dress with a straw hat and a ribbon, long white hair, her legs fading into a soft mist."}),
 }},
 'Demo48_AnimalOnsen': {'style': AA, 'chars': {
   'yuzujii': (['style_kohaku', 'style_snowfox'], "Yuzu-jii: an old CAPYBARA who owns the little animal hot spring — slow, calm, kind grandpa, half-closed sleepy eyes (a NEW character).", {
      'a': "Design A: a round capybara with a small yuzu citrus on his head and a folded towel, half-closed contented eyes.",
      'b': "Design B: a capybara in a short indigo happi coat (onsen staff), holding a wooden bucket, a tiny grey moustache-like fur tuft.",
      'c': "Design C: a capybara with a woven straw hat and a tenugui towel around his neck, holding a long wooden ladle."}),
   'penguin': (['style_kohaku', 'style_snowfox'], "A penguin guest who wants the water 'almost cold'.", {
      'a': "Design A: a little Adelie penguin with a blue floatie ring.", 'b': "Design B: a fluffy grey emperor-penguin chick with a tiny towel on its head.", 'c': "Design C: a rockhopper penguin with yellow crest feathers and a small bucket."}),
   'monkeys': (['style_kohaku', 'style_snowfox'], "A snow-monkey family guest: a parent who wants it HOT and a little child who wants it lukewarm (both together in one picture).", {
      'a': "Design A: Japanese macaques with red faces and fluffy grey-brown fur, the baby clinging to the parent.", 'b': "Design B: the same monkeys each with a folded tenugui towel on the head.", 'c': "Design C: rounder chibi monkeys with autumn maple leaves in their fur."}),
   'fox': (['style_kohaku', 'style_snowfox'], "A fox guest, a bit vain about its tail.", {
      'a': "Design A: a red fox with a red maple leaf on its head.", 'b': "Design B: a fox wearing a little light-blue yukata.", 'c': "Design C: a fluffy fox with a white-tipped tail curled around it and a small bell collar."}),
 }},
 'Demo49_NaomiSummer': {'style': CAT, 'chars': {
   'naomi': (['ref_naomi_close', 'ref_naomi_sit'], "Naomi on a hot summer afternoon in a Japanese tatami room (she stays exactly herself — only the summer props around her differ).", {
      'a': "Option A (props set A): Naomi lying flat like a cat-loaf on a cool bamboo summer mat, a small white electric fan with a mesh guard and a little paper streamer behind her, a glass wind chime hanging at the window.",
      'b': "Option B (props set B): Naomi sitting beside a towel-wrapped cold water bottle, her cheek close to it, a round paper uchiwa fan and a slice of watermelon on a plate nearby, a mosquito-coil pig on the windowsill."}),
 }},
 'Demo50_WatermelonSummer': {'style': FAM, 'chars': {
   'grandma': (['ref_gm_call'], "Grandma Hana (the same grandma as image 1: same face, glasses if she wears them, hair bun, small round figure, warm smile).", {
      'a': "Outfit A: a light beige short-sleeve cardigan over a floral blouse, a pale apron, a wide straw sun hat.",
      'b': "Outfit B: an indigo cotton samue-style top and loose trousers, a striped apron, a tenugui scarf on her head.",
      'c': "Outfit C: a soft pastel short-sleeve housedress with small flowers, a white kappogi-style apron, a paper uchiwa fan in hand."}),
   'grandpa': (['ref_gp_snow'], "Grandpa Gen (the same grandpa as image 1: same face, hair, eyebrows, sturdy build, big laugh).", {
      'a': "Outfit A: a navy jinbei (short summer kimono top and shorts) and a straw hat, wooden geta.",
      'b': "Outfit B: a white undershirt, khaki work trousers, a towel around his neck, a straw hat, rubber boots.",
      'c': "Outfit C: an indigo samue work suit, a woven straw hat on his back, holding a big striped watermelon."}),
 }},
}
cfg = T[NAME]; out = {"_doc": __doc__}
for c, (refs, desc, opts) in cfg['chars'].items():
    for o, look in opts.items():
        lead = ("Image 1 is the STYLE and CHARACTER reference" + (" (image 2: closer face reference)." if len(refs) > 1 else "."))
        end = END if NAME != 'Demo49_NaomiSummer' else ("Wide 16:9 illustration of the whole little scene in a sunny Japanese tatami room (Naomi with ALL the props "
              "named above clearly visible around her). No text, no letters, no logo, no watermark, no UI.")
        out[f"opt_{c}_{o}"] = {"ref": refs, "prompt": "\n\n".join([lead, cfg['style'], desc, look, end])}
json.dump(out, open(os.path.join(ROOT, 'project', 'web_prompts.json'), 'w'), ensure_ascii=False, indent=1)
print(NAME, len(out) - 1, 'option jobs:', ' '.join(k for k in out if k != '_doc'))
