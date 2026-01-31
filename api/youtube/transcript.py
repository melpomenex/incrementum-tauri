"""
Vercel Serverless Function for fetching YouTube transcripts using yt-dlp
Python version for better reliability on Vercel

RESIDENTIAL PROXY CONFIGURATION:
Set DECODO_PROXY_URL or RESIDENTIAL_PROXY_URL environment variable
"""

import os
import json
import re
from urllib.parse import urlparse, parse_qs
from http.server import BaseHTTPRequestHandler
from typing import Optional, Dict, List, Any
import subprocess
import tempfile

# Try to import yt-dlp, fallback to pip install if not available
try:
    import yt_dlp
except ImportError:
    # yt-dlp will be installed via requirements.txt
    yt_dlp = None


def get_proxy_url() -> Optional[str]:
    """Get proxy URL from environment variables"""
    return os.environ.get('DECODO_PROXY_URL') or os.environ.get('RESIDENTIAL_PROXY_URL')


def get_proxy_status() -> Dict[str, Any]:
    """Get proxy status (masks credentials)"""
    proxy_url = get_proxy_url()
    if not proxy_url:
        return {"configured": False, "url": None}
    
    # Mask credentials in URL
    try:
        parsed = urlparse(proxy_url)
        if parsed.username and parsed.password:
            masked = f"{parsed.scheme}://***:***@{parsed.hostname}:{parsed.port}"
            return {"configured": True, "url": masked}
    except:
        pass
    
    return {"configured": True, "url": "configured"}


def extract_video_id(url: str) -> Optional[str]:
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


def parse_timestamp_to_seconds(timestamp: str) -> float:
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


def parse_vtt(content: str) -> List[Dict[str, Any]]:
    """Parse WebVTT content to segments"""
    segments = []
    lines = content.split('\n')
    
    current_start = 0
    current_end = 0
    current_text = ''
    in_cue = False
    
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
            in_cue = True
        elif in_cue and stripped:
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


def parse_srt(content: str) -> List[Dict[str, Any]]:
    """Parse SRT content to segments"""
    segments = []
    blocks = content.split('\n\n')
    
    for block in blocks:
        lines = block.strip().split('\n')
        if len(lines) < 3:
            continue
        
        timestamp_line = lines[1]
        match = re.match(r'(\d{2}:\d{2}:\d{2},\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2},\d{3})', timestamp_line)
        
        if not match:
            continue
        
        start = parse_timestamp_to_seconds(match.group(1).replace(',', '.'))
        end = parse_timestamp_to_seconds(match.group(2).replace(',', '.'))
        text = ' '.join(lines[2:])
        text = re.sub(r'<[^>]+>', '', text).strip()
        
        if text:
            segments.append({
                'text': text,
                'start': start,
                'duration': end - start
            })
    
    return segments


def get_best_caption_track(subtitles: Dict, automatic_captions: Dict) -> Optional[Dict]:
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


