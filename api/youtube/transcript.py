"""
Vercel Serverless Function for fetching YouTube transcripts using yt-dlp
"""
import os
import sys
import json
import re
from http.server import BaseHTTPRequestHandler

# Debug: Log all environment variables
print(f"[yt-dlp DEBUG] Python version: {sys.version}", file=sys.stderr)
print(f"[yt-dlp DEBUG] All env vars: {dict(os.environ)}", file=sys.stderr)

# Try to import yt-dlp
try:
    import yt_dlp
    YT_DLP_AVAILABLE = True
    print(f"[yt-dlp] yt-dlp version: {yt_dlp.version.__version__}", file=sys.stderr)
except ImportError as e:
    print(f"[yt-dlp] ERROR: Failed to import yt_dlp: {e}", file=sys.stderr)
    YT_DLP_AVAILABLE = False


def get_proxy_url():
    """Get proxy URL from environment variables"""
    # Check both possible variable names
    decodo = os.environ.get('DECODO_PROXY_URL')
    residential = os.environ.get('RESIDENTIAL_PROXY_URL')
    
    print(f"[yt-dlp DEBUG] DECODO_PROXY_URL: {'SET' if decodo else 'NOT SET'}", file=sys.stderr)
    print(f"[yt-dlp DEBUG] RESIDENTIAL_PROXY_URL: {'SET' if residential else 'NOT SET'}", file=sys.stderr)
    
    return decodo or residential


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


def parse_timestamp(ts):
    """Convert timestamp to seconds (supports HH:MM:SS.mmm or MM:SS.mmm)"""
    parts = ts.split(':')
    if len(parts) == 3:
        return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
    return float(parts[0]) * 60 + float(parts[1])


def _parse_vtt_timestamp(hh, mm, ss_ms):
    hours = int(hh) if hh is not None else 0
    return hours * 3600 + int(mm) * 60 + float(ss_ms)


def parse_vtt(content):
    """Parse WebVTT content to segments"""
    segments = []
    cur_start, cur_end, cur_text = 0, 0, ''
    
    for line in content.split('\n'):
        line = line.strip()
        if not line or line == 'WEBVTT' or line.startswith('NOTE'):
            continue
        
        match = re.match(r'(?:(\d{2}):)?(\d{2}):(\d{2}\.\d{3})\s+-->\s+(?:(\d{2}):)?(\d{2}):(\d{2}\.\d{3})', line)
        if match:
            if cur_text and (not segments or cur_text != segments[-1]['text']):
                segments.append({
                    'text': cur_text.strip(),
                    'start': cur_start,
                    'duration': cur_end - cur_start
                })

            cur_start = _parse_vtt_timestamp(match.group(1), match.group(2), match.group(3))
            cur_end = _parse_vtt_timestamp(match.group(4), match.group(5), match.group(6))
            cur_text = ''
        elif line:
            txt = re.sub(r'<[^>]+>', '', line)
            cur_text += ' ' + txt if cur_text else txt
    
    if cur_text and (not segments or cur_text != segments[-1]['text']):
        segments.append({
            'text': cur_text.strip(),
            'start': cur_start,
            'duration': cur_end - cur_start
        })
    
    return segments


def _format_cookie_header(cookies):
    """Format cookies for Cookie header"""
    if not cookies:
        env_cookie = os.environ.get('YOUTUBE_COOKIES') or os.environ.get('YOUTUBE_COOKIE')
        if env_cookie:
            cookies = env_cookie
    if not cookies:
        return None
    if isinstance(cookies, str):
        return ' '.join(cookies.split())
    if isinstance(cookies, dict):
        return '; '.join(f"{k}={v}" for k, v in cookies.items())
    if isinstance(cookies, list):
        parts = []
        for c in cookies:
            if isinstance(c, dict) and c.get('name') and c.get('value') is not None:
                parts.append(f"{c['name']}={c['value']}")
        return '; '.join(parts) if parts else None
    return None


