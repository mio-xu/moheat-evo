// Layer data for ../../shared/layers.js — written by tools/art/build_stage.py from project/stage.json (do not edit by hand).
window.MOHEAT_LAYERS = {
 "views": {
  "hina_booth": {
   "view": "booth",
   "fire": null,
   "bg": {
    "src": "art/bg_booth.webp",
    "fire": [
     0.521,
     0.376
    ]
   },
   "char": {
    "src": "art/char_booth.webp",
    "w": 1700,
    "h": 987,
    "x": 0.56,
    "y": 1.02,
    "height": 1.0
   },
   "patches": [
    {
     "src": "art/booth_mouth.webp",
     "rect": [
      1098,
      329,
      148,
      101
     ],
     "kind": "mouth"
    },
    {
     "src": "art/booth_eyes.webp",
     "rect": [
      1003,
      193,
      264,
      149
     ],
     "kind": "eyes"
    }
   ]
  },
  "hina_hands": {
   "view": "hands",
   "fire": null,
   "bg": {
    "src": "art/bg_booth.webp",
    "fire": [
     0.521,
     0.376
    ],
    "zoom": 1.15
   },
   "char": {
    "src": "art/char_hands.webp",
    "w": 1700,
    "h": 956,
    "x": 0.52,
    "y": 1.02,
    "height": 1.02
   },
   "patches": [
    {
     "src": "art/hands_mouth.webp",
     "rect": [
      914,
      406,
      125,
      102
     ],
     "kind": "mouth"
    },
    {
     "src": "art/hands_eyes.webp",
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
    "src": "art/bg_booth.webp",
    "fire": [
     0.521,
     0.376
    ],
    "zoom": 1.3
   },
   "char": {
    "src": "art/char_lean.webp",
    "w": 1700,
    "h": 979,
    "x": 0.45,
    "y": 1.02,
    "height": 1.02
   },
   "patches": [
    {
     "src": "art/lean_mouth.webp",
     "rect": [
      372,
      525,
      243,
      147
     ],
     "kind": "mouth"
    },
    {
     "src": "art/lean_eyes.webp",
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
    "src": "art/bg_booth.webp",
    "fire": [
     0.521,
     0.376
    ]
   },
   "char": {
    "src": "art/char_wave.webp",
    "w": 1700,
    "h": 987,
    "x": 0.5,
    "y": 1.02,
    "height": 0.95
   },
   "patches": [
    {
     "src": "art/wave_mouth.webp",
     "rect": [
      1099,
      333,
      145,
      96
     ],
     "kind": "mouth"
    },
    {
     "src": "art/wave_eyes.webp",
     "rect": [
      1003,
      193,
      264,
      149
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
