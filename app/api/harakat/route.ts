export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    
    if (!text || typeof text !== 'string') {
      return Response.json({ error: 'Text is required' }, { status: 400 });
    }

    const cleanedText = text.trim();
    if (!cleanedText) {
      return Response.json({ error: 'Empty text provided' }, { status: 400 });
    }

    console.log('Processing harakat for text:', cleanedText);

    // Try alternative API - Farasa (more reliable)
    try {
      const response = await fetch('https://farasa.qcri.org/webapi/diacritize/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          text: cleanedText,
          mode: 'diacritize'
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.output) {
          return Response.json({ 
            success: true,
            result: data.output 
          });
        }
      }
      
      throw new Error('Farasa API failed');
      
    } catch (farasaError) {
      console.log('Farasa failed, trying Mishkal...');
      
      // Fallback to Mishkal with different approach
      try {
        const response = await fetch('https://tahadz.com/mishkal/ajaxGet', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            text: cleanedText,
            action: 'Tashkeel'
          }),
          signal: AbortSignal.timeout(10000)
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.result) {
            return Response.json({ 
              success: true,
              result: data.result 
            });
          }
        }
        
        throw new Error('All harakat services failed');
        
      } catch (mishkalError) {
        // Return original text as fallback
        return Response.json({ 
          success: true,
          result: cleanedText,
          fallback: true,
          message: 'Harakat service unavailable'
        });
      }
    }
    
  } catch (error: any) {
    console.error('Harakat API Error:', error);
    return Response.json({ 
      error: error.message || 'Failed to process harakat' 
    }, { status: 500 });
  }
}