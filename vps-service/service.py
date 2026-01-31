#!/usr/bin/env python3
"""
YouTube Transcript Service - Runs on Tailscale VPS
Fetches transcripts using yt-dlp + proxy and caches them locally
"""

import os
import sys
import json
import time
import hashlib
import subprocess
from pathlib import Path
from datetime import datetime, timedelta

# Flask for HTTP server
try:
    from flask import Flask, request, jsonify
    from flask_cors import CORS
except ImportError:
    print("Installing required packages...")
    subprocess.run([sys.executable, "-m", "pip", "install", "flask", "flask-cors"], check=True)
    from flask import Flask, request, jsonify
    from flask_cors import CORS

# =============================================================================
# CONFIGURATION
# =============================================================================
PROXY_HOST = "us.decodo.com"
PROXY_PORT = "10001"
PROXY_USER = "sps486nntn"
PROXY_PASS = "Yi7uqUnrbIK6au=7o0"
PROXY_URL = f"http://{PROXY_USER}:{PROXY_PASS}@{PROXY_HOST}:{PROXY_PORT}"

# API key for authentication (set via env var)
API_KEY = os.environ.get("TRANSCRIPT_API_KEY", "change-me-in-production")

# Cache directory
CACHE_DIR = Path("./transcript_cache")
CACHE_DIR.mkdir(exist_ok=True)

# Cache TTL (24 hours)
CACHE_TTL = timedelta(hours=24)

# Flask app
app = Flask(__name__)
CORS(app)

# =============================================================================
# CACHE FUNCTIONS
# =============================================================================

def get_cache_path(video_id):
    """Get cache file path for a video."""
    return CACHE_DIR / f"{video_id}.json"

def is_cache_valid(cache_path):
    """Check if cached file is still valid."""
    if not cache_path.exists():
        return False

    # Check file age
    mtime = datetime.fromtimestamp(cache_path.stat().st_mtime)
    return datetime.now() - mtime < CACHE_TTL

def load_from_cache(video_id):
    """Load transcript from cache."""
    cache_path = get_cache_path(video_id)
    if not is_cache_valid(cache_path):
        return None

    try:
        with open(cache_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data
    except Exception as e:
        print(f"Error loading cache: {e}")
        return None

def save_to_cache(video_id, data):
    """Save transcript to cache."""
    cache_path = get_cache_path(video_id)
    try:
        with open(cache_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"Error saving cache: {e}")
        return False

# =============================================================================
# TRANSCRIPT FETCHING (yt-dlp)
# =============================================================================

def extract_video_id(url_or_id):
    """Extract video ID from various YouTube URL formats."""
    import re
    patterns = [
        r'(?:youtube\.com/watch\?v=|youtu\.be/)([a-zA-Z0-9_-]{11})',
        r'youtube\.com/embed/([a-zA-Z0-9_-]{11})',
        r'youtube\.com/v/([a-zA-Z0-9_-]{11})',
        r'youtube\.com/shorts/([a-zA-Z0-9_-]{11})',
    ]

    if re.match(r'^[a-zA-Z0-9_-]{11}$', url_or_id):
        return url_or_id

    for pattern in patterns:
        match = re.search(pattern, url_or_id)
        if match:
            return match.group(1)

    return None

def get_video_info_ytdlp(video_id):
    """Get video info using yt-dlp."""
    video_url = f'https://www.youtube.com/watch?v={video_id}'

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
            return None, result.stderr

        info = json.loads(result.stdout)
        return info, None

    except Exception as e:
        return None, str(e)

def get_available_subtitles(info):
    """Get list of available subtitle languages."""
    subtitles = info.get('subtitles', {})
    auto_captions = info.get('automatic_captions', {})

    manual_langs = list(subtitles.keys())
    auto_langs = list(auto_captions.keys())

    return {
        'manual': manual_langs,
        'auto': auto_langs
    }

def download_subtitles_ytdlp(video_id, lang='en'):
    """Download subtitles using yt-dlp."""
    video_url = f'https://www.youtube.com/watch?v={video_id}'

    cmd = [
        'yt-dlp',
        '--proxy', PROXY_URL,
        '--write-subs',
        '--write-auto-subs',
        '--sub-langs', lang,
        '--sub-format', 'vtt',  # Use VTT format (more reliable)
        '--skip-download',
        '--output', f'{video_id}.%(ext)s',
        '--no-playlist',
        video_url
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60,
            cwd=str(CACHE_DIR)
        )

        if result.returncode != 0:
            error_output = result.stderr.strip()
            if error_output:
                return None, f"yt-dlp error: {error_output[:200]}"
            return None, "yt-dlp failed to download subtitles"

        # Find the downloaded VTT file
        # Try exact match first, then patterns
        patterns = [
            f"{video_id}.{lang}.vtt",
            f"{video_id}.en.vtt",
            f"{video_id}.*.vtt",
        ]

        vtt_file = None
        for pattern in patterns:
            matches = list(CACHE_DIR.glob(pattern))
            if matches:
                vtt_file = matches[0]
                break

        if not vtt_file:
            # List all files to debug
            all_files = list(CACHE_DIR.glob(f"{video_id}*"))
            return None, f"No VTT file found. Downloaded: {[f.name for f in all_files]}"

        # Read VTT content
        with open(vtt_file, 'r', encoding='utf-8') as f:
            vtt_content = f.read()

        # Clean up the downloaded file
        vtt_file.unlink()

        # Also remove any other files for this video
        for f in CACHE_DIR.glob(f"{video_id}*"):
            try:
                f.unlink()
            except:
                pass

        return vtt_content, None

    except subprocess.TimeoutExpired:
        return None, "Download timed out"
    except Exception as e:
        return None, str(e)

def parse_vtt_subtitles(vtt_content):
    """Parse VTT format subtitles to segments."""
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
                        'start': round(start, 3),
                        'duration': round(end - start, 3),
                        'text': text
                    })

            except Exception as e:
                print(f"Warning: Failed to parse timestamp: {line}")
                pass

        i += 1

    return segments

