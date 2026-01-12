# PWA + Cloud Sync Deployment Guide

## Quick Start

### Development (PWA Mode)
```bash
# Install dependencies
npm install
cd server && npm install && cd ..

# Start the sync server (requires PostgreSQL)
docker-compose up db -d
cd server && npm run dev &

# Start the PWA frontend
npm run dev:pwa
```

### Production (Docker Self-Hosted)
```bash
# Set environment variables
export JWT_SECRET="your-secure-secret-here"

# Build and run
docker-compose up -d

# Access at http://localhost
```

### Production (Vercel)
1. Connect your repository to Vercel
2. Set environment variables:
   - `VERCEL_API_URL`: URL of your sync server
3. Deploy - Vercel will use `vercel.json` configuration

## Environment Variables

### Frontend
- `VITE_API_URL`: Sync server URL (default: `/api`)

### Sync Server
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT signing
- `JWT_EXPIRES_IN`: Token expiration (default: `7d`)
- `STORAGE_PATH`: File upload directory (default: `./uploads`)
- `CORS_ORIGINS`: Comma-separated allowed origins

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│  Tauri Desktop  │     │   Web PWA       │
│    (SQLite)     │     │  (IndexedDB)    │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
              ┌──────▼──────┐
              │ Sync Server │
              │  (Node.js)  │
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │ PostgreSQL  │
              └─────────────┘
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (Tauri mode) |
| `npm run dev:pwa` | Start Vite dev server (PWA mode) |
| `npm run build:pwa` | Build PWA for production |
| `npm run server:dev` | Start sync server in dev mode |
| `npm run docker:up` | Start Docker containers |
| `npm run docker:down` | Stop Docker containers |
