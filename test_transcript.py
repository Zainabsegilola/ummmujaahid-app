from youtube_transcript_api import YouTubeTranscriptApi

video_ids = ['jh4FH-EDGJ4', 'j4HF-EDG4A', 'DVrsvCIkNmE']  # Test multiple videos
for video_id in video_ids:
    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['ar'])
        print(f"Transcript for video {video_id}:")
        for segment in transcript:
            print(f"{segment['text']} (start: {segment['start']}s)")
    except Exception as e:
        print(f"Error for video {video_id}: {e}")