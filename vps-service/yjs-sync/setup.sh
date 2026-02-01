#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -f "${SCRIPT_DIR}/.env" ]; then
  if [ $# -ge 2 ]; then
    {
      echo "YJS_SYNC_HOSTNAME=$1"
      echo "TRANSCRIPT_HOSTNAME=$2"
    } > "${SCRIPT_DIR}/.env"
  else
    echo "Missing ${SCRIPT_DIR}/.env"
    echo "Create it with YJS_SYNC_HOSTNAME and TRANSCRIPT_HOSTNAME or run:"
    echo "  ./setup.sh sync.readsync.org transcripts.readsync.org"
    exit 1
  fi
fi

cd "${SCRIPT_DIR}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker not found. Install Docker + Docker Compose first."
  exit 1
fi

sudo docker compose pull
sudo docker compose up -d
sudo docker compose ps

SYNC_LINE=$(grep -E '^YJS_SYNC_HOSTNAME=' .env | tail -n 1 || true)
SYNC_HOST=${SYNC_LINE#YJS_SYNC_HOSTNAME=}
TRANSCRIPT_LINE=$(grep -E '^TRANSCRIPT_HOSTNAME=' .env | tail -n 1 || true)
TRANSCRIPT_HOST=${TRANSCRIPT_LINE#TRANSCRIPT_HOSTNAME=}

if [ -n "${SYNC_HOST}" ]; then
  echo ""
  echo "Health check: https://${SYNC_HOST}/health"
  echo "WebSocket:   wss://${SYNC_HOST}"
fi

if [ -n "${TRANSCRIPT_HOST}" ]; then
  echo "Transcripts: https://${TRANSCRIPT_HOST}"
fi
