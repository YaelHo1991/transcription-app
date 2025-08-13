'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MediaPlayerState, MediaFile, MediaPlayerSettings, MediaPlayerAPI, WaveformData } from './types';
import { WorkerManager } from './workers/workerManager';
import KeyboardShortcuts, { defaultShortcuts } from './KeyboardShortcuts';
import ShortcutsTab from './ShortcutsTab';
import PedalTab from './PedalTab';
import AutoDetectTab from './AutoDetectTab';
import VideoCube from './VideoCube';
import WaveformCanvas from './WaveformCanvas';
import { 
  getWaveformStrategy, 
  getFileSizeFromUrl, 
  generateFileId,
  WaveformMethod,
  formatFileSize 
} from './utils/waveformStrategy';
import { ChunkedWaveformProcessor } from './utils/ChunkedWaveformProcessor';
import { resourceMonitor, OperationType, Recommendation } from '@/lib/services/resourceMonitor';
import { useResourceCheck } from '@/hooks/useResourceCheck';
import './MediaPlayer.css';
import './shortcuts-styles.css';
import './pedal-styles.css';
import './autodetect-styles.css';

interface MediaPlayerProps {
  initialMedia?: MediaFile;
  onTimeUpdate?: (time: number) => void;
  onTimestampCopy?: (timestamp: string) => void;
}

