'use client'; // Tell Next.js this code runs in the user's web browser, not on the server computer
import React, { useState, useEffect, useRef } from 'react'; // Get React library and tools for remembering information, running effects, and referencing DOM elements
import { 
  addCardToDeck, // Function to save new flashcard to user's deck
  getYouTubeTranslationCache, // Check if we already have translation for this word
  saveYouTubeTranslationCache, // Save new translation to database for future users
  saveVideoState, // Remember where user paused the video
  getVideoState, // Load where user previously paused
  clearVideoState, // Delete saved video position
  updateUserSettings // Save user preferences like autoplay
} from '@/lib/database'; // Import database functions from our database file

// Define what information this component needs from its parent
interface VideoPlayerProps {
  user: any; // User account information (email, id, etc.)
  currentDeck: any; // The flashcard deck we're adding words to
  decks: any[]; // All of the user's flashcard decks
  cardMessage: string; // Success/error message to show user
  setCardMessage: (message: string) => void; // Function to update the message shown to user
  userSettings: any; // User preferences like autoplay enabled/disabled
  setUserSettings: (settings: any) => void; // Function to update user preferences
  immersionSession: any; // Time tracking data for study sessions
  startImmersionSession: () => void; // Function to start tracking study time
  stopImmersionSession: () => void; // Function to stop tracking study time
  onCreateOrGetDeck: (title: string, videoId: string) => void; // Function to create flashcard deck for this video
  onLoadUserDecks: () => void; // Function to refresh the list of user's decks
  onPlayerStateChange: (isPlaying: boolean, videoId: string, videoTitle: string) => void;
  onPlayerReady: (player: any) => void;
}

// Helper function to remove Arabic diacritics (vowel marks) from words
const cleanArabicWord = (word: string): string => {
  if (!word) return ''; // If no word provided, return empty string
  // Remove all Arabic diacritics (harakat) using Unicode ranges
  return word.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '').trim(); // Strip vowel marks and extra spaces
};

// Helper function to convert seconds into readable time format like "2:35"
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60); // Calculate how many complete minutes
  const secs = Math.floor(seconds % 60); // Calculate remaining seconds after removing complete minutes
  return `${mins}:${secs.toString().padStart(2, '0')}`; // Format as "minutes:seconds" with leading zero if needed
};

// Helper function to extract YouTube video ID from various URL formats
const extractVideoId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/; // Pattern to find video ID in YouTube URLs
  const match = url.match(regExp); // Try to find the pattern in the provided URL
  return (match && match[2].length === 11) ? match[2] : null; // Return video ID if found and valid length, otherwise null
};

// Helper function to format context text for flashcard creation
const createMCDContext = (context: string, targetWord: string): string => {
  if (!context || !targetWord) return context; // If missing context or word, return original
  
  let cleanedContext = context; // Start with original context
  
  // Step 1: Remove video metadata prefixes like "Video: [title] - Context: "
  cleanedContext = cleanedContext.replace(/^Video:\s*.*?\s*-?\s*Context:\s*/i, '');
  
  // Step 2: Remove any remaining English metadata patterns
  cleanedContext = cleanedContext.replace(/^[A-Za-z]+:\s*[^-]*-\s*/g, '');
  
  // Step 3: Clean up extra whitespace
  cleanedContext = cleanedContext.trim();
  
  // Step 4: Replace the target word with [...] placeholder for flashcard study
  const cleanTarget = cleanArabicWord(targetWord).trim(); // Clean the word we want to replace
  if (!cleanTarget) return cleanedContext; // If no clean word, return context as-is
  
  // Create pattern to find the word in context
  const escapedWord = cleanTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special characters for regex
  const pattern = new RegExp(`\\b${escapedWord}\\b`, 'gi'); // Create case-insensitive word boundary pattern
  
  let result = cleanedContext.replace(pattern, ' [...] '); // Replace word with blank placeholder
  
  // Clean up extra spaces around the placeholder
  result = result.replace(/\s+\[\.\.\.\]\s+/g, ' [...] '); // Normalize spacing around placeholder
  result = result.replace(/^\s+|\s+$/g, ''); // Remove leading and trailing spaces
  
  return result; // Return formatted context for flashcard
};

