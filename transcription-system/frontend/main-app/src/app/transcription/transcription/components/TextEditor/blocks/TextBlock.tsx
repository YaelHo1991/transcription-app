'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo, KeyboardEvent, FocusEvent } from 'react';
import { flushSync } from 'react-dom';
import { ProcessTextResult } from '../types/shortcuts';
import TextHighlightOverlay from '../components/TextHighlightOverlay';
import { AutoCorrectEngine } from '../utils/AutoCorrectEngine';
import progressService from '@/services/progressService';
import { transcriptionRulesService } from '@/services/transcriptionRulesService';
import './TextBlock.css';

export interface TextBlockData {
  id: string;
  speaker: string;
  text: string;
  speakerTime?: number;
  isContinuation?: boolean;      // Marks continuation blocks (Shift+Enter)
  parentSpeaker?: string;         // Tracks parent speaker for color inheritance
  isSpecialTag?: boolean;         // Marks special annotation blocks (e.g., [מדברים יחד])
}

// Special tag mappings - triggered by [ at position 0 in speaker field
// Using LRM (Left-to-Right Mark) \u200E to force correct bracket orientation in RTL context
const SPECIAL_TAGS = {
  'מ': '\u200E[\u200Eמדברים יחד\u200E]\u200E',
  'צ': '\u200E[\u200Eצוחקים\u200E]\u200E',
  'ע': '\u200E[\u200Eמעיינים במסמכים\u200E]\u200E',
  'ד': '\u200E[\u200Eאין דיבורים\u200E]\u200E'
} as const;

const VALID_TAG_LETTERS = ['מ', 'צ', 'ע', 'ד'];

interface TextBlockProps {
  block: TextBlockData;
  blockIndex?: number;
  isActive: boolean;
  isFirstBlock?: boolean;
  activeArea: 'speaker' | 'text';
  cursorAtStart?: boolean;
  onNavigate: (direction: 'prev' | 'next' | 'up' | 'down' | 'speaker' | 'text', fromField: 'speaker' | 'text') => void;
  onUpdate: (id: string, field: 'speaker' | 'text', value: string) => void;
  onNewBlock: (initialText?: string, cursorPos?: number, isContinuation?: boolean, parentSpeaker?: string, before?: boolean) => void;
  onRemoveBlock: (id: string) => void;
  onJoinBlock?: (blockId: string) => { joinPosition: number; previousBlockId: string; joinedText: string } | null;
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
  mediaName?: string;
  onClick?: (ctrlKey: boolean, shiftKey: boolean) => void;
  autoCorrectEngine?: AutoCorrectEngine;
  previousSpeaker?: string;
  ruleSettings?: {
    enabledRuleIds: string[];
    prefixSettings: { [ruleId: string]: string[] };
    separatorSettings: { [ruleId: string]: string };
  };
  isRegisteringShortcut?: boolean;
  shortcutPrefix?: string;
  shortcutPrefixStart?: number;
  shortcutPrefixEnd?: number;
  onEnterRegistrationMode?: (blockId: string, prefix: string, startPos: number, endPos: number) => void;
  onExitRegistrationMode?: () => void;
  onRegisterShortcut?: (shortcut: string, expansion: string) => Promise<void>;
  onGetShortcutExpansion?: (shortcut: string) => string | null;
}

