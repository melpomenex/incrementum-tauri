# YouTube Transcript Fetcher (yt-dlp)

Simple Python script to test if your proxy can successfully fetch YouTube transcripts using yt-dlp.

## Requirements

```bash
pip install yt-dlp
```

## Quick Start

```bash
# Test with a YouTube URL
python3 fetch.py "https://www.youtube.com/watch?v=67ESPmHIqCU"

# Or just the video ID
python3 fetch.py "67ESPmHIqCU"
```

## What It Does

1. Gets video info via yt-dlp using your proxy
2. Lists available manual and auto-generated captions
3. Downloads English captions (prefers manual, falls back to auto)
4. Parses VTT format to extract segments
5. Saves as a markdown file in `transcripts/` directory

## Output

Transcripts are saved as:
```
transcripts/{VIDEO_ID}_{TITLE}.md
```

Format:
```markdown
# Video Title

**Video ID:** xxx
**Language:** en
**Segments:** 123

---

**[0:00]** First sentence here
**[0:05]** Second sentence here
...
```

## Proxy Configuration

Proxy is hardcoded in `fetch.py`:
- **Host:** us.decodo.com
- **Port:** 10001
- **User:** sps486nntn
- **Pass:** Yi7uqUnrbIK6au=7o0

## Troubleshooting

**If step 1/3 fails:**
- Proxy connection issue - verify proxy credentials and network

**If step 2/3 shows no captions:**
- The video genuinely has no captions available

**If step 3/3 fails:**
- Check yt-dlp error output for specific issues

## Deploy to VPS

```bash
./deploy.sh your.vps.ip.address
```

Then SSH in:
```bash
ssh root@your.vps.ip
cd /root/transcript-tester
pip3 install yt-dlp
python3 fetch.py "dQw4w9WgXcQ"
```

## Test Videos Known to Have Captions

- `BsOmNcqvm0k` - TED Talk (usually has captions)
- `dQw4w9WgXcQ` - Rick Roll (has captions)
- `jNQXAC9IVRw` - "Me at the zoo" (first YouTube video, has captions)
