import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export interface TranscriptionData {
  blocks: Array<{
    id: string;
    text: string;
    speaker?: string;
    speakerTime?: number;
  }>;
  speakers?: Array<{
    id: string;
    name: string;
  }>;
  metadata?: {
    fileName?: string;
    originalName?: string;
    duration?: number;
  };
  orphanedFrom?: {
    projectName?: string;
    mediaName?: string;
    orphanedAt?: string;
  };
}

export class WordExportService {
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
   * Wrap text with RTL marks for proper display and fix punctuation
   */
  private wrapTextForRTL(text: string): string {
    if (!text) return '';
    
    const RLM = '\u200F'; // Right-to-Left Mark
    const RLE = '\u202B'; // Right-to-Left Embedding
    const PDF = '\u202C'; // Pop Directional Formatting
    
    // Method 1: Wrap the entire text with RLE/PDF to enforce RTL
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
   * Format duration from seconds to HH:MM:SS
   */
  private formatDuration(seconds?: number): string {
    if (!seconds) return '00:00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Create a Word document from transcription data using template + Hebrew converter
   */
  public async createWordDocument(data: TranscriptionData): Promise<Buffer> {
    let tempInputPath: string | undefined;
    let tempOutputPath: string | undefined;
    
    try {
      // Load the template file
      const templatePath = path.join(__dirname, '..', '..', 'templates', 'hebrew-export-template.docx');
      
      let templateBuffer: Buffer;
      try {
        // Try to load the template
        templateBuffer = await fs.readFile(templatePath);
      } catch (error) {
        // If template doesn't exist, create a simple one
        templateBuffer = await this.createDefaultTemplate();
      }

      // Create a PizZip instance
      const zip = new PizZip(templateBuffer);

      // Create Docxtemplater instance
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: {
          start: '{',
          end: '}'
        }
      });

      // Prepare speakers map
      const speakersMap = new Map<string, string>();
      if (data.speakers) {
        data.speakers.forEach(speaker => {
          speakersMap.set(speaker.id, speaker.name);
        });
      }

      // Get unique speaker names
      const speakerNames = Array.from(new Set(
        data.blocks
          .filter(b => b.speaker)
          .map(b => speakersMap.get(b.speaker || '') || b.speaker || '')
      ));

      // Extract media name - prioritize originalName from metadata
      const mediaName = data.metadata?.originalName || 
                       data.orphanedFrom?.mediaName || 
                       data.metadata?.fileName || 
                       'תמלול';
      
      // Prepare template data with enhanced formatting
      const templateData = {
        fileName: this.wrapFileNameForRTL(mediaName),
        projectName: this.wrapTextForRTL(
          data.orphanedFrom?.projectName || 
          'ללא פרויקט'
        ),
        speakers: this.joinWithRTLCommas(speakerNames) || 'לא צוינו',
        duration: this.formatDuration(data.metadata?.duration),
        date: new Date().toLocaleDateString('he-IL'),
        archivedDate: data.orphanedFrom?.orphanedAt ? 
          new Date(data.orphanedFrom.orphanedAt).toLocaleDateString('he-IL') : 
          '',
        // Format blocks with proper RTL and punctuation handling
        formattedBlocks: data.blocks
          .filter(block => block.text || block.speaker)
          .map(block => {
            const speakerName = block.speaker ? 
              (speakersMap.get(block.speaker) || block.speaker) : '';
            
            return {
              speaker: speakerName ? this.wrapTextForRTL(speakerName + ':') : '',
              speakerOnly: speakerName, // Just the name without colon
              text: this.wrapTextForRTL(block.text || ''),
              hasSpeaker: !!speakerName
            };
          })
      };

      // Render the document with template data
      doc.render(templateData);

      // Generate the document as a temporary file
      const tempDir = path.join(__dirname, '..', '..', 'temp');
      
      // Ensure temp directory exists
      try {
        await fs.mkdir(tempDir, { recursive: true });
      } catch (error) {
        // Directory might already exist, ignore
      }
      
      tempInputPath = path.join(tempDir, `temp_${Date.now()}.docx`);
      tempOutputPath = path.join(tempDir, `converted_${Date.now()}.docx`);
      
      // Save the template-processed document temporarily
      const tempBuffer = doc.getZip().generate({ 
        type: 'nodebuffer',
        compression: 'DEFLATE'
      });
      
      await fs.writeFile(tempInputPath, tempBuffer);
      
      // Now run it through the Hebrew converter
      const converterPath = path.join(__dirname, '..', '..', 'templates', 'convertor', 'word-hebrew-converter.js');
      
      // Check if converter exists
      try {
        await fs.access(converterPath);
      } catch (error) {
        console.warn('Hebrew converter not found, returning unconverted document');
        return tempBuffer;
      }
      
      // Run the Hebrew converter
      const command = `node "${converterPath}" "${tempInputPath}" "${tempOutputPath}"`;
      await execPromise(command);
      
      // Check if output file was created
      try {
        await fs.access(tempOutputPath);
      } catch (error) {
        console.warn('Conversion failed, returning unconverted document');
        return tempBuffer;
      }
      
      // Read and return the converted file
      const convertedBuffer = await fs.readFile(tempOutputPath);
      return convertedBuffer;
    } catch (error) {
      console.error('Error creating Word document:', error);
      throw error;
    } finally {
      // Clean up temp files
      const cleanupFile = async (filePath: string | undefined) => {
        if (filePath) {
          try {
            await fs.unlink(filePath);
          } catch (err) {
            console.error(`Failed to clean up temp file ${filePath}:`, err);
          }
        }
      };
      
      await cleanupFile(tempInputPath);
      await cleanupFile(tempOutputPath);
    }
  }

  /**
   * Create a default template if none exists
   */
  private async createDefaultTemplate(): Promise<Buffer> {
    // Create a simple template with placeholders
    const templateContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>שם קובץ: {fileName}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>פרויקט: {projectName}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>דוברים: {speakers}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>משך: {duration}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>תאריך: {date}</w:t>
      </w:r>
    </w:p>
    <w:p/>
    {#formattedBlocks}
    <w:p>
      <w:r>
        <w:t>{speaker} {text}</w:t>
      </w:r>
    </w:p>
    {/formattedBlocks}
  </w:body>
</w:document>`;

    // For now, return a basic buffer (in production, you'd create a proper DOCX structure)
    // This is a simplified version - you'd need to create a proper ZIP structure for a real DOCX
    const zip = new PizZip();
    zip.file('word/document.xml', templateContent);
    
    // Add minimal required files for a valid DOCX
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

    return zip.generate({ type: 'nodebuffer' });
  }
}

// Export singleton instance
export const wordExportService = new WordExportService();