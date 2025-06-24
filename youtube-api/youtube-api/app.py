from flask import Flask, jsonify, request
from youtube_transcript_api import YouTubeTranscriptApi
from flask_cors import CORS
import logging
import re

app = Flask(__name__)
CORS(app)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def validate_video_id(video_id):
    """Validate YouTube video ID format"""
    pattern = r'^[a-zA-Z0-9_-]{11}$'
    return re.match(pattern, video_id) is not None

@app.route('/transcript/<video_id>')
def get_transcript(video_id):
    logger.info(f"Received request for video_id: {video_id}")
    
    # Validate video ID
    if not validate_video_id(video_id):
        logger.error(f"Invalid video ID format: {video_id}")
        return jsonify({
            'success': False,
            'error': 'Invalid video ID format'
        }), 400
    
    try:
        logger.info("Attempting to get transcript...")
        
        # Try to get Arabic transcript first
        try:
            transcript = YouTubeTranscriptApi.get_transcript(
                video_id, 
                languages=['ar', 'ar-SA', 'ar-EG']
            )
            logger.info("Successfully retrieved Arabic transcript")
        except Exception as arabic_error:
            logger.warning(f"Arabic transcript failed: {arabic_error}")
            
            # Try English as fallback
            try:
                transcript = YouTubeTranscriptApi.get_transcript(
                    video_id, 
                    languages=['en', 'en-US', 'en-GB']
                )
                logger.info("Successfully retrieved English transcript")
            except Exception as english_error:
                logger.warning(f"English transcript failed: {english_error}")
                
                # Fallback to auto-generated or any available language
                try:
                    transcript = YouTubeTranscriptApi.get_transcript(video_id)
                    logger.info("Successfully retrieved auto-generated transcript")
                except Exception as auto_error:
                    logger.error(f"All transcript attempts failed: {auto_error}")
                    raise Exception("No transcripts available for this video")
        
        if not transcript:
            raise Exception("Empty transcript received")
            
        # Clean and validate transcript data
        cleaned_transcript = []
        for segment in transcript:
            if 'text' in segment and 'start' in segment:
                # Clean the text
                text = segment['text'].strip()
                if text:  # Only add non-empty segments
                    cleaned_transcript.append({
                        'text': text,
                        'start': float(segment['start']),
                        'duration': float(segment.get('duration', 0))
                    })
        
        if not cleaned_transcript:
            raise Exception("No valid transcript segments found")
        
        logger.info(f"Successfully processed {len(cleaned_transcript)} transcript segments")
        return jsonify({
            'success': True,
            'transcript': cleaned_transcript
        })
        
    except Exception as e:
        error_message = str(e)
        logger.error(f"ERROR: {error_message}")
        
        # Provide more specific error messages
        if "No transcripts were found" in error_message:
            error_message = "This video doesn't have captions/subtitles available"
        elif "Video unavailable" in error_message:
            error_message = "Video is unavailable or private"
        elif "Transcript is disabled" in error_message:
            error_message = "Transcripts are disabled for this video"
        
        return jsonify({
            'success': False,
            'error': error_message
        }), 400

@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'transcript-api'
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Endpoint not found'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500

if __name__ == '__main__':
    logger.info("Starting Flask transcript service...")
    app.run(debug=True, port=5000, host='127.0.0.1')