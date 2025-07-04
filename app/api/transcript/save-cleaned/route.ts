import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { videoId, cleanedTranscript } = await request.json();
    
    if (!videoId || !cleanedTranscript) {
      return NextResponse.json({ error: 'Missing videoId or cleanedTranscript' }, { status: 400 });
    }
    
    const { error } = await supabase
      .from('transcripts')
      .update({ transcript_cleaned: cleanedTranscript })
      .eq('video_id', videoId);
    
    if (error) {
      console.error('Failed to save cleaned transcript:', error);
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save cleaned transcript error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
