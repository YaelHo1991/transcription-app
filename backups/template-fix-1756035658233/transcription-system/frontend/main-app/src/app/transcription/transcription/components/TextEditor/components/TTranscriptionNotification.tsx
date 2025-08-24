'use client';

import React, { useEffect, useState } from 'react';
import './TTranscriptionNotification.css';

interface TTranscriptionNotificationProps {
  isOpen: boolean;
  onClose: () => void;
  transcriptionCount: number;
  mediaName: string;
  onLoadExisting: (transcriptionNumber: number) => void;
  onCreateNew: () => void;
  existingTranscriptions: Array<{
    transcriptionNumber: number;
    metadata?: {
      lastSaved?: string;
      wordCount?: number;
      blockCount?: number;
    };
  }>;
}

export default function TTranscriptionNotification({
  isOpen,
  onClose,
  transcriptionCount,
  mediaName,
  onLoadExisting,
  onCreateNew,
  existingTranscriptions
}: TTranscriptionNotificationProps) {
  const [selectedTranscription, setSelectedTranscription] = useState<number | null>(null);
  const [autoCloseTimer, setAutoCloseTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Auto-close after 10 seconds if no action taken
      const timer = setTimeout(() => {
        onCreateNew();
        onClose();
      }, 10000);
      setAutoCloseTimer(timer);
    }

    return () => {
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getMessage = () => {
    if (transcriptionCount === 1) {
      return 'נמצא תמלול אחד קיים עבור מדיה זו';
    } else if (transcriptionCount === 2) {
      return 'נמצאו 2 תמלולים קיימים עבור מדיה זו';
    } else {
      return `נמצאו ${transcriptionCount} תמלולים קיימים עבור מדיה זו`;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'לא ידוע';
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleLoadExisting = () => {
    if (selectedTranscription !== null) {
      if (autoCloseTimer) clearTimeout(autoCloseTimer);
      onLoadExisting(selectedTranscription);
      onClose();
    }
  };

  const handleCreateNew = () => {
    if (autoCloseTimer) clearTimeout(autoCloseTimer);
    onCreateNew();
    onClose();
  };

  return (
    <>
      <div className="t-notification-overlay" onClick={handleCreateNew}></div>
      <div className="t-notification-container">
        <div className="t-notification-header">
          <h3>זוהו תמלולים קיימים</h3>
          <button className="t-notification-close" onClick={handleCreateNew}>×</button>
        </div>
        
        <div className="t-notification-body">
          <div className="t-notification-message">
            <span className="t-notification-icon">📁</span>
            <span>{getMessage()}</span>
          </div>
          
          <div className="t-notification-media-name">
            <strong>מדיה:</strong> {mediaName}
          </div>

          {existingTranscriptions.length > 0 && (
            <div className="t-notification-list">
              <h4>בחר תמלול לטעינה:</h4>
              <div className="t-transcription-list">
                {existingTranscriptions.map(trans => (
                  <label 
                    key={trans.transcriptionNumber}
                    className={`t-transcription-item ${selectedTranscription === trans.transcriptionNumber ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="transcription"
                      value={trans.transcriptionNumber}
                      checked={selectedTranscription === trans.transcriptionNumber}
                      onChange={() => setSelectedTranscription(trans.transcriptionNumber)}
                    />
                    <div className="t-transcription-details">
                      <div className="t-transcription-title">
                        תמלול {trans.transcriptionNumber}
                      </div>
                      {trans.metadata && (
                        <div className="t-transcription-meta">
                          <span>📅 {formatDate(trans.metadata.lastSaved)}</span>
                          {trans.metadata.wordCount && (
                            <span> • {trans.metadata.wordCount} מילים</span>
                          )}
                          {trans.metadata.blockCount && (
                            <span> • {trans.metadata.blockCount} בלוקים</span>
                          )}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="t-notification-hint">
            <small>💡 ייווצר תמלול חדש אוטומטית בעוד 10 שניות</small>
          </div>
        </div>
        
        <div className="t-notification-footer">
          <button 
            className="t-btn t-btn-secondary"
            onClick={handleCreateNew}
          >
            צור תמלול חדש
          </button>
          <button 
            className="t-btn t-btn-primary"
            onClick={handleLoadExisting}
            disabled={selectedTranscription === null}
          >
            טען תמלול נבחר
          </button>
        </div>
      </div>
    </>
  );
}