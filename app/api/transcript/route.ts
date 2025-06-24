// app/api/transcript/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
  }

  try {
    console.log(`🎯 Fetching transcript for video: ${videoId}`);

    // Step 1: Try Supadata API
    try {
      console.log('📡 Trying Supadata API...');
      const response = await fetch(`https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}&text=true`, {
        method: 'GET',
        headers: {
          'x-api-key': process.env.SUPADATA_API_KEY!,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.content) {
          console.log('✅ Supadata API success');
          return NextResponse.json({ transcript: data.content, lang: data.lang });
        }
        console.log('⚠️ Supadata API returned empty transcript');
      } else {
        console.log('⚠️ Supadata API failed:', response.status, response.statusText);
      }
    } catch (supadataError) {
      console.log('❌ Supadata API error:', supadataError.message);
    }

    // Step 2: Fallback to Oracle server (your Flask server)
    try {
      console.log('📡 Trying Oracle server...');
      const response = await fetch(`http://143.47.239.10:5000/transcript/${videoId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.transcript && data.transcript.length > 0) {
          console.log('✅ Oracle server success');
          return NextResponse.json({ transcript: data.transcript });
        }
        console.log('⚠️ Oracle server returned empty transcript');
      }
    } catch (oracleError) {
      console.log('❌ Oracle server error:', oracleError.message);
    }

    // Step 3: Try other fallback methods (YouTube API, Invidious, scraping)
    const fallbackMethods = [
      () => tryYouTubeAPI(videoId),
      () => tryAlternativeAPI(videoId),
      () => tryWebScraping(videoId),
      () => tryInvidiousAPI(videoId),
    ];

    for (const method of fallbackMethods) {
      try {
        const result = await method();
        if (result && result.length > 0) {
          console.log('✅ Fallback method succeeded');
          return NextResponse.json({ transcript: result });
        }
      } catch (error) {
        console.log('⚠️ Fallback method failed:', error.message);
        continue;
      }
    }

    // Step 4: If all methods fail, return helpful error
    return NextResponse.json(
      {
        error: 'No transcript available for this video',
        suggestion: 'This video may not have captions, or they may be disabled',
      },
      { status: 404 }
    );
  } catch (error: any) {
    console.error('💥 Transcript API Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch transcript',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// [Rest of your existing code: tryYouTubeAPI, tryAlternativeAPI, tryWebScraping, tryInvidiousAPI, parseXMLTranscript, decodeXMLEntities]
