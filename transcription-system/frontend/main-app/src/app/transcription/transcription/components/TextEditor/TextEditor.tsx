'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import TextBlock, { TextBlockData } from './blocks/TextBlock';
import BlockManager from './blocks/BlockManager';
import { SpeakerManager } from '../Speaker/utils/speakerManager';
import { ShortcutManager } from './utils/ShortcutManager';
import { ProcessTextResult } from './types/shortcuts';
import ShortcutsModal from './components/ShortcutsModal';
import BackupStatusIndicator from './components/BackupStatusIndicator';
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
  enabled = true
}: TextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [blocks, setBlocks] = useState<TextBlockData[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [activeArea, setActiveArea] = useState<'speaker' | 'text'>('speaker');
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [speakerColors, setSpeakerColors] = useState<Map<string, string>>(new Map());
  const [cursorAtStart, setCursorAtStart] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [isolatedSpeakers, setIsolatedSpeakers] = useState<Set<string>>(new Set());
  const [showDescriptionTooltips, setShowDescriptionTooltips] = useState(true);
  const [navigationMode, setNavigationMode] = useState(false);
  const [savedMediaTime, setSavedMediaTime] = useState<number | null>(null);
  const [currentMediaTime, setCurrentMediaTime] = useState(0);
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [loadedShortcuts, setLoadedShortcuts] = useState<Map<string, any>>(new Map());
  const [userQuota, setUserQuota] = useState({ used: 0, max: 100 });
  const blockManagerRef = useRef<BlockManager>(new BlockManager());
  const speakerManagerRef = useRef<SpeakerManager>(new SpeakerManager());
  const shortcutManagerRef = useRef<ShortcutManager>(new ShortcutManager('http://localhost:5000/api/transcription/shortcuts'));
  // Track speaker code -> name mappings
  const speakerNamesRef = useRef<Map<string, string>>(new Map());
  
  // Auto-save state
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [currentTranscriptionId] = useState(() => {
    // For now, use a mock ID. In real app, this would come from props or context
    return 'mock-transcription-' + Date.now();
  });
  
  // Function to seek media to a specific time
  const seekToTime = useCallback((time: number) => {
    document.dispatchEvent(new CustomEvent('seekMedia', { 
      detail: { time } 
    }));
  }, []);
  
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
    
    // Initialize shortcuts manager
    const initShortcuts = async () => {
      try {
        // Load shortcuts from public endpoint (no auth required for now)
        const response = await fetch('http://localhost:5000/api/transcription/shortcuts/public');
        if (response.ok) {
          const data = await response.json();
          const shortcutsMap = shortcutManagerRef.current.getAllShortcuts();
          shortcutsMap.clear();
          data.shortcuts.forEach(([shortcut, shortcutData]: [string, any]) => {
            shortcutsMap.set(shortcut, shortcutData);
          });
          console.log('TextEditor: Loaded', shortcutsMap.size, 'shortcuts');
          setLoadedShortcuts(new Map(shortcutsMap));
        }
      } catch (error) {
        console.error('TextEditor: Failed to load shortcuts:', error);
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

  // Handle block update
  const handleBlockUpdate = useCallback((id: string, field: 'speaker' | 'text', value: string) => {
    blockManagerRef.current.updateBlock(id, field, value);
    setBlocks([...blockManagerRef.current.getBlocks()]);
    
    // Update speaker colors if speaker changed
    if (field === 'speaker' && value) {
      const speaker = speakerManagerRef.current.findByName(value);
      if (speaker) {
        setSpeakerColors(prev => new Map(prev).set(value, speaker.color));
      }
    }
    
    // Mark changes for auto-save
    backupService.markChanges();
  }, []);

  // Handle new block creation
  const handleNewBlock = useCallback(() => {
    const currentBlock = blockManagerRef.current.getActiveBlock();
    if (currentBlock) {
      const newBlock = blockManagerRef.current.addBlock(currentBlock.id, currentMediaTime);
      setActiveBlockId(newBlock.id);
      setActiveArea('speaker');
      setBlocks([...blockManagerRef.current.getBlocks()]);
      
      // Mark changes for auto-save
      backupService.markChanges();
    }
  }, [currentMediaTime]);

  // Handle block removal
  const handleRemoveBlock = useCallback((id: string) => {
    blockManagerRef.current.removeBlock(id);
    const newActiveId = blockManagerRef.current.getActiveBlockId();
    const newArea = blockManagerRef.current.getActiveArea();
    
    setActiveBlockId(newActiveId);
    setActiveArea(newArea);
    setBlocks([...blockManagerRef.current.getBlocks()]);
    
    // Mark changes for auto-save
    backupService.markChanges();
  }, []);

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

  // Track which blocks belong to which speaker (by speaker ID)
  const speakerBlocksRef = useRef<Map<string, Set<string>>>(new Map());
  // Track speaker ID to code mapping
  const speakerIdToCodeRef = useRef<Map<string, string>>(new Map());
  
  // Listen for speaker updates
  useEffect(() => {
    const handleSpeakerUpdated = (event: CustomEvent) => {
      const { speakerId, code, name, color, oldCode } = event.detail;
      
      // Get all current blocks first
      const blocks = blockManagerRef.current.getBlocks();
      
      // Build a set of all values that should be updated
      // This includes the old code, and any blocks that currently match this speaker
      const valuesToUpdate = new Set<string>();
      
      // Add the old code if it was changed
      if (oldCode) {
        valuesToUpdate.add(oldCode);
      }
      
      // Add the current code
      if (code) {
        valuesToUpdate.add(code);
      }
      
      // If we have a speaker ID, check what blocks were previously tracked
      if (speakerId) {
        // Get the previously tracked code for this speaker ID
        const previousCode = oldCode || speakerIdToCodeRef.current.get(speakerId);
        if (previousCode) {
          valuesToUpdate.add(previousCode);
        }
        
        // Update speaker ID to code mapping
        if (code) {
          speakerIdToCodeRef.current.set(speakerId, code);
        }
        
        // Get or create the set of blocks for this speaker ID
        if (!speakerBlocksRef.current.has(speakerId)) {
          speakerBlocksRef.current.set(speakerId, new Set());
        }
        const speakerBlockIds = speakerBlocksRef.current.get(speakerId)!;
        
        // Find all blocks that were previously tracked for this speaker
        blocks.forEach(block => {
          if (speakerBlockIds.has(block.id) && block.speaker) {
            valuesToUpdate.add(block.speaker);
          }
        });
      }
      
      // Also check if any blocks currently have a name that matches the code
      // This handles the case where blocks might show "JOHN" when the code is "J"
      if (code && speakerNamesRef.current.has(code)) {
        const previousName = speakerNamesRef.current.get(code);
        if (previousName) {
          valuesToUpdate.add(previousName);
        }
      }
      
      // Determine the new value to use (prioritize name over code)
      const newValue = (name && name.trim()) ? name : (code || '');
      
      // Track speaker name updates
      if (code && name && name.trim()) {
        speakerNamesRef.current.set(code, name);
      } else if (code && !name) {
        speakerNamesRef.current.delete(code);
      }
      
      // Now update all blocks that match any of the values we identified
      let hasUpdates = false;
      blocks.forEach(block => {
        // Check if this block's speaker matches any value that needs updating
        if (block.speaker && valuesToUpdate.has(block.speaker)) {
          // Update the block if the value is different
          if (block.speaker !== newValue) {
            blockManagerRef.current.updateBlock(block.id, 'speaker', newValue);
            hasUpdates = true;
          }
          
          // Track this block for future updates
          if (speakerId) {
            const blockIds = speakerBlocksRef.current.get(speakerId)!;
            blockIds.add(block.id);
          }
        }
      });
      
      // Update color mapping
      if (color) {
        setSpeakerColors(prev => {
          const newMap = new Map(prev);
          
          // Remove old color entries for all values that were updated
          valuesToUpdate.forEach(val => {
            if (val !== newValue) {
              newMap.delete(val);
            }
          });
          
          // Set new color
          newMap.set(newValue, color);
          return newMap;
        });
      }
      
      // Force re-render if there were updates
      if (hasUpdates || valuesToUpdate.size > 0) {
        setBlocks([...blockManagerRef.current.getBlocks()]);
      }
    };
    
    document.addEventListener('speakerUpdated', handleSpeakerUpdated as EventListener);
    document.addEventListener('speakerCreated', handleSpeakerUpdated as EventListener);
    
    return () => {
      document.removeEventListener('speakerUpdated', handleSpeakerUpdated as EventListener);
      document.removeEventListener('speakerCreated', handleSpeakerUpdated as EventListener);
    };
  }, [speakerColors]);
  
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
    
    
    document.addEventListener('speakersSelected', handleSpeakersSelected as EventListener);
    document.addEventListener('toggleDescriptionTooltips', handleToggleTooltips as EventListener);
    document.addEventListener('mediaTimeUpdate', handleMediaTimeUpdate as EventListener);
    document.addEventListener('checkNavigationMode', handleCheckNavigationMode as EventListener);
    document.addEventListener('checkSpeakerInUse', handleCheckSpeakerInUse as EventListener);
    
    return () => {
      document.removeEventListener('speakersSelected', handleSpeakersSelected as EventListener);
      document.removeEventListener('toggleDescriptionTooltips', handleToggleTooltips as EventListener);
      document.removeEventListener('mediaTimeUpdate', handleMediaTimeUpdate as EventListener);
      document.removeEventListener('checkNavigationMode', handleCheckNavigationMode as EventListener);
      document.removeEventListener('checkSpeakerInUse', handleCheckSpeakerInUse as EventListener);
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
          <div className="toolbar-section">
            <button className="toolbar-btn" title="חדש">
              <span className="toolbar-icon">📄</span>
            </button>
            <button className="toolbar-btn" title="שמור">
              <span className="toolbar-icon">💾</span>
            </button>
            <button className="toolbar-btn" title="הדפס">
              <span className="toolbar-icon">🖨️</span>
            </button>
          </div>
          
          <div className="toolbar-divider" />
          
          <div className="toolbar-section">
            <button className="toolbar-btn" title="בטל">
              <span className="toolbar-icon">↶</span>
            </button>
            <button className="toolbar-btn" title="בצע שוב">
              <span className="toolbar-icon">↷</span>
            </button>
          </div>
          
          <div className="toolbar-divider" />
          
          <div className="toolbar-section">
            <button className="toolbar-btn" title="חפש">
              <span className="toolbar-icon">🔍</span>
            </button>
            <button className="toolbar-btn" title="החלף">
              <span className="toolbar-icon">🔄</span>
            </button>
          </div>
          
          <div className="toolbar-divider" />
          
          <div className="toolbar-section">
            <button 
              className={`toolbar-btn ${shortcutsEnabled ? 'active' : ''}`} 
              title="ניהול קיצורים"
              onClick={() => setShowShortcutsModal(true)}
            >
              <span className="toolbar-icon">⌨️</span>
            </button>
          </div>
          
          <div className="toolbar-divider" />
          
          <div className="toolbar-section">
            <button 
              className={`toolbar-btn ${navigationMode ? 'active' : ''}`} 
              title={navigationMode ? "כבה מצב ניווט" : "הפעל מצב ניווט"}
              onClick={() => {
                if (navigationMode) {
                  // Turning OFF navigation mode - restore saved time if exists
                  setNavigationMode(false);
                  if (savedMediaTime !== null) {
                    seekToTime(savedMediaTime);
                    setSavedMediaTime(null);
                  }
                } else {
                  // Turning ON navigation mode - save current time
                  setNavigationMode(true);
                  setSavedMediaTime(currentMediaTime);
                }
              }}
            >
              <span className="toolbar-icon">🧭</span>
            </button>
            <button className="toolbar-btn" title="הגדרות">
              <span className="toolbar-icon">⚙️</span>
            </button>
          </div>
          
          <div className="toolbar-divider" />
          
          <div className="toolbar-section">
            <button 
              className="toolbar-btn" 
              title="הקטן גופן"
              onClick={() => setFontSize(prev => Math.max(12, prev - 1))}
            >
              <span className="toolbar-icon">A-</span>
            </button>
            <span className="font-size-display">{fontSize}</span>
            <button 
              className="toolbar-btn" 
              title="הגדל גופן"
              onClick={() => setFontSize(prev => Math.min(24, prev + 1))}
            >
              <span className="toolbar-icon">A+</span>
            </button>
          </div>
          
          <div className="toolbar-spacer" />
          
          <div className="toolbar-section">
            <button 
              className={`sync-button ${syncEnabled ? 'active' : ''}`}
              onClick={() => setSyncEnabled(!syncEnabled)}
              title="סנכרון עם נגן"
            >
              <span className="sync-icon">🔗</span>
              <span className="sync-text">סנכרון</span>
            </button>
          </div>
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
          className="text-editor-content blocks-container"
        >
          {blocks.map((block, index) => (
            <TextBlock
              key={block.id}
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
              isIsolated={isolatedSpeakers.size === 0 || isolatedSpeakers.has(block.speaker)}
              showDescriptionTooltips={showDescriptionTooltips}
            />
          ))}
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