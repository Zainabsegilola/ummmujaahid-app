// Updated lib/quran-api.js - FIXED AUDIO + Better Fallbacks + 192kbps

const QURAN_API_BASE = 'https://api.alquran.cloud/v1';

// Enhanced reciters with multiple audio sources and priorities
export const RECITERS = {
  alafasy: { 
    id: 'ar.alafasy', 
    name: 'Mishary Al-Afasy', 
    arabic: 'مشاري العفاسي',
    priority: 1,
    // Multiple CDN sources for reliability
    cdnIds: ['Alafasy_128kbps', 'mishary_rashid_alafasy']
  },
  abdul_basit: { 
    id: 'ar.abdulbasitmurattal', 
    name: 'Abdul Basit', 
    arabic: 'عبد الباسط عبد الصمد',
    priority: 2,
    cdnIds: ['Abdul_Basit_Murattal_192kbps', 'abdul_basit_murattal']
  },
  maher: { 
    id: 'ar.mahermuaiqly', 
    name: 'Maher Al-Muaiqly', 
    arabic: 'ماهر المعيقلي',
    priority: 3,
    cdnIds: ['Maher_AlMuaiqly_128kbps', 'maher_al_muaiqly']
  },
  sudais: { 
    id: 'ar.abdurrahmaansudais', 
    name: 'Abdul Rahman Al-Sudais', 
    arabic: 'عبد الرحمن السديس',
    priority: 4,
    cdnIds: ['Abdurrahman_As-Sudais_192kbps', 'abdurrahman_as_sudais']
  }
};

// Get sorted reciters by priority for fallback chain
export function getReciterFallbackChain() {
  return Object.values(RECITERS).sort((a, b) => a.priority - b.priority);
}

// Enhanced audio URL generation with multiple CDN fallbacks
export function generateAudioUrls(surahNumber, verseNumber, globalAyahNumber, reciterKey = 'alafasy') {
  const reciter = RECITERS[reciterKey];
  if (!reciter) return [];

  const urls = [];
  
  // Format numbers for different CDN requirements
  const paddedSurah = surahNumber.toString().padStart(3, '0');
  const paddedVerse = verseNumber.toString().padStart(3, '0');
  const combinedId = paddedSurah + paddedVerse; // e.g., "001001"

  // URL Strategy 1: Islamic Network CDN (primary)
  urls.push({
    url: `https://cdn.islamic.network/quran/audio-ayah/${reciter.id}/${globalAyahNumber}.mp3`,
    quality: '192kbps',
    source: 'islamic-network',
    description: `${reciter.name} - High Quality`
  });

  // URL Strategy 2: EveryAyah CDN (reliable fallback)
  reciter.cdnIds.forEach(cdnId => {
    // Try 192kbps first
    urls.push({
      url: `https://everyayah.com/data/${cdnId.replace('128kbps', '192kbps')}/${combinedId}.mp3`,
      quality: '192kbps',
      source: 'everyayah-hq',
      description: `${reciter.name} - EveryAyah HQ`
    });
    
    // Then 128kbps fallback
    urls.push({
      url: `https://everyayah.com/data/${cdnId}/${combinedId}.mp3`,
      quality: '128kbps',
      source: 'everyayah',
      description: `${reciter.name} - EveryAyah Standard`
    });
  });

  // URL Strategy 3: Alternative CDN
  urls.push({
    url: `https://audio.qurancentral.com/ayah/${reciter.id}/${globalAyahNumber}.mp3`,
    quality: '128kbps',
    source: 'qurancentral',
    description: `${reciter.name} - QuranCentral`
  });

  return urls;
}