export function VideoPlayer({ 
  user, 
  currentDeck, 
  decks, 
  cardMessage, 
  setCardMessage, 
  userSettings, 
  setUserSettings,
  immersionSession,
  startImmersionSession,
  stopImmersionSession,
  onCreateOrGetDeck,
  onLoadUserDecks
}: VideoPlayerProps) {
  
  // VIDEO PLAYER STATE - Remember information about the video and player
  const [player, setPlayer] = useState<any>(null); // The YouTube player object that controls video playback
  const [isPlaying, setIsPlaying] = useState(false); // Whether video is currently playing (true) or paused (false)
  const [currentTime, setCurrentTime] = useState(0); // Current playback position in seconds
  const [duration, setDuration] = useState(0); // Total length of video in seconds
  const [videoUrl, setVideoUrl] = useState(''); // The YouTube URL that user typed in
  const [currentVideoId, setCurrentVideoId] = useState(''); // The extracted video ID from YouTube URL
  const [currentVideoTitle, setCurrentVideoTitle] = useState(''); // The title of the currently loaded video
  
  // TRANSCRIPT STATE - Remember information about video captions/subtitles
  const [transcript, setTranscript] = useState<any[]>([]); // Array of caption segments with text and timing
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false); // Whether we're currently downloading captions
  const [transcriptError, setTranscriptError] = useState(''); // Any error message from failed caption loading
  
  // BACKGROUND VIDEO STATE - Remember information about video playing in other tabs
  const [isVideoPlayingBackground, setIsVideoPlayingBackground] = useState(false); // Whether video continues when user switches tabs
  const [backgroundVideoInfo, setBackgroundVideoInfo] = useState<any>(null); // Information about video playing in background
  const [showBackgroundControls, setShowBackgroundControls] = useState(false); // Whether to show mini player controls
  const [backgroundVideoError, setBackgroundVideoError] = useState(''); // Any error from background video functionality
  const [savedVideoState, setSavedVideoState] = useState<any>(null); // Previously saved video position and URL
  const [videoTimestampInterval, setVideoTimestampInterval] = useState<any>(null); // Timer that saves video position every few seconds
  
  // HARAKAT PROCESSING STATE - Remember information about adding Arabic vowel marks
  const [harakatCache, setHarakatCache] = useState<Map<string, string>>(new Map()); // Cache of words we've already processed for vowel marks
  const [isProcessingHarakat, setIsProcessingHarakat] = useState(false); // Whether we're currently adding vowel marks to transcript
  
  // REFS - Direct references to HTML elements for manipulation
  const playerRef = useRef<HTMLDivElement>(null); // Reference to the div where YouTube player will be embedded
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // Reference to timer that updates current time display
  const transcriptRef = useRef<HTMLDivElement>(null); // Reference to scrollable transcript container
  const currentWordRef = useRef<HTMLSpanElement>(null); // Reference to currently highlighted word in transcript
  
  // LOAD USER'S SAVED VIDEO SETTINGS when component first appears
  useEffect(() => {
    if (!user?.id) return; // If no user logged in, don't try to load settings
    loadUserVideoSettings(); // Call function to get user's saved video preferences
  }, [user]); // Run this effect whenever user changes (login/logout)
  
  // INITIALIZE YOUTUBE PLAYER when we have a video ID
  useEffect(() => {
    if (currentVideoId && window.YT) { // If we have video ID and YouTube API is loaded
      setTimeout(() => initializePlayer(), 500); // Wait half second then create the video player
    }
  }, [currentVideoId]); // Run this effect whenever video ID changes
  
  // CLEANUP when component is removed from page
  useEffect(() => {
    return () => { // This function runs when component is destroyed
      if (intervalRef.current) clearInterval(intervalRef.current); // Stop the time update timer
      if (videoTimestampInterval) clearInterval(videoTimestampInterval); // Stop the position saving timer
    };
  }, []); // Run cleanup only once when component unmounts
  
  // Function to load user's video-related settings from database
  const loadUserVideoSettings = async (): Promise<void> => {
    if (!user?.id) return; // If no user, can't load settings
    
    try {
      // Get saved video state (last watched video and position)
      const { data: videoState } = await getVideoState(user.id); // Ask database for user's last video state
      if (videoState && videoState.url) { // If user has a saved video
        setSavedVideoState({ // Remember the saved video information
          url: videoState.url, // The YouTube URL they were watching
          timestamp: videoState.timestamp || 0 // Where they paused (or start from beginning)
        });
        setVideoUrl(videoState.url); // Put the saved URL in the input field
        setCurrentVideoId(extractVideoId(videoState.url) || ''); // Extract and remember the video ID
      }
    } catch (error) {
      console.error('Error loading video settings:', error); // Log any errors to browser console
    }
  };
  
  // Function to save current video position to database
  const saveCurrentVideoState = async (): Promise<void> => {
    if (!user?.id || !currentVideoId || !player) return; // Need user, video, and player to save
    
    try {
      const currentTime = player.getCurrentTime(); // Get current playback position from YouTube player
      await saveVideoState(user.id, videoUrl, currentTime); // Save user ID, video URL, and position to database
      console.log('✅ Video state saved:', { videoUrl, currentTime }); // Log success to browser console
    } catch (error) {
      console.error('❌ Failed to save video state:', error); // Log any save errors
    }
  };
  
  // Function to remove saved video and reset everything
  const clearCurrentVideoState = async (): Promise<void> => {
    if (!user?.id) return; // Need user to clear their saved state
    
    try {
      await stopImmersionSession(); // Stop tracking study time before clearing video
      
      await clearVideoState(user.id); // Remove saved video state from database
      setSavedVideoState(null); // Clear saved state from memory
      setVideoUrl(''); // Clear URL input field
      setCurrentVideoId(''); // Clear remembered video ID
      setCurrentVideoTitle(''); // Clear video title
      setTranscript([]); // Clear transcript array
      
      if (player) { // If video player exists
        player.stopVideo(); // Stop the video playback
      }
      
      setCardMessage('✅ Video cleared successfully'); // Show success message to user
      setTimeout(() => setCardMessage(''), 3000); // Hide message after 3 seconds
    } catch (error) {
      console.error('❌ Failed to clear video state:', error); // Log any errors
      setCardMessage('❌ Failed to clear video'); // Show error message to user
      setTimeout(() => setCardMessage(''), 3000); // Hide error message after 3 seconds
    }
  };
  
  // Function to load YouTube API if not already loaded
  const loadYouTubeAPI = (): void => {
    console.log('🔄 Loading YouTube API...'); // Log that we're starting to load the API
    if (!window.YT) { // If YouTube API not already loaded
      const script = document.createElement('script'); // Create a new script tag
      script.src = 'https://www.youtube.com/iframe_api'; // Set source to YouTube's API
      script.async = true; // Load script without blocking page
      document.body.appendChild(script); // Add script to page
      window.onYouTubeIframeAPIReady = () => { // Function that runs when API finishes loading
        console.log('✅ YouTube API loaded and ready!'); // Log success
      };
    } else {
      console.log('✅ YouTube API already loaded'); // API was already available
    }
  };
  
  // Function to create and configure the YouTube video player
  const initializePlayer = (): void => {
    console.log('🎯 initializePlayer called'); // Log that we're starting player creation
    
    if (!window.YT || !playerRef.current || !currentVideoId) { // Check if we have everything needed
      console.log('❌ Missing requirements for player initialization'); // Log what's missing
      return; // Stop if requirements not met
    }
    
    try {
      if (player) { // If player already exists
        if (!isVideoPlayingBackground || (backgroundVideoInfo && backgroundVideoInfo.videoId !== currentVideoId)) {
          console.log('🔄 Destroying existing player'); // Log that we're removing old player
          player.destroy(); // Remove the old YouTube player
          setPlayer(null); // Clear player from memory
        } else {
          console.log('🎵 Keeping existing player for background mode'); // Keep player if same video in background
          return; // Don't create new player
        }
      }
      
      console.log('🔄 Creating new YouTube player...'); // Log player creation
      const newPlayer = new window.YT.Player(playerRef.current, { // Create new YouTube player
        height: '100%', // Make player fill container height
        width: '100%', // Make player fill container width
        videoId: currentVideoId, // Set which video to load
        playerVars: { // Configure player options
          autoplay: 0, // Don't start playing automatically
          controls: 1, // Show play/pause/volume controls
          disablekb: 0, // Allow keyboard shortcuts
          enablejsapi: 1, // Enable JavaScript control
          fs: 1, // Allow fullscreen
          rel: 0, // Don't show related videos at end
          modestbranding: 1 // Minimize YouTube branding
        },
        events: { // Set up event handlers
          onReady: (event) => { // Function that runs when player is ready
            console.log('✅ YouTube player ready!'); // Log success
            onPlayerReady(event); // Call our custom ready handler
          },
          onStateChange: onPlayerStateChange, // Function that runs when play/pause/etc changes
          onError: (error) => { // Function that runs if video fails to load
            console.error('❌ YouTube player error:', error.data); // Log the error
            setTranscriptError('Video failed to load'); // Show error to user
          }
        }
      });
      
      console.log('✅ Player created successfully'); // Log successful player creation
    } catch (error) {
      console.error('❌ Player initialization error:', error); // Log any creation errors
    }
  };
  
  // Function that runs when YouTube player is ready to use
  const onPlayerReady = (event: any): void => {
    try {
      console.log('🎬 onPlayerReady called'); // Log that player is ready
      const videoDuration = event.target.getDuration(); // Get total video length
      setDuration(videoDuration); // Remember video duration
      const videoData = event.target.getVideoData(); // Get video information
      
      console.log('📹 Video data:', videoData); // Log video information
      
      if (videoData && videoData.title) { // If we got video title
        setCurrentVideoTitle(videoData.title); // Remember the video title
        if (user?.id) { // If user is logged in
          console.log('🔄 About to create deck for video...'); // Log deck creation
          onCreateOrGetDeck(videoData.title, currentVideoId); // Create flashcard deck for this video
          console.log('✅ Deck creation called'); // Log completion
          
          // Restore video position if user was watching this video before
          if (savedVideoState && savedVideoState.timestamp > 0) {
            console.log('🔄 Restoring video timestamp:', savedVideoState.timestamp); // Log position restore
            setTimeout(() => { // Wait 1 second for player to fully load
              if (event.target && event.target.seekTo) { // If player supports seeking
                event.target.seekTo(savedVideoState.timestamp, true); // Jump to saved position
              }
            }, 1000);
          }
        } else {
          console.log('❌ No user ID - cannot create deck'); // Log if user not logged in
        }
      } else {
        console.log('❌ No video data or title'); // Log if video info missing
      }
      
      // Clear any existing update timer
      if (intervalRef.current) clearInterval(intervalRef.current);
      
      // Start timer to update current time display
      const updateTime = () => {
        if (event.target && event.target.getCurrentTime && event.target.getPlayerState() === window.YT.PlayerState.PLAYING) {
          setCurrentTime(event.target.getCurrentTime()); // Update current time if video is playing
        }
        intervalRef.current = requestAnimationFrame(updateTime); // Schedule next update
      };
      
      updateTime(); // Start the update loop
      setPlayer(event.target); // Remember the player object
      
      // Start timer to save video position every 3 seconds
      if (videoTimestampInterval) { // Clear any existing save timer
        clearInterval(videoTimestampInterval);
      }
      
      const interval = setInterval(() => { // Create new save timer
        if (event.target && event.target.getCurrentTime && user?.id && currentVideoId) {
          const currentTime = event.target.getCurrentTime(); // Get current position
          saveVideoState(user.id, videoUrl, currentTime); // Save to database
        }
      }, 3000); // Save every 3 seconds
      
      setVideoTimestampInterval(interval); // Remember the save timer
    } catch (error) {
      console.error('Error in onPlayerReady:', error); // Log any errors
    }
  };
  
  // Function that runs when video state changes (play, pause, etc.)
  const onPlayerStateChange = (event: any): void => {
    try {
      const isNowPlaying = event.data === window.YT.PlayerState.PLAYING; // Check if video started playing
      setIsPlaying(isNowPlaying); // Update playing state

      onPlayerStateChange(isNowPlaying, currentVideoId, currentVideoTitle);
  
      if (isNowPlaying) { // If video started playing
        if (!immersionSession.isActive) { // If not already tracking study time
          startImmersionSession(); // Start tracking time spent studying
        }
      } else if (event.data === window.YT.PlayerState.ENDED) { // If video finished
        stopImmersionSession(); // Stop tracking study time
      }
    } catch (error) {
      console.error('Error in onPlayerStateChange:', error); // Log any errors
    }
  };
  
  // Function to jump to specific time in video
  const seekTo = (seconds: number): void => {
    if (player && player.seekTo) { // If player supports seeking
      try {
        player.seekTo(seconds, true); // Jump to specified time
      } catch (error) {
        console.error('Error seeking:', error); // Log any seek errors
      }
    }
  };
  
  // Function to download video transcript/captions
  const fetchTranscript = async (videoId: string): Promise<void> => {
    if (!videoId) return; // Need video ID to fetch transcript
    setIsLoadingTranscript(true); // Show loading indicator
    setTranscriptError(''); // Clear any previous errors
    
    try {
      const response = await fetch(`/api/transcript?videoId=${videoId}`); // Request transcript from our API
      const data = await response.json(); // Parse response as JSON
      
      if (data.transcript && data.transcript.length > 0) { // If transcript was found
        setTranscript(data.transcript); // Save transcript segments
        setTranscriptError(''); // Clear error message
        
        // Create flashcard deck since video loaded successfully
        if (user?.id && currentVideoId) {
          console.log('🔄 Creating deck from transcript fetch...'); // Log deck creation
          await onCreateOrGetDeck(`Video ${videoId}`, videoId); // Create deck with video title
        }
        
      } else {
        setTranscriptError(''); // Clear error display
        setTranscript([]); // Clear transcript array
        setCardMessage('ℹ️ No transcript available for this video'); // Inform user
        setTimeout(() => setCardMessage(''), 5000); // Hide message after 5 seconds
      }
    } catch (error: any) {
      setTranscriptError(''); // Clear error display
      setTranscript([]); // Clear transcript array
      setCardMessage('ℹ️ No transcript available for this video'); // Inform user
      setTimeout(() => setCardMessage(''), 5000); // Hide message after 5 seconds
    } finally {
      setIsLoadingTranscript(false); // Hide loading indicator
    }
  };
  
  // Function to load a new video when user enters URL
  const loadNewVideo = async (): Promise<void> => {
    const videoId = extractVideoId(videoUrl); // Extract video ID from URL
    if (!videoId) { // If URL is invalid
      setTranscriptError('Please enter a valid YouTube URL'); // Show error to user
      return; // Stop processing
    }
    if (videoId === currentVideoId) return; // If same video, don't reload

    console.log('🎬 Loading new video:', videoId); // Log video loading

    // Reset all video-related state
    setCurrentVideoId(''); // Clear current video ID
    setCurrentVideoTitle(''); // Clear video title
    setTranscript([]); // Clear transcript
    setTranscriptError(''); // Clear errors
    setCurrentTime(0); // Reset playback position
    setDuration(0); // Reset duration
    setIsPlaying(false); // Reset playing state
    
    if (player) { // If player exists
      try {
        player.destroy(); // Remove old player
      } catch (e) {
        console.log('Error destroying player:', e); // Log any destruction errors
      }
      setPlayer(null); // Clear player from memory
    }
    
    console.log('🔄 Setting video ID:', videoId); // Log ID setting
    setCurrentVideoId(videoId); // Set new video ID (this triggers player creation)
    
    console.log('🔄 Fetching transcript...'); // Log transcript fetching
    await fetchTranscript(videoId); // Download video captions
    
    console.log('✅ Video loading complete'); // Log completion
  };
  
  // Function to process transcript into individual words with timestamps
  const processTranscriptWords = (transcript: any[]): any[] => {
    const words: any[] = []; // Array to store individual word objects
    transcript.forEach((segment) => { // Loop through each caption segment
      const segmentWords = segment.text.split(/\s+/).filter((word: string) => word.trim()); // Split segment into words
      const segmentDuration = segment.duration || 2; // How long this segment plays (default 2 seconds)
      const timePerWord = segmentDuration / segmentWords.length; // Calculate time each word is displayed
      
      segmentWords.forEach((word: string, index: number) => { // Loop through words in segment
        words.push({ // Add word object to array
          text: word, // The actual word text
          timestamp: segment.start + (index * timePerWord), // When this word appears
          segmentStart: segment.start, // When the whole segment starts
          segmentText: segment.text, // Full text of the segment
          segmentIndex: transcript.indexOf(segment) // Which segment this word belongs to
        });
      });
    });
    return words; // Return array of word objects
  };
  
  // Function to add Arabic vowel marks (harakat) to text
  const addHarakat = async (text: string): Promise<string> => {
    if (harakatCache.has(text)) { // If we already processed this text
      return harakatCache.get(text) || text; // Return cached result
    }
    
    try {
      const response = await fetch('/api/harakat', { // Call our vowel mark API
        method: 'POST', // Send data to server
        headers: { 
          'Content-Type': 'application/json', // Tell server we're sending JSON
        },
        body: JSON.stringify({ text }) // Send the text to process
      });
      
      if (response.ok) { // If API call succeeded
        const data = await response.json(); // Parse response
        const harakatText = data.result || text; // Get processed text or fallback to original
        setHarakatCache(prev => new Map(prev.set(text, harakatText))); // Cache the result
        return harakatText; // Return processed text
      } else {
        console.log('Harakat API error:', response.status); // Log API error
        setHarakatCache(prev => new Map(prev.set(text, text))); // Cache original text to avoid retrying
        return text; // Return original text
      }
    } catch (error) {
      console.log('Harakat service error:', error); // Log service error
      setHarakatCache(prev => new Map(prev.set(text, text))); // Cache original to avoid retrying
      return text; // Return original text
    }
  };
  
  // Function to add vowel marks to entire transcript
  const processHarakatForTranscript = async (): Promise<void> => {
    if (!transcript.length || isProcessingHarakat) return; // Don't process if no transcript or already processing
    
    setIsProcessingHarakat(true); // Show processing indicator
    setCardMessage('🔄 Adding harakat...'); // Show progress message
    
    try {
      const processedTranscript = []; // Array for processed segments
      for (const segment of transcript) { // Loop through each segment
        const harakatText = await addHarakat(segment.text); // Add vowel marks to segment text
        processedTranscript.push({ ...segment, text: harakatText }); // Add processed segment to array
        await new Promise(resolve => setTimeout(resolve, 50)); // Wait 50ms between segments to avoid overwhelming API
      }
      
      setTranscript(processedTranscript); // Replace transcript with processed version
      setCardMessage('✅ Harakat added!'); // Show success message
    } catch (error) {
      console.error('Harakat processing error:', error); // Log any errors
      setCardMessage('❌ Failed to add harakat'); // Show error message
    } finally {
      setIsProcessingHarakat(false); // Hide processing indicator
      setTimeout(() => setCardMessage(''), 3000); // Hide message after 3 seconds
    }
  };
  
  // Function to find which transcript segment is currently playing
  const getCurrentSegment = (): any => {
    const adjustedTime = currentTime + 1.0; // Adjust timing to sync better with audio
    
    for (let i = 0; i < transcript.length; i++) { // Loop through transcript segments
      const segment = transcript[i]; // Get current segment
      const segmentStart = segment.start; // When segment starts
      const segmentEnd = segment.start + (segment.duration || 2); // When segment ends
      if (adjustedTime >= segmentStart && adjustedTime < segmentEnd) { // If current time is within segment
        return { segment, index: i }; // Return segment and its position
      }
    }
    
    // Fallback: find segment just before current time
    for (let i = 0; i < transcript.length; i++) {
      if (transcript[i].start > adjustedTime) { // If segment starts after current time
        return i > 0 ? { segment: transcript[i-1], index: i-1 } : null; // Return previous segment
      }
    }
    return null; // No segment found
  };

  // Function to get the next transcript segment
  const getNextSegment = (): any => {
    const currentData = getCurrentSegment(); // Get current segment data
    if (currentData && currentData.index + 1 < transcript.length) { // If there's a next segment
      return { segment: transcript[currentData.index + 1], index: currentData.index + 1 }; // Return next segment
    }
    return null; // No next segment
  };
  
  // Function to handle clicking on individual words in transcript
  const handleIndividualWordClick = (word: any, timestamp: number): void => {
    seekTo(word.segmentStart); // Jump video to when this word's segment starts
  };
  
  // Function to handle double-clicking words to create flashcards
  const handleWordDoubleClick = async (word: any): Promise<void> => {
    if (!user?.id) { // If user not logged in
      setCardMessage('❌ Not logged in'); // Show error
      setTimeout(() => setCardMessage(''), 3000); // Hide error after 3 seconds
      return; // Stop processing
    }
    if (!currentDeck?.id) { // If no flashcard deck available
      setCardMessage('❌ No deck loaded'); // Show error
      setTimeout(() => setCardMessage(''), 3000); // Hide error after 3 seconds
      return; // Stop processing
    }
  
    const cleanWord = cleanArabicWord(word.text); // Remove vowel marks from word
    if (!cleanWord) { // If no Arabic text found
      setCardMessage('❌ No Arabic text in this word'); // Show error
      setTimeout(() => setCardMessage(''), 3000); // Hide error after 3 seconds
      return; // Stop processing
    }
  
    // Create enhanced context with video title
    const enhancedContext = `Video: ${currentVideoTitle || 'Educational Content'} - Context: ${word.segmentText || cleanWord}`;
    
    setCardMessage('🔄 Checking cache for enhanced analysis...'); // Show progress
  
    try {
      // Check if we already have translation for this word
      const cachedTranslation = await getYouTubeTranslationCache(
        cleanWord, // The word we're looking up
        currentVideoId, // Which video this word came from
        word.segmentStart // When in the video this word appears
      );
  
      let translationData = null; // Variable to store translation information
  
      if (cachedTranslation) { // If translation already exists in database
        setCardMessage('✅ Found cached translation, creating your card...'); // Show progress
        translationData = cachedTranslation; // Use existing translation
        console.log('🎯 Using cached YouTube translation:', translationData); // Log cache hit
      } else {
        setCardMessage('🔄 Creating new enhanced Arabic analysis...'); // Show progress
  
        // Call translation API to get word meaning
        translationData = await fetchEnhancedTranslation(
          cleanWord, // The Arabic word to translate
          enhancedContext, // Context from video with title
          'youtube', // Source type for translation system
          {
            videoTitle: currentVideoTitle, // Video title for context
            timestamp: word.timestamp // When word appears in video
          }
        );
        
        if (translationData) { // If translation API returned data
          setCardMessage('🔄 Enhanced analysis received, caching for future users...'); // Show progress
          console.log('✨ New enhanced YouTube translation:', translationData); // Log new translation
          
          // Save translation to database for other users
          await saveYouTubeTranslationCache(
            cleanWord, // The word we translated
            currentVideoId, // Which video it came from
            word.segmentStart, // When it appears in video
            translationData, // The translation data
            currentVideoTitle // Video title for reference
          );
          
          setCardMessage('🔄 Translation cached, saving your card...'); // Show progress
        } else {
          setCardMessage('🔄 Translation failed, saving card without enhanced data...'); // Show fallback
        }
      }
  
      // Save the flashcard with translation data
      const result = await addCardToDeck(
        currentDeck.id, // Which deck to add card to
        cleanWord, // The Arabic word
        enhancedContext, // Context sentence
        word.timestamp, // Video timestamp
        user.id, // User ID
        translationData // Translation data (or null)
      );
  
      if (result.error) { // If saving failed
        if (result.error.message?.includes('duplicate key')) { // If word already exists
          setCardMessage(`ℹ️ "${cleanWord}" already in your deck`); // Inform user
        } else {
          setCardMessage(`❌ Error: ${result.error.message}`); // Show error
        }
      } else { // If saving succeeded
        const message = translationData 
          ? `✅ Added "${cleanWord}" with enhanced analysis!` // Success with translation
          : `✅ Added "${cleanWord}" (analysis will be added later)`; // Success without translation
        setCardMessage(message); // Show success message
        await onLoadUserDecks(); // Refresh user's deck list
      }
    } catch (error: any) {
      setCardMessage(`❌ Failed: ${error.message}`); // Show error
    } finally {
      setTimeout(() => setCardMessage(''), 4000); // Hide message after 4 seconds
    }
  };
  
  // Function to call enhanced translation API
  const fetchEnhancedTranslation = async (arabicWord: string, context: string, sourceType: string, sourceInfo: any): Promise<any> => {
    try {
      console.log('🔄 Fetching enhanced translation for:', arabicWord, 'Type:', sourceType); // Log translation request
      
      const response = await fetch('/api/translate', { // Call our translation API
        method: 'POST', // Send data to server
        headers: {
          'Content-Type': 'application/json', // Tell server we're sending JSON
        },
        body: JSON.stringify({ // Convert data to JSON string
          arabicWord: arabicWord, // Word to translate
          context: context, // Surrounding text
          sourceType: sourceType, // Where word came from (youtube/quran)
          sourceInfo: sourceInfo // Additional metadata
        })
      });
  
      if (!response.ok) { // If API call failed
        throw new Error(`Enhanced translation API failed: ${response.status}`); // Create error
      }
  
      const data = await response.json(); // Parse response as JSON
      
      if (data.success && data.translation) { // If translation succeeded
        console.log('✅ Enhanced translation received:', data.translation); // Log success
        return data.translation; // Return translation data
      } else {
        console.warn('⚠️ Enhanced translation API returned no data'); // Log warning
        return null; // Return null for no data
      }
    } catch (error) {
      console.error('❌ Enhanced translation fetch failed:', error); // Log error
      return null; // Return null for errors
    }
  };
  
  // Auto-scroll effect to keep current transcript word visible
  useEffect(() => {
    if (currentWordRef.current && transcriptRef.current) { // If we have references to current word and transcript container
      const wordElement = currentWordRef.current; // Get the highlighted word element
      const containerElement = transcriptRef.current; // Get the scrollable container
      
      const containerHeight = containerElement.clientHeight; // Height of visible scroll area
      const containerScrollTop = containerElement.scrollTop; // Current scroll position
      const wordOffsetTop = wordElement.offsetTop; // Position of word from container top
      
      const wordTop = wordOffsetTop - containerScrollTop; // Word position relative to visible area
      const wordBottom = wordTop + wordElement.offsetHeight; // Bottom edge of word
      
      const scrollBuffer = 20; // Pixels of buffer before scrolling
      const isAboveView = wordTop < scrollBuffer; // Word is above visible area
      const isBelowView = wordBottom > containerHeight - scrollBuffer; // Word is below visible area
      
      if (isAboveView || isBelowView) { // If word is outside comfortable viewing area
        const targetScrollTop = wordOffsetTop - (containerHeight / 2); // Calculate position to center word
        containerElement.scrollTo({ // Scroll to center the word
          top: Math.max(0, targetScrollTop), // Don't scroll above top
          behavior: 'smooth' // Use smooth scrolling animation
        });
      }
    }
  }, [currentTime, transcript]); // Run this effect when time or transcript changes
  
  // Load YouTube API when component mounts
  useEffect(() => {
    loadYouTubeAPI(); // Load YouTube iframe API
  }, []); // Run only once when component first appears
  
  // Get processed words from transcript for word-by-word display
  const transcriptWords = transcript.length > 0 && transcript.length < 1000 ? 
    processTranscriptWords(transcript) : []; // Only process if transcript exists and isn't too long
  
  // Function to render word-by-word transcript display
  const renderWordByWordTranscript = (): JSX.Element | null => {
    if (!transcriptWords.length) { // If no processed words available
      return renderSegmentBasedTranscript(); // Fall back to segment display
    }
    
    const currentSegmentData = getCurrentSegment(); // Get currently playing segment
    const nextSegmentData = currentSegmentData && currentSegmentData.index + 1 < transcript.length ? 
        { segment: transcript[currentSegmentData.index + 1], index: currentSegmentData.index + 1 } : null; // Get next segment
    
    return (
      <div style={{ 
        fontSize: '2.2rem', // Large text for readability
        lineHeight: '2.8', // Generous line spacing
        direction: 'rtl', // Right-to-left for Arabic text
        fontFamily: 'Arial, sans-serif', // Font that supports Arabic
        padding: '30px 30px 100px 30px', // Padding with extra bottom space
        textAlign: 'justify' // Justify text alignment
      }}>
        {transcriptWords.map((word, index) => { // Loop through each word
          const isInNextSegment = nextSegmentData && word.segmentIndex === nextSegmentData.index; // Is this word in the upcoming segment?
          const isPastSegment = currentSegmentData && word.segmentIndex <= currentSegmentData.index; // Is this word in a past segment?
          
          return (
            <span
              key={`${word.timestamp}-${index}`} // Unique key for React
              ref={isInNextSegment && index === transcriptWords.findIndex(w => w.segmentIndex === nextSegmentData.index) ? currentWordRef : null} // Set reference for auto-scroll
              style={{
                cursor: 'pointer', // Show clickable cursor
                backgroundColor: 'transparent', // No background by default
                color: isPastSegment ? '#9ca3af' : // Gray for past words
                       isInNextSegment ? '#8b5cf6' : // Purple for upcoming words
                       '#333', // Black for future words
                fontWeight: isInNextSegment ? '600' : '400', // Bold for upcoming
                transition: 'all 0.15s ease', // Smooth color transitions
                opacity: isPastSegment ? '0.7' : '1', // Fade past words
                padding: '1px 2px', // Small padding for hover effect
                borderRadius: '2px', // Rounded corners
                display: 'inline' // Keep words inline
              }}
              onMouseEnter={(e) => { // When mouse hovers over word
                if (!isInNextSegment) { // If not the highlighted word
                  e.currentTarget.style.backgroundColor = '#f8f9fa'; // Light gray background
                }
              }}
              onMouseLeave={(e) => { // When mouse leaves word
                if (!isInNextSegment) { // If not the highlighted word
                  e.currentTarget.style.backgroundColor = 'transparent'; // Remove background
                }
              }}
              onClick={() => handleIndividualWordClick(word, word.timestamp)} // Jump to word time when clicked
              onDoubleClick={(e) => { // When word is double-clicked
                e.preventDefault(); // Stop default double-click behavior
                e.stopPropagation(); // Stop event from bubbling up
                handleWordDoubleClick(word); // Create flashcard from word
              }}
              title={`"${word.text}" - Double-click to add to flashcards`} // Tooltip text
            >
              {word.text} {/* Display the word text */}
              {index < transcriptWords.length - 1 ? ' ' : ''} {/* Add space between words except after last word */}
            </span>
          );
        })}
      </div>
    );
  };
  
  // Function to render segment-based transcript (fallback)
  const renderSegmentBasedTranscript = (): JSX.Element | null => {
    if (!transcript.length) return null; // Return nothing if no transcript
    
    const currentData = getCurrentSegment(); // Get current segment
    const nextData = currentData && currentData.index + 1 < transcript.length ? 
      { segment: transcript[currentData.index + 1], index: currentData.index + 1 } : null; // Get next segment
    
    return (
      <div style={{ 
        fontSize: '2.2rem', // Large text size
        lineHeight: '2.8', // Generous line height
        direction: 'rtl', // Right-to-left text direction
        fontFamily: 'Arial, sans-serif', // Arabic-compatible font
        padding: '30px 30px 100px 30px', // Padding with extra bottom space
        textAlign: 'justify' // Justify text alignment
      }}>
        {transcript.map((segment, index) => { // Loop through transcript segments
          const isNextSegment = nextData && nextData.index === index; // Is this the next segment?
          const isPastSegment = currentData && index <= currentData.index; // Is this a past segment?
          const words = segment.text.split(/\s+/); // Split segment into words
          
          return (
            <span
              key={`${segment.start}-${index}`} // Unique key for React
              ref={isNextSegment ? currentWordRef : null} // Reference for auto-scroll
              style={{
                backgroundColor: 'transparent', // No background by default
                color: isPastSegment ? '#9ca3af' : // Gray for past segments
                       isNextSegment ? '#8b5cf6' : // Purple for next segment
                       '#333', // Black for future segments
                fontWeight: isNextSegment ? '600' : '400', // Bold for next segment
                transition: 'all 0.15s ease', // Smooth transitions
                opacity: isPastSegment ? '0.7' : '1', // Fade past segments
                padding: '0px', // No padding
                borderRadius: '0px', // No rounded corners
                display: 'inline', // Keep segments inline
                cursor: 'pointer' // Show clickable cursor
              }}
              onClick={() => seekTo(segment.start)} // Jump to segment start when clicked
            >
              {words.map((word, wordIndex) => ( // Loop through words in segment
                <span
                  key={`${word}-${wordIndex}`} // Unique key for each word
                  style={{ cursor: 'pointer' }} // Show clickable cursor
                  onDoubleClick={(e) => { // When word is double-clicked
                    e.preventDefault(); // Stop default behavior
                    e.stopPropagation(); // Stop event bubbling
                    const wordObj = { // Create word object
                      text: word, // Word text
                      timestamp: segment.start, // Segment start time
                      segmentText: segment.text, // Full segment text
                      segmentIndex: index // Segment position
                    };
                    handleWordDoubleClick(wordObj); // Create flashcard
                  }}
                >
                  {word} {/* Display word */}
                  {wordIndex < words.length - 1 ? ' ' : ''} {/* Add space between words */}
                </span>
              ))}
            </span>
          );
        })}
      </div>
    );
  };
  
  // Function to render background video controls
  const renderBackgroundVideoControls = (): JSX.Element | null => {
    if (!showBackgroundControls || !backgroundVideoInfo) return null; // Don't show if not needed
  
    return (
      <div style={{
        position: 'fixed', // Fixed position on screen
        bottom: '20px', // 20px from bottom
        right: '20px', // 20px from right
        backgroundColor: 'white', // White background
        padding: '12px 16px', // Internal padding
        borderRadius: '12px', // Rounded corners
        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)', // Drop shadow
        border: '2px solid #8b5cf6', // Purple border
        zIndex: 1000, // Appear above other content
        minWidth: '280px', // Minimum width
        maxWidth: '350px' // Maximum width
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#8b5cf6' }}>
            🎵 Playing in Background {/* Header text */}
          </div>
          <button
            onClick={() => { // When close button clicked
              if (player) { // If player exists
                player.pauseVideo(); // Pause the video
              }
              setShowBackgroundControls(false); // Hide controls
              setIsVideoPlayingBackground(false); // Stop background mode
              setBackgroundVideoInfo(null); // Clear background info
            }}
            style={{
              backgroundColor: 'transparent', // Transparent background
              border: 'none', // No border
              color: '#6b7280', // Gray text
              cursor: 'pointer', // Show pointer cursor
              fontSize: '16px', // Medium font size
              padding: '2px' // Small padding
            }}
            title="Stop background playback" // Tooltip
          >
            ✕ {/* Close icon */}
          </button>
        </div>
  
        {/* Video Info */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ 
            fontSize: '14px', // Medium font size
            fontWeight: '600', // Semi-bold
            color: '#374151', // Dark gray
            marginBottom: '4px', // Space below
            overflow: 'hidden', // Hide overflow
            textOverflow: 'ellipsis', // Show ... for long text
            whiteSpace: 'nowrap' // Don't wrap text
          }}>
            {backgroundVideoInfo.title || 'Video Playing'} {/* Video title or fallback */}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            {formatTime(backgroundVideoInfo.timestamp || 0)} {/* Current timestamp */}
          </div>
        </div>
  
        {/* Controls */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => { // When play/pause clicked
              if (player) { // If player exists
                if (isPlaying) { // If currently playing
                  player.pauseVideo(); // Pause video
                } else {
                  player.playVideo(); // Resume video
                }
              }
            }}
            style={{
              backgroundColor: '#8b5cf6', // Purple background
              color: 'white', // White text
              border: 'none', // No border
              borderRadius: '6px', // Rounded corners
              padding: '6px 12px', // Internal padding
              fontSize: '12px', // Small font
              fontWeight: '600', // Semi-bold
              cursor: 'pointer', // Show pointer
              flex: '1' // Take available space
            }}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'} {/* Show pause or play based on state */}
          </button>
        </div>
      </div>
    );
  };
  
  // Function to render background status indicator
  const renderBackgroundStatusIndicator = (): JSX.Element | null => {
    if (!isVideoPlayingBackground || !backgroundVideoInfo) return null; // Don't show if not in background mode
  
    return (
      <div style={{
        position: 'fixed', // Fixed position
        top: '80px', // 80px from top
        right: '20px', // 20px from right
        backgroundColor: '#8b5cf6', // Purple background
        color: 'white', // White text
        padding: '8px 12px', // Internal padding
        borderRadius: '20px', // Rounded pill shape
        fontSize: '12px', // Small font
        fontWeight: '600', // Semi-bold
        zIndex: 999, // High z-index
        display: 'flex', // Flex layout
        alignItems: 'center', // Center vertically
        gap: '6px', // Space between elements
        boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)', // Purple shadow
        cursor: 'pointer' // Show pointer cursor
      }}
      title="Click to return to video" // Tooltip
      >
        <div style={{
          width: '6px', // Small circle
          height: '6px', // Small circle
          backgroundColor: '#10b981', // Green color
          borderRadius: '50%', // Make it circular
          animation: 'pulse 1.5s infinite' // Pulsing animation
        }}></div>
        <span>🎵 Video Playing</span> {/* Status text */}
      </div>
    );
  };

  // Main render function - what the user sees
  return (
    <div>
      {/* Header with video info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0' }}>Watch Videos</h2> {/* Page title */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {currentDeck && ( // If flashcard deck exists
            <div style={{ 
              fontSize: '12px', 
              color: '#059669', 
              fontWeight: '500',
              backgroundColor: '#f0fdf4',
              padding: '4px 8px',
              borderRadius: '6px'
            }}>
              📚 {currentDeck.name} {/* Show deck name */}
            </div>
          )}
          {currentVideoTitle && ( // If video title exists
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
              {currentVideoTitle} {/* Show video title */}
            </div>
          )}
        </div>
      </div>
      
      {/* Video input and controls section */}
      <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text" // Text input field
            value={videoUrl} // Show current URL
            onChange={(e) => setVideoUrl(e.target.value)} // Update URL when user types
            placeholder="Paste YouTube URL here..." // Placeholder text
            style={{
              flex: '1', // Take most of the space
              padding: '8px 12px', // Internal padding
              border: '1px solid #e5e7eb', // Gray border
              borderRadius: '6px', // Rounded corners
              fontSize: '14px', // Medium font size
              outline: 'none' // Remove focus outline
            }}
          />
          <button
            onClick={loadNewVideo} // Load video when clicked
            disabled={isLoadingTranscript} // Disable while loading
            style={{
              backgroundColor: isLoadingTranscript ? '#9ca3af' : '#8b5cf6', // Gray when loading, purple when ready
              color: 'white', // White text
              padding: '8px 16px', // Internal padding
              borderRadius: '6px', // Rounded corners
              border: 'none', // No border
              fontWeight: '600', // Semi-bold text
              cursor: isLoadingTranscript ? 'not-allowed' : 'pointer', // Change cursor based on state
              fontSize: '14px' // Medium font size
            }}
          >
            {isLoadingTranscript ? 'Loading...' : 'Load'} {/* Show loading or load text */}
          </button>
          {currentVideoId && ( // If video is loaded
              <button
                onClick={clearCurrentVideoState} // Clear video when clicked
                style={{
                  backgroundColor: '#dc2626', // Red background
                  color: 'white', // White text
                  padding: '8px 12px', // Internal padding
                  borderRadius: '6px', // Rounded corners
                  border: 'none', // No border
                  fontWeight: '600', // Semi-bold
                  cursor: 'pointer', // Pointer cursor
                  fontSize: '12px' // Small font
                }}
              >
                🗑️ Clear {/* Clear button with trash icon */}
              </button>
            )}
          
          {transcript.length > 0 && ( // If transcript exists
            <button
              onClick={processHarakatForTranscript} // Add vowel marks when clicked
              disabled={isProcessingHarakat} // Disable while processing
              style={{
                backgroundColor: isProcessingHarakat ? '#9ca3af' : '#059669', // Gray when processing, green when ready
                color: 'white', // White text
                padding: '8px 12px', // Internal padding
                borderRadius: '6px', // Rounded corners
                border: 'none', // No border
                fontWeight: '600', // Semi-bold
                cursor: isProcessingHarakat ? 'not-allowed' : 'pointer', // Change cursor based on state
                fontSize: '12px', // Small font
                whiteSpace: 'nowrap' // Don't wrap text
              }}
              title="Add harakat (diacritics) to Arabic text" // Tooltip
            >
              {isProcessingHarakat ? '⏳' : 'ً◌'} Harakat {/* Show loading or harakat text */}
            </button>
          )}
          <label style={{
            display: 'flex', // Flex layout
            alignItems: 'center', // Center vertically
            gap: '6px', // Space between elements
            fontSize: '12px', // Small font
            fontWeight: '500', // Medium weight
            color: '#374151', // Dark gray
            cursor: 'pointer' // Pointer cursor
          }}>
            <input
              type="checkbox" // Checkbox input
              checked={userSettings.video_keep_playing_background} // Check based on user setting
              onChange={async (e) => { // When checkbox changes
                const newValue = e.target.checked; // Get new value
                setUserSettings(prev => ({ // Update user settings
                  ...prev, // Keep other settings
                  video_keep_playing_background: newValue // Update background play setting
                }));
                await updateUserSettings(user.id, { video_keep_playing_background: newValue }); // Save to database
              }}
              style={{ marginRight: '4px' }} // Small right margin
            />
            🎵 Keep playing in background {/* Checkbox label */}
          </label>
        </div>
        
        {cardMessage && ( // If there's a message to show
          <div style={{
            marginTop: '8px', // Space above message
            padding: '8px', // Internal padding
            backgroundColor: cardMessage.includes('✅') ? '#f0fdf4' : 
                            cardMessage.includes('⚠️') ? '#fffbeb' : '#fef2f2', // Green for success, yellow for warning, red for error
            color: cardMessage.includes('✅') ? '#059669' : 
                   cardMessage.includes('⚠️') ? '#d97706' : '#dc2626', // Matching text colors
            borderRadius: '4px', // Rounded corners
            fontSize: '12px', // Small font
            fontWeight: '500' // Medium weight
          }}>
            {cardMessage} {/* Display the message */}
          </div>
        )}
        
        {transcriptError && ( // If there's a transcript error
          <div style={{
            marginTop: '8px', // Space above error
            padding: '8px', // Internal padding
            backgroundColor: '#fef2f2', // Light red background
            color: '#dc2626', // Red text
            borderRadius: '4px', // Rounded corners
            fontSize: '12px' // Small font
          }}>
            ⚠️ {transcriptError} {/* Display error with warning icon */}
          </div>
        )}
      </div>
      
      {/* Main video player and transcript area */}
      {currentVideoId && ( // Only show if video is loaded
        <div style={{ display: 'flex', gap: '16px', height: 'calc(100vh - 200px)' }}>
          {/* Left side: Video player and deck info */}
          <div style={{ width: '30%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', height: 'auto' }}>
              {/* Video player container */}
              <div style={{ aspectRatio: '16/9', backgroundColor: '#000', borderRadius: '8px', marginBottom: '12px' }}>
                <div ref={playerRef} style={{ width: '100%', height: '100%', borderRadius: '8px' }}></div> {/* YouTube player will be embedded here */}
              </div>
  
              {/* Current deck info */}
              <div style={{ 
                backgroundColor: '#f9fafb', 
                borderRadius: '6px', 
                padding: '12px',
                marginBottom: '12px'
              }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  📚 Current Deck {/* Deck section title */}
                </h4>
                {currentDeck ? ( // If deck exists
                  <div>
                    <div style={{ fontSize: '12px', color: '#8b5cf6', fontWeight: '500', marginBottom: '6px' }}>
                      {currentDeck.name} {/* Deck name */}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>
                      Total cards: {currentDeck.totalCards || 0} {/* Number of cards in deck */}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                    Load a video to create a deck {/* Message when no deck */}
                  </div>
                )}
              </div>
  
              {/* Usage instructions */}
              <div style={{ 
                backgroundColor: '#f0fdf4', 
                borderRadius: '6px', 
                padding: '12px',
                border: '1px solid #d1fae5'
              }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#059669' }}>
                  💡 How to Use {/* Instructions title */}
                </h4>
                <ul style={{ margin: '0', paddingLeft: '16px', fontSize: '11px', color: '#065f46', lineHeight: '1.4' }}>
                  <li>Click words to jump to that time</li> {/* Usage instruction */}
                  <li><strong>Double-click Arabic words</strong> to add to flashcards</li> {/* Main feature instruction */}
                  <li>Next segment (coming up) is highlighted in purple</li> {/* Visual guide */}
                  <li>Past and current segments are grayed out</li> {/* Visual guide */}
                  <li>Future segments are black</li> {/* Visual guide */}
                  <li>Transcript auto-scrolls with playback</li> {/* Feature description */}
                </ul>
              </div>
            </div>
          </div>
  
          {/* Right side: Transcript display */}
          <div style={{ width: '70%' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div 
                ref={transcriptRef} // Reference for auto-scrolling
                style={{ 
                  flex: '1', // Take remaining space
                  overflowY: 'auto', // Allow vertical scrolling
                  maxHeight: 'calc(100vh - 220px)', // Maximum height
                  scrollPaddingBottom: '100px' // Extra padding at bottom
                }}
              >
                {transcript.length > 0 ? ( // If transcript exists
                  renderWordByWordTranscript() // Show interactive transcript
                ) : (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    height: '100%', 
                    color: '#6b7280',
                    flexDirection: 'column'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📺</div> {/* Large TV icon */}
                    <p>Load a video to see the interactive transcript</p> {/* Main message */}
                    <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginTop: '8px' }}>
                      Double-click Arabic words to add them to your flashcard deck {/* Feature description */}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Background video controls (shown when video plays in other tabs) */}
      {renderBackgroundVideoControls()}
      
      {/* Background status indicator (small indicator when video plays in background) */}
      {renderBackgroundStatusIndicator()}
    </div>
  );
}
