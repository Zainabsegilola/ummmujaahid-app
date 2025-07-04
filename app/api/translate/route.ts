import { NextRequest, NextResponse } from 'next/server';

console.log('🔍 Environment check:', {
  hasKey: !!process.env.DEEPSEEK_API_KEY,
  keyStart: process.env.DEEPSEEK_API_KEY?.substring(0, 10) + '...'
});

export async function POST(request: NextRequest) {
  try {
    const { 
      arabicWord, 
      context, 
      sourceType = 'general', 
      sourceInfo = {},
      // NEW: Add these fields
      requestType = 'translation',
      segmentText,
      videoId,
      segmentIndex,
      videoTitle,
      previousSegment,
      nextSegment
    } = await request.json();
    
    // Handle transcript cleaning requests FIRST
    if (requestType === 'transcript_cleaning') {
      if (!segmentText) {
        return NextResponse.json({ error: 'Segment text is required' }, { status: 400 });
      }
      
      try {
        const cleanedText = await cleanTranscriptWithDeepSeek(segmentText);
        return NextResponse.json({
          success: true,
          cleanedText: cleanedText,
          originalText: segmentText
        });
      } catch (error: any) {
        return NextResponse.json({
          success: true,
          cleanedText: segmentText, // Return original if cleaning fails
          originalText: segmentText,
          error: error.message
        });
      }
    }
    
    // Handle word translation requests (your existing logic)
    if (!arabicWord) {
      return NextResponse.json({ error: 'Arabic word is required' }, { status: 400 });
    }
    
    console.log('🔄 Translating word:', arabicWord, 'Source type:', sourceType);
    
    // Try DeepSeek with enhanced analysis
    try {
      const deepSeekResult = await translateWithDeepSeek(arabicWord, context, sourceType, sourceInfo);
      if (deepSeekResult) {
        console.log('✅ DeepSeek translation successful:', deepSeekResult);
        return NextResponse.json({
          success: true,
          translation: deepSeekResult,
          source: 'deepseek'
        });
      }
    } catch (deepSeekError) {
      console.warn('⚠️ DeepSeek failed:', deepSeekError);
    }
    
    // Last resort - return partial data with error info
    return NextResponse.json({
      success: true,
      translation: {
        meaningInContext: "Add meaning manually",
        root: "Unknown root",
        rootConnection: "Manual analysis needed",
        morphology: "Pattern analysis needed", 
        grammarExplanation: "Grammar analysis needed",
        grammarSample: context || arabicWord,
        sampleSentence1: arabicWord,
        sampleTranslation1: "Manual translation needed",
        sampleSentence2: arabicWord, 
        sampleTranslation2: "Manual translation needed"
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

// Enhanced DeepSeek Translation with Complete Arabic Analysis
async function translateWithDeepSeek(arabicWord: string, context: string, sourceType: string, sourceInfo: any) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    throw new Error('DeepSeek API key not found');
  }

  console.log('🔑 Analyzing with enhanced Arabic methodology');

  // Generate source-specific prompt with complete analysis
  const prompt = generateCompleteAnalysisPrompt(arabicWord, context, sourceType, sourceInfo);

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
      temperature: 0.1,
      max_tokens: 800 // Increased for detailed analysis
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

  // Clean and parse the enhanced response
  let cleanContent = content;
  cleanContent = cleanContent.replace(/```json\s*/g, '');
  cleanContent = cleanContent.replace(/```\s*/g, '');
  cleanContent = cleanContent.trim();
  
  console.log('🧹 Cleaned content:', cleanContent);

  try {
    const parsed = JSON.parse(cleanContent);
    
    return {
      meaningInContext: parsed.meaningInContext || "Unknown meaning",
      root: parsed.root || "Unknown root",
      rootConnection: parsed.rootConnection || "Connection unknown",
      morphology: parsed.morphology || "Pattern unknown",
      grammarExplanation: parsed.grammarExplanation || "Grammar analysis needed",
      grammarSample: parsed.grammarSample || arabicWord,
      sampleSentence1: parsed.sampleSentence1 || arabicWord,
      sampleTranslation1: parsed.sampleTranslation1 || "Translation needed",
      sampleSentence2: parsed.sampleSentence2 || arabicWord,
      sampleTranslation2: parsed.sampleTranslation2 || "Translation needed"
    };
  } catch (parseError) {
    console.warn('❌ Failed to parse JSON:', parseError);
    
    // Fallback extraction
    return {
      meaningInContext: extractMeaningFromText(content),
      root: "Manual analysis needed",
      rootConnection: "Connection analysis needed", 
      morphology: "Pattern analysis needed",
      grammarExplanation: "Grammar analysis needed",
      grammarSample: arabicWord,
      sampleSentence1: arabicWord,
      sampleTranslation1: "See context above",
      sampleSentence2: arabicWord,
      sampleTranslation2: "Analysis needed"
    };
  }
}

// Generate Complete Analysis Prompts
function generateCompleteAnalysisPrompt(arabicWord: string, context: string, sourceType: string, sourceInfo: any): string {
  const baseInstruction = `You must respond with ONLY valid JSON in this exact format (no markdown, no code blocks, no extra text):

{
  "meaningInContext": "specific meaning of this word in this context/sentence",
  "root": "ج-ذ-ر format with encompassing root meaning",
  "rootConnection": "how this specific word connects to the root concept - why it means what it means",
  "morphology": "pattern breakdown showing changes (like ط[ا]لب showing the added alif)",
  "grammarExplanation": "intuitive explanation of grammar in conversational style - explain like talking to a friend, not academic jargon",
  "grammarSample": "simple Arabic example showing the grammar point with translation",
  "sampleSentence1": "Arabic sentence using the EXACT word form '${arabicWord}'",
  "sampleTranslation1": "English translation of sample sentence 1",
  "sampleSentence2": "different Arabic sentence using EXACT word form '${arabicWord}' - make it memorable/engaging",
  "sampleTranslation2": "English translation of sample sentence 2"
}

CRITICAL REQUIREMENTS:
- Reference Hans Wehr dictionary for accurate root meanings and morphological analysis
- Ensure morphological analysis follows traditional Arabic linguistic methodology as documented in Hans Wehr
- Use CONVERSATIONAL grammar explanations, not academic jargon (like "telling one guy to do something" instead of "masculine singular imperative")
- Make grammar feel logical and intuitive, like Language Transfer teaching style
- Use the EXACT word form "${arabicWord}" in both sample sentences
- Provide complete تصريف information but explain it in simple terms users can understand`;

  switch (sourceType) {
    case 'youtube':
      return generateYouTubeCompletePrompt(arabicWord, context, sourceInfo, baseInstruction);
    
    case 'quran':
      return generateQuranCompletePrompt(arabicWord, context, sourceInfo, baseInstruction);
    
    default:
      return generateGeneralCompletePrompt(arabicWord, context, baseInstruction);
  }
}

function generateYouTubeCompletePrompt(arabicWord: string, context: string, sourceInfo: any, baseInstruction: string): string {
  const videoTitle = sourceInfo.videoTitle || 'Educational video';
  const timestamp = sourceInfo.timestamp ? ` at ${Math.floor(sourceInfo.timestamp / 60)}:${String(Math.floor(sourceInfo.timestamp % 60)).padStart(2, '0')}` : '';
  
  return `Analyze this formal Arabic word from educational content: "${arabicWord}"

Source: ${videoTitle}${timestamp}
Full Context: "${context}"

This word appears in formal Arabic educational content. Provide complete linguistic analysis including:

FOCUS AREAS:
- FORMAL ARABIC (فصحى) analysis suitable for Quranic Arabic learners
- Hans Wehr dictionary methodology for root analysis
- Intuitive grammar explanations that make sense to English speakers
- Complete morphological breakdown showing how the word was built
- Two sample sentences: one formal usage, one creative/memorable example
- Full تصريف analysis explained conversationally

GRAMMAR EXPLANATION STYLE:
Instead of "masculine singular imperative" say "command to one guy - telling him 'you do this!'"
Instead of "passive participle" say "something that got acted upon - it received the action"
Make it feel logical, not academic!

${baseInstruction}`;
}

// COMPLETE REPLACEMENT for generateQuranCompletePrompt function
// Replace in app/api/translate/route.ts

function generateQuranCompletePrompt(arabicWord: string, context: string, sourceInfo: any, baseInstruction: string): string {
  const surahName = sourceInfo.surahName || 'Unknown Surah';
  const surahNumber = sourceInfo.surahNumber || '';
  const verseNumber = sourceInfo.verseNumber || '';
  
  const verseReference = surahNumber && verseNumber ? 
    `Surah ${surahName} (${surahNumber}:${verseNumber})` : 
    surahName;
  
  return `Analyze this Quranic Arabic word: "${arabicWord}"

Source: ${verseReference}
Full Verse Context: "${context}"

This word appears in the Holy Quran. Provide complete classical Arabic analysis following these EXACT requirements:

CRITICAL REQUIREMENTS:
- Reference Hans Wehr dictionary methodology for accurate root meanings and morphological analysis
- Use CONVERSATIONAL grammar explanations like Language Transfer teaching style
- Make grammar feel logical and intuitive, NOT academic
- Find a DIFFERENT Quran verse that uses this EXACT word form (not the source verse)
- If no other Quranic verse exists with exact form, create a realistic Arabic sentence

RESPONSE FORMAT (JSON only, no markdown):
{
  "meaningInContext": "specific meaning of this word in this Quranic context",
  "root": "ج-ذ-ر format with encompassing root meaning from Hans Wehr",
  "rootConnection": "how this specific word connects to the root concept - explain the logical connection",
  "morphology": "pattern breakdown showing construction (like قال + ت = past + female marker)",
  "grammarExplanation": "INTUITIVE explanation using Language Transfer style - explain like talking to a friend, not academic lecture",
  "grammarSample": "simple Arabic example showing the grammar point with translation",
  "sampleSentence1": "DIFFERENT authentic Quranic verse using EXACT word form '${arabicWord}' with reference (2:255 format)",
  "sampleTranslation1": "English translation of sample sentence 1 with verse reference",
  "sampleSentence2": "realistic Arabic sentence using EXACT word form '${arabicWord}' - make it memorable/educational",
  "sampleTranslation2": "English translation of sample sentence 2"
}

GRAMMAR EXPLANATION STYLE EXAMPLES:
Instead of "masculine singular imperative" say → "command to one guy - telling him 'you do this!'"
Instead of "feminine past tense" say → "past action done BY one female - she did this action, the ت shows us a woman did it"
Instead of "passive participle" say → "something that GOT acted upon - it received the action, didn't do the action itself"

SAMPLE SENTENCE 1 REQUIREMENTS:
- Must be a REAL Quranic verse (different from source verse ${verseReference})
- Must use the EXACT word form "${arabicWord}"
- Include verse reference in format like: "من سورة البقرة (2:255)"
- If no authentic Quranic usage exists, create realistic Arabic sentence instead

MORPHOLOGY REQUIREMENTS:
- Show how the word was built (root + additions)
- Explain what each part does (like ت = female marker, ي = present tense marker)
- Use Hans Wehr traditional methodology

GRAMMAR DEPTH:
Explain ALL important aspects but make them intuitive:
- Gender/number (he/she/they doing action)
- Time/tense (when did this happen)
- Voice (who did action vs who received it)
- Key patterns that help recognize similar words
- Skip academic case names unless they change meaning significantly

Make Arabic grammar feel like common sense, not memorization!

${baseInstruction}`;
}
function generateGeneralCompletePrompt(arabicWord: string, context: string, baseInstruction: string): string {
  return `Analyze this Arabic word: "${arabicWord}"
${context ? `Context: "${context}"` : ''}

Provide complete linguistic analysis following Hans Wehr methodology:

REQUIREMENTS:
- Accurate classical Arabic analysis
- Intuitive grammar explanations in conversational style
- Complete morphological breakdown
- Two sample sentences using exact word form
- Root analysis with encompassing meaning

${baseInstruction}`;
}

// Helper function for fallback meaning extraction
function extractMeaningFromText(text: string): string {
  const meaningMatch = text.match(/meaning[:\s]+["]?([^".\n]+)["]?/i);
  if (meaningMatch) {
    return meaningMatch[1].trim();
  }
  
  const sentences = text.split('\n').filter(s => s.trim().length > 0);
  if (sentences.length > 0) {
    return sentences[0].trim().substring(0, 50);
  }
  
  return "Add meaning manually";
}
async function cleanTranscriptWithDeepSeek(segmentText: string) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    throw new Error('DeepSeek API key not found');
  }

  const prompt = `Clean this Arabic speech-to-text transcript segment. You must return ONLY the corrected Arabic text with harakat, nothing else.You MUST add full harakat (diacritics) to this Arabic text. Even if the text looks correct, you MUST add harakat to every single Arabic word.

Rules:
- Fix obvious spelling mistakes
- Remove incomplete words (like "الل" → "الله") 
- Remove false starts (like "في... في الإسلام" → "في الإسلام")
- Add harakat to ALL words
- Use video context to infer correct meaning
- DO NOT add explanations, notes, or anything except the cleaned Arabic text
-You MUST return text that looks different from the original

Video: "${videoTitle || 'Islamic lectures in arabic'}"
Previous segment: "${previousSegment || 'None'}"
Current segment: "${segmentText}"
Next segment: "${nextSegment || 'None'}"

Use the video title and surrounding segments to understand context and fix unclear words.

Return ONLY the cleaned Arabic text with harakat:`;

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 300
    })
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  const data = await response.json();
  const cleanedText = data.choices?.[0]?.message?.content?.trim();
  
  if (!cleanedText) {
    throw new Error('No cleaned text returned');
  }

  return cleanedText;
}
  