// Smart audio loading with automatic fallbacks and reciter switching
export async function loadVerseAudioWithFallback(surahNumber, verseNumber, globalAyahNumber, preferredReciter = 'alafasy', onReciterChange = null, onStatusUpdate = null) {
  const reciterChain = getReciterFallbackChain();
  let currentReciterIndex = reciterChain.findIndex(r => Object.keys(RECITERS).find(key => RECITERS[key] === r) === preferredReciter);
  
  if (currentReciterIndex === -1) currentReciterIndex = 0; // Default to first reciter

  for (let reciterIdx = currentReciterIndex; reciterIdx < reciterChain.length; reciterIdx++) {
    const currentReciter = reciterChain[reciterIdx];
    const reciterKey = Object.keys(RECITERS).find(key => RECITERS[key] === currentReciter);
    
    if (onStatusUpdate) {
      onStatusUpdate(`🔄 Trying ${currentReciter.name}...`);
    }

    const audioUrls = generateAudioUrls(surahNumber, verseNumber, globalAyahNumber, reciterKey);

    for (const audioOption of audioUrls) {
      try {
        const audio = await testAudioUrl(audioOption.url);
        
        if (audio) {
          // Success! Notify if we switched reciters
          if (reciterIdx > currentReciterIndex && onReciterChange) {
            onReciterChange(currentReciter, `Switched to ${currentReciter.name} (${audioOption.quality})`);
          }
          
          if (onStatusUpdate) {
            onStatusUpdate(`✅ Playing ${currentReciter.name} - ${audioOption.quality}`);
          }

          return {
            audio,
            reciter: currentReciter,
            quality: audioOption.quality,
            source: audioOption.source,
            url: audioOption.url
          };
        }
      } catch (error) {
        console.log(`❌ Failed: ${audioOption.url} (${error.message})`);
        continue; // Try next URL
      }
    }
  }

  // All reciters and URLs failed
  if (onStatusUpdate) {
    onStatusUpdate('❌ Audio failed, error 404 - No reciters available');
  }
  
  throw new Error('All audio sources failed');
}

// Test if audio URL is valid and loads properly
function testAudioUrl(url) {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    
    const timeout = setTimeout(() => {
      audio.src = '';
      reject(new Error('Timeout'));
    }, 5000); // 5 second timeout

    audio.oncanplay = () => {
      clearTimeout(timeout);
      resolve(audio);
    };

    audio.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Load failed'));
    };

    audio.onabort = () => {
      clearTimeout(timeout);
      reject(new Error('Load aborted'));
    };

    audio.src = url;
  });
}

// Get translations from Al-Quran Cloud API
export async function fetchVerseTranslations(surahNumber, verseNumber) {
  try {
    console.log(`🔄 Fetching translation for ${surahNumber}:${verseNumber}`);
    
    // Muhsin Khan translation ID in Al-Quran Cloud is 131
    const response = await fetch(`${QURAN_API_BASE}/ayah/${surahNumber}:${verseNumber}/editions/en.hilali,en.sahih`);
    const data = await response.json();
    
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

// Get all surahs with basic info (keeping your existing function)
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

// Get verses for a specific surah (enhanced with translation support)
export async function fetchSurahVerses(surahNumber, loadTranslations = false) {
  try {
    console.log(`🔍 Fetching Surah ${surahNumber} with translations: ${loadTranslations}`);
    
    // Get Arabic text first
    const response = await fetch(`${QURAN_API_BASE}/surah/${surahNumber}`);
    const data = await response.json();
    
    if (data.code === 200 && data.data && data.data.ayahs) {
      let processedVerses = data.data.ayahs.map(ayah => ({
        id: `${surahNumber}-${ayah.numberInSurah}`,
        surah_id: surahNumber,
        verse_number: ayah.numberInSurah,
        global_ayah_number: ayah.number,
        text_arabic: ayah.text || 'Loading...',
        text_simple: ayah.text || 'Loading...',
        page_number: ayah.page || 1,
        juz_number: ayah.juz || 1,
        manzil: ayah.manzil || 1,
        ruku: ayah.ruku || 1,
        hizbQuarter: ayah.hizbQuarter || 1,
        sajda: ayah.sajda || false,
        translation_muhsin_khan: null,
        translation_sahih_international: null
      }));

      // Fetch translations if requested
      if (loadTranslations) {
        console.log(`🔄 Loading translations for ${processedVerses.length} verses...`);
        
        for (let i = 0; i < processedVerses.length; i++) {
          const verse = processedVerses[i];
          const { data: translations } = await fetchVerseTranslations(surahNumber, verse.verse_number);
          
          if (translations) {
            verse.translation_muhsin_khan = translations.muhsin_khan;
            verse.translation_sahih_international = translations.sahih_international;
          }
          
          // Small delay to avoid rate limiting
          if (i % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
      
      console.log(`✅ Processed ${processedVerses.length} verses`);
      
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

// Range audio generation for continuous playback
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
