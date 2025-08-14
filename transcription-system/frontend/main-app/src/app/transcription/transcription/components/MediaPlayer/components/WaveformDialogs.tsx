'use client';

import React from 'react';

interface WaveformDialogsProps {
  showCustomMarkDialog: boolean;
  customMarkName: string;
  currentTime: number;
  onCustomMarkNameChange: (name: string) => void;
  onCreateCustomMark: () => void;
  onCloseCustomMarkDialog: () => void;
}

export default function WaveformDialogs({
  showCustomMarkDialog,
  customMarkName,
  currentTime,
  onCustomMarkNameChange,
  onCreateCustomMark,
  onCloseCustomMarkDialog
}: WaveformDialogsProps) {
  
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!showCustomMarkDialog) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="waveform-dialog-backdrop"
        onClick={onCloseCustomMarkDialog}
      />
      
      {/* Dialog */}
      <div className="waveform-dialog">
        <h3 className="waveform-dialog-title">
          סימון מותאם אישית ב-{formatTime(currentTime)}
        </h3>
        
        <input
          type="text"
          value={customMarkName}
          onChange={(e) => onCustomMarkNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onCreateCustomMark();
            } else if (e.key === 'Escape') {
              onCloseCustomMarkDialog();
            }
          }}
          placeholder="הכנס שם לסימון..."
          autoFocus
          className="waveform-dialog-input"
        />
        
        <div className="waveform-dialog-buttons">
          <button
            onClick={onCloseCustomMarkDialog}
            className="waveform-dialog-btn cancel"
          >
            ביטול
          </button>
          <button
            onClick={onCreateCustomMark}
            disabled={!customMarkName.trim()}
            className={`waveform-dialog-btn primary ${!customMarkName.trim() ? 'disabled' : ''}`}
          >
            יצור
          </button>
        </div>
      </div>
    </>
  );
}