'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import TextBlock, { TextBlockData } from './blocks/TextBlock';
import BlockManager from './blocks/BlockManager';
import { SpeakerManager } from '../Speaker/utils/speakerManager';
import { useMediaSync } from './hooks/useMediaSync';
import { TextEditorProps, SyncedMark, EditorPosition } from './types';
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
  const blockManagerRef = useRef<BlockManager>(new BlockManager());
  const speakerManagerRef = useRef<SpeakerManager>(new SpeakerManager());
  // Track speaker code -> name mappings
  const speakerNamesRef = useRef<Map<string, string>>(new Map());
  
  // Initialize blocks
  useEffect(() => {
    const initialBlocks = blockManagerRef.current.getBlocks();
    setBlocks([...initialBlocks]);
    if (initialBlocks.length > 0) {
      setActiveBlockId(initialBlocks[0].id);
      setActiveArea('speaker');
    }
  }, []);

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

  // Handle block navigation
  const handleNavigate = useCallback((blockId: string, direction: 'prev' | 'next' | 'up' | 'down' | 'speaker' | 'text', fromField: 'speaker' | 'text' = 'speaker') => {
    blockManagerRef.current.setActiveBlock(blockId, fromField);
    blockManagerRef.current.navigate(direction);
    
    const newBlockId = blockManagerRef.current.getActiveBlockId();
    const newArea = blockManagerRef.current.getActiveArea();
    
    setActiveBlockId(newBlockId);
    setActiveArea(newArea);
    setCursorAtStart(false); // Reset cursor position flag
    setBlocks([...blockManagerRef.current.getBlocks()]);
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
  }, []);

  // Handle new block creation
  const handleNewBlock = useCallback(() => {
    const currentBlock = blockManagerRef.current.getActiveBlock();
    if (currentBlock) {
      const newBlock = blockManagerRef.current.addBlock(currentBlock.id);
      setActiveBlockId(newBlock.id);
      setActiveArea('speaker');
      setBlocks([...blockManagerRef.current.getBlocks()]);
    }
  }, []);

  // Handle block removal
  const handleRemoveBlock = useCallback((id: string) => {
    blockManagerRef.current.removeBlock(id);
    const newActiveId = blockManagerRef.current.getActiveBlockId();
    const newArea = blockManagerRef.current.getActiveArea();
    
    setActiveBlockId(newActiveId);
    setActiveArea(newArea);
    setBlocks([...blockManagerRef.current.getBlocks()]);
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
        
        // Track which blocks belong to this speaker code
        if (!speakerBlocksRef.current.has(code)) {
          speakerBlocksRef.current.set(code, new Set());
        }
        
        // Add current block to the speaker's block set
        const currentBlockId = blockManagerRef.current.getActiveBlockId();
        if (currentBlockId) {
          speakerBlocksRef.current.get(code)!.add(currentBlockId);
        }
        
        resolve(event.detail.name);
      };
      
      document.addEventListener('speakerCreated', handleResponse as EventListener);
      
      // Request speaker transformation
      document.dispatchEvent(new CustomEvent('speakerTabRequest', {
        detail: {
          code,
          callback: (name: string | null) => {
            if (!name) {
              document.removeEventListener('speakerCreated', handleResponse as EventListener);
            }
            
            // Track which blocks belong to this speaker code
            if (name && code) {
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

  // Track which blocks belong to which speaker code
  const speakerBlocksRef = useRef<Map<string, Set<string>>>(new Map());
  
  // Listen for speaker updates
  useEffect(() => {
    const handleSpeakerUpdated = (event: CustomEvent) => {
      const { code, name, color } = event.detail;
      
      // Update color mapping - use name if available, otherwise use code
      const speakerKey = name && name.trim() ? name : code;
      setSpeakerColors(prev => new Map(prev).set(speakerKey, color));
      
      // Track speaker name updates
      if (name && name.trim()) {
        speakerNamesRef.current.set(code, name);
      }
      
      // Get or create the set of blocks for this speaker code
      if (!speakerBlocksRef.current.has(code)) {
        speakerBlocksRef.current.set(code, new Set());
      }
      const speakerBlockIds = speakerBlocksRef.current.get(code)!;
      
      // Update all blocks that belong to this speaker
      const blocks = blockManagerRef.current.getBlocks();
      blocks.forEach(block => {
        // Check if this block belongs to this speaker (by code or any partial name)
        // The block could have the code or any version of the name
        if (block.speaker === code || speakerBlockIds.has(block.id)) {
          // Track this block as belonging to this speaker
          speakerBlockIds.add(block.id);
          
          // Update to the new name if we have one
          const newValue = name && name.trim() ? name : code;
          if (block.speaker !== newValue) {
            blockManagerRef.current.updateBlock(block.id, 'speaker', newValue);
          }
        }
      });
      
      setBlocks([...blockManagerRef.current.getBlocks()]);
    };
    
    document.addEventListener('speakerUpdated', handleSpeakerUpdated as EventListener);
    document.addEventListener('speakerCreated', handleSpeakerUpdated as EventListener);
    
    return () => {
      document.removeEventListener('speakerUpdated', handleSpeakerUpdated as EventListener);
      document.removeEventListener('speakerCreated', handleSpeakerUpdated as EventListener);
    };
  }, []);

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
            <button className="toolbar-btn" title="הגדרות">
              <span className="toolbar-icon">⚙️</span>
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
              speakerColor={speakerColors.get(block.speaker)}
              currentTime={0}  // DISABLED - not passing actual time
            />
          ))}
        </div>
      </div>
      
      <div className="text-editor-footer">
        <span className="word-count">מילים: {stats.totalWords}</span>
        <span className="char-count">תווים: {stats.totalCharacters}</span>
        <span className="speaker-count">דוברים: {stats.speakers.size}</span>
        {activeMark && (
          <span className="current-mark-indicator">
            סימון נוכחי: {activeMark.type} ({formatTime(activeMark.time)})
          </span>
        )}
      </div>
      </div>
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