'use client';

import React, { useRef, useEffect, useState, KeyboardEvent, FocusEvent } from 'react';
import { ProcessTextResult } from '../types/shortcuts';
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
  isFirstBlock?: boolean;
  activeArea: 'speaker' | 'text';
  cursorAtStart?: boolean;
  onNavigate: (direction: 'prev' | 'next' | 'up' | 'down' | 'speaker' | 'text', fromField: 'speaker' | 'text') => void;
  onUpdate: (id: string, field: 'speaker' | 'text', value: string) => void;
  onNewBlock: () => void;
  onRemoveBlock: (id: string) => void;
  onSpeakerTransform: (code: string) => Promise<string | null>;
  onDeleteAcrossBlocks?: (blockId: string, fromField: 'speaker' | 'text') => void;
  onProcessShortcuts?: (text: string, cursorPosition: number) => ProcessTextResult | null;
  speakerColor?: string;
  currentTime?: number;
  fontSize?: number;
  isIsolated?: boolean;
  showDescriptionTooltips?: boolean;
}

export default function TextBlock({
  block,
  isActive,
  isFirstBlock = false,
  activeArea,
  cursorAtStart = false,
  onNavigate,
  onUpdate,
  onNewBlock,
  onRemoveBlock,
  onSpeakerTransform,
  onDeleteAcrossBlocks,
  onProcessShortcuts,
  speakerColor = '#333',
  currentTime = 0,
  fontSize = 16,
  isIsolated = true,
  showDescriptionTooltips = true
}: TextBlockProps) {
  const speakerRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [localSpeaker, setLocalSpeaker] = useState(block.speaker);
  const [localText, setLocalText] = useState(block.text);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipMessage, setTooltipMessage] = useState('');
  const [textDirection, setTextDirection] = useState<'rtl' | 'ltr'>('rtl');
  const [speakerDirection, setSpeakerDirection] = useState<'rtl' | 'ltr'>('rtl');
  const [currentInputMode, setCurrentInputMode] = useState<'rtl' | 'ltr'>('rtl');
  const [speakerDescription, setSpeakerDescription] = useState<string>('');
  const [showDescriptionTooltip, setShowDescriptionTooltip] = useState(false);
  const [nameCompletion, setNameCompletion] = useState<string>('');
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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
  
  // Sync local state with block data
  useEffect(() => {
    setLocalSpeaker(block.speaker);
    setLocalText(block.text);
  }, [block.speaker, block.text]);

  // Focus management
  useEffect(() => {
    if (isActive) {
      const targetRef = activeArea === 'speaker' ? speakerRef : textRef;
      targetRef.current?.focus();
      
      // Position cursor at start if coming from DELETE key
      if (cursorAtStart && targetRef.current) {
        setTimeout(() => {
          if (targetRef.current) {
            (targetRef.current as HTMLInputElement | HTMLTextAreaElement).setSelectionRange(0, 0);
          }
        }, 10);
      }
    }
  }, [isActive, activeArea, cursorAtStart]);

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

  // Helper function to try speaker transformation
  const tryTransformSpeaker = async (text: string) => {
    if (!text) return;
    
    // Allow letters, numbers, and punctuation as valid codes/names
    const isValid = /^[א-תA-Za-z0-9.,/;:\-*+!?()[\]]+$/.test(text);
    if (!isValid) return;
    
    // Transform based on length:
    // 1 char = code
    // 2+ chars = name or code (handled by SimpleSpeaker)
    const speakerName = await onSpeakerTransform(text);
    
    // Only update if we got a different value
    if (speakerName && speakerName !== text) {
      onUpdate(block.id, 'speaker', speakerName);
    }
  };

  // Handle speaker keydown
  const handleSpeakerKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const text = input.value;

    // SPACE - Transform speaker code or navigate to text area
    if (e.key === ' ' && !e.shiftKey) {
      e.preventDefault();
      
      await tryTransformSpeaker(text);
      
      // Store speaker timestamp when leaving
      if (currentTime && speakerRef.current) {
        speakerRef.current.setAttribute('data-timestamp', currentTime.toString());
      }
      
      // Move to text area
      onNavigate('text', 'speaker');
      return;
    }

    // TAB - Transform speaker and navigate to next block
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      await tryTransformSpeaker(text);
      onNavigate('next', 'speaker');
    }

    // ENTER - Transform speaker and create new block
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      await tryTransformSpeaker(text);
      onNewBlock();
    }

    // SHIFT+ENTER - Allow default behavior for multiline (if needed in future)
    if (e.key === 'Enter' && e.shiftKey) {
      // Let default behavior handle it for now
      // In speaker field, just move to text
      e.preventDefault();
      onNavigate('text', 'speaker');
    }

    // BACKSPACE - Navigate when at beginning (like in SpeakerBlock)
    if (e.key === 'Backspace') {
      // Check if cursor is at the beginning
      if (input.selectionStart === 0 && input.selectionEnd === 0) {
        e.preventDefault();
        
        // If both speaker and text fields are empty, remove the block
        if (localSpeaker === '' && localText === '') {
          onRemoveBlock(block.id);
        } else {
          // Otherwise navigate to previous block's text field
          onNavigate('prev', 'speaker');
        }
      }
      // Otherwise let normal backspace work
    }

    // DELETE - Delete forward or merge with next block
    if (e.key === 'Delete') {
      // If cursor at end of speaker field
      if (input.selectionStart === input.value.length && input.selectionEnd === input.value.length) {
        e.preventDefault();
        // Navigate to text field and position cursor at start
        onNavigate('text', 'speaker');
        setTimeout(() => {
          if (textRef.current) {
            textRef.current.setSelectionRange(0, 0);
          }
        }, 10);
      }
      // Otherwise let normal delete work
    }
    
    // HOME key - Move to beginning or navigate to previous block
    if (e.key === 'Home') {
      if (input.selectionStart === 0) {
        // Already at beginning, navigate to previous block
        e.preventDefault();
        onNavigate('prev', 'speaker');
      } else {
        // Move to beginning of field
        e.preventDefault();
        input.setSelectionRange(0, 0);
      }
    }
    
    // END key - Move to end or navigate to next field  
    if (e.key === 'End') {
      if (input.selectionStart === input.value.length) {
        // Already at end, transform speaker and navigate to text field
        e.preventDefault();
        await tryTransformSpeaker(text);
        onNavigate('text', 'speaker');
      } else {
        // Move to end of field
        e.preventDefault();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }

    // Arrow navigation - UP/DOWN for blocks, LEFT/RIGHT for fields (RTL aware)
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      await tryTransformSpeaker(text);
      onNavigate('up', 'speaker');  // Go to previous block, same field (speaker)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      await tryTransformSpeaker(text);
      onNavigate('down', 'speaker');  // Go to next block, same field (speaker)
    } else if (e.key === 'ArrowLeft') {
      // In RTL, left goes to next field when at end of text
      if (input.selectionStart === input.value.length) {
        e.preventDefault();
        await tryTransformSpeaker(text);
        onNavigate('text', 'speaker');  // Go to text field
      }
      // Otherwise let cursor move naturally through text
    } else if (e.key === 'ArrowRight') {
      // In RTL, right goes to previous field when at start of text
      if (input.selectionStart === 0) {
        e.preventDefault();
        await tryTransformSpeaker(text);
        onNavigate('prev', 'speaker');  // Go to previous block's text field
      }
      // Otherwise let cursor move naturally through text
    }
  };

  // Handle text keydown
  const handleTextKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const text = textarea.value;

    // HOME key - Move to beginning of current line or navigate
    if (e.key === 'Home') {
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = textarea.value.substring(0, cursorPos);
      const lastNewlineIndex = textBeforeCursor.lastIndexOf('\n');
      
      if (lastNewlineIndex === -1 && cursorPos === 0) {
        // Already at beginning of first line, navigate to speaker
        e.preventDefault();
        onNavigate('speaker', 'text');
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
    
    // END key - Move to end of current line or navigate
    if (e.key === 'End') {
      const cursorPos = textarea.selectionStart;
      const textAfterCursor = textarea.value.substring(cursorPos);
      const nextNewlineIndex = textAfterCursor.indexOf('\n');
      
      if (nextNewlineIndex === -1 && cursorPos === textarea.value.length) {
        // Already at end of last line, navigate to next block
        e.preventDefault();
        onNavigate('next', 'text');
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
    }
    
    // Detect language when typing letters
    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      // Check if it's a Hebrew character
      if (/[\u0590-\u05FF]/.test(e.key)) {
        if (currentInputMode !== 'rtl' || textarea.dir !== 'rtl') {
          setCurrentInputMode('rtl');
          textarea.dir = 'rtl';
          textarea.style.direction = 'rtl';
          textarea.style.textAlign = 'right';
        }
      } 
      // Check if it's an English character
      else if (/[A-Za-z]/.test(e.key)) {
        if (currentInputMode !== 'ltr' || textarea.dir !== 'ltr') {
          setCurrentInputMode('ltr');
          textarea.dir = 'ltr';
          textarea.style.direction = 'ltr';
          textarea.style.textAlign = 'left';
        }
      }
    }

    // SPACE in empty text - Navigate to next block
    if (e.key === ' ' && !text.trim()) {
      e.preventDefault();
      onNavigate('next', 'text');
      return;
    }

    // TAB - Navigate to next block's speaker
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      onNavigate('next', 'text');
    }

    // SHIFT+TAB - Navigate back to speaker
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      onNavigate('speaker', 'text');
    }

    // ENTER - Create new block (no validation)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onNewBlock();
    }

    // SHIFT+ENTER - Insert line break in same block
    if (e.key === 'Enter' && e.shiftKey) {
      // Allow default behavior - contentEditable will handle the line break
      // Don't prevent default, let it insert a newline
      return;
    }

    // BACKSPACE - Navigate when at beginning (like in SpeakerBlock)
    if (e.key === 'Backspace') {
      // Check if cursor is at the beginning
      if (textarea.selectionStart === 0 && textarea.selectionEnd === 0) {
        e.preventDefault();
        // Navigate to speaker field
        onNavigate('speaker', 'text');
      }
      // Otherwise let normal backspace work
    }

    // DELETE - Delete forward or merge with next block
    if (e.key === 'Delete') {
      // If cursor at end of text field and nothing selected
      if (textarea.selectionStart === textarea.value.length && textarea.selectionEnd === textarea.value.length) {
        e.preventDefault();
        if (onDeleteAcrossBlocks) {
          // Delete content from next block or navigate there
          onDeleteAcrossBlocks(block.id, 'text');
        }
      }
      // Otherwise let normal delete work within text
    }

    // Arrow navigation - UP/DOWN for blocks (only at edges), LEFT/RIGHT for fields (RTL aware)
    if (e.key === 'ArrowUp') {
      // Check if we're at the first line of the textarea
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = textarea.value.substring(0, cursorPos);
      const linesBeforeCursor = textBeforeCursor.split('\n');
      
      if (linesBeforeCursor.length === 1) {
        // We're on the first line, navigate to previous block
        e.preventDefault();
        onNavigate('up', 'text');
      }
      // Otherwise let the cursor move naturally within the text
    } else if (e.key === 'ArrowDown') {
      // Check if we're at the last line of the textarea
      const cursorPos = textarea.selectionStart;
      const textAfterCursor = textarea.value.substring(cursorPos);
      const linesAfterCursor = textAfterCursor.split('\n');
      
      if (linesAfterCursor.length === 1 || (linesAfterCursor.length === 2 && linesAfterCursor[1] === '')) {
        // We're on the last line, navigate to next block
        e.preventDefault();
        onNavigate('down', 'text');
      }
      // Otherwise let the cursor move naturally within the text
    } else if (e.key === 'ArrowLeft') {
      const cursorPos = textarea.selectionStart;
      const timestampBounds = getTimestampBoundaries(textarea.value, cursorPos);
      
      if (timestampBounds) {
        // If inside timestamp, jump to end of timestamp
        e.preventDefault();
        textarea.setSelectionRange(timestampBounds.end, timestampBounds.end);
      } else if (cursorPos === textarea.value.length) {
        // At end of text, go to next block
        e.preventDefault();
        onNavigate('next', 'text');
      }
    } else if (e.key === 'ArrowRight') {
      const cursorPos = textarea.selectionStart;
      const timestampBounds = getTimestampBoundaries(textarea.value, cursorPos);
      
      if (timestampBounds) {
        // If inside timestamp, jump to start of timestamp
        e.preventDefault();
        textarea.setSelectionRange(timestampBounds.start, timestampBounds.start);
      } else if (cursorPos === 0) {
        // At start of text, go to speaker field
        e.preventDefault();
        onNavigate('speaker', 'text');
      }
    }
  };

  // Handle speaker input change
  const handleSpeakerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSpeaker(value);
    onUpdate(block.id, 'speaker', value);
    
    // Check for name completion if 2+ characters
    if (value.length >= 2) {
      document.dispatchEvent(new CustomEvent('getSpeakerSuggestion', {
        detail: {
          prefix: value,
          callback: (suggestion: string | null) => {
            if (suggestion && suggestion.startsWith(value)) {
              setNameCompletion(suggestion.substring(value.length));
            } else {
              setNameCompletion('');
            }
          }
        }
      }));
    } else {
      setNameCompletion('');
    }
    
    // Check for speaker description when typing
    if (showDescriptionTooltips && value) {
      // Request speaker info
      const checkDescription = () => {
        document.dispatchEvent(new CustomEvent('getSpeakerInfo', {
          detail: {
            speakerIdentifier: value,
            callback: (info: { description?: string } | null) => {
              if (info?.description) {
                setSpeakerDescription(info.description);
                setShowDescriptionTooltip(true);
                
                // Clear previous timeout
                if (tooltipTimeoutRef.current) {
                  clearTimeout(tooltipTimeoutRef.current);
                }
                
                // Hide tooltip after 2 seconds
                tooltipTimeoutRef.current = setTimeout(() => {
                  setShowDescriptionTooltip(false);
                }, 2000);
              }
            }
          }
        }));
      };
      
      checkDescription();
    }
  };

  // Handle text input change and auto-resize
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let value = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    // Check for shortcuts processing (on space)
    if (onProcessShortcuts && localText.length < value.length && cursorPos > 0 && value[cursorPos - 1] === ' ') {
      // Process the text BEFORE the space
      const textBeforeSpace = value.substring(0, cursorPos - 1);
      const result = onProcessShortcuts(textBeforeSpace, textBeforeSpace.length);
      
      if (result && result.expanded) {
        // Add the space after the expansion
        value = result.text + ' ' + value.substring(cursorPos);
        
        // Set cursor position after React updates
        setTimeout(() => {
          if (textRef.current) {
            textRef.current.value = value;
            const newPos = result.cursorPosition + 1; // +1 for the space
            textRef.current.selectionStart = newPos;
            textRef.current.selectionEnd = newPos;
            textRef.current.focus();
          }
        }, 0);
      }
    }
    
    // Check for "..." transformation to timestamp
    if (value.includes('...')) {
      const timestamp = formatTimestamp(currentTime || 0);
      value = value.replace('...', timestamp);
    }
    
    setLocalText(value);
    onUpdate(block.id, 'text', value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };
  
  // Auto-resize textarea on mount and when text changes
  useEffect(() => {
    if (textRef.current) {
      textRef.current.style.height = 'auto';
      textRef.current.style.height = textRef.current.scrollHeight + 'px';
    }
  }, [localText]);

  // Format timestamp
  const formatTimestamp = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Check if cursor is at or within a timestamp
  const getTimestampBoundaries = (text: string, cursorPos: number): { start: number, end: number } | null => {
    // Match timestamp pattern HH:MM:SS or MM:SS
    const timestampPattern = /\d{1,2}:\d{2}(:\d{2})?/g;
    let match;
    
    while ((match = timestampPattern.exec(text)) !== null) {
      const start = match.index;
      const end = match.index + match[0].length;
      
      if (cursorPos >= start && cursorPos <= end) {
        return { start, end };
      }
    }
    
    return null;
  };

  // Handle focus events
  const handleSpeakerFocus = (e: FocusEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    // Detect text direction based on existing content
    const direction = detectTextDirection(input.value);
    setSpeakerDirection(direction);
    setCurrentInputMode(direction);
  };

  const handleTextFocus = (e: FocusEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    // Detect text direction based on existing content
    const direction = detectTextDirection(textarea.value);
    setTextDirection(direction);
    setCurrentInputMode(direction);
  };

  // Handle click on block for navigation mode
  const handleBlockClick = (e: React.MouseEvent) => {
    // Check if click was on a timestamp in the text
    const target = e.target as HTMLElement;
    if (target.tagName === 'TEXTAREA') {
      const textarea = target as HTMLTextAreaElement;
      const clickPos = textarea.selectionStart;
      const timestampBounds = getTimestampBoundaries(textarea.value, clickPos);
      
      if (timestampBounds) {
        // Extract and parse the timestamp
        const timestampText = textarea.value.substring(timestampBounds.start, timestampBounds.end);
        const parts = timestampText.split(':').map(p => parseInt(p, 10));
        let seconds = 0;
        
        if (parts.length === 3) {
          // HH:MM:SS
          seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
          // MM:SS
          seconds = parts[0] * 60 + parts[1];
        }
        
        // Check navigation mode and seek
        const navModeEvent = new CustomEvent('checkNavigationMode', {
          detail: {
            callback: (isOn: boolean) => {
              if (isOn) {
                document.dispatchEvent(new CustomEvent('seekMedia', {
                  detail: { time: seconds }
                }));
              }
            }
          }
        });
        document.dispatchEvent(navModeEvent);
        return;
      }
    }
    
    // Default behavior - seek to block's speaker timestamp
    const navModeEvent = new CustomEvent('checkNavigationMode', {
      detail: {
        callback: (isOn: boolean) => {
          if (isOn && block.speakerTime !== undefined) {
            // Seek to this block's timestamp
            document.dispatchEvent(new CustomEvent('seekMedia', {
              detail: { time: block.speakerTime }
            }));
          }
        }
      }
    });
    document.dispatchEvent(navModeEvent);
  };

  return (
    <div 
      className={`text-block ${isActive ? 'active' : ''} ${!isIsolated ? 'non-isolated' : ''}`} 
      style={{ 
        fontSize: `${fontSize}px`,
        borderLeftColor: isIsolated ? speakerColor : '#cbd5e1',
        borderRightColor: isIsolated ? speakerColor : '#cbd5e1'
      }}
      onClick={handleBlockClick}
    >
      <div className="speaker-input-wrapper">
        <input
        ref={speakerRef}
        className="block-speaker"
        type="text"
        value={localSpeaker}
        onChange={handleSpeakerChange}
        onKeyDown={handleSpeakerKeyDown}
        onFocus={handleSpeakerFocus}
        placeholder="דובר"
        dir={speakerDirection}
        style={{ 
          color: isIsolated ? '#333' : '#cbd5e1',
          direction: speakerDirection,
          textAlign: speakerDirection === 'rtl' ? 'right' : 'left',
          fontSize: `${fontSize}px`,
          fontWeight: isIsolated ? 600 : 400
        }}
        data-timestamp={block.speakerTime}
        />
        {nameCompletion && (
          <span className="name-completion" style={{ fontSize: `${fontSize}px` }}>
            {nameCompletion}
          </span>
        )}
      </div>
      
      <span className="block-separator" style={{ fontSize: `${fontSize}px` }}>:</span>
      
      <textarea
        ref={textRef}
        className="block-text"
        value={localText}
        onChange={handleTextChange}
        onKeyDown={handleTextKeyDown}
        onFocus={handleTextFocus}
        placeholder={isFirstBlock ? "הקלד טקסט כאן..." : ""}
        dir={textDirection}
        style={{ 
          direction: textDirection,
          textAlign: textDirection === 'rtl' ? 'right' : 'left',
          resize: 'none',
          overflow: 'hidden',
          fontSize: `${fontSize}px`,
          color: isIsolated ? 'inherit' : '#94a3b8',
          fontWeight: isIsolated ? 'normal' : 300
        }}
        rows={1}
      />
      
      {showTooltip && (
        <div className="text-block-tooltip">
          {tooltipMessage}
        </div>
      )}
      {showDescriptionTooltip && speakerDescription && (
        <div className="speaker-description-tooltip">
          {speakerDescription}
        </div>
      )}
    </div>
  );
}