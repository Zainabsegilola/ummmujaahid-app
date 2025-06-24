# youtube-api/app.py - IMPROVED VERSION
from flask import Flask, jsonify, request
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import WebshareProxyConfig
from flask_cors import CORS
import logging
import re
import requests
import time
from urllib.parse import urlparse, parse_qs

app = Flask(__name__)
CORS(app)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add proxy support if needed (uncomment and configure if you have proxy)
# PROXY_CONFIG = WebshareProxyConfig(
#     proxy_username="your_proxy_username",
#     proxy_password="your_proxy_password"
# )

def validate_video_id(video_id):
    """Validate YouTube video ID format"""
    pattern = r'^[a-zA-Z0-9_-]{11}$'
    return re.match(pattern, video_id) is not None

def extract_video_id(url_or_id):
    """Extract video ID from URL or return if already an ID"""
    if validate_video_id(url_or_id):
        return url_or_id
    
    # Extract from various YouTube URL formats
    patterns = [
        r'(?:v=|\/)([0-9A-Za-z_-]{11}).*',
        r'(?:embed\/)([0-9A-Za-z_-]{11})',
        r'(?:watch\?v=)([0-9A-Za-z_-]{11})',
        r'(?:youtu\.be\/)([0-9A-Za-z_-]{11})'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url_or_id)
        if match:
            return match.group(1)
    
    return None

def get_transcript_with_fallbacks(video_id):
    """Try multiple methods to get transcript"""
    logger.info(f"Attempting transcript retrieval for {video_id}")
    
    # Method 1: Try with proxy if configured
    try:
        # Uncomment if you have proxy configured
        # ytt_api = YouTubeTranscriptApi(proxy_config=PROXY_CONFIG)
        # transcript = ytt_api.get_transcript(video_id, languages=['ar', 'en'])
        
        # Method 1a: Try Arabic first
        try:
            transcript = YouTubeTranscriptApi.get_transcript(
                video_id, 
                languages=['ar', 'ar-SA', 'ar-EG', 'ar-AE']
            )
            logger.info("✅ Arabic transcript found")
            return transcript, 'ar'
        except Exception as e:
            logger.info(f"Arabic transcript failed: {e}")
        
        # Method 1b: Try English
        try:
            transcript = YouTubeTranscriptApi.get_transcript(
                video_id, 
                languages=['en', 'en-US', 'en-GB', 'en-CA']
            )
            logger.info("✅ English transcript found")
            return transcript, 'en'
        except Exception as e:
            logger.info(f"English transcript failed: {e}")
        
        # Method 1c: Try auto-generated
        try:
            transcript = YouTubeTranscriptApi.get_transcript(video_id)
            logger.info("✅ Auto-generated transcript found")
            return transcript, 'auto'
        except Exception as e:
            logger.info(f"Auto-generated transcript failed: {e}")
            
    except Exception as e:
        logger.error(f"Primary method failed: {e}")
    
    # Method 2: Try manual API approach
    try:
        logger.info("Trying manual API approach...")
        transcript = fetch_via_manual_api(video_id)
        if transcript:
            return transcript, 'manual'
    except Exception as e:
        logger.info(f"Manual API failed: {e}")
    
    # Method 3: Try alternative scraping
    try:
        logger.info("Trying alternative scraping...")
        transcript = fetch_via_scraping(video_id)
        if transcript:
            return transcript, 'scraped'
    except Exception as e:
        logger.info(f"Scraping failed: {e}")
    
    raise Exception("All methods failed")

def fetch_via_manual_api(video_id):
    """Manual API fetching with different user agents"""
    headers_list = [
        {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        },
        {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        },
        {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        }
    ]
    
    for headers in headers_list:
        try:
            # Try timedtext API
            urls_to_try = [
                f'https://www.youtube.com/api/timedtext?lang=en&v={video_id}',
                f'https://www.youtube.com/api/timedtext?lang=ar&v={video_id}',
                f'https://video.google.com/timedtext?lang=en&v={video_id}',
            ]
            
            for url in urls_to_try:
                response = requests.get(url, headers=headers, timeout=10)
                if response.status_code == 200 and response.text.strip():
                    # Parse XML response
                    segments = parse_xml_transcript(response.text)
                    if segments:
                        return segments
                        
        except Exception as e:
            logger.info(f"Manual API attempt failed: {e}")
            continue
    
    return None

