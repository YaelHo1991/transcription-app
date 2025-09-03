import { useEffect, useRef, useState } from 'react';
import WordDocumentGenerator, { BlockData } from '../utils/WordDocumentGenerator';
import { TemplateProcessor } from '../utils/templateProcessor';

interface UseAutoWordExportProps {
  blocks: any[];
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
  const templateProcessorRef = useRef<TemplateProcessor | null>(null);
  const hasTemplateRef = useRef<boolean>(false);

  console.log('[useAutoWordExport] Hook called with:', {
    autoExportEnabled,
    blocksLength: blocks.length,
    mediaFileName,
    mediaDuration,
    speakersSize: speakers.size,
    remarksLength: remarks?.length || 0
  });

  // Initialize template processor and try to load template
  useEffect(() => {
    const loadTemplate = async () => {
      if (!templateProcessorRef.current) {
        templateProcessorRef.current = new TemplateProcessor();
      }
      
      try {
        // Use relative URL for production, explicit URL for localhost
        const baseUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
          ? '' // Use relative URL on production
          : 'http://localhost:5000'; // Use explicit URL on localhost
        
        // Check for session template first
        const sessionTemplate = localStorage.getItem('sessionTemplate');
        let templateUrl = `${baseUrl}/api/template/export-template`;
        
        if (sessionTemplate) {
          // Use session template if available
          templateUrl = `${baseUrl}/api/template/export-template?template=${encodeURIComponent(sessionTemplate)}`;
        }
        
        const response = await fetch(templateUrl);
        if (response.ok) {
          const blob = await response.blob();
          const file = new File([blob], 'template.docx', { type: blob.type });
          const success = await templateProcessorRef.current.loadTemplate(file);
          hasTemplateRef.current = success;
          console.log('[useAutoWordExport] Template loaded:', success);
        } else {
          hasTemplateRef.current = false;
          console.log('[useAutoWordExport] No template available');
        }
      } catch (error) {
        console.warn('[useAutoWordExport] Could not load template:', error);
        hasTemplateRef.current = false;
      }
    };
    
    loadTemplate();
  }, []);

  const generateAutoExport = async () => {
    console.log('[useAutoWordExport] generateAutoExport called', {
      autoExportEnabled,
      blocksLength: blocks.length,
      hasTemplate: hasTemplateRef.current
    });
    
    if (!autoExportEnabled || blocks.length === 0) {
      console.log('[useAutoWordExport] Skipping export:', {
        autoExportEnabled,
        blocksLength: blocks.length
      });
      return;
    }

    try {
      const currentTime = Date.now();
      const fileName = `${mediaFileName.replace(/\.[^/.]+$/, '')}_auto_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
      
      if (hasTemplateRef.current && templateProcessorRef.current) {
        // Use template processor with Hebrew conversion
        console.log('[AutoExport] Using template processor for export');
        const success = await templateProcessorRef.current.processTemplateWithConversion(
          blocks as BlockData[],
          speakers,
          mediaFileName,
          true, // includeTimestamps
          mediaDuration,
          fileName
        );
        if (!success) {
          console.error('[AutoExport] Template processing failed, falling back to regular export');
          // Fall back to regular export
          const generator = new WordDocumentGenerator();
          await generator.generateDocument(
            blocks as BlockData[],
            speakers,
            mediaFileName,
            {
              includeTimestamps: true,
              fileName,
              mediaDuration
            }
          );
        }
      } else {
        // Use regular generator
        console.log('[AutoExport] Using regular generator for export');
        const generator = new WordDocumentGenerator();
        await generator.generateDocument(
          blocks as BlockData[],
          speakers,
          mediaFileName,
          {
            includeTimestamps: true,
            fileName,
            mediaDuration
          }
        );
      }
      
      setLastExportTime(currentTime);
      console.log('[AutoExport] Word document generated automatically:', fileName);
    } catch (error) {
      console.error('[AutoExport] Failed to generate Word document:', error);
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

    console.log('[useAutoWordExport] Scheduling auto export in 10 seconds (TEST MODE)');
    timeoutRef.current = setTimeout(generateAutoExport, 10000); // 10 seconds for testing
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
      blocks: blocks.map(b => ({ text: b.text, speaker: b.speaker })),
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