def fetch_transcript(video_id):
    """Main function to fetch transcript with caching."""
    # Check cache first
    cached = load_from_cache(video_id)
    if cached:
        print(f"[{video_id}] Cache hit")
        return {
            'success': True,
            'cached': True,
            'videoId': video_id,
            **cached
        }

    print(f"[{video_id}] Cache miss, fetching...")

    # Get video info
    info, error = get_video_info_ytdlp(video_id)
    if not info:
        return {
            'success': False,
            'error': f"Failed to get video info: {error}",
            'code': 'VIDEO_INFO_FAILED'
        }

    title = info.get('title', 'Unknown')
    duration = info.get('duration', 0)

    # Check available subtitles
    available = get_available_subtitles(info)

    if not available['manual'] and not available['auto']:
        return {
            'success': False,
            'error': 'No captions available for this video',
            'code': 'NO_CAPTIONS',
            'available': available
        }

    # Try to download subtitles
    subtitle_data, error = download_subtitles_ytdlp(video_id)

    if not subtitle_data:
        return {
            'success': False,
            'error': f"Failed to download subtitles: {error}",
            'code': 'DOWNLOAD_FAILED',
            'available': available
        }

    # Parse segments
    segments = parse_vtt_subtitles(subtitle_data)

    if not segments:
        return {
            'success': False,
            'error': 'No transcript segments found',
            'code': 'NO_SEGMENTS'
        }

    # Build response
    result = {
        'title': title,
        'duration': duration,
        'language': 'en',
        'segments': segments,
        'segment_count': len(segments),
        'available_languages': available
    }

    # Save to cache
    save_to_cache(video_id, result)

    return {
        'success': True,
        'cached': False,
        'videoId': video_id,
        **result
    }

# =============================================================================
# FLASK ROUTES
# =============================================================================

def require_auth():
    """Check API key authentication."""
    auth_header = request.headers.get('Authorization', '')
    bearer_token = request.headers.get('X-API-Key', '')

    token = None
    if auth_header.startswith('Bearer '):
        token = auth_header[7:]
    elif bearer_token:
        token = bearer_token

    return token == API_KEY

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'cache_size': len(list(CACHE_DIR.glob('*.json')))
    })

@app.route('/transcript/<video_id>', methods=['GET', 'POST'])
def get_transcript(video_id):
    """Get transcript for a video."""
    # Check authentication
    if not require_auth():
        return jsonify({
            'success': False,
            'error': 'Unauthorized'
        }), 401

    # Validate video ID
    extracted_id = extract_video_id(video_id)
    if not extracted_id:
        return jsonify({
            'success': False,
            'error': 'Invalid video ID'
        }), 400

    video_id = extracted_id

    # Fetch transcript
    result = fetch_transcript(video_id)

    if result.get('success'):
        return jsonify(result), 200
    else:
        error_code = result.get('code', 'UNKNOWN')
        status_code = 404 if error_code == 'NO_CAPTIONS' else 500
        return jsonify(result), status_code

@app.route('/cache/stats', methods=['GET'])
def cache_stats():
    """Get cache statistics."""
    if not require_auth():
        return jsonify({'error': 'Unauthorized'}), 401

    cache_files = list(CACHE_DIR.glob('*.json'))
    total_size = sum(f.stat().st_size for f in cache_files)

    stats = {
        'total_files': len(cache_files),
        'total_size_bytes': total_size,
        'total_size_mb': round(total_size / (1024 * 1024), 2),
        'cache_dir': str(CACHE_DIR.absolute())
    }

    return jsonify(stats)

@app.route('/cache/clear', methods=['POST'])
def cache_clear():
    """Clear all cached transcripts."""
    if not require_auth():
        return jsonify({'error': 'Unauthorized'}), 401

    count = 0
    for f in CACHE_DIR.glob('*.json'):
        f.unlink()
        count += 1

    return jsonify({'cleared': count, 'message': f'Cleared {count} cached files'})

# =============================================================================
# MAIN
# =============================================================================

if __name__ == '__main__':
    print("=" * 50)
    print("YouTube Transcript Service (Tailscale VPS)")
    print("=" * 50)
    print(f"Cache directory: {CACHE_DIR.absolute()}")
    print(f"Proxy: {PROXY_HOST}:{PROXY_PORT}")
    print(f"API Key: {'Set' if API_KEY else 'NOT SET - using default'}")
    print("=" * 50)

    # Run server
    app.run(
        host='0.0.0.0',
        port=8766,
        debug=False
    )
