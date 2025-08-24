'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo, KeyboardEvent, FocusEvent } from 'react';
import { ProcessTextResult } from '../types/shortcuts';
import TextHighlightOverlay from '../components/TextHighlightOverlay';
import { AutoCorrectEngine } from '../utils/AutoCorrectEngine';
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
  fontSize?: number;
  fontFamily?: 'default' | 'david';
  isIsolated?: boolean;
  showDescriptionTooltips?: boolean;
  blockViewEnabled?: boolean;
  speakerHighlights?: Array<{ startIndex: number; endIndex: number; isCurrent?: boolean }>;
  textHighlights?: Array<{ startIndex: number; endIndex: number; isCurrent?: boolean }>;
  onClick?: (ctrlKey: boolean, shiftKey: boolean) => void;
  autoCorrectEngine?: AutoCorrectEngine;
  previousSpeaker?: string;
}

const TextBlock = React.memo(function TextBlock({
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
  fontSize = 16,
  fontFamily = 'default',
  isIsolated = true,
  showDescriptionTooltips = true,
  blockViewEnabled = true,
  speakerHighlights = [],
  textHighlights = [],
  onClick,
  autoCorrectEngine,
  previousSpeaker = ''
}: TextBlockProps) {
  const speakerRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [localSpeaker, setLocalSpeaker] = useState(block.speaker);
  const [localText, setLocalText] = useState(block.text);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipMessage, setTooltipMessage] = useState('');
  // Always start with RTL by default
  const [textDirection, setTextDirection] = useState<'rtl' | 'ltr'>('rtl');
  const [speakerDirection, setSpeakerDirection] = useState<'rtl' | 'ltr'>('rtl');
  const [currentInputMode, setCurrentInputMode] = useState<'rtl' | 'ltr'>('rtl');
  const [cursorColor, setCursorColor] = useState<'hebrew' | 'english'>('hebrew');
  const [inputLanguage, setInputLanguage] = useState<'hebrew' | 'english'>('hebrew');
  const [speakerDescription, setSpeakerDescription] = useState<string>('');
  const [showDescriptionTooltip, setShowDescriptionTooltip] = useState(false);
  const [nameCompletion, setNameCompletion] = useState<string>('');
  const [processedRemarks, setProcessedRemarks] = useState<Set<string>>(new Set());
  const [fullSpeakerName, setFullSpeakerName] = useState<string>('');
  const [isFullySelected, setIsFullySelected] = useState(false);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingFromProps = useRef(false);
  const wasFullySelected = useRef(false);
  const lastNavigatedTimestamp = useRef<string | null>(null);
  const isProcessingShiftEnter = useRef(false);
  
  // Removed debouncing as it was causing cursor jump issues
  // The React.memo optimization is sufficient for performance
  
  // Helper function to get current media time via event
  const getCurrentMediaTime = (): number => {
    let time = 0;
    const event = new CustomEvent('getCurrentMediaTime', {
      detail: {
        callback: (currentTime: number) => {
          time = currentTime;
        }
      }
    });
    document.dispatchEvent(event);
    return time;
  };
  
  // Listen for setNextBlockText event (for auto-numbering)
  useEffect(() => {
    const handleSetNextBlockText = (event: CustomEvent) => {
      if (isActive && activeArea === 'text' && textRef.current) {
        const { text, cursorPosition } = event.detail;
        setLocalText(text);
        onUpdate(block.id, 'text', text);
        
        // Set cursor position after the list number
        setTimeout(() => {
          if (textRef.current) {
            const pos = cursorPosition || text.length;
            textRef.current.setSelectionRange(pos, pos);
            textRef.current.focus();
          }
        }, 10);
      }
    };
    
    document.addEventListener('setNextBlockText', handleSetNextBlockText as EventListener);
    return () => {
      document.removeEventListener('setNextBlockText', handleSetNextBlockText as EventListener);
    };
  }, [isActive, activeArea, block.id, onUpdate]);
  
  // Helper function to add debug log
  const addDebugLog = (message: string) => {
    // Debug logging disabled
  };

  // Helper function to switch input language
  const switchLanguage = (lang: 'hebrew' | 'english') => {
    addDebugLog('Switching language to: ' + lang);
    setCursorColor(lang);
    setInputLanguage(lang);
    
    // Force update the textarea cursor color immediately
    if (textRef.current) {
      textRef.current.style.caretColor = lang === 'english' ? '#2196f3' : '#e91e63';
    }
  };

  // Detect if text is primarily Hebrew/Arabic (RTL) or Latin (LTR)
  const detectTextDirection = (text: string): 'rtl' | 'ltr' => {
    if (!text || text.length === 0) return 'rtl'; // Default to RTL for Hebrew
    
    // Remove numbers, punctuation and spaces for detection
    const cleanText = text.replace(/[\d\s\.,;:!?\-()[\]{}'"]/g, '');
    if (!cleanText) return 'rtl'; // Default to RTL if only numbers/punctuation
    
    // Check if ANY Hebrew/Arabic characters exist
    const hasRTL = /[\u0590-\u05FF\u0600-\u06FF]/.test(cleanText);
    
    // If there's ANY Hebrew/Arabic, keep it RTL (for mixed text)
    if (hasRTL) {
      return 'rtl';
    }
    
    // Only use LTR if it's purely English (no Hebrew at all)
    const hasLTR = /[A-Za-z]/.test(cleanText);
    if (hasLTR && !hasRTL) {
      return 'ltr';
    }
    
    // Default to RTL
    return 'rtl';
  };

  // Initialize directions - FORCE RTL always
  useEffect(() => {
    // FORCE RTL for text - never change
    setTextDirection('rtl');
    
    // Update speaker direction based on content (speaker can still change)
    const speakerToCheck = localSpeaker || block.speaker;
    const newSpeakerDir = detectTextDirection(speakerToCheck);
    if (newSpeakerDir !== speakerDirection) {
      setSpeakerDirection(newSpeakerDir);
    }
  }, [block.text, block.speaker, localText, localSpeaker]);
  
  // Sync local state with block data when block changes or on mount
  // This ensures speaker name updates from the speaker panel are reflected
  useEffect(() => {
    // Only sync if this block is not currently active (being edited)
    // This prevents overwriting user input while they're typing
    if (!isActive) {
      setLocalSpeaker(block.speaker);
      setLocalText(block.text);
    } else {
      // If this is the active block, only sync the speaker field if it's not the active area
      // This allows speaker panel updates to show even in the active block
      if (activeArea !== 'speaker') {
        setLocalSpeaker(block.speaker);
      }
      if (activeArea !== 'text') {
        setLocalText(block.text);
      }
    }
  }, [block.id, block.speaker, block.text, isActive, activeArea]); // Sync when block data changes

  // Additional listener for speaker updates to ensure immediate response
  useEffect(() => {
    const handleSpeakerUpdated = (event: CustomEvent) => {
      const { code, name, oldCode, oldName } = event.detail;
      
      // Check if this update affects our current speaker value
      let shouldUpdate = false;
      let newSpeakerValue = '';
      
      // Case 1: Setting name for the first time (code → name)
      if (!oldName && code && name && localSpeaker === code) {
        shouldUpdate = true;
        newSpeakerValue = name;
      }
      // Case 2: Changing existing name (oldName → name)  
      else if (oldName && name && localSpeaker === oldName) {
        shouldUpdate = true;
        newSpeakerValue = name;
      }
      // Case 3: Clearing name (name → code)
      else if (oldName && !name && code && localSpeaker === oldName) {
        shouldUpdate = true;
        newSpeakerValue = code;
      }
      // Case 4: Code change
      else if (oldCode && code && localSpeaker === oldCode) {
        shouldUpdate = true;
        newSpeakerValue = code;
      }
      
      if (shouldUpdate && (!isActive || activeArea !== 'speaker')) {
        setLocalSpeaker(newSpeakerValue);
      }
    };

    document.addEventListener('speakerUpdated', handleSpeakerUpdated as EventListener);
    return () => {
      document.removeEventListener('speakerUpdated', handleSpeakerUpdated as EventListener);
    };
  }, [localSpeaker, isActive, activeArea]);

  // Get full speaker name for regular view
  useEffect(() => {
    if (!blockViewEnabled && localSpeaker) {
      // Remove any colons from the speaker value first
      const cleanSpeaker = localSpeaker.replace(/:/g, '');
      
      // Check if the speaker is a single character code
      const isSingleCharCode = cleanSpeaker.length === 1 && 
        (/^[א-ת]$/.test(cleanSpeaker) || /^[A-Za-z]$/.test(cleanSpeaker));
      
      if (isSingleCharCode) {
        // Request the full name for this code
        const getSpeakerNameEvent = new CustomEvent('getSpeakerNameForCode', {
          detail: {
            code: cleanSpeaker,
            callback: (fullName: string | null) => {
              // Only use full name if it's different from the code (i.e., an actual name was set)
              if (fullName && fullName !== cleanSpeaker) {
                setFullSpeakerName(fullName);
              } else {
                // No name set, just show the code without colon
                setFullSpeakerName(cleanSpeaker);
              }
            }
          }
        });
        document.dispatchEvent(getSpeakerNameEvent);
      } else {
        // Already a full name - check if it exists in speakers
        const checkExistingEvent = new CustomEvent('checkSpeakerNames', {
          detail: {
            inputText: cleanSpeaker,
            callback: (existingNames: string[]) => {
              // Check if this name exists in speakers
              const exists = existingNames.some(name => 
                name.toLowerCase() === cleanSpeaker.toLowerCase()
              );
              setFullSpeakerName(cleanSpeaker);
            }
          }
        });
        document.dispatchEvent(checkExistingEvent);
      }
    } else {
      setFullSpeakerName('');
    }
  }, [localSpeaker, blockViewEnabled]);

  // Focus management
  useEffect(() => {
    if (isActive) {
      const targetRef = activeArea === 'speaker' ? speakerRef : textRef;
      
      // Immediate focus attempt
      if (targetRef.current) {
        console.log('[TextBlock] Immediate focus attempt for ' + activeArea + ' field, block ' + block.id);
        targetRef.current.focus();
      }
      
      // Delayed focus to ensure DOM is ready
      const focusTimeout = setTimeout(() => {
        if (targetRef.current) {
          console.log('[TextBlock] Delayed focus for ' + activeArea + ' field, block ' + block.id);
          targetRef.current.focus();
          
          // Force focus again after a moment to ensure it takes
          setTimeout(() => {
            if (targetRef.current && document.activeElement !== targetRef.current) {
              console.log('[TextBlock] Force re-focus ' + activeArea + ' field, block ' + block.id + ' (not focused)');
              targetRef.current.focus();
              targetRef.current.click(); // Try clicking to force focus
            }
          }, 200);
          
          // Position cursor at start if coming from DELETE key
          if (cursorAtStart && targetRef.current) {
            (targetRef.current as HTMLInputElement | HTMLTextAreaElement).setSelectionRange(0, 0);
          }
        }
      }, 50);
      
      return () => clearTimeout(focusTimeout);
    } else {
      // Clear name completion when block loses focus
      setNameCompletion('');
    }
  }, [isActive, activeArea, cursorAtStart, block.id]);

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

  // Detect numbered lists in text (can be multiple lines)
  const detectListInText = (text: string): { hasLists: boolean; lastNumber: number } => {
    const lines = text.split('\n');
    let lastNumber = 0;
    let hasLists = false;
    
    for (const line of lines) {
      // Match patterns like "1. " or "2. " anywhere in the line
      const match = line.match(/^(\d+)\.\s+/);
      if (match) {
        hasLists = true;
        lastNumber = Math.max(lastNumber, parseInt(match[1]));
      }
    }
    
    return { hasLists, lastNumber };
  };

  // Format list item with proper RTL support
  const formatListItem = (number: number, isRtl?: boolean): string => {
    if (isRtl || textDirection === 'rtl') {
      // Add RLM before number to keep cursor moving right-to-left
      return '\u200F' + number + '. ';
    }
    return number + '. ';
  };

  // Auto-renumber lists when text changes
  const renumberLists = (text: string): string => {
    const lines = text.split('\n');
    let listNumber = 0;
    let inList = false;
    
    const renumberedLines = lines.map(line => {
      // Check if line is a list item
      const listMatch = line.match(/^[\u200F]?(\d+)\.\s+(.*)$/);
      
      if (listMatch) {
        // This is a list item
        if (!inList) {
          // Start of a new list
          listNumber = 1;
          inList = true;
        } else {
          // Continue list
          listNumber++;
        }
        
        // Replace the old number with the new one
        if (textDirection === 'rtl') {
          return '\u200F' + listNumber + '. ' + listMatch[2];
        } else {
          return listNumber + '. ${listMatch[2]}';
        }
      } else if (line.trim() === '') {
        // Empty line - could be end of list or just spacing
        // Keep list going if next line is also a list
        return line;
      } else {
        // Not a list item - end the list
        inList = false;
        listNumber = 0;
        return line;
      }
    });
    
    return renumberedLines.join('\n');
  };

  // Auto-format lists when space is pressed after number.
  const handleListFormatting = (text: string, cursorPos: number): { formatted: boolean; newText: string; newCursorPos: number } => {
    // Check if we just typed "number. " at the beginning of a line
    const beforeCursor = text.substring(0, cursorPos);
    const lines = beforeCursor.split('\n');
    const currentLine = lines[lines.length - 1];
    
    // Check if current line starts with a number followed by dot and we just pressed space
    const match = currentLine.match(/^(\d+)\.\s$/);
    
    if (match && text[cursorPos - 1] === ' ') {
      // This is a list item - no need to reformat, just mark as formatted
      // so we know to handle Shift+Enter properly
      return {
        formatted: true,
        newText: text,
        newCursorPos: cursorPos
      };
    }
    
    return { formatted: false, newText: text, newCursorPos: cursorPos };
  };

  // Show inline tooltip
  const displayTooltip = (message: string) => {
    setTooltipMessage(message);
    setShowTooltip(true);
    setTimeout(() => setShowTooltip(false), 3000);
  };
  
  // Alias for consistency with the code
  const showTooltipMessage = displayTooltip;

  // Helper function to try speaker transformation
  const tryTransformSpeaker = async (text: string) => {
    if (!text) return;
    
    // Remove colons before processing - colon is not part of the name
    text = text.replace(/:/g, '');
    
    // Allow letters, numbers, and punctuation as valid codes/names (except colon)
    const isValid = /^[א-תA-Za-z0-9.,/;\-*+!?()[\]]+$/.test(text);
    if (!isValid) return;
    
    // First check if this is an existing speaker name - request speaker list
    return new Promise<void>((resolve) => {
      const checkSpeakerEvent = new CustomEvent('checkSpeakerNames', {
        detail: {
          inputText: text,
          callback: async (existingNames: string[]) => {
            // Check if input matches any existing speaker name
            const matchedName = existingNames.find(name => 
              name.toLowerCase() === text.toLowerCase()
            );
            
            if (matchedName) {
              // Found an exact match, use it
              onUpdate(block.id, 'speaker', matchedName);
            } else {
              // Not an exact match, try transformation (code -> name)
              const speakerName = await onSpeakerTransform(text);
              
              // Only update if we got a different value
              if (speakerName && speakerName !== text) {
                onUpdate(block.id, 'speaker', speakerName);
              }
            }
            resolve();
          }
        }
      });
      document.dispatchEvent(checkSpeakerEvent);
    });
  };

  // Handle speaker keydown
  const handleSpeakerKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    // Check if this is a special key that should bubble up to MediaPlayer
    const isSpecialKey = 
      // F-keys
      (e.key.startsWith('F') && e.key.length <= 3 && e.key.length >= 2) ||
      // Numpad keys  
      (e.code && e.code.startsWith('Numpad')) ||
      // Combinations with Ctrl/Alt/Meta (except our specific shortcuts)
      (e.ctrlKey || e.altKey || e.metaKey);
    
    // Check if this is one of our text editor shortcuts that we handle
    const isTextEditorShortcut = 
      (e.ctrlKey && e.shiftKey && (e.key.toLowerCase() === 'a' || e.code === 'KeyA' || e.key === 'א'));
    
    // If it's a special key but NOT one of our text editor shortcuts, let it bubble up
    if (isSpecialKey && !isTextEditorShortcut) {
      console.log('Special key in speaker field, allowing propagation:', e.key, e.code);
      return;
    }
    
    const input = e.currentTarget;
    const text = input.value;
    
    // Handle Ctrl+Shift+A for select all blocks (works with any case/language)
    // Also check for Hebrew 'א' key
    if (e.ctrlKey && e.shiftKey && (e.key.toLowerCase() === 'a' || e.code === 'KeyA' || e.key === 'א')) {
      e.preventDefault();
      e.stopPropagation();
      
      // Check if blocks are already selected and toggle
      const selectedBlocks = document.querySelectorAll('.block-selected');
      if (selectedBlocks.length > 0) {
        // Blocks are selected - unselect them
        const event = new CustomEvent('clearBlockSelection');
        document.dispatchEvent(event);
      } else {
        // No blocks selected - select all
        const selectAllButton = document.querySelector('[title="בחר את כל הבלוקים"]') as HTMLButtonElement;
        if (selectAllButton) {
          selectAllButton.click();
        }
      }
      return;
    }
    
    // Handle Ctrl+A for select all blocks
    if (e.ctrlKey && e.key === 'a') {
      // Check if text was already fully selected BEFORE this Ctrl+A
      if (wasFullySelected.current && input.value.length > 0) {
        // Text was already selected - trigger select all blocks
        e.preventDefault();
        e.stopPropagation();
        
        // Try to click the select all button directly
        const selectAllButton = document.querySelector('[title="בחר את כל הבלוקים"]') as HTMLButtonElement;
        if (selectAllButton) {
          selectAllButton.click();
        }
        
        wasFullySelected.current = false; // Reset
        return;
      } else {
        // First Ctrl+A - let browser select all, then mark as selected
        setTimeout(() => {
          wasFullySelected.current = input.selectionStart === 0 && 
                                    input.selectionEnd === input.value.length && 
                                    input.value.length > 0;
        }, 10);
      }
    }

    // SPACE - Transform speaker code or navigate to text area
    if (e.key === ' ' && !e.shiftKey) {
      e.preventDefault();
      
      await tryTransformSpeaker(text);
      
      // Store speaker timestamp when leaving
      const currentTime = getCurrentMediaTime();
      if (currentTime && speakerRef.current) {
        speakerRef.current.setAttribute('data-timestamp', currentTime.toString());
      }
      
      // Clear name completion when moving to text
      setNameCompletion('');
      
      // Move to text area
      onNavigate('text', 'speaker');
      return;
    }

    // TAB - Transform speaker and navigate to next block
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      await tryTransformSpeaker(text);
      setNameCompletion(''); // Clear completion when navigating
      
      // Check duplicate speaker before moving forward
      if (autoCorrectEngine) {
        const duplicateSpeakerResult = autoCorrectEngine.validateDuplicateSpeaker(text, previousSpeaker);
        if (!duplicateSpeakerResult.isValid) {
          displayTooltip(duplicateSpeakerResult.message || '');
          return;
        }
      }
      
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
    // Allow Shift+Ctrl+Arrow for text selection
    if (e.key === 'ArrowUp' && !e.shiftKey) {
      e.preventDefault();
      await tryTransformSpeaker(text);
      onNavigate('up', 'speaker');  // Go to previous block, same field (speaker)
    } else if (e.key === 'ArrowDown' && !e.shiftKey) {
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
    console.log('Key pressed in text area:', e.key);
    
    // Check if this is a special key that should bubble up to MediaPlayer
    const isSpecialKey = 
      // F-keys
      (e.key.startsWith('F') && e.key.length <= 3 && e.key.length >= 2) ||
      // Numpad keys
      (e.code && e.code.startsWith('Numpad')) ||
      // Combinations with Ctrl/Alt/Meta (but not Shift alone)
      (e.ctrlKey || e.altKey || e.metaKey);
    
    if (isSpecialKey) {
      console.log('Special key detected, allowing propagation:', e.key, e.code);
      // Don't stop propagation for special keys - let MediaPlayer handle them
      return;
    }
    
    const textarea = e.currentTarget;
    const text = textarea.value;
    
    // Handle arrow key navigation to skip timestamps
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const cursorPos = textarea.selectionStart;
      
      // Check if we're near a timestamp bracket pattern
      const timestampPattern = /\[(\d{2}:\d{2}:\d{2})[^\]]*\]/g;
      let match;
      
      while ((match = timestampPattern.exec(text)) !== null) {
        const bracketStart = match.index;
        const timestampStart = match.index + 1; // After [
        const timestampEnd = match.index + 1 + 8; // After HH:MM:SS (8 chars)
        const bracketEnd = match.index + match[0].length - 1; // Before ]
        
        // If moving right (backwards in RTL) and cursor is anywhere in the timestamp
        if (e.key === 'ArrowRight' && cursorPos > timestampStart && cursorPos <= timestampEnd) {
          // Jump to BEFORE the opening bracket (outside)
          e.preventDefault();
          textarea.setSelectionRange(bracketStart, bracketStart);
          addDebugLog('Skipped timestamp right: moved to position ' + bracketStart + ' (before [)');
          // Check for highlight after move
          setTimeout(() => checkTimestampHover(bracketStart, text), 10);
          return;
        }
        
        // If moving left (forward in RTL) and cursor is just before the timestamp
        if (e.key === 'ArrowLeft' && cursorPos >= timestampStart && cursorPos < timestampEnd) {
          // Jump to just before the closing bracket
          e.preventDefault();
          textarea.setSelectionRange(bracketEnd, bracketEnd);
          addDebugLog('Skipped timestamp left: moved to position ' + bracketEnd + ' (before ])');
          return;
        }
        
        // If moving left (forward in RTL) and cursor is at the closing bracket, let it move past
        if (e.key === 'ArrowLeft' && cursorPos === bracketEnd) {
          // Jump to after the closing bracket (outside)
          e.preventDefault();
          textarea.setSelectionRange(bracketEnd + 1, bracketEnd + 1);
          addDebugLog('Exited bracket left: moved to position ' + bracketEnd + 1 + ' (after ])');
          return;
        }
      }
    }
    
    // Handle END key first - highest priority
    if (e.key === 'End') {
      console.log('END key detected');
      // Stop propagation to prevent MediaPlayer from handling it
      e.stopPropagation();
      
      // After cursor moves to end, set up Hebrew mode
      setTimeout(() => {
        if (textRef.current) {
          console.log('Activating Hebrew mode');
          
          // Update our internal state
          setInputLanguage('hebrew');
          setCursorColor('hebrew');
          textRef.current.style.caretColor = '#e91e63';
          textRef.current.dataset.language = 'hebrew';
          
          // Set language attributes
          textRef.current.lang = 'he';
          textRef.current.dir = 'rtl';
          
          // Focus to apply changes
          textRef.current.focus();
          
          // Create a custom event to signal language change
          const langChangeEvent = new CustomEvent('languageChange', {
            detail: { language: 'hebrew' },
            bubbles: true
          });
          textRef.current.dispatchEvent(langChangeEvent);
          
          console.log('Hebrew mode activated - cursor should be pink');
        }
      }, 50);
      return; // Exit early to ensure this takes priority
    }
    
    // HOME key - Navigate to speaker if at beginning, otherwise move to start of text
    if (e.key === 'Home') {
      if (textarea.selectionStart === 0) {
        // Already at beginning of text, navigate to speaker
        e.preventDefault();
        onNavigate('speaker', 'text');
      }
      // Otherwise let default HOME behavior work (move to start of text)
      return;
    }
    
    // Update cursor color and handle Word-like language switching
    if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
      setTimeout(() => {
        const pos = textarea.selectionStart;
        if (pos >= 0 && text) {
          const charBeforeCursor = text[pos - 1] || '';
          const charAtCursor = text[pos] || '';
          
          const hebrewPattern = /[\u0590-\u05FF]/;
          const englishPattern = /[A-Za-z]/;
          
          // Auto-detect language when cursor touches text
          if (hebrewPattern.test(charBeforeCursor) || hebrewPattern.test(charAtCursor)) {
            switchLanguage('hebrew');
          } else if (englishPattern.test(charBeforeCursor) || englishPattern.test(charAtCursor)) {
            switchLanguage('english');
          } else if (pos === text.length) {
            // At end of text - switch to Hebrew (default)
            switchLanguage('hebrew');
          }
        }
      }, 0);
    }
    
    // Arrow Up/Down - switch to Hebrew by default (Word-like behavior)
    if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
      setTimeout(() => {
        const pos = textarea.selectionStart;
        if (pos >= 0 && text) {
          const charAtCursor = text[pos] || '';
          const hebrewPattern = /[\u0590-\u05FF]/;
          const englishPattern = /[A-Za-z]/;
          
          // Check what we landed on
          if (hebrewPattern.test(charAtCursor)) {
            switchLanguage('hebrew');
          } else if (englishPattern.test(charAtCursor)) {
            switchLanguage('english');
          } else {
            // Default to Hebrew when moving up/down
            switchLanguage('hebrew');
          }
        } else {
          switchLanguage('hebrew');
        }
      }, 0);
    }
    
    // Handle Ctrl+Shift+A for select all blocks (works with any case/language)
    // Also check for Hebrew 'א' key
    if (e.ctrlKey && e.shiftKey && (e.key.toLowerCase() === 'a' || e.code === 'KeyA' || e.key === 'א')) {
      e.preventDefault();
      e.stopPropagation();
      
      // Check if blocks are already selected and toggle
      const selectedBlocks = document.querySelectorAll('.block-selected');
      if (selectedBlocks.length > 0) {
        // Blocks are selected - unselect them
        const event = new CustomEvent('clearBlockSelection');
        document.dispatchEvent(event);
      } else {
        // No blocks selected - select all
        const selectAllButton = document.querySelector('[title="בחר את כל הבלוקים"]') as HTMLButtonElement;
        if (selectAllButton) {
          selectAllButton.click();
        }
      }
      return;
    }
    
    // Handle Ctrl+A for select all blocks
    if (e.ctrlKey && e.key === 'a') {
      // Check if text was already fully selected BEFORE this Ctrl+A
      if (wasFullySelected.current && textarea.value.length > 0) {
        // Text was already selected - trigger select all blocks
        e.preventDefault();
        e.stopPropagation();
        
        // Dispatch event to select all blocks or trigger directly
        const event = new CustomEvent('requestSelectAllBlocks');
        document.dispatchEvent(event);
        
        // Also try to call the function directly via the onSelectAllBlocks prop if available
        const selectAllButton = document.querySelector('[title="בחר את כל הבלוקים"]') as HTMLButtonElement;
        if (selectAllButton) {
          selectAllButton.click();
        }
        
        wasFullySelected.current = false; // Reset
        return;
      } else {
        // First Ctrl+A - let browser select all, then mark as selected
        setTimeout(() => {
          wasFullySelected.current = textarea.selectionStart === 0 && 
                                    textarea.selectionEnd === textarea.value.length && 
                                    textarea.value.length > 0;
        }, 10);
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

    // ENTER - Create new block and maintain language (Word-like)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      // Apply AutoCorrect validations before creating new block
      if (autoCorrectEngine) {
        // Validate duplicate speaker
        const duplicateSpeakerResult = autoCorrectEngine.validateDuplicateSpeaker(localSpeaker, previousSpeaker);
        if (!duplicateSpeakerResult.isValid) {
          displayTooltip(duplicateSpeakerResult.message || '');
          return;
        }
        
        // Validate block transition (punctuation, parentheses, quotes)
        const transitionResult = autoCorrectEngine.validateBlockTransition(text);
        if (!transitionResult.isValid) {
          displayTooltip(transitionResult.message || '');
          return;
        }
      }
      
      // Store current cursor language for the new block
      const currentLanguage = inputLanguage;
      onNewBlock();
      // The new block will inherit the language from the previous block
      setTimeout(() => {
        switchLanguage(currentLanguage);
      }, 0);
    }

    // SHIFT+ENTER - Insert line break and continue list if applicable
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      
      const cursorPos = textarea.selectionStart;
      const beforeCursor = text.substring(0, cursorPos);
      const afterCursor = text.substring(cursorPos);
      
      // Split into lines to check current line
      const lines = beforeCursor.split('\n');
      const currentLine = lines[lines.length - 1];
      
      // Check if current line is a list item (has content after the number)
      // Match both with and without RLM mark, and handle both single and multiple spaces
      const listMatch = currentLine.match(/^[\u200F]?(\d+)\.\s*(.*)$/) || currentLine.match(/^(\d+)\.\s*(.*)$/);
      
      if (listMatch && listMatch[2] && listMatch[2].trim().length > 0) {
        // We're in a list item with content, insert a new list item
        // Just insert a placeholder number, then renumber the whole text
        const nextListItem = formatListItem(999, textDirection === 'rtl'); // Placeholder
        let newText = beforeCursor + '\n' + nextListItem + afterCursor;
        
        // Renumber all lists in the text
        newText = renumberLists(newText);
        
        setLocalText(newText);
        onUpdate(block.id, 'text', newText);
        
        // Position cursor after the new list number
        setTimeout(() => {
          if (textRef.current) {
            // Find the actual new list item position after renumbering
            const lines = newText.substring(0, beforeCursor.length + 10).split('\n');
            const newLineIndex = lines.length - 1;
            const newLine = lines[newLineIndex];
            const listItemMatch = newLine.match(/^[\u200F]?(\d+)\.\s*/);
            const newPos = beforeCursor.length + 1 + (listItemMatch ? listItemMatch[0].length : 0);
            
            textRef.current.setSelectionRange(newPos, newPos);
            // Auto-resize
            textRef.current.style.height = 'auto';
            textRef.current.style.height = textRef.current.scrollHeight + 'px';
          }
        }, 0);
      } else if (listMatch && (!listMatch[2] || !listMatch[2].trim())) {
        // Empty list item - remove the number and end the list (Word-like behavior)
        // Remove the list number and RLM if present
        const newText = beforeCursor.replace(/[\u200F]?\d+\.\s*$/, '') + afterCursor;
        setLocalText(newText);
        onUpdate(block.id, 'text', newText);
        
        setTimeout(() => {
          if (textRef.current) {
            // Position cursor at the end of the line where the number was removed
            const newPos = newText.length - afterCursor.length;
            textRef.current.setSelectionRange(newPos, newPos);
            textRef.current.style.height = 'auto';
            textRef.current.style.height = textRef.current.scrollHeight + 'px';
          }
        }, 0);
      } else {
        // Not in a list, just add a line break
        const newText = beforeCursor + '\n' + afterCursor;
        const desiredCursorPos = beforeCursor.length + 1; // Position after the new line
        
        // Set flag to prevent cursor repositioning by other handlers
        isProcessingShiftEnter.current = true;
        
        setLocalText(newText);
        onUpdate(block.id, 'text', newText);
        
        // Store the desired cursor position in a ref to preserve it
        const preservedPos = desiredCursorPos;
        
        // Use requestAnimationFrame for more reliable positioning
        requestAnimationFrame(() => {
          if (textRef.current) {
            // Set cursor position
            textRef.current.setSelectionRange(preservedPos, preservedPos);
            
            // Resize the textarea
            textRef.current.style.height = 'auto';
            textRef.current.style.height = textRef.current.scrollHeight + 'px';
            
            // Re-set cursor position after resize to ensure it stays
            textRef.current.setSelectionRange(preservedPos, preservedPos);
            
            // Focus to ensure cursor is visible
            textRef.current.focus();
            
            // Clear flag after a short delay
            setTimeout(() => {
              isProcessingShiftEnter.current = false;
            }, 100);
          }
        });
      }
      
      return;
    }

    // BACKSPACE - Navigate when at beginning or renumber lists
    if (e.key === 'Backspace') {
      // Check if cursor is at the beginning
      if (textarea.selectionStart === 0 && textarea.selectionEnd === 0) {
        e.preventDefault();
        // Navigate to speaker field
        onNavigate('speaker', 'text');
      } else {
        // Check if we're about to delete something that might affect list numbering
        const cursorPos = textarea.selectionStart;
        const selectionEnd = textarea.selectionEnd;
        
        // If we're deleting a selection or at the start of a list number
        if (cursorPos !== selectionEnd || text[cursorPos - 1] === '\n') {
          // Let the deletion happen, then renumber
          setTimeout(() => {
            const updatedText = textRef.current?.value;
            if (updatedText && updatedText !== text) {
              const renumbered = renumberLists(updatedText);
              if (renumbered !== updatedText) {
                setLocalText(renumbered);
                onUpdate(block.id, 'text', renumbered);
                // Maintain cursor position
                if (textRef.current) {
                  textRef.current.setSelectionRange(cursorPos - 1, cursorPos - 1);
                }
              }
            }
          }, 0);
        }
      }
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
      // Only navigate between blocks if we're truly at the first line
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = textarea.value.substring(0, cursorPos);
      
      // Check if there are no newlines before cursor (meaning we're on first line)
      if (!textBeforeCursor.includes('\n')) {
        // Now check if cursor can actually move up within the current line
        const { selectionStart } = textarea;
        textarea.selectionStart = 0; // Try to move to start
        textarea.selectionEnd = 0;
        
        // Check if cursor actually moved
        const couldMoveUp = textarea.selectionStart !== selectionStart;
        textarea.selectionStart = selectionStart; // Restore position
        textarea.selectionEnd = selectionStart;
        
        if (!couldMoveUp) {
          // Can't move up within text, navigate to previous block
          e.preventDefault();
          onNavigate('up', 'text');
        }
      }
      // Otherwise let the cursor move naturally within the text
    } else if (e.key === 'ArrowDown') {
      // Only navigate between blocks if we're truly at the last line
      const cursorPos = textarea.selectionStart;
      const textAfterCursor = textarea.value.substring(cursorPos);
      
      // Check if there are no newlines after cursor (meaning we're on last line)
      if (!textAfterCursor.includes('\n')) {
        // Now check if cursor can actually move down within the current line
        const { selectionStart } = textarea;
        const endPos = textarea.value.length;
        textarea.selectionStart = endPos; // Try to move to end
        textarea.selectionEnd = endPos;
        
        // Check if cursor actually moved
        const couldMoveDown = textarea.selectionStart !== selectionStart;
        textarea.selectionStart = selectionStart; // Restore position
        textarea.selectionEnd = selectionStart;
        
        if (!couldMoveDown || cursorPos === textarea.value.length) {
          // Can't move down within text or at end, navigate to next block
          e.preventDefault();
          onNavigate('down', 'text');
        }
      }
      // Otherwise let the cursor move naturally within the text
    } else if (e.key === 'ArrowLeft') {
      const cursorPos = textarea.selectionStart;
      
      // Allow normal cursor movement inside timestamps
      if (cursorPos === textarea.value.length) {
        // At end of text, go to next block
        e.preventDefault();
        onNavigate('next', 'text');
      }
      // Otherwise let cursor move naturally
    } else if (e.key === 'ArrowRight') {
      const cursorPos = textarea.selectionStart;
      
      // Allow normal cursor movement inside timestamps
      if (cursorPos === 0) {
        // At start of text, go to speaker field
        e.preventDefault();
        onNavigate('speaker', 'text');
      }
      // Otherwise let cursor move naturally
    }
  };

  // Handle speaker input change
  const handleSpeakerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Always remove colons from the value - colon is only visual
    value = value.replace(/:/g, '');
    
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
    let cursorPos = e.target.selectionStart;
    
    // Apply auto-corrections if enabled
    if (autoCorrectEngine) {
      const originalValue = value;
      value = autoCorrectEngine.applyAutoCorrections(value);
      
      // If text was auto-corrected, adjust cursor position
      if (value !== originalValue) {
        // Try to maintain cursor position relative to the correction
        const lengthDiff = value.length - originalValue.length;
        setTimeout(() => {
          if (textRef.current) {
            const newPos = Math.min(cursorPos + lengthDiff, value.length);
            textRef.current.setSelectionRange(newPos, newPos);
          }
        }, 0);
      }
    }
    
    // Handle English text to keep it on the right side in RTL mode
    // We need to wrap continuous English sequences with RLM marks
    if (value.length > localText.length) {
      // User is typing - check if they typed an English letter
      const typedChar = value[cursorPos - 1];
      if (/[A-Za-z]/.test(typedChar)) {
        // Find the start and end of the English word/sequence
        let start = cursorPos - 1;
        let end = cursorPos;
        
        // Find start of English sequence
        while (start > 0 && /[A-Za-z\s]/.test(value[start - 1])) {
          start--;
        }
        
        // Find end of English sequence
        while (end < value.length && /[A-Za-z\s]/.test(value[end])) {
          end++;
        }
        
        // Check if this English sequence needs RLM marks
        const beforeSeq = value.substring(0, start);
        const englishSeq = value.substring(start, end);
        const afterSeq = value.substring(end);
        
        // Only add RLM if we're not already inside RLM marks
        if (!beforeSeq.endsWith('\u200F') && !afterSeq.startsWith('\u200F')) {
          // Wrap the English sequence with RLM marks to keep it on the right
          value = beforeSeq + '\u200F' + englishSeq + '\u200F' + afterSeq;
          
          // Adjust cursor position (it should stay after the typed character)
          setTimeout(() => {
            if (textRef.current) {
              textRef.current.setSelectionRange(cursorPos + 1, cursorPos + 1);
            }
          }, 0);
        }
      }
    }
    
    // Check for list formatting when space is pressed
    if (value.length > localText.length && value[cursorPos - 1] === ' ') {
      const listResult = handleListFormatting(value, cursorPos);
      if (listResult.formatted) {
        value = listResult.newText;
        setLocalText(value);
        onUpdate(block.id, 'text', value);
        
        // Set cursor position
        setTimeout(() => {
          if (textRef.current) {
            textRef.current.setSelectionRange(listResult.newCursorPos, listResult.newCursorPos);
          }
        }, 0);
        
        // Auto-resize
        if (textRef.current) {
          textRef.current.style.height = 'auto';
          textRef.current.style.height = textRef.current.scrollHeight + 'px';
        }
        return;
      }
    }
    
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
    
    // Check for "..." transformation to timestamp with brackets
    if (value.includes('...')) {
      const currentTime = getCurrentMediaTime();
      const timestamp = formatTimestamp(currentTime || 0);
      const timestampWithBrackets = ' [' + timestamp + '] ';
      value = value.replace('...', timestampWithBrackets);
      addDebugLog('Transformed ... to: ' + timestampWithBrackets);
      // Don't move cursor - let it stay naturally after the timestamp
      // User can manually go back if they want to add uncertainty remark
    }
    
    // Check for uncertainty remarks pattern
    // Debug: Log the current value to see what we're working with
    if (value.includes('[') && value.includes(']')) {
      addDebugLog('Text contains brackets. Value: "' + value + '"');
      addDebugLog('Cursor position: ' + cursorPos);
    }
    
    // The text comes AFTER the timestamp in the string: [HH:MM:SS text]
    // Pattern to match: [timestamp text] with optional space and confidence markers
    const uncertaintyPattern = /\[(\d{2}:\d{2}:\d{2})\s*([^\[\]]+?)\](\?{0,2})/g;
    
    let match;
    while ((match = uncertaintyPattern.exec(value)) !== null) {
      const fullMatch = match[0];
      const timestamp = match[1];
      const textAfterTimestamp = match[2];
      const confidence = match[3]; // '', '?', or '??'
      
      addDebugLog('Pattern matched: "' + fullMatch + '" at index ' + match.index);
      addDebugLog('Timestamp: "' + timestamp + '", Text: "' + textAfterTimestamp + '"');
      
      // Only process if there's text after the timestamp
      const uncertainText = textAfterTimestamp.trim();
      if (!uncertainText) {
        addDebugLog('No uncertain text found, skipping');
        continue;
      }
      
      addDebugLog('Found uncertainty: text="' + uncertainText + '", timestamp="' + timestamp + '", confidence="' + confidence + '"');
      
      // Check if cursor has left the brackets completely
      const bracketStart = match.index;
      const bracketEnd = match.index + fullMatch.length;
      // Only consider cursor "outside" if it's completely outside the brackets
      const cursorOutside = cursorPos === null || cursorPos <= bracketStart || cursorPos >= bracketEnd;
      
      addDebugLog('Cursor check: pos=' + cursorPos + ', start=' + bracketStart + ', end=' + bracketEnd + ', outside=' + cursorOutside);
      
      // Store this remark in a data attribute to avoid re-processing
      const remarkKey = timestamp + '-${uncertainText}';
      
      addDebugLog('Processing check: key="' + remarkKey + '", already processed=' + processedRemarks.has(remarkKey));
      
      if (cursorOutside && !processedRemarks.has(remarkKey)) {
        // Parse timestamp to get time in seconds
        const [hours, minutes, seconds] = timestamp.split(':').map(Number);
        const timeInSeconds = hours * 3600 + minutes * 60 + seconds;
        
        addDebugLog('DISPATCHING EVENT: text="' + uncertainText + '", time=' + timeInSeconds);
        
        // Trigger uncertainty remark event
        const event = new CustomEvent('createUncertaintyRemark', {
          detail: {
            timestamp,
            time: timeInSeconds,
            text: uncertainText,
            confidence,
            blockId: block.id,
            context: value.substring(Math.max(0, bracketStart - 50), Math.min(value.length, bracketEnd + 50))
          }
        });
        document.dispatchEvent(event);
        
        // Mark as processed
        setProcessedRemarks(prev => new Set(prev).add(remarkKey));
        
        // Remove the uncertain text from brackets, keeping just the timestamp
        const cleanedBrackets = ' [' + timestamp + ']' + confidence + ' ';
        value = value.substring(0, bracketStart) + cleanedBrackets + value.substring(bracketEnd);
        
        // Adjust cursor position if it was after the brackets
        if (cursorPos && cursorPos > bracketEnd) {
          const diff = fullMatch.length - cleanedBrackets.length;
          cursorPos = cursorPos - diff;
        }
        
      }
    }
    
    // Check if lists need renumbering (but avoid doing it while typing in the middle of text)
    const needsRenumber = value.includes('\n') && (
      value.match(/^[\u200F]?\d+\.\s+/m) || // Has list items
      localText.match(/^[\u200F]?\d+\.\s+/m) // Had list items
    );
    
    if (needsRenumber && Math.abs(value.length - localText.length) > 1) {
      // Significant change (not just typing a character) - renumber lists
      const renumbered = renumberLists(value);
      if (renumbered !== value) {
        value = renumbered;
        // Adjust cursor position if needed
        setTimeout(() => {
          if (textRef.current && cursorPos) {
            textRef.current.setSelectionRange(cursorPos, cursorPos);
          }
        }, 0);
      }
    }
    
    setLocalText(value);
    
    // Update immediately - debouncing was causing cursor issues
    onUpdate(block.id, 'text', value);
    
    // Check if cursor is in a timestamp for highlighting
    if (cursorPos !== null) {
      checkTimestampHover(cursorPos, value);
    }
    
    // ALWAYS keep RTL - never change direction to prevent jumping
    // The text will stay on the right and not jump around
    if (textDirection !== 'rtl') {
      setTextDirection('rtl');
    }
    
    // Detect cursor language based on what's around the cursor
    if (cursorPos > 0) {
      // Check the character before cursor
      const charBeforeCursor = value[cursorPos - 1];
      const charAtCursor = value[cursorPos] || '';
      
      // Check if we're in Hebrew or English context
      const hebrewPattern = /[\u0590-\u05FF]/;
      const englishPattern = /[A-Za-z]/;
      
      if (hebrewPattern.test(charBeforeCursor) || hebrewPattern.test(charAtCursor)) {
        switchLanguage('hebrew');
      } else if (englishPattern.test(charBeforeCursor) || englishPattern.test(charAtCursor)) {
        switchLanguage('english');
      }
      // Otherwise keep current language
    }
    
    // Auto-resize textarea while preserving cursor position
    const textarea = e.target;
    const currentCursorPos = textarea.selectionStart;
    const currentSelectionEnd = textarea.selectionEnd;
    
    // Don't interfere with cursor position during Shift+Enter processing
    if (!isProcessingShiftEnter.current) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
      
      // Restore cursor position after resize
      if (currentCursorPos !== null) {
        textarea.setSelectionRange(currentCursorPos, currentSelectionEnd);
      }
    }
  };
  
  // Auto-resize textarea on mount and when text changes
  useEffect(() => {
    if (textRef.current) {
      textRef.current.style.height = 'auto';
      textRef.current.style.height = textRef.current.scrollHeight + 'px';
    }
  }, [localText]);

  // Track cursor position and navigate when entering timestamp in navigation mode
  useEffect(() => {
    if (!textRef.current || activeArea !== 'text') return;

    const handleSelectionChange = () => {
      const textarea = textRef.current;
      if (!textarea) return;

      const cursorPos = textarea.selectionStart;
      const timestampBounds = getTimestampBoundaries(textarea.value, cursorPos);
      
      if (timestampBounds) {
        // Cursor is inside a timestamp, extract and parse it
        const timestampText = textarea.value.substring(timestampBounds.start, timestampBounds.end);
        
        // Only navigate if we entered a different timestamp
        if (lastNavigatedTimestamp.current === timestampText) {
          return; // Already navigated to this timestamp
        }
        
        // Remove brackets if present
        const cleanTimestamp = timestampText.replace(/[\[\]]/g, '');
        const parts = cleanTimestamp.split(':').map(p => parseInt(p, 10));
        let seconds = 0;
        
        if (parts.length === 3) {
          // HH:MM:SS
          seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
          // MM:SS
          seconds = parts[0] * 60 + parts[1];
        }
        
        // Check if navigation mode is on and seek
        const navModeEvent = new CustomEvent('checkNavigationMode', {
          detail: {
            callback: (isOn: boolean) => {
              if (isOn && seconds > 0) {
                // Seek to the timestamp when cursor enters it in navigation mode
                lastNavigatedTimestamp.current = timestampText;
                document.dispatchEvent(new CustomEvent('seekMedia', {
                  detail: { time: seconds }
                }));
              }
            }
          }
        });
        document.dispatchEvent(navModeEvent);
      } else {
        // Cursor is outside any timestamp, reset the tracking
        lastNavigatedTimestamp.current = null;
      }
    };

    // Listen for selection changes on the document
    document.addEventListener('selectionchange', handleSelectionChange);
    
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [activeArea, localText]);

  // Listen for toolbar language change
  useEffect(() => {
    const handleToolbarLanguageChange = (event: CustomEvent) => {
      if (isActive && activeArea === 'text') {
        const { language } = event.detail;
        console.log('Toolbar language change detected:', language);
        setInputLanguage(language);
        setCursorColor(language);
        
        if (textRef.current) {
          textRef.current.style.caretColor = language === 'hebrew' ? '#e91e63' : '#2196f3';
          textRef.current.dataset.language = language;
          textRef.current.focus();
        }
      }
    };

    document.addEventListener('toolbarLanguageChange', handleToolbarLanguageChange);
    return () => {
      document.removeEventListener('toolbarLanguageChange', handleToolbarLanguageChange);
    };
  }, [isActive, activeArea]);

  // Add global keydown listener for END key with highest priority
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Check if this is our text area
      if (isActive && activeArea === 'text' && textRef.current && document.activeElement === textRef.current) {
        // Check if this is a special key that should bubble up to MediaPlayer
        const isSpecialKey = 
          // F-keys
          (e.key.startsWith('F') && e.key.length <= 3 && e.key.length >= 2) ||
          // Numpad keys
          (e.code && e.code.startsWith('Numpad')) ||
          // Combinations with Ctrl/Alt/Meta (but not Shift alone)
          (e.ctrlKey || e.altKey || e.metaKey);
        
        if (isSpecialKey) {
          console.log('Special key in global handler, allowing propagation:', e.key, e.code);
          // Don't stop propagation for special keys
          return;
        }
        
        if (e.key === 'End') {
          console.log('END key CAPTURED globally for block:', block.id);
          
          // Stop propagation immediately at capture phase
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          // Don't prevent default - let cursor move naturally
          // Switch to Hebrew after cursor moves
          setTimeout(() => {
            console.log('Executing Hebrew switch from CAPTURE');
            setInputLanguage('hebrew');
            setCursorColor('hebrew');
            
            // Force cursor color update
            if (textRef.current) {
              textRef.current.style.caretColor = '#e91e63';
              console.log('Cursor color set to pink from CAPTURE');
              
              // Force re-render
              const pos = textRef.current.selectionEnd;
              textRef.current.blur();
              textRef.current.focus();
              textRef.current.setSelectionRange(pos, pos);
            }
          }, 50);
        }
      }
    };

    // Add at capture phase with highest priority
    document.addEventListener('keydown', handleGlobalKeyDown, true);
    
    // Removed window listener to avoid conflict with KeyboardShortcuts
    // The document listener is sufficient for capturing END key
    
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, [isActive, activeArea, block.id]);

  // Format timestamp
  const formatTimestamp = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return (hours.toString().padStart(2, '0')) + ':' + (minutes.toString().padStart(2, '0')) + ':' + (secs.toString().padStart(2, '0'));
  };
  
  // Check if cursor is at or within a timestamp
  const getTimestampBoundaries = (text: string, cursorPos: number): { start: number, end: number } | null => {
    // Match timestamp pattern [HH:MM:SS] or [MM:SS] or HH:MM:SS or MM:SS
    // Include brackets in the pattern to handle bracketed timestamps
    const timestampPattern = /\[?\d{1,2}:\d{2}(:\d{2})?\]?/g;
    let match;
    
    while ((match = timestampPattern.exec(text)) !== null) {
      const start = match.index;
      const end = match.index + match[0].length;
      
      // Check if cursor is within or adjacent to the timestamp (including brackets)
      if (cursorPos >= start && cursorPos <= end) {
        return { start, end };
      }
    }
    
    return null;
  };

  // Handle focus events
  const handleSpeakerFocus = (e: FocusEvent<HTMLInputElement>) => {
    console.log('[TextBlock] Speaker focused for block ' + block.id);
    const input = e.currentTarget;
    // Detect text direction based on existing content
    const direction = detectTextDirection(input.value);
    setSpeakerDirection(direction);
    setCurrentInputMode(direction);
    // Reset selection tracking
    wasFullySelected.current = false;
    
    // Ensure navigation state is correct
    if (!isActive || activeArea !== 'speaker') {
      console.log('[TextBlock] Triggering navigation to speaker for block ' + block.id);
      onNavigate('speaker', undefined);
    }
  };
  
  const handleSpeakerBlur = (e: FocusEvent<HTMLInputElement>) => {
    // Reset selection tracking when losing focus
    wasFullySelected.current = false;
  };

  // Check if cursor is in a timestamp and highlight corresponding remark
  const checkTimestampHover = (cursorPos: number, text: string) => {
    // Pattern to match ANY timestamp bracket, with or without text
    const timestampPattern = /\[(\d{2}:\d{2}:\d{2})[^\]]*\]/g;
    let match;
    let foundTimestamp = false;
    
    while ((match = timestampPattern.exec(text)) !== null) {
      const bracketStart = match.index;
      const bracketEnd = match.index + match[0].length;
      
      // If cursor is inside these brackets (or right at the edges)
      if (cursorPos >= bracketStart && cursorPos <= bracketEnd) {
        const timestamp = match[1];
        foundTimestamp = true;
        addDebugLog('Cursor in timestamp bracket: ' + timestamp + ' at pos ' + cursorPos);
        
        // Dispatch event to highlight this timestamp's remark
        // This will highlight ANY remark with this timestamp, whether it has text or not
        const event = new CustomEvent('highlightRemarkByTimestamp', {
          detail: { timestamp }
        });
        document.dispatchEvent(event);
        return;
      }
    }
    
    // If cursor is not in any timestamp, clear highlight
    if (!foundTimestamp) {
      addDebugLog('Cursor not in any timestamp at pos ' + cursorPos);
      const event = new CustomEvent('highlightRemarkByTimestamp', {
        detail: { timestamp: null }
      });
      document.dispatchEvent(event);
    }
  };

  const handleTextFocus = (e: FocusEvent<HTMLTextAreaElement>) => {
    console.log('Text area FOCUSED - block:', block.id);
    // ALWAYS keep RTL - never change direction
    if (textDirection !== 'rtl') {
      setTextDirection('rtl');
    }
    setCurrentInputMode('rtl');
    // Reset selection tracking
    wasFullySelected.current = false;
    
    // Ensure navigation state is correct
    if (!isActive || activeArea !== 'text') {
      console.log('[TextBlock] Triggering navigation to text for block ' + block.id);
      onNavigate('text', undefined);
    }
    
    // Detect language at cursor position when focusing
    const textarea = e.currentTarget;
    setTimeout(() => {
      const pos = textarea.selectionStart;
      const text = textarea.value;
      if (pos >= 0 && text) {
        const charBeforeCursor = text[pos - 1] || '';
        const charAtCursor = text[pos] || '';
        
        const hebrewPattern = /[\u0590-\u05FF]/;
        const englishPattern = /[A-Za-z]/;
        
        if (hebrewPattern.test(charBeforeCursor) || hebrewPattern.test(charAtCursor)) {
          switchLanguage('hebrew');
        } else if (englishPattern.test(charBeforeCursor) || englishPattern.test(charAtCursor)) {
          switchLanguage('english');
        } else {
          // Default to Hebrew
          switchLanguage('hebrew');
        }
      }
    }, 0);
  };
  
  const handleTextBlur = (e: FocusEvent<HTMLTextAreaElement>) => {
    // Reset selection tracking when losing focus
    wasFullySelected.current = false;
  };

  // Handle click on block for navigation mode and multi-select
  const handleBlockClick = (e: React.MouseEvent) => {
    // Handle multi-select if onClick prop is provided
    if (onClick) {
      onClick(e.ctrlKey, e.shiftKey);
    }
    // Check if click was on a timestamp in the text
    const target = e.target as HTMLElement;
    if (target.tagName === 'TEXTAREA') {
      const textarea = target as HTMLTextAreaElement;
      const clickPos = textarea.selectionStart;
      const timestampBounds = getTimestampBoundaries(textarea.value, clickPos);
      
      if (timestampBounds) {
        // Extract and parse the timestamp
        const timestampText = textarea.value.substring(timestampBounds.start, timestampBounds.end);
        // Remove brackets if present
        const cleanTimestamp = timestampText.replace(/[\[\]]/g, '');
        const parts = cleanTimestamp.split(':').map(p => parseInt(p, 10));
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
                // Seek to the timestamp when clicked in navigation mode
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
          if (isOn && block.speakerTime !== undefined && !isNaN(block.speakerTime) && block.speakerTime > 0) {
            // Seek to this block's timestamp in navigation mode
            document.dispatchEvent(new CustomEvent('seekMedia', {
              detail: { time: block.speakerTime }
            }));
          }
        }
      }
    });
    document.dispatchEvent(navModeEvent);
  };

  // Check if block has highlights
  const hasHighlight = speakerHighlights.length > 0 || textHighlights.length > 0;
  const hasCurrentHighlight = speakerHighlights.some(h => h.isCurrent) || textHighlights.some(h => h.isCurrent);

  return (
    <div 
      className={'text-block ' + (isActive ? 'active' : '') + ' ' + (!isIsolated ? 'non-isolated' : '') + ' ' + (hasCurrentHighlight ? 'has-current-highlight' : hasHighlight ? 'has-highlight' : '') + ' ' + (!blockViewEnabled ? 'regular-view' : '')} 
      style={{ 
        fontSize: fontSize + 'px',
        borderLeftColor: blockViewEnabled ? (isIsolated ? speakerColor : '#cbd5e1') : 'transparent',
        borderRightColor: blockViewEnabled ? (isIsolated ? speakerColor : '#cbd5e1') : 'transparent',
        borderLeftWidth: blockViewEnabled ? '4px' : '0',
        borderRightWidth: blockViewEnabled ? '4px' : '0'
      }}
      onClick={handleBlockClick}
    >
      {hasCurrentHighlight && (
        <div className="search-highlight-marker" />
      )}
      <div className="speaker-input-wrapper" style={{ position: 'relative' }}>
        {speakerHighlights.length > 0 && (
          <TextHighlightOverlay
            text={localSpeaker}
            highlights={speakerHighlights}
            targetRef={speakerRef}
            isTextArea={false}
          />
        )}
        <input
        ref={speakerRef}
        className="block-speaker"
        type="text"
        value={blockViewEnabled ? localSpeaker : (() => {
          if (!fullSpeakerName) return '';
          // Only add colon for multi-character names (not single codes)
          const isSingleCode = fullSpeakerName.length === 1 && 
            (/^[א-ת]$/.test(fullSpeakerName) || /^[A-Za-z]$/.test(fullSpeakerName));
          return isSingleCode ? fullSpeakerName : fullSpeakerName + ':';
        })()}
        onChange={handleSpeakerChange}
        onKeyDown={handleSpeakerKeyDown}
        onFocus={handleSpeakerFocus}
        onBlur={handleSpeakerBlur}
        placeholder="דובר"
        dir={speakerDirection}
        style={{ 
          color: isIsolated ? '#333' : '#cbd5e1',
          direction: speakerDirection,
          textAlign: speakerDirection === 'rtl' ? 'right' : 'left',
          fontSize: fontSize + 'px',
          fontFamily: fontFamily === 'david' ? 'David, serif' : 'inherit',
          fontWeight: isIsolated ? 600 : 400,
          position: 'relative',
          zIndex: 2,
          background: 'transparent'
        }}
        data-timestamp={block.speakerTime || 0}
        />
        {blockViewEnabled && nameCompletion && (
          <span className="name-completion" style={{ fontSize: fontSize + 'px' }}>
            {nameCompletion}
          </span>
        )}
      </div>
      
      {blockViewEnabled && (
        <span className="block-separator" style={{ fontSize: fontSize + 'px' }}>:</span>
      )}
      
      <div style={{ position: 'relative', flex: 1 }}>
        {textHighlights.length > 0 && (
          <TextHighlightOverlay
            text={localText}
            highlights={textHighlights}
            targetRef={textRef}
            isTextArea={true}
          />
        )}
        <textarea
          ref={textRef}
          className="block-text"
          value={localText}
          onChange={handleTextChange}
          onKeyDown={handleTextKeyDown}
          onFocus={handleTextFocus}
          onBlur={handleTextBlur}
          onMouseUp={(e) => {
            // Check for timestamp highlight when clicking
            const textarea = e.currentTarget;
            setTimeout(() => {
              checkTimestampHover(textarea.selectionStart, textarea.value);
            }, 10);
          }}
          placeholder={isFirstBlock ? "הקלד טקסט כאן..." : ""}
          dir="rtl"
          style={{ 
            direction: 'rtl',
            textAlign: 'right',
            resize: 'none',
            overflow: 'hidden',
            fontSize: fontSize + 'px',
            fontFamily: fontFamily === 'david' ? 'David, serif' : 'inherit',
            color: isIsolated ? 'inherit' : '#94a3b8',
            caretColor: inputLanguage === 'english' ? '#2196f3' : '#e91e63',
            fontWeight: isIsolated ? 'normal' : 300,
            position: 'relative',
            zIndex: 2,
            background: 'transparent'
          }}
          rows={1}
        />
      </div>
      
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
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Return true if props are equal (skip re-render)
  // Return false if props are different (re-render)
  
  // Always re-render if active state changes
  if (prevProps.isActive !== nextProps.isActive) return false;
  if (prevProps.activeArea !== nextProps.activeArea) return false;
  
  // Always re-render if block data changes
  if (prevProps.block.id !== nextProps.block.id) return false;
  if (prevProps.block.speaker !== nextProps.block.speaker) return false;
  if (prevProps.block.text !== nextProps.block.text) return false;
  if (prevProps.block.speakerTime !== nextProps.block.speakerTime) return false;
  
  // Re-render if highlights change
  if (prevProps.speakerHighlights.length !== nextProps.speakerHighlights.length) return false;
  if (prevProps.textHighlights.length !== nextProps.textHighlights.length) return false;
  if (prevProps.speakerHighlights.some((h, i) => {
    const next = nextProps.speakerHighlights[i];
    return !next || h.startIndex !== next.startIndex || h.endIndex !== next.endIndex || h.isCurrent !== next.isCurrent;
  })) return false;
  if (prevProps.textHighlights.some((h, i) => {
    const next = nextProps.textHighlights[i];
    return !next || h.startIndex !== next.startIndex || h.endIndex !== next.endIndex || h.isCurrent !== next.isCurrent;
  })) return false;
  
  // Re-render if visual props change
  if (prevProps.speakerColor !== nextProps.speakerColor) return false;
  if (prevProps.fontSize !== nextProps.fontSize) return false;
  if (prevProps.fontFamily !== nextProps.fontFamily) return false;
  if (prevProps.isIsolated !== nextProps.isIsolated) return false;
  if (prevProps.blockViewEnabled !== nextProps.blockViewEnabled) return false;
  
  // Re-render if previousSpeaker changes (for auto-correct validation)
  if (prevProps.previousSpeaker !== nextProps.previousSpeaker) return false;
  
  // Skip re-render for callback functions (they should be stable with useCallback)
  // and other props that don't affect rendering
  return true;
});

export default TextBlock;