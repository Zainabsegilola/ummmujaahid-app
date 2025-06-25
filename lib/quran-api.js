// Updated lib/quran-api.js - CLEAN VERSION - Replace entire file

const QURAN_API_BASE = 'https://api.alquran.cloud/v1';

// Enhanced reciters with fallback priority
export const RECITERS = {
  alafasy: { 
    id: 'ar.alafasy', 
    name: 'Mishary Al-Afasy', 
    arabic: 'مشاري العفاسي',
    priority: 1
  },
  abdul_basit: { 
    id: 'ar.abdulbasitmurattal', 
    name: 'Abdul Basit', 
    arabic: 'عبد الباسط عبد الصمد',
    priority: 2
  },
  maher: { 
    id: 'ar.mahermuaiqly', 
    name: 'Maher Al-Muaiqly', 
    arabic: 'ماهر المعيقلي',
    priority: 3
  },
  sudais: { 
    id: 'ar.abdurrahmaansudais', 
    name: 'Abdul Rahman Al-Sudais', 
    arabic: 'عبد الرحمن السديس',
    priority: 4
  }
};

// Get reciter fallback chain
export function getReciterFallbackChain() {
  return Object.values(RECITERS).sort((a, b) => a.priority - b.priority);
}

// Generate multiple audio URL options with fallbacks
export function generateAudioUrls(globalAyahNumber, reciterKey = 'alafasy') {
  const reciter = RECITERS[reciterKey];
  if (!reciter) return [];

  const urls = [
    // Primary: Islamic Network CDN
    `https://cdn.islamic.network/quran/audio-ayah/${reciter.id}/${globalAyahNumber}.mp3`,
    // Fallback: EveryAyah CDN
    `https://everyayah.com/data/Alafasy_128kbps/${String(globalAyahNumber).padStart(6, '0')}.mp3`,
    // Alternative format
    `https://audio.qurancentral.com/ayah/${reciter.id}/${globalAyahNumber}.mp3`
  ];

  return urls;
}

// Smart audio loading with automatic fallbacks
export async function loadVerseAudioWithFallback(globalAyahNumber, preferredReciter = 'alafasy', onReciterChange = null, onStatusUpdate = null) {
  const reciterChain = getReciterFallbackChain();
  let currentReciterIndex = reciterChain.findIndex(r => Object.keys(RECITERS).find(key => RECITERS[key] === r) === preferredReciter);
  
  if (currentReciterIndex === -1) currentReciterIndex = 0;

  for (let reciterIdx = currentReciterIndex; reciterIdx < reciterChain.length; reciterIdx++) {
    const currentReciter = reciterChain[reciterIdx];
    const reciterKey = Object.keys(RECITERS).find(key => RECITERS[key] === currentReciter);
    
    if (onStatusUpdate) {
      onStatusUpdate(`🔄 Trying ${currentReciter.name}...`);
    }

    const audioUrls = generateAudioUrls(globalAyahNumber, reciterKey);

    for (const audioUrl of audioUrls) {
      try {
        const audio = await testAudioUrl(audioUrl);
        
        if (audio) {
          // Success! Notify if we switched reciters
          if (reciterIdx > currentReciterIndex && onReciterChange) {
            onReciterChange(currentReciter, `Switched to ${currentReciter.name}`);
          }
          
          if (onStatusUpdate) {
            onStatusUpdate(`✅ Playing ${currentReciter.name}`);
          }

          return {
            audio,
            reciter: currentReciter,
            url: audioUrl
          };
        }
      } catch (error) {
        console.log(`❌ Failed: ${audioUrl}`);
        continue;
      }
    }
  }

  // All reciters failed
  if (onStatusUpdate) {
    onStatusUpdate('❌ Audio failed, error 404 - No reciters available');
  }
  
  throw new Error('All audio sources failed');
}

// Test if audio URL works
function testAudioUrl(url) {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    
    const timeout = setTimeout(() => {
      audio.src = '';
      reject(new Error('Timeout'));
    }, 5000);

    audio.oncanplay = () => {
      clearTimeout(timeout);
      resolve(audio);
    };

    audio.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Load failed'));
    };

    audio.src = url;
  });
}

