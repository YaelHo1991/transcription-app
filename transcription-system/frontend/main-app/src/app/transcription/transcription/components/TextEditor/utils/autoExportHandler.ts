import { TemplateProcessor } from './templateProcessor';
import WordDocumentGenerator, { BlockData } from './WordDocumentGenerator';
import { buildApiUrl } from '@/utils/api';

export class AutoExportHandler {
  private templateProcessor: TemplateProcessor;
  private hasTemplate: boolean = false;
  private isInitialized: boolean = false;

  constructor() {
    this.templateProcessor = new TemplateProcessor();
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Check for session template first
      const sessionTemplate = localStorage.getItem('sessionTemplate');
      let templateUrl = buildApiUrl('/api/template/export-template');
      
      if (sessionTemplate) {
        // Use session template if available
        templateUrl = buildApiUrl(`/api/template/export-template?template=${encodeURIComponent(sessionTemplate)}`);
      }
      
      console.log('[AutoExportHandler] Loading template from:', templateUrl);
      const response = await fetch(templateUrl);
      
      if (response.ok) {
        const blob = await response.blob();
        const file = new File([blob], 'template.docx', { type: blob.type });
        const success = await this.templateProcessor.loadTemplate(file);
        this.hasTemplate = success;
        this.isInitialized = true;
        console.log('[AutoExportHandler] Template loaded successfully:', success);
      } else {
        this.hasTemplate = false;
        this.isInitialized = true;
        console.log('[AutoExportHandler] No template available, will use default export');
      }
    } catch (error) {
      console.warn('[AutoExportHandler] Could not load template:', error);
      this.hasTemplate = false;
      this.isInitialized = true;
    }
  }

  async exportDocument(
    blocks: BlockData[],
    speakers: Map<string, string>,
    mediaFileName: string,
    mediaDuration?: string
  ): Promise<boolean> {
    try {
      // Ensure we're initialized
      await this.initialize();
      
      const fileName = `${mediaFileName.replace(/\.[^/.]+$/, '')}_auto_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
      
      if (this.hasTemplate) {
        // Use template processor with Hebrew conversion
        console.log('[AutoExportHandler] Using template processor for auto export');
        const success = await this.templateProcessor.processTemplateWithConversion(
          blocks,
          speakers,
          mediaFileName,
          true, // includeTimestamps - always true for auto export
          mediaDuration,
          fileName
        );
        
        if (!success) {
          console.error('[AutoExportHandler] Template processing failed, falling back to regular export');
          // Fall back to regular export
          const generator = new WordDocumentGenerator();
          await generator.generateDocument(
            blocks,
            speakers,
            mediaFileName,
            {
              includeTimestamps: true,
              fileName,
              mediaDuration
            }
          );
        }
        
        console.log('[AutoExportHandler] Document exported successfully with template');
        return true;
      } else {
        // Use regular generator
        console.log('[AutoExportHandler] Using regular generator for auto export');
        const generator = new WordDocumentGenerator();
        await generator.generateDocument(
          blocks,
          speakers,
          mediaFileName,
          {
            includeTimestamps: true,
            fileName,
            mediaDuration
          }
        );
        
        console.log('[AutoExportHandler] Document exported successfully without template');
        return true;
      }
    } catch (error) {
      console.error('[AutoExportHandler] Failed to export document:', error);
      return false;
    }
  }
}

// Singleton instance
let autoExportHandler: AutoExportHandler | null = null;

export function getAutoExportHandler(): AutoExportHandler {
  if (!autoExportHandler) {
    autoExportHandler = new AutoExportHandler();
  }
  return autoExportHandler;
}