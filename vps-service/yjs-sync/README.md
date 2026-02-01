# Yjs Sync Server (Public, TLS)

This deploys a Yjs websocket sync server behind Caddy with automatic TLS.
It is designed for public access (e.g. `wss://sync.readsync.org`).

## Prereqs (VPS)
- Docker + Docker Compose
- A DNS A record pointing `sync.readsync.org` -> VPS IP
- Ports 80 and 443 open on the VPS firewall

## Plug-and-play (server-side)
1) SCP the whole folder to the VPS:
```bash
scp -r vps-service/yjs-sync leisrich@100.103.106.125:/home/leisrich/
```

2) On the VPS, run:
```bash
cd /home/leisrich/yjs-sync
./setup.sh sync.readsync.org transcripts.readsync.org
```

This creates `.env`, pulls images, and starts the stack.

## Deploy from this repo
If you prefer to deploy without copying the folder manually:

```bash
cp .env.example .env
# edit .env and set YJS_SYNC_HOSTNAME=sync.readsync.org
./deploy.sh
```

## Notes
- Yjs persistence is stored in a Docker volume (`yjs_data`).
- Caddy manages TLS certs automatically.
- The websocket endpoint is the same as the HTTP endpoint:
  `wss://sync.readsync.org`

## Health check
```
curl https://sync.readsync.org/health
```

## Update
Re-run `./deploy.sh` after changes.
