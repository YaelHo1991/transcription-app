'use client';

import React, { useState, useRef, useCallback } from 'react';
import { MediaPlayerState } from './types';

interface MediaControlsProps {
  state: MediaPlayerState;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onSpeedChange: (speed: number) => void;
  onSettingsClick: () => void;
  onRewind: (seconds: number) => void;
  onForward: (seconds: number) => void;
}

export default function MediaControls({
  state,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onSpeedChange,
  onSettingsClick,
  onRewind,
  onForward
}: MediaControlsProps) {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showSpeedSlider, setShowSpeedSlider] = useState(false);
  const speedClickTimer = useRef<number | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);

  // Format time display
  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle time display click for seeking
  const handleTimeClick = (type: 'current' | 'total') => {
    if (type === 'current') {
      const input = prompt('קפוץ לזמן (MM:SS או HH:MM:SS):', formatTime(state.currentTime));
      if (input) {
        const parts = input.split(':').map(Number);
        let seconds = 0;
        if (parts.length === 2) {
          seconds = parts[0] * 60 + parts[1];
        } else if (parts.length === 3) {
          seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        if (!isNaN(seconds)) {
          onSeek(Math.min(seconds, state.duration));
        }
      }
    } else {
      // Jump to end
      onSeek(state.duration);
    }
  };

  // Handle progress bar click (RTL aware)
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // RTL: Right is 0%, left is 100%
    const progress = 1 - (x / rect.width);
    const seekTime = progress * state.duration;
    
    onSeek(Math.max(0, Math.min(state.duration, seekTime)));
  };

  // Handle progress bar drag
  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDraggingProgress(true);
    handleProgressClick(e);
  };

  const handleProgressMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingProgress || !progressBarRef.current) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    
    // RTL: Right is 0%, left is 100%
    const progress = 1 - (x / rect.width);
    const seekTime = progress * state.duration;
    
    onSeek(Math.max(0, Math.min(state.duration, seekTime)));
  }, [isDraggingProgress, state.duration, onSeek]);

  const handleProgressMouseUp = useCallback(() => {
    setIsDraggingProgress(false);
  }, []);

  // Add/remove global mouse listeners for dragging
  React.useEffect(() => {
    if (isDraggingProgress) {
      document.addEventListener('mousemove', handleProgressMouseMove);
      document.addEventListener('mouseup', handleProgressMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleProgressMouseMove);
        document.removeEventListener('mouseup', handleProgressMouseUp);
      };
    }
  }, [isDraggingProgress, handleProgressMouseMove, handleProgressMouseUp]);

  // Handle volume icon click
  const handleVolumeIconClick = () => {
    if (state.isMuted || state.volume === 0) {
      onVolumeChange(1);
    } else {
      onVolumeChange(0);
    }
  };

  // Handle speed icon click (single = increment, double = reset)
  const handleSpeedIconClick = () => {
    if (speedClickTimer.current) {
      // Double click - reset to 1x
      clearTimeout(speedClickTimer.current);
      speedClickTimer.current = null;
      onSpeedChange(1);
    } else {
      // Single click - cycle through speeds
      speedClickTimer.current = window.setTimeout(() => {
        speedClickTimer.current = null;
        const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
        const currentIndex = speeds.indexOf(state.playbackRate);
        const nextIndex = (currentIndex + 1) % speeds.length;
        onSpeedChange(speeds[nextIndex]);
      }, 300);
    }
  };

  // Calculate progress percentage (RTL: fills from right to left)
  const progressPercentage = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  return (
    <div className="media-controls">
      {/* Progress Bar */}
      <div 
        ref={progressBarRef}
        className="progress-container"
        onMouseDown={handleProgressMouseDown}
        style={{
          width: '100%',
          height: '8px',
          backgroundColor: 'rgba(15, 76, 76, 0.3)',
          borderRadius: '4px',
          cursor: 'pointer',
          position: 'relative',
          marginBottom: '10px',
          direction: 'rtl'
        }}
      >
        <div 
          className="progress-fill"
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: `${progressPercentage}%`,
            height: '100%',
            backgroundColor: '#26d0ce',
            borderRadius: '4px',
            transition: isDraggingProgress ? 'none' : 'width 0.1s',
            pointerEvents: 'none'
          }}
        />
      </div>

      {/* Time Display */}
      <div className="time-display" style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '10px',
        fontSize: '14px',
        color: '#26d0ce',
        fontFamily: 'monospace'
      }}>
        <span 
          onClick={() => handleTimeClick('current')}
          style={{ cursor: 'pointer' }}
          title="לחץ להזנת זמן"
        >
          {formatTime(state.currentTime)}
        </span>
        <span 
          onClick={() => handleTimeClick('total')}
          style={{ cursor: 'pointer' }}
          title="לחץ לקפיצה לסוף"
        >
          {formatTime(state.duration)}
        </span>
      </div>

      {/* Control Buttons */}
      <div className="control-buttons" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px'
      }}>
        {/* Playback Controls Group */}
        <div className="playback-controls" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={() => onForward(5)}
            className="control-btn"
            title="קדימה 5 שניות"
            style={{
              background: 'transparent',
              border: '1px solid #26d0ce',
              color: '#26d0ce',
              padding: '8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ⏪
          </button>
          
          <button 
            onClick={() => onForward(2.5)}
            className="control-btn"
            title="קדימה 2.5 שניות"
            style={{
              background: 'transparent',
              border: '1px solid #26d0ce',
              color: '#26d0ce',
              padding: '8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ◀◀
          </button>
          
          <button 
            onClick={onPlayPause}
            className="play-pause-btn"
            style={{
              background: 'linear-gradient(135deg, #26d0ce, #1a5d5d)',
              border: 'none',
              color: 'white',
              padding: '12px 20px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '20px',
              boxShadow: '0 2px 8px rgba(38, 208, 206, 0.3)'
            }}
          >
            {state.isPlaying ? '⏸' : '▶'}
          </button>
          
          <button 
            onClick={() => onRewind(2.5)}
            className="control-btn"
            title="אחורה 2.5 שניות"
            style={{
              background: 'transparent',
              border: '1px solid #26d0ce',
              color: '#26d0ce',
              padding: '8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ▶▶
          </button>
          
          <button 
            onClick={() => onRewind(5)}
            className="control-btn"
            title="אחורה 5 שניות"
            style={{
              background: 'transparent',
              border: '1px solid #26d0ce',
              color: '#26d0ce',
              padding: '8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ⏩
          </button>
        </div>

        {/* Sliders Group */}
        <div className="sliders-group" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {/* Volume Control */}
          <div className="volume-control" style={{ position: 'relative' }}>
            <button
              onClick={handleVolumeIconClick}
              onMouseEnter={() => setShowVolumeSlider(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#26d0ce',
                fontSize: '20px',
                cursor: 'pointer'
              }}
            >
              {state.isMuted || state.volume === 0 ? '🔇' : state.volume < 0.5 ? '🔉' : '🔊'}
            </button>
            
            {showVolumeSlider && (
              <div 
                className="volume-slider-container"
                onMouseLeave={() => setShowVolumeSlider(false)}
                style={{
                  position: 'absolute',
                  bottom: '30px',
                  right: '0',
                  background: 'rgba(15, 76, 76, 0.95)',
                  padding: '10px',
                  borderRadius: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}
              >
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={state.volume * 100}
                  onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
                  style={{
                    width: '100px',
                    direction: 'rtl'
                  }}
                />
                <span style={{ color: '#26d0ce', marginRight: '5px', fontSize: '12px' }}>
                  {Math.round(state.volume * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Speed Control */}
          <div className="speed-control" style={{ position: 'relative' }}>
            <button
              onClick={handleSpeedIconClick}
              onMouseEnter={() => setShowSpeedSlider(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#26d0ce',
                fontSize: '16px',
                cursor: 'pointer',
                fontFamily: 'monospace'
              }}
            >
              {state.playbackRate}x
            </button>
            
            {showSpeedSlider && (
              <div 
                className="speed-slider-container"
                onMouseLeave={() => setShowSpeedSlider(false)}
                style={{
                  position: 'absolute',
                  bottom: '30px',
                  right: '0',
                  background: 'rgba(15, 76, 76, 0.95)',
                  padding: '10px',
                  borderRadius: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}
              >
                <input
                  type="range"
                  min="50"
                  max="200"
                  step="25"
                  value={state.playbackRate * 100}
                  onChange={(e) => onSpeedChange(Number(e.target.value) / 100)}
                  style={{
                    width: '100px',
                    direction: 'rtl'
                  }}
                />
                <span style={{ color: '#26d0ce', marginRight: '5px', fontSize: '12px' }}>
                  {state.playbackRate}x
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Settings Button */}
        <button
          onClick={onSettingsClick}
          className="settings-btn"
          style={{
            background: 'transparent',
            border: '1px solid #26d0ce',
            color: '#26d0ce',
            padding: '8px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '18px'
          }}
          title="הגדרות"
        >
          ⚙️
        </button>
      </div>
    </div>
  );
}