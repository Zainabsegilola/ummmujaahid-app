// app/api/transcript/route.ts - UPDATED VERSION
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');
  
  if (!videoId) {
    return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
  }

  try {
    console.log(`🎯 Fetching transcript for video: ${videoId}`);
    
    // Method 1: Try your Oracle server first
    try {
      console.log('📡 Trying Oracle server...');
      const response = await fetch(`http://143.47.239.10:5000/transcript/${videoId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: AbortSignal.timeout(15000)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.transcript && data.transcript.length > 0) {
          console.log('✅ Oracle server success');
          return NextResponse.json({ transcript: data.transcript });
        }
      }
      console.log('⚠️ Oracle server failed or empty');
    } catch (oracleError) {
      console.log('❌ Oracle server error:', oracleError.message);
    }

    // Method 2: Try multiple fallback services
    const fallbackMethods = [
      () => tryYouTubeAPI(videoId),
      () => tryAlternativeAPI(videoId),
      () => tryWebScraping(videoId),
      () => tryInvidiousAPI(videoId)
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

    // If all methods fail, return helpful error
    return NextResponse.json({ 
      error: 'No transcript available for this video',
      suggestion: 'This video may not have captions, or they may be disabled'
    }, { status: 404 });
    
  } catch (error: any) {
    console.error('💥 Transcript API Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch transcript',
      details: error.message 
    }, { status: 500 });
  }
}

// Method 2a: Direct YouTube API approach
async function tryYouTubeAPI(videoId: string) {
  console.log('🔍 Trying YouTube API...');
  
  // Try to get captions list first
  const captionsUrl = `https://www.youtube.com/api/timedtext?type=list&v=${videoId}`;
  
  const response = await fetch(captionsUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    signal: AbortSignal.timeout(10000)
  });
  
  if (!response.ok) throw new Error('Captions list failed');
  
  const listXml = await response.text();
  
  // Parse available languages
  const langMatches = listXml.match(/lang_code="([^"]+)"/g);
  if (!langMatches) throw new Error('No captions found');
  
  // Try Arabic first, then English, then any
  const preferredLangs = ['ar', 'en', 'en-US'];
  let targetLang = 'en';
  
  for (const prefLang of preferredLangs) {
    if (listXml.includes(`lang_code="${prefLang}"`)) {
      targetLang = prefLang;
      break;
    }
  }
  
  // Get the transcript
  const transcriptUrl = `https://www.youtube.com/api/timedtext?lang=${targetLang}&v=${videoId}&fmt=json3`;
  
  const transcriptResponse = await fetch(transcriptUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    signal: AbortSignal.timeout(10000)
  });
  
  if (!transcriptResponse.ok) throw new Error('Transcript fetch failed');
  
  const transcriptData = await transcriptResponse.json();
  
  if (transcriptData.events) {
    return transcriptData.events
      .filter((event: any) => event.segs)
      .map((event: any) => ({
        text: event.segs.map((seg: any) => seg.utf8).join(''),
        start: parseFloat(event.tStartMs) / 1000,
        duration: parseFloat(event.dDurationMs || 4000) / 1000
      }))
      .filter((item: any) => item.text.trim());
  }
  
  throw new Error('No transcript events found');
}

// Method 2b: Alternative scraping approach
async function tryAlternativeAPI(videoId: string) {
  console.log('🔍 Trying alternative scraping...');
  
  // Try getting the watch page and extracting captions
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  const response = await fetch(watchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
    },
    signal: AbortSignal.timeout(15000)
  });
  
  if (!response.ok) throw new Error('Watch page fetch failed');
  
  const html = await response.text();
  
  // Extract player response
  const playerMatch = html.match(/"captionTracks":\[({.+?})\]/);
  if (!playerMatch) throw new Error('No caption tracks found');
  
  const captionTrack = JSON.parse(playerMatch[1]);
  if (!captionTrack.baseUrl) throw new Error('No caption URL found');
  
  // Fetch the caption XML
  const captionResponse = await fetch(captionTrack.baseUrl, {
    signal: AbortSignal.timeout(10000)
  });
  
  if (!captionResponse.ok) throw new Error('Caption fetch failed');
  
  const captionXml = await captionResponse.text();
  
  // Parse XML
  const segments: any[] = [];
  const regex = /<text start="([\d.]+)" dur="([\d.]+)"[^>]*>([^<]+)<\/text>/g;
  let match;
  
  while ((match = regex.exec(captionXml)) !== null) {
    segments.push({
      text: decodeXMLEntities(match[3]),
      start: parseFloat(match[1]),
      duration: parseFloat(match[2])
    });
  }
  
  if (segments.length === 0) throw new Error('No segments parsed');
  
  return segments;
}

// Method 2c: Web scraping with different approach
async function tryWebScraping(videoId: string) {
  console.log('🔍 Trying web scraping...');
  
  // Try the embed page instead of watch page
  const embedUrl = `https://www.youtube.com/embed/${videoId}`;
  
  const response = await fetch(embedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
    },
    signal: AbortSignal.timeout(10000)
  });
  
  if (!response.ok) throw new Error('Embed fetch failed');
  
  const html = await response.text();
  
  // Look for different patterns
  const patterns = [
    /"captions".*?"playerCaptionsTracklistRenderer".*?"captionTracks":\[([^\]]+)\]/,
    /"captionTracks":\[([^\]]+)\]/,
    /ytInitialPlayerResponse.*?"captionTracks":\[([^\]]+)\]/
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        const tracks = JSON.parse(`[${match[1]}]`);
        const track = tracks[0];
        
        if (track && track.baseUrl) {
          const captionResponse = await fetch(track.baseUrl);
          const xml = await captionResponse.text();
          return parseXMLTranscript(xml);
        }
      } catch (e) {
        continue;
      }
    }
  }
  
  throw new Error('No captions found in embed');
}

// Method 2d: Try Invidious API (YouTube alternative)
async function tryInvidiousAPI(videoId: string) {
  console.log('🔍 Trying Invidious API...');
  
  const invidiousInstances = [
    'https://invidious.io',
    'https://yewtu.be',
    'https://invidious.snopyta.org',
    'https://invidious.kavin.rocks'
  ];
  
  for (const instance of invidiousInstances) {
    try {
      const response = await fetch(`${instance}/api/v1/videos/${videoId}?fields=captions`, {
        signal: AbortSignal.timeout(8000)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.captions && data.captions.length > 0) {
          const caption = data.captions.find((c: any) => c.language_code === 'en') || data.captions[0];
          
          const captionResponse = await fetch(caption.url, {
            signal: AbortSignal.timeout(8000)
          });
          
          if (captionResponse.ok) {
            const xml = await captionResponse.text();
            return parseXMLTranscript(xml);
          }
        }
      }
    } catch (e) {
      continue;
    }
  }
  
  throw new Error('All Invidious instances failed');
}

// Helper functions
function parseXMLTranscript(xml: string) {
  const segments: any[] = [];
  const regex = /<text start="([\d.]+)" dur="([\d.]+)"[^>]*>([^<]+)<\/text>/g;
  let match;
  
  while ((match = regex.exec(xml)) !== null) {
    const text = decodeXMLEntities(match[3]).trim();
    if (text) {
      segments.push({
        text: text,
        start: parseFloat(match[1]),
        duration: parseFloat(match[2])
      });
    }
  }
  
  return segments;
}

function decodeXMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\n/g, ' ')
    .trim();
}
