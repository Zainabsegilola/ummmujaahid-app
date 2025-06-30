import { supabase } from './supabase'

// FSRS Parameters - These can be customized per user
const FSRS_PARAMS = {
  w: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61],
  requestRetention: 0.9, // Target retention rate
  maximumInterval: 36500, // ~100 years
  enableFuzz: true
}

// DECK OPERATIONS
export async function createOrGetDeck(videoTitle, videoId, userId) {
  try {
    console.log('Creating/getting deck for:', { videoTitle, videoId, userId });
    
    const { data: existingDeck, error: fetchError } = await supabase
      .from('decks')
      .select('*')
      .eq('user_id', userId)
      .eq('video_id', videoId)
      .single()

    if (existingDeck && !fetchError) {
      console.log('Found existing deck:', existingDeck);
      return { data: existingDeck, error: null }
    }

    console.log('Creating new deck...');
    const { data: newDeck, error: createError } = await supabase
      .from('decks')
      .insert({
        user_id: userId,
        name: videoTitle || `Video ${videoId}`,
        video_id: videoId,
        video_title: videoTitle,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating deck:', createError);
      return { data: null, error: createError }
    }

    console.log('Created new deck:', newDeck);
    return { data: newDeck, error: null }
  } catch (error) {
    console.error('Error in createOrGetDeck:', error)
    return { data: null, error }
  }
}

export async function getUserDecks(userId) {
  try {
    console.log('Fetching decks for user:', userId);
    
    const { data, error } = await supabase
      .from('decks')
      .select(`
        *,
        cards(
          id,
          state,
          due
        )
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching decks:', error);
      throw error;
    }

    console.log('Raw deck data:', data);

    const decksWithCounts = data.map(deck => {
      const cards = deck.cards || []
      const newCards = cards.filter(card => card.state === 'new').length
      const reviewCards = cards.filter(card => 
        (card.state === 'review' || card.state === 'relearning') && 
        new Date(card.due) <= new Date()
      ).length
      const learningCards = cards.filter(card => card.state === 'learning').length
      const totalCards = cards.length

      return {
        ...deck,
        newCards,
        reviewCards,
        learningCards,
        totalCards,
        cards: undefined // Remove cards array to reduce data size
      }
    })

    console.log('Processed decks:', decksWithCounts);
    return { data: decksWithCounts, error: null }
  } catch (error) {
    console.error('Error fetching user decks:', error)
    return { data: [], error }
  }
}

// CARD OPERATIONS
// Also update the database function to handle better context
export const addCardToDeck = async (deckId, arabicWord, context, videoTimestamp, userId, translationData = null) => {
  try {
    const cardData = {
      deck_id: deckId,
      user_id: userId,
      arabic_word: arabicWord,
      context: context,
      video_timestamp: videoTimestamp,
      state: 'new',
      due: new Date().toISOString()
    };

    // Add translation data if available
    if (translationData) {
      // OLD FIELDS (keep for backward compatibility)
      cardData.english_meaning = translationData.meaningInContext || translationData.meaning || "No meaning available";
      cardData.part_of_speech = translationData.grammarExplanation || translationData.partOfSpeech || "Unknown";
      cardData.sample_sentence = translationData.sampleSentence1 || translationData.sampleSentence || arabicWord;
      cardData.sample_translation = translationData.sampleTranslation1 || translationData.sampleTranslation || "No translation available";
      
      // NEW ENHANCED FIELDS - LOWERCASE to match your database schema
      cardData.meaningincontext = translationData.meaningInContext || "No meaning available";
      cardData.root = translationData.root || "Unknown root";
      cardData.rootconnection = translationData.rootConnection || "Root connection unknown";
      cardData.morphology = translationData.morphology || "Morphology unknown";
      cardData.grammarexplanation = translationData.grammarExplanation || "Grammar explanation needed";
      cardData.grammarsample = translationData.grammarSample || arabicWord;
      cardData.samplesentence1 = translationData.sampleSentence1 || arabicWord;
      cardData.sampletranslation1 = translationData.sampleTranslation1 || "Translation needed";
      cardData.samplesentence2 = translationData.sampleSentence2 || arabicWord;
      cardData.sampletranslation2 = translationData.sampleTranslation2 || "Translation needed";
      
      // ROOT LETTERS (already exists in your schema)
      cardData.root_letters = translationData.root || "Unknown";
    } else {
      // Fallback values when no translation data
      cardData.english_meaning = "Add meaning manually";
      cardData.part_of_speech = "Unknown";
      cardData.sample_sentence = arabicWord;
      cardData.sample_translation = "Add translation manually";
      
      // Enhanced fields fallbacks - LOWERCASE
      cardData.meaningincontext = "Add meaning manually";
      cardData.root = "Unknown root";
      cardData.rootconnection = "Manual analysis needed";
      cardData.morphology = "Pattern analysis needed";
      cardData.grammarexplanation = "Grammar analysis needed";
      cardData.grammarsample = arabicWord;
      cardData.samplesentence1 = arabicWord;
      cardData.sampletranslation1 = "Manual translation needed";
      cardData.samplesentence2 = arabicWord;
      cardData.sampletranslation2 = "Manual translation needed";
      cardData.root_letters = "Unknown";
    }

    console.log('🔄 Saving YouTube card with enhanced data:', cardData);

    const { data, error } = await supabase
      .from('cards')
      .insert(cardData)
      .select()
      .single();

    if (error) {
      console.error('❌ Database insert error:', error);
    } else {
      console.log('✅ Card saved successfully:', data);
    }

    return { data, error };
  } catch (error) {
    console.error('❌ addCardToDeck error:', error);
    return { data: null, error };
  }
};


// 2. ENHANCED addQuranCard function - REPLACE YOUR EXISTING ONE
export async function addQuranCard(deckId, arabicWord, surahNumber, verseNumber, wordPosition, context, userId, translationData = null) {
  try {
    const cardData = {
      deck_id: deckId,
      user_id: userId,
      arabic_word: arabicWord,
      context: context,
      surah_number: surahNumber,
      verse_number: verseNumber,
      word_position: wordPosition,
      source_type: 'quran',
      state: 'new',
      due: new Date().toISOString()
    };

    // Add translation data if available
    if (translationData) {
      // OLD FIELDS (keep for backward compatibility)
      cardData.english_meaning = translationData.meaningInContext || translationData.meaning || "No meaning available";
      cardData.part_of_speech = translationData.grammarExplanation || translationData.partOfSpeech || "Unknown";
      cardData.sample_sentence = translationData.sampleSentence1 || translationData.sampleSentence || arabicWord;
      cardData.sample_translation = translationData.sampleTranslation1 || translationData.sampleTranslation || "No translation available";
      
      // NEW ENHANCED FIELDS - LOWERCASE to match your database schema
      cardData.meaningincontext = translationData.meaningInContext || "No meaning available";
      cardData.root = translationData.root || "Unknown root";
      cardData.rootconnection = translationData.rootConnection || "Root connection unknown";
      cardData.morphology = translationData.morphology || "Morphology unknown";
      cardData.grammarexplanation = translationData.grammarExplanation || "Grammar explanation needed";
      cardData.grammarsample = translationData.grammarSample || arabicWord;
      cardData.samplesentence1 = translationData.sampleSentence1 || arabicWord;
      cardData.sampletranslation1 = translationData.sampleTranslation1 || "Translation needed";
      cardData.samplesentence2 = translationData.sampleSentence2 || arabicWord;
      cardData.sampletranslation2 = translationData.sampleTranslation2 || "Translation needed";
      
      // ROOT LETTERS (already exists in your schema)
      cardData.root_letters = translationData.root || "Unknown";
    } else {
      // Fallback values when no translation data
      cardData.english_meaning = "Add meaning manually";
      cardData.part_of_speech = "Unknown";
      cardData.sample_sentence = arabicWord;
      cardData.sample_translation = "Add translation manually";
      
      // Enhanced fields fallbacks - LOWERCASE
      cardData.meaningincontext = "Add meaning manually";
      cardData.root = "Unknown root";
      cardData.rootconnection = "Manual analysis needed";
      cardData.morphology = "Pattern analysis needed";
      cardData.grammarexplanation = "Grammar analysis needed";
      cardData.grammarsample = arabicWord;
      cardData.samplesentence1 = arabicWord;
      cardData.sampletranslation1 = "Manual translation needed";
      cardData.samplesentence2 = arabicWord;
      cardData.sampletranslation2 = "Manual translation needed";
      cardData.root_letters = "Unknown";
    }

    console.log('🔄 Saving Quran card with enhanced data:', cardData);

    const { data, error } = await supabase
      .from('cards')
      .insert(cardData)
      .select()
      .single();

    if (error) {
      console.error('❌ Database insert error:', error);
    } else {
      console.log('✅ Quran card saved successfully:', data);
    }

    return { data, error };
  } catch (error) {
    console.error('❌ addQuranCard error:', error);
    return { data: null, error };
  }
}


// FSRS ALGORITHM IMPLEMENTATION
function initDS(w) {
  return w[4] - Math.exp(w[5] * (w[6] + 1)) + 1
}

function initStability(w, rating) {
  return Math.max(w[rating - 1], 0.1)
}

function forgettingCurve(elapsedDays, stability) {
  return Math.pow(1 + elapsedDays / (9 * stability), -1)
}

function nextInterval(stability) {
  const newInterval = (9 * stability / FSRS_PARAMS.requestRetention) * 
    (Math.pow(FSRS_PARAMS.requestRetention, 1/3) - 1)
  return Math.min(Math.max(Math.round(newInterval), 1), FSRS_PARAMS.maximumInterval)
}

function nextDifficulty(d, rating) {
  const w = FSRS_PARAMS.w
  const nextD = w[7] * initDS(w) + (1 - w[7]) * (d - w[6] * (rating - 3))
  return Math.min(Math.max(nextD, 1), 10)
}

function shortTermStability(s, rating) {
  const w = FSRS_PARAMS.w
  return s * Math.exp(w[8] * (rating - 3 + w[9]))
}

function nextRecallStability(d, s, r, rating) {
  const w = FSRS_PARAMS.w
  const hardPenalty = rating === 2 ? w[15] : 1
  const easyBonus = rating === 4 ? w[16] : 1
  return s * (1 + Math.exp(w[10]) * 
    (11 - d) * 
    Math.pow(s, -w[11]) * 
    (Math.exp((1 - r) * w[12]) - 1) * 
    hardPenalty * 
    easyBonus)
}

function nextForgetStability(d, s, r) {
  const w = FSRS_PARAMS.w
  return w[13] * Math.pow(d, -w[14]) * Math.pow(s + 1, w[14]) * Math.exp((1 - r) * w[15])
}

function applyFuzz(interval) {
  if (!FSRS_PARAMS.enableFuzz || interval < 2.5) return interval
  const fuzzRange = interval < 7 ? 1 : Math.max(1, Math.round(interval * 0.05))
  const fuzz = Math.random() * (fuzzRange * 2) - fuzzRange
  return Math.max(1, Math.round(interval + fuzz))
}

export function fsrsCalculateNext(card, rating) {
  const w = FSRS_PARAMS.w
  const { stability, difficulty, state, reps, lapses, last_review } = card
  
  const now = new Date()
  const elapsedDays = last_review ? 
    Math.max(0, (now.getTime() - new Date(last_review).getTime()) / (1000 * 60 * 60 * 24)) : 0

  let newStability = stability
  let newDifficulty = difficulty
  let newState = state
  let newReps = reps
  let newLapses = lapses
  let scheduledDays = 0

  if (state === 'new') {
    newReps = 1
    newDifficulty = initDS(w) + (rating - 3) * w[6]
    newDifficulty = Math.min(Math.max(newDifficulty, 1), 10)
    
    if (rating === 1) {
      newState = 'learning'
      newStability = initStability(w, rating)
      scheduledDays = 0
    } else if (rating === 2) {
      newState = 'learning'
      newStability = initStability(w, rating)
      scheduledDays = 0
    } else if (rating === 3) {
      newState = 'learning'
      newStability = initStability(w, rating)
      scheduledDays = 0
    } else { // rating === 4
      newState = 'review'
      newStability = initStability(w, rating)
      scheduledDays = nextInterval(newStability)
    }
  } else if (state === 'learning' || state === 'relearning') {
    if (rating === 1) {
      newState = 'learning'
      newStability = shortTermStability(stability, rating)
      scheduledDays = 0
    } else if (rating === 2) {
      newState = 'learning'
      newStability = shortTermStability(stability, rating)
      scheduledDays = 0
    } else if (rating === 3) {
      newState = 'review'
      newStability = shortTermStability(stability, rating)
      scheduledDays = nextInterval(newStability)
      newReps += 1
    } else { // rating === 4
      newState = 'review'
      newStability = shortTermStability(stability, rating)
      scheduledDays = Math.max(nextInterval(newStability), 1)
      newReps += 1
    }
  } else if (state === 'review') {
    newReps += 1
    newDifficulty = nextDifficulty(difficulty, rating)
    
    const retrievability = forgettingCurve(elapsedDays, stability)
    
    if (rating === 1) {
      newState = 'relearning'
      newStability = nextForgetStability(newDifficulty, stability, retrievability)
      newLapses += 1
      scheduledDays = 0
    } else {
      newStability = nextRecallStability(newDifficulty, stability, retrievability, rating)
      scheduledDays = nextInterval(newStability)
      if (FSRS_PARAMS.enableFuzz) {
        scheduledDays = applyFuzz(scheduledDays)
      }
    }
  }

  const due = new Date()
  due.setDate(due.getDate() + scheduledDays)

  return {
    stability: newStability,
    difficulty: newDifficulty,
    elapsed_days: elapsedDays,
    scheduled_days: scheduledDays,
    reps: newReps,
    lapses: newLapses,
    state: newState,
    due: due.toISOString(),
    last_review: now.toISOString(),
    updated_at: now.toISOString()
  }
}

export async function reviewCard(cardId, rating, userId) {
  console.log('=== reviewCard START ===');
  console.log('Input:', { cardId, rating, userId });
  
  // Validate inputs first
  if (!cardId) {
    console.error('Missing cardId');
    return { data: null, error: { message: 'Card ID is required' } };
  }
  
  if (!userId) {
    console.error('Missing userId');
    return { data: null, error: { message: 'User ID is required' } };
  }
  
  if (!rating || rating < 1 || rating > 4) {
    console.error('Invalid rating:', rating);
    return { data: null, error: { message: 'Rating must be between 1 and 4' } };
  }

  try {
    // Fetch the card
    console.log('Fetching card from database...');
    const { data: card, error: fetchError } = await supabase
      .from('cards')
      .select('*')
      .eq('id', cardId)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error('Database fetch error:', fetchError);
      return { 
        data: null, 
        error: { 
          message: `Failed to fetch card: ${fetchError.message}`,
          details: fetchError 
        } 
      };
    }

    if (!card) {
      console.error('Card not found');
      return { data: null, error: { message: 'Card not found' } };
    }

    console.log('Card fetched successfully:', card);

    // Calculate FSRS updates
    console.log('Calculating FSRS updates...');
    const rawFsrsUpdate = fsrsCalculateNext(card, rating);
    console.log('Raw FSRS calculation result:', rawFsrsUpdate);

    // Validate the FSRS update
    const validationErrors = validateFSRSUpdate(rawFsrsUpdate);
    if (validationErrors.length > 0) {
      console.error('FSRS validation errors:', validationErrors);
      return { 
        data: null, 
        error: { 
          message: `Invalid FSRS calculation: ${validationErrors.join(', ')}`,
          details: { rawFsrsUpdate, validationErrors }
        } 
      };
    }

    // Clean the FSRS update - ensure all numbers are finite
    const fsrsUpdate = {
      stability: Math.max(0.1, Number(rawFsrsUpdate.stability.toFixed(3))),
      difficulty: Math.max(1, Math.min(10, Number(rawFsrsUpdate.difficulty.toFixed(3)))),
      elapsed_days: Math.max(0, Math.floor(rawFsrsUpdate.elapsed_days)),
      scheduled_days: Math.max(0, Math.floor(rawFsrsUpdate.scheduled_days)),
      reps: Math.max(0, Math.floor(rawFsrsUpdate.reps)),
      lapses: Math.max(0, Math.floor(rawFsrsUpdate.lapses)),
      state: rawFsrsUpdate.state,
      due: rawFsrsUpdate.due,
      last_review: rawFsrsUpdate.last_review,
      updated_at: rawFsrsUpdate.updated_at
    };

    console.log('Cleaned FSRS update:', fsrsUpdate);

    // Update the card
    console.log('Updating card in database...');
    const { data: updatedCard, error: updateError } = await supabase
      .from('cards')
      .update(fsrsUpdate)
      .eq('id', cardId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      return { 
        data: null, 
        error: { 
          message: `Failed to update card: ${updateError.message || 'Unknown database error'}`,
          details: { updateError, fsrsUpdate }
        } 
      };
    }

    if (!updatedCard) {
      console.error('No card returned from update');
      return { data: null, error: { message: 'Card update failed - no data returned' } };
    }

    console.log('Card updated successfully:', updatedCard);

    // Add review history (non-critical)
    try {
      console.log('Adding review history...');
      await supabase.from('review_history').insert({
        card_id: cardId,
        user_id: userId,
        rating: rating,
        previous_interval: card.scheduled_days || 0,
        new_interval: fsrsUpdate.scheduled_days || 0,
        created_at: new Date().toISOString()
      });
      console.log('Review history added successfully');
    } catch (historyError) {
      console.warn('Review history failed (non-critical):', historyError);
      // Don't fail the whole operation for history
    }

    console.log('=== reviewCard SUCCESS ===');
    return { data: updatedCard, error: null };

  } catch (error) {
    console.error('=== reviewCard FAILED ===');
    console.error('Unexpected error:', error);
    return { 
      data: null, 
      error: { 
        message: error?.message || 'An unexpected error occurred',
        details: error 
      } 
    };
  }
}

export async function getCardsForReview(deckId, userId, limit = 20) {
  try {
    const now = new Date()
    
    const { data, error } = await supabase
      .from('cards')
      .select(`
        *,
        meaningincontext,
        root,
        rootconnection,
        morphology,
        grammarexplanation,
        grammarsample,
        samplesentence1,
        sampletranslation1,
        samplesentence2,
        sampletranslation2
      `)
      .eq('deck_id', deckId)
      .eq('user_id', userId)
      .lte('due', now.toISOString())
      .in('state', ['new', 'learning', 'review', 'relearning'])
      .order('state', { ascending: true })
      .order('due', { ascending: true })
      .limit(limit)

    console.log('📚 Cards for review loaded:', data?.length || 0);
    return { data: data || [], error }
  } catch (error) {
    console.error('Error fetching cards for review:', error)
    return { data: [], error }
  }
}

// UTILITY FUNCTIONS
export function cleanArabicWord(word) {
  if (!word || typeof word !== 'string') {
    console.warn('Invalid word passed to cleanArabicWord:', word);
    return '';
  }
  
  // Remove non-Arabic characters and trim
  const cleaned = word.replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g, '').trim();
  console.log('Cleaned Arabic word:', { original: word, cleaned });
  return cleaned;
}

export function getContextSentence(transcript, targetTimestamp, wordText) {
  if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
    console.warn('Invalid transcript for context:', transcript);
    return wordText || '';
  }
  
  console.log('Getting context for:', { targetTimestamp, wordText, transcriptLength: transcript.length });
  
  const segment = transcript.find(seg => 
    Math.abs(seg.start - targetTimestamp) < 2 && 
    seg.text && seg.text.includes(wordText)
  )
  
  if (!segment) {
    console.log('No matching segment found, using word text');
    return wordText || '';
  }

  const segmentIndex = transcript.findIndex(seg => seg === segment)
  const contextSegments = []
  
  // Add previous segment for context
  if (segmentIndex > 0 && transcript[segmentIndex - 1].text) {
    contextSegments.push(transcript[segmentIndex - 1].text)
  }
  
  // Add current segment
  contextSegments.push(segment.text)
  
  // Add next segment for context
  if (segmentIndex < transcript.length - 1 && transcript[segmentIndex + 1].text) {
    contextSegments.push(transcript[segmentIndex + 1].text)
  }
  
  const context = contextSegments.join(' ').trim();
  console.log('Generated context:', context);
  return context || wordText || '';
}
// Add this helper function to validate FSRS data
function validateFSRSUpdate(fsrsUpdate) {
  const errors = [];
  
  // Check for required fields and valid values
  if (typeof fsrsUpdate.stability !== 'number' || isNaN(fsrsUpdate.stability) || fsrsUpdate.stability <= 0) {
    errors.push(`Invalid stability: ${fsrsUpdate.stability}`);
  }
  
  if (typeof fsrsUpdate.difficulty !== 'number' || isNaN(fsrsUpdate.difficulty) || fsrsUpdate.difficulty < 1 || fsrsUpdate.difficulty > 10) {
    errors.push(`Invalid difficulty: ${fsrsUpdate.difficulty}`);
  }
  
  if (typeof fsrsUpdate.elapsed_days !== 'number' || isNaN(fsrsUpdate.elapsed_days) || fsrsUpdate.elapsed_days < 0) {
    errors.push(`Invalid elapsed_days: ${fsrsUpdate.elapsed_days}`);
  }
  
  if (typeof fsrsUpdate.scheduled_days !== 'number' || isNaN(fsrsUpdate.scheduled_days) || fsrsUpdate.scheduled_days < 0) {
    errors.push(`Invalid scheduled_days: ${fsrsUpdate.scheduled_days}`);
  }
  
  if (typeof fsrsUpdate.reps !== 'number' || isNaN(fsrsUpdate.reps) || fsrsUpdate.reps < 0) {
    errors.push(`Invalid reps: ${fsrsUpdate.reps}`);
  }
  
  if (typeof fsrsUpdate.lapses !== 'number' || isNaN(fsrsUpdate.lapses) || fsrsUpdate.lapses < 0) {
    errors.push(`Invalid lapses: ${fsrsUpdate.lapses}`);
  }
  
  if (!fsrsUpdate.state || !['new', 'learning', 'review', 'relearning'].includes(fsrsUpdate.state)) {
    errors.push(`Invalid state: ${fsrsUpdate.state}`);
  }
  
  if (!fsrsUpdate.due || isNaN(Date.parse(fsrsUpdate.due))) {
    errors.push(`Invalid due date: ${fsrsUpdate.due}`);
  }
  
  if (!fsrsUpdate.last_review || isNaN(Date.parse(fsrsUpdate.last_review))) {
    errors.push(`Invalid last_review date: ${fsrsUpdate.last_review}`);
  }
  
  return errors;
}
// Add these to the bottom of your existing database.js file

// QURAN-SPECIFIC FUNCTIONS

export async function getUserQuranSettings(userId) {
  try {
    const { data, error } = await supabase
      .from('user_quran_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching Quran settings:', error);
      return { data: null, error };
    }

    // Return default settings if none exist
    const defaultSettings = {
      preferred_reciter_id: 3, // Mishary Al-Afasy
      preferred_translation: 131,
      show_translation: false,
      auto_scroll: true,
      current_surah: 1,
      current_verse: 1,
      total_listening_minutes: 0
    };

    return { data: data || defaultSettings, error: null };
  } catch (error) {
    console.error('Error in getUserQuranSettings:', error);
    return { data: null, error };
  }
}

export async function updateQuranSettings(userId, settings) {
  try {
    const { data, error } = await supabase
      .from('user_quran_settings')
      .upsert({
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Error updating Quran settings:', error);
    return { data: null, error };
  }
}

export async function updateSurahProgress(userId, surahNumber, verseNumber, listeningSeconds = 0) {
  try {
    const { data, error } = await supabase
      .from('surah_progress')
      .upsert({
        user_id: userId,
        surah_number: surahNumber,
        last_verse_read: verseNumber,
        listening_time_seconds: listeningSeconds,
        last_accessed: new Date().toISOString()
      })
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Error updating surah progress:', error);
    return { data: null, error };
  }
}

export const addQuranCardWithTranslation = async (deckId, arabicWord, surahNumber, verseNumber, wordPosition, context, userId, translationData = null) => {
  try {
    const cardData = {
      deck_id: deckId,
      user_id: userId,
      arabic_word: arabicWord,
      context: context,
      surah_number: surahNumber,
      verse_number: verseNumber,
      word_position: wordPosition,
      source_type: 'quran',
      state: 'new',
      due: new Date().toISOString()
    };

    // Add translation data if available
    if (translationData) {
      cardData.english_meaning = translationData.meaning;
      cardData.root_letters = translationData.root;
      cardData.part_of_speech = translationData.partOfSpeech;
      cardData.sample_sentence = translationData.sampleSentence;
      cardData.sample_translation = translationData.sampleTranslation;
    }

    const { data, error } = await supabase
      .from('cards')
      .insert(cardData)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export async function createSurahDeck(surahName, surahNumber, userId) {
  try {
    const deckName = `${surahName} (Surah ${surahNumber})`;
    
    const { data: existingDeck, error: fetchError } = await supabase
      .from('decks')
      .select('*')
      .eq('user_id', userId)
      .eq('name', deckName)
      .single();

    if (existingDeck && !fetchError) {
      return { data: existingDeck, error: null };
    }

    const { data: newDeck, error: createError } = await supabase
      .from('decks')
      .insert({
        user_id: userId,
        name: deckName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    return { data: newDeck, error: createError };
  } catch (error) {
    console.error('Error in createSurahDeck:', error);
    return { data: null, error };
  }
}
// Community Posts Functions
export async function createCommunityPostWithMedia(userId, content, contentTranslation, postType = 'text', mediaFile = null, studyProofType = null) {
  try {
    console.log('Creating post with media:', { userId, content, postType, hasMedia: !!mediaFile });
    
    let mediaUrl = null;
    let mediaThumbnailUrl = null;

    // Upload media if provided
    if (mediaFile) {
      console.log('Uploading media file...');
      
      const formData = new FormData();
      formData.append('media', mediaFile);

      const uploadResponse = await fetch('/api/upload-media', {
        method: 'POST',
        body: formData
      });

      const uploadResult = await uploadResponse.json();
      
      if (!uploadResponse.ok || !uploadResult.success) {
        throw new Error(uploadResult.error || 'Media upload failed');
      }

      mediaUrl = uploadResult.url;
      mediaThumbnailUrl = uploadResult.url; // For now, use same URL
      postType = uploadResult.type; // 'image', 'video', or 'audio'
      
      console.log('Media uploaded successfully:', uploadResult);
    }

    // Create the post
    const { data, error } = await supabase
      .from('community_posts')
      .insert({
        user_id: userId,
        content: content,
        content_translation: contentTranslation,
        post_type: postType,
        media_url: mediaUrl,
        media_thumbnail_url: mediaThumbnailUrl,
        study_proof_type: studyProofType,
        is_verified: true,
        likes_count: 0,
        encouragements_count: 0,
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        user_profiles (
          display_name,
          username,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Error creating post:', error);
      return { data: null, error };
    }

    // Add user display info to response
    const postWithUserData = {
      ...data,
      likes_count: 0,
      encouragements_count: 0,
      user_display_name: data.user_profiles?.display_name || 
                        data.user_profiles?.username || 
                        'User',
      user_avatar: data.user_profiles?.avatar_url || null
    };

    console.log('Post creation result:', postWithUserData);
    return { data: postWithUserData, error: null };
  } catch (error) {
    console.error('Error creating community post with media:', error);
    return { data: null, error };
  }
}

export async function getCommunityPostsWithUsers(limit = 20, offset = 0) {
  try {
    console.log('Fetching community posts with user data...');
    
    const { data, error } = await supabase
      .from('community_posts')
      .select(`
        *,
        user_profiles (
          display_name,
          username,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    console.log('Raw Supabase response:', { data, error });

    if (error) {
      console.error('Supabase error details:', {
        message: error.message,
        details: error.details,
        code: error.code,
        hint: error.hint
      });
      return { data: [], error: error };
    }

    // Get interaction counts for each post
    const postsWithCounts = await Promise.all(
      (data || []).map(async (post) => {
        const { data: interactions, error: interactionError } = await supabase
          .from('post_interactions')
          .select('interaction_type')
          .eq('post_id', post.id);

        if (interactionError) {
          console.error('Error fetching interactions for post:', post.id, interactionError);
        }

        // Count likes and encouragements
        const likes_count = interactions?.filter(i => i.interaction_type === 'like').length || 0;
        const encouragements_count = interactions?.filter(i => i.interaction_type === 'encouragement').length || 0;

        return {
          ...post,
          likes_count,
          encouragements_count,
          // Add user display info with fallbacks
          user_display_name: post.user_profiles?.display_name || 
                            post.user_profiles?.username || 
                            'User',
          user_avatar: post.user_profiles?.avatar_url || null
        };
      })
    );

    console.log('Successfully fetched posts with user data:', postsWithCounts?.length || 0);
    return { data: postsWithCounts || [], error: null };
  } catch (error) {
    console.error('Error fetching community posts with users:', error);
    return { data: [], error };
  }
}
export async function interactWithPostPersistent(postId, userId, interactionType) {
  try {
    console.log('Interacting with post:', { postId, userId, interactionType });
    
    // First, check if interaction already exists
    const { data: existing, error: checkError } = await supabase
      .from('post_interactions')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .eq('interaction_type', interactionType)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing interaction:', checkError);
      return { data: null, error: checkError };
    }

    let newCount;
    if (existing) {
      // Remove interaction if it exists (toggle off)
      const { error: deleteError } = await supabase
        .from('post_interactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId)
        .eq('interaction_type', interactionType);

      if (deleteError) {
        console.error('Error removing interaction:', deleteError);
        return { data: null, error: deleteError };
      }

      // Update count in community_posts table
      const countField = `${interactionType}s_count`;
      const { data: updatedPost, error: updateError } = await supabase
        .from('community_posts')
        .update({
          [countField]: Math.max(0, (existing[countField] || 1) - 1)
        })
        .eq('id', postId)
        .select(countField)
        .single();

      newCount = updatedPost?.[countField] || 0;
      console.log('Removed interaction, new count:', newCount);
      return { data: { action: 'removed', newCount }, error: null };
      
    } else {
      // Add new interaction
      const { data: newInteraction, error: insertError } = await supabase
        .from('post_interactions')
        .insert({
          post_id: postId,
          user_id: userId,
          interaction_type: interactionType
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error adding interaction:', insertError);
        return { data: null, error: insertError };
      }

      // Update count in community_posts table
      const countField = `${interactionType}s_count`;
      const { data: currentPost } = await supabase
        .from('community_posts')
        .select(countField)
        .eq('id', postId)
        .single();

      newCount = (currentPost?.[countField] || 0) + 1;

      const { error: updateError } = await supabase
        .from('community_posts')
        .update({
          [countField]: newCount
        })
        .eq('id', postId);

      if (updateError) {
        console.error('Error updating post count:', updateError);
        return { data: null, error: updateError };
      }

      console.log('Added interaction, new count:', newCount);
      return { data: { action: 'added', newCount, ...newInteraction }, error: null };
    }
  } catch (error) {
    console.error('Error interacting with post:', error);
    return { data: null, error };
  }
}
export async function createOrUpdateUserProfile(userId, profileData) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        ...profileData,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { data: null, error };
  }
}
// Test function - add this temporarily
export async function testCommunityConnection() {
  try {
    console.log('Testing community posts connection...');
    const { data, error, count } = await supabase
      .from('community_posts')
      .select('*', { count: 'exact' })
      .limit(1);
    
    console.log('Test result:', { data, error, count });
    return { data, error, count };
  } catch (error) {
    console.error('Test connection failed:', error);
    return { data: null, error, count: 0 };
  }
}
// Add these functions to your existing database.js file

// CARD MANAGEMENT FUNCTIONS

// Get all cards in a deck with full details
export async function getCardsInDeck(deckId, userId) {
  try {
    console.log('Fetching cards for deck:', deckId);
    
    const { data, error } = await supabase
      .from('cards')
      .select(`
        *,
        decks!inner(name, video_title)
      `)
      .eq('deck_id', deckId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching cards in deck:', error);
      return { data: [], error };
    }

    // Format the data for display
    const formattedCards = data.map(card => ({
      ...card,
      deck_name: card.decks?.name || card.decks?.video_title || 'Unknown Deck',
      // Format context for display (truncate if too long)
      display_context: card.context ? 
        (card.context.length > 100 ? card.context.substring(0, 100) + '...' : card.context) 
        : 'No context',
      // Format source info
      source_info: card.video_timestamp ? 
        `Video: ${formatTime(card.video_timestamp)}` :
        card.surah_number ? 
          `Quran: ${card.surah_number}:${card.verse_number}` :
          'Unknown source',
      // Calculate days until due
      days_until_due: card.due ? 
        Math.ceil((new Date(card.due) - new Date()) / (1000 * 60 * 60 * 24)) : 0
    }));

    return { data: formattedCards, error: null };
  } catch (error) {
    console.error('Error in getCardsInDeck:', error);
    return { data: [], error };
  }
}

// Delete a single card
export async function deleteCard(cardId, userId) {
  try {
    console.log('Deleting card:', cardId);
    
    // First get the card data for undo functionality
    const { data: cardData, error: fetchError } = await supabase
      .from('cards')
      .select('*')
      .eq('id', cardId)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      return { data: null, error: fetchError };
    }

    // Delete the card
    const { error: deleteError } = await supabase
      .from('cards')
      .delete()
      .eq('id', cardId)
      .eq('user_id', userId);

    if (deleteError) {
      return { data: null, error: deleteError };
    }

    return { data: cardData, error: null };
  } catch (error) {
    console.error('Error deleting card:', error);
    return { data: null, error };
  }
}

// Delete multiple cards
export async function deleteMultipleCards(cardIds, userId) {
  try {
    console.log('Deleting multiple cards:', cardIds);
    
    // First get the cards data for undo functionality
    const { data: cardsData, error: fetchError } = await supabase
      .from('cards')
      .select('*')
      .in('id', cardIds)
      .eq('user_id', userId);

    if (fetchError) {
      return { data: null, error: fetchError };
    }

    // Delete the cards
    const { error: deleteError } = await supabase
      .from('cards')
      .delete()
      .in('id', cardIds)
      .eq('user_id', userId);

    if (deleteError) {
      return { data: null, error: deleteError };
    }

    return { data: cardsData, error: null };
  } catch (error) {
    console.error('Error deleting multiple cards:', error);
    return { data: null, error };
  }
}

// Restore a deleted card (for undo functionality)
export async function restoreCard(cardData) {
  try {
    console.log('Restoring card:', cardData.id);
    
    const { data, error } = await supabase
      .from('cards')
      .insert(cardData)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Error restoring card:', error);
    return { data: null, error };
  }
}

// Suspend/unsuspend a card
export async function toggleCardSuspension(cardId, userId, suspend = true) {
  try {
    console.log('Toggling card suspension:', cardId, suspend);
    
    const updates = suspend ? 
      { state: 'suspended', updated_at: new Date().toISOString() } :
      { state: 'new', updated_at: new Date().toISOString() };

    const { data, error } = await supabase
      .from('cards')
      .update(updates)
      .eq('id', cardId)
      .eq('user_id', userId)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Error toggling card suspension:', error);
    return { data: null, error };
  }
}

// Update card content
export async function updateCardContent(cardId, userId, updates) {
  try {
    console.log('Updating card content:', cardId, updates);
    
    const { data, error } = await supabase
      .from('cards')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', cardId)
      .eq('user_id', userId)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Error updating card content:', error);
    return { data: null, error };
  }
}

// Helper function to format time (if not already exists)
function formatTime(seconds) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
// Add these functions to your database.js file

// Soft delete a deck and all its cards
export async function softDeleteDeck(deckId, userId) {
  try {
    console.log('Soft deleting deck:', deckId);
    
    // Step 1: Get the deck data we want to preserve
    const { data: deckData, error: deckError } = await supabase
      .from('decks')
      .select('*')
      .eq('id', deckId)
      .eq('user_id', userId)
      .single();

    if (deckError || !deckData) {
      return { data: null, error: deckError || new Error('Deck not found') };
    }

    // Step 2: Get all cards in this deck
    const { data: cardsData, error: cardsError } = await supabase
      .from('cards')
      .select('*')
      .eq('deck_id', deckId)
      .eq('user_id', userId);

    if (cardsError) {
      return { data: null, error: cardsError };
    }

    // Step 3: Store in deleted_decks table for recovery
    const { data: deletedRecord, error: insertError } = await supabase
      .from('deleted_decks')
      .insert({
        original_deck_id: deckId,
        user_id: userId,
        deck_data: deckData,
        cards_data: cardsData || []
      })
      .select()
      .single();

    if (insertError) {
      return { data: null, error: insertError };
    }

    // Step 4: Delete all cards first (foreign key constraint)
    if (cardsData && cardsData.length > 0) {
      const { error: deleteCardsError } = await supabase
        .from('cards')
        .delete()
        .eq('deck_id', deckId)
        .eq('user_id', userId);

      if (deleteCardsError) {
        return { data: null, error: deleteCardsError };
      }
    }

    // Step 5: Delete the deck
    const { error: deleteDeckError } = await supabase
      .from('decks')
      .delete()
      .eq('id', deckId)
      .eq('user_id', userId);

    if (deleteDeckError) {
      return { data: null, error: deleteDeckError };
    }

    return { 
      data: {
        deletedRecord,
        deckName: deckData.name,
        cardCount: cardsData ? cardsData.length : 0
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Error in softDeleteDeck:', error);
    return { data: null, error };
  }
}

// Restore a deleted deck
export async function restoreDeletedDeck(deletedRecordId, userId) {
  try {
    console.log('Restoring deleted deck:', deletedRecordId);
    
    // Step 1: Get the deleted deck record
    const { data: deletedRecord, error: fetchError } = await supabase
      .from('deleted_decks')
      .select('*')
      .eq('id', deletedRecordId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !deletedRecord) {
      return { data: null, error: fetchError || new Error('Deleted deck not found') };
    }

    // Step 2: Restore the deck
    const { data: restoredDeck, error: restoreDeckError } = await supabase
      .from('decks')
      .insert(deletedRecord.deck_data)
      .select()
      .single();

    if (restoreDeckError) {
      return { data: null, error: restoreDeckError };
    }

    // Step 3: Restore all cards
    if (deletedRecord.cards_data && deletedRecord.cards_data.length > 0) {
      const { error: restoreCardsError } = await supabase
        .from('cards')
        .insert(deletedRecord.cards_data);

      if (restoreCardsError) {
        // If cards fail to restore, we should probably delete the deck again
        await supabase.from('decks').delete().eq('id', restoredDeck.id);
        return { data: null, error: restoreCardsError };
      }
    }

    // Step 4: Remove from deleted_decks table
    const { error: cleanupError } = await supabase
      .from('deleted_decks')
      .delete()
      .eq('id', deletedRecordId);

    if (cleanupError) {
      console.warn('Failed to cleanup deleted_decks record:', cleanupError);
      // Don't fail the whole operation for this
    }

    return { data: restoredDeck, error: null };
  } catch (error) {
    console.error('Error in restoreDeletedDeck:', error);
    return { data: null, error };
  }
}
// QURAN TRANSLATION CACHE FUNCTIONS
// Add these functions at the bottom of lib/database.js, before the final closing brace

export async function getQuranTranslationCache(arabicWord, surahNumber, verseNumber, wordPosition = null) {
  try {
    console.log('🔍 Checking cache for:', { arabicWord, surahNumber, verseNumber, wordPosition });
    
    const { data, error } = await supabase
      .from('quran_translation_cache')
      .select('translation_data, created_at')
      .eq('arabic_word', arabicWord)
      .eq('surah_number', surahNumber)
      .eq('verse_number', verseNumber)
      .eq('word_position', wordPosition)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ Cache lookup error:', error);
      return null;
    }

    if (data) {
      console.log('✅ Cache HIT! Found cached translation:', data.created_at);
      return data.translation_data;
    } else {
      console.log('❌ Cache MISS - no cached translation found');
      return null;
    }
  } catch (error) {
    console.error('❌ Cache lookup failed:', error);
    return null;
  }
}

export async function saveQuranTranslationCache(arabicWord, surahNumber, verseNumber, translationData, wordPosition = null) {
  try {
    console.log('💾 Saving translation to cache:', { arabicWord, surahNumber, verseNumber, wordPosition });
    
    const { data, error } = await supabase
      .from('quran_translation_cache')
      .insert({
        arabic_word: arabicWord,
        surah_number: surahNumber,
        verse_number: verseNumber,
        word_position: wordPosition,
        translation_data: translationData,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      // If it's a duplicate key error, that's fine - someone else cached it first
      if (error.code === '23505') {
        console.log('ℹ️ Translation already cached by another user');
        return { success: true, message: 'Already cached' };
      } else {
        console.error('❌ Failed to save to cache:', error);
        return { success: false, error: error.message };
      }
    }

    console.log('✅ Translation cached successfully');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Cache save failed:', error);
    return { success: false, error: error.message };
  }
}
// YOUTUBE TRANSLATION CACHE FUNCTIONS
// Add these functions after the Quran cache functions in lib/database.js

export async function getYouTubeTranslationCache(arabicWord, videoId, segmentStart) {
  try {
    console.log('🔍 Checking YouTube cache for:', { arabicWord, videoId, segmentStart });
    
    const { data, error } = await supabase
      .from('youtube_translation_cache')
      .select('translation_data, created_at, video_title')
      .eq('arabic_word', arabicWord)
      .eq('video_id', videoId)
      .eq('segment_start', segmentStart)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ YouTube cache lookup error:', error);
      return null;
    }

    if (data) {
      console.log('✅ YouTube Cache HIT! Found cached translation:', data.created_at);
      return data.translation_data;
    } else {
      console.log('❌ YouTube Cache MISS - no cached translation found');
      return null;
    }
  } catch (error) {
    console.error('❌ YouTube cache lookup failed:', error);
    return null;
  }
}

export async function saveYouTubeTranslationCache(arabicWord, videoId, segmentStart, translationData, videoTitle = null) {
  try {
    console.log('💾 Saving YouTube translation to cache:', { arabicWord, videoId, segmentStart });
    
    const { data, error } = await supabase
      .from('youtube_translation_cache')
      .insert({
        arabic_word: arabicWord,
        video_id: videoId,
        segment_start: segmentStart,
        video_title: videoTitle,
        translation_data: translationData,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      // If it's a duplicate key error, that's fine - someone else cached it first
      if (error.code === '23505') {
        console.log('ℹ️ YouTube translation already cached by another user');
        return { success: true, message: 'Already cached' };
      } else {
        console.error('❌ Failed to save YouTube translation to cache:', error);
        return { success: false, error: error.message };
      }
    }

    console.log('✅ YouTube translation cached successfully');
    return { success: true, data };
  } catch (error) {
    console.error('❌ YouTube cache save failed:', error);
    return { success: false, error: error.message };
  }
}
// QURAN AUDIO CACHE FUNCTIONS
// Add these functions to the end of your lib/database.js file

export async function getQuranAudioCache(globalAyahNumber) {
  try {
    console.log('🔍 Checking audio cache for ayah:', globalAyahNumber);
    
    const { data, error } = await supabase
      .from('quran_audio_cache')
      .select('audio_url, created_at')
      .eq('global_ayah_number', globalAyahNumber)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ Audio cache lookup error:', error);
      return null;
    }

    if (data) {
      console.log('✅ Audio Cache HIT! Found cached URL:', data.created_at);
      return data.audio_url;
    } else {
      console.log('❌ Audio Cache MISS - no cached URL found');
      return null;
    }
  } catch (error) {
    console.error('❌ Audio cache lookup failed:', error);
    return null;
  }
}

export async function saveQuranAudioCache(globalAyahNumber, audioUrl) {
  try {
    console.log('💾 Saving audio URL to cache:', { globalAyahNumber, audioUrl });
    
    const { data, error } = await supabase
      .from('quran_audio_cache')
      .insert({
        global_ayah_number: globalAyahNumber,
        audio_url: audioUrl,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      // If it's a duplicate key error, that's fine - someone else cached it first
      if (error.code === '23505') {
        console.log('ℹ️ Audio URL already cached by another user');
        return { success: true, message: 'Already cached' };
      } else {
        console.error('❌ Failed to save audio URL to cache:', error);
        return { success: false, error: error.message };
      }
    }

    console.log('✅ Audio URL cached successfully');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Audio cache save failed:', error);
    return { success: false, error: error.message };
  }
}

export async function fetchStudyCardAudio(globalAyahNumber, onStatusUpdate = null) {
  try {
    if (!globalAyahNumber) {
      throw new Error('No global ayah number provided');
    }

    if (onStatusUpdate) onStatusUpdate('🔍 Checking for cached audio...');

    // STEP 1: Check cache first
    const cachedUrl = await getQuranAudioCache(globalAyahNumber);
    
    let audioUrl = cachedUrl;
    
    if (!audioUrl) {
      // STEP 2: Fetch from API if not cached
      if (onStatusUpdate) onStatusUpdate('🔄 Fetching audio from API...');
      
      const response = await fetch(`https://api.alquran.cloud/v1/ayah/${globalAyahNumber}/ar.alafasy`);
      const data = await response.json();
      
      if (data.code === 200 && data.data && data.data.audio) {
        audioUrl = data.data.audio;
        
        // STEP 3: Cache the URL for future use
        await saveQuranAudioCache(globalAyahNumber, audioUrl);
        if (onStatusUpdate) onStatusUpdate('💾 Audio URL cached for future use');
      } else {
        throw new Error('No audio data returned from API');
      }
    } else {
      if (onStatusUpdate) onStatusUpdate('✅ Using cached audio URL');
    }

    // STEP 4: Create and play audio
    if (onStatusUpdate) onStatusUpdate('🔊 Loading audio...');
    
    const audio = new Audio();
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    
    // Promise to handle audio loading
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        audio.src = '';
        reject(new Error('Audio loading timeout'));
      }, 8000);

      audio.oncanplaythrough = () => {
        clearTimeout(timeout);
        if (onStatusUpdate) onStatusUpdate('🔊 Playing verse audio');
        audio.play().then(() => {
          resolve(audio);
        }).catch(reject);
      };

      audio.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Audio failed to load'));
      };

      audio.src = audioUrl;
    });

  } catch (error) {
    console.error('❌ Study card audio failed:', error);
    if (onStatusUpdate) onStatusUpdate(`❌ Audio failed: ${error.message}`);
    throw error;
  }
}
// USER SETTINGS FUNCTIONS
// Add these functions to the end of your lib/database.js file

