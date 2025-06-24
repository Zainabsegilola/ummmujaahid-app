import { NextRequest, NextResponse } from 'next/server';
console.log('🔍 Environment check:', {
  hasKey: !!process.env.DEEPSEEK_API_KEY,
  keyStart: process.env.DEEPSEEK_API_KEY?.substring(0, 10) + '...'
});
console.log('🔧 Debug env:', process.env.DEEPSEEK_API_KEY);
export async function POST(request: NextRequest) {
  try {
    const { arabicWord, context } = await request.json();
    
    if (!arabicWord) {
      return NextResponse.json({ error: 'Arabic word is required' }, { status: 400 });
    }

    console.log('🔄 Translating word:', arabicWord);

    // Try DeepSeek first (primary)
    try {
      const deepSeekResult = await translateWithDeepSeek(arabicWord, context);
      if (deepSeekResult) {
        console.log('✅ DeepSeek translation successful:', deepSeekResult);
        return NextResponse.json({
          success: true,
          translation: deepSeekResult,
          source: 'deepseek'
        });
      }
    } catch (deepSeekError) {
      console.warn('⚠️ DeepSeek failed, trying fallback:', deepSeekError);
    }

    // Fallback to MyMemory if DeepSeek fails
    try {
      const fallbackResult = await translateWithMyMemory(arabicWord);
      console.log('✅ Fallback translation successful:', fallbackResult);
      return NextResponse.json({
        success: true,
        translation: fallbackResult,
        source: 'mymemory'
      });
    } catch (fallbackError) {
      console.warn('⚠️ All translation methods failed');
    }

    // Last resort - return partial data
    return NextResponse.json({
      success: true,
      translation: {
        meaning: "Add meaning manually",
        partOfSpeech: "Unknown",
        sampleSentence: context || arabicWord,
        sampleTranslation: "Please add translation"
      },
      source: 'fallback'
    });

  } catch (error: any) {
    console.error('Translation API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Translation failed'
    }, { status: 500 });
  }
}

// DeepSeek Translation Function
// DeepSeek Translation Function - FIXED
// DeepSeek Translation Function - FIXED JSON PARSING
async function translateWithDeepSeek(arabicWord: string, context: string) {
  const apiKey = process.env.DEEPSEEK_API_KEY; // Hardcoded for now
  
  if (!apiKey) {
    throw new Error('DeepSeek API key not found');
  }

  console.log('🔑 API Key loaded:', apiKey ? 'Yes' : 'No');

  const prompt = `Analyze this Arabic word: "${arabicWord}"
${context ? `Context: "${context}"` : ''}

You must respond with ONLY valid JSON in this exact format (no markdown, no code blocks, no extra text):

{
  "meaning": "accurate English translation",
  "partOfSpeech": "grammatical info (noun, verb, etc. with details like feminine, plural, past tense)",
  "sampleSentence": "different Arabic sentence using this word",
  "sampleTranslation": "English translation of the sample sentence"
}

Be accurate for Quranic/Islamic Arabic. For verbs: mention if active/passive, past/present.`;

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1, // Lower temperature for more consistent JSON
      max_tokens: 300
    })
  });

  console.log('🌐 DeepSeek API response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ DeepSeek API error:', errorText);
    throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  const content = data.choices?.[0]?.message?.content;
  console.log('📝 Raw DeepSeek content:', content);

  if (!content) {
    throw new Error('No content in DeepSeek response');
  }

  // Clean the content - remove code blocks and extra formatting
  let cleanContent = content;
  
  // Remove markdown code blocks
  cleanContent = cleanContent.replace(/```json\s*/g, '');
  cleanContent = cleanContent.replace(/```\s*/g, '');
  
  // Remove any leading/trailing whitespace
  cleanContent = cleanContent.trim();
  
  console.log('🧹 Cleaned content:', cleanContent);

  // Parse JSON response
  try {
    const parsed = JSON.parse(cleanContent);
    
    return {
      meaning: parsed.meaning || "Unknown meaning",
      partOfSpeech: parsed.partOfSpeech || "Unknown",
      sampleSentence: parsed.sampleSentence || arabicWord,
      sampleTranslation: parsed.sampleTranslation || "No translation available"
    };
  } catch (parseError) {
    console.warn('❌ Failed to parse cleaned JSON:', parseError);
    console.warn('Content that failed:', cleanContent);
    
    // Manual extraction as last resort
    return {
      meaning: extractMeaningFromText(content),
      partOfSpeech: "Unknown",
      sampleSentence: arabicWord,
      sampleTranslation: "See context above"
    };
  }
}

// MyMemory Fallback Function (simplified)
async function translateWithMyMemory(arabicWord: string) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(arabicWord)}&langpair=ar|en`;
  
  const response = await fetch(url, { 
    headers: { 'User-Agent': 'Mozilla/5.0' } 
  });
  
  if (!response.ok) {
    throw new Error('MyMemory API failed');
  }
  
  const data = await response.json();
  
  if (data.responseStatus === 200) {
    return {
      meaning: data.responseData.translatedText.toLowerCase().trim(),
      partOfSpeech: "Unknown",
      sampleSentence: arabicWord,
      sampleTranslation: "See context above"
    };
  }
  
  throw new Error('MyMemory translation not found');
}

// Helper function to extract meaning from unstructured text
function extractMeaningFromText(text: string): string {
  // Simple extraction - look for common patterns
  const meaningMatch = text.match(/meaning[:\s]+["]?([^".\n]+)["]?/i);
  if (meaningMatch) {
    return meaningMatch[1].trim();
  }
  
  // Fallback: take first reasonable sentence
  const sentences = text.split('\n').filter(s => s.trim().length > 0);
  if (sentences.length > 0) {
    return sentences[0].trim().substring(0, 50);
  }
  
  return "Add meaning manually";
}