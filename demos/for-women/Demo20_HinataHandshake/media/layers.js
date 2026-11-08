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
    "src": "art/char_booth.webp?v=8e3c9fff",
    "w": 1700,
    "h": 989,
    "x": 0.56,
    "y": 1.02,
    "height": 1.0,
    "box": [
     84,
     0,
     2560,
     1440
    ]
   },
   "patches": [
    {
     "src": "art/booth_mouth.webp?v=ecd0ea85",
     "rect": [
      1097,
      330,
      148,
      102
     ],
     "kind": "mouth"
    },
    {
     "src": "art/booth_eyes.webp?v=88502c6b",
     "rect": [
      1013,
      203,
      244,
      128
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
    "src": "art/char_hands.webp?v=eb4f1db5",
    "w": 1700,
    "h": 856,
    "x": 0.4601,
    "y": 1.02,
    "height": 1.02,
    "box": [
     0,
     0,
     2860,
     1440
    ]
   },
   "patches": [
    {
     "src": "art/hands_mouth.webp?v=134445f2",
     "rect": [
      996,
      363,
      112,
      92
     ],
     "kind": "mouth"
    },
    {
     "src": "art/hands_eyes.webp?v=3838ed08",
     "rect": [
      840,
      193,
      274,
      162
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
    "src": "art/char_lean.webp?v=6e8d85d8",
    "w": 1700,
    "h": 980,
    "x": 0.45,
    "y": 1.02,
    "height": 1.02,
    "box": [
     0,
     0,
     2499,
     1440
    ]
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
     "src": "art/lean_eyes.webp?v=c3034dd4",
     "rect": [
      171,
      241,
      446,
      276
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
    "src": "art/char_wave.webp?v=f7eb28f7",
    "w": 1700,
    "h": 863,
    "x": 0.5667,
    "y": 1.02,
    "height": 0.95,
    "box": [
     83,
     0,
     2920,
     1440
    ]
   },
   "patches": [
    {
     "src": "art/wave_mouth.webp?v=4f8e6d59",
     "rect": [
      959,
      291,
      127,
      84
     ],
     "kind": "mouth"
    },
    {
     "src": "art/wave_eyes.webp?v=802206f6",
     "rect": [
      884,
      177,
      213,
      111
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
