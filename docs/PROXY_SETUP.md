# YouTube Transcript Setup with yt-dlp

This project uses **yt-dlp** (via Python) to fetch YouTube transcripts - the same approach used by the tldw project. This is much more reliable than browser-based scraping.

## How It Works

1. **yt-dlp** (Python library) extracts video metadata and caption URLs directly from YouTube
2. Captions are prioritized: manual subtitles > automatic captions
3. Language priority: en-US > en-CA > en > any English variant
4. Format priority: VTT > SRT > TTML

## Vercel Configuration

Vercel supports Python serverless functions in the `api/` directory. The transcript API is implemented in Python for better reliability.

### Python Dependencies

The `api/requirements.txt` file specifies Python dependencies. Vercel will automatically install these during deployment.

### Environment Variables

Go to **Vercel Dashboard > Your Project > Settings > Environment Variables**:

| Variable | Value (Example) | Required |
|----------|-----------------|----------|
| `DECODO_PROXY_URL` | `http://username:password@gate.decodo.com:10001` | Recommended |
| `RESIDENTIAL_PROXY_URL` | `http://user:pass@proxy.example.com:8080` | Alternative |

## Residential Proxy (Recommended)

To avoid YouTube bot detection, configure a residential proxy.

### Getting a Decodo Proxy

1. Sign up at [decodo.com](https://decodo.com) (formerly Smartproxy)
2. Go to your dashboard and create a residential proxy plan
3. Get your proxy credentials
4. The format will be: `http://username:password@gate.decodo.com:10001`

### Setting Up in Vercel

1. Go to **Vercel Dashboard > Your Project > Settings > Environment Variables**
2. Add a new variable:
   - **Name**: `DECODO_PROXY_URL`
   - **Value**: `http://sps486nntn:Yi7uqUnrbIK6au=7o0@gate.decodo.com:10001` (your actual proxy URL)
3. Click Save
4. Redeploy your application

## Health Check

You can verify the setup by visiting:
```
/api/youtube/transcript?status=true
```

The response will show:
```json
{
  "success": true,
  "proxy": {
    "configured": true,
    "url": "http://***:***@gate.decodo.com:10001"
  },
  "method": "yt-dlp-python",
  "message": "Using yt-dlp Python API with proxy"
}
```

## Testing the API

### With Proxy
```bash
curl "https://your-app.vercel.app/api/youtube/transcript?videoId=dQw4w9WgXcQ"
```

### Expected Response
```json
{
  "success": true,
  "videoId": "dQw4w9WgXcQ",
  "language": "en",
  "segments": [
    {"text": "We're no strangers to love", "start": 0.0, "duration": 4.0},
    {"text": "You know the rules and so do I", "start": 4.0, "duration": 4.0}
  ],
  "method": "yt-dlp-python"
}
```

## Security

- ✅ Proxy credentials are stored as environment variables only
- ✅ Never exposed to client-side code
- ✅ Credentials are masked in logs and API responses (`***:***`)
- ✅ Only used server-side in Vercel functions

## Troubleshooting

### "YOUTUBE_BOT_DETECTED" Error

If you see this error, YouTube is blocking requests. **Set up a residential proxy** as described above.

### "No captions available" Error

The video may not have captions enabled. yt-dlp looks for:
1. Manual subtitles (uploaded by creator)
2. Automatic captions (YouTube-generated)

### "ModuleNotFoundError: No module named 'yt_dlp'"

Make sure `api/requirements.txt` exists with `yt-dlp>=2023.12.30` and redeploy.

### Proxy Not Working

1. Verify your proxy URL is correct in Vercel environment variables
2. Check that your proxy plan is active and has available bandwidth
3. Test the proxy URL locally:
   ```bash
   curl -x "http://username:password@gate.decodo.com:10001" https://ip.decodo.com/json
   ```

## Comparison with tldw Project

This implementation closely follows the approach in [stong/tldw](https://github.com/stong/tldw):

| Feature | tldw (Python) | This Project (Python API)
|---------|---------------|--------------------------
| Tool | yt-dlp (Python) | yt-dlp (Python)
| Proxy Support | Yes | Yes
| Caption Priority | Manual > Auto | Manual > Auto
| Language Priority | en-* variants | en-* variants
| Format Priority | VTT > SRT > TTML | VTT > SRT > TTML

## Local Development

When running locally with `vercel dev`, the Python API will work automatically.

To test the Python API locally:
```bash
# Install Python dependencies
pip install -r api/requirements.txt

# Run the dev server
vercel dev
```

Note: Make sure not to commit `.env.local` with real credentials!
