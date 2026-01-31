#!/bin/bash
# Deploy script for transcript-tester to a VPS

# Configuration
VPS_HOST=""
VPS_USER="root"
REMOTE_DIR="/root/transcript-tester"

if [ -z "$VPS_HOST" ]; then
    echo "Usage: ./deploy.sh <vps_host>"
    echo ""
    echo "Example:"
    echo "  ./deploy.sh 123.45.67.89"
    echo "  ./deploy.sh my-vps.example.com"
    exit 1
fi

VPS_HOST=$1

echo "=========================================="
echo "Deploying transcript-tester to VPS"
echo "=========================================="
echo "Host: $VPS_HOST"
echo "Remote dir: $REMOTE_DIR"
echo ""

# Create remote directory and copy files
echo "[1/3] Creating remote directory..."
ssh ${VPS_USER}@${VPS_HOST} "mkdir -p ${REMOTE_DIR}"

echo "[2/3] Copying files..."
scp fetch.py README.md ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/

echo "[3/3] Testing..."
ssh ${VPS_USER}@${VPS_HOST} "cd ${REMOTE_DIR} && python3 --version"

echo ""
echo "=========================================="
echo "Deployment complete!"
echo "=========================================="
echo ""
echo "To test on the VPS:"
echo "  ssh ${VPS_USER}@${VPS_HOST}"
echo "  cd ${REMOTE_DIR}"
echo "  python3 fetch.py dQw4w9WgXcQ"
echo ""
