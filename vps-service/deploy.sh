#!/bin/bash
# Deploy transcript service to Tailscale VPS

VPS_HOST="100.103.106.125"
VPS_USER="leisrich"
REMOTE_DIR="/home/${VPS_USER}/transcript-service"
SERVICE_NAME="transcript-service"

echo "=========================================="
echo "Deploying Transcript Service to VPS"
echo "=========================================="
echo "Host: ${VPS_HOST}"
echo "Remote dir: ${REMOTE_DIR}"
echo ""

# Generate a random API key
API_KEY=$(openssl rand -hex 32)
echo "Generated API Key: ${API_KEY}"
echo ""

# Create remote directory and copy files
echo "[1/4] Creating remote directory..."
ssh ${VPS_USER}@${VPS_HOST} "mkdir -p ${REMOTE_DIR}/transcript_cache"

echo "[2/4] Copying service files..."
scp service.py README.md ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/

echo "[3/4] Installing dependencies..."
ssh ${VPS_USER}@${VPS_HOST} << EOF
cd ${REMOTE_DIR}
pip3 install flask flask-cors yt-dlp --user
EOF

echo "[4/4] Setting up systemd service..."
ssh ${VPS_USER}@${VPS_HOST} << 'EOF'
# Create systemd service file
sudo tee /etc/systemd/system/${SERVICE_NAME}.service > /dev/null << SERVICE
[Unit]
Description=YouTube Transcript Service
After=network.target

[Service]
Type=simple
User=${VPS_USER}
WorkingDirectory=${REMOTE_DIR}
Environment="TRANSCRIPT_API_KEY=${API_KEY}"
ExecStart=/usr/bin/python3 ${REMOTE_DIR}/service.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICE

# Reload systemd and start service
sudo systemctl daemon-reload
sudo systemctl enable ${SERVICE_NAME}
sudo systemctl restart ${SERVICE_NAME}
sudo systemctl status ${SERVICE_NAME} --no-pager
EOF

echo ""
echo "=========================================="
echo "Deployment complete!"
echo "=========================================="
echo ""
echo "Service running on: http://localhost:8766"
echo "API Key: ${API_KEY}"
echo ""
echo "To expose to Vercel, run Tailscale Funnel:"
echo "  sudo tailscale funnel 8766"
echo ""
echo "This will give you a public URL like:"
echo "  https://your-machine-name.ts.net"
echo ""
echo "Add to Vercel env vars:"
echo "  VPS_TRANSCRIPT_URL=https://your-machine-name.ts.net"
echo "  VPS_TRANSCRIPT_API_KEY=${API_KEY}"
echo ""
echo "Test:"
echo "  curl -H \"X-API-Key: ${API_KEY}\" https://your-machine-name.ts.net/health"
echo ""
