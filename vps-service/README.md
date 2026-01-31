# YouTube Transcript Service

Runs on your Tailscale VPS to fetch YouTube transcripts using yt-dlp + proxy, with local caching.

## Quick Start

```bash
# Install dependencies
pip3 install flask flask-cors yt-dlp

# Set API key
export TRANSCRIPT_API_KEY="your-secure-random-key-here"

# Run the service
python3 service.py
```

## Expose to Vercel via Tailscale Funnel

Since Vercel is NOT on your Tailscale network, use **Tailscale Funnel**:

```bash
# Start the service first
python3 service.py &

# Then expose it via Tailscale Funnel
sudo tailscale funnel 8766
```

This gives you a **public URL** like:
```
https://leisrichs-machine.ts.net
```

Vercel can now access this URL.

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Vercel    │ ──HTTPS▶│  Tailscale   │ ──yt-dlp─▶│   YouTube   │
│  (readsync) │  Funnel │     Funnel   │  +proxy  │             │
└─────────────┘         └──────────────┘         └─────────────┘
                                 │
                                 ▼
                          ┌──────────────┐
                          │  Local Cache │
                          │  (24hr TTL)   │
                          └──────────────┘
```

## Vercel Environment Variables

Add these to your Vercel project:

```bash
VPS_TRANSCRIPT_URL=https://your-machine-name.ts.net
VPS_TRANSCRIPT_API_KEY=your-generated-api-key
```

## Test Endpoints

```bash
# Health check
curl -H "X-API-Key: your-api-key" \
     https://your-machine-name.ts.net/health

# Get transcript
curl -H "X-API-Key: your-api-key" \
     https://your-machine-name.ts.net/transcript/dQw4w9WgXcQ

# Cache stats
curl -H "X-API-Key: your-api-key" \
     https://your-machine-name.ts.net/cache/stats
```

## Response Format

Success:
```json
{
  "success": true,
  "cached": false,
  "videoId": "dQw4w9WgXcQ",
  "title": "Never Gonna Give You Up",
  "duration": 212,
  "language": "en",
  "segments": [
    {"start": 0.0, "duration": 2.5, "text": "First words..."},
    ...
  ],
  "segment_count": 312
}
```

## Run as Systemd Service

Create `/etc/systemd/system/transcript-service.service`:

```ini
[Unit]
Description=YouTube Transcript Service
After=network.target tailscale.service

[Service]
Type=simple
User=leisrich
WorkingDirectory=/home/leisrich/transcript-service
Environment="TRANSCRIPT_API_KEY=your-secure-random-key-here"
ExecStart=/usr/bin/python3 /home/leisrich/transcript-service/service.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable transcript-service
sudo systemctl start transcript-service
```

## Enable Tailscale Funnel on Boot

Add to your crontab (`crontab -e`):

```
@reboot sleep 30 && sudo tailscale funnel 8766
```

Or create a systemd service for the funnel.

## Security

- API key authentication required
- Tailscale Funnel provides HTTPS automatically
- Only `/transcript/<video_id>` endpoint needs to be exposed
- Cache TTL of 24 hours reduces repeated requests

## Troubleshooting

**Funnel not working?**
```bash
# Check Tailscale status
sudo tailscale status

# Check if funnel is running
sudo tailscale status --json | grep funnel
```

**Service not responding?**
```bash
# Check service status
sudo systemctl status transcript-service

# View logs
sudo journalctl -u transcript-service -f
```
