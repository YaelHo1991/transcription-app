import { BlockData, SpeakerData } from './WordDocumentGenerator';

export class HtmlDocumentGenerator {
  /**
   * Generate HTML document with proper Hebrew RTL support
   */
  public generateHtml(
    blocks: BlockData[],
    speakers: Map<string, string>,
    mediaFileName: string,
    template: any,
    options: {
      includeTimestamps?: boolean;
      mediaDuration?: string;
    } = {}
  ): string {
    const speakerNames = this.extractSpeakerNames(blocks, speakers);
    const duration = options.mediaDuration || this.calculateDuration(blocks);
    
    // Get template settings with defaults
    const fontSize = template?.body?.content?.fontSize || 12;
    const fontFamily = template?.body?.content?.fontFamily || 'David';
    const speakerColor = template?.body?.content?.speakerColor || '000080';
    const speakerBold = template?.body?.content?.speakerBold !== false;
    const alignment = template?.body?.content?.alignment || 'right';
    const lineSpacing = template?.body?.content?.lineSpacing || 1.5;
    
    let html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <title>${mediaFileName} - תמלול</title>
        <style>
          body {
            font-family: '${fontFamily}', 'Arial Hebrew', 'Arial', sans-serif;
            direction: rtl;
            text-align: ${alignment};
            font-size: ${fontSize}pt;
            line-height: ${lineSpacing};
          }
          .header {
            margin-bottom: 20px;
          }
          .header-line {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
          }
          .header-left {
            text-align: left;
            flex: 0 1 auto;
          }
          .header-center {
            text-align: center;
            flex: 1 1 auto;
          }
          .header-right {
            text-align: right;
            flex: 0 1 auto;
          }
          .content {
            margin: 20px 0;
          }
          .speaker {
            font-weight: ${speakerBold ? 'bold' : 'normal'};
            color: #${speakerColor};
          }
          hr {
            border: none;
            border-top: 1px solid #000;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
    `;

    // Add header based on template settings
    if (template?.header?.enabled) {
      html += '<div class="header">';
      
      // Group elements by line
      const lines: { [key: string]: any[] } = {
        above: [],
        same: [],
        below: []
      };
      
      if (template.header.elements) {
        template.header.elements.forEach((element: any) => {
          const line = element.line || 'same';
          lines[line].push(element);
        });
      }
      
      // Process each line
      ['above', 'same', 'below'].forEach(lineKey => {
        if (lines[lineKey].length === 0) return;
        
        // Group by position
        const positions: { [key: string]: any[] } = {
          left: [],
          center: [],
          right: []
        };
        
        lines[lineKey].forEach((element: any) => {
          const position = element.position || 'center';
          positions[position].push(element);
        });
        
        html += '<div class="header-line">';
        
        // Left elements
        html += '<div class="header-left">';
        positions.left.forEach((el: any) => {
          html += this.renderHeaderElement(el, mediaFileName, speakerNames, duration);
        });
        html += '</div>';
        
        // Center elements
        html += '<div class="header-center">';
        positions.center.forEach((el: any) => {
          html += this.renderHeaderElement(el, mediaFileName, speakerNames, duration);
        });
        html += '</div>';
        
        // Right elements
        html += '<div class="header-right">';
        positions.right.forEach((el: any) => {
          html += this.renderHeaderElement(el, mediaFileName, speakerNames, duration);
        });
        html += '</div>';
        
        html += '</div>';
      });
      
      html += '</div>';
      
      // Add border line if enabled
      if (template.header.borderLine?.enabled) {
        html += '<hr/>';
      }
    }
    
    // Add speakers line based on template
    if (template?.body?.speakers?.enabled) {
      const speakersTemplate = template.body.speakers.template || 'דוברים: {{speakers}}, משך ההקלטה: {{duration}}';
      const speakersText = speakersTemplate
        .replace('{{speakers}}', speakerNames.join(', ') || 'לא צוינו')
        .replace('{{duration}}', duration);
      
      html += `
        <div class="content">
          <p><strong>${speakersText}</strong></p>
        </div>
        <hr/>
      `;
    }
    
    // Add transcription content
    html += '<div class="content">';
    blocks.forEach(block => {
      if (!block.speaker && !block.text) return;
      
      const speakerName = speakers.get(block.speaker) || block.speaker || '';
      const processedText = this.processTimestamp(block.text || '', options.includeTimestamps || false);
      const speakerSuffix = template?.body?.content?.speakerSuffix || ':';
      
      if (speakerName && processedText) {
        html += `<p><span class="speaker">${speakerName}${speakerSuffix}</span> ${processedText}</p>`;
      } else if (processedText) {
        html += `<p>${processedText}</p>`;
      }
    });
    html += '</div>';
    
    // Add footer based on template
    if (template?.footer?.enabled && template.footer.elements) {
      html += '<div style="text-align: center; margin-top: 40px;">';
      
      template.footer.elements.forEach((element: any) => {
        if (element.type === 'pageNumber') {
          html += '<p>עמוד 1</p>';
        } else if (element.type === 'pageNumberFull') {
          html += '<p>עמוד 1 מתוך 1</p>';
        } else if (element.value) {
          html += `<p>${element.value}</p>`;
        }
      });
      
      html += '</div>';
    }
    
    html += `
      </body>
      </html>
    `;
    
    return html;
  }
  
  /**
   * Generate header HTML (simplified - no longer used)
   */
  private generateHeader(headerConfig: any, mediaFileName: string, speakerNames: string[], duration: string): string {
    const groupedElements = this.groupElementsByLineAndPosition(headerConfig.elements);
    let headerHtml = '<div class="header">';
    
    // Process each line (above, same, below)
    ['above', 'same', 'below'].forEach(line => {
      if (groupedElements[line].left.length > 0 || 
          groupedElements[line].center.length > 0 || 
          groupedElements[line].right.length > 0) {
        
        headerHtml += '<div class="header-line">';
        
        // Left elements
        headerHtml += '<div class="header-left">';
        groupedElements[line].left.forEach((el: any) => {
          headerHtml += this.renderHeaderElement(el, mediaFileName, speakerNames, duration);
        });
        headerHtml += '</div>';
        
        // Center elements
        headerHtml += '<div class="header-center">';
        groupedElements[line].center.forEach((el: any) => {
          headerHtml += this.renderHeaderElement(el, mediaFileName, speakerNames, duration);
        });
        headerHtml += '</div>';
        
        // Right elements
        headerHtml += '<div class="header-right">';
        groupedElements[line].right.forEach((el: any) => {
          headerHtml += this.renderHeaderElement(el, mediaFileName, speakerNames, duration);
        });
        headerHtml += '</div>';
        
        headerHtml += '</div>';
      }
    });
    
    headerHtml += '</div>';
    return headerHtml;
  }
  
  /**
   * Render individual header element
   */
  private renderHeaderElement(element: any, mediaFileName: string, speakerNames: string[], duration: string): string {
    let value = '';
    
    switch (element.type) {
      case 'fileName':
        value = `קובץ: ${mediaFileName}`;
        break;
      case 'speakers':
        value = `דוברים: ${speakerNames.join(', ')}`;
        break;
      case 'duration':
        value = `משך: ${duration}`;
        break;
      case 'userName':
        value = 'משתמש';
        break;
      case 'date':
        value = `תאריך: ${new Date().toLocaleDateString('he-IL')}`;
        break;
      case 'pageNumber':
        value = 'עמוד 1';
        break;
      case 'pageNumberFull':
        value = 'עמוד 1 מתוך 1';
        break;
      case 'lineBreak':
        return '<br/>';
      case 'tab':
        return '&nbsp;&nbsp;&nbsp;&nbsp;';
      case 'text':
        value = element.value || '';
        break;
      default:
        value = element.value || '';
    }
    
    let style = '';
    if (element.bold) style += 'font-weight: bold; ';
    if (element.italic) style += 'font-style: italic; ';
    if (element.underline) style += 'text-decoration: underline; ';
    if (element.size) style += `font-size: ${element.size}pt; `;
    if (element.color) style += `color: #${element.color}; `;
    
    return `<p style="${style}">${value}</p>`;
  }
  
  /**
   * Generate footer HTML
   */
  private generateFooter(footerConfig: any): string {
    let footerHtml = '<div class="footer" style="margin-top: 40px; text-align: center; border-top: 1px solid #ccc; padding-top: 10px;">';
    
    footerConfig.elements?.forEach((element: any) => {
      if (element.type === 'pageNumber' || element.value === '{{pageNumber}}') {
        footerHtml += '<span class="page-number">עמוד <span class="page-number-placeholder">1</span></span>';
      } else if (element.type === 'pageNumberFull' || element.value === '{{pageNumberFull}}') {
        footerHtml += '<span class="page-number">עמוד <span class="page-number-placeholder">1</span> מתוך <span class="total-pages-placeholder">1</span></span>';
      }
    });
    
    footerHtml += '</div>';
    return footerHtml;
  }
  
  /**
   * Group header elements by line and position
   */
  private groupElementsByLineAndPosition(elements: any[]): any {
    const grouped: any = {
      above: { left: [], center: [], right: [] },
      same: { left: [], center: [], right: [] },
      below: { left: [], center: [], right: [] }
    };
    
    elements.forEach(element => {
      const line = element.line || 'same';
      const position = element.position || 'center';
      grouped[line][position].push(element);
    });
    
    return grouped;
  }
  
  /**
   * Extract speaker names from blocks
   */
  private extractSpeakerNames(blocks: BlockData[], speakers: Map<string, string>): string[] {
    const uniqueSpeakers = new Set<string>();
    
    blocks.forEach(block => {
      if (block.speaker) {
        const speakerName = speakers.get(block.speaker) || block.speaker;
        if (speakerName && speakerName.trim()) {
          uniqueSpeakers.add(speakerName);
        }
      }
    });
    
    return Array.from(uniqueSpeakers);
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
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  /**
   * Process timestamps in text
   */
  private processTimestamp(text: string, includeTimestamps: boolean): string {
    if (!includeTimestamps) {
      // Remove timestamps like [00:12:34]
      return text.replace(/\[\d{2}:\d{2}:\d{2}\]/g, '').trim();
    }
    return text;
  }
}