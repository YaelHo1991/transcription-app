import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { BlockData, WordDocumentGenerator } from './WordDocumentGenerator';
import { Document, Packer, Paragraph, TextRun, AlignmentType, TabStopType } from 'docx';
import { extractBodyXML, injectFormattedXML } from './xmlMerger';
// @ts-ignore - docx-merger doesn't have TypeScript definitions
import DocxMerger from 'docx-merger';

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

export class TemplateProcessor {
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
    return items.join(',' + (RLM) + ' ');
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
   * Generate RTF content for clipboard or export
   * RTF preserves formatting and Hebrew RTL properly
   */
  public generateRTFContent(
    blocks: BlockData[],
    speakers: Map<string, string>,
    includeTimestamps: boolean
  ): string {
    // RTF header with Hebrew support
    let rtf = '{\\rtf1\\ansi\\deff0 {\\fonttbl{\\f0 Times New Roman;}{\\f1 David;}}';
    rtf += '\\viewkind4\\uc1\\pard\\rtlpar\\f1\\fs24 '; // RTL paragraph, David font, 12pt
    
    blocks.forEach((block, index) => {
      const speakerName = speakers.get(block.speaker) || block.speaker || '';
      const text = this.processTimestamp(block.text || '', includeTimestamps);
      
      if (speakerName && text) {
        // Bold speaker name
        rtf += '\\b ' + this.escapeRTF(speakerName) + ':\\b0\\tab ' + this.escapeRTF(text);
      } else if (text) {
        rtf += this.escapeRTF(text);
      }
      
      // Add paragraph break (not line break)
      if (index < blocks.length - 1) {
        rtf += '\\par ';
      }
    });
    
    rtf += '}';
    return rtf;
  }

  /**
   * Escape special RTF characters
   */
  private escapeRTF(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/{/g, '\\{')
      .replace(/}/g, '\\}');
  }

  /**
   * Copy formatted content to clipboard
   */
  public async copyToClipboard(
    blocks: BlockData[],
    speakers: Map<string, string>,
    includeTimestamps: boolean
  ): Promise<void> {
    const rtfContent = this.generateRTFContent(blocks, speakers, includeTimestamps);
    
    // Create HTML version too
    const htmlContent = blocks.map(block => {
      const speakerName = speakers.get(block.speaker) || block.speaker || '';
      const text = this.processTimestamp(block.text || '', includeTimestamps);
      
      if (speakerName && text) {
        return '<p dir="rtl"><b>' + speakerName + ':</b>&nbsp;&nbsp;&nbsp;&nbsp;' + text + '</p>';
      }
      return '<p dir="rtl">' + (text) + '</p>';
    }).join('');
    
    // Copy both RTF and HTML to clipboard
    if (navigator.clipboard && window.ClipboardItem) {
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const rtfBlob = new Blob([rtfContent], { type: 'text/rtf' });
      
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': blob,
            'text/rtf': rtfBlob
          })
        ]);
        alert('התוכן הועתק ללוח. פתח את תבנית Word שלך והדבק (Ctrl+V)');
      } catch (err) {
        console.error('Failed to copy:', err);
        // Fallback to simple HTML copy
        const el = document.createElement('div');
        el.innerHTML = htmlContent;
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        
        const range = document.createRange();
        range.selectNodeContents(el);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        
        document.execCommand('copy');
        document.body.removeChild(el);
        
        alert('התוכן הועתק ללוח. פתח את תבנית Word שלך והדבק (Ctrl+V)');
      }
    }
  }

  /**
   * Process template with simple formatted text
   * Creates properly formatted content as single text block
   */
  public async processTemplateSimple(
    blocks: BlockData[],
    speakers: Map<string, string>,
    mediaFileName: string,
    includeTimestamps: boolean,
    mediaDuration?: string,
    customFileName?: string
  ): Promise<boolean> {
    // For now, just copy to clipboard instead
    await this.copyToClipboard(blocks, speakers, includeTimestamps);
    
    alert('התוכן המעוצב הועתק ללוח!\n\n' +
          '1. פתח את תבנית Word שלך\n' +
          '2. מקם את הסמן במקום הרצוי\n' +
          '3. הדבק (Ctrl+V)\n' +
          '4. העיצוב יישמר - כולל bold, tabs, ו-RTL');
    
    return true;
  }

  /**
   * Process template with FORMATTED body - SINGLE COMBINED DOCUMENT
   * This creates ONE document with your template AND formatted body
   */
  public async processTemplateWithFormattedBody(
    blocks: BlockData[],
    speakers: Map<string, string>,
    mediaFileName: string,
    includeTimestamps: boolean,
    mediaDuration?: string,
    customFileName?: string
  ): Promise<boolean> {
    if (!this.templateBuffer) {
      return false;
    }

    try {
      // Step 1: Process the template with docxtemplater for metadata
      const zip = new PizZip(this.templateBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: false,
        linebreaks: true,
      });

      // Prepare template data
      const speakerNames = Array.from(new Set(
        blocks
          .filter(b => b.speaker)
          .map(b => speakers.get(b.speaker) || b.speaker)
      ));

      const duration = mediaDuration || this.calculateDuration(blocks);
      
      // Fill template placeholders but leave transcriptionContent empty or with a marker
      const templateData: any = {
        fileName: this.wrapFileNameForRTL(mediaFileName || 'ללא שם'),
        speakers: this.joinWithRTLCommas(speakerNames) || 'לא צוינו',
        duration: duration,
        date: new Date().toLocaleDateString('he-IL'),
        transcriptionContent: '' // Leave empty for merge
      };

      // Render the template with placeholders
      doc.render(templateData);
      
      // Get template as ArrayBuffer for merging
      const templateProcessed = doc.getZip().generate({
        type: 'arraybuffer',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      // Step 2: Generate body-only document with perfect formatting
      const generator = new WordDocumentGenerator();
      const bodyBuffer = await generator.generateBodyBuffer(blocks, speakers, includeTimestamps);

      // Step 3: Merge the two documents using docx-merger
      // Convert ArrayBuffers to binary strings for docx-merger
      const templateBinary = this.arrayBufferToBinaryString(templateProcessed);
      const bodyBinary = this.arrayBufferToBinaryString(bodyBuffer);

      // Create merger and merge documents
      const merger = new DocxMerger({}, [templateBinary, bodyBinary]);

      // Save merged document
      merger.save('blob', (mergedBlob: Blob) => {
        const fileName = customFileName || 
          (mediaFileName ? mediaFileName.replace(/\.[^/.]+$/, '') : 'transcription') + '_merged.docx';
        
        saveAs(mergedBlob, fileName);
      });
      
      return true;
    } catch (error) {
      console.error('Error in merge processing:', error);
      alert('שגיאה במיזוג: ' + error);
      return false;
    }
  }

  /**
   * Convert ArrayBuffer to binary string for docx-merger
   */
  private arrayBufferToBinaryString(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binaryString = '';
    for (let i = 0; i < bytes.length; i++) {
      binaryString += String.fromCharCode(bytes[i]);
    }
    return binaryString;
  }

  /**
   * Process template with transcription data using HYBRID approach
   * Template for headers/metadata + Formatted body generation
   */
  public async processTemplate(
    blocks: BlockData[],
    speakers: Map<string, string>,
    mediaFileName: string,
    includeTimestamps: boolean,
    mediaDuration?: string,
    customFileName?: string
  ): Promise<boolean> {
    if (!this.templateBuffer) {
      return false;
    }

    try {
      // Step 1: Generate the perfectly formatted body content
      const formattedBody = await this.generateFormattedBody(blocks, speakers, includeTimestamps);
      
      // Step 2: Process the template with placeholders
      const zip = new PizZip(this.templateBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: false,
        linebreaks: true,
      });

      // Prepare speaker names
      const speakerNames = Array.from(new Set(
        blocks
          .filter(b => b.speaker)
          .map(b => speakers.get(b.speaker) || b.speaker)
      ));

      // Calculate duration
      const duration = mediaDuration || this.calculateDuration(blocks);

      // For now, we'll use a marker that we can replace later
      // This is a placeholder approach - we'll enhance this
      const templateData: any = {
        fileName: this.wrapFileNameForRTL(mediaFileName || 'ללא שם'),
        speakers: this.joinWithRTLCommas(speakerNames) || 'לא צוינו',
        duration: duration,
        date: new Date().toLocaleDateString('he-IL'),
        // Use a special marker for where formatted content should go
        transcriptionContent: '[FORMATTED_BODY_HERE]',
        // Keep blocks for backward compatibility
        blocks: blocks.map(block => ({
          speaker: speakers.get(block.speaker) || block.speaker || '',
          text: this.processTimestamp(block.text || '', includeTimestamps)
        }))
      };

      // Render the template
      doc.render(templateData);

      // Get the rendered document
      const renderedZip = doc.getZip();
      
      // Step 3: Replace the marker with formatted content
      // For now, we'll generate two documents and advise the user
      // In a full implementation, we'd merge the XML
      
      // Generate template document
      const templateOutput = renderedZip.generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      // Also generate the body-only document for reference
      const generator = new WordDocumentGenerator();
      
      // Save the template version (for now)
      const fileName = customFileName || 
        (mediaFileName ? mediaFileName.replace(/\.[^/.]+$/, '') : 'transcription') + '_תמלול.docx';
      
      // For testing: Save both files
      saveAs(templateOutput, 'template_' + fileName);
      
      // Also generate body-only for comparison
      await generator.generateBodyOnly(blocks, speakers, includeTimestamps, 'body_' + fileName);
      
      alert('נוצרו 2 קבצים: template_ (עם התבנית) ו-body_ (עם העיצוב המושלם). השלב הבא: מיזוג אוטומטי.');
      
      return true;
    } catch (error: any) {
      console.error('Error processing template:', error);
      
      // Better error reporting for template errors
      if (error.properties && error.properties.errors) {
        const errors = error.properties.errors;
        errors.forEach((err: any) => {
          console.error('Template error:', {
            type: err.name,
            message: err.message,
            location: err.properties
          });
          
          if (err.name === 'unopened_tag' || err.name === 'unclosed_tag') {
            alert('שגיאה בתבנית: תג ' + (err.properties.xtag) + ' לא נסגר כראוי');
          } else if (err.name === 'multi_error') {
            alert('שגיאה בתבנית: ישנן מספר שגיאות בתבנית. בדוק את ה-Console לפרטים.');
          } else {
            alert('שגיאה בתבנית: ' + (err.message || err.name));
          }
        });
      } else {
        alert('שגיאה בעיבוד התבנית. בדוק את ה-Console לפרטים.');
      }
      
      return false;
    }
  }

  /**
   * Generate properly formatted body content with tabs and bold
   * This matches the generateBodyOnly method from WordDocumentGenerator
   */
  private async generateFormattedBody(
    blocks: BlockData[],
    speakers: Map<string, string>,
    includeTimestamps: boolean
  ): Promise<Paragraph[]> {
    const paragraphs: Paragraph[] = [];
    
    blocks.forEach(block => {
      if (!block.speaker && !block.text) return;
      
      const speakerName = speakers.get(block.speaker) || block.speaker || '';
      const text = this.processTimestamp(block.text || '', includeTimestamps);
      
      if (speakerName && text) {
        const textRuns: TextRun[] = [];
        
        // Speaker name - BOLD with RTL
        textRuns.push(
          new TextRun({
            text: speakerName + ':',
            bold: true,
            font: 'David',
            size: 12 * 2,
            color: '000080',
            rtl: true
          })
        );
        
        // TAB character - REAL TAB
        textRuns.push(
          new TextRun({
            text: '\t' + text,
            font: 'David',
            size: 12 * 2,
            color: '000000',
            rtl: true
          })
        );
        
        paragraphs.push(
          new Paragraph({
            children: textRuns,
            alignment: AlignmentType.JUSTIFIED, // Align to both sides
            bidirectional: true,
            spacing: {
              after: 120,
              line: 360
            },
            indent: {
              left: 1440,
              hanging: 1440
            },
            tabStops: [{
              type: TabStopType.LEFT,
              position: 1440
            }]
          })
        );
      } else if (text) {
        // Text without speaker
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: text,
                font: 'David',
                size: 12 * 2,
                color: '000000',
                rtl: true
              })
            ],
            alignment: AlignmentType.JUSTIFIED,
            bidirectional: true,
            spacing: {
              after: 120,
              line: 360
            }
          })
        );
      }
    });
    
    return paragraphs;
  }

  /**
   * Process timestamp in text
   */
  private processTimestamp(text: string, includeTimestamps: boolean): string {
    if (includeTimestamps) {
      // Remove brackets around timestamps, keep just the time
      // Pattern: [ before timestamp and ] after, with optional space and text
      return text.replace(/\s*\[(\d{1,2}:\d{2}(:\d{2})?)[^\]]*\]/g, ' $1');
    }
    // Replace timestamps with ... (remove brackets too)
    // First remove bracketed timestamps
    text = text.replace(/\s*\[(\d{1,2}:\d{2}(:\d{2})?)[^\]]*\]/g, ' ...');
    // Then replace any remaining bare timestamps
    return text.replace(/\d{1,2}:\d{2}(:\d{2})?/g, '...');
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
    return hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
  }

  /**
   * Wrap text with RTL embedding marks to fix punctuation position
   */
  private wrapTextForRTL(text: string): string {
    // Unicode directional marks
    const RLE = '\u202B'; // Right-to-Left Embedding
    const PDF = '\u202C'; // Pop Directional Formatting
    const RLM = '\u200F'; // Right-to-Left Mark
    
    // Method 1: Wrap entire text with RLE...PDF
    // This tells Word to treat everything inside as RTL
    const wrappedText = RLE + text + PDF;
    
    // Method 2: Add RLM after punctuation to keep it with Hebrew text
    // This ensures punctuation stays on the correct side
    const textWithRLM = wrappedText.replace(/([.!?,;:])/g, '$1' + RLM);
    
    return textWithRLM;
  }

  /**
   * Wrap file name with RTL direction for proper display
   */
  private wrapFileNameForRTL(fileName: string): string {
    const RLE = '\u202B'; // Right-to-Left Embedding
    const PDF = '\u202C'; // Pop Directional Formatting
    return RLE + fileName + PDF;
  }

  /**
   * Wrap speaker name with RTL marks for proper display
   */
  private wrapSpeakerForRTL(speaker: string): string {
    if (!speaker) return '';
    // Use the same wrapping as text for consistency
    return this.wrapTextForRTL(speaker);
  }

  /**
   * Build pre-formatted content with proper RTL handling and line numbers
   * This creates structured data for docxtemplater with formatting preserved
   */
  private buildFormattedBlocks(
    blocks: BlockData[],
    speakers: Map<string, string>,
    includeTimestamps: boolean
  ): any[] {
    const formattedBlocks: any[] = [];
    let actualLineNumber = 0;
    
    blocks.forEach((block, index) => {
      if (!block.speaker && !block.text) return;
      
      actualLineNumber++;
      
      // Generate line number every 5 lines
      const lineNum = (actualLineNumber % 5 === 0) ? actualLineNumber.toString() : '';
      
      const speakerName = speakers.get(block.speaker) || block.speaker || '';
      const text = this.processTimestamp(block.text || '', includeTimestamps);
      
      if (speakerName && text) {
        // For RTL, we need to keep speaker and colon together
        // AND wrap the text with RTL embedding to fix punctuation
        formattedBlocks.push({
          lineNumber: lineNum.padEnd(3, ' '), // Pad for alignment
          speaker: this.wrapTextForRTL(speakerName + ':'), // Wrap speaker with RTL marks
          speakerOnly: speakerName,  // Just the name without colon
          text: this.wrapTextForRTL(text), // Wrap text with RTL marks to fix punctuation
          hasSpeaker: true
        });
      } else if (text) {
        // Line without speaker
        formattedBlocks.push({
          lineNumber: lineNum.padEnd(3, ' '),
          speaker: '',
          text: this.wrapTextForRTL(text), // Wrap text with RTL marks
          hasSpeaker: false
        });
      }
    });
    
    return formattedBlocks;
  }
  
  /**
   * Build pre-formatted content as a single text block (legacy method)
   */
  private buildFormattedContent(
    blocks: BlockData[],
    speakers: Map<string, string>,
    includeTimestamps: boolean
  ): string {
    const lines: string[] = [];
    let actualLineNumber = 0;
    
    blocks.forEach((block, index) => {
      if (!block.speaker && !block.text) return;
      
      actualLineNumber++;
      
      // Generate line number every 5 lines
      const lineNum = (actualLineNumber % 5 === 0) ? actualLineNumber.toString() : '';
      const lineNumPadded = lineNum ? lineNum.padEnd(3, ' ') : '   '; // Always use 3 spaces for alignment
      
      const speakerName = speakers.get(block.speaker) || block.speaker || '';
      const text = this.processTimestamp(block.text || '', includeTimestamps);
      
      if (speakerName && text) {
        // Use Unicode RTL marks to ensure proper text direction
        const RTL_MARK = '\u200F'; // Right-to-left mark
        const LRM = '\u200E'; // Left-to-right mark for numbers
        
        // Format line number with LTR mark (numbers should be LTR)
        const formattedLineNum = lineNum ? LRM + lineNumPadded + RTL_MARK : '   ';
        
        // Build the line with proper RTL formatting
        // Keep speaker and colon together, then tab, then text
        const formattedLine = formattedLineNum + '\t' + RTL_MARK + speakerName + ':' + RTL_MARK + '\t' + RTL_MARK + text + RTL_MARK;
        
        lines.push(formattedLine);
      } else if (text) {
        // Line without speaker
        const formattedLineNum = lineNum ? (lineNum) + '   ' : '   ';
        const RTL_MARK = '\u200F';
        lines.push(formattedLineNum + '\t\t' + RTL_MARK + text + RTL_MARK);
      }
    });
    
    return lines.join('\n');
  }

  /**
   * Process template with pre-formatted content (for testing RTL issues)
   * Uses structured blocks with {#formattedBlocks} loop for proper formatting
   */
  public async processTemplateWithFormattedContent(
    blocks: BlockData[],
    speakers: Map<string, string>,
    mediaFileName: string,
    includeTimestamps: boolean,
    mediaDuration?: string,
    customFileName?: string
  ): Promise<boolean> {
    if (!this.templateBuffer) {
      alert('אנא העלה תבנית Word תחילה');
      return false;
    }

    try {
      // Process the template with docxtemplater
      const zip = new PizZip(this.templateBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,  // Enable paragraph loops for better formatting
        linebreaks: true,
        delimiters: {
          start: '{',
          end: '}'
        }
      });

      // Prepare speaker names
      const speakerNames = Array.from(new Set(
        blocks
          .filter(b => b.speaker)
          .map(b => speakers.get(b.speaker) || b.speaker)
      ));

      // Calculate duration
      const duration = mediaDuration || this.calculateDuration(blocks);
      
      // Build the formatted blocks for structured template processing
      const formattedBlocks = this.buildFormattedBlocks(blocks, speakers, includeTimestamps);
      
      // Also build single formatted content for backward compatibility
      const formattedContent = this.buildFormattedContent(blocks, speakers, includeTimestamps);
      
      // Prepare template data with both formats
      const templateData = {
        fileName: this.wrapFileNameForRTL(mediaFileName || 'ללא שם'),
        speakers: this.joinWithRTLCommas(speakerNames) || 'לא צוינו',
        duration: duration,
        date: new Date().toLocaleDateString('he-IL'),
        formattedContent: formattedContent,  // Single pre-formatted block (for templates using this)
        formattedBlocks: formattedBlocks     // Structured blocks (for templates using loop)
      };

      console.log('Template data with formatted blocks:', {
        fileName: templateData.fileName,
        blocksCount: formattedBlocks.length,
        firstBlock: formattedBlocks[0]
      });

      // Render the template
      doc.render(templateData);

      // Generate and save the document
      const blob = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const fileName = customFileName || 
        (mediaFileName ? mediaFileName.replace(/\.[^/.]+$/, '') : 'transcription') + '_preformatted.docx';
      
      saveAs(blob, fileName);
      
      console.log('Pre-formatted template document generated successfully');
      return true;
    } catch (error: any) {
      console.error('Error processing template with formatted content:', error);
      
      // Better error reporting
      if (error.properties && error.properties.errors) {
        const errors = error.properties.errors;
        errors.forEach((err: any) => {
          console.error('Template error detail:', err);
        });
        alert('שגיאה בתבנית: ' + errors[0].message);
      } else {
        alert('שגיאה בעיבוד התבנית: ' + (error.message || error));
      }
      
      return false;
    }
  }

  /**
   * Process template with Hebrew conversion
   * Sends the document to backend for conversion and downloads the result
   */
  public async processTemplateWithConversion(
    blocks: BlockData[],
    speakers: Map<string, string>,
    mediaFileName: string,
    includeTimestamps: boolean,
    mediaDuration?: string,
    customFileName?: string
  ): Promise<boolean> {
    if (!this.templateBuffer) {
      alert('אנא העלה תבנית Word תחילה');
      return false;
    }

    try {
      // First process the template normally
      const zip = new PizZip(this.templateBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: {
          start: '{',
          end: '}'
        }
      });

      // Prepare speaker names
      const speakerNames = Array.from(new Set(
        blocks
          .filter(b => b.speaker)
          .map(b => speakers.get(b.speaker) || b.speaker)
      ));

      const duration = mediaDuration || this.calculateDuration(blocks);

      // Prepare template data with RTL support
      const templateData = {
        fileName: this.wrapFileNameForRTL(mediaFileName || 'ללא שם'),
        speakers: this.joinWithRTLCommas(speakerNames) || 'לא צוינו',
        duration: duration,
        date: new Date().toLocaleDateString('he-IL'),
        formattedBlocks: blocks
          .filter(block => block.text || block.speaker)
          .map(block => ({
            speaker: block.speaker 
              ? this.wrapSpeakerForRTL((speakers.get(block.speaker) || block.speaker) + ':')
              : '',
            text: this.wrapTextForRTL(this.processTimestamp(block.text || '', includeTimestamps))
          }))
      };

      // Render the template
      doc.render(templateData);

      // Get the document as blob
      const blob = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      // Create FormData for upload
      const formData = new FormData();
      formData.append('document', blob, 'temp.docx');
      formData.append('fileName', customFileName || (mediaFileName?.replace(/\.[^/.]+$/, '') || 'transcription') + '_תמלול');

      // Send to backend for conversion
      // Use relative URL to avoid HTTPS/HTTP issues
      const baseUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
        ? '' // Use relative URL on production
        : 'http://localhost:5000'; // Use explicit URL on localhost
      const response = await fetch(baseUrl + '/api/template/convert-and-export', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Conversion failed');
      }

      // Download the converted file
      const convertedBlob = await response.blob();
      const fileName = customFileName || 
        (mediaFileName ? mediaFileName.replace(/\.[^/.]+$/, '') : 'transcription') + '_תמלול.docx';
      
      saveAs(convertedBlob, fileName);
      
      console.log('Document converted and downloaded successfully');
      return true;
    } catch (error: any) {
      console.error('Error processing template with conversion:', error);
      alert('שגיאה בעיבוד המסמך: ' + (error.message || error));
      return false;
    }
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