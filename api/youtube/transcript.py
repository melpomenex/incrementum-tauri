"""
Vercel Serverless Function for fetching YouTube transcripts using yt-dlp
"""
import os
import sys
import json
import re
from http.server import BaseHTTPRequestHandler

# Log startup
print(f"[yt-dlp API] Python version: {sys.version}", file=sys.stderr)

# Try to import yt-dlp
try:
    import yt_dlp
    YT_DLP_AVAILABLE = True
    print(f"[yt-dlp API] yt-dlp version: {yt_dlp.version.__version__}", file=sys.stderr)
except ImportError as e:
    print(f"[yt-dlp API] ERROR: Failed to import yt_dlp: {e}", file=sys.stderr)
    YT_DLP_AVAILABLE = False


def get_proxy_url():
    return os.environ.get('DECODO_PROXY_URL') or os.environ.get('RESIDENTIAL_PROXY_URL')


def extract_video_id(url):
    patterns = [
        r'(?:youtube\.com/watch\?v=|youtu\.be/)([a-zA-Z0-9_-]{11})',
        r'youtube\.com/embed/([a-zA-Z0-9_-]{11})',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def parse_timestamp(ts):
    parts = ts.split(':')
    if len(parts) == 3:
        return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
    return float(parts[0]) * 60 + float(parts[1])


def parse_vtt(content):
    segments = []
    cur_start, cur_end, cur_text = 0, 0, ''
    
    for line in content.split('\n'):
        line = line.strip()
        if not line or line == 'WEBVTT' or line.startswith('NOTE'):
            continue
        
        match = re.match(r'(\d{2}:\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}\.\d{3})', line)
        if match:
            if cur_text:
                segments.append({'text': cur_text.strip(), 'start': cur_start, 'duration': cur_end - cur_start})
            cur_start = parse_timestamp(match.group(1))
            cur_end = parse_timestamp(match.group(2))
            cur_text = ''
        elif line:
            txt = re.sub(r'<[^>]+>', '', line)
            cur_text += ' ' + txt if cur_text else txt
    
    if cur_text:
        segments.append({'text': cur_text.strip(), 'start': cur_start, 'duration': cur_end - cur_start})
    
    return segments


def fetch_transcript(video_id):
    if not YT_DLP_AVAILABLE:
        raise Exception("yt_dlp is not installed")
    
    proxy = get_proxy_url()
    ydl_opts = {
        'writesubtitles': True,
        'writeautomaticsub': True,
        'subtitleslangs': ['en'],
        'skip_download': True,
        'quiet': True,
    }
    if proxy:
        ydl_opts['proxy'] = proxy
    
    video_url = f'https://www.youtube.com/watch?v={video_id}'
    print(f"[yt-dlp] Extracting: {video_id}", file=sys.stderr)
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(video_url, download=False)
    
    # Find captions
    subtitles = info.get('subtitles', {})
    auto_caps = info.get('automatic_captions', {})
    
    track_list = None
    for lang in ['en-US', 'en-CA', 'en']:
        if lang in subtitles and subtitles[lang]:
            track_list = subtitles[lang]
            break
    if not track_list:
        for lang in ['en-orig', 'en-US', 'en-CA', 'en']:
            if lang in auto_caps and auto_caps[lang]:
                track_list = auto_caps[lang]
                break
    
    if not track_list:
        raise Exception('No captions available')
    
    # Get VTT track
    track = next((t for t in track_list if t.get('ext') == 'vtt'), track_list[0])
    
    # Download
    from urllib.request import Request, urlopen
    req = Request(track['url'])
    req.add_header('User-Agent', 'Mozilla/5.0')
    with urlopen(req, timeout=30) as resp:
        content = resp.read().decode('utf-8')
    
    segments = parse_vtt(content)
    print(f"[yt-dlp] Parsed {len(segments)} segments", file=sys.stderr)
    
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
        
        # Health check
        if query.get('status', [''])[0] == 'true':
            self.send_json(200, {
                'success': True,
                'proxy_configured': bool(get_proxy_url()),
                'yt_dlp_installed': YT_DLP_AVAILABLE
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
            result = fetch_transcript(video_id)
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
                    'error': 'YouTube bot detection',
                    'code': 'YOUTUBE_BOT_DETECTED'
                })
            elif 'No captions' in error:
                self.send_json(404, {'success': False, 'error': error, 'code': 'NO_CAPTIONS'})
            else:
                self.send_json(500, {'success': False, 'error': error})