// Get translations from Al-Quran Cloud API
export async function fetchVerseTranslations(surahNumber, verseNumber) {
  try {
    console.log(`🔄 Fetching translation for ${surahNumber}:${verseNumber}`);
    
    // Get Muhsin Khan translation (ID: en.hilali) and Sahih International
    // Fetch both Arabic text and Muhsin Khan translation
    const arabicResponse = await fetch(`${QURAN_API_BASE}/surah/${surahNumber}/quran-uthmani`);
    const translationResponse = await fetch(`${QURAN_API_BASE}/surah/${surahNumber}/en.hilali`);
    const arabicData = await arabicResponse.json();
    const translationData = await translationResponse.json();
    
    if (data.code === 200 && data.data) {
      const translations = {};
      
      data.data.forEach(edition => {
        if (edition.edition.identifier === 'en.hilali') {
          translations.muhsin_khan = edition.text;
        } else if (edition.edition.identifier === 'en.sahih') {
          translations.sahih_international = edition.text;
        }
      });
      
      return {
        data: translations,
        error: null
      };
    }
    
    return { data: null, error: 'Translation not found' };
  } catch (error) {
    console.error('❌ Translation fetch failed:', error);
    return { data: null, error: error.message };
  }
}

// Get all surahs list
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

// Get verses for a specific surah with CORRECT AYAH NUMBERS for audio AND translations
export async function fetchSurahVerses(surahNumber, reciterEdition = 'ar.alafasy') {
  try {
    console.log(`🔍 Fetching Surah ${surahNumber} with reciter ${reciterEdition}`);
    
    // Fetch both Arabic text and Muhsin Khan translation
    const arabicResponse = await fetch(`${QURAN_API_BASE}/surah/${surahNumber}/quran-uthmani`);
    const translationResponse = await fetch(`${QURAN_API_BASE}/surah/${surahNumber}/en.hilali`);
    
    const arabicData = await arabicResponse.json();
    const translationData = await translationResponse.json();
    
    console.log('📡 Arabic API Response:', arabicData);
    console.log('📡 Translation API Response:', translationData);
    
    if (arabicData.code === 200 && translationData.code === 200 && 
        arabicData.data && translationData.data && 
        arabicData.data.ayahs && translationData.data.ayahs) {
      
      const processedVerses = arabicData.data.ayahs.map((ayah, index) => {
        const translationAyah = translationData.data.ayahs[index];
        return {
          id: `${surahNumber}-${ayah.numberInSurah}`,
          surah_id: surahNumber,
          verse_number: ayah.numberInSurah,
          global_ayah_number: ayah.number, // ✅ This is the key - sequential 1-6236 number
          text_arabic: ayah.text || 'Loading...',
          text_translation: translationAyah?.text || 'Translation loading...', // ✅ NEW: Muhsin Khan translation
          text_simple: ayah.text || 'Loading...',
          page_number: ayah.page || 1,
          juz_number: ayah.juz || 1,
          manzil: ayah.manzil || 1,
          ruku: ayah.ruku || 1,
          hizbQuarter: ayah.hizbQuarter || 1,
          sajda: ayah.sajda || false,
          audio_url: getVerseAudioUrl(ayah.number, reciterEdition, 128), // ✅ Generate audio URL using global number
          audio_secondary: [], // Backup URLs
          words: ayah.words || []
        };
      });
      
      console.log('✅ Processed verses with translations:', processedVerses.length);
      
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

// Generate audio data for verse ranges
export function generateRangeAudioData(verses, startVerse, endVerse) {
  const versesInRange = verses.filter(v => 
    v.verse_number >= startVerse && v.verse_number <= endVerse
  );
  
  return versesInRange.map(verse => ({
    verse_number: verse.verse_number,
    global_ayah_number: verse.global_ayah_number,
    surah_id: verse.surah_id,
    text_arabic: verse.text_arabic
  }));
}
