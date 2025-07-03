'use client';
import React, { useState, useEffect, useRef } from 'react';
import { AuthForm } from '@/components/AuthForm';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import { VideoPlayer } from '@/components/VideoPlayer';
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
  createOrUpdateUserProfile,
  getCardsInDeck,
  deleteCard, 
  deleteMultipleCards,
  restoreCard,
  toggleCardSuspension,
  updateCardContent,
  softDeleteDeck,
  restoreDeletedDeck,
  getQuranTranslationCache,        
  saveQuranTranslationCache,
  getYouTubeTranslationCache,   
  saveYouTubeTranslationCache,
  getQuranAudioCache,
  saveQuranAudioCache,
  fetchStudyCardAudio,
  getUserSettings,
  updateUserSettings,
  saveVideoState,
  getVideoState,
  clearVideoState,
  updateVideoBackgroundSetting,
  updateDailyImmersionStats,
  saveImmersionSession,
  loadUserImmersionStats,
  getCommunityPostsWithUsers,
  createCommunityPostWithMedia,
  interactWithPostPersistent,
  getUserPostInteractions,
  updateUserDisplayName,
  loadUserStatsAndProfile,
  updateUserProfileComplete,
  calculateImmersionStreak,
  calculateCardStudyStreak,
  testCommunityConnection,
  getUserProfile
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
// Main App Component
function MainApp({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState('watch');
  


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
  const [studyCardAudio, setStudyCardAudio] = useState(null);
  const [isStudyAudioLoading, setIsStudyAudioLoading] = useState(false);
  const [studyAudioStatus, setStudyAudioStatus] = useState('');

  // Modal states
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [cardForm, setCardForm] = useState({
    arabic_word: '',
    english_meaning: '',
    context: '',
    notes: ''
  });
  // PROFILE DROPDOWN HANDLERS
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleGoToSettings = () => {
    console.log('Settings clicked - add your settings logic here');
  };

  const handleOpenProfile = () => {
    setShowProfileModal(true);
  };
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
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [autoScrollPaused, setAutoScrollPaused] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [quranView, setQuranView] = useState('main'); // 'main', 'surah-library', 'reading'
  const quranContainerRef = useRef<HTMLDivElement>(null);
  const [selectedSurahNumber, setSelectedSurahNumber] = useState(1);
  const [playMode, setPlayMode] = useState('single'); // 'single', 'range', 'full'
  const [playRange, setPlayRange] = useState({ start: 1, end: 1 });
  const [isPlayingContinuous, setIsPlayingContinuous] = useState(false);
  const [quranSettings, setQuranSettings] = useState<any>({
    preferred_reciter_id: 3,
    show_translation: false,
    auto_scroll: true
  });
  const playbackStateRef = useRef({
    playbackMode: 'single' as 'single' | 'full' | 'range',
    playbackQueue: [] as any[],
    currentQueueIndex: 0,
    isPlayingContinuous: false
  });
  //user setting states
  const [userProfile, setUserProfile] = useState({
    display_name: '',
    username: '',
    arabic_name: '',
    bio: '',
    avatar_url: ''
  });
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [userProfileData, setUserProfileData] = useState({
    profile: {},
    stats: {},
    streaks: {}
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [userSettings, setUserSettings] = useState({
    card_autoplay_audio: true,
    current_video_url: null,
    current_video_timestamp: 0,
    video_keep_playing_background: true
  });

  
  //profile states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userStats, setUserStats] = useState({
    today: { focused_seconds: 0, freeflow_seconds: 0, total_seconds: 0 },
    week: { total_seconds: 0, days_active: 0 },
    allTime: { total_seconds: 0, longest_session: 0 }
  });
  // Load stats when profile modal opens
  useEffect(() => {
    if (showProfileModal && user?.id) {
      loadUserImmersionStats(user.id).then(({ data, error }) => {
        if (!error && data) {
          setUserStats(data);
        }
      });
    }
  }, [showProfileModal, user?.id]);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [currentPlayingVerse, setCurrentPlayingVerse] = useState<number | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [playbackQueue, setPlaybackQueue] = useState<any[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [playbackMode, setPlaybackMode] = useState<'single' | 'full' | 'range'>('single');

  


  // community states
  const [communityPosts, setCommunityPosts] = useState<any[]>([]);
  const [newPost, setNewPost] = useState('');
  const [newPostTranslation, setNewPostTranslation] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [userInteractions, setUserInteractions] = useState({});
  const [expandedImages, setExpandedImages] = useState(new Set());

  
  const loadCommunityPosts = async () => {
     setIsLoadingPosts(true);
    try {
      console.log('🔍 Debug: Starting to load posts...');
      console.log('🔍 Debug: Available functions:', { 
        getCommunityPostsWithUsers: typeof getCommunityPostsWithUsers,
        testCommunityConnection: typeof testCommunityConnection 
      });
      
      const { data, error } = await getCommunityPostsWithUsers(20, 0);
      console.log('🔍 Debug: Posts result:', { data, error });
      
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
  const loadUserSettings = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await getUserSettings(user.id);
      if (!error && data) {
        setUserSettings(data);
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
  };

  const renderProfileModal = () => {
    if (!showProfileModal) return null;
  
    const { profile, stats, streaks } = userProfileData;
  
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
        zIndex: 2000
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto'
        }}>
          
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              margin: '0',
              color: '#111827'
            }}>
              Profile
            </h2>
            <button
              onClick={() => setShowProfileModal(false)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '4px'
              }}
            >
              ✕
            </button>
          </div>
  
          {/* User Profile Info - NEW SECTION ABOVE STATS */}
          <div style={{
            backgroundColor: '#f3f0ff',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px',
            border: '2px solid #e9d5ff'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                backgroundColor: '#8b5cf6',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                color: 'white',
                overflow: 'hidden'
              }}>
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="Avatar" 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover' 
                    }}
                  />
                ) : '👤'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#374151',
                  marginBottom: '4px'
                }}>
                  {profile?.display_name || user?.email?.split('@')[0] || 'User'}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  marginBottom: '8px'
                }}>
                  {user?.email}
                </div>
                
                {/* Streaks Row */}
                <div style={{
                  display: 'flex',
                  gap: '16px',
                  fontSize: '12px'
                }}>
                  <div style={{
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontWeight: '600'
                  }}>
                    🎯 {streaks?.immersion_streak || 0} day immersion streak
                  </div>
                  <div style={{
                    backgroundColor: '#ddd6fe',
                    color: '#7c3aed',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontWeight: '600'
                  }}>
                    📚 {streaks?.card_study_streak || 0} day card streak
                  </div>
                </div>
              </div>
            </div>
  
            {/* Bio Section */}
            {profile?.bio && profile.bio.trim() && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: 'white',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#374151',
                fontStyle: 'italic'
              }}>
                "{profile.bio}"
              </div>
            )}
  
            {/* Arabic Name */}
            {profile?.arabic_name && (
              <div style={{
                marginTop: '12px',
                textAlign: 'center',
                fontSize: '18px',
                color: '#8b5cf6',
                fontWeight: '600',
                direction: 'rtl'
              }}>
                {profile.arabic_name}
              </div>
            )}
          </div>
  
          {/* Immersion Stats - EXISTING SECTION */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '2px solid #8b5cf6',
            padding: '20px'
          }}>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#8b5cf6',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px'
              }}>
                📊
              </div>
              <div>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  margin: '0',
                  color: '#374151'
                }}>
                  Immersion Statistics
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  margin: '4px 0 0 0'
                }}>
                  Your Arabic learning progress
                </p>
              </div>
            </div>
  
            {/* Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '16px',
              marginBottom: '20px'
            }}>
              
              {/* Today */}
              <div style={{
                backgroundColor: '#f0f9ff',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid #bae6fd',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#0284c7',
                  marginBottom: '4px'
                }}>
                  {formatTime(stats?.today?.total_seconds || 0)}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#0c4a6e',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Today
                </div>
              </div>
              
              {/* This Week */}
              <div style={{
                backgroundColor: '#fef3c7',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid #fde68a',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#d97706',
                  marginBottom: '4px'
                }}>
                  {formatTime(stats?.week?.total_seconds || 0)}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#92400e',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  This Week
                </div>
                <div style={{
                  fontSize: '10px',
                  color: '#6b7280',
                  marginTop: '4px'
                }}>
                  {stats?.week?.days_active || 0} days active
                </div>
              </div>
              
              {/* All Time */}
              <div style={{
                backgroundColor: '#f3f0ff',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid #e9d5ff',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#8b5cf6',
                  marginBottom: '4px'
                }}>
                  {formatTime(stats?.allTime?.total_seconds || 0)}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#7c3aed',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  All Time
                </div>
                <div style={{
                  fontSize: '10px',
                  color: '#6b7280',
                  marginTop: '4px'
                }}>
                  Best: {formatTime(stats?.allTime?.longest_session || 0)}
                </div>
              </div>
            </div>
            
            {/* Progress Indicator */}
            <div style={{ marginTop: '20px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  Today's Progress
                </span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  {Math.round(((stats?.today?.total_seconds || 0) / 3600) * 100)}% of 1hr goal
                </span>
              </div>
              
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#f3f4f6',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${Math.min(100, ((stats?.today?.total_seconds || 0) / 3600) * 100)}%`,
                  height: '100%',
                  backgroundColor: '#8b5cf6',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const saveUserSettings = async (newSettings) => {
    if (!user?.id) return;
    try {
      const { data, error } = await updateUserSettings(user.id, newSettings);
      if (!error) {
        setUserSettings(prev => ({ ...prev, ...newSettings }));
        setCardMessage('✅ Settings saved successfully!');
        setTimeout(() => setCardMessage(''), 3000);
      } else {
        setCardMessage('❌ Failed to save settings');
        setTimeout(() => setCardMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setCardMessage('❌ Error saving settings');
      setTimeout(() => setCardMessage(''), 3000);
    }
  };
  const goToSettings = () => {
    setPreviousTab(activeTab); // Remember current tab
    setActiveTab('settings');
  };
  
  const backFromSettings = () => {
    setActiveTab(previousTab);
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
  const playStudyCardAudio = async (card, force = false) => {

    console.log('🔍 Audio Debug:', {
    cardId: card?.id,
    global_ayah_number: card?.global_ayah_number,
    surah_number: card?.surah_number,
    verse_number: card?.verse_number,
    source_type: card?.source_type,
    force: force,
    autoplayEnabled: userSettings.card_autoplay_audio
  });

  // Only play if autoplay is enabled OR user manually clicked (force = true)
  if (!force && !userSettings.card_autoplay_audio) {
    console.log('❌ Audio skipped - autoplay disabled and not forced');
    return;
  }

  // Only works for Quran cards
  if (!card.global_ayah_number || !card.surah_number || !card.verse_number) {
    console.log('❌ Missing required fields for audio');
    if (force) {
      setStudyAudioStatus('❌ No audio available for this card');
      setTimeout(() => setStudyAudioStatus(''), 3000);
    }
    return;
  }
  
  // Only play if autoplay is enabled OR user manually clicked (force = true)
    if (!force && !userSettings.card_autoplay_audio) {
      return;
    }
  
    // Only works for Quran cards
    if (!card.global_ayah_number || !card.surah_number || !card.verse_number) {
      if (force) {
        setStudyAudioStatus('❌ No audio available for this card');
        setTimeout(() => setStudyAudioStatus(''), 3000);
      }
      return;
    }
  
    try {
      // Stop any currently playing audio
      if (studyCardAudio) {
        studyCardAudio.pause();
        studyCardAudio.currentTime = 0;
        setStudyCardAudio(null);
      }
  
      setIsStudyAudioLoading(true);
      setStudyAudioStatus('🔄 Loading verse audio...');
  
      // Use our cache-enabled function
      const audio = await fetchStudyCardAudio(card.global_ayah_number, setStudyAudioStatus);
      
      setStudyCardAudio(audio);
      setIsStudyAudioLoading(false);
  
      // Handle audio end
      audio.onended = () => {
        setStudyCardAudio(null);
        setStudyAudioStatus('');
      };
  
      audio.onerror = () => {
        setStudyCardAudio(null);
        setIsStudyAudioLoading(false);
        setStudyAudioStatus('❌ Audio playback failed');
        setTimeout(() => setStudyAudioStatus(''), 3000);
      };
  
    } catch (error) {
      console.error('Study card audio error:', error);
      setIsStudyAudioLoading(false);
      setStudyAudioStatus('❌ Audio failed to load');
      setTimeout(() => setStudyAudioStatus(''), 3000);
    }
  };
  const stopStudyAudio = () => {
    if (studyCardAudio) {
      studyCardAudio.pause();
      studyCardAudio.currentTime = 0;
      setStudyCardAudio(null);
    }
    setStudyAudioStatus('');
    setIsStudyAudioLoading(false);
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
  // STEP 6: Add this Settings page render function
// Add this function after your other render functions (around line 1500-2000)
  
  const renderImmersionStats = () => {
    if (!immersionSession.startTime || immersionSession.totalSeconds === 0) return null;
    
    const minutes = Math.floor(immersionSession.totalSeconds / 60);
    const seconds = immersionSession.totalSeconds % 60;
    
    return (
      <div style={{
        backgroundColor: '#f0fdf4',
        border: '1px solid #d1fae5',
        borderRadius: '6px',
        padding: '8px 12px',
        margin: '8px 0',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{ fontSize: '16px' }}>🎯</span>
        <div style={{ fontSize: '12px', color: '#059669' }}>
          <strong>Immersion:</strong> {minutes}:{seconds.toString().padStart(2, '0')} 
          <span style={{ marginLeft: '8px', opacity: '0.8' }}>
            ({immersionSession.currentMode})
          </span>
        </div>
      </div>
    );
  };
  const renderImmersionTimerWidget = () => {
    // Only show on watch tab and when session is active
    if (activeTab !== 'watch' || !immersionSession.startTime || immersionSession.totalSeconds === 0) return null;
    
    const minutes = Math.floor(immersionSession.totalSeconds / 60);
    const seconds = immersionSession.totalSeconds % 60;
    const hours = Math.floor(minutes / 60);
    const displayMinutes = minutes % 60;
    
    // Format time display
    const timeDisplay = hours > 0 
      ? `${hours}:${displayMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      : `${displayMinutes}:${seconds.toString().padStart(2, '0')}`;
    
    return (
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        backgroundColor: 'rgba(139, 92, 246, 0.95)',
        color: 'white',
        padding: '12px 16px',
        borderRadius: '12px',
        boxShadow: '0 8px 25px rgba(139, 92, 246, 0.3)',
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        minWidth: '180px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        
        {/* Session Type Icon */}
        <div style={{ fontSize: '18px' }}>
          {immersionSession.currentMode === 'focused' ? '🎯' : '🌊'}
        </div>
        
        {/* Time Display */}
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: '700',
            fontFamily: 'monospace',
            letterSpacing: '0.5px'
          }}>
            {timeDisplay}
          </div>
          <div style={{ 
            fontSize: '10px', 
            opacity: '0.8',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontWeight: '500'
          }}>
            {immersionSession.currentMode === 'focused' ? 'Focused' : 'Freeflow'}
          </div>
        </div>
        
        {/* Pulse Indicator */}
        <div style={{
          width: '8px',
          height: '8px',
          backgroundColor: immersionSession.currentMode === 'focused' ? '#10b981' : '#f59e0b',
          borderRadius: '50%',
          animation: 'pulse 2s infinite'
        }} />
      </div>
    );
  };
  const renderSettingsPage = () => (
      <div>
        {/* Header with back button */}
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
              onClick={backFromSettings}
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
              ← Back
            </button>
            
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '0', color: '#111827' }}>
                Settings
              </h2>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
                Manage your app preferences and profile settings
              </p>
            </div>
          </div>
        </div>
    
        {/* Settings message */}
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
    
        {/* Profile Settings Section - ENHANCED */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          marginBottom: '16px',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '24px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#8b5cf6',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px'
              }}>
                👤
              </div>
              <div>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  margin: '0',
                  color: '#374151'
                }}>
                  Profile Settings
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  margin: '4px 0 0 0'
                }}>
                  Customize how others see you in the community
                </p>
              </div>
            </div>
    
            <div style={{ display: 'grid', gap: '20px' }}>
              
              {/* Avatar Upload Section */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Profile Picture
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    overflow: 'hidden',
                    border: '3px solid #e5e7eb'
                  }}>
                    {selectedAvatar ? (
                      <img 
                        src={URL.createObjectURL(selectedAvatar)} 
                        alt="Preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : userProfile.avatar_url ? (
                      <img 
                        src={userProfile.avatar_url} 
                        alt="Current avatar" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : '👤'}
                  </div>
                  <div>
                    <label style={{
                      backgroundColor: '#8b5cf6',
                      color: 'white',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'inline-block'
                    }}>
                      Choose Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarSelect}
                        style={{ display: 'none' }}
                      />
                    </label>
                    <p style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      marginTop: '4px',
                      margin: '4px 0 0 0'
                    }}>
                      JPG, PNG or GIF. Max 10MB.
                    </p>
                    {selectedAvatar && (
                      <p style={{
                        fontSize: '12px',
                        color: '#059669',
                        marginTop: '4px',
                        margin: '4px 0 0 0'
                      }}>
                        📎 {selectedAvatar.name} selected
                      </p>
                    )}
                  </div>
                </div>
              </div>
    
              {/* Display Name */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Display Name *
                </label>
                <input
                  type="text"
                  value={userProfile.display_name}
                  onChange={(e) => setUserProfile(prev => ({ ...prev, display_name: e.target.value }))}
                  placeholder="How others will see your name"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  maxLength={50}
                />
                <p style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginTop: '4px'
                }}>
                  This is how your name appears in community posts. Must be unique.
                </p>
              </div>
    
              {/* Username */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Username
                </label>
                <input
                  type="text"
                  value={userProfile.username}
                  onChange={(e) => setUserProfile(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="@username (optional)"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  maxLength={30}
                />
                <p style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginTop: '4px'
                }}>
                  Optional unique identifier
                </p>
              </div>
    
              {/* Arabic Name */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Arabic Name (الاسم العربي)
                </label>
                <input
                  type="text"
                  value={userProfile.arabic_name}
                  onChange={(e) => setUserProfile(prev => ({ ...prev, arabic_name: e.target.value }))}
                  placeholder="اسمك بالعربية"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px',
                    direction: 'rtl',
                    textAlign: 'right'
                  }}
                  maxLength={50}
                />
                <p style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginTop: '4px'
                }}>
                  Your name in Arabic (optional)
                </p>
              </div>
    
              {/* Bio */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Bio
                </label>
                <textarea
                  value={userProfile.bio}
                  onChange={(e) => setUserProfile(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell others about your Arabic learning journey..."
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                  maxLength={200}
                />
                <p style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginTop: '4px'
                }}>
                  {(userProfile.bio || '').length}/200 characters
                </p>
              </div>
    
              {/* Current Email (read-only) */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #f3f4f6',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: '#f9fafb',
                    color: '#6b7280'
                  }}
                />
                <p style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginTop: '4px'
                }}>
                  Your account email cannot be changed
                </p>
              </div>
    
              {/* Update Button */}
              <div style={{ paddingTop: '8px' }}>
                <button
                  onClick={handleUpdateProfile}
                  disabled={isUpdatingProfile || !userProfile.display_name.trim()}
                  style={{
                    backgroundColor: isUpdatingProfile || !userProfile.display_name.trim() ? '#9ca3af' : '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '14px 24px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: isUpdatingProfile || !userProfile.display_name.trim() ? 'not-allowed' : 'pointer',
                    width: '100%'
                  }}
                >
                  {isUpdatingProfile ? 'Updating Profile...' : 'Update Profile'}
                </button>
              </div>
            </div>
          </div>
        </div>
    
        {/* Study Settings Section - EXISTING */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          
          {/* Card Settings Section */}
          <div style={{ padding: '24px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#8b5cf6',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px'
              }}>
                📚
              </div>
              <div>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  margin: '0',
                  color: '#374151'
                }}>
                  Study Settings
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  margin: '4px 0 0 0'
                }}>
                  Configure your learning experience
                </p>
              </div>
            </div>
    
            <div style={{ display: 'grid', gap: '16px' }}>
              {/* Card Autoplay Setting */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e9ecef'
              }}>
                <div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '4px'
                  }}>
                    Card Audio Autoplay
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#6b7280'
                  }}>
                    Automatically play pronunciation when reviewing cards
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const newValue = !userSettings.card_autoplay_audio;
                    const updated = { ...userSettings, card_autoplay_audio: newValue };
                    setUserSettings(updated);
                    
                    try {
                      await updateUserSettings(user.id, { card_autoplay_audio: newValue });
                      setCardMessage('✅ Settings updated successfully!');
                    } catch (error) {
                      setCardMessage('❌ Failed to update settings');
                      setUserSettings(userSettings); // Revert on error
                    }
                    setTimeout(() => setCardMessage(''), 3000);
                  }}
                  style={{
                    width: '50px',
                    height: '28px',
                    backgroundColor: userSettings.card_autoplay_audio ? '#10b981' : '#d1d5db',
                    borderRadius: '14px',
                    border: 'none',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '4px',
                    left: userSettings.card_autoplay_audio ? '26px' : '4px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
                  }} />
                </button>
              </div>
    
              {/* Video Background Play Setting */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e9ecef'
              }}>
                <div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '4px'
                  }}>
                    Background Video Play
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#6b7280'
                  }}>
                    Continue playing videos when switching tabs
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const newValue = !userSettings.video_keep_playing_background;
                    const updated = { ...userSettings, video_keep_playing_background: newValue };
                    setUserSettings(updated);
                    
                    try {
                      await updateUserSettings(user.id, { video_keep_playing_background: newValue });
                      setCardMessage('✅ Settings updated successfully!');
                    } catch (error) {
                      setCardMessage('❌ Failed to update settings');
                      setUserSettings(userSettings); // Revert on error
                    }
                    setTimeout(() => setCardMessage(''), 3000);
                  }}
                  style={{
                    width: '50px',
                    height: '28px',
                    backgroundColor: userSettings.video_keep_playing_background ? '#10b981' : '#d1d5db',
                    borderRadius: '14px',
                    border: 'none',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '4px',
                    left: userSettings.video_keep_playing_background ? '26px' : '4px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
                  }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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
    
        // Create deck only when user clicks word (if doesn't exist)
        if (!quranDeck?.id && user?.id && currentSurah) {
          const { data: deck } = await createSurahDeck(currentSurah.name_english, surahNumber, user.id);
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

   const playVerseAudio = async (verseNumber: number, globalAyahNumber: number, isFromQueue: boolean = false) => {
      try {
        console.log('🎵 Playing verse:', verseNumber, 'Global ayah:', globalAyahNumber, 'From queue:', isFromQueue);

        if (player && player.getPlayerState && player.getPlayerState() === window.YT.PlayerState.PLAYING) {
          if (userSettings.video_keep_playing_background) {
            player.pauseVideo();
            console.log('🎵 Paused YouTube video for Quran audio');
          }
        }
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
          const audioUrls = [
            data.data.audio,
            ...(data.data.audioSecondary || [])
          ].filter(Boolean);
    
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
              
              // 🔥 FIXED: Use playbackStateRef instead of closure variables
              audio.onended = () => {
                console.log('🎵 Audio ended for verse:', verseNumber);
                console.log('🔥 Ref state at audio end:', playbackStateRef.current);
                
                const { playbackMode: currentMode, playbackQueue: currentQueue, currentQueueIndex: currentIndex } = playbackStateRef.current;
                
                if (currentMode === 'full' && currentQueue.length > 0) {
                  // Check if there are more verses in the queue
                  if (currentIndex + 1 < currentQueue.length) {
                    // Move to next verse
                    const nextIndex = currentIndex + 1;
                    setCurrentQueueIndex(nextIndex);
                    
                    const nextVerse = currentQueue[nextIndex];
                    console.log('🎵 Playing next verse in queue:', nextVerse.verse_number);
                    
                    // Small delay before next verse (500ms)
                    setTimeout(() => {
                      playVerseAudio(nextVerse.verse_number, nextVerse.global_ayah_number, true);
                    }, 500);
                  } else {
                    // Queue finished
                    console.log('🎵 Full surah playback completed');
                    setQuranMessage('✅ Full surah playback completed');
                    setPlaybackMode('single');
                    setPlaybackQueue([]);
                    setCurrentQueueIndex(0);
                    setCurrentPlayingVerse(null);
                    setCurrentAudio(null);
                    setIsPlayingContinuous(false);
                    setTimeout(() => setQuranMessage(''), 3000);
                  }
                } else {
                  // Single verse mode
                  setCurrentPlayingVerse(null);
                  setCurrentAudio(null);
                  setQuranMessage('');
                }
              };
              
              setCurrentAudio(audio);
              setCurrentPlayingVerse(verseNumber);
              
              // Update message based on playback mode
              const currentMode = playbackStateRef.current.playbackMode;
              if (currentMode === 'full') {
                const queuePosition = playbackStateRef.current.currentQueueIndex + 1;
                const totalVerses = playbackStateRef.current.playbackQueue.length;
                setQuranMessage(`🔊 Playing verse ${verseNumber} (${queuePosition}/${totalVerses})`);
              } else {
                setQuranMessage(`🔊 Playing verse ${verseNumber}`);
              }
              
              await audio.play();
              console.log(`✅ Audio playing from URL ${i + 1}`);
              return;
              
            } catch (error) {
              console.log(`❌ Audio URL ${i + 1} failed:`, error);
              continue;
            }
          }
          
          throw new Error('All audio URLs failed');
        } else {
          throw new Error('API returned no audio data');
        }
    
      } catch (error) {
        console.error('Audio playback failed:', error);
        
        // Handle retry for queue playback
        if (isFromQueue && playbackStateRef.current.playbackMode === 'full') {
          console.log('🔄 Retrying failed verse in queue...');
          setTimeout(() => {
            playVerseAudio(verseNumber, globalAyahNumber, true);
          }, 2000); // Retry after 2 seconds
          return;
        }
        
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

    const handleAudioEnded = () => {
      console.log('🎵 handleAudioEnded called, playbackMode:', playbackMode, 'queueIndex:', currentQueueIndex);
      console.log('🔥 handleAudioEnded called!');
      console.log('🔥 playbackMode:', playbackMode);
      console.log('🔥 queue length:', playbackQueue.length);
      console.log('🔥 currentQueueIndex:', currentQueueIndex);
      
      if (playbackMode === 'full' && playbackQueue.length > 0) {
        // Check if there are more verses in the queue
        if (currentQueueIndex + 1 < playbackQueue.length) {
          // Move to next verse
          const nextIndex = currentQueueIndex + 1;
          setCurrentQueueIndex(nextIndex);
          
          const nextVerse = playbackQueue[nextIndex];
          console.log('🎵 Playing next verse in queue:', nextVerse.verse_number);
          
          // Small delay before next verse (500ms)
          setTimeout(() => {
            playVerseAudio(nextVerse.verse_number, nextVerse.global_ayah_number, true);
          }, 500);
        } else {
          // Queue finished
          console.log('🎵 Full surah playback completed');
          setQuranMessage('✅ Full surah playback completed');
          setPlaybackMode('single');
          setPlaybackQueue([]);
          setCurrentQueueIndex(0);
          setCurrentPlayingVerse(null);
          setCurrentAudio(null);
          setTimeout(() => setQuranMessage(''), 3000);
        }
      } else {
        // Single verse mode
        setCurrentPlayingVerse(null);
        setCurrentAudio(null);
        setQuranMessage('');
      }
    };
    const playFullSurah = () => {
      if (!currentVerses || currentVerses.length === 0) {
        setQuranMessage('❌ No verses loaded');
        setTimeout(() => setQuranMessage(''), 3000);
        return;
      }
      
      console.log('🎵 Starting full surah playback...');
      
      // Find starting verse index (current single verse view or verse 1)
      let startIndex = 0;
      if (quranViewMode === 'single' && currentVerseIndex < currentVerses.length) {
        startIndex = currentVerseIndex;
      }
      
      // Create queue from current verse to end of surah
      const queue = currentVerses.slice(startIndex);
      
      setPlaybackQueue(queue);
      setCurrentQueueIndex(0);
      setPlaybackMode('full');
      setIsPlayingContinuous(true);
      
      // Start playing first verse in queue
      const firstVerse = queue[0];
      console.log('🎵 Starting with verse:', firstVerse.verse_number);
      setQuranMessage(`🎵 Starting full surah from verse ${firstVerse.verse_number}...`);
      
      playVerseAudio(firstVerse.verse_number, firstVerse.global_ayah_number, true);
    };
  
  
  const stopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
    
    // Reset all playback states
    setCurrentPlayingVerse(null);
    setIsPlayingContinuous(false);
    setPlaybackMode('single');
    setPlaybackQueue([]);
    setCurrentQueueIndex(0);
    setQuranMessage('');
    
    console.log('🎵 Audio stopped and all states reset');
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
    // ✅ KEEP these helper functions that are used by other components:
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };
  
  const cleanArabicWord = (word: string): string => {
    return word.replace(/[^\u0600-\u06FF\u0750-\u077F]/g, '').trim();
  };
  // 2. ENHANCED QURAN TRANSLATION CALL WITH CACHING
  const handleQuranWordDoubleClick = async (word: string, surahNumber: number, verseNumber: number, wordPosition: number, verseText: string) => {
    if (!user?.id) {
      setQuranMessage('❌ Not logged in');
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
      setQuranMessage('🔄 Checking cache for enhanced analysis...');
      
      // STEP 1: Check if translation is cached
      const cachedTranslation = await getQuranTranslationCache(
        cleanWord, 
        surahNumber, 
        verseNumber, 
        wordPosition
      );
  
      let translationData = null;
  
      if (cachedTranslation) {
        // CACHE HIT: Use existing translation
        setQuranMessage('✅ Found cached translation, creating your card...');
        translationData = cachedTranslation;
        console.log('🎯 Using cached Quran translation:', translationData);
      } else {
        // CACHE MISS: Call API and cache the result
        setQuranMessage('🔄 Creating new enhanced Quranic analysis...');
        
        // Enhanced context with Surah info
        const surahName = currentSurah?.name_english || 'Unknown Surah';
        const enhancedContext = `Surah ${surahName} (${surahNumber}), Verse ${verseNumber}: ${verseText}`;
        
        // Call the API for new translation
        translationData = await fetchEnhancedTranslation(
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
          setQuranMessage('🔄 Enhanced analysis received, caching for future use...');
          console.log('✨ New enhanced Quran translation:', translationData);
          
          // STEP 2: Save to cache for future users
          await saveQuranTranslationCache(
            cleanWord,
            surahNumber,
            verseNumber,
            translationData,
            wordPosition
          );
          
          setQuranMessage('🔄 Translation cached, saving your card...');
        } else {
          setQuranMessage('🔄 Analysis failed, saving card without enhanced data...');
        }
      }

      const surahName = currentSurah?.name_english || 'Unknown Surah';
      const enhancedContext = `Surah ${surahName} (${surahNumber}), Verse ${verseNumber}: ${verseText}`;
      
      //Create deck if it doesn't exist, then save card
      let deckToUse = quranDeck;
      if (!deckToUse?.id && user?.id && currentSurah) {
        setQuranMessage('🔄 Creating deck for this surah...');
        
        // Check if deck already exists in database
        const { data: existingDeck, error: fetchError } = await supabase
          .from('decks')
          .select('*')
          .eq('user_id', user.id)
          .eq('name', currentSurah.name_arabic)
          .single();
      
        if (existingDeck && !fetchError) {
          // Use existing deck
          setQuranDeck(existingDeck);
          deckToUse = existingDeck;
          setQuranMessage('🔄 Found existing deck, adding word...');
        } else {
          // Create new deck with Arabic name
          const { data: newDeck, error: createError } = await supabase
            .from('decks')
            .insert({
              user_id: user.id,
              name: currentSurah.name_arabic, // Arabic name instead of English
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
      
          if (createError) {
            setQuranMessage('❌ Failed to create deck. Please try again.');
            setTimeout(() => setQuranMessage(''), 3000);
            return;
          }
      
          setQuranDeck(newDeck);
          deckToUse = newDeck;
          setQuranMessage('🔄 Created new deck, adding word...');
        }
      }
      
      if (!deckToUse?.id) {
        setQuranMessage('❌ Could not create deck. Please try again.');
        setTimeout(() => setQuranMessage(''), 3000);
        return;
      }
      
      if (!deckToUse?.id) {
        setQuranMessage('❌ Could not create deck');
        setTimeout(() => setQuranMessage(''), 3000);
        return;
      }
      
      // Now save the card
      const result = await addQuranCard(
        deckToUse.id,  // ← Use the deck we just created
        cleanWord,
        surahNumber,
        verseNumber,
        wordPosition,
        enhancedContext,
        user.id,
        translationData
      );
      if (result.error) {
        if (result.error.message?.includes('duplicate key')) {
          setQuranMessage(`ℹ️ "${cleanWord}" already in your deck`);
        } else {
          setQuranMessage(`❌ Error: ${result.error.message}`);
        }
      } else {
        const message = translationData 
          ? `✅ Added "${cleanWord}" with enhanced analysis!`
          : `✅ Added "${cleanWord}" (analysis will be added later)`;
        setQuranMessage(message);
        await loadUserDecks();
      }
    } catch (error: any) {
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



 

 
  const loadCompleteUserData = async () => {
    try {
      const { data, error } = await loadUserStatsAndProfile(user.id);
      if (!error && data) {
        setUserProfileData(data);
        // Also update the existing userStats for backward compatibility
        setUserStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading complete user data:', error);
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
    if (user?.id) {
      loadUserProfileForSettings();
    }
  }, [user?.id]);


  useEffect(() => {
    if (showProfileModal && user?.id) {
      loadCompleteUserData();
    }
  }, [showProfileModal, user?.id]);
  
  useEffect(() => {
    if (user?.id) {
      loadUserSettings();
    }
  }, [user]);
  useEffect(() => {
    // Cleanup immersion session on component unmount or user logout
    return () => {
      if (immersionSession.isActive) {
        stopImmersionSession();
      }
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setIsTabVisible(isVisible);
    };
  
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeTab]);

  useEffect(() => {
    if (user?.id) loadUserDecks();
  }, [user]);

  useEffect(() => {
    if (autoScrollEnabled && !autoScrollPaused && currentPlayingVerse && playbackMode === 'full') {
      const scrollToCurrentVerse = () => {
        if (quranContainerRef.current) {
          const verseElement = quranContainerRef.current.querySelector(`[data-verse="${currentPlayingVerse}"]`);
          if (verseElement) {
            setIsAutoScrolling(true);
            verseElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest'
            });
            
            // Reset auto-scrolling flag after animation completes
            setTimeout(() => {
              setIsAutoScrolling(false);
            }, 1000);
          }
        }
      };
  
      // Delay scroll slightly to ensure verse is updated
      setTimeout(scrollToCurrentVerse, 200);
    }
  }, [currentPlayingVerse, autoScrollEnabled, autoScrollPaused, playbackMode]);
  // Add scroll listener to detect manual scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (autoScrollEnabled && !isAutoScrolling && playbackMode === 'full') {
        setAutoScrollPaused(true);
      }
    };
  
    if (quranContainerRef.current) {
      quranContainerRef.current.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        if (quranContainerRef.current) {
          quranContainerRef.current.removeEventListener('scroll', handleScroll);
        }
      };
    }
  }, [autoScrollEnabled, isAutoScrolling, playbackMode]);


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
    playbackStateRef.current = {
      playbackMode,
      playbackQueue,
      currentQueueIndex,
      isPlayingContinuous
    };
    console.log('📊 Updated playbackStateRef:', playbackStateRef.current);
  }, [playbackMode, playbackQueue, currentQueueIndex, isPlayingContinuous]);

  /*useEffect(() => {
    if (selectedSurahNumber && surahs.length > 0) {
      loadSurahVerses(selectedSurahNumber);
    }
  }, [selectedSurahNumber, surahs]);*/
  
  useEffect(() => {
    const handleClickOutside = (event) => {
        if (!event.target.closest('[data-profile-dropdown]')) {
        // Close dropdown logic will be handled by the ProfileDropdown component
        }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
    }, []);
  useEffect(() => {
    return () => {
      if (immersionIntervalRef.current) clearInterval(immersionIntervalRef.current);
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    };
  }, []);

  // YouTube functions

  const loadUserProfileForSettings = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await getUserProfile(user.id);
      if (!error && data) {
        setUserProfile({
          display_name: data.display_name || user.email?.split('@')[0] || 'User',
          username: data.username || '',
          arabic_name: data.arabic_name || 'مستخدم',
          bio: data.bio || '', // Ensure bio is always a string
          avatar_url: data.avatar_url || ''
        });
      } else {
        // Set default values if no profile exists
        const emailUsername = user.email?.split('@')[0] || 'User';
        setUserProfile({
          display_name: emailUsername,
          username: '',
          arabic_name: 'مستخدم',
          bio: '', // Always initialize as empty string
          avatar_url: ''
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      // Set safe defaults on error
      setUserProfile({
        display_name: user.email?.split('@')[0] || 'User',
        username: '',
        arabic_name: 'مستخدم',
        bio: '', // Safe default
        avatar_url: ''
      });
    }
  };

  // Function to handle avatar selection
  const handleAvatarSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit for avatars
        setCardMessage('❌ Avatar file too large (max 10MB)');
        setTimeout(() => setCardMessage(''), 3000);
        return;
      }
      setSelectedAvatar(file);
    }
  };
  const handleUpdateProfile = async () => {
    if (!user?.id) return;
    
    setIsUpdatingProfile(true);
    try {
      // Ensure all fields are strings
      const profileData = {
        display_name: (userProfile.display_name || '').trim(),
        username: (userProfile.username || '').trim(),
        arabic_name: (userProfile.arabic_name || '').trim(),
        bio: (userProfile.bio || '').trim(),
        avatar_url: userProfile.avatar_url || ''
      };
  
      console.log('🔍 Updating profile with:', profileData);
  
      const { data, error } = await updateUserProfileComplete(
        user.id, 
        profileData,
        selectedAvatar
      );
      
      if (!error) {
        setCardMessage('✅ Profile updated successfully!');
        setSelectedAvatar(null);
        // Update the profile state with new data
        if (data) {
          setUserProfile({
            ...data,
            bio: data.bio || '' // Ensure bio is always a string
          });
        }
      } else {
        console.error('Profile update error:', error);
        setCardMessage('❌ ' + (error.message || 'Failed to update profile'));
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setCardMessage('❌ Error updating profile: ' + error.message);
    } finally {
      setIsUpdatingProfile(false);
      setTimeout(() => setCardMessage(''), 3000);
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

  

  

  // Card functions
  const handleIndividualWordClick = (word: any, timestamp: number) => {
    // Use the segment start time, not the calculated word timestamp
   // seekTo(word.segmentStart);
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
    setCardMessage('🔄 Checking cache for enhanced analysis...');
  
    try {
      // STEP 1: Check if YouTube translation is cached
      const cachedTranslation = await getYouTubeTranslationCache(
        cleanWord,
        currentVideoId,
        word.segmentStart  // Use segment start time as cache key
      );
  
      let translationData = null;
  
      if (cachedTranslation) {
        // CACHE HIT: Use existing translation
        setCardMessage('✅ Found cached translation, creating your card...');
        translationData = cachedTranslation;
        console.log('🎯 Using cached YouTube translation:', translationData);
      } else {
        // CACHE MISS: Call API and cache the result
        setCardMessage('🔄 Creating new enhanced Arabic analysis...');
  
        // ENHANCED API CALL
        translationData = await fetchEnhancedTranslation(
          cleanWord, 
          enhancedContext, 
          'youtube', 
          {
            videoTitle: currentVideoTitle,
            timestamp: word.timestamp
          }
        );
        
        if (translationData) {
          setCardMessage('🔄 Enhanced analysis received, caching for future users...');
          console.log('✨ New enhanced YouTube translation:', translationData);
          
          // STEP 2: Save to cache for future users
          await saveYouTubeTranslationCache(
            cleanWord,
            currentVideoId,
            word.segmentStart,  // Use segment start time
            translationData,
            currentVideoTitle
          );
          
          setCardMessage('🔄 Translation cached, saving your card...');
        } else {
          setCardMessage('🔄 Translation failed, saving card without enhanced data...');
        }
      }
  
      // STEP 3: Save card with translation data (cached or new)
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
          setCardMessage(`ℹ️ "${cleanWord}" already in your deck`);
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
      // Stop any playing audio
      stopStudyAudio();
      
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
        stopStudyAudio();
        setIsStudying(false);
        await loadUserDecks();
      }
    } catch (error) {
      console.error('Unexpected error in handleStudyAnswer:', error);
      setCardMessage('❌ Unexpected error occurred');
      setTimeout(() => setCardMessage(''), 3000);
    }
  };
  // Background Status Indicator Component
  const renderBackgroundStatusIndicator = () => {
    if (!isVideoPlayingBackground || activeTab === 'watch' || !backgroundVideoInfo) return null;
  
    return (
      <div style={{
        position: 'fixed',
        top: '80px',
        right: '20px',
        backgroundColor: '#8b5cf6',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
        cursor: 'pointer'
      }}
      onClick={() => setActiveTab('watch')}
      title="Click to return to video"
      >
        <div style={{
          width: '6px',
          height: '6px',
          backgroundColor: '#10b981',
          borderRadius: '50%',
          animation: 'pulse 1.5s infinite'
        }}></div>
        <span>🎵 Video Playing</span>
      </div>
    );
  };

  // Render functions
 

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
              <span style={{ color: '#059669' }}> {stats.totalNew} new</span>
              <span style={{ color: '#dc2626' }}> {stats.totalDue} due</span>
              <span style={{ color: '#ea580c' }}>{stats.totalLearning} learning</span>
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
                        <span style={{ color: '#059669' }}>new: {deck.newCards || 0}</span>
                        <span style={{ color: '#dc2626' }}>due: {deck.reviewCards || 0}</span>
                        <span style={{ color: '#ea580c' }}>learning: {deck.learningCards || 0}</span>
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
          const { data, error } = await createCommunityPostWithMedia(
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
          const { data, error } = await interactWithPostPersistent(postId, user.id, interactionType);
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
    
      // IMPORTANT: Make sure you have this return statement
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
            marginBottom: '16px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
              Share Your Progress
            </h3>
            
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Write in Arabic about your study progress today... (مرحبا)"
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
                          {new Date(post.created_at).toLocaleString()}
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
                    textAlign: 'right',
                    color: '#1f2937',
                    marginBottom: '12px',
                    fontFamily: 'serif'
                  }}>
                    {post.content}
                  </div>
    
                  {/* English Translation */}
                  {post.content_translation && (
                    <div style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      marginBottom: '16px',
                      fontStyle: 'italic'
                    }}>
                      {post.content_translation}
                    </div>
                  )}
    
                  {/* Media Content */}
                  {post.media_url && (
                    <div style={{ marginBottom: '16px' }}>
                      {post.post_type === 'image' && (
                        <img 
                          src={post.media_url}
                          alt="Post media"
                          style={{
                            width: '100%',
                            maxHeight: '400px',
                            objectFit: 'cover',
                            borderRadius: '8px'
                          }}
                        />
                      )}
                      {post.post_type === 'video' && (
                        <video 
                          src={post.media_url}
                          controls
                          style={{
                            width: '100%',
                            maxHeight: '300px',
                            borderRadius: '8px'
                          }}
                        />
                      )}
                      {post.post_type === 'audio' && (
                        <audio 
                          src={post.media_url}
                          controls
                          style={{ width: '100%' }}
                        />
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
    const renderProfileTab = () => {
      const [userStats, setUserStats] = useState({
        today: { focused_seconds: 0, freeflow_seconds: 0, total_seconds: 0 },
        week: { total_seconds: 0, days_active: 0 },
        allTime: { total_seconds: 0, longest_session: 0 }
      });
    
      // Load user stats when tab opens
      useEffect(() => {
        if (activeTab === 'profile' && user?.id) {
          loadUserImmersionStats();
        }
      }, [activeTab, user]);
    
      const loadUserImmersionStats = async () => {
        // TODO: You'll implement these database queries later
        console.log('Loading user immersion stats...');
      };
    
      // Helper function to format seconds into readable time
      const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
          return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
          return `${minutes}m`;
        } else {
          return `${seconds}s`;
        }
      };
    
      return (
        <div>
          {/* Profile Header */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '24px' 
          }}>
            <h2 style={{ fontSize: '28px', fontWeight: '700', margin: '0', color: '#111827' }}>
              Profile
            </h2>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ 
                fontSize: '12px', 
                color: '#8b5cf6', 
                fontWeight: '500',
                backgroundColor: '#f3f0ff',
                padding: '4px 8px',
                borderRadius: '6px'
              }}>
                {user?.email}
              </div>
            </div>
          </div>
    
          {/* Immersion Stats Card */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
            border: '2px solid #8b5cf6',
            marginBottom: '24px'
          }}>
            
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#8b5cf6',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px'
              }}>
                ⏱️
              </div>
              <div>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  margin: '0',
                  color: '#111827'
                }}>
                  Immersion Stats
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  margin: '4px 0 0 0'
                }}>
                  Your Arabic learning journey
                </p>
              </div>
            </div>
            
            {/* Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '16px'
            }}>
              
              {/* Today */}
              <div style={{
                backgroundColor: '#f0fdf4',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid #d1fae5',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#059669',
                  marginBottom: '4px'
                }}>
                  {formatTime(userStats.today.total_seconds)}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#065f46',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Today
                </div>
                <div style={{
                  fontSize: '10px',
                  color: '#6b7280',
                  marginTop: '4px'
                }}>
                  🎯 {formatTime(userStats.today.focused_seconds)} • 🌊 {formatTime(userStats.today.freeflow_seconds)}
                </div>
              </div>
              
              {/* This Week */}
              <div style={{
                backgroundColor: '#fef3c7',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid #fde68a',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#d97706',
                  marginBottom: '4px'
                }}>
                  {formatTime(userStats.week.total_seconds)}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#92400e',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  This Week
                </div>
                <div style={{
                  fontSize: '10px',
                  color: '#6b7280',
                  marginTop: '4px'
                }}>
                  {userStats.week.days_active} days active
                </div>
              </div>
              
              {/* All Time */}
              <div style={{
                backgroundColor: '#f3f0ff',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid #e9d5ff',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#8b5cf6',
                  marginBottom: '4px'
                }}>
                  {formatTime(userStats.allTime.total_seconds)}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#7c3aed',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  All Time
                </div>
                <div style={{
                  fontSize: '10px',
                  color: '#6b7280',
                  marginTop: '4px'
                }}>
                  Best: {formatTime(userStats.allTime.longest_session)}
                </div>
              </div>
            </div>
            
            {/* Progress Indicator */}
            <div style={{ marginTop: '20px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                  Today's Goal Progress
                </span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  {Math.min(100, Math.round((userStats.today.total_seconds / (30 * 60)) * 100))}%
                </span>
              </div>
              
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#f3f4f6',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${Math.min(100, (userStats.today.total_seconds / (30 * 60)) * 100)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #8b5cf6 0%, #a855f7 100%)',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              
              <div style={{
                fontSize: '11px',
                color: '#6b7280',
                marginTop: '4px',
                textAlign: 'center'
              }}>
                Goal: 30 minutes daily • {Math.max(0, Math.round(((30 * 60) - userStats.today.total_seconds) / 60))} minutes remaining
              </div>
            </div>
          </div>
    
          {/* Additional Profile Content */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              Learning Achievements
            </h3>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              Achievement system coming soon...
            </p>
          </div>
        </div>
      );
    };
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
  // 4. ENHANCED STUDY CARD DISPLAY 
    const renderEnhancedStudyInterface = () => {
      const mcdContext = createMCDContext(currentStudyCard.context, currentStudyCard.arabic_word);
    
      return (
        <div>
          {/* Back button and progress header */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '24px',
            padding: '16px',
            backgroundColor: 'white',
            borderRadius: '8px'
          }}>
            <button
              onClick={() => setIsStudying(false)}
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
              ← Back to Cards
            </button>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#8b5cf6' }}>
                {studyDeck?.name || 'Study Session'}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                Card {studyCardIndex + 1} of {studyCards.length}
              </div>
            </div>
            
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              Progress: {Math.round(((studyCardIndex + 1) / studyCards.length) * 100)}%
            </div>
          </div>
    
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ 
              backgroundColor: 'white', 
              padding: '40px', 
              borderRadius: '16px', 
              boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
              textAlign: 'center'
            }}>
              
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
                  {/* Small Surah Info Above */}
                  {currentStudyCard.surah_number && (
                    <div style={{
                      fontSize: '11px',
                      color: '#6b7280',
                      marginBottom: '8px',
                      fontWeight: '500'
                    }}>
                      Surah {currentStudyCard.surah_number}, Verse {currentStudyCard.verse_number}
                    </div>
                  )}
                  
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
    
                  {/* AUDIO CONTROLS SECTION */}
                  {currentStudyCard.surah_number && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '20px',
                      padding: '12px',
                      backgroundColor: '#f0fdf4',
                      borderRadius: '8px',
                      border: '1px solid #d1fae5'
                    }}>
                      <button
                        onClick={() => playStudyCardAudio(currentStudyCard, true)}
                        disabled={isStudyAudioLoading}
                        style={{
                          backgroundColor: studyCardAudio ? '#dc2626' : '#059669',
                          color: 'white',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: isStudyAudioLoading ? 'not-allowed' : 'pointer',
                          opacity: isStudyAudioLoading ? 0.6 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {isStudyAudioLoading ? (
                          <>
                            <span style={{
                              display: 'inline-block',
                              width: '12px',
                              height: '12px',
                              border: '2px solid white',
                              borderTop: '2px solid transparent',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite'
                            }}></span>
                            Loading...
                          </>
                        ) : studyCardAudio ? (
                          '⏹ Stop Audio'
                        ) : (
                          '🔊 Play Verse'
                        )}
                      </button>
              
                      {/* Audio status */}
                      {studyAudioStatus && (
                        <span style={{
                          fontSize: '12px',
                          color: studyAudioStatus.includes('❌') ? '#dc2626' : '#059669',
                          fontWeight: '500'
                        }}>
                          {studyAudioStatus}
                        </span>
                      )}
              
                      {/* Autoplay indicator */}
                      <span style={{
                        fontSize: '11px',
                        color: '#6b7280',
                        backgroundColor: '#f3f4f6',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>
                        Auto-play: {userSettings.card_autoplay_audio ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  )}
    
                  {/* DEFAULT VISIBLE SECTIONS */}
                  <div style={{ marginBottom: '25px' }}>
                    
                    {/* 1. Meaning in Context */}
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
    
                    {/* 2. Root Connection */}
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
    
                    {/* 3. Sample Sentences - NOW VISIBLE BY DEFAULT */}
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {currentStudyCard.samplesentence1 && (
                        <div style={{
                          backgroundColor: '#f0f9ff',
                          border: '1px solid #3b82f6',
                          borderRadius: '6px',
                          padding: '12px',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: '600', marginBottom: '4px' }}>
                            📖 Sample Sentence 1
                          </div>
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
    
                      {currentStudyCard.samplesentence2 && (
                        <div style={{
                          backgroundColor: '#fdf2f8',
                          border: '1px solid #ec4899',
                          borderRadius: '6px',
                          padding: '12px',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '12px', color: '#be185d', fontWeight: '600', marginBottom: '4px' }}>
                            📖 Sample Sentence 2
                          </div>
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
    
                  {/* EXPANDABLE SECTION: Grammar & Morphology ONLY */}
                  {showMoreDetails && (
                    <div style={{ display: 'grid', gap: '15px', marginTop: '20px' }}>
                      
                      {/* Grammar Explanation - FIXED FIELD REFERENCE */}
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
                            {currentStudyCard.grammarexplanation}
                          </div>
                          {currentStudyCard.grammarsample && (
                            <div style={{ 
                              marginTop: '8px', 
                              padding: '8px', 
                              backgroundColor: '#faf5ff', 
                              borderRadius: '4px',
                              direction: 'rtl',
                              fontFamily: 'Arial, sans-serif'
                            }}>
                              <div style={{ fontSize: '11px', color: '#8b5cf6', marginBottom: '4px' }}>Example:</div>
                              {currentStudyCard.grammarsample}
                            </div>
                          )}
                        </div>
                      )}
    
                      {/* Morphology (Word Construction) */}
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
                  
                  {/* Metadata */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    gap: '20px',
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
                      📍 {currentStudyCard.video_timestamp ? formatTime(currentStudyCard.video_timestamp) : 
                          currentStudyCard.surah_number ? `${currentStudyCard.surah_number}:${currentStudyCard.verse_number}` : 
                          'Unknown source'}
                    </span>
                    <span style={{
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      padding: '4px 8px',
                      borderRadius: '4px'
                    }}>
                      📊 Rep #{(currentStudyCard.reps || 0) + 1}
                    </span>
                  </div>
                </div>
              )}
    
              {/* Action buttons */}
              {!showAnswer ? (
                <button
                  onClick={() => {
                    setShowAnswer(true);
                    // Auto-play audio when showing answer (if enabled)
                    if (userSettings.card_autoplay_audio) {
                      setTimeout(() => {
                        playStudyCardAudio(currentStudyCard, false);
                      }, 500); // Small delay to let UI update first
                    }
                  }}
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
                <div>
                  {/* Rating buttons at the bottom */}
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
                </div>
              )}
            </div>
          </div>
        </div>
      );
    };

  
  // Reading interface - your existing Quran content
  const renderQuranReading = () => (
    <div>
      {/* Controls (moved from renderQuranContent) */}
      <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', marginBottom: '16px' }}>
        
        {/* View Mode Toggle */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
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
  
        {/* Audio Controls */}
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
          </div>
  
          {/* Play/Stop Button */}
          <button
            onClick={() => {
              if (playbackMode === 'full' || isPlayingContinuous) {
                stopAudio();
              } else {
                playFullSurah();
              }
            }}
            disabled={isLoadingAudio || !currentVerses || currentVerses.length === 0}
            style={{
              backgroundColor: (playbackMode === 'full' || isPlayingContinuous) ? '#dc2626' : '#059669',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '12px',
              fontWeight: '600',
              cursor: (isLoadingAudio || !currentVerses || currentVerses.length === 0) ? 'not-allowed' : 'pointer',
              opacity: (isLoadingAudio || !currentVerses || currentVerses.length === 0) ? 0.6 : 1
            }}
          >
            {playbackMode === 'full' || isPlayingContinuous ? '⏹ Stop Full Surah' : '▶ Play Full Surah'}
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
          <p>Loading surah content...</p>
        </div>
      )}
    </div>
  ); 
  // Add this new function to handle surah selection
  const handleSurahSelection = async (surah) => {
    setQuranView('reading');
    setSelectedSurahNumber(surah.number);
    // Load verses but don't create deck yet
    await loadSurahVersesWithoutDeck(surah.number);
  };
  const loadSurahVersesWithoutDeck = async (surahNumber) => {
    setIsLoadingQuran(true);
    setQuranMessage('🔄 Loading verses and translations...');
    
    setPlayRange({ start: 1, end: 1 });
    
    try {
      const { data, error } = await fetchSurahVerses(surahNumber, true);
      
      if (!error && data && data.length > 0) {
        setCurrentVerses(data);
        setPlayRange({ start: 1, end: data.length });
        
        const surah = surahs.find(s => s.number === surahNumber);
        setCurrentSurah(surah);
        
        setQuranDeck(null); // Don't create deck yet
        
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
  // Add this function to your MainApp component (after renderMyCardsTab)
  const renderReadTab = () => (
    <div>
      {/* Header with dynamic title and back navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Back button - only show when not on main view */}
          {quranView !== 'main' && (
            <button
              onClick={() => {
                if (quranView === 'reading') {
                  setQuranView('surah-library');
                  setCurrentSurah(null);
                  setCurrentVerses([]);
                  setQuranDeck(null);
                } else if (quranView === 'surah-library') {
                  setQuranView('main');
                }
              }}
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
              ← Back
            </button>
          )}
          
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0' }}>
            {quranView === 'main' ? 'Read Islamic Books' :
             quranView === 'surah-library' ? 'Quran - Select Surah' :
             'Reading Quran'}
          </h2>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {quranView === 'reading' && quranDeck && (
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
          {quranView === 'reading' && currentSurah && (
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
  
      {/* Render content based on current view */}
      {quranView === 'main' && renderMainReadMenu()}
      {quranView === 'surah-library' && renderSurahLibrary()}
      {quranView === 'reading' && renderQuranReading()}
    </div>
  );
  const renderMainReadMenu = () => (
    <div style={{ display: 'grid', gap: '16px', maxWidth: '600px', margin: '0 auto' }}>
      {/* Quran Card */}
      <div 
        onClick={() => setQuranView('surah-library')}
        style={{
          backgroundColor: 'white',
          padding: '32px',
          borderRadius: '16px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
          border: '2px solid #8b5cf6',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          textAlign: 'center'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 25px rgba(139, 92, 246, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
        }}
      >
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>📖</div>
        <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#8b5cf6', marginBottom: '8px' }}>
          Holy Quran
        </h3>
        <p style={{ color: '#6b7280', fontSize: '16px', marginBottom: '16px' }}>
          Read and study the Quran with interactive Arabic learning
        </p>
        <div style={{ 
          backgroundColor: '#f3f0ff', 
          color: '#8b5cf6', 
          padding: '8px 16px', 
          borderRadius: '20px', 
          fontSize: '14px', 
          fontWeight: '600',
          display: 'inline-block'
        }}>
          114 Surahs Available
        </div>
      </div>
  
      {/* Hadith Card */}
      <div style={{
        backgroundColor: 'white',
        padding: '32px',
        borderRadius: '16px',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
        border: '2px solid #e5e7eb',
        textAlign: 'center',
        opacity: '0.6'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>📜</div>
        <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>
          Hadith Collection
        </h3>
        <p style={{ color: '#6b7280', fontSize: '16px', marginBottom: '16px' }}>
          Study authenticated hadith with Arabic vocabulary building
        </p>
        <div style={{ 
          backgroundColor: '#f3f4f6', 
          color: '#6b7280', 
          padding: '8px 16px', 
          borderRadius: '20px', 
          fontSize: '14px', 
          fontWeight: '600',
          display: 'inline-block'
        }}>
          Coming Soon
        </div>
      </div>
  
      {/* Seerah Card */}
      <div style={{
        backgroundColor: 'white',
        padding: '32px',
        borderRadius: '16px',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
        border: '2px solid #e5e7eb',
        textAlign: 'center',
        opacity: '0.6'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🕌</div>
        <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>
          Seerah (Biography)
        </h3>
        <p style={{ color: '#6b7280', fontSize: '16px', marginBottom: '16px' }}>
          Learn from the life of Prophet Muhammad ﷺ
        </p>
        <div style={{ 
          backgroundColor: '#f3f4f6', 
          color: '#6b7280', 
          padding: '8px 16px', 
          borderRadius: '20px', 
          fontSize: '14px', 
          fontWeight: '600',
          display: 'inline-block'
        }}>
          Coming Soon
        </div>
      </div>
    </div>
  );
  // Surah library - list of all 114 surahs
  const renderSurahLibrary = () => (
    <div>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          backgroundColor: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <h3 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 8px 0', color: '#374151' }}>
            Select a Surah to Read
          </h3>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: '0' }}>
            Choose from 114 surahs • Double-click Arabic words to create flashcards
          </p>
        </div>
  
        {/* Surahs List */}
        <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {surahs.map((surah, index) => (
            <div 
              key={surah.number}
              onClick={() => handleSurahSelection(surah)}
              style={{
                padding: '16px 20px',
                borderBottom: index < surahs.length - 1 ? '1px solid #f3f4f6' : 'none',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
                display: 'grid',
                gridTemplateColumns: '60px 1fr auto auto',
                gap: '16px',
                alignItems: 'center'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {/* Surah Number */}
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#8b5cf6',
                color: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '700'
              }}>
                {surah.number}
              </div>
  
              {/* Names */}
              <div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#374151',
                  marginBottom: '4px',
                  fontFamily: 'Arial, sans-serif',
                  direction: 'rtl'
                }}>
                  {surah.name_arabic}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#8b5cf6',
                  fontWeight: '600'
                }}>
                  {surah.name_english}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  {surah.name_transliterated}
                </div>
              </div>
  
              {/* Verse Count */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#059669'
                }}>
                  {surah.verses_count}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#6b7280',
                  textTransform: 'uppercase'
                }}>
                  Verses
                </div>
              </div>
  
              {/* Revelation Type */}
              <div style={{
                backgroundColor: surah.revelation_place === 'Meccan' ? '#fef3c7' : '#f0fdf4',
                color: surah.revelation_place === 'Meccan' ? '#92400e' : '#059669',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '10px',
                fontWeight: '600',
                textTransform: 'uppercase'
              }}>
                {surah.revelation_place}
              </div>
            </div>
          ))}
        </div>
      </div>
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
                if (playbackMode === 'full' || isPlayingContinuous) {
                  stopAudio();
                } else {
                  playFullSurah();
                }
              }}
              disabled={isLoadingAudio || !currentVerses || currentVerses.length === 0}
              style={{
                backgroundColor: (playbackMode === 'full' || isPlayingContinuous) ? '#dc2626' : '#059669',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12px',
                fontWeight: '600',
                cursor: (isLoadingAudio || !currentVerses || currentVerses.length === 0) ? 'not-allowed' : 'pointer',
                opacity: (isLoadingAudio || !currentVerses || currentVerses.length === 0) ? 0.6 : 1
              }}
            >
              {playbackMode === 'full' || isPlayingContinuous ? '⏹ Stop Full Surah' : '▶ Play Full Surah'}
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
      case 'settings':
        return renderSettingsPage();
      case 'my-cards':
        return renderMyCardsTab();
      case 'read':
        return renderReadTab();
      case 'community':
        return renderCommunityTab();
      case 'leaderboard':
        return renderLeaderboardTab();
      case 'profile':
        return renderProfileTab();

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
      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', position: 'relative' }}>
        
        {/* STICKY CONTROLS HEADER */}
        <div style={{ 
          position: 'sticky',
          top: '0',
          zIndex: 100,
          backgroundColor: 'rgba(249, 250, 251, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '2px solid #f3f4f6',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ padding: 'clamp(15px, 3vw, 20px) clamp(20px, 4vw, 30px)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: 'clamp(1.2rem, 5vw, 1.5rem)', 
                fontWeight: '700', 
                color: '#8b5cf6',
                fontFamily: 'Arial, sans-serif',
                direction: 'rtl',
                marginBottom: '8px'
              }}>
                {currentSurah?.name_arabic}
              </div>
              <div style={{ 
                fontSize: 'clamp(0.8rem, 3vw, 1rem)', 
                color: '#6b7280',
                marginBottom: '12px'
              }}>
                {currentSurah?.name_english} • {currentVerses.length} Verses • {currentSurah?.revelation_place}
              </div>
              
              {/* ENHANCED AUDIO CONTROLS WITH AUTO-SCROLL */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: 'clamp(6px, 1.5vw, 8px)', 
                alignItems: 'center',
                flexWrap: 'wrap'
              }}>
                {/* Main Play/Stop Button */}
                <button
                  onClick={() => {
                    if (playbackMode === 'full' || isPlayingContinuous) {
                      stopAudio();
                      setAutoScrollPaused(false); // Reset auto-scroll when stopping
                    } else {
                      playFullSurah();
                      setAutoScrollPaused(false); // Enable auto-scroll when starting
                    }
                  }}
                  disabled={isLoadingAudio || !currentVerses || currentVerses.length === 0}
                  style={{
                    backgroundColor: (playbackMode === 'full' || isPlayingContinuous) ? '#dc2626' : '#059669',
                    color: 'white',
                    padding: 'clamp(6px, 1.5vw, 8px) clamp(12px, 3vw, 16px)',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: 'clamp(0.7rem, 2.5vw, 0.875rem)',
                    fontWeight: '600',
                    cursor: (isLoadingAudio || !currentVerses || currentVerses.length === 0) ? 'not-allowed' : 'pointer',
                    opacity: (isLoadingAudio || !currentVerses || currentVerses.length === 0) ? 0.6 : 1
                  }}
                >
                  {playbackMode === 'full' || isPlayingContinuous ? '⏹ Stop' : '▶ Play Full Surah'}
                </button>
  
                {/* Auto-scroll Toggle */}
                <button
                  onClick={() => {
                    if (autoScrollPaused) {
                      setAutoScrollPaused(false);
                    } else {
                      setAutoScrollEnabled(!autoScrollEnabled);
                      if (!autoScrollEnabled) {
                        setAutoScrollPaused(false);
                      }
                    }
                  }}
                  style={{
                    backgroundColor: (autoScrollEnabled && !autoScrollPaused) ? '#8b5cf6' : '#f3f4f6',
                    color: (autoScrollEnabled && !autoScrollPaused) ? 'white' : '#6b7280',
                    padding: 'clamp(4px, 1vw, 6px) clamp(8px, 2vw, 12px)',
                    borderRadius: '6px',
                    border: '1px solid ' + ((autoScrollEnabled && !autoScrollPaused) ? '#8b5cf6' : '#d1d5db'),
                    fontSize: 'clamp(0.6rem, 2vw, 0.75rem)',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title={
                    autoScrollPaused ? "Auto-scroll paused (click to resume)" :
                    autoScrollEnabled ? "Auto-scroll ON (click to disable)" : 
                    "Auto-scroll OFF (click to enable)"
                  }
                >
                  <span>📜</span>
                  <span style={{ fontSize: 'clamp(0.5rem, 1.8vw, 0.65rem)' }}>
                    {autoScrollPaused ? 'Paused' : autoScrollEnabled ? 'ON' : 'OFF'}
                  </span>
                </button>
                
                {/* Progress Display */}
                {playbackMode === 'full' && playbackQueue.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(4px, 1vw, 6px)', flexWrap: 'wrap' }}>
                    <span style={{ 
                      fontSize: 'clamp(0.6rem, 2vw, 0.75rem)', 
                      color: '#059669',
                      backgroundColor: '#f0fdf4',
                      padding: 'clamp(2px, 0.5vw, 4px) clamp(4px, 1vw, 8px)',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span style={{ 
                        width: '6px', 
                        height: '6px', 
                        backgroundColor: '#059669', 
                        borderRadius: '50%',
                        animation: 'pulse 1.5s infinite'
                      }}></span>
                      Verse {currentPlayingVerse}
                    </span>
                    <span style={{ 
                      fontSize: 'clamp(0.5rem, 1.8vw, 0.6875rem)', 
                      color: '#6b7280',
                      backgroundColor: '#f3f4f6',
                      padding: 'clamp(1px, 0.3vw, 2px) clamp(3px, 0.8vw, 6px)',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap'
                    }}>
                      {currentQueueIndex + 1} / {playbackQueue.length}
                    </span>
                  </div>
                )}
                
                {/* Pause/Resume Button */}
                {playbackMode === 'full' && currentAudio && (
                  <button
                    onClick={() => {
                      if (currentAudio.paused) {
                        currentAudio.play();
                        setQuranMessage(`🔊 Resumed verse ${currentPlayingVerse}`);
                      } else {
                        currentAudio.pause();
                        setQuranMessage(`⏸ Paused verse ${currentPlayingVerse}`);
                      }
                    }}
                    style={{
                      backgroundColor: '#f59e0b',
                      color: 'white',
                      padding: 'clamp(4px, 1vw, 6px) clamp(8px, 2vw, 12px)',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: 'clamp(0.6rem, 2vw, 0.75rem)',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {currentAudio.paused ? '▶ Resume' : '⏸ Pause'}
                  </button>
                )}
              </div>
  
              {/* Auto-scroll Status Indicator */}
              {autoScrollPaused && playbackMode === 'full' && (
                <div style={{
                  marginTop: '8px',
                  fontSize: 'clamp(0.6rem, 1.8vw, 0.7rem)',
                  color: '#d97706',
                  backgroundColor: '#fef3c7',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  display: 'inline-block'
                }}>
                  📜 Auto-scroll paused - Click toggle to resume
                </div>
              )}
            </div>
          </div>
        </div>
  
        {/* Bismillah (except for Surah 9) */}
        {selectedSurahNumber !== 9 && selectedSurahNumber !== 1 && (
          <div style={{ 
            textAlign: 'center',
            padding: 'clamp(20px, 4vw, 30px)',
            fontSize: 'clamp(1.2rem, 4vw, 1.5rem)',
            fontFamily: 'Arial, sans-serif',
            direction: 'rtl',
            color: '#8b5cf6',
            borderBottom: '1px solid #f3f4f6'
          }}>
            بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
          </div>
        )}
  
        {/* SCROLLABLE VERSES CONTAINER */}
        <div 
          ref={quranContainerRef}
          style={{ 
            padding: 'clamp(20px, 4vw, 30px)',
            maxWidth: '900px',
            margin: '0 auto',
            backgroundColor: '#fdfdfd',
            maxHeight: 'calc(100vh - 200px)', // Allow scrolling
            overflowY: 'auto',
            scrollBehavior: 'smooth'
          }}
        >
          {currentVerses.map((verse, index) => (
            <div 
              key={`verse-${verse.verse_number}`} 
              data-verse={verse.verse_number} // Important: for auto-scroll targeting
              style={{
                marginBottom: 'clamp(8px, 1.5vw, 12px)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'clamp(8px, 1.5vw, 12px)',
                direction: 'rtl',
                // Enhanced highlight for currently playing verse
                backgroundColor: currentPlayingVerse === verse.verse_number ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                padding: currentPlayingVerse === verse.verse_number ? 'clamp(6px, 1.5vw, 8px)' : '0',
                borderRadius: currentPlayingVerse === verse.verse_number ? '6px' : '0',
                border: currentPlayingVerse === verse.verse_number ? '2px solid rgba(139, 92, 246, 0.3)' : '2px solid transparent',
                transition: 'all 0.4s ease',
                transform: currentPlayingVerse === verse.verse_number ? 'scale(1.02)' : 'scale(1)'
              }}
            >
              
              {/* Verse Number - Enhanced for playing state */}
              <span
                style={{
                  display: 'inline-block',
                  minWidth: 'clamp(20px, 3vw, 24px)',
                  height: 'clamp(20px, 3vw, 24px)',
                  backgroundColor: currentPlayingVerse === verse.verse_number ? '#8b5cf6' : '#f3f4f6',
                  color: currentPlayingVerse === verse.verse_number ? 'white' : '#6b7280',
                  borderRadius: '50%',
                  textAlign: 'center',
                  lineHeight: 'clamp(20px, 3vw, 24px)',
                  fontSize: 'clamp(0.6rem, 1.8vw, 0.75rem)',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  border: '1px solid ' + (currentPlayingVerse === verse.verse_number ? '#8b5cf6' : '#d1d5db'),
                  flexShrink: 0,
                  marginTop: '2px',
                  boxShadow: currentPlayingVerse === verse.verse_number ? '0 0 0 3px rgba(139, 92, 246, 0.2)' : 'none'
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
  
              {/* Verse Text Container */}
              <div style={{ flex: '1', minWidth: 0 }}>
                
                {/* Arabic Text */}
                <div style={{ 
                  fontSize: 'clamp(1.1rem, 3vw, 1.8rem)', 
                  lineHeight: '1.5',
                  direction: 'rtl',
                  fontFamily: 'Arial, sans-serif',
                  textAlign: 'right',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  wordBreak: 'break-word',
                  hyphens: 'auto',
                  maxWidth: '100%'
                }}>
                  {verse.text_arabic ? (
                    verse.text_arabic.split(' ').map((word, wordIndex) => (
                      <span
                        key={`word-${verse.verse_number}-${wordIndex}`}
                        style={{
                          cursor: 'pointer',
                          padding: '1px 2px',
                          borderRadius: '2px',
                          display: 'inline',
                          margin: '0 1px',
                          transition: 'background-color 0.15s ease'
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
                    <span style={{ color: '#dc2626', fontSize: 'clamp(0.8rem, 2.5vw, 1rem)' }}>
                      [Verse {verse.verse_number} - text unavailable]
                    </span>
                  )}
                </div>
                
                {/* Translation (if enabled) */}
                {quranSettings.show_translation && (
                  <div style={{
                    fontSize: 'clamp(0.75rem, 2.2vw, 0.9rem)',
                    color: '#374151',
                    fontStyle: 'italic',
                    lineHeight: '1.4',
                    textAlign: 'left',
                    direction: 'ltr',
                    marginTop: 'clamp(4px, 1vw, 6px)',
                    padding: 'clamp(6px, 1.5vw, 8px) clamp(8px, 2vw, 10px)',
                    backgroundColor: '#f8fffe',
                    border: '1px solid #e6fffa',
                    borderRadius: '4px',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word'
                  }}>
                    <span style={{ 
                      fontSize: 'clamp(0.5rem, 1.5vw, 0.6rem)', 
                      fontWeight: '600', 
                      color: '#047857',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px'
                    }}>
                      {verse.verse_number}:
                    </span>{' '}
                    {verse.text_translation || 'Translation loading...'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
  
        {/* Mushaf Footer */}
        <div style={{ 
          backgroundColor: '#f0fdf4', 
          borderRadius: '0 0 8px 8px', 
          padding: 'clamp(12px, 2.5vw, 16px) clamp(15px, 3vw, 30px)',
          borderTop: '1px solid #d1fae5'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'clamp(8px, 2vw, 12px)'
          }}>
            <div style={{ 
              fontSize: 'clamp(0.6rem, 2vw, 0.75rem)', 
              color: '#065f46',
              flex: '1',
              minWidth: '200px'
            }}>
              <strong>💡 How to Use:</strong> Double-click Arabic words to add to flashcards • Click verse numbers to play audio • Auto-scroll follows playback
            </div>
            <div style={{ 
              fontSize: 'clamp(0.6rem, 2vw, 0.75rem)', 
              color: '#065f46',
              whiteSpace: 'nowrap'
            }}>
              📄 Mushaf view • {currentVerses.length} verses
            </div>
          </div>
        </div>
  
        {/* Add CSS animation for pulse effect */}
        <style jsx>{`
          @keyframes blink {
            0%, 50% { border-color: #8b5cf6; }
            51%, 100% { border-color: transparent; }
          }
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
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
            <ProfileDropdown 
                  user={user}
                  onLogout={handleLogout}
                  onGoToSettings={handleGoToSettings}
                  onOpenProfile={handleOpenProfile}
                />
            </div>

          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginTop: '16px' }}>
            {[
              { id: 'my-cards', label: 'My Cards' },
              { id: 'watch', label: 'Watch Videos' },
              { id: 'read', label: 'Read Books' },
              { id: 'community', label: 'Community' },
              { id: 'leaderboard', label: 'Leaderboard' },
              
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
         {/* Video Player Component */}
         {activeTab === 'watch' && (
            <VideoPlayer
              user={user}
              currentDeck={currentDeck}
              onCardAdded={setCardMessage}
              onDeckCreated={(deck) => {
                setCurrentDeck(deck);
                if (!userDecks.find(d => d.id === deck.id)) {
                  setUserDecks(prev => [...prev, deck]);
                }
              }}
              userSettings={userSettings}
              onSettingsUpdate={setUserSettings}
              isTabVisible={activeTab === 'watch'}
            />
          )}
        
        {/* Regular Tab Content */}
        <div style={{ display: activeTab === 'watch' ? 'none' : 'block' }}>
          {renderTabContent()}
        </div>
        
        {renderCardModal()}
        {renderImmersionTimerWidget()}
        {renderProfileModal()} 
        
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