def fetch_via_scraping(video_id):
    """Alternative scraping method"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
        }
        
        # Try mobile version
        url = f'https://m.youtube.com/watch?v={video_id}'
        response = requests.get(url, headers=headers, timeout=15)
        
        if response.status_code == 200:
            # Look for caption data in mobile page
            import json
            
            # Search for various caption patterns
            patterns = [
                r'"captionTracks":\[([^\]]+)\]',
                r'"captions".*?"captionTracks":\[([^\]]+)\]'
            ]
            
            for pattern in patterns:
                match = re.search(pattern, response.text)
                if match:
                    try:
                        tracks_data = f'[{match.group(1)}]'
                        tracks = json.loads(tracks_data)
                        
                        if tracks and len(tracks) > 0:
                            track = tracks[0]
                            if 'baseUrl' in track:
                                # Fetch caption XML
                                caption_response = requests.get(track['baseUrl'], timeout=10)
                                if caption_response.status_code == 200:
                                    return parse_xml_transcript(caption_response.text)
                    except:
                        continue
    except Exception as e:
        logger.info(f"Scraping failed: {e}")
    
    return None

def parse_xml_transcript(xml_text):
    """Parse XML transcript into segments"""
    import xml.etree.ElementTree as ET
    segments = []
    
    try:
        # Try XML parsing first
        root = ET.fromstring(xml_text)
        for text_elem in root.findall('.//text'):
            start = float(text_elem.get('start', 0))
            duration = float(text_elem.get('dur', 2))
            text = text_elem.text or ''
            
            if text.strip():
                segments.append({
                    'text': text.strip(),
                    'start': start,
                    'duration': duration
                })
    except:
        # Fallback to regex parsing
        import re
        pattern = r'<text start="([\d.]+)" dur="([\d.]+)"[^>]*>([^<]+)</text>'
        matches = re.findall(pattern, xml_text)
        
        for match in matches:
            start, duration, text = match
            if text.strip():
                segments.append({
                    'text': text.strip(),
                    'start': float(start),
                    'duration': float(duration)
                })
    
    return segments if segments else None

@app.route('/transcript/<video_id>')
def get_transcript(video_id):
    logger.info(f"📥 Received request for video_id: {video_id}")
    
    # Extract actual video ID if URL was passed
    actual_video_id = extract_video_id(video_id)
    if not actual_video_id:
        logger.error(f"❌ Invalid video ID format: {video_id}")
        return jsonify({
            'success': False,
            'error': 'Invalid video ID format'
        }), 400
    
    try:
        transcript, method = get_transcript_with_fallbacks(actual_video_id)
        
        if not transcript:
            raise Exception("No transcript data returned")
            
        # Clean and validate transcript data
        cleaned_transcript = []
        for segment in transcript:
            if isinstance(segment, dict) and 'text' in segment and 'start' in segment:
                text = segment['text'].strip()
                if text and len(text) > 0:
                    cleaned_transcript.append({
                        'text': text,
                        'start': float(segment['start']),
                        'duration': float(segment.get('duration', 2))
                    })
        
        if not cleaned_transcript:
            raise Exception("No valid transcript segments found")
        
        logger.info(f"✅ Successfully processed {len(cleaned_transcript)} segments via {method}")
        return jsonify({
            'success': True,
            'transcript': cleaned_transcript,
            'method': method,
            'video_id': actual_video_id
        })
        
    except Exception as e:
        error_message = str(e)
        logger.error(f"❌ ERROR: {error_message}")
        
        # Provide more specific error messages
        if "No transcripts were found" in error_message:
            error_message = "This video doesn't have captions/subtitles available"
        elif "Video unavailable" in error_message:
            error_message = "Video is unavailable or private"
        elif "Transcript is disabled" in error_message:
            error_message = "Transcripts are disabled for this video"
        elif "HTTP Error 429" in error_message:
            error_message = "Rate limited - please try again in a few minutes"
        
        return jsonify({
            'success': False,
            'error': error_message,
            'video_id': actual_video_id
        }), 400

@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'transcript-api',
        'timestamp': time.time()
    })

@app.route('/test/<video_id>')
def test_transcript(video_id):
    """Test endpoint with detailed logging"""
    logger.info(f"🧪 TEST: Starting test for video_id: {video_id}")
    
    actual_video_id = extract_video_id(video_id)
    if not actual_video_id:
        return jsonify({'error': 'Invalid video ID'}), 400
    
    results = {}
    
    # Test each method individually
    methods = [
        ('youtube_transcript_api_ar', lambda: YouTubeTranscriptApi.get_transcript(actual_video_id, languages=['ar'])),
        ('youtube_transcript_api_en', lambda: YouTubeTranscriptApi.get_transcript(actual_video_id, languages=['en'])),
        ('youtube_transcript_api_auto', lambda: YouTubeTranscriptApi.get_transcript(actual_video_id)),
        ('manual_api', lambda: fetch_via_manual_api(actual_video_id)),
        ('scraping', lambda: fetch_via_scraping(actual_video_id))
    ]
    
    for method_name, method_func in methods:
        try:
            result = method_func()
            results[method_name] = {
                'success': True,
                'segments': len(result) if result else 0,
                'sample': result[0] if result and len(result) > 0 else None
            }
        except Exception as e:
            results[method_name] = {
                'success': False,
                'error': str(e)
            }
    
    return jsonify({
        'video_id': actual_video_id,
        'test_results': results
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Endpoint not found. Use /transcript/<video_id> or /health'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500

if __name__ == '__main__':
    logger.info("🚀 Starting enhanced Flask transcript service...")
    app.run(debug=True, port=5000, host='0.0.0.0')  # Changed to 0.0.0.0 for external access
