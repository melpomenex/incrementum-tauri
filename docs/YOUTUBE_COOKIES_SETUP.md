# YouTube Cookie Authentication

This guide explains how to use cookie-based authentication for fetching YouTube transcripts. This helps avoid bot detection and allows transcript fetching when YouTube requires sign-in.

## Overview

YouTube has been increasingly aggressive in blocking automated requests. Without authentication cookies, you may see errors like:
- "Sign in to confirm you're not a bot"
- "Failed to parse player response data"

**The app now supports user-provided cookies stored locally in your browser.** Each user can upload their own YouTube cookies, which are stored in IndexedDB and only used for transcript fetching.

## Quick Setup (For Users)

### Step 1: Export Your YouTube Cookies

#### Option A: Using "Get cookies.txt" Chrome Extension (Recommended)

1. Install the [Get cookies.txt](https://chromewebstore.google.com/detail/get-cookiestxt/bgaddhkoddajcdgocldbbfleckgcbcid) extension from the Chrome Web Store
2. Go to [youtube.com](https://www.youtube.com) and make sure you're logged in
3. Click the extension icon in your browser toolbar
4. Click "Export" to copy cookies to clipboard

#### Option B: Using "EditThisCookie" Chrome Extension

1. Install the [EditThisCookie](https://chromewebstore.google.com/detail/editthiscookie/fngmhnnpilhplaeedifhccceomclgfbg) extension
2. Go to [youtube.com](https://www.youtube.com) and make sure you're logged in
3. Click the extension icon and select "Export" → "Export as JSON"
4. Copy the JSON content

### Step 2: Upload Cookies in the App

1. Open any YouTube video in the app
2. If transcript fetching fails, you'll see an "Add YouTube Cookies" button
3. Click it and paste your exported cookies
4. Click "Save Cookies"
5. The transcript will automatically retry loading

### Step 3: Done!

Your cookies are now stored locally in your browser and will be used for all future transcript requests.

## Cookie Storage

**Your cookies are stored entirely locally:**
- Stored in your browser's IndexedDB (local database)
- Never sent to any server except our API endpoint for transcript fetching
- Never logged, tracked, or shared
- Only accessible by this app on your device

## When to Refresh Cookies

Cookies typically expire when:
- You sign out of YouTube
- You change your Google password
- After extended periods (Google rotates sessions periodically)
- When using 2FA (may need to re-authenticate)

**If transcript fetching starts failing again:**
1. Go to any YouTube video in the app
2. Look for the "Update" link next to your cookie status
3. Upload fresh cookies

## Privacy & Security

### What Cookies Are Used
Only YouTube authentication cookies are stored:
- `LOGIN_INFO` - Main login session
- `VISITOR_INFO1_LIVE` - Visitor tracking (helps avoid bot detection)
- `YSC` - Session security
- `HSID`, `SSID`, `APISID`, `SAPISID`, `SID` - Google authentication cookies
- `CONSENT` - Cookie consent status

### Security Best Practices
- Cookies are treated like passwords - keep them private
- Only export cookies from a secure device
- If you suspect cookies were compromised, sign out of YouTube on all devices
- Consider using a dedicated Google account just for this purpose (optional)

## For Site Administrators (Optional)

In addition to user-provided cookies, you can also configure server-side cookies via environment variables. This provides a fallback when users haven't uploaded their own cookies.

### Server-Side Cookie Setup

1. Export cookies from a browser (same process as above)
2. In Vercel dashboard, add environment variable:
   - **Name**: `YOUTUBE_COOKIES_JSON`
   - **Value**: Your exported JSON cookies
3. Redeploy

This allows the API to use server-side cookies as a fallback, but **user-provided cookies take precedence**.

## Troubleshooting

### "No cookies found" when pasting
Make sure you're exporting from youtube.com while logged in. The export should contain cookies like `LOGIN_INFO`, `VISITOR_INFO1_LIVE`, etc.

### "Invalid cookie format"
The app accepts:
- JSON format (from EditThisCookie)
- Netscape cookies.txt format (from Get cookies.txt)
- Simple `name=value; name2=value2` format

### Transcripts still don't work after uploading cookies
1. Make sure you're logged into YouTube when exporting cookies
2. Try exporting fresh cookies (don't use an old export)
3. Some videos may be blocked by YouTube regardless of cookies
4. Check browser console for specific error messages

### How do I clear my cookies?
In the transcript panel, click the trash icon next to your cookie status, or clear site data in your browser settings.

## Technical Details

### Data Flow
```
User exports cookies from YouTube
    ↓
User pastes cookies in app UI
    ↓
Cookies stored in browser's IndexedDB
    ↓
App fetches transcript
    ↓
Cookies sent to /api/youtube/transcript
    ↓
API uses cookies to authenticate with YouTube
    ↓
Transcript returned to user
```

### Cookie Lifetime
- Stored until explicitly cleared
- Survives browser restarts
- Does not sync across devices
- Each device/browser needs its own cookie upload

## FAQ

**Q: Do I need to upload cookies on every device?**
A: Yes, cookies are stored locally per browser. Upload them on each device you use.

**Q: Will this work in private/incognito mode?**
A: No, IndexedDB is typically cleared when you close an incognito window.

**Q: Can I use the same cookies on multiple devices?**
A: Yes, you can copy-paste the same cookie export to multiple devices.

**Q: Is this safe?**
A: Yes. Cookies are stored locally in your browser and only sent to our API for transcript fetching. However, treat cookies like passwords - don't share them publicly.
