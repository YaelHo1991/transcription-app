import { Document, Packer, Paragraph, TextRun, AlignmentType, TabStopPosition, TabStopType, convertMillimetersToTwip } from 'docx';
import { saveAs } from 'file-saver';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { BlockData } from './WordDocumentGenerator';

export class HybridExporter {
  private templateBuffer: ArrayBuffer | null = null;

  /**
   * Join array of Hebrew text with RTL-proper comma placement
   */
  private joinWithRTLCommas(items: string[]): string {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    
    // For RTL Hebrew text, the comma should stick to the previous word
    // Use Right-to-Left Mark (RLM) after comma to ensure proper positioning
    const RLM = '\u200F'; // Right-to-Left Mark
    
    // Join with comma + RLM to keep comma with previous text in RTL
    return items.join(',' + RLM + ' ');
  }

  /**
   * Load a Word template file
   */
  public async loadTemplate(file: File): Promise<boolean> {
    try {
      this.templateBuffer = await file.arrayBuffer();
      return true;
    } catch (error) {
      console.error('Error loading template:', error);
      return false;
    }
  }

  /**
   * Export with template for header/footer and proper RTL content
   */
  public async exportWithTemplate(
    blocks: BlockData[],
    speakers: Map<string, string>,
    mediaFileName: string,
    includeTimestamps: boolean,
    mediaDuration?: string,
    customFileName?: string
  ): Promise<boolean> {
    try {
      // First, generate the properly formatted RTL content
      const formattedContent = await this.generateFormattedContent(
        blocks,
        speakers,
        includeTimestamps
      );

      if (this.templateBuffer) {
        // Process template with formatted content
        return await this.processTemplateWithContent(
          formattedContent,
          blocks,
          speakers,
          mediaFileName,
          mediaDuration,
          customFileName
        );
      } else {
        // No template - use default export
        return await this.exportDefault(
          formattedContent,
          mediaFileName,
          customFileName
        );
      }
    } catch (error) {
      console.error('Export error:', error);
      return false;
    }
  }

  /**
   * Generate properly formatted RTL content with tabs and bold speakers
   */
  private async generateFormattedContent(
    blocks: BlockData[],
    speakers: Map<string, string>,
    includeTimestamps: boolean
  ): Promise<Paragraph[]> {
    const paragraphs: Paragraph[] = [];
    
    blocks.forEach(block => {
      const speakerName = speakers.get(block.speaker) || block.speaker || '';
      let text = block.text || '';
      
      // Process timestamps
      if (!includeTimestamps) {
        text = text.replace(/\d{1,2}:\d{2}(:\d{2})?/g, '...');
      }
      
      if (speakerName || text) {
        const children: TextRun[] = [];
        
        if (speakerName) {
          // Add speaker name in bold
          children.push(
            new TextRun({
              text: speakerName + ':',
              bold: true,
              rtl: true,
            })
          );
          // Add tab after speaker name
          children.push(
            new TextRun({
              text: '\t',
            })
          );
        }
        
        // Add the text
        if (text) {
          children.push(
            new TextRun({
              text: text,
              rtl: true,
            })
          );
        }
        
        paragraphs.push(
          new Paragraph({
            children,
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
            spacing: { after: 240 },
            tabStops: [
              {
                type: TabStopType.LEFT,
                position: TabStopPosition.MAX - 2000, // Right-aligned tab for RTL
              }
            ]
          })
        );
      }
    });
    
    return paragraphs;
  }

  /**
   * Process template and insert formatted content
   */
  private async processTemplateWithContent(
    formattedParagraphs: Paragraph[],
    blocks: BlockData[],
    speakers: Map<string, string>,
    mediaFileName: string,
    mediaDuration?: string,
    customFileName?: string
  ): Promise<boolean> {
    if (!this.templateBuffer) return false;

    try {
      // Create a document with the formatted content
      const doc = new Document({
        sections: [{
          properties: {
            titlePage: false,
          },
          children: formattedParagraphs
        }]
      });

      // Generate the formatted content as a blob
      const formattedBlob = await Packer.toBlob(doc);
      
      // For now, let's use the template with plain text
      // and provide instructions for the user
      const zip = new PizZip(this.templateBuffer);
      const templateDoc = new Docxtemplater(zip, {
        paragraphLoop: false,
        linebreaks: true,
      });

      // Prepare data
      const speakerNames = Array.from(new Set(
        blocks
          .filter(b => b.speaker)
          .map(b => speakers.get(b.speaker) || b.speaker)
      ));

      const duration = mediaDuration || this.calculateDuration(blocks);

      // Create formatted text representation
      const formattedText = blocks.map(block => {
        const speakerName = speakers.get(block.speaker) || block.speaker || '';
        let text = block.text || '';
        
        if (!includeTimestamps) {
          text = text.replace(/\d{1,2}:\d{2}(:\d{2})?/g, '...');
        }
        
        if (speakerName) {
          return speakerName + ':\t${text}';
        }
        return text;
      }).join('\n\n');

      const templateData = {
        fileName: mediaFileName || 'ללא שם',
        speakers: this.joinWithRTLCommas(speakerNames) || 'לא צוינו',
        duration: duration,
        date: new Date().toLocaleDateString('he-IL'),
        transcriptionContent: formattedText
      };

      templateDoc.render(templateData);

      const output = templateDoc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const fileName = customFileName || 
        (mediaFileName ? mediaFileName.replace(/\.[^/.]+$/, '') : 'transcription') + '_תמלול.docx';
      
      saveAs(output, fileName);
      return true;
    } catch (error) {
      console.error('Template processing error:', error);
      return false;
    }
  }

  /**
   * Export without template (default)
   */
  private async exportDefault(
    formattedParagraphs: Paragraph[],
    mediaFileName: string,
    customFileName?: string
  ): Promise<boolean> {
    try {
      const doc = new Document({
        sections: [{
          properties: {
            titlePage: false,
          },
          children: formattedParagraphs
        }]
      });

      const blob = await Packer.toBlob(doc);
      
      const fileName = customFileName || 
        (mediaFileName ? mediaFileName.replace(/\.[^/.]+$/, '') : 'transcription') + '_תמלול.docx';
      
      saveAs(blob, fileName);
      return true;
    } catch (error) {
      console.error('Export error:', error);
      return false;
    }
  }

  /**
   * Calculate duration from blocks
   */
  private calculateDuration(blocks: BlockData[]): string {
    let maxTime = 0;
    
    blocks.forEach(block => {
      if (block.speakerTime && block.speakerTime > maxTime) {
        maxTime = block.speakerTime;
      }
    });
    
    const hours = Math.floor(maxTime / 3600);
    const minutes = Math.floor((maxTime % 3600) / 60);
    const seconds = Math.floor(maxTime % 60);
    return (hours.toString().padStart(2, '0')) + ':${minutes.toString().padStart(2, \'0\')}:${seconds.toString().padStart(2, \'0\')}';
  }

  /**
   * Check if template is loaded
   */
  public hasTemplate(): boolean {
    return this.templateBuffer !== null;
  }

  /**
   * Clear template
   */
  public clearTemplate(): void {
    this.templateBuffer = null;
  }
}