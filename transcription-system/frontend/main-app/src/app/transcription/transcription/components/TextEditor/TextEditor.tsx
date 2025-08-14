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
  const blockManagerRef = useRef<BlockManager>(new BlockManager());
  const speakerManagerRef = useRef<SpeakerManager>(new SpeakerManager());
  
  // Initialize blocks
  useEffect(() => {
    const initialBlocks = blockManagerRef.current.getBlocks();
    setBlocks([...initialBlocks]);
    if (initialBlocks.length > 0) {
      setActiveBlockId(initialBlocks[0].id);
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
  const handleNavigate = useCallback((blockId: string, direction: 'prev' | 'next' | 'speaker' | 'text') => {
    blockManagerRef.current.setActiveBlock(blockId, activeArea);
    blockManagerRef.current.navigate(direction);
    
    const newBlockId = blockManagerRef.current.getActiveBlockId();
    const newArea = blockManagerRef.current.getActiveArea();
    
    setActiveBlockId(newBlockId);
    setActiveArea(newArea);
    setBlocks([...blockManagerRef.current.getBlocks()]);
  }, [activeArea]);

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

  // Handle speaker transformation
  const handleSpeakerTransform = useCallback(async (code: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const handleResponse = (event: CustomEvent) => {
        document.removeEventListener('speakerCreated', handleResponse as EventListener);
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
            resolve(name);
          }
        }
      }));
    });
  }, []);

  // Listen for speaker updates
  useEffect(() => {
    const handleSpeakerUpdated = (event: CustomEvent) => {
      const { code, name, color } = event.detail;
      setSpeakerColors(prev => new Map(prev).set(name, color));
      
      // Update all blocks with this speaker
      const blocks = blockManagerRef.current.getBlocks();
      blocks.forEach(block => {
        if (block.speaker === code || block.speaker === name) {
          blockManagerRef.current.updateBlock(block.id, 'speaker', name);
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
          {blocks.map((block) => (
            <TextBlock
              key={block.id}
              block={block}
              isActive={block.id === activeBlockId}
              activeArea={block.id === activeBlockId ? activeArea : 'speaker'}
              onNavigate={(direction) => handleNavigate(block.id, direction)}
              onUpdate={handleBlockUpdate}
              onNewBlock={handleNewBlock}
              onRemoveBlock={handleRemoveBlock}
              onSpeakerTransform={handleSpeakerTransform}
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