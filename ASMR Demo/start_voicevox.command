#!/bin/bash
# Start the local VOICEVOX engine (downloaded to ~/VOICEVOX-engine/engine, official release 0.26.1, Apple Silicon).
# First run: macOS may block the unsigned binary — this clears the download quarantine flag for that folder only.
ENGINE="$HOME/VOICEVOX-engine/engine"
[ -x "$ENGINE/run" ] || chmod +x "$ENGINE/run"
xattr -dr com.apple.quarantine "$ENGINE" 2>/dev/null
cd "$ENGINE" && ./run --host 127.0.0.1 --port 50021
