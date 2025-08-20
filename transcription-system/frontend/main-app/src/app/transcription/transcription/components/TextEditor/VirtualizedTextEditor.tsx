import React, { useState, useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { VariableSizeList as List } from 'react-window';
import TextBlock from './blocks/TextBlock';
import { BackupService, TranscriptionBlock } from '../../services/backupService';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import { useBlockOperations } from './hooks/useBlockOperations';
import { useClipboard } from './hooks/useClipboard';
import { useSearch } from './hooks/useSearch';
import { SearchResult } from './types';
import './TextEditor.css';

interface VirtualizedTextEditorProps {
  blocks: TranscriptionBlock[];
  onBlockUpdate: (blockId: string, field: keyof TranscriptionBlock, value: string) => void;
  searchTerm: string;
  searchResults: SearchResult[];
  currentSearchIndex: number;
  replaceValue: string;
  onNavigateSearch: (direction: 'next' | 'prev') => void;
  onReplace: () => void;
  onReplaceAll: () => void;
  backupService: BackupService;
  selectedBlocks: Set<string>;
  onSelectedBlocksChange: (blocks: Set<string>) => void;
  caseSensitive: boolean;
  wholeWord: boolean;
  isSearchActive: boolean;
  activeBlockId: string | null;
  onActiveBlockChange: (blockId: string | null) => void;
  activeArea: 'speaker' | 'text' | 'timestamp' | 'name';
  onActiveAreaChange: (area: 'speaker' | 'text' | 'timestamp' | 'name') => void;
  onAddBlock: (afterBlockId: string) => void;
  onDeleteBlocks: (blockIds: string[]) => void;
}

export interface VirtualizedTextEditorRef {
  focusBlock: (blockId: string, area?: 'speaker' | 'text' | 'timestamp') => void;
  getBlocks: () => TranscriptionBlock[];
  scrollToBlock: (blockId: string) => void;
}

const VirtualizedTextEditor = forwardRef<VirtualizedTextEditorRef, VirtualizedTextEditorProps>(({
  blocks,
  onBlockUpdate,
  searchTerm,
  searchResults,
  currentSearchIndex,
  replaceValue,
  onNavigateSearch,
  onReplace,
  onReplaceAll,
  backupService,
  selectedBlocks,
  onSelectedBlocksChange,
  caseSensitive,
  wholeWord,
  isSearchActive,
  activeBlockId,
  onActiveBlockChange,
  activeArea,
  onActiveAreaChange,
  onAddBlock,
  onDeleteBlocks
}, ref) => {
  const listRef = useRef<List>(null);
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const itemHeightsRef = useRef<Map<number, number>>(new Map());
  const [forceUpdate, setForceUpdate] = useState(0);

  // Estimate initial height for blocks
  const getItemSize = useCallback((index: number) => {
    return itemHeightsRef.current.get(index) || 120; // Default estimated height
  }, []);

  // Measure and cache block heights
  const setItemSize = useCallback((index: number, size: number) => {
    if (itemHeightsRef.current.get(index) !== size) {
      itemHeightsRef.current.set(index, size);
      if (listRef.current) {
        listRef.current.resetAfterIndex(index);
      }
    }
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!activeBlockId) return;

    const currentIndex = blocks.findIndex(b => b.id === activeBlockId);
    if (currentIndex === -1) return;

    switch(e.key) {
      case 'ArrowUp':
        if (currentIndex > 0) {
          e.preventDefault();
          const prevBlock = blocks[currentIndex - 1];
          onActiveBlockChange(prevBlock.id);
          if (listRef.current) {
            listRef.current.scrollToItem(currentIndex - 1, 'auto');
          }
        }
        break;
      case 'ArrowDown':
        if (currentIndex < blocks.length - 1) {
          e.preventDefault();
          const nextBlock = blocks[currentIndex + 1];
          onActiveBlockChange(nextBlock.id);
          if (listRef.current) {
            listRef.current.scrollToItem(currentIndex + 1, 'auto');
          }
        }
        break;
      case 'Enter':
        if (!e.shiftKey && activeArea === 'text') {
          e.preventDefault();
          onAddBlock(activeBlockId);
        }
        break;
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          // Navigate areas backward
          const areas: Array<'speaker' | 'text' | 'timestamp' | 'name'> = ['speaker', 'text', 'timestamp'];
          const currentAreaIndex = areas.indexOf(activeArea);
          if (currentAreaIndex > 0) {
            onActiveAreaChange(areas[currentAreaIndex - 1]);
          } else if (currentIndex > 0) {
            onActiveBlockChange(blocks[currentIndex - 1].id);
            onActiveAreaChange('timestamp');
          }
        } else {
          // Navigate areas forward
          const areas: Array<'speaker' | 'text' | 'timestamp' | 'name'> = ['speaker', 'text', 'timestamp'];
          const currentAreaIndex = areas.indexOf(activeArea);
          if (currentAreaIndex < areas.length - 1) {
            onActiveAreaChange(areas[currentAreaIndex + 1]);
          } else if (currentIndex < blocks.length - 1) {
            onActiveBlockChange(blocks[currentIndex + 1].id);
            onActiveAreaChange('speaker');
          }
        }
        break;
    }
  }, [activeBlockId, activeArea, blocks, onActiveBlockChange, onActiveAreaChange, onAddBlock]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Focus and scroll management
  const focusBlock = useCallback((blockId: string, area: 'speaker' | 'text' | 'timestamp' = 'text') => {
    const index = blocks.findIndex(b => b.id === blockId);
    if (index !== -1) {
      onActiveBlockChange(blockId);
      onActiveAreaChange(area);
      if (listRef.current) {
        listRef.current.scrollToItem(index, 'center');
      }
    }
  }, [blocks, onActiveBlockChange, onActiveAreaChange]);

  const scrollToBlock = useCallback((blockId: string) => {
    const index = blocks.findIndex(b => b.id === blockId);
    if (index !== -1 && listRef.current) {
      listRef.current.scrollToItem(index, 'center');
    }
  }, [blocks]);

  const getBlocks = useCallback(() => blocks, [blocks]);

  useImperativeHandle(ref, () => ({
    focusBlock,
    getBlocks,
    scrollToBlock
  }), [focusBlock, getBlocks, scrollToBlock]);

  // Handle search navigation
  useEffect(() => {
    if (searchResults.length > 0 && currentSearchIndex >= 0) {
      const currentResult = searchResults[currentSearchIndex];
      if (currentResult) {
        scrollToBlock(currentResult.blockId);
      }
    }
  }, [currentSearchIndex, searchResults, scrollToBlock]);

  // Row renderer for virtual list
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const block = blocks[index];
    if (!block) return null;

    const isActive = block.id === activeBlockId;
    const isSelected = selectedBlocks.has(block.id);
    const searchHighlight = searchResults.find(r => r.blockId === block.id);

    return (
      <div 
        style={style} 
        className="virtual-row"
        ref={(el) => {
          if (el) {
            const height = el.getBoundingClientRect().height;
            setItemSize(index, height);
          }
        }}
      >
        <TextBlock
          block={block}
          isActive={isActive}
          activeArea={isActive ? activeArea : 'text'}
          onSpeakerClick={() => {
            onActiveBlockChange(block.id);
            onActiveAreaChange('speaker');
          }}
          onTextClick={() => {
            onActiveBlockChange(block.id);
            onActiveAreaChange('text');
          }}
          onTimestampClick={() => {
            onActiveBlockChange(block.id);
            onActiveAreaChange('timestamp');
          }}
          onUpdate={(field, value) => onBlockUpdate(block.id, field, value)}
          onNavigate={(direction, area) => {
            if (direction === 'down' && index < blocks.length - 1) {
              onActiveBlockChange(blocks[index + 1].id);
              onActiveAreaChange(area || 'text');
              listRef.current?.scrollToItem(index + 1, 'auto');
            } else if (direction === 'up' && index > 0) {
              onActiveBlockChange(blocks[index - 1].id);
              onActiveAreaChange(area || 'text');
              listRef.current?.scrollToItem(index - 1, 'auto');
            } else if (direction === 'next') {
              const areas: Array<'speaker' | 'text' | 'timestamp'> = ['speaker', 'text', 'timestamp'];
              const currentAreaIndex = areas.indexOf(activeArea);
              if (currentAreaIndex < areas.length - 1) {
                onActiveAreaChange(areas[currentAreaIndex + 1]);
              }
            } else if (direction === 'prev') {
              const areas: Array<'speaker' | 'text' | 'timestamp'> = ['speaker', 'text', 'timestamp'];
              const currentAreaIndex = areas.indexOf(activeArea);
              if (currentAreaIndex > 0) {
                onActiveAreaChange(areas[currentAreaIndex - 1]);
              }
            }
          }}
          onAddBlock={() => onAddBlock(block.id)}
          onDeleteBlock={() => onDeleteBlocks([block.id])}
          searchHighlight={searchHighlight ? {
            text: searchHighlight.text,
            ranges: searchHighlight.ranges
          } : undefined}
          isSelected={isSelected}
          onSelect={(selected) => {
            const newSelection = new Set(selectedBlocks);
            if (selected) {
              newSelection.add(block.id);
            } else {
              newSelection.delete(block.id);
            }
            onSelectedBlocksChange(newSelection);
          }}
          blockNumber={index + 1}
        />
      </div>
    );
  }, [
    blocks,
    activeBlockId,
    activeArea,
    selectedBlocks,
    searchResults,
    onActiveBlockChange,
    onActiveAreaChange,
    onBlockUpdate,
    onAddBlock,
    onDeleteBlocks,
    onSelectedBlocksChange,
    setItemSize
  ]);

  return (
    <div className="text-editor virtualized">
      <List
        ref={listRef}
        height={window.innerHeight - 200} // Adjust based on header/footer
        itemCount={blocks.length}
        itemSize={getItemSize}
        width="100%"
        overscanCount={5}
        estimatedItemSize={120}
      >
        {Row}
      </List>
    </div>
  );
});

VirtualizedTextEditor.displayName = 'VirtualizedTextEditor';

export default VirtualizedTextEditor;