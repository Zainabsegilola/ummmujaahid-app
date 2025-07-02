// components/VideoPlayer.tsx

'use client'; // Tell Next.js this code runs in the user's web browser, not on the server computer
import React, { useState, useEffect, useRef } from 'react'; // Get React library and tools for remembering information, running effects, and referencing DOM elements

// Define what information this component needs from its parent
interface VideoPlayerProps {
  user: any; // User object containing account information
  currentDeck: any; // Currently selected deck for saving cards
  onCardAdded: (message: string) => void; // Function to call when card is successfully added
  onDeckCreated: (deck: any) => void; // Function to call when new deck is created
}

export function VideoPlayer({ user, currentDeck, onCardAdded, onDeckCreated }: VideoPlayerProps) {
  
  // VIDEO STATE VARIABLES - Track all video-related information
  const [player, setPlayer] = useState<any>(null); // Remember the YouTube player object that controls video playback
  const [isPlaying, setIsPlaying] = useState(false); // Remember whether video is currently playing (true=playing, false=paused)
  const [currentTime, setCurrentTime] = useState(0); // Remember current playback position in seconds
  const [duration, setDuration] = useState(0); // Remember total video length in seconds
  const [videoUrl, setVideoUrl] = useState(''); // Remember the YouTube URL that user typed in
  const [currentVideoId, setCurrentVideoId] = useState(''); // Remember the extracted video ID from the URL
  const [currentVideoTitle, setCurrentVideoTitle] = useState(''); // Remember the video's title from YouTube
  
  // TRANSCRIPT STATE VARIABLES - Track video transcript/captions
  const [transcript, setTranscript] = useState<any[]>([]); // Remember all the transcript segments (text with timestamps)
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false); // Remember whether we're currently downloading transcript
  const [transcriptError, setTranscriptError] = useState(''); // Remember any error message from transcript loading
  
  // LOADING AND MESSAGE STATES
  const [isAddingCard, setIsAddingCard] = useState(false); // Remember whether we're currently saving a card to database
  const [cardMessage, setCardMessage] = useState(''); // Remember success/error message to show user about card operations
  
  // REFS FOR DOM ELEMENTS - References to HTML elements we need to control
  const playerRef = useRef<HTMLDivElement>(null); // Reference to div where YouTube player will be embedded
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // Reference to timer that updates current time every 100ms
  const transcriptRef = useRef<HTMLDivElement>(null); // Reference to transcript display container
  const currentWordRef = useRef<HTMLSpanElement>(null); // Reference to currently highlighted word in transcript

  // LOAD YOUTUBE API - Download and initialize YouTube's video player library
  const loadYouTubeAPI = () => {
    console.log('🔄 Loading YouTube API...'); // Log to browser console for debugging
    if (!window.YT) { // Check if YouTube API is not already loaded
      const script = document.createElement('script'); // Create new script tag
      script.src = 'https://www.youtube.com/iframe_api'; // Set script source to YouTube API
      script.async = true; // Load script asynchronously so it doesn't block page
      document.body.appendChild(script); // Add script to page so browser downloads it
      window.onYouTubeIframeAPIReady = () => { // Set callback function for when API finishes loading
        console.log('✅ YouTube API loaded and ready!');
      };
    } else {
      console.log('✅ YouTube API already loaded'); // API was already loaded previously
    }
  };

  // INITIALIZE YOUTUBE PLAYER - Create the actual video player in the webpage
  const initializePlayer = () => {
    console.log('🎯 initializePlayer called');
    console.log('YouTube API ready:', !!window.YT); // Log whether API is loaded
    console.log('Player ref exists:', !!playerRef.current); // Log whether we have container element
    console.log('Current video ID:', currentVideoId); // Log the video we're trying to load
    
    if (!window.YT || !playerRef.current || !currentVideoId) { // Check if we have everything needed
      console.log('❌ Missing requirements for player initialization');
      return; // Exit early if requirements not met
    }
    
    try {
      if (player) { // If we already have a player, destroy it first
        console.log('🔄 Destroying existing player');
        player.destroy(); // Clean up old player
        setPlayer(null); // Clear player from memory
      }
      
      console.log('🔄 Creating new YouTube player...');
      const newPlayer = new window.YT.Player(playerRef.current, { // Create new YouTube player
        height: '100%', // Make player fill container height
        width: '100%', // Make player fill container width
        videoId: currentVideoId, // Set which video to load
        playerVars: { // Configuration options for player
          autoplay: 0, // Don't start playing automatically
          controls: 1, // Show player controls (play, pause, etc.)
          disablekb: 0, // Allow keyboard shortcuts
          enablejsapi: 1, // Allow JavaScript control
          fs: 1, // Allow fullscreen
          rel: 0, // Don't show related videos at end
          modestbranding: 1 // Reduce YouTube branding
        },
        events: { // Set up event handlers for player
          onReady: onPlayerReady, // Function to call when player is ready
          onStateChange: onPlayerStateChange // Function to call when play/pause state changes
        }
      });
      
      setPlayer(newPlayer); // Save player object to memory
      console.log('✅ New player created successfully');
    } catch (error) {
      console.error('❌ Error creating player:', error);
    }
  };

  // PLAYER READY HANDLER - Called when YouTube player finishes loading
  const onPlayerReady = (event: any) => {
    console.log('✅ YouTube player ready!');
    const videoDuration = event.target.getDuration(); // Get total video length
    setDuration(videoDuration); // Save duration to memory
    
    // Get video title from player
    const videoData = event.target.getVideoData(); // Get video information
    if (videoData && videoData.title) {
      setCurrentVideoTitle(videoData.title); // Save title to memory
    }
  };

  // PLAYER STATE CHANGE HANDLER - Called when video starts/stops playing
  const onPlayerStateChange = (event: any) => {
    const isNowPlaying = event.data === window.YT.PlayerState.PLAYING; // Check if video is playing
    setIsPlaying(isNowPlaying); // Update playing state in memory
    
    if (isNowPlaying && transcript.length === 0) { // If video started playing and we don't have transcript
      fetchTranscript(currentVideoId); // Download transcript for this video
    }
  };

  // TIME TRACKING EFFECT - Update current time while video plays
  useEffect(() => {
    if (isPlaying && player) { // Only track time when video is playing and player exists
      intervalRef.current = setInterval(() => { // Set up timer that runs every 100ms
        if (player?.getCurrentTime) { // Check if player method exists
          const time = player.getCurrentTime(); // Get current playback position
          setCurrentTime(time); // Update time in memory
        }
      }, 100); // Run every 100 milliseconds for smooth time updates
    } else {
      if (intervalRef.current) { // If timer is running but video stopped
        clearInterval(intervalRef.current); // Stop the timer
        intervalRef.current = null; // Clear timer reference
      }
    }

    return () => { // Cleanup function when component unmounts
      if (intervalRef.current) {
        clearInterval(intervalRef.current); // Stop timer to prevent memory leaks
      }
    };
  }, [isPlaying, player]); // Re-run this effect when playing state or player changes

  // LOAD YOUTUBE API ON MOUNT - Load API when component first appears
  useEffect(() => {
    loadYouTubeAPI(); // Download YouTube API library
  }, []); // Empty dependency array means run once when component mounts

  // INITIALIZE PLAYER WHEN READY - Create player when we have video ID and API
  useEffect(() => {
    if (currentVideoId && window.YT) { // Check if we have video ID and API is loaded
      console.log('🎯 Both conditions met, calling initializePlayer');
      setTimeout(() => initializePlayer(), 500); // Wait 500ms then create player
    }
  }, [currentVideoId]); // Re-run when video ID changes

  // EXTRACT VIDEO ID FROM URL - Get the 11-character video ID from YouTube URL
  const extractVideoId = (url: string): string => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/; // Pattern to match YouTube URLs
    const match = url.match(regExp); // Try to find video ID in URL
    return (match && match[2].length === 11) ? match[2] : ''; // Return ID if found and correct length
  };

  // FETCH TRANSCRIPT - Download video captions/subtitles
  const fetchTranscript = async (videoId: string) => {
    if (!videoId) return; // Exit if no video ID provided
    setIsLoadingTranscript(true); // Update memory: we're loading transcript
    setTranscriptError(''); // Clear any previous error messages
    
    try {
      const response = await fetch(`/api/transcript?videoId=${videoId}`); // Request transcript from our API
      const data = await response.json(); // Parse response as JSON
      
      if (data.transcript && data.transcript.length > 0) { // Check if we got transcript data
        setTranscript(data.transcript); // Save transcript to memory
        setTranscriptError(''); // Clear error state
        
        // CREATE DECK AUTOMATICALLY when transcript loads
        if (user?.id && currentVideoId) { // Check if user is logged in and we have video
          console.log('🔄 Creating deck from transcript fetch...');
          await handleCreateOrGetDeck(`Video ${videoId}`, videoId); // Create deck for this video
        }
      } else {
        setTranscriptError(''); // Clear error
        setTranscript([]); // Clear transcript
        setCardMessage('ℹ️ No transcript available for this video'); // Show info message
        setTimeout(() => setCardMessage(''), 5000); // Clear message after 5 seconds
      }
    } catch (error: any) {
      setTranscriptError(''); // Clear error
      setTranscript([]); // Clear transcript
      setCardMessage('ℹ️ No transcript available for this video'); // Show error message
      setTimeout(() => setCardMessage(''), 5000); // Clear message after 5 seconds
    } finally {
      setIsLoadingTranscript(false); // Update memory: finished loading transcript
    }
  };

  // LOAD NEW VIDEO - Process new YouTube URL entered by user
  const loadNewVideo = async () => {
    const videoId = extractVideoId(videoUrl); // Get video ID from URL
    if (!videoId) { // Check if extraction failed
      setTranscriptError('Please enter a valid YouTube URL'); // Show error message
      return;
    }
    if (videoId === currentVideoId) { // Check if this is the same video already loaded
      return; // Don't reload same video
    }

    setCurrentVideoId(videoId); // Save new video ID to memory
    setTranscript([]); // Clear old transcript
    setTranscriptError(''); // Clear old errors
    setCurrentTime(0); // Reset playback position
    setDuration(0); // Reset duration
  };

  // CREATE OR GET DECK - Create deck for saving vocabulary cards
  const handleCreateOrGetDeck = async (deckName: string, videoId?: string) => {
    if (!user?.id) return; // Exit if user not logged in
    
    try {
      const { createOrGetDeck } = await import('@/lib/database'); // Import database function
      const { data, error } = await createOrGetDeck(user.id, deckName, currentVideoTitle); // Create or find existing deck
      
      if (!error && data) { // Check if operation succeeded
        onDeckCreated(data); // Tell parent component about new deck
        console.log('✅ Deck created/found:', data);
      } else {
        console.error('❌ Failed to create deck:', error);
      }
    } catch (error) {
      console.error('❌ Error creating deck:', error);
    }
  };

  // ADD WORD TO DECK - Save Arabic word as vocabulary card
  const handleWordClick = async (word: string, timestamp: number) => {
    if (!user?.id || !currentDeck) { // Check if user logged in and deck selected
      onCardAdded('❌ Please select a deck first'); // Show error message
      return;
    }

    // Clean Arabic word by removing non-Arabic characters
    const cleanedWord = word.replace(/[^\u0600-\u06FF\u0750-\u077F]/g, '').trim();
    if (!cleanedWord) { // Check if word contains Arabic letters
      onCardAdded('❌ Please select an Arabic word'); // Show error message
      return;
    }

    setIsAddingCard(true); // Update memory: we're saving card
    
    try {
      // Get context sentence from transcript
      const context = getContextFromTranscript(timestamp, word);
      
      const { addCardToDeck, getContextSentence } = await import('@/lib/database'); // Import database functions
      
      // Add card to database
      const { data, error } = await addCardToDeck(
        currentDeck.id, // Which deck to add to
        user.id, // Who owns the card
        cleanedWord, // The Arabic word
        context, // Sentence context
        timestamp, // When word appears in video
        transcript // Full transcript for context
      );
      
      if (!error) { // Check if save succeeded
        onCardAdded(`✅ Added "${cleanedWord}" to deck`); // Show success message
        
        // Seek video to word timestamp
        if (player && player.seekTo) {
          player.seekTo(timestamp, true); // Jump video to where word appears
        }
      } else {
        onCardAdded(`❌ Failed to add card: ${error.message}`); // Show error message
      }
    } catch (error: any) {
      onCardAdded(`❌ Error: ${error.message}`); // Show error message
    } finally {
      setIsAddingCard(false); // Update memory: finished saving card
    }
  };

  // GET CONTEXT FROM TRANSCRIPT - Find sentence containing the word
  const getContextFromTranscript = (timestamp: number, word: string): string => {
    if (!transcript.length) return word; // Return word if no transcript
    
    // Find transcript segment at this timestamp
    const segment = transcript.find(seg => 
      Math.abs(seg.start - timestamp) < 2 && // Within 2 seconds
      seg.text && seg.text.includes(word) // Contains the word
    );
    
    if (!segment) return word; // Return word if no matching segment
    
    const segmentIndex = transcript.findIndex(seg => seg === segment); // Find segment position
    const contextSegments = []; // Array to build context
    
    // Add previous segment for context
    if (segmentIndex > 0 && transcript[segmentIndex - 1].text) {
      contextSegments.push(transcript[segmentIndex - 1].text);
    }
    
    // Add current segment
    contextSegments.push(segment.text);
    
    // Add next segment for context
    if (segmentIndex < transcript.length - 1 && transcript[segmentIndex + 1].text) {
      contextSegments.push(transcript[segmentIndex + 1].text);
    }
    
    return contextSegments.join(' ').trim(); // Join segments into context sentence
  };

  // SEEK TO TIMESTAMP - Jump video to specific time
  const seekTo = (seconds: number) => {
    if (player && player.seekTo) { // Check if player and method exist
      try {
        player.seekTo(seconds, true); // Jump to time (true = allow seeking to unloaded parts)
      } catch (error) {
        console.error('Error seeking:', error);
      }
    }
  };

  // FORMAT TIME - Convert seconds to MM:SS format
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60); // Calculate minutes
    const secs = Math.floor(seconds % 60); // Calculate remaining seconds
    return `${mins}:${secs.toString().padStart(2, '0')}`; // Format as MM:SS
  };

  // COMPONENT RENDER - What user sees on screen
  return (
    <div>
      {/* VIDEO URL INPUT */}
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text" // Text input for YouTube URL
          placeholder="Enter YouTube URL" // Hint text for user
          value={videoUrl} // Show current URL in memory
          onChange={(e) => setVideoUrl(e.target.value)} // Update URL memory when user types
          onKeyPress={(e) => { // Handle Enter key press
            if (e.key === 'Enter' && videoUrl.trim()) { // Check if Enter pressed and URL not empty
              loadNewVideo(); // Process the new video URL
            }
          }}
          style={{
            width: '100%', // Input spans full width
            padding: '12px', // Comfortable padding inside input
            border: '2px solid #e5e7eb', // Gray border around input
            borderRadius: '8px', // Rounded corners
            fontSize: '16px' // Readable text size
          }}
        />
      </div>

      {/* LOAD VIDEO BUTTON */}
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={loadNewVideo} // Call loadNewVideo when clicked
          disabled={!videoUrl.trim()} // Disable button if URL is empty
          style={{
            backgroundColor: !videoUrl.trim() ? '#9ca3af' : '#8b5cf6', // Gray when disabled, purple when enabled
            color: 'white', // White text
            padding: '12px 24px', // Comfortable padding
            borderRadius: '8px', // Rounded corners
            border: 'none', // No border
            fontSize: '16px', // Readable text size
            fontWeight: '600', // Semi-bold text
            cursor: !videoUrl.trim() ? 'not-allowed' : 'pointer' // Show appropriate cursor
          }}
        >
          Load Video
        </button>
      </div>

      {/* VIDEO PLAYER CONTAINER */}
      <div 
        ref={playerRef} // Reference for YouTube player to embed into
        style={{
          width: '100%', // Full width container
          aspectRatio: '16/9', // Maintain video aspect ratio
          backgroundColor: '#000', // Black background like video player
          borderRadius: '8px', // Rounded corners
          marginBottom: '16px' // Space below player
        }}
      />

      {/* VIDEO CONTROLS */}
      {player && ( // Only show controls when player exists
        <div style={{ 
          display: 'flex', // Horizontal layout
          alignItems: 'center', // Center items vertically
          gap: '12px', // Space between items
          marginBottom: '16px' 
        }}>
          <button
            onClick={() => isPlaying ? player.pauseVideo() : player.playVideo()} // Toggle play/pause
            style={{
              padding: '8px 16px', // Button padding
              backgroundColor: '#8b5cf6', // Purple background
              color: 'white', // White text
              border: 'none', // No border
              borderRadius: '6px', // Rounded corners
              cursor: 'pointer' // Pointer cursor
            }}
          >
            {isPlaying ? '⏸️ Pause' : '▶️ Play'} {/* Show different icon based on state */}
          </button>
          
          <span style={{ fontSize: '14px', color: '#6b7280' }}>
            {formatTime(currentTime)} / {formatTime(duration)} {/* Show current time / total time */}
          </span>
        </div>
      )}

      {/* LOADING MESSAGE */}
      {isLoadingTranscript && (
        <div style={{ 
          padding: '20px', // Comfortable padding
          textAlign: 'center', // Center text
          color: '#6b7280' // Gray text color
        }}>
          Loading transcript... {/* Show loading message */}
        </div>
      )}

      {/* TRANSCRIPT DISPLAY */}
      {transcript.length > 0 && (
        <div 
          ref={transcriptRef} // Reference for transcript container
          style={{
            maxHeight: '300px', // Limit height so it doesn't take over page
            overflowY: 'auto', // Allow scrolling if content too tall
            padding: '16px', // Comfortable padding
            backgroundColor: '#f9fafb', // Light gray background
            borderRadius: '8px', // Rounded corners
            border: '1px solid #e5e7eb' // Light border
          }}
        >
          <h3 style={{ 
            fontSize: '16px', // Header text size
            fontWeight: '600', // Semi-bold header
            marginBottom: '12px', // Space below header
            color: '#374151' // Dark gray text
          }}>
            Transcript - Click Arabic words to add to deck
          </h3>
          
          {transcript.map((segment, index) => ( // Loop through each transcript segment
            <div 
              key={index} // Unique key for React
              style={{ marginBottom: '8px' }} // Space between segments
            >
              <span 
                style={{ 
                  fontSize: '12px', // Small timestamp text
                  color: '#8b5cf6', // Purple timestamp
                  fontWeight: '500', // Medium weight
                  marginRight: '8px', // Space after timestamp
                  cursor: 'pointer' // Clickable cursor
                }}
                onClick={() => seekTo(segment.start)} // Jump to this time when timestamp clicked
              >
                {formatTime(segment.start)} {/* Show formatted timestamp */}
              </span>
              
              <span style={{ fontSize: '14px', lineHeight: '1.5' }}>
                {segment.text.split(' ').map((word, wordIndex) => { // Split segment into individual words
                  const isArabic = /[\u0600-\u06FF\u0750-\u077F]/.test(word); // Check if word contains Arabic characters
                  const isCurrentWord = Math.abs(segment.start - currentTime) < segment.duration; // Check if this segment is currently playing
                  
                  return (
                    <span
                      key={wordIndex} // Unique key for React
                      ref={isCurrentWord ? currentWordRef : null} // Reference current word for highlighting
                      onClick={() => isArabic && handleWordClick(word, segment.start)} // Add word to deck when clicked
                      style={{
                        cursor: isArabic ? 'pointer' : 'default', // Pointer cursor only for Arabic words
                        backgroundColor: isCurrentWord ? '#fef3c7' : 'transparent', // Highlight current segment
                        color: isArabic ? '#8b5cf6' : '#374151', // Purple for Arabic, gray for others
                        fontWeight: isArabic ? '600' : '400', // Bold Arabic words
                        padding: '2px 4px', // Padding around words
                        borderRadius: '3px', // Rounded word backgrounds
                        margin: '0 2px', // Space between words
                        fontSize: isArabic ? '16px' : '14px', // Larger Arabic text
                        fontFamily: isArabic ? 'Arabic, serif' : 'inherit' // Arabic font for Arabic words
                      }}
                    >
                      {word}
                    </span>
                  );
                })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* CARD MESSAGE DISPLAY */}
      {cardMessage && (
        <div style={{
          marginTop: '16px', // Space above message
          padding: '12px', // Padding inside message box
          borderRadius: '6px', // Rounded corners
          backgroundColor: cardMessage.includes('✅') ? '#f0fdf4' : '#fef2f2', // Green for success, red for error
          color: cardMessage.includes('✅') ? '#059669' : '#dc2626', // Dark green or red text
          fontSize: '14px', // Readable text size
          fontWeight: '500' // Medium weight text
        }}>
          {cardMessage} {/* Display the message */}
        </div>
      )}
    </div>
  );
}

// COMPONENT SUMMARY:
// PURPOSE: Provides complete YouTube video player with transcript display and vocabulary card creation
// FUNCTIONALITY: Loads videos, downloads transcripts, allows clicking Arabic words to save as vocabulary cards
// STATE MANAGEMENT: Tracks video playback, transcript data, loading states, and user interactions
// INTEGRATION: Communicates with parent component for deck management and card saving
// USER INTERACTION: Handles video controls, word selection, and provides feedback messages