def fetch_transcript_direct(video_id, proxy=None, cookies_header=None):
    """Fetch transcript directly from YouTube's timedtext API (lighter than yt-dlp)"""
    from urllib.request import Request, urlopen, ProxyHandler, build_opener
    from urllib.error import HTTPError
    import html
    
    # Try to get the video page to extract caption tracks
    video_url = f'https://www.youtube.com/watch?v={video_id}'
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
    }
    if cookies_header:
        headers['Cookie'] = cookies_header
    
    req = Request(video_url, headers=headers)
    
    try:
        if proxy:
            proxy_handler = ProxyHandler({'http': proxy, 'https': proxy})
            opener = build_opener(proxy_handler)
            response = opener.open(req, timeout=20)
        else:
            response = urlopen(req, timeout=10)
        
        html_content = response.read().decode('utf-8')
    except HTTPError as e:
        if e.code == 429:
            raise Exception('Rate limited by YouTube')
        raise
    
    # Check for bot detection / consent
    if 'Sign in to confirm' in html_content:
        raise Exception('Sign in to confirm you\'re not a bot')
    if 'consent.youtube.com' in html_content or 'Before you continue to YouTube' in html_content:
        raise Exception('YouTube consent required')
    
    # Extract caption tracks from ytInitialPlayerResponse
    import re
    match = re.search(r'ytInitialPlayerResponse\s*=\s*({.+?});', html_content)
    if not match:
        raise Exception('Could not find player response')
    
    player_response = json.loads(match.group(1))
    caption_tracks = player_response.get('captions', {}).get('captionTracks', [])
    
    if not caption_tracks:
        raise Exception('No captions available')
    
    # Find English track
    track = None
    for t in caption_tracks:
        lang = t.get('languageCode', '')
        if lang.startswith('en'):
            track = t
            break
    
    if not track:
        track = caption_tracks[0]  # Use first available
    
    # Fetch transcript XML
    base_url = track['baseUrl']
    transcript_url = base_url + '&fmt=json3'  # Get JSON format
    
    req = Request(transcript_url, headers=headers)
    if proxy:
        response = opener.open(req, timeout=20)
    else:
        response = urlopen(req, timeout=10)
    
    data = json.loads(response.read().decode('utf-8'))
    
    # Parse segments
    segments = []
    for event in data.get('events', []):
        if 'segs' not in event:
            continue
        
        start = event.get('tStartMs', 0) / 1000.0
        duration = event.get('dDurationMs', 0) / 1000.0
        
        text = ''.join(seg.get('utf8', '') for seg in event['segs'])
        text = html.unescape(text).strip()
        
        if text:
            segments.append({
                'text': text,
                'start': start,
                'duration': duration
            })
    
    if not segments:
        raise Exception('No transcript segments found')

    return {
        'segments': segments,
        'language': track.get('languageCode', 'en'),
        'title': player_response.get('videoDetails', {}).get('title'),
        'duration': player_response.get('videoDetails', {}).get('lengthSeconds')
    }


def fetch_transcript(video_id, cookies_header=None):
    """Fetch transcript using multiple methods"""
    proxy = get_proxy_url()
    
    # Method 1: Direct API (fastest)
    print(f"[yt-dlp] Method 1: Direct API (no proxy)", file=sys.stderr)
    try:
        return fetch_transcript_direct(video_id, proxy=None, cookies_header=cookies_header)
    except Exception as e:
        error = str(e)
        print(f"[yt-dlp] Method 1 failed: {error[:80]}", file=sys.stderr)
        
        # If blocked and proxy available, try with proxy
        if 'bot' in error.lower() and proxy:
            print(f"[yt-dlp] Method 2: Direct API with proxy", file=sys.stderr)
            try:
                return fetch_transcript_direct(video_id, proxy=proxy, cookies_header=cookies_header)
            except Exception as e2:
                print(f"[yt-dlp] Method 2 failed: {str(e2)[:80]}", file=sys.stderr)
    
    # Method 3: yt-dlp with proxy (last resort)
    if YT_DLP_AVAILABLE and proxy:
        print(f"[yt-dlp] Method 3: yt-dlp with proxy", file=sys.stderr)
        ydl_opts = {
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['en'],
            'subtitlesformat': 'vtt/srt/ttml',
            'skip_download': True,
            'quiet': True,
            'no_warnings': True,
            'no_playlist': True,
            'ignore_no_formats_error': True,
            'proxy': proxy,
            'socket_timeout': 25,
        }
        if cookies_header:
            ydl_opts['http_headers'] = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Cookie': cookies_header,
            }
        
        video_url = f'https://www.youtube.com/watch?v={video_id}'
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
        
        # ... (rest of yt-dlp processing)
        subtitles = info.get('subtitles', {})
        auto_captions = info.get('automatic_captions', {})
        
        track_list = None
        for lang in ['en-US', 'en-GB', 'en-CA', 'en-AU', 'en']:
            if lang in subtitles and subtitles[lang]:
                track_list = subtitles[lang]
                break
        if not track_list:
            for lang in ['en-orig', 'en-US', 'en-GB', 'en-CA', 'en-AU', 'en']:
                if lang in auto_captions and auto_captions[lang]:
                    track_list = auto_captions[lang]
                    break
        
        if not track_list:
            raise Exception('No captions available')
        
        track = next((t for t in track_list if t.get('ext') == 'vtt'), track_list[0])
        
        from urllib.request import Request, urlopen, ProxyHandler, build_opener
        req = Request(track['url'])
        req.add_header('User-Agent', 'Mozilla/5.0')
        if cookies_header:
            req.add_header('Cookie', cookies_header)
        if proxy:
            proxy_handler = ProxyHandler({'http': proxy, 'https': proxy})
            opener = build_opener(proxy_handler)
            with opener.open(req, timeout=30) as resp:
                content = resp.read().decode('utf-8')
        else:
            with urlopen(req, timeout=30) as resp:
                content = resp.read().decode('utf-8')
        
        segments = parse_vtt(content)
        
        return {
            'segments': segments,
            'language': 'en',
            'title': info.get('title'),
            'duration': info.get('duration')
        }
    
    raise Exception("All methods failed")
    
    # Find captions - check all available languages
    subtitles = info.get('subtitles', {})
    auto_captions = info.get('automatic_captions', {})
    
    print(f"[yt-dlp] Available subtitles: {list(subtitles.keys())}", file=sys.stderr)
    print(f"[yt-dlp] Available auto captions: {list(auto_captions.keys())}", file=sys.stderr)
    
    track_list = None
    track_source = None
    
    # Try manual subtitles first (higher quality)
    for lang in ['en-US', 'en-GB', 'en-CA', 'en-AU', 'en']:
        if lang in subtitles and subtitles[lang]:
            track_list = subtitles[lang]
            track_source = f"subtitles.{lang}"
            break
    
    # Fall back to auto-generated captions
    if not track_list:
        for lang in ['en-orig', 'en-US', 'en-GB', 'en-CA', 'en-AU', 'en']:
            if lang in auto_captions and auto_captions[lang]:
                track_list = auto_captions[lang]
                track_source = f"auto_captions.{lang}"
                break
    
    # Last resort: try any English variant
    if not track_list:
        for key in list(subtitles.keys()) + list(auto_captions.keys()):
            if key.startswith('en'):
                track_list = subtitles.get(key) or auto_captions.get(key)
                track_source = key
                break
    
    if not track_list:
        raise Exception(f'No captions available. Subtitles: {list(subtitles.keys())}, Auto: {list(auto_captions.keys())}')
    
    print(f"[yt-dlp] Using captions from: {track_source}", file=sys.stderr)
    
    # Get VTT track
    track = next((t for t in track_list if t.get('ext') == 'vtt'), track_list[0])
    
    # Download captions
    from urllib.request import Request, urlopen
    req = Request(track['url'])
    req.add_header('User-Agent', 'Mozilla/5.0')
    with urlopen(req, timeout=30) as resp:
        content = resp.read().decode('utf-8')
    
    segments = parse_vtt(content)
    print(f"[yt-dlp] Successfully parsed {len(segments)} segments", file=sys.stderr)
    
    return {
        'segments': segments,
        'language': 'en',
        'title': info.get('title'),
        'duration': info.get('duration')
    }


