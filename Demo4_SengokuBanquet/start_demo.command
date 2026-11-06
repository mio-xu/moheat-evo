#!/bin/bash
# Double-click to run the demo locally in Chrome (Web Serial needs Chrome/Edge).
cd "$(dirname "$0")/.."
PORT=8765
python3 -m http.server $PORT >/dev/null 2>&1 &
SERVER=$!
sleep 1
open -a "Google Chrome" "http://localhost:$PORT/Demo4_SengokuBanquet/" 2>/dev/null || open "http://localhost:$PORT/Demo4_SengokuBanquet/"
echo "Demo running at http://localhost:$PORT/Demo4_SengokuBanquet/  — close this window to stop."
wait $SERVER
