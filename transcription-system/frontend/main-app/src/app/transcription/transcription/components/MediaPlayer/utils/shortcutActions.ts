/**
 * Shortcut Actions Handler
 * Processes keyboard shortcut actions for the MediaPlayer
 */

import { formatTime } from './mediaControls';
import { statusMessages } from './statusManager';

interface ShortcutActionParams {
  action: string;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  duration: number;
  volume: number;
  playbackRate: number;
  currentTime: number;
  isPlaying: boolean;
  setVolume: (volume: number) => void;
  setIsMuted: (muted: boolean) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  setSpeedSliderValue: (value: number) => void;
  handleRewind: (seconds: number) => void;
  handleForward: (seconds: number) => void;
  previousVolumeRef: React.MutableRefObject<number>;
  setShowSettingsModal?: (show: boolean | ((prev: boolean) => boolean)) => void;
  setPedalEnabled?: (enabled: boolean | ((prev: boolean) => boolean)) => void;
  setAutoDetectEnabled?: (enabled: boolean | ((prev: boolean) => boolean)) => void;
  setAutoDetectMode?: (mode: 'regular' | 'enhanced' | ((prev: 'regular' | 'enhanced') => 'regular' | 'enhanced')) => void;
  setSettings?: (updater: (prev: any) => any) => void;
  showGlobalStatus?: (message: string) => void;
  onTimestampCopy?: (timestamp: string) => void;
  setShowVideo?: (show: boolean | ((prev: boolean) => boolean)) => void;
}

// Map pedal actions to shortcut actions
const ACTION_MAP: { [key: string]: string } = {
  'skipBackward2.5': 'rewind2_5',
  'skipForward2.5': 'forward2_5',
  'skipBackward5': 'rewind5',
  'skipForward5': 'forward5',
  'skipBackward10': 'rewind10',
  'skipForward10': 'forward10'
};

export function handleShortcutAction(params: ShortcutActionParams): void {
  const {
    action,
    audioRef,
    duration,
    volume,
    playbackRate,
    currentTime,
    setVolume,
    setIsMuted,
    setIsPlaying,
    setPlaybackRate,
    setSpeedSliderValue,
    handleRewind,
    handleForward,
    previousVolumeRef,
    setShowSettingsModal,
    setPedalEnabled,
    setAutoDetectEnabled,
    setAutoDetectMode,
    setSettings,
    showGlobalStatus,
    onTimestampCopy,
    setShowVideo
  } = params;

  if (!audioRef.current && action !== 'openSettings' && action !== 'toggleSettings') {
    return;
  }

  // Use mapped action if available, otherwise use original
  const mappedAction = ACTION_MAP[action] || action;

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
      // Track non-zero volume for unmute
      if (newVolumeDown > 0) {
        previousVolumeRef.current = newVolumeDown;
      }
      setIsMuted(newVolumeDown === 0);
      break;
      
    case 'mute':
      if (audioRef.current) {
        audioRef.current.muted = !audioRef.current.muted;
        setIsMuted(audioRef.current.muted);
      }
      break;
      
    case 'speedUp':
      if (!audioRef.current) return;
      const newSpeedUp = Math.min(2, playbackRate + 0.25);
      setPlaybackRate(newSpeedUp);
      setSpeedSliderValue(newSpeedUp);
      audioRef.current.playbackRate = newSpeedUp;
      break;
      
    case 'speedDown':
      if (!audioRef.current) return;
      const newSpeedDown = Math.max(0.5, playbackRate - 0.25);
      setPlaybackRate(newSpeedDown);
      setSpeedSliderValue(newSpeedDown);
      audioRef.current.playbackRate = newSpeedDown;
      break;
      
    case 'speedReset':
      if (audioRef.current) {
        audioRef.current.playbackRate = 1;
        setPlaybackRate(1);
        setSpeedSliderValue(1);
      }
      break;
    
    // Toggle Features
    case 'toggleShortcuts':
      if (setSettings) {
        setSettings((prev: any) => {
          const newEnabled = !prev.shortcutsEnabled;
          if (showGlobalStatus) {
            showGlobalStatus(newEnabled ? statusMessages.shortcuts.enabled : statusMessages.shortcuts.disabled);
          }
          return { ...prev, shortcutsEnabled: newEnabled };
        });
      }
      break;
      
    case 'togglePedal':
      if (setPedalEnabled) {
        setPedalEnabled((prev: boolean) => {
          const newEnabled = !prev;
          if (showGlobalStatus) {
            showGlobalStatus(newEnabled ? statusMessages.pedal.enabled : statusMessages.pedal.disabled);
          }
          return newEnabled;
        });
      }
      break;
      
    case 'toggleAutoDetect':
      if (setAutoDetectEnabled) {
        setAutoDetectEnabled((prev: boolean) => {
          const newEnabled = !prev;
          if (showGlobalStatus) {
            showGlobalStatus(newEnabled ? statusMessages.autoDetect.enabled : statusMessages.autoDetect.disabled);
          }
          return newEnabled;
        });
      }
      break;
      
    case 'toggleMode':
      if (setAutoDetectMode) {
        setAutoDetectMode((prev: 'regular' | 'enhanced') => {
          const newMode = prev === 'regular' ? 'enhanced' : 'regular';
          if (showGlobalStatus) {
            showGlobalStatus(statusMessages.autoDetect.modeChanged(newMode));
          }
          return newMode;
        });
      }
      break;
    
    // Settings
    case 'openSettings':
    case 'toggleSettings':
      if (setShowSettingsModal) {
        setShowSettingsModal((prev: boolean) => !prev);
      }
      break;
    
    // Copy timestamp
    case 'copyTimestamp':
      if (onTimestampCopy) {
        const timestamp = formatTime(currentTime);
        onTimestampCopy(timestamp);
      }
      break;
    
    // Mark Navigation - forward to MarksManager
    case 'previousMark':
    case 'nextMark':
    case 'cyclePlaybackMode':
    case 'loopCurrentMark':
    case 'cycleMarkFilter':
      if ((window as any).__markNavigationHandler) {
        (window as any).__markNavigationHandler(action);
      }
      break;
    
    // Waveform Controls
    case 'zoomIn':
    case 'zoomOut':
    case 'resetZoom':
    case 'toggleWaveform':
      // Forward to waveform handler
      if ((window as any).__waveformControlHandler) {
        (window as any).__waveformControlHandler(action);
      }
      break;
    
    // Mark Creation
    case 'addImportantMark':
    case 'addQuestionMark':
    case 'addSectionMark':
    case 'addNoteMark':
    case 'addReviewMark':
    case 'addCustomMark':
      // Forward to mark creation handler
      if ((window as any).__markCreationHandler) {
        (window as any).__markCreationHandler(action);
      }
      break;
    
    // Mark Management
    case 'clearAllMarks':
    case 'exportMarks':
    case 'importMarks':
    case 'toggleMarksMenu':
      // Forward to mark management handler
      if ((window as any).__markManagementHandler) {
        (window as any).__markManagementHandler(action);
      }
      break;
    
    // Video Mode
    case 'toggleVideo':
      if (setShowVideo) {
        setShowVideo((prev: boolean) => !prev);
      }
      break;
      
    case 'toggleFullscreen':
      // Will be implemented when needed
      break;
  }
}