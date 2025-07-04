// app/api/transcript/route.ts - SIMPLIFIED SUPADATA VERSION
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
      .select('transcript, lang, transcript_cleaned, created_at')
      .eq('video_id', videoId)
      .single();

    if (cachedTranscript && !cacheError) {
      console.log('✅ Found cached transcript!');
      
      // Return cleaned version if available, otherwise return original
      const transcriptToReturn = cachedTranscript.transcript_cleaned || cachedTranscript.transcript;
      const isCleanedVersion = !!cachedTranscript.transcript_cleaned;
      
      console.log(`📄 Returning ${isCleanedVersion ? 'cleaned' : 'original'} transcript`);
      
      return NextResponse.json({ 
        transcript: transcriptToReturn,
        isCleanedVersion: isCleanedVersion
      });
    }

    console.log('❌ No cached transcript, fetching from Supadata...');

    // 🔄 STEP 2: Fetch from Supadata API
    const apiKey = process.env.SUPADATA_API_KEY;
    
    if (!apiKey) {
      console.error('❌ SUPADATA_API_KEY not found in environment variables');
      return NextResponse.json({ 
        error: 'API configuration error',
        suggestion: 'Please contact support'
      }, { status: 500 });
    }

    // Try Arabic first
    let supadataResponse = await callSupadataAPI(videoId, apiKey, 'ar');
    
    // If Arabic fails, try English
    if (!supadataResponse.success) {
      console.log('🔄 Arabic failed, trying English...');
      supadataResponse = await callSupadataAPI(videoId, apiKey, 'en');
    }
    
    if (supadataResponse.success) {
      console.log('✅ Supadata API success, caching transcript...');
      
      // 💾 STEP 3: Save to cache (don't fail if this fails)
      try {
        const { error: saveError } = await supabase
          .from('transcripts')
          .insert({
            video_id: videoId,
            transcript: supadataResponse.transcript,
            transcript_cleaned: null, // Will be filled when cleaned
            lang: supadataResponse.lang,
            created_at: new Date().toISOString()
          });

        if (saveError) {
          console.warn('⚠️ Failed to cache transcript:', saveError.message);
        } else {
          console.log('💾 Transcript cached successfully');
        }
      } catch (cacheError) {
        console.warn('⚠️ Cache error (non-critical):', cacheError);
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

// Helper function to call Supadata API
async function callSupadataAPI(videoId: string, apiKey: string, lang: string) {
  try {
    console.log(`📡 Calling Supadata API for video: ${videoId}, lang: ${lang}`);
    
    const response = await fetch(
      `https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}&text=false&lang=${lang}`,
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
      console.log(`❌ Supadata API HTTP error for ${lang}:`, response.status, response.statusText);
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();
    console.log('📊 Supadata response:', {
      hasContent: !!data.content,
      contentType: Array.isArray(data.content) ? 'array' : typeof data.content,
      lang: data.lang,
      segmentCount: Array.isArray(data.content) ? data.content.length : 0
    });

    if (data.content && Array.isArray(data.content) && data.content.length > 0) {
      // Convert Supadata format to your app's format
      const transcript = data.content.map((segment: any) => ({
        text: segment.text || '',
        start: (segment.offset || 0) / 1000, // Convert milliseconds to seconds
        duration: (segment.duration || 2000) / 1000 // Convert milliseconds to seconds
      }));

      return {
        success: true,
        transcript,
        lang: data.lang || lang
      };
    } else {
      console.log(`❌ No valid content from Supadata for ${lang}`);
      return { success: false, error: 'No valid transcript data' };
    }

  } catch (error: any) {
    console.error(`❌ Supadata API error for ${lang}:`, error.message);
    return { success: false, error: error.message };
  }
}
