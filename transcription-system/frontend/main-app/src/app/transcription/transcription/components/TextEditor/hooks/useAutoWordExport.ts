import { useEffect, useRef, useState } from 'react';
import { getAutoExportHandler } from '../utils/autoExportHandler';
import { BlockData } from '../utils/WordDocumentGenerator';

interface UseAutoWordExportProps {
  blocks: BlockData[];
  speakers: Map<string, string>;
  remarks?: any[];
  mediaFileName: string;
  mediaDuration?: string;
  autoExportEnabled: boolean;
}

export function useAutoWordExport({
  blocks,
  speakers,
  remarks,
  mediaFileName,
  mediaDuration,
  autoExportEnabled
}: UseAutoWordExportProps) {
  const [lastExportTime, setLastExportTime] = useState<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef<string>('');
  const exportHandlerRef = useRef(getAutoExportHandler());

  console.log('[useAutoWordExport] Hook called with:', {
    autoExportEnabled,
    blocksLength: blocks.length,
    mediaFileName,
    mediaDuration,
    speakersSize: speakers.size,
    remarksLength: remarks?.length || 0
  });

  // Initialize the export handler on mount
  useEffect(() => {
    exportHandlerRef.current.initialize();
  }, []);

  const triggerAutoExport = async () => {
    console.log('[useAutoWordExport] Triggering silent auto export');
    
    if (!autoExportEnabled || blocks.length === 0) {
      console.log('[useAutoWordExport] Skipping export:', {
        autoExportEnabled,
        blocksLength: blocks.length
      });
      return;
    }

    // Perform silent export
    const success = await exportHandlerRef.current.exportDocument(
      blocks,
      speakers,
      mediaFileName,
      mediaDuration
    );

    if (success) {
      setLastExportTime(Date.now());
      console.log('[AutoExport] Silent export completed successfully');
    } else {
      console.error('[AutoExport] Silent export failed');
    }
  };

  const scheduleAutoExport = () => {
    console.log('[useAutoWordExport] scheduleAutoExport called, autoExportEnabled:', autoExportEnabled);
    
    if (!autoExportEnabled) {
      console.log('[useAutoWordExport] Auto export disabled, not scheduling');
      return;
    }

    if (timeoutRef.current) {
      console.log('[useAutoWordExport] Clearing existing timeout');
      clearTimeout(timeoutRef.current);
    }

    console.log('[useAutoWordExport] Scheduling auto export in 5 minutes');
    timeoutRef.current = setTimeout(triggerAutoExport, 300000); // 5 minutes (300 seconds)
  };

  // Track content changes
  useEffect(() => {
    console.log('[useAutoWordExport] Content change effect triggered', {
      autoExportEnabled,
      blocksLength: blocks.length,
      speakersSize: speakers.size
    });
    
    if (!autoExportEnabled) {
      console.log('[useAutoWordExport] Auto export disabled, skipping content tracking');
      return;
    }

    // Create a content hash to detect changes
    const currentContent = JSON.stringify({
      blocks: blocks.map((b: any) => ({ text: b.text, speaker: b.speaker })),
      speakers: Array.from(speakers.entries()),
      remarks: remarks || []
    });

    const contentChanged = currentContent !== lastContentRef.current;
    const hasBlocks = blocks.length > 0;
    
    console.log('[useAutoWordExport] Content analysis:', {
      contentChanged,
      hasBlocks,
      currentContentLength: currentContent.length,
      previousContentLength: lastContentRef.current.length
    });

    if (contentChanged && hasBlocks) {
      console.log('[useAutoWordExport] Content changed with blocks present, scheduling export');
      lastContentRef.current = currentContent;
      scheduleAutoExport();
    } else {
      console.log('[useAutoWordExport] No action needed:', { contentChanged, hasBlocks });
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [blocks, speakers, remarks, autoExportEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    lastExportTime,
    scheduleAutoExport
  };
}