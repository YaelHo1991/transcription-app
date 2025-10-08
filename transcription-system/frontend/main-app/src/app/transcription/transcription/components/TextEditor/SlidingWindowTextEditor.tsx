import React, { useRef, useCallback, useEffect, useState } from 'react';
import TextBlock from './blocks/TextBlock';
import { TextBlockData } from './blocks/TextBlock';

interface SlidingWindowTextEditorProps {
  blocks: TextBlockData[];
  activeBlockId: string | null;
  activeArea: 'speaker' | 'text';
  cursorAtStart: boolean;
  mediaName?: string;
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
  onJoinBlock?: (blockId: string) => { joinPosition: number; previousBlockId: string; joinedText: string } | null;
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
  mediaName,
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
  onJoinBlock,
  onSpeakerTransform,
  onDeleteAcrossBlocks,
  onProcessShortcuts,
  onBlockClick,
  getSearchHighlights,
  containerHeight = 600
}: SlidingWindowTextEditorProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: Math.min(WINDOW_SIZE, blocks.length) });

  // Word-like scrolling: track whether to auto-scroll to cursor
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const isProgrammaticScroll = useRef(false);

  // Calculate which blocks should be visible based on scroll position
  const calculateVisibleRange = useCallback((scrollPosition: number, activeId?: string | null) => {
    // Simple calculation: which block is at the top of the viewport
    const firstVisibleBlock = Math.floor(scrollPosition / BLOCK_HEIGHT);

    // Start a bit before the first visible block for smooth scrolling
    let startIndex = Math.max(0, firstVisibleBlock - 5);
    // Render WINDOW_SIZE blocks from the start
    let endIndex = Math.min(blocks.length, startIndex + WINDOW_SIZE);

    // If we're near the end, adjust to show the last WINDOW_SIZE blocks
    if (endIndex === blocks.length && blocks.length > WINDOW_SIZE) {
      startIndex = Math.max(0, blocks.length - WINDOW_SIZE);
    }

    // Let virtual scrolling work naturally
    // Word-like auto-scroll (useEffect at line 128) will bring active block into view when typing

    return { start: startIndex, end: endIndex };
  }, [blocks]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const newScrollTop = scrollContainerRef.current.scrollTop;
      const newRange = calculateVisibleRange(newScrollTop, activeBlockId);

      // Only update if the range actually changed
      if (newRange.start !== visibleRange.start || newRange.end !== visibleRange.end) {
        setVisibleRange(newRange);
      }

      // If this scroll wasn't triggered programmatically, it's a manual scroll
      // Disable auto-scroll to allow free browsing (Word-like behavior)
      if (!isProgrammaticScroll.current) {
        setShouldAutoScroll(false);
      }
      // Reset the flag for next scroll event
      isProgrammaticScroll.current = false;
    }
  }, [calculateVisibleRange, visibleRange, activeBlockId]);

  // Scroll to active block when it changes (Word-like behavior)
  // Only auto-scroll if shouldAutoScroll is true (i.e., user pressed a key)
  useEffect(() => {
    if (shouldAutoScroll && activeBlockId && scrollContainerRef.current) {
      const index = blocks.findIndex(b => b.id === activeBlockId);

      if (index !== -1) {
        const currentScrollTop = scrollContainerRef.current.scrollTop;
        const blockTop = index * BLOCK_HEIGHT;
        const blockBottom = blockTop + BLOCK_HEIGHT;
        const viewportTop = currentScrollTop;
        const viewportBottom = currentScrollTop + containerHeight;

        // Only scroll if the block is outside the visible viewport
        if (blockTop < viewportTop || blockBottom > viewportBottom) {
          // Mark this as a programmatic scroll so handleScroll doesn't disable auto-scroll
          isProgrammaticScroll.current = true;
          // Center the block in the viewport for better visibility
          const targetScrollTop = (index * BLOCK_HEIGHT) - (containerHeight / 2) + (BLOCK_HEIGHT / 2);
          scrollContainerRef.current.scrollTop = Math.max(0, targetScrollTop);
        }

        // Reset shouldAutoScroll after checking
        setShouldAutoScroll(false);
      }
    }
  }, [shouldAutoScroll, activeBlockId, blocks, containerHeight]);

  // Handle search result navigation
  useEffect(() => {
    if (searchResults.length > 0 && currentSearchIndex >= 0) {
      const currentResult = searchResults[currentSearchIndex];
      if (currentResult && scrollContainerRef.current) {
        const index = blocks.findIndex(b => b.id === currentResult.blockId);
        if (index !== -1) {
          // Mark as programmatic scroll
          isProgrammaticScroll.current = true;
          // Scroll to center the search result
          const targetScrollTop = (index * BLOCK_HEIGHT) - (containerHeight / 2) + (BLOCK_HEIGHT / 2);
          scrollContainerRef.current.scrollTop = Math.max(0, targetScrollTop);
        }
      }
    }
  }, [currentSearchIndex, searchResults, blocks, containerHeight]);

  // Keyboard detection: enable auto-scroll when user presses any key
  // This implements Word-like behavior - scroll back to cursor on keypress
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Enable auto-scroll when any key is pressed (except mouse/modifier keys)
      if (!['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
        setShouldAutoScroll(true);
      }
    };

    // Listen globally on document to catch all keyboard events
    // Use capture phase to ensure we catch it before other handlers
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  // Calculate spacer heights
  const topSpacerHeight = visibleRange.start * BLOCK_HEIGHT;
  const bottomSpacerHeight = Math.max(0, (blocks.length - visibleRange.end) * BLOCK_HEIGHT);
  // Add bottom padding for smooth scrolling at end (6 blank blocks worth)
  const BOTTOM_PADDING = BLOCK_HEIGHT * 6; // 480px (3 blocks before marker, 3 after)
  const contentHeight = blocks.length * BLOCK_HEIGHT;
  const totalHeight = contentHeight + BOTTOM_PADDING;

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
        position: 'relative',
        background: '#ffffff'
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
              blockIndex={absoluteIndex}
              isActive={isActive}
              isFirstBlock={absoluteIndex === 0}
              mediaName={mediaName}
              activeArea={isActive ? activeArea : 'speaker'}
              cursorAtStart={isActive && cursorAtStart}
              onNavigate={(direction, fromField) => onNavigate(block.id, direction, fromField)}
              onUpdate={onUpdate}
              onNewBlock={onNewBlock}
              onRemoveBlock={onRemoveBlock}
              onJoinBlock={onJoinBlock}
              onSpeakerTransform={onSpeakerTransform}
              onDeleteAcrossBlocks={onDeleteAcrossBlocks}
              onProcessShortcuts={onProcessShortcuts}
              speakerColor={speakerColors.get(block.isContinuation && block.parentSpeaker ? block.parentSpeaker : block.speaker)}
              fontSize={fontSize}
              fontFamily={fontFamily}
              isIsolated={isolatedSpeakers.size === 0 || isolatedSpeakers.has(block.isContinuation && block.parentSpeaker ? block.parentSpeaker : block.speaker)}
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
      </div>
    </div>
  );
}