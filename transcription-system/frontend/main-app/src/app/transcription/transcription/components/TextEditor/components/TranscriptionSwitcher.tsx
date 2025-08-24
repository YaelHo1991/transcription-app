'use client';

import React, { useState, useEffect, useRef } from 'react';
import './TranscriptionSwitcher.css';

interface Transcription {
  id: string;
  title: string;
  project_id?: string;
  project_name?: string;
  updated_at: string;
  is_current?: boolean;
  media_count: number;
  word_count?: number;
}

interface TranscriptionSwitcherProps {
  currentTranscriptionId?: string;
  onTranscriptionChange?: (transcription: Transcription) => void;
  disabled?: boolean;
}

export default function TranscriptionSwitcher({
  currentTranscriptionId,
  onTranscriptionChange,
  disabled = false
}: TranscriptionSwitcherProps) {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentTranscription, setCurrentTranscription] = useState<Transcription | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load transcriptions on mount
  useEffect(() => {
    loadTranscriptions();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update current transcription when ID changes
  useEffect(() => {
    if (currentTranscriptionId && transcriptions.length > 0) {
      const current = transcriptions.find(t => t.id === currentTranscriptionId);
      setCurrentTranscription(current || null);
    }
  }, [currentTranscriptionId, transcriptions]);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (disabled) return;
      
      // Ctrl+Alt+Left/Right for transcription navigation
      if (event.ctrlKey && event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        event.preventDefault();
        navigateTranscription(event.key === 'ArrowLeft' ? 'prev' : 'next');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [transcriptions, currentTranscription, disabled]);

  const loadTranscriptions = async () => {
    try {
      setLoading(true);
      // For now, use mock data. In real implementation, this would fetch from API
      const mockTranscriptions: Transcription[] = [
        {
          id: 'trans-1',
          title: 'ראיון חלק 1',
          project_name: 'פרויקט ראיונות',
          updated_at: new Date().toISOString(),
          is_current: currentTranscriptionId === 'trans-1',
          media_count: 1,
          word_count: 1234
        },
        {
          id: 'trans-2',
          title: 'ראיון חלק 2',
          project_name: 'פרויקט ראיונות',
          updated_at: new Date(Date.now() - 3600000).toISOString(),
          is_current: currentTranscriptionId === 'trans-2',
          media_count: 1,
          word_count: 856
        },
        {
          id: 'trans-3',
          title: 'טיוטה',
          project_name: 'פרויקט ראיונות',
          updated_at: new Date(Date.now() - 7200000).toISOString(),
          is_current: currentTranscriptionId === 'trans-3',
          media_count: 2,
          word_count: 567
        }
      ];

      setTranscriptions(mockTranscriptions);
      
      // Set current transcription if not already set
      if (currentTranscriptionId) {
        const current = mockTranscriptions.find(t => t.id === currentTranscriptionId);
        setCurrentTranscription(current || mockTranscriptions[0]);
      } else {
        setCurrentTranscription(mockTranscriptions[0]);
      }
    } catch (error) {
      console.error('Failed to load transcriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateTranscription = (direction: 'prev' | 'next') => {
    if (!currentTranscription || transcriptions.length === 0) return;

    const currentIndex = transcriptions.findIndex(t => t.id === currentTranscription.id);
    if (currentIndex === -1) return;

    let newIndex;
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : transcriptions.length - 1;
    } else {
      newIndex = currentIndex < transcriptions.length - 1 ? currentIndex + 1 : 0;
    }

    const newTranscription = transcriptions[newIndex];
    handleTranscriptionSelect(newTranscription);
  };

  const handleTranscriptionSelect = (transcription: Transcription) => {
    if (transcription.id === currentTranscription?.id) {
      setIsOpen(false);
      return;
    }

    setCurrentTranscription(transcription);
    setIsOpen(false);
    
    if (onTranscriptionChange) {
      onTranscriptionChange(transcription);
    }
  };

  const handleNewTranscription = () => {
    setIsOpen(false);
    // Dispatch event to open New Transcription modal
    document.dispatchEvent(new CustomEvent('openNewTranscriptionModal'));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'עכשיו';
    if (diffMins < 60) return 'לפני ' + diffMins + ' דק\'';
    if (diffHours < 24) return 'לפני ' + diffHours + ' שעות';
    if (diffDays < 7) return 'לפני ' + diffDays + ' ימים';
    
    return date.toLocaleDateString('he-IL');
  };

  return (
    <div className="transcription-switcher-compact" ref={dropdownRef}>
      <div className="transcription-dropdown-compact">
        <div className="dropdown-header">
          <span className="dropdown-title">בחר תמלול</span>
          <span className="keyboard-hint">Ctrl+Alt+←/→</span>
        </div>
        
        <div className="transcription-list">
          {loading ? (
            <div className="loading-item">טוען תמלולים...</div>
          ) : transcriptions.length === 0 ? (
            <div className="empty-item">אין תמלולים זמינים</div>
          ) : (
            transcriptions.map((transcription) => (
              <div
                key={transcription.id}
                className={'transcription-item ' + (
                  transcription.id === currentTranscription?.id ? 'current' : ''
                )}
                onClick={() => handleTranscriptionSelect(transcription)}
              >
                <div className="item-main">
                  <div className="item-title">
                    {transcription.title}
                    {transcription.id === currentTranscription?.id && (
                      <span className="current-indicator">✓</span>
                    )}
                  </div>
                  <div className="item-meta">
                    {transcription.project_name && (
                      <span className="item-project">{transcription.project_name}</span>
                    )}
                    <span className="item-stats">
                      {transcription.word_count} מילים · {transcription.media_count} קבצים
                    </span>
                  </div>
                </div>
                <div className="item-time">
                  {formatDate(transcription.updated_at)}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="dropdown-footer">
          <button
            className="new-transcription-btn"
            onClick={handleNewTranscription}
          >
            <span className="btn-icon">📄</span>
            <span className="btn-text">תמלול חדש</span>
          </button>
        </div>
      </div>
    </div>
  );
}