export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');
  
  if (!videoId) {
    return Response.json({ error: 'Video ID is required' }, { status: 400 });
  }

  // Validate video ID format
  const videoIdRegex = /^[a-zA-Z0-9_-]{11}$/;
  if (!videoIdRegex.test(videoId)) {
    return Response.json({ error: 'Invalid video ID format' }, { status: 400 });
  }

  try {
    console.log(`Attempting to fetch transcript for video: ${videoId}`);
    
    const response = await fetch(`http://127.0.0.1:5000/transcript/${videoId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`Flask server responded with ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      return Response.json({ 
        error: data.error || 'Unknown error from transcript service' 
      }, { status: 400 });
    }

    if (!data.transcript || data.transcript.length === 0) {
      return Response.json({ 
        error: 'No transcript data available for this video' 
      }, { status: 404 });
    }

    console.log(`Successfully fetched ${data.transcript.length} transcript segments`);
    return Response.json({ transcript: data.transcript });
    
  } catch (error: any) {
    console.error('Transcript API Error:', error);
    
    if (error.name === 'AbortError') {
      return Response.json({ 
        error: 'Request timeout - transcript service is not responding' 
      }, { status: 408 });
    }
    
    if (error.code === 'ECONNREFUSED') {
      return Response.json({ 
        error: 'Cannot connect to transcript service. Make sure Flask server is running on port 5000.' 
      }, { status: 503 });
    }
    
    return Response.json({ 
      error: error.message || 'Failed to fetch transcript' 
    }, { status: 500 });
  }
}