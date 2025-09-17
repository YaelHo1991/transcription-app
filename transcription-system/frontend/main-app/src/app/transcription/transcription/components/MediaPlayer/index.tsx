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
import { waveformCache } from './utils/waveformCache';
import { resourceMonitor, OperationType, Recommendation } from '@/lib/services/resourceMonitor';
import { useResourceCheck } from '@/hooks/useResourceCheck';
import { ResourceWarningModal } from './components/ResourceWarningModal';
import { buildApiUrl } from '@/utils/api';
import { safeLocalStorage, getJsonItem, setJsonItem } from '@/lib/utils/storage';
import './MediaPlayer.css';
import './shortcuts-styles.css';
import './pedal-styles.css';
import './autodetect-styles.css';

interface MediaPlayerProps {
  initialMedia?: MediaFile;
  onTimeUpdate?: (time: number) => void;
  onTimestampCopy?: (timestamp: string) => void;
  onDurationChange?: (duration: number) => void;
  // ProjectNavigator props
  currentProject?: number;
  totalProjects?: number;
  currentMedia?: number;
  totalMedia?: number;
  mediaName?: string;
  mediaDuration?: string;
  mediaSize?: string;
  projectName?: string;
  onPreviousProject?: () => void;
  onNextProject?: () => void;
  onPreviousMedia?: () => void;
  onNextMedia?: () => void;
}

export default function MediaPlayer({ 
  initialMedia, 
  onTimeUpdate, 
  onTimestampCopy, 
  onDurationChange,
  currentProject = 1,
  totalProjects = 1,
  currentMedia = 1,
  totalMedia = 1,
  mediaName = '',
  mediaDuration = '00:00:00',
  mediaSize = '0 MB',
  projectName = '',
  onPreviousProject,
  onNextProject,
  onPreviousMedia,
  onNextMedia
}: MediaPlayerProps) {
  // Refs - component references
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const workerManagerRef = useRef<WorkerManager | null>(null);
  const mediaPositionsRef = useRef<Map<string, { position: number; timestamp: number; duration: number }>>(new Map());
  const positionSaveIntervalRef = useRef<number | null>(null);
  const currentMediaIdRef = useRef<string | null>(null);
  const waveformAbortControllerRef = useRef<AbortController | null>(null);
  const currentWaveformInfoRef = useRef<{ url: string; fileSize: number } | null>(null);
  
  // Resource monitoring
  const { 
    checkOperation, 
    warningData, 
    showResourceWarning, 
    handleContinueRisky, 
    handleUseAlternative, 
    handleCloseWarning,
    showWarning
  } = useResourceCheck();

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
  const [navigationCollapsed, setNavigationCollapsed] = useState(false);
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
    rewindOnPause: { enabled: false, amount: 0.5, source: 'keyboard' as 'keyboard' | 'pedal' | 'autodetect' | 'all' }
  });
  
  // Pedal settings
  const [pedalEnabled, setPedalEnabled] = useState(true);
  const [continuousPress, setContinuousPress] = useState(true);
  const [continuousInterval, setContinuousInterval] = useState(0.5);
  
  // Auto-detect settings
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(false);
  const [autoDetectMode, setAutoDetectMode] = useState<'regular' | 'enhanced'>('regular');
  const [regularDelay, setRegularDelay] = useState(2.0);
  const [enhancedFirstDelay, setEnhancedFirstDelay] = useState(1.5);
  const [enhancedSecondDelay, setEnhancedSecondDelay] = useState(1.5);
  const [enhancedResumeDelay, setEnhancedResumeDelay] = useState(2.0);
  
  // Track if settings have been loaded from localStorage to prevent overwriting during initial load
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  
  // Waveform background processing setting
  
  // Load all settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const parsed = getJsonItem('mediaPlayerSettings', null);
      if (parsed) {
        try {
          
          // Load keyboard shortcuts
          if (parsed.shortcuts) {
            // Merge new shortcuts from defaults that don't exist in saved
            const savedActions = new Set(parsed.shortcuts.map((s: any) => s.action));
            const newShortcuts = defaultShortcuts.filter(s => !savedActions.has(s.action));
            const mergedShortcuts = [...parsed.shortcuts, ...newShortcuts];
            
            setKeyboardSettings(prev => ({
              ...prev,
              shortcuts: mergedShortcuts,
              shortcutsEnabled: parsed.shortcutsEnabled !== undefined ? parsed.shortcutsEnabled : prev.shortcutsEnabled,
              rewindOnPause: parsed.rewindOnPause || prev.rewindOnPause
            }));
          }
          
          // Load pedal settings
          if (parsed.pedalEnabled !== undefined) setPedalEnabled(parsed.pedalEnabled);
          if (parsed.continuousPress !== undefined) setContinuousPress(parsed.continuousPress);
          if (parsed.continuousInterval !== undefined) setContinuousInterval(parsed.continuousInterval);
          
          // Load auto-detect settings
          if (parsed.autoDetectEnabled !== undefined) setAutoDetectEnabled(parsed.autoDetectEnabled);
          if (parsed.autoDetectMode !== undefined) setAutoDetectMode(parsed.autoDetectMode);
          if (parsed.regularDelay !== undefined) setRegularDelay(parsed.regularDelay);
          if (parsed.enhancedFirstDelay !== undefined) setEnhancedFirstDelay(parsed.enhancedFirstDelay);
          if (parsed.enhancedSecondDelay !== undefined) setEnhancedSecondDelay(parsed.enhancedSecondDelay);
          if (parsed.enhancedResumeDelay !== undefined) setEnhancedResumeDelay(parsed.enhancedResumeDelay);
          
        } catch (error) {
          console.error('Failed to load settings:', error);
        }
      }
      // Mark settings as loaded (even if no saved settings existed)
      setSettingsLoaded(true);
    }
  }, []);
  
  // Save all settings to localStorage whenever they change (but only after initial load)
  useEffect(() => {
    if (typeof window !== 'undefined' && settingsLoaded) {
      const settingsToSave = {
        // Keyboard settings
        shortcuts: keyboardSettings.shortcuts,
        shortcutsEnabled: keyboardSettings.shortcutsEnabled,
        rewindOnPause: keyboardSettings.rewindOnPause,
        
        // Pedal settings
        pedalEnabled,
        continuousPress,
        continuousInterval,
        
        // Auto-detect settings
        autoDetectEnabled,
        autoDetectMode,
        regularDelay,
        enhancedFirstDelay,
        enhancedSecondDelay,
        enhancedResumeDelay
      };
      
      setJsonItem('mediaPlayerSettings', settingsToSave);
      console.log('Saved all media player settings to storage');
    }
  }, [
    settingsLoaded,
    keyboardSettings,
    pedalEnabled,
    continuousPress,
    continuousInterval,
    autoDetectEnabled,
    autoDetectMode,
    regularDelay,
    enhancedFirstDelay,
    enhancedSecondDelay,
    enhancedResumeDelay
  ]); // Run whenever any settings change (but only after settings are loaded)
  

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
    console.log('handleRewind called with seconds:', seconds);
    const mediaElement = showVideo && videoRef.current ? videoRef.current : audioRef.current;
    if (!mediaElement) {
      console.log('No media element found');
      return;
    }
    const newTime = Math.max(0, mediaElement.currentTime - seconds);
    console.log('Setting time from', mediaElement.currentTime, 'to', newTime);
    mediaElement.currentTime = newTime;
  };

  const handleForward = (seconds: number) => {
    console.log('handleForward called with seconds:', seconds);
    const mediaElement = showVideo && videoRef.current ? videoRef.current : audioRef.current;
    if (!mediaElement) {
      console.log('No media element found');
      return;
    }
    // Use mediaElement.duration if duration state is not set
    const maxDuration = duration || mediaElement.duration || 0;
    const newTime = Math.min(maxDuration, mediaElement.currentTime + seconds);
    console.log('Forward: duration=', maxDuration, 'current=', mediaElement.currentTime, 'new=', newTime);
    mediaElement.currentTime = newTime;
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
    console.log('handleShortcutAction called with:', action);
    // Get the active media element (video for video files, audio for audio files)
    const mediaElement = showVideo && videoRef.current ? videoRef.current : audioRef.current;

    if (!mediaElement && action !== 'openSettings' && action !== 'toggleSettings') {
      console.log('No media element available, returning');
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
    console.warn('ACTION MAPPING:', action, '->', mappedAction);  // Using warn to be more visible

    switch (mappedAction) {
      // Playback Control
      case 'playPause':
        if (!mediaElement) {
          return;
        }

        console.log('PlayPause action - current paused state:', mediaElement.paused);

        if (!mediaElement.paused) {
          mediaElement.pause();
          console.log('Paused media');
        } else {
          mediaElement.play()
            .then(() => console.log('Playing media'))
            .catch(err => {
              // Ignore AbortError as it's just a play/pause conflict
              if (err.name !== 'AbortError') {
                console.error('Play failed:', err);
              }
            });
        }
        break;
      case 'stop':
        if (mediaElement) {
          mediaElement.pause();
          mediaElement.currentTime = 0;
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
        if (mediaElement) {
          mediaElement.currentTime = 0;
        }
        break;
      case 'jumpToEnd':
        if (mediaElement) {
          mediaElement.currentTime = duration;
        }
        break;
      
      // Volume & Speed
      case 'volumeUp':
        if (!mediaElement) return;
        // Get current volume from media element to avoid closure issues
        const currentVolumeUp = Math.round(mediaElement.volume * 100);
        const newVolumeUp = Math.min(100, currentVolumeUp + 5); // Increase by 5%
        setVolume(newVolumeUp);
        if (mediaElement) {
          mediaElement.volume = newVolumeUp / 100;
        }
        if (audioRef.current && audioRef.current !== mediaElement) {
          audioRef.current.volume = newVolumeUp / 100;
        }
        if (videoRef.current && videoRef.current !== mediaElement) {
          videoRef.current.volume = newVolumeUp / 100;
        }
        // Track non-zero volume for unmute
        if (newVolumeUp > 0) {
          previousVolumeRef.current = newVolumeUp;
          setIsMuted(false);
        }
        break;
      case 'volumeDown':
        if (!mediaElement) return;
        // Get current volume from media element to avoid closure issues
        const currentVolumeDown = Math.round(mediaElement.volume * 100);
        const newVolumeDown = Math.max(0, currentVolumeDown - 5); // Decrease by 5%
        setVolume(newVolumeDown);
        if (mediaElement) {
          mediaElement.volume = newVolumeDown / 100;
        }
        if (audioRef.current && audioRef.current !== mediaElement) {
          audioRef.current.volume = newVolumeDown / 100;
        }
        if (videoRef.current && videoRef.current !== mediaElement) {
          videoRef.current.volume = newVolumeDown / 100;
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
        if (mediaElement) {
          mediaElement.playbackRate = newSpeedUp;
        }
        break;
      case 'speedDown':
        const newSpeedDown = Math.max(0.5, playbackRate - 0.25);
        setPlaybackRate(newSpeedDown);
        if (mediaElement) {
          mediaElement.playbackRate = newSpeedDown;
        }
        break;
      case 'speedReset':
        resetSpeed();
        break;
      
      // Work Modes
      case 'toggleShortcuts':
        setKeyboardSettings(prev => {
          const newEnabled = !prev.shortcutsEnabled;
          showGlobalStatus('קיצורי מקלדת: ' + (newEnabled ? 'פעילים' : 'כבויים'));
          return { ...prev, shortcutsEnabled: newEnabled };
        });
        break;
      case 'togglePedal':
        setPedalEnabled(prev => {
          const newEnabled = !prev;
          showGlobalStatus('דוושה: ' + (newEnabled ? 'פעילה' : 'כבויה'));
          return newEnabled;
        });
        break;
      case 'toggleAutoDetect':
        setAutoDetectEnabled(prev => {
          const newEnabled = !prev;
          showGlobalStatus('זיהוי אוטומטי: ' + (newEnabled ? 'פעיל' : 'כבוי'));
          return newEnabled;
        });
        break;
      case 'toggleMode':
        // Toggle between regular and enhanced auto-detect modes
        setAutoDetectMode(prev => {
          const newMode = prev === 'regular' ? 'enhanced' : 'regular';
          showGlobalStatus('מצב זיהוי: ' + (newMode === 'regular' ? 'רגיל' : 'משופר'));
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
      
      // Mark Navigation Actions
      case 'previousMark':
      case 'nextMark':
      case 'cyclePlaybackMode':
      case 'loopCurrentMark':
      case 'cycleMarkFilter':
        // Pass these actions to the WaveformCanvas
        if ((window as any).__markNavigationHandler) {
          (window as any).__markNavigationHandler(action);
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
  }, [showVideo, duration, volume, playbackRate, onTimestampCopy, currentTime, isPlaying]);

  // Handle speed icon click with double-click detection
  const speedClickTimerRef = useRef<number | null>(null);
  const handleSpeedIconClick = () => {
    if (speedClickTimerRef.current) {
      // Double click detected
      clearTimeout(speedClickTimerRef.current);
      speedClickTimerRef.current = null;
      resetSpeed();
    } else {
      // Single click - wait to see if it's a double click
      speedClickTimerRef.current = window.setTimeout(() => {
        speedClickTimerRef.current = null;
        cycleSpeed();
      }, 250);
    }
  };

  // Analyze waveform for loaded media with smart strategy
  const analyzeWaveform = useCallback(async (url: string) => {
    // Cancel any existing waveform processing
    if (waveformAbortControllerRef.current) {
      waveformAbortControllerRef.current.abort();
    }
    
    // Create new abort controller for this operation
    const abortController = new AbortController();
    waveformAbortControllerRef.current = abortController;
    
    try {
      setWaveformLoading(true);
      setWaveformProgress(0);
      setWaveformData(null);

      // Get file size to determine strategy
      const fileSize = await getFileSizeFromUrl(url);
      
      // Check cache first (with error handling)
      console.log('Checking waveform cache for:', url);
      try {
        const cachedData = await waveformCache.get(url, fileSize);
        
        if (cachedData) {
          console.log('Using cached waveform data');
          setWaveformData(cachedData);
          setWaveformLoading(false);
          setWaveformProgress(100);
          return;
        }
        
        console.log('No cached waveform found, generating new one');
      } catch (cacheError) {
        console.warn('Cache lookup failed, proceeding with generation:', cacheError);
      }
      
      // If file size detection failed (returns 0), use client-side as fallback
      if (fileSize === 0) {
        console.warn('Could not determine file size, using client-side processing as fallback');
      }
      
      // Check system resources before processing
      const resourceCheck = await checkOperation(OperationType.WAVEFORM, fileSize || 50 * 1024 * 1024);
      console.log('Resource check result:', resourceCheck);
      console.log('File size:', fileSize ? ((fileSize / (1024*1024)).toFixed(1)) + 'MB' : 'unknown');
      
      if (!resourceCheck.safe) {
        // Show warning with callback to proceed
        showWarning(resourceCheck, () => {
          // User chose to continue, proceed with waveform loading
          continueWaveformLoad(url, fileSize, abortController.signal);
        });
        // If user cancels, clean up the loading state
        setWaveformLoading(false);
        setWaveformProgress(0);
        waveformAbortControllerRef.current = null;
        return;
      }
      
      continueWaveformLoad(url, fileSize, abortController.signal);
    } catch (error) {
      console.error('Error loading waveform:', error);
      setWaveformLoading(false);
      setWaveformEnabled(false);
      showGlobalStatus('שגיאה בטעינת צורת גל');
      waveformAbortControllerRef.current = null;
    }
  }, [checkOperation, showWarning]);

  const continueWaveformLoad = useCallback(async (url: string, fileSize: number | null, signal?: AbortSignal) => {
    try {
      // Check for abort signal
      if (signal?.aborted) {
        console.log('Waveform processing aborted before start');
        return;
      }
      
      // Check if it's a blob URL (can't be processed server-side)
      const isBlobUrl = url.startsWith('blob:');
      
      let strategy = getWaveformStrategy(fileSize || 1); // Use 1 byte if 0 to get client strategy
      
      // Note: We'll let blob URLs try server processing if chunked fails
      // The server can handle extracting the actual media path
      
      console.log('File size: ' + (fileSize ? formatFileSize(fileSize) : 'Unknown') + ', using ' + strategy.method + ' method');
      console.log('Waveform strategy details:', strategy);
      
      // Show appropriate message
      setWaveformProgress(1); // Show loading started
      
      // Log operation start for metrics
      const startTime = Date.now();
      const startMemory = (await resourceMonitor.getStatus()).memoryUsed;
      
      // Try processing with the selected method
      let processingMethod = strategy.method;
      
      processWaveform: while (true) {
        switch (processingMethod) {
          case WaveformMethod.CLIENT:
          // Small files: Original client-side processing
          if (!workerManagerRef.current) return;
          
          // Store info for caching after completion
          currentWaveformInfoRef.current = { url, fileSize: fileSize || 0 };
          
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();

          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const decodedData = await audioContext.decodeAudioData(arrayBuffer.slice());

          const channelData = decodedData.getChannelData(0);
          const duration = decodedData.duration;
          
          audioContext.close();

          workerManagerRef.current.analyzeWaveform(channelData.buffer as ArrayBuffer, decodedData.sampleRate, duration);
          break processWaveform;
          
        case WaveformMethod.CHUNKED:
          // Medium files: Process in chunks
          console.log('Starting chunked processing for ' + (formatFileSize(fileSize || 0)) + ' file');
          
          // Check for abort signal
          if (signal?.aborted) {
            console.log('Waveform processing aborted');
            setWaveformLoading(false);
            setWaveformProgress(0);
            return;
          }
          
          const chunkedProcessor = new ChunkedWaveformProcessor({
            onProgress: (progress) => {
              // Check for abort during progress
              if (signal?.aborted) {
                console.log('Waveform processing aborted during progress');
                setWaveformLoading(false);
                setWaveformProgress(0);
                return;
              }
              console.log('Chunked processing progress: ' + progress.toFixed(1) + '%');
              setWaveformProgress(progress);
            },
            // Don't log error here as it will be caught in the try-catch
            onError: (error) => console.log('Chunked processing issue:', error),
            signal // Pass abort signal to processor
          });
          
          try {
            const chunkedResult = await chunkedProcessor.processLargeFile(url);
            console.log('Chunked processing complete:', chunkedResult);
            console.log('Setting waveform data:', chunkedResult);
            setWaveformData(chunkedResult);
            setWaveformLoading(false);
            setWaveformProgress(100);
            // Force re-render by updating a dummy state if needed
            if (chunkedResult && chunkedResult.peaks && chunkedResult.peaks.length > 0) {
              console.log('Waveform data set successfully, peaks:', chunkedResult.peaks.length);
              console.log('waveformLoading after set:', false);
              console.log('waveformData after set:', chunkedResult);
              // Cache the result
              try {
                await waveformCache.set(url, chunkedResult, fileSize || undefined);
              } catch (cacheError) {
                // Silently ignore cache errors - caching is optional
              }
              break processWaveform; // Success, exit while loop
            } else {
              throw new Error('No peaks generated from chunked processing');
            }
          } catch (chunkedError) {
            // Chunked processing failed - this is expected for some formats
            console.log('Chunked processing not supported for this format, using server-side processing');
            
            // Reset progress for server processing
            setWaveformProgress(10);
            
            // Switch to server method and continue loop
            processingMethod = WaveformMethod.SERVER;
            continue processWaveform;
          }
          
        case WaveformMethod.SERVER:
          // Large files: Request from server
          // Note: Server can handle blob URLs by extracting the actual media path
          console.log('Starting server-side waveform generation for', isBlobUrl ? 'blob URL' : 'regular URL');
          
          const fileId = generateFileId(url);
          
          // First, check if waveform already exists on server using status endpoint (no 404 errors!)
          try {
            const statusResponse = await fetch(buildApiUrl(`/api/waveform/status/${fileId}`));
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              if (statusData.ready && statusData.data) {
                console.log('Using existing server-side waveform');
                const waveformData = {
                  peaks: statusData.data.peaks,
                  duration: statusData.data.duration,
                  sampleRate: 44100,
                  resolution: 10
                };
                setWaveformData(waveformData);
                setWaveformLoading(false);
                setWaveformProgress(100);
                // Cache the server waveform locally too (silently fail if caching doesn't work)
                try {
                  await waveformCache.set(url, waveformData, fileSize || undefined);
                } catch (cacheError) {
                  // Silently ignore cache errors - caching is optional
                }
                break processWaveform;
              } else {
                console.log('No existing waveform, generating new one');
              }
            }
          } catch (existingError) {
            // Network error - continue to generation
            console.log('Could not check for existing waveform, generating new one');
          }
          
          // If not found, trigger generation on server
          const generateResponse = await fetch(buildApiUrl('/api/waveform/generate'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
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
          
          // Check generation status first
          const statusData = await generateResponse.json();
          
          // If processing in background (large files), poll for completion
          if (statusData.status === 'processing') {
            let attempts = 0;
            const maxAttempts = 600; // 10 minutes timeout for very large files
            
            while (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between checks
              
              try {
                const waveformResponse = await fetch(buildApiUrl(`/api/waveform/${fileId}`));
                
                if (waveformResponse.ok) {
                  const data = await waveformResponse.json();
                  const waveformData = {
                    peaks: data.peaks,
                    duration: data.duration,
                    sampleRate: data.sampleRate || 44100,
                    resolution: data.resolution || 10
                  };
                  setWaveformData(waveformData);
                  setWaveformLoading(false);
                  setWaveformProgress(100);
                  // Cache the server-generated waveform
                  try {
                    await waveformCache.set(url, waveformData, fileSize || undefined);
                  } catch (cacheError) {
                    // Silently ignore cache errors - caching is optional
                  }
                  break;
                }
              } catch (pollError) {
                console.log('Still processing...', pollError);
              }
              
              attempts++;
              setWaveformProgress(Math.min(95, 20 + (attempts * 0.25))); // Slower progress for large files
            }
            
            if (attempts >= maxAttempts) {
              throw new Error('Waveform generation timeout - file too large');
            }
          } else if (statusData.status === 'completed') {
            // Small files complete immediately
            const waveformResponse = await fetch(buildApiUrl(`/api/waveform/${fileId}`));
            
            if (waveformResponse.ok) {
              const data = await waveformResponse.json();
              const waveformData = {
                peaks: data.peaks,
                duration: data.duration,
                sampleRate: data.sampleRate || 44100,
                resolution: data.resolution || 10
              };
              setWaveformData(waveformData);
              setWaveformLoading(false);
              setWaveformProgress(100);
              // Cache the server-generated waveform (silently fail if caching doesn't work)
              try {
                await waveformCache.set(url, waveformData, fileSize || undefined);
              } catch (cacheError) {
                // Silently ignore cache errors - caching is optional
              }
            } else {
              throw new Error('Failed to retrieve waveform data');
            }
          }
          break processWaveform;
          
        default:
          console.error('Unknown waveform processing method:', processingMethod);
          break processWaveform;
        }
      } // End of while loop
      
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
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log operation failure
      resourceMonitor.logOperation({
        type: OperationType.WAVEFORM,
        timestamp: Date.now(),
        fileSize: 0,
        memoryBefore: 0,
        success: false,
        error: errorMessage
      });
      
      // Show error message to user
      showGlobalStatus('שגיאה בטעינת צורת גל: ' + errorMessage);
    }
  }, []);

  // Helper function to get media ID
  const getMediaId = (media: MediaFile) => {
    // Create a consistent ID from the media name (more stable than URL which can change)
    // Encode it to handle special characters
    return btoa(encodeURIComponent(media.name)).replace(/[^a-zA-Z0-9]/g, '');
  };

  // Helper function to save current position and UI state
  const saveCurrentPosition = useCallback(() => {
    const mediaElement = showVideo && videoRef.current ? videoRef.current : audioRef.current;
    
    // Save if we have a currentMediaId, even without a media element (for UI state persistence)
    if (currentMediaIdRef.current) {
      const position = (mediaElement && !isNaN(mediaElement.currentTime)) ? mediaElement.currentTime : 0;
      const duration = (mediaElement && mediaElement.duration) ? mediaElement.duration : 0;
      
      const positionData = {
        position,
        timestamp: Date.now(),
        duration,
        uiState: {
          volume,
          isMuted,
          playbackRate,
          navigationCollapsed,
          controlsCollapsed,
          slidersCollapsed,
          videoMinimized
        }
      };
      mediaPositionsRef.current.set(currentMediaIdRef.current, positionData);
      
      // Save to localStorage
      try {
        setJsonItem('mediaPosition_' + currentMediaIdRef.current, positionData);
        console.log('💾 Saved position and UI state for ' + currentMediaIdRef.current + ': ' + position + 's', positionData.uiState);
      } catch (e) {
        console.error('Failed to save media position and UI state:', e);
      }
    }
  }, [showVideo, volume, isMuted, playbackRate, navigationCollapsed, controlsCollapsed, slidersCollapsed, videoMinimized]);

  // Load saved positions from localStorage on mount
  useEffect(() => {
    // Load all saved positions
    const loadedPositions = new Map();
    const allKeys = safeLocalStorage.getAllKeys();
    for (const key of allKeys) {
      if (key && key.startsWith('mediaPosition_')) {
        try {
          const mediaId = key.replace('mediaPosition_', '');
          const data = getJsonItem(key, {});
          
          // Clean up old positions (older than 30 days)
          if (data.timestamp && Date.now() - data.timestamp > 30 * 24 * 60 * 60 * 1000) {
            safeLocalStorage.removeItem(key);
          } else {
            loadedPositions.set(mediaId, data);
          }
        } catch (e) {
          console.error('Failed to load position:', e);
        }
      }
    }
    mediaPositionsRef.current = loadedPositions;
  }, []);

  // Save position on unmount or when media changes
  useEffect(() => {
    return () => {
      saveCurrentPosition();
      if (positionSaveIntervalRef.current) {
        clearInterval(positionSaveIntervalRef.current);
      }
    };
  }, [saveCurrentPosition]);

  // Load media
  useEffect(() => {
    console.log('MediaPlayer: Loading media', initialMedia);
    if (initialMedia && audioRef.current) {
      // Save position of previous media before switching
      if (currentMediaIdRef.current) {
        saveCurrentPosition();
      }
      
      const newMediaId = getMediaId(initialMedia);
      currentMediaIdRef.current = newMediaId;

      console.log('MediaPlayer: Setting media source to', initialMedia.url);
      // Reset playback states for new media but DON'T reset currentTime yet
      setDuration(0);
      setIsPlaying(false);
      setIsReady(false);

      const isVideo = initialMedia.type === 'video';
      setShowVideo(isVideo);
      setShowVideoCube(isVideo && !videoMinimized);

      // Only load audio files into audio element, videos go only to video element
      if (!isVideo && audioRef.current) {
        console.log('MediaPlayer: Loading audio file into audio element');
        audioRef.current.src = initialMedia.url;
        audioRef.current.volume = volume / 100; // Initialize volume
        audioRef.current.load(); // Force reload the media
        // Clear video element when switching to audio
        if (videoRef.current) {
          videoRef.current.src = '';
          videoRef.current.load();
        }
      } else if (isVideo) {
        console.log('MediaPlayer: Video file detected, will load into video element only');
        // Clear audio element if it had a source
        if (audioRef.current) {
          audioRef.current.src = '';
          audioRef.current.load();
        }
      }
      
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

      // Automatically analyze waveform in background if waveform is enabled
      if (waveformEnabled) {
        console.log('Starting background waveform processing');
        // Delay slightly to let media load first
        setTimeout(() => {
          if (initialMedia.url) {
            analyzeWaveform(initialMedia.url);
          }
        }, 500);
      }
    }
  }, [initialMedia?.url, initialMedia?.name]); // React to URL and name changes only, not volume
  
  // Track previous media URL to detect changes
  const previousMediaUrlRef = useRef<string | null>(null);
  
  // Debug waveform state
  useEffect(() => {
    console.log('Waveform state changed:', {
      waveformEnabled,
      waveformLoading,
      waveformData: waveformData ? { hasPeaks: !!waveformData.peaks, peaksLength: waveformData.peaks?.length } : null,
      waveformProgress
    });
  }, [waveformEnabled, waveformLoading, waveformData, waveformProgress]);
  
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
  
  // Save UI state when it changes (but only after initial load)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  useEffect(() => {
    // Mark initial load as complete after a short delay to avoid saving during restoration
    const timer = setTimeout(() => {
      setInitialLoadComplete(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);
  
  // Save UI state changes after initial load is complete
  useEffect(() => {
    console.log('UI state change detected:', {
      initialLoadComplete,
      currentMediaId: currentMediaIdRef.current,
      volume,
      isMuted,
      playbackRate,
      navigationCollapsed,
      controlsCollapsed,
      slidersCollapsed,
      videoMinimized
    });
    
    if (initialLoadComplete && currentMediaIdRef.current) {
      console.log('🎛️ UI state changed, saving position with new state');
      saveCurrentPosition();
    } else if (initialLoadComplete && !currentMediaIdRef.current) {
      console.log('⚠️ UI state changed but no media ID available yet');
    } else {
      console.log('⏳ UI state changed but initial load not complete yet');
    }
  }, [volume, isMuted, playbackRate, navigationCollapsed, controlsCollapsed, slidersCollapsed, videoMinimized, initialLoadComplete, saveCurrentPosition]);

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
      if (onDurationChange) {
        onDurationChange(audio.duration);
      }
      setIsReady(true);
      
      // Restore saved position if available
      if (currentMediaIdRef.current) {
        // First try to get from localStorage (in case component was remounted)
        let savedPosition = mediaPositionsRef.current.get(currentMediaIdRef.current);
        
        if (!savedPosition) {
          try {
            savedPosition = getJsonItem('mediaPosition_' + currentMediaIdRef.current, null);
            if (savedPosition) {
              // Update the ref for future use
              if (savedPosition && currentMediaIdRef.current) {
                mediaPositionsRef.current.set(currentMediaIdRef.current, savedPosition);
              }
            }
          } catch (e) {
            console.error('Failed to load position from localStorage:', e);
          }
        }
        
        if (savedPosition && savedPosition.position > 0) {
          // Only restore if duration hasn't changed significantly (within 5%)
          const durationMatch = Math.abs(audio.duration - savedPosition.duration) / audio.duration < 0.05;
          if (durationMatch || savedPosition.duration === 0) {
            console.log('Restoring position for ' + currentMediaIdRef.current + ': ' + savedPosition.position + 's');
            audio.currentTime = savedPosition.position;
            setCurrentTime(savedPosition.position);
          } else {
            console.log('Media duration changed significantly, starting from beginning');
            setCurrentTime(0);
          }
        } else {
          setCurrentTime(0);
        }
        
        // Restore UI state if available
        if (savedPosition && savedPosition.uiState) {
          const uiState = savedPosition.uiState;
          console.log('🔄 Restoring UI state for ' + currentMediaIdRef.current, uiState);
          
          // Restore volume and mute state
          if (typeof uiState.volume === 'number') {
            setVolume(uiState.volume);
            audio.volume = uiState.volume / 100;
          }
          if (typeof uiState.isMuted === 'boolean') {
            setIsMuted(uiState.isMuted);
            audio.muted = uiState.isMuted;
          }
          
          // Restore playback rate
          if (typeof uiState.playbackRate === 'number') {
            setPlaybackRate(uiState.playbackRate);
            audio.playbackRate = uiState.playbackRate;
          }
          
          // Restore collapse states
          if (typeof uiState.navigationCollapsed === 'boolean') {
            setNavigationCollapsed(uiState.navigationCollapsed);
          }
          if (typeof uiState.controlsCollapsed === 'boolean') {
            setControlsCollapsed(uiState.controlsCollapsed);
          }
          if (typeof uiState.slidersCollapsed === 'boolean') {
            setSlidersCollapsed(uiState.slidersCollapsed);
          }
          if (typeof uiState.videoMinimized === 'boolean') {
            setVideoMinimized(uiState.videoMinimized);
          }
        }
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      onTimeUpdate?.(audio.currentTime);
      // Dispatch time update event for other components
      document.dispatchEvent(new CustomEvent('mediaTimeUpdate', { 
        detail: { time: audio.currentTime } 
      }));
    };
    
    const handlePlay = () => {
      setIsPlaying(true);
      
      // Start periodic position saving (every 5 seconds)
      if (positionSaveIntervalRef.current) {
        clearInterval(positionSaveIntervalRef.current);
      }
      positionSaveIntervalRef.current = window.setInterval(() => {
        saveCurrentPosition();
      }, 5000);
    };
    
    const handlePause = () => {
      setIsPlaying(false);
      
      // Stop periodic saving and save current position
      if (positionSaveIntervalRef.current) {
        clearInterval(positionSaveIntervalRef.current);
        positionSaveIntervalRef.current = null;
      }
      saveCurrentPosition();
    };

    const handleEnded = () => {
      setIsPlaying(false);
      
      // Stop periodic saving when media ends
      if (positionSaveIntervalRef.current) {
        clearInterval(positionSaveIntervalRef.current);
        positionSaveIntervalRef.current = null;
      }
      
      // Clear saved position when media completes
      if (currentMediaIdRef.current) {
        mediaPositionsRef.current.delete(currentMediaIdRef.current);
        safeLocalStorage.removeItem('mediaPosition_' + currentMediaIdRef.current);
        console.log('Cleared position for completed media: ' + currentMediaIdRef.current);
      }
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
  }, [onTimeUpdate, saveCurrentPosition]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !showVideo) return;

    // Initialize video volume
    video.volume = volume / 100;
    video.playbackRate = playbackRate;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      if (onDurationChange) {
        onDurationChange(video.duration);
      }
      setIsReady(true);
      
      // Restore saved position if available (same logic as audio)
      if (currentMediaIdRef.current) {
        // First try to get from localStorage (in case component was remounted)
        let savedPosition = mediaPositionsRef.current.get(currentMediaIdRef.current);
        
        if (!savedPosition) {
          try {
            savedPosition = getJsonItem('mediaPosition_' + currentMediaIdRef.current, null);
            if (savedPosition) {
              // Update the ref for future use
              if (savedPosition && currentMediaIdRef.current) {
                mediaPositionsRef.current.set(currentMediaIdRef.current, savedPosition);
              }
            }
          } catch (e) {
            console.error('Failed to load position from localStorage:', e);
          }
        }
        
        if (savedPosition && savedPosition.position > 0) {
          // Only restore if duration hasn't changed significantly (within 5%)
          const durationMatch = Math.abs(video.duration - savedPosition.duration) / video.duration < 0.05;
          if (durationMatch || savedPosition.duration === 0) {
            console.log('Restoring video position for ' + currentMediaIdRef.current + ': ' + savedPosition.position + 's');
            video.currentTime = savedPosition.position;
            setCurrentTime(savedPosition.position);
          } else {
            console.log('Video duration changed significantly, starting from beginning');
            setCurrentTime(0);
          }
        } else {
          setCurrentTime(0);
        }
        
        // Restore UI state if available
        if (savedPosition && savedPosition.uiState) {
          const uiState = savedPosition.uiState;
          console.log('🔄 Restoring UI state for video ' + currentMediaIdRef.current, uiState);
          
          // Restore volume and mute state
          if (typeof uiState.volume === 'number') {
            setVolume(uiState.volume);
            video.volume = uiState.volume / 100;
          }
          if (typeof uiState.isMuted === 'boolean') {
            setIsMuted(uiState.isMuted);
            video.muted = uiState.isMuted;
          }
          
          // Restore playback rate
          if (typeof uiState.playbackRate === 'number') {
            setPlaybackRate(uiState.playbackRate);
            video.playbackRate = uiState.playbackRate;
          }
          
          // Restore collapse states
          if (typeof uiState.navigationCollapsed === 'boolean') {
            setNavigationCollapsed(uiState.navigationCollapsed);
          }
          if (typeof uiState.controlsCollapsed === 'boolean') {
            setControlsCollapsed(uiState.controlsCollapsed);
          }
          if (typeof uiState.slidersCollapsed === 'boolean') {
            setSlidersCollapsed(uiState.slidersCollapsed);
          }
          if (typeof uiState.videoMinimized === 'boolean') {
            setVideoMinimized(uiState.videoMinimized);
          }
        }
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(video.currentTime);
      // Dispatch time update event for other components
      document.dispatchEvent(new CustomEvent('mediaTimeUpdate', { 
        detail: { time: video.currentTime } 
      }));
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
  }, [onTimeUpdate, showVideo]); // Don't re-run on volume/playbackRate changes

  // Listen for seek requests from other components
  useEffect(() => {
    const handleSeekRequest = (event: CustomEvent) => {
      const { time } = event.detail;
      const mediaElement = showVideo && videoRef.current ? videoRef.current : audioRef.current;
      
      // Validate time more strictly to prevent MediaPlayer crashes
      if (mediaElement && typeof time === 'number' && !isNaN(time) && isFinite(time) && time >= 0) {
        console.log('[MediaPlayer] Seeking to valid time:', time);
        mediaElement.currentTime = time;
      } else {
        console.warn('[MediaPlayer] Invalid seek time rejected:', time);
      }
    };
    
    document.addEventListener('seekMedia', handleSeekRequest as EventListener);
    
    return () => {
      document.removeEventListener('seekMedia', handleSeekRequest as EventListener);
    };
  }, [showVideo]);
  
  // Initialize worker manager
  useEffect(() => {
    workerManagerRef.current = new WorkerManager();
    
    // Set up waveform event listeners
    if (workerManagerRef.current) {
      workerManagerRef.current.on('waveform:progress', (progress: number) => {
        setWaveformProgress(progress);
      });

      workerManagerRef.current.on('waveform:complete', async (data: WaveformData) => {
        setWaveformData(data);
        setWaveformLoading(false);
        setWaveformProgress(100);
        
        // Cache the result if we have the info
        if (currentWaveformInfoRef.current && data && data.peaks && data.peaks.length > 0) {
          const { url, fileSize } = currentWaveformInfoRef.current;
          console.log('Caching waveform data for:', url);
          try {
            await waveformCache.set(url, data, fileSize);
          } catch (cacheError) {
            // Silently ignore cache errors - caching is optional
          }
        }
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
  const editTimeoutRef = useRef<number | null>(null);

  const enableTimeEdit = (type: 'current' | 'total') => {
    setEditingTime(type);
    // Keep the original time value
    setEditTimeValue(type === 'current' ? formatTime(currentTime) : formatTime(duration));
    
    // Clear any existing timeout
    if (editTimeoutRef.current) {
      clearTimeout(editTimeoutRef.current);
    }
    
    // Set timeout to cancel editing after 10 seconds
    editTimeoutRef.current = window.setTimeout(() => {
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
      <div className={'media-global-status ' + (globalStatus ? 'visible' : '')} id="mediaGlobalStatus">
        {globalStatus}
      </div>
      
      {/* Media Player Component */}
      <div className={'media-player-container ' + (showVideoCube ? 'video-active' : '')} id="mediaPlayerContainer">
        {/* Media Player Content Wrapper */}
        <div className="media-player-content">
          {/* Hidden Audio Element */}
          <audio ref={audioRef} id="audioPlayer" preload="auto" />
          {/* Video element - always render but hidden */}
          <video
            ref={videoRef}
            style={{
              display: showVideo ? 'none' : 'none',
              position: 'absolute',
              width: '0',
              height: '0',
              pointerEvents: 'none'
            }}
          />
        
        {/* Navigation Section - Project and Media Navigation */}
        <div className={'section-wrapper navigation-wrapper ' + (navigationCollapsed ? 'collapsed' : '')} id="navigationWrapper">
          {/* Collapse/Expand Toggle */}
          <button 
            className="collapse-toggle" 
            id="navigationToggle" 
            title="הסתר/הצג ניווט"
            onClick={() => setNavigationCollapsed(!navigationCollapsed)}
          >
            <span className="collapse-icon">{navigationCollapsed ? '▼' : '▲'}</span>
          </button>
          
          {/* Navigation Content */}
          <div className={'section-content navigation-content ' + (navigationCollapsed ? 'hidden' : '')}>
            <div className="t-project-navigator">
              {/* Project Section - 35% width */}
              <div className="t-nav-section t-project-section-new">
                <button className="t-nav-btn" onClick={onPreviousProject} disabled={currentProject <= 1}>
                  →
                </button>
                <div className="t-nav-info-new">
                  <div className={'t-nav-name-wrapper ' + (projectName && projectName.length > 15 ? 'scrolling' : '')}>
                    <div className={'t-nav-name ' + (projectName && projectName.length > 15 ? (/[֐-׿]/.test(projectName) ? 'scroll-rtl' : 'scroll-ltr') : '')}>
                      {projectName || 'ללא פרויקט'}
                    </div>
                  </div>
                  <div className="t-nav-counter">
                    <span>{currentProject} / {totalProjects}</span>
                  </div>
                </div>
                <button className="t-nav-btn" onClick={onNextProject} disabled={currentProject >= totalProjects}>
                  ←
                </button>
              </div>

              <div className="t-nav-divider"></div>

              {/* Media Section - 65% width */}
              <div className="t-nav-section t-media-section-new">
                <button className="t-nav-btn" onClick={onPreviousMedia} disabled={currentMedia <= 1}>
                  →
                </button>
                <div className="t-nav-info-new">
                  <div className={'t-nav-name-wrapper ' + (mediaName && mediaName.length > 25 ? 'scrolling' : '')}>
                    <div className={'t-nav-name ' + (mediaName && mediaName.length > 25 ? (/[֐-׿]/.test(mediaName) ? 'scroll-rtl' : 'scroll-ltr') : '')}>
                      {mediaName || 'ללא מדיה'}
                    </div>
                    {/* DEBUG: Always log values */}
                    {(() => {
                      if (mediaName) {
                        const isHebrew = /[֐-׿]/.test(mediaName);
                        const scrollClass = mediaName.length > 25 ? (isHebrew ? 'scroll-rtl' : 'scroll-ltr') : 'no-scroll';
                        console.log('[MediaPlayer] mediaName:', mediaName, 'length:', mediaName.length, 'isHebrew:', isHebrew, 'scroll class:', scrollClass);
                      }
                      return null;
                    })()}
                  </div>
                  <div className="t-nav-details">
                    <span className="t-nav-counter">{currentMedia} / {totalMedia}</span>
                    <span className="t-nav-separator">•</span>
                    <span className="t-media-duration">{mediaDuration}</span>
                    <span className="t-nav-separator">•</span>
                    <span className="t-media-size">{mediaSize}</span>
                  </div>
                </div>
                <button className="t-nav-btn" onClick={onNextMedia} disabled={currentMedia >= totalMedia}>
                  ←
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Controls Section Wrapper */}
        <div className={'section-wrapper controls-wrapper ' + (controlsCollapsed ? 'collapsed' : '')} id="controlsWrapper">
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
              
              {/* Settings Button */}
              <button 
                className="control-btn settings-in-controls" 
                id="settingsBtn" 
                title="הגדרות"
                onClick={() => setShowSettings(true)}
              >
                ⚙️
              </button>
              
              {/* Video Restore Button - shown when video is minimized */}
              {videoMinimized && showVideo && (
                <button 
                  className="control-btn video-restore-in-controls" 
                  id="videoRestoreInControlsBtn"
                  onClick={handleVideoRestore}
                  title="שחזר וידאו"
                >
                  🎬
                </button>
              )}
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
              waveformData && waveformData.peaks && waveformData.peaks.length > 0 ? (
                <div className="waveform-progress-wrapper" style={{ flex: 1 }}>
                  <WaveformCanvas
                    waveformData={waveformData}
                    currentTime={currentTime}
                    duration={duration}
                    isPlaying={isPlaying}
                    onSeek={handleWaveformSeek}
                    mediaUrl={initialMedia?.url || ''}
                    marksEnabled={true}
                    onMarkNavigationAction={handleShortcutAction}
                  />
                </div>
              ) : (
                <div 
                  className="waveform-progress-wrapper" 
                  style={{ flex: 1 }}
                >
                  {waveformLoading ? (
                    <div className="waveform-loading-container" style={{ 
                      width: '100%', 
                      position: 'relative',
                      height: '60px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div 
                        className="waveform-progress-fill"
                        style={{ 
                          width: waveformProgress + '%',
                          background: 'linear-gradient(90deg, rgba(32, 201, 151, 0.6) 0%, rgba(23, 162, 184, 0.6) 100%)',
                          height: '100%',
                          transition: 'width 0.3s ease',
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          direction: 'rtl'
                        }}
                      />
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px',
                        zIndex: 10
                      }}>
                        <span style={{
                          color: 'white',
                          fontSize: '14px',
                          fontWeight: '500',
                          textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
                        }}>
                          מעבד צורת גל... {waveformProgress.toFixed(0)}%
                        </span>
                        <button
                          className="waveform-cancel-btn"
                          onClick={() => {
                            // Cancel waveform processing
                            if (waveformAbortControllerRef.current) {
                              waveformAbortControllerRef.current.abort();
                              waveformAbortControllerRef.current = null;
                            }
                            setWaveformLoading(false);
                            setWaveformProgress(0);
                            setWaveformData(null);
                            console.log('Waveform processing cancelled by user');
                          }}
                          style={{
                            background: 'transparent',
                            color: 'white',
                            border: '1px solid rgba(255, 255, 255, 0.5)',
                            borderRadius: '3px',
                            padding: '4px 10px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '400',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.8)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                          }}
                          title="בטל עיבוד צורת גל"
                        >
                          ביטול
                        </button>
                      </div>
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
                        color: 'rgba(255, 255, 255, 0.3)',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        if (initialMedia?.url && !waveformLoading) {
                          analyzeWaveform(initialMedia.url);
                        }
                      }}
                    >
                      {!initialMedia ? 'אין מדיה' : 'לחץ לטעינת צורת גל'}
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
                  style={{ width: progressPercentage + '%' }}
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
              className={'waveform-toggle-btn ' + (waveformEnabled ? 'active' : '') + ' ' + (!initialMedia ? 'disabled' : '')}
              id="waveformToggleBtn" 
              title={
                !initialMedia 
                  ? "טען מדיה כדי להפעיל צורת גל" 
                  : waveformEnabled 
                    ? "החלף לסרגל התקדמות רגיל" 
                    : "החלף לצורת גל"
              }
              disabled={!initialMedia}
              onClick={() => {
                if (!initialMedia) return;
                
                const newEnabled = !waveformEnabled;
                setWaveformEnabled(newEnabled);
                
                // If enabling and we don't have data, analyze
                if (newEnabled && !waveformData && initialMedia.url) {
                  analyzeWaveform(initialMedia.url);
                }
              }}
            >
              ●
            </button>
          </div>
        </div>
        
        {/* Sliders Section Wrapper */}
        <div className={'section-wrapper sliders-wrapper ' + (slidersCollapsed ? 'collapsed' : '')} id="slidersWrapper">
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
                className={'slider-icon ' + (isMuted ? 'muted' : '')} 
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
      <div className={'media-modal-overlay ' + (showSettings ? 'active' : '')} id="modalOverlay">
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
              className={'settings-tab-btn ' + (activeTab === 'shortcuts' ? 'active' : '')} 
              data-tab="shortcuts"
              onClick={() => setActiveTab('shortcuts')}
            >
              קיצורי מקלדת
            </button>
            <button 
              className={'settings-tab-btn ' + (activeTab === 'pedal' ? 'active' : '')} 
              data-tab="pedal"
              onClick={() => setActiveTab('pedal')}
            >
              דוושת רגל
            </button>
            <button 
              className={'settings-tab-btn ' + (activeTab === 'autodetect' ? 'active' : '')} 
              data-tab="autodetect"
              onClick={() => setActiveTab('autodetect')}
            >
              זיהוי אוטומטי
            </button>
          </div>
          
          {/* Modal Content */}
          <div className="settings-modal-content">
            {/* Shortcuts Tab */}
            <div className={'settings-tab-content ' + (activeTab === 'shortcuts' ? 'active' : '')} id="shortcuts-tab">
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
            <div className={'settings-tab-content ' + (activeTab === 'pedal' ? 'active' : '')} id="pedal-tab">
              <PedalTab
                pedalEnabled={pedalEnabled}
                onPedalEnabledChange={setPedalEnabled}
                onPedalAction={handleShortcutAction}
                continuousPress={continuousPress}
                onContinuousPressChange={setContinuousPress}
                continuousInterval={continuousInterval}
                onContinuousIntervalChange={setContinuousInterval}
              />
            </div>
            
            {/* Auto-detect Tab */}
            <div className={'settings-tab-content ' + (activeTab === 'autodetect' ? 'active' : '')} id="autodetect-tab">
              <AutoDetectTab
                autoDetectEnabled={autoDetectEnabled}
                onAutoDetectEnabledChange={setAutoDetectEnabled}
                autoDetectMode={autoDetectMode}
                onModeChange={setAutoDetectMode}
                regularDelay={regularDelay}
                onRegularDelayChange={setRegularDelay}
                enhancedFirstDelay={enhancedFirstDelay}
                onEnhancedFirstDelayChange={setEnhancedFirstDelay}
                enhancedSecondDelay={enhancedSecondDelay}
                onEnhancedSecondDelayChange={setEnhancedSecondDelay}
                enhancedResumeDelay={enhancedResumeDelay}
                onEnhancedResumeDelayChange={setEnhancedResumeDelay}
                isPlaying={isPlaying}
                onPlayPause={togglePlayPause}
                onRewind={handleRewind}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Resource Warning Modal */}
      <ResourceWarningModal
        isOpen={showResourceWarning}
        onClose={() => {
          // Reset waveform state when user cancels
          setWaveformEnabled(false);
          setWaveformLoading(false);
          setWaveformProgress(0);
          // Cancel any ongoing processing
          if (waveformAbortControllerRef.current) {
            waveformAbortControllerRef.current.abort();
            waveformAbortControllerRef.current = null;
          }
          handleCloseWarning();
        }}
        onContinue={handleContinueRisky}
        onUseAlternative={warningData?.alternativeMethod ? handleUseAlternative : undefined}
        data={warningData}
      />

    </>
  );
}