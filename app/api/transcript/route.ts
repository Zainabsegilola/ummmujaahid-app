// app/api/transcript/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (assuming you’re using Supabase for caching)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
  }

  try {
    console.log(`🎯 Fetching transcript for video: ${videoId}`);

    // Check Supabase cache
    const { data: cachedTranscript, error: cacheError } = await supabase
      .from('transcripts')
      .select('transcript, lang')
      .eq('video_id', videoId)
      .single();

    if (cachedTranscript && !cacheError) {
      console.log('✅ Found transcript in Supabase cache');
      return NextResponse.json({ transcript: cachedTranscript.transcript, lang: cachedTranscript.lang });
    }

    // Fetch from Supadata
    console.log('📡 Fetching from Supadata API...');
    const response = await fetch(`https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}&text=true`, {
      method: 'GET',
      headers: {
        'x-api-key': process.env.SUPADATA_API_KEY!,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.log('❌ Supadata API failed:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch transcript', details: response.statusText },
        { status: response.status }
      );
    }

    const data = await response.json();
    if (data.content) {
      console.log('✅ Supadata API success');
      // Cache in Supabase
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
    console.error('💥 Transcript API Error:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch transcript', details: error.message },
      { status: 500 }
    );
  }
}
