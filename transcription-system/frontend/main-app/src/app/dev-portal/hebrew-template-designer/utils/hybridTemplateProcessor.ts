import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { 
  Document, 
  Paragraph, 
  TextRun, 
  AlignmentType,
  TabStopType,
  Packer,
  ISectionOptions
} from 'docx';
import { saveAs } from 'file-saver';

interface TemplateData {
  fileName: string;
  speakers: string;
  duration: string;
  date: string;
  blocks: Array<{
    speaker: string;
    text: string;
  }>;
}

interface ProcessResult {
  success: boolean;
  message: string;
}

export class HybridTemplateProcessor {
  private templateBuffer: ArrayBuffer | null = null;
  private templateName: string = '';

  /**
   * Load a Word template file
   */
  public async loadTemplate(file: File): Promise<ProcessResult> {
    try {
      console.log('Loading template for hybrid processing:', file.name);
      this.templateBuffer = await file.arrayBuffer();
      this.templateName = file.name;
      
      return {
        success: true,
        message: `Template "${file.name}" loaded successfully`
      };
    } catch (error) {
      console.error('Error loading template:', error);
      return {
        success: false,
        message: `Error loading template: ${error}`
      };
    }
  }

  /**
   * Process template with hybrid approach
   */
  public async processTemplate(data: TemplateData): Promise<ProcessResult> {
    if (!this.templateBuffer) {
      return {
        success: false,
        message: 'No template loaded. Please upload a template first.'
      };
    }

    try {
      console.log('Starting hybrid template processing...');
      
      // Phase 1: Process simple placeholders with docxtemplater
      const phase1Buffer = await this.processSimpleFields(data);
      
      // Phase 2: Insert RTL transcription content
      const finalBuffer = await this.insertRTLContent(phase1Buffer, data.blocks);
      
      // Save the final document
      const fileName = `${data.fileName.replace(/\.[^/.]+$/, '')}_תמלול_${Date.now()}.docx`;
      const blob = new Blob([finalBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      saveAs(blob, fileName);
      
      console.log('Hybrid processing complete:', fileName);
      
      return {
        success: true,
        message: `Document generated: ${fileName}`
      };
    } catch (error) {
      console.error('Error in hybrid processing:', error);
      return {
        success: false,
        message: `Error processing template: ${error}`
      };
    }
  }

  /**
   * Phase 1: Process simple fields with docxtemplater
   */
  private async processSimpleFields(data: TemplateData): Promise<ArrayBuffer> {
    console.log('Phase 1: Processing simple fields...');
    
    const zip = new PizZip(this.templateBuffer!);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: false,
      linebreaks: true,
    });
    
    // Prepare data without blocks (we'll handle those separately)
    const simpleData = {
      fileName: data.fileName,
      speakers: data.speakers,
      duration: data.duration,
      date: data.date,
      // Add a placeholder that we'll replace in phase 2
      transcriptionContent: '[TRANSCRIPTION_PLACEHOLDER]'
    };
    
    doc.render(simpleData);
    
    const output = doc.getZip().generate({
      type: 'arraybuffer',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    
    console.log('Phase 1 complete');
    return output as ArrayBuffer;
  }

  /**
   * Phase 2: Insert RTL-formatted transcription content
   */
  private async insertRTLContent(
    templateBuffer: ArrayBuffer, 
    blocks: Array<{speaker: string; text: string}>
  ): Promise<ArrayBuffer> {
    console.log('Phase 2: Inserting RTL content...');
    
    // Create RTL-formatted paragraphs for each block
    const transcriptionParagraphs = this.createRTLParagraphs(blocks);
    
    // For now, we'll append the transcription at the end
    // In a full implementation, we'd find and replace [TRANSCRIPTION_PLACEHOLDER]
    
    // Load the template document
    const zip = new PizZip(templateBuffer);
    
    // Extract the document XML
    const documentXml = zip.file('word/document.xml')?.asText();
    if (!documentXml) {
      throw new Error('Could not read document XML');
    }
    
    // Find the placeholder and replace with RTL content
    // For simplicity, we'll just append for now
    // In production, you'd properly parse and modify the XML
    
    // Generate the RTL content as a standalone document first
    const rtlDoc = new Document({
      sections: [{
        properties: {},
        children: transcriptionParagraphs
      }]
    });
    
    // Convert to buffer
    const rtlBuffer = await Packer.toBuffer(rtlDoc);
    
    // For now, return the original with a note
    // Full implementation would merge the documents
    console.log('Phase 2 complete - RTL content prepared');
    
    // Temporary: Just return the RTL document for testing
    return rtlBuffer;
  }

  /**
   * Create RTL-formatted paragraphs (based on working WordDocumentGenerator)
   */
  private createRTLParagraphs(blocks: Array<{speaker: string; text: string}>): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    
    blocks.forEach((block) => {
      if (!block.speaker && !block.text) {
        return; // Skip empty blocks
      }
      
      const textRuns: TextRun[] = [];
      
      // Add speaker name in bold
      if (block.speaker) {
        textRuns.push(
          new TextRun({
            text: block.speaker + ':',
            bold: true,
            size: 24,
            font: 'David'
          })
        );
        
        // Add tab for spacing
        textRuns.push(
          new TextRun({
            text: '\t' + block.text,
            size: 24,
            font: 'David'
          })
        );
      } else {
        // Just text without speaker
        textRuns.push(
          new TextRun({
            text: block.text,
            size: 24,
            font: 'David'
          })
        );
      }
      
      // Create paragraph with RTL settings
      paragraphs.push(
        new Paragraph({
          children: textRuns,
          alignment: AlignmentType.RIGHT,
          bidirectional: true, // This is the key for Hebrew RTL!
          spacing: {
            after: 120 // Space between paragraphs
          },
          indent: {
            left: 720, // 0.5 inch indent
            hanging: 720 // Hanging indent for speaker name
          },
          tabStops: [
            {
              type: TabStopType.LEFT,
              position: 1440 // 1 inch from left margin
            }
          ]
        })
      );
    });
    
    return paragraphs;
  }

  /**
   * Get template info
   */
  public getTemplateInfo(): { loaded: boolean; name: string } {
    return {
      loaded: this.templateBuffer !== null,
      name: this.templateName
    };
  }

  /**
   * Clear loaded template
   */
  public clearTemplate(): void {
    this.templateBuffer = null;
    this.templateName = '';
  }
}