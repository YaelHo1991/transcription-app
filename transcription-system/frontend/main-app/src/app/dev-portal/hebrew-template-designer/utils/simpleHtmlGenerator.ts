interface HeaderElement {
  id: string;
  type: 'fileName' | 'date' | 'pageNumber' | 'speakers' | 'duration' | 'text';
  value?: string;
  position: 'left' | 'center' | 'right';
  style: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    size?: number;
    color?: string;
  };
}

interface SampleData {
  fileName: string;
  speakers: string[];
  duration: string;
  blocks: Array<{
    speaker: string;
    text: string;
  }>;
}

export function generateSimpleHtml(
  headerElements: HeaderElement[],
  sampleData: SampleData,
  bodySettings?: {
    alignment?: 'right' | 'left' | 'center' | 'justify';
    lineNumbers?: boolean;
    lineNumbersCountBy?: number;
    lineNumbersStartAt?: number;
  }
): string {
  console.log('=== Generating Simple HTML ===');
  console.log('Header elements:', headerElements);
  
  // Group header elements by position
  const leftElements = headerElements.filter(e => e.position === 'left');
  const centerElements = headerElements.filter(e => e.position === 'center');
  const rightElements = headerElements.filter(e => e.position === 'right');
  
  // Generate header HTML
  let headerHtml = '';
  
  // Process center elements first (most common)
  if (centerElements.length > 0) {
    centerElements.forEach(element => {
      const content = getElementContent(element, sampleData);
      const style = getElementStyle(element);
      headerHtml += `<p style="text-align: center; ${style}">${content}</p>\n`;
    });
  }
  
  // Process right elements
  if (rightElements.length > 0) {
    rightElements.forEach(element => {
      const content = getElementContent(element, sampleData);
      const style = getElementStyle(element);
      headerHtml += `<p style="text-align: right; ${style}">${content}</p>\n`;
    });
  }
  
  // Process left elements
  if (leftElements.length > 0) {
    leftElements.forEach(element => {
      const content = getElementContent(element, sampleData);
      const style = getElementStyle(element);
      headerHtml += `<p style="text-align: left; ${style}">${content}</p>\n`;
    });
  }
  
  // Get text alignment for body
  const textAlign = bodySettings?.alignment || 'right';
  const showLineNumbers = bodySettings?.lineNumbers || false;
  const lineCountBy = bodySettings?.lineNumbersCountBy || 1;
  
  // Generate complete HTML document
  const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <title>${sampleData.fileName} - תמלול</title>
        <style>
          body {
            font-family: 'David', 'Arial Hebrew', 'Arial', sans-serif;
            direction: rtl;
            text-align: ${textAlign === 'justify' ? 'justify' : textAlign};
            font-size: 14pt;
            line-height: 1.5;
            ${showLineNumbers ? 'margin-right: 50px; padding-right: 20px;' : ''}
            position: relative;
            overflow-x: visible;
          }
          .header {
            margin-bottom: 20px;
            border-bottom: 1px solid #000;
            padding-bottom: 10px;
          }
          .content {
            margin: 20px 0;
          }
          .content p {
            text-align: ${textAlign === 'justify' ? 'justify' : textAlign};
            margin: 10px 0;
          }
          .speaker {
            font-weight: bold;
            color: navy;
          }
          .page-footer {
            text-align: center;
            margin-top: 40px;
            font-size: 11pt;
          }
          ${showLineNumbers ? `
          .content {
            position: relative;
          }
          .line-number {
            position: absolute;
            right: -50px;
            color: #999;
            font-size: 10pt;
            width: 40px;
            text-align: right;
            top: 0;
            font-family: monospace;
            background: white;
            padding: 2px;
          }
          ` : ''}
        </style>
      </head>
      <body>
        <div class="header">
          ${headerHtml}
        </div>
        
        <div class="content">
          <p><strong>דוברים:</strong> ${sampleData.speakers.join(', ')}</p>
          <p><strong>משך הקלטה:</strong> ${sampleData.duration}</p>
        </div>
        
        <hr/>
        
        <div class="content">
          ${sampleData.blocks.map((block, index) => {
            const lineNum = index + 1;
            const shouldShowNumber = showLineNumbers && (lineNum % lineCountBy === 0 || lineNum === 1);
            return `
              <p style="position: relative;">
                ${shouldShowNumber ? `<span class="line-number">${lineNum}</span>` : ''}
                <span class="speaker">${block.speaker}:</span> ${block.text}
              </p>`;
          }).join('\n')}
        </div>
        
        <div class="page-footer">
          <p>עמוד 1</p>
        </div>
      </body>
      </html>
    `;
  
  console.log('Generated HTML length:', html.length);
  return html;
}

function getElementContent(element: HeaderElement, sampleData: SampleData): string {
  switch (element.type) {
    case 'fileName':
      return `קובץ: ${sampleData.fileName}`;
    case 'date':
      return `תאריך: ${new Date().toLocaleDateString('he-IL')}`;
    case 'pageNumber':
      return 'עמוד 1';
    case 'speakers':
      return `דוברים: ${sampleData.speakers.join(', ')}`;
    case 'duration':
      return `משך: ${sampleData.duration}`;
    case 'text':
      return element.value || '';
    default:
      return '';
  }
}

function getElementStyle(element: HeaderElement): string {
  const styles: string[] = [];
  
  if (element.style.bold) {
    styles.push('font-weight: bold');
  }
  
  if (element.style.italic) {
    styles.push('font-style: italic');
  }
  
  if (element.style.underline) {
    styles.push('text-decoration: underline');
  }
  
  if (element.style.size) {
    styles.push(`font-size: ${element.style.size}pt`);
  }
  
  if (element.style.color) {
    styles.push(`color: #${element.style.color}`);
  }
  
  return styles.join('; ');
}