export default function MediaPlayerOriginal({ initialMedia, onTimeUpdate, onTimestampCopy }: MediaPlayerProps) {
  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const workerManagerRef = useRef<WorkerManager | null>(null);
  
  // Resource monitoring
  const { checkOperation, showWarning } = useResourceCheck();

  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [globalStatus, setGlobalStatus] = useState<string | null>(null);
  const previousVolumeRef = useRef(100); // Store volume before muting
  
  // Collapsible sections
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [slidersCollapsed, setSlidersCollapsed] = useState(false);
  
  // Settings modal
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('shortcuts');
  
  // Video
  const [showVideo, setShowVideo] = useState(false);
  const [videoMinimized, setVideoMinimized] = useState(false);
  const [showVideoCube, setShowVideoCube] = useState(false);
  
  // Keyboard shortcuts settings
  const [keyboardSettings, setKeyboardSettings] = useState({
    shortcuts: defaultShortcuts || [],
    shortcutsEnabled: true,
    rewindOnPause: { enabled: false, amount: 0.5 }
  });
  
  // Pedal settings
  const [pedalEnabled, setPedalEnabled] = useState(true);
  
  // Auto-detect settings
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(false);
  const [autoDetectMode, setAutoDetectMode] = useState<'regular' | 'enhanced'>('regular');

  // Waveform settings
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const [waveformLoading, setWaveformLoading] = useState(false);
  const [waveformProgress, setWaveformProgress] = useState(0);
  const [waveformEnabled, setWaveformEnabled] = useState(false); // Toggle state

  // Show global status message
  const showGlobalStatus = (message: string) => {
    setGlobalStatus(message);
    setTimeout(() => {
      setGlobalStatus(null);
    }, 3000);
  };

  // Format time
  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Play/Pause
  const togglePlayPause = () => {
    // Use video element for video files, audio element for audio files
    const mediaElement = showVideo && videoRef.current ? videoRef.current : audioRef.current;
    
    if (!mediaElement) {
      return;
    }
    
    // Check actual media state, not React state
    if (!mediaElement.paused) {
      mediaElement.pause();
    } else {
      mediaElement.play()
        .catch(err => {
          // Ignore AbortError as it's just a play/pause conflict
          if (err.name !== 'AbortError') {
            console.error('Play failed:', err);
          }
        });
    }
  };

  // Seek functions
  const handleRewind = (seconds: number) => {
    const mediaElement = showVideo && videoRef.current ? videoRef.current : audioRef.current;
    if (!mediaElement) return;
    mediaElement.currentTime = Math.max(0, mediaElement.currentTime - seconds);
  };

  const handleForward = (seconds: number) => {
    const mediaElement = showVideo && videoRef.current ? videoRef.current : audioRef.current;
    if (!mediaElement) return;
    mediaElement.currentTime = Math.min(duration, mediaElement.currentTime + seconds);
  };

  // Progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const mediaElement = showVideo && videoRef.current ? videoRef.current : audioRef.current;
    if (!progressBarRef.current || !mediaElement) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    // RTL: Right is 0%, left is 100%
    const progress = 1 - (x / rect.width);
    mediaElement.currentTime = progress * duration;
  };

  // Volume control
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(e.target.value);
    setVolume(newVolume);
    
    // Apply volume to both audio and video elements
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
    if (videoRef.current) {
      videoRef.current.volume = newVolume / 100;
    }
    
    setIsMuted(newVolume === 0);
    // Track non-zero volume for unmute
    if (newVolume > 0) {
      previousVolumeRef.current = newVolume;
    }
  };

  const toggleMute = () => {
    const mediaElement = showVideo && videoRef.current ? videoRef.current : audioRef.current;
    if (!mediaElement) return;
    
    // Check actual media volume instead of React state to avoid closure issues
    if (mediaElement.volume === 0) {
      // Currently muted, unmute it
      const newVolume = previousVolumeRef.current / 100;
      if (audioRef.current) audioRef.current.volume = newVolume;
      if (videoRef.current) videoRef.current.volume = newVolume;
      setVolume(previousVolumeRef.current);
      setIsMuted(false);
    } else {
      // Currently has volume, mute it
      // Save current volume before muting
      previousVolumeRef.current = mediaElement.volume * 100;
      if (audioRef.current) audioRef.current.volume = 0;
      if (videoRef.current) videoRef.current.volume = 0;
      setVolume(0);
      setIsMuted(true);
    }
  };

  // Speed control
  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSpeed = Number(e.target.value) / 100;
    setPlaybackRate(newSpeed);
    
    // Apply speed to both audio and video elements
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
    if (videoRef.current) {
      videoRef.current.playbackRate = newSpeed;
    }
  };

  // Cycle through speed presets
  const cycleSpeed = () => {
    const currentSpeed = playbackRate * 100;
    let nextSpeed;
    
    if (currentSpeed <= 75) {
      nextSpeed = 100; // 0.75x -> 1.0x
    } else if (currentSpeed <= 100) {
      nextSpeed = 125; // 1.0x -> 1.25x
    } else if (currentSpeed <= 125) {
      nextSpeed = 150; // 1.25x -> 1.5x
    } else if (currentSpeed <= 150) {
      nextSpeed = 175; // 1.5x -> 1.75x
    } else if (currentSpeed <= 175) {
      nextSpeed = 200; // 1.75x -> 2.0x
    } else {
      nextSpeed = 75; // 2.0x -> 0.75x (wrap around)
    }
    
    const newRate = nextSpeed / 100;
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  };

  // Reset speed to normal
  const resetSpeed = () => {
    setPlaybackRate(1);
    if (audioRef.current) {
      audioRef.current.playbackRate = 1;
    }
  };

  // Handle keyboard shortcut actions
  const handleShortcutAction = useCallback((action: string) => {
    if (!audioRef.current && action !== 'openSettings' && action !== 'toggleSettings') {
      return;
    }

    // Map pedal actions to shortcut actions (note the dot vs underscore difference)
    const actionMap: { [key: string]: string } = {
      'skipBackward2.5': 'rewind2_5',
      'skipForward2.5': 'forward2_5',
      'skipBackward5': 'rewind5',
      'skipForward5': 'forward5',
      'skipBackward10': 'rewind10',
      'skipForward10': 'forward10'
    };
    
    // Use mapped action if available, otherwise use original
    const mappedAction = actionMap[action] || action;

    switch (mappedAction) {
      // Playback Control
      case 'playPause':
        if (!audioRef.current) {
          return;
        }
        
        if (!audioRef.current.paused) {
          audioRef.current.pause();
        } else {
          audioRef.current.play()
            .catch(err => {
              // Ignore AbortError as it's just a play/pause conflict
              if (err.name !== 'AbortError') {
                console.error('Play failed:', err);
              }
            });
        }
        break;
      case 'stop':
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          setIsPlaying(false);
        }
        break;
      
      // Navigation
      case 'rewind5':
        handleRewind(5);
        break;
      case 'forward5':
        handleForward(5);
        break;
      case 'rewind2_5':
        handleRewind(2.5);
        break;
      case 'forward2_5':
        handleForward(2.5);
        break;
      case 'rewind10':
        handleRewind(10);
        break;
      case 'forward10':
        handleForward(10);
        break;
      case 'jumpToStart':
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
        }
        break;
      case 'jumpToEnd':
        if (audioRef.current) {
          audioRef.current.currentTime = duration;
        }
        break;
      
      // Volume & Speed
      case 'volumeUp':
        if (!audioRef.current) return;
        // Get current volume from audio element to avoid closure issues
        const currentVolumeUp = Math.round(audioRef.current.volume * 100);
        const newVolumeUp = Math.min(100, currentVolumeUp + 5); // Increase by 5%
        setVolume(newVolumeUp);
        if (audioRef.current) {
          audioRef.current.volume = newVolumeUp / 100;
        }
        // Track non-zero volume for unmute
        if (newVolumeUp > 0) {
          previousVolumeRef.current = newVolumeUp;
          setIsMuted(false);
        }
        break;
      case 'volumeDown':
        if (!audioRef.current) return;
        // Get current volume from audio element to avoid closure issues
        const currentVolumeDown = Math.round(audioRef.current.volume * 100);
        const newVolumeDown = Math.max(0, currentVolumeDown - 5); // Decrease by 5%
        setVolume(newVolumeDown);
        if (audioRef.current) {
          audioRef.current.volume = newVolumeDown / 100;
        }
        // Update mute state if volume reaches 0
        setIsMuted(newVolumeDown === 0);
        // Track non-zero volume for unmute
        if (newVolumeDown > 0) {
          previousVolumeRef.current = newVolumeDown;
        }
        break;
      case 'mute':
        toggleMute();
        break;
      case 'speedUp':
        const newSpeedUp = Math.min(2, playbackRate + 0.25);
        setPlaybackRate(newSpeedUp);
        if (audioRef.current) {
          audioRef.current.playbackRate = newSpeedUp;
        }
        break;
      case 'speedDown':
        const newSpeedDown = Math.max(0.5, playbackRate - 0.25);
        setPlaybackRate(newSpeedDown);
        if (audioRef.current) {
          audioRef.current.playbackRate = newSpeedDown;
        }
        break;
      case 'speedReset':
        resetSpeed();
        break;
      
      // Work Modes
      case 'toggleShortcuts':
        setKeyboardSettings(prev => {
          const newEnabled = !prev.shortcutsEnabled;
          showGlobalStatus(`קיצורי מקלדת: ${newEnabled ? 'פעילים' : 'כבויים'}`);
          return { ...prev, shortcutsEnabled: newEnabled };
        });
        break;
      case 'togglePedal':
        setPedalEnabled(prev => {
          const newEnabled = !prev;
          showGlobalStatus(`דוושה: ${newEnabled ? 'פעילה' : 'כבויה'}`);
          return newEnabled;
        });
        break;
      case 'toggleAutoDetect':
        setAutoDetectEnabled(prev => {
          const newEnabled = !prev;
          showGlobalStatus(`זיהוי אוטומטי: ${newEnabled ? 'פעיל' : 'כבוי'}`);
          return newEnabled;
        });
        break;
      case 'toggleMode':
        // Toggle between regular and enhanced auto-detect modes
        setAutoDetectMode(prev => {
          const newMode = prev === 'regular' ? 'enhanced' : 'regular';
          showGlobalStatus(`מצב זיהוי: ${newMode === 'regular' ? 'רגיל' : 'משופר'}`);
          return newMode;
        });
        break;
      
      // Special Functions
      case 'openSettings':
      case 'toggleSettings':
        setShowSettings(true);
        break;
      case 'insertTimestamp':
        const timestamp = formatTime(currentTime);
        if (onTimestampCopy) {
          onTimestampCopy(timestamp);
        } else {
          // Copy to clipboard
          navigator.clipboard.writeText(timestamp);
        }
        break;
      
      // Video Mode
      case 'toggleVideo':
        setShowVideo(prev => !prev);
        break;
      case 'toggleFullscreen':
        // Will be implemented in Stage 4
        break;
    }
  }, [audioRef, duration, volume, playbackRate, onTimestampCopy, currentTime, isPlaying]);

  // Handle speed icon click with double-click detection
  const speedClickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const handleSpeedIconClick = () => {
    if (speedClickTimerRef.current) {
      // Double click detected
      clearTimeout(speedClickTimerRef.current);
      speedClickTimerRef.current = null;
      resetSpeed();
    } else {
      // Single click - wait to see if it's a double click
      speedClickTimerRef.current = setTimeout(() => {
        speedClickTimerRef.current = null;
        cycleSpeed();
      }, 250);
    }
  };

  // Analyze waveform for loaded media with smart strategy
  const analyzeWaveform = useCallback(async (url: string) => {
    try {
      setWaveformLoading(true);
      setWaveformProgress(0);
      setWaveformData(null);

      // Get file size to determine strategy
      const fileSize = await getFileSizeFromUrl(url);
      
      // If file size detection failed (returns 0), use client-side as fallback
      if (fileSize === 0) {
        console.warn('Could not determine file size, using client-side processing as fallback');
      }
      
      // Check system resources before processing
      const resourceCheck = await checkOperation(OperationType.WAVEFORM, fileSize || 50 * 1024 * 1024);
      
      if (!resourceCheck.safe) {
        // Show warning and handle user response
        const proceed = showWarning(resourceCheck);
        
        if (!proceed) {
          // User cancelled, disable waveform
          setWaveformEnabled(false);
          setWaveformLoading(false);
          showGlobalStatus('ניתוח צורת גל בוטל - אין מספיק משאבים');
          return;
        }
        
        // If alternative method suggested, switch strategy
        if (resourceCheck.recommendation === Recommendation.USE_SERVER) {
          // Force server-side processing
          console.log('Switching to server-side processing due to low resources');
        }
      }
      
      const strategy = getWaveformStrategy(fileSize || 1); // Use 1 byte if 0 to get client strategy
      
      console.log(`File size: ${fileSize ? formatFileSize(fileSize) : 'Unknown'}, using ${strategy.method} method`);
      
      // Show appropriate message
      setWaveformProgress(1); // Show loading started
      
      // Log operation start for metrics
      const startTime = Date.now();
      const startMemory = (await resourceMonitor.getStatus()).memoryUsed;
      
      switch (strategy.method) {
        case WaveformMethod.CLIENT:
          // Small files: Original client-side processing
          if (!workerManagerRef.current) return;
          
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();

          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const decodedData = await audioContext.decodeAudioData(arrayBuffer.slice());

          const channelData = decodedData.getChannelData(0);
          const duration = decodedData.duration;
          
          audioContext.close();

          workerManagerRef.current.analyzeWaveform(channelData.buffer, decodedData.sampleRate, duration);
          break;
          
        case WaveformMethod.CHUNKED:
          // Medium files: Process in chunks
          const chunkedProcessor = new ChunkedWaveformProcessor({
            onProgress: (progress) => setWaveformProgress(progress),
            onError: (error) => console.error('Chunked processing error:', error)
          });
          
          const chunkedResult = await chunkedProcessor.processLargeFile(url);
          setWaveformData(chunkedResult);
          setWaveformLoading(false);
          setWaveformProgress(100);
          break;
          
        case WaveformMethod.SERVER:
          // Large files: Request from server
          const fileId = generateFileId(url);
          
          // First, trigger generation on server
          const generateResponse = await fetch('http://localhost:5000/api/waveform/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              fileId,
              fileUrl: url,
              fileSize
            })
          });
          
          if (!generateResponse.ok) {
            throw new Error('Failed to generate waveform on server');
          }
          
          // Poll for completion (for large files)
          let attempts = 0;
          const maxAttempts = 60; // 1 minute timeout
          
          while (attempts < maxAttempts) {
            const waveformResponse = await fetch(`http://localhost:5000/api/waveform/${fileId}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            
            if (waveformResponse.ok) {
              const data = await waveformResponse.json();
              setWaveformData({
                peaks: data.peaks,
                duration: data.duration
              });
              setWaveformLoading(false);
              setWaveformProgress(100);
              break;
            }
            
            // Wait and retry
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
            setWaveformProgress(Math.min(90, attempts * 1.5)); // Show progress
          }
          
          if (attempts >= maxAttempts) {
            throw new Error('Waveform generation timeout');
          }
          break;
      }
      
      // Log operation completion for metrics
      const endMemory = (await resourceMonitor.getStatus()).memoryUsed;
      resourceMonitor.logOperation({
        type: OperationType.WAVEFORM,
        timestamp: startTime,
        fileSize: fileSize || 0,
        memoryBefore: startMemory,
        memoryAfter: endMemory,
        duration: Date.now() - startTime,
        success: true
      });
      
    } catch (error) {
      console.error('Failed to analyze waveform:', error);
      setWaveformLoading(false);
      setWaveformProgress(0);
      
      // Log operation failure
      resourceMonitor.logOperation({
        type: OperationType.WAVEFORM,
        timestamp: Date.now(),
        fileSize: 0,
        memoryBefore: 0,
        success: false,
        error: error.message
      });
      
      // Show error message to user
      showGlobalStatus(`שגיאה בטעינת צורת גל: ${error.message}`);
    }
  }, [checkOperation, showWarning]);

  // Load media
  useEffect(() => {
    if (initialMedia && audioRef.current) {
      // Reset playback states for new media
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      setIsReady(false);
      
      audioRef.current.src = initialMedia.url;
      audioRef.current.volume = volume / 100; // Initialize volume
      const isVideo = initialMedia.type === 'video';
      setShowVideo(isVideo);
      setShowVideoCube(isVideo && !videoMinimized);
      
      // Clear video minimized state when switching to audio
      if (!isVideo) {
        setVideoMinimized(false);
      }
      
      // Reset waveform states when loading new media
      setWaveformData(null);
      setWaveformLoading(false);
      setWaveformProgress(0);
      // Clear previous media URL to trigger re-analysis
      previousMediaUrlRef.current = null;
      // Keep waveformEnabled state as user preference
      
      // Set video source if it's a video file - with small delay to ensure element is mounted
      if (isVideo) {
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.src = initialMedia.url;
            videoRef.current.volume = volume / 100;
            // Ensure video is ready to play
            videoRef.current.load();
          }
        }, 100);
      }

      // Don't analyze waveform automatically - wait for user to enable it
      // This prevents the 3-click issue
    }
  }, [initialMedia]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Track previous media URL to detect changes
  const previousMediaUrlRef = useRef<string | null>(null);
  
  // Analyze waveform when enabled and media is available or changes
  useEffect(() => {
    if (waveformEnabled && initialMedia?.url) {
      // Check if media has changed
      const mediaChanged = previousMediaUrlRef.current !== initialMedia.url;
      
      // Analyze if we don't have data, aren't loading, or media has changed
      if ((!waveformData && !waveformLoading) || mediaChanged) {
        previousMediaUrlRef.current = initialMedia.url;
        setTimeout(() => {
          analyzeWaveform(initialMedia.url);
        }, 100);
      }
    }
  }, [waveformEnabled, initialMedia?.url]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Update video cube visibility when videoMinimized changes
  useEffect(() => {
    if (showVideo) {
      setShowVideoCube(!videoMinimized);
    }
  }, [videoMinimized, showVideo]);

  // Video cube handlers
  const handleVideoCubeMinimize = () => {
    setVideoMinimized(true);
    setShowVideoCube(false);
  };

  const handleVideoCubeClose = () => {
    setShowVideoCube(false);
    setVideoMinimized(true); // Set to true so restore button appears
    // Keep video enabled (don't set setShowVideo(false))
  };

  const handleVideoRestore = () => {
    setVideoMinimized(false);
    setShowVideo(true); // Make sure video is enabled again
    setShowVideoCube(true);
  };

  // Handle video cube restore to defaults
  const handleVideoCubeRestore = () => {
    // Just a callback for when restore button is clicked
    // The VideoCube component handles the actual restore logic
  };

  // Waveform seek handler
  const handleWaveformSeek = useCallback((time: number) => {
    const mediaElement = showVideo && videoRef.current ? videoRef.current : audioRef.current;
    if (mediaElement) {
      mediaElement.currentTime = time;
    }
  }, [showVideo]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Initialize audio volume
    audio.volume = volume / 100;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsReady(true);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      onTimeUpdate?.(audio.currentTime);
    };
    
    const handlePlay = () => {
      setIsPlaying(true);
    };
    
    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onTimeUpdate]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !showVideo) return;

    // Initialize video volume
    video.volume = volume / 100;
    video.playbackRate = playbackRate;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsReady(true);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(video.currentTime);
    };
    
    const handlePlay = () => {
      setIsPlaying(true);
    };
    
    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [onTimeUpdate, showVideo, volume, playbackRate]);

  // Initialize worker manager
  useEffect(() => {
    workerManagerRef.current = new WorkerManager();
    
    // Set up waveform event listeners
    if (workerManagerRef.current) {
      workerManagerRef.current.on('waveform:progress', (progress: number) => {
        setWaveformProgress(progress);
      });

      workerManagerRef.current.on('waveform:complete', (data: WaveformData) => {
        setWaveformData(data);
        setWaveformLoading(false);
        setWaveformProgress(100);
      });

      workerManagerRef.current.on('waveform:error', (error: string) => {
        console.error('Waveform analysis error:', error);
        setWaveformLoading(false);
        setWaveformProgress(0);
      });
    }
    
    return () => {
      workerManagerRef.current?.terminate();
    };
  }, []);

  // Progress percentage (RTL)
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Jump to start
  const jumpToStart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };

  // Jump to end
  const jumpToEnd = () => {
    if (audioRef.current && duration > 0) {
      audioRef.current.currentTime = duration;
      setCurrentTime(duration);
    }
  };

  // Parse time string (HH:MM:SS) to seconds
  const parseTimeString = (timeStr: string): number => {
    const parts = timeStr.split(':').map(p => parseInt(p, 10));
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return parts[0] || 0;
  };

  // Enable time editing
  const [editingTime, setEditingTime] = useState<'current' | 'total' | null>(null);
  const [editTimeValue, setEditTimeValue] = useState('');
  const editTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const enableTimeEdit = (type: 'current' | 'total') => {
    setEditingTime(type);
    // Keep the original time value
    setEditTimeValue(type === 'current' ? formatTime(currentTime) : formatTime(duration));
    
    // Clear any existing timeout
    if (editTimeoutRef.current) {
      clearTimeout(editTimeoutRef.current);
    }
    
    // Set timeout to cancel editing after 10 seconds
    editTimeoutRef.current = setTimeout(() => {
      setEditingTime(null);
      setEditTimeValue('');
    }, 10000);
  };

  const handleTimeEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^\d]/g, ''); // Remove non-digits
    
    // Limit to 6 digits (HHMMSS)
    if (value.length > 6) {
      value = value.slice(0, 6);
    }
    
    // Format as HH:MM:SS
    if (value.length >= 4) {
      value = value.slice(0, 2) + ':' + value.slice(2, 4) + ':' + value.slice(4);
    } else if (value.length >= 2) {
      value = value.slice(0, 2) + ':' + value.slice(2);
    }
    
    setEditTimeValue(value);
  };
  
  const handleTimeEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle Enter
    if (e.key === 'Enter') {
      const time = parseTimeString(editTimeValue);
      if (audioRef.current && !isNaN(time)) {
        audioRef.current.currentTime = Math.min(time, duration);
        setCurrentTime(audioRef.current.currentTime);
      }
      setEditingTime(null);
      setEditTimeValue('');
      if (editTimeoutRef.current) {
        clearTimeout(editTimeoutRef.current);
      }
      e.preventDefault();
      return;
    }
    
    // Handle Escape
    if (e.key === 'Escape') {
      setEditingTime(null);
      setEditTimeValue('');
      if (editTimeoutRef.current) {
        clearTimeout(editTimeoutRef.current);
      }
      e.preventDefault();
      return;
    }
  };
  
  const handleTimeEditBlur = () => {
    // Cancel editing when focus is lost
    setEditingTime(null);
    setEditTimeValue('');
    if (editTimeoutRef.current) {
      clearTimeout(editTimeoutRef.current);
    }
  };

  return (
    <>
      {/* Keyboard Shortcuts Handler */}
      <KeyboardShortcuts
        shortcuts={keyboardSettings.shortcuts}
        enabled={keyboardSettings.shortcutsEnabled}
        onAction={handleShortcutAction}
      />
      
      {/* Global Status Display */}
      <div className={`media-global-status ${globalStatus ? 'visible' : ''}`} id="mediaGlobalStatus">
        {globalStatus}
      </div>
      
      {/* Media Player Component */}
      <div className={`media-player-container ${showVideoCube ? 'video-active' : ''}`} id="mediaPlayerContainer">
        {/* Media Player Content Wrapper */}
        <div className="media-player-content">
          {/* Hidden Audio Element */}
          <audio ref={audioRef} id="audioPlayer" preload="auto" />
          {showVideo && <video ref={videoRef} style={{ display: 'none' }} />}
        
        
        {/* Controls Section Wrapper */}
        <div className={`section-wrapper ${controlsCollapsed ? 'collapsed' : ''}`} id="controlsWrapper">
          {/* Collapse/Expand Toggle */}
          <button 
            className="collapse-toggle" 
            id="controlsToggle" 
            title="הסתר/הצג פקדי הפעלה"
            onClick={() => setControlsCollapsed(!controlsCollapsed)}
          >
            <span className="toggle-icon">{controlsCollapsed ? '▲' : '▼'}</span>
          </button>
          
          {/* Controls Section */}
          <div className="controls-section" id="controlsSection" style={{ display: controlsCollapsed ? 'none' : 'flex' }}>
            {/* Control Buttons (RTL: rewind on left, forward on right) */}
            <div className="control-buttons">
              {/* Rewind buttons (left side in RTL) */}
              <button className="control-btn" id="rewind5Btn" title="אחורה 5 שניות" onClick={() => handleRewind(5)}>
                ➡️
                <span className="skip-amount">5</span>
              </button>
              
              <button className="control-btn" id="rewind2_5Btn" title="אחורה 2.5 שניות" onClick={() => handleRewind(2.5)}>
                ➡️
                <span className="skip-amount">2.5</span>
              </button>
              
              {/* Play/Pause Button (center) */}
              <button className="play-pause-btn" id="playPauseBtn" title="הפעל/השהה" onClick={togglePlayPause}>
                <span id="playIcon">{isPlaying ? '⏸️' : '▶️'}</span>
              </button>
              
              {/* Forward buttons (right side in RTL) */}
              <button className="control-btn" id="forward2_5Btn" title="קדימה 2.5 שניות" onClick={() => handleForward(2.5)}>
                ⬅️
                <span className="skip-amount">2.5</span>
              </button>
              
              <button className="control-btn" id="forward5Btn" title="קדימה 5 שניות" onClick={() => handleForward(5)}>
                ⬅️
                <span className="skip-amount">5</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Progress Bar Section */}
        <div className="media-progress-container" id="progressContainer">
          {/* Progress Row: timestamps inline with bar */}
          <div className="progress-row">
            {/* Current Time (left side in RTL) */}
            {editingTime === 'current' ? (
              <input
                type="text"
                className="time-display editable"
                value={editTimeValue || ''}
                onChange={handleTimeEditChange}
                onKeyDown={handleTimeEditKeyDown}
                onBlur={handleTimeEditBlur}
                onFocus={(e) => e.target.select()}
                autoFocus
                style={{
                  background: 'rgba(32, 201, 151, 0.2)',
                  border: '1px solid rgba(32, 201, 151, 0.5)',
                  width: '80px',
                  textAlign: 'center',
                  color: 'white',
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  direction: 'ltr'
                }}
              />
            ) : (
              <span 
                className="time-display" 
                id="currentTime" 
                title="לחץ לקפיצה להתחלה, קליק ימני לעריכה"
                onClick={jumpToStart}
                onContextMenu={(e) => {
                  e.preventDefault();
                  enableTimeEdit('current');
                }}
              >
                {formatTime(currentTime)}
              </span>
            )}
            
            {/* Waveform Progress Bar (middle) */}
            {waveformEnabled ? (
              waveformData ? (
                <div className="waveform-progress-wrapper" style={{ flex: 1 }}>
                  <WaveformCanvas
                    waveformData={waveformData}
                    currentTime={currentTime}
                    duration={duration}
                    isPlaying={isPlaying}
                    onSeek={handleWaveformSeek}
                  />
                </div>
              ) : (
                <div 
                  className="waveform-progress-wrapper" 
                  style={{ flex: 1 }}
                >
                  {waveformLoading ? (
                    <div className="waveform-loading-bar" style={{ width: '100%', height: '60px' }}>
                      <div 
                        className="waveform-progress-fill"
                        style={{ 
                          width: `${waveformProgress}%`,
                          background: 'linear-gradient(90deg, rgba(32, 201, 151, 0.4) 0%, rgba(23, 162, 184, 0.4) 100%)',
                          height: '100%',
                          borderRadius: '4px',
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                  ) : (
                    <div 
                      className="waveform-container"
                      style={{
                        width: '100%',
                        height: '60px',
                        backgroundColor: 'rgba(15, 76, 76, 0.1)',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(255, 255, 255, 0.3)'
                      }}
                    >
                      {!initialMedia ? 'אין מדיה' : 'ממתין לצורת גל...'}
                    </div>
                  )}
                </div>
              )
            ) : (
              <div 
                className="progress-bar-wrapper" 
                id="progressBar"
                ref={progressBarRef}
                onClick={handleProgressClick}
                style={{ flex: 1 }}
              >
                <div 
                  className="progress-fill" 
                  id="progressFill" 
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            )}
            
            {/* Duration (right side in RTL) */}
            {editingTime === 'total' ? (
              <input
                type="text"
                className="time-display editable"
                value={editTimeValue || ''}
                onChange={handleTimeEditChange}
                onKeyDown={handleTimeEditKeyDown}
                onBlur={handleTimeEditBlur}
                onFocus={(e) => e.target.select()}
                autoFocus
                style={{
                  background: 'rgba(32, 201, 151, 0.2)',
                  border: '1px solid rgba(32, 201, 151, 0.5)',
                  width: '80px',
                  textAlign: 'center',
                  color: 'white',
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  direction: 'ltr'
                }}
              />
            ) : (
              <span 
                className="time-display" 
                id="totalTime" 
                title="לחץ לקפיצה לסוף, קליק ימני לעריכה"
                onClick={jumpToEnd}
                onContextMenu={(e) => {
                  e.preventDefault();
                  enableTimeEdit('total');
                }}
              >
                {formatTime(duration)}
              </span>
            )}
            
            {/* Waveform Toggle Button */}
            <button 
              className={`waveform-toggle-btn ${waveformEnabled ? 'active' : ''}`}
              id="waveformToggleBtn" 
              title={waveformEnabled ? "החלף לסרגל התקדמות רגיל" : "החלף לצורת גל"}
              onClick={() => {
                const newEnabled = !waveformEnabled;
                setWaveformEnabled(newEnabled);
                
                // If enabling and we don't have data, analyze
                if (newEnabled && !waveformData && initialMedia?.url) {
                  analyzeWaveform(initialMedia.url);
                }
              }}
            >
              ●
            </button>
          </div>
        </div>
        
        {/* Sliders Section Wrapper */}
        <div className={`section-wrapper ${slidersCollapsed ? 'collapsed' : ''}`} id="slidersWrapper">
          {/* Collapse/Expand Toggle */}
          <button 
            className="collapse-toggle" 
            id="slidersToggle" 
            title="הסתר/הצג בקרות עוצמה ומהירות"
            onClick={() => setSlidersCollapsed(!slidersCollapsed)}
          >
            <span className="toggle-icon">{slidersCollapsed ? '▲' : '▼'}</span>
          </button>
          
          {/* Sliders Section */}
          <div className="sliders-container" id="slidersContainer" style={{ display: slidersCollapsed ? 'none' : 'flex' }}>
            {/* Volume Slider */}
            <div className="slider-group">
              <span 
                className={`slider-icon ${isMuted ? 'muted' : ''}`} 
                id="volumeIcon" 
                title="השתק/בטל השתקה"
                onClick={toggleMute}
              >
                {isMuted || volume === 0 ? '🔇' : volume < 50 ? '🔉' : '🔊'}
              </span>
              <input 
                type="range" 
                className="custom-slider" 
                id="volumeSlider" 
                min="0" 
                max="100" 
                value={isMuted ? 0 : (volume || 0)} 
                title="עוצמת קול"
                onChange={handleVolumeChange}
              />
              <span className="slider-value" id="volumeValue">
                {isMuted ? '0' : volume}%
              </span>
            </div>
            
            {/* Speed Slider */}
            <div className="slider-group">
              <span 
                className="slider-icon" 
                id="speedIcon" 
                title="לחץ להחלפת מהירות, לחץ פעמיים לאיפוס"
                onClick={handleSpeedIconClick}
                style={{ cursor: 'pointer' }}
              >⚡</span>
              <input 
                type="range" 
                className="custom-slider" 
                id="speedSlider" 
                min="50" 
                max="200" 
                value={(playbackRate || 1) * 100} 
                step="5" 
                title="מהירות הפעלה"
                onChange={handleSpeedChange}
              />
              <span className="slider-value" id="speedValue">
                {playbackRate.toFixed(1)}x
              </span>
            </div>
          </div>
        </div>
        
        {/* Video Restore Button (shows when video is minimized and it's a video file) */}
        {videoMinimized && showVideo && (
          <button 
            className="video-restore-control visible" 
            id="videoRestoreBtn"
            onClick={handleVideoRestore}
          >
            🎬 שחזר
          </button>
        )}
        
          {/* Settings Button */}
          <button 
            className="settings-btn" 
            id="settingsBtn" 
            title="הגדרות"
            onClick={() => setShowSettings(true)}
          >
            ⚙️
          </button>
        </div>
        
        {/* Video Cube - part of layout when video is shown */}
        {showVideoCube && (
          <div className="video-cube-container">
            <VideoCube
              videoRef={videoRef}
              isVisible={showVideoCube}
              onMinimize={handleVideoCubeMinimize}
              onClose={handleVideoCubeClose}
              onRestore={handleVideoCubeRestore}
              waveformEnabled={waveformEnabled}
              isInLayout={true}
            />
          </div>
        )}
      </div>
      
      {/* Settings Modal */}
      <div className={`media-modal-overlay ${showSettings ? 'active' : ''}`} id="modalOverlay">
        <div className="settings-modal">
          {/* Modal Header */}
          <div className="settings-modal-header">
            <h2 className="settings-modal-title">הגדרות נגן מדיה</h2>
            <button 
              className="settings-modal-close" 
              id="modalClose"
              onClick={() => setShowSettings(false)}
            >
              ✕
            </button>
          </div>
          
          {/* Modal Tabs */}
          <div className="settings-modal-tabs">
            <button 
              className={`settings-tab-btn ${activeTab === 'shortcuts' ? 'active' : ''}`} 
              data-tab="shortcuts"
              onClick={() => setActiveTab('shortcuts')}
            >
              קיצורי מקלדת
            </button>
            <button 
              className={`settings-tab-btn ${activeTab === 'pedal' ? 'active' : ''}`} 
              data-tab="pedal"
              onClick={() => setActiveTab('pedal')}
            >
              דוושת רגל
            </button>
            <button 
              className={`settings-tab-btn ${activeTab === 'autodetect' ? 'active' : ''}`} 
              data-tab="autodetect"
              onClick={() => setActiveTab('autodetect')}
            >
              זיהוי אוטומטי
            </button>
          </div>
          
          {/* Modal Content */}
          <div className="settings-modal-content">
            {/* Shortcuts Tab */}
            <div className={`settings-tab-content ${activeTab === 'shortcuts' ? 'active' : ''}`} id="shortcuts-tab">
              <ShortcutsTab
                shortcuts={keyboardSettings.shortcuts}
                shortcutsEnabled={keyboardSettings.shortcutsEnabled}
                rewindOnPause={keyboardSettings.rewindOnPause}
                onShortcutsChange={(shortcuts) => setKeyboardSettings(prev => ({ ...prev, shortcuts }))}
                onShortcutsEnabledChange={(enabled) => setKeyboardSettings(prev => ({ ...prev, shortcutsEnabled: enabled }))}
                onRewindOnPauseChange={(rewindSettings) => setKeyboardSettings(prev => ({ ...prev, rewindOnPause: rewindSettings }))}
              />
            </div>
            
            {/* Pedal Tab */}
            <div className={`settings-tab-content ${activeTab === 'pedal' ? 'active' : ''}`} id="pedal-tab">
              <PedalTab
                pedalEnabled={pedalEnabled}
                onPedalEnabledChange={setPedalEnabled}
                onPedalAction={handleShortcutAction}
              />
            </div>
            
            {/* Auto-detect Tab */}
            <div className={`settings-tab-content ${activeTab === 'autodetect' ? 'active' : ''}`} id="autodetect-tab">
              <AutoDetectTab
                autoDetectEnabled={autoDetectEnabled}
                onAutoDetectEnabledChange={setAutoDetectEnabled}
                onModeChange={setAutoDetectMode}
                isPlaying={isPlaying}
                onPlayPause={togglePlayPause}
                onRewind={handleRewind}
              />
            </div>
          </div>
        </div>
      </div>


    </>
  );
}