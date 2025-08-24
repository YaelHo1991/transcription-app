import React, { useRef, useCallback, useEffect, useState } from 'react';
import TextBlock from './blocks/TextBlock';
import { TextBlockData } from './blocks/TextBlock';

interface SlidingWindowTextEditorProps {
  blocks: TextBlockData[];
  activeBlockId: string | null;
  activeArea: 'speaker' | 'text';
  cursorAtStart: boolean;
  selectedBlocks: Set<string>;
  searchResults: any[];
  currentSearchIndex: number;
  speakerColors: Map<string, string>;
  fontSize: number;
  fontFamily: 'default' | 'david';
  isolatedSpeakers: Set<string>;
  showDescriptionTooltips: boolean;
  blockViewEnabled: boolean;
  autoCorrectEngine: any;
  onNavigate: (blockId: string, direction: any, fromField: any) => void;
  onUpdate: (id: string, field: 'speaker' | 'text', value: string) => void;
  onNewBlock: () => void;
  onRemoveBlock: (id: string) => void;
  onSpeakerTransform: (code: string) => Promise<string | null>;
  onDeleteAcrossBlocks: (blockId: string, fromField: 'speaker' | 'text') => void;
  onProcessShortcuts: (text: string, position: number) => any;
  onBlockClick: (index: number, ctrlKey: boolean, shiftKey: boolean) => void;
  getSearchHighlights: (blockId: string, field: 'speaker' | 'text') => any[];
  containerHeight?: number;
}

const WINDOW_SIZE = 40; // Number of blocks to render at once
const BLOCK_HEIGHT = 80; // Estimated height of each block
const BUFFER_ZONE = 10; // Blocks to keep as buffer before sliding window

