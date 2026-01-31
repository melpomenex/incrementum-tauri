"""
Vercel Serverless Function for fetching YouTube transcripts using yt-dlp
"""

import os
import sys
import json
import re

# Log startup info
print(f"[yt-dlp API] Starting up...", file=sys.stderr)
print(f"[yt-dlp API] Python version: {sys.version}", file=sys.stderr)

# Try to import yt-dlp
try:
    import yt_dlp
    print(f"[yt-dlp API] yt-dlp version: {yt_dlp.version.__version__}", file=sys.stderr)
    YT_DLP_AVAILABLE = True
except ImportError as e:
    print(f"[yt-dlp API] ERROR: Failed to import yt_dlp: {e}", file=sys.stderr)
    YT_DLP_AVAILABLE = False
    yt_dlp = None


def get_proxy_url():
    """Get proxy URL from environment variables"""
    return os.environ.get('DECODO_PROXY_URL') or os.environ.get('RESIDENTIAL_PROXY_URL')


def get_proxy_status():
    """Get proxy status (masks credentials)"""
    proxy_url = get_proxy_url()
    if not proxy_url:
        return {"configured": False, "url": None}
    
    try:
        from urllib.parse import urlparse
        parsed = urlparse(proxy_url)
        if parsed.username and parsed.password:
            masked = f"{parsed.scheme}://***:***@{parsed.hostname}:{parsed.port}"
            return {"configured": True, "url": masked}
    except:
        pass
    
    return {"configured": True, "url": "configured"}


