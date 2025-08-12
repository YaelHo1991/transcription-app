'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MediaPlayerState, MediaFile, MediaPlayerSettings, MediaPlayerAPI, WaveformData } from './types';
import WaveformCanvas from './WaveformCanvas';
import MediaControls from './MediaControls';
import SettingsModal from './SettingsModal';
import VideoDisplay from './VideoDisplay';
import { WorkerManager } from './workers/workerManager';
import './MediaPlayer.css';

interface MediaPlayerProps {
  initialMedia?: MediaFile;
  onTimeUpdate?: (time: number) => void;
  onTimestampCopy?: (timestamp: string) => void;
}

export default function MediaPlayer({ initialMedia, onTimeUpdate, onTimestampCopy }: MediaPlayerProps) {
  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const workerManagerRef = useRef<WorkerManager | null>(null);

  // State
  const [state, setState] = useState<MediaPlayerState>({
    isPlaying: false,
    isReady: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    playbackRate: 1,
    isMuted: false,
    isLoading: false
  });

  const [currentMedia, setCurrentMedia] = useState<MediaFile | null>(initialMedia || null);
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [settings, setSettings] = useState<MediaPlayerSettings>(() => {
    // Load settings from localStorage (only on client side)
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('mediaPlayerSettings');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to load settings:', e);
        }
      }
    }
    
    // Default settings
    return {
      shortcuts: [
        { key: 'Space', action: 'playPause', description: 'נגן/השהה', enabled: true },
        { key: 'ArrowLeft', action: 'rewind5', description: 'חזור 5 שניות', enabled: true },
        { key: 'ArrowRight', action: 'forward5', description: 'קדימה 5 שניות', enabled: true },
        { key: 'Shift+ArrowLeft', action: 'rewind2.5', description: 'חזור 2.5 שניות', enabled: true },
        { key: 'Shift+ArrowRight', action: 'forward2.5', description: 'קדימה 2.5 שניות', enabled: true },
        { key: 'm', action: 'toggleMute', description: 'השתק/בטל השתקה', enabled: true },
        { key: 'ArrowUp', action: 'volumeUp', description: 'הגבר עוצמה', enabled: true },
        { key: 'ArrowDown', action: 'volumeDown', description: 'הנמך עוצמה', enabled: true },
        { key: '1', action: 'speed0.5', description: 'מהירות 0.5x', enabled: true },
        { key: '2', action: 'speed1', description: 'מהירות רגילה', enabled: true },
        { key: '3', action: 'speed1.5', description: 'מהירות 1.5x', enabled: true },
        { key: '4', action: 'speed2', description: 'מהירות 2x', enabled: true },
      ],
      autoDetect: {
        enabled: false,
        mode: 'regular',
        firstPauseDelay: 500,
        secondPauseDelay: 1000,
        autoResumeDelay: 1500,
        rewindOnPause: true,
        rewindAmount: 0.5
      },
      pedal: {
        enabled: false,
        connected: false,
        buttonMappings: {
          left: 'forward5',
          middle: 'playPause',
          right: 'rewind5'
        }
      },
      rewindOnPause: {
        enabled: false,
        amount: 0.5,
        source: 'all'
      }
    };
  });

  // Initialize worker manager
  useEffect(() => {
    workerManagerRef.current = new WorkerManager();
    
    // Set up worker message handlers
    workerManagerRef.current.on('waveform:complete', (data: WaveformData) => {
      setWaveformData(data);
    });

    workerManagerRef.current.on('timer:tick', (time: number) => {
      setState(prev => ({ ...prev, currentTime: time }));
      onTimeUpdate?.(time);
    });

    workerManagerRef.current.on('autodetect:action', (action: 'pause' | 'resume') => {
      if (action === 'pause') {
        pause();
      } else {
        play();
      }
    });

    return () => {
      workerManagerRef.current?.terminate();
    };
  }, []);

  // Load media
  const loadMedia = useCallback(async (media: MediaFile) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, isReady: false }));
      setCurrentMedia(media);
      
      const mediaElement = media.type === 'video' ? videoRef.current : audioRef.current;
      if (!mediaElement) return;

      mediaElement.src = media.url;
      
      // Load and analyze waveform
      if (media.type === 'audio' && workerManagerRef.current) {
        const response = await fetch(media.url);
        const arrayBuffer = await response.arrayBuffer();
        
        // Create audio context for sample rate
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        workerManagerRef.current.analyzeWaveform(arrayBuffer, audioContext.sampleRate);
      }

      setShowVideo(media.type === 'video');
      
    } catch (error) {
      console.error('Failed to load media:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Play function
  const play = useCallback(() => {
    const mediaElement = currentMedia?.type === 'video' ? videoRef.current : audioRef.current;
    if (!mediaElement || !state.isReady) return;

    mediaElement.play()
      .then(() => {
        setState(prev => ({ ...prev, isPlaying: true }));
        workerManagerRef.current?.startTimer();
      })
      .catch(error => {
        console.error('Play failed:', error);
      });
  }, [currentMedia, state.isReady]);

  // Pause function
  const pause = useCallback(() => {
    const mediaElement = currentMedia?.type === 'video' ? videoRef.current : audioRef.current;
    if (!mediaElement) return;

    mediaElement.pause();
    setState(prev => ({ ...prev, isPlaying: false }));
    workerManagerRef.current?.stopTimer();

    // Apply rewind on pause if enabled
    if (settings.rewindOnPause.enabled && settings.rewindOnPause.amount > 0) {
      const newTime = Math.max(0, mediaElement.currentTime - settings.rewindOnPause.amount);
      mediaElement.currentTime = newTime;
    }
  }, [currentMedia, settings.rewindOnPause]);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  // Seek function
  const seek = useCallback((time: number) => {
    const mediaElement = currentMedia?.type === 'video' ? videoRef.current : audioRef.current;
    if (!mediaElement) return;

    mediaElement.currentTime = time;
    setState(prev => ({ ...prev, currentTime: time }));
  }, [currentMedia]);

  // Set volume
  const setVolume = useCallback((volume: number) => {
    const mediaElement = currentMedia?.type === 'video' ? videoRef.current : audioRef.current;
    if (!mediaElement) return;

    mediaElement.volume = Math.max(0, Math.min(1, volume));
    setState(prev => ({ ...prev, volume: mediaElement.volume, isMuted: mediaElement.volume === 0 }));
  }, [currentMedia]);

  // Set playback rate
  const setPlaybackRate = useCallback((rate: number) => {
    const mediaElement = currentMedia?.type === 'video' ? videoRef.current : audioRef.current;
    if (!mediaElement) return;

    mediaElement.playbackRate = rate;
    setState(prev => ({ ...prev, playbackRate: rate }));
  }, [currentMedia]);

  // Get timestamp
  const getTimestamp = useCallback(() => {
    const time = state.currentTime;
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }, [state.currentTime]);

  // Setup global API
  useEffect(() => {
    const api: MediaPlayerAPI = {
      play,
      pause,
      togglePlayPause,
      seek,
      setVolume,
      setPlaybackRate,
      loadMedia: (url: string, filename: string) => {
        loadMedia({ url, name: filename, type: url.match(/\.(mp4|webm|ogg|ogv)$/i) ? 'video' : 'audio' });
      },
      getCurrentTime: () => state.currentTime,
      getDuration: () => state.duration,
      openSettings: () => setShowSettings(true),
      closeSettings: () => setShowSettings(false),
      isPlaying: () => state.isPlaying,
      getTimestamp
    };

    (window as any).mediaPlayer = api;

    return () => {
      delete (window as any).mediaPlayer;
    };
  }, [play, pause, togglePlayPause, seek, setVolume, setPlaybackRate, loadMedia, state, getTimestamp]);

  // Handle media element events
  useEffect(() => {
    const mediaElement = currentMedia?.type === 'video' ? videoRef.current : audioRef.current;
    if (!mediaElement) return;

    const handleLoadedMetadata = () => {
      setState(prev => ({
        ...prev,
        duration: mediaElement.duration,
        isReady: true,
        isLoading: false
      }));
    };

    const handleTimeUpdate = () => {
      setState(prev => ({ ...prev, currentTime: mediaElement.currentTime }));
      onTimeUpdate?.(mediaElement.currentTime);
    };

    const handleEnded = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
      workerManagerRef.current?.stopTimer();
    };

    mediaElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    mediaElement.addEventListener('timeupdate', handleTimeUpdate);
    mediaElement.addEventListener('ended', handleEnded);

    return () => {
      mediaElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      mediaElement.removeEventListener('timeupdate', handleTimeUpdate);
      mediaElement.removeEventListener('ended', handleEnded);
    };
  }, [currentMedia, onTimeUpdate]);

  // Load initial media
  useEffect(() => {
    if (initialMedia) {
      loadMedia(initialMedia);
    }
  }, [initialMedia, loadMedia]);

  // Update settings in localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('mediaPlayerSettings', JSON.stringify(settings));
    }
    
    // Update workers with new settings
    if (workerManagerRef.current) {
      workerManagerRef.current.updateAutoDetectSettings(settings.autoDetect);
    }
  }, [settings]);

  return (
    <div className="media-player-container" dir="rtl">
      <audio ref={audioRef} style={{ display: 'none' }} />
      {showVideo && <VideoDisplay videoRef={videoRef as React.RefObject<HTMLVideoElement>} />}
      
      <div className="media-player-main">
        {waveformData && (
          <WaveformCanvas
            waveformData={waveformData}
            currentTime={state.currentTime}
            duration={state.duration}
            isPlaying={state.isPlaying}
            onSeek={seek}
          />
        )}
        
        <MediaControls
          state={state}
          onPlayPause={togglePlayPause}
          onSeek={seek}
          onVolumeChange={setVolume}
          onSpeedChange={setPlaybackRate}
          onSettingsClick={() => setShowSettings(true)}
          onRewind={(seconds) => seek(Math.max(0, state.currentTime - seconds))}
          onForward={(seconds) => seek(Math.min(state.duration, state.currentTime + seconds))}
        />
      </div>

      {showSettings && (
        <SettingsModal
          settings={settings}
          onSettingsChange={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}