import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
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
  blocksFormatted?: string; // Pre-formatted blocks as a single field
}

interface ProcessTemplateResult {
  success: boolean;
  message: string;
  placeholders?: string[];
}

export class DocxTemplateProcessor {
  private templateBuffer: ArrayBuffer | null = null;
  private templateName: string = '';

  /**
   * Load a Word template file
   */
  public async loadTemplate(file: File): Promise<ProcessTemplateResult> {
    try {
      console.log('Loading template:', file.name);
      
      // Read the file as ArrayBuffer
      this.templateBuffer = await file.arrayBuffer();
      this.templateName = file.name;
      
      // Try to extract and validate template
      const zip = new PizZip(this.templateBuffer);
      
      // First try to extract placeholders without creating docxtemplater instance
      const placeholders = this.extractPlaceholdersFromZip(zip);
      
      console.log('Template loaded successfully');
      console.log('Detected placeholders:', placeholders);
      
      return {
        success: true,
        message: `Template "${file.name}" loaded successfully`,
        placeholders
      };
    } catch (error) {
      console.error('Error loading template:', error);
      
      // Provide more detailed error information
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Check for specific docxtemplater errors
        if (error.message.includes('Multi error')) {
          errorMessage = 'Template contains syntax errors. Please check your placeholders format.';
        } else if (error.message.includes('corrupted')) {
          errorMessage = 'File appears to be corrupted or not a valid Word document.';
        }
      }
      
      return {
        success: false,
        message: `Error loading template: ${errorMessage}`
      };
    }
  }

  /**
   * Process the loaded template with data
   */
  public async processTemplate(data: TemplateData): Promise<ProcessTemplateResult> {
    if (!this.templateBuffer) {
      return {
        success: false,
        message: 'No template loaded. Please upload a template first.'
      };
    }

    try {
      console.log('Processing template with data:', data);
      
      // Create new PizZip instance from template
      const zip = new PizZip(this.templateBuffer);
      
      // Create docxtemplater instance with error handling
      let doc: Docxtemplater;
      try {
        doc = new Docxtemplater(zip, {
          paragraphLoop: false,  // Changed to false to keep original paragraph structure
          linebreaks: true,
          errorLogging: true,  // Enable error logging for debugging
        });
      } catch (templateError: any) {
        console.error('Template initialization error:', templateError);
        console.error('Full error object:', JSON.stringify(templateError, null, 2));
        
        // Try to get more details about the error
        if (templateError.properties && templateError.properties.errors) {
          const errors = templateError.properties.errors;
          console.error('Template errors:', errors);
          
          const errorMessages = errors.map((e: any) => {
            console.log('Error detail:', e);
            
            // Handle specific error types
            if (e.message === 'Unopened loop') {
              return 'Found {/blocks} without matching {#blocks}. Make sure loop opening is not split by Word formatting.';
            }
            if (e.message === 'Unclosed loop') {
              return 'Found {#blocks} without matching {/blocks}. Make sure loop closing is not split by Word formatting.';
            }
            if (e.name === 'TemplateError') {
              return `Template syntax error: "${e.id}" - ${e.message || 'Invalid placeholder format'}`;
            }
            if (e.name === 'RenderingError') {
              return `Rendering error: ${e.message}`;
            }
            return e.message || 'Unknown error';
          });
          
          return {
            success: false,
            message: `Template errors: ${errorMessages.join('; ')}`
          };
        }
        
        return {
          success: false,
          message: `Template error: ${templateError.message || 'Unknown template syntax error'}`
        };
      }
      
      // Helper function to fix Hebrew text punctuation
      const fixHebrewPunctuation = (text: string): string => {
        if (!text) return text;
        
        // Don't use any Unicode marks - they interfere with Word
        // Just return the text as-is and let Word handle it
        return text;
      };
      
      // Prepare data for template - simple and clean
      const templateData = {
        fileName: data.fileName,
        speakers: data.speakers,  // This works perfectly as a string!
        duration: data.duration,
        date: data.date,
        // Format all text as a single string, just like speakers
        allText: data.blocks.map(b => b.text).join('\n\n'),
        // Format all content as a single string for perfect RTL
        allContent: data.blocks.map(b => `${b.speaker}: ${b.text}`).join('\n\n'),
        // Keep blocks for backward compatibility
        blocks: data.blocks.map((block, index) => ({
          speaker: block.speaker,
          text: block.text  // Remove any processing - keep it raw
        }))
      };
      
      console.log('Template data:', templateData);
      
      try {
        // Render the document
        doc.render(templateData);
      } catch (renderError) {
        console.error('Render error:', renderError);
        
        // Check if it's a template syntax error
        if (renderError instanceof Error) {
          if (renderError.message.includes('Multi error')) {
            return {
              success: false,
              message: 'Template syntax error. Please check your placeholders format (use {{placeholderName}}).'
            };
          } else if (renderError.message.includes('unclosed')) {
            return {
              success: false,
              message: 'Unclosed placeholder found. Make sure all placeholders have proper {{ }} format.'
            };
          }
        }
        
        throw renderError;
      }
      
      // Generate the document
      const output = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      
      // Save the file
      const fileName = `${data.fileName.replace(/\.[^/.]+$/, '')}_תמלול_${Date.now()}.docx`;
      saveAs(output, fileName);
      
      console.log('Template processed successfully');
      
      return {
        success: true,
        message: `Document generated: ${fileName}`
      };
    } catch (error) {
      console.error('Error processing template:', error);
      
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        message: `Error processing template: ${errorMessage}`
      };
    }
  }

  /**
   * Extract placeholders from zip directly (safer method)
   */
  private extractPlaceholdersFromZip(zip: PizZip): string[] {
    try {
      const documentXml = zip.file('word/document.xml')?.asText();
      const headerXml = zip.file('word/header1.xml')?.asText();
      const footerXml = zip.file('word/footer1.xml')?.asText();
      
      let allText = documentXml || '';
      if (headerXml) allText += headerXml;
      if (footerXml) allText += footerXml;
      
      if (!allText) return [];
      
      // Check for broken placeholders (split by XML tags)
      const brokenPattern = /\{[^}]*<[^>]+>[^}]*\}/g;
      const brokenMatches = allText.match(brokenPattern);
      if (brokenMatches) {
        console.warn('Found broken placeholders (split by Word formatting):', brokenMatches);
      }
      
      // Find all placeholders using regex (single curly braces for docxtemplater!)
      const placeholderRegex = /\{([^}]+)\}/g;
      const matches = allText.match(placeholderRegex) || [];
      
      // Check for loop tags specifically
      const hasOpenLoop = allText.includes('{#blocks');
      const hasCloseLoop = allText.includes('{/blocks');
      
      if (hasCloseLoop && !hasOpenLoop) {
        console.error('Found {/blocks} but no {#blocks} - loop is not properly opened');
      }
      if (hasOpenLoop && !hasCloseLoop) {
        console.error('Found {#blocks} but no {/blocks} - loop is not properly closed');
      }
      
      // Remove duplicates and sort
      const uniquePlaceholders = [...new Set(matches)].sort();
      
      console.log('Found placeholders in document:', uniquePlaceholders);
      return uniquePlaceholders;
    } catch (error) {
      console.warn('Could not extract placeholders from zip:', error);
      return [];
    }
  }

  /**
   * Extract placeholders from the template (legacy method)
   */
  private extractPlaceholders(doc: Docxtemplater): string[] {
    try {
      // Get the full text from the template
      const zip = doc.getZip();
      return this.extractPlaceholdersFromZip(zip);
    } catch (error) {
      console.warn('Could not extract placeholders:', error);
      return [];
    }
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