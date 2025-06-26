'use client';
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase'
import { 
  createOrGetDeck, 
  getUserDecks,
  cleanArabicWord,
  getContextSentence,
  addCardToDeck,
  addQuranCard,
  getCardsForReview,
  reviewCard,getUserQuranSettings, 
  updateQuranSettings, 
  updateSurahProgress,
  createSurahDeck,
  createCommunityPost, 
  getCommunityPosts, 
  interactWithPost, 
  createOrUpdateUserProfile,
  testCommunityConnection,
  getCardsInDeck,
  deleteCard, 
  deleteMultipleCards,
  restoreCard,
  toggleCardSuspension,
  updateCardContent,
  softDeleteDeck,
  restoreDeletedDeck,
     
} from '@/lib/database'
import { 
  fetchSurahsList, 
  fetchSurahVerses, 
  loadVerseAudioWithFallback,
  generateRangeAudioData,
  RECITERS,
  getReciterFallbackChain
} from '@/lib/quran-api'
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

// Auth Component
function AuthForm() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin
          }
        })
        if (error) throw error
        
        if (data.user && !data.user.email_confirmed_at) {
          setMessage('Please check your email for a confirmation link!')
        } else if (data.user) {
          setMessage('Account created successfully!')
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        setMessage('Signed in successfully!')
      }
    } catch (error: any) {
      setMessage('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f9fafb'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '32px',
        borderRadius: '12px',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ 
            fontFamily: 'Amiri, "Noto Naskh Arabic", "Times New Roman", serif',
            direction: 'rtl',
            marginBottom: '8px',
            textAlign: 'center'
            }}>
            <div style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#8b5cf6',
                lineHeight: '1.2',
                textShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
                قُرْآنًا
            </div>
            <div style={{
                fontSize: '28px',
                fontWeight: '600',
                color: '#a855f7',
                lineHeight: '1.2'
            }}>
                عَرَبِيًّا
            </div>
            </div>
          <p style={{ color: '#6b7280', marginTop: '8px' }}>
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        <form onSubmit={handleAuth}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px', color: '#374151' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px', color: '#374151' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px',
                outline: 'none'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              backgroundColor: loading ? '#9ca3af' : '#8b5cf6',
              color: 'white',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            onClick={() => {
              setIsSignUp(!isSignUp)
              setMessage('')
            }}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#8b5cf6',
              cursor: 'pointer',
              fontSize: '14px',
              textDecoration: 'underline'
            }}
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>

        {message && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            borderRadius: '6px',
            backgroundColor: message.includes('error') || message.includes('Invalid') ? '#fef2f2' : '#f0fdf4',
            color: message.includes('error') || message.includes('Invalid') ? '#dc2626' : '#059669',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            {message}
          </div>
        )}
      </div>
    </div>
  )
}
function ProfileDropdown({ user, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: '#8b5cf6',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'white',
          fontSize: '16px',
          fontWeight: '600'
        }}
      >
        👤
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '50px',
          right: '0',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
          border: '1px solid #e5e7eb',
          minWidth: '200px',
          zIndex: 1000
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
              {user?.email}
            </div>
          </div>
          
          <button
            onClick={() => {
              setIsOpen(false);
              // Future: navigate to profile page
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            👤 Profile
          </button>

          <button
            onClick={() => {
              setIsOpen(false);
              // Future: navigate to settings page
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderBottom: '1px solid #f3f4f6'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            ⚙️ Settings
          </button>

          <button
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#fef2f2'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            🚪 Logout
          </button>
        </div>
      )}
    </div>
  );
}

// Main App Component
function MainApp({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState('watch');
  
  
  // Video states
  const [player, setPlayer] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoUrl, setVideoUrl] = useState('');
  const [currentVideoId, setCurrentVideoId] = useState('');
  const [currentVideoTitle, setCurrentVideoTitle] = useState('');
  const [transcript, setTranscript] = useState<any[]>([]);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [transcriptError, setTranscriptError] = useState('');
  const playerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const currentWordRef = useRef<HTMLSpanElement>(null);

  // Deck states
  const [decks, setDecks] = useState<any[]>([]);
  const [currentDeck, setCurrentDeck] = useState<any>(null);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [cardMessage, setCardMessage] = useState('');
  const [cardManagementView, setCardManagementView] = useState(null);
  const [deckCards, setDeckCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [managementMessage, setManagementMessage] = useState('');
  const [undoAction, setUndoAction] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deckToDelete, setDeckToDelete] = useState(null);
  const [isDeletingDeck, setIsDeletingDeck] = useState(false);
  const [deletedDeckInfo, setDeletedDeckInfo] = useState(null); // For undo functionality
  const [isMasterDeckExpanded, setIsMasterDeckExpanded] = useState(false); // NEW: State for master deck collapse
  

  // Study states
  const [isStudying, setIsStudying] = useState(false);
  const [studyCards, setStudyCards] = useState<any[]>([]);
  const [currentStudyCard, setCurrentStudyCard] = useState<any>(null);
  const [studyCardIndex, setStudyCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [studyDeck, setStudyDeck] = useState<any>(null);

  // Modal states
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [cardForm, setCardForm] = useState({
    arabic_word: '',
    english_meaning: '',
    context: '',
    notes: ''
  });

  // Harakat states
  const [harakatCache, setHarakatCache] = useState<Map<string, string>>(new Map());
  const [isProcessingHarakat, setIsProcessingHarakat] = useState(false);
  
  // Quran states
  const [surahs, setSurahs] = useState<any[]>([]);
  const [quranDeck, setQuranDeck] = useState<any>(null);
  const [isLoadingQuran, setIsLoadingQuran] = useState(false);
  const [quranMessage, setQuranMessage] = useState('');
  const [readSubTab, setReadSubTab] = useState('quran');
  const [quranViewMode, setQuranViewMode] = useState('full'); // 'single' or 'full'
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [currentSurah, setCurrentSurah] = useState<any>(null);
  const [currentVerses, setCurrentVerses] = useState<any[]>([]);
  const [selectedSurahNumber, setSelectedSurahNumber] = useState(1);
  const [playMode, setPlayMode] = useState('single'); // 'single', 'range', 'full'
  const [playRange, setPlayRange] = useState({ start: 1, end: 1 });
  const [isPlayingContinuous, setIsPlayingContinuous] = useState(false);
  const [quranSettings, setQuranSettings] = useState<any>({
    preferred_reciter_id: 3,
    show_translation: false,
    auto_scroll: true
  });
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [currentPlayingVerse, setCurrentPlayingVerse] = useState<number | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  // community states
  const [communityPosts, setCommunityPosts] = useState<any[]>([]);
  const [newPost, setNewPost] = useState('');
  const [newPostTranslation, setNewPostTranslation] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  
  const loadCommunityPosts = async () => {
    setIsLoadingPosts(true);
    try {
        // Test connection first
        await testCommunityConnection();
        
        const { data, error } = await getCommunityPosts(20, 0);
        if (!error && data) {
        setCommunityPosts(data);
        } else {
        console.error('Error loading posts:', error);
        }
    } catch (error) {
        console.error('Error loading posts:', error);
    } finally {
        setIsLoadingPosts(false);
    }
  };
    
    // Load cards for a specific deck
  const loadDeckCards = async (deck) => {
    setIsLoadingCards(true);
    setCardManagementView(deck); // ✅ Use cardManagementView instead
    
    try {
      const { data, error } = await getCardsInDeck(deck.id, user.id);
      if (!error) {
        setDeckCards(data);
        setSelectedCards(new Set());
      } else {
        setManagementMessage(`❌ Error loading cards: ${error.message}`);
        setTimeout(() => setManagementMessage(''), 3000);
      }
    } catch (error) {
      setManagementMessage(`❌ Error: ${error.message}`);
      setTimeout(() => setManagementMessage(''), 3000);
    } finally {
      setIsLoadingCards(false);
    }
  };
  // Back to deck list
  const backToMyCards = () => {
      setCardManagementView(null);
      setDeckCards([]);
      setSelectedCards(new Set());
      setManagementMessage('');
      setUndoAction(null);
    };

  // Handle card selection
  const toggleCardSelection = (cardId) => {
    setSelectedCards(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(cardId)) {
        newSelected.delete(cardId);
      } else {
        newSelected.add(cardId);
      }
      return newSelected;
    });
  };

  // Select all cards
  const selectAllCards = () => {
    setSelectedCards(new Set(deckCards.map(card => card.id)));
  };

  // Clear selection
  const clearSelection = () => {
  setSelectedCards(new Set());
  };

  // Delete single card
  const handleDeleteCard = async (cardId) => {
    try {
      const { data: deletedCard, error } = await deleteCard(cardId, user.id);
      if (!error) {
        // Remove from display
        setDeckCards(prev => prev.filter(card => card.id !== cardId));
        
        // Set up undo action
        setUndoAction({
          type: 'delete_card',
          data: deletedCard,
          message: `Deleted "${deletedCard.arabic_word}"`
        });
        
        setManagementMessage(`✅ Card deleted. Click undo to restore.`);
        setTimeout(() => {
          setManagementMessage('');
          setUndoAction(null);
        }, 5000);
        
        // Refresh deck counts
        await loadUserDecks();
      } else {
        setManagementMessage(`❌ Error deleting card: ${error.message}`);
        setTimeout(() => setManagementMessage(''), 3000);
      }
    } catch (error) {
      setManagementMessage(`❌ Error: ${error.message}`);
      setTimeout(() => setManagementMessage(''), 3000);
    }
  };

  // Delete selected cards
  const handleDeleteSelected = async () => {
    if (selectedCards.size === 0) return;
    
    try {
      const cardIds = Array.from(selectedCards);
      const { data: deletedCards, error } = await deleteMultipleCards(cardIds, user.id);
      
      if (!error) {
        // Remove from display
        setDeckCards(prev => prev.filter(card => !selectedCards.has(card.id)));
        setSelectedCards(new Set());
        
        // Set up undo action
        setUndoAction({
          type: 'delete_multiple',
          data: deletedCards,
          message: `Deleted ${deletedCards.length} cards`
        });
        
        setManagementMessage(`✅ ${deletedCards.length} cards deleted. Click undo to restore.`);
        setTimeout(() => {
          setManagementMessage('');
          setUndoAction(null);
        }, 5000);
        
        // Refresh deck counts
        await loadUserDecks();
      } else {
        setManagementMessage(`❌ Error deleting cards: ${error.message}`);
        setTimeout(() => setManagementMessage(''), 3000);
      }
    } catch (error) {
      setManagementMessage(`❌ Error: ${error.message}`);
      setTimeout(() => setManagementMessage(''), 3000);
    }
  };

  // Undo delete action
  const handleUndo = async () => {
    if (!undoAction) return;
    
    try {
      if (undoAction.type === 'delete_card') {
        const { error } = await restoreCard(undoAction.data);
        if (!error) {
          await loadDeckCards(cardManagementView);
          setManagementMessage('✅ Card restored');
        }
      } else if (undoAction.type === 'delete_multiple') {
        // Restore multiple cards
        for (const cardData of undoAction.data) {
          await restoreCard(cardData);
        }
        await loadDeckCards(cardManagementView);
        setManagementMessage(`✅ ${undoAction.data.length} cards restored`);
      }
      
      setUndoAction(null);
      await loadUserDecks();
      setTimeout(() => setManagementMessage(''), 3000);
    } catch (error) {
      setManagementMessage(`❌ Undo failed: ${error.message}`);
      setTimeout(() => setManagementMessage(''), 3000);
    }
  };
  // Handle delete deck button click
  const handleDeleteDeckClick = (deck) => {
    setDeckToDelete(deck);
    setShowDeleteModal(true);
  };

  // Confirm deck deletion
  const confirmDeleteDeck = async () => {
    if (!deckToDelete || !user?.id) return;
    
    setIsDeletingDeck(true);
    try {
      const { data, error } = await softDeleteDeck(deckToDelete.id, user.id);
      
      if (error) {
        setManagementMessage(`❌ Failed to delete deck: ${error.message}`);
        setTimeout(() => setManagementMessage(''), 5000);
      } else {
        // Show undo option
        setDeletedDeckInfo({
          deletedRecordId: data.deletedRecord.id,
          deckName: data.deckName,
          cardCount: data.cardCount,
          originalDeckId: deckToDelete.id
        });
        
        setManagementMessage(`✅ Deleted "${data.deckName}" (${data.cardCount} cards). Click undo to restore.`);
        
        // Auto-hide undo after 30 seconds
        setTimeout(() => {
          setDeletedDeckInfo(null);
          if (managementMessage.includes('Click undo')) {
            setManagementMessage('');
          }
        }, 30000);
        
        // Refresh deck list
        await loadUserDecks();
      }
    } catch (error) {
      setManagementMessage(`❌ Error: ${error.message}`);
      setTimeout(() => setManagementMessage(''), 5000);
    } finally {
      setIsDeletingDeck(false);
      setShowDeleteModal(false);
      setDeckToDelete(null);
    }
  };

  // Handle undo deck deletion
  const handleUndoDeckDeletion = async () => {
    if (!deletedDeckInfo) return;
    
    try {
      const { data, error } = await restoreDeletedDeck(deletedDeckInfo.deletedRecordId, user.id);
      
      if (error) {
        setManagementMessage(`❌ Failed to restore deck: ${error.message}`);
      } else {
        setManagementMessage(`✅ Restored "${deletedDeckInfo.deckName}"`);
        await loadUserDecks();
      }
    } catch (error) {
      setManagementMessage(`❌ Error: ${error.message}`);
    } finally {
      setDeletedDeckInfo(null);
      setTimeout(() => setManagementMessage(''), 3000);
    }
  };