def extract_video_id(url):
    """Extract video ID from YouTube URL"""
    patterns = [
        r'(?:youtube\.com/watch\?v=|youtu\.be/)([a-zA-Z0-9_-]{11})',
        r'youtube\.com/embed/([a-zA-Z0-9_-]{11})',
        r'youtube\.com/v/([a-zA-Z0-9_-]{11})',
        r'youtube\.com/shorts/([a-zA-Z0-9_-]{11})',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    
    return None


def parse_timestamp_to_seconds(timestamp):
    """Convert timestamp to seconds"""
    parts = timestamp.split(':')
    if len(parts) == 3:
        hours = float(parts[0])
        minutes = float(parts[1])
        seconds = float(parts[2])
        return hours * 3600 + minutes * 60 + seconds
    elif len(parts) == 2:
        minutes = float(parts[0])
        seconds = float(parts[1])
        return minutes * 60 + seconds
    return float(parts[0])


def parse_vtt(content):
    """Parse WebVTT content to segments"""
    segments = []
    lines = content.split('\n')
    
    current_start = 0
    current_end = 0
    current_text = ''
    
    for line in lines:
        stripped = line.strip()
        
        if not stripped or stripped == 'WEBVTT' or stripped.startswith('NOTE'):
            continue
        
        # Check for timestamp line
        timestamp_match = re.match(r'(\d{2}:\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}\.\d{3})', stripped)
        
        if timestamp_match:
            # Save previous cue if exists
            if current_text and (not segments or current_text != segments[-1]['text']):
                segments.append({
                    'text': current_text.strip(),
                    'start': current_start,
                    'duration': current_end - current_start
                })
            
            current_start = parse_timestamp_to_seconds(timestamp_match.group(1))
            current_end = parse_timestamp_to_seconds(timestamp_match.group(2))
            current_text = ''
        elif stripped:
            # Caption text - remove HTML tags
            text = re.sub(r'<[^>]+>', '', stripped)
            if current_text:
                current_text += ' '
            current_text += text
    
    # Don't forget the last cue
    if current_text and (not segments or current_text != segments[-1]['text']):
        segments.append({
            'text': current_text.strip(),
            'start': current_start,
            'duration': current_end - current_start
        })
    
    return segments


def get_best_caption_track(subtitles, automatic_captions):
    """Get best caption track based on priority"""
    subtitle_priorities = ['en-US', 'en-CA', 'en']
    auto_caption_priorities = ['en-orig', 'en-US', 'en-CA', 'en']
    format_priorities = ['vtt', 'srt', 'ttml']
    
    caption_track = None
    
    # Check manual subtitles first
    if subtitles:
        for lang in subtitle_priorities:
            if lang in subtitles and subtitles[lang]:
                caption_track = subtitles[lang]
                break
        
        # Try any en-* variant
        if not caption_track:
            for lang in subtitles.keys():
                if lang.startswith('en-'):
                    caption_track = subtitles[lang]
                    break
    
    # Check automatic captions
    if not caption_track and automatic_captions:
        for lang in auto_caption_priorities:
            if lang in automatic_captions and automatic_captions[lang]:
                caption_track = automatic_captions[lang]
                break
    
    if not caption_track:
        return None
    
    # Find preferred format
    for fmt in format_priorities:
        for track in caption_track:
            if track.get('protocol') == 'm3u8_native':
                continue
            if track.get('ext') == fmt:
                return {
                    'ext': track['ext'],
                    'url': track['url'],
                    'name': track.get('name', 'Unknown')
                }
    
    # Return first compatible track
    for track in caption_track:
        if track.get('protocol') != 'm3u8_native':
            return {
                'ext': track['ext'],
                'url': track['url'],
                'name': track.get('name', 'Unknown')
            }
    
    return None


def fetch_transcript(video_id):
    """Fetch transcript using yt-dlp"""
    if not YT_DLP_AVAILABLE:
        raise Exception("yt_dlp module is not available")
    
    proxy_url = get_proxy_url()
    video_url = f'https://www.youtube.com/watch?v={video_id}'
    
    print(f'[yt-dlp] Fetching transcript for {video_id}', file=sys.stderr)
    
    # yt-dlp options
    ydl_opts = {
        'writesubtitles': True,
        'writeautomaticsub': True,
        'subtitleslangs': ['en', 'en-US', 'en-CA'],
        'skip_download': True,
        'quiet': True,
        'no_warnings': True,
    }
    
    if proxy_url:
        ydl_opts['proxy'] = proxy_url
        print(f'[yt-dlp] Using proxy', file=sys.stderr)
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
        
        if not info.get('subtitles') and not info.get('automatic_captions'):
            raise Exception('No captions available for this video')
        
        # Get best caption track
        track = get_best_caption_track(info.get('subtitles', {}), info.get('automatic_captions', {}))
        
        if not track:
            raise Exception('No compatible caption track found')
        
        print(f'[yt-dlp] Using caption track: {track["name"]} ({track["ext"]})', file=sys.stderr)
        
        # Download caption content
        try:
            from urllib.request import Request, urlopen
            req = Request(track['url'])
            req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
            
            with urlopen(req, timeout=30) as response:
                content = response.read().decode('utf-8')
        except Exception as e:
            print(f'[yt-dlp] Failed to download captions: {e}', file=sys.stderr)
            raise Exception(f'Failed to download captions: {e}')
        
        # Parse VTT
        segments = parse_vtt(content)
        
        if not segments:
            raise Exception('No transcript segments found')
        
        print(f'[yt-dlp] Successfully parsed {len(segments)} segments', file=sys.stderr)
        
        return {
            'segments': segments,
            'language': 'en',
            'title': info.get('title'),
            'duration': info.get('duration')
        }
        
    except Exception as e:
        print(f'[yt-dlp] Error: {e}', file=sys.stderr)
        error_msg = str(e)
        
        if 'Video unavailable' in error_msg:
            raise Exception('This video is unavailable or private')
        if 'Sign in to confirm' in error_msg:
            raise Exception('YOUTUBE_BOT_DETECTED: YouTube requires verification. Try using a residential proxy.')
        if 'age-restricted' in error_msg:
            raise Exception('This video is age-restricted')
        
        raise


class handler:
    """Vercel serverless function handler"""
    
    def __init__(self):
        pass
    
    def __call__(self, environ, start_response):
        """WSGI entry point"""
        try:
            from urllib.parse import parse_qs
            
            # Get query string
            query_string = environ.get('QUERY_STRING', '')
            query_params = parse_qs(query_string)
            
            # Get path
            path = environ.get('PATH_INFO', '')
            
            # Handle CORS preflight
            if environ.get('REQUEST_METHOD') == 'OPTIONS':
                status = '200 OK'
                headers = [
                    ('Content-Type', 'application/json'),
                    ('Access-Control-Allow-Origin', '*'),
                    ('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'),
                    ('Access-Control-Allow-Headers', 'Content-Type'),
                ]
                start_response(status, headers)
                return [json.dumps({'success': True}).encode()]
            
            # Only handle GET
            if environ.get('REQUEST_METHOD') != 'GET':
                status = '405 Method Not Allowed'
                headers = [('Content-Type', 'application/json')]
                start_response(status, headers)
                return [json.dumps({'success': False, 'error': 'Method not allowed'}).encode()]
            
            # Health check endpoint
            if query_params.get('status', [''])[0] == 'true':
                response = {
                    'success': True,
                    'proxy': get_proxy_status(),
                    'method': 'yt-dlp-python',
                    'yt_dlp_installed': YT_DLP_AVAILABLE,
                    'message': 'Using yt-dlp Python API'
                }
                status = '200 OK'
                headers = [
                    ('Content-Type', 'application/json'),
                    ('Access-Control-Allow-Origin', '*'),
                ]
                start_response(status, headers)
                return [json.dumps(response).encode()]
            
            # Get video ID
            video_id = query_params.get('videoId', [''])[0]
            url = query_params.get('url', [''])[0]
            
            if not video_id and url:
                video_id = extract_video_id(url)
            
            if not video_id:
                status = '400 Bad Request'
                headers = [('Content-Type', 'application/json')]
                start_response(status, headers)
                return [json.dumps({'success': False, 'error': 'Missing or invalid videoId'}).encode()]
            
            # Check if yt-dlp is available
            if not YT_DLP_AVAILABLE:
                status = '500 Internal Server Error'
                headers = [('Content-Type', 'application/json')]
                start_response(status, headers)
                return [json.dumps({'success': False, 'error': 'yt-dlp is not installed'}).encode()]
            
            # Fetch transcript
            result = fetch_transcript(video_id)
            
            response = {
                'success': True,
                'videoId': video_id,
                'language': result['language'],
                'segments': result['segments'],
                'method': 'yt-dlp-python',
                'title': result.get('title'),
                'duration': result.get('duration')
            }
            
            status = '200 OK'
            headers = [
                ('Content-Type', 'application/json'),
                ('Access-Control-Allow-Origin', '*'),
            ]
            start_response(status, headers)
            return [json.dumps(response).encode()]
            
        except Exception as e:
            print(f'[yt-dlp API] Error: {e}', file=sys.stderr)
            error_message = str(e)
            
            if 'YOUTUBE_BOT_DETECTED' in error_message:
                status = '503 Service Unavailable'
                response = {
                    'success': False,
                    'error': 'YouTube bot detection triggered',
                    'code': 'YOUTUBE_BOT_DETECTED',
                    'message': 'Configure DECODO_PROXY_URL in Vercel'
                }
            elif 'No captions' in error_message or 'No compatible' in error_message:
                status = '404 Not Found'
                response = {
                    'success': False,
                    'error': error_message,
                    'code': 'NO_CAPTIONS'
                }
            else:
                status = '500 Internal Server Error'
                response = {
                    'success': False,
                    'error': error_message
                }
            
            headers = [
                ('Content-Type', 'application/json'),
                ('Access-Control-Allow-Origin', '*'),
            ]
            start_response(status, headers)
            return [json.dumps(response).encode()]


# Create handler instance
app = handler()
