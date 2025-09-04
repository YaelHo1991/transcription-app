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
import AutoCorrectModal, { AutoCorrectSettings, DEFAULT_SETTINGS } from './components/AutoCorrectModal';
import { autoCorrectService } from '@/lib/services/autoCorrectService';
import DocumentExportModal from './components/DocumentExportModal';
import HTMLPreviewModal from './components/HTMLPreviewModal';
import { AutoCorrectEngine } from './utils/AutoCorrectEngine';
import { ConfirmationModal } from './components/ConfirmationModal';
import ToolbarContent from './ToolbarContent';
import { useMediaSync } from './hooks/useMediaSync';
import { useAutoWordExport } from './hooks/useAutoWordExport';
import { TextEditorProps, SyncedMark, EditorPosition } from './types';
import { buildApiUrl } from '@/utils/api';
import backupService from '@/services/backupService';
import { EditorPreferencesService } from './utils/editorPreferencesService';
import incrementalBackupService from '@/services/incrementalBackupService';
import indexedDBService from '@/services/indexedDBService';
import { tSessionService } from '@/services/tSessionService';
import { shouldUseIndexedDB } from '../../../../../config/environment';
// import TTranscriptionNotification from './components/TTranscriptionNotification'; // Removed - no popup needed
import { useRemarks } from '../Remarks/RemarksContext';
import useProjectStore from '@/lib/stores/projectStore';
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
  mediaName = '',
  mediaDuration = '',
  currentProjectId = '',
  currentMediaId = '',
  projectName = '',
  speakerComponentRef,
  virtualizationEnabled = false,
  transcriptions = [],
  currentTranscriptionIndex = 0,
  onTranscriptionChange,
  onTranscriptionDelete,
  onBulkTranscriptionDelete
}: TextEditorProps & { 
  virtualizationEnabled?: boolean;
  onTranscriptionDelete?: (index: number) => void;
  onBulkTranscriptionDelete?: (indices: number[]) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [blocks, setBlocks] = useState<TextBlockData[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [editorRefreshKey, setEditorRefreshKey] = useState(0); // Force re-render after version restore
  
  // Project store
  const { saveMediaData } = useProjectStore();
  
  // Remarks integration
  const remarksContext = useRemarks();
  const [activeArea, setActiveArea] = useState<'speaker' | 'text'>('speaker');
  
  // Initialize IndexedDB on component mount
  useEffect(() => {
    const initIndexedDB = async () => {
      if (shouldUseIndexedDB()) {
        try {
          console.log('[TextEditor] Initializing IndexedDB...');
          await indexedDBService.init();
          console.log('[TextEditor] IndexedDB initialized successfully');
          
          // Check storage info
          const storageInfo = await indexedDBService.getStorageInfo();
          console.log('[TextEditor] Storage info:', storageInfo);
          
          // Try migration if needed
          const migrated = await indexedDBService.migrateFromLocalStorage();
          if (migrated) {
            console.log('[TextEditor] Migrated data from localStorage');
          }
        } catch (error) {
          console.error('[TextEditor] Failed to initialize IndexedDB:', error);
        }
      } else {
        console.log('[TextEditor] IndexedDB not available or disabled');
      }
    };
    
    initIndexedDB();
  }, []);
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

  // Get current transcription ID
  const currentTranscriptionId = transcriptions[currentTranscriptionIndex]?.id;

  // Load preferences on component mount
  useEffect(() => {
    if (currentTranscriptionId) {
      const prefs = EditorPreferencesService.mergeWithDefaults(
        EditorPreferencesService.getTranscriptionPreferences(currentTranscriptionId)
      );
      
      // Apply loaded preferences to state
      if (prefs.fontSize !== undefined) setFontSize(prefs.fontSize);
      if (prefs.fontFamily !== undefined) setFontFamily(prefs.fontFamily);
      if (prefs.blockViewEnabled !== undefined) setBlockViewEnabled(prefs.blockViewEnabled);
      if (prefs.navigationMode !== undefined) setNavigationMode(prefs.navigationMode);
    }
    
    // Load shortcuts enabled state from localStorage (global setting)
    const savedShortcutsEnabled = localStorage.getItem('textEditorShortcutsEnabled');
    if (savedShortcutsEnabled !== null) {
      setShortcutsEnabled(savedShortcutsEnabled === 'true');
    }
  }, [currentTranscriptionId]);

  // Save toolbar preferences when they change
  useEffect(() => {
    if (currentTranscriptionId) {
      EditorPreferencesService.saveTranscriptionPreferences(currentTranscriptionId, {
        fontSize,
        fontFamily,
        blockViewEnabled,
        navigationMode
      });
    }
  }, [currentTranscriptionId, fontSize, fontFamily, blockViewEnabled, navigationMode]);

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
  const [autoExportEnabled, setAutoExportEnabled] = useState(false);
  const [isMediaNameOverflowing, setIsMediaNameOverflowing] = useState(false);
  const [selectedTranscriptions, setSelectedTranscriptions] = useState<Set<number>>(new Set());
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [transcriptionToDelete, setTranscriptionToDelete] = useState<number | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  
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
  const tHasChangesRef = useRef(false);
  const tIsSavingRef = useRef(false);
  const [autoCorrectSettings, setAutoCorrectSettings] = useState<AutoCorrectSettings>(DEFAULT_SETTINGS);
  const autoCorrectEngineRef = useRef(new AutoCorrectEngine(autoCorrectSettings));
  
  // Load auto-correct settings from server on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const serverSettings = await autoCorrectService.getSettings();
        setAutoCorrectSettings(serverSettings);
      } catch (error) {
        console.error('Failed to load auto-correct settings:', error);
        // Keep using DEFAULT_SETTINGS if loading fails
      }
    };
    
    loadSettings();
  }, []);

  // Update AutoCorrect engine when settings change
  useEffect(() => {
    autoCorrectEngineRef.current.updateSettings(autoCorrectSettings);
  }, [autoCorrectSettings]);
  
  // Debug language changes
  useEffect(() => {
    console.log('TextEditor language state changed to:', inputLanguage);
  }, [inputLanguage]);
  
  // Detect media changes to prevent cross-saving
  useEffect(() => {
    if (currentMediaId && previousMediaIdRef.current && currentMediaId !== previousMediaIdRef.current) {
      console.log('[TextEditor] Media ID changed from', previousMediaIdRef.current, 'to', currentMediaId);
      console.log('[TextEditor] Setting transition flag to prevent saves');
      
      // Set transitioning flag to prevent any saves
      isTransitioningRef.current = true;
      
      // Reset save state for new media
      console.log('[TextEditor] Resetting save state for new media');
      setTIsSaving(false);
      setTLastSaveTime(null);
      setTHasChanges(false);
      tLastSavedContent.current = '';
      
      // Clear blocks temporarily to prevent auto-save with wrong media
      if (blockManagerRef.current) {
        blockManagerRef.current.setBlocks([]);
      }
      setBlocks([]);
      
      // Wait for new transcription to load
      console.log('[TextEditor] Waiting for new transcription to load...');
    }
    
    // Update previous media ID
    previousMediaIdRef.current = currentMediaId || '';
  }, [currentMediaId]);
  const blockManagerRef = useRef<BlockManager>(new BlockManager());
  const speakerManagerRef = useRef<SpeakerManager>(new SpeakerManager());
  const shortcutManagerRef = useRef<ShortcutManager>(new ShortcutManager(buildApiUrl('/api/transcription/shortcuts')));
  // Track speaker code -> name mappings
  const speakerNamesRef = useRef<Map<string, string>>(new Map());
  // Track previous media ID to detect navigation
  const previousMediaIdRef = useRef<string>('');
  // Flag to prevent saving during media transitions
  const isTransitioningRef = useRef<boolean>(false);
  
  // Initialize ShortcutManager - load public shortcuts first, then user shortcuts if authenticated
  const shortcutsInitialized = useRef(false);
  useEffect(() => {
    const initShortcuts = async () => {
      if (!shortcutManagerRef.current || shortcutsInitialized.current) return;
      
      // Mark as initialized to prevent duplicate calls
      shortcutsInitialized.current = true;
      
      try {
        // First, always load public system shortcuts (no auth required)
        console.log('[ShortcutManager] Loading public system shortcuts...');
        await shortcutManagerRef.current.loadPublicShortcuts();
        
        // Update state with system shortcuts
        const systemShortcutsMap = shortcutManagerRef.current.getAllShortcuts();
        console.log('[ShortcutManager] Loaded', systemShortcutsMap.size, 'system shortcuts');
        setLoadedShortcuts(new Map(systemShortcutsMap));
        
        // Then, if user is authenticated, load their personal shortcuts
        const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
        const userId = localStorage.getItem('userId');
        
        if (token && userId) {
          try {
            console.log('[ShortcutManager] Loading user shortcuts for userId:', userId);
            await shortcutManagerRef.current.initialize(userId, token);
            
            // Update state with combined shortcuts (system + user)
            const allShortcutsMap = shortcutManagerRef.current.getAllShortcuts();
            console.log('[ShortcutManager] Total shortcuts after user load:', allShortcutsMap.size);
            setLoadedShortcuts(new Map(allShortcutsMap));
          } catch (error) {
            console.error('[ShortcutManager] Failed to load user shortcuts:', error);
            // Keep system shortcuts even if user shortcuts fail
          }
        } else {
          console.log('[ShortcutManager] No authentication - using system shortcuts only');
        }
      } catch (error) {
        console.error('[ShortcutManager] Failed to load shortcuts:', error);
      }
    };
    
    initShortcuts();
  }, []); // Run once on mount
  
  
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
    console.log('[TextEditor] Dispatched blocksLoaded event with ' + blocks.length + ' blocks');
  }, [blocks.length]);
  
  // Store saveProjectData in a ref to use in useEffect (will be set after the function is defined)
  const saveProjectDataRef = useRef<() => void>();
  
  // Keep refs synchronized with state for use in effects
  useEffect(() => {
    tHasChangesRef.current = tHasChanges;
  }, [tHasChanges]);
  
  useEffect(() => {
    tIsSavingRef.current = tIsSaving;
  }, [tIsSaving]);
  
  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S for save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        console.log('[TextEditor] Ctrl+S pressed, saving...');
        if (saveProjectDataRef.current) {
          saveProjectDataRef.current();
        }
      }
    };
    
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);
  
  // Watch for transcription changes from parent component
  useEffect(() => {
    console.log('[TextEditor] Transcription useEffect triggered:', {
      transcriptionsLength: transcriptions.length,
      currentIndex: currentTranscriptionIndex,
      transcriptions: transcriptions
    });
    
    if (transcriptions.length > 0 && currentTranscriptionIndex >= 0 && currentTranscriptionIndex < transcriptions.length) {
      const currentTranscription = transcriptions[currentTranscriptionIndex];
      console.log('[TextEditor] Transcription changed, loading new blocks:', {
        index: currentTranscriptionIndex,
        id: currentTranscription?.id,
        blocksCount: currentTranscription?.blocks?.length || 0,
        blocks: currentTranscription?.blocks
      });
      
      // Update blocks with new transcription data
      if (currentTranscription?.blocks && Array.isArray(currentTranscription.blocks)) {
        const newBlocks = currentTranscription.blocks.map((block: any, index: number) => ({
          id: block.id || `block-${Date.now()}-${index}`,
          text: block.text || '',
          timestamp: block.timestamp || 0,
          duration: block.duration || 0,
          speaker: block.speaker || '',  // Store as-is (name or code)
          speakerTime: block.speakerTime || block.timestamp || 0,  // Include speakerTime for navigation
          isEdited: block.isEdited || false
        }));
        
        console.log('[TextEditor] Setting blocks:', newBlocks);
        if (blockManagerRef.current) {
          blockManagerRef.current.setBlocks(newBlocks);
        }
        setBlocks(newBlocks);
        
        // Clear the transition flag now that new transcription is loaded
        if (isTransitioningRef.current) {
          console.log('[TextEditor] Clearing transition flag - new transcription loaded');
          isTransitioningRef.current = false;
        }
        
        // Load speakers for this transcription
        if (currentTranscription?.speakers && Array.isArray(currentTranscription.speakers)) {
          console.log('[TextEditor] Loading speakers:', currentTranscription.speakers);
          
          // Clear existing speakers by reinitializing
          if (speakerManagerRef.current) {
            speakerManagerRef.current = new SpeakerManager();
          }
          
          // Add speakers from transcription
          currentTranscription.speakers.forEach((speaker: any) => {
            if (speaker.code && speakerManagerRef.current) {
              speakerManagerRef.current.addSpeaker(speaker.code, speaker.name || '', speaker.description || '');
            }
          });
          
          // Update SimpleSpeaker component
          if (speakerComponentRef?.current && speakerManagerRef.current) {
            const speakers = speakerManagerRef.current.getAllSpeakers();
            speakerComponentRef.current.loadSpeakers(speakers.map(s => ({
              id: s.id,
              code: s.code,
              name: s.name || '',
              description: s.description || '',  // Preserve description if it exists
              color: s.color,
              count: s.blockCount
            })));
          }
        } else {
          // Clear speakers if none in transcription
          console.log('[TextEditor] No speakers in transcription, clearing');
          if (speakerManagerRef.current) {
            speakerManagerRef.current = new SpeakerManager();
          }
          if (speakerComponentRef?.current) {
            speakerComponentRef.current.loadSpeakers([]);
          }
        }
        
        // Reset selection
        setActiveBlockId(null);
        setSelectedBlockRange(null);
      } else {
        // No blocks in transcription, set default
        const initialBlock: TextBlockData = {
          id: `block-${Date.now()}-0`,
          text: '',
          timestamp: 0,
          duration: 0,
          speaker: '',  // Changed from null to empty string
          isEdited: false
        };
        console.log('[TextEditor] Setting default block');
        if (blockManagerRef.current) {
          blockManagerRef.current.setBlocks([initialBlock]);
        }
        setBlocks([initialBlock]);
        
        // Clear the transition flag even for default blocks
        if (isTransitioningRef.current) {
          console.log('[TextEditor] Clearing transition flag - default block set');
          isTransitioningRef.current = false;
        }
        
        // Clear speakers for empty transcription
        if (speakerManagerRef.current) {
          speakerManagerRef.current = new SpeakerManager();
        }
        if (speakerComponentRef?.current) {
          speakerComponentRef.current.loadSpeakers([]);
        }
      }
    }
  }, [transcriptions, currentTranscriptionIndex]);
  
  // Project: Save old project and load new one when project ID changes
  useEffect(() => {
    // Skip this entire effect if we have transcriptions from parent
    if (transcriptions && transcriptions.length > 0) {
      console.log('[Project] Skipping project load - using transcriptions from parent');
      return;
    }
    
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
            
            // Project save removed - projectService deleted
            console.log('[Project] Save skipped - projectService removed');
            /*await projectService.saveProject(oldProjectId, {
              blocks: currentBlocks.map(block => ({
                ...block,
                speakerTime: block.speakerTime // Ensure speakerTime is included
              })),
              speakers,
              remarks
            });*/
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
    const mediaId = '0-0-' + mediaFileName;
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
  
  // Save on page unload only (removed auto-save interval)
  useEffect(() => {
    if (!currentProjectId) {
      return;
    }
    
    // Only save on page unload
    const handleBeforeUnload = () => {
      console.log('[Project] Saving before unload');
      saveProjectData().catch(() => {
        // Silently fail on unload - can't do much about it
      });
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
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
  
  // Removed auto-save on changes - only manual save and save on navigation
  
  
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
  
  // Handle delete current transcription
  const handleDeleteTranscription = useCallback(() => {
    console.log('[TextEditor] Delete button clicked');
    console.log('[TextEditor] Current transcription index:', currentTranscriptionIndex);
    console.log('[TextEditor] Transcriptions:', transcriptions.map(t => ({ name: t.name, isDefault: t.isDefault })));
    
    if (currentTranscriptionIndex !== undefined && transcriptions.length > 0) {
      const currentTranscription = transcriptions[currentTranscriptionIndex];
      console.log('[TextEditor] Current transcription:', { name: currentTranscription?.name, isDefault: currentTranscription?.isDefault });
      
      // Prevent deletion of default transcription
      if (currentTranscription?.isDefault || currentTranscription?.name === 'אין תמלול') {
        console.log('[TextEditor] Blocking deletion of default transcription');
        return;
      }
      
      console.log('[TextEditor] Proceeding with deletion');
      setTranscriptionToDelete(currentTranscriptionIndex);
      setShowDeleteConfirmModal(true);
    }
  }, [currentTranscriptionIndex, transcriptions]);
  
  // Confirm delete single transcription
  const confirmDeleteTranscription = useCallback(async () => {
    if (transcriptionToDelete !== null) {
      try {
        // Call parent's delete handler
        if (onTranscriptionDelete) {
          onTranscriptionDelete(transcriptionToDelete);
          showFeedback('התמלול נמחק בהצלחה');
        } else {
          console.warn('No delete handler provided');
          showFeedback('לא ניתן למחוק - חסר handler');
        }
        
        setShowDeleteConfirmModal(false);
        setTranscriptionToDelete(null);
      } catch (error) {
        console.error('Error deleting transcription:', error);
        showFeedback('שגיאה במחיקת התמלול');
      }
    }
  }, [transcriptionToDelete, onTranscriptionDelete, showFeedback]);
  
  // Handle bulk delete
  const handleBulkDelete = useCallback(() => {
    if (selectedTranscriptions.size > 0) {
      setShowBulkDeleteConfirm(true);
    }
  }, [selectedTranscriptions]);
  
  // Confirm bulk delete
  const confirmBulkDelete = useCallback(async () => {
    if (selectedTranscriptions.size > 0) {
      try {
        // Call parent's bulk delete handler
        if (onBulkTranscriptionDelete) {
          onBulkTranscriptionDelete(Array.from(selectedTranscriptions));
          showFeedback(selectedTranscriptions.size + ' תמלולים נמחקו בהצלחה');
        } else {
          console.warn('No bulk delete handler provided');
          showFeedback('לא ניתן למחוק - חסר handler');
        }
        
        setSelectedTranscriptions(new Set());
        setShowBulkDeleteConfirm(false);
      } catch (error) {
        console.error('Error bulk deleting transcriptions:', error);
        showFeedback('שגיאה במחיקת התמלולים');
      }
    }
  }, [selectedTranscriptions, onBulkTranscriptionDelete, showFeedback]);
  
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
    // Prefer mediaName (original name) over mediaFileName
    if (mediaName) {
      setCurrentMediaFileName(mediaName);
    } else if (mediaFileName) {
      setCurrentMediaFileName(mediaFileName);
    } else {
      // Clear the filename if both are empty
      setCurrentMediaFileName('');
    }
  }, [mediaName, mediaFileName]);
  
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
              return b.speaker + ': ' + selectedPortion;
            }
            return b.speaker + ': ' + b.text;
          }).join('\n');
        } else {
          // No active selection, use full text
          selectedText = selectedBlocks.map(b => b.speaker + ': ' + b.text).join('\n');
        }
        
        navigator.clipboard.writeText(selectedText).then(() => {
          showFeedback(selectedBlocks.length + ' בלוקים נבחרו');
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
        const speaker = b.speaker ? b.speaker + ': ' : '';
        return speaker + b.text;
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
  
  // Handle Ctrl+S for saving (works with any keyboard layout)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+S or Cmd+S (works with Hebrew, Caps Lock, etc.)
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S' || e.key === 'ד')) {
        e.preventDefault(); // Prevent browser's default save dialog
        e.stopPropagation();
        console.log('[TextEditor] Ctrl+S pressed - triggering save');
        // Call saveProjectData directly to avoid stale closure issues
        saveProjectData();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [currentProjectId, currentMediaId]); // Add dependencies to get fresh values
  
  // Handle auto-save on navigation
  useEffect(() => {
    const handleAutoSave = (e: CustomEvent) => {
      console.log('[TextEditor] Auto-save triggered:', e.detail);
      console.log('[TextEditor] Has changes:', tHasChangesRef.current, 'Is saving:', tIsSavingRef.current);
      
      // Always save on navigation, regardless of changes flag
      // The user explicitly wants to save when navigating
      if (!tIsSavingRef.current) {
        console.log('[TextEditor] Performing auto-save before navigation');
        // Use the ref to call the current saveProjectData function
        if (saveProjectDataRef.current) {
          saveProjectDataRef.current();
        } else {
          console.warn('[TextEditor] saveProjectDataRef not set yet');
        }
      } else {
        console.log('[TextEditor] Save already in progress, skipping');
      }
    };
    
    // Handle page unload/refresh
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (tHasChangesRef.current) {
        // Try to save quickly using the ref
        if (saveProjectDataRef.current) {
          saveProjectDataRef.current();
        }
        // Show browser's confirmation dialog
        e.preventDefault();
        e.returnValue = 'יש שינויים שלא נשמרו. האם אתה בטוח שברצונך לצאת?';
        return e.returnValue;
      }
    };
    
    document.addEventListener('autoSaveBeforeNavigation', handleAutoSave as EventListener);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      document.removeEventListener('autoSaveBeforeNavigation', handleAutoSave as EventListener);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []); // Empty deps - we want this to run once and use refs for current values
  
  // Auto-save when component unmounts (navigating to other pages)
  useEffect(() => {
    return () => {
      // Component is unmounting - save if there are changes
      console.log('[TextEditor] Component unmounting - checking for unsaved changes');
      if (tHasChangesRef.current && !tIsSavingRef.current) {
        console.log('[TextEditor] Auto-saving on unmount due to unsaved changes');
        if (saveProjectDataRef.current) {
          saveProjectDataRef.current();
        }
      }
    };
  }, []); // Empty deps - only run on mount/unmount
  
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
    
    // Shortcuts initialization is now handled in the useEffect above with authentication
    // Shortcuts enabled preference is loaded in the preferences loading useEffect
    
  }, []); // Run only once on mount
  
  // Load transcription data when project or media changes
  useEffect(() => {
    const loadTranscriptionForMedia = async () => {
      if (!currentProjectId || !currentMediaId) {
        console.log('[TextEditor] No project or media ID, using default empty block');
        // Initialize with a single empty block
        const initialBlock: TextBlockData = {
          id: 'block-' + Date.now(),
          speaker: '',
          text: '',
          placeholder: currentMediaFileName || 'הקלד טקסט כאן...'
        };
        blockManagerRef.current.setBlocks([initialBlock]);
        setBlocks([initialBlock]);
        setActiveBlockId(initialBlock.id);
        // Reset transition flag
        isTransitioningRef.current = false;
        return;
      }
      
      console.log('[TextEditor] Loading transcription for:', currentProjectId, currentMediaId);
      
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous';
        const response = await fetch(buildApiUrl(`/api/projects/${currentProjectId}/media/${currentMediaId}/transcription`), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            console.log('[TextEditor] No transcription found, starting with empty block');
            // No transcription exists yet, start with empty block
            const initialBlock: TextBlockData = {
              id: 'block-' + Date.now(),
              speaker: '',
              text: '',
              placeholder: currentMediaFileName || 'הקלד טקסט כאן...'
            };
            blockManagerRef.current.setBlocks([initialBlock]);
            setBlocks([initialBlock]);
            setActiveBlockId(initialBlock.id);
            // Reset transition flag
            isTransitioningRef.current = false;
            return;
          }
          throw new Error('Failed to load transcription');
        }
        
        const data = await response.json();
        console.log('[TextEditor] Loaded transcription data:', data);
        
        // Clear previous speakers and load new ones
        speakerManagerRef.current = new SpeakerManager();
        setSpeakerColors(new Map());
        
        // Load speakers if available
        if (data.speakers && Array.isArray(data.speakers)) {
          console.log('[TextEditor] Loading speakers:', data.speakers);
          
          // Clear and reload speaker manager
          data.speakers.forEach((speaker: any) => {
            if (speaker.code) {
              speakerManagerRef.current.addSpeaker(speaker.code, speaker.name || '');
              if (speaker.color) {
                setSpeakerColors(prev => new Map(prev).set(speaker.code, speaker.color));
              }
            }
          });
          
          // Update SimpleSpeaker component if available
          if (speakerComponentRef?.current) {
            // Format speakers to match SpeakerBlockData interface
            const formattedSpeakers = data.speakers.map((s: any) => ({
              id: s.id || `speaker-${s.code}`,
              code: s.code || '',
              name: s.name || '',
              description: s.description || '',
              color: s.color || '#667eea',
              count: s.count || 0
            }));
            console.log('[TextEditor] Loading formatted speakers into SimpleSpeaker:', formattedSpeakers);
            speakerComponentRef.current.loadSpeakers(formattedSpeakers);
          }
        } else {
          console.log('[TextEditor] No speakers found in data');
          // If no speakers, ensure SimpleSpeaker is reset with a default empty speaker
          if (speakerComponentRef?.current) {
            speakerComponentRef.current.loadSpeakers([]);
          }
        }
        
        // Load blocks
        if (data.blocks && data.blocks.length > 0) {
          blockManagerRef.current.setBlocks(data.blocks);
          setBlocks([...data.blocks]);
          setActiveBlockId(data.blocks[0].id);
        } else {
          // Empty transcription, start with default block
          const initialBlock: TextBlockData = {
            id: 'block-' + Date.now(),
            speaker: '',
            text: '',
            placeholder: currentMediaFileName || 'הקלד טקסט כאן...'
          };
          blockManagerRef.current.setBlocks([initialBlock]);
          setBlocks([initialBlock]);
          setActiveBlockId(initialBlock.id);
          // Reset transition flag
          isTransitioningRef.current = false;
        }
        
        // Load remarks if available
        if (data.remarks && Array.isArray(data.remarks) && remarksContext) {
          // Clear existing remarks
          remarksContext.state.remarks.forEach(remark => {
            remarksContext.deleteRemark(remark.id);
          });
          // Add new remarks
          data.remarks.forEach((remark: any) => {
            remarksContext.addRemark(remark);
          });
        }
        
        // Reset transition flag after successful load
        console.log('[TextEditor] Transcription loaded, resetting transition flag');
        isTransitioningRef.current = false;
        
      } catch (error) {
        console.error('[TextEditor] Error loading transcription:', error);
        // On error, start with empty block
        const initialBlock: TextBlockData = {
          id: 'block-' + Date.now(),
          speaker: '',
          text: '',
          placeholder: currentMediaFileName || 'הקלד טקסט כאן...'
        };
        blockManagerRef.current.setBlocks([initialBlock]);
        setBlocks([initialBlock]);
        setActiveBlockId(initialBlock.id);
        
        // Reset transition flag even on error
        isTransitioningRef.current = false;
      }
    };
    
    loadTranscriptionForMedia();
  }, [currentProjectId, currentMediaId]);
  
  // Initialize auto-save
  useEffect(() => {
    if (autoSaveEnabled && currentProjectId && currentMediaId) {
      console.log('[AutoSave] Initializing for project:', currentProjectId, 'media:', currentMediaId);
      
      // Create data callback function
      const getBackupData = () => {
        console.log('[Auto-Backup] Creating backup for project:', currentProjectId, 'media:', currentMediaId);
        const blocks = blockManagerRef.current.getBlocks();
        // Get speakers from SimpleSpeaker component which has the actual names
        const speakers = speakerComponentRef?.current?.getAllSpeakers() || speakerManagerRef.current.getAllSpeakers();
        console.log('[Auto-Backup] Saving speakers:', speakers.length, 'speakers:', speakers.map(s => s.name));
        const remarks = remarksContext?.state.remarks || [];
        
        return {
          blocks: blocks.map(block => ({
            id: block.id,
            text: block.text,
            speaker: block.speaker,
            timestamp: block.speakerTime ? formatTime(block.speakerTime) : undefined,
            startTime: block.startTime,
            endTime: block.endTime
          })),
          speakers: speakers.map(speaker => ({
            id: speaker.id,
            code: speaker.code,
            name: speaker.name,
            description: speaker.description,
            color: speaker.color,
            count: speaker.count
          })),
          remarks: remarks.map(remark => ({
            id: remark.id,
            type: remark.type,
            content: remark.content || remark.text,
            text: remark.text || remark.content,
            blockId: remark.blockId,
            timestamp: remark.timestamp,
            status: remark.status,
            createdAt: remark.createdAt,
            updatedAt: remark.updatedAt,
            position: remark.position,
            color: remark.color,
            // Additional properties for specific remark types
            ...(remark.type === 'UNCERTAINTY' && {
              confidence: remark.confidence,
              originalText: remark.originalText,
              correctedText: remark.correctedText
            }),
            ...(remark.type === 'SPELLING' && {
              term: remark.term,
              occurrences: remark.occurrences,
              suggestions: remark.suggestions,
              standardized: remark.standardized
            })
          })),
          metadata: {
            mediaId: currentMediaId,
            fileName: mediaName || '',
            originalName: mediaName || '',
            savedAt: new Date().toISOString()
          }
        };
      };
      
      // Initialize auto-save with the callback
      backupService.initAutoSave(currentProjectId, currentMediaId, getBackupData, 60000);
      
    } else if (!autoSaveEnabled || !currentProjectId || !currentMediaId) {
      console.log('[AutoSave] Stopping - conditions not met:', {
        autoSaveEnabled,
        hasProjectId: !!currentProjectId,
        hasMediaId: !!currentMediaId
      });
      backupService.stopAutoSave();
    }
    
    // Cleanup auto-save on unmount or when dependencies change
    return () => {
      console.log('[AutoSave] Cleanup - stopping auto-save');
      backupService.stopAutoSave();
    };
  }, [autoSaveEnabled, currentProjectId, currentMediaId, mediaName, remarksContext, speakerComponentRef]);

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

  // Auto Word export hook
  const { lastExportTime } = useAutoWordExport({
    blocks,
    speakers: speakerNamesRef.current,
    remarks: remarksContext?.state.remarks,
    mediaFileName: currentMediaFileName,
    mediaDuration,
    autoExportEnabled
  });

  // Fetch user auto export setting
  useEffect(() => {
    const fetchAutoExportSetting = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const apiUrl = buildApiUrl('/api/auth/storage');
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log('[TextEditor] Storage API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[TextEditor] Full storage API response:', data);
          console.log('[TextEditor] autoExportEnabled from API:', data.autoExportEnabled);
          console.log('[TextEditor] Type of autoExportEnabled:', typeof data.autoExportEnabled);
          
          const enabled = data.autoExportEnabled || false;
          setAutoExportEnabled(enabled);
          console.log('[TextEditor] Final autoExportEnabled state set to:', enabled);
        } else {
          console.error('[TextEditor] Storage API error:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('[TextEditor] Failed to fetch auto export setting:', error);
      }
    };

    fetchAutoExportSetting();
  }, []); // Only run once on mount

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
            console.log('[TextEditor] Navigation mode - checking block timestamp:', {
              blockId: targetBlock.id,
              speakerTime: targetBlock.speakerTime,
              hasTime: targetBlock.speakerTime !== undefined && targetBlock.speakerTime > 0
            });
            if (targetBlock.speakerTime !== undefined && targetBlock.speakerTime > 0) {
              console.log('[TextEditor] Seeking to time:', targetBlock.speakerTime);
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
      console.log('[TextEditor] Regular navigation - checking block:', {
        blockId: newBlockId,
        block: newBlock ? { speakerTime: newBlock.speakerTime, text: newBlock.text?.substring(0, 30) } : null,
        hasTime: newBlock && newBlock.speakerTime !== undefined && newBlock.speakerTime > 0
      });
      if (newBlock && newBlock.speakerTime !== undefined && newBlock.speakerTime > 0) {
        // Only seek in navigation mode and with valid timestamps
        console.log('[TextEditor] Seeking to time:', newBlock.speakerTime);
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
    
    // Auto-save is now handled in the auto-save useEffect with proper transcription number
  }, []);

  // Handle transcription change from switcher
  const handleTranscriptionChange = useCallback((transcription: any) => {
    console.log('Switching to transcription:', transcription);
    // In a real implementation, you would:
    // 1. Save current transcription state
    // 2. Load the selected transcription data
    // 3. Update blocks and speakers
    // 4. Update backup service with new transcription ID
    
    // Auto-save is now handled in the auto-save useEffect with proper transcription number
    
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
    
    // Mark transcription as modified
    console.log('[TextEditor] Block updated, marking as modified:', { id, field, valueLength: value.length });
    sessionStorage.setItem('transcriptionModified', 'true');
    
    // Store current blocks in sessionStorage for navigation saves
    const allBlocks = blockManagerRef.current.getBlocks();
    sessionStorage.setItem('currentTranscriptionBlocks', JSON.stringify(allBlocks));
    
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
            console.log(`[TextEditor] Setting timestamp for block ${idx}: time=${currentMediaTimeRef.current}, speaker=${value}`);
            blockManagerRef.current.setBlockTimestamp(block.id, currentMediaTimeRef.current || 0);
          } else {
            console.log(`[TextEditor] Block ${idx} already has timestamp: ${block?.speakerTime}`);
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
        console.log(`[TextEditor] Setting timestamp for main block: id=${id}, time=${currentMediaTimeRef.current}, speaker=${value}`);
        blockManagerRef.current.setBlockTimestamp(id, currentMediaTimeRef.current || 0);
      } else {
        console.log(`[TextEditor] Main block already has timestamp: ${block?.speakerTime}`);
      }
    }
    
    // Mark changes for auto-save
    backupService.markChanges();
  }, [saveToHistory]);

  // Handle new block creation
  const handleNewBlock = useCallback(() => {
    const currentBlock = blockManagerRef.current.getActiveBlock();
    if (currentBlock) {
      console.log(`[TextEditor] Creating new block with timestamp: ${currentMediaTimeRef.current}`);
      const newBlock = blockManagerRef.current.addBlock(currentBlock.id, currentMediaTimeRef.current);
      console.log(`[TextEditor] New block created:`, { id: newBlock.id, speakerTime: newBlock.speakerTime });
      
      // Mark transcription as modified
      sessionStorage.setItem('transcriptionModified', 'true');
      
      // Store current blocks in sessionStorage for navigation saves
      const allBlocks = blockManagerRef.current.getBlocks();
      sessionStorage.setItem('currentTranscriptionBlocks', JSON.stringify(allBlocks));
      
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
      const speaker = b.speaker ? b.speaker + ': ' : '';
      return speaker + b.text;
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
    
    showFeedback(updatedCount + ' בלוקים עודכנו: ' + fromSpeaker + ' → ' + toSpeaker);
  }, [saveToHistory, showFeedback]);

  // Handle block removal
  const handleRemoveBlock = useCallback((id: string) => {
    // Track deletion for incremental backup
    incrementalBackupService.trackBlockDeleted(id);
    
    // Mark transcription as modified
    sessionStorage.setItem('transcriptionModified', 'true');
    
    blockManagerRef.current.removeBlock(id);
    
    // Store current blocks in sessionStorage for navigation saves
    const allBlocks = blockManagerRef.current.getBlocks();
    sessionStorage.setItem('currentTranscriptionBlocks', JSON.stringify(allBlocks));
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
    
    console.log('[Project] Loading project ' + projectId);
    
    // Try to load from IndexedDB first for instant loading
    if (shouldUseIndexedDB()) {
      try {
        await indexedDBService.init();
        const cachedData = await indexedDBService.loadTranscription(projectId);
        if (cachedData && cachedData.blocks && cachedData.blocks.length > 0) {
          console.log('[IndexedDB] Loaded ' + cachedData.blocks.length + ' blocks from cache');
          
          // Load cached data immediately for instant display
          blockManagerRef.current.setBlocks(cachedData.blocks);
          setBlocks(cachedData.blocks);
          
          // Initialize services
          incrementalBackupService.initialize(projectId, cachedData.blocks, cachedData.version || 0);
          
          // Fire event for virtualization
          const event = new CustomEvent('blocksLoaded', {
            detail: { count: cachedData.blocks.length }
          });
          document.dispatchEvent(event);
          
          // Continue to sync with server in background
          console.log('[IndexedDB] Syncing with server in background...');
        }
      } catch (error) {
        console.warn('[IndexedDB] Failed to load from cache:', error);
      }
    }
    
    try {
      // Project loading removed - projectService deleted
      const projectData = null; // await projectService.loadProject(projectId);
    
    if (projectData && projectData.blocks && projectData.blocks.length > 0) {
      console.log('[Project] Loaded ' + projectData.blocks.length + ' blocks');
      
      // Ensure blocks have proper structure including timestamps
      const loadedBlocks = projectData.blocks.map((block: any) => ({
        id: block.id,
        speaker: block.speaker || '',
        text: block.text || '',
        // Handle both direct speakerTime (as number) and timestamp (as formatted string)
        speakerTime: block.speakerTime !== undefined 
          ? (typeof block.speakerTime === 'number' ? block.speakerTime : parseTime(block.speakerTime))
          : (block.timestamp ? parseTime(block.timestamp) : undefined),
        timestamp: block.timestamp,
        duration: block.duration,
        isEdited: block.isEdited
      }));
      
      // Debug: Log blocks with timestamps
      console.log('[Project] Blocks with timestamps:', loadedBlocks.filter(b => b.speakerTime).map(b => ({ 
        id: b.id, 
        speaker: b.speaker, 
        speakerTime: b.speakerTime 
      })));
      
      console.log('[Project] DEBUG: Loaded blocks:', loadedBlocks.map(b => ({ id: b.id, speaker: b.speaker, text: b.text.substring(0, 30) })));
      
      // CRITICAL: Update blockManagerRef BEFORE setting state
      blockManagerRef.current.setBlocks(loadedBlocks);
      setBlocks(loadedBlocks);
      
      // Clear transition flag now that blocks are loaded
      if (isTransitioningRef.current) {
        console.log('[Project] Clearing transition flag - blocks loaded from project');
        isTransitioningRef.current = false;
      }
      
      // Debug: Check if speakerTime values persist in state
      console.log('[Project] After setBlocks - checking speakerTime values:');
      blockManagerRef.current.getBlocks().forEach((block, idx) => {
        if (block.speakerTime !== undefined && block.speakerTime > 0) {
          console.log(`  Block ${idx}: speaker="${block.speaker}", speakerTime=${block.speakerTime}`);
        }
      });
      
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
        // Sync speakers to the Speaker panel
        document.dispatchEvent(new CustomEvent('syncSpeakersToPanel', {
          detail: { speakers: projectData.speakers }
        }));
        
        // Load speakers into SimpleSpeaker component if available
        if (speakerComponentRef?.current) {
          speakerComponentRef.current.loadSpeakers(projectData.speakers.map((s: any) => ({
            id: 'speaker-' + s.code,
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
      
      // Clear transition flag for fresh start
      if (isTransitioningRef.current) {
        console.log('[Project] Clearing transition flag - fresh start');
        isTransitioningRef.current = false;
      }
      
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
      
      // Clear transition flag even on error
      if (isTransitioningRef.current) {
        console.log('[Project] Clearing transition flag - error fallback');
        isTransitioningRef.current = false;
      }
    }
  };
  
  // T-Session: Handle loading existing transcription
  const tHandleLoadExisting = (transcriptionNumber: number) => {
    console.log('[T-Session] User selected to load transcription ' + transcriptionNumber);
    // Load will be triggered by project ID change
    setTCurrentTranscriptionNumber(transcriptionNumber);
  };
  
  // T-Session: Handle creating new transcription
  const tHandleCreateNew = async () => {
    const nextNumber = await tSessionService.tGetNextTranscriptionNumber(tCurrentMediaId);
    console.log('[T-Session] Creating new transcription ' + nextNumber);
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
  
  // Wrapper for saving (called by Ctrl+S and auto-save)
  const handleProjectSave = () => {
    console.log('[TextEditor] handleProjectSave called');
    saveProjectData();
  };
  
  // Project: Save current transcription
  const saveProjectData = async () => {
    console.log('[SaveProjectData] Function called!');
    console.log('[SaveProjectData] Current state:', {
      currentProjectId,
      currentMediaId,
      transcriptions: transcriptions?.length || 0,
      isTransitioning: isTransitioningRef.current
    });
    
    // Block saves during transitions
    if (isTransitioningRef.current) {
      console.log('[Project] Save blocked - media transition in progress');
      return;
    }
    
    // Mark as modified when user manually saves
    sessionStorage.setItem('transcriptionModified', 'true');
    
    console.log('[Project] Save attempt with:', {
      projectId: currentProjectId,
      hasProjectId: !!currentProjectId,
      transcriptions: transcriptions?.length || 0
    });
    
    // Use project store save when we have both project and media IDs
    if (currentProjectId && currentMediaId) {
      console.log('[Project] Using project store save method');
      
      const currentBlocks = blockManagerRef.current.getBlocks();
      
      // Get speakers from SimpleSpeaker component first, then fallback to TextEditor's manager
      let speakers = [];
      if ((window as any).simpleSpeakerRef) {
        console.log('[Project] Getting speakers from SimpleSpeaker global ref');
        speakers = (window as any).simpleSpeakerRef.getAllSpeakers();
      } else if (speakerComponentRef?.current) {
        console.log('[Project] Getting speakers from SimpleSpeaker ref');
        speakers = speakerComponentRef.current.getAllSpeakers();
      } else if (speakerManagerRef.current) {
        console.log('[Project] Getting speakers from TextEditor manager');
        speakers = speakerManagerRef.current.getAllSpeakers();
      }
      
      console.log('[Project] Data to save:', {
        blocksCount: currentBlocks.length,
        speakersCount: speakers.length,
        speakers: speakers,
        remarksCount: remarksContext?.state.remarks?.length || 0
      });
      
      // Start saving indicator
      setTIsSaving(true);
      
      try {
        console.log('[TextEditor] Calling saveMediaData with:', {
          projectId: currentProjectId,
          mediaId: currentMediaId,
          blocksCount: currentBlocks.length,
          speakersCount: speakers.length,
          speakerDetails: speakers
        });
        const success = await saveMediaData(currentProjectId, currentMediaId, {
          blocks: currentBlocks,
          speakers: speakers.map((speaker: any) => ({
            id: speaker.id || `speaker-${speaker.code}`,
            code: speaker.code || '',
            name: speaker.name || '',
            description: speaker.description || '',
            color: speaker.color || '#667eea',
            count: speaker.count || speaker.blockCount || 0
          })),
          remarks: remarksContext?.state.remarks || []
        });
        
        console.log('[Project] Save result:', success);
        console.log('[Project] About to set saving to false');
        
        if (success) {
          console.log('[Project] Save successful! Setting saving to false');
          
          // Force state update with timeout to ensure UI updates
          setTimeout(() => {
            setTIsSaving(false);
            setTHasChanges(false);
            setTLastSaveTime(new Date());
            tLastSavedContent.current = JSON.stringify(currentBlocks);
            console.log('[Project] Save state updated - saving should be false now');
          }, 100);
          
          // Show success feedback
          showFeedback('השמירה הושלמה בהצלחה', 'success');
        } else {
          console.error('[Project] Save failed - setting saving to false');
          // Force state update with timeout
          setTimeout(() => {
            setTIsSaving(false);
          }, 100);
          showFeedback('השמירה נכשלה', 'error');
        }
      } catch (error) {
        console.error('[Project] Save error:', error);
        setTIsSaving(false);
        showFeedback('שגיאה בשמירה', 'error');
      }
      
      return;
    }
    
    // If we have transcriptions from parent, save via parent (old T-session method)
    if (transcriptions && transcriptions.length > 0) {
      console.log('[Project] Using parent save method (T-session)');
      
      // Get current blocks
      const currentBlocks = blockManagerRef.current.getBlocks();
      console.log('[Project] Saving blocks:', currentBlocks.length);
      
      // Start saving indicator
      setTIsSaving(true);
      
      // Set up timeout first
      let timeoutId: NodeJS.Timeout;
      
      // Set up one-time listeners for save result
      const handleSaveSuccess = () => {
        console.log('[Project] Save successful!');
        clearTimeout(timeoutId); // Clear timeout on success
        setTIsSaving(false);
        setTHasChanges(false);
        setTLastSaveTime(new Date());
        tLastSavedContent.current = JSON.stringify(currentBlocks);
        document.removeEventListener('saveTranscriptionSuccess', handleSaveSuccess);
        document.removeEventListener('saveTranscriptionError', handleSaveError);
      };
      
      const handleSaveError = (e: CustomEvent) => {
        console.error('[Project] Save failed:', e.detail?.error);
        clearTimeout(timeoutId); // Clear timeout on error
        setTIsSaving(false);
        // Keep hasChanges true since save failed
        document.removeEventListener('saveTranscriptionSuccess', handleSaveSuccess);
        document.removeEventListener('saveTranscriptionError', handleSaveError);
      };
      
      document.addEventListener('saveTranscriptionSuccess', handleSaveSuccess);
      document.addEventListener('saveTranscriptionError', handleSaveError as EventListener);
      
      // Get speakers from SimpleSpeaker if available, otherwise from speakerComponentRef, otherwise from TextEditor's manager
      let speakers = [];
      if ((window as any).simpleSpeakerRef) {
        // Get from SimpleSpeaker global reference
        speakers = (window as any).simpleSpeakerRef.getAllSpeakers();
      } else if (speakerComponentRef?.current) {
        // Get from SimpleSpeaker through ref
        speakers = speakerComponentRef.current.getAllSpeakers();
      } else if (speakerManagerRef.current) {
        // Fallback to TextEditor's own manager
        speakers = speakerManagerRef.current.getAllSpeakers().map((speaker: any) => ({
          id: speaker.id,
          code: speaker.code,
          name: speaker.name || '',
          description: speaker.description || '',  // Preserve description
          color: speaker.color,
          count: speaker.blockCount
        }));
      }
      
      // Debug: Log blocks being saved with timestamps
      const blocksWithTimestamps = currentBlocks.filter(b => b.speakerTime && b.speakerTime > 0);
      console.log('[Save] Blocks with timestamps:', blocksWithTimestamps.length, '/', currentBlocks.length);
      console.log('[Save] Timestamp details:', blocksWithTimestamps.map(b => ({ 
        id: b.id, 
        speaker: b.speaker, 
        speakerTime: b.speakerTime 
      })));
      
      // Log the exact data being saved
      console.log('[Save] Sending blocks to save:', currentBlocks.map(b => ({
        id: b.id,
        speaker: b.speaker,
        speakerTime: b.speakerTime,
        hasTime: b.speakerTime !== undefined && b.speakerTime > 0
      })));
      
      // Trigger save through parent component
      const event = new CustomEvent('saveTranscription', {
        detail: {
          blocks: currentBlocks,
          speakers: speakers,
          remarks: remarksContext?.state.remarks || [],
          mediaId: currentMediaId,  // Include media ID for proper isolation
          projectId: currentProjectId  // Include project ID as well
        }
      });
      document.dispatchEvent(event);
      
      // Fallback timeout in case no response
      timeoutId = setTimeout(() => {
        console.warn('[Project] Save timeout - no response received after 5 seconds');
        setTIsSaving(false);
        setTHasChanges(true); // Keep changes since save didn't complete
        alert('השמירה נכשלה - נסה שוב');
        document.removeEventListener('saveTranscriptionSuccess', handleSaveSuccess);
        document.removeEventListener('saveTranscriptionError', handleSaveError);
      }, 5000);
      
      return;
    }
    
    if (!currentProjectId || currentProjectId === '') {
      console.warn('[Project] Cannot save: missing or empty project ID');
      return;
    }
    
    // This case is now handled above, so just warn if we get here
    if (currentProjectId && currentMediaId) {
      console.warn('[Project] This code path should not be reached - save should have been handled above');
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
    
    // Get speakers from SimpleSpeaker if available, otherwise from speakerComponentRef, otherwise from TextEditor's manager
    let speakers = [];
    if ((window as any).simpleSpeakerRef) {
      // Get from SimpleSpeaker global reference
      speakers = (window as any).simpleSpeakerRef.getAllSpeakers();
    } else if (speakerComponentRef?.current) {
      // Get from SimpleSpeaker through ref
      speakers = speakerComponentRef.current.getAllSpeakers();
    } else if (speakerManagerRef.current) {
      // Fallback to TextEditor's own manager
      speakers = speakerManagerRef.current.getAllSpeakers().map((speaker: any) => ({
        id: speaker.id,
        code: speaker.code,
        name: speaker.name || '',
        description: speaker.description || '',  // Preserve description
        color: speaker.color,
        count: speaker.blockCount
      }));
    }
    
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
    
    // Save to IndexedDB first for instant local backup
    if (shouldUseIndexedDB()) {
      try {
        await indexedDBService.saveTranscription(
          currentProjectId,
          currentBlocks,
          speakers,
          remarks
        );
        console.log('[IndexedDB] Saved locally');
      } catch (error) {
        console.warn('[IndexedDB] Failed to save locally:', error);
      }
    }
    
    // Always do the actual save with all blocks and speakers to server
    // (incremental tracking is just for metrics/logging for now until backend supports deltas)
    // Project save removed - projectService deleted
    const success = true; // await projectService.saveProject(currentProjectId, saveData);
    
    // If save succeeded, update incremental tracking
    if (success && incrementalBackupService.hasChanges()) {
      incrementalBackupService.onSaveSuccess(
        Date.now(), // Use timestamp as version for now
        currentBlocks
      );
    }
    
    if (success) {
      // Backup creation is now handled automatically in tSessionService
      console.log('[Project] Save successful - backup will be created by tSessionService');
      
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
  
  // Set the ref after the function is defined
  saveProjectDataRef.current = saveProjectData;

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
          escapedText = '\\b' + escapedText + '\\b';
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
      const blockElement = document.getElementById('block-' + result.blockId);
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
      showFeedback('הוחלפו ' + replacedCount + ' מופעים');
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
        showFeedback('הוחלפו ' + swapCount + ' בלוקים');
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
            console.log('[TextEditor] Updating block ' + block.id + ' speaker from "' + updateFrom + '" to "' + updateTo + '"');
            blockManagerRef.current.updateBlock(block.id, 'speaker', updateTo);
            hasUpdates = true;
          }
        });
        
        // Force re-render if there were updates
        if (hasUpdates) {
          console.log('[TextEditor] Forcing re-render after updates');
          setBlocks([...blockManagerRef.current.getBlocks()]);
          // Mark as having changes so it will be saved
          setTHasChanges(true);
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
      
      // Update SpeakerManager with the new name
      if (speakerManagerRef.current && code) {
        const speaker = speakerManagerRef.current.findByCode(code);
        if (speaker) {
          speakerManagerRef.current.updateSpeakerName(speaker.id, name || '');
          // Mark as having changes so it will be saved
          setTHasChanges(true);
        }
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

    // Listen for speaker panel changes to trigger save
    const handleSpeakerPanelChanged = () => {
      console.log('[TextEditor] Speaker panel changed, marking for save');
      setTHasChanges(true);
    };

    document.addEventListener('speakerUpdated', handleSpeakerUpdated as EventListener);
    document.addEventListener('speakerCreated', handleSpeakerUpdated as EventListener);
    document.addEventListener('speakerColorUpdate', handleSpeakerColorUpdate as EventListener);
    document.addEventListener('speakerPanelChanged', handleSpeakerPanelChanged);
    
    return () => {
      document.removeEventListener('speakerUpdated', handleSpeakerUpdated as EventListener);
      document.removeEventListener('speakerCreated', handleSpeakerUpdated as EventListener);
      document.removeEventListener('speakerColorUpdate', handleSpeakerColorUpdate as EventListener);
      document.removeEventListener('speakerPanelChanged', handleSpeakerPanelChanged);
    };
  }, [speakerColors]);
  
  // Click outside handler for transcription switcher
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is outside the dropdown and not on the trigger button
      if (showTranscriptionSwitcher && 
          !target.closest('.te-project-dropdown') && 
          !target.closest('.te-transcription-btn')) {
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
          id: 'block-' + Date.now() + '-' + index,
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
        
        console.log('[Import] Loaded ' + importedBlocks.length + ' blocks');
        showFeedback('יובאו ' + importedBlocks.length + ' בלוקים');
        
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
                className={'mark-item ' + (activeMark?.id === mark.id ? 'active' : '')}
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
            {/* Media Name Zone with Duration - CENTER */}
            <div className="header-zone media-zone">
              <div className="media-name-wrapper">
                <div 
                  ref={mediaNameRef}
                  className={'media-name-scrollable ' + (
                    isMediaNameOverflowing && currentMediaFileName 
                      ? (/[\u0590-\u05FF]/.test(currentMediaFileName) ? 'scroll-rtl' : 'scroll-ltr')
                      : ''
                  )}
                >
                  {currentMediaFileName || 'אין תמלול'}
                  {/* DEBUG: Always log values */}
                  {(() => {
                    if (currentMediaFileName) {
                      const isHebrew = /[\u0590-\u05FF]/.test(currentMediaFileName);
                      const scrollClass = isMediaNameOverflowing ? (isHebrew ? 'scroll-rtl' : 'scroll-ltr') : 'no-scroll';
                      console.log('[TextEditor] currentMediaFileName:', currentMediaFileName, 'overflowing:', isMediaNameOverflowing, 'isHebrew:', isHebrew, 'scroll class:', scrollClass);
                    }
                    return null;
                  })()}
                  {mediaDuration && mediaDuration !== '00:00:00' && (
                    <span className="te-duration-inline"> ({mediaDuration})</span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Project Name Zone with Dropdown */}
            <div className="header-zone project-zone">
              {projectName && <span className="header-text">{projectName}</span>}
            </div>
            
            <div className="header-divider"></div>
            
            {/* File Management Actions - RIGHT */}
            <div className="te-header-actions">
              <button 
                className={`te-header-btn te-save-btn ${tIsSaving ? 'saving' : ''}`}
                onClick={() => {
                  console.log('[DEBUG] Save button clicked!');
                  console.log('[DEBUG] Current state:', { 
                    currentProjectId, 
                    currentMediaId,
                    hasBlocks: blocks.length > 0
                  });
                  saveProjectData();
                }} 
                title="שמור (Ctrl+S)"
                disabled={tIsSaving}
              >
                <svg viewBox="0 0 24 24" width="14" height="14">
                  <path fill="currentColor" d="M17 3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V7L17 3ZM19 19H5V5H16.17L19 7.83V19ZM12 12C10.34 12 9 13.34 9 15S10.34 18 12 18 15 16.66 15 15 13.66 12 12 12ZM6 6H15V10H6V6Z"/>
                </svg>
              </button>
              
              <button 
                className={`te-header-btn te-export-btn ${autoExportEnabled ? 'auto-export-active' : ''}`}
                onClick={() => {
                  console.log('[TextEditor] Export button clicked, autoExportEnabled:', autoExportEnabled);
                  setShowDocumentExportModal(true);
                }} 
                title={autoExportEnabled ? "ייצוא למסמך Word (ייצוא אוטומטי פעיל)" : "ייצוא למסמך Word"}
              >
                <svg viewBox="0 0 24 24" width="14" height="14">
                  <path fill="currentColor" d="M6 2C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2H6ZM13 3.5L18.5 9H13V3.5ZM12 11L8 15H10.5V19H13.5V15H16L12 11Z"/>
                </svg>
              </button>
              
              <button 
                className="te-header-btn te-history-btn" 
                onClick={() => setShowVersionHistoryModal(true)} 
                title="היסטוריית גרסאות"
              >
                <svg viewBox="0 0 24 24" width="14" height="14">
                  <path fill="currentColor" d="M13 3C8.03 3 4 7.03 4 12H1L4.89 15.89L4.96 16.03L9 12H6C6 8.13 9.13 5 13 5S20 8.13 20 12 16.87 19 13 19C11.07 19 9.32 18.21 8.06 16.94L6.64 18.36C8.27 19.99 10.51 21 13 21C17.97 21 22 16.97 22 12S17.97 3 13 3ZM12 8V13L16.25 15.52L17.02 14.24L13.5 12.15V8H12Z"/>
                </svg>
              </button>
            </div>
          </div>
          
          {/* Blocks Container */}
          <div className="blocks-container" key={editorRefreshKey}>
            {console.log('[TextEditor] Rendering blocks:', { 
              blockCount: blocks.length, 
              virtualizationEnabled,
              firstBlock: blocks[0]
            })}
            {blocks.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                טוען תמלול...
              </div>
            ) : virtualizationEnabled ? (
              <SlidingWindowTextEditor
                key={editorRefreshKey}
                blocks={blocks}
                activeBlockId={activeBlockId}
                activeArea={activeArea}
                cursorAtStart={cursorAtStart}
                mediaName={mediaName}
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
                <div key={block.id} id={'block-' + (block.id)} 
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
                    mediaName={mediaName}
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
        transcriptionId={currentTranscriptionId}
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
        mediaName={mediaName}
        onRestore={async (version) => {
          console.log('[Project] Restoring version for media:', currentMediaId, version);
          try {
            // Load the backup content from the media-specific backup location
            const response = await fetch(
              buildApiUrl(`/api/projects/${currentProjectId}/media/${currentMediaId}/backups/${version.filename}`),
              {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous'}`
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
                  // Handle both direct speakerTime (as number) and timestamp (as formatted string)
                  speakerTime: block.speakerTime !== undefined 
                    ? (typeof block.speakerTime === 'number' ? block.speakerTime : parseTime(block.speakerTime))
                    : (block.timestamp ? parseTime(block.timestamp) : undefined)
                }));
                
                // Update blockManagerRef AND state like in loadProjectData
                blockManagerRef.current.setBlocks(restoredBlocks);
                setBlocks(restoredBlocks);
                
                // Update speakers if available
                if (data.speakers) {
                  // Load speakers into SimpleSpeaker component if available
                  if (speakerComponentRef?.current) {
                    speakerComponentRef.current.loadSpeakers(data.speakers.map((s: any) => ({
                      id: 'speaker-' + s.code,
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
                      text: remarkData.text || remarkData.content,
                      content: remarkData.content || remarkData.text,
                      type: remarkData.type,
                      status: remarkData.status,
                      timestamp: remarkData.timestamp,
                      position: remarkData.position,
                      createdAt: remarkData.createdAt,
                      updatedAt: remarkData.updatedAt,
                      color: remarkData.color,
                      // Type-specific properties
                      ...(remarkData.type === 'UNCERTAINTY' && {
                        confidence: remarkData.confidence,
                        originalText: remarkData.originalText,
                        correctedText: remarkData.correctedText
                      }),
                      ...(remarkData.type === 'SPELLING' && {
                        term: remarkData.term,
                        occurrences: remarkData.occurrences,
                        suggestions: remarkData.suggestions,
                        standardized: remarkData.standardized
                      })
                    });
                  });
                }
                
                // Reset change tracking - now this version becomes current
                tLastSavedContent.current = JSON.stringify(data.blocks);
                setTHasChanges(false);
                setTLastSaveTime(new Date());
                
                // Save the restored content to the current media
                if (currentProjectId && currentMediaId) {
                  console.log('[T-Session] Saving restored content to current media:', currentMediaId);
                  await saveMediaData(currentProjectId, currentMediaId, {
                    blocks: restoredBlocks,
                    speakers: data.speakers || [],
                    remarks: data.remarks || [],
                    metadata: {
                      ...data.metadata,
                      restoredFrom: version.filename,
                      restoredAt: new Date().toISOString()
                    }
                  });
                }
                
                // Force refresh of the editor to show restored content immediately
                setActiveBlockId(null);
                setEditorRefreshKey(prev => prev + 1); // Force complete re-render
                setTimeout(() => {
                  // Set focus to first block after a brief delay
                  if (restoredBlocks.length > 0) {
                    setActiveBlockId(restoredBlocks[0].id);
                    setActiveArea('text');
                  }
                }, 100);
                
                console.log('[T-Session] Successfully restored to version ' + version.version + ' for media ' + currentMediaId);
              }
            }
          } catch (error) {
            console.error('[T-Session] Error restoring version:', error);
          }
        }}
        transcriptionId={currentProjectId}
        mediaId={currentMediaId}
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
            const blockElement = document.getElementById('block-' + result.blockId);
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
        onSaveSettings={(settings) => autoCorrectService.saveSettings(settings)}
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
          showFeedback('המסמך יוצא בהצלחה בפורמט ' + (format));
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
      
      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirmModal}
        onClose={() => {
          setShowDeleteConfirmModal(false);
          setTranscriptionToDelete(null);
        }}
        onConfirm={confirmDeleteTranscription}
        title="מחיקת תמלול"
        message={'האם אתה בטוח שברצונך למחוק את התמלול?'}
        subMessage="פעולה זו אינה ניתנת לביטול"
        confirmText="מחק"
        cancelText="ביטול"
        type="danger"
      />
      
      {/* Bulk Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showBulkDeleteConfirm}
        onClose={() => {
          setShowBulkDeleteConfirm(false);
        }}
        onConfirm={confirmBulkDelete}
        title="מחיקת תמלולים"
        message={'האם אתה בטוח שברצונך למחוק ' + (selectedTranscriptions.size) + ' תמלולים?'}
        subMessage="פעולה זו אינה ניתנת לביטול"
        confirmText={'מחק ' + (selectedTranscriptions.size) + ' תמלולים'}
        cancelText="ביטול"
        type="danger"
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
  return mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0') + '.' + ms.toString().padStart(2, '0');
}

// Helper function to parse time from formatted string back to seconds
function parseTime(timeString: string): number | undefined {
  if (!timeString) return undefined;
  
  // Handle format: "MM:SS.MS" or "MM:SS"
  const parts = timeString.split(':');
  if (parts.length !== 2) return undefined;
  
  const mins = parseInt(parts[0], 10);
  const secParts = parts[1].split('.');
  const secs = parseInt(secParts[0], 10);
  const ms = secParts.length > 1 ? parseInt(secParts[1], 10) : 0;
  
  if (isNaN(mins) || isNaN(secs)) return undefined;
  
  return mins * 60 + secs + (ms / 100);
}