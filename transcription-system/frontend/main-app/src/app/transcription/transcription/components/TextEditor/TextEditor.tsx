'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import TextBlock, { TextBlockData } from './blocks/TextBlock';
import BlockManager from './blocks/BlockManager';
import { SpeakerManager } from '../Speaker/utils/speakerManager';
import { ShortcutManager } from './utils/ShortcutManager';
import { ProcessTextResult } from './types/shortcuts';
import ShortcutsModal from './components/ShortcutsModal';
import BackupStatusIndicator from './components/BackupStatusIndicator';
import NewTranscriptionModal from './components/NewTranscriptionModal';
import TranscriptionSwitcher from './components/TranscriptionSwitcher';
import VersionHistoryModal from './components/VersionHistoryModal';
import MediaLinkModal from './components/MediaLinkModal';
import SearchReplaceModal, { SearchOptions, SearchResult } from './components/SearchReplaceModal';
import SpeakerSwapModal from './components/SpeakerSwapModal';
import AutoCorrectModal, { AutoCorrectSettings } from './components/AutoCorrectModal';
import DocumentExportModal from './components/DocumentExportModal';
import HTMLPreviewModal from './components/HTMLPreviewModal';
import { AutoCorrectEngine } from './utils/AutoCorrectEngine';
import ToolbarContent from './ToolbarContent';
import { useMediaSync } from './hooks/useMediaSync';
import { TextEditorProps, SyncedMark, EditorPosition } from './types';
import backupService from '../../../../../services/backupService';
import './TextEditor.css';

/**
 * TextEditor Component - Block-based text editor with speaker support
 * Integrates with MediaPlayer for synchronized transcription
 */