export async function getUserSettings(userId) {
  try {
    console.log('🔍 Fetching user settings for:', userId);
    
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ Error fetching user settings:', error);
      return { data: null, error };
    }

    // Return default settings if none exist
    const defaultSettings = {
      user_id: userId,
      card_autoplay_audio: true,
      current_video_url: null,
      current_video_timestamp: 0,
      video_keep_playing_background: true,
      total_immersion_seconds: 0,
      current_session_start: null,
      last_immersion_save: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('✅ User settings loaded:', data || 'using defaults');
    return { data: data || defaultSettings, error: null };
  } catch (error) {
    console.error('❌ Error in getUserSettings:', error);
    return { data: null, error };
  }
}

export async function updateUserSettings(userId, settings) {
  try {
    console.log('💾 Updating user settings:', { userId, settings });
    
    // First check if record exists
    const { data: existingSettings, error: fetchError } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', userId)
      .single();
    
    let result;
    
    if (fetchError && fetchError.code === 'PGRST116') {
      // No record exists, insert new one
      result = await supabase
        .from('user_settings')
        .insert({
          user_id: userId,
          ...settings,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
    } else if (!fetchError) {
      // Record exists, update it
      result = await supabase
        .from('user_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();
    } else {
      throw fetchError;
    }
    
    const { data, error } = result;

    if (error) {
      console.error('❌ Failed to update user settings:', error);
      return { data: null, error };
    }

    console.log('✅ User settings updated successfully:', data);
    return { data, error: null };
  } catch (error) {
    console.error('❌ Error in updateUserSettings:', error);
    return { data: null, error };
  }
}
// VIDEO PERSISTENCE FUNCTIONS
// Add these functions to the end of your lib/database.js file

export async function saveVideoState(userId, videoUrl, timestamp) {
  try {
    console.log('💾 Saving video state:', { userId, videoUrl, timestamp });
    
    // Check if user settings record exists
    const { data: existingSettings, error: fetchError } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', userId)
      .single();
    
    let result;
    
    if (fetchError && fetchError.code === 'PGRST116') {
      // No record exists, insert new one
      result = await supabase
        .from('user_settings')
        .insert({
          user_id: userId,
          current_video_url: videoUrl,
          current_video_timestamp: timestamp,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
    } else if (!fetchError) {
      // Record exists, update it
      result = await supabase
        .from('user_settings')
        .update({
          current_video_url: videoUrl,
          current_video_timestamp: timestamp,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();
    } else {
      throw fetchError;
    }

    const { data, error } = result;

    if (error) {
      console.error('❌ Failed to save video state:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Video state saved successfully');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error in saveVideoState:', error);
    return { success: false, error: error.message };
  }
}


export async function getVideoState(userId) {
  try {
    console.log('🔍 Getting video state for user:', userId);
    
    const { data, error } = await supabase
      .from('user_settings')
      .select('current_video_url, current_video_timestamp, video_keep_playing_background')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ Error getting video state:', error);
      return { data: null, error };
    }

    console.log('✅ Video state retrieved:', data);
    return { data: data || null, error: null };
  } catch (error) {
    console.error('❌ Error in getVideoState:', error);
    return { data: null, error };
  }
}

export async function clearVideoState(userId) {
  try {
    console.log('🗑️ Clearing video state for user:', userId);
    
    // First check if record exists
    const { data: existingSettings, error: fetchError } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', userId)
      .single();
    
    let result;
    
    if (fetchError && fetchError.code === 'PGRST116') {
      // No record exists, insert new one with cleared values
      result = await supabase
        .from('user_settings')
        .insert({
          user_id: userId,
          current_video_url: null,
          current_video_timestamp: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
    } else if (!fetchError) {
      // Record exists, update it
      result = await supabase
        .from('user_settings')
        .update({
          current_video_url: null,
          current_video_timestamp: 0,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();
    } else {
      throw fetchError;
    }

    const { data, error } = result;

    if (error) {
      console.error('❌ Failed to clear video state:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Video state cleared successfully');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error in clearVideoState:', error);
    return { success: false, error: error.message };
  }
}
export async function updateVideoBackgroundSetting(userId, keepPlayingBackground) {
  try {
    console.log('🔧 Updating video background setting:', { userId, keepPlayingBackground });
    
    // First check if record exists
    const { data: existingSettings, error: fetchError } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', userId)
      .single();
    
    let result;
    
    if (fetchError && fetchError.code === 'PGRST116') {
      // No record exists, insert new one
      result = await supabase
        .from('user_settings')
        .insert({
          user_id: userId,
          video_keep_playing_background: keepPlayingBackground,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
    } else if (!fetchError) {
      // Record exists, update it
      result = await supabase
        .from('user_settings')
        .update({
          video_keep_playing_background: keepPlayingBackground,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();
    } else {
      throw fetchError;
    }

    const { data, error } = result;

    if (error) {
      console.error('❌ Failed to update video background setting:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Video background setting updated successfully');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error in updateVideoBackgroundSetting:', error);
    return { success: false, error: error.message };
  }
}
export async function updateDailyImmersionStats(userId, focusedSeconds, freeflowSeconds) {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const totalSeconds = focusedSeconds + freeflowSeconds;
    
    console.log('💾 Updating daily stats:', { userId, today, focusedSeconds, freeflowSeconds, totalSeconds });
    
    // First, get existing record for today
    const { data: existingRecord, error: fetchError } = await supabase
      .from('daily_immersion_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ Error fetching existing daily stats:', fetchError);
      return { data: null, error: fetchError };
    }
    
    let result;
    
    if (fetchError && fetchError.code === 'PGRST116') {
      // No record exists for today, create new one
      console.log('📝 Creating new daily record');
      result = await supabase
        .from('daily_immersion_stats')
        .insert({
          user_id: userId,
          date: today,
          focused_seconds: focusedSeconds,
          freeflow_seconds: freeflowSeconds,
          total_seconds: totalSeconds,
          sessions_count: 1,
          unique_videos_watched: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
    } else {
      // Record exists, update it
      const newFocusedSeconds = (existingRecord.focused_seconds || 0) + focusedSeconds;
      const newFreeflowSeconds = (existingRecord.freeflow_seconds || 0) + freeflowSeconds;
      const newTotalSeconds = (existingRecord.total_seconds || 0) + totalSeconds;
      
      console.log('🔄 Updating existing daily record');
      result = await supabase
        .from('daily_immersion_stats')
        .update({
          focused_seconds: newFocusedSeconds,
          freeflow_seconds: newFreeflowSeconds,
          total_seconds: newTotalSeconds,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('date', today)
        .select()
        .single();
    }
    
    const { data, error } = result;

    if (error) {
      console.error('❌ Error upserting daily stats:', error);
      return { data: null, error };
    }
    
    console.log('✅ Daily stats updated successfully:', data);
    return { data, error: null };
    
  } catch (error) {
    console.error('❌ Error updating daily immersion stats:', error);
    return { data: null, error };
  }
}

export async function saveImmersionSession(userId, videoId, videoTitle, sessionStart, sessionEnd, focusedSeconds, freeflowSeconds) {
  try {
    const totalDuration = focusedSeconds + freeflowSeconds;
    
    console.log('💾 Saving immersion session:', { 
      userId, 
      videoId, 
      videoTitle, 
      sessionStart, 
      sessionEnd, 
      focusedSeconds, 
      freeflowSeconds, 
      totalDuration 
    });
    
    const { data, error } = await supabase
      .from('immersion_sessions')
      .insert({
        user_id: userId,
        video_id: videoId,
        video_title: videoTitle,
        session_start: sessionStart.toISOString(),
        session_end: sessionEnd.toISOString(),
        focused_seconds: focusedSeconds,
        freeflow_seconds: freeflowSeconds,
        total_duration: totalDuration,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error saving immersion session:', error);
      return { data: null, error };
    }
    
    console.log('✅ Immersion session saved successfully:', data);
    return { data, error: null };
    
  } catch (error) {
    console.error('❌ Error saving immersion session:', error);
    return { data: null, error };
  }
}
export async function getDailyImmersionStats(userId, date = null) {
  try {
    const targetDate = date || new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    console.log('📊 Fetching daily stats for:', { userId, targetDate });
    
    const { data, error } = await supabase
      .from('daily_immersion_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('date', targetDate)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ Error fetching daily stats:', error);
      return { data: null, error };
    }

    // Return default stats if none exist
    const defaultStats = {
      focused_seconds: 0,
      freeflow_seconds: 0,
      total_seconds: 0,
      sessions_count: 0
    };

    console.log('✅ Daily stats loaded:', data || 'using defaults');
    return { data: data || defaultStats, error: null };
  } catch (error) {
    console.error('❌ Error in getDailyImmersionStats:', error);
    return { data: null, error };
  }
}

export async function getWeeklyImmersionStats(userId) {
  try {
    console.log('📊 Fetching weekly stats for:', userId);
    
    // Get dates for this week (Monday to Sunday)
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
    
    const startDate = startOfWeek.toISOString().split('T')[0];
    const endDate = endOfWeek.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('daily_immersion_stats')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) {
      console.error('❌ Error fetching weekly stats:', error);
      return { data: null, error };
    }

    // Calculate totals
    const weeklyStats = {
      total_seconds: 0,
      days_active: 0,
      focused_seconds: 0,
      freeflow_seconds: 0,
      sessions_count: 0
    };

    if (data && data.length > 0) {
      data.forEach(day => {
        weeklyStats.total_seconds += day.total_seconds || 0;
        weeklyStats.focused_seconds += day.focused_seconds || 0;
        weeklyStats.freeflow_seconds += day.freeflow_seconds || 0;
        weeklyStats.sessions_count += day.sessions_count || 0;
        if (day.total_seconds > 0) {
          weeklyStats.days_active += 1;
        }
      });
    }

    console.log('✅ Weekly stats calculated:', weeklyStats);
    return { data: weeklyStats, error: null };
  } catch (error) {
    console.error('❌ Error in getWeeklyImmersionStats:', error);
    return { data: null, error };
  }
}

export async function getAllTimeImmersionStats(userId) {
  try {
    console.log('📊 Fetching all-time stats for:', userId);
    
    // Get user settings for total immersion time
    const { data: userSettings, error: settingsError } = await getUserSettings(userId);
    
    // Get longest session from immersion_sessions table
    const { data: sessions, error: sessionsError } = await supabase
      .from('immersion_sessions')
      .select('total_duration')
      .eq('user_id', userId)
      .order('total_duration', { ascending: false })
      .limit(1);

    // Get sum of all daily stats
    const { data: dailyStats, error: dailyError } = await supabase
      .from('daily_immersion_stats')
      .select('total_seconds')
      .eq('user_id', userId);

    let allTimeStats = {
      total_seconds: 0,
      longest_session: 0
    };

    // Use total from user settings (most reliable)
    if (!settingsError && userSettings) {
      allTimeStats.total_seconds = userSettings.total_immersion_seconds || 0;
    } else if (!dailyError && dailyStats) {
      // Fallback: sum daily stats
      allTimeStats.total_seconds = dailyStats.reduce((sum, day) => sum + (day.total_seconds || 0), 0);
    }

    // Get longest session
    if (!sessionsError && sessions && sessions.length > 0) {
      allTimeStats.longest_session = sessions[0].total_duration || 0;
    }

    console.log('✅ All-time stats calculated:', allTimeStats);
    return { data: allTimeStats, error: null };
  } catch (error) {
    console.error('❌ Error in getAllTimeImmersionStats:', error);
    return { data: null, error };
  }
}

export async function loadUserImmersionStats(userId) {
  try {
    console.log('📊 Loading complete immersion stats for:', userId);
    
    // Load all stats in parallel
    const [todayResult, weeklyResult, allTimeResult] = await Promise.all([
      getDailyImmersionStats(userId),
      getWeeklyImmersionStats(userId),
      getAllTimeImmersionStats(userId)
    ]);

    const stats = {
      today: todayResult.data || { focused_seconds: 0, freeflow_seconds: 0, total_seconds: 0 },
      week: weeklyResult.data || { total_seconds: 0, days_active: 0 },
      allTime: allTimeResult.data || { total_seconds: 0, longest_session: 0 }
    };

    console.log('✅ Complete immersion stats loaded:', stats);
    return { data: stats, error: null };
  } catch (error) {
    console.error('❌ Error in loadUserImmersionStats:', error);
    return { data: null, error };
  }
}
/ 4. Function to get user's interactions for posts (to show which posts they've liked)
export async function getUserPostInteractions(userId, postIds) {
  try {
    const { data, error } = await supabase
      .from('post_interactions')
      .select('post_id, interaction_type')
      .eq('user_id', userId)
      .in('post_id', postIds);

    if (error) {
      console.error('Error fetching user interactions:', error);
      return { data: [], error };
    }

    // Convert to easy lookup format
    const interactions = {};
    data.forEach(interaction => {
      if (!interactions[interaction.post_id]) {
        interactions[interaction.post_id] = [];
      }
      interactions[interaction.post_id].push(interaction.interaction_type);
    });

    return { data: interactions, error: null };
  } catch (error) {
    console.error('Error getting user post interactions:', error);
    return { data: {}, error };
  }
}

// 5. Function to update user profile display name with uniqueness check
export async function updateUserDisplayName(userId, displayName) {
  try {
    console.log('Updating display name:', { userId, displayName });

    // Check if display name is already taken (case-insensitive)
    const { data: existing, error: checkError } = await supabase
      .from('user_profiles')
      .select('id')
      .ilike('display_name', displayName)
      .neq('id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return { data: null, error: checkError };
    }

    if (existing) {
      return { data: null, error: { message: 'Display name already taken' } };
    }

    // Update the display name
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        display_name: displayName,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Error updating display name:', error);
    return { data: null, error };
  }
}

// 6. Function to get current user profile
export async function getUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return { data: null, error };
  }
}
// Enhanced loadUserImmersionStats to include profile data and streaks
export async function loadUserStatsAndProfile(userId) {
  try {
    console.log('📊 Loading complete user stats and profile for:', userId);
    
    // Load all data in parallel
    const [todayResult, weeklyResult, allTimeResult, profileResult, immersionStreakResult, cardStreakResult] = await Promise.all([
      getDailyImmersionStats(userId),
      getWeeklyImmersionStats(userId), 
      getAllTimeImmersionStats(userId),
      getUserProfile(userId),
      calculateImmersionStreak(userId),
      calculateCardStudyStreak(userId)
    ]);

    const stats = {
      today: todayResult.data || { focused_seconds: 0, freeflow_seconds: 0, total_seconds: 0 },
      week: weeklyResult.data || { total_seconds: 0, days_active: 0 },
      allTime: allTimeResult.data || { total_seconds: 0, longest_session: 0 }
    };

    const profile = profileResult.data || {
      display_name: null,
      username: null,
      arabic_name: null,
      bio: null,
      avatar_url: null,
      study_streak: 0,
      total_study_days: 0
    };

    const streaks = {
      immersion_streak: immersionStreakResult.data || 0,
      card_study_streak: cardStreakResult.data || 0,
      study_streak: profile.study_streak || 0 // From user_profiles table
    };

    const combinedData = {
      stats,
      profile,
      streaks
    };

    console.log('✅ Complete user data loaded:', combinedData);
    return { data: combinedData, error: null };
  } catch (error) {
    console.error('❌ Error in loadUserStatsAndProfile:', error);
    return { data: null, error };
  }
}

// Calculate immersion streak (consecutive days with immersion time)
export async function calculateImmersionStreak(userId) {
  try {
    console.log('📊 Calculating immersion streak for:', userId);
    
    // Get last 30 days of immersion stats, ordered by date descending
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];
    
    const { data: dailyStats, error } = await supabase
      .from('daily_immersion_stats')
      .select('date, total_seconds')
      .eq('user_id', userId)
      .gte('date', startDate)
      .order('date', { ascending: false });

    if (error) {
      console.error('❌ Error fetching daily stats for streak:', error);
      return { data: 0, error };
    }

    if (!dailyStats || dailyStats.length === 0) {
      return { data: 0, error: null };
    }

    // Count consecutive days with immersion time, starting from today
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    
    // Check if user has studied today (if not, start from yesterday)
    const hasStudiedToday = dailyStats.some(stat => 
      stat.date === today && stat.total_seconds > 0
    );

    // Start counting from today or yesterday
    let currentDate = new Date();
    if (!hasStudiedToday) {
      currentDate.setDate(currentDate.getDate() - 1);
    }

    // Count backwards until we find a day without immersion
    for (let i = 0; i < 30; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayStat = dailyStats.find(stat => stat.date === dateStr);
      
      if (dayStat && dayStat.total_seconds > 0) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break; // Streak broken
      }
    }

    console.log('✅ Immersion streak calculated:', streak);
    return { data: streak, error: null };
  } catch (error) {
    console.error('❌ Error calculating immersion streak:', error);
    return { data: 0, error };
  }
}

// Calculate card study streak (consecutive days with card reviews)
export async function calculateCardStudyStreak(userId) {
  try {
    console.log('📊 Calculating card study streak for:', userId);
    
    // Get card review history for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: cardReviews, error } = await supabase
      .from('cards')
      .select('updated_at')
      .eq('user_id', userId)
      .gte('updated_at', thirtyDaysAgo.toISOString())
      .neq('state', 'new') // Only count reviewed cards
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching card reviews for streak:', error);
      return { data: 0, error };
    }

    if (!cardReviews || cardReviews.length === 0) {
      return { data: 0, error: null };
    }

    // Group reviews by date
    const reviewsByDate = {};
    cardReviews.forEach(review => {
      const date = review.updated_at.split('T')[0];
      reviewsByDate[date] = true;
    });

    // Count consecutive days with reviews
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    
    // Check if user reviewed cards today
    const hasReviewedToday = reviewsByDate[today];
    
    let currentDate = new Date();
    if (!hasReviewedToday) {
      currentDate.setDate(currentDate.getDate() - 1);
    }

    // Count backwards until we find a day without reviews
    for (let i = 0; i < 30; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      if (reviewsByDate[dateStr]) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break; // Streak broken
      }
    }

    console.log('✅ Card study streak calculated:', streak);
    return { data: streak, error: null };
  } catch (error) {
    console.error('❌ Error calculating card study streak:', error);
    return { data: 0, error };
  }
}

// Enhanced user profile functions for editing
export async function updateUserProfileComplete(userId, profileData, avatarFile = null) {
  try {
    console.log('💾 Updating complete user profile:', { userId, profileData, hasAvatar: !!avatarFile });

    let avatarUrl = profileData.avatar_url;

    // Upload avatar if provided
    if (avatarFile) {
      console.log('📸 Uploading avatar...');
      
      const formData = new FormData();
      formData.append('media', avatarFile);

      const uploadResponse = await fetch('/api/upload-media', {
        method: 'POST',
        body: formData
      });

      const uploadResult = await uploadResponse.json();
      
      if (!uploadResponse.ok || !uploadResult.success) {
        throw new Error(uploadResult.error || 'Avatar upload failed');
      }

      avatarUrl = uploadResult.url;
      console.log('✅ Avatar uploaded successfully:', avatarUrl);
    }

    // Check if display name is unique (if being changed)
    if (profileData.display_name) {
      const { data: existing, error: checkError } = await supabase
        .from('user_profiles')
        .select('id')
        .ilike('display_name', profileData.display_name)
        .neq('id', userId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        return { data: null, error: checkError };
      }

      if (existing) {
        return { data: null, error: { message: 'Display name already taken' } };
      }
    }

    // Update the profile
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        ...profileData,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating profile:', error);
      return { data: null, error };
    }

    console.log('✅ Profile updated successfully:', data);
    return { data, error: null };
  } catch (error) {
    console.error('❌ Error in updateUserProfileComplete:', error);
    return { data: null, error };
  }
}

// Function to update study streaks (called when user completes study activities)
export async function updateStudyStreak(userId) {
  try {
    console.log('📈 Updating study streak for:', userId);
    
    const today = new Date().toISOString().split('T')[0];
    
    // Get current profile
    const { data: profile, error: profileError } = await getUserProfile(userId);
    if (profileError) {
      return { data: null, error: profileError };
    }

    // Check if user already studied today
    const { data: todayStats } = await getDailyImmersionStats(userId, today);
    const hasStudiedToday = todayStats && todayStats.total_seconds > 0;

    let newStudyStreak = profile?.study_streak || 0;
    let newTotalStudyDays = profile?.total_study_days || 0;

    if (hasStudiedToday) {
      // Check yesterday to see if streak continues
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const { data: yesterdayStats } = await getDailyImmersionStats(userId, yesterdayStr);
      const studiedYesterday = yesterdayStats && yesterdayStats.total_seconds > 0;

      if (studiedYesterday || newStudyStreak === 0) {
        newStudyStreak += 1;
      } else {
        newStudyStreak = 1; // Reset streak
      }
      
      newTotalStudyDays += 1;
    }

    // Update profile with new streak
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        study_streak: newStudyStreak,
        total_study_days: newTotalStudyDays,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('❌ Error updating study streak:', error);
    return { data: null, error };
  }
}