class handler(BaseHTTPRequestHandler):
    """Vercel Python serverless function handler"""
    
    def log_message(self, format, *args):
        print(f"[API] {format % args}", file=sys.stderr)
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def send_json(self, status, data):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def do_GET(self):
        from urllib.parse import urlparse, parse_qs
        
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)
        
        self._handle_request(query, None)
    
    def do_POST(self):
        from urllib.parse import urlparse, parse_qs

        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)

        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length > 0 else b''
        cookies = None
        if body:
            try:
                payload = json.loads(body.decode('utf-8'))
                cookies = payload.get('cookies') or payload.get('cookie')
            except Exception as e:
                print(f"[API] Failed to parse JSON body: {e}", file=sys.stderr)

        self._handle_request(query, cookies)

    def _handle_request(self, query, cookies):
        # Health check
        if query.get('status', [''])[0] == 'true':
            proxy = get_proxy_url()
            cookies_header = _format_cookie_header(cookies)
            self.send_json(200, {
                'success': True,
                'proxy_configured': bool(proxy),
                'proxy_preview': proxy[:30] + '...' if proxy else None,
                'yt_dlp_installed': YT_DLP_AVAILABLE,
                'cookies_received': bool(cookies_header)
            })
            return
        
        # Check yt-dlp
        if not YT_DLP_AVAILABLE:
            self.send_json(500, {'success': False, 'error': 'yt-dlp not installed'})
            return
        
        # Get video ID
        video_id = query.get('videoId', [''])[0]
        url = query.get('url', [''])[0]
        
        if not video_id and url:
            video_id = extract_video_id(url)
        
        if not video_id:
            self.send_json(400, {'success': False, 'error': 'Missing videoId'})
            return
        
        # Fetch transcript
        try:
            cookies_header = _format_cookie_header(cookies)
            result = fetch_transcript(video_id, cookies_header=cookies_header)
            self.send_json(200, {
                'success': True,
                'videoId': video_id,
                'segments': result['segments'],
                'language': result['language'],
                'title': result.get('title'),
                'duration': result.get('duration')
            })
        except Exception as e:
            print(f"[yt-dlp] Error: {e}", file=sys.stderr)
            error = str(e)
            
            if 'Sign in to confirm' in error:
                self.send_json(503, {
                    'success': False,
                    'error': 'YouTube bot detection - proxy may not be working',
                    'code': 'YOUTUBE_BOT_DETECTED',
                    'proxy_was_configured': bool(get_proxy_url())
                })
            elif 'consent' in error.lower():
                self.send_json(503, {
                    'success': False,
                    'error': 'YouTube requires consent; cookies are needed',
                    'code': 'YOUTUBE_CONSENT_REQUIRED',
                    'proxy_was_configured': bool(get_proxy_url())
                })
            elif 'No captions' in error:
                self.send_json(404, {'success': False, 'error': error, 'code': 'NO_CAPTIONS'})
            else:
                self.send_json(500, {'success': False, 'error': error})
