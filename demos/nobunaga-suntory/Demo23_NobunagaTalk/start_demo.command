#!/bin/bash
# PRIVATE live talk. Double-click: starts server.py (holds the ElevenLabs key, enforces limits.json, password login) and opens
# the live page in Chrome. The password is in ~/.moheat_live_pass (created and printed on the first start).
#   ./start_demo.command --remote   also opens a Cloudflare quick tunnel (cloudflared) and prints a https://….trycloudflare.com/live
#                                   address for your phone; the page still asks for the password. Close this window to stop both.
#   (start_remote.command = the same, for double-clicking)
cd "$(dirname "$0")"
PORT=${PORT:-8771}
python3 server.py &
SERVER=$!
TUNNEL=
trap 'kill $SERVER $TUNNEL 2>/dev/null' EXIT INT TERM
sleep 1.5
if [ "$1" = "--remote" ]; then
  if ! command -v cloudflared >/dev/null 2>&1; then
    echo "cloudflared is not installed: brew install cloudflared   (then run this again)"; wait $SERVER; exit 1
  fi
  LOG="local/tunnel.log"; mkdir -p local; : > "$LOG"
  cloudflared tunnel --no-autoupdate --url "http://127.0.0.1:$PORT" > "$LOG" 2>&1 &
  TUNNEL=$!
  for i in $(seq 1 40); do URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" | head -1); [ -n "$URL" ] && break; sleep 0.5; done
  if [ -n "$URL" ]; then
    echo ""; echo "  Remote (phone):  $URL/live"; echo "  Password:        cat ~/.moheat_live_pass"
    echo "  The address changes every time; anyone with it still needs the password. Close this window to stop the tunnel."; echo ""
  else
    echo "Tunnel did not start — see $LOG"
  fi
else
  open -a "Google Chrome" "http://localhost:$PORT/live" 2>/dev/null || open "http://localhost:$PORT/live"
fi
echo "Live talk server running — close this window to stop."
wait $SERVER
