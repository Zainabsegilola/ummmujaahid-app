// Updated lib/quran-api.js - FIXED AUDIO + Better Data Structure

const QURAN_API_BASE = 'https://api.alquran.cloud/v1';

// Popular reciters with their API identifiers
export const RECITERS = {
  alafasy: { id: 'ar.alafasy', name: 'Mishary Al-Afasy', arabic: 'مشاري العفاسي' },
  abdul_basit: { id: 'ar.abdulbasitmurattal', name: 'Abdul Basit', arabic: 'عبد الباسط عبد الصمد' },
  maher: { id: 'ar.mahermuaiqly', name: 'Maher Al-Muaiqly', arabic: 'ماهر المعيقلي' },
  saad: { id: 'ar.saadalghamdi', name: 'Saad Al-Ghamdi', arabic: 'سعد الغامدي' },
  sudais: { id: 'ar.abdurrahmaansudais', name: 'Abdul Rahman Al-Sudais', arabic: 'عبد الرحمن السديس' }
};

// Get all surahs with basic info
export async function fetchSurahsList() {
  try {
    const response = await fetch(`${QURAN_API_BASE}/surah`);
    const data = await response.json();
    
    if (data.code === 200 && data.data) {
      return {
        data: data.data.map(surah => ({
          id: surah.number,
          number: surah.number,
          name_arabic: surah.name,
          name_english: surah.englishName,
          name_transliterated: surah.englishNameTranslation,
          revelation_place: surah.revelationType,
          verses_count: surah.numberOfAyahs
        })),
        error: null
      };
    }
    
    return { data: [], error: 'No surahs found' };
  } catch (error) {
    console.error('Error fetching surahs:', error);
    return { data: [], error: error.message };
  }
}

// Get verses for a specific surah with CORRECT AYAH NUMBERS for audio
export async function fetchSurahVerses(surahNumber, reciterEdition = 'ar.alafasy') {
  try {
    console.log(`🔍 Fetching Surah ${surahNumber} with reciter ${reciterEdition}`);
    
    // Fetch from Al-Quran API which gives us correct ayah numbers
    const response = await fetch(`${QURAN_API_BASE}/surah/${surahNumber}/${reciterEdition}`);
    const data = await response.json();
    
    console.log('📡 API Response:', data);
    
    if (data.code === 200 && data.data && data.data.ayahs) {
      const processedVerses = data.data.ayahs.map(ayah => ({
        id: `${surahNumber}-${ayah.numberInSurah}`,
        surah_id: surahNumber,
        verse_number: ayah.numberInSurah,
        global_ayah_number: ayah.number, // ✅ This is the key - sequential 1-6236 number
        text_arabic: ayah.text || 'Loading...',
        text_simple: ayah.text || 'Loading...',
        page_number: ayah.page || 1,
        juz_number: ayah.juz || 1,
        manzil: ayah.manzil || 1,
        ruku: ayah.ruku || 1,
        hizbQuarter: ayah.hizbQuarter || 1,
        sajda: ayah.sajda || false,
        audio_url: ayah.audio || null, // Direct audio URL from API
        audio_secondary: ayah.audioSecondary || [], // Backup URLs
        words: ayah.words || []
      }));
      
      console.log('✅ Processed verses:', processedVerses.length);
      
      return {
        data: processedVerses,
        error: null
      };
    }
    
    return { data: [], error: 'No verses found' };
  } catch (error) {
    console.error('❌ Error fetching verses:', error);
    return { data: [], error: error.message };
  }
}

// Get audio URL for specific verse using CORRECT ayah number
export function getVerseAudioUrl(globalAyahNumber, reciterEdition = 'ar.alafasy', bitrate = 128) {
  // ✅ FIXED: Use the correct CDN format with sequential ayah number
  return `https://cdn.islamic.network/quran/audio/${bitrate}/${reciterEdition}/${globalAyahNumber}.mp3`;
}

// Get audio for verse range (for continuous play)
export function getVerseRangeAudioUrls(verses, reciterEdition = 'ar.alafasy', bitrate = 128) {
  return verses.map(verse => ({
    verse_number: verse.verse_number,
    audio_url: getVerseAudioUrl(verse.global_ayah_number, reciterEdition, bitrate),
    global_ayah_number: verse.global_ayah_number
  }));
}

// Get entire surah audio (single file)
export async function fetchSurahAudio(surahNumber, reciterEdition = 'ar.alafasy') {
  try {
    // For complete surah audio, use the surah endpoint
    const surahAudioUrl = `https://cdn.islamic.network/quran/audio-surah/128/${reciterEdition}/${surahNumber}.mp3`;
    
    // Test if URL exists
    const testResponse = await fetch(surahAudioUrl, { method: 'HEAD' });
    
    if (testResponse.ok) {
      return {
        data: {
          full_surah_url: surahAudioUrl,
          format: 'mp3',
          bitrate: 128
        },
        error: null
      };
    }
    
    return { data: null, error: 'Surah audio not available' };
  } catch (error) {
    console.error('Error fetching surah audio:', error);
    return { data: null, error: error.message };
  }
}

// Helper function to get verse by surah:verse reference
export async function fetchSingleVerse(surahNumber, verseNumber, reciterEdition = 'ar.alafasy') {
  try {
    const response = await fetch(`${QURAN_API_BASE}/ayah/${surahNumber}:${verseNumber}/${reciterEdition}`);
    const data = await response.json();
    
    if (data.code === 200 && data.data) {
      const ayah = data.data;
      return {
        data: {
          id: `${surahNumber}-${verseNumber}`,
          surah_id: surahNumber,
          verse_number: verseNumber,
          global_ayah_number: ayah.number,
          text_arabic: ayah.text,
          audio_url: ayah.audio,
          audio_secondary: ayah.audioSecondary || [],
          page_number: ayah.page,
          juz_number: ayah.juz
        },
        error: null
      };
    }
    
    return { data: null, error: 'Verse not found' };
  } catch (error) {
    console.error('Error fetching single verse:', error);
    return { data: null, error: error.message };
  }
}