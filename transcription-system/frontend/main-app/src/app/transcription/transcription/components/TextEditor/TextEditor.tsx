'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import TextBlock, { TextBlockData } from './blocks/TextBlock';
import SlidingWindowTextEditor from './SlidingWindowTextEditor';
import BlockManager from './blocks/BlockManager';
import { SpeakerManager } from '../Speaker/utils/speakerManager';
import { ShortcutManager } from './utils/ShortcutManager';
import { ProcessTextResult } from './types/shortcuts';
import ShortcutsModal from './components/ShortcutsModal';
import BackupStatusIndicator from './components/BackupStatusIndicator';
import TSessionStatus from './components/TSessionStatus';
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
import incrementalBackupService from '../../../../../services/incrementalBackupService';
import { tSessionService } from '../../../../../services/tSessionService';
import { projectService } from '../../../../../services/projectService';
// import TTranscriptionNotification from './components/TTranscriptionNotification'; // Removed - no popup needed
import { useRemarks } from '../Remarks/RemarksContext';
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
  currentProjectId = '',
  projectName = 'אין פרויקט',
  speakerComponentRef,
  virtualizationEnabled = false
}: TextEditorProps & { virtualizationEnabled?: boolean }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [blocks, setBlocks] = useState<TextBlockData[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  
  // Remarks integration
  const remarksContext = useRemarks();
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
  
  // Keep a ref to currentMediaTime to avoid recreating callbacks
  const currentMediaTimeRef = useRef(0);
  
  // Update internal current media time when prop changes
  useEffect(() => {
    setCurrentMediaTime(currentTime);
    currentMediaTimeRef.current = currentTime;
  }, [currentTime]);
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
  const [isMediaNameOverflowing, setIsMediaNameOverflowing] = useState(false);
  
  // T-Session states
  const [tCurrentMediaId, setTCurrentMediaId] = useState<string>('');
  const [tCurrentTranscriptionNumber, setTCurrentTranscriptionNumber] = useState<number>(2); // Default to 2 to match page.tsx
  const [tShowNotification, setTShowNotification] = useState(false);
  const [tExistingTranscriptions, setTExistingTranscriptions] = useState<any[]>([]);
  const [tTranscriptionCount, setTTranscriptionCount] = useState(0);
  const [tLastSaveTime, setTLastSaveTime] = useState<Date | null>(null);
  const [tHasChanges, setTHasChanges] = useState(false);
  const [tIsSaving, setTIsSaving] = useState(false);
  const tLastSavedContent = useRef<string>('');
  const mediaNameRef = useRef<HTMLDivElement>(null);
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
  const previousProjectIdRef = useRef<string>('');
  
  // Update refs when values change
  useEffect(() => { activeBlockIdRef.current = activeBlockId; }, [activeBlockId]);
  useEffect(() => { activeAreaRef.current = activeArea; }, [activeArea]);
  useEffect(() => { selectedBlockRangeRef.current = selectedBlockRange; }, [selectedBlockRange]);
  
  // Dispatch block count whenever blocks change (for virtual scrolling detection)
  useEffect(() => {
    const event = new CustomEvent('blocksLoaded', {
      detail: { count: blocks.length }
    });
    document.dispatchEvent(event);
    console.log(`[TextEditor] Dispatched blocksLoaded event with ${blocks.length} blocks`);
  }, [blocks.length]);
  
  // Project: Save old project and load new one when project ID changes
  useEffect(() => {
    // Don't do anything if no project ID
    if (!currentProjectId) {
      return;
    }
    
    // Save previous project when switching (only if we had a previous valid project)
    if (previousProjectIdRef.current && previousProjectIdRef.current !== currentProjectId && previousProjectIdRef.current !== '') {
      console.log('[Project] Auto-saving previous project before switch:', previousProjectIdRef.current);
      // Create a closure to save with the old project ID
      const oldProjectId = previousProjectIdRef.current;
      const saveOldProject = async () => {
        try {
          const currentBlocks = blockManagerRef.current.getBlocks();
          // Check if there's actual content to save
          const hasContent = currentBlocks.length > 1 || 
            (currentBlocks.length === 1 && (currentBlocks[0].speaker || currentBlocks[0].text));
          
          if (hasContent) {
            const speakers = speakerComponentRef?.current ? 
              speakerComponentRef.current.getAllSpeakers() : [];
            const remarks = remarksContext?.state.remarks || [];
            
            await projectService.saveProject(oldProjectId, {
              blocks: currentBlocks,
              speakers,
              remarks
            });
            console.log('[Project] Successfully auto-saved previous project');
          }
        } catch (error) {
          console.error('[Project] Error saving previous project:', error);
        }
      };
      saveOldProject();
    }
    
    // Load new project
    console.log('[Project] Loading project:', currentProjectId);
    loadProjectData(currentProjectId);
    previousProjectIdRef.current = currentProjectId;
  }, [currentProjectId]);
  
  // Save when media changes and clear data
  useEffect(() => {
    // Save current data before switching media
    const saveBeforeSwitch = async () => {
      // Always save if we have a project ID and blocks (regardless of tHasChanges flag)
      // But don't save if already saving
      if (currentProjectId && currentProjectId !== '' && !tIsSaving) {
        const currentBlocks = blockManagerRef.current.getBlocks();
        // Only save if we have actual content (more than just the initial empty block)
        const hasContent = currentBlocks.length > 1 || 
          (currentBlocks.length === 1 && (currentBlocks[0].speaker || currentBlocks[0].text));
        
        if (hasContent) {
          console.log('[Project] Auto-saving before media switch');
          try {
            await saveProjectData();
          } catch (error) {
            console.error('[Project] Error saving before media switch:', error);
          }
        }
      }
    };
    
    if (!mediaFileName) return;
    
    // Save before clearing
    saveBeforeSwitch();
    
    // Format media ID from filename (remove extension, sanitize)
    const mediaId = `0-0-${mediaFileName}`;
    setTCurrentMediaId(mediaId);
    
    // Clear remarks and speakers when switching to different media
    if (remarksContext) {
      const existingRemarks = remarksContext.state.remarks;
      existingRemarks.forEach(remark => {
        remarksContext.deleteRemark(remark.id);
      });
    }
    
    // Reset speakers
    setSpeakerColors(new Map());
    
    // Close any open modals when switching media
    setShowVersionHistoryModal(false);
    setShowTranscriptionSwitcher(false);
    
    // Set default transcription number
    setTCurrentTranscriptionNumber(2);
    
    console.log('[Project] Media changed to:', mediaFileName);
  }, [mediaFileName]);
  
  // Project: Auto-save every minute
  useEffect(() => {
    if (!currentProjectId) {
      return;
    }
    
    console.log('[Project] Setting up auto-save interval');
    
    const autoSaveInterval = setInterval(() => {
      console.log('[Project] Auto-saving...');
      saveProjectData();
    }, 60000); // Save every 60 seconds
    
    // Also save on page unload
    const handleBeforeUnload = () => {
      console.log('[Project] Saving before unload');
      saveProjectData();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      console.log('[Project] Cleaning up auto-save interval');
      clearInterval(autoSaveInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentProjectId]);
  
  useEffect(() => { selectedBlocksRef.current = selectedBlocks; }, [selectedBlocks]);
  
  // Auto-save when blocks change (debounced)
  useEffect(() => { 
    blocksRef.current = blocks;
    
    // Check for changes in T-session
    if (tCurrentMediaId && tCurrentTranscriptionNumber) {
      const currentContent = JSON.stringify(blocks);
      if (tLastSavedContent.current && currentContent !== tLastSavedContent.current) {
        setTHasChanges(true);
      }
    }
  }, [blocks, tCurrentMediaId, tCurrentTranscriptionNumber]);
  
  // Separate effect for auto-saving on changes
  useEffect(() => {
    if (tHasChanges && currentProjectId) {
      // Auto-save after 5 seconds of no changes
      const saveTimer = setTimeout(() => {
        // Check if not already saving
        if (!tIsSaving) {
          console.log('[Project] Auto-saving after content changes');
          saveProjectData();
        }
      }, 5000);
      
      return () => clearTimeout(saveTimer);
    }
  }, [tHasChanges, currentProjectId]);
  
  
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
    // Validate time before seeking to prevent MediaPlayer issues
    if (typeof time === 'number' && !isNaN(time) && time >= 0 && isFinite(time)) {
      document.dispatchEvent(new CustomEvent('seekMedia', { 
        detail: { time } 
      }));
    } else {
      console.warn('[TextEditor] Invalid seek time:', time);
    }
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
  
  // Check if media name is overflowing
  useEffect(() => {
    const checkOverflow = () => {
      if (mediaNameRef.current) {
        const wrapper = mediaNameRef.current.parentElement;
        if (wrapper) {
          const isOverflowing = mediaNameRef.current.scrollWidth > wrapper.clientWidth;
          setIsMediaNameOverflowing(isOverflowing);
        }
      }
    };
    
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    
    return () => {
      window.removeEventListener('resize', checkOverflow);
    };
  }, [currentMediaFileName]);

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
      // Add a small delay to ensure DOM is ready before setting focus
      setTimeout(() => {
        setActiveBlockId(initialBlocks[0].id);
        setActiveArea('speaker');
      }, 100);
      
      // Set the first block's timestamp to current media time
      if (currentMediaTimeRef.current > 0) {
        blockManagerRef.current.setFirstBlockTimestamp(currentMediaTimeRef.current);
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
    // Store the previous block ID before navigation
    const previousBlockId = activeBlockIdRef.current;
    
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
          
          // Check navigation mode for isolated blocks too
          if (navigationMode && targetBlock.id !== previousBlockId) {
            if (targetBlock.speakerTime !== undefined && targetBlock.speakerTime > 0) {
              seekToTime(targetBlock.speakerTime);
            }
          }
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
    // Compare with the previous block ID, not the initiating block ID
    if (navigationMode && newBlockId && newBlockId !== previousBlockId) {
      const blocks = blockManagerRef.current.getBlocks();
      const newBlock = blocks.find(b => b.id === newBlockId);
      if (newBlock && newBlock.speakerTime !== undefined && newBlock.speakerTime > 0) {
        // Only seek in navigation mode and with valid timestamps
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
      // Add delay for proper focus initialization
      setTimeout(() => {
        setActiveBlockId(initialBlocks[0].id);
        setActiveArea('speaker');
      }, 100);
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
    
    // Track change for incremental backup
    const updatedBlock = blockManagerRef.current.getBlocks().find(b => b.id === id);
    if (updatedBlock) {
      incrementalBackupService.trackBlockUpdated(id, field, value, updatedBlock);
    }
    
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
          
          // Set timestamp if this block doesn't have one yet
          const block = currentBlocks[idx];
          if (block && (!block.speakerTime || block.speakerTime === 0)) {
            blockManagerRef.current.setBlockTimestamp(block.id, currentMediaTimeRef.current || 0);
          }
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
      
      // Set timestamp if this block doesn't have one yet (first time setting speaker)
      const block = blockManagerRef.current.getBlocks().find(b => b.id === id);
      if (block && (!block.speakerTime || block.speakerTime === 0)) {
        blockManagerRef.current.setBlockTimestamp(id, currentMediaTimeRef.current || 0);
      }
    }
    
    // Mark changes for auto-save
    backupService.markChanges();
  }, [saveToHistory]);

  // Handle new block creation
  const handleNewBlock = useCallback(() => {
    const currentBlock = blockManagerRef.current.getActiveBlock();
    if (currentBlock) {
      const newBlock = blockManagerRef.current.addBlock(currentBlock.id, currentMediaTimeRef.current);
      setActiveBlockId(newBlock.id);
      setActiveArea('speaker');
      const newBlocks = [...blockManagerRef.current.getBlocks()];
      setBlocks(newBlocks);
      
      // Track new block for incremental backup
      incrementalBackupService.trackBlockCreated(newBlock);
      
      // Save to history immediately for structural changes
      saveToHistory(newBlocks);
      
      // Mark changes for auto-save
      backupService.markChanges();
    }
  }, [saveToHistory]);

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
    // Track deletion for incremental backup
    incrementalBackupService.trackBlockDeleted(id);
    
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
  // Project: Load transcription from backend
  const loadProjectData = async (projectId: string) => {
    if (!projectId) {
      console.log('[Project] No project ID, starting fresh');
      return;
    }
    
    console.log(`[Project] Loading project ${projectId}`);
    
    try {
      const projectData = await projectService.loadProject(projectId);
    
    if (projectData && projectData.blocks && projectData.blocks.length > 0) {
      console.log(`[Project] Loaded ${projectData.blocks.length} blocks`);
      
      // Ensure blocks have proper structure including timestamps
      const loadedBlocks = projectData.blocks.map((block: any) => ({
        id: block.id,
        speaker: block.speaker || '',
        text: block.text || '',
        speakerTime: block.speakerTime !== undefined ? block.speakerTime : (block.timestamp ? parseFloat(block.timestamp) : undefined)
      }));
      
      console.log('[Project] DEBUG: Loaded blocks:', loadedBlocks.map(b => ({ id: b.id, speaker: b.speaker, text: b.text.substring(0, 30) })));
      
      // CRITICAL: Update blockManagerRef BEFORE setting state
      blockManagerRef.current.setBlocks(loadedBlocks);
      setBlocks(loadedBlocks);
      
      // Initialize incremental backup service with loaded blocks
      incrementalBackupService.initialize(projectId, loadedBlocks, projectData.version || 0);
      
      console.log('[Project] DEBUG: State blocks after setBlocks:', loadedBlocks.length);
      
      // Dispatch block count for virtualization detection
      const event = new CustomEvent('blocksLoaded', {
        detail: { count: loadedBlocks.length }
      });
      document.dispatchEvent(event);
      
      // Update speakers if available
      if (projectData.speakers) {
        // Load speakers into SimpleSpeaker component if available
        if (speakerComponentRef?.current) {
          speakerComponentRef.current.loadSpeakers(projectData.speakers.map((s: any) => ({
            id: `speaker-${s.code}`,
            code: s.code,
            name: s.name || '',
            description: s.description || '',
            color: s.color || '',
            count: 0
          })));
        }
        
        // Update local speaker map and colors
        const colorMap = new Map<string, string>();
        projectData.speakers.forEach((s: any) => {
          // Map BOTH speaker code AND name to color for TextEditor blocks
          if (s.color) {
            if (s.code) {
              colorMap.set(s.code, s.color);
            }
            if (s.name) {
              colorMap.set(s.name, s.color);
            }
          }
          // Note: SpeakerManager doesn't have setSpeakerDescription method
          // The description is handled by SimpleSpeaker component
        });
        setSpeakerColors(colorMap); // Set the color map for TextEditor
      }
      
      // Update remarks if available
      if (projectData.remarks && remarksContext) {
        // Clear existing remarks and load new ones
        const existingRemarks = remarksContext.state.remarks;
        existingRemarks.forEach(remark => {
          remarksContext.deleteRemark(remark.id);
        });
        
        // Add loaded remarks
        projectData.remarks.forEach((remarkData: any) => {
          remarksContext.addRemark({
            blockId: remarkData.blockId,
            text: remarkData.text,
            type: remarkData.type,
            status: remarkData.status,
            timestamp: remarkData.timestamp,
            position: remarkData.position
          });
        });
      }
    } else {
      console.log('[Project] No existing content, starting fresh');
      // Start with empty editor
      const initialBlock: TextBlockData = {
        id: 'block-' + Date.now(),
        speaker: '',
        text: '',
        speakerTime: currentMediaTimeRef.current || 0
      };
      
      // CRITICAL: Update blockManagerRef BEFORE setting state
      blockManagerRef.current.setBlocks([initialBlock]);
      setBlocks([initialBlock]);
      setActiveBlockId(initialBlock.id);
      
      // Dispatch block count for virtualization detection
      const event = new CustomEvent('blocksLoaded', {
        detail: { count: 1 }
      });
      document.dispatchEvent(event);
    }
    
    // Reset change tracking
    tLastSavedContent.current = JSON.stringify(blockManagerRef.current.getBlocks());
    setTHasChanges(false);
    } catch (error) {
      console.error('[Project] Error loading project data:', error);
      // Start with empty editor on error
      const initialBlock: TextBlockData = {
        id: 'block-' + Date.now(),
        speaker: '',
        text: '',
        speakerTime: currentMediaTimeRef.current || 0
      };
      
      blockManagerRef.current.setBlocks([initialBlock]);
      setBlocks([initialBlock]);
      setActiveBlockId(initialBlock.id);
    }
  };
  
  // T-Session: Handle loading existing transcription
  const tHandleLoadExisting = (transcriptionNumber: number) => {
    console.log(`[T-Session] User selected to load transcription ${transcriptionNumber}`);
    // Load will be triggered by project ID change
    setTCurrentTranscriptionNumber(transcriptionNumber);
  };
  
  // T-Session: Handle creating new transcription
  const tHandleCreateNew = async () => {
    const nextNumber = await tSessionService.tGetNextTranscriptionNumber(tCurrentMediaId);
    console.log(`[T-Session] Creating new transcription ${nextNumber}`);
    setTCurrentTranscriptionNumber(nextNumber);
    
    // Start with empty editor
    const initialBlock: TextBlockData = {
      id: 'block-' + Date.now(),
      speaker: '',
      text: '',
    };
    
    // CRITICAL: Update blockManagerRef BEFORE setting state
    blockManagerRef.current.setBlocks([initialBlock]);
    setBlocks([initialBlock]);
    setActiveBlockId(initialBlock.id);
    
    // Reset change tracking
    tLastSavedContent.current = JSON.stringify([initialBlock]);
    setTHasChanges(false);
  };
  
  // Project: Save current transcription
  const saveProjectData = async () => {
    console.log('[Project] Save attempt with:', {
      projectId: currentProjectId,
      hasProjectId: !!currentProjectId
    });
    
    if (!currentProjectId || currentProjectId === '') {
      console.warn('[Project] Cannot save: missing or empty project ID');
      return;
    }
    
    // Check if there are changes to save
    const currentBlocks = blockManagerRef.current.getBlocks();
    const currentContent = JSON.stringify(currentBlocks);
    
    if (currentContent === tLastSavedContent.current) {
      console.log('[Project] No changes to save');
      return;
    }
    
    // Prevent concurrent saves
    if (tIsSaving) {
      console.log('[Project] Already saving, skipping duplicate save');
      return;
    }
    
    setTIsSaving(true);
    
    try {
    
    // Get speakers from SimpleSpeaker component if available
    const speakers = speakerComponentRef?.current ? 
      speakerComponentRef.current.getAllSpeakers().map(speaker => ({
        code: speaker.code,
        name: speaker.name,
        description: speaker.description || '',
        color: speaker.color || ''
      })) :
      speakerManagerRef.current.getAllSpeakers().map(speaker => ({
        code: speaker.code,
        name: speaker.name,
        description: '', // SpeakerManager doesn't track descriptions
        color: ''
      }));
    
    // Get remarks data
    const remarks = remarksContext?.state.remarks || [];
    
    // Prepare save data with all three components
    const saveData = {
      blocks: currentBlocks.map(block => ({
        ...block,
        speakerTime: block.speakerTime // Preserve speakerTime for navigation
      })),
      speakers,
      remarks: remarks.map(remark => ({
        id: remark.id,
        blockId: remark.blockId,
        text: remark.text,
        type: remark.type,
        status: remark.status,
        timestamp: remark.timestamp,
        position: remark.position,
        createdAt: remark.createdAt,
        updatedAt: remark.updatedAt
      }))
    };
    
    console.log('[Project] Saving project:', currentProjectId);
    
    // Log save metrics if we have changes tracked
    if (incrementalBackupService.hasChanges()) {
      const metrics = incrementalBackupService.getMetrics();
      console.log('[Project] Save metrics (for monitoring):', {
        type: incrementalBackupService.shouldDoFullBackup() ? 'Full' : 'Incremental',
        changes: incrementalBackupService.getChangeSummary(),
        totalBlocks: metrics.totalBlocks,
        modifiedBlocks: metrics.modifiedBlocks
      });
    }
    
    // Always do the actual save with all blocks and speakers
    // (incremental tracking is just for metrics/logging for now until backend supports deltas)
    const success = await projectService.saveProject(currentProjectId, saveData);
    
    // If save succeeded, update incremental tracking
    if (success && incrementalBackupService.hasChanges()) {
      incrementalBackupService.onSaveSuccess(
        Date.now(), // Use timestamp as version for now
        currentBlocks
      );
    }
    
    if (success) {
      // Also create a versioned backup
      try {
        const backupFile = await projectService.createBackup(currentProjectId);
        if (backupFile) {
          console.log(`[Project] Backup created: ${backupFile}`);
        }
      } catch (error) {
        console.error('[Project] Failed to create backup:', error);
      }
      
      // Update save tracking
      tLastSavedContent.current = currentContent;
      setTLastSaveTime(new Date());
      setTHasChanges(false);
    }
    } catch (error) {
      console.error('[Project] Error during save:', error);
    } finally {
      setTIsSaving(false);
    }
    
    // Don't show popup feedback - status is in bottom bar now
  };

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
      
      console.log('[TextEditor] speakerUpdated event received:', {
        speakerId,
        code,
        name,
        color,
        oldCode,
        oldName
      });
      
      // Get all current blocks first
      const blocks = blockManagerRef.current.getBlocks();
      
      // Determine what exactly we're updating from and to
      let updateFrom: string | null = null;
      let updateTo: string | null = null;
      
      // If this is a name change for an existing speaker with a name already set
      if (oldName && name && oldName !== name) {
        // Update all blocks that currently show the old name
        updateFrom = oldName;
        updateTo = name;
        console.log('[TextEditor] Name change detected:', { from: updateFrom, to: updateTo });
      }
      // If this is setting a name for the first time (from code to name)
      else if (!oldName && code && name) {
        // Update all blocks that show the code to show the name instead
        updateFrom = code;
        updateTo = name;
        console.log('[TextEditor] Initial name set detected:', { from: updateFrom, to: updateTo });
      }
      // If this is clearing a name (reverting to code)
      else if (oldName && !name && code) {
        // Update all blocks from name back to code
        updateFrom = oldName;
        updateTo = code;
        console.log('[TextEditor] Name cleared, reverting to code:', { from: updateFrom, to: updateTo });
      }
      // If this is a code change for an existing speaker
      else if (oldCode && oldCode !== code) {
        // Update all blocks with the old code to the new code
        updateFrom = oldCode;
        updateTo = code;
        console.log('[TextEditor] Code change detected:', { from: updateFrom, to: updateTo });
      }
      
      // Only proceed if we have something to update
      if (updateFrom && updateTo && updateFrom !== updateTo) {
        let hasUpdates = false;
        
        console.log('[TextEditor] Checking blocks for updates...');
        // Update ALL blocks that EXACTLY match the updateFrom value
        blocks.forEach(block => {
          if (block.speaker === updateFrom) {
            console.log(`[TextEditor] Updating block ${block.id} speaker from "${updateFrom}" to "${updateTo}"`);
            blockManagerRef.current.updateBlock(block.id, 'speaker', updateTo);
            hasUpdates = true;
          }
        });
        
        // Force re-render if there were updates
        if (hasUpdates) {
          console.log('[TextEditor] Forcing re-render after updates');
          setBlocks([...blockManagerRef.current.getBlocks()]);
        } else {
          console.log('[TextEditor] No blocks matched for update');
        }
      } else {
        console.log('[TextEditor] No update needed:', { updateFrom, updateTo });
      }
      
      // Update color mapping if color provided
      if (color) {
        setSpeakerColors(prev => {
          const newMap = new Map(prev);
          
          // Remove old color entries if name changed
          if (updateFrom && updateFrom !== updateTo) {
            newMap.delete(updateFrom);
          }
          
          // Set color for BOTH code and name
          if (code) {
            newMap.set(code, color);
          }
          if (name && name.trim()) {
            newMap.set(name, color);
          }
          
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
    
    // Handle color-only updates (when setting name for first time)
    const handleSpeakerColorUpdate = (event: CustomEvent) => {
      const { code, name, color } = event.detail;
      
      // Only update color mapping, don't change block content
      if (color) {
        setSpeakerColors(prev => {
          const newMap = new Map(prev);
          
          // Set color for BOTH code and name
          if (code) {
            newMap.set(code, color);
          }
          if (name && name.trim()) {
            newMap.set(name, color);
          }
          
          return newMap;
        });
      }
      
      // Track speaker name to code mapping for autocomplete
      if (code && name && name.trim()) {
        speakerNamesRef.current.set(code, name);
      }
    };

    document.addEventListener('speakerUpdated', handleSpeakerUpdated as EventListener);
    document.addEventListener('speakerCreated', handleSpeakerUpdated as EventListener);
    document.addEventListener('speakerColorUpdate', handleSpeakerColorUpdate as EventListener);
    
    return () => {
      document.removeEventListener('speakerUpdated', handleSpeakerUpdated as EventListener);
      document.removeEventListener('speakerCreated', handleSpeakerUpdated as EventListener);
      document.removeEventListener('speakerColorUpdate', handleSpeakerColorUpdate as EventListener);
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
      currentMediaTimeRef.current = time || 0;
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
    
    // Handle request for current media time from child components
    const handleGetCurrentMediaTime = (event: CustomEvent) => {
      const { callback } = event.detail;
      if (callback) {
        callback(currentMediaTimeRef.current);
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
    
    
    // Import transcription handler
    const handleImportTranscription = (event: CustomEvent) => {
      console.log('[Import] Received import data:', event.detail);
      const data = event.detail;
      
      if (data.blocks && Array.isArray(data.blocks)) {
        // Load the blocks
        const importedBlocks = data.blocks.map((block: any, index: number) => ({
          id: `block-${Date.now()}-${index}`,
          speaker: block.speaker || '',
          text: block.text || '',
          speakerTime: block.timestamp || block.speakerTime || 0
        }));
        
        blockManagerRef.current.setBlocks(importedBlocks);
        setBlocks(importedBlocks);
        
        // Dispatch block count for virtualization detection
        const event = new CustomEvent('blocksLoaded', {
          detail: { count: importedBlocks.length }
        });
        document.dispatchEvent(event);
        
        console.log(`[Import] Loaded ${importedBlocks.length} blocks`);
        showFeedback(`יובאו ${importedBlocks.length} בלוקים`);
        
        // Load speakers if available
        if (data.speakers && Array.isArray(data.speakers)) {
          data.speakers.forEach((speaker: any) => {
            if (speaker.code && speaker.name) {
              // Use addSpeaker which will add or return existing speaker
              speakerManagerRef.current.addSpeaker(speaker.code, speaker.name);
            }
          });
        }
      }
    };
    
    document.addEventListener('importTranscription', handleImportTranscription as EventListener);
    document.addEventListener('speakersSelected', handleSpeakersSelected as EventListener);
    document.addEventListener('toggleDescriptionTooltips', handleToggleTooltips as EventListener);
    document.addEventListener('mediaTimeUpdate', handleMediaTimeUpdate as EventListener);
    document.addEventListener('checkNavigationMode', handleCheckNavigationMode as EventListener);
    document.addEventListener('getCurrentMediaTime', handleGetCurrentMediaTime as EventListener);
    document.addEventListener('checkSpeakerInUse', handleCheckSpeakerInUse as EventListener);
    document.addEventListener('openNewTranscriptionModal', handleOpenNewTranscriptionModal as EventListener);
    
    return () => {
      document.removeEventListener('importTranscription', handleImportTranscription as EventListener);
      document.removeEventListener('speakersSelected', handleSpeakersSelected as EventListener);
      document.removeEventListener('toggleDescriptionTooltips', handleToggleTooltips as EventListener);
      document.removeEventListener('mediaTimeUpdate', handleMediaTimeUpdate as EventListener);
      document.removeEventListener('checkNavigationMode', handleCheckNavigationMode as EventListener);
      document.removeEventListener('getCurrentMediaTime', handleGetCurrentMediaTime as EventListener);
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
            currentMediaId={currentProjectId}
            projectName={projectName}
            tHandleSave={saveProjectData}
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
          {/* Media Name Header - Always Display */}
          <div className="media-name-header">
            {/* Project Name Zone */}
            <div className="header-zone project-zone">
              <span className="header-text">{projectName}</span>
            </div>
            
            <div className="header-divider"></div>
            
            {/* Media Name Zone - Scrollable */}
            <div className="header-zone media-zone">
              <div className="media-name-wrapper">
                <div 
                  ref={mediaNameRef}
                  className={`media-name-scrollable ${
                    isMediaNameOverflowing && currentMediaFileName 
                      ? (/[\u0590-\u05FF]/.test(currentMediaFileName) ? 'scroll-rtl' : 'scroll-ltr')
                      : ''
                  }`}
                >
                  {currentMediaFileName || 'אין מדיה נטענת'}
                </div>
              </div>
            </div>
            
            <div className="header-divider"></div>
            
            {/* Duration Zone */}
            <div className="header-zone duration-zone">
              <span className="header-text">{mediaDuration || '00:00:00'}</span>
            </div>
          </div>
          
          {/* Blocks Container */}
          <div className="blocks-container">
            {virtualizationEnabled ? (
              <SlidingWindowTextEditor
                blocks={blocks}
                activeBlockId={activeBlockId}
                activeArea={activeArea}
                cursorAtStart={cursorAtStart}
                selectedBlocks={new Set(Array.from(selectedBlocks).map(i => blocks[i]?.id).filter(Boolean))}
                searchResults={searchHighlights}
                currentSearchIndex={currentSearchIndex}
                speakerColors={speakerColors}
                fontSize={fontSize}
                fontFamily={fontFamily}
                isolatedSpeakers={isolatedSpeakers}
                showDescriptionTooltips={showDescriptionTooltips}
                blockViewEnabled={blockViewEnabled}
                autoCorrectEngine={autoCorrectEngineRef.current}
                onNavigate={handleNavigate}
                onUpdate={handleBlockUpdate}
                onNewBlock={handleNewBlock}
                onRemoveBlock={handleRemoveBlock}
                onSpeakerTransform={handleSpeakerTransform}
                onDeleteAcrossBlocks={handleDeleteAcrossBlocks}
                onProcessShortcuts={processShortcuts}
                onBlockClick={handleBlockClick}
                getSearchHighlights={(blockId, field) => {
                  const blockHighlights = searchHighlights.filter(h => h.blockId === blockId && h.field === field);
                  return blockHighlights.map(h => ({
                    startIndex: h.startIndex,
                    endIndex: h.endIndex,
                    isCurrent: searchHighlights[currentSearchIndex]?.blockId === blockId &&
                             searchHighlights[currentSearchIndex]?.field === field &&
                             searchHighlights[currentSearchIndex]?.startIndex === h.startIndex
                  }));
                }}
                containerHeight={window.innerHeight - 300}
              />
            ) : (
              blocks.map((block, index) => {
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
            })
            )}
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
          <TSessionStatus 
            lastSaveTime={tLastSaveTime}
            hasChanges={tHasChanges}
            isSaving={tIsSaving}
            transcriptionNumber={tCurrentTranscriptionNumber}
          />
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
        onRestore={async (version) => {
          console.log('[Project] Restoring version:', version);
          try {
            // Use the project restore endpoint to load version data and make it current
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/projects/${currentProjectId}/restore/${version.filename}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Dev-Mode': 'true'
                }
              }
            );
            
            if (response.ok) {
              const data = await response.json();
              
              if (data.blocks) {
                // Ensure blocks have proper structure including timestamps
                const restoredBlocks = data.blocks.map((block: any) => ({
                  id: block.id,
                  speaker: block.speaker || '',
                  text: block.text || '',
                  speakerTime: block.speakerTime !== undefined ? block.speakerTime : (block.timestamp ? parseFloat(block.timestamp) : undefined)
                }));
                
                // Update blockManagerRef AND state like in loadProjectData
                blockManagerRef.current.setBlocks(restoredBlocks);
                setBlocks(restoredBlocks);
                
                // Update speakers if available
                if (data.speakers) {
                  // Load speakers into SimpleSpeaker component if available
                  if (speakerComponentRef?.current) {
                    speakerComponentRef.current.loadSpeakers(data.speakers.map((s: any) => ({
                      id: `speaker-${s.code}`,
                      code: s.code,
                      name: s.name || '',
                      description: s.description || '',
                      color: s.color || '',
                      count: 0
                    })));
                  }
                  
                  const colorMap = new Map<string, string>();
                  data.speakers.forEach((s: any) => {
                    // Map BOTH speaker code AND name to color
                    if (s.color) {
                      if (s.code) {
                        colorMap.set(s.code, s.color);
                      }
                      if (s.name) {
                        colorMap.set(s.name, s.color);
                      }
                    }
                  });
                  setSpeakerColors(colorMap);
                }
                
                // Update remarks if available
                if (data.remarks && remarksContext) {
                  // Clear existing remarks and load new ones
                  const existingRemarks = remarksContext.state.remarks;
                  existingRemarks.forEach(remark => {
                    remarksContext.deleteRemark(remark.id);
                  });
                  
                  // Add restored remarks
                  data.remarks.forEach((remarkData: any) => {
                    remarksContext.addRemark({
                      blockId: remarkData.blockId,
                      text: remarkData.text,
                      type: remarkData.type,
                      status: remarkData.status,
                      timestamp: remarkData.timestamp,
                      position: remarkData.position
                    });
                  });
                }
                
                // Reset change tracking - now this version becomes current
                tLastSavedContent.current = JSON.stringify(data.blocks);
                setTHasChanges(false);
                setTLastSaveTime(new Date());
                
                console.log(`[T-Session] Successfully restored to version ${version.version}`);
              }
            }
          } catch (error) {
            console.error('[T-Session] Error restoring version:', error);
          }
        }}
        transcriptionId={currentProjectId}
        mediaId={currentProjectId}
        transcriptionNumber={tCurrentTranscriptionNumber}
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