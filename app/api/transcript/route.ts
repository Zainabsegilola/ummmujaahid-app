import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');
  
  if (!videoId) {
    return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
  }

  // Validate video ID format
  const videoIdRegex = /^[a-zA-Z0-9_-]{11}$/;
  if (!videoIdRegex.test(videoId)) {
    return NextResponse.json({ error: 'Invalid video ID format' }, { status: 400 });
  }

  try {
    // Import the library dynamically
    const { YoutubeTranscript } = await import('youtube-transcript');
    
    console.log(`Attempting to fetch transcript for video: ${videoId}`);
    
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    
    if (!transcript || transcript.length === 0) {
      return NextResponse.json({ 
        error: 'No transcript data available for this video' 
      }, { status: 404 });
    }

    console.log(`Successfully fetched ${transcript.length} transcript segments`);
    return NextResponse.json({ transcript });
    
  } catch (error: any) {
    console.error('Transcript API Error:', error);
    
    return NextResponse.json({ 
      error: 'No transcript available for this video' 
    }, { status: 404 });
  }
}
