'use client';

import React, { useState, useRef, useEffect } from 'react';
import '../dropdown-menu-template.css';
import './TranscriptionManagementDropdown.css';

interface Transcription {
  id: string;
  name: string;
  mediaId: string;
  mediaName: string;
  number?: number; // For multiple transcriptions per media (1, 2, 3...)
  createdAt: Date;
  wordCount: number;
  isActive: boolean;
  linkedMediaIds?: string[]; // For transcriptions spanning multiple media
}

interface TranscriptionManagementDropdownProps {
  currentTranscriptionId: string;
  currentMediaId: string;
  currentMediaName: string;
  transcriptions: Transcription[];
  onNewTranscription: () => void;
  onClearTranscription: (id: string) => void;
  onLoadFromOtherMedia: () => void;
  onSplitTranscription: () => void;
  onReorderSegments: () => void;
  onTranscriptionSwitch: (id: string) => void;
  onClose?: () => void;
}

export default function TranscriptionManagementDropdown({
  currentTranscriptionId,
  currentMediaId,
  currentMediaName,
  transcriptions,
  onNewTranscription,
  onClearTranscription,
  onLoadFromOtherMedia,
  onSplitTranscription,
  onReorderSegments,
  onTranscriptionSwitch,
  onClose
}: TranscriptionManagementDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Get transcriptions for current media
  const currentMediaTranscriptions = transcriptions.filter(t => t.mediaId === currentMediaId);
  const hasMultipleTranscriptions = currentMediaTranscriptions.length > 1;
  
  // Check if current transcription spans multiple media
  const currentTranscription = transcriptions.find(t => t.id === currentTranscriptionId);
  const isMultiMedia = currentTranscription?.linkedMediaIds && currentTranscription.linkedMediaIds.length > 0;

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 6,
        left: rect.left
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
    onClose?.();
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffHours < 1) return 'עכשיו';
    if (diffHours < 24) return 'לפני ' + diffHours + ' שעות';
    
    return date.toLocaleDateString('he-IL');
  };

  return (
    <>
      <div className="dropdown-container">
        {/* Trigger Button */}
        <button
          ref={triggerRef}
          className={'dropdown-trigger ' + (isOpen ? 'open active' : '')}
          onClick={() => setIsOpen(!isOpen)}
          title="ניהול תמלולים"
        >
          <span className="icon">📑</span>
          <span className="arrow">▼</span>
        </button>
      </div>

      {/* Dropdown Menu - Rendered outside container for proper fixed positioning */}
      {isOpen && (
        <div 
          ref={dropdownRef}
          className={'dropdown-menu transcription-dropdown ' + (isOpen ? 'open' : '')}
          style={{
            top: dropdownPosition.top + 'px',
            left: dropdownPosition.left + 'px'
          }}>
        {/* Header */}
        <div className="dropdown-header">
          <h3 className="dropdown-title">ניהול תמלולים</h3>
        </div>

        {/* Current Media Transcriptions */}
        <div className="dropdown-items">
          {!currentMediaId || !currentMediaName ? (
            <>
              <div className="dropdown-empty">
                <span className="dropdown-empty-icon">📄</span>
                <span className="dropdown-empty-text">אין מדיה נטענת</span>
              </div>
            </>
          ) : currentMediaTranscriptions.length > 0 ? (
            <>
              <div className="dropdown-section">תמלולים למדיה נוכחית</div>
              {currentMediaTranscriptions.map((transcription) => (
                <div
                  key={transcription.id}
                  className={'dropdown-item transcription-item ' + (
                    transcription.id === currentTranscriptionId ? 'active' : ''
                  )}
                  onClick={() => handleAction(() => onTranscriptionSwitch(transcription.id))}
                >
                  <span className="dropdown-item-icon">
                    {transcription.id === currentTranscriptionId ? '✓' : '📄'}
                  </span>
                  <span className="dropdown-item-text">
                    {transcription.name}
                    {transcription.number && ' ' + transcription.number}
                  </span>
                  {transcription.wordCount > 0 && (
                    <span className="dropdown-item-badge">{transcription.wordCount} מילים</span>
                  )}
                </div>
              ))}
            </>
          ) : (
            <div className="dropdown-empty">
              <span className="dropdown-empty-icon">📄</span>
              <span className="dropdown-empty-text">אין תמלולים זמינים</span>
            </div>
          )}

          <div className="dropdown-divider"></div>

          {/* Actions Section */}
          <div className="dropdown-section">פעולות</div>
          
          {/* New Transcription */}
          <div 
            className={'dropdown-item ' + (!currentMediaId ? 'disabled' : '')}
            onClick={() => currentMediaId && handleAction(onNewTranscription)}
          >
            <span className="dropdown-item-icon">➕</span>
            <span className="dropdown-item-text">תמלול חדש למדיה זו</span>
          </div>

          {/* Clear Current Transcription */}
          {currentTranscriptionId && (
            <div 
              className={'dropdown-item ' + (!currentMediaId ? 'disabled' : '')}
              onClick={() => currentMediaId && handleAction(() => onClearTranscription(currentTranscriptionId))}
            >
              <span className="dropdown-item-icon">🗑️</span>
              <span className="dropdown-item-text">נקה תמלול נוכחי</span>
            </div>
          )}

          <div className="dropdown-divider"></div>

          {/* Advanced Actions */}
          <div className="dropdown-section">פעולות מתקדמות</div>

          {/* Load from Other Media */}
          <div 
            className="dropdown-item"
            onClick={() => handleAction(onLoadFromOtherMedia)}
          >
            <span className="dropdown-item-icon">📂</span>
            <span className="dropdown-item-text">טען תמלול ממדיה אחרת</span>
          </div>

          {/* Split Transcription (only if multi-media) */}
          {isMultiMedia && (
            <div 
              className="dropdown-item"
              onClick={() => handleAction(onSplitTranscription)}
            >
              <span className="dropdown-item-icon">✂️</span>
              <span className="dropdown-item-text">פצל תמלול</span>
            </div>
          )}

          {/* Reorder Segments (only if multi-media) */}
          {isMultiMedia && (
            <div 
              className="dropdown-item"
              onClick={() => handleAction(onReorderSegments)}
            >
              <span className="dropdown-item-icon">🔄</span>
              <span className="dropdown-item-text">סדר מחדש קטעים</span>
            </div>
          )}

          {/* Info Section */}
          <div className="dropdown-divider"></div>
          <div className="dropdown-info">
            <div className="info-row">
              <span className="info-label">מדיה:</span>
              <span className={'info-value ' + (!currentMediaName ? 'empty' : '')}>
                {currentMediaName || 'אין מדיה נטענת'}
              </span>
            </div>
            {currentTranscription && isMultiMedia && (
              <div className="info-row">
                <span className="info-label">מדיות מקושרות:</span>
                <span className="info-value">{currentTranscription.linkedMediaIds?.length || 0}</span>
              </div>
            )}
            {currentTranscription && (
              <div className="info-row">
                <span className="info-label">נוצר:</span>
                <span className="info-value">{formatDate(currentTranscription.createdAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Stats */}
        <div className="dropdown-footer">
          <div className="transcription-stats">
            <span>סה"כ {transcriptions.length} תמלולים</span>
            {hasMultipleTranscriptions && (
              <span> • {currentMediaTranscriptions.length} למדיה זו</span>
            )}
          </div>
        </div>
        </div>
      )}
    </>
  );
}