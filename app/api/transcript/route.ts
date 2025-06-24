import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');
  
  if (!videoId) {
    return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
  }

  try {
    console.log(`Fetching transcript for video: ${videoId} via Oracle server`);
    
    // Call your Oracle server directly from Next.js backend
    const response = await fetch(`http://143.47.239.10:5000/transcript/${videoId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout
      signal: AbortSignal.timeout(30000)
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.transcript) {
      return NextResponse.json({ transcript: data.transcript });
    } else {
      return NextResponse.json({ error: data.error || 'No transcript available' }, { status: 404 });
    }
    
  } catch (error: any) {
    console.error('Transcript API Error:', error);
    return NextResponse.json({ error: 'No transcript available for this video' }, { status: 404 });
  }
}
