import PizZip from 'pizzip';
import { Document, Packer, Paragraph } from 'docx';

/**
 * Extracts the body XML from a formatted Word document
 */
export async function extractBodyXML(paragraphs: Paragraph[]): Promise<string> {
  // Create a temporary document with just the body
  const tempDoc = new Document({
    creator: 'Transcription System',
    sections: [{
      properties: {
        bidi: true
      },
      children: paragraphs
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

  // Generate the document as a blob
  const blob = await Packer.toBlob(tempDoc);
  const buffer = await blob.arrayBuffer();
  
  // Open the document with PizZip
  const zip = new PizZip(buffer);
  
  // Extract the document.xml content
  const documentXml = zip.file('word/document.xml')?.asText();
  if (!documentXml) {
    throw new Error('Could not extract document XML');
  }
  
  // Extract just the body content (between w:body tags)
  const bodyMatch = documentXml.match(/<w:body>([\s\S]*?)<\/w:body>/);
  if (!bodyMatch) {
    throw new Error('Could not find body content');
  }
  
  // Extract just the paragraphs (w:p elements)
  const paragraphsXml = bodyMatch[1].match(/<w:p[\s\S]*?<\/w:p>/g);
  if (!paragraphsXml) {
    throw new Error('Could not find paragraphs');
  }
  
  // Return the paragraphs XML
  return paragraphsXml.join('\n');
}

/**
 * Injects formatted XML into a template document
 */
export function injectFormattedXML(
  templateZip: PizZip,
  formattedXML: string,
  marker: string = '###FORMATTED_CONTENT###'
): PizZip {
  // Get the document.xml
  let documentXml = templateZip.file('word/document.xml')?.asText();
  if (!documentXml) {
    throw new Error('Could not find document.xml in template');
  }
  
  // Find and replace the marker
  // The marker might be inside text runs like <w:t>###FORMATTED_CONTENT###</w:t>
  // We need to find the paragraph containing it and replace the whole paragraph
  
  // First, let's find all paragraphs
  const paragraphs = documentXml.match(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g) || [];
  
  let markerFound = false;
  for (const paragraph of paragraphs) {
    // Check if this paragraph contains our marker (even if split)
    const textContent = paragraph.replace(/<[^>]+>/g, ''); // Strip all XML tags
    if (textContent.includes(marker)) {
      // Replace this entire paragraph with our formatted content
      documentXml = documentXml.replace(paragraph, formattedXML);
      markerFound = true;
      break;
    }
  }
  
  if (!markerFound) {
    console.warn('Marker not found, trying alternate approach');
    // Look for the marker in any form within w:t tags
    const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let modifiedXml = documentXml;
    let replaced = false;
    
    modifiedXml = modifiedXml.replace(textRegex, (match, text) => {
      if (text.includes(marker) && !replaced) {
        replaced = true;
        // Find the paragraph this text belongs to and replace it
        const paragraphRegex = new RegExp('<w:p\\b[^>]*>[\\s\\S]*?' + 'match.replace(/[.*+?^' + '()|[\]\\]/g, \'\\`<w:p\\b[^>]*>[\\s\\S]*?${match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?</w:p>`\')}[\\s\\S]*?</w:p>');
        const paragraphMatch = documentXml.match(paragraphRegex);
        if (paragraphMatch) {
          documentXml = documentXml.replace(paragraphMatch[0], formattedXML);
        }
        return match; // Return unchanged since we're replacing at paragraph level
      }
      return match;
    });
    
    if (!replaced) {
      // As a last resort, insert before the last paragraph in the body
      const lastParagraphRegex = /<\/w:p>[\s]*<w:sectPr/;
      if (lastParagraphRegex.test(documentXml)) {
        documentXml = documentXml.replace(lastParagraphRegex, '</w:p>' + formattedXML + '<w:sectPr');
      } else {
        // Insert before closing body tag
        documentXml = documentXml.replace('</w:body>', formattedXML + '</w:body>');
      }
    }
  }
  
  // Update the document.xml in the zip
  templateZip.file('word/document.xml', documentXml);
  
  return templateZip;
}

/**
 * Combines template with formatted body in a single document
 */
export async function combineTemplateWithFormattedBody(
  templateBuffer: ArrayBuffer,
  formattedParagraphs: Paragraph[],
  templateData: any
): Promise<Blob> {
  // Step 1: Extract formatted body XML
  const formattedXML = await extractBodyXML(formattedParagraphs);
  
  // Step 2: Process template with marker
  const zip = new PizZip(templateBuffer);
  
  // First, process regular placeholders using docxtemplater
  // We'll do this in the calling function
  
  // Step 3: Inject formatted XML
  const marker = templateData.transcriptionContent || '###FORMATTED_CONTENT###';
  const updatedZip = injectFormattedXML(zip, formattedXML, marker);
  
  // Step 4: Generate final document
  const output = updatedZip.generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
  
  return output;
}