#!/bin/bash
# Double-click: starts the local talk server (holds the ElevenLabs key, enforces limits.json) and opens the page in Chrome.
cd "$(dirname "$0")"
PORT=8771
python3 server.py &
SERVER=$!
sleep 1.5
open -a "Google Chrome" "http://localhost:$PORT/demos/nobunaga-suntory/Demo23_NobunagaTalk/" 2>/dev/null || open "http://localhost:$PORT/demos/nobunaga-suntory/Demo23_NobunagaTalk/"
echo "Talk demo running — close this window to stop."
wait $SERVER
