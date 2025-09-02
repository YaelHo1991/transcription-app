import React, { useEffect, useState } from 'react';
import TextEditor from './TextEditor';

// Threshold for switching to virtualized mode
const VIRTUALIZATION_THRESHOLD = 30; // Set to 30 for testing (normally 200)

interface TextEditorWrapperProps {
  currentProjectId: string;
  mediaPlayerRef: any;
  marks: any[];
  currentTime: number;
  mediaFileName: string;
  mediaName?: string;
  mediaDuration: number;
  projectName: string;
  speakerComponentRef: any;
  onSeek: (time: number) => void;
  enabled: boolean;
}

const TextEditorWrapper: React.FC<TextEditorWrapperProps> = (props) => {
  const [blockCount, setBlockCount] = useState(0);
  const [useVirtualized, setUseVirtualized] = useState(false);

  useEffect(() => {
    // Monitor block count changes
    const handleBlocksLoaded = (event: CustomEvent) => {
      const count = event.detail?.count || 0;
      setBlockCount(count);
      
      // Automatically switch to virtualized mode for large documents
      const shouldVirtualize = count > VIRTUALIZATION_THRESHOLD;
      if (shouldVirtualize !== useVirtualized) {
        console.log('Switching to ' + (shouldVirtualize ? 'virtualized' : 'regular') + ' mode (' + count + ' blocks)');
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
      console.log('TextEditor: Using ' + mode + ' mode for ' + blockCount + ' blocks');
    }
  }, [useVirtualized, blockCount]);

  // Pass virtualization flag and all props to TextEditor
  return (
    <TextEditor {...props} virtualizationEnabled={useVirtualized} />
  );
};

export default TextEditorWrapper;