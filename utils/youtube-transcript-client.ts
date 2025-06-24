// utils/youtube-transcript-client.ts
// This runs entirely in the browser, bypassing server-side IP blocks
import { useState } from 'react';
export interface TranscriptSegment {
  start: number;
  duration: number;
  text: string;
  transliteration: string;
  translation: string;
}

export interface TranscriptResponse {
  transcript: TranscriptSegment[];
  language: string;
  videoTitle?: string;
  error?: string;
}

export class YouTubeTranscriptClient {
  private corsProxy = 'https://corsproxy.io/?';
  
  async fetchTranscript(videoId: string): Promise<TranscriptResponse> {
    console.log(`[Client] Fetching transcript for video: ${videoId}`);
    
    try {
      // Method 1: Try YouTube's direct page
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const response = await fetch(this.corsProxy + encodeURIComponent(youtubeUrl));
      
      if (!response.ok) {
        throw new Error('Failed to fetch YouTube page');
      }
      
      const html = await response.text();
      
      // Extract player response
      const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?})\s*;/);
      
      if (playerResponseMatch) {
        try {
          const playerResponse = JSON.parse(playerResponseMatch[1]);
          const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
          
          if (captionTracks && captionTracks.length > 0) {
            // Find Arabic or first available track
            const track = captionTracks.find((t: any) => t.languageCode === 'ar') || captionTracks[0];
            
            // Fetch transcript XML
            const transcriptResponse = await fetch(this.corsProxy + encodeURIComponent(track.baseUrl));
            const transcriptXml = await transcriptResponse.text();
            
            const segments = this.parseTranscriptXML(transcriptXml);
            
            if (segments.length > 0) {
              console.log(`[Client] Successfully extracted ${segments.length} segments`);
              return {
                transcript: segments,
                language: track.languageCode,
                videoTitle: playerResponse?.videoDetails?.title
              };
            }
          }
        } catch (e) {
          console.error('[Client] Failed to parse player response:', e);
        }
      }
      
      // Method 2: Try alternative extraction
      return await this.tryAlternativeMethods(videoId);
      
    } catch (error: any) {
      console.error('[Client] Primary method failed:', error);
      return await this.tryAlternativeMethods(videoId);
    }
  }
  
  private async tryAlternativeMethods(videoId: string): Promise<TranscriptResponse> {
    // Method 2: Try Google's timedtext
    try {
      console.log('[Client] Trying Google timedtext...');
      const googleUrl = `http://video.google.com/timedtext?lang=en&v=${videoId}`;
      const response = await fetch(this.corsProxy + encodeURIComponent(googleUrl));
      
      if (response.ok) {
        const xml = await response.text();
        const segments = this.parseTranscriptXML(xml);
        
        if (segments.length > 0) {
          return {
            transcript: segments,
            language: 'en'
          };
        }
      }
    } catch (e) {
      console.log('[Client] Google timedtext failed');
    }
    
    // Method 3: Try extracting from YouTube's captions iframe
    try {
      console.log('[Client] Trying caption iframe method...');
      const captionUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&caps=asr&xoaf=5&hl=en&ip=0.0.0.0&ipbits=0&expire=0&sparams=ip,ipbits,expire,v,caps,xoaf&signature=&key=yt8&lang=en`;
      const response = await fetch(this.corsProxy + encodeURIComponent(captionUrl));
      
      if (response.ok) {
        const xml = await response.text();
        const segments = this.parseTranscriptXML(xml);
        
        if (segments.length > 0) {
          return {
            transcript: segments,
            language: 'en'
          };
        }
      }
    } catch (e) {
      console.log('[Client] Caption iframe method failed');
    }
    
    return {
      transcript: [],
      language: 'unknown',
      error: 'All client-side methods failed. The video might not have captions.'
    };
  }
  
  private parseTranscriptXML(xmlText: string): TranscriptSegment[] {
    const segments: TranscriptSegment[] = [];
    
    // Match all text segments in the XML
    const regex = /<text start="([\d.]+)" dur="([\d.]+)"[^>]*>([^<]+)<\/text>/g;
    let match;
    
    while ((match = regex.exec(xmlText)) !== null) {
      const start = parseFloat(match[1]);
      const duration = parseFloat(match[2]);
      const text = this.decodeXMLEntities(match[3]);
      
      segments.push({
        start: start,
        duration: duration,
        text: text,
        transliteration: '',
        translation: ''
      });
    }
    
    return segments;
  }
  
  private decodeXMLEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n/g, ' ')
      .trim();
  }
}

// Hook for React components
export function useYouTubeTranscript() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchTranscript = async (videoIdOrUrl: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Extract video ID if URL is provided
      const videoId = videoIdOrUrl.includes('youtube.com') || videoIdOrUrl.includes('youtu.be')
        ? extractVideoId(videoIdOrUrl)
        : videoIdOrUrl;
        
      if (!videoId) {
        throw new Error('Invalid video ID or URL');
      }
      
      const client = new YouTubeTranscriptClient();
      const result = await client.fetchTranscript(videoId);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return { fetchTranscript, loading, error };
}

function extractVideoId(url: string): string {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : '';
}

// For vanilla JavaScript usage
if (typeof window !== 'undefined') {
  (window as any).YouTubeTranscriptClient = YouTubeTranscriptClient;
}