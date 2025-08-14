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
  const [textDirection, setTextDirection] = useState<'rtl' | 'ltr'>('rtl');
  const [speakerDirection, setSpeakerDirection] = useState<'rtl' | 'ltr'>('rtl');
  const [currentInputMode, setCurrentInputMode] = useState<'rtl' | 'ltr'>('rtl');
  
  // Detect character direction
  const isHebrewChar = (char: string): boolean => {
    return /[\u0590-\u05FF]/.test(char);
  };
  
  const isEnglishChar = (char: string): boolean => {
    return /[A-Za-z]/.test(char);
  };
  
  // Detect direction at cursor position
  const detectDirectionAtCursor = (element: HTMLElement): 'rtl' | 'ltr' => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 'rtl';
    
    const range = selection.getRangeAt(0);
    const text = element.textContent || '';
    const cursorPos = range.startOffset;
    
    // Check character before cursor
    if (cursorPos > 0 && text[cursorPos - 1]) {
      const prevChar = text[cursorPos - 1];
      if (isHebrewChar(prevChar)) return 'rtl';
      if (isEnglishChar(prevChar)) return 'ltr';
    }
    
    // Check character after cursor
    if (cursorPos < text.length && text[cursorPos]) {
      const nextChar = text[cursorPos];
      if (isHebrewChar(nextChar)) return 'rtl';
      if (isEnglishChar(nextChar)) return 'ltr';
    }
    
    // Default to RTL
    return 'rtl';
  };
  
  // Detect if text is primarily Hebrew/Arabic (RTL) or Latin (LTR)
  const detectTextDirection = (text: string): 'rtl' | 'ltr' => {
    if (!text || text.length === 0) return 'rtl'; // Default to RTL for Hebrew
    
    // Get the first meaningful character to determine initial direction
    const firstChar = text.trim()[0];
    if (firstChar) {
      // Check if first character is Hebrew/Arabic
      if (/[\u0590-\u05FF\u0600-\u06FF]/.test(firstChar)) {
        return 'rtl';
      }
      // Check if first character is Latin
      if (/[A-Za-z]/.test(firstChar)) {
        return 'ltr';
      }
    }
    
    // If no clear first character, count all chars
    const rtlChars = (text.match(/[\u0590-\u05FF\u0600-\u06FF]/g) || []).length;
    const ltrChars = (text.match(/[A-Za-z]/g) || []).length;
    
    // If more RTL chars or equal, use RTL
    return rtlChars >= ltrChars ? 'rtl' : 'ltr';
  };

  // Initialize directions based on existing content
  useEffect(() => {
    setTextDirection(detectTextDirection(block.text));
    setSpeakerDirection(detectTextDirection(block.speaker));
  }, [block.text, block.speaker]);
  
  // Set initial content and direction
  useEffect(() => {
    if (speakerRef.current && block.speaker) {
      speakerRef.current.textContent = block.speaker;
      speakerRef.current.dir = 'rtl';
      speakerRef.current.style.direction = 'rtl';
      speakerRef.current.style.textAlign = 'right';
    }
    if (textRef.current && block.text) {
      textRef.current.textContent = block.text;
      textRef.current.dir = 'rtl';
      textRef.current.style.direction = 'rtl';
      textRef.current.style.textAlign = 'right';
    }
  }, []);

  // Focus management
  useEffect(() => {
    if (isActive) {
      const targetRef = activeArea === 'speaker' ? speakerRef : textRef;
      targetRef.current?.focus();
      
      // Force RTL direction
      if (targetRef.current) {
        targetRef.current.dir = 'rtl';
        targetRef.current.style.direction = 'rtl';
        targetRef.current.style.textAlign = 'right';
        targetRef.current.setAttribute('dir', 'rtl');
        
        // Move cursor to end for RTL
        const selection = window.getSelection();
        const range = document.createRange();
        if (targetRef.current.childNodes.length > 0) {
          range.selectNodeContents(targetRef.current);
          range.collapse(false);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }
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
    const target = e.currentTarget as HTMLDivElement;
    const text = target.textContent || '';

    // END key - Move to end of line and switch to RTL
    if (e.key === 'End') {
      // Let default END behavior happen first
      setTimeout(() => {
        // Switch to RTL mode
        setCurrentInputMode('rtl');
        target.dir = 'rtl';
        target.style.direction = 'rtl';
        target.style.textAlign = 'right';
        target.classList.remove('ltr-mode');
        target.classList.add('rtl-mode');
        
        // Insert invisible RTL mark to force RTL
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rtlMark = document.createTextNode('\u200F');
          range.insertNode(rtlMark);
          range.setStartAfter(rtlMark);
          range.setEndAfter(rtlMark);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }, 0);
      return;
    }
    
    // HOME key - Move to start and detect language
    if (e.key === 'Home') {
      e.preventDefault();
      
      // Move cursor to start
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(target);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
      
      // Detect language at position
      const mode = detectDirectionAtCursor(target);
      setCurrentInputMode(mode);
      target.dir = mode;
      target.classList.toggle('rtl-mode', mode === 'rtl');
      target.classList.toggle('ltr-mode', mode === 'ltr');
      return;
    }
    
    // Detect language when typing letters
    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      // Check if it's a Hebrew character
      if (/[\u0590-\u05FF]/.test(e.key)) {
        if (currentInputMode !== 'rtl' || target.dir !== 'rtl') {
          setCurrentInputMode('rtl');
          target.dir = 'rtl';
          target.style.direction = 'rtl';
          target.style.textAlign = 'right';
          target.classList.remove('ltr-mode');
          target.classList.add('rtl-mode');
        }
      } 
      // Check if it's an English character
      else if (/[A-Za-z]/.test(e.key)) {
        if (currentInputMode !== 'ltr' || target.dir !== 'ltr') {
          setCurrentInputMode('ltr');
          target.dir = 'ltr';
          target.style.direction = 'ltr';
          target.style.textAlign = 'left';
          target.classList.remove('rtl-mode');
          target.classList.add('ltr-mode');
        }
      }
    }

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

  // Handle input for text area
  const handleTextInput = (e: React.FormEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    let text = element.textContent || '';
    
    // If empty, add RTL mark
    if (text.length === 0) {
      element.innerHTML = '&#x200F;'; // RTL mark
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
      text = '';
    }
    
    // Ensure RTL is maintained
    element.dir = 'rtl';
    element.style.direction = 'rtl';
    element.style.textAlign = 'right';
    
    // Update the text
    onUpdate(block.id, 'text', text);
  };
  
  // Handle input for speaker area
  const handleSpeakerInput = (e: React.FormEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    let text = element.textContent || '';
    
    // If empty, add RTL mark
    if (text.length === 0) {
      element.innerHTML = '&#x200F;'; // RTL mark
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
      text = '';
    }
    
    // Ensure RTL is maintained
    element.dir = 'rtl';
    element.style.direction = 'rtl';
    element.style.textAlign = 'right';
    
    // Update the speaker
    onUpdate(block.id, 'speaker', text);
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
    const element = e.currentTarget as HTMLDivElement;
    // Clear any browser-added content
    if (element.innerHTML === '<br>' || element.innerHTML === '&nbsp;') {
      element.innerHTML = '';
    }
    
    // Detect direction at cursor
    setTimeout(() => {
      const mode = detectDirectionAtCursor(element);
      setCurrentInputMode(mode);
      element.classList.toggle('rtl-mode', mode === 'rtl');
      element.classList.toggle('ltr-mode', mode === 'ltr');
    }, 0);
  };

  const handleTextFocus = (e: FocusEvent<HTMLSpanElement>) => {
    const element = e.currentTarget as HTMLDivElement;
    // Clear any browser-added content
    if (element.innerHTML === '<br>' || element.innerHTML === '&nbsp;') {
      element.innerHTML = '';
    }
    
    // Detect direction at cursor
    setTimeout(() => {
      const mode = detectDirectionAtCursor(element);
      setCurrentInputMode(mode);
      element.classList.toggle('rtl-mode', mode === 'rtl');
      element.classList.toggle('ltr-mode', mode === 'ltr');
    }, 0);
  };

  return (
    <div className={`text-block ${isActive ? 'active' : ''}`}>
      <div
        ref={speakerRef as any}
        className="block-speaker"
        contentEditable="true"
        suppressContentEditableWarning
        dir="rtl"
        style={{ 
          color: speakerColor, 
          direction: 'rtl',
          textAlign: 'right',
          unicodeBidi: 'plaintext'
        }}
        data-timestamp={block.speakerTime}
        onKeyDown={handleSpeakerKeyDown}
        onInput={handleSpeakerInput}
        onFocus={handleSpeakerFocus}
        data-placeholder="דובר"
      />
      
      <span className="block-separator">:</span>
      
      <div
        ref={textRef as any}
        className="block-text"
        contentEditable="true"
        suppressContentEditableWarning
        dir="rtl"
        style={{ 
          direction: 'rtl',
          textAlign: 'right',
          unicodeBidi: 'plaintext',
          whiteSpace: 'pre-wrap'
        }}
        onKeyDown={handleTextKeyDown}
        onInput={handleTextInput}
        onFocus={handleTextFocus}
        data-placeholder="הקלד טקסט כאן..."
      />
      
      {showTooltip && (
        <div className="text-block-tooltip">
          {tooltipMessage}
        </div>
      )}
    </div>
  );
}