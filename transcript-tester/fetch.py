#!/usr/bin/env python3
"""
Simple YouTube Transcript Fetcher using yt-dlp.
Fetches transcripts from YouTube and saves them as markdown files.
"""

import os
import sys
import re
import json
import subprocess
from urllib.request import Request, urlopen, ProxyHandler, build_opener

# =============================================================================
# HARDCODED PROXY CONFIGURATION
# =============================================================================
PROXY_HOST = "us.decodo.com"
PROXY_PORT = "10001"
PROXY_USER = "sps486nntn"
PROXY_PASS = "Yi7uqUnrbIK6au=7o0"

PROXY_URL = f"http://{PROXY_USER}:{PROXY_PASS}@{PROXY_HOST}:{PROXY_PORT}"

# =============================================================================
# FUNCTIONS
# =============================================================================

def extract_video_id(url_or_id):
    """Extract video ID from various YouTube URL formats."""
    patterns = [
        r'(?:youtube\.com/watch\?v=|youtu\.be/)([a-zA-Z0-9_-]{11})',
        r'youtube\.com/embed/([a-zA-Z0-9_-]{11})',
        r'youtube\.com/v/([a-zA-Z0-9_-]{11})',
        r'youtube\.com/shorts/([a-zA-Z0-9_-]{11})',
    ]

    # If it's already an 11-char ID, return as-is
    if re.match(r'^[a-zA-Z0-9_-]{11}$', url_or_id):
        return url_or_id

    for pattern in patterns:
        match = re.search(pattern, url_or_id)
        if match:
            return match.group(1)

    return None

