// app/api/transcript/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
  }

  console.log(`🎯 [DEPLOY] Fetching transcript for video: ${videoId}`);
  console.log(`🎯 [DEPLOY] Env Vars - Supabase URL: ${supabaseUrl}, Supadata Key: ${process.env.SUPADATA_API_KEY ? 'Set' : 'Missing'}`);

  try {
    // Check Supabase cache
    console.log(`📦 [DEPLOY] Checking Supabase cache for ${videoId}...`);
    const { data: cachedTranscript, error: cacheError } = await supabase
      .from('transcripts')
      .select('transcript, lang')
      .eq('video_id', videoId)
      .single();

    if (cachedTranscript && !cacheError) {
      console.log('✅ [DEPLOY] Found transcript in Supabase cache');
      return NextResponse.json({ transcript: cachedTranscript.transcript, lang: cachedTranscript.lang });
    }
    if (cacheError) console.log('⚠️ [DEPLOY] Supabase cache error:', cacheError.message);

    // Fetch from Supadata
    console.log('📡 [DEPLOY] Fetching from Supadata API...');
    const response = await fetch(`https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}&text=true`, {
      method: 'GET',
      headers: {
        'x-api-key': process.env.SUPADATA_API_KEY!,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    console.log('📡 [DEPLOY] Supadata Response Status:', response.status);
    const text = await response.text();
    console.log('📡 [DEPLOY] Supadata Response Body:', text);

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch transcript', details: `Status: ${response.status}, Body: ${text}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    if (data.content) {
      console.log('✅ [DEPLOY] Supadata API success, content length:', data.content.length);
      await supabase.from('transcripts').insert({
        video_id: videoId,
        transcript: data.content,
        lang: data.lang,
      });
      return NextResponse.json({ transcript: data.content, lang: data.lang });
    }

    return NextResponse.json(
      { error: 'No transcript available', suggestion: 'This video may not have captions' },
      { status: 404 }
    );
  } catch (error: any) {
    console.error('💥 [DEPLOY] Transcript API Error:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch transcript', details: error.message },
      { status: 500 }
    );
  }
}
