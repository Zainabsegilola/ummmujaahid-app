import { NextRequest, NextResponse } from 'next/server';

console.log('🔍 Environment check:', {
  hasKey: !!process.env.DEEPSEEK_API_KEY,
  keyStart: process.env.DEEPSEEK_API_KEY?.substring(0, 10) + '...'
});

export async function POST(request: NextRequest) {
  try {
    const { arabicWord, context, sourceType = 'general', sourceInfo = {} } = await request.json();
    
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

function generateQuranCompletePrompt(arabicWord: string, context: string, sourceInfo: any, baseInstruction: string): string {
  const surahName = sourceInfo.surahName || 'Unknown Surah';
  const surahNumber = sourceInfo.surahNumber || '';
  const verseNumber = sourceInfo.verseNumber || '';
  
  const verseReference = surahNumber && verseNumber ? 
    `Surah ${surahName} (${surahNumber}), Verse ${verseNumber}` : 
    surahName;
  
  return `Analyze this Quranic Arabic word: "${arabicWord}"

Source: ${verseReference}
Full Verse Context: "${context}"

This word appears in the Holy Quran. Provide complete classical Arabic analysis including:

FOCUS AREAS:
- CLASSICAL QURANIC ARABIC analysis using traditional methodology
- Hans Wehr dictionary for root meanings and patterns
- Reference classical tafsir understanding when relevant (especially Ibn Kathir)
- Complete morphological analysis showing word construction
- Two sample sentences: one authentic Quranic usage, one contextual example
- Full تصريف analysis explained in intuitive terms
- Theological accuracy combined with linguistic precision

GRAMMAR EXPLANATION STYLE:
Explain grammar like talking to a student, not academic lecture:
"Past action done BY one female - the ت shows us a woman did this"
"Command to one male - like telling a guy 'you do this now!'"
Make classical Arabic feel logical and accessible!

SAMPLE SENTENCES:
- First: Another authentic Quranic usage of the exact word form
- Second: Classical Arabic contextual example (can be educational/memorable)

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