def fetch_transcript_with_ytdlp(video_id: str) -> Dict[str, Any]:
    """Fetch transcript using yt-dlp"""
    proxy_url = get_proxy_url()
    video_url = f'https://www.youtube.com/watch?v={video_id}'
    
    print(f'[yt-dlp] Fetching transcript for {video_id}{" (with proxy)" if proxy_url else ""}')
    
    # yt-dlp options
    ydl_opts = {
        'writesubtitles': True,
        'writeautomaticsub': True,
        'subtitleslangs': ['en', 'en-US', 'en-CA', 'en-GB'],
        'skip_download': True,
        'quiet': True,
        'no_warnings': True,
    }
    
    if proxy_url:
        ydl_opts['proxy'] = proxy_url
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
        
        if not info.get('subtitles') and not info.get('automatic_captions'):
            raise Exception('No captions available for this video')
        
        # Get best caption track
        track = get_best_caption_track(info.get('subtitles', {}), info.get('automatic_captions', {}))
        
        if not track:
            raise Exception('No compatible caption track found')
        
        print(f'[yt-dlp] Using caption track: {track["name"]} ({track["ext"]})')
        
        # Download caption content
        import urllib.request
        
        req = urllib.request.Request(track['url'])
        req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.0.36')
        
        with urllib.request.urlopen(req, timeout=30) as response:
            content = response.read().decode('utf-8')
        
        # Parse based on format
        if track['ext'] in ['vtt', 'webvtt']:
            segments = parse_vtt(content)
        elif track['ext'] == 'srt':
            segments = parse_srt(content)
        else:
            # Try VTT first, then SRT
            try:
                segments = parse_vtt(content)
            except:
                segments = parse_srt(content)
        
        if not segments:
            raise Exception('No transcript segments found')
        
        print(f'[yt-dlp] Successfully parsed {len(segments)} segments')
        
        return {
            'segments': segments,
            'language': 'en',
            'title': info.get('title'),
            'duration': info.get('duration')
        }
        
    except Exception as e:
        print(f'[yt-dlp] Error: {e}')
        error_msg = str(e)
        
        if 'Video unavailable' in error_msg:
            raise Exception('This video is unavailable or private')
        if 'Sign in to confirm' in error_msg:
            raise Exception('YOUTUBE_BOT_DETECTED: YouTube requires verification. Try using a residential proxy.')
        if 'age-restricted' in error_msg:
            raise Exception('This video is age-restricted')
        
        raise


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        # Enable CORS
        self.send_header('Access-Control-Allow-Origin', '*')
        
        parsed_path = urlparse(self.path)
        query_params = parse_qs(parsed_path.query)
        
        # Health check endpoint
        if query_params.get('status', [''])[0] == 'true':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            response = {
                'success': True,
                'proxy': get_proxy_status(),
                'method': 'yt-dlp-python',
                'message': 'Using yt-dlp Python API' + (' with proxy' if get_proxy_url() else ' without proxy')
            }
            self.wfile.write(json.dumps(response).encode())
            return
        
        # Get video ID from query params
        video_id = query_params.get('videoId', [''])[0]
        url = query_params.get('url', [''])[0]
        
        if not video_id and url:
            video_id = extract_video_id(url)
        
        if not video_id:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'success': False,
                'error': 'Missing or invalid videoId or url parameter'
            }).encode())
            return
        
        try:
            result = fetch_transcript_with_ytdlp(video_id)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            response = {
                'success': True,
                'videoId': video_id,
                'language': result['language'],
                'segments': result['segments'],
                'method': 'yt-dlp-python',
                'title': result.get('title'),
                'duration': result.get('duration')
            }
            self.wfile.write(json.dumps(response).encode())
            
        except Exception as e:
            print(f'Transcript fetch error: {e}')
            error_message = str(e)
            
            # Determine appropriate status code and error response
            if 'YOUTUBE_BOT_DETECTED' in error_message:
                self.send_response(503)
                response = {
                    'success': False,
                    'error': 'YouTube has detected automated access and is requiring verification.',
                    'code': 'YOUTUBE_BOT_DETECTED',
                    'message': 'Please configure a residential proxy (DECODO_PROXY_URL) in Vercel environment variables.'
                }
            elif 'No captions available' in error_message or 'No compatible caption' in error_message:
                self.send_response(404)
                response = {
                    'success': False,
                    'error': error_message,
                    'code': 'NO_CAPTIONS'
                }
            elif 'unavailable' in error_message or 'private' in error_message:
                self.send_response(404)
                response = {
                    'success': False,
                    'error': error_message,
                    'code': 'VIDEO_UNAVAILABLE'
                }
            elif 'age-restricted' in error_message:
                self.send_response(403)
                response = {
                    'success': False,
                    'error': error_message,
                    'code': 'AGE_RESTRICTED'
                }
            else:
                self.send_response(500)
                response = {
                    'success': False,
                    'error': error_message
                }
            
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())