def check_yt_dlp():
    """Check if yt-dlp is installed."""
    try:
        result = subprocess.run(
            ['yt-dlp', '--version'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            version = result.stdout.strip()
            print(f"✓ yt-dlp installed: {version}")
            return True
    except FileNotFoundError:
        pass
    except Exception as e:
        print(f"✗ Error checking yt-dlp: {e}")

    print("✗ yt-dlp not found. Install with:")
    print("  pip install yt-dlp")
    return False

def get_video_info(video_id):
    """Get video info using yt-dlp."""
    video_url = f'https://www.youtube.com/watch?v={video_id}'

    print(f"[1/3] Getting video info via yt-dlp...")
    print(f"      Proxy: {PROXY_HOST}:{PROXY_PORT}")

    cmd = [
        'yt-dlp',
        '--proxy', PROXY_URL,
        '--dump-json',
        '--no-playlist',
        '--skip-download',
        video_url
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode != 0:
            print(f"      ✗ yt-dlp failed:")
            print(f"         {result.stderr}")
            return None

        info = json.loads(result.stdout)
        title = info.get('title', 'Unknown')
        duration = info.get('duration', 0)

        print(f"      ✓ Found: {title}")
        print(f"      Duration: {duration}s")

        return info

    except subprocess.TimeoutExpired:
        print(f"      ✗ Request timed out")
        return None
    except json.JSONDecodeError as e:
        print(f"      ✗ Failed to parse JSON: {e}")
        return None
    except Exception as e:
        print(f"      ✗ Error: {e}")
        return None

def get_available_subtitles(info):
    """Check available subtitles."""
    print(f"[2/3] Checking available subtitles...")

    subtitles = info.get('subtitles', {})
    auto_captions = info.get('automatic_captions', {})

    manual_langs = list(subtitles.keys())
    auto_langs = list(auto_captions.keys())

    if manual_langs:
        print(f"      Manual subtitles: {', '.join(manual_langs)}")

    if auto_langs:
        print(f"      Auto captions: {', '.join(auto_langs)}")

    if not manual_langs and not auto_langs:
        print(f"      ✗ No captions available")
        return None, None

    return subtitles, auto_captions

def download_subtitles(video_id, subtitles, auto_captions):
    """Download subtitles using yt-dlp."""
    print(f"[3/3] Downloading subtitles...")

    # Prefer manual subtitles, then auto-generated
    lang_priority = ['en', 'en-US', 'en-GB', 'en-CA']

    selected_lang = None
    source_type = None

    # Check manual subtitles first
    for lang in lang_priority:
        if lang in subtitles and subtitles[lang]:
            selected_lang = lang
            source_type = 'subtitles'
            break

    # Fall back to auto captions
    if not selected_lang:
        for lang in lang_priority:
            if lang in auto_captions and auto_captions[lang]:
                selected_lang = lang
                source_type = 'automatic_captions'
                break

    # Any English variant
    if not selected_lang:
        for key in list(subtitles.keys()) + list(auto_captions.keys()):
            if key.startswith('en'):
                selected_lang = key
                source_type = 'subtitles' if key in subtitles else 'automatic_captions'
                break

    if not selected_lang:
        print(f"      ✗ No English captions found")
        print(f"      Available: {list(subtitles.keys()) + list(auto_captions.keys())}")
        return None, None, None

    print(f"      Using: {selected_lang} ({'manual' if source_type == 'subtitles' else 'auto'})")

    video_url = f'https://www.youtube.com/watch?v={video_id}'

    cmd = [
        'yt-dlp',
        '--proxy', PROXY_URL,
        '--write-subs',
        '--write-auto-subs',
        '--sub-langs', selected_lang,
        '--sub-format', 'vtt',
        '--skip-download',
        '--output', '%(id)s.%(ext)s',
        '--no-playlist',
        video_url
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60,
            cwd=os.getcwd()
        )

        if result.returncode != 0:
            print(f"      ✗ Download failed:")
            print(f"         {result.stderr}")
            return None, None, None

        # Find the downloaded file
        vtt_file = f"{video_id}.{selected_lang}.vtt"
        en_vtt_file = f"{video_id}.en.vtt"

        if os.path.exists(vtt_file):
            subtitle_file = vtt_file
        elif os.path.exists(en_vtt_file):
            subtitle_file = en_vtt_file
        else:
            # Try to find any .vtt file with this video ID
            import glob
            matches = glob.glob(f"{video_id}*.vtt")
            if matches:
                subtitle_file = matches[0]
            else:
                print(f"      ✗ Could not find downloaded VTT file")
                return None, None, None

        print(f"      ✓ Downloaded: {subtitle_file}")

        with open(subtitle_file, 'r', encoding='utf-8') as f:
            vtt_content = f.read()

        # Clean up the VTT file
        os.remove(subtitle_file)

        return vtt_content, selected_lang, source_type

    except subprocess.TimeoutExpired:
        print(f"      ✗ Download timed out")
        return None, None, None
    except Exception as e:
        print(f"      ✗ Error: {e}")
        return None, None, None

def parse_vtt_to_segments(vtt_content):
    """Parse VTT content to extract segments with timestamps."""
    segments = []
    lines = vtt_content.split('\n')

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # Look for timestamp line: 00:00:00.000 --> 00:00:05.000
        if '-->' in line:
            try:
                # Parse timestamps
                parts = line.split('-->')
                start_str = parts[0].strip()
                end_str = parts[1].strip()

                # Parse start time (handle both HH:MM:SS.mmm and MM:SS.mmm)
                start_parts = start_str.split(':')
                if len(start_parts) == 3:
                    start = int(start_parts[0]) * 3600 + int(start_parts[1]) * 60 + float(start_parts[2])
                else:
                    start = int(start_parts[0]) * 60 + float(start_parts[1])

                # Parse end time
                end_parts = end_str.split(':')
                if len(end_parts) == 3:
                    end = int(end_parts[0]) * 3600 + int(end_parts[1]) * 60 + float(end_parts[2])
                else:
                    end = int(end_parts[0]) * 60 + float(end_parts[1])

                # Collect text lines
                i += 1
                text_lines = []
                while i < len(lines) and lines[i].strip() and '-->' not in lines[i]:
                    text_line = lines[i].strip()
                    # Remove VTT formatting tags
                    text_line = re.sub(r'<[^>]+>', '', text_line)
                    # Remove numeric timestamps that sometimes appear
                    text_line = re.sub(r'^\d+\s*', '', text_line)
                    if text_line:
                        text_lines.append(text_line)
                    i += 1

                text = ' '.join(text_lines).strip()

                if text:
                    segments.append({
                        'start': start,
                        'end': end,
                        'duration': end - start,
                        'text': text
                    })

            except Exception as e:
                print(f"      Warning: Failed to parse timestamp: {line}")
                pass

        i += 1

    return segments

def format_timestamp(seconds):
    """Format seconds as MM:SS or HH:MM:SS."""
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)

    if hrs > 0:
        return f"{hrs}:{mins:02d}:{secs:02d}"
    return f"{mins}:{secs:02d}"

def save_transcript(video_id, video_title, segments, lang_code):
    """Save transcript as markdown file."""
    # Create transcripts directory
    transcripts_dir = "transcripts"
    os.makedirs(transcripts_dir, exist_ok=True)

    # Sanitize filename
    safe_title = re.sub(r'[^\w\s-]', '', video_title)[:50]
    filename = f"{video_id}_{safe_title}.md"
    filepath = os.path.join(transcripts_dir, filename)

    # Build markdown content
    lines = []
    lines.append(f"# {video_title}")
    lines.append(f"")
    lines.append(f"**Video ID:** {video_id}")
    lines.append(f"**Language:** {lang_code}")
    lines.append(f"**Segments:** {len(segments)}")
    lines.append(f"")
    lines.append(f"---")
    lines.append(f"")

    for seg in segments:
        timestamp = format_timestamp(seg['start'])
        lines.append(f"**[{timestamp}]** {seg['text']}")

    content = '\n'.join(lines)

    # Write file
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"\n✓ Transcript saved to: {filepath}")
    return filepath

# =============================================================================
# MAIN
# =============================================================================

def main():
    if len(sys.argv) < 2:
        print("YouTube Transcript Fetcher (yt-dlp)")
        print("=" * 50)
        print(f"\nUsage: python3 fetch.py <youtube_url_or_id>")
        print(f"\nExample:")
        print(f"  python3 fetch.py https://www.youtube.com/watch?v=dQw4w9WgXcQ")
        print(f"  python3 fetch.py dQw4w9WgXcQ")
        print(f"\nProxy: {PROXY_HOST}:{PROXY_PORT}")
        print(f"\nRequirements: yt-dlp (pip install yt-dlp)")
        sys.exit(1)

    input_arg = sys.argv[1]

    print("=" * 50)
    print("YouTube Transcript Fetcher (yt-dlp)")
    print("=" * 50)
    print(f"\nInput: {input_arg}")

    # Check yt-dlp is installed
    if not check_yt_dlp():
        sys.exit(1)

    # Extract video ID
    video_id = extract_video_id(input_arg)
    if not video_id:
        print(f"\n✗ Could not extract video ID from input")
        sys.exit(1)

    print(f"Video ID: {video_id}")

    # Get video info
    info = get_video_info(video_id)
    if not info:
        sys.exit(1)

    video_title = info.get('title', 'Unknown')

    # Check available subtitles
    subtitles, auto_captions = get_available_subtitles(info)
    if not subtitles and not auto_captions:
        print(f"\n✗ This video has no captions available")
        sys.exit(1)

    # Download subtitles
    vtt_content, lang_code, source_type = download_subtitles(video_id, subtitles, auto_captions)
    if not vtt_content:
        print(f"\n✗ Failed to download subtitles")
        sys.exit(1)

    # Parse VTT to segments
    print(f"\n[Parsing] Converting VTT to segments...")
    segments = parse_vtt_to_segments(vtt_content)

    if not segments:
        print(f"✗ No segments parsed from VTT")
        sys.exit(1)

    print(f"      ✓ Parsed {len(segments)} segments")

    # Save transcript
    filepath = save_transcript(video_id, video_title, segments, lang_code)

    print(f"\n{'=' * 50}")
    print(f"SUCCESS! Transcript fetched successfully")
    print(f"{'=' * 50}")
    print(f"\nVideo: {video_title}")
    print(f"Language: {lang_code} ({'auto' if source_type == 'automatic_captions' else 'manual'})")
    print(f"Segments: {len(segments)}")
    print(f"Output: {filepath}")

if __name__ == "__main__":
    main()
