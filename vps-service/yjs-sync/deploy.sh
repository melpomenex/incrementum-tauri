#!/bin/bash
set -euo pipefail

VPS_HOST="100.103.106.125"
VPS_USER="leisrich"
REMOTE_DIR="/home/${VPS_USER}/yjs-sync"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "Deploying Yjs Sync Server"
echo "=========================================="
echo "Host: ${VPS_HOST}"
echo "Remote dir: ${REMOTE_DIR}"
echo ""

if [ ! -f "${SCRIPT_DIR}/.env" ]; then
  echo "Missing ${SCRIPT_DIR}/.env"
  echo "Copy .env.example -> .env and set YJS_SYNC_HOSTNAME."
  exit 1
fi

# Create remote directory
ssh ${VPS_USER}@${VPS_HOST} "mkdir -p ${REMOTE_DIR}"

# Copy files
scp \
  "${SCRIPT_DIR}/docker-compose.yml" \
  "${SCRIPT_DIR}/Caddyfile" \
  "${SCRIPT_DIR}/.env" \
  ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/

# Start or update services
ssh ${VPS_USER}@${VPS_HOST} << EOF
cd ${REMOTE_DIR}
sudo docker compose pull
# Ensure the latest config is applied
sudo docker compose up -d
sudo docker compose ps
EOF

echo ""
echo "=========================================="
echo "Deployment complete!"
echo "=========================================="
