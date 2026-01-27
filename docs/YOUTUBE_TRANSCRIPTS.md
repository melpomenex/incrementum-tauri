# YouTube Transcripts in Incrementum

## Overview

YouTube transcript fetching works in both the **Tauri Desktop App** and the **Web App**, but with different implementations:

| Environment | Method | Reliability |
|-------------|--------|-------------|
| **Tauri Desktop** | yt-dlp (Rust backend) | ⭐⭐⭐ Excellent |
| **Vercel Deployed** | Serverless API endpoints | ⭐⭐⭐ Excellent |
| **Local Dev (`npm run dev`)** | CORS Proxies | ⭐ Limited |

## How It Works

### Desktop (Tauri)
The desktop app uses `yt-dlp` command-line tool to extract transcripts directly from YouTube. This is the most reliable method.

### Web App (Deployed)
When deployed to Vercel, transcript fetching uses serverless API endpoints:
- `/api/youtube/transcript` - Fetches transcript by video ID
- `/api/youtube/info` - Fetches video metadata

These endpoints make server-side requests to YouTube, bypassing CORS restrictions.

### Local Development
In local development (`npm run dev`), the app attempts to use public CORS proxies to access YouTube. However, these proxies:
- May have rate limits
- Can return 403 errors
- May be unreliable or shut down

## Development Recommendations

### For Full Transcript Testing:

**Option 1: Use Vercel Dev**
```bash
npm i -g vercel
vercel dev
```
This runs the app with working API endpoints locally.

**Option 2: Deploy to Preview**
```bash
vercel deploy
```
Test transcripts on the preview deployment.

**Option 3: Use Desktop App**
Run the Tauri app locally for full functionality:
```bash
npm run tauri:dev
```

## Troubleshooting

### "No transcript available" in local development
This is expected due to CORS restrictions. Check the browser console - if you see:
- `API fetch failed` - The API endpoint returned non-JSON (likely HTML error page)
- `CORS proxy failed` - The CORS proxy blocked the request

**Solution:** Use `vercel dev` or deploy to Vercel.

### Transcript works on some videos but not others
Not all YouTube videos have transcripts. The video must have:
- Closed captions (CC) added by the creator
- Auto-generated captions enabled

### API endpoint errors in production
If deployed to Vercel and transcripts fail:
1. Check Vercel Functions logs in the dashboard
2. Ensure the video has captions
3. YouTube may be rate-limiting the serverless functions

## Technical Implementation

### Files Involved
- `src/utils/youtubeTranscriptBrowser.ts` - Browser-side transcript fetching
- `src/lib/browser-backend.ts` - Browser backend command handlers
- `api/youtube/transcript.ts` - Vercel serverless function
- `api/youtube/info.ts` - Vercel serverless function for metadata
- `src/components/viewer/YouTubeViewer.tsx` - Video player with transcript sync
- `src/components/media/TranscriptSync.tsx` - Transcript display component

### Data Flow
```
User opens YouTube video
    ↓
YouTubeViewer calls get_youtube_transcript_by_id
    ↓
Browser Backend tries: API → CORS Proxies
    ↓
Transcript displayed in TranscriptSync component
```

## Security Note

The API endpoints are designed to be stateless and only fetch publicly available transcript data. No API keys are required as YouTube transcripts are publicly accessible for videos that have them enabled.
