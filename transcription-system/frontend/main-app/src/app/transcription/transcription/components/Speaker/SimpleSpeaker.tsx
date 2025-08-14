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
  const [selectedSpeakers, setSelectedSpeakers] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [showDescriptionTooltips, setShowDescriptionTooltips] = useState(true);
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
    // Get the old value before updating
    const oldBlock = blockManagerRef.current.getBlocks().find(b => b.id === id);
    const oldCode = oldBlock?.code;
    
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
        // Always send speaker update with ID for tracking
        document.dispatchEvent(new CustomEvent('speakerUpdated', {
          detail: {
            speakerId: block.id,  // Send the unique speaker ID
            code: block.code,
            name: block.name,
            color: block.color,
            oldCode: field === 'code' ? oldCode : undefined
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
  
  // Handle drag and drop for reordering
  const handleDragStart = useCallback((e: React.DragEvent, blockId: string) => {
    setDraggedBlockId(blockId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    
    if (!draggedBlockId || draggedBlockId === targetId) return;
    
    const currentBlocks = [...blockManagerRef.current.getBlocks()];
    const draggedIndex = currentBlocks.findIndex(b => b.id === draggedBlockId);
    const targetIndex = currentBlocks.findIndex(b => b.id === targetId);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      // Remove dragged block
      const [draggedBlock] = currentBlocks.splice(draggedIndex, 1);
      
      // Insert at new position
      const newTargetIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
      currentBlocks.splice(newTargetIndex, 0, draggedBlock);
      
      // Update internal state - just reassign the blocks array
      blockManagerRef.current.blocks = currentBlocks;
      setBlocks([...currentBlocks]);
    }
    
    setDraggedBlockId(null);
  }, [draggedBlockId]);
  
  // Handle speaker selection
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedSpeakers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      
      // Defer the event dispatch to avoid setState during render
      setTimeout(() => {
        const selectedSpeakerData = Array.from(newSet).map(speakerId => {
          const block = blockManagerRef.current.getBlocks().find(b => b.id === speakerId);
          return block ? { code: block.code, name: block.name } : null;
        }).filter(data => data && data.code);
        
        // Send both codes and names for matching
        const selectedIdentifiers = new Set<string>();
        selectedSpeakerData.forEach(data => {
          if (data) {
            selectedIdentifiers.add(data.code);
            if (data.name) selectedIdentifiers.add(data.name);
          }
        });
        
        document.dispatchEvent(new CustomEvent('speakersSelected', {
          detail: { selectedCodes: Array.from(selectedIdentifiers) }
        }));
      }, 0);
      
      return newSet;
    });
  }, []);
  
  // Check if a speaker is in use in the TextEditor
  const checkSpeakerInUse = useCallback((speakerCode: string, speakerName?: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const checkEvent = new CustomEvent('checkSpeakerInUse', {
        detail: {
          code: speakerCode,
          name: speakerName,
          callback: (inUse: boolean) => resolve(inUse)
        }
      });
      document.dispatchEvent(checkEvent);
    });
  }, []);
  
  // Handle block removal
  const handleRemoveBlock = useCallback(async (id: string, deleteNext = false) => {
    const block = blockManagerRef.current.getBlocks().find(b => b.id === id);
    
    // Check if this speaker has a code and if it's in use
    if (block && block.code) {
      const inUse = await checkSpeakerInUse(block.code, block.name);
      if (inUse) {
        // Show error message and prevent deletion
        const displayName = block.name || block.code;
        alert(`לא ניתן למחוק את הדובר "${displayName}" (קוד: ${block.code}) כי הוא בשימוש בעורך הטקסט.\nניתן לשנות את הקוד, אך לא למחוק אותו.`);
        // Important: Return here to prevent deletion
        return;
      }
    }
    
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
  }, [checkSpeakerInUse]);
  
  // Helper to get available code
  const getAvailableCode = useCallback((name?: string, excludeId?: string): string => {
    const blocks = blockManagerRef.current.getBlocks();
    const usedCodes = new Set(blocks.filter(b => b.id !== excludeId && b.code).map(b => b.code));
    
    // All available single-char codes
    const allCodes = [
      ...'אבגדהוזחטיכלמנסעפצקרשת',
      ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      ...'0123456789',
      ...'.,/-*+!?'
    ];
    
    // If name provided, try to match first letter
    if (name && name.length > 0) {
      const firstChar = name[0].toUpperCase();
      if (!usedCodes.has(firstChar) && allCodes.includes(firstChar)) {
        return firstChar;
      }
      
      // Try first letter in Hebrew if name is Hebrew
      const hebrewFirst = name[0];
      if (/[֐-׿]/.test(hebrewFirst) && !usedCodes.has(hebrewFirst)) {
        return hebrewFirst;
      }
    }
    
    // Find first available code
    return allCodes.find(code => !usedCodes.has(code)) || '';
  }, []);
  
  useEffect(() => {
    // Listen for available code requests
    const handleGetAvailableCode = (event: CustomEvent) => {
      const { name, excludeId, callback } = event.detail;
      const code = getAvailableCode(name, excludeId);
      if (callback) {
        callback(code);
      }
    };
    
    document.addEventListener('getAvailableCode', handleGetAvailableCode as EventListener);
    
    // Listen for speaker info requests
    const handleGetSpeakerInfo = (event: CustomEvent) => {
      const { speakerIdentifier, callback } = event.detail;
      
      const block = blockManagerRef.current.getBlocks().find(b => 
        b.code === speakerIdentifier || b.name === speakerIdentifier
      );
      
      if (callback) {
        callback(block ? { description: block.description } : null);
      }
    };
    
    document.addEventListener('getSpeakerInfo', handleGetSpeakerInfo as EventListener);
    
    // Listen for speaker suggestion requests
    const handleGetSpeakerSuggestion = (event: CustomEvent) => {
      const { prefix, callback } = event.detail;
      
      if (prefix && prefix.length >= 2) {
        // Find first speaker whose name starts with prefix
        const matchingBlock = blockManagerRef.current.getBlocks().find(b => 
          b.name && b.name.toLowerCase().startsWith(prefix.toLowerCase())
        );
        
        if (callback) {
          callback(matchingBlock ? matchingBlock.name : null);
        }
      } else {
        if (callback) {
          callback(null);
        }
      }
    };
    
    document.addEventListener('getSpeakerSuggestion', handleGetSpeakerSuggestion as EventListener);
    
    // Listen for speaker requests from TextEditor
    const handleSpeakerRequest = (event: CustomEvent) => {
      const { code, callback } = event.detail;
      
      // Single character = always treat as code
      if (code.length === 1) {
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
              speakerId: block.id,  // Send the unique speaker ID
              code: block.code,
              name: block.name,
              color: block.color
            }
          }));
        }
        
        if (callback) {
          const returnValue = block.name && block.name.trim() ? block.name : block.code;
          callback(returnValue);
        }
        
      } else {
        // 2+ characters = look for existing name or create speaker without code
        let block = blockManagerRef.current.findByName(code);
        
        if (!block) {
          // Create new speaker with name but suggest a code
          const suggestedCode = getAvailableCode(code);
          const emptyBlock = blockManagerRef.current.getBlocks().find(
            b => !b.code && !b.name && !b.description
          );
          
          if (emptyBlock) {
            // Use empty block with suggested code
            blockManagerRef.current.updateBlock(emptyBlock.id, 'code', suggestedCode);
            blockManagerRef.current.updateBlock(emptyBlock.id, 'name', code);
            block = blockManagerRef.current.getBlocks().find(b => b.id === emptyBlock.id);
          } else {
            // Create new block with suggested code and name
            block = blockManagerRef.current.addBlock(suggestedCode, code, '');
          }
          
          // Update UI
          const allBlocks = blockManagerRef.current.getBlocks();
          setBlocks(() => [...allBlocks]);
          
          // Notify TextEditor
          document.dispatchEvent(new CustomEvent('speakerCreated', {
            detail: {
              speakerId: block.id,  // Send the unique speaker ID
              code: block.code,
              name: block.name,
              color: block.color
            }
          }));
        }
        
        if (callback) {
          callback(block.name);
        }
      }
    };

    document.addEventListener('speakerTabRequest', handleSpeakerRequest as EventListener);
    return () => {
      document.removeEventListener('getAvailableCode', handleGetAvailableCode as EventListener);
      document.removeEventListener('getSpeakerInfo', handleGetSpeakerInfo as EventListener);
      document.removeEventListener('getSpeakerSuggestion', handleGetSpeakerSuggestion as EventListener);
      document.removeEventListener('speakerTabRequest', handleSpeakerRequest as EventListener);
    };
  }, [getAvailableCode]);

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
    <div className={`simple-speaker-panel ${isSelectionMode ? 'selection-mode' : ''}`} ref={panelRef} onClick={handlePanelClick}>
      <div className="speaker-panel-header">
        <h3>רשימת דוברים</h3>
        <div className="speaker-header-controls">
          {stats.totalSpeakers >= 2 && (
            <button 
              className={`selection-mode-btn ${isSelectionMode ? 'active' : ''}`}
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                if (isSelectionMode) {
                  // Exiting selection mode - clear selections
                  setSelectedSpeakers(new Set());
                  // Defer the event dispatch
                  setTimeout(() => {
                    document.dispatchEvent(new CustomEvent('speakersSelected', {
                      detail: { selectedCodes: [] }
                    }));
                  }, 0);
                }
              }}
              title={isSelectionMode ? "יציאה ממצב בחירה" : "מצב בחירה"}
            >
              <span style={{ 
                display: 'inline-block',
                width: '16px',
                height: '16px',
                border: '2px solid rgba(255, 255, 255, 0.9)',
                borderRadius: '3px',
                position: 'relative',
                backgroundColor: isSelectionMode ? 'rgba(255, 255, 255, 0.2)' : 'transparent'
              }}>
                {isSelectionMode && (
                  <span style={{
                    position: 'absolute',
                    top: '-5px',
                    left: '1px',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>✓</span>
                )}
              </span>
            </button>
          )}
          {isSelectionMode && selectedSpeakers.size > 0 && (
            <span className="selected-count">{selectedSpeakers.size}</span>
          )}
          {stats.totalSpeakers > 0 && (
            <span className="speaker-count-badge">{stats.totalSpeakers}</span>
          )}
        </div>
      </div>
      <div className="speaker-table-header">
        {isSelectionMode && <span>בחר</span>}
        <span>קוד</span>
        <span>שם</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-start' }}>
          תיאור
          <button
            className={`description-tooltip-toggle ${showDescriptionTooltips ? 'active' : ''}`}
            onClick={() => {
              setShowDescriptionTooltips(!showDescriptionTooltips);
              // Notify TextEditor about the change
              document.dispatchEvent(new CustomEvent('toggleDescriptionTooltips', {
                detail: { enabled: !showDescriptionTooltips }
              }));
            }}
            title={showDescriptionTooltips ? "הסתר תיאורים" : "הצג תיאורים"}
          >
            <span className="toggle-indicator" />
          </button>
        </span>
        <span></span>
      </div>
      <div className="speaker-list" onClick={handlePanelClick}>
        {blocks.map((block, index) => (
          <SpeakerBlock
            key={block.id}
            speaker={block}
            isActive={block.id === activeBlockId}
            isFirstBlock={index === 0}
            isLastBlock={index === blocks.length - 1}
            isSelected={selectedSpeakers.has(block.id)}
            isSelectionMode={isSelectionMode}
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
            onToggleSelect={() => handleToggleSelect(block.id)}
            onDragStart={(e) => handleDragStart(e, block.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, block.id)}
          />
        ))}
      </div>
      
    </div>
  );
}