// RENDER FUNCTIONS
 // Process transcript into words
  const processTranscriptWords = (transcript: any[]) => {
    const words: any[] = [];
    transcript.forEach((segment) => {
      const segmentWords = segment.text.split(/\s+/).filter((word: string) => word.trim());
      const segmentDuration = segment.duration || 2;
      const timePerWord = segmentDuration / segmentWords.length;
      
      segmentWords.forEach((word: string, index: number) => {
        words.push({
          text: word,
          timestamp: segment.start + (index * timePerWord),
          segmentStart: segment.start,
          segmentText: segment.text,
          segmentIndex: transcript.indexOf(segment)
        });
      });
    });
    return words;
  };
  // Load surahs list
  const loadSurahs = async () => {
    try {
      const { data, error } = await fetchSurahsList();
      if (!error && data) {
        setSurahs(data);
      }
    } catch (error) {
      console.error('Error loading surahs:', error);
    }
  };

   const loadSurahVerses = async (surahNumber) => {
    setIsLoadingQuran(true);
    setQuranMessage('🔄 Loading verses and translations...');
    
    // Reset play range when changing surahs
    setPlayRange({ start: 1, end: 1 });
    
    try {
      // Load verses WITH translations immediately
      const { data, error } = await fetchSurahVerses(surahNumber, true);
      
      if (!error && data && data.length > 0) {
        setCurrentVerses(data);
        
        // Set play range to full surah by default
        setPlayRange({ start: 1, end: data.length });
        
        const surah = surahs.find(s => s.number === surahNumber);
        setCurrentSurah(surah);
        
        // Create or get deck for this surah
        if (user?.id && surah) {
          const { data: deck } = await createSurahDeck(surah.name_english, surahNumber, user.id);
          setQuranDeck(deck);
        }
        
        setQuranMessage(`✅ Loaded ${data.length} verses with translations`);
        setTimeout(() => setQuranMessage(''), 3000);
      } else {
        setQuranMessage(`❌ Failed to load verses: ${error}`);
        setTimeout(() => setQuranMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error loading verses:', error);
      setQuranMessage(`❌ Error: ${error.message}`);
      setTimeout(() => setQuranMessage(''), 5000);
    } finally {
      setIsLoadingQuran(false);
    }
  };
   const playVerseAudio = async (verseNumber: number, globalAyahNumber: number) => {
    try {
      console.log('🎵 Playing verse:', verseNumber, 'Global ayah:', globalAyahNumber);
      
      // Stop any currently playing audio
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        setCurrentPlayingVerse(null);
      }
  
      if (!globalAyahNumber) {
        setQuranMessage(`❌ Missing audio data for verse ${verseNumber}`);
        setTimeout(() => setQuranMessage(''), 3000);
        return;
      }
  
      setIsLoadingAudio(true);
      setQuranMessage(`🔄 Loading verse ${verseNumber}...`);
  
      // Get audio URL from Al-Quran Cloud API
      const response = await fetch(`https://api.alquran.cloud/v1/ayah/${globalAyahNumber}/ar.alafasy`);
      const data = await response.json();
      
      console.log('🎵 Audio API Response:', data);
  
      if (data.code === 200 && data.data) {
        // Try audio URLs in order of preference
        const audioUrls = [
          data.data.audio, // Primary audio URL
          ...(data.data.audioSecondary || []) // Secondary URLs as backup
        ].filter(Boolean); // Remove any null/undefined URLs
  
        if (audioUrls.length === 0) {
          throw new Error('No audio URLs available');
        }
  
        // Try each URL until one works
        for (let i = 0; i < audioUrls.length; i++) {
          try {
            const audioUrl = audioUrls[i];
            console.log(`🔄 Trying audio URL ${i + 1}: ${audioUrl}`);
            
            const audio = new Audio();
            audio.preload = 'auto';
            
            // Test audio loading
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => reject('Timeout'), 8000);
              
              audio.oncanplaythrough = () => {
                clearTimeout(timeout);
                resolve(true);
              };
              
              audio.onerror = () => {
                clearTimeout(timeout);
                reject('Load failed');
              };
              
              audio.src = audioUrl;
            });
            
            // Success! Setup and play
            audio.onended = () => {
              setCurrentPlayingVerse(null);
              setCurrentAudio(null);
              setQuranMessage('');
            };
            
            setCurrentAudio(audio);
            setCurrentPlayingVerse(verseNumber);
            setQuranMessage(`🔊 Playing verse ${verseNumber}`);
            
            await audio.play();
            console.log(`✅ Audio playing from URL ${i + 1}`);
            return; // Exit on success
            
          } catch (error) {
            console.log(`❌ Audio URL ${i + 1} failed:`, error);
            continue; // Try next URL
          }
        }
        
        throw new Error('All audio URLs failed');
      } else {
        throw new Error('API returned no audio data');
      }
  
    } catch (error) {
      console.error('Audio playback failed:', error);
      setQuranMessage(`❌ Audio failed for verse ${verseNumber}`);
      setCurrentPlayingVerse(null);
    } finally {
      setIsLoadingAudio(false);
      setTimeout(() => {
        if (quranMessage.includes('❌')) {
          setQuranMessage('');
        }
      }, 5000);
    }
  };
  const stopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
    setCurrentPlayingVerse(null);
    setQuranMessage('');
  };
    // Navigation functions for single verse mode
  const goToNextVerse = () => {
    if (currentVerseIndex < currentVerses.length - 1) {
        setCurrentVerseIndex(currentVerseIndex + 1);
    }
    };

  const goToPreviousVerse = () => {
    if (currentVerseIndex > 0) {
        setCurrentVerseIndex(currentVerseIndex - 1);
    }
    };

  const goToVerse = (verseNumber) => {
    const index = currentVerses.findIndex(v => v.verse_number === verseNumber);
    if (index !== -1) {
        setCurrentVerseIndex(index);
    }
    };
  // Add this complete renderCardBrowser function:
  const renderCardBrowser = () => (
      <div>
        {/* Header with back button and deck info */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: 'white',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={backToMyCards}
              style={{
                backgroundColor: '#f3f4f6',
                color: '#374151',
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              ← Back to My Cards
            </button>
            
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '0', color: '#111827' }}>
                {cardManagementView?.name || 'Deck Cards'}
              </h2>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
                {deckCards.length} cards • {selectedCards.size} selected
              </p>
            </div>
          </div>

          {/* Bulk actions */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {selectedCards.size > 0 && (
              <>
                <button
                  onClick={clearSelection}
                  style={{
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Clear Selection
                </button>
                
                <button
                  onClick={handleDeleteSelected}
                  style={{
                    backgroundColor: '#dc2626',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  🗑️ Delete Selected ({selectedCards.size})
                </button>
              </>
            )}
            
            <button
              onClick={selectedCards.size === deckCards.length ? clearSelection : selectAllCards}
              style={{
                backgroundColor: '#8b5cf6',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {selectedCards.size === deckCards.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>

        {/* Undo/Message bar */}
        {managementMessage && (
          <div style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: managementMessage.includes('✅') ? '#f0fdf4' : '#fef2f2',
            color: managementMessage.includes('✅') ? '#059669' : '#dc2626',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{managementMessage}</span>
            {undoAction && (
              <button
                onClick={handleUndo}
                style={{
                  backgroundColor: '#059669',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Undo
              </button>
            )}
          </div>
        )}

        {/* Loading state */}
        {isLoadingCards ? (
          <div style={{ 
            backgroundColor: 'white', 
            padding: '40px', 
            borderRadius: '8px', 
            textAlign: 'center'
          }}>
            Loading cards...
          </div>
        ) : deckCards.length === 0 ? (
          <div style={{ 
            backgroundColor: 'white', 
            padding: '60px', 
            borderRadius: '12px', 
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px', opacity: '0.5' }}>📝</div>
            <h3 style={{ color: '#6b7280', marginBottom: '8px' }}>No cards in this deck</h3>
            <p style={{ color: '#9ca3af' }}>Start learning to create cards automatically</p>
          </div>
        ) : (
          /* Cards table */
          <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '40px 1fr 2fr 80px 100px 80px 120px 80px',
              gap: '12px',
              padding: '12px 16px',
              backgroundColor: '#f9fafb',
              borderBottom: '1px solid #e5e7eb',
              fontSize: '11px',
              fontWeight: '600',
              color: '#374151',
              textTransform: 'uppercase'
            }}>
              <div>
                <input
                  type="checkbox"
                  checked={selectedCards.size === deckCards.length && deckCards.length > 0}
                  onChange={selectedCards.size === deckCards.length ? clearSelection : selectAllCards}
                  style={{ cursor: 'pointer' }}
                />
              </div>
              <div>Arabic Word</div>
              <div>Context</div>
              <div>State</div>
              <div>Due Date</div>
              <div>Reps</div>
              <div>Source</div>
              <div>Actions</div>
            </div>

            {/* Table rows */}
            {deckCards.map((card, index) => (
              <div 
                key={card.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 2fr 80px 100px 80px 120px 80px',
                  gap: '12px',
                  padding: '12px 16px',
                  borderBottom: index < deckCards.length - 1 ? '1px solid #f3f4f6' : 'none',
                  alignItems: 'center',
                  backgroundColor: selectedCards.has(card.id) ? '#f8f9fa' : 'transparent'
                }}
              >
                {/* Checkbox */}
                <div>
                  <input
                    type="checkbox"
                    checked={selectedCards.has(card.id)}
                    onChange={() => toggleCardSelection(card.id)}
                    style={{ cursor: 'pointer' }}
                  />
                </div>

                {/* Arabic Word */}
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  direction: 'rtl',
                  fontFamily: 'Arial, sans-serif',
                  color: '#111827'
                }}>
                  {card.arabic_word}
                </div>

                {/* Context */}
                <div style={{ 
                  fontSize: '14px', 
                  color: '#6b7280',
                  direction: 'rtl',
                  fontFamily: 'Arial, sans-serif',
                  lineHeight: '1.4'
                }}>
                  {card.display_context}
                </div>

                {/* State */}
                <div>
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    backgroundColor: 
                      card.state === 'new' ? '#dbeafe' :
                      card.state === 'learning' ? '#fed7aa' :
                      card.state === 'review' ? '#dcfce7' : '#fecaca',
                    color: 
                      card.state === 'new' ? '#1e40af' :
                      card.state === 'learning' ? '#ea580c' :
                      card.state === 'review' ? '#059669' : '#dc2626'
                  }}>
                    {card.state}
                  </span>
                </div>

                {/* Due Date */}
                <div style={{ 
                  fontSize: '12px', 
                  color: card.days_until_due <= 0 ? '#dc2626' : '#6b7280',
                  fontWeight: card.days_until_due <= 0 ? '600' : '400'
                }}>
                  {card.days_until_due <= 0 ? 'Due now' : 
                  card.days_until_due === 1 ? 'Tomorrow' :
                  `${card.days_until_due}d`}
                </div>

                {/* Reps */}
                <div style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>
                  {card.reps || 0}
                  {card.lapses > 0 && (
                    <span style={{ color: '#dc2626', fontSize: '10px' }}>
                      /{card.lapses}
                    </span>
                  )}
                </div>

                {/* Source */}
                <div style={{ fontSize: '11px', color: '#6b7280' }}>
                  {card.source_info}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => handleDeleteCard(card.id)}
                    style={{
                      backgroundColor: '#fef2f2',
                      color: '#dc2626',
                      padding: '4px 6px',
                      borderRadius: '4px',
                      border: '1px solid #fecaca',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                    title="Delete card"
                  >
                    🗑️
                  </button>
                  
                  <button
                    style={{
                      backgroundColor: '#f0f9ff',
                      color: '#2563eb',
                      padding: '4px 6px',
                      borderRadius: '4px',
                      border: '1px solid #dbeafe',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                    title="Edit card (coming soon)"
                  >
                    ✏️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );

   
  // 2. ENHANCED QURAN TRANSLATION CALL
  const handleQuranWordDoubleClick = async (word: string, surahNumber: number, verseNumber: number, wordPosition: number, verseText: string) => {
    if (!user?.id) {
      setQuranMessage('❌ Not logged in');
      setTimeout(() => setQuranMessage(''), 3000);
      return;
    }
  
    if (!quranDeck?.id) {
      setQuranMessage('❌ No deck loaded');
      setTimeout(() => setQuranMessage(''), 3000);
      return;
    }
  
    const cleanWord = cleanArabicWord(word);
    if (!cleanWord) {
      setQuranMessage('❌ No Arabic text in this word');
      setTimeout(() => setQuranMessage(''), 3000);
      return;
    }
  
    try {
      setQuranMessage('🔄 Creating enhanced Quranic analysis...');
      
      // Enhanced context with Surah info
      const surahName = currentSurah?.name_english || 'Unknown Surah';
      const enhancedContext = `Surah ${surahName} (${surahNumber}), Verse ${verseNumber}: ${verseText}`;
      
      // ENHANCED API CALL
      const translationData = await fetchEnhancedTranslation(
        cleanWord, 
        enhancedContext, 
        'quran',
        {
          surahName: surahName,
          surahNumber: surahNumber,
          verseNumber: verseNumber
        }
      );
      
      if (translationData) {
        setQuranMessage('🔄 Enhanced Quranic analysis received, saving card...');
        console.log('Enhanced Quran translation:', translationData);
      } else {
        setQuranMessage('🔄 Analysis failed, saving card without enhanced data...');
      }
  
      // Save Quran card with enhanced translation data
      const result = await addQuranCard(
        quranDeck.id,
        cleanWord,
        surahNumber,
        verseNumber,
        wordPosition,
        enhancedContext, // Use enhanced context
        user.id,
        translationData
      );
  
      if (result.error) {
        if (result.error.message?.includes('duplicate key')) {
          setQuranMessage(`ℹ️ "${cleanWord}" already in deck`);
        } else {
          setQuranMessage(`❌ Error: ${result.error.message}`);
        }
      } else {
        const message = translationData 
          ? `✅ Added "${cleanWord}" with enhanced Quranic analysis!`
          : `✅ Added "${cleanWord}" (analysis will be added later)`;
        setQuranMessage(message);
        await loadUserDecks();
      }
    } catch (error) {
      setQuranMessage(`❌ Failed: ${error.message}`);
    } finally {
      setTimeout(() => setQuranMessage(''), 4000);
    }
  };
  // Load user Quran settings
  const loadQuranSettings = async () => {
    if (!user?.id) return;
    try {
      const { data } = await getUserQuranSettings(user.id);
      if (data) {
        setQuranSettings(data);
        setSelectedSurahNumber(data.current_surah || 1);
      }
    } catch (error) {
      console.error('Error loading Quran settings:', error);
    }
  };
  const getExpandedContext = (word: any, transcriptWords: any[], wordIndex: number) => {
    const startIndex = Math.max(0, wordIndex - 10);
    const endIndex = Math.min(transcriptWords.length - 1, wordIndex + 10);
    const contextWords = transcriptWords.slice(startIndex, endIndex + 1);
    return contextWords.map(w => w.text).join(' ');
  };
 
  const createMCDContext = (context, targetWord) => {
    if (!context || !targetWord) return context;
    
    let cleanedContext = context;
    
    // Step 1: Remove video metadata prefixes
    // Matches: "Video: [anything] - Context: " or "Video: [anything] Context: "
    cleanedContext = cleanedContext.replace(/^Video:\s*.*?\s*-?\s*Context:\s*/i, '');
    
    // Step 2: Remove Quran metadata prefixes  
    // Matches: "Surah [name] ([number]), Verse [number]: " 
    cleanedContext = cleanedContext.replace(/^Surah\s+[^(]+\s*\([^)]+\),\s*Verse\s+\d+:\s*/i, '');
    
    // Step 3: Remove any remaining English metadata patterns
    // Matches patterns like "Speaker: [name] -" or similar
    cleanedContext = cleanedContext.replace(/^[A-Za-z]+:\s*[^-]*-\s*/g, '');
    
    // Step 4: Clean up any extra whitespace
    cleanedContext = cleanedContext.trim();
    
    // Step 5: Apply word replacement with [...]
    const cleanTarget = cleanArabicWord(targetWord).trim();
    if (!cleanTarget) return cleanedContext;
    
    // Create aggressive regex patterns to catch the word with various diacritics
    const escapedWord = cleanTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Try multiple patterns to catch the word
    const patterns = [
      new RegExp(`\\b${escapedWord}\\b`, 'gi'), // Exact match with word boundaries
      new RegExp(`${escapedWord}`, 'gi'), // Just the word without boundaries
      new RegExp(`\\s${escapedWord}\\s`, 'gi'), // Word with spaces
      new RegExp(`${escapedWord}[\\u064B-\\u065F]*`, 'gi') // Word with potential diacritics
    ];
    
    let result = cleanedContext;
    
    // Try each pattern until one works
    for (const pattern of patterns) {
      const testResult = result.replace(pattern, ' [...] ');
      if (testResult !== result) {
        result = testResult;
        break;
      }
    }
    
    // Clean up extra spaces around the deletion
    result = result.replace(/\s+\[\.\.\.\]\s+/g, ' [...] ');
    result = result.replace(/^\s+|\s+$/g, ''); // Trim
    
    return result;
  };
  // Progress stats calculation
  const calculateProgressStats = () => {
    const totalUniqueWords = decks.reduce((total, deck) => total + (deck.totalCards || 0), 0);
    const targetWords = 1500; // Quran comprehension target
    const progressPercentage = Math.min(Math.round((totalUniqueWords / targetWords) * 100), 100);
    const totalNew = decks.reduce((total, deck) => total + (deck.newCards || 0), 0);
    const totalDue = decks.reduce((total, deck) => total + (deck.reviewCards || 0), 0);
    const totalLearning = decks.reduce((total, deck) => total + (deck.learningCards || 0), 0);
    
    return { totalUniqueWords, progressPercentage, totalNew, totalDue, totalLearning };
  };

  const getCurrentSegment = () => {
    // Adjust for transcript timing offset - subtract time to sync better
    const adjustedTime = currentTime + 1.0; // Try different values: 0.3, 0.5, 0.7
    // Try each of these one at a time:
  // adjustedTime = currentTime - 1.0;  // If text is ahead of audio
  // adjustedTime = currentTime - 0.5;  // Moderate adjustment
  // adjustedTime = currentTime + 0.5;  // If text is behind audio
  // adjustedTime = currentTime + 1.0;  // If text is way behind
    
    for (let i = 0; i < transcript.length; i++) {
        const segment = transcript[i];
        const segmentStart = segment.start;
        const segmentEnd = segment.start + (segment.duration || 2);
        if (adjustedTime >= segmentStart && adjustedTime < segmentEnd) {
        return { segment, index: i };
        }
    }
    
    // Fallback logic
    for (let i = 0; i < transcript.length; i++) {
        if (transcript[i].start > adjustedTime) {
        return i > 0 ? { segment: transcript[i-1], index: i-1 } : null;
        }
    }
    return null;
    };

  // Get next segment
  const getNextSegment = () => {
    const currentData = getCurrentSegment();
    if (currentData && currentData.index + 1 < transcript.length) {
      return { segment: transcript[currentData.index + 1], index: currentData.index + 1 };
    }
    return null;
  };

  // Get processed words
  const transcriptWords = transcript.length > 0 && transcript.length < 1000 ? 
    processTranscriptWords(transcript) : [];

  // Fixed Harakat functions with better error handling
  const addHarakat = async (text: string): Promise<string> => {
    if (harakatCache.has(text)) {
        return harakatCache.get(text) || text;
    }
    
    try {
        const response = await fetch('/api/harakat', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text })
        });
        
        if (response.ok) {
        const data = await response.json();
        const harakatText = data.result || text;
        setHarakatCache(prev => new Map(prev.set(text, harakatText)));
        return harakatText;
        } else {
        console.log('Harakat API error:', response.status);
        // Cache the original text so we don't keep retrying
        setHarakatCache(prev => new Map(prev.set(text, text)));
        return text;
        }
    } catch (error) {
        console.log('Harakat service error:', error);
        // Cache the original text so we don't keep retrying failed requests
        setHarakatCache(prev => new Map(prev.set(text, text)));
        return text;
    }
    };

  const processHarakatForTranscript = async () => {
    if (!transcript.length || isProcessingHarakat) return;
    
    setIsProcessingHarakat(true);
    setCardMessage('🔄 Adding harakat...');
    
    try {
        const processedTranscript = [];
        for (const segment of transcript) {
        const harakatText = await addHarakat(segment.text);
        processedTranscript.push({ ...segment, text: harakatText });
        // Reduced delay from 100ms to 50ms
        await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        setTranscript(processedTranscript);
        setCardMessage('✅ Harakat added!');
    } catch (error) {
        console.error('Harakat processing error:', error);
        setCardMessage('❌ Failed to add harakat');
    } finally {
        setIsProcessingHarakat(false);
        setTimeout(() => setCardMessage(''), 3000);
    }
    };

  // Load user decks
  const loadUserDecks = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await getUserDecks(user.id);
      if (!error) setDecks(data || []);
    } catch (error) {
      console.error('Error loading decks:', error);
    }
  };

  // Effects
  // Load posts when tab opens
  useEffect(() => {
    if (activeTab === 'community' && user?.id) {
        loadCommunityPosts();
    }
  }, [activeTab, user]);

  useEffect(() => {
    if (user?.id) loadUserDecks();
  }, [user]);

  useEffect(() => {
    if (activeTab === 'watch') {
        loadYouTubeAPI();
    }
    return () => {
        // Cancel animation frame instead of interval
        if (intervalRef.current) {
        cancelAnimationFrame(intervalRef.current);
        }
    };
    }, [activeTab]);

  useEffect(() => {
    if (currentVideoId && window.YT) {
      setTimeout(() => initializePlayer(), 500);
    }
  }, [currentVideoId]);

  // Auto-scroll effect 
  useEffect(() => {
    if (currentWordRef.current && transcriptRef.current) {
        const wordElement = currentWordRef.current;
        const containerElement = transcriptRef.current;
        
        const containerHeight = containerElement.clientHeight;
        const containerScrollTop = containerElement.scrollTop;
        const wordOffsetTop = wordElement.offsetTop;
        
        const wordTop = wordOffsetTop - containerScrollTop;
        const wordBottom = wordTop + wordElement.offsetHeight;
        
        // Much smaller buffer - only scroll when very close to edges
        const scrollBuffer = 20; // Reduced from 50
        const isAboveView = wordTop < scrollBuffer;
        const isBelowView = wordBottom > containerHeight - scrollBuffer;
        
        if (isAboveView || isBelowView) {
        // Scroll less aggressively - keep more content visible
        const targetScrollTop = wordOffsetTop - (containerHeight / 2); // Center the word
        containerElement.scrollTo({
            top: Math.max(0, targetScrollTop),
            behavior: 'smooth'
        });
        }
    }
    }, [currentTime, transcript]);
   // Add this useEffect after your existing useEffects in MainApp

  useEffect(() => {
    if (activeTab === 'read' && user?.id) {
      loadSurahs();
      loadQuranSettings();
    }
  }, [activeTab, user]);

  useEffect(() => {
    if (selectedSurahNumber && surahs.length > 0) {
      loadSurahVerses(selectedSurahNumber);
    }
  }, [selectedSurahNumber, surahs]);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
        if (!event.target.closest('[data-profile-dropdown]')) {
        // Close dropdown logic will be handled by the ProfileDropdown component
        }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
    }, []);

  // YouTube functions
  const loadYouTubeAPI = () => {
    if (!window.YT) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.body.appendChild(script);
      window.onYouTubeIframeAPIReady = () => console.log('YouTube API ready');
    }
  };

  const initializePlayer = () => {
    console.log('🎯 initializePlayer called');
    console.log('YouTube API ready:', !!window.YT);
    console.log('Player ref exists:', !!playerRef.current);
    console.log('Current video ID:', currentVideoId);
    
    if (!window.YT || !playerRef.current || !currentVideoId) {
      console.log('❌ Missing requirements for player initialization');
      return;
    }
    
    try {
      if (player) {
        console.log('🔄 Destroying existing player');
        player.destroy();
        setPlayer(null);
      }
      
      console.log('🔄 Creating new YouTube player...');
      const newPlayer = new window.YT.Player(playerRef.current, {
        height: '100%',
        width: '100%',
        videoId: currentVideoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          disablekb: 0,
          enablejsapi: 1,
          fs: 1,
          rel: 0,
          modestbranding: 1
        },
        events: {
          onReady: (event) => {
            console.log('✅ YouTube player ready!');
            onPlayerReady(event);
          },
          onStateChange: onPlayerStateChange,
          onError: (error) => {
            console.error('❌ YouTube player error:', error.data);
            setTranscriptError('Video failed to load');
          }
        }
      });
      
      console.log('✅ Player created successfully');
    } catch (error) {
      console.error('❌ Player initialization error:', error);
    }
  };

  const onPlayerReady = (event: any) => {
    try {
      console.log('🎬 onPlayerReady called');
      const videoDuration = event.target.getDuration();
      setDuration(videoDuration);
      const videoData = event.target.getVideoData();
      
      console.log('📹 Video data:', videoData);
      console.log('👤 User ID:', user?.id);
      console.log('🆔 Current Video ID:', currentVideoId);
      
      if (videoData && videoData.title) {
        setCurrentVideoTitle(videoData.title);
        if (user?.id) {
          console.log('🔄 About to call handleCreateOrGetDeck...');
          handleCreateOrGetDeck(videoData.title, currentVideoId);
          console.log('✅ handleCreateOrGetDeck called');
        } else {
          console.log('❌ No user ID - cannot create deck');
        }
      } else {
        console.log('❌ No video data or title');
      }
      
      // Clear any existing interval
      if (intervalRef.current) clearInterval(intervalRef.current);
      
      // Use requestAnimationFrame for smooth updates (60fps when playing)
      const updateTime = () => {
        if (event.target && event.target.getCurrentTime && event.target.getPlayerState() === window.YT.PlayerState.PLAYING) {
          setCurrentTime(event.target.getCurrentTime());
        }
        intervalRef.current = requestAnimationFrame(updateTime);
      };
      
      updateTime(); // Start the animation loop
      setPlayer(event.target);
    } catch (error) {
      console.error('Error in onPlayerReady:', error);
    }
  };

  const onPlayerStateChange = (event: any) => {
    try {
      setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
    } catch (error) {
      console.error('Error in onPlayerStateChange:', error);
    }
  };

  // Deck functions
  const handleCreateOrGetDeck = async (videoTitle: string, videoId: string) => {
    if (!user?.id) return;
    
    try {
      console.log('🔄 Creating/getting deck for:', { videoTitle, videoId, userId: user.id });
      
      // Step 1: Try to find existing deck
      const { data: existingDeck, error: fetchError } = await supabase
        .from('decks')
        .select('*')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .single();

      if (existingDeck && !fetchError) {
        console.log('✅ Found existing deck:', existingDeck);
        setCurrentDeck(existingDeck);
        loadUserDecks();
        return;
      }

      console.log('🔄 Creating new deck...');
      
      // Step 2: Create new deck
      const { data: newDeck, error: createError } = await supabase
        .from('decks')
        .insert({
          user_id: user.id,
          name: videoTitle || `Video ${videoId}`,
          video_id: videoId,
          video_title: videoTitle,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating deck:', createError);
        return;
      }

      console.log('✅ Created new deck:', newDeck);
      setCurrentDeck(newDeck);
      loadUserDecks();
      
    } catch (error) {
      console.error('❌ Error in handleCreateOrGetDeck:', error);
    }
  };

  // Video functions
  const extractVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const seekTo = (seconds: number) => {
    if (player && player.seekTo) {
        try {
        // Don't subtract time here since we're using segmentStart directly
        player.seekTo(seconds, true);
        } catch (error) {
        console.error('Error seeking:', error);
        }
    }
    };

  const fetchTranscript = async (videoId: string) => {
    if (!videoId) return;
    setIsLoadingTranscript(true);
    setTranscriptError('');
    
    try {
      const response = await fetch(`/api/transcript?videoId=${videoId}`);
      const data = await response.json();
      
      if (data.transcript && data.transcript.length > 0) {
        setTranscript(data.transcript);
        setTranscriptError('');
        
        // CREATE DECK HERE since video player is blocked
        if (user?.id && currentVideoId) {
          console.log('🔄 Creating deck from transcript fetch...');
          await handleCreateOrGetDeck(`Video ${videoId}`, videoId);
        }
        
      } else {
        setTranscriptError('');
        setTranscript([]);
        setCardMessage('ℹ️ No transcript available for this video');
        setTimeout(() => setCardMessage(''), 5000);
      }
    } catch (error: any) {
      setTranscriptError('');
      setTranscript([]);
      setCardMessage('ℹ️ No transcript available for this video');
      setTimeout(() => setCardMessage(''), 5000);
    } finally {
      setIsLoadingTranscript(false);
    }
  };

  const loadNewVideo = async () => {
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      setTranscriptError('Please enter a valid YouTube URL');
      return;
    }
    if (videoId === currentVideoId) return;

    console.log('🎬 Loading new video:', videoId);

    setCurrentVideoId('');
    setCurrentVideoTitle('');
    setTranscript([]);
    setTranscriptError('');
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setCurrentDeck(null);
    
    if (player) {
      try {
        player.destroy();
      } catch (e) {
        console.log('Error destroying player:', e);
      }
      setPlayer(null);
    }
    
    console.log('🔄 Setting video ID:', videoId);
    setCurrentVideoId(videoId);
    
    console.log('🔄 Fetching transcript...');
    await fetchTranscript(videoId);
    
    console.log('✅ Video loading complete');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Card functions
  const handleIndividualWordClick = (word: any, timestamp: number) => {
    // Use the segment start time, not the calculated word timestamp
    seekTo(word.segmentStart);
    };
  const handleWordDoubleClick = async (word) => {
    if (!user?.id) {
      setCardMessage('❌ Not logged in');
      setTimeout(() => setCardMessage(''), 3000);
      return;
    }
    if (!currentDeck?.id) {
      setCardMessage('❌ No deck loaded');
      setTimeout(() => setCardMessage(''), 3000);
      return;
    }
  
    const cleanWord = cleanArabicWord(word.text);
    if (!cleanWord) {
      setCardMessage('❌ No Arabic text in this word');
      setTimeout(() => setCardMessage(''), 3000);
      return;
    }
  
    // Enhanced context with video title
    const getEnhancedYouTubeContext = () => {
      if (transcriptWords.length > 0) {
        const wordIndex = transcriptWords.findIndex(w =>
          w.segmentIndex === word.segmentIndex &&
          cleanArabicWord(w.text) === cleanWord
        );
        
        if (wordIndex !== -1) {
          const startIndex = Math.max(0, wordIndex - 10);
          const endIndex = Math.min(transcriptWords.length - 1, wordIndex + 10);
          const contextWords = transcriptWords.slice(startIndex, endIndex + 1);
          const contextText = contextWords.map(w => w.text).join(' ');
          
          // Enhanced format with video title
          return `Video: ${currentVideoTitle || 'Educational Content'} - Context: ${contextText}`;
        }
      }
      return `Video: ${currentVideoTitle || 'Educational Content'} - Context: ${word.segmentText || cleanWord}`;
    };
  
    const enhancedContext = getEnhancedYouTubeContext();
    
    setIsAddingCard(true);
    setCardMessage('🔄 Creating enhanced Arabic analysis...');
  
    try {
      // ENHANCED API CALL
      const translationData = await fetchEnhancedTranslation(
        cleanWord, 
        enhancedContext, 
        'youtube', 
        {
          videoTitle: currentVideoTitle,
          timestamp: word.timestamp
        }
      );
      
      if (translationData) {
        setCardMessage('🔄 Enhanced translation received, saving card...');
        console.log('Enhanced YouTube translation:', translationData);
      } else {
        setCardMessage('🔄 Translation failed, saving card without enhanced data...');
      }
  
      // Save card with enhanced translation data
      const result = await addCardToDeck(
        currentDeck.id,
        cleanWord,
        enhancedContext,
        word.timestamp,
        user.id,
        translationData
      );
  
      if (result.error) {
        if (result.error.message?.includes('duplicate key')) {
          setCardMessage(`ℹ️ "${cleanWord}" already in deck`);
        } else {
          setCardMessage(`❌ Error: ${result.error.message}`);
        }
      } else {
        const message = translationData 
          ? `✅ Added "${cleanWord}" with enhanced analysis!`
          : `✅ Added "${cleanWord}" (analysis will be added later)`;
        setCardMessage(message);
        await loadUserDecks();
      }
    } catch (error) {
      setCardMessage(`❌ Failed: ${error.message}`);
    } finally {
      setIsAddingCard(false);
      setTimeout(() => setCardMessage(''), 4000);
    }
  };

  
  const saveCardDetails = async () => {
    if (!currentDeck?.id || !user?.id || !editingCard) return;
    setIsAddingCard(true);
    try {
      const result = await addCardToDeck(
        currentDeck.id,
        cardForm.arabic_word,
        cardForm.context,
        editingCard.timestamp,
        user.id
      );
      if (result.error) {
        setCardMessage(`❌ Error: ${result.error.message}`);
      } else {
        setCardMessage(`✅ Added "${cardForm.arabic_word}" to flashcards!`);
        setShowCardModal(false);
        await loadUserDecks();
      }
    } catch (error: any) {
      setCardMessage(`❌ Failed: ${error.message}`);
    } finally {
      setIsAddingCard(false);
      setTimeout(() => setCardMessage(''), 3000);
    }
  };
   // 3. ENHANCED TRANSLATION FETCH FUNCTION
  const fetchEnhancedTranslation = async (arabicWord: string, context: string, sourceType: string, sourceInfo: any) => {
    try {
      console.log('🔄 Fetching enhanced translation for:', arabicWord, 'Type:', sourceType);
      
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          arabicWord: arabicWord,
          context: context,
          sourceType: sourceType,
          sourceInfo: sourceInfo
        })
      });
  
      if (!response.ok) {
        throw new Error(`Enhanced translation API failed: ${response.status}`);
      }
  
      const data = await response.json();
      
      if (data.success && data.translation) {
        console.log('✅ Enhanced translation received:', data.translation);
        return data.translation;
      } else {
        console.warn('⚠️ Enhanced translation API returned no data');
        return null;
      }
    } catch (error) {
      console.error('❌ Enhanced translation fetch failed:', error);
      return null;
    }
    console.log('🔍 API Response:', data);
    console.log('🔍 Translation data:', data.translation);
  };
  // Study functions
  const startStudying = async (deck: any) => {
    try {
      const { data: cards } = await getCardsForReview(deck.id, user.id, 20);
      if (cards && cards.length > 0) {
        setStudyCards(cards);
        setCurrentStudyCard(cards[0]);
        setStudyCardIndex(0);
        setShowAnswer(false);
        setStudyDeck(deck);
        setIsStudying(true);
      } else {
        setCardMessage('ℹ️ No cards ready for review');
        setTimeout(() => setCardMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error starting study:', error);
    }
  };
  // NEW: Start studying from all decks combined
  const startStudyingAllDecks = async () => {
    try {
      console.log('Starting study session from all decks...');
      
      // Get cards from all decks, prioritizing due cards
      let allCards = [];
      
      for (const deck of decks) {
        const { data: deckCards } = await getCardsForReview(deck.id, user.id, 50); // Get more cards per deck
        if (deckCards && deckCards.length > 0) {
          allCards = [...allCards, ...deckCards];
        }
      }
      
      if (allCards.length === 0) {
        setCardMessage('ℹ️ No cards ready for review across all decks');
        setTimeout(() => setCardMessage(''), 3000);
        return;
      }
      
      // Sort by priority: due cards first, then new cards (limit 10 new max)
      const dueCards = allCards.filter(card => card.state === 'review' || card.state === 'relearning');
      const learningCards = allCards.filter(card => card.state === 'learning');
      const newCards = allCards.filter(card => card.state === 'new').slice(0, 10); // Limit to 10 new cards
      
      // Combine in priority order
      const studySession = [...dueCards, ...learningCards, ...newCards];
      
      // Shuffle for variety (but maintain priority order within each group)
      const shuffledSession = [
        ...shuffleArray(dueCards),
        ...shuffleArray(learningCards), 
        ...shuffleArray(newCards)
      ].slice(0, 50); // Limit total session to 50 cards
      
      if (shuffledSession.length > 0) {
        setStudyCards(shuffledSession);
        setCurrentStudyCard(shuffledSession[0]);
        setStudyCardIndex(0);
        setShowAnswer(false);
        setStudyDeck({ name: 'All Cards', id: 'all-cards' }); // Virtual deck
        setIsStudying(true);
        
        console.log(`✅ Starting study session: ${shuffledSession.length} cards (${newCards.length} new, ${dueCards.length} due, ${learningCards.length} learning)`);
      }
      
    } catch (error) {
      console.error('Error starting all-deck study session:', error);
      setCardMessage('❌ Failed to start study session');
      setTimeout(() => setCardMessage(''), 3000);
    }
  };
  
  // Helper function to shuffle array
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };
  const handleStudyAnswer = async (rating: number) => {
    if (!currentStudyCard || !user?.id) return;
    
    try {
        // reviewCard returns { data, error }, not a thrown exception
        const result = await reviewCard(currentStudyCard.id, rating, user.id);
        
        if (result.error) {
        console.error('Error reviewing card:', result.error);
        setCardMessage(`❌ Error: ${result.error.message || 'Failed to review card'}`);
        setTimeout(() => setCardMessage(''), 3000);
        return;
        }
        
        // Success - move to next card
        if (studyCardIndex + 1 < studyCards.length) {
        setStudyCardIndex(studyCardIndex + 1);
        setCurrentStudyCard(studyCards[studyCardIndex + 1]);
        setShowAnswer(false);
        setShowMoreDetails(false);
        } else {
        setCardMessage('🎉 Study session complete!');
        setTimeout(() => setCardMessage(''), 3000);
        setIsStudying(false);
        await loadUserDecks();
        }
    } catch (error) {
        console.error('Unexpected error in handleStudyAnswer:', error);
        setCardMessage('❌ Unexpected error occurred');
        setTimeout(() => setCardMessage(''), 3000);
    }
   };

  const handleSegmentClick = (timestamp: number) => {
    seekTo(timestamp);
  };

  // Render functions
  const renderWordByWordTranscript = () => {
    if (!transcriptWords.length) {
        return renderSegmentBasedTranscript();
    }
    
    const currentSegmentData = getCurrentSegment();
    // Show NEXT segment (current + 1) in purple as you had it (this is correct for your transcript)
    const nextSegmentData = currentSegmentData && currentSegmentData.index + 1 < transcript.length ? 
        { segment: transcript[currentSegmentData.index + 1], index: currentSegmentData.index + 1 } : null;
    
    return (
        <div style={{ 
        fontSize: '2.2rem', 
        lineHeight: '2.8', 
        direction: 'rtl',
        fontFamily: 'Arial, sans-serif',
        padding: '30px 30px 100px 30px',
        textAlign: 'justify'
        }}>
        {transcriptWords.map((word, index) => {
            const isInNextSegment = nextSegmentData && word.segmentIndex === nextSegmentData.index;
            const isPastSegment = currentSegmentData && word.segmentIndex <= currentSegmentData.index;
            
            return (
            <span
                key={`${word.timestamp}-${index}`}
                // Fixed: Set ref on the FIRST word of the purple segment for auto-scroll
                ref={isInNextSegment && index === transcriptWords.findIndex(w => w.segmentIndex === nextSegmentData.index) ? currentWordRef : null}
                style={{
                cursor: 'pointer',
                backgroundColor: 'transparent',
                color: isPastSegment ? '#9ca3af' : // Past segments (including current) gray
                        isInNextSegment ? '#8b5cf6' : // Next segment purple (actually current audio)
                        '#333', // Future segments black
                fontWeight: isInNextSegment ? '600' : '400',
                transition: 'all 0.15s ease',
                opacity: isPastSegment ? '0.7' : '1',
                padding: '1px 2px',
                borderRadius: '2px',
                display: 'inline'
                }}
                onMouseEnter={(e) => {
                if (!isInNextSegment) {
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                }
                }}
                onMouseLeave={(e) => {
                if (!isInNextSegment) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                }
                }}
                onClick={() => handleIndividualWordClick(word, word.timestamp)}
                onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleWordDoubleClick(word);
                }}
                title={`"${word.text}" - Double-click to add to flashcards`}
            >
                {word.text}
                {index < transcriptWords.length - 1 ? ' ' : ''}
            </span>
            );
        })}
        </div>
    );
    };
  // STEP 6: Add these render functions to your MainApp component:

  // Deck list with integrated Manage button
  const renderDeckList = () => {
    // NEW: Progress stats section
    const stats = calculateProgressStats();
    
    return (
      <div>
        {/* NEW: Progress Statistics */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '16px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#111827',
            marginBottom: '8px',
            fontFamily: 'Roboto, sans-serif'
          }}>
            {stats.totalUniqueWords.toLocaleString()} words • {stats.progressPercentage}% to fluency
          </div>
          
          {/* Progress Bar */}
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#f3f4f6',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '12px'
          }}>
            <div style={{
              width: `${stats.progressPercentage}%`,
              height: '100%',
              backgroundColor: '#8b5cf6',
              transition: 'width 0.3s ease'
            }}></div>
          </div>
          
          <div style={{
            fontSize: '14px',
            color: '#6b7280',
            fontFamily: 'Roboto, sans-serif'
          }}>
            Target: 1,500 words for Quranic comprehension
          </div>
        </div>
      {/* Management message with undo functionality */}
      {managementMessage && (
        <div style={{
          marginBottom: '16px',
          padding: '12px',
          backgroundColor: managementMessage.includes('✅') ? '#f0fdf4' : '#fef2f2',
          color: managementMessage.includes('✅') ? '#059669' : '#dc2626',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{managementMessage}</span>
          {/* Show undo button if we have deleted deck info */}
          {deletedDeckInfo && (
            <button
              onClick={handleUndoDeckDeletion}
              style={{
                backgroundColor: '#059669',
                color: 'white',
                padding: '6px 16px',
                borderRadius: '4px',
                border: 'none',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Undo Delete
            </button>
          )}
        </div>
      )}

      {decks.length === 0 ? (
        // Keep existing empty state unchanged
        <div style={{ 
          backgroundColor: 'white', 
          padding: '60px', 
          borderRadius: '12px', 
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
          border: '1px solid #f3f4f6'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px', opacity: '0.5' }}>📚</div>
          <h3 style={{ color: '#6b7280', marginBottom: '8px', fontSize: '18px' }}>No decks yet</h3>
          <p style={{ color: '#9ca3af', marginBottom: '24px', fontSize: '14px' }}>
            Go to the Watch Videos tab and load a video to start creating flashcards
          </p>
          <button
            onClick={() => setActiveTab('watch')}
            style={{
              backgroundColor: '#8b5cf6',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Watch Videos
          </button>
        </div>
      ) : (
        // NEW: Master deck section
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          {/* Master Deck Header */}
          <div 
            onClick={() => setIsMasterDeckExpanded(!isMasterDeckExpanded)}
            style={{
              padding: '16px 20px',
              cursor: 'pointer',
              borderBottom: isMasterDeckExpanded ? '1px solid #f3f4f6' : 'none',
              backgroundColor: isMasterDeckExpanded ? '#f9fafb' : 'white',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '16px', color: '#6b7280' }}>
                  {isMasterDeckExpanded ? '▼' : '▶'}
                </span>
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  color: '#111827',
                  fontFamily: 'Roboto, sans-serif'
                }}>
                  All Cards
                </span>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startStudyingAllDecks();
                }}
                style={{
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Study All
              </button>
            </div>
            
            {/* Master deck stats */}
            <div style={{ 
              display: 'flex', 
              gap: '16px', 
              marginTop: '8px',
              fontSize: '14px',
              fontFamily: 'Roboto, sans-serif'
            }}>
              <span style={{ color: '#059669' }}>📗 {stats.totalNew} new</span>
              <span style={{ color: '#dc2626' }}>📕 {stats.totalDue} due</span>
              <span style={{ color: '#ea580c' }}>📙 {stats.totalLearning} learning</span>
            </div>
          </div>
      
          {/* Individual Decks (when expanded) */}
          {isMasterDeckExpanded && (
            <div style={{
              maxHeight: '400px',
              overflowY: 'auto',
              transition: 'all 0.3s ease'
            }}>
              {decks.map((deck, index) => (
                <div 
                  key={deck.id || index}
                  onClick={() => startStudying(deck)}
                  style={{
                    padding: '12px 20px 12px 40px', // Indented
                    borderBottom: index < decks.length - 1 ? '1px solid #f3f4f6' : 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#111827',
                        fontFamily: 'Roboto, sans-serif',
                        marginBottom: '4px'
                      }}>
                        📚 {deck.name || deck.video_title || 'Untitled Deck'} ({deck.totalCards || 0} words)
                      </div>
                      <div style={{
                        fontSize: '12px',
                        fontFamily: 'Roboto, sans-serif',
                        display: 'flex',
                        gap: '12px'
                      }}>
                        <span style={{ color: '#059669' }}>[new: {deck.newCards || 0}]</span>
                        <span style={{ color: '#dc2626' }}>[due: {deck.reviewCards || 0}]</span>
                        <span style={{ color: '#ea580c' }}>[learning: {deck.learningCards || 0}]</span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          loadDeckCards(deck);
                        }}
                        style={{
                          backgroundColor: '#f3f4f6',
                          color: '#374151',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: 'none',
                          fontSize: '10px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Manage
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDeckClick(deck);
                        }}
                        style={{
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid #fecaca',
                          fontSize: '10px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
   );
  };
  const renderSegmentBasedTranscript = () => {
    if (!transcript.length) return null;
    const currentData = getCurrentSegment();
    // Show NEXT segment (current + 1) in purple as requested
    const nextData = currentData && currentData.index + 1 < transcript.length ? 
      { segment: transcript[currentData.index + 1], index: currentData.index + 1 } : null;
    
    return (
      <div style={{ 
        fontSize: '2.2rem', 
        lineHeight: '2.8', 
        direction: 'rtl',
        fontFamily: 'Arial, sans-serif',
        padding: '30px 30px 100px 30px',
        textAlign: 'justify'
      }}>
        {transcript.map((segment, index) => {
          const isNextSegment = nextData && nextData.index === index;
          const isPastSegment = currentData && index <= currentData.index;
          const words = segment.text.split(/\s+/);
          
          return (
            <span
              key={`${segment.start}-${index}`}
              ref={isNextSegment ? currentWordRef : null}
              style={{
                backgroundColor: 'transparent',
                color: isPastSegment ? '#9ca3af' : // Past segments (including current) gray
                       isNextSegment ? '#8b5cf6' : // Next segment purple
                       '#333', // Future segments black
                fontWeight: isNextSegment ? '600' : '400',
                transition: 'all 0.15s ease',
                opacity: isPastSegment ? '0.7' : '1',
                padding: '0px',
                borderRadius: '0px',
                display: 'inline',
                cursor: 'pointer'
              }}
              onClick={() => handleSegmentClick(segment.start)}
            >
              {words.map((word, wordIndex) => (
                <span
                  key={`${word}-${wordIndex}`}
                  style={{ cursor: 'pointer' }}
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const wordObj = {
                      text: word,
                      timestamp: segment.start,
                      segmentText: segment.text,
                      segmentIndex: index
                    };
                    handleWordDoubleClick(wordObj);
                  }}
                >
                  {word}
                  {wordIndex < words.length - 1 ? ' ' : ''}
                </span>
              ))}
            </span>
          );
        })}
      </div>
    );
  };

  const renderCardModal = () => {
    if (!showCardModal) return null;
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '12px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
          width: '90%',
          maxWidth: '500px'
        }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#374151' }}>Add Flashcard</h3>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px', color: '#374151' }}>
              Arabic Word *
            </label>
            <input
              type="text"
              value={cardForm.arabic_word}
              onChange={(e) => setCardForm(prev => ({ ...prev, arabic_word: e.target.value }))}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '18px',
                direction: 'rtl',
                fontFamily: 'Arial, sans-serif'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px', color: '#374151' }}>
              English Meaning
            </label>
            <input
              type="text"
              value={cardForm.english_meaning}
              onChange={(e) => setCardForm(prev => ({ ...prev, english_meaning: e.target.value }))}
              placeholder="What does this word mean?"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px', color: '#374151' }}>
              Context
            </label>
            <textarea
              value={cardForm.context}
              onChange={(e) => setCardForm(prev => ({ ...prev, context: e.target.value }))}
              placeholder="The sentence or context where you found this word"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                minHeight: '80px',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px', color: '#374151' }}>
              Notes
            </label>
            <textarea
              value={cardForm.notes}
              onChange={(e) => setCardForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional notes, root words, grammar points, etc."
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                minHeight: '60px',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowCardModal(false)}
              disabled={isAddingCard}
              style={{
                backgroundColor: '#f3f4f6',
                color: '#374151',
                padding: '10px 20px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '14px',
                fontWeight: '500',
                cursor: isAddingCard ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={saveCardDetails}
              disabled={isAddingCard || !cardForm.arabic_word.trim()}
              style={{
                backgroundColor: isAddingCard || !cardForm.arabic_word.trim() ? '#9ca3af' : '#8b5cf6',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isAddingCard || !cardForm.arabic_word.trim() ? 'not-allowed' : 'pointer'
              }}
            >
              {isAddingCard ? 'Adding...' : 'Add Card'}
            </button>
          </div>
        </div>
      </div>
    );
  };
  const renderCommunityTab = () => {
    const handleCreatePost = async () => {
        if (!newPost.trim() || !user?.id) return;
        
        setIsPosting(true);
        try {
            // Create user profile if it doesn't exist
            await createOrUpdateUserProfile(user.id, {
            display_name: user.email?.split('@')[0] || 'User',
            arabic_name: 'مستخدم'
            });

            // Create post
            const { data, error } = await createCommunityPost(
            user.id,
            newPost,
            newPostTranslation,
            'text',
            null,
            'daily_study'
            );

            if (!error && data) {
            setCommunityPosts(prev => [data, ...prev]);
            setNewPost('');
            setNewPostTranslation('');
            setSelectedMedia(null);
            setCardMessage('✅ Post shared successfully!');
            } else {
            setCardMessage('❌ Failed to share post');
            }
        } catch (createError) {
            console.error('Error creating post:', createError);
            setCardMessage('❌ Error sharing post');
        } finally {
            setIsPosting(false);
            setTimeout(() => setCardMessage(''), 3000);
        }
    };

    const handleInteraction = async (postId, interactionType) => {
        try {
            const { data, error } = await interactWithPost(postId, user.id, interactionType);
            if (!error) {
            setCommunityPosts(prev => prev.map(post => {
                if (post.id === postId) {
                const countField = `${interactionType}s_count`;
                return {
                    ...post,
                    [countField]: data.action === 'added' 
                    ? post[countField] + 1 
                    : Math.max(0, post[countField] - 1)
                };
                }
                return post;
            }));
            }
        } catch (error) {
            console.error('Error interacting with post:', error);
        }
        };

    const handleMediaSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
        if (file.size > 50 * 1024 * 1024) {
            setCardMessage('❌ File too large (max 50MB)');
            setTimeout(() => setCardMessage(''), 3000);
            return;
        }
        setSelectedMedia(file);
        }
    };

    return (
        <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: '700', margin: '0', color: '#111827' }}>
            Community
            </h2>
            <button
            onClick={loadCommunityPosts}
            style={{
                backgroundColor: '#8b5cf6',
                color: 'white',
                padding: '12px 20px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
            }}
            >
            🔄 Refresh
            </button>
        </div>

        {/* Post Creation Card */}
        <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '12px', 
            padding: '20px', 
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            marginBottom: '24px',
            border: '2px dashed #e5e7eb'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%', 
                backgroundColor: '#8b5cf6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '18px'
            }}>
                👤
            </div>
            <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>Share your study progress</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Post in Arabic to encourage others</div>
            </div>
            </div>
            
            <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="اكتب باللغة العربية... (Write in Arabic to share your study progress)"
            style={{
                width: '100%',
                minHeight: '80px',
                padding: '12px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px',
                direction: 'rtl',
                fontFamily: 'Arial, sans-serif',
                resize: 'vertical',
                marginBottom: '12px'
            }}
            />

            <textarea
            value={newPostTranslation}
            onChange={(e) => setNewPostTranslation(e.target.value)}
            placeholder="English translation (optional)"
            style={{
                width: '100%',
                minHeight: '60px',
                padding: '12px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'vertical',
                marginBottom: '12px'
            }}
            />

            {selectedMedia && (
            <div style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #d1fae5',
                borderRadius: '6px',
                padding: '8px 12px',
                marginBottom: '12px',
                fontSize: '12px',
                color: '#059669'
            }}>
                📎 {selectedMedia.name} selected
            </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
                <label style={{
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                color: '#374151'
                }}>
                📷 Add Photo/Video
                <input
                    type="file"
                    accept="image/*,video/*,audio/*"
                    onChange={handleMediaSelect}
                    style={{ display: 'none' }}
                />
                </label>
            </div>
            <button
                onClick={handleCreatePost}
                disabled={isPosting || !newPost.trim()}
                style={{
                backgroundColor: isPosting || !newPost.trim() ? '#9ca3af' : '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 20px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isPosting || !newPost.trim() ? 'not-allowed' : 'pointer'
                }}
            >
                {isPosting ? 'Sharing...' : 'Share'}
            </button>
            </div>
        </div>

        {cardMessage && (
            <div style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: cardMessage.includes('✅') ? '#f0fdf4' : '#fef2f2',
            color: cardMessage.includes('✅') ? '#059669' : '#dc2626',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500'
            }}>
            {cardMessage}
            </div>
        )}

        {/* Community Feed */}
        {isLoadingPosts ? (
            <div style={{ 
            backgroundColor: 'white', 
            padding: '40px', 
            borderRadius: '12px', 
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
            Loading posts...
            </div>
        ) : communityPosts.length === 0 ? (
            <div style={{ 
            backgroundColor: 'white', 
            padding: '60px', 
            borderRadius: '12px', 
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
            <h3 style={{ color: '#6b7280', marginBottom: '8px' }}>No posts yet</h3>
            <p style={{ color: '#9ca3af', fontSize: '14px' }}>
                Be the first to share your study progress!
            </p>
            </div>
        ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
            {communityPosts.map((post, index) => (
                <div key={post.id || index} style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                border: '1px solid #f3f4f6'
                }}>
                {/* Post Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '32px' }}>👤</div>
                    <div>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#374151' }}>
                          Anonymous User
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {new Date(communityPosts.created_at).toLocaleString()}
                        </div>
                    </div>
                    </div>
                    {post.study_proof_type && (
                    <div style={{
                        backgroundColor: '#f0fdf4',
                        color: '#059669',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: '600'
                    }}>
                        📚 {post.study_proof_type}
                    </div>
                    )}
                </div>

                {/* Arabic Post Content */}
                <div style={{
                    fontSize: '18px',
                    lineHeight: '1.8',
                    direction: 'rtl',
                    fontFamily: 'Arial, sans-serif',
                    color: '#374151',
                    marginBottom: '12px',
                    padding: '16px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    borderRight: '4px solid #8b5cf6'
                }}>
                    {post.content}
                </div>

                {/* English Translation */}
                {post.content_translation && (
                    <div style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    fontStyle: 'italic',
                    marginBottom: '16px',
                    padding: '8px 12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '6px'
                    }}>
                    Translation: {post.content_translation}
                    </div>
                )}

                {/* Media */}
                {post.media_url && (
                    <div style={{
                    marginBottom: '16px',
                    borderRadius: '8px',
                    overflow: 'hidden'
                    }}>
                    {post.post_type === 'image' && (
                        <img
                        src={post.media_url}
                        alt="Study photo"
                        style={{
                            width: '100%',
                            maxHeight: '400px',
                            objectFit: 'cover'
                        }}
                        />
                    )}
                    {post.post_type === 'video' && (
                        <video
                        controls
                        style={{
                            width: '100%',
                            maxHeight: '400px'
                        }}
                        >
                        <source src={post.media_url} />
                        </video>
                    )}
                    {post.post_type === 'audio' && (
                        <audio
                        controls
                        style={{ width: '100%' }}
                        >
                        <source src={communityPosts.media_url} />
                        </audio>
                    )}
                    </div>
                )}

                {/* Post Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                    <button
                        onClick={() => handleInteraction(post.id, 'like')}
                        style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#6b7280',
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                        }}
                    >
                        ❤️ {post.likes_count || 0}
                    </button>
                    <button
                        onClick={() => handleInteraction(post.id, 'encourage')}
                        style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#6b7280',
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                        }}
                    >
                        🤲 {post.encouragements_count || 0}
                    </button>
                    </div>
                    {post.is_verified && (
                    <div style={{
                        fontSize: '12px',
                        color: '#059669',
                        fontWeight: '600'
                    }}>
                        ✅ Verified Study
                    </div>
                    )}
                </div>
                </div>
            ))}
            </div>
        )}

        {/* Guidelines */}
        <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #d1fae5',
            borderRadius: '8px',
            padding: '16px',
            marginTop: '24px'
        }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#059669', marginBottom: '8px' }}>
            💡 Community Guidelines
            </h4>
            <ul style={{ fontSize: '12px', color: '#065f46', margin: 0, paddingLeft: '16px' }}>
            <li>Write in Arabic to practice and encourage others</li>
            <li>Share your daily study progress with photos/videos</li>
            <li>Support fellow learners with encouraging words</li>
            <li>Keep posts focused on Islamic learning and Arabic study</li>
            </ul>
        </div>
        </div>
    );
    };
  const renderLeaderboardTab = () => (
    <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: '700', margin: '0', color: '#111827' }}>
            Leaderboard
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
            {['Weekly', 'Monthly', 'All Time'].map((period) => (
            <button
                key={period}
                style={{
                backgroundColor: period === 'Weekly' ? '#8b5cf6' : '#f3f4f6',
                color: period === 'Weekly' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
                }}
            >
                {period}
            </button>
            ))}
        </div>
        </div>

        <div style={{ display: 'grid', gap: '16px' }}>
        {/* Your Rank Card */}
        <div style={{
            backgroundColor: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            borderRadius: '12px',
            padding: '20px',
            color: 'white',
            boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0' }}>Your Rank</h3>
                <div style={{ fontSize: '24px', fontWeight: '700' }}>#47</div>
                <div style={{ fontSize: '14px', opacity: '0.9' }}>1,247 XP this week</div>
            </div>
            <div style={{ fontSize: '48px' }}>🎯</div>
            </div>
        </div>

        {/* Leaderboard List */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
            <div style={{
            padding: '16px 20px',
            backgroundColor: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
            display: 'grid',
            gridTemplateColumns: '60px 1fr 100px 100px',
            gap: '16px',
            fontSize: '12px',
            fontWeight: '600',
            color: '#374151',
            textTransform: 'uppercase'
            }}>
            <div>Rank</div>
            <div>User</div>
            <div>XP</div>
            <div>Streak</div>
            </div>

            {[
            { rank: 1, name: 'Fatima_scholar', xp: 3247, streak: 45, avatar: '👩🏽', badge: '🥇' },
            { rank: 2, name: 'Ahmad_learns', xp: 3156, streak: 38, avatar: '👨🏻', badge: '🥈' },
            { rank: 3, name: 'Khadijah_quran', xp: 2934, streak: 42, avatar: '👩🏻', badge: '🥉' },
            { rank: 4, name: 'Ibrahim_arabic', xp: 2876, streak: 31, avatar: '👨🏽', badge: '🏅' },
            { rank: 5, name: 'Zainab_studies', xp: 2654, streak: 29, avatar: '👩🏻', badge: '🏅' },
            { rank: 6, name: 'Umar_memorizes', xp: 2543, streak: 27, avatar: '👨🏻', badge: '🏅' },
            { rank: 7, name: 'Aisha_learns', xp: 2387, streak: 25, avatar: '👩🏽', badge: '🏅' }
            ].map((user, index) => (
            <div key={index} style={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr 100px 100px',
                gap: '16px',
                padding: '16px 20px',
                alignItems: 'center',
                borderBottom: index < 6 ? '1px solid #f3f4f6' : 'none',
                backgroundColor: user.rank <= 3 ? '#fefce8' : 'transparent'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '600' }}>
                <span>{user.badge}</span>
                <span style={{ color: '#6b7280' }}>#{user.rank}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>{user.avatar}</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>{user.name}</span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#8b5cf6' }}>
                {user.xp.toLocaleString()}
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#059669' }}>
                {user.streak} days
                </div>
            </div>
            ))}
        </div>

        {/* Achievement Showcase */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
            Recent Achievements
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {[
                { title: '🔥 30-Day Streak', user: 'Fatima_scholar', time: '2 hours ago' },
                { title: '📖 Surah Master', user: 'Ahmad_learns', time: '5 hours ago' },
                { title: '🎯 1000 Cards', user: 'Khadijah_quran', time: '1 day ago' }
            ].map((achievement, index) => (
                <div key={index} style={{
                backgroundColor: '#f8f9fa',
                border: '1px solid #e9ecef',
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center'
                }}>
                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                    {achievement.title}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {achievement.user} • {achievement.time}
                </div>
                </div>
            ))}
            </div>
        </div>
        </div>
    </div>
    );

  const renderWatchTab = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0' }}>Watch Videos</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {currentDeck && (
            <div style={{ 
              fontSize: '12px', 
              color: '#059669', 
              fontWeight: '500',
              backgroundColor: '#f0fdf4',
              padding: '4px 8px',
              borderRadius: '6px'
            }}>
              📚 {currentDeck.name}
            </div>
          )}
          {currentVideoTitle && (
            <div style={{ 
              fontSize: '12px', 
              color: '#8b5cf6', 
              fontWeight: '500',
              backgroundColor: '#f3f0ff',
              padding: '4px 8px',
              borderRadius: '6px',
              maxWidth: '300px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {currentVideoTitle}
            </div>
          )}
        </div>
      </div>
      
      <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Paste YouTube URL here..."
            style={{
              flex: '1',
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <button
            onClick={loadNewVideo}
            disabled={isLoadingTranscript}
            style={{
              backgroundColor: isLoadingTranscript ? '#9ca3af' : '#8b5cf6',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              fontWeight: '600',
              cursor: isLoadingTranscript ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            {isLoadingTranscript ? 'Loading...' : 'Load'}
          </button>
          
          {transcript.length > 0 && (
            <button
              onClick={processHarakatForTranscript}
              disabled={isProcessingHarakat}
              style={{
                backgroundColor: isProcessingHarakat ? '#9ca3af' : '#059669',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                border: 'none',
                fontWeight: '600',
                cursor: isProcessingHarakat ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                whiteSpace: 'nowrap'
              }}
              title="Add harakat (diacritics) to Arabic text"
            >
              {isProcessingHarakat ? '⏳' : 'ً◌'} Harakat
            </button>
          )}
        </div>
        
        {cardMessage && (
          <div style={{
            marginTop: '8px',
            padding: '8px',
            backgroundColor: cardMessage.includes('✅') ? '#f0fdf4' : 
                            cardMessage.includes('⚠️') ? '#fffbeb' : '#fef2f2',
            color: cardMessage.includes('✅') ? '#059669' : 
                   cardMessage.includes('⚠️') ? '#d97706' : '#dc2626',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '500'
          }}>
            {cardMessage}
          </div>
        )}
        
        {transcriptError && (
          <div style={{
            marginTop: '8px',
            padding: '8px',
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            ⚠️ {transcriptError}
          </div>
        )}
      </div>
      
      {currentVideoId && (
        <div style={{ display: 'flex', gap: '16px', height: 'calc(100vh - 200px)' }}>
          <div style={{ width: '30%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', height: 'auto' }}>
              <div style={{ aspectRatio: '16/9', backgroundColor: '#000', borderRadius: '8px', marginBottom: '12px' }}>
                <div ref={playerRef} style={{ width: '100%', height: '100%', borderRadius: '8px' }}></div>
              </div>

              {/* REMOVED PLAY/PAUSE BUTTON AND TIME DISPLAY */}
              
              <div style={{ 
                backgroundColor: '#f9fafb', 
                borderRadius: '6px', 
                padding: '12px',
                marginBottom: '12px'
              }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  📚 Current Deck
                </h4>
                {currentDeck ? (
                  <div>
                    <div style={{ fontSize: '12px', color: '#8b5cf6', fontWeight: '500', marginBottom: '6px' }}>
                      {currentDeck.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>
                      Total cards: {currentDeck.totalCards || 0}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                    Load a video to create a deck
                  </div>
                )}
              </div>

              <div style={{ 
                backgroundColor: '#f0fdf4', 
                borderRadius: '6px', 
                padding: '12px',
                border: '1px solid #d1fae5'
              }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#059669' }}>
                  💡 How to Use
                </h4>
                <ul style={{ margin: '0', paddingLeft: '16px', fontSize: '11px', color: '#065f46', lineHeight: '1.4' }}>
                  <li>Click words to jump to that time</li>
                  <li><strong>Double-click Arabic words</strong> to add to flashcards</li>
                  <li>Next segment (coming up) is highlighted in purple</li>
                  <li>Past and current segments are grayed out</li>
                  <li>Future segments are black</li>
                  <li>Transcript auto-scrolls with playback</li>
                </ul>
              </div>
            </div>
          </div>

          <div style={{ width: '70%' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div 
                ref={transcriptRef}
                style={{ 
                  flex: '1', 
                  overflowY: 'auto', 
                  maxHeight: 'calc(100vh - 220px)',
                  scrollPaddingBottom: '100px'
                }}
              >
                {transcript.length > 0 ? (
                  renderWordByWordTranscript()
                ) : (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    height: '100%', 
                    color: '#6b7280',
                    flexDirection: 'column'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📺</div>
                    <p>Load a video to see the interactive transcript</p>
                    <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginTop: '8px' }}>
                      Double-click Arabic words to add them to your flashcard deck
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  // STEP 4: Replace your entire renderMyCardsTab() function with this:
  const renderMyCardsTab = () => {
      // If we're in card management view, show the card browser
      if (cardManagementView) {
        return renderCardBrowser();
      }
      
      // If studying, show study interface
      if (isStudying && currentStudyCard) {
        return renderEnhancedStudyInterface(); // ← New function name
      }

      // Otherwise show the deck list
      return renderDeckList();
    };
  // 4. ENHANCED STUDY CARD DISPLAY (Updated renderStudyInterface)
  const renderEnhancedStudyInterface = () => {
    const mcdContext = createMCDContext(currentStudyCard.context, currentStudyCard.arabic_word);
  
    return (
      <div>
        {/* Study Interface Back Button and Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '24px',
          padding: '16px 0'
        }}>
          <button
            onClick={() => {
              setIsStudying(false);
              setCurrentStudyCard(null);
              setStudyCards([]);
              setStudyCardIndex(0);
              setShowAnswer(false);
              setShowMoreDetails(false);
              setStudyDeck(null);
            }}
            style={{
              backgroundColor: '#f3f4f6',
              color: '#374151',
              padding: '12px 20px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ← Back to My Cards
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              fontSize: '14px', 
              color: '#6b7280',
              fontWeight: '500'
            }}>
              {studyDeck?.name || 'Study Session'}
            </div>
            <div style={{ 
              backgroundColor: '#8b5cf6', 
              color: 'white', 
              padding: '6px 12px', 
              borderRadius: '20px', 
              fontSize: '14px',
              fontWeight: '600'
            }}>
              {studyCardIndex + 1} / {studyCards.length}
            </div>
          </div>
        </div>
        {/*  header - same as before */}
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '40px', 
            borderRadius: '16px', 
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            
            {/* Header with progress - same as before */}
            
            {/* FRONT: MCD Context */}
            <div style={{ 
              fontSize: '2.2rem', 
              color: '#374151', 
              marginBottom: '40px',
              direction: 'rtl',
              fontFamily: 'Arial, sans-serif',
              lineHeight: '1.6',
              backgroundColor: '#f8f9fa',
              padding: '30px',
              borderRadius: '12px',
              border: '2px solid #e9ecef',
              minHeight: '120px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {mcdContext}
            </div>
  
            <div style={{ 
              fontSize: '16px', 
              color: '#6b7280', 
              marginBottom: '30px',
              fontStyle: 'italic'
            }}>
              What word goes in the blank?
            </div>
  
            {/* ENHANCED ANSWER SECTION */}
            {showAnswer && (
              <div style={{ marginBottom: '40px' }}>
                
                {/* Arabic Word */}
                <div style={{ 
                  fontSize: '3.5rem', 
                  fontWeight: '700', 
                  color: '#8b5cf6',
                  direction: 'rtl',
                  marginBottom: '30px',
                  fontFamily: 'Arial, sans-serif'
                }}>
                  {currentStudyCard.arabic_word}
                </div>
  
                {/* PRIMARY INFO: Meaning + Root + Sample Sentences */}
                <div style={{ marginBottom: '25px' }}>
                  {/* Meaning in Context */}
                  <div style={{
                    backgroundColor: '#fef3c7',
                    border: '2px solid #f59e0b',
                    borderRadius: '8px',
                    padding: '15px',
                    textAlign: 'center',
                    marginBottom: '15px'
                  }}>
                    <div style={{ fontSize: '14px', color: '#92400e', fontWeight: '600', marginBottom: '8px' }}>
                      📝 Meaning in Context
                    </div>
                    <div style={{ fontSize: '16px', color: '#78350f', fontWeight: '600' }}>
                      {currentStudyCard.meaningincontext || currentStudyCard.english_meaning || 'No meaning available'}
                    </div>
                  </div>
  
                  {/* Root Connection */}
                  {currentStudyCard.root && (
                    <div style={{
                      backgroundColor: '#f0fdf4',
                      border: '2px solid #10b981',
                      borderRadius: '8px',
                      padding: '15px',
                      textAlign: 'center',
                      marginBottom: '15px'
                    }}>
                      <div style={{ fontSize: '14px', color: '#059669', fontWeight: '600', marginBottom: '8px' }}>
                        🌱 Root Connection
                      </div>
                      <div style={{ fontSize: '14px', color: '#065f46', fontWeight: '600', marginBottom: '5px' }}>
                        {currentStudyCard.root}
                      </div>
                      <div style={{ fontSize: '13px', color: '#059669', fontStyle: 'italic' }}>
                        {currentStudyCard.rootconnection || 'Root connection analysis'}
                      </div>
                    </div>
                  )}
  
                  {/* Sample Sentences */}
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {currentStudyCard.sampleSentence1 && (
                      <div style={{
                        backgroundColor: '#f0f9ff',
                        border: '1px solid #3b82f6',
                        borderRadius: '6px',
                        padding: '12px',
                        textAlign: 'center'
                      }}>
                        <div style={{ 
                          fontSize: '16px', 
                          direction: 'rtl',
                          fontFamily: 'Arial, sans-serif',
                          marginBottom: '6px',
                          color: '#1e40af'
                        }}>
                          {currentStudyCard.samplesentence1}
                        </div>
                        <div style={{ fontSize: '13px', color: '#2563eb', fontStyle: 'italic' }}>
                          {currentStudyCard.sampletranslation1}
                        </div>
                      </div>
                    )}
  
                    {currentStudyCard.sampleSentence2 && (
                      <div style={{
                        backgroundColor: '#fdf2f8',
                        border: '1px solid #ec4899',
                        borderRadius: '6px',
                        padding: '12px',
                        textAlign: 'center'
                      }}>
                        <div style={{ 
                          fontSize: '16px', 
                          direction: 'rtl',
                          fontFamily: 'Arial, sans-serif',
                          marginBottom: '6px',
                          color: '#be185d'
                        }}>
                         {currentStudyCard.samplesentence2}
                        </div>
                        <div style={{ fontSize: '13px', color: '#ec4899', fontStyle: 'italic' }}>
                          {currentStudyCard.sampletranslation2}
                        </div>
                      </div>
                    )}
                  </div>
  
                  {/* Show More Details Button */}
                  <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <button
                      onClick={() => setShowMoreDetails(!showMoreDetails)}
                      style={{
                        backgroundColor: '#8b5cf6',
                        color: 'white',
                        padding: '8px 20px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {showMoreDetails ? '👆 Show Less' : '👇 Show Grammar & Morphology'}
                    </button>
                  </div>
  
                  {/* EXPANDABLE SECTION: Grammar & Morphology */}
                  {showMoreDetails && (
                    <div style={{ display: 'grid', gap: '15px', marginTop: '20px' }}>
                      {/* Grammar Explanation */}
                      {currentStudyCard.grammarexplanation && (
                        <div style={{
                          backgroundColor: '#f3f0ff',
                          border: '2px solid #8b5cf6',
                          borderRadius: '8px',
                          padding: '15px',
                          textAlign: 'left'
                        }}>
                          <div style={{ fontSize: '14px', color: '#8b5cf6', fontWeight: '600', marginBottom: '8px' }}>
                            📚 Grammar (How It Works)
                          </div>
                          <div style={{ fontSize: '14px', color: '#581c87', lineHeight: '1.5' }}>
                            {currentStudyCard.sampletranslation2}
                          </div>
                          {currentStudyCard.grammarSample && (
                            <div style={{ 
                              marginTop: '8px', 
                              padding: '8px', 
                              backgroundColor: '#faf5ff', 
                              borderRadius: '4px',
                              direction: 'rtl',
                              fontFamily: 'Arial, sans-serif'
                            }}>
                              {currentStudyCard.grammarsample}
                            </div>
                          )}
                        </div>
                      )}
  
                      {/* Morphology */}
                      {currentStudyCard.morphology && (
                        <div style={{
                          backgroundColor: '#fff7ed',
                          border: '2px solid #ea580c',
                          borderRadius: '8px',
                          padding: '15px',
                          textAlign: 'left'
                        }}>
                          <div style={{ fontSize: '14px', color: '#ea580c', fontWeight: '600', marginBottom: '8px' }}>
                            🔧 Word Construction
                          </div>
                          <div style={{ fontSize: '14px', color: '#9a3412', lineHeight: '1.5' }}>
                            {currentStudyCard.morphology}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Metadata */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  gap: '20px',
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  <span style={{
                    backgroundColor: '#f0fdf4',
                    color: '#059669',
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}>
                    📍 {formatTime(currentStudyCard.video_timestamp || 0)}
                  </span>
                  <span style={{
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}>
                    📊 Rep #{currentStudyCard.reps + 1}
                  </span>
                </div>
              </div>
            )}
  
            {/* Action buttons */}
            {!showAnswer ? (
              <button
                onClick={() => setShowAnswer(true)}
                style={{
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  padding: '16px 40px',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '18px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                }}
              >
                Show Answer
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                {[
                  { rating: 1, label: 'Again', color: '#dc2626', desc: 'Didn\'t know' },
                  { rating: 2, label: 'Hard', color: '#ea580c', desc: 'Difficult' },
                  { rating: 3, label: 'Good', color: '#059669', desc: 'Knew it' },
                  { rating: 4, label: 'Easy', color: '#2563eb', desc: 'Too easy' }
                ].map(button => (
                  <button
                    key={button.rating}
                    onClick={() => handleStudyAnswer(button.rating)}
                    style={{
                      backgroundColor: button.color,
                      color: 'white',
                      padding: '12px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      minWidth: '90px',
                      textAlign: 'center'
                    }}
                    title={button.desc}
                  >
                    <div>{button.label}</div>
                    <div style={{ fontSize: '10px', opacity: '0.8' }}>{button.desc}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
     
  // Add this function to your MainApp component (after renderMyCardsTab)

  const renderReadTab = () => (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0' }}>Read Islamic Books</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {readSubTab === 'quran' && quranDeck && (
            <div style={{ 
              fontSize: '12px', 
              color: '#059669', 
              fontWeight: '500',
              backgroundColor: '#f0fdf4',
              padding: '4px 8px',
              borderRadius: '6px'
            }}>
              📚 {quranDeck.name}
            </div>
          )}
          {readSubTab === 'quran' && currentSurah && (
            <div style={{ 
              fontSize: '12px', 
              color: '#8b5cf6', 
              fontWeight: '500',
              backgroundColor: '#f3f0ff',
              padding: '4px 8px',
              borderRadius: '6px'
            }}>
              {currentSurah.name_arabic} - {currentSurah.name_english}
            </div>
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '16px' }}>
        {[
          { id: 'quran', label: 'Quran', icon: '📖' },
          { id: 'hadith', label: 'Hadith', icon: '📜' },
          { id: 'seerah', label: 'Seerah', icon: '🕌' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReadSubTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              color: readSubTab === tab.id ? '#8b5cf6' : '#6b7280',
              fontWeight: readSubTab === tab.id ? '600' : '400',
              fontSize: '14px',
              cursor: 'pointer',
              borderBottom: readSubTab === tab.id ? '2px solid #8b5cf6' : '2px solid transparent'
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Sub-tab Content */}
      {readSubTab === 'quran' ? renderQuranContent() : renderComingSoonContent(readSubTab)}
    </div>
  );

  // Replace your entire renderComingSoonContent function with this:
  const renderComingSoonContent = (tabName: string) => (
        <div style={{
            backgroundColor: 'white',
            padding: '60px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            border: '1px solid #f3f4f6'
        }}>
            <div style={{ fontSize: '64px', marginBottom: '16px', opacity: '0.5' }}>
            {tabName === 'hadith' ? '📜' : '🕌'}
            </div>
            <h3 style={{ color: '#6b7280', marginBottom: '8px', fontSize: '18px' }}>
            {tabName === 'hadith' ? 'Hadith Collection' : 'Seerah (Biography)'}
            </h3>
            <p style={{ color: '#9ca3af', marginBottom: '24px', fontSize: '14px' }}>
            {tabName === 'hadith'
                ? 'Study authenticated hadith with SRS flashcards'
                : 'Learn from the life of Prophet Muhammad ﷺ'
            }
            </p>
            <div style={{
            backgroundColor: '#f3f0ff',
            color: '#8b5cf6',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            display: 'inline-block'
            }}>
            Coming Soon
            </div>
        </div>
);
// Updated renderQuranContent function with new view modes
  const renderQuranContent = () => (
    <div>
        {/* Enhanced Controls */}
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', marginBottom: '16px' }}>
        
        {/* First Row: Surah + View Mode */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
            <select
            value={selectedSurahNumber}
            onChange={(e) => setSelectedSurahNumber(Number(e.target.value))}
            style={{
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px',
                minWidth: '200px'
            }}
            >
            {surahs.map((surah) => (
                <option key={surah.number} value={surah.number}>
                {surah.number}. {surah.name_english} ({surah.name_arabic})
                </option>
            ))}
            </select>

            {/* View Mode Toggle */}
            <div style={{ display: 'flex', backgroundColor: '#f3f4f6', borderRadius: '6px', padding: '2px' }}>
            <button
                onClick={() => setQuranViewMode('single')}
                style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '600',
                backgroundColor: quranViewMode === 'single' ? '#8b5cf6' : 'transparent',
                color: quranViewMode === 'single' ? 'white' : '#374151',
                cursor: 'pointer'
                }}
            >
                📄 Single Verse
            </button>
            <button
                onClick={() => setQuranViewMode('full')}
                style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '600',
                backgroundColor: quranViewMode === 'full' ? '#8b5cf6' : 'transparent',
                color: quranViewMode === 'full' ? 'white' : '#374151',
                cursor: 'pointer'
                }}
            >
                📖 Mushaf Page
            </button>
            </div>
        </div>

        {/* Second Row: Audio Controls */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151', minWidth: '80px' }}>
            🎵 Play Mode:
            </span>
            
            <div style={{ display: 'flex', gap: '6px' }}>
            <button
                onClick={() => setPlayMode('single')}
                style={{
                padding: '4px 8px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                fontSize: '11px',
                backgroundColor: playMode === 'single' ? '#059669' : 'white',
                color: playMode === 'single' ? 'white' : '#374151',
                cursor: 'pointer'
                }}
            >
                Single
            </button>
            <button
                onClick={() => setPlayMode('range')}
                style={{
                padding: '4px 8px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                fontSize: '11px',
                backgroundColor: playMode === 'range' ? '#059669' : 'white',
                color: playMode === 'range' ? 'white' : '#374151',
                cursor: 'pointer'
                }}
            >
                Range
            </button>
            <button
                onClick={() => setPlayMode('full')}
                style={{
                padding: '4px 8px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                fontSize: '11px',
                backgroundColor: playMode === 'full' ? '#059669' : 'white',
                color: playMode === 'full' ? 'white' : '#374151',
                cursor: 'pointer'
                }}
            >
                Full Surah
            </button>
              {/* Translation Toggle */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                <input
                  type="checkbox"
                  checked={quranSettings.show_translation}
                  onChange={(e) => setQuranSettings(prev => ({ 
                    ...prev, 
                    show_translation: e.target.checked 
                  }))}
                  style={{ marginRight: '6px' }}
                />
                Show Translation
              </label>
            </div>
            </div>

            {/* Range inputs for range mode */}
            {playMode === 'range' && (
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <input
                type="number"
                min="1"
                max={currentVerses.length}
                value={playRange.start}
                onChange={(e) => setPlayRange(prev => ({ ...prev, start: Number(e.target.value) }))}
                style={{
                    width: '50px',
                    padding: '2px 4px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '3px',
                    fontSize: '11px'
                }}
                />
                <span style={{ fontSize: '11px' }}>to</span>
                <input
                type="number"
                min={playRange.start}
                max={currentVerses.length}
                value={playRange.end}
                onChange={(e) => setPlayRange(prev => ({ ...prev, end: Number(e.target.value) }))}
                style={{
                    width: '50px',
                    padding: '2px 4px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '3px',
                    fontSize: '11px'
                }}
                />
            </div>
            )}

            {/* Play/Stop Button */}
            <button
              onClick={() => {
                if (isPlayingContinuous || currentPlayingVerse) {
                  stopAudio();
                } else {
                  // Simple: just remove all this complex logic
                  setQuranMessage('🎵 Use verse numbers to play audio');
                  setTimeout(() => setQuranMessage(''), 2000);
                }
              }}
              style={{
                backgroundColor: '#f3f4f6',
                color: '#374151',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Click verse numbers to play
            </button>
        </div>

        {quranMessage && (
            <div style={{
            padding: '8px',
            backgroundColor: quranMessage.includes('✅') ? '#f0fdf4' : 
                            quranMessage.includes('ℹ️') || quranMessage.includes('🔄') || quranMessage.includes('🔊') ? '#fffbeb' : '#fef2f2',
            color: quranMessage.includes('✅') ? '#059669' : 
                    quranMessage.includes('ℹ️') || quranMessage.includes('🔄') || quranMessage.includes('🔊') ? '#d97706' : '#dc2626',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '500'
            }}>
            {quranMessage}
            </div>
        )}
        </div>

        {/* Render based on view mode */}
        {isLoadingQuran ? (
        <div style={{ 
            backgroundColor: 'white', 
            padding: '40px', 
            borderRadius: '8px', 
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
            Loading verses...
        </div>
        ) : currentVerses.length > 0 ? (
        quranViewMode === 'single' ? renderSingleVerseView() : renderFullPageView()
        ) : (
        <div style={{ 
            backgroundColor: 'white', 
            padding: '40px', 
            borderRadius: '8px', 
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📖</div>
            <p>Select a surah to start reading</p>
        </div>
        )}
    </div>
    );
  // Replace your existing renderTabContent function with this:

  const renderTabContent = () => {
    switch (activeTab) {
      case 'watch':
        return renderWatchTab();
      case 'my-cards':
        return renderMyCardsTab();
      case 'read':
        return renderReadTab();
      case 'community':
        return renderCommunityTab();
      case 'leaderboard':
        return renderLeaderboardTab();
      default:
        return (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h2>{activeTab} tab coming soon!</h2>
          </div>
        );
    }
  };


   // Single Verse View - Shows one ayah at a time with navigation
  const renderSingleVerseView = () => {
  if (!currentVerses || currentVerses.length === 0) return null;
  
  const currentVerse = currentVerses[currentVerseIndex];
  if (!currentVerse) return null;

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
      {/* Navigation Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '16px 20px',
        borderBottom: '1px solid #f3f4f6'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={goToPreviousVerse}
            disabled={currentVerseIndex === 0}
            style={{
              padding: '8px 12px',
              backgroundColor: currentVerseIndex === 0 ? '#f3f4f6' : '#8b5cf6',
              color: currentVerseIndex === 0 ? '#9ca3af' : 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: currentVerseIndex === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            ← Previous
          </button>
          
          {/* Verse Selector Dropdown */}
          <select
            value={currentVerse.verse_number}
            onChange={(e) => goToVerse(Number(e.target.value))}
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px',
              minWidth: '100px'
            }}
          >
            {currentVerses.map((verse) => (
              <option key={verse.verse_number} value={verse.verse_number}>
                Ayah {verse.verse_number}
              </option>
            ))}
          </select>

          <button
            onClick={goToNextVerse}
            disabled={currentVerseIndex === currentVerses.length - 1}
            style={{
              padding: '8px 12px',
              backgroundColor: currentVerseIndex === currentVerses.length - 1 ? '#f3f4f6' : '#8b5cf6',
              color: currentVerseIndex === currentVerses.length - 1 ? '#9ca3af' : 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: currentVerseIndex === currentVerses.length - 1 ? 'not-allowed' : 'pointer'
            }}
          >
            Next →
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ 
            backgroundColor: '#8b5cf6', 
            color: 'white', 
            padding: '6px 12px', 
            borderRadius: '20px', 
            fontSize: '14px',
            fontWeight: '600'
          }}>
            {currentVerse.verse_number} / {currentVerses.length}
          </span>
          
          <button
            onClick={() => {
              if (currentPlayingVerse === currentVerse.verse_number) {
                stopAudio();
              } else {
                playVerseAudio(currentVerse.verse_number, currentVerse.global_ayah_number);
              }
            }}
            disabled={isLoadingAudio}
            style={{
              backgroundColor: currentPlayingVerse === currentVerse.verse_number ? '#dc2626' : '#059669',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {currentPlayingVerse === currentVerse.verse_number ? '⏹ Stop' : '▶ Play'}
          </button>
        </div>
      </div>

      {/* Main Verse Display */}
      <div style={{ padding: '40px 30px' }}>
        {/* Verse Number Badge */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            display: 'inline-block',
            backgroundColor: '#f8f9fa',
            border: '3px solid #8b5cf6',
            borderRadius: '50%',
            width: '60px',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: '700',
            color: '#8b5cf6'
          }}>
            {currentVerse.verse_number}
          </div>
        </div>

        {/* Arabic Text - Large and Beautiful */}
        <div style={{ 
          fontSize: '2.8rem', 
          lineHeight: '2.2', 
          direction: 'rtl',
          fontFamily: 'Arial, sans-serif',
          textAlign: 'center',
          marginBottom: '30px',
          padding: '30px',
          backgroundColor: '#f9fafb',
          borderRadius: '12px',
          border: '2px solid #e5e7eb'
        }}>
          {currentVerse.text_arabic ? (
            currentVerse.text_arabic.split(' ').map((word, wordIndex) => (
              <span
                key={`word-${currentVerse.verse_number}-${wordIndex}`}
                style={{
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  display: 'inline-block',
                  margin: '4px',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                onDoubleClick={() => handleQuranWordDoubleClick(
                  word, 
                  currentVerse.surah_id, 
                  currentVerse.verse_number, 
                  wordIndex + 1, 
                  currentVerse.text_arabic
                )}
                title={`Double-click to add "${word}" to flashcards`}
              >
                {word}
              </span>
            ))
          ) : (
            <div style={{ color: '#dc2626', fontSize: '18px' }}>
              No Arabic text available for this verse
            </div>
          )}
        </div>

        {/* Muhsin Khan Translation */}
        {quranSettings.show_translation && (
          <div style={{ 
            fontSize: '16px', 
            color: '#374151', 
            lineHeight: '1.6',
            textAlign: 'left',
            padding: '20px',
            backgroundColor: '#f0fdf4',
            border: '2px solid #d1fae5',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: '600', 
              color: '#059669', 
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              📖 Muhsin Khan Translation
            </div>
            {currentVerse.text_translation || 'Translation loading...'}
          </div>
        )}

        {/* Verse Metadata */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '16px',
          fontSize: '14px',
          color: '#6b7280',
          marginTop: '20px'
        }}>
          <span style={{
            backgroundColor: '#f0fdf4',
            color: '#059669',
            padding: '4px 8px',
            borderRadius: '4px'
          }}>
            📄 Page {currentVerse.page_number}
          </span>
          <span style={{
            backgroundColor: '#fef3c7',
            color: '#92400e',
            padding: '4px 8px',
            borderRadius: '4px'
          }}>
            📊 Juz {currentVerse.juz_number}
          </span>
          {currentVerse.sajda && (
            <span style={{
              backgroundColor: '#f3f0ff',
              color: '#8b5cf6',
              padding: '4px 8px',
              borderRadius: '4px'
            }}>
              🕌 Sajda
            </span>
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts Info */}
      <div style={{ 
        backgroundColor: '#f0fdf4', 
        borderRadius: '0 0 8px 8px', 
        padding: '12px 20px',
        borderTop: '1px solid #d1fae5'
      }}>
        <div style={{ fontSize: '12px', color: '#065f46', textAlign: 'center' }}>
          <strong>💡 Tips:</strong> Use ← → arrow keys to navigate • Double-click Arabic words to add to flashcards • Select verses from dropdown to jump
        </div>
      </div>
    </div>
  );
   };

   // Full Mushaf Page View - Traditional Quran layout
  const renderFullPageView = () => {
    if (!currentVerses || currentVerses.length === 0) return null;

    return (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
        {/* Mushaf Header */}
        <div style={{ 
            padding: '20px 30px',
            borderBottom: '2px solid #f3f4f6',
            backgroundColor: '#f9fafb'
        }}>
            <div style={{ textAlign: 'center' }}>
            <div style={{ 
                fontSize: '24px', 
                fontWeight: '700', 
                color: '#8b5cf6',
                fontFamily: 'Arial, sans-serif',
                direction: 'rtl',
                marginBottom: '8px'
            }}>
                {currentSurah?.name_arabic}
            </div>
            <div style={{ 
                fontSize: '16px', 
                color: '#6b7280',
                marginBottom: '12px'
            }}>
                {currentSurah?.name_english} • {currentVerses.length} Verses • {currentSurah?.revelation_place}
            </div>
            
            {/* Audio Controls for Full Surah */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'center' }}>
                <button
                onClick={() => console.log('Full surah play removed')}
                disabled={isPlayingContinuous}
                style={{
                    backgroundColor: isPlayingContinuous ? '#dc2626' : '#059669',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                }}
                >
                {isPlayingContinuous ? '⏹ Stop Full Surah' : '▶ Play Full Surah'}
                </button>
                
                {isPlayingContinuous && (
                <span style={{ 
                    fontSize: '12px', 
                    color: '#059669',
                    backgroundColor: '#f0fdf4',
                    padding: '4px 8px',
                    borderRadius: '4px'
                }}>
                    🎵 Playing verse {currentPlayingVerse}
                </span>
                )}
            </div>
            </div>
        </div>

        {/* Bismillah (except for Surah 9) */}
        {selectedSurahNumber !== 9 && selectedSurahNumber !== 1 && (
            <div style={{ 
            textAlign: 'center',
            padding: '30px',
            fontSize: '2rem',
            fontFamily: 'Arial, sans-serif',
            direction: 'rtl',
            color: '#8b5cf6',
            borderBottom: '1px solid #f3f4f6'
            }}>
            بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
            </div>
        )}

        {/* Verses in Mushaf Style */}
        <div style={{ 
            padding: '30px 40px 40px 40px',
            fontSize: '2rem', 
            lineHeight: '2.5', 
            direction: 'rtl',
            fontFamily: 'Arial, sans-serif',
            textAlign: 'justify',
            backgroundColor: '#fdfdfd'
        }}>
            {currentVerses.map((verse, index) => (
            <span key={`verse-${verse.verse_number}`}>
                {/* Verse Text */}
                <span style={{ 
                backgroundColor: currentPlayingVerse === verse.verse_number ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                borderRadius: currentPlayingVerse === verse.verse_number ? '4px' : '0',
                padding: currentPlayingVerse === verse.verse_number ? '2px 4px' : '0',
                transition: 'all 0.3s ease'
                }}>
                {verse.text_arabic ? (
                    verse.text_arabic.split(' ').map((word, wordIndex) => (
                    <span
                        key={`word-${verse.verse_number}-${wordIndex}`}
                        style={{
                        cursor: 'pointer',
                        padding: '2px 3px',
                        borderRadius: '3px',
                        display: 'inline',
                        margin: '1px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        onDoubleClick={() => handleQuranWordDoubleClick(
                        word, 
                        verse.surah_id, 
                        verse.verse_number, 
                        wordIndex + 1, 
                        verse.text_arabic
                        )}
                        title={`Double-click to add "${word}" to flashcards`}
                    >
                        {word}
                    </span>
                    ))
                ) : (
                    <span style={{ color: '#dc2626', fontSize: '16px' }}>
                    [Verse {verse.verse_number} - text unavailable]
                    </span>
                )}
                </span>
                {/* Verse Number in Circle (Traditional Style) */}
                <span
                  style={{
                    display: 'inline-block',
                    width: '32px',
                    height: '32px',
                    backgroundColor: currentPlayingVerse === verse.verse_number ? '#8b5cf6' : '#f3f4f6',
                    color: currentPlayingVerse === verse.verse_number ? 'white' : '#6b7280',
                    borderRadius: '50%',
                    textAlign: 'center',
                    lineHeight: '32px',
                    fontSize: '14px',
                    fontWeight: '600',
                    margin: '0 8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: '2px solid ' + (currentPlayingVerse === verse.verse_number ? '#8b5cf6' : '#e5e7eb')
                  }}
                  onClick={() => playVerseAudio(verse.verse_number, verse.global_ayah_number)}
                  onMouseEnter={(e) => {
                    if (currentPlayingVerse !== verse.verse_number) {
                      e.currentTarget.style.backgroundColor = '#e5e7eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentPlayingVerse !== verse.verse_number) {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                    }
                  }}
                  title={`Click to play verse ${verse.verse_number}`}
                >
                  {verse.verse_number}
                </span>
                
                {/* Translation below verse (if enabled) */}
                {quranSettings.show_translation && (
                  <div style={{
                    display: 'block',
                    width: '100%',
                    fontSize: '16px',
                    color: '#374151',
                    fontStyle: 'italic',
                    lineHeight: '1.6',
                    textAlign: 'left',
                    direction: 'ltr',
                    margin: '12px 0 20px 0',
                    padding: '12px 16px',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #d1fae5',
                    borderRadius: '6px'
                  }}>
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: '600', 
                      color: '#059669',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Verse {verse.verse_number}:
                    </span>
                    <br />
                    {verse.text_translation || 'Translation loading...'}
                  </div>
                )}
                
                {/* Add space between verses */}
                {index < currentVerses.length - 1 && <span> </span>}
            </span>
            ))}
        </div>

        {/* Mushaf Footer */}
        <div style={{ 
            backgroundColor: '#f0fdf4', 
            borderRadius: '0 0 8px 8px', 
            padding: '16px 30px',
            borderTop: '1px solid #d1fae5'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', color: '#065f46' }}>
                <strong>💡 How to Use:</strong> Double-click Arabic words to add to flashcards • Click verse numbers to play audio • Highlighted text shows currently playing verse
            </div>
            <div style={{ fontSize: '12px', color: '#065f46' }}>
                📄 Page view • {currentVerses.length} verses
            </div>
            </div>
        </div>
        </div>
    );
    };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
   <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: 'Roboto, sans-serif' }}>
      <div style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ 
                fontFamily: 'Amiri, "Noto Naskh Arabic", "Times New Roman", serif',
                direction: 'rtl',
                textAlign: 'center'
                }}>
                <div style={{
                    fontSize: '28px',
                    fontWeight: '700',
                    color: '#8b5cf6',
                    lineHeight: '1.1'
                }}>
                    قُرْآنًا
                </div>
                <div style={{
                    fontSize: '26px',
                    fontWeight: '700',
                    color: '#8b5cf6',
                    lineHeight: '1.1'
                }}>
                    عَرَبِيًّا
                </div>
            </div>
            <ProfileDropdown user={user} onLogout={handleLogout} />
          </div>

          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginTop: '16px' }}>
            {[
              { id: 'my-cards', label: 'My Cards' },
              { id: 'watch', label: 'Watch Videos' },
              { id: 'read', label: 'Read Books' },
              { id: 'community', label: 'Community' },
              { id: 'leaderboard', label: 'Leaderboard' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: activeTab === tab.id ? '#8b5cf6' : '#6b7280',
                  fontWeight: activeTab === tab.id ? '600' : '400',
                  fontSize: '14px',
                  cursor: 'pointer',
                  borderBottom: activeTab === tab.id ? '2px solid #8b5cf6' : '2px solid transparent'
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        {renderTabContent()}
        {renderCardModal()}
        {/* Delete Deck Confirmation Modal */}
      {showDeleteModal && deckToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
            width: '90%',
            maxWidth: '450px',
            border: '2px solid #8b5cf6'
          }}>
            {/* Modal Header */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🗑️</div>
              <h3 style={{ 
                margin: '0 0 8px 0', 
                color: '#dc2626', 
                fontSize: '20px',
                fontWeight: '700'
              }}>
                Delete deck "{deckToDelete.name}"?
              </h3>
              <p style={{ 
                color: '#6b7280', 
                margin: '0',
                fontSize: '14px'
              }}>
                This will delete {deckToDelete.totalCards || 0} cards
              </p>
            </div>

            {/* Warning Message */}
            <div style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #d1fae5',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '24px',
              textAlign: 'center'
            }}>
              <p style={{ 
                color: '#059669', 
                margin: '0',
                fontSize: '13px',
                fontWeight: '500'
              }}>
                ✅ Don't worry - you can undo this action
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeckToDelete(null);
                }}
                disabled={isDeletingDeck}
                style={{
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: isDeletingDeck ? 'not-allowed' : 'pointer',
                  opacity: isDeletingDeck ? 0.5 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteDeck}
                disabled={isDeletingDeck}
                style={{
                  backgroundColor: isDeletingDeck ? '#9ca3af' : '#dc2626',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: isDeletingDeck ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {isDeletingDeck ? (
                  <>
                    <span style={{ 
                      display: 'inline-block',
                      width: '12px',
                      height: '12px',
                      border: '2px solid #ffffff',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></span>
                    Deleting...
                  </>
                ) : (
                  <>🗑️ Delete Deck</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

// Root Component with Authentication
function SecretApp() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb'
      }}>
        <div>Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <AuthForm />
  }

  return <MainApp user={user} />
      
}


export default SecretApp;
