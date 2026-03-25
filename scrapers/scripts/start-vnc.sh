#!/bin/bash
# Start the persistent browser environment for Facebook scraping
# Xvfb (virtual display) + Chromium + x11vnc + noVNC

set -e

DISPLAY_NUM=99
DISPLAY=":${DISPLAY_NUM}"
VNC_PORT=5999
NOVNC_PORT=6080
RESOLUTION="1280x900x24"

# Kill any existing instances
pkill -f "Xvfb :${DISPLAY_NUM}" 2>/dev/null || true
pkill -f "x11vnc.*:${DISPLAY_NUM}" 2>/dev/null || true
pkill -f "websockify.*${NOVNC_PORT}" 2>/dev/null || true
sleep 1

echo "[1/4] Starting Xvfb virtual display on ${DISPLAY}..."
Xvfb ${DISPLAY} -screen 0 ${RESOLUTION} -ac +extension GLX +render -noreset &
sleep 2

echo "[2/4] Starting x11vnc on port ${VNC_PORT}..."
x11vnc -display ${DISPLAY} -rfbport ${VNC_PORT} -rfbauth /root/.vnc/passwd -localhost \
    -forever -shared -noxdamage -noxfixes -noxrecord \
    -bg -o /var/log/x11vnc.log

echo "[3/4] Starting noVNC web client on port ${NOVNC_PORT}..."
websockify --daemon --web /usr/share/novnc 127.0.0.1:${NOVNC_PORT} 127.0.0.1:${VNC_PORT} \
    --log-file /var/log/novnc.log

echo "[4/4] Launching Chromium browser..."
DISPLAY=${DISPLAY} /root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome \
    --no-sandbox \
    --disable-gpu \
    --disable-dev-shm-usage \
    --window-size=1280,900 \
    --window-position=0,0 \
    --user-data-dir=/root/.config/fb-scraper-profile \
    --remote-debugging-port=9222 \
    "https://www.facebook.com/" &

# Wait for debugging port
for i in $(seq 1 10); do
    curl -s http://localhost:9222/json/version > /dev/null 2>&1 && break
    sleep 1
done

echo ""
echo "=========================================="
echo "VNC ready!"
echo "noVNC (browser): http://localhost:${NOVNC_PORT}/vnc.html"
echo "VNC direct:      localhost:${VNC_PORT}"
echo "Password:        $(cat /root/.vnc/passwd_plain)"
echo "=========================================="
echo ""
echo "Log into Facebook in the browser, then close this terminal."
echo "The session will persist. The session will persist."
