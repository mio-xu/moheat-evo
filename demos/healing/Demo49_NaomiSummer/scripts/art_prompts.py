#!/usr/bin/env python3
"""Art prompts for the layered pictures of this demo (DEMO_DESIGN_GUIDE §6 / §6.5) after the user's design picks (2026-11-09) → merged
into project/web_prompts.json (the option jobs stay). Same file in Demo47–50; the table is chosen by the folder name. Images:
python3 tools/openai/images.py <demo> <jobs> --quality high (masked variants with --composite). Run: python3 scripts/art_prompts.py"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); NAME = os.path.basename(ROOT)
WP = os.path.join(ROOT, 'project', 'web_prompts.json'); out = json.load(open(WP)) if os.path.exists(WP) else {}
END = "Wide 16:9. No text, no letters, no captions, no logo, no watermark, no UI."
AA = ("Art style EXACTLY like image 1: cute Japanese 2D anime, pastel cel shading, soft clean lineart, big expressive eyes, chibi (2–3 heads), "
      "friendly and adorable, not scary, clear silhouettes.")
FAM = ("Art style EXACTLY like image 1: soft cel, hand-drawn feel, flat colour with one soft-edged shadow, warm brown lineart, about 5 heads tall, "
       "round and cute (not chibi). Same person, face, hair, glasses (if any) and outfit as image 1.")
CAT = ("Image 1 is Naomi, the user's real cat: draw exactly this cat (long-haired blue-grey and white bicolour, white inverted-V blaze, white ruff, "
       "chest, belly and mittens, darker grey plush tail, big round olive / yellow-green eyes, small pink nose, no collar). Realistic cat on four "
       "legs (not anthropomorphic), high-finish healing visual-novel illustration, warm summer light.")
PLATE = "Background plate only, NO people, NO animals, empty scene, same art style as image 1. "
EDIT = ("Edit this exact image. Keep EVERYTHING identical — same pose, framing, size, position, colours and background — and change ONLY {what}. "
        "Do not move, zoom or crop the picture.")
SCREEN = {'green': "Plain flat CHROMA-KEY GREEN background (#00B140), one even colour, no shadow, nothing green on the character. Whole figure inside the frame with margin.",
          'magenta': "Plain flat CHROMA-KEY MAGENTA background (#FF00FF), one even colour, no shadow, nothing magenta or pink-purple on the cat. Whole figure inside the frame with margin."}
T = {
 'Demo47_GhostLantern': {
  'plates': {
   'bg_gate': ('style_snowfox', "The front gate of an old wooden Japanese house next to a summer festival at night, seen at a child's eye level: a creaky wooden gate and stone path, festival lanterns and a yagura drum tower glowing warm in the distance behind, fireflies, a big summer moon. Cute, mysterious, not scary."),
   'bg_corridor': ('style_snowfox', "A long old wooden corridor inside the house at night, sliding paper doors on both sides, moonlight stripes, a few hanging wind chimes, cosy-spooky but cute, centre open."),
   'bg_tatami': ('style_snowfox', "An old tatami room at night with sliding fusuma doors (plain pattern, no writing) behind and at both sides, a glass wind chime at the open veranda, a low table, summer night outside."),
   'bg_kura': ('style_snowfox', "Inside an old earthen storehouse (kura) at night: thick wooden beams, chests and jars, almost dark, a soft circle of warm light in the centre where a lantern would be, the rest deep blue-black."),
  },
  'redraw': {   # picked option → clean base on the cut-out screen
   'bonchan_base': ('opt_bonchan_c', 'green', "Bon-chan, the yellow cat-faced paper lantern with a red ribbon on the handle, glowing warm inside; same design as image 1, facing the viewer, cheerful."),
   'ghosts_base': ('opt_ghosts_c', 'green', "The three little ghosts of image 1 side by side with space between them (karakasa umbrella yokai, round white ghost, small blue will-o'-wisp), same designs, giggling."),
   'yurari_base': ('opt_yurari_b', 'green', "Yurari, the shy ghost girl of image 1 (white bob, goldfish-pattern lavender yukata, translucent sleeves fading into mist, no feet), same design, floating, shy smile, mouth closed."),
  },
  'poses': {
   'yurari_ear': ('yurari_base', 'green', "Yurari floats very close at the LEFT side of the picture, her face in the LEFT THIRD, leaning toward the centre as she whispers at the viewer's left ear, shy hopeful eyes, mouth closed, hands together low."),
   'yurari_happy': ('yurari_base', 'green', "Yurari floating in the centre, a bright happy smile (mouth closed), hands clasped at her chest, a faint pink blush."),
   'bonchan_scared': ('bonchan_base', 'green', "The same lantern Bon-chan with a startled face: wide eyes, small open 'o' mouth, its candle flickering, slightly tilted."),
  }},
 'Demo48_AnimalOnsen': {
  'plates': {
   'bg_onsen': ('style_snowfox', "A small open-air rock hot spring in the autumn mountains by day, seen from the edge of the bath at a child's eye level: on the LEFT a wooden hot-water pipe pouring steaming water with thick steam, on the RIGHT a bamboo pipe pouring cold mountain water with splashes, red and yellow maple trees, a little wooden sign without writing, the bath in front with gentle steam. Two small round wooden tubs side by side at the front edge (left and right)."),
   'bg_onsen_rain': ('bg_onsen', "Edit this exact image: the same hot spring and camera, now in cold autumn rain in the late afternoon: rain streaks, ripples on the water, steam rising more strongly, darker sky, everything else identical."),
  },
  'redraw': {
   'yuzujii_base': ('opt_yuzujii_a', 'green', "Yuzu-jii, the old capybara of image 1 with a small yuzu on his head and a folded towel, the yuzu-pattern robe and apron, same design, half-closed contented eyes, mouth closed, facing the viewer."),
   'penguin_base': ('opt_penguin_b', 'green', "The fluffy grey emperor-penguin chick of image 1 with a tiny towel on its head, same design, facing the viewer, beak closed."),
   'monkeys_base': ('opt_monkeys_c', 'green', "The snow-monkey mother and child of image 1 (round chibi, autumn maple leaves in their fur), same designs, side by side with a little space, smiling, mouths closed."),
   'fox_base2': ('fox_base', 'green', "The fox of image 1 (light-blue yukata, folded onsen towel on its head, light-blue flower clip, no red rope, no bell), same design, facing the viewer, mouth closed."),
  },
  'poses': {}},
 'Demo49_NaomiSummer': {
  'plates': {
   'bg_room_day': ('naomi_props_pick', "The same sunny Japanese tatami room as image 1 on a hot summer afternoon, WITHOUT the cat: the towel-wrapped cold water bottle, a slice of watermelon on a plate and a round paper uchiwa on the tatami, a ceramic mosquito-coil pig on the windowsill with a thin wisp of smoke, a glass wind chime at the open window on the LEFT, a small white electric fan with a mesh guard and a paper streamer on the RIGHT, green garden outside. Empty space in the centre for the cat."),
   'bg_room_rain': ('bg_room_day', "Edit this exact image: the same room at dusk during a sudden summer shower: dark grey sky, rain blowing in at the LEFT window, everything else identical."),
   'bg_room_night': ('bg_room_day', "Edit this exact image: the same room at night after the rain: dark blue night outside, a warm small lamp on, the fan still there, everything else identical."),
  },
  'redraw': {},
  'poses': {
   'naomi_pancake': ('ref_naomi_close', 'magenta', "Naomi lying flat on her belly like a cat pancake, legs stretched out, looking a little hot and lazy at the viewer, eyes open."),
   'naomi_bat': ('ref_naomi_close', 'magenta', "Naomi sitting up and reaching one white-mittened paw up to bat at something just above her (a paper streamer, not drawn), playful eyes."),
   'naomi_bottle': ('ref_naomi_close', 'magenta', "Naomi lying on her belly with her head turned and her cheek resting against something cool on her LEFT side (that object is NOT drawn — empty space there), eyes half closed, blissful. Only the cat."),
   'naomi_startle': ('ref_naomi_close', 'magenta', "Naomi startled by thunder: fur slightly puffed, ears back a little, big round eyes, crouching low as if about to squeeze against someone on her right."),
   'naomi_shoulder': ('ref_naomi_close', 'magenta', "A close-up: Naomi resting her chin on the viewer's shoulder at the LEFT side of the picture (her head in the left third, the shoulder not drawn), eyes half closed, content, purring."),
  }},
 'Demo50_WatermelonSummer': {
  'plates': {
   'bg_busstop': ('ref_gm_call', "A small rural bus stop in the Japanese countryside at noon in midsummer: a wooden shelter with a tin roof, a bench, rice fields and green mountains, a blue sky with tall white clouds, heat haze, cicada trees. No people, no text on the sign."),
   'bg_stream': ('ref_gm_call', "A clear shallow stream in the countryside in summer, smooth stones, dappled shade from trees, a watermelon-sized gap between rocks in the water (the melon is a separate prop), sparkling water."),
   'bg_yard': ('ref_gm_call', "The yard and wooden veranda (engawa) of an old country house in summer late afternoon: a wind chime, a mosquito coil, a straw mat in the yard, sunflowers, warm low light."),
   'bg_field_night': ('ref_gm_call', "Rice fields at night in summer by the old house, deep blue sky with stars, fireflies glowing green-yellow, frogs' pond, a lit window of the house far behind."),
  },
  'redraw': {
   'grandma_base': ('opt_grandma_c', 'green', "Grandma Hana in the outfit of image 1 (soft pastel housedress with small flowers, white apron, paper uchiwa in hand), same face, glasses and hair bun, standing facing the viewer, warm smile, mouth closed, from the knees up."),
   'grandpa_base': ('opt_grandpa_a', 'green', "Grandpa Gen in the outfit of image 1 (navy jinbei, straw hat), same face, moustache, eyebrows and sturdy build, standing facing the viewer, big grin with mouth closed, from the knees up."),
  },
  'poses': {
   'grandma_fan': ('grandma_base', 'green', "A close shot: grandma sits very near the viewer on the LEFT, her face in the LEFT THIRD, leaning toward the centre as she fans with the paper uchiwa and whispers at the viewer's left ear, gentle teasing smile, mouth closed; the uchiwa held low near the bottom-left, not across her face."),
   'grandpa_melon': ('grandpa_base', 'green', "Grandpa proudly holding up a big striped watermelon in both hands at chest height, water dripping, a proud grin with mouth closed, standing at the RIGHT side of the picture."),
  }},
}
cfg = T[NAME]
for job, (ref, desc) in cfg['plates'].items():
    out[job] = {"ref": ref, "prompt": (desc if desc.startswith('Edit this exact image') else PLATE + desc) + "\n\n" + END}
style = {'Demo47_GhostLantern': AA, 'Demo48_AnimalOnsen': AA, 'Demo49_NaomiSummer': CAT, 'Demo50_WatermelonSummer': FAM}[NAME]
for job, (ref, scr, desc) in cfg['redraw'].items():
    out[job] = {"ref": ref, "prompt": "\n\n".join(["Image 1 is the exact design to keep (same character, face, colours, outfit). Redraw it at full quality on a new plain background.", style, desc, SCREEN[scr], END])}
for job, (ref, scr, desc) in cfg['poses'].items():
    out[job] = {"ref": ref, "prompt": "\n\n".join(["Image 1 is the CHARACTER and STYLE reference: the same character, same design, same art style.", style, desc, SCREEN[scr], END])}
json.dump(out, open(WP, 'w'), ensure_ascii=False, indent=1)
print(NAME, len(cfg['plates']) + len(cfg['redraw']) + len(cfg['poses']), 'art jobs:', ' '.join(list(cfg['plates']) + list(cfg['redraw']) + list(cfg['poses'])))
