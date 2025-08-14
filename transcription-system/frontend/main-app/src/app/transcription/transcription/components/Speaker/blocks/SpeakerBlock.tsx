'use client';

import React, { useState, useRef, useEffect } from 'react';
import './SpeakerBlock.css';

export interface SpeakerBlockData {
  id: string;
  code: string;
  name: string;
  description: string;
  color: string;
  count: number;
}

interface SpeakerBlockProps {
  speaker: SpeakerBlockData;
  isActive: boolean;
  isLastBlock: boolean;
  isFirstBlock?: boolean;
  activeField: 'code' | 'name' | 'description';
  cursorAtStart?: boolean;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  onNavigate: (direction: 'prev' | 'next' | 'up' | 'down' | 'code' | 'name' | 'description', cursorAtStart?: boolean) => void;
  onUpdate: (id: string, field: 'code' | 'name' | 'description', value: string) => void;
  onNewBlock: () => void;
  onRemoveBlock: (id: string, deleteNext?: boolean) => void;
  onValidateCode?: (code: string, excludeId: string) => boolean;
  onExitToRemarks?: () => void;
  onToggleSelect?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

export default function SpeakerBlock({
  speaker,
  isActive,
  isLastBlock,
  isFirstBlock = false,
  activeField,
  cursorAtStart,
  isSelected = false,
  isSelectionMode = false,
  onNavigate,
  onUpdate,
  onNewBlock,
  onRemoveBlock,
  onValidateCode,
  onExitToRemarks,
  onToggleSelect,
  onDragStart,
  onDragOver,
  onDrop
}: SpeakerBlockProps) {
  const codeRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const [localCode, setLocalCode] = useState(speaker.code);
  const [localName, setLocalName] = useState(speaker.name);
  const [localDescription, setLocalDescription] = useState(speaker.description);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [codeSuggestion, setCodeSuggestion] = useState('');

  // Sync local state with props when speaker data changes
  useEffect(() => {
    setLocalCode(speaker.code);
    setLocalName(speaker.name);
    setLocalDescription(speaker.description);
  }, [speaker.code, speaker.name, speaker.description]);
  
  // Get suggested code based on name or next available
  const getSuggestedCode = React.useCallback((name?: string): string => {
    // Request available codes from parent
    let availableCode = '';
    const requestEvent = new CustomEvent('getAvailableCode', {
      detail: {
        name: name,
        excludeId: speaker.id,
        callback: (code: string) => {
          availableCode = code;
        }
      }
    });
    document.dispatchEvent(requestEvent);
    return availableCode;
  }, [speaker.id]);
  
  // Update suggestion when name changes or code is empty
  useEffect(() => {
    if (!localCode && !speaker.code) {
      const suggestion = getSuggestedCode(localName);
      setCodeSuggestion(suggestion);
    } else {
      setCodeSuggestion('');
    }
  }, [localName, localCode, speaker.code, getSuggestedCode]);

  // Focus management
  useEffect(() => {
    if (isActive) {
      const targetRef = 
        activeField === 'code' ? codeRef :
        activeField === 'name' ? nameRef :
        descriptionRef;
      
      targetRef.current?.focus();
      
      // If cursorAtStart is true, set cursor to beginning
      if (cursorAtStart) {
        setTimeout(() => {
          if (targetRef.current) {
            (targetRef.current as HTMLInputElement | HTMLTextAreaElement).setSelectionRange(0, 0);
          }
        }, 10);
      }
    }
  }, [isActive, activeField, cursorAtStart]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, field: 'code' | 'name' | 'description') => {
    // Code field navigation
    if (field === 'code') {
      // SPACE key - always navigate to name field (no spaces allowed in code)
      if (e.key === ' ') {
        e.preventDefault();
        // Check for duplicate code before moving
        if (localCode && !validateUniqueCode(localCode)) {
          // Show error - code already exists
          setErrorMessage(`הקוד "${localCode}" כבר קיים`);
          setShowError(true);
          setTimeout(() => {
            setShowError(false);
            setErrorMessage('');
          }, 3000);
          return;
        }
        onNavigate('name');
      } else if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        // Check for duplicate code before navigating to name field
        if (localCode && !validateUniqueCode(localCode)) {
          setErrorMessage(`הקוד "${localCode}" כבר קיים`);
          setShowError(true);
          setTimeout(() => {
            setShowError(false);
            setErrorMessage('');
          }, 3000);
          return;
        }
        onNavigate('name');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        // Check for duplicate code before creating new block
        if (localCode && !validateUniqueCode(localCode)) {
          setErrorMessage(`הקוד "${localCode}" כבר קיים`);
          setShowError(true);
          setTimeout(() => {
            setShowError(false);
            setErrorMessage('');
          }, 3000);
          return;
        }
        onNewBlock();
      } else if (e.key === 'Backspace') {
        const input = e.target as HTMLInputElement;
        if (input.selectionStart === 0 && input.selectionEnd === 0) {
          e.preventDefault();
          // If all fields are empty, delete this block and go to previous block's description
          if (localCode === '' && localName === '' && localDescription === '') {
            onRemoveBlock(speaker.id);
          } else {
            // Otherwise just navigate to previous block's description
            onNavigate('prev');
          }
        }
      } else if (e.key === 'Delete') {
        const input = e.target as HTMLInputElement;
        if (input.selectionStart === input.value.length) {
          e.preventDefault();
          // If at end of code field and it's empty, delete next row
          if (localCode === '' && localName === '' && localDescription === '') {
            onRemoveBlock(speaker.id, true);
          } else {
            // Otherwise navigate to name field with cursor at start
            onNavigate('name', true);
          }
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        // Check for duplicate code before navigating
        if (localCode && !validateUniqueCode(localCode)) {
          setErrorMessage(`הקוד "${localCode}" כבר קיים`);
          setShowError(true);
          setTimeout(() => {
            setShowError(false);
            setErrorMessage('');
          }, 3000);
          return;
        }
        onNavigate('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        // Check for duplicate code before navigating
        if (localCode && !validateUniqueCode(localCode)) {
          setErrorMessage(`הקוד "${localCode}" כבר קיים`);
          setShowError(true);
          setTimeout(() => {
            setShowError(false);
            setErrorMessage('');
          }, 3000);
          return;
        }
        onNavigate('down');
      } else if (e.key === 'ArrowLeft') {
        const input = e.target as HTMLInputElement;
        // In RTL, left arrow at end of text goes to next field
        if (input.selectionStart === input.value.length) {
          e.preventDefault();
          // Check for duplicate code before navigating
          if (localCode && !validateUniqueCode(localCode)) {
            setErrorMessage(`הקוד "${localCode}" כבר קיים`);
            setShowError(true);
            setTimeout(() => {
              setShowError(false);
              setErrorMessage('');
            }, 3000);
            return;
          }
          onNavigate('name');
        }
        // Otherwise let cursor move through text
      } else if (e.key === 'ArrowRight') {
        const input = e.target as HTMLInputElement;
        // In RTL, right arrow at beginning goes to previous field
        if (input.selectionStart === 0) {
          e.preventDefault();
          onNavigate('prev');
        }
        // Otherwise let cursor move through text
      } else if (e.key === 'End') {
        const input = e.target as HTMLInputElement;
        if (input.selectionStart === input.value.length) {
          e.preventDefault();
          // Check for duplicate code before navigating
          if (localCode && !validateUniqueCode(localCode)) {
            setErrorMessage(`הקוד "${localCode}" כבר קיים`);
            setShowError(true);
            setTimeout(() => {
              setShowError(false);
              setErrorMessage('');
            }, 3000);
            return;
          }
          onNavigate('name');
        }
      } else if (e.key === 'Home') {
        const input = e.target as HTMLInputElement;
        if (input.selectionStart === 0) {
          e.preventDefault();
          onNavigate('prev');
        }
      }
    }
    // Name field navigation
    else if (field === 'name') {
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        // Check for duplicate code when leaving name field
        if (localCode && !validateUniqueCode(localCode)) {
          setErrorMessage(`הקוד "${localCode}" כבר קיים`);
          setShowError(true);
          setTimeout(() => {
            setShowError(false);
            setErrorMessage('');
          }, 3000);
          // Go back to code field
          onNavigate('code');
          return;
        }
        onNavigate('description');
      } else if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        onNavigate('code');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onNewBlock();
      } else if (e.key === 'Backspace') {
        const input = e.target as HTMLInputElement;
        if (input.selectionStart === 0 && input.selectionEnd === 0) {
          e.preventDefault();
          // If at beginning of name field, go to code field
          onNavigate('code');
        }
      } else if (e.key === 'Delete') {
        const input = e.target as HTMLInputElement;
        if (input.selectionStart === input.value.length) {
          e.preventDefault();
          // If at end of name field, check if description is empty
          if (localDescription === '') {
            // If description is empty, delete next row
            onRemoveBlock(speaker.id, true);
          } else {
            // Otherwise go to description with cursor at start
            onNavigate('description', true);
          }
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        onNavigate('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onNavigate('down');
      } else if (e.key === 'ArrowLeft') {
        const input = e.target as HTMLInputElement;
        // In RTL, left arrow at end of text goes to next field
        if (input.selectionStart === input.value.length) {
          e.preventDefault();
          onNavigate('description');
        }
        // Otherwise let cursor move through text
      } else if (e.key === 'ArrowRight') {
        const input = e.target as HTMLInputElement;
        // In RTL, right arrow at beginning goes to previous field
        if (input.selectionStart === 0) {
          e.preventDefault();
          onNavigate('code');
        }
        // Otherwise let cursor move through text
      } else if (e.key === 'End') {
        const input = e.target as HTMLInputElement;
        if (input.selectionStart === input.value.length) {
          e.preventDefault();
          onNavigate('description');
        }
      } else if (e.key === 'Home') {
        const input = e.target as HTMLInputElement;
        if (input.selectionStart === 0) {
          e.preventDefault();
          onNavigate('code');
        }
      }
    }
    // Description field navigation
    else if (field === 'description') {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onNewBlock();
      }
      // SHIFT+ENTER allows natural line break in textarea
      else if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        if (isLastBlock && onExitToRemarks) {
          // For last block, exit and go to remarks
          onExitToRemarks();
        } else {
          onNavigate('next');
        }
      } else if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        onNavigate('name');
      } else if (e.key === 'Backspace') {
        const textarea = e.target as HTMLTextAreaElement;
        if (textarea.selectionStart === 0 && textarea.selectionEnd === 0) {
          e.preventDefault();
          // If at beginning of description field, go to name field
          onNavigate('name');
        }
      } else if (e.key === 'Delete') {
        const textarea = e.target as HTMLTextAreaElement;
        if (textarea.selectionStart === textarea.value.length) {
          e.preventDefault();
          // If at end of description field, delete next row
          onRemoveBlock(speaker.id, true);
        }
      } else if (e.key === 'ArrowUp') {
        const textarea = e.target as HTMLTextAreaElement;
        const cursorPos = textarea.selectionStart;
        const textBeforeCursor = textarea.value.substring(0, cursorPos);
        const linesBeforeCursor = textBeforeCursor.split('\n');
        
        if (linesBeforeCursor.length === 1) {
          // We're on the first line, navigate to previous block
          e.preventDefault();
          onNavigate('up');
        }
        // Otherwise let the cursor move naturally within the text
      } else if (e.key === 'ArrowDown') {
        const textarea = e.target as HTMLTextAreaElement;
        const cursorPos = textarea.selectionStart;
        const textAfterCursor = textarea.value.substring(cursorPos);
        const linesAfterCursor = textAfterCursor.split('\n');
        
        if (linesAfterCursor.length === 1 || (linesAfterCursor.length === 2 && linesAfterCursor[1] === '')) {
          // We're on the last line, navigate to next block
          e.preventDefault();
          onNavigate('down');
        }
        // Otherwise let the cursor move naturally within the text
      } else if (e.key === 'ArrowLeft') {
        const textarea = e.target as HTMLTextAreaElement;
        // In RTL, left arrow at end of text goes to next block
        if (textarea.selectionStart === textarea.value.length) {
          e.preventDefault();
          onNavigate('next');
        }
        // Otherwise let cursor move through text
      } else if (e.key === 'ArrowRight') {
        const textarea = e.target as HTMLTextAreaElement;
        // In RTL, right arrow at beginning goes to previous field
        if (textarea.selectionStart === 0) {
          e.preventDefault();
          onNavigate('name');
        }
        // Otherwise let cursor move through text
      } else if (e.key === 'End') {
        const textarea = e.target as HTMLTextAreaElement;
        const cursorPos = textarea.selectionStart;
        const textAfterCursor = textarea.value.substring(cursorPos);
        const nextNewlineIndex = textAfterCursor.indexOf('\n');
        
        if (nextNewlineIndex === -1 && cursorPos === textarea.value.length) {
          // Already at end of last line, navigate to next block
          e.preventDefault();
          onNavigate('next');
        } else if (nextNewlineIndex === -1) {
          // On last line but not at end, go to end
          e.preventDefault();
          textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        } else {
          // Not on last line, go to end of current line
          e.preventDefault();
          const endOfLinePos = cursorPos + nextNewlineIndex;
          textarea.setSelectionRange(endOfLinePos, endOfLinePos);
        }
      } else if (e.key === 'Home') {
        const textarea = e.target as HTMLTextAreaElement;
        const cursorPos = textarea.selectionStart;
        const textBeforeCursor = textarea.value.substring(0, cursorPos);
        const lastNewlineIndex = textBeforeCursor.lastIndexOf('\n');
        
        if (lastNewlineIndex === -1 && cursorPos === 0) {
          // Already at beginning of first line, navigate to name
          e.preventDefault();
          onNavigate('name');
        } else if (lastNewlineIndex === -1) {
          // On first line but not at beginning, go to beginning
          e.preventDefault();
          textarea.setSelectionRange(0, 0);
        } else {
          // On a subsequent line, go to beginning of current line
          e.preventDefault();
          textarea.setSelectionRange(lastNewlineIndex + 1, lastNewlineIndex + 1);
        }
      }
    }
  };

  // Validate unique code
  const validateUniqueCode = (code: string): boolean => {
    if (onValidateCode) {
      return onValidateCode(code, speaker.id);
    }
    return true; // No validation function provided
  };

  // Handle field changes
  const handleCodeChange = (value: string) => {
    // Check if user tried to type a space
    if (value.includes(' ')) {
      // Don't update the value, just navigate to next field
      // Check for duplicate code before navigating
      if (localCode && !validateUniqueCode(localCode)) {
        setErrorMessage(`הקוד "${localCode}" כבר קיים`);
        setShowError(true);
        setTimeout(() => {
          setShowError(false);
          setErrorMessage('');
        }, 3000);
        return;
      }
      onNavigate('name');
      return;
    }
    
    // Allow multiple letters but no spaces
    const code = value.toUpperCase().replace(/\s/g, '');
    
    // Allow typing without immediate validation - only validate on navigation
    setLocalCode(code);
    onUpdate(speaker.id, 'code', code);
    
    // Clear any existing error when typing
    if (showError) {
      setShowError(false);
      setErrorMessage('');
    }
  };

  const handleNameChange = (value: string) => {
    setLocalName(value);
    onUpdate(speaker.id, 'name', value);
  };

  const handleDescriptionChange = (value: string) => {
    setLocalDescription(value);
    onUpdate(speaker.id, 'description', value);
  };
  
  // Auto-resize description textarea
  const handleDescriptionInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
    handleDescriptionChange(textarea.value);
  };
  
  // Auto-resize on mount and when content changes
  useEffect(() => {
    if (descriptionRef.current) {
      const textarea = descriptionRef.current as HTMLTextAreaElement;
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, [localDescription]);

  return (
    <div 
      className={`speaker-block ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''} ${isSelectionMode ? 'selection-mode' : ''}`}
      draggable={!isActive && !isSelectionMode}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {isSelectionMode && (
        <div className="speaker-checkbox-container">
          <input
            type="checkbox"
            className="speaker-checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            title="בחר דובר"
          />
        </div>
      )}
      <div className={`speaker-field ${isActive && activeField === 'code' ? 'active' : ''}`}>
        <input
          ref={codeRef}
          type="text"
          value={localCode}
          onChange={(e) => handleCodeChange(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, 'code')}
          onFocus={() => onNavigate('code')}
          placeholder={codeSuggestion || 'קוד'}
          className="code-input"
          dir="rtl"
          style={{ color: speaker.color }}
        />
      </div>
      
      <div className={`speaker-field ${isActive && activeField === 'name' ? 'active' : ''}`}>
        <input
          ref={nameRef}
          type="text"
          value={localName}
          onChange={(e) => handleNameChange(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, 'name')}
          onFocus={() => onNavigate('name')}
          placeholder="שם דובר"
          className="name-input"
          dir="rtl"
        />
      </div>
      
      <div className={`speaker-field ${isActive && activeField === 'description' ? 'active' : ''}`}>
        <textarea
          ref={descriptionRef as any}
          value={localDescription}
          onChange={handleDescriptionInput}
          onKeyDown={(e) => handleKeyDown(e, 'description')}
          onFocus={() => onNavigate('description')}
          placeholder="תיאור"
          className="description-input"
          dir="rtl"
          rows={1}
          style={{ overflow: 'hidden', resize: 'none' }}
        />
      </div>
      
      <div className="speaker-count">
        {(speaker.code && speaker.name && speaker.count > 0) ? speaker.count : ''}
      </div>
      
      {showError && (
        <div className="speaker-error-tooltip">
          {errorMessage}
        </div>
      )}
    </div>
  );
}