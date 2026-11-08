#!/usr/bin/env python3
"""Demo31's night-scene cut-out cleaning now lives in tools/art/clean_cutout.py (shared). This wrapper runs it on Demo31."""
import os, subprocess, sys
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.exit(subprocess.call([sys.executable, os.path.join(HERE, '..', '..', '..', 'tools', 'art', 'clean_cutout.py'), HERE]))