export default function SlidingWindowTextEditor({
  blocks,
  activeBlockId,
  activeArea,
  cursorAtStart,
  selectedBlocks,
  searchResults,
  currentSearchIndex,
  speakerColors,
  fontSize,
  fontFamily,
  isolatedSpeakers,
  showDescriptionTooltips,
  blockViewEnabled,
  autoCorrectEngine,
  onNavigate,
  onUpdate,
  onNewBlock,
  onRemoveBlock,
  onSpeakerTransform,
  onDeleteAcrossBlocks,
  onProcessShortcuts,
  onBlockClick,
  getSearchHighlights,
  containerHeight = 600
}: SlidingWindowTextEditorProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: Math.min(WINDOW_SIZE, blocks.length) });

  // Calculate which blocks should be visible based on scroll position
  const calculateVisibleRange = useCallback((scrollPosition: number) => {
    // Simple calculation: which block is at the top of the viewport
    const firstVisibleBlock = Math.floor(scrollPosition / BLOCK_HEIGHT);
    
    // Start a bit before the first visible block for smooth scrolling
    const startIndex = Math.max(0, firstVisibleBlock - 5);
    // Render WINDOW_SIZE blocks from the start
    const endIndex = Math.min(blocks.length, startIndex + WINDOW_SIZE);
    
    // If we're near the end, adjust to show the last WINDOW_SIZE blocks
    if (endIndex === blocks.length && blocks.length > WINDOW_SIZE) {
      const adjustedStart = Math.max(0, blocks.length - WINDOW_SIZE);
      return { start: adjustedStart, end: endIndex };
    }
    
    return { start: startIndex, end: endIndex };
  }, [blocks.length]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const newScrollTop = scrollContainerRef.current.scrollTop;
      const newRange = calculateVisibleRange(newScrollTop);
      
      // Only update if the range actually changed
      if (newRange.start !== visibleRange.start || newRange.end !== visibleRange.end) {
        setVisibleRange(newRange);
      }
    }
  }, [calculateVisibleRange, visibleRange]);

  // Scroll to active block when it changes
  useEffect(() => {
    if (activeBlockId && scrollContainerRef.current) {
      const index = blocks.findIndex(b => b.id === activeBlockId);
      if (index !== -1) {
        // Check if block is outside current visible range
        if (index < visibleRange.start || index >= visibleRange.end) {
          // Scroll to bring the block into view
          const targetScrollTop = index * BLOCK_HEIGHT;
          scrollContainerRef.current.scrollTop = targetScrollTop;
        }
      }
    }
  }, [activeBlockId, blocks, visibleRange]);

  // Handle search result navigation
  useEffect(() => {
    if (searchResults.length > 0 && currentSearchIndex >= 0) {
      const currentResult = searchResults[currentSearchIndex];
      if (currentResult && scrollContainerRef.current) {
        const index = blocks.findIndex(b => b.id === currentResult.blockId);
        if (index !== -1) {
          // Scroll to center the search result
          const targetScrollTop = (index * BLOCK_HEIGHT) - (containerHeight / 2) + (BLOCK_HEIGHT / 2);
          scrollContainerRef.current.scrollTop = Math.max(0, targetScrollTop);
        }
      }
    }
  }, [currentSearchIndex, searchResults, blocks, containerHeight]);

  // Calculate spacer heights
  const topSpacerHeight = visibleRange.start * BLOCK_HEIGHT;
  const bottomSpacerHeight = Math.max(0, (blocks.length - visibleRange.end) * BLOCK_HEIGHT);
  // Add extra virtual space at the end (like 10 empty blocks worth)
  const endPadding = BLOCK_HEIGHT * 10; 
  const totalHeight = blocks.length * BLOCK_HEIGHT + endPadding;

  // Update visible range when blocks change
  useEffect(() => {
    setVisibleRange({ start: 0, end: Math.min(WINDOW_SIZE, blocks.length) });
  }, [blocks.length]);

  // Get visible blocks
  const visibleBlocks = blocks.slice(visibleRange.start, visibleRange.end);

  return (
    <div 
      ref={scrollContainerRef}
      className="text-editor-content sliding-window"
      style={{
        height: containerHeight + 'px',
        overflowY: 'auto',
        overflowX: 'hidden',
        direction: 'rtl',
        position: 'relative'
      }}
      onScroll={handleScroll}
    >
      {/* Virtual scrolling container with full document height */}
      <div style={{ 
        height: totalHeight + 'px',
        position: 'relative'
      }}>
        {/* Position the window of blocks at the correct offset */}
        <div style={{
          position: 'absolute',
          top: topSpacerHeight + 'px',
          left: 0,
          right: 0
        }}>
          {/* Render visible blocks using regular TextBlock */}
          {visibleBlocks.map((block, relativeIndex) => {
        const absoluteIndex = visibleRange.start + relativeIndex;
        const isActive = block.id === activeBlockId;
        const isSelected = selectedBlocks.has(block.id);
        const speakerHighlights = getSearchHighlights(block.id, 'speaker');
        const textHighlights = getSearchHighlights(block.id, 'text');

        // Check if this block is selected (range or multi-select)
        const isRangeSelected = false; // Will be calculated in TextEditor
        const isMultiSelected = false; // Will be calculated in TextEditor

        return (
          <div 
            key={block.id} 
            id={'block-' + block.id}
            className={isSelected ? 'block-selected' : ''}
            onClick={(e) => {
              // Only handle if clicking on the wrapper div, not the TextBlock itself
              if (e.target === e.currentTarget) {
                onBlockClick(absoluteIndex, e.ctrlKey, e.shiftKey);
              }
            }}
          >
            <TextBlock
              block={block}
              isActive={isActive}
              isFirstBlock={absoluteIndex === 0}
              activeArea={isActive ? activeArea : 'speaker'}
              cursorAtStart={isActive && cursorAtStart}
              onNavigate={(direction, fromField) => onNavigate(block.id, direction, fromField)}
              onUpdate={onUpdate}
              onNewBlock={onNewBlock}
              onRemoveBlock={onRemoveBlock}
              onSpeakerTransform={onSpeakerTransform}
              onDeleteAcrossBlocks={onDeleteAcrossBlocks}
              onProcessShortcuts={onProcessShortcuts}
              speakerColor={speakerColors.get(block.speaker)}
              fontSize={fontSize}
              fontFamily={fontFamily}
              isIsolated={isolatedSpeakers.size === 0 || isolatedSpeakers.has(block.speaker)}
              showDescriptionTooltips={showDescriptionTooltips}
              blockViewEnabled={blockViewEnabled}
              speakerHighlights={speakerHighlights}
              textHighlights={textHighlights}
              onClick={(ctrlKey, shiftKey) => onBlockClick(absoluteIndex, ctrlKey, shiftKey)}
              autoCorrectEngine={autoCorrectEngine}
              previousSpeaker={absoluteIndex > 0 ? blocks[absoluteIndex - 1].speaker : ''}
            />
            </div>
          );
        })}
        </div>
        {/* End of document marker - only show when last block is visible */}
        {visibleRange.end >= blocks.length && (
          <div style={{
            position: 'absolute',
            top: blocks.length * BLOCK_HEIGHT + 20 + 'px',
            left: 0,
            right: 0,
            textAlign: 'center',
            padding: '20px',
            color: '#94a3b8',
            fontSize: '14px',
            fontStyle: 'italic'
          }}>
            — סוף המסמך —
          </div>
        )}
      </div>
    </div>
  );
}