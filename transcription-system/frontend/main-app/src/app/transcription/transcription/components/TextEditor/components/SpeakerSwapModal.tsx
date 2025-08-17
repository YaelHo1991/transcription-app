'use client';

import React, { useState, useEffect, useRef } from 'react';
import './SpeakerSwapModal.css';

interface SpeakerSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  blocks: Array<{ speaker: string }>;
  selectedBlocks: Set<number>;
  selectedBlockRange: { start: number; end: number } | null;
  onSwap: (fromSpeaker: string, toSpeaker: string, applyToSelected: boolean) => void;
}

export default function SpeakerSwapModal({
  isOpen,
  onClose,
  blocks,
  selectedBlocks,
  selectedBlockRange,
  onSwap
}: SpeakerSwapModalProps) {
  const [speakers, setSpeakers] = useState<string[]>([]);
  const [speakerSwaps, setSpeakerSwaps] = useState<Map<string, string>>(new Map());
  const [swapMode, setSwapMode] = useState<'global' | 'selected'>('global');
  const [position, setPosition] = useState({ x: 0, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  // Initialize position on client side
  useEffect(() => {
    if (typeof window !== 'undefined' && isOpen) {
      setPosition({ x: window.innerWidth / 2 - 250, y: 100 });
    }
  }, [isOpen]);

  // Extract speakers when modal opens or swap mode changes
  useEffect(() => {
    if (!isOpen) return;
    
    // Extract unique speakers from blocks
    const speakerSet = new Set<string>();
    
    // Get all speakers - simplified logic
    blocks.forEach(block => {
      if (block.speaker) {
        speakerSet.add(block.speaker);
      }
    });
    
    setSpeakers(Array.from(speakerSet).sort());
    // Reset swaps when opening
    if (!speakerSwaps.size) {
      setSpeakerSwaps(new Map());
    }
  }, [isOpen]); // Removed other dependencies to prevent loops

  const handleSwap = () => {
    // Check if we have exactly 2 swaps that are bidirectional
    const swapEntries = Array.from(speakerSwaps.entries());
    
    if (swapEntries.length === 2) {
      const [speaker1, target1] = swapEntries[0];
      const [speaker2, target2] = swapEntries[1];
      
      // Check if it's a bidirectional swap (A->B and B->A)
      if (speaker1 === target2 && speaker2 === target1) {
        console.log('Bidirectional swap detected:', speaker1, '<->', speaker2);
        
        // For bidirectional swap, we need to pass both speakers to the parent
        // The parent should handle the swap atomically
        // Create a special event for bidirectional swap
        const event = new CustomEvent('bidirectionalSwap', {
          detail: {
            speaker1,
            speaker2,
            applyToSelected: swapMode === 'selected'
          }
        });
        document.dispatchEvent(event);
        onClose();
        return;
      }
    }
    
    // Regular swaps (not bidirectional)
    speakerSwaps.forEach((toSpeaker, fromSpeaker) => {
      if (fromSpeaker !== toSpeaker) {
        onSwap(fromSpeaker, toSpeaker, swapMode === 'selected');
      }
    });
    onClose();
  };

  const handleSpeakerChange = (speaker: string, newValue: string) => {
    setSpeakerSwaps(prev => {
      const newMap = new Map(prev);
      if (newValue === speaker || newValue === '') {
        // Reset to original
        newMap.delete(speaker);
      } else {
        newMap.set(speaker, newValue);
        
        // AUTO-DETECT BIDIRECTIONAL SWAP
        // If user selected A->B, check if B is already mapped
        // If B is not mapped, automatically set B->A
        const existingSwapForTarget = Array.from(newMap.entries()).find(
          ([from, to]) => from === newValue && from !== speaker
        );
        
        if (!existingSwapForTarget) {
          // Check if this creates a bidirectional swap opportunity
          // Only auto-swap if the target speaker exists and isn't already swapped
          if (speakers.includes(newValue) && !newMap.has(newValue)) {
            console.log('Auto-detecting bidirectional swap:', newValue, '->', speaker);
            newMap.set(newValue, speaker);
          }
        }
      }
      return newMap;
    });
  };

  // Dragging functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('modal-header') || 
        (e.target as HTMLElement).closest('.modal-header')) {
      setIsDragging(true);
      dragStart.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y
      };
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.current.x,
          y: e.clientY - dragStart.current.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const hasSelection = selectedBlocks.size > 0 || selectedBlockRange !== null;
  const hasChanges = speakerSwaps.size > 0;

  if (!isOpen) return null;

  return (
    <div 
      ref={modalRef}
      className="speaker-swap-window"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
    >
        <div 
          className="modal-header draggable"
          onMouseDown={handleMouseDown}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <h2>החלף דוברים</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {hasSelection && (
            <div className="swap-mode-selector">
              <label>
                <input
                  type="radio"
                  value="global"
                  checked={swapMode === 'global'}
                  onChange={(e) => setSwapMode(e.target.value as 'global' | 'selected')}
                />
                <span>החלף בכל הטקסט</span>
              </label>
              <label>
                <input
                  type="radio"
                  value="selected"
                  checked={swapMode === 'selected'}
                  onChange={(e) => setSwapMode(e.target.value as 'global' | 'selected')}
                />
                <span>החלף בבלוקים הנבחרים בלבד</span>
              </label>
            </div>
          )}
          
          <div className="speakers-list">
            <div className="list-header">
              <span>דובר נוכחי</span>
              <span></span>
              <span>החלף ל</span>
            </div>
            {speakers.map(speaker => {
              const swappedTo = speakerSwaps.get(speaker);
              return (
                <div key={speaker} className="speaker-row">
                  <div className="current-speaker">
                    {speaker}
                  </div>
                  <div className="swap-arrow">←</div>
                  <select
                    className="swap-select"
                    value={swappedTo || ''}
                    onChange={(e) => handleSpeakerChange(speaker, e.target.value)}
                  >
                    <option value="">ללא שינוי</option>
                    {speakers.filter(s => s !== speaker).map(otherSpeaker => (
                      <option key={otherSpeaker} value={otherSpeaker}>
                        {otherSpeaker}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
          
          {hasChanges && (
            <div className="swap-summary">
              <h4>סיכום שינויים:</h4>
              {Array.from(speakerSwaps.entries()).map(([from, to]) => (
                <div key={from} className="swap-item">
                  {from} ← {to}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <button 
            className="btn-primary" 
            onClick={handleSwap}
            disabled={!hasChanges}
          >
            החלף הכל
          </button>
          <button 
            className="btn-secondary" 
            onClick={() => {
              setSpeakerSwaps(new Map());
            }}
          >
            אפס
          </button>
          <button className="btn-secondary" onClick={onClose}>
            סגור
          </button>
        </div>
      </div>
  );
}