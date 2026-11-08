// Layer data for ../../shared/layers.js — written by tools/art/build_stage.py from project/stage.json (do not edit by hand).
window.MOHEAT_LAYERS = {
 "views": {
  "hina_booth": {
   "view": "booth",
   "fire": null,
   "bg": {
    "src": "art/bg_booth.webp?v=0132151c",
    "fire": [
     0.521,
     0.376
    ]
   },
   "char": {
    "src": "art/char_booth.webp?v=445278e8",
    "w": 1700,
    "h": 988,
    "x": 0.56,
    "y": 1.02,
    "height": 1.0
   },
   "patches": [
    {
     "src": "art/booth_mouth.webp?v=ecd0ea85",
     "rect": [
      1097,
      329,
      148,
      102
     ],
     "kind": "mouth"
    },
    {
     "src": "art/booth_eyes.webp?v=46d7728e",
     "rect": [
      1002,
      193,
      264,
      150
     ],
     "kind": "eyes"
    }
   ]
  },
  "hina_hands": {
   "view": "hands",
   "fire": null,
   "bg": {
    "src": "art/bg_booth.webp?v=0132151c",
    "fire": [
     0.521,
     0.376
    ],
    "zoom": 1.15
   },
   "char": {
    "src": "art/char_hands.webp?v=09e10556",
    "w": 1700,
    "h": 956,
    "x": 0.52,
    "y": 1.02,
    "height": 1.02
   },
   "patches": [
    {
     "src": "art/hands_mouth.webp?v=0d458d10",
     "rect": [
      914,
      406,
      125,
      102
     ],
     "kind": "mouth"
    },
    {
     "src": "art/hands_eyes.webp?v=354120d3",
     "rect": [
      726,
      202,
      331,
      210
     ],
     "kind": "eyes"
    }
   ]
  },
  "hina_lean": {
   "view": "leanL",
   "alias": [
    "leanR"
   ],
   "fire": null,
   "bg": {
    "src": "art/bg_booth.webp?v=0132151c",
    "fire": [
     0.521,
     0.376
    ],
    "zoom": 1.3
   },
   "char": {
    "src": "art/char_lean.webp?v=cc39d535",
    "w": 1700,
    "h": 980,
    "x": 0.45,
    "y": 1.02,
    "height": 1.02
   },
   "patches": [
    {
     "src": "art/lean_mouth.webp?v=0d15b481",
     "rect": [
      372,
      525,
      244,
      147
     ],
     "kind": "mouth"
    },
    {
     "src": "art/lean_eyes.webp?v=36dda4be",
     "rect": [
      186,
      240,
      418,
      277
     ],
     "kind": "eyes"
    }
   ]
  },
  "hina_wave": {
   "view": "wave",
   "fire": null,
   "bg": {
    "src": "art/bg_booth.webp?v=0132151c",
    "fire": [
     0.521,
     0.376
    ]
   },
   "char": {
    "src": "art/char_wave.webp?v=ab2efff0",
    "w": 1700,
    "h": 988,
    "x": 0.5,
    "y": 1.02,
    "height": 0.95
   },
   "patches": [
    {
     "src": "art/wave_mouth.webp?v=574d4213",
     "rect": [
      1099,
      334,
      145,
      96
     ],
     "kind": "mouth"
    },
    {
     "src": "art/wave_eyes.webp?v=6545b411",
     "rect": [
      1002,
      193,
      264,
      150
     ],
     "kind": "eyes"
    }
   ]
  }
 },
 "skipVideo": "media/video/v_",
 "hooks": {
  "view": "HINA.S.view",
  "mouth": "HINA.FW.mouth"
 }
};
