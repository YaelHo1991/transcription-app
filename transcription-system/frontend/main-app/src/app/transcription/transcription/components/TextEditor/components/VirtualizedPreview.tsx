import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react';

interface PreviewBlock {
  speaker: string;
  text: string;
  index: number;
}

interface VirtualizedPreviewProps {
  content: string;
  containerHeight?: number;
  className?: string;
}

const WINDOW_SIZE = 50; // Number of blocks to render at once
const BLOCK_HEIGHT = 60; // Estimated height of each preview block
const BUFFER_SIZE = 10; // Blocks to keep as buffer
const VIRTUALIZATION_THRESHOLD = 100; // Only virtualize if more than this many blocks

export default function VirtualizedPreview({
  content,
  containerHeight = 500,
  className = ''
}: VirtualizedPreviewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: WINDOW_SIZE });
  const [scrollTop, setScrollTop] = useState(0);

  // Parse content into blocks
  const blocks = useMemo(() => {
    if (!content) return [];
    
    const lines = content.split('\n').filter(line => line.trim());
    const parsedBlocks: PreviewBlock[] = [];
    
    lines.forEach((line, index) => {
      const colonIndex = line.indexOf(':');
      if (colonIndex !== -1) {
        const speaker = line.substring(0, colonIndex).trim();
        const text = line.substring(colonIndex + 1).trim();
        parsedBlocks.push({ speaker, text, index });
      } else {
        // Line without speaker
        parsedBlocks.push({ speaker: '', text: line, index });
      }
    });
    
    return parsedBlocks;
  }, [content]);

  // Determine if we should use virtualization
  const shouldVirtualize = blocks.length > VIRTUALIZATION_THRESHOLD;

  // Calculate which blocks should be visible based on scroll position
  const calculateVisibleRange = useCallback((scrollPosition: number) => {
    const firstVisibleBlock = Math.floor(scrollPosition / BLOCK_HEIGHT);
    
    // Start a bit before the first visible block for smooth scrolling
    const startIndex = Math.max(0, firstVisibleBlock - BUFFER_SIZE);
    // Calculate how many blocks fit in the viewport
    const blocksInViewport = Math.ceil(containerHeight / BLOCK_HEIGHT);
    const endIndex = Math.min(blocks.length, startIndex + blocksInViewport + BUFFER_SIZE * 2);
    
    return { start: startIndex, end: endIndex };
  }, [blocks.length, containerHeight]);

  // Handle scroll events with debouncing
  const handleScroll = useCallback(() => {
    if (!shouldVirtualize || !scrollContainerRef.current) return;
    
    const newScrollTop = scrollContainerRef.current.scrollTop;
    setScrollTop(newScrollTop);
    
    const newRange = calculateVisibleRange(newScrollTop);
    
    // Only update if the range actually changed
    if (newRange.start !== visibleRange.start || newRange.end !== visibleRange.end) {
      setVisibleRange(newRange);
    }
  }, [calculateVisibleRange, visibleRange, shouldVirtualize]);

  // Update visible range when blocks change
  useEffect(() => {
    if (shouldVirtualize) {
      setVisibleRange(calculateVisibleRange(scrollTop));
    }
  }, [blocks.length, calculateVisibleRange, scrollTop, shouldVirtualize]);

  // Render a single block
  const renderBlock = (block: PreviewBlock) => {
    if (block.speaker) {
      return (
        <div key={block.index} className="preview-block">
          <span className="preview-speaker">{block.speaker}:</span>
          <span className="preview-text"> {block.text}</span>
        </div>
      );
    } else {
      return (
        <div key={block.index} className="preview-line">
          {block.text}
        </div>
      );
    }
  };

  // If not virtualizing, render all blocks normally
  if (!shouldVirtualize) {
    return (
      <div className={'preview-document ' + className}>
        {blocks.length > 0 ? (
          blocks.map(renderBlock)
        ) : (
          <div className="preview-empty">אין תוכן להצגה</div>
        )}
      </div>
    );
  }

  // Virtualized rendering
  const visibleBlocks = blocks.slice(visibleRange.start, visibleRange.end);
  const totalHeight = blocks.length * BLOCK_HEIGHT;
  const offsetY = visibleRange.start * BLOCK_HEIGHT;

  return (
    <div 
      ref={scrollContainerRef}
      className={'preview-document virtualized ' + className}
      style={{ 
        height: containerHeight + 'px',
        overflowY: 'auto',
        position: 'relative'
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight + 'px', position: 'relative' }}>
        <div
          style={{
            transform: 'translateY(' + offsetY + 'px)',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleBlocks.map(renderBlock)}
        </div>
      </div>
      {blocks.length === 0 && (
        <div className="preview-empty">אין תוכן להצגה</div>
      )}
    </div>
  );
}