'use client';

import React, { useRef, useEffect, useState, KeyboardEvent, FocusEvent } from 'react';
import './TextBlock.css';

export interface TextBlockData {
  id: string;
  speaker: string;
  text: string;
  speakerTime?: number;
}

interface TextBlockProps {
  block: TextBlockData;
  isActive: boolean;
  activeArea: 'speaker' | 'text';
  onNavigate: (direction: 'prev' | 'next' | 'speaker' | 'text') => void;
  onUpdate: (id: string, field: 'speaker' | 'text', value: string) => void;
  onNewBlock: () => void;
  onRemoveBlock: (id: string) => void;
  onSpeakerTransform: (code: string) => Promise<string | null>;
  speakerColor?: string;
  currentTime?: number;
}

export default function TextBlock({
  block,
  isActive,
  activeArea,
  onNavigate,
  onUpdate,
  onNewBlock,
  onRemoveBlock,
  onSpeakerTransform,
  speakerColor = '#333',
  currentTime = 0
}: TextBlockProps) {
  const speakerRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipMessage, setTooltipMessage] = useState('');

  // Focus management
  useEffect(() => {
    if (isActive) {
      const targetRef = activeArea === 'speaker' ? speakerRef : textRef;
      targetRef.current?.focus();
    }
  }, [isActive, activeArea]);

  // Punctuation validation
  const endsWithPunctuation = (text: string): boolean => {
    const punctuationMarks = ['.', ',', '!', '?', ':', ';', '״', '"', "'", ')', ']', '}'];
    return punctuationMarks.some(mark => text.trim().endsWith(mark));
  };

  // Check if character is Hebrew letter
  const isHebrewLetter = (char: string): boolean => {
    const code = char.charCodeAt(0);
    return (code >= 0x05D0 && code <= 0x05EA) || (code >= 0x05F0 && code <= 0x05F4);
  };

  // Check if character is English letter
  const isEnglishLetter = (char: string): boolean => {
    return /^[A-Za-z]$/.test(char);
  };

  // Show inline tooltip
  const displayTooltip = (message: string) => {
    setTooltipMessage(message);
    setShowTooltip(true);
    setTimeout(() => setShowTooltip(false), 3000);
  };

  // Handle speaker keydown
  const handleSpeakerKeyDown = async (e: KeyboardEvent<HTMLSpanElement>) => {
    const target = e.currentTarget;
    const text = target.textContent || '';

    // SPACE - Navigate to text area or next block
    if (e.key === ' ' && !e.shiftKey) {
      e.preventDefault();
      
      // Store speaker timestamp when leaving
      if (currentTime && speakerRef.current) {
        speakerRef.current.setAttribute('data-timestamp', currentTime.toString());
      }
      
      // Move to text area
      onNavigate('text');
      return;
    }

    // TAB - Transform single letter to speaker name
    if (e.key === 'Tab' && !e.shiftKey) {
      if (text.length === 1 && (isHebrewLetter(text) || isEnglishLetter(text))) {
        e.preventDefault();
        const speakerName = await onSpeakerTransform(text);
        if (speakerName) {
          onUpdate(block.id, 'speaker', speakerName);
        } else {
          displayTooltip('דובר חדש נוסף - יש למלא את השם');
        }
      }
    }

    // ENTER - Create new block
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onNewBlock();
    }

    // SHIFT+ENTER - Move to text area
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      onNavigate('text');
    }

    // BACKSPACE - Remove block if empty
    if (e.key === 'Backspace' && !text && !block.text) {
      e.preventDefault();
      onRemoveBlock(block.id);
    }

    // Arrow navigation
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      onNavigate('text');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      onNavigate('prev');
    }
  };

  // Handle text keydown
  const handleTextKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    const target = e.currentTarget;
    const text = target.textContent || '';

    // SPACE in empty text - Navigate to next block
    if (e.key === ' ' && !text.trim()) {
      e.preventDefault();
      onNavigate('next');
      return;
    }

    // TAB - Navigate to next block's speaker
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      onNavigate('next');
    }

    // SHIFT+TAB - Navigate back to speaker
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      onNavigate('speaker');
    }

    // ENTER - Create new block with validation
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      if (text.trim() && !endsWithPunctuation(text)) {
        displayTooltip('הטקסט חייב להסתיים בסימן פיסוק');
        return;
      }
      
      onNewBlock();
    }

    // SHIFT+ENTER - Create new block with validation
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      
      if (text.trim() && !endsWithPunctuation(text)) {
        displayTooltip('הטקסט חייב להסתיים בסימן פיסוק');
        return;
      }
      
      onNewBlock();
    }

    // BACKSPACE - Navigate to speaker if empty
    if (e.key === 'Backspace' && !text) {
      e.preventDefault();
      onNavigate('speaker');
    }

    // Arrow navigation
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      onNavigate('speaker');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onNavigate('next');
    }
  };

  // Handle input for timestamp conversion - DISABLED
  const handleTextInput = (e: React.FormEvent<HTMLSpanElement>) => {
    const text = e.currentTarget.textContent || '';
    
    // DISABLED - No longer converting ... to timestamps
    /*
    // Check for "..." pattern
    if (text.includes('...')) {
      const newText = text.replace('...', ` [${formatTimestamp(currentTime)}] `);
      e.currentTarget.textContent = newText;
      onUpdate(block.id, 'text', newText);
      
      // Move cursor after timestamp
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(e.currentTarget);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    } else {
      onUpdate(block.id, 'text', text);
    }
    */
    
    // Just update the text without any conversion
    onUpdate(block.id, 'text', text);
  };

  // Format timestamp
  const formatTimestamp = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle focus events
  const handleSpeakerFocus = (e: FocusEvent<HTMLSpanElement>) => {
    // Clear any browser-added content
    if (e.currentTarget.innerHTML === '<br>' || e.currentTarget.innerHTML === '&nbsp;') {
      e.currentTarget.innerHTML = '';
    }
  };

  const handleTextFocus = (e: FocusEvent<HTMLSpanElement>) => {
    // Clear any browser-added content
    if (e.currentTarget.innerHTML === '<br>' || e.currentTarget.innerHTML === '&nbsp;') {
      e.currentTarget.innerHTML = '';
    }
  };

  return (
    <div className={`text-block ${isActive ? 'active' : ''}`}>
      <span
        ref={speakerRef}
        className="block-speaker"
        contentEditable
        suppressContentEditableWarning
        style={{ color: speakerColor }}
        data-timestamp={block.speakerTime}
        onKeyDown={handleSpeakerKeyDown}
        onInput={(e) => onUpdate(block.id, 'speaker', e.currentTarget.textContent || '')}
        onFocus={handleSpeakerFocus}
        data-placeholder="דובר"
      >
        {block.speaker}
      </span>
      
      <span className="block-separator">:</span>
      
      <span
        ref={textRef}
        className="block-text"
        contentEditable
        suppressContentEditableWarning
        onKeyDown={handleTextKeyDown}
        onInput={handleTextInput}
        onFocus={handleTextFocus}
        data-placeholder=""
      >
        {block.text}
      </span>
      
      {showTooltip && (
        <div className="text-block-tooltip">
          {tooltipMessage}
        </div>
      )}
    </div>
  );
}