const TextBlock = React.memo(function TextBlock({
  block,
  blockIndex = -1,
  isActive,
  isFirstBlock = false,
  mediaName,
  activeArea,
  cursorAtStart = false,
  onNavigate,
  onUpdate,
  onNewBlock,
  onRemoveBlock,
  onJoinBlock,
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
  previousSpeaker = '',
  ruleSettings,
  isRegisteringShortcut = false,
  shortcutPrefix = '',
  shortcutPrefixStart = 0,
  shortcutPrefixEnd = 0,
  onEnterRegistrationMode,
  onExitRegistrationMode,
  onRegisterShortcut,
  onGetShortcutExpansion
}: TextBlockProps) {
  const speakerRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [localSpeaker, setLocalSpeaker] = useState(block.speaker);
  const [localText, setLocalText] = useState(block.text);
  const [isEnteringTag, setIsEnteringTag] = useState(false);  // Track tag entry mode

  // Debug: Log when isRegisteringShortcut prop changes
  useEffect(() => {
    console.log('🟡 [TextBlock] useEffect fired for block:', block.id, 'isRegisteringShortcut:', isRegisteringShortcut);
    if (isRegisteringShortcut) {
      console.log('🟡🟡🟡 [TextBlock] isRegisteringShortcut prop changed to TRUE for block:', block.id);
      console.log('🟡 [TextBlock] blockIndex:', blockIndex);
      console.log('🟡 [TextBlock] CSS class should be: "block-text registering-shortcut"');
      // Check actual DOM element
      if (textRef.current) {
        console.log('🟡 [TextBlock] ACTUAL className on DOM:', textRef.current.className);
        console.log('🟡 [TextBlock] ACTUAL computed background:', window.getComputedStyle(textRef.current).backgroundColor);
      }
    }
  }, [isRegisteringShortcut, block.id]);
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
  const [debugWordExtraction, setDebugWordExtraction] = useState<string>('');
  const [isWordHighlighted, setIsWordHighlighted] = useState(false); // Simple local state for green highlight
  const [isTypingMeaning, setIsTypingMeaning] = useState(false); // User pressed Tab, now typing meaning
  const [registrationWordStart, setRegistrationWordStart] = useState<number>(0); // Track where the word starts
  const [registrationWordEnd, setRegistrationWordEnd] = useState<number>(0); // Track where the word ends
  const [textLengthWhenArrowAdded, setTextLengthWhenArrowAdded] = useState<number>(0); // Track text length when arrow was inserted
  const [currentCursorPosition, setCurrentCursorPosition] = useState<number>(0); // Track actual cursor position
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingFromProps = useRef(false);
  const wasFullySelected = useRef(false);
  const lastNavigatedTimestamp = useRef<string | null>(null);
  const isProcessingShiftEnter = useRef(false);
  const shiftEnterStartTime = useRef<number>(0);
  
  // Undo history for shortcuts
  interface UndoHistoryItem {
    text: string;
    cursorPosition: number;
    isShortcutExpansion: boolean;
    timestamp: number;
    expandedShortcut?: string;
  }
  const [undoHistory, setUndoHistory] = useState<UndoHistoryItem[]>([]);
  const lastShortcutExpansion = useRef<{
    originalText: string;
    expandedShortcut: string;
    expansionStart: number;
    expansionEnd: number;
  } | null>(null);

  // Pending compound transformation state
  interface PendingCompound {
    originalWord: string;        // e.g., "חמישים"
    transformedValue: string;    // e.g., "50" or "ב-50"
    position: number;            // Position in text
    hadPrefix: boolean;          // true if had prefix like "ב"
    prefix?: string;             // The actual prefix: "ב", "ו", "כ", etc.
    separator?: string;          // The separator: "-" or ""
  }
  const [pendingCompound, setPendingCompound] = useState<PendingCompound | null>(null);

  // Removed debouncing as it was causing cursor jump issues
  // The React.memo optimization is sufficient for performance

  // Compound transformation pattern definitions
  const COMPOUND_PATTERNS = {
    // Tens (20-90) that can combine with units
    tens: ['עשרים', 'שלושים', 'ארבעים', 'חמישים', 'שישים', 'שבעים', 'שמונים', 'תשעים'],

    // Unit combiners (ו + 1-9)
    unitCombiners: [
      'ואחד', 'ואחת', 'ושניים', 'ושתיים', 'ושלושה', 'ושלוש',
      'וארבעה', 'וארבע', 'וחמישה', 'וחמש', 'ושישה', 'ושש',
      'ושבעה', 'ושבע', 'ושמונה', 'ותשעה', 'ותשע'
    ],

    // Percent words
    percentWords: ['אחוז', 'אחוזים'],

    // Thousand words
    thousandWords: ['אלף', 'אלפים'],

    // Hundred words
    hundredWords: ['מאה', 'מאות', 'מאתיים'],

    // Numbers 1-10 that can precede אלף/אלפים/מאות (including both forms)
    thousandUnits: ['אחד', 'אחת', 'שניים', 'שתיים', 'שני', 'שתי',
                    'שלושה', 'שלוש', 'ארבעה', 'ארבע',
                    'חמישה', 'חמש', 'שישה', 'שש', 'שבעה', 'שבע',
                    'שמונה', 'תשעה', 'תשע', 'עשרה', 'עשר',
                    'שבעת', 'שמונת', 'תשעת', 'עשרת']
  };

  // Map Hebrew unit words to numbers
  const unitValueMap: { [key: string]: number } = {
    'ואחד': 1, 'ואחת': 1,
    'ושניים': 2, 'ושתיים': 2,
    'ושלושה': 3, 'ושלוש': 3,
    'וארבעה': 4, 'וארבע': 4,
    'וחמישה': 5, 'וחמש': 5,
    'ושישה': 6, 'ושש': 6,
    'ושבעה': 7, 'ושבע': 7,
    'ושמונה': 8,
    'ותשעה': 9, 'ותשע': 9
  };

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
  
  // Listen for setNextBlockText event (for auto-numbering and block joining)
  useEffect(() => {
    const handleSetNextBlockText = (event: CustomEvent) => {
      const { blockId, text, cursorPosition } = event.detail;

      // Only handle if this is the target block
      if (blockId === block.id && textRef.current) {
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
  }, [block.id, onUpdate]);

  // Cancel registration when block loses focus or becomes inactive
  useEffect(() => {
    if (!isActive && (isWordHighlighted || isTypingMeaning)) {
      console.log('✅ Block lost focus - canceling registration');

      // Remove arrow and meaning if they exist
      if (isTypingMeaning) {
        const originalWord = localText.substring(registrationWordStart, registrationWordEnd);
        const beforeWord = localText.substring(0, registrationWordStart);
        const newText = beforeWord + originalWord;
        setLocalText(newText);
        onUpdate(block.id, 'text', newText);
      }

      // Reset all registration state
      setIsWordHighlighted(false);
      setIsTypingMeaning(false);
      setRegistrationWordStart(0);
      setRegistrationWordEnd(0);
      setTextLengthWhenArrowAdded(0);
    }
  }, [isActive, isWordHighlighted, isTypingMeaning, localText, registrationWordStart, registrationWordEnd, block.id, onUpdate]);

  // Helper function to add debug log
  const addDebugLog = (message: string) => {
    // Debug logging disabled
  };

  // Helper function to extract word behind cursor for shortcut registration
  const extractWordBehindCursor = (text: string, cursorPos: number): {
    word: string;
    startPos: number;
    endPos: number;
  } => {
    // If cursor is after a space, move back one position
    let searchPos = cursorPos;
    if (searchPos > 0 && text[searchPos - 1] === ' ') {
      searchPos--;
    }

    // Find end of word (at searchPos)
    const endPos = searchPos;

    // Find start of word (go backwards until space or start)
    let startPos = endPos;
    while (startPos > 0 && text[startPos - 1] !== ' ') {
      startPos--;
    }

    const word = text.substring(startPos, endPos);

    return { word, startPos, endPos };
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

  // Initialize directions - dynamically detect based on content
  useEffect(() => {
    // Detect text direction based on content
    const textToCheck = localText || block.text;
    const newTextDir = detectTextDirection(textToCheck);
    if (newTextDir !== textDirection) {
      setTextDirection(newTextDir);
    }

    // Update speaker direction based on content
    const speakerToCheck = localSpeaker || block.speaker;
    const newSpeakerDir = detectTextDirection(speakerToCheck);
    if (newSpeakerDir !== speakerDirection) {
      setSpeakerDirection(newSpeakerDir);
    }
  }, [block.text, block.speaker, localText, localSpeaker, textDirection, speakerDirection]);
  
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

  // Removed forceBlockTextUpdate listener - transformations now happen word-by-word in handleTextChange

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

  // Focus management - simplified to prevent cursor jumping
  useEffect(() => {
    if (isActive) {
      const targetRef = activeArea === 'speaker' ? speakerRef : textRef;

      // Single focus attempt with small delay for DOM readiness
      const focusTimeout = setTimeout(() => {
        if (targetRef.current && document.activeElement !== targetRef.current) {
          console.log('[TextBlock] Focusing ' + activeArea + ' field, block ' + block.id);
          targetRef.current.focus();

          // Only position cursor if explicitly requested
          if (cursorAtStart) {
            setTimeout(() => {
              if (targetRef.current) {
                // DELETE key or explicit request to position at start
                (targetRef.current as HTMLInputElement | HTMLTextAreaElement).setSelectionRange(0, 0);
                console.log('[TextBlock] Positioned cursor at start');
              }
            }, 20);
          }
          // Otherwise let cursor stay at natural position (arrow down keeps column position)
        }
      }, 10);

      return () => clearTimeout(focusTimeout);
    } else {
      // Clear name completion when block loses focus
      setNameCompletion('');
    }
  }, [isActive, activeArea, cursorAtStart, block.id, block.text]);

  // Detect Alt+Shift language switch and force layout reflow for proper justification
  useEffect(() => {
    if (!textRef.current) return;

    const textarea = textRef.current;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Detect Alt+Shift combination (language switch in Windows)
      if ((e.altKey && e.shiftKey) || (e.key === 'Shift' && e.altKey) || (e.key === 'Alt' && e.shiftKey)) {
        // Force layout reflow after a tiny delay to let the language switch take effect
        setTimeout(() => {
          if (textarea) {
            // Force reflow by reading layout property
            void textarea.offsetHeight;

            // Additional reflow trigger
            const originalDisplay = textarea.style.display;
            textarea.style.display = 'none';
            void textarea.offsetHeight;
            textarea.style.display = originalDisplay;
          }
        }, 50); // Small delay to ensure language switch has happened
      }
    };

    textarea.addEventListener('keydown', handleKeyDown);

    return () => {
      textarea.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Special tag cursor position control - prevent cursor from entering inside tag
  useEffect(() => {
    const isSpecialTag = Object.values(SPECIAL_TAGS).includes(localSpeaker);
    if (isSpecialTag && speakerRef.current) {
      const handleClick = () => {
        const input = speakerRef.current;
        if (!input) return;

        // Only allow cursor at position 0 (before tag) or at end (after tag)
        setTimeout(() => {
          const cursorPos = input.selectionStart || 0;
          const tagLength = localSpeaker.length;

          if (cursorPos > 0 && cursorPos < tagLength) {
            // Cursor is inside tag - move it to end
            input.setSelectionRange(tagLength, tagLength);
          }
        }, 0);
      };

      const handleKeyUp = (e: KeyboardEvent) => {
        // Don't interfere with arrow navigation keys
        if (e.key.startsWith('Arrow')) {
          return;
        }

        const input = speakerRef.current;
        if (!input) return;

        // Only allow cursor at position 0 (before tag) or at end (after tag)
        const cursorPos = input.selectionStart || 0;
        const tagLength = localSpeaker.length;

        if (cursorPos > 0 && cursorPos < tagLength) {
          // Cursor is inside tag - move it to end
          input.setSelectionRange(tagLength, tagLength);
        }
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        // For non-arrow keys, check cursor position immediately
        if (!e.key.startsWith('Arrow') && e.key !== 'Backspace') {
          const input = speakerRef.current;
          if (!input) return;

          const cursorPos = input.selectionStart || 0;
          const tagLength = localSpeaker.length;

          // If cursor is inside tag, prevent the keypress
          if (cursorPos > 0 && cursorPos < tagLength) {
            e.preventDefault();
            // Move cursor to end
            input.setSelectionRange(tagLength, tagLength);
          }
        }
      };

      const handleSelect = () => {
        const input = speakerRef.current;
        if (!input) return;

        setTimeout(() => {
          const cursorPos = input.selectionStart || 0;
          const tagLength = localSpeaker.length;

          if (cursorPos > 0 && cursorPos < tagLength) {
            // Cursor is inside tag - move it to end
            input.setSelectionRange(tagLength, tagLength);
          }
        }, 0);
      };

      speakerRef.current.addEventListener('click', handleClick);
      speakerRef.current.addEventListener('keyup', handleKeyUp as EventListener);
      speakerRef.current.addEventListener('keydown', handleKeyDown as EventListener);
      speakerRef.current.addEventListener('select', handleSelect);
      speakerRef.current.addEventListener('mouseup', handleClick);

      return () => {
        if (speakerRef.current) {
          speakerRef.current.removeEventListener('click', handleClick);
          speakerRef.current.removeEventListener('keyup', handleKeyUp as EventListener);
          speakerRef.current.removeEventListener('keydown', handleKeyDown as EventListener);
          speakerRef.current.removeEventListener('select', handleSelect);
          speakerRef.current.removeEventListener('mouseup', handleClick);
        }
      };
    }
  }, [localSpeaker]);

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

  // Helper to safely clear Shift+Enter flag
  const clearShiftEnterFlag = () => {
    // Only clear if minimum time has passed (1 second for first blocks, 500ms for others)
    const minTime = (block.id === 'block-0' || block.id === 'block-1' || block.id === 'block-2') ? 1000 : 500;
    const elapsed = Date.now() - shiftEnterStartTime.current;
    
    if (elapsed >= minTime) {
      isProcessingShiftEnter.current = false;
    } else {
      // Try again after remaining time
      setTimeout(() => {
        isProcessingShiftEnter.current = false;
      }, minTime - elapsed);
    }
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

    // Skip transformation for special tags - they're complete as-is
    const isSpecialTag = Object.values(SPECIAL_TAGS).includes(text);
    if (isSpecialTag) return;

    // Block [ from being used as a speaker code (reserved for tag entry)
    if (text === '[') return;

    // Allow letters, numbers, and punctuation as valid codes/names (except colon and [)
    const isValid = /^[א-תA-Za-z0-9.,/;\-*+!?()\]]+$/.test(text);
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
    // ============ RTL PUNCTUATION FIX ============
    // Fix cursor jumping for punctuation marks and numbers in RTL context
    // EXCEPT for [ at position 0 in empty field (that's for tag entry)
    const punctuationKeys = ['.', ',', '!', '?', ':', ';', '(', ')', '[', ']', '{', '}', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    if (punctuationKeys.includes(e.key) && !e.ctrlKey && !e.altKey && !e.metaKey) {
      const input = speakerRef.current;
      if (!input) return;

      const cursorPos = input.selectionStart || 0;
      const value = input.value;

      // Special case: [ at position 0 in empty speaker field AND empty text field - tag entry mode
      if (e.key === '[' && cursorPos === 0 && value === '' && localText === '') {
        e.preventDefault();

        // Add RLM + [ to display bracket correctly in RTL context
        const RLM = '\u200F';
        const newValue = RLM + '[';
        setLocalSpeaker(newValue);
        onUpdate(block.id, 'speaker', newValue);

        // Set tag entry mode
        setIsEnteringTag(true);

        // Position cursor after the bracket
        setTimeout(() => {
          if (input) {
            input.setSelectionRange(2, 2); // After RLM + [
          }
        }, 0);

        return;
      }

      // For [ character: if we're here, block it completely (not for tag entry)
      if (e.key === '[') {
        e.preventDefault();
        return;
      }

      e.preventDefault();

      // RLM (Right-to-Left Mark) to establish RTL context for punctuation/numbers in empty/neutral fields
      const RLM = '\u200F';

      // Check if we need RLM: field is empty or starts with punctuation/numbers/neutral characters
      // Strip RLM from start before checking to handle already-marked strings
      const valueWithoutRLM = value.replace(/^\u200F/, '');
      const needsRLM = value === '' || /^[.,:;!?()[\]{}0-9]/.test(valueWithoutRLM);

      // Build new value with RLM prefix if needed
      let newValue: string;
      let newCursorPos: number;

      if (needsRLM && !value.startsWith(RLM)) {
        // Prepend RLM and insert character
        newValue = RLM + value.slice(0, cursorPos) + e.key + value.slice(cursorPos);
        newCursorPos = cursorPos + 2; // +1 for RLM, +1 for character
      } else {
        // Just insert character normally
        newValue = value.slice(0, cursorPos) + e.key + value.slice(cursorPos);
        newCursorPos = cursorPos + 1;
      }

      // Edge case: If field contains ONLY numbers/punctuation (no Hebrew), add trailing RLM too
      const visibleContent = newValue.replace(/\u200F/g, ''); // Strip all RLM markers
      const hasHebrewText = /[\u0590-\u05FF]/.test(visibleContent);

      if (!hasHebrewText && visibleContent.length > 0 && !newValue.endsWith(RLM)) {
        // Only numbers/punctuation - add RLM at end to fully establish RTL context
        newValue = newValue + RLM;
        // Don't change cursor position - it's already correct
      }

      // Update the value
      setLocalSpeaker(newValue);
      onUpdate(block.id, 'speaker', newValue);

      // Force cursor to stay right after the inserted character
      setTimeout(() => {
        if (input) {
          input.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);

      return;
    }
    // ============ END RTL PUNCTUATION FIX ============

    // ============ SPECIAL TAG ENTRY MODE ============
    if (isEnteringTag) {
      // Allow Backspace to cancel tag entry
      if (e.key === 'Backspace') {
        setIsEnteringTag(false);
        setLocalSpeaker('');
        onUpdate(block.id, 'speaker', '');
        return;
      }

      // Only allow valid tag letters
      if (VALID_TAG_LETTERS.includes(e.key)) {
        e.preventDefault();
        const fullTag = SPECIAL_TAGS[e.key as keyof typeof SPECIAL_TAGS];
        setLocalSpeaker(fullTag);
        onUpdate(block.id, 'speaker', fullTag);
        setIsEnteringTag(false);

        // Move focus to next block
        setTimeout(() => onNavigate('down', 'speaker'), 10);
        return;
      }

      // Block all other keys during tag entry
      e.preventDefault();
      return;
    }
    // ============ END TAG ENTRY MODE ============

    // ============ SHORTCUT REGISTRATION MODE HANDLERS ============
    // Handle Alt+5 FIRST before any other logic

    // Alt+4: Extract word behind cursor and enter registration mode
    if (e.altKey && e.key === '4') {
      e.preventDefault();
      e.stopPropagation();
      console.log('[Registration] Alt+4 pressed in speaker field');
      const cursorPosition = e.currentTarget.selectionStart || 0;
      const { word, startPos, endPos } = extractWordBehindCursor(localSpeaker, cursorPosition);

      if (!word || word.trim().length === 0) {
        console.log('[Registration] No word found behind cursor');
        return;
      }

      console.log('[Registration] Extracted word:', { word, startPos, endPos });
      onEnterRegistrationMode?.(block.id, word, startPos, endPos);
      return;
    }

    // Escape: Exit registration mode
    if (e.key === 'Escape' && isRegisteringShortcut) {
      e.preventDefault();
      e.stopPropagation();
      console.log('[Registration] Escape pressed in speaker field, exiting registration mode');
      onExitRegistrationMode?.();
      return;
    }

    // ============ END REGISTRATION MODE HANDLERS ============

    // Check if this is a special key that should bubble up to MediaPlayer
    // BUT: Arrow keys should NOT bubble up - we handle them here for navigation
    const isArrowKey = e.key.startsWith('Arrow');
    const isSpecialKey =
      // F-keys
      (e.key.startsWith('F') && e.key.length <= 3 && e.key.length >= 2) ||
      // Numpad keys
      (e.code && e.code.startsWith('Numpad')) ||
      // Combinations with Ctrl/Alt/Meta (except our specific shortcuts AND Alt+5)
      ((e.ctrlKey || e.altKey || e.metaKey) && !(e.altKey && e.key === '5'));

    // Check if this is one of our text editor shortcuts that we handle
    const isTextEditorShortcut =
      (e.ctrlKey && e.shiftKey && (e.key.toLowerCase() === 'a' || e.code === 'KeyA' || e.key === 'א'));

    // If it's a special key but NOT one of our text editor shortcuts and NOT an arrow key, let it bubble up
    if (isSpecialKey && !isTextEditorShortcut && !isArrowKey) {
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
        if (duplicateSpeakerResult.message) {
          displayTooltip(duplicateSpeakerResult.message);
          // If not blocking (notify mode), continue with action
          if (!duplicateSpeakerResult.isValid) {
            // Blocking mode - prevent action
            return;
          }
        }
      }
      
      onNavigate('next', 'speaker');
    }

    // ENTER - Transform speaker and create new block
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();

      const cursorPos = input.selectionStart || 0;

      if (cursorPos === 0) {
        // At position 0 - add block BEFORE current one (above)
        onNewBlock(undefined, undefined, undefined, undefined, true);
      } else {
        // Normal - add block after
        await tryTransformSpeaker(text);
        onNewBlock();
      }
    }

    // SHIFT+ENTER - Allow default behavior for multiline (if needed in future)
    if (e.key === 'Enter' && e.shiftKey) {
      // Let default behavior handle it for now
      // In speaker field, just move to text
      e.preventDefault();
      onNavigate('text', 'speaker');
    }

    // BACKSPACE - Navigate when at beginning or remove empty blocks
    if (e.key === 'Backspace') {
      // Special handling for special tags: Backspace ANYWHERE removes entire tag and block
      if (Object.values(SPECIAL_TAGS).includes(localSpeaker)) {
        e.preventDefault();
        // Remove the entire block (tags have no content in text field)
        onRemoveBlock(block.id);
        return;
      }
      // Check if cursor is at the beginning
      else if (input.selectionStart === 0 && input.selectionEnd === 0) {
        e.preventDefault();

        // If speaker field is empty
        if (localSpeaker === '') {
          // If text field is also empty, just remove the block
          if (localText === '') {
            onRemoveBlock(block.id);
          }
          // If text field has content, try to join with previous block
          else if (onJoinBlock) {
            const result = onJoinBlock(block.id);
            // If join was successful, position cursor at join point in previous block
            if (result) {
              const { joinPosition, previousBlockId, joinedText } = result;

              // Immediately call onUpdate to sync the previous block's text in React state
              onUpdate(previousBlockId, 'text', joinedText);

              // Update previous block's text using custom event
              document.dispatchEvent(new CustomEvent('setNextBlockText', {
                detail: {
                  blockId: previousBlockId,
                  text: joinedText,
                  cursorPosition: joinPosition
                }
              }));

              // Focus and position cursor in the previous block's text area
              setTimeout(() => {
                const previousBlock = document.querySelector(`[data-block-id="${previousBlockId}"]`);
                if (previousBlock) {
                  const textArea = previousBlock.querySelector('textarea') as HTMLTextAreaElement;
                  if (textArea) {
                    textArea.focus();
                    textArea.setSelectionRange(joinPosition, joinPosition);
                  }
                }
              }, 10);
            } else {
              // Join failed (probably previous block is a special tag) - just navigate backward
              onNavigate('prev', 'speaker');
            }
          }
        } else {
          // Speaker field has content, navigate to previous block's text field
          onNavigate('prev', 'speaker');
        }
      }
      // Removed auto-delete logic: User can now delete last character and edit speaker name
      // Block will only be deleted if user continues backspacing at position 0 with empty speaker (handled above)
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
      // Don't try to transform special tags
      const isSpecialTag = Object.values(SPECIAL_TAGS).includes(text);
      if (!isSpecialTag) {
        await tryTransformSpeaker(text);
      }
      // Note: If previous block is a continuation block, navigation will fail silently
      // because continuation blocks don't have speaker fields
      onNavigate('up', 'speaker');  // Go to previous block, same field (speaker)
    } else if (e.key === 'ArrowDown' && !e.shiftKey) {
      e.preventDefault();
      // Don't try to transform special tags
      const isSpecialTag = Object.values(SPECIAL_TAGS).includes(text);
      if (!isSpecialTag) {
        await tryTransformSpeaker(text);
      }
      onNavigate('down', 'speaker');  // Go to next block, same field (speaker)
    } else if (e.key === 'ArrowLeft') {
      const isSpecialTag = Object.values(SPECIAL_TAGS).includes(text);

      if (isSpecialTag) {
        // For special tags: ArrowLeft (physically left) goes to position 0 (before opening [)
        const cursorPos = input.selectionStart || 0;
        if (cursorPos === 0) {
          // Already at position 0, go to previous block
          e.preventDefault();
          onNavigate('prev', 'speaker');
        } else {
          // Jump to position 0 (before opening bracket)
          e.preventDefault();
          input.setSelectionRange(0, 0);
        }
      } else {
        // Regular behavior: In RTL, left goes to next field when at end of text
        if (input.selectionStart === input.value.length) {
          e.preventDefault();
          await tryTransformSpeaker(text);
          onNavigate('text', 'speaker');  // Go to text field
        }
        // Otherwise let cursor move naturally through text
      }
    } else if (e.key === 'ArrowRight') {
      const isSpecialTag = Object.values(SPECIAL_TAGS).includes(text);

      if (isSpecialTag) {
        // For special tags: ArrowRight (physically right) goes to end (after closing ])
        const cursorPos = input.selectionStart || 0;
        if (cursorPos === text.length) {
          // Already at end, go to text field
          e.preventDefault();
          onNavigate('text', 'speaker');
        } else {
          // Jump to end (after closing bracket)
          e.preventDefault();
          input.setSelectionRange(text.length, text.length);
        }
      } else {
        // Regular behavior: In RTL, right goes to previous field when at start of text
        if (input.selectionStart === 0) {
          e.preventDefault();
          await tryTransformSpeaker(text);
          onNavigate('prev', 'speaker');  // Go to previous block's text field
        }
        // Otherwise let cursor move naturally through text
      }
    }
  };

  // Handle text keydown
  const handleTextKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    console.log('========== KEY PRESSED IN TEXT AREA ==========', e.key, 'Alt:', e.altKey, 'Ctrl:', e.ctrlKey);

    const textarea = e.currentTarget;

    // ============ RTL PUNCTUATION FIX FOR TEXT AREA ============
    // Fix cursor jumping for punctuation marks and numbers in RTL context
    const punctuationKeys = ['.', ',', '!', '?', ':', ';', '(', ')', '[', ']', '{', '}', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    if (punctuationKeys.includes(e.key) && !e.ctrlKey && !e.altKey && !e.metaKey) {
      const cursorPos = textarea.selectionStart || 0;
      const value = textarea.value;

      // Only intercept if at the start or if field is empty/starts with punctuation/numbers
      // Strip RLM before checking to handle already-marked strings
      const RLM = '\u200F';
      const valueWithoutRLM = value.replace(/^\u200F/, '');
      const needsSpecialHandling = cursorPos === 0 || value === '' || /^[.,:;!?()[\]{}0-9]/.test(valueWithoutRLM);

      if (needsSpecialHandling) {
        e.preventDefault();

        // RLM (Right-to-Left Mark) to establish RTL context for punctuation/numbers
        const needsRLM = value === '' || /^[.,:;!?()[\]{}0-9]/.test(valueWithoutRLM);

        // Build new value with RLM prefix if needed
        let newValue: string;
        let newCursorPos: number;

        if (needsRLM && !value.startsWith(RLM)) {
          // Prepend RLM and insert character
          newValue = RLM + value.slice(0, cursorPos) + e.key + value.slice(cursorPos);
          newCursorPos = cursorPos + 2; // +1 for RLM, +1 for character
        } else {
          // Just insert character normally
          newValue = value.slice(0, cursorPos) + e.key + value.slice(cursorPos);
          newCursorPos = cursorPos + 1;
        }

        // Edge case: If field contains ONLY numbers/punctuation (no Hebrew), add trailing RLM too
        const visibleContent = newValue.replace(/\u200F/g, ''); // Strip all RLM markers
        const hasHebrewText = /[\u0590-\u05FF]/.test(visibleContent);

        if (!hasHebrewText && visibleContent.length > 0 && !newValue.endsWith(RLM)) {
          // Only numbers/punctuation - add RLM at end to fully establish RTL context
          newValue = newValue + RLM;
          // Don't change cursor position - it's already correct
        }

        // Update the value
        setLocalText(newValue);
        onUpdate(block.id, 'text', newValue);

        // Force cursor to stay right after the inserted character
        setTimeout(() => {
          if (textarea) {
            textarea.setSelectionRange(newCursorPos, newCursorPos);
          }
        }, 0);

        return;
      }
    }
    // ============ END RTL PUNCTUATION FIX ============

    // ============ SHORTCUT REGISTRATION MODE HANDLERS ============

    // Alt+4: Toggle registration mode (start OR cancel)
    if (e.altKey && e.key === '4') {
      e.preventDefault();
      e.stopPropagation();

      // If already in registration mode, JUST CANCEL IT (don't start new one)
      if (isWordHighlighted || isTypingMeaning) {
        console.log('✅ Alt+4 pressed - closing existing registration WITHOUT starting new one');

        // Remove arrow and meaning if they exist, but keep pre-existing text using ** markers
        if (isTypingMeaning) {
          const beforeWord = localText.substring(0, registrationWordStart);
          const originalWord = localText.substring(registrationWordStart, registrationWordEnd);

          // Find the second * marker to get pre-existing text
          const textAfterWord = localText.substring(registrationWordEnd);
          const firstStarIndex = textAfterWord.indexOf('*');
          const secondStarIndex = textAfterWord.indexOf('*', firstStarIndex + 1);

          let preExistingText = '';
          if (secondStarIndex >= 0) {
            // Get everything after the second *
            preExistingText = textAfterWord.substring(secondStarIndex + 1);
          }

          // Update text to remove arrow, **, and meaning, keep original word + pre-existing text
          const newText = beforeWord + originalWord + preExistingText;
          console.log('✅ Alt+4 cancel - reconstructing:', { beforeWord, originalWord, preExistingText, newText });
          setLocalText(newText);
          onUpdate(block.id, 'text', newText);
        }

        // Reset all registration state
        setIsWordHighlighted(false);
        setIsTypingMeaning(false);
        setRegistrationWordStart(0);
        setRegistrationWordEnd(0);

        // Position cursor at end of original word
        setTimeout(() => {
          if (textRef.current) {
            textRef.current.setSelectionRange(registrationWordEnd, registrationWordEnd);
            textRef.current.focus();
          }
        }, 50);

        return; // STOP HERE - don't start new registration
      }

      // Start new registration
      console.log('✅ Alt+4 pressed - starting new registration');
      const cursorPosition = textarea.selectionStart || 0;
      const { word, startPos, endPos } = extractWordBehindCursor(localText, cursorPosition);
      console.log('✅ Extracted word:', word);

      if (!word || word.trim().length === 0) {
        setDebugWordExtraction('לא נמצאה מילה מאחורי הסמן');
        setTimeout(() => setDebugWordExtraction(''), 3000);
        return;
      }

      // Check if this word is a registered shortcut
      const expansion = onGetShortcutExpansion?.(word);

      if (expansion) {
        // Word IS registered - expand it automatically
        console.log('✅ Word is registered, expanding:', word, '→', expansion);
        const beforeWord = localText.substring(0, startPos);
        const afterWord = localText.substring(endPos);
        const newText = beforeWord + expansion + afterWord;

        setLocalText(newText);
        onUpdate(block.id, 'text', newText);

        // Position cursor after expansion
        setTimeout(() => {
          const newCursorPos = startPos + expansion.length;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          textarea.focus();
        }, 10);
      } else {
        // Word NOT registered - highlight for registration
        console.log('✅ Word not registered, highlighting for registration');
        setIsWordHighlighted(true);
        setRegistrationWordStart(startPos); // Track where word starts
        setRegistrationWordEnd(endPos); // Track where word ends

        // Select the word to show which word is being registered
        setTimeout(() => {
          textarea.setSelectionRange(startPos, endPos);
          textarea.focus();
        }, 10);

        console.log('✅ Set isWordHighlighted to TRUE and selected word');
      }
      return;
    }

    // Tab: Keep registration mode, add arrow, place cursor after arrow to type meaning
    if (e.key === 'Tab' && isWordHighlighted && !isTypingMeaning) {
      e.preventDefault();
      e.stopPropagation();
      console.log('✅ Tab pressed - adding arrow and ** markers');

      // Insert left arrow after the word
      const beforeWord = localText.substring(0, registrationWordEnd);
      const afterWord = localText.substring(registrationWordEnd);

      // ALWAYS add ** markers
      const newText = beforeWord + ' ← **' + afterWord;

      setLocalText(newText);
      onUpdate(block.id, 'text', newText);
      setIsTypingMeaning(true);

      // Store the text length after arrow is added - this is where typed meaning starts
      const arrowAndMarkerLength = 5; // " ← **"
      setTextLengthWhenArrowAdded(registrationWordEnd + arrowAndMarkerLength);
      console.log('✅ Arrow + ** added, Meaning starts at:', registrationWordEnd + arrowAndMarkerLength);

      // Place cursor AFTER the first * (between the two **)
      setTimeout(() => {
        if (textRef.current) {
          const newCursorPos = registrationWordEnd + 4; // After " ← *"
          textRef.current.setSelectionRange(newCursorPos, newCursorPos);
          textRef.current.focus();
          setCurrentCursorPosition(newCursorPos);
          console.log('✅ Cursor positioned between ** at:', newCursorPos);
        }
      }, 50);
      return;
    }

    // Escape: Cancel registration and restore original word
    if (e.key === 'Escape' && (isWordHighlighted || isTypingMeaning)) {
      e.preventDefault();
      e.stopPropagation();
      console.log('✅ Escape pressed - canceling registration using ** markers');

      // If we added an arrow and meaning, remove them and keep original word + pre-existing text
      if (isTypingMeaning) {
        const beforeWord = localText.substring(0, registrationWordStart);
        const originalWord = localText.substring(registrationWordStart, registrationWordEnd);

        // Find the second * marker to get pre-existing text
        const textAfterWord = localText.substring(registrationWordEnd);
        const firstStarIndex = textAfterWord.indexOf('*');
        const secondStarIndex = textAfterWord.indexOf('*', firstStarIndex + 1);

        let preExistingText = '';
        if (secondStarIndex >= 0) {
          // Get everything after the second *
          preExistingText = textAfterWord.substring(secondStarIndex + 1);
        }

        // Reconstruct: before + word + pre-existing text (remove arrow, **, and typed meaning)
        const newText = beforeWord + originalWord + preExistingText;
        console.log('✅ Escape - reconstructing:', { beforeWord, originalWord, preExistingText, newText });
        setLocalText(newText);
        onUpdate(block.id, 'text', newText);
      }

      setIsWordHighlighted(false);
      setIsTypingMeaning(false);

      // Place cursor AFTER the original word
      setTimeout(() => {
        if (textRef.current) {
          textRef.current.setSelectionRange(registrationWordEnd, registrationWordEnd);
          textRef.current.focus();
        }
      }, 50);

      setRegistrationWordStart(0);
      setRegistrationWordEnd(0);
      setTextLengthWhenArrowAdded(0);
      return;
    }

    // Backspace: Prevent deleting into prefix/arrow area during typing meaning
    if (e.key === 'Backspace' && isTypingMeaning) {
      const cursorPos = textarea.selectionStart || 0;
      const meaningStart = registrationWordEnd + 3; // After " ← "

      // If cursor is at or before the meaning start, prevent backspace
      if (cursorPos <= meaningStart) {
        e.preventDefault();
        console.log('⚠️ Cannot delete into prefix/arrow area');
        return;
      }
    }

    // Enter: Register shortcut and keep only the meaning (remove prefix and arrow)
    // Exclude NumpadEnter so it can create continuation blocks
    if (e.key === 'Enter' && !e.shiftKey && e.code !== 'NumpadEnter' && isTypingMeaning) {
      e.preventDefault();
      console.log('✅ Enter pressed - extracting meaning between ** markers');

      // Extract the prefix (original word)
      const prefix = localText.substring(registrationWordStart, registrationWordEnd);

      // Find the two ** markers
      const textAfterWord = localText.substring(registrationWordEnd);
      const firstStarIndex = textAfterWord.indexOf('*');
      const secondStarIndex = textAfterWord.indexOf('*', firstStarIndex + 1);

      let meaning = '';
      let preExistingTextAfterCursor = '';

      if (firstStarIndex >= 0 && secondStarIndex >= 0) {
        // Extract text between the two *
        const absoluteFirstStar = registrationWordEnd + firstStarIndex;
        const absoluteSecondStar = registrationWordEnd + secondStarIndex;
        meaning = localText.substring(absoluteFirstStar + 1, absoluteSecondStar);
        preExistingTextAfterCursor = localText.substring(absoluteSecondStar + 1);
        console.log('📝 Found ** markers - meaning between them:', `"${meaning}"`, 'preExisting after second *:', `"${preExistingTextAfterCursor}"`);
      } else {
        // No markers, meaning is everything after arrow until end
        meaning = localText.substring(registrationWordEnd + 3);
        preExistingTextAfterCursor = '';
        console.log('📝 No ** markers - meaning is everything after arrow:', `"${meaning}"`);
      }

      console.log('📝 Extracted - prefix:', `"${prefix}"`, 'meaning:', `"${meaning}"`);

      // If meaning is blank or only whitespace (or just *), treat like Escape (cancel registration)
      if (!meaning || !meaning.trim() || meaning.trim().length === 0 || meaning.trim() === '*') {
        console.log('⚠️ No valid meaning entered, treating like Escape - canceling registration');

        // Restore original word + pre-existing text (already extracted above as preExistingTextAfterCursor)
        const beforeWord = localText.substring(0, registrationWordStart);
        const originalWord = localText.substring(registrationWordStart, registrationWordEnd);
        const newText = beforeWord + originalWord + preExistingTextAfterCursor;
        console.log('✅ Empty meaning - reconstructing:', { beforeWord, originalWord, preExistingTextAfterCursor, newText });
        setLocalText(newText);
        onUpdate(block.id, 'text', newText);

        // Exit registration mode
        setIsWordHighlighted(false);
        setIsTypingMeaning(false);

        // Position cursor at end of original word
        setTimeout(() => {
          if (textRef.current) {
            textRef.current.setSelectionRange(registrationWordEnd, registrationWordEnd);
            textRef.current.focus();
          }
        }, 50);

        setRegistrationWordStart(0);
        setRegistrationWordEnd(0);
        return;
      }

      // Register the shortcut
      onRegisterShortcut?.(prefix, meaning).then(() => {
        console.log('✅ Shortcut registered:', prefix, '→', meaning);

        // Reconstruct text: before + meaning + pre-existing text after cursor
        const beforePrefix = localText.substring(0, registrationWordStart);
        const newText = beforePrefix + meaning + preExistingTextAfterCursor;
        console.log('✅ Reconstructing:', { beforePrefix, meaning, preExistingTextAfterCursor, newText });

        setLocalText(newText);
        onUpdate(block.id, 'text', newText);

        // Exit registration mode
        setIsWordHighlighted(false);
        setIsTypingMeaning(false);
        setRegistrationWordStart(0);
        setRegistrationWordEnd(0);

        // Set cursor after the meaning
        setTimeout(() => {
          if (textRef.current) {
            const newCursorPos = registrationWordStart + meaning.length;
            textRef.current.setSelectionRange(newCursorPos, newCursorPos);
            textRef.current.focus();
          }
        }, 50);
      }).catch(error => {
        console.error('❌ Failed to register shortcut:', error);
      });
      return;
    }

    // ============ END REGISTRATION MODE HANDLERS ============

    // Register typing activity for progress tracking (exclude navigation keys)
    const isTypingKey = !['Tab', 'Shift', 'Control', 'Alt', 'Meta', 'CapsLock',
                          'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
                          'Home', 'End', 'PageUp', 'PageDown', 'F1', 'F2', 'F3', 'F4', 'F5',
                          'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'].includes(e.key);

    if (isTypingKey) {
      progressService.registerTypingActivity();
    }
    
    // Handle Ctrl+Z for undo shortcut expansion BEFORE checking special keys
    // Check both 'z' and 'ז' (Hebrew zayin) and also check e.code for KeyZ
    if (e.ctrlKey && (e.key === 'z' || e.key === 'Z' || e.key === 'ז' || e.code === 'KeyZ') && !e.shiftKey) {
      console.log('========== Ctrl+Z PRESSED ==========');
      console.log('Key:', e.key, ', Code:', e.code);
      console.log('Undo history length:', undoHistory.length);
      console.log('Current text:', textarea.value);
      
      // Check if we have undo history and the last change was a shortcut expansion
      if (undoHistory.length > 0) {
        const lastUndo = undoHistory[undoHistory.length - 1];
        console.log('Last undo item:', {
          text: lastUndo.text,
          cursorPosition: lastUndo.cursorPosition,
          isShortcutExpansion: lastUndo.isShortcutExpansion,
          timestamp: lastUndo.timestamp,
          expandedShortcut: lastUndo.expandedShortcut,
          timeSinceExpansion: Date.now() - lastUndo.timestamp
        });
        
        // Only undo if the last change was recent (within 30 seconds) and was a shortcut expansion
        if (lastUndo.isShortcutExpansion && Date.now() - lastUndo.timestamp < 30000) {
          e.preventDefault();
          e.stopPropagation();
          
          console.log('UNDOING shortcut expansion!');
          console.log('Restoring text to:', lastUndo.text);
          
          // Restore the previous text
          setLocalText(lastUndo.text);
          onUpdate(block.id, 'text', lastUndo.text);
          
          // Remove this item from undo history
          setUndoHistory(prev => {
            console.log('Removing last item from undo history');
            return prev.slice(0, -1);
          });
          
          // Clear last expansion reference
          lastShortcutExpansion.current = null;
          
          // Restore cursor position
          setTimeout(() => {
            if (textRef.current) {
              textRef.current.value = lastUndo.text;
              textRef.current.setSelectionRange(lastUndo.cursorPosition, lastUndo.cursorPosition);
              textRef.current.focus();
              
              console.log('Cursor restored to position:', lastUndo.cursorPosition);
              
              // Auto-resize
              textRef.current.style.height = 'auto';
              textRef.current.style.height = textRef.current.scrollHeight + 'px';
            }
          }, 0);
          
          console.log('========== UNDO COMPLETE ==========');
          return;
        } else {
          console.log('Not undoing because:');
          if (!lastUndo.isShortcutExpansion) {
            console.log('- Last undo item is not a shortcut expansion');
          }
          if (Date.now() - lastUndo.timestamp >= 30000) {
            console.log('- Too much time has passed (>30 seconds)');
          }
        }
      } else {
        console.log('No undo history available');
      }
      console.log('========== END Ctrl+Z ==========');
    }
    
    // Check if this is a special key that should bubble up to MediaPlayer
    // BUT exclude Ctrl+Z from special keys (regardless of keyboard language)
    const isCtrlZ = e.ctrlKey && (e.key === 'z' || e.key === 'Z' || e.key === 'ז' || e.code === 'KeyZ');
    const isSpecialKey =
      // F-keys
      (e.key.startsWith('F') && e.key.length <= 3 && e.key.length >= 2) ||
      // Numpad keys (but NOT NumpadEnter - we handle that ourselves for continuation blocks)
      (e.code && e.code.startsWith('Numpad') && e.code !== 'NumpadEnter') ||
      // Combinations with Ctrl/Alt/Meta (but not Shift alone and not Ctrl+Z)
      ((e.ctrlKey || e.altKey || e.metaKey) && !isCtrlZ);
    
    if (isSpecialKey) {
      console.log('Special key detected, allowing propagation:', e.key, e.code);
      // Don't stop propagation for special keys - let MediaPlayer handle them
      return;
    }
    
    // textarea is already defined at the top of the function
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



    // Detect language and update direction BEFORE character is inserted
    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      // Check if it's a Hebrew character
      if (/[\u0590-\u05FF]/.test(e.key)) {
        // Use flushSync to force synchronous state update before character insertion
        flushSync(() => {
          switchLanguage('hebrew');
        });
      }
      // Check if it's an English character
      else if (/[A-Za-z]/.test(e.key)) {
        // Use flushSync to force synchronous state update before character insertion
        flushSync(() => {
          switchLanguage('english');
        });
      }
    }

    // SPACE in empty text - Navigate to next block
    // Skip this during Shift+Enter processing to prevent interference
    if (e.key === ' ' && !text.trim() && !isProcessingShiftEnter.current) {
      e.preventDefault();
      onNavigate('next', 'text');
      return;
    }

    // TAB - Navigate to next block's speaker
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      clearShiftEnterFlag(); // Clear flag when navigating
      onNavigate('next', 'text');
    }

    // SHIFT+TAB - Navigate back to speaker
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      clearShiftEnterFlag(); // Clear flag when navigating
      onNavigate('speaker', 'text');
    }

    // ENTER - Create new block and maintain language (Word-like)
    // Exclude NumpadEnter as it should behave like Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey && e.code !== 'NumpadEnter') {
      e.preventDefault();

      // Clear the Shift+Enter processing flag since user is creating a new block
      clearShiftEnterFlag();

      // Apply AutoCorrect validations before creating new block
      if (autoCorrectEngine) {
        // Validate duplicate speaker
        const duplicateSpeakerResult = autoCorrectEngine.validateDuplicateSpeaker(localSpeaker, previousSpeaker);
        if (duplicateSpeakerResult.message) {
          displayTooltip(duplicateSpeakerResult.message);
          // If not blocking (notify mode), continue with action
          if (duplicateSpeakerResult.isValid) {
            // Continue - just showing notification
          } else {
            // Blocking mode - prevent action
            return;
          }
        }

        // Validate block transition (punctuation, parentheses, quotes)
        const transitionResult = autoCorrectEngine.validateBlockTransition(text);
        if (transitionResult.message) {
          displayTooltip(transitionResult.message);
          // If not blocking (notify mode), continue with action
          if (!transitionResult.isValid) {
            // Blocking mode - prevent action
            return;
          }
        }
      }

      // Get cursor position to split text
      const cursorPos = textarea.selectionStart || 0;
      const beforeCursor = localText.substring(0, cursorPos);
      const afterCursor = localText.substring(cursorPos);

      // Update current block with text before cursor
      setLocalText(beforeCursor);
      onUpdate(block.id, 'text', beforeCursor);

      // Store current cursor language for the new block
      const currentLanguage = inputLanguage;

      // Create new block with text after cursor
      // Cursor position in new block should be at the start (0)
      onNewBlock(afterCursor, 0);

      // The new block will inherit the language from the previous block
      setTimeout(() => {
        switchLanguage(currentLanguage);
      }, 0);
    }

    // SHIFT+ENTER or NUMPAD ENTER - Create continuation block (without speaker field)
    if (e.key === 'Enter' && (e.shiftKey || e.code === 'NumpadEnter')) {
      e.preventDefault();

      const cursorPos = textarea.selectionStart;
      const afterCursor = text.substring(cursorPos);

      // Create a new continuation block with the text after cursor
      // The current speaker (or parent speaker for continuation blocks) will be used for color inheritance
      const currentSpeaker = block.isContinuation ? block.parentSpeaker : block.speaker;

      // Update current block to remove text after cursor
      const newText = text.substring(0, cursorPos);
      setLocalText(newText);
      onUpdate(block.id, 'text', newText);

      // Create new continuation block with remaining text
      // Pass the current speaker as parentSpeaker for color inheritance
      onNewBlock(afterCursor, 0, true, currentSpeaker);

      return;
    }

    // BACKSPACE - Navigate when at beginning, remove empty blocks, or renumber lists
    if (e.key === 'Backspace') {
      // Check if cursor is at the beginning
      if (textarea.selectionStart === 0 && textarea.selectionEnd === 0) {
        e.preventDefault();

        // For continuation blocks (no speaker field exists)
        if (block.isContinuation) {
          if (localText === '') {
            // Empty continuation block - just remove it
            onRemoveBlock(block.id);
          } else if (onJoinBlock) {
            // Has content - try to join with previous block
            const result = onJoinBlock(block.id);
            if (result) {
              // Join successful
              const { joinPosition, previousBlockId, joinedText } = result;
              onUpdate(previousBlockId, 'text', joinedText);

              // Update previous block's text using custom event
              document.dispatchEvent(new CustomEvent('setNextBlockText', {
                detail: {
                  blockId: previousBlockId,
                  text: joinedText,
                  cursorPosition: joinPosition
                }
              }));

              setTimeout(() => {
                const previousBlock = document.querySelector(`[data-block-id="${previousBlockId}"]`);
                if (previousBlock) {
                  const textArea = previousBlock.querySelector('textarea') as HTMLTextAreaElement;
                  if (textArea) {
                    textArea.focus();
                    textArea.setSelectionRange(joinPosition, joinPosition);
                  }
                }
              }, 10);
            } else {
              // Join failed (probably previous block is a special tag) - just navigate backward
              onNavigate('up', 'text');
            }
          }
        }
        // For regular blocks - navigate to speaker field
        else {
          // Check if both fields are empty (text is already empty and speaker is empty)
          if (localText === '' && !localSpeaker) {
            // Remove this empty block and navigate to previous block
            onRemoveBlock(block.id);
          } else {
            // Navigate to speaker field
            onNavigate('speaker', 'text');
          }
        }
      } else if (textarea.selectionStart === 1 && textarea.selectionEnd === 1 && localText.length === 1) {
        // About to delete the last character in text field
        // Check if speaker is also empty - if so, prepare to delete block
        if (!localSpeaker) {
          // Let the delete happen, then remove the block
          setTimeout(() => {
            const updatedText = textRef.current?.value || '';
            if (updatedText === '' && !localSpeaker) {
              onRemoveBlock(block.id);
            }
          }, 10);
        }
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

    // Skip arrow navigation during Shift+Enter processing to prevent cursor jumping
    if (isProcessingShiftEnter.current && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      // Allow default cursor movement but don't trigger navigation
      return;
    }
    
    // Arrow navigation - UP/DOWN for blocks
    if (e.key === 'ArrowUp' && !e.shiftKey) {
      // Let the browser try to move the cursor up first
      const cursorPosBefore = textarea.selectionStart;

      // Use setTimeout to check if cursor actually moved after browser handles the event
      setTimeout(() => {
        const cursorPosAfter = textarea.selectionStart;

        // If cursor didn't move, we're on the first line - navigate to previous block
        if (cursorPosBefore === cursorPosAfter) {
          onNavigate('up', 'text');
        }
      }, 0);

      // Don't prevent default - let browser attempt to move cursor
    } else if (e.key === 'ArrowDown' && !e.shiftKey) {
      // Let the browser try to move the cursor down first
      const cursorPosBefore = textarea.selectionStart;

      // Use setTimeout to check if cursor actually moved after browser handles the event
      setTimeout(() => {
        const cursorPosAfter = textarea.selectionStart;

        // If cursor didn't move, we're on the last line - navigate to next block
        if (cursorPosBefore === cursorPosAfter) {
          onNavigate('down', 'text');
        }
      }, 0);

      // Don't prevent default - let browser attempt to move cursor
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

    // Check if user typed [ at position 0 - enter tag mode
    if (value === '[' && speakerRef.current?.selectionStart === 1) {
      setIsEnteringTag(true);
      setLocalSpeaker('[');
      onUpdate(block.id, 'speaker', '[');
      return;
    }

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
    // Register typing activity for progress tracking
    progressService.registerTypingActivity();

    let value = e.target.value;
    let cursorPos = e.target.selectionStart;

    // Track cursor position during typing meaning mode
    if (isTypingMeaning) {
      setCurrentCursorPosition(cursorPos);
      console.log('📍 Cursor moved to:', cursorPos, 'Character at cursor:', value.substring(cursorPos - 1, cursorPos + 1));
    }
    
    // Skip ALL processing during Shift+Enter to prevent cursor jumping
    // This includes auto-corrections, English handling, list formatting, shortcuts
    if (isProcessingShiftEnter.current) {
      setLocalText(value);
      onUpdate(block.id, 'text', value);
      
      // Maintain cursor position during the processing window
      const currentPos = e.target.selectionStart;
      setTimeout(() => {
        if (textRef.current && isProcessingShiftEnter.current) {
          textRef.current.setSelectionRange(currentPos, currentPos);
        }
      }, 0);
      return;
    }
    
    // Apply auto-corrections if enabled
    if (autoCorrectEngine) {
      const originalValue = value;
      const correctionResult = autoCorrectEngine.applyAutoCorrections(value);
      
      // Handle both new format and potential legacy format
      if (typeof correctionResult === 'object' && correctionResult.correctedText !== undefined) {
        value = correctionResult.correctedText;
        // Show notification messages if any
        if (correctionResult.messages && correctionResult.messages.length > 0) {
          displayTooltip(correctionResult.messages.join(' • '));
        }
      } else {
        // Fallback for legacy format (just a string)
        value = correctionResult || value;
      }
      
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

    // Check if user just typed a space to trigger rule application later
    const justTypedSpace = value.length > localText.length && value[cursorPos - 1] === ' ';

    // Handle English text to keep it on the right side in RTL mode
    // We need to wrap continuous English sequences with RLM marks
    // Skip during Shift+Enter processing to prevent cursor issues
    if (value.length > localText.length && !isProcessingShiftEnter.current) {
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
    // Skip during Shift+Enter processing to prevent cursor jumping
    if (value.length > localText.length && value[cursorPos - 1] === ' ' && !isProcessingShiftEnter.current) {
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
    // Skip during Shift+Enter processing to prevent cursor jumping
    let shortcutWasExpanded = false;
    if (onProcessShortcuts && localText.length < value.length && cursorPos > 0 && value[cursorPos - 1] === ' ' && !isProcessingShiftEnter.current) {
      // Remove the space we just typed and pass the full text to ShortcutManager
      // This allows it to check for shortcuts and preserve all surrounding text
      const textWithoutSpace = value.substring(0, cursorPos - 1) + value.substring(cursorPos);
      const result = onProcessShortcuts(textWithoutSpace, cursorPos - 1);

      if (result && result.expanded) {
        console.log('🎯 Shortcut expanded!');
        console.log('📝 Original value:', JSON.stringify(value));
        console.log('📝 textWithoutSpace:', JSON.stringify(textWithoutSpace));
        console.log('📝 result.text:', JSON.stringify(result.text));
        console.log('📝 result.expandedShortcut:', JSON.stringify(result.expandedShortcut));
        console.log('📝 result.expandedTo:', JSON.stringify(result.expandedTo));
        console.log('📍 Original cursorPos:', cursorPos);
        console.log('📍 result.cursorPosition:', result.cursorPosition);

        shortcutWasExpanded = true;

        // Save undo information - store the text WITH the shortcut BEFORE expansion
        // We want to restore to the state just before the shortcut was expanded
        const undoItem: UndoHistoryItem = {
          text: value,  // The original text with the shortcut and space (before expansion)
          cursorPosition: cursorPos,  // Cursor position where it was (after the space)
          isShortcutExpansion: true,
          timestamp: Date.now(),
          expandedShortcut: result.expandedShortcut
        };

        console.log('Saving undo item with text:', undoItem.text);
        console.log('Cursor position:', undoItem.cursorPosition);

        // Keep only last 10 undo items
        setUndoHistory(prev => {
          const newHistory = [...prev.slice(-9), undoItem];
          console.log('New undo history length:', newHistory.length);
          return newHistory;
        });

        // Save expansion metadata for undo
        if (result.processed && result.originalText) {
          lastShortcutExpansion.current = {
            originalText: result.originalText,
            expandedShortcut: result.expandedShortcut || '',
            expansionStart: result.expansionStart || 0,
            expansionEnd: result.expansionEnd || 0
          };
        }

        // Use the correctly expanded text from ShortcutManager
        // result.text already contains the full text with proper spacing
        // Just add the space that triggered the expansion
        value = result.text + ' ';

        // Update cursor position
        const newPos = result.cursorPosition + 1; // +1 for the space we just added

        // Set cursor position after React updates
        setTimeout(() => {
          if (textRef.current) {
            textRef.current.value = value;
            textRef.current.selectionStart = newPos;
            textRef.current.selectionEnd = newPos;
            textRef.current.focus();
          }
        }, 0);
      }
    }

    // Word-by-word transformation - check if user typed a word boundary
    // Skip if shortcut was just expanded to avoid interference
    if (ruleSettings && ruleSettings.enabledRuleIds.length > 0 && !shortcutWasExpanded) {
      // Word boundary characters: space, comma, period, newline, etc.
      const wordBoundaries = /[\s,.:;!?\n]/;
      const justTypedBoundary = value.length > localText.length &&
                                 cursorPos > 0 &&
                                 wordBoundaries.test(value[cursorPos - 1]);

      if (justTypedBoundary && cursorPos > 1) {
        // Extract the word before the boundary
        let wordStart = cursorPos - 2; // Start before the boundary character

        // Find start of word (stop at previous boundary or start of text)
        while (wordStart > 0 && !wordBoundaries.test(value[wordStart - 1])) {
          wordStart--;
        }

        // Extract the word (exclude the boundary we just typed)
        const word = value.substring(wordStart, cursorPos - 1);

        // NEW APPROACH: Check backwards when we encounter a compound trigger word
        // If current word is a compound trigger (אחוז, ושתיים, מאות, etc.),
        // look for a number in the previous word
        let compoundHandled = false;
        const isCompoundTrigger =
          COMPOUND_PATTERNS.unitCombiners.includes(word) ||
          COMPOUND_PATTERNS.percentWords.includes(word) ||
          COMPOUND_PATTERNS.thousandWords.includes(word) ||
          COMPOUND_PATTERNS.hundredWords.includes(word);

        if (isCompoundTrigger && wordStart > 0) {
          console.log('🔍 BACKWARD CHECK: Found compound trigger word:', word);

          // Find the previous word
          let prevWordEnd = wordStart - 1;
          while (prevWordEnd > 0 && wordBoundaries.test(value[prevWordEnd])) {
            prevWordEnd--;
          }

          if (prevWordEnd > 0) {
            let prevWordStart = prevWordEnd;
            while (prevWordStart > 0 && !wordBoundaries.test(value[prevWordStart - 1])) {
              prevWordStart--;
            }

            const prevWord = value.substring(prevWordStart, prevWordEnd + 1);
            console.log('   Previous word:', prevWord);

            // Check if previous word is a number (with or without prefix)
            // Patterns: "50", "ו-50", "ו- 50"
            const numberMatch = prevWord.match(/^(?:([\u0590-\u05FF]+)([-]\s*)?)?(\d+(?:,\d{3})*)$/);

            if (numberMatch) {
              console.log('   ✅ Previous word is a number!');
              console.log('   Full match:', numberMatch[0]);
              console.log('   Prefix:', numberMatch[1]);
              console.log('   Separator:', numberMatch[2]);
              console.log('   Number:', numberMatch[3]);

              const hasPrefix = !!(numberMatch[1] && numberMatch[2]);
              const prefix = numberMatch[1];
              const separator = numberMatch[2]?.trim() || '-';
              const numberPart = numberMatch[3].replace(/,/g, '');

              let compoundResult: string | null = null;

              // Handle different compound types
              if (COMPOUND_PATTERNS.unitCombiners.includes(word)) {
                // Unit combiner: add to base number
                const unitValue = unitValueMap[word];
                if (unitValue !== undefined) {
                  const baseNumber = parseInt(numberPart);
                  const newNumber = baseNumber + unitValue;
                  compoundResult = hasPrefix
                    ? prefix + separator + newNumber
                    : newNumber.toString();
                }
              } else if (COMPOUND_PATTERNS.percentWords.includes(word)) {
                // Percent: just add %
                compoundResult = prevWord + '%';
              } else if (COMPOUND_PATTERNS.thousandWords.includes(word)) {
                // Thousand: multiply by 1000
                const baseNumber = parseInt(numberPart);
                const thousands = (baseNumber * 1000).toLocaleString('en-US');
                compoundResult = hasPrefix
                  ? prefix + separator + thousands
                  : thousands;
              } else if (COMPOUND_PATTERNS.hundredWords.includes(word)) {
                // Hundred: multiply by 100
                const baseNumber = parseInt(numberPart);
                const hundreds = baseNumber * 100;
                compoundResult = hasPrefix
                  ? prefix + separator + hundreds
                  : hundreds.toString();
              }

              if (compoundResult) {
                console.log('   📊 Compound result:', compoundResult);

                // Replace "prevWord word" with compoundResult
                const beforePrev = value.substring(0, prevWordStart);
                const afterCurrent = value.substring(cursorPos - 1);
                value = beforePrev + compoundResult + afterCurrent;

                // Adjust cursor
                const originalLength = (prevWordEnd - prevWordStart + 1) + (wordStart - prevWordEnd - 1) + word.length;
                const newLength = compoundResult.length;
                cursorPos = prevWordStart + newLength + 1; // +1 for the boundary

                compoundHandled = true;

                // Update immediately
                setTimeout(() => {
                  if (textRef.current) {
                    textRef.current.value = value;
                    textRef.current.setSelectionRange(cursorPos, cursorPos);
                  }
                }, 0);
              }
            }
          }
        }

        // OLD APPROACH: First check if current word completes a pending compound
        if (!compoundHandled && pendingCompound && word.trim()) {
          console.log('🔗 Checking compound completion:');
          console.log('   Pending:', pendingCompound);
          console.log('   Current word:', word);

          let compoundResult: string | null = null;

          // Case 1: Tens + Units (e.g., "50 ואחד" → "51" or "ב-50 ואחד" → "ב-51")
          if (COMPOUND_PATTERNS.unitCombiners.includes(word)) {
            console.log('✅ Word is a unit combiner!');

            const unitValue = unitValueMap[word];
            console.log('   Unit value:', unitValue);
            if (unitValue !== undefined) {
              if (pendingCompound.hadPrefix) {
                console.log('   Has prefix! Processing with prefix...');
                console.log('   transformedValue:', pendingCompound.transformedValue);
                console.log('   prefix:', pendingCompound.prefix);
                console.log('   separator:', pendingCompound.separator);

                // Extract number from "ב-50"
                const parts = pendingCompound.transformedValue.split(pendingCompound.separator || '-');
                const numberPart = parts[parts.length - 1];
                const baseNumber = parseInt(numberPart);
                const compoundNumber = baseNumber + unitValue;
                compoundResult = pendingCompound.prefix + (pendingCompound.separator || '-') + compoundNumber;

                console.log('   Result:', compoundResult);
              } else {
                console.log('   No prefix, simple case');
                // Simple case: "50 ואחד" → "51"
                const baseNumber = parseInt(pendingCompound.transformedValue);
                compoundResult = (baseNumber + unitValue).toString();
                console.log('   Result:', compoundResult);
              }
            }
          }
          // Case 2: Number + Percent (e.g., "50 אחוז" → "50%" or "ב-50 אחוז" → "ב-50%")
          else if (COMPOUND_PATTERNS.percentWords.includes(word)) {
            compoundResult = pendingCompound.transformedValue + '%';
          }
          // Case 3: Number + Thousand (e.g., "7 אלף" → "7,000" or "כ-7 אלף" → "כ-7,000")
          else if (COMPOUND_PATTERNS.thousandWords.includes(word)) {
            // Check if pending is a Hebrew unit word that needs to be converted first
            const hebrewUnitMap: { [key: string]: number } = {
              'אחד': 1, 'אחת': 1,
              'שניים': 2, 'שתיים': 2, 'שני': 2, 'שתי': 2,
              'שלושה': 3, 'שלוש': 3,
              'ארבעה': 4, 'ארבע': 4,
              'חמישה': 5, 'חמש': 5,
              'שישה': 6, 'שש': 6,
              'שבעה': 7, 'שבע': 7, 'שבעת': 7,
              'שמונה': 8, 'שמונת': 8,
              'תשעה': 9, 'תשע': 9, 'תשעת': 9,
              'עשרה': 10, 'עשר': 10, 'עשרת': 10
            };

            let baseNumber: number;
            const hebrewValue = hebrewUnitMap[pendingCompound.transformedValue];

            if (hebrewValue !== undefined) {
              // It's a Hebrew word, convert to number first
              baseNumber = hebrewValue;
            } else if (pendingCompound.hadPrefix) {
              // Extract number from "כ-7"
              const parts = pendingCompound.transformedValue.split(pendingCompound.separator || '-');
              const numberPart = parts[parts.length - 1];
              baseNumber = parseInt(numberPart);
            } else {
              // Already a number
              baseNumber = parseInt(pendingCompound.transformedValue);
            }

            if (!isNaN(baseNumber)) {
              const thousands = (baseNumber * 1000).toLocaleString('en-US');
              if (pendingCompound.hadPrefix) {
                compoundResult = pendingCompound.prefix + (pendingCompound.separator || '-') + thousands;
              } else {
                compoundResult = thousands;
              }
            }
          }
          // Case 4: Number + Hundred (e.g., "5 מאות" → "500" or "ב-5 מאות" → "ב-500")
          else if (COMPOUND_PATTERNS.hundredWords.includes(word)) {
            // Special cases: מאה = 100, מאתיים = 200, מאות needs a number
            if (word === 'מאה') {
              compoundResult = pendingCompound.hadPrefix
                ? pendingCompound.prefix + (pendingCompound.separator || '-') + '100'
                : '100';
            } else if (word === 'מאתיים') {
              compoundResult = pendingCompound.hadPrefix
                ? pendingCompound.prefix + (pendingCompound.separator || '-') + '200'
                : '200';
            } else { // מאות - needs a preceding number
              const hebrewUnitMap: { [key: string]: number } = {
                'אחד': 1, 'אחת': 1,
                'שניים': 2, 'שתיים': 2, 'שני': 2, 'שתי': 2,
                'שלושה': 3, 'שלוש': 3,
                'ארבעה': 4, 'ארבע': 4,
                'חמישה': 5, 'חמש': 5,
                'שישה': 6, 'שש': 6,
                'שבעה': 7, 'שבע': 7, 'שבעת': 7,
                'שמונה': 8, 'שמונת': 8,
                'תשעה': 9, 'תשע': 9, 'תשעת': 9,
                'עשרה': 10, 'עשר': 10, 'עשרת': 10
              };

              let baseNumber: number;
              const hebrewValue = hebrewUnitMap[pendingCompound.transformedValue];

              if (hebrewValue !== undefined) {
                baseNumber = hebrewValue;
              } else if (pendingCompound.hadPrefix) {
                const parts = pendingCompound.transformedValue.split(pendingCompound.separator || '-');
                const numberPart = parts[parts.length - 1];
                baseNumber = parseInt(numberPart);
              } else {
                baseNumber = parseInt(pendingCompound.transformedValue);
              }

              if (!isNaN(baseNumber)) {
                const hundreds = baseNumber * 100;
                if (pendingCompound.hadPrefix) {
                  compoundResult = pendingCompound.prefix + (pendingCompound.separator || '-') + hundreds;
                } else {
                  compoundResult = hundreds.toString();
                }
              }
            }
          }

          // If we found a compound pattern, replace it
          if (compoundResult) {
            // Find the position of the pending compound in the current value
            const searchPattern = pendingCompound.transformedValue + ' ' + word;
            const compoundPos = value.lastIndexOf(searchPattern);

            if (compoundPos >= 0) {
              const beforeCompound = value.substring(0, compoundPos);
              const afterCompound = value.substring(compoundPos + searchPattern.length);
              value = beforeCompound + compoundResult + afterCompound;

              // Adjust cursor
              const lengthDiff = compoundResult.length - searchPattern.length;
              cursorPos = cursorPos + lengthDiff;

              // Check if compound result can still form another compound (e.g., "51" can become "51%")
              // Only mark as pending for percent, not for thousands (51 thousand doesn't make sense)
              const isNumeric = /^\d+$/.test(compoundResult) || /^[\u0590-\u05FF]+-\d+$/.test(compoundResult);
              if (isNumeric) {
                // Extract prefix if present
                // Pattern: Hebrew letters + separator + number
                const resultPrefixMatch = compoundResult.match(/^([\u0590-\u05FF]+)([-])?(\d+)$/);
                const resultHadPrefix = !!(resultPrefixMatch && resultPrefixMatch[1] && resultPrefixMatch[2]);

                setPendingCompound({
                  originalWord: compoundResult,
                  transformedValue: compoundResult,
                  position: compoundPos,
                  hadPrefix: resultHadPrefix || false,
                  prefix: resultHadPrefix ? resultPrefixMatch[1] : undefined,
                  separator: resultHadPrefix ? resultPrefixMatch[2] : undefined
                });
              } else {
                setPendingCompound(null);
              }

              compoundHandled = true;

              // Update immediately
              setTimeout(() => {
                if (textRef.current) {
                  textRef.current.value = value;
                  textRef.current.setSelectionRange(cursorPos, cursorPos);
                }
              }, 0);
            }
          } else {
            // Not a compound, clear pending
            setPendingCompound(null);
          }
        }

        // Transform the word if it matches any rules (only if not part of compound)
        if (!compoundHandled && word.trim()) {
          // Special case: Check if word is a Hebrew unit that can combine with אלף/אלפים
          // Even if it doesn't transform (units 1-9 don't transform by default)
          if (COMPOUND_PATTERNS.thousandUnits.includes(word)) {
            setPendingCompound({
              originalWord: word,
              transformedValue: word, // Keep as Hebrew since it doesn't transform
              position: wordStart,
              hadPrefix: false
            });
          }

          const result = transcriptionRulesService.transformSingleWord(
            word,
            ruleSettings.enabledRuleIds,
            ruleSettings.prefixSettings,
            ruleSettings.separatorSettings
          );

          if (result.wasTransformed) {
            // Check if transformed value has a prefix
            // Pattern: Hebrew letters + separator + number (e.g., "ו-50")
            const prefixMatch = result.transformed.match(/^([\u0590-\u05FF]+)([-])?(\d+)$/);
            const hadPrefix = !!(prefixMatch && prefixMatch[1] && prefixMatch[2]);

            console.log('🔍 Prefix detection for word:', word);
            console.log('   Transformed to:', result.transformed);
            console.log('   Prefix match:', prefixMatch);
            console.log('   hadPrefix:', hadPrefix);
            if (hadPrefix) {
              console.log('   Extracted prefix:', prefixMatch![1]);
              console.log('   Extracted separator:', prefixMatch![2]);
            }

            // Check if this word can start a compound
            if (COMPOUND_PATTERNS.tens.includes(word)) {
              // This is a tens word (20-90), might combine with units
              console.log('✅ Setting pending compound for tens word:', word);
              setPendingCompound({
                originalWord: word,
                transformedValue: result.transformed,
                position: wordStart,
                hadPrefix: hadPrefix,
                prefix: hadPrefix ? prefixMatch![1] : undefined,
                separator: hadPrefix ? prefixMatch![2] : undefined
              });
            } else if (COMPOUND_PATTERNS.thousandUnits.includes(word) || /^\d+$/.test(result.transformed)) {
              // This is a unit (1-10) or already a number, might combine with אלף/אלפים
              setPendingCompound({
                originalWord: word,
                transformedValue: result.transformed,
                position: wordStart,
                hadPrefix: hadPrefix,
                prefix: hadPrefix ? prefixMatch![1] : undefined,
                separator: hadPrefix ? prefixMatch![2] : undefined
              });
            }

            // Replace the word with transformed version
            const beforeWord = value.substring(0, wordStart);
            const afterWord = value.substring(cursorPos - 1); // Keep the boundary and rest
            value = beforeWord + result.transformed + afterWord;

            // Adjust cursor position based on length difference
            const lengthDiff = result.transformed.length - word.length;
            const newCursorPos = cursorPos + lengthDiff;

            // Update immediately and set cursor
            setTimeout(() => {
              if (textRef.current) {
                textRef.current.value = value;
                textRef.current.setSelectionRange(newCursorPos, newCursorPos);
              }
            }, 0);
          } else if (!result.wasTransformed) {
            // Even if not transformed, check if it's a plain number that came after a prefix with space
            // e.g., when "וחמישים" became "ו- 50", the "50" is a separate word
            if (/^\d+$/.test(word)) {
              console.log('🔍 Found standalone number:', word);
              // Check if previous text ends with Hebrew prefix + separator (with or without space)
              const beforeWord = value.substring(0, wordStart).trimEnd();
              const prefixWithSepMatch = beforeWord.match(/([\u0590-\u05FF]+)([-])$/);

              if (prefixWithSepMatch) {
                console.log('   ✅ Previous text has prefix+separator:', prefixWithSepMatch[1], prefixWithSepMatch[2]);
                // Combine the prefix with this number
                const fullValue = prefixWithSepMatch[1] + prefixWithSepMatch[2] + word;
                console.log('   Combined value:', fullValue);

                setPendingCompound({
                  originalWord: word,
                  transformedValue: fullValue,
                  position: wordStart,
                  hadPrefix: true,
                  prefix: prefixWithSepMatch[1],
                  separator: prefixWithSepMatch[2]
                });
              } else {
                // Just a regular number without prefix
                setPendingCompound({
                  originalWord: word,
                  transformedValue: word,
                  position: wordStart,
                  hadPrefix: false
                });
              }
            }
          }
        }
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
    
    // If user just typed a space, signal parent to apply rules by setting a flag
    // The parent (TextEditor) will handle rule application in handleBlockUpdate
    if (justTypedSpace) {
      console.log('[TextBlock] Space detected, text will be processed with rules');
      // Set a data attribute to signal rule application
      if (textRef.current) {
        textRef.current.dataset.triggerRules = 'true';
      }
    }

    setLocalText(value);

    // Update immediately - debouncing was causing cursor issues
    onUpdate(block.id, 'text', value);

    // Force immediate resize after text change to fix height not expanding
    requestAnimationFrame(() => {
      if (textRef.current) {
        const textarea = textRef.current;
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
        console.log('[TextBlock] Resized - scrollHeight:', textarea.scrollHeight, 'text length:', value.length);

        // Removed reflow logic - made things worse
      }
    });

    // Check if cursor is in a timestamp for highlighting
    if (cursorPos !== null) {
      checkTimestampHover(cursorPos, value);
    }

    // Dynamically detect and update text direction based on content
    const detectedDir = detectTextDirection(value);
    if (detectedDir !== textDirection) {
      setTextDirection(detectedDir);
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
    // Skip auto-resize during Shift+Enter processing to prevent cursor jump
    if (textRef.current && !isProcessingShiftEnter.current) {
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
    // Clear Shift+Enter processing flag when losing focus
    clearShiftEnterFlag();
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

  // Check if this is a special tag block
  const isSpecialTag = Object.values(SPECIAL_TAGS).includes(localSpeaker);

  return (
    <div
      className={'text-block ' + (isActive ? 'active' : '') + ' ' + (!isIsolated ? 'non-isolated' : '') + ' ' + (hasCurrentHighlight ? 'has-current-highlight' : hasHighlight ? 'has-highlight' : '') + ' ' + (!blockViewEnabled ? 'regular-view' : '') + ' ' + (block.isContinuation ? 'continuation-block' : '') + ' ' + (isSpecialTag ? 'special-tag' : '')}
      style={{
        fontSize: fontSize + 'px',
        borderLeftColor: blockViewEnabled ? (isIsolated ? speakerColor : '#cbd5e1') : 'transparent',
        borderRightColor: blockViewEnabled ? (isIsolated ? speakerColor : '#cbd5e1') : 'transparent',
        borderLeftWidth: blockViewEnabled ? '4px' : '0',
        borderRightWidth: blockViewEnabled ? '4px' : '0',
        // Add RIGHT padding for continuation blocks to align with text of regular blocks (RTL layout)
        // 100px (speaker) + 12px (gap) + 12px (separator + gap) = 124px
        paddingRight: block.isContinuation && blockViewEnabled ? '136px' : undefined
      }}
      onClick={handleBlockClick}
      data-block-id={block.id}
    >
      {debugWordExtraction && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#4ade80',
          color: 'white',
          padding: '20px 30px',
          borderRadius: '8px',
          fontSize: '18px',
          fontWeight: 'bold',
          zIndex: 10000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          direction: 'rtl'
        }}>
          {debugWordExtraction}
        </div>
      )}
      {hasCurrentHighlight && (
        <div className="search-highlight-marker" />
      )}
      {/* Hide speaker field for continuation blocks */}
      {!block.isContinuation && (
        <>
          <div className="speaker-input-wrapper" style={{ position: 'relative' }}>
            {speakerHighlights.length > 0 && (
              <TextHighlightOverlay
                text={localSpeaker}
                highlights={speakerHighlights}
                targetRef={speakerRef}
                isTextArea={false}
              />
            )}
            {/* Dynamic font size - smaller for long names */}
            {(() => {
              const speakerNameLength = fullSpeakerName?.length || localSpeaker.length;
              // Three-tier font sizing: normal (≤10), medium (11-13), extra small (>13)
              // Special tags always use default fontSize (not reduced)
              const speakerFontSize = isSpecialTag ? fontSize : (speakerNameLength > 13 ? 11 : speakerNameLength > 10 ? 13 : fontSize);

              return (
                <textarea
                  ref={speakerRef}
                  className="block-speaker"
                  rows={1}
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
                    fontSize: speakerFontSize + 'px',
                    fontFamily: fontFamily === 'david' ? 'David, serif' : 'inherit',
                    fontWeight: isIsolated ? 600 : 400,
                    position: 'relative',
                    zIndex: 2,
                    background: 'transparent'
                  }}
                  data-timestamp={block.speakerTime || 0}
                />
              );
            })()}
            {blockViewEnabled && nameCompletion && (
              <span className="name-completion" style={{ fontSize: fontSize + 'px' }}>
                {nameCompletion}
              </span>
            )}
          </div>

          {/* Hide separator for special tag blocks */}
          {blockViewEnabled && !isSpecialTag && (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <span className="block-separator" style={{ fontSize: fontSize + 'px' }}>:</span>
              {/* Registration mode messages - vertical in separator area */}
              {(isWordHighlighted || isTypingMeaning) && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: isTypingMeaning ? '#0f766e' : '#0891b2',
                  color: 'white',
                  padding: '4px 6px',
                  borderRadius: '4px',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  whiteSpace: 'pre-line',
                  textAlign: 'center',
                  lineHeight: '1.3',
                  zIndex: 200,
                  pointerEvents: 'none',
                  direction: 'rtl'
                }}>
                  {isTypingMeaning ? 'לחץ\nאנטר\nלסיום' : 'לחץ\nTab'}
                </div>
              )}
            </div>
          )}
        </>
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
        {/* Highlight overlay for registration mode */}
        {isTypingMeaning && textRef.current && (
          <div style={{
            position: 'absolute',
            top: '6px',
            right: '8px',
            left: '8px',
            pointerEvents: 'none',
            direction: 'rtl',
            fontSize: fontSize + 'px',
            fontFamily: fontFamily === 'david' ? 'David, serif' : 'inherit',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            wordSpacing: '0.1em',
            zIndex: 1,
            textAlign: 'justify',
            textAlignLast: 'right',
            mixBlendMode: 'multiply' // Better blending with cursor
          }}>
            {(() => {
              // Find the two ** markers
              const textAfterWord = localText.substring(registrationWordEnd);
              const firstStarIndex = textAfterWord.indexOf('*');
              const secondStarIndex = textAfterWord.indexOf('*', firstStarIndex + 1);

              if (firstStarIndex >= 0 && secondStarIndex >= 0) {
                // We have ** markers - highlight only text between them
                const absoluteFirstStar = registrationWordEnd + firstStarIndex;
                const absoluteSecondStar = registrationWordEnd + secondStarIndex;

                return (
                  <>
                    {/* Text BEFORE the prefix word */}
                    <span>{localText.substring(0, registrationWordStart)}</span>
                    {/* Blue highlight: prefix word */}
                    <span style={{ backgroundColor: 'rgba(59, 130, 246, 0.3)', fontWeight: 'bold', padding: '2px 0' }}>
                      {localText.substring(registrationWordStart, registrationWordEnd)}
                    </span>
                    {/* Arrow and first * (no highlight) */}
                    <span>{localText.substring(registrationWordEnd, absoluteFirstStar + 1)}</span>
                    {/* Green highlight: ONLY text between the two ** */}
                    <span style={{ backgroundColor: 'rgba(34, 197, 94, 0.25)', padding: '2px 0' }}>
                      {localText.substring(absoluteFirstStar + 1, absoluteSecondStar)}
                    </span>
                    {/* Blinking cursor after the typed text */}
                    <span style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '20px',
                      backgroundColor: 'rgba(34, 197, 94, 0.4)',
                      verticalAlign: 'middle',
                      animation: 'cursor-blink 1s infinite',
                      marginRight: '-2px'
                    }}></span>
                    {/* Second * and rest of text (no highlight) */}
                    <span>{localText.substring(absoluteSecondStar)}</span>
                  </>
                );
              } else {
                // No markers - show everything after arrow with green highlight
                return (
                  <>
                    <span>{localText.substring(0, registrationWordStart)}</span>
                    <span style={{ backgroundColor: 'rgba(59, 130, 246, 0.3)', fontWeight: 'bold', padding: '2px 0' }}>
                      {localText.substring(registrationWordStart, registrationWordEnd)}
                    </span>
                    <span>{localText.substring(registrationWordEnd, registrationWordEnd + 3)}</span>
                    <span style={{ backgroundColor: 'rgba(34, 197, 94, 0.25)', padding: '2px 0' }}>
                      {localText.substring(registrationWordEnd + 3)}
                    </span>
                  </>
                );
              }
            })()}
          </div>
        )}
        <textarea
          ref={textRef}
          className={`block-text ${isWordHighlighted ? 'registering-shortcut' : ''} ${isTypingMeaning ? 'typing-meaning' : ''} ${isSpecialTag ? 'disabled-tag-text' : ''}`}
          value={localText}
          onChange={handleTextChange}
          onKeyDown={handleTextKeyDown}
          onFocus={handleTextFocus}
          onBlur={handleTextBlur}
          readOnly={isSpecialTag}
          onMouseUp={(e) => {
            // Check for timestamp highlight when clicking
            const textarea = e.currentTarget;
            setTimeout(() => {
              checkTimestampHover(textarea.selectionStart, textarea.value);
            }, 10);
          }}
          placeholder={isFirstBlock ? (mediaName ? `תמלול עבור ${(() => {
            // Decode Hebrew filename if needed
            try {
              if (mediaName.includes('%') || mediaName.includes('\\x')) {
                return decodeURIComponent(mediaName);
              }
              if (/[\u0080-\u00FF]/.test(mediaName)) {
                const bytes = new Uint8Array(mediaName.split('').map(c => c.charCodeAt(0)));
                return new TextDecoder('utf-8').decode(bytes);
              }
              return mediaName;
            } catch (e) {
              return mediaName;
            }
          })()}...` : "הקלד טקסט כאן...") : ""}
          dir={inputLanguage === 'english' ? 'ltr' : 'rtl'}
          style={{
            direction: inputLanguage === 'english' ? 'ltr' : 'rtl',
            textAlign: 'justify',
            textAlignLast: 'start',
            resize: 'none',
            overflow: 'hidden',
            fontSize: fontSize + 'px',
            fontFamily: fontFamily === 'david' ? 'David, serif' : 'inherit',
            color: isTypingMeaning ? 'transparent' : (isIsolated ? 'inherit' : '#94a3b8'), // Hide text when overlay is active
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

  // Re-render if shortcut registration state changes
  if (prevProps.isRegisteringShortcut !== nextProps.isRegisteringShortcut) return false;
  if (prevProps.shortcutPrefix !== nextProps.shortcutPrefix) return false;
  if (prevProps.shortcutPrefixStart !== nextProps.shortcutPrefixStart) return false;
  if (prevProps.shortcutPrefixEnd !== nextProps.shortcutPrefixEnd) return false;

  // Skip re-render for callback functions (they should be stable with useCallback)
  // and other props that don't affect rendering
  return true;
});

export default TextBlock;