export default function TextEditor({
  mediaPlayerRef,
  marks = [],
  currentTime = 0,
  onSeek,
  onMarkClick,
  enabled = true,
  mediaFileName = '',
  mediaDuration = '',
  currentProjectId = ''
}: TextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [blocks, setBlocks] = useState<TextBlockData[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [activeArea, setActiveArea] = useState<'speaker' | 'text'>('speaker');
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [speakerColors, setSpeakerColors] = useState<Map<string, string>>(new Map());
  const [cursorAtStart, setCursorAtStart] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState<'default' | 'david'>('default');
  const [isolatedSpeakers, setIsolatedSpeakers] = useState<Set<string>>(new Set());
  const [showDescriptionTooltips, setShowDescriptionTooltips] = useState(true);
  const [blockViewEnabled, setBlockViewEnabled] = useState(true);
  const [navigationMode, setNavigationMode] = useState(false);
  const [savedMediaTime, setSavedMediaTime] = useState<number | null>(null);
  const [currentMediaTime, setCurrentMediaTime] = useState(0);
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showNewTranscriptionModal, setShowNewTranscriptionModal] = useState(false);
  const [showVersionHistoryModal, setShowVersionHistoryModal] = useState(false);
  const [showTranscriptionSwitcher, setShowTranscriptionSwitcher] = useState(false);
  const [showMediaLinkModal, setShowMediaLinkModal] = useState(false);
  const [showSearchReplaceModal, setShowSearchReplaceModal] = useState(false);
  const [searchHighlights, setSearchHighlights] = useState<SearchResult[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [linkedMediaId, setLinkedMediaId] = useState<string>('');
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const feedbackTimeoutRef = useRef<NodeJS.Timeout>();
  const [loadedShortcuts, setLoadedShortcuts] = useState<Map<string, any>>(new Map());
  const [userQuota, setUserQuota] = useState({ used: 0, max: 100 });
  const [selectedBlockRange, setSelectedBlockRange] = useState<{start: number, end: number} | null>(null);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedBlocks, setSelectedBlocks] = useState<Set<number>>(new Set());
  const [showSpeakerSwapModal, setShowSpeakerSwapModal] = useState(false);
  const [inputLanguage, setInputLanguage] = useState<'hebrew' | 'english'>('hebrew');
  const [showAutoCorrectModal, setShowAutoCorrectModal] = useState(false);
  const [showDocumentExportModal, setShowDocumentExportModal] = useState(false);
  const [showHTMLPreviewModal, setShowHTMLPreviewModal] = useState(false);
  const [autoCorrectSettings, setAutoCorrectSettings] = useState<AutoCorrectSettings>({
    blockDuplicateSpeakers: true,
    requirePunctuation: true,
    preventDoubleSpace: true,
    fixSpaceBeforePunctuation: true,
    validateParentheses: true,
    validateQuotes: true,
    autoCapitalize: false,
    fixNumberFormatting: false
  });
  const autoCorrectEngineRef = useRef(new AutoCorrectEngine(autoCorrectSettings));
  
  // Update AutoCorrect engine when settings change
  useEffect(() => {
    autoCorrectEngineRef.current.updateSettings(autoCorrectSettings);
  }, [autoCorrectSettings]);
  
  // Debug language changes
  useEffect(() => {
    console.log('TextEditor language state changed to:', inputLanguage);
  }, [inputLanguage]);
  const blockManagerRef = useRef<BlockManager>(new BlockManager());
  const speakerManagerRef = useRef<SpeakerManager>(new SpeakerManager());
  const shortcutManagerRef = useRef<ShortcutManager>(new ShortcutManager('http://localhost:5000/api/transcription/shortcuts'));
  // Track speaker code -> name mappings
  const speakerNamesRef = useRef<Map<string, string>>(new Map());
  
  
  // Undo/Redo history
  const [history, setHistory] = useState<TextBlockData[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoAction = useRef(false);
  
  // Use refs for history to avoid stale closures
  const historyRef = useRef<TextBlockData[][]>([]);
  const historyIndexRef = useRef(-1);
  const lastSavedHistoryRef = useRef<string>('');
  const saveToHistoryRef = useRef<(blocks: TextBlockData[]) => void>();
  
  // NOTE: We update refs immediately in the functions that change state,
  // not in useEffect, to avoid race conditions
  
  // Auto-save state
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [currentTranscriptionId] = useState(() => {
    // For now, use a mock ID. In real app, this would come from props or context
    return 'mock-transcription-' + Date.now();
  });
  const [currentMediaFileName, setCurrentMediaFileName] = useState<string>('');  // Track current media file name
  
  // Refs for frequently changing values (to avoid re-creating event handlers)
  const activeBlockIdRef = useRef(activeBlockId);
  const activeAreaRef = useRef(activeArea);
  const selectedBlockRangeRef = useRef(selectedBlockRange);
  const selectedBlocksRef = useRef(selectedBlocks);
  const blocksRef = useRef(blocks);
  
  // Update refs when values change
  useEffect(() => { activeBlockIdRef.current = activeBlockId; }, [activeBlockId]);
  useEffect(() => { activeAreaRef.current = activeArea; }, [activeArea]);
  useEffect(() => { selectedBlockRangeRef.current = selectedBlockRange; }, [selectedBlockRange]);
  useEffect(() => { selectedBlocksRef.current = selectedBlocks; }, [selectedBlocks]);
  useEffect(() => { blocksRef.current = blocks; }, [blocks]);
  
  
  // Function to show feedback message with auto-dismiss
  const showFeedback = useCallback((message: string, duration: number = 3000) => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    setFeedbackMessage(message);
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedbackMessage('');
    }, duration);
  }, []);
  
  // Function to seek media to a specific time
  const seekToTime = useCallback((time: number) => {
    document.dispatchEvent(new CustomEvent('seekMedia', { 
      detail: { time } 
    }));
  }, []);
  
  // Save to history - simple immediate save
  const saveToHistory = useCallback((newBlocks: TextBlockData[]) => {
    if (isUndoRedoAction.current) {
      return; // Skipping save - undo/redo in progress
    }
    
    // Convert blocks to string for comparison
    const blocksString = JSON.stringify(newBlocks);
    
    // Don't save if nothing changed
    if (blocksString === lastSavedHistoryRef.current) {
      return; // Skipping save - no changes
    }
    
    // Save the snapshot immediately
    const currentHistory = historyRef.current;
    const currentIndex = historyIndexRef.current;
    
    const newHistory = currentHistory.slice(0, currentIndex + 1);
    newHistory.push([...newBlocks]);
    
    // Limit history size
    if (newHistory.length > 100) {
      newHistory.shift();
    }
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    // IMPORTANT: Update the refs immediately!
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
    lastSavedHistoryRef.current = blocksString;
  }, []);
  
  // Store in ref for use in effects
  saveToHistoryRef.current = saveToHistory;
  
  // Undo function - use browser's native undo
  const handleUndo = useCallback(() => {
    // Try to use the browser's native undo on the focused element
    const activeElement = document.activeElement as HTMLTextAreaElement | HTMLInputElement;
    if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT')) {
      // Use execCommand to trigger native undo
      document.execCommand('undo');
      showFeedback('ביטול פעולה');
    } else {
      // No textarea/input focused, try global undo
      document.execCommand('undo');
      showFeedback('ביטול פעולה');
    }
  }, [showFeedback]);
  
  // Redo function - use browser's native redo
  const handleRedo = useCallback(() => {
    // Try to use the browser's native redo on the focused element
    const activeElement = document.activeElement as HTMLTextAreaElement | HTMLInputElement;
    if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT')) {
      // Use execCommand to trigger native redo
      document.execCommand('redo');
      showFeedback('ביצוע חוזר');
    } else {
      // No textarea/input focused, try global redo
      document.execCommand('redo');
      showFeedback('ביצוע חוזר');
    }
  }, [showFeedback]);
  
  // Update media file name when it changes
  useEffect(() => {
    if (mediaFileName) {
      setCurrentMediaFileName(mediaFileName);
    }
  }, [mediaFileName]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      
      // Get current values from refs
      const currentBlocks = blocksRef.current;
      const currentActiveId = activeBlockIdRef.current;
      const currentActiveArea = activeAreaRef.current;
      const currentSelectedRange = selectedBlockRangeRef.current;
      
      // Shift+Ctrl+Arrow for multi-block selection
      if (e.shiftKey && e.ctrlKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        const currentIndex = currentBlocks.findIndex(b => b.id === currentActiveId);
        
        if (currentIndex === -1) return;
        
        if (!currentSelectedRange) {
          // Start new selection from current block
          setSelectedBlockRange({ start: currentIndex, end: currentIndex });
        }
        
        // Extend selection
        const newRange = { ...currentSelectedRange || { start: currentIndex, end: currentIndex } };
        
        if (e.key === 'ArrowUp' && currentIndex > 0) {
          // Extend selection up
          if (currentIndex <= newRange.start) {
            newRange.start = currentIndex - 1;
          } else {
            newRange.end = currentIndex - 1;
          }
          // Move active block up
          const newActiveId = currentBlocks[currentIndex - 1].id;
          setActiveBlockId(newActiveId);
          blockManagerRef.current.setActiveBlock(newActiveId, currentActiveArea);
        } else if (e.key === 'ArrowDown' && currentIndex < currentBlocks.length - 1) {
          // Extend selection down
          if (currentIndex >= newRange.end) {
            newRange.end = currentIndex + 1;
          } else {
            newRange.start = currentIndex + 1;
          }
          // Move active block down
          const newActiveId = currentBlocks[currentIndex + 1].id;
          setActiveBlockId(newActiveId);
          blockManagerRef.current.setActiveBlock(newActiveId, currentActiveArea);
        }
        
        setSelectedBlockRange(newRange);
        
        // Copy selected text to clipboard (always include current block)
        const minIndex = Math.min(newRange.start, newRange.end, currentIndex);
        const maxIndex = Math.max(newRange.start, newRange.end, currentIndex);
        const selectedBlocks = currentBlocks.slice(minIndex, maxIndex + 1);
        
        // Get text from all selected blocks including partial selection in current block
        let selectedText = '';
        
        // For the current block, try to get the selected text from the active textarea/input
        const activeElement = document.activeElement as HTMLTextAreaElement | HTMLInputElement;
        if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT')) {
          const selectionStart = activeElement.selectionStart || 0;
          const selectionEnd = activeElement.selectionEnd || activeElement.value.length;
          
          // Build the full text with current selection
          selectedText = selectedBlocks.map((b, idx) => {
            if (b.id === currentActiveId && selectionStart !== selectionEnd) {
              // For current block with text selection, use the selected portion
              const selectedPortion = activeElement.value.substring(selectionStart, selectionEnd);
              return `${b.speaker}: ${selectedPortion}`;
            }
            return `${b.speaker}: ${b.text}`;
          }).join('\n');
        } else {
          // No active selection, use full text
          selectedText = selectedBlocks.map(b => `${b.speaker}: ${b.text}`).join('\n');
        }
        
        navigator.clipboard.writeText(selectedText).then(() => {
          showFeedback(`${selectedBlocks.length} בלוקים נבחרו`);
        });
        return;
      }
      
      // Clear selection on any non-shift key (except Delete)
      if (!e.shiftKey && currentSelectedRange && e.key !== 'Delete') {
        setSelectedBlockRange(null);
      }
      
      // Handle Delete key when blocks are selected
      if (e.key === 'Delete' && currentSelectedRange) {
        e.preventDefault();
        
        // Delete all text in selected blocks
        const minIndex = Math.min(currentSelectedRange.start, currentSelectedRange.end);
        const maxIndex = Math.max(currentSelectedRange.start, currentSelectedRange.end);
        
        // Clear text in selected blocks
        const updatedBlocks = currentBlocks.map((block, index) => {
          if (index >= minIndex && index <= maxIndex) {
            // Clear both speaker and text
            blockManagerRef.current.updateBlock(block.id, 'speaker', '');
            blockManagerRef.current.updateBlock(block.id, 'text', '');
            return { ...block, speaker: '', text: '' };
          }
          return block;
        });
        
        setBlocks(updatedBlocks);
        setSelectedBlockRange(null);
        if (saveToHistoryRef.current) {
          saveToHistoryRef.current(updatedBlocks);
        }
        showFeedback('הטקסט בבלוקים הנבחרים נמחק');
        return;
      }
      
      // Remove custom Ctrl+Z/Y handling - let browser's native undo work
      // The icons will trigger the same native undo via execCommand
      // Ctrl+A for select all
      if (e.ctrlKey && e.key === 'a') {
        const activeElement = document.activeElement as HTMLTextAreaElement | HTMLInputElement;
        
        if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT')) {
          // Check if text is already selected (before this Ctrl+A)
          const wasSelected = activeElement.selectionStart === 0 && 
                              activeElement.selectionEnd === activeElement.value.length && 
                              activeElement.value.length > 0;
          
          if (wasSelected) {
            // Field was already fully selected - select all blocks
            e.preventDefault();
            e.stopPropagation();
            
            // Call our select all blocks function
            handleSelectAllBlocksEvent();
          } else {
            // First Ctrl+A - let browser select current field
            // Check again after a short delay
            setTimeout(() => {
              const nowSelected = activeElement.selectionStart === 0 && 
                                 activeElement.selectionEnd === activeElement.value.length;
              if (nowSelected && activeElement.value.length > 0) {
                showFeedback('לחץ Ctrl+A שוב לבחירת כל הבלוקים');
              }
            }, 50);
          }
        }
      }
    };

    const handleSelectAllBlocksEvent = () => {
      // Get current blocks from ref
      const allBlocks = blocksRef.current;
      
      // Select all blocks visually
      setSelectedBlockRange({ start: 0, end: allBlocks.length - 1 });
      
      // Get all text content
      const allText = allBlocks.map(b => {
        const speaker = b.speaker ? `${b.speaker}: ` : '';
        return `${speaker}${b.text}`;
      }).join('\n');
      
      // Copy to clipboard
      navigator.clipboard.writeText(allText).then(() => {
        showFeedback('כל הבלוקים נבחרו - לחץ Delete למחיקה או Ctrl+Shift+A לביטול');
      });
    };
    
    const handleClearBlockSelection = () => {
      // Clear both range and multi-select
      setSelectedBlockRange(null);
      setSelectedBlocks(new Set());
      // Removed annoying feedback message
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectAllBlocks', handleSelectAllBlocksEvent);
    document.addEventListener('clearBlockSelection', handleClearBlockSelection);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectAllBlocks', handleSelectAllBlocksEvent);
      document.removeEventListener('clearBlockSelection', handleClearBlockSelection);
    };
  }, [handleUndo, handleRedo, showFeedback]); // Include all dependencies used in the effect
  
  // Initialize blocks from block manager and shortcuts
  useEffect(() => {
    const initialBlocks = blockManagerRef.current.getBlocks();
    setBlocks([...initialBlocks]);
    if (initialBlocks.length > 0) {
      setActiveBlockId(initialBlocks[0].id);
      setActiveArea('speaker');
      // Set the first block's timestamp to current media time
      if (currentMediaTime > 0) {
        blockManagerRef.current.setFirstBlockTimestamp(currentMediaTime);
      }
    }
    // Initialize history with initial state
    const initialHistory = [[...initialBlocks]];
    setHistory(initialHistory);
    setHistoryIndex(0);
    historyRef.current = initialHistory; // Sync the ref with initial state
    historyIndexRef.current = 0; // Sync the ref with initial state
    
    // Initialize shortcuts manager
    const initShortcuts = async () => {
      try {
        // Load shortcuts from public endpoint (no auth required for now)
        const response = await fetch('http://localhost:5000/api/transcription/shortcuts/public').catch((err) => {
          console.warn('TextEditor: Shortcuts endpoint not available, using defaults');
          return null;
        });
        
        if (response && response.ok) {
          const data = await response.json();
          const shortcutsMap = shortcutManagerRef.current.getAllShortcuts();
          shortcutsMap.clear();
          data.shortcuts.forEach(([shortcut, shortcutData]: [string, any]) => {
            shortcutsMap.set(shortcut, shortcutData);
          });
          console.log('TextEditor: Loaded', shortcutsMap.size, 'shortcuts');
          setLoadedShortcuts(new Map(shortcutsMap));
        } else {
          // Use default shortcuts if endpoint fails
          console.log('TextEditor: Using default shortcuts');
          const defaultShortcuts = shortcutManagerRef.current.getAllShortcuts();
          setLoadedShortcuts(new Map(defaultShortcuts));
        }
      } catch (error) {
        console.warn('TextEditor: Failed to load shortcuts, using defaults');
        // Use default shortcuts on error
        const defaultShortcuts = shortcutManagerRef.current.getAllShortcuts();
        setLoadedShortcuts(new Map(defaultShortcuts));
      }
    };
    
    initShortcuts();
    
    // Load shortcuts enabled preference
    const savedEnabled = localStorage.getItem('textEditorShortcutsEnabled');
    if (savedEnabled !== null) {
      setShortcutsEnabled(savedEnabled === 'true');
    }
    
    // Initialize auto-save
    if (autoSaveEnabled && currentTranscriptionId) {
      backupService.initAutoSave(currentTranscriptionId, 60000); // 1 minute
      
      // Set up data callback for backup service
      backupService.setDataCallback(() => {
        const blocks = blockManagerRef.current.getBlocks();
        const speakers = speakerManagerRef.current.getAllSpeakers();
        
        return {
          blocks: blocks.map(block => ({
            id: block.id,
            text: block.text,
            speaker: block.speaker,
            timestamp: block.speakerTime ? formatTime(block.speakerTime) : undefined
          })),
          speakers: speakers.map(speaker => ({
            code: speaker.code,
            name: speaker.name,
            description: speaker.description
          }))
        };
      });
    }
    
    // Cleanup auto-save on unmount
    return () => {
      backupService.stopAutoSave();
    };
  }, [autoSaveEnabled, currentTranscriptionId]);

  // Use the media sync hook for synchronization - DISABLED
  const {
    activeMark,
    syncToMark,
    insertTimestamp,
    syncToTime
  } = useMediaSync({
    marks: [],  // Disabled - passing empty marks
    currentTime: 0,  // Disabled - not syncing time
    duration: 0,
    isPlaying: false,
    onSeek: () => {},  // Disabled - no seeking
    syncEnabled: false,  // Disabled sync
    autoScroll: false,
    highlightDelay: 200
  });

  // Handle block navigation with isolation support
  const handleNavigate = useCallback((blockId: string, direction: 'prev' | 'next' | 'up' | 'down' | 'speaker' | 'text', fromField: 'speaker' | 'text' = 'speaker') => {
    // If isolation is active, skip non-isolated blocks
    if (isolatedSpeakers.size > 0 && (direction === 'up' || direction === 'down' || direction === 'prev' || direction === 'next')) {
      const blocks = blockManagerRef.current.getBlocks();
      const currentIndex = blocks.findIndex(b => b.id === blockId);
      
      if (currentIndex !== -1) {
        let targetIndex = currentIndex;
        const step = (direction === 'up' || direction === 'prev') ? -1 : 1;
        
        // Find next isolated block
        do {
          targetIndex += step;
          if (targetIndex < 0 || targetIndex >= blocks.length) {
            // Reached boundary, stay on current block
            return;
          }
        } while (blocks[targetIndex] && !isolatedSpeakers.has(blocks[targetIndex].speaker));
        
        if (targetIndex >= 0 && targetIndex < blocks.length) {
          const targetBlock = blocks[targetIndex];
          blockManagerRef.current.setActiveBlock(targetBlock.id, fromField);
          setActiveBlockId(targetBlock.id);
          setActiveArea(fromField);
          setCursorAtStart(false);
          setBlocks([...blocks]);
          return;
        }
      }
    }
    
    // Normal navigation
    blockManagerRef.current.setActiveBlock(blockId, fromField);
    blockManagerRef.current.navigate(direction);
    
    const newBlockId = blockManagerRef.current.getActiveBlockId();
    const newArea = blockManagerRef.current.getActiveArea();
    
    setActiveBlockId(newBlockId);
    setActiveArea(newArea);
    setCursorAtStart(false); // Reset cursor position flag
    setBlocks([...blockManagerRef.current.getBlocks()]);
    
    // If navigation mode is ON and we moved to a new block, seek to its timestamp
    if (navigationMode && newBlockId && newBlockId !== blockId) {
      const blocks = blockManagerRef.current.getBlocks();
      const newBlock = blocks.find(b => b.id === newBlockId);
      if (newBlock && newBlock.speakerTime !== undefined) {
        seekToTime(newBlock.speakerTime);
      }
    }
  }, [isolatedSpeakers, navigationMode, seekToTime]);

  // Process shortcuts in text
  const processShortcuts = useCallback((text: string, cursorPosition: number): ProcessTextResult | null => {
    if (!shortcutsEnabled || !shortcutManagerRef.current) {
      return null;
    }
    
    const result = shortcutManagerRef.current.processText(text, cursorPosition);
    
    // Remove visual feedback - just process silently
    
    return result;
  }, [shortcutsEnabled]);

  // Handle adding personal shortcut
  const handleAddShortcut = useCallback(async (shortcut: string, expansion: string, description?: string) => {
    // For now, just add to local shortcuts since we're using public endpoint
    const shortcutsMap = shortcutManagerRef.current.getAllShortcuts();
    shortcutsMap.set(shortcut, {
      expansion,
      source: 'user',
      description,
      category: 'custom'
    });
    setLoadedShortcuts(new Map(shortcutsMap));
    
    // Update quota
    const userShortcuts = Array.from(shortcutsMap.values()).filter(s => s.source === 'user');
    setUserQuota(prev => ({ ...prev, used: userShortcuts.length }));
  }, []);

  // Handle editing personal shortcut
  const handleEditShortcut = useCallback(async (oldShortcut: string, newShortcut: string, expansion: string, description?: string) => {
    const shortcutsMap = shortcutManagerRef.current.getAllShortcuts();
    
    // Remove old shortcut
    shortcutsMap.delete(oldShortcut);
    
    // Add new/updated shortcut
    shortcutsMap.set(newShortcut, {
      expansion,
      source: 'user',
      description,
      category: 'custom'
    });
    
    setLoadedShortcuts(new Map(shortcutsMap));
  }, []);

  // Handle deleting personal shortcut
  const handleDeleteShortcut = useCallback(async (shortcut: string) => {
    const shortcutsMap = shortcutManagerRef.current.getAllShortcuts();
    shortcutsMap.delete(shortcut);
    setLoadedShortcuts(new Map(shortcutsMap));
    
    // Update quota
    const userShortcuts = Array.from(shortcutsMap.values()).filter(s => s.source === 'user');
    setUserQuota(prev => ({ ...prev, used: userShortcuts.length }));
  }, []);

  // Handle new transcription creation
  const handleTranscriptionCreated = useCallback((transcription: any) => {
    console.log('New transcription created:', transcription);
    // In a real implementation, you would:
    // 1. Switch to the new transcription
    // 2. Clear current blocks
    // 3. Load transcription data
    // 4. Update backup service with new transcription ID
    
    // For now, just clear the current content
    blockManagerRef.current = new BlockManager();
    speakerManagerRef.current = new SpeakerManager();
    setBlocks([]);
    setActiveBlockId(null);
    
    // Initialize with first block
    const initialBlocks = blockManagerRef.current.getBlocks();
    setBlocks([...initialBlocks]);
    if (initialBlocks.length > 0) {
      setActiveBlockId(initialBlocks[0].id);
      setActiveArea('speaker');
    }
    
    // Update backup service with new transcription ID
    backupService.stopAutoSave();
    backupService.initAutoSave(transcription.id, 60000);
  }, []);

  // Handle transcription change from switcher
  const handleTranscriptionChange = useCallback((transcription: any) => {
    console.log('Switching to transcription:', transcription);
    // In a real implementation, you would:
    // 1. Save current transcription state
    // 2. Load the selected transcription data
    // 3. Update blocks and speakers
    // 4. Update backup service with new transcription ID
    
    // For now, just update the current transcription ID
    backupService.stopAutoSave();
    backupService.initAutoSave(transcription.id, 60000);
    
    // Update media file name (mock data for now)
    const mockMediaFiles = {
      'trans-1': 'interview_part1.mp3',
      'trans-2': 'interview_part2.mp3',
      'trans-3': 'draft_recording.wav'
    };
    setCurrentMediaFileName(mockMediaFiles[transcription.id as keyof typeof mockMediaFiles] || '');
    
    // Close the switcher dropdown
    setShowTranscriptionSwitcher(false);
    
    // TODO: Load transcription data from API
    // This would fetch the transcription content and populate the editor
  }, []);

  // Handle block update
  const handleBlockUpdate = useCallback((id: string, field: 'speaker' | 'text', value: string) => {
    const currentBlocks = blockManagerRef.current.getBlocks();
    const blockIndex = currentBlocks.findIndex(b => b.id === id);
    const originalSpeaker = currentBlocks[blockIndex]?.speaker;
    
    // Update the specific block
    blockManagerRef.current.updateBlock(id, field, value);
    
    // If speaker field changed and we have selected blocks, update all selected blocks with the same original speaker
    if (field === 'speaker' && (selectedBlocksRef.current.size > 0 || selectedBlockRangeRef.current)) {
      const blocksToUpdate = new Set<number>();
      
      // Collect indices from multi-select
      if (selectedBlocksRef.current.size > 0) {
        selectedBlocksRef.current.forEach(idx => blocksToUpdate.add(idx));
      }
      
      // Collect indices from range select
      if (selectedBlockRangeRef.current) {
        for (let i = selectedBlockRangeRef.current.start; i <= selectedBlockRangeRef.current.end; i++) {
          blocksToUpdate.add(i);
        }
      }
      
      // Update all selected blocks that have the same original speaker
      blocksToUpdate.forEach(idx => {
        if (idx !== blockIndex && currentBlocks[idx]?.speaker === originalSpeaker) {
          blockManagerRef.current.updateBlock(currentBlocks[idx].id, 'speaker', value);
        }
      });
    }
    
    const newBlocks = [...blockManagerRef.current.getBlocks()];
    setBlocks(newBlocks);
    
    // Save to history immediately for all changes
    saveToHistory(newBlocks);
    
    // Update speaker colors if speaker changed
    if (field === 'speaker' && value) {
      const speaker = speakerManagerRef.current.findByName(value);
      if (speaker) {
        setSpeakerColors(prev => new Map(prev).set(value, speaker.color));
      }
    }
    
    // Mark changes for auto-save
    backupService.markChanges();
  }, [saveToHistory]);

  // Handle new block creation
  const handleNewBlock = useCallback(() => {
    const currentBlock = blockManagerRef.current.getActiveBlock();
    if (currentBlock) {
      const newBlock = blockManagerRef.current.addBlock(currentBlock.id, currentMediaTime);
      setActiveBlockId(newBlock.id);
      setActiveArea('speaker');
      const newBlocks = [...blockManagerRef.current.getBlocks()];
      setBlocks(newBlocks);
      
      // Save to history immediately for structural changes
      saveToHistory(newBlocks);
      
      // Mark changes for auto-save
      backupService.markChanges();
    }
  }, [currentMediaTime, saveToHistory]);

  // Handle block click for multi-select
  const handleBlockClick = useCallback((blockIndex: number, ctrlKey: boolean, shiftKey: boolean) => {
    if (multiSelectMode || ctrlKey) {
      // Multi-select mode: toggle individual block selection
      setSelectedBlocks(prev => {
        const newSet = new Set(prev);
        if (newSet.has(blockIndex)) {
          newSet.delete(blockIndex);
        } else {
          newSet.add(blockIndex);
        }
        return newSet;
      });
      // Clear range selection when using multi-select
      setSelectedBlockRange(null);
    } else if (shiftKey && selectedBlocks.size > 0) {
      // Shift+click: select range from last selected to clicked
      const lastSelected = Math.max(...Array.from(selectedBlocks));
      const start = Math.min(lastSelected, blockIndex);
      const end = Math.max(lastSelected, blockIndex);
      const newSet = new Set(selectedBlocks);
      for (let i = start; i <= end; i++) {
        newSet.add(i);
      }
      setSelectedBlocks(newSet);
    } else {
      // Regular click: clear multi-select
      setSelectedBlocks(new Set());
      setSelectedBlockRange(null);
    }
  }, [multiSelectMode]);

  // Handle select all blocks
  const handleSelectAllBlocks = useCallback(() => {
    const allBlocks = blocks;
    
    // Select all blocks visually
    setSelectedBlockRange({ start: 0, end: allBlocks.length - 1 });
    
    // Get all text content
    const allText = allBlocks.map(b => {
      const speaker = b.speaker ? `${b.speaker}: ` : '';
      return `${speaker}${b.text}`;
    }).join('\n');
    
    // Try to select all text in all textareas
    const textareas = document.querySelectorAll('.block-text');
    const inputs = document.querySelectorAll('.block-speaker');
    
    // Select text in all fields
    textareas.forEach((textarea: any) => {
      if (textarea.value) {
        textarea.select();
      }
    });
    
    inputs.forEach((input: any) => {
      if (input.value) {
        input.select();
      }
    });
    
    // Focus on the first textarea to allow deletion
    if (textareas.length > 0) {
      const firstTextarea = textareas[0] as HTMLTextAreaElement;
      firstTextarea.focus();
      firstTextarea.select();
      
      // Also copy to clipboard
      navigator.clipboard.writeText(allText).then(() => {
        showFeedback('כל הבלוקים נבחרו - לחץ Delete למחיקה או Ctrl+C להעתקה');
      });
    } else {
      // No textareas, just copy
      navigator.clipboard.writeText(allText).then(() => {
        showFeedback('הטקסט הועתק');
      });
    }
  }, [blocks, showFeedback]);

  // Handle speaker swap
  const handleSpeakerSwap = useCallback((fromSpeaker: string, toSpeaker: string, applyToSelected: boolean) => {
    const currentBlocks = blockManagerRef.current.getBlocks();
    let updatedCount = 0;
    
    if (applyToSelected && (selectedBlocksRef.current.size > 0 || selectedBlockRangeRef.current)) {
      // Apply to selected blocks only
      const selectedIndices = new Set<number>();
      
      if (selectedBlocksRef.current.size > 0) {
        selectedBlocksRef.current.forEach(idx => selectedIndices.add(idx));
      }
      
      if (selectedBlockRangeRef.current) {
        for (let i = selectedBlockRangeRef.current.start; i <= selectedBlockRangeRef.current.end; i++) {
          selectedIndices.add(i);
        }
      }
      
      selectedIndices.forEach(idx => {
        if (currentBlocks[idx]?.speaker === fromSpeaker) {
          blockManagerRef.current.updateBlock(currentBlocks[idx].id, 'speaker', toSpeaker);
          updatedCount++;
        }
      });
    } else {
      // Apply to all blocks
      currentBlocks.forEach(block => {
        if (block.speaker === fromSpeaker) {
          blockManagerRef.current.updateBlock(block.id, 'speaker', toSpeaker);
          updatedCount++;
        }
      });
    }
    
    const newBlocks = [...blockManagerRef.current.getBlocks()];
    setBlocks(newBlocks);
    saveToHistory(newBlocks);
    backupService.markChanges();
    
    // Update speaker colors
    const speaker = speakerManagerRef.current.findByName(toSpeaker);
    if (speaker) {
      setSpeakerColors(prev => new Map(prev).set(toSpeaker, speaker.color));
    }
    
    showFeedback(`${updatedCount} בלוקים עודכנו: ${fromSpeaker} → ${toSpeaker}`);
  }, [saveToHistory, showFeedback]);

  // Handle block removal
  const handleRemoveBlock = useCallback((id: string) => {
    blockManagerRef.current.removeBlock(id);
    const newActiveId = blockManagerRef.current.getActiveBlockId();
    const newArea = blockManagerRef.current.getActiveArea();
    const newBlocks = [...blockManagerRef.current.getBlocks()];
    
    setActiveBlockId(newActiveId);
    setActiveArea(newArea);
    setBlocks(newBlocks);
    
    // Save to history immediately for structural changes
    saveToHistory(newBlocks, true);
    
    // Mark changes for auto-save
    backupService.markChanges();
  }, [saveToHistory]);

  // Handle DELETE key for cross-block deletion
  const handleDeleteAcrossBlocks = useCallback((currentBlockId: string, fromField: 'speaker' | 'text') => {
    const blocks = blockManagerRef.current.getBlocks();
    const currentIndex = blocks.findIndex(b => b.id === currentBlockId);
    
    if (currentIndex < blocks.length - 1) {
      const nextBlock = blocks[currentIndex + 1];
      
      // Check if next block is completely empty
      if (!nextBlock.speaker && !nextBlock.text) {
        // Both speaker and text are empty, remove the next block
        blockManagerRef.current.removeBlock(nextBlock.id);
        // Stay in current position
      } else if (nextBlock.speaker && nextBlock.speaker.length > 0) {
        // Navigate to next block's speaker and position cursor at start
        blockManagerRef.current.setActiveBlock(nextBlock.id, 'speaker');
        setActiveBlockId(nextBlock.id);
        setActiveArea('speaker');
        setCursorAtStart(true);
      } else if (nextBlock.text && nextBlock.text.length > 0) {
        // Speaker is empty but text has content, navigate to text
        blockManagerRef.current.setActiveBlock(nextBlock.id, 'text');
        setActiveBlockId(nextBlock.id);
        setActiveArea('text');
        setCursorAtStart(true);
      }
      
      setBlocks([...blockManagerRef.current.getBlocks()]);
    }
  }, []);

  // Handle speaker transformation
  const handleSpeakerTransform = useCallback(async (code: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const handleResponse = (event: CustomEvent) => {
        document.removeEventListener('speakerCreated', handleResponse as EventListener);
        
        const speakerId = event.detail.speakerId;
        const speakerCode = event.detail.code;
        const speakerName = event.detail.name;
        
        // Track which blocks belong to this speaker by ID
        if (speakerId) {
          if (!speakerBlocksRef.current.has(speakerId)) {
            speakerBlocksRef.current.set(speakerId, new Set());
          }
          
          // Add current block to the speaker's block set
          const currentBlockId = blockManagerRef.current.getActiveBlockId();
          if (currentBlockId) {
            speakerBlocksRef.current.get(speakerId)!.add(currentBlockId);
          }
          
          // Track speaker ID to code mapping
          if (speakerCode) {
            speakerIdToCodeRef.current.set(speakerId, speakerCode);
          }
          
          // Track the name mapping if available
          if (speakerCode && speakerName && speakerName.trim()) {
            speakerNamesRef.current.set(speakerCode, speakerName);
          }
        }
        
        resolve(speakerName || event.detail.code);
      };
      
      document.addEventListener('speakerCreated', handleResponse as EventListener);
      
      // Request speaker transformation
      document.dispatchEvent(new CustomEvent('speakerTabRequest', {
        detail: {
          code,
          callback: (name: string | null) => {
            if (!name) {
              document.removeEventListener('speakerCreated', handleResponse as EventListener);
              resolve(name);
              return;
            }
            
            // For single character codes, track the block immediately
            if (code.length === 1) {
              if (!speakerBlocksRef.current.has(code)) {
                speakerBlocksRef.current.set(code, new Set());
              }
              
              // Add current block to the speaker's block set
              const currentBlockId = blockManagerRef.current.getActiveBlockId();
              if (currentBlockId) {
                speakerBlocksRef.current.get(code)!.add(currentBlockId);
              }
            }
            
            resolve(name);
          }
        }
      }));
    });
  }, []);

  // Search and Replace handlers
  const handleSearch = useCallback((text: string, options: SearchOptions): SearchResult[] => {
    const results: SearchResult[] = [];
    const blocks = blockManagerRef.current.getBlocks();
    
    if (!text) {
      setSearchHighlights([]);
      return results;
    }
    
    blocks.forEach(block => {
      // Build search pattern
      let pattern: RegExp;
      if (options.useRegex) {
        try {
          pattern = new RegExp(text, options.caseSensitive ? 'g' : 'gi');
        } catch {
          return; // Invalid regex
        }
      } else {
        let escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (options.wholeWord) {
          escapedText = `\\b${escapedText}\\b`;
        }
        pattern = new RegExp(escapedText, options.caseSensitive ? 'g' : 'gi');
      }
      
      // Search in speaker field
      if (block.speaker) {
        const matches = [...block.speaker.matchAll(pattern)];
        matches.forEach(match => {
          if (match.index !== undefined) {
            results.push({
              blockId: block.id,
              field: 'speaker',
              startIndex: match.index,
              endIndex: match.index + match[0].length,
              matchText: match[0]
            });
          }
        });
      }
      
      // Search in text field
      if (block.text) {
        const matches = [...block.text.matchAll(pattern)];
        matches.forEach(match => {
          if (match.index !== undefined) {
            results.push({
              blockId: block.id,
              field: 'text',
              startIndex: match.index,
              endIndex: match.index + match[0].length,
              matchText: match[0]
            });
          }
        });
      }
    });
    
    setSearchHighlights(results);
    setCurrentSearchIndex(0);
    
    // Scroll to first result if any, but don't focus
    if (results.length > 0) {
      const result = results[0];
      const blockElement = document.getElementById(`block-${result.blockId}`);
      if (blockElement) {
        blockElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    
    return results;
  }, []);

  const handleReplace = useCallback((text: string, replacement: string, options: SearchOptions) => {
    const results = handleSearch(text, options);
    if (results.length > 0) {
      const firstResult = results[0];
      const block = blockManagerRef.current.getBlocks().find(b => b.id === firstResult.blockId);
      
      if (block) {
        const field = firstResult.field;
        const currentText = block[field] || '';
        const newText = currentText.substring(0, firstResult.startIndex) + 
                       replacement + 
                       currentText.substring(firstResult.endIndex);
        
        blockManagerRef.current.updateBlock(firstResult.blockId, field, newText);
        setBlocks([...blockManagerRef.current.getBlocks()]);
        showFeedback('הוחלף בהצלחה');
      }
    }
  }, [handleSearch]);

  const handleReplaceAll = useCallback((text: string, replacement: string, options: SearchOptions) => {
    const results = handleSearch(text, options);
    let replacedCount = 0;
    
    // Group results by block and field for efficient replacement
    const groupedResults = new Map<string, Map<'speaker' | 'text', SearchResult[]>>();
    
    results.forEach(result => {
      if (!groupedResults.has(result.blockId)) {
        groupedResults.set(result.blockId, new Map());
      }
      const blockMap = groupedResults.get(result.blockId)!;
      if (!blockMap.has(result.field)) {
        blockMap.set(result.field, []);
      }
      blockMap.get(result.field)!.push(result);
    });
    
    // Process replacements
    groupedResults.forEach((fields, blockId) => {
      const block = blockManagerRef.current.getBlocks().find(b => b.id === blockId);
      if (block) {
        fields.forEach((fieldResults, field) => {
          let currentText = block[field] || '';
          // Sort results by index in reverse to maintain indices during replacement
          const sortedResults = fieldResults.sort((a, b) => b.startIndex - a.startIndex);
          
          sortedResults.forEach(result => {
            currentText = currentText.substring(0, result.startIndex) + 
                         replacement + 
                         currentText.substring(result.endIndex);
            replacedCount++;
          });
          
          blockManagerRef.current.updateBlock(blockId, field, currentText);
        });
      }
    });
    
    if (replacedCount > 0) {
      setBlocks([...blockManagerRef.current.getBlocks()]);
      showFeedback(`הוחלפו ${replacedCount} מופעים`);
    } else {
      showFeedback('לא נמצאו מופעים להחלפה');
    }
  }, [handleSearch]);

  // Track which blocks belong to which speaker (by speaker ID)
  const speakerBlocksRef = useRef<Map<string, Set<string>>>(new Map());
  // Track speaker ID to code mapping
  const speakerIdToCodeRef = useRef<Map<string, string>>(new Map());
  
  // Listen for bidirectional swap event
  useEffect(() => {
    const handleBidirectionalSwap = (event: CustomEvent) => {
      const { speaker1, speaker2, applyToSelected } = event.detail;
      console.log('Handling bidirectional swap:', speaker1, '<->', speaker2);
      
      const currentBlocks = blockManagerRef.current.getBlocks();
      const updatedBlocks = [...currentBlocks];
      let swapCount = 0;
      
      if (applyToSelected && (selectedBlocksRef.current.size > 0 || selectedBlockRangeRef.current)) {
        // Apply to selected blocks only
        const selectedIndices = new Set<number>();
        
        if (selectedBlocksRef.current.size > 0) {
          selectedBlocksRef.current.forEach(idx => selectedIndices.add(idx));
        }
        
        if (selectedBlockRangeRef.current) {
          for (let i = selectedBlockRangeRef.current.start; i <= selectedBlockRangeRef.current.end; i++) {
            selectedIndices.add(i);
          }
        }
        
        selectedIndices.forEach(idx => {
          if (updatedBlocks[idx]) {
            if (updatedBlocks[idx].speaker === speaker1) {
              updatedBlocks[idx] = { ...updatedBlocks[idx], speaker: speaker2 };
              swapCount++;
            } else if (updatedBlocks[idx].speaker === speaker2) {
              updatedBlocks[idx] = { ...updatedBlocks[idx], speaker: speaker1 };
              swapCount++;
            }
          }
        });
      } else {
        // Apply to all blocks - swap atomically
        updatedBlocks.forEach((block, idx) => {
          if (block.speaker === speaker1) {
            updatedBlocks[idx] = { ...block, speaker: speaker2 };
            swapCount++;
          } else if (block.speaker === speaker2) {
            updatedBlocks[idx] = { ...block, speaker: speaker1 };
            swapCount++;
          }
        });
      }
      
      // Update all blocks at once
      blockManagerRef.current.setBlocks(updatedBlocks);
      setBlocks(updatedBlocks);
      
      if (swapCount > 0) {
        showFeedback(`הוחלפו ${swapCount} בלוקים`);
        saveToHistoryRef.current?.(updatedBlocks);
      }
    };
    
    document.addEventListener('bidirectionalSwap', handleBidirectionalSwap);
    return () => {
      document.removeEventListener('bidirectionalSwap', handleBidirectionalSwap);
    };
  }, []);

  // Listen for speaker updates
  useEffect(() => {
    const handleSpeakerUpdated = (event: CustomEvent) => {
      const { speakerId, code, name, color, oldCode, oldName } = event.detail;
      
      // Get all current blocks first
      const blocks = blockManagerRef.current.getBlocks();
      
      // Determine what exactly we're updating from and to
      let updateFrom: string | null = null;
      let updateTo: string | null = null;
      
      // If this is a name change for an existing speaker
      if (oldName && oldName !== name) {
        updateFrom = oldName;
        updateTo = (name && name.trim()) ? name : code;
      }
      // If this is a code change for an existing speaker
      else if (oldCode && oldCode !== code) {
        updateFrom = oldCode;
        updateTo = (name && name.trim()) ? name : code;
      }
      // If this is a new name being set for a code
      else if (code && name && !oldName) {
        // Check if blocks currently show the code and should show the name
        updateFrom = code;
        updateTo = name;
      }
      
      // Only proceed if we have something to update
      if (updateFrom && updateTo && updateFrom !== updateTo) {
        let hasUpdates = false;
        
        // Update ONLY blocks that EXACTLY match the updateFrom value
        blocks.forEach(block => {
          if (block.speaker === updateFrom) {
            blockManagerRef.current.updateBlock(block.id, 'speaker', updateTo);
            hasUpdates = true;
          }
        });
        
        // Force re-render if there were updates
        if (hasUpdates) {
          setBlocks([...blockManagerRef.current.getBlocks()]);
        }
      }
      
      // Update color mapping if color provided
      if (color && updateTo) {
        setSpeakerColors(prev => {
          const newMap = new Map(prev);
          
          // Remove old color entry if name changed
          if (updateFrom && updateFrom !== updateTo) {
            newMap.delete(updateFrom);
          }
          
          // Set new color
          newMap.set(updateTo, color);
          return newMap;
        });
      }
      
      // Track speaker name to code mapping for autocomplete
      if (code && name && name.trim()) {
        speakerNamesRef.current.set(code, name);
      } else if (code && !name) {
        speakerNamesRef.current.delete(code);
      }
    };
    
    document.addEventListener('speakerUpdated', handleSpeakerUpdated as EventListener);
    document.addEventListener('speakerCreated', handleSpeakerUpdated as EventListener);
    
    return () => {
      document.removeEventListener('speakerUpdated', handleSpeakerUpdated as EventListener);
      document.removeEventListener('speakerCreated', handleSpeakerUpdated as EventListener);
    };
  }, [speakerColors]);
  
  // Click outside handler for transcription switcher
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is outside the dropdown and not on the trigger button
      if (showTranscriptionSwitcher && 
          !target.closest('.toolbar-dropdown') && 
          !target.closest('.toolbar-btn[title="בחר תמלול"]')) {
        setShowTranscriptionSwitcher(false);
      }
    };

    if (showTranscriptionSwitcher) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTranscriptionSwitcher]);
  
  // Listen for speaker selection changes and tooltip toggle
  useEffect(() => {
    const handleSpeakersSelected = (event: CustomEvent) => {
      const { selectedCodes } = event.detail;
      setIsolatedSpeakers(new Set(selectedCodes));
    };
    
    const handleToggleTooltips = (event: CustomEvent) => {
      const { enabled } = event.detail;
      setShowDescriptionTooltips(enabled);
    };
    
    // Listen for media time updates
    const handleMediaTimeUpdate = (event: CustomEvent) => {
      const { time } = event.detail;
      setCurrentMediaTime(time || 0);
      // Set the first block's timestamp if it doesn't have one
      blockManagerRef.current.setFirstBlockTimestamp(time || 0);
    };
    
    // Handle navigation mode check from child components
    const handleCheckNavigationMode = (event: CustomEvent) => {
      const { callback } = event.detail;
      if (callback) {
        callback(navigationMode);
      }
    };
    
    // Check if a speaker code is in use
    const handleCheckSpeakerInUse = (event: CustomEvent) => {
      const { code, name, callback } = event.detail;
      if (callback) {
        const blocks = blockManagerRef.current ? blockManagerRef.current.getBlocks() : [];
        // Check if any block uses this speaker (code or associated name)
        const inUse = blocks.some(block => {
          // Direct match with the code
          if (block.speaker === code) return true;
          // Check if the block uses the name associated with this code
          if (name && block.speaker === name) return true;
          // Check if this is a name that was created from this code
          // Names created from codes are tracked in speakerNamesRef
          const trackedName = speakerNamesRef.current.get(code);
          if (trackedName && block.speaker === trackedName) return true;
          return false;
        });
        callback(inUse);
      }
    };
    
    // Handle open new transcription modal from transcription switcher
    const handleOpenNewTranscriptionModal = () => {
      setShowNewTranscriptionModal(true);
    };
    
    
    document.addEventListener('speakersSelected', handleSpeakersSelected as EventListener);
    document.addEventListener('toggleDescriptionTooltips', handleToggleTooltips as EventListener);
    document.addEventListener('mediaTimeUpdate', handleMediaTimeUpdate as EventListener);
    document.addEventListener('checkNavigationMode', handleCheckNavigationMode as EventListener);
    document.addEventListener('checkSpeakerInUse', handleCheckSpeakerInUse as EventListener);
    document.addEventListener('openNewTranscriptionModal', handleOpenNewTranscriptionModal as EventListener);
    
    return () => {
      document.removeEventListener('speakersSelected', handleSpeakersSelected as EventListener);
      document.removeEventListener('toggleDescriptionTooltips', handleToggleTooltips as EventListener);
      document.removeEventListener('mediaTimeUpdate', handleMediaTimeUpdate as EventListener);
      document.removeEventListener('checkNavigationMode', handleCheckNavigationMode as EventListener);
      document.removeEventListener('checkSpeakerInUse', handleCheckSpeakerInUse as EventListener);
      document.removeEventListener('openNewTranscriptionModal', handleOpenNewTranscriptionModal as EventListener);
    };
  }, [navigationMode]);

  // Handle mark navigation from editor
  const handleMarkNavigation = useCallback((markId: string) => {
    const mark = (marks || []).find((m: any) => m.id === markId);
    if (mark && onMarkClick) {
      onMarkClick(mark);
      syncToMark(markId);
    }
  }, [marks, onMarkClick, syncToMark]);

  // Get text content
  const getTextContent = useCallback(() => {
    return blockManagerRef.current.getText();
  }, []);

  // Get statistics
  const getStatistics = useCallback(() => {
    return blockManagerRef.current.getStatistics();
  }, []);

  // Auto-scroll to current mark position - DISABLED
  /*
  useEffect(() => {
    if (syncEnabled && activeMark && editorRef.current) {
      // Find block with timestamp closest to mark time
      const blocks = blockManagerRef.current.getBlocks();
      const targetBlock = blocks.find(b => {
        if (b.speakerTime) {
          return Math.abs(b.speakerTime - activeMark.time) < 2;
        }
        return false;
      });
      
      if (targetBlock) {
        setActiveBlockId(targetBlock.id);
        setActiveArea('text');
      }
    }
  }, [activeMark, syncEnabled]);
  */

  const stats = getStatistics();
  
  return (
    <div className="text-editor-container">
      <div className="text-editor-inner">
        {/* Toolbar Section */}
        <div className="text-editor-toolbar">
          <ToolbarContent
            showTranscriptionSwitcher={showTranscriptionSwitcher}
            setShowTranscriptionSwitcher={setShowTranscriptionSwitcher}
            setShowNewTranscriptionModal={setShowNewTranscriptionModal}
            setShowVersionHistoryModal={setShowVersionHistoryModal}
            setShowMediaLinkModal={setShowMediaLinkModal}
            setShowSearchReplaceModal={setShowSearchReplaceModal}
            setShowDocumentExportModal={setShowDocumentExportModal}
            setShowHTMLPreviewModal={setShowHTMLPreviewModal}
            currentTranscriptionId={currentTranscriptionId}
            handleTranscriptionChange={handleTranscriptionChange}
            fontSize={fontSize}
            setFontSize={setFontSize}
            fontFamily={fontFamily}
            setFontFamily={setFontFamily}
            blockViewEnabled={blockViewEnabled}
            setBlockViewEnabled={setBlockViewEnabled}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onSelectAllBlocks={handleSelectAllBlocks}
            multiSelectMode={multiSelectMode}
            setMultiSelectMode={setMultiSelectMode}
            setShowSpeakerSwapModal={setShowSpeakerSwapModal}
            inputLanguage={inputLanguage}
            setInputLanguage={setInputLanguage}
            setShowAutoCorrectModal={setShowAutoCorrectModal}
            autoCorrectEnabled={Object.values(autoCorrectSettings).some(v => v)}
            navigationMode={navigationMode}
            setNavigationMode={setNavigationMode}
            savedMediaTime={savedMediaTime}
            setSavedMediaTime={setSavedMediaTime}
            currentMediaTime={currentMediaTime}
            seekToTime={seekToTime}
            syncEnabled={syncEnabled}
            setSyncEnabled={setSyncEnabled}
            shortcutsEnabled={shortcutsEnabled}
            setShowShortcutsModal={setShowShortcutsModal}
            blocks={blocks}
            speakerColors={speakerColors}
            speakerNamesRef={speakerNamesRef}
            currentMediaFileName={currentMediaFileName}
            setShortcutsFeedback={showFeedback}
          />
        </div>
        
        <div className="text-editor-body">
        <div className="marks-sidebar">
          <h4>סימונים</h4>
          <div className="marks-list">
            {(marks || []).map((mark: any) => (
              <div 
                key={mark.id}
                className={`mark-item ${activeMark?.id === mark.id ? 'active' : ''}`}
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
          onClick={(e) => {
            // Only clear selection if clicked on the container itself, not on blocks
            const target = e.target as HTMLElement;
            if (target.classList.contains('text-editor-content') || 
                target.classList.contains('blocks-container') ||
                target.classList.contains('media-name-header')) {
              if (selectedBlockRange || selectedBlocks.size > 0) {
                setSelectedBlockRange(null);
                setSelectedBlocks(new Set());
                // Removed annoying feedback message
              }
            }
          }}
        >
          {/* Media Name Header */}
          {currentMediaFileName && (
            <div className="media-name-header">
              <span className="media-name-label">מדיה:</span>
              <span className="media-name-text">{currentMediaFileName}</span>
            </div>
          )}
          
          {/* Blocks Container */}
          <div className="blocks-container">
            {blocks.map((block, index) => {
              // Get highlights for this block
              const blockHighlights = searchHighlights.filter(h => h.blockId === block.id);
              const speakerHighlights = blockHighlights
                .filter(h => h.field === 'speaker')
                .map(h => ({
                  startIndex: h.startIndex,
                  endIndex: h.endIndex,
                  isCurrent: searchHighlights[currentSearchIndex]?.blockId === block.id &&
                           searchHighlights[currentSearchIndex]?.field === 'speaker' &&
                           searchHighlights[currentSearchIndex]?.startIndex === h.startIndex
                }));
              const textHighlights = blockHighlights
                .filter(h => h.field === 'text')
                .map(h => ({
                  startIndex: h.startIndex,
                  endIndex: h.endIndex,
                  isCurrent: searchHighlights[currentSearchIndex]?.blockId === block.id &&
                           searchHighlights[currentSearchIndex]?.field === 'text' &&
                           searchHighlights[currentSearchIndex]?.startIndex === h.startIndex
                }));
              
              // Check if this block is selected (range or multi-select)
              const isRangeSelected = selectedBlockRange && (
                (index >= Math.min(selectedBlockRange.start, selectedBlockRange.end) &&
                 index <= Math.max(selectedBlockRange.start, selectedBlockRange.end)) ||
                (block.id === activeBlockId && selectedBlockRange.start !== selectedBlockRange.end)
              );
              const isMultiSelected = selectedBlocks.has(index);
              const isSelected = isRangeSelected || isMultiSelected;
              
              return (
                <div key={block.id} id={`block-${block.id}`} 
                     className={isSelected ? 'block-selected' : ''}
                     onClick={(e) => {
                       // Only handle if clicking on the wrapper div, not the TextBlock itself
                       if (e.target === e.currentTarget) {
                         handleBlockClick(index, e.ctrlKey, e.shiftKey);
                       }
                     }}>
                  <TextBlock
                    block={block}
                    isActive={block.id === activeBlockId}
                    isFirstBlock={index === 0}
                    activeArea={block.id === activeBlockId ? activeArea : 'speaker'}
                    cursorAtStart={block.id === activeBlockId && cursorAtStart}
                    onNavigate={(direction, fromField) => handleNavigate(block.id, direction, fromField)}
                    onUpdate={handleBlockUpdate}
                    onNewBlock={handleNewBlock}
                    onRemoveBlock={handleRemoveBlock}
                    onSpeakerTransform={handleSpeakerTransform}
                    onDeleteAcrossBlocks={handleDeleteAcrossBlocks}
                    onProcessShortcuts={processShortcuts}
                    speakerColor={speakerColors.get(block.speaker)}
                    currentTime={currentMediaTime}
                    fontSize={fontSize}
                    fontFamily={fontFamily}
                    isIsolated={isolatedSpeakers.size === 0 || isolatedSpeakers.has(block.speaker)}
                    showDescriptionTooltips={showDescriptionTooltips}
                    blockViewEnabled={blockViewEnabled}
                    speakerHighlights={speakerHighlights}
                    textHighlights={textHighlights}
                    onClick={(ctrlKey, shiftKey) => handleBlockClick(index, ctrlKey, shiftKey)}
                    autoCorrectEngine={autoCorrectEngineRef.current}
                    previousSpeaker={index > 0 ? blocks[index - 1].speaker : ''}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      <div className="text-editor-footer">
        <div className="footer-left">
          <span className="word-count">מילים: {stats.totalWords}</span>
          <span className="char-count">תווים: {stats.totalCharacters}</span>
          <span className="speaker-count">דוברים: {stats.speakers.size}</span>
          {activeMark && (
            <span className="current-mark-indicator">
              סימון נוכחי: {activeMark.type} ({formatTime(activeMark.time)})
            </span>
          )}
        </div>
        <div className="footer-right">
          <BackupStatusIndicator />
        </div>
      </div>
      </div>
      
      {/* Shortcuts Modal */}
      <ShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
        shortcuts={loadedShortcuts}
        onToggleShortcuts={() => {
          const newState = !shortcutsEnabled;
          setShortcutsEnabled(newState);
          localStorage.setItem('textEditorShortcutsEnabled', String(newState));
        }}
        shortcutsEnabled={shortcutsEnabled}
        onAddShortcut={handleAddShortcut}
        onEditShortcut={handleEditShortcut}
        onDeleteShortcut={handleDeleteShortcut}
        userQuota={userQuota}
      />
      
      {/* New Transcription Modal */}
      <NewTranscriptionModal
        isOpen={showNewTranscriptionModal}
        onClose={() => setShowNewTranscriptionModal(false)}
        onTranscriptionCreated={handleTranscriptionCreated}
        currentMediaName={currentMediaFileName}
        currentProjectId={currentProjectId}
      />
      
      {/* Version History Modal */}
      <VersionHistoryModal
        isOpen={showVersionHistoryModal}
        onClose={() => setShowVersionHistoryModal(false)}
        onRestore={(version) => {
          console.log('Restoring version:', version);
          showFeedback(`שוחזר לגרסה ${version.version}`);
        }}
        transcriptionId={currentTranscriptionId}
      />
      
      {/* Media Link Modal */}
      <MediaLinkModal
        isOpen={showMediaLinkModal}
        onClose={() => setShowMediaLinkModal(false)}
        currentMediaId={linkedMediaId}
        transcriptionId={currentTranscriptionId}
        onMediaLinked={(mediaId) => {
          setLinkedMediaId(mediaId);
          showFeedback(mediaId ? 'המדיה קושרה בהצלחה' : 'קישור המדיה בוטל');
        }}
      />
      
      {/* Search and Replace Modal */}
      <SearchReplaceModal
        isOpen={showSearchReplaceModal}
        onClose={() => {
          setShowSearchReplaceModal(false);
          setSearchHighlights([]);
          setCurrentSearchIndex(0);
        }}
        onSearch={handleSearch}
        onReplace={handleReplace}
        onReplaceAll={handleReplaceAll}
        onNavigateResult={(index) => {
          setCurrentSearchIndex(index);
          // Scroll to the result without focusing
          if (searchHighlights[index]) {
            const result = searchHighlights[index];
            const blockElement = document.getElementById(`block-${result.blockId}`);
            if (blockElement) {
              blockElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }}
      />
      
      {/* Speaker Swap Modal */}
      <SpeakerSwapModal
        isOpen={showSpeakerSwapModal}
        onClose={() => setShowSpeakerSwapModal(false)}
        blocks={blocks}
        selectedBlocks={selectedBlocks}
        selectedBlockRange={selectedBlockRange}
        onSwap={handleSpeakerSwap}
      />
      
      <AutoCorrectModal
        isOpen={showAutoCorrectModal}
        onClose={() => setShowAutoCorrectModal(false)}
        settings={autoCorrectSettings}
        onSettingsChange={setAutoCorrectSettings}
      />
      
      {/* Document Export Modal */}
      <DocumentExportModal
        isOpen={showDocumentExportModal}
        onClose={() => setShowDocumentExportModal(false)}
        blocks={blocks}
        speakers={speakerNamesRef.current}
        mediaFileName={currentMediaFileName}
        mediaDuration={mediaDuration}
        onExportComplete={(format) => {
          showFeedback(`המסמך יוצא בהצלחה בפורמט ${format}`);
        }}
      />

      <HTMLPreviewModal
        isOpen={showHTMLPreviewModal}
        onClose={() => setShowHTMLPreviewModal(false)}
        blocks={blocks}
        speakers={speakerNamesRef.current}
        mediaFileName={currentMediaFileName}
        mediaDuration={mediaDuration}
      />
      
      {/* Feedback Message Display */}
      {feedbackMessage && (
        <div className="feedback-message">
          {feedbackMessage}
        </div>
      )}
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