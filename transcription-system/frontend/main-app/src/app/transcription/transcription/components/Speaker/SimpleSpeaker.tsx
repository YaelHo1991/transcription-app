'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SpeakerManager } from './utils/speakerManager';
import SpeakerBlock, { SpeakerBlockData } from './blocks/SpeakerBlock';
import SpeakerBlockManager from './blocks/SpeakerBlockManager';
import './SimpleSpeaker.css';

interface SimpleSpeakerProps {
  theme?: 'transcription' | 'proofreading';
}

export default function SimpleSpeaker({ theme = 'transcription' }: SimpleSpeakerProps) {
  const [blocks, setBlocks] = useState<SpeakerBlockData[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<'code' | 'name' | 'description'>('code');
  const [cursorAtStart, setCursorAtStart] = useState(false);
  const blockManagerRef = useRef<SpeakerBlockManager>(new SpeakerBlockManager());
  const [speakerManager] = useState(() => new SpeakerManager());
  
  // Initialize blocks
  useEffect(() => {
    const initialBlocks = blockManagerRef.current.getBlocks();
    setBlocks([...initialBlocks]);
    // Don't set any block as active by default - wait for user interaction
  }, []);

  // Handle block navigation
  const handleNavigate = useCallback((blockId: string, direction: 'prev' | 'next' | 'up' | 'down' | 'code' | 'name' | 'description', cursorStart = false) => {
    blockManagerRef.current.setActiveBlock(blockId, activeField);
    const result = blockManagerRef.current.navigate(direction);
    
    const newBlockId = blockManagerRef.current.getActiveBlockId();
    const newField = blockManagerRef.current.getActiveField();
    
    setActiveBlockId(newBlockId);
    setActiveField(newField);
    setCursorAtStart(cursorStart);
    setBlocks([...blockManagerRef.current.getBlocks()]);
    
    // If TAB from last block's description, focus remarks immediately
    if (result === 'exit-to-remarks') {
      // Small timeout to ensure focus has left the block
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('focusRemarks'));
      }, 0);
    }
  }, [activeField]);
  
  // Handle block update
  const handleBlockUpdate = useCallback((id: string, field: 'code' | 'name' | 'description', value: string) => {
    // Validate unique code if updating code field
    if (field === 'code' && value) {
      if (!blockManagerRef.current.validateUniqueCode(value, id)) {
        // Code already exists - don't update
        return false;
      }
    }
    
    blockManagerRef.current.updateBlock(id, field, value);
    setBlocks([...blockManagerRef.current.getBlocks()]);
    
    // Notify TextEditor of speaker update
    if (field === 'name' || field === 'code') {
      const block = blockManagerRef.current.getBlocks().find(b => b.id === id);
      if (block) {
        document.dispatchEvent(new CustomEvent('speakerUpdated', {
          detail: {
            code: block.code,
            name: block.name,
            color: block.color
          }
        }));
      }
    }
  }, []);
  
  // Handle new block creation
  const handleNewBlock = useCallback(() => {
    const currentBlock = blockManagerRef.current.getActiveBlock();
    if (currentBlock) {
      const newBlock = blockManagerRef.current.addBlock('', '', '', currentBlock.id);
      setActiveBlockId(newBlock.id);
      setActiveField('code');
      setBlocks([...blockManagerRef.current.getBlocks()]);
    }
  }, []);
  
  // Handle block removal
  const handleRemoveBlock = useCallback((id: string, deleteNext = false) => {
    const direction = deleteNext ? 'next' : 'current';
    
    // Store the current state before removal
    const wasRemovingCurrent = direction === 'current';
    
    blockManagerRef.current.removeBlock(id, direction);
    
    const newActiveId = blockManagerRef.current.getActiveBlockId();
    const newField = blockManagerRef.current.getActiveField();
    
    setActiveBlockId(newActiveId);
    setActiveField(newField);
    
    // When removing current block via BACKSPACE, ensure cursor is at end of description
    if (wasRemovingCurrent && newField === 'description') {
      setCursorAtStart(false);
    }
    
    setBlocks([...blockManagerRef.current.getBlocks()]);
  }, []);
  
  useEffect(() => {
    // Listen for speaker requests from TextEditor
    const handleSpeakerRequest = (event: CustomEvent) => {
      const { code, callback } = event.detail;
      
      let block = blockManagerRef.current.findByCode(code);
      
      if (!block) {
        // Check if there's an empty block we can use
        const emptyBlock = blockManagerRef.current.getBlocks().find(
          b => !b.code && !b.name && !b.description
        );
        
        if (emptyBlock) {
          // Use the empty block
          blockManagerRef.current.updateBlock(emptyBlock.id, 'code', code);
          // Leave the name empty initially
          blockManagerRef.current.updateBlock(emptyBlock.id, 'name', '');
          
          // Get the updated block
          block = blockManagerRef.current.getBlocks().find(b => b.id === emptyBlock.id);
        } else {
          // Only create a new block if no empty blocks exist
          // Leave the name empty initially
          block = blockManagerRef.current.addBlock(code, '', '');
        }
        
        // Get fresh blocks and force complete re-render
        const allBlocks = blockManagerRef.current.getBlocks();
        
        // Force React to see this as a new array
        setBlocks(() => [...allBlocks]);
        
        // Notify TextEditor of new speaker
        document.dispatchEvent(new CustomEvent('speakerCreated', {
          detail: {
            code: block.code,
            name: block.name,
            color: block.color
          }
        }));
      }
      
      if (callback) {
        // Return the name if it's not empty, otherwise return the code
        // Note: empty string is falsy but we need to check explicitly
        const returnValue = block.name && block.name.trim() ? block.name : block.code;
        callback(returnValue);
      }
    };

    document.addEventListener('speakerTabRequest', handleSpeakerRequest as EventListener);
    return () => {
      document.removeEventListener('speakerTabRequest', handleSpeakerRequest as EventListener);
    };
  }, []);

  const handleAddSpeaker = () => {
    const newBlock = blockManagerRef.current.addBlock();
    setActiveBlockId(newBlock.id);
    setActiveField('code');
    setBlocks([...blockManagerRef.current.getBlocks()]);
  };
  
  const stats = blockManagerRef.current.getStatistics();

  const handlePanelClick = (e: React.MouseEvent) => {
    // If clicking on the panel background (not on a block), exit editing
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('speaker-list')) {
      setActiveBlockId(null);
      setActiveField('code');
    }
  };
  
  // Handle TAB when no block is active
  const panelRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle TAB if the speaker panel contains the active element
      if (e.key === 'Tab' && !activeBlockId && panelRef.current?.contains(document.activeElement)) {
        e.preventDefault();
        // Focus remarks in TextEditor
        document.dispatchEvent(new CustomEvent('focusRemarks'));
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeBlockId]);

  return (
    <div className="simple-speaker-panel" ref={panelRef} onClick={handlePanelClick}>
      <div className="speaker-panel-header">
        <h3>רשימת דוברים</h3>
        {stats.totalSpeakers > 0 && (
          <span className="speaker-count-badge">{stats.totalSpeakers}</span>
        )}
      </div>
      <div className="speaker-table-header">
        <span>קוד</span>
        <span>שם</span>
        <span>תיאור</span>
        <span></span>
      </div>
      <div className="speaker-list" onClick={handlePanelClick}>
        {blocks.map((block, index) => (
          <SpeakerBlock
            key={block.id}
            speaker={block}
            isActive={block.id === activeBlockId}
            isLastBlock={index === blocks.length - 1}
            activeField={block.id === activeBlockId ? activeField : 'code'}
            cursorAtStart={block.id === activeBlockId ? cursorAtStart : false}
            onNavigate={(direction, cursorStart) => handleNavigate(block.id, direction, cursorStart)}
            onUpdate={handleBlockUpdate}
            onNewBlock={handleNewBlock}
            onRemoveBlock={handleRemoveBlock}
            onValidateCode={(code, excludeId) => blockManagerRef.current.validateUniqueCode(code, excludeId)}
            onExitToRemarks={() => {
              setActiveBlockId(null);
              setActiveField('code');
              document.dispatchEvent(new CustomEvent('focusRemarks'));
            }}
          />
        ))}
      </div>
      
    </div>
  );
}