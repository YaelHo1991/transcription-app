import { 
  Document, 
  Paragraph, 
  TextRun, 
  AlignmentType, 
  Packer,
  TabStopType,
  SectionType,
  PageOrientation,
  convertMillimetersToTwip
} from 'docx';
import { saveAs } from 'file-saver';
import { BlockData } from './WordDocumentGenerator';

export class DirectWordGenerator {
  /**
   * Generate a Word document with line numbers and proper RTL formatting
   * This creates the entire document from scratch with all features
   */
  public async generateWithLineNumbers(
    blocks: BlockData[],
    speakers: Map<string, string>,
    mediaFileName: string,
    includeTimestamps: boolean = false,
    mediaDuration?: string
  ): Promise<void> {
    try {
      // Extract speaker names for header
      const speakerNames = Array.from(new Set(
        blocks
          .filter(b => b.speaker)
          .map(b => speakers.get(b.speaker) || b.speaker)
      ));

      // Create document with proper RTL settings and line numbers
      const doc = new Document({
        sections: [{
          properties: {
            // Page settings
            page: {
              margin: {
                top: convertMillimetersToTwip(25),
                bottom: convertMillimetersToTwip(25),
                left: convertMillimetersToTwip(30),
                right: convertMillimetersToTwip(30),
              },
              size: {
                orientation: PageOrientation.PORTRAIT,
              }
            },
            // Line numbering - positioned on the right for Hebrew
            lineNumbers: {
              countBy: 1,
              start: 1,
              restart: 'newPage' as any, // LineNumberType enum not available in current docx version
              distance: convertMillimetersToTwip(5),
              // Note: Line numbers position is controlled by RTL document direction
            },
            // RTL document direction
            bidi: true,
            type: SectionType.CONTINUOUS
          },
          children: this.createContent(blocks, speakers, includeTimestamps, mediaFileName, speakerNames, mediaDuration)
        }]
      });

      // Generate and save
      const buffer = await Packer.toBuffer(doc);
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
      const fileName = `${mediaFileName.replace(/\.[^/.]+$/, '')}_with_lines.docx`;
      saveAs(blob, fileName);
      
    } catch (error) {
      console.error('Error generating document:', error);
      throw error;
    }
  }

  /**
   * Create document content with headers and body
   */
  private createContent(
    blocks: BlockData[],
    speakers: Map<string, string>,
    includeTimestamps: boolean,
    mediaFileName: string,
    speakerNames: string[],
    mediaDuration?: string
  ): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    // Add header information with proper RTL
    const speakersList = speakerNames.join(', ');
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'דוברים',
            font: 'David',
            size: 12 * 2,
            rtl: true
          }),
          new TextRun({
            text: ': ',
            font: 'David',
            size: 12 * 2
          }),
          new TextRun({
            text: speakersList,
            font: 'David',
            size: 12 * 2,
            rtl: true
          })
        ],
        alignment: AlignmentType.RIGHT,
        bidirectional: true,
        spacing: { after: 240 }
      })
    );

    // Add file name with proper RTL
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'קובץ',
            font: 'David',
            size: 12 * 2,
            rtl: true
          }),
          new TextRun({
            text: ': ',
            font: 'David',
            size: 12 * 2
          }),
          new TextRun({
            text: mediaFileName,
            font: 'David',
            size: 12 * 2
          })
        ],
        alignment: AlignmentType.RIGHT,
        bidirectional: true,
        spacing: { after: 240 }
      })
    );

    // Add duration if provided with proper RTL
    if (mediaDuration) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'זמן הקלטה',
              font: 'David',
              size: 12 * 2,
              rtl: true
            }),
            new TextRun({
              text: ': ',
              font: 'David',
              size: 12 * 2
            }),
            new TextRun({
              text: mediaDuration,
              font: 'David',
              size: 12 * 2
            })
          ],
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          spacing: { after: 480 }
        })
      );
    }

    // Add separator line
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '-סוף ההקלטה-',
            font: 'David',
            size: 12 * 2,
            rtl: true
          })
        ],
        alignment: AlignmentType.CENTER,
        bidirectional: true,
        spacing: { after: 480 }
      })
    );

    // Process transcription blocks
    blocks.forEach(block => {
      if (!block.speaker && !block.text) return;
      
      const speakerName = speakers.get(block.speaker) || block.speaker || '';
      const processedText = this.processTimestamp(block.text || '', includeTimestamps);
      
      if (speakerName && processedText) {
        // Create paragraph with speaker and text - split colon for proper RTL
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: speakerName,
                bold: true,
                font: 'David',
                size: 12 * 2,
                rtl: true
              }),
              new TextRun({
                text: ':',
                bold: true,
                font: 'David',
                size: 12 * 2
              }),
              new TextRun({
                text: '\t',
                font: 'David',
                size: 12 * 2
              }),
              new TextRun({
                text: processedText,
                font: 'David', 
                size: 12 * 2,
                rtl: true
              })
            ],
            alignment: AlignmentType.JUSTIFIED,
            bidirectional: true,
            spacing: {
              after: 120,
              line: 360
            },
            tabStops: [{
              type: TabStopType.LEFT,
              position: 1440 // 1 inch
            }]
          })
        );
      } else if (processedText) {
        // Text without speaker
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: processedText,
                font: 'David',
                size: 12 * 2,
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
      return text;
    }
    // Replace timestamps (format: MM:SS or HH:MM:SS) with ...
    return text.replace(/\d{1,2}:\d{2}(:\d{2})?/g, '...');
  }
}