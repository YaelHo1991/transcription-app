'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MediaPlayerState, MediaFile, MediaPlayerSettings, MediaPlayerAPI, WaveformData } from './types';
import { WorkerManager } from './workers/workerManager';
import KeyboardShortcuts, { defaultShortcuts } from './components/KeyboardShortcuts';
import ShortcutsTab from './components/SettingsModal/ShortcutsTab';
import PedalTab from './components/SettingsModal/PedalTab';
import AutoDetectTab from './components/SettingsModal/AutoDetectTab';
import VideoCube from './components/VideoCube';
import WaveformCanvas from './components/WaveformCanvas';
import { analyzeWaveform as analyzeWaveformUtil } from './utils/waveformAnalysis';
import { handleShortcutAction as handleShortcutActionUtil } from './utils/shortcutActions';
import { 
  parseTimeString,
  enableTimeEdit as enableTimeEditUtil,
  handleTimeEditChange as handleTimeEditChangeUtil,
  applyTimeEdit,
  cancelTimeEdit
} from './utils/timeEditing';
import * as videoCubeUtils from './utils/videoCubeHandlers';
import { setupMediaEventHandlers } from './utils/mediaEventHandlers';
import { setupWorkerManager } from './utils/workerSetup';
import { 
  formatTime, 
  togglePlayPause as togglePlayPauseUtil,
  handleRewind as handleRewindUtil,
  handleForward as handleForwardUtil,
  handleProgressClick as handleProgressClickUtil,
  getActiveMediaElement,
  applyVolumeToElements,
  applyPlaybackRateToElements,
  jumpToStart as jumpToStartUtil,
  jumpToEnd as jumpToEndUtil
} from './utils/mediaControls';
import {
  handleVolumeChange as handleVolumeChangeUtil,
  toggleMute as toggleMuteUtil,
  getVolumeIcon,
  formatVolumePercentage
} from './utils/volumeControls';
import {
  cycleSpeed as cycleSpeedUtil,
  resetSpeed as resetSpeedUtil,
  handleSpeedChange as handleSpeedChangeUtil,
  formatSpeed,
  SPEED_PRESETS
} from './utils/speedControls';
import {
  loadSettings,
  saveSettings,
  mergeShortcuts,
  DEFAULT_SETTINGS
} from './utils/settingsManager';
import {
  showGlobalStatus as showGlobalStatusUtil,
  statusMessages,
  getStatusMessage
} from './utils/statusManager';
import { resourceMonitor, OperationType } from '@/lib/services/resourceMonitor';
import { useResourceCheck } from '@/hooks/useResourceCheck';
import './MediaPlayer.css';
import './styles/shortcuts.css';
import './styles/pedal.css';
import './styles/autodetect.css';
import './styles/tooltip.css';

interface MediaPlayerProps {
  initialMedia?: MediaFile;
  onTimeUpdate?: (time: number) => void;
  onTimestampCopy?: (timestamp: string) => void;
}

export default function MediaPlayer({ initialMedia, onTimeUpdate, onTimestampCopy }: MediaPlayerProps) {
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
  const [speedSliderValue, setSpeedSliderValue] = useState(100); // Speed slider value (50-200)
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
  
  // Load and merge shortcuts from localStorage on mount
  useEffect(() => {
    const savedSettings = loadSettings();
    
    setKeyboardSettings({
      shortcuts: savedSettings.shortcuts,
      shortcutsEnabled: savedSettings.shortcutsEnabled,
      rewindOnPause: savedSettings.rewindOnPause
    });
    
    // Load other settings
    if (savedSettings.pedalEnabled !== undefined) {
      setPedalEnabled(savedSettings.pedalEnabled);
    }
    if (savedSettings.autoDetectEnabled !== undefined) {
      setAutoDetectEnabled(savedSettings.autoDetectEnabled);
    }
    if (savedSettings.autoDetectMode) {
      setAutoDetectMode(savedSettings.autoDetectMode);
    }
    if (savedSettings.volume !== undefined) {
      setVolume(savedSettings.volume);
      applyVolumeToElements(savedSettings.volume, audioRef, videoRef);
    }
    if (savedSettings.playbackRate !== undefined) {
      setPlaybackRate(savedSettings.playbackRate);
      setSpeedSliderValue(savedSettings.playbackRate * 100);
      applyPlaybackRateToElements(savedSettings.playbackRate, audioRef, videoRef);
    }
  }, []);
  
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
    showGlobalStatusUtil(message, setGlobalStatus);
  };

  // Play/Pause wrapper
  const togglePlayPause = () => {
    const mediaElement = getActiveMediaElement(showVideo, videoRef, audioRef);
    togglePlayPauseUtil(mediaElement);
  };

  // Seek functions wrappers
  const handleRewind = (seconds: number) => {
    const mediaElement = getActiveMediaElement(showVideo, videoRef, audioRef);
    handleRewindUtil(mediaElement, seconds);
  };

  const handleForward = (seconds: number) => {
    const mediaElement = getActiveMediaElement(showVideo, videoRef, audioRef);
    handleForwardUtil(mediaElement, seconds, duration);
  };

  // Progress bar click wrapper
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const mediaElement = getActiveMediaElement(showVideo, videoRef, audioRef);
    handleProgressClickUtil(e, progressBarRef, mediaElement, duration);
  };

  // Volume control
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(e.target.value);
    handleVolumeChangeUtil(newVolume, audioRef, videoRef, setVolume, setIsMuted, previousVolumeRef);
    saveSettings({ volume: newVolume });
  };

  const toggleMute = () => {
    toggleMuteUtil(showVideo, audioRef, videoRef, setVolume, setIsMuted, previousVolumeRef);
  };

  // Speed control
  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSpeed = Number(e.target.value);
    handleSpeedChangeUtil(newSpeed, audioRef, videoRef, setPlaybackRate, setSpeedSliderValue);
    saveSettings({ playbackRate: newSpeed / 100 });
  };

  // Cycle through speed presets
  const cycleSpeed = () => {
    cycleSpeedUtil(playbackRate, audioRef, videoRef, setPlaybackRate, setSpeedSliderValue);
  };

  // Reset speed to normal
  const resetSpeed = () => {
    resetSpeedUtil(audioRef, videoRef, setPlaybackRate, setSpeedSliderValue);
  };

  // Handle keyboard shortcut actions
  const handleShortcutAction = useCallback((action: string) => {
    // Handle toggleWaveform here
    if (action === 'toggleWaveform') {
      const newEnabled = !waveformEnabled;
      setWaveformEnabled(newEnabled);
      
      // If enabling and we don't have data, analyze
      // We'll trigger the analysis through a useEffect instead to avoid circular dependency
      return;
    }
    
    handleShortcutActionUtil({
      action,
      audioRef,
      videoRef,
      duration,
      volume,
      playbackRate,
      currentTime,
      isPlaying,
      setVolume,
      setIsMuted,
      setIsPlaying,
      setPlaybackRate,
      setSpeedSliderValue,
      handleRewind,
      handleForward,
      previousVolumeRef,
      setShowSettingsModal: setShowSettings,
      setPedalEnabled,
      setAutoDetectEnabled,
      setAutoDetectMode,
      setSettings: setKeyboardSettings,
      showGlobalStatus,
      onTimestampCopy,
      setShowVideo
    });
  }, [audioRef, duration, volume, playbackRate, onTimestampCopy, currentTime, isPlaying, handleRewind, handleForward, waveformEnabled]);

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
    await analyzeWaveformUtil({
      url,
      workerManager: workerManagerRef.current,
      setWaveformLoading,
      setWaveformProgress,
      setWaveformData,
      setWaveformEnabled,
      checkOperation,
      showWarning,
      showGlobalStatus,
      resourceMonitor
    });
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
      
      // Don't set onloadeddata handler - let useEffect handle waveform loading
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
            
            // Don't set onloadeddata handler - let useEffect handle waveform loading
            
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
  const handleVideoCubeMinimize = () => videoCubeUtils.handleVideoCubeMinimize(setVideoMinimized, setShowVideoCube);
  const handleVideoCubeClose = () => videoCubeUtils.handleVideoCubeClose(setShowVideoCube, setVideoMinimized);
  const handleVideoRestore = () => videoCubeUtils.handleVideoRestore(setVideoMinimized, setShowVideo, setShowVideoCube);
  const handleVideoCubeRestore = () => videoCubeUtils.handleVideoCubeRestore();

  // Waveform seek handler
  const handleWaveformSeek = useCallback((time: number) => {
    const mediaElement = showVideo && videoRef.current ? videoRef.current : audioRef.current;
    if (mediaElement) {
      mediaElement.currentTime = time;
    }
  }, [showVideo]);

  // Audio event handlers
  useEffect(() => {
    return setupMediaEventHandlers(
      audioRef.current,
      setDuration,
      setIsReady,
      setCurrentTime,
      setIsPlaying,
      onTimeUpdate,
      volume
    );
  }, [onTimeUpdate]);

  // Video event handlers
  useEffect(() => {
    if (!showVideo) return;
    return setupMediaEventHandlers(
      videoRef.current,
      setDuration,
      setIsReady,
      setCurrentTime,
      setIsPlaying,
      onTimeUpdate,
      volume,
      playbackRate
    );
  }, [onTimeUpdate, showVideo, volume, playbackRate]);

  // Initialize worker manager
  useEffect(() => {
    workerManagerRef.current = setupWorkerManager(
      setWaveformProgress,
      setWaveformData,
      setWaveformLoading
    );
    
    return () => {
      workerManagerRef.current?.terminate();
    };
  }, []);

  // Progress percentage (RTL)
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Jump to start
  const jumpToStart = () => jumpToStartUtil(audioRef, setCurrentTime);

  // Jump to end
  const jumpToEnd = () => jumpToEndUtil(audioRef, duration, setCurrentTime);


  // Enable time editing
  const [editingTime, setEditingTime] = useState<'current' | 'total' | null>(null);
  const [editTimeValue, setEditTimeValue] = useState('');
  const editTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const enableTimeEdit = (type: 'current' | 'total') => {
    enableTimeEditUtil(type, currentTime, duration, setEditingTime, setEditTimeValue, editTimeoutRef);
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
    
    handleTimeEditChangeUtil(value, setEditTimeValue, editTimeoutRef);
  };
  
  const handleTimeEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      applyTimeEdit(editingTime, editTimeValue, audioRef, videoRef, showVideo, duration, setCurrentTime, setEditingTime, setEditTimeValue, editTimeoutRef);
      e.preventDefault();
    } else if (e.key === 'Escape') {
      cancelTimeEdit(setEditingTime, setEditTimeValue, editTimeoutRef);
      e.preventDefault();
    }
  };
  
  const handleTimeEditBlur = () => {
    cancelTimeEdit(setEditingTime, setEditTimeValue, editTimeoutRef);
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
        <div className={`section-wrapper controls-wrapper ${controlsCollapsed ? 'collapsed' : ''}`} id="controlsWrapper">
          {/* Collapse/Expand Toggle */}
          <button 
            className="collapse-toggle" 
            id="controlsToggle" 
            data-tooltip="הסתר/הצג פקדי הפעלה"
            onClick={() => setControlsCollapsed(!controlsCollapsed)}
          >
            <span className="toggle-icon">{controlsCollapsed ? '▲' : '▼'}</span>
          </button>
          
          {/* Controls Section */}
          <div className="controls-section" id="controlsSection" style={{ display: controlsCollapsed ? 'none' : 'flex' }}>
            {/* Control Buttons (RTL: rewind on left, forward on right) */}
            <div className="control-buttons">
              {/* Rewind buttons (left side in RTL) */}
              <button className="control-btn" id="rewind5Btn" data-tooltip="אחורה 5 שניות" onClick={() => handleRewind(5)}>
                ➡️
                <span className="skip-amount">5</span>
              </button>
              
              <button className="control-btn" id="rewind2_5Btn" data-tooltip="אחורה 2.5 שניות" onClick={() => handleRewind(2.5)}>
                ➡️
                <span className="skip-amount">2.5</span>
              </button>
              
              {/* Play/Pause Button (center) */}
              <button className="play-pause-btn" id="playPauseBtn" data-tooltip="הפעל/השהה" onClick={togglePlayPause}>
                <span id="playIcon">{isPlaying ? '⏸️' : '▶️'}</span>
              </button>
              
              {/* Forward buttons (right side in RTL) */}
              <button className="control-btn" id="forward2_5Btn" data-tooltip="קדימה 2.5 שניות" onClick={() => handleForward(2.5)}>
                ⬅️
                <span className="skip-amount">2.5</span>
              </button>
              
              <button className="control-btn" id="forward5Btn" data-tooltip="קדימה 5 שניות" onClick={() => handleForward(5)}>
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
                data-tooltip="לחץ לקפיצה להתחלה, קליק ימני לעריכה"
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
                  {waveformLoading || waveformProgress > 0 ? (
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
                data-tooltip="לחץ לקפיצה לסוף, קליק ימני לעריכה"
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
              data-tooltip={waveformEnabled ? "החלף לסרגל התקדמות רגיל" : "החלף לצורת גל"}
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
        <div className={`section-wrapper sliders-wrapper ${slidersCollapsed ? 'collapsed' : ''}`} id="slidersWrapper">
          {/* Collapse/Expand Toggle */}
          <button 
            className="collapse-toggle" 
            id="slidersToggle" 
            data-tooltip="הסתר/הצג בקרות עוצמה ומהירות"
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
                data-tooltip="השתק/בטל השתקה"
                onClick={toggleMute}
              >
                {getVolumeIcon(volume, isMuted)}
              </span>
              <input 
                type="range" 
                className="custom-slider" 
                id="volumeSlider" 
                min="0" 
                max="100" 
                value={isMuted ? 0 : (volume || 0)} 
                data-tooltip="עוצמת קול"
                onChange={handleVolumeChange}
              />
              <span className="slider-value" id="volumeValue">
                {formatVolumePercentage(isMuted ? 0 : volume)}
              </span>
            </div>
            
            {/* Speed Slider */}
            <div className="slider-group">
              <span 
                className="slider-icon" 
                id="speedIcon" 
                data-tooltip="לחץ להחלפת מהירות, לחץ פעמיים לאיפוס"
                onClick={handleSpeedIconClick}
                style={{ cursor: 'pointer' }}
              >⚡</span>
              <input 
                type="range" 
                className="custom-slider" 
                id="speedSlider" 
                min="50" 
                max="200" 
                value={speedSliderValue} 
                step="5" 
                data-tooltip="מהירות הפעלה"
                onChange={handleSpeedChange}
              />
              <span className="slider-value" id="speedValue">
                {formatSpeed(playbackRate)}
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
            data-tooltip="הגדרות"
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
                onShortcutsChange={(shortcuts) => {
                  setKeyboardSettings(prev => ({ ...prev, shortcuts }));
                  saveSettings({ shortcuts });
                }}
                onShortcutsEnabledChange={(enabled) => {
                  setKeyboardSettings(prev => ({ ...prev, shortcutsEnabled: enabled }));
                  saveSettings({ shortcutsEnabled: enabled });
                }}
                onRewindOnPauseChange={(rewindSettings) => {
                  setKeyboardSettings(prev => ({ ...prev, rewindOnPause: rewindSettings }));
                  saveSettings({ rewindOnPause: rewindSettings });
                }}
                showGlobalStatus={showGlobalStatus}
              />
            </div>
            
            {/* Pedal Tab */}
            <div className={`settings-tab-content ${activeTab === 'pedal' ? 'active' : ''}`} id="pedal-tab">
              <PedalTab
                pedalEnabled={pedalEnabled}
                onPedalEnabledChange={(enabled) => {
                  setPedalEnabled(enabled);
                  saveSettings({ pedalEnabled: enabled });
                  showGlobalStatus(getStatusMessage('pedal', enabled));
                }}
                onPedalAction={handleShortcutAction}
              />
            </div>
            
            {/* Auto-detect Tab */}
            <div className={`settings-tab-content ${activeTab === 'autodetect' ? 'active' : ''}`} id="autodetect-tab">
              <AutoDetectTab
                autoDetectEnabled={autoDetectEnabled}
                mode={autoDetectMode}
                onAutoDetectEnabledChange={(enabled) => {
                  setAutoDetectEnabled(enabled);
                  saveSettings({ autoDetectEnabled: enabled });
                  showGlobalStatus(getStatusMessage('autoDetect', enabled));
                }}
                onModeChange={(mode) => {
                  setAutoDetectMode(mode);
                  saveSettings({ autoDetectMode: mode });
                }}
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