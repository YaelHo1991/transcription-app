'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMediaSync } from './hooks/useMediaSync';
import { TextEditorProps, SyncedMark, EditorPosition } from './types';
import './TextEditor.css';

/**
 * TextEditor Component - Placeholder for text editing functionality
 * This component will be integrated with the MediaPlayer for synchronized transcription
 */
export default function TextEditor({
  mediaPlayerRef,
  marks = [],
  currentTime = 0,
  onSeek,
  onMarkClick,
  enabled = true
}: TextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState<string>('');
  const [cursorPosition, setCursorPosition] = useState<EditorPosition>({ line: 0, column: 0 });
  const [syncEnabled, setSyncEnabled] = useState(true);
  
  // Use the media sync hook for synchronization
  const {
    syncedMarks,
    currentMark,
    navigateToMark,
    insertMarkReference
  } = useMediaSync({
    marks,
    currentTime,
    onSeek
  });

  // Handle text changes
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    // TODO: Implement auto-save and sync logic
  }, []);

  // Handle mark navigation from editor
  const handleMarkNavigation = useCallback((markId: string) => {
    const mark = syncedMarks.find(m => m.id === markId);
    if (mark && onMarkClick) {
      onMarkClick(mark);
      navigateToMark(mark);
    }
  }, [syncedMarks, onMarkClick, navigateToMark]);

  // Insert timestamp at cursor position
  const insertTimestamp = useCallback(() => {
    const timestamp = formatTime(currentTime);
    const newContent = content.slice(0, cursorPosition.column) + 
                      `[${timestamp}] ` + 
                      content.slice(cursorPosition.column);
    handleContentChange(newContent);
  }, [content, cursorPosition, currentTime, handleContentChange]);

  // Auto-scroll to current mark position
  useEffect(() => {
    if (syncEnabled && currentMark && editorRef.current) {
      // TODO: Implement auto-scroll logic
      console.log('Auto-scrolling to mark:', currentMark);
    }
  }, [currentMark, syncEnabled]);

  return (
    <div className="text-editor-container">
      <div className="text-editor-header">
        <h3>עורך טקסט - תמלול</h3>
        <div className="text-editor-controls">
          <button 
            onClick={() => setSyncEnabled(!syncEnabled)}
            className={`sync-button ${syncEnabled ? 'active' : ''}`}
            title={syncEnabled ? 'סנכרון פעיל' : 'סנכרון כבוי'}
          >
            🔄
          </button>
          <button 
            onClick={insertTimestamp}
            className="timestamp-button"
            title="הוסף חותמת זמן"
          >
            ⏱️
          </button>
          <span className="cursor-position">
            שורה {cursorPosition.line + 1}, עמודה {cursorPosition.column + 1}
          </span>
        </div>
      </div>
      
      <div className="text-editor-body">
        <div className="marks-sidebar">
          <h4>סימונים</h4>
          <div className="marks-list">
            {syncedMarks.map(mark => (
              <div 
                key={mark.id}
                className={`mark-item ${currentMark?.id === mark.id ? 'active' : ''}`}
                onClick={() => handleMarkNavigation(mark.id)}
              >
                <span className="mark-time">{formatTime(mark.time)}</span>
                <span className="mark-type">{mark.type}</span>
                {mark.customName && <span className="mark-name">{mark.customName}</span>}
              </div>
            ))}
          </div>
        </div>
        
        <div 
          ref={editorRef}
          className="text-editor-content"
          contentEditable={enabled}
          onInput={(e) => handleContentChange(e.currentTarget.textContent || '')}
          placeholder="התחל להקליד כאן..."
        >
          {content}
        </div>
      </div>
      
      <div className="text-editor-footer">
        <span className="word-count">מילים: {content.split(/\s+/).filter(w => w).length}</span>
        <span className="char-count">תווים: {content.length}</span>
        {currentMark && (
          <span className="current-mark-indicator">
            סימון נוכחי: {currentMark.type} ({formatTime(currentMark.time)})
          </span>
        )}
      </div>
    </div>
  );
}

// Helper function to format time
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}