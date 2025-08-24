import { Document, Paragraph, TextRun, AlignmentType, HeadingLevel, TabStopPosition, TabStopType, LevelFormat, Packer, UnderlineType, PageOrientation, BorderStyle, convertMillimetersToTwip, Header, Footer, PageNumber } from 'docx';
import { saveAs } from 'file-saver';
import { WordTemplateEngine, WordTemplate } from '../../../../../dev-portal/template-designer/WordTemplateEngine';
import { HtmlDocumentGenerator } from './HtmlDocumentGenerator';
// @ts-ignore
import htmlDocx from 'html-docx-js/dist/html-docx';

export interface BlockData {
  id: string;
  speaker: string;
  text: string;
  speakerTime?: number;
  timestamp?: string;
}

export interface SpeakerData {
  code: string;
  name: string;
  color?: string;
}

export interface ExportOptions {
  includeTimestamps?: boolean;
  includePageNumbers?: boolean;
  fileName?: string;
  mediaDuration?: string;
}

export class WordDocumentGenerator {
  private templateEngine: WordTemplateEngine;

  constructor() {
    this.templateEngine = new WordTemplateEngine();
  }

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
    return items.join(`,${RLM} `);
  }

  /**
   * Generate body-only document as buffer for merging
   */
  public async generateBodyBuffer(
    blocks: BlockData[],
    speakers: Map<string, string>,
    includeTimestamps: boolean = false
  ): Promise<ArrayBuffer> {
    const children: Paragraph[] = [];
    
    // Process each block with proper formatting
    blocks.forEach(block => {
      if (!block.speaker && !block.text) return;
      
      const speakerName = speakers.get(block.speaker) || block.speaker || '';
      const processedText = this.processTimestamp(block.text || '', includeTimestamps);
      
      if (speakerName && processedText) {
        const textRuns: TextRun[] = [];
        
        // Speaker name - BOLD with RTL
        textRuns.push(
          new TextRun({
            text: speakerName + ':',
            bold: true,
            font: 'David',
            size: 12 * 2, // Word uses half-points
            color: '000080',
            rtl: true
          })
        );
        
        // TAB character - REAL TAB
        textRuns.push(
          new TextRun({
            text: '\t' + processedText,
            font: 'David',
            size: 12 * 2,
            color: '000000',
            rtl: true
          })
        );
        
        children.push(
          new Paragraph({
            children: textRuns,
            alignment: AlignmentType.JUSTIFIED,
            bidirectional: true,
            spacing: {
              after: 120,
              line: 360
            },
            // Remove indents that might conflict
            // indent: {
            //   left: 1440,
            //   hanging: 1440
            // },
            // tabStops: [{
            //   type: TabStopType.LEFT,
            //   position: 1440
            // }]
          })
        );
      } else if (processedText) {
        // Text without speaker
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: processedText,
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
    
    // Create document with minimal settings - let template control layout
    const doc = new Document({
      sections: [{
        children: children
      }]
    });
    
    // Generate and return as ArrayBuffer
    const blob = await Packer.toBlob(doc);
    return blob.arrayBuffer();
  }

  /**
   * Generate ONLY the body content with perfect formatting
   * This is for testing and for later merging with templates
   */
  public async generateBodyOnly(
    blocks: BlockData[],
    speakers: Map<string, string>,
    includeTimestamps: boolean = false,
    fileName?: string
  ): Promise<void> {
    const children: Paragraph[] = [];
    
    // Process each block with proper formatting
    blocks.forEach(block => {
      if (!block.speaker && !block.text) return;
      
      const speakerName = speakers.get(block.speaker) || block.speaker || '';
      const processedText = this.processTimestamp(block.text || '', includeTimestamps);
      
      if (speakerName && processedText) {
        const textRuns: TextRun[] = [];
        
        // Speaker name - BOLD with RTL
        textRuns.push(
          new TextRun({
            text: speakerName + ':',
            bold: true,
            font: 'David',
            size: 12 * 2, // Word uses half-points
            color: '000080',
            rtl: true  // Add RTL to the text run
          })
        );
        
        // TAB character - REAL TAB
        textRuns.push(
          new TextRun({
            text: '\t' + processedText,
            font: 'David',
            size: 12 * 2,
            color: '000000',
            rtl: true  // Add RTL to the text run
          })
        );
        
        children.push(
          new Paragraph({
            children: textRuns,
            alignment: AlignmentType.JUSTIFIED, // Align to both sides
            bidirectional: true, // Essential for Hebrew RTL
            spacing: {
              after: 120, // Space after paragraph
              line: 360  // 1.5 line spacing
            },
            indent: {
              left: 1440, // 1 inch (72 * 20)
              hanging: 1440 // Hanging indent for wrapped lines
            },
            tabStops: [{
              type: TabStopType.LEFT,
              position: 1440 // Tab stop at 1 inch
            }]
          })
        );
      } else if (processedText) {
        // Text without speaker
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: processedText,
                font: 'David',
                size: 12 * 2,
                color: '000000',
                rtl: true  // Add RTL to text runs
              })
            ],
            alignment: AlignmentType.JUSTIFIED, // Align to both sides
            bidirectional: true,
            spacing: {
              after: 120,
              line: 360
            }
          })
        );
      }
    });
    
    // Create document with only the body content
    const doc = new Document({
      creator: 'Transcription System',
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440,    // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440
            }
          },
          bidi: true  // Critical for RTL documents
        },
        children: children
      }],
      settings: {
        defaultTabStop: 708,
        defaultLanguage: 'he-IL',
        themeFontLang: {
          val: 'he-IL',
          eastAsia: 'he-IL',
          bidi: 'he-IL'
        }
      },
      styles: {
        default: {
          document: {
            run: {
              font: 'David',
              size: 24,
              rightToLeft: true
            },
            paragraph: {
              bidirectional: true
            }
          }
        }
      }
    });
    
    // Generate and save
    const blob = await Packer.toBlob(doc);
    const outputFileName = fileName || 'transcription_body.docx';
    saveAs(blob, outputFileName);
  }
  /**
   * Extract speaker names without codes
   */
  private extractSpeakerNames(blocks: BlockData[], speakers: Map<string, string>): string[] {
    const uniqueSpeakers = new Set<string>();
    
    blocks.forEach(block => {
      if (block.speaker) {
        // If we have a name mapping, use it; otherwise use the speaker field as is
        const speakerName = speakers.get(block.speaker) || block.speaker;
        if (speakerName && speakerName.trim()) {
          uniqueSpeakers.add(speakerName);
        }
      }
    });
    
    return Array.from(uniqueSpeakers);
  }

  /**
   * Calculate total duration from blocks
   */
  private calculateDuration(blocks: BlockData[]): string {
    let maxTime = 0;
    
    blocks.forEach(block => {
      // First check speakerTime
      if (block.speakerTime && block.speakerTime > maxTime) {
        maxTime = block.speakerTime;
      }
      
      // Also check for timestamps in the text (format: HH:MM:SS or MM:SS)
      if (block.text) {
        const timestampMatches = block.text.match(/\d{1,2}:\d{2}(:\d{2})?/g);
        if (timestampMatches) {
          timestampMatches.forEach(timestamp => {
            const parts = timestamp.split(':');
            let timeInSeconds = 0;
            if (parts.length === 3) {
              // HH:MM:SS
              timeInSeconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
            } else if (parts.length === 2) {
              // MM:SS (could be MM:SS or HH:MM)
              // If first number is > 59, treat as HH:MM, otherwise MM:SS
              const firstNum = parseInt(parts[0]);
              if (firstNum > 59) {
                // Treat as HH:MM
                timeInSeconds = firstNum * 3600 + parseInt(parts[1]) * 60;
              } else {
                // Treat as MM:SS
                timeInSeconds = firstNum * 60 + parseInt(parts[1]);
              }
            }
            if (timeInSeconds > maxTime) {
              maxTime = timeInSeconds;
            }
          });
        }
      }
    });
    
    // Return HH:MM:SS format
    const hours = Math.floor(maxTime / 3600);
    const minutes = Math.floor((maxTime % 3600) / 60);
    const seconds = Math.floor(maxTime % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Convert timestamp to dots or keep as is
   */
  private processTimestamp(text: string, includeTimestamps: boolean): string {
    if (!includeTimestamps) {
      // Replace timestamps (format: HH:MM:SS or MM:SS) with ...
      return text.replace(/\d{1,2}:\d{2}(:\d{2})?/g, '...');
    }
    return text;
  }

  /**
   * Generate document using HTML to DOCX conversion for better Hebrew support
   */
  public async generateDocumentWithHtml(
    blocks: BlockData[],
    speakers: Map<string, string>,
    mediaFileName: string,
    template: any,
    options: ExportOptions = {}
  ): Promise<void> {
    const { includeTimestamps = false, fileName, mediaDuration } = options;
    
    console.log('=== Starting HTML to DOCX generation ===');
    console.log('Template:', template);
    
    try {
      // Generate HTML
      const htmlGenerator = new HtmlDocumentGenerator();
      const html = htmlGenerator.generateHtml(
        blocks,
        speakers,
        mediaFileName,
        template,
        {
          includeTimestamps,
          mediaDuration
        }
      );
      
      console.log('Generated HTML (first 500 chars):', html.substring(0, 500));
      
      // Convert HTML to DOCX using html-docx-js
      console.log('Converting HTML to DOCX...');
      const converted = htmlDocx.asBlob(html, {
        orientation: template?.page?.orientation === 'landscape' ? 'landscape' : 'portrait',
        margins: {
          top: '1in',
          bottom: '1in',
          left: '1in',
          right: '1in'
        }
      });
      
      console.log('Conversion successful, blob created');
      
      // The converted result is already a blob
      const blob = converted;
      
      const defaultFileName = fileName || 
        `${mediaFileName ? mediaFileName.replace(/\.[^/.]+$/, '') : 'transcription'}_תמלול.docx`;
      
      console.log('Saving file as:', defaultFileName);
      saveAs(blob, defaultFileName);
      console.log('=== HTML to DOCX generation complete ===');
    } catch (error) {
      console.error('!!! Error generating HTML DOCX !!!', error);
      alert('Error with HTML to DOCX conversion: ' + error);
      // Don't fallback - let the error be visible
      throw error;
      
      // Commented out fallback to make errors visible
      // await this.generateDocumentWithAdvancedTemplate2(
      //   blocks,
      //   speakers,
      //   mediaFileName,
      //   mediaDuration || this.calculateDuration(blocks),
      //   template,
      //   includeTimestamps || false,
      //   fileName
      // );
    }
  }

  /**
   * Generate document with new advanced template format (toolbar-based)
   */
  private async generateDocumentWithAdvancedTemplate2(
    blocks: BlockData[],
    speakers: Map<string, string>,
    mediaFileName: string,
    duration: string,
    template: any,
    includeTimestamps: boolean,
    fileName?: string
  ): Promise<void> {
    const speakerNames = this.extractSpeakerNames(blocks, speakers);
    const children: Paragraph[] = [];
    
    // Build speakers line if enabled - combine into single text
    if (template.body?.speakersLine?.enabled) {
      const speakersText = template.body.speakersLine.elements.map((element: any) => {
        switch (element.type) {
          case 'fileName': return mediaFileName;
          case 'speakers': return this.joinWithRTLCommas(speakerNames) || 'לא צוינו';
          case 'duration': return duration;
          case 'userName': return 'משתמש';
          case 'date': return new Date().toLocaleDateString('he-IL');
          default: return element.value;
        }
      }).join('');
      
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: speakersText,
              bold: template.body.speakersLine.elements[0]?.bold,
              italics: template.body.speakersLine.elements[0]?.italic,
              underline: template.body.speakersLine.elements[0]?.underline ? { type: UnderlineType.SINGLE } : undefined,
              size: (template.body.speakersLine.elements[0]?.size || 14) * 2,
              color: template.body.speakersLine.elements[0]?.color || '000000',
              font: 'David'
            })
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 480 },
          bidirectional: true
        })
      );
    }
    
    // Content blocks with advanced settings
    blocks.forEach(block => {
      if (!block.speaker && !block.text) return;
      
      const speakerName = speakers.get(block.speaker) || block.speaker || '';
      const processedText = this.processTimestamp(block.text || '', includeTimestamps);
      
      if (speakerName && processedText) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: speakerName + (template.body?.content?.speakerSuffix || ':'),
                bold: template.body?.content?.speakerBold !== false,
                color: template.body?.content?.speakerColor || '000080',
                size: (template.body?.content?.fontSize || 12) * 2,
                font: template.body?.content?.fontFamily || 'David'
              }),
              new TextRun({
                text: '\t' + processedText,
                size: (template.body?.content?.fontSize || 12) * 2,
                font: template.body?.content?.fontFamily || 'David'
              })
            ],
            alignment: template.body?.content?.alignment === 'justify' ? AlignmentType.JUSTIFIED :
                      template.body?.content?.alignment === 'center' ? AlignmentType.CENTER :
                      template.body?.content?.alignment === 'left' ? AlignmentType.LEFT : AlignmentType.RIGHT,
            spacing: {
              after: (template.body?.content?.spaceAfter || 6) * 20,
              line: (template.body?.content?.lineSpacing || 1.5) * 240
            },
            indent: {
              left: (template.body?.content?.tabPosition || 72) * 20,
              hanging: (template.body?.content?.hangingIndent || 72) * 20
            },
            tabStops: [{
              type: TabStopType.LEFT,
              position: (template.body?.content?.tabPosition || 72) * 20
            }],
            bidirectional: true
          })
        );
      }
    });
    
    // Build headers - group elements by line and position
    const headers = template.header?.enabled ? {
      default: new Header({
        children: (() => {
          // Group elements by line
          const lines: { [key: string]: any[] } = {
            above: [],
            same: [],
            below: []
          };
          
          template.header.elements.forEach((element: any) => {
            const line = element.line || 'same';
            lines[line].push(element);
          });
          
          const paragraphs: Paragraph[] = [];
          
          // Process each line
          ['above', 'same', 'below'].forEach(lineKey => {
            if (lines[lineKey].length === 0) return;
            
            // Group elements by position within the line
            const positions: { [key: string]: any[] } = {
              left: [],
              center: [],
              right: []
            };
            
            lines[lineKey].forEach((element: any) => {
              const position = element.position || 'center';
              positions[position].push(element);
            });
            
            // Create paragraph with tab stops for positioning
            const children: any[] = [];
            
            // Add left-aligned elements
            if (positions.left.length > 0) {
              positions.left.forEach((element: any) => {
                // Get the text value and wrap with RTL mark if it contains Hebrew
                let textValue = element.type === 'fileName' ? mediaFileName :
                              element.type === 'speakers' ? this.joinWithRTLCommas(speakerNames) :
                              element.type === 'duration' ? duration :
                              element.type === 'pageNumber' ? '' : // Will be replaced with actual page number
                              element.type === 'pageNumberFull' ? '' : // Will be replaced with actual page number
                              element.type === 'userName' ? 'משתמש' :
                              element.type === 'date' ? new Date().toLocaleDateString('he-IL') :
                              element.type === 'lineBreak' ? '\n' :
                              element.type === 'tab' ? '\t' :
                              element.value;
                
                // For Hebrew text with colon, ensure proper display
                if (textValue && /[\u0590-\u05FF]/.test(textValue) && textValue.includes(':')) {
                  // Don't modify - let Word handle it with proper RTL settings
                  // textValue = textValue.replace(/:/g, '\u200F:');
                }
                
                children.push(new TextRun({
                  text: textValue,
                  bold: element.bold,
                  italics: element.italic,
                  underline: element.underline ? { type: UnderlineType.SINGLE } : undefined,
                  size: (element.size || 12) * 2,
                  color: element.color || '000000',
                  font: 'David',
                  rightToLeft: true,
                  language: {
                    value: 'he-IL',
                    bidi: 'rtl'
                  }
                }));
                
                // Add page number if needed
                if (element.type === 'pageNumber') {
                  children.push(PageNumber.CURRENT);
                } else if (element.type === 'pageNumberFull') {
                  children.push(new TextRun({ text: '\u202Bעמוד \u202C', font: 'David', size: (element.size || 12) * 2 }));
                  children.push(PageNumber.CURRENT);
                  children.push(new TextRun({ text: '\u202B מתוך \u202C', font: 'David', size: (element.size || 12) * 2 }));
                  children.push(PageNumber.TOTAL);
                }
              });
            }
            
            // Add center-aligned elements with tab
            if (positions.center.length > 0) {
              if (positions.left.length > 0) {
                children.push(new TextRun({ text: '\t' }));
              }
              positions.center.forEach((element: any) => {
                // Get the text value and wrap with RTL mark if it contains Hebrew
                let textValue = element.type === 'fileName' ? mediaFileName :
                              element.type === 'speakers' ? this.joinWithRTLCommas(speakerNames) :
                              element.type === 'duration' ? duration :
                              element.type === 'pageNumber' ? '' :
                              element.type === 'pageNumberFull' ? '' :
                              element.type === 'userName' ? 'משתמש' :
                              element.type === 'date' ? new Date().toLocaleDateString('he-IL') :
                              element.type === 'lineBreak' ? '\n' :
                              element.type === 'tab' ? '\t' :
                              element.value;
                
                // For Hebrew text with colon, ensure proper display
                if (textValue && /[\u0590-\u05FF]/.test(textValue) && textValue.includes(':')) {
                  // Don't modify - let Word handle it with proper RTL settings
                  // textValue = textValue.replace(/:/g, '\u200F:');
                }
                
                children.push(new TextRun({
                  text: textValue,
                  bold: element.bold,
                  italics: element.italic,
                  underline: element.underline ? { type: UnderlineType.SINGLE } : undefined,
                  size: (element.size || 12) * 2,
                  color: element.color || '000000',
                  font: 'David',
                  rightToLeft: true,
                  language: {
                    value: 'he-IL',
                    bidi: 'rtl'
                  }
                }));
                
                // Add page number if needed
                if (element.type === 'pageNumber') {
                  children.push(PageNumber.CURRENT);
                } else if (element.type === 'pageNumberFull') {
                  children.push(new TextRun({ text: '\u202Bעמוד \u202C', font: 'David', size: (element.size || 12) * 2 }));
                  children.push(PageNumber.CURRENT);
                  children.push(new TextRun({ text: '\u202B מתוך \u202C', font: 'David', size: (element.size || 12) * 2 }));
                  children.push(PageNumber.TOTAL);
                }
              });
            }
            
            // Add right-aligned elements with tab
            if (positions.right.length > 0) {
              if (positions.left.length > 0 || positions.center.length > 0) {
                children.push(new TextRun({ text: '\t' }));
              }
              positions.right.forEach((element: any) => {
                // Get the text value
                let textValue = element.type === 'fileName' ? mediaFileName :
                              element.type === 'speakers' ? this.joinWithRTLCommas(speakerNames) :
                              element.type === 'duration' ? duration :
                              element.type === 'pageNumber' ? '' :
                              element.type === 'pageNumberFull' ? '' :
                              element.type === 'userName' ? 'משתמש' :
                              element.type === 'date' ? new Date().toLocaleDateString('he-IL') :
                              element.type === 'lineBreak' ? '\n' :
                              element.type === 'tab' ? '\t' :
                              element.value;
                
                // For Hebrew text with colon, ensure proper display
                if (textValue && /[\u0590-\u05FF]/.test(textValue) && textValue.includes(':')) {
                  // Don't modify - let Word handle it with proper RTL settings
                  // textValue = textValue.replace(/:/g, '\u200F:');
                }
                
                children.push(new TextRun({
                  text: textValue,
                  bold: element.bold,
                  italics: element.italic,
                  underline: element.underline ? { type: UnderlineType.SINGLE } : undefined,
                  size: (element.size || 12) * 2,
                  color: element.color || '000000',
                  font: 'David',
                  rightToLeft: true,
                  language: {
                    value: 'he-IL',
                    bidi: 'rtl'
                  }
                }));
                
                // Add page number if needed
                if (element.type === 'pageNumber') {
                  children.push(PageNumber.CURRENT);
                } else if (element.type === 'pageNumberFull') {
                  children.push(new TextRun({ text: 'עמוד ', font: 'David', size: (element.size || 12) * 2, rightToLeft: true, language: { value: 'he-IL' } }));
                  children.push(PageNumber.CURRENT);
                  children.push(new TextRun({ text: ' מתוך ', font: 'David', size: (element.size || 12) * 2, rightToLeft: true, language: { value: 'he-IL' } }));
                  children.push(PageNumber.TOTAL);
                }
              });
            }
            
            // Create separate paragraphs for each position to ensure proper alignment
            const hasLeft = positions.left.length > 0;
            const hasCenter = positions.center.length > 0;
            const hasRight = positions.right.length > 0;
            
            // If only one position has content, create a simple aligned paragraph
            if (hasRight && !hasLeft && !hasCenter) {
              // Only right-aligned content
              paragraphs.push(new Paragraph({
                children,
                alignment: AlignmentType.RIGHT,
                bidirectional: false
              }));
            } else if (hasCenter && !hasLeft && !hasRight) {
              // Only center-aligned content
              paragraphs.push(new Paragraph({
                children,
                alignment: AlignmentType.CENTER,
                bidirectional: false
              }));
            } else if (hasLeft && !hasCenter && !hasRight) {
              // Only left-aligned content
              paragraphs.push(new Paragraph({
                children,
                alignment: AlignmentType.LEFT,
                bidirectional: false
              }));
            } else {
              // Multiple positions - use tab stops
              paragraphs.push(new Paragraph({
                children,
                tabStops: [
                  {
                    type: TabStopType.CENTER,
                    position: TabStopPosition.MAX / 2,
                  },
                  {
                    type: TabStopType.RIGHT,
                    position: TabStopPosition.MAX,
                  }
                ],
                bidirectional: false
              }));
            }
          });
          
          // Add border line if enabled
          if (template.header.borderLine?.enabled) {
            paragraphs.push(new Paragraph({
              border: {
                bottom: {
                  color: template.header.borderLine.color || '000000',
                  space: 1,
                  size: template.header.borderLine.thickness * 6 || 6,
                  style: template.header.borderLine.style === 'dashed' ? BorderStyle.DASHED :
                         template.header.borderLine.style === 'double' ? BorderStyle.DOUBLE :
                         BorderStyle.SINGLE
                }
              }
            }));
          }
          
          return paragraphs;
        })()
      })
    } : undefined;
    
    // Build footers with page numbers
    const footers = template.footer?.enabled ? {
      default: new Footer({
        children: [
          new Paragraph({
            children: template.footer.elements.map((element: any) => {
              if (element.value === '{{pageNumber}}') {
                return new TextRun({
                  children: [PageNumber.CURRENT],
                  size: (element.size || 11) * 2
                });
              } else if (element.value === '{{totalPages}}') {
                return new TextRun({
                  children: [PageNumber.TOTAL_PAGES],
                  size: (element.size || 11) * 2
                });
              } else {
                let text = '';
                switch (element.type) {
                  case 'fileName': text = mediaFileName; break;
                  case 'userName': text = 'משתמש'; break;
                  case 'date': text = new Date().toLocaleDateString('he-IL'); break;
                  default: text = element.value;
                }
                
                return new TextRun({
                  text,
                  bold: element.bold,
                  italics: element.italic,
                  underline: element.underline ? { type: UnderlineType.SINGLE } : undefined,
                  size: (element.size || 11) * 2,
                  color: element.color || '000000',
                  font: 'David',
                  rightToLeft: true,
                  language: {
                    value: 'he-IL'
                  }
                });
              }
            }),
            alignment: (template.footer.elements[0]?.alignment === 'center' ? AlignmentType.CENTER :
                       template.footer.elements[0]?.alignment === 'left' ? AlignmentType.LEFT : AlignmentType.RIGHT),
            bidirectional: true
          })
        ]
      })
    } : undefined;
    
    const doc = new Document({
      creator: 'Transcription System',
      sections: [{
        headers,
        footers,
        properties: {
          page: {
            size: {
              orientation: template.page?.orientation === 'landscape' ? 
                PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT
            },
            margin: {
              top: convertMillimetersToTwip(template.page?.marginTop || 25.4),
              bottom: convertMillimetersToTwip(template.page?.marginBottom || 25.4),
              left: convertMillimetersToTwip(template.page?.marginLeft || 25.4),
              right: convertMillimetersToTwip(template.page?.marginRight || 25.4)
            }
          },
          bidi: true, // Enable bidirectional text for the entire section
          rtlGutter: true // Right-to-left document layout
        },
        children
      }],
      settings: {
        defaultTabStop: 708,
        evenAndOddHeaderAndFooters: false,
        documentProtection: {
          edit: false,
          formatting: false
        },
        defaultLanguage: 'he-IL',
        themeFontLang: {
          val: 'he-IL',
          eastAsia: 'he-IL',
          bidi: 'he-IL'
        }
      },
      styles: {
        default: {
          document: {
            run: {
              font: 'David',
              size: 24,
              rightToLeft: true,
              language: {
                value: 'he-IL'
              }
            },
            paragraph: {
              bidirectional: true
            }
          }
        },
        paragraphStyles: [
          {
            id: 'Hebrew',
            name: 'Hebrew',
            basedOn: 'Normal',
            run: {
              language: {
                value: 'he-IL'
              }
            }
          }
        ]
      }
    });
    
    const blob = await Packer.toBlob(doc);
    const defaultFileName = fileName || 
      `${mediaFileName ? mediaFileName.replace(/\.[^/.]+$/, '') : 'transcription'}_תמלול.docx`;
    saveAs(blob, defaultFileName);
  }

  /**
   * Generate document with advanced template settings
   */
  private async generateDocumentWithAdvancedTemplate(
    blocks: BlockData[],
    speakers: Map<string, string>,
    mediaFileName: string,
    speakerNames: string[],
    duration: string,
    settings: any,
    includeTimestamps: boolean,
    fileName?: string
  ): Promise<void> {
    const children: Paragraph[] = [];
    
    // Speakers line in the body (not in header) - use default Hebrew format if template not provided
    const speakersTemplate = settings.speakersTemplate || 'דוברים: {{speakers}}, משך ההקלטה: {{duration}}';
    let speakersText = speakersTemplate
      .replace('{{speakers}}', this.joinWithRTLCommas(speakerNames) || 'לא צוינו')
      .replace('{{duration}}', duration);
    
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: speakersText,
            font: settings.speakersFont || 'David',
            size: (settings.speakersSize || 14) * 2,
            bold: settings.speakersBold !== false, // Default to true
            underline: settings.speakersUnderline !== false ? { type: UnderlineType.SINGLE } : undefined, // Default to true
            color: settings.speakersColor || '000000'
          })
        ],
        alignment: AlignmentType.RIGHT,
        spacing: { after: (settings.speakersSpaceAfter || 24) * 20 },
        bidirectional: true
      })
    );
    
    // Content blocks with advanced settings
    blocks.forEach(block => {
      if (!block.speaker && !block.text) return;
      
      const speakerName = speakers.get(block.speaker) || block.speaker || '';
      const processedText = this.processTimestamp(block.text || '', includeTimestamps);
      
      if (speakerName && processedText) {
        const textRuns: TextRun[] = [];
        
        // Speaker name with advanced settings
        textRuns.push(
          new TextRun({
            text: speakerName + (settings.contentSpeakerSuffix || ':'),
            font: settings.contentFont || 'David',
            size: (settings.contentSize || 12) * 2,
            bold: settings.contentSpeakerBold,
            color: settings.contentSpeakerColor || '000080'
          })
        );
        
        // Tab and text
        textRuns.push(
          new TextRun({
            text: '\t' + processedText,
            font: settings.contentFont || 'David',
            size: (settings.contentSize || 12) * 2,
            color: settings.contentTextColor || '000000'
          })
        );
        
        const paragraphOptions: any = {
          children: textRuns,
          alignment: settings.contentAlignment === 'center' ? AlignmentType.CENTER :
                    settings.contentAlignment === 'left' ? AlignmentType.LEFT :
                    settings.contentAlignment === 'justify' ? AlignmentType.JUSTIFIED : AlignmentType.RIGHT,
          spacing: {
            after: (settings.contentSpaceAfter || 6) * 20,
            line: (settings.contentLineSpacing || 1.5) * 240
          },
          indent: {
            left: (settings.contentTabPosition || 72) * 20,
            hanging: (settings.contentHangingIndent || 72) * 20
          },
          bidirectional: true,
          tabStops: [{
            type: TabStopType.LEFT,
            position: (settings.contentTabPosition || 72) * 20
          }]
        };
        
        // Add borders if enabled
        if (settings.includeBorders) {
          paragraphOptions.border = {
            bottom: {
              style: BorderStyle.SINGLE,
              size: 1,
              color: settings.borderColor
            }
          };
        }
        
        children.push(new Paragraph(paragraphOptions));
      } else if (processedText) {
        // Text without speaker
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: processedText,
                font: settings.contentFont,
                size: settings.contentSize * 2,
                color: settings.contentTextColor
              })
            ],
            alignment: settings.contentAlignment === 'center' ? AlignmentType.CENTER :
                      settings.contentAlignment === 'left' ? AlignmentType.LEFT :
                      settings.contentAlignment === 'justify' ? AlignmentType.JUSTIFIED : AlignmentType.RIGHT,
            spacing: {
              after: settings.contentSpaceAfter * 20,
              line: settings.contentLineSpacing * 240
            },
            bidirectional: true
          })
        );
      }
    });
    
    // Create headers and footers if enabled
    const headers = settings.includeHeader !== false ? { // Default to true
      default: new Header({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: (settings.headerTemplate || 'קובץ: {{fileName}}').replace('{{fileName}}', mediaFileName),
                font: settings.headerFont || 'David',
                size: (settings.headerSize || 12) * 2,
                underline: settings.headerUnderline !== false ? { type: UnderlineType.SINGLE } : undefined, // Default to true
                color: settings.headerColor || '000000'
              })
            ],
            alignment: settings.headerAlignment === 'left' ? AlignmentType.LEFT :
                      settings.headerAlignment === 'right' ? AlignmentType.RIGHT : AlignmentType.CENTER, // Default center
            bidirectional: true
          })
        ]
      })
    } : undefined;

    const footers = settings.includePageNumbers ? {
      default: new Footer({
        children: [
          new Paragraph({
            children: settings.pageNumberFormat === 'simple' ? [
              new TextRun({
                children: [PageNumber.CURRENT]
              })
            ] : [
              new TextRun('עמוד '),
              new TextRun({
                children: [PageNumber.CURRENT]
              }),
              new TextRun(' מתוך '),
              new TextRun({
                children: [PageNumber.TOTAL_PAGES]
              })
            ],
            alignment: settings.pageNumberPosition === 'center' ? AlignmentType.CENTER :
                      settings.pageNumberPosition === 'left' ? AlignmentType.LEFT : AlignmentType.RIGHT,
            bidirectional: true
          })
        ]
      })
    } : undefined;

    // Create document with advanced page settings
    const doc = new Document({
      creator: 'Transcription System',
      sections: [{
        headers,
        footers,
        properties: {
          page: {
            size: {
              orientation: settings.pageOrientation === 'landscape' ? 
                PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT
            },
            margin: {
              top: convertMillimetersToTwip(settings.marginTop || 25.4),
              bottom: convertMillimetersToTwip(settings.marginBottom || 25.4),
              left: convertMillimetersToTwip(settings.marginLeft || 25.4),
              right: convertMillimetersToTwip(settings.marginRight || 25.4)
            }
          },
          bidi: true
        },
        children
      }],
      settings: {
        defaultTabStop: 708,
        evenAndOddHeaderAndFooters: false,
        documentProtection: {
          edit: false,
          formatting: false
        },
        defaultLanguage: 'he-IL',
        themeFontLang: {
          val: 'he-IL',
          eastAsia: 'he-IL',
          bidi: 'he-IL'
        }
      },
      styles: {
        default: {
          document: {
            run: {
              font: settings.contentFont || 'David',
              size: (settings.contentSize || 12) * 2,
              rightToLeft: true
            },
            paragraph: {
              bidirectional: true
            }
          }
        }
      }
    });
    
    // Generate and save
    try {
      const blob = await Packer.toBlob(doc);
      const defaultFileName = fileName || 
        `${mediaFileName ? mediaFileName.replace(/\.[^/.]+$/, '') : 'transcription'}_תמלול.docx`;
      saveAs(blob, defaultFileName);
    } catch (error) {
      console.error('Error generating document with advanced template:', error);
      throw new Error('Failed to generate Word document');
    }
  }

  /**
   * Format blocks for Word document
   */
  private formatBlocksForWord(
    blocks: BlockData[], 
    speakers: Map<string, string>,
    includeTimestamps: boolean
  ): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    
    blocks.forEach((block, index) => {
      if (!block.speaker && !block.text) {
        // Skip empty blocks
        return;
      }
      
      // Get speaker name (without code)
      const speakerName = speakers.get(block.speaker) || block.speaker || '';
      
      // Process text (handle timestamps)
      let processedText = this.processTimestamp(block.text || '', includeTimestamps);
      
      // Create paragraph with speaker and text
      if (speakerName && processedText) {
        const textRuns: TextRun[] = [];
        
        // Add speaker name in bold
        textRuns.push(
          new TextRun({
            text: speakerName + ':',
            bold: true,
            size: 24
          })
        );
        
        // Add tab and then text
        textRuns.push(
          new TextRun({
            text: '\t' + processedText,
            size: 24
          })
        );
        
        paragraphs.push(
          new Paragraph({
            children: textRuns,
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
            spacing: {
              after: 120 // Space between paragraphs
            },
            indent: {
              left: 720, // 0.5 inch indent for text
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
      } else if (processedText) {
        // Just text without speaker
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: processedText,
                size: 24
              })
            ],
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
            spacing: {
              after: 120
            }
          })
        );
      }
    });
    
    return paragraphs;
  }

  /**
   * Generate and download Word document
   */
  public async generateDocument(
    blocks: BlockData[],
    speakers: Map<string, string>,
    mediaFileName: string,
    options: ExportOptions = {}
  ): Promise<void> {
    const { includeTimestamps = false, fileName, mediaDuration } = options;
    
    // Always try HTML approach first for better Hebrew support
    // Check if there's a saved advanced template first
    const savedAdvancedTemplate = localStorage.getItem('advancedWordTemplate');
    
    if (savedAdvancedTemplate) {
      const template = JSON.parse(savedAdvancedTemplate);
      return this.generateDocumentWithHtml(
        blocks,
        speakers,
        mediaFileName,
        template,
        options
      );
    }
    
    // Check if there's a saved template from the old template designer
    const savedTemplateSettings = localStorage.getItem('wordTemplateSettings');
    
    if (savedTemplateSettings) {
      // Convert old settings to template format and use HTML export for Hebrew support
      const settings = JSON.parse(savedTemplateSettings);
      
      // Create a template structure from old settings
      const template = {
        header: {
          enabled: settings.includeHeader !== false,
          elements: [{
            type: 'text',
            value: (settings.headerTemplate || 'קובץ: {{fileName}}').replace('{{fileName}}', mediaFileName),
            position: settings.headerAlignment || 'center',
            size: settings.headerSize || 12,
            underline: settings.headerUnderline !== false,
            color: settings.headerColor || '000000'
          }],
          borderLine: {
            enabled: true,
            thickness: 1,
            style: 'solid',
            color: '000000'
          }
        },
        body: {
          speakers: {
            enabled: true,
            template: settings.speakersTemplate || 'דוברים: {{speakers}}, משך ההקלטה: {{duration}}'
          },
          content: {
            alignment: settings.contentAlignment || 'right',
            fontSize: settings.contentSize || 12,
            fontFamily: settings.contentFont || 'David',
            speakerBold: settings.contentSpeakerBold !== false,
            speakerColor: settings.contentSpeakerColor || '000080',
            speakerSuffix: settings.contentSpeakerSuffix || ':',
            lineSpacing: settings.contentLineSpacing || 1.5,
            spaceAfter: settings.contentSpaceAfter || 6,
            tabPosition: settings.contentTabPosition || 72,
            hangingIndent: settings.contentHangingIndent || 72
          }
        },
        footer: {
          enabled: settings.includePageNumbers === true,
          elements: settings.pageNumberFormat === 'simple' ? 
            [{ type: 'pageNumber', alignment: settings.pageNumberPosition || 'center' }] :
            [{ type: 'pageNumberFull', alignment: settings.pageNumberPosition || 'center' }]
        },
        page: {
          orientation: settings.pageOrientation || 'portrait',
          marginTop: settings.marginTop || 25.4,
          marginBottom: settings.marginBottom || 25.4,
          marginLeft: settings.marginLeft || 25.4,
          marginRight: settings.marginRight || 25.4
        }
      };
      
      return this.generateDocumentWithHtml(
        blocks,
        speakers,
        mediaFileName,
        template,
        options
      );
    }
    
    // Check for regular template
    const savedTemplate = this.templateEngine.loadTemplate();
    
    if (savedTemplate) {
      // Use the template engine for generation
      const speakerNames = this.extractSpeakerNames(blocks, speakers);
      const duration = mediaDuration || this.calculateDuration(blocks);
      
      const data = {
        fileName: mediaFileName,
        speakers: speakerNames,
        duration,
        blocks: blocks.map(block => ({
          speaker: speakers.get(block.speaker) || block.speaker || '',
          text: this.processTimestamp(block.text || '', includeTimestamps),
          timestamp: block.timestamp
        }))
      };
      
      return this.templateEngine.generateDocument(data, savedTemplate);
    }
    
    // Use HTML export with default template for better Hebrew support
    const speakerNames = this.extractSpeakerNames(blocks, speakers);
    const duration = mediaDuration || this.calculateDuration(blocks);
    
    // Create a default template
    const defaultTemplate = {
      header: {
        enabled: true,
        elements: [{
          type: 'fileName',
          value: '',
          position: 'center',
          size: 12,
          underline: true,
          color: '000000',
          bold: false,
          italic: false
        }],
        borderLine: {
          enabled: false
        }
      },
      body: {
        speakers: {
          enabled: true,
          template: 'דוברים: {{speakers}}, משך ההקלטה: {{duration}}'
        },
        content: {
          alignment: 'right',
          fontSize: 12,
          fontFamily: 'David',
          speakerBold: true,
          speakerColor: '000080',
          speakerSuffix: ':',
          lineSpacing: 1.5,
          spaceAfter: 6,
          tabPosition: 72,
          hangingIndent: 72
        }
      },
      footer: {
        enabled: false
      },
      page: {
        orientation: 'portrait',
        marginTop: 25.4,
        marginBottom: 25.4,
        marginLeft: 25.4,
        marginRight: 25.4
      }
    };
    
    return this.generateDocumentWithHtml(
      blocks,
      speakers,
      mediaFileName,
      defaultTemplate,
      options
    );
    
    // Old code below is now unreachable but keeping for reference
    const sections = [];
    
    // Header with media file name - underlined, centered
    const headerParagraph = new Paragraph({
      children: [
        new TextRun({
          text: `שם הקובץ: ${mediaFileName || 'ללא שם'}`,
          size: 24,
          bold: false,
          underline: {
            type: UnderlineType.SINGLE
          }
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 480 }
    });
    
    // Speakers and duration line with proper formatting
    const speakersTextRuns: TextRun[] = [];
    
    // Add "דוברים:" with underline
    speakersTextRuns.push(
      new TextRun({
        text: 'דוברים: ',
        size: 24,
        underline: {
          type: UnderlineType.SINGLE
        }
      })
    );
    
    // Add speaker names (underlined)
    if (speakerNames.length > 0) {
      speakersTextRuns.push(
        new TextRun({
          text: this.joinWithRTLCommas(speakerNames),
          size: 24,
          underline: {
            type: UnderlineType.SINGLE
          }
        })
      );
    }
    
    // Add comma and duration
    speakersTextRuns.push(
      new TextRun({
        text: ', זמן הקלטה: ',
        size: 24
      })
    );
    
    speakersTextRuns.push(
      new TextRun({
        text: duration,
        size: 24,
        underline: {
          type: UnderlineType.SINGLE
        }
      })
    );
    
    speakersTextRuns.push(
      new TextRun({
        text: ' דקות',
        size: 24
      })
    );
    
    const speakersLine = new Paragraph({
      children: speakersTextRuns,
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      spacing: { after: 720 } // More space before content
    });
    
    // Format transcription blocks
    const contentParagraphs = this.formatBlocksForWord(blocks, speakers, includeTimestamps);
    
    // Create the document with RTL support
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1134, // 0.79 inch
              right: 1134,
              bottom: 1134,
              left: 1134
            },
            size: {
              orientation: 'portrait' as any
            }
          },
          bidi: true // Enable bidirectional text
        },
        children: [
          headerParagraph,
          new Paragraph({ text: '' }), // Empty line
          speakersLine,
          new Paragraph({ text: '' }), // Empty line
          ...contentParagraphs
        ]
      }],
      settings: {
        defaultTabStop: 708,
        evenAndOddHeaderAndFooters: false,
        documentProtection: {
          edit: false,
          formatting: false
        },
        defaultLanguage: 'he-IL',
        themeFontLang: {
          val: 'he-IL',
          eastAsia: 'he-IL',
          bidi: 'he-IL'
        }
      },
      styles: {
        default: {
          document: {
            run: {
              font: 'David',
              size: 24,
              rightToLeft: true,
              language: {
                value: 'he-IL'
              }
            },
            paragraph: {
              bidirectional: true
            }
          }
        },
        paragraphStyles: [
          {
            id: 'Hebrew',
            name: 'Hebrew',
            basedOn: 'Normal',
            run: {
              language: {
                value: 'he-IL'
              }
            }
          }
        ]
      }
    });
    
    // Generate blob and save
    try {
      const blob = await Packer.toBlob(doc);
      
      // Generate filename
      const defaultFileName = fileName || 
        `${mediaFileName ? mediaFileName.replace(/\.[^/.]+$/, '') : 'transcription'}_תמלול.docx`;
      
      saveAs(blob, defaultFileName);
    } catch (error) {
      console.error('Error generating document:', error);
      throw new Error('Failed to generate Word document');
    }
  }

  /**
   * Generate plain text export
   */
  public generatePlainText(
    blocks: BlockData[],
    speakers: Map<string, string>,
    mediaFileName: string,
    includeTimestamps: boolean = false,
    mediaDuration?: string
  ): string {
    const speakerNames = this.extractSpeakerNames(blocks, speakers);
    const duration = mediaDuration || this.calculateDuration(blocks);
    
    let output = '';
    
    // Header
    output += `שם הקובץ: ${mediaFileName || 'ללא שם'}\n`;
    output += '='.repeat(50) + '\n\n';
    output += `דוברים: ${this.joinWithRTLCommas(speakerNames) || 'לא צוינו'}, זמן הקלטה: ${duration} דקות\n\n`;
    output += '-'.repeat(50) + '\n\n';
    
    // Content
    blocks.forEach(block => {
      if (!block.speaker && !block.text) return;
      
      const speakerName = speakers.get(block.speaker) || block.speaker || '';
      const processedText = this.processTimestamp(block.text || '', includeTimestamps);
      
      if (speakerName) {
        output += `${speakerName}:\t${processedText}\n\n`;
      } else {
        output += `${processedText}\n\n`;
      }
    });
    
    return output;
  }
}

export default WordDocumentGenerator;