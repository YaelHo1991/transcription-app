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

  // Parse content into blocks - use the structured data instead of parsing text
  const blocks = useMemo(() => {
    if (!content) return [];

    // Split content into blocks separated by double newlines
    const blockSections = content.split('\n\n').filter(section => section.trim());
    const parsedBlocks: PreviewBlock[] = [];

    blockSections.forEach((section, index) => {
      const lines = section.split('\n').filter(line => line.trim());

      if (lines.length === 0) return;

      // For multi-line blocks, join all lines
      const fullText = lines.join('\n');

      // Check if this block starts with a speaker pattern (word/phrase followed by colon at start of line)
      // First, check if line starts with any timestamp-like pattern
      const startsWithTimestamp = fullText.match(/^\[[\d:]+\]/);

      if (!startsWithTimestamp) {
        // Only look for speakers if not a timestamp
        const speakerMatch = fullText.match(/^([^:\n\[\]]{1,30}?):\s*(.+)$/s);

        if (speakerMatch) {
          const potentialSpeaker = speakerMatch[1].trim();
          const restOfText = speakerMatch[2].trim();

          // Only treat as speaker if it looks like a valid speaker name
          // (not a timestamp, not starting with numbers/brackets)
          // Additional validation: speaker names shouldn't contain spaces (or at most 1-2 for full names)
          // and shouldn't be full sentences or phrases
          const spaceCount = (potentialSpeaker.match(/\s/g) || []).length;
          const containsHebrewWords = /[\u0590-\u05FF]/.test(potentialSpeaker);

          // Check if this looks like a phrase/sentence rather than a name
          // Common patterns that are NOT speakers:
          // - Contains numbers (like "בדיקת בקאפ 22")
          // - More than 2 spaces
          // - Contains common non-name words
          const containsNumbers = /\d/.test(potentialSpeaker);
          const isLikelySentence = containsHebrewWords && spaceCount > 2;

          // Check if it's a typical speaker pattern (just a name, possibly with title)
          // Speaker names are typically short (1-3 words) without numbers
          const looksLikeName =
            !containsNumbers && // Names don't usually have numbers
            spaceCount <= 2 && // Names are usually 1-3 words max
            potentialSpeaker.length <= 20 && // Names are typically short
            !potentialSpeaker.includes('בדיקת') && // Not "test"
            !potentialSpeaker.includes('בקאפ') && // Not "backup"
            !potentialSpeaker.match(/[:;,\.\?!]/) && // Names don't contain punctuation
            restOfText.length > 5; // There should be substantial text after the speaker

          const isValidSpeaker =
            potentialSpeaker.length > 0 &&
            potentialSpeaker.length < 30 &&
            !potentialSpeaker.startsWith('[') &&
            !potentialSpeaker.match(/^\d/) && // Doesn't start with digit
            !potentialSpeaker.includes('[') &&
            !potentialSpeaker.includes(']') &&
            !isLikelySentence && // Not a sentence
            looksLikeName && // Passes name validation
            restOfText.length > 0;

          if (isValidSpeaker) {
            parsedBlocks.push({
              speaker: potentialSpeaker,
              text: restOfText,
              index
            });
          } else {
            // Not a valid speaker, treat as regular text
            parsedBlocks.push({
              speaker: '',
              text: fullText,
              index
            });
          }
        } else {
          // No speaker pattern found, treat as regular text
          parsedBlocks.push({
            speaker: '',
            text: fullText,
            index
          });
        }
      } else {
        // Starts with timestamp, treat entire block as regular text
        parsedBlocks.push({
          speaker: '',
          text: fullText,
          index
        });
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