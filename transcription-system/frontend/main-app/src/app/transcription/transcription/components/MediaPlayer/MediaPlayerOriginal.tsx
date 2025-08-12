'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MediaPlayerState, MediaFile, MediaPlayerSettings, MediaPlayerAPI } from './types';
import { WorkerManager } from './workers/workerManager';
import KeyboardShortcuts, { defaultShortcuts } from './KeyboardShortcuts';
import ShortcutsTab from './ShortcutsTab';
import PedalTab from './PedalTab';
import './MediaPlayer.css';
import './shortcuts-styles.css';
import './pedal-styles.css';

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

  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Collapsible sections
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [slidersCollapsed, setSlidersCollapsed] = useState(false);
  
  // Settings modal
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('shortcuts');
  
  // Video
  const [showVideo, setShowVideo] = useState(false);
  const [videoMinimized, setVideoMinimized] = useState(false);
  
  // Keyboard shortcuts settings
  const [keyboardSettings, setKeyboardSettings] = useState({
    shortcuts: defaultShortcuts || [],
    shortcutsEnabled: true,
    rewindOnPause: { enabled: false, amount: 0.5 }
  });
  
  // Pedal settings
  const [pedalEnabled, setPedalEnabled] = useState(true);

  // Format time
  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Play/Pause
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error('Play failed:', err));
    }
  };

  // Seek functions
  const handleRewind = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - seconds);
  };

  const handleForward = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + seconds);
  };

  // Progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !audioRef.current) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    // RTL: Right is 0%, left is 100%
    const progress = 1 - (x / rect.width);
    audioRef.current.currentTime = progress * duration;
  };

  // Volume control
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    
    if (isMuted) {
      audioRef.current.volume = volume / 100;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  // Speed control
  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSpeed = Number(e.target.value) / 100;
    setPlaybackRate(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
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
    if (!audioRef.current && action !== 'openSettings') return;

    switch (action) {
      // Playback Control
      case 'playPause':
        togglePlayPause();
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
        const newVolumeUp = Math.min(100, volume + 10);
        setVolume(newVolumeUp);
        if (audioRef.current) {
          audioRef.current.volume = newVolumeUp / 100;
        }
        break;
      case 'volumeDown':
        const newVolumeDown = Math.max(0, volume - 10);
        setVolume(newVolumeDown);
        if (audioRef.current) {
          audioRef.current.volume = newVolumeDown / 100;
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
        setKeyboardSettings(prev => ({ ...prev, shortcutsEnabled: !prev.shortcutsEnabled }));
        break;
      case 'togglePedal':
        setPedalEnabled(prev => !prev);
        break;
      case 'toggleAutoDetect':
        // Will be implemented in Stage 3
        console.log('Auto-detect toggle - to be implemented in Stage 3');
        break;
      case 'toggleMode':
        // Will be implemented in Stage 3 - switch between regular and enhanced auto-detect modes
        console.log('Auto-detect mode toggle - to be implemented in Stage 3');
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
        console.log('Fullscreen toggle - to be implemented in Stage 4');
        break;
    }
  }, [togglePlayPause, handleRewind, handleForward, toggleMute, resetSpeed, formatTime, currentTime, duration, volume, playbackRate, onTimestampCopy]);

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

  // Load media
  useEffect(() => {
    if (initialMedia && audioRef.current) {
      audioRef.current.src = initialMedia.url;
      setShowVideo(initialMedia.type === 'video');
    }
  }, [initialMedia]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsReady(true);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      onTimeUpdate?.(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onTimeUpdate]);

  // Initialize worker manager
  useEffect(() => {
    workerManagerRef.current = new WorkerManager();
    
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
      <div className="media-global-status" id="mediaGlobalStatus"></div>
      
      {/* Media Player Component */}
      <div className="media-player-container" id="mediaPlayerContainer">
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
            
            {/* Progress Bar (middle) */}
            <div 
              className="progress-bar-wrapper" 
              id="progressBar"
              ref={progressBarRef}
              onClick={handleProgressClick}
            >
              <div 
                className="progress-fill" 
                id="progressFill" 
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            
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
        
        {/* Video Restore Button (shows when video is minimized) */}
        {videoMinimized && (
          <button 
            className="video-restore-control visible" 
            id="videoRestoreBtn"
            onClick={() => setVideoMinimized(false)}
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
              />
            </div>
            
            {/* Auto-detect Tab */}
            <div className={`settings-tab-content ${activeTab === 'autodetect' ? 'active' : ''}`} id="autodetect-tab">
              <div className="auto-detect-container">
                <div className="media-auto-detect-header">
                  <h3>🎯 זיהוי אוטומטי</h3>
                  <p className="auto-detect-hint">עצירה והפעלה אוטומטית בזמן הקלדה</p>
                </div>
                {/* Auto-detect content will go here */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}