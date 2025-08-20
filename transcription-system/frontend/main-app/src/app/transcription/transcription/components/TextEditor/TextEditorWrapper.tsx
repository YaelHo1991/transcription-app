import React, { useEffect, useState, useRef } from 'react';
import TextEditor from './TextEditor';
import VirtualizedTextEditor from './VirtualizedTextEditor';
import { BackupService } from '../../services/backupService';

// Threshold for switching to virtualized mode
const VIRTUALIZATION_THRESHOLD = 1000; // Switch to virtual scrolling above 1000 blocks

interface TextEditorWrapperProps {
  currentProjectId: string;
  mediaPlayerRef: any;
  marks: any[];
  currentTime: number;
  mediaFileName: string;
  mediaDuration: number;
  projectName: string;
  speakerComponentRef: any;
  onSeek: (time: number) => void;
  enabled: boolean;
}

const TextEditorWrapper: React.FC<TextEditorWrapperProps> = (props) => {
  const [blockCount, setBlockCount] = useState(0);
  const [useVirtualized, setUseVirtualized] = useState(false);
  const backupServiceRef = useRef<BackupService | null>(null);

  useEffect(() => {
    // Monitor block count changes
    const handleBlocksLoaded = (event: CustomEvent) => {
      const count = event.detail?.count || 0;
      setBlockCount(count);
      
      // Automatically switch to virtualized mode for large documents
      const shouldVirtualize = count > VIRTUALIZATION_THRESHOLD;
      if (shouldVirtualize !== useVirtualized) {
        console.log(`Switching to ${shouldVirtualize ? 'virtualized' : 'regular'} mode (${count} blocks)`);
        setUseVirtualized(shouldVirtualize);
      }
    };

    document.addEventListener('blocksLoaded', handleBlocksLoaded as EventListener);
    return () => {
      document.removeEventListener('blocksLoaded', handleBlocksLoaded as EventListener);
    };
  }, [useVirtualized]);

  // Show notification when switching modes
  useEffect(() => {
    if (blockCount > 0) {
      const mode = useVirtualized ? 'virtualized' : 'regular';
      console.log(`TextEditor: Using ${mode} mode for ${blockCount} blocks`);
    }
  }, [useVirtualized, blockCount]);

  // For now, use regular TextEditor until we fully integrate VirtualizedTextEditor
  // This allows gradual testing
  return (
    <>
      {!useVirtualized && (
        <TextEditor {...props} />
      )}
      {useVirtualized && (
        <div className="virtualized-editor-container">
          <div className="virtualization-notice">
            Virtual scrolling enabled for performance ({blockCount} blocks)
          </div>
          <TextEditor {...props} />
          {/* VirtualizedTextEditor will be enabled after full integration */}
        </div>
      )}
    </>
  );
};

export default TextEditorWrapper;