'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import './SearchReplaceModal.css';

interface SearchReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (text: string, options: SearchOptions) => SearchResult[];
  onReplace: (text: string, replacement: string, options: SearchOptions) => void;
  onReplaceAll: (text: string, replacement: string, options: SearchOptions) => void;
  onNavigateResult?: (index: number) => void;
  currentIndex?: number;
  totalMatches?: number;
}

export interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
}

export interface SearchResult {
  blockId: string;
  field: 'speaker' | 'text';
  startIndex: number;
  endIndex: number;
  matchText: string;
}

export default function SearchReplaceModal({
  isOpen,
  onClose,
  onSearch,
  onReplace,
  onReplaceAll,
  onNavigateResult,
  currentIndex = 0,
  totalMatches = 0
}: SearchReplaceModalProps) {
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [options, setOptions] = useState<SearchOptions>({
    caseSensitive: false,
    wholeWord: false,
    useRegex: false
  });
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  
  // Dragging state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchText) {
      const results = onSearch(searchText, options);
      setSearchResults(results);
      setCurrentResultIndex(0);
    } else {
      setSearchResults([]);
    }
  }, [searchText, options, onSearch]);

  const handleReplace = () => {
    if (searchResults.length > 0 && currentResultIndex < searchResults.length) {
      onReplace(searchText, replaceText, options);
      // Re-search after replace
      const results = onSearch(searchText, options);
      setSearchResults(results);
      if (currentResultIndex >= results.length && results.length > 0) {
        setCurrentResultIndex(results.length - 1);
      }
    }
  };

  const handleReplaceAll = () => {
    if (searchResults.length > 0) {
      onReplaceAll(searchText, replaceText, options);
      setSearchResults([]);
      setCurrentResultIndex(0);
    }
  };

  const handleNext = () => {
    if (searchResults.length > 0) {
      const newIndex = (currentResultIndex + 1) % searchResults.length;
      setCurrentResultIndex(newIndex);
      if (onNavigateResult) {
        onNavigateResult(newIndex);
      }
    }
  };

  const handlePrevious = () => {
    if (searchResults.length > 0) {
      const newIndex = currentResultIndex === 0 ? searchResults.length - 1 : currentResultIndex - 1;
      setCurrentResultIndex(newIndex);
      if (onNavigateResult) {
        onNavigateResult(newIndex);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      if (e.shiftKey) {
        handlePrevious();
      } else {
        handleNext();
      }
    } else if (e.key === 'F3') {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrevious();
      } else {
        handleNext();
      }
    }
  };

  // Dragging handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only drag from the header
    if ((e.target as HTMLElement).closest('.search-replace-header')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
      e.preventDefault();
    }
  }, [position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add and remove global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!isOpen) return null;

  return (
    <div 
      ref={modalRef}
      className="search-replace-modal" 
      onKeyDown={handleKeyDown}
      onMouseDown={handleMouseDown}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      <div className="search-replace-header" style={{ cursor: 'grab' }}>
        <h3>חיפוש והחלפה</h3>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="search-replace-body">
        <div className="search-section">
          <label>חפש:</label>
          <input
            ref={searchInputRef}
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="הכנס טקסט לחיפוש..."
            className="search-input"
          />
          <div className="search-nav">
            <button 
              onClick={handlePrevious} 
              disabled={searchResults.length === 0}
              title="קודם (Shift+Enter)"
            >
              ↑
            </button>
            <span className="match-counter" title={searchResults[currentResultIndex]?.matchText || ''}>
              {searchResults.length > 0 
                ? `${currentResultIndex + 1} / ${searchResults.length}`
                : '0 / 0'
              }
            </span>
            <button 
              onClick={handleNext} 
              disabled={searchResults.length === 0}
              title="הבא (Enter)"
            >
              ↓
            </button>
          </div>
        </div>

        <div className="replace-section">
          <label>החלף ב:</label>
          <input
            type="text"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            placeholder="הכנס טקסט להחלפה..."
            className="replace-input"
          />
        </div>

        <div className="options-section">
          <label className="option-checkbox">
            <input
              type="checkbox"
              checked={options.caseSensitive}
              onChange={(e) => setOptions({...options, caseSensitive: e.target.checked})}
            />
            <span>רגיש לאותיות גדולות/קטנות</span>
          </label>
          <label className="option-checkbox">
            <input
              type="checkbox"
              checked={options.wholeWord}
              onChange={(e) => setOptions({...options, wholeWord: e.target.checked})}
            />
            <span>מילה שלמה בלבד</span>
          </label>
          <label className="option-checkbox">
            <input
              type="checkbox"
              checked={options.useRegex}
              onChange={(e) => setOptions({...options, useRegex: e.target.checked})}
            />
            <span>ביטוי רגולרי (Regex)</span>
          </label>
        </div>

        <div className="action-buttons">
          <button 
            className="replace-btn"
            onClick={handleReplace}
            disabled={searchResults.length === 0}
          >
            החלף
          </button>
          <button 
            className="replace-all-btn"
            onClick={handleReplaceAll}
            disabled={searchResults.length === 0}
          >
            החלף הכל
          </button>
          <button 
            className="close-action-btn"
            onClick={onClose}
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}