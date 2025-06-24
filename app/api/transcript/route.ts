// app/api/transcript/route.ts - SUPADATA + CACHING VERSION
// Replace your entire route.ts file with this code
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');
  
  console.log('🎯 Transcript API called with videoId:', videoId);
  
  if (!videoId) {
    return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
  }

  try {
    // ⚡ STEP 1: Check cache first (super fast)
    console.log('🔍 Checking cache for video:', videoId);
    
    const { data: cachedTranscript, error: cacheError } = await supabase
      .from('transcripts')
      .select('transcript, lang, created_at')
      .eq('video_id', videoId)
      .single();

    if (cachedTranscript && !cacheError) {
      console.log('✅ Found cached transcript!', {
        lang: cachedTranscript.lang,
        created: cachedTranscript.created_at,
        segmentCount: cachedTranscript.transcript.length
      });
      
      // Return cached transcript
      return NextResponse.json({ transcript: cachedTranscript.transcript });
    }

    console.log('❌ No cached transcript, fetching from Supadata...');

    // 🔄 STEP 2: Fetch from Supadata API
    const supadataResponse = await fetchFromSupadata(videoId);
    
    if (supadataResponse.success) {
      console.log('✅ Supadata API success, caching transcript...');
      
      // 💾 STEP 3: Save to cache
      const { error: saveError } = await supabase
        .from('transcripts')
        .insert({
          video_id: videoId,
          transcript: supadataResponse.transcript,
          lang: supadataResponse.lang,
          created_at: new Date().toISOString()
        });

      if (saveError) {
        console.warn('⚠️ Failed to cache transcript:', saveError.message);
        // Don't fail the whole request if caching fails
      } else {
        console.log('💾 Transcript cached successfully');
      }

      return NextResponse.json({ transcript: supadataResponse.transcript });
    } else {
      console.log('❌ Supadata API failed:', supadataResponse.error);
      
      // Return user-friendly error message
      return NextResponse.json({ 
        error: 'No transcript available for this video',
        suggestion: 'This video may not have captions, or they may be disabled'
      }, { status: 404 });
    }
    
  } catch (error: any) {
    console.error('💥 Transcript API Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch transcript',
      details: error.message 
    }, { status: 500 });
  }
}

// 🔄 Supadata API integration
async function fetchFromSupadata(videoId: string) {
  const apiKey = process.env.SUPADATA_API_KEY;
  
  if (!apiKey) {
    console.error('❌ SUPADATA_API_KEY not found in environment variables');
    return { success: false, error: 'API key not configured' };
  }

  try {
    console.log('📡 Calling Supadata API for video:', videoId);
    
    // Call Supadata API with structured format (text=false)
    const response = await fetch(
      `https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}&text=false&lang=ar`,
      {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(15000) // 15 second timeout
      }
    );

    if (!response.ok) {
      console.log('❌ Supadata API HTTP error:', response.status, response.statusText);
      
      // Try English as fallback
      if (response.status === 404) {
        console.log('🔄 Trying English fallback...');
        return await fetchFromSupadataFallback(videoId, apiKey);
      }
      
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();
    console.log('📊 Supadata response structure:', {
      hasContent: !!data.content,
      contentType: Array.isArray(data.content) ? 'array' : typeof data.content,
      lang: data.lang,
      availableLangs: data.availableLangs
    });

    if (data.content && Array.isArray(data.content)) {
      // Convert Supadata format to your app's format
      const transcript = data.content.map((segment: any) => ({
        text: segment.text,
        start: segment.offset / 1000, // Convert milliseconds to seconds
        duration: segment.duration / 1000 // Convert milliseconds to seconds
      }));

      return {
        success: true,
        transcript,
        lang: data.lang
      };
    } else {
      console.log('❌ Invalid response format from Supadata');
      return { success: false, error: 'Invalid response format' };
    }

  } catch (error: any) {
    console.error('❌ Supadata API error:', error.message);
    return { success: false, error: error.message };
  }
}

// Fallback function to try English if Arabic fails
async function fetchFromSupadataFallback(videoId: string, apiKey: string) {
  try {
    console.log('🔄 Supadata fallback: trying English...');
    
    const response = await fetch(
      `https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}&text=false&lang=en`,
      {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(15000)
      }
    );

    if (!response.ok) {
      console.log('❌ English fallback also failed:', response.status);
      return { success: false, error: `No transcripts available in Arabic or English` };
    }

    const data = await response.json();
    
    if (data.content && Array.isArray(data.content)) {
      const transcript = data.content.map((segment: any) => ({
        text: segment.text,
        start: segment.offset / 1000,
        duration: segment.duration / 1000
      }));

      return {
        success: true,
        transcript,
        lang: data.lang
      };
    } else {
      return { success: false, error: 'No valid transcript data' };
    }

  } catch (error: any) {
    console.error('❌ Supadata fallback error:', error.message);
    return { success: false, error: error.message };
  }
}
