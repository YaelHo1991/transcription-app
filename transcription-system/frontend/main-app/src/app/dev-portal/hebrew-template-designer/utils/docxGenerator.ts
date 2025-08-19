import { Document, Paragraph, TextRun, AlignmentType, Header, Footer, PageNumber, NumberFormat, Packer, convertInchesToTwip, HeadingLevel, TabStopType, TabStopPosition, LineNumberRestartFormat, LineNumberCountBy } from 'docx';
import { saveAs } from 'file-saver';

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

interface FooterElement {
  id: string;
  type: 'fileName' | 'date' | 'pageNumber' | 'pageNumberFull' | 'text' | 'userName' | 'time';
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

export async function generateDocxWithRealHeader(
  headerElements: HeaderElement[],
  footerElements: FooterElement[],
  sampleData: SampleData,
  bodySettings?: {
    alignment?: 'right' | 'left' | 'center' | 'justify';
    lineNumbers?: boolean;
    lineNumbersCountBy?: number;
    lineNumbersStartAt?: number;
  }
): Promise<void> {
  console.log('=== Generating DOCX with Real Header & Footer ===');
  
  // Group header elements by position
  const leftElements = headerElements.filter(e => e.position === 'left');
  const centerElements = headerElements.filter(e => e.position === 'center');
  const rightElements = headerElements.filter(e => e.position === 'right');
  
  // Create header paragraphs
  const headerParagraphs: Paragraph[] = [];
  
  // If we have elements in different positions, use tab stops
  const hasMultiplePositions = 
    (leftElements.length > 0 && centerElements.length > 0) ||
    (leftElements.length > 0 && rightElements.length > 0) ||
    (centerElements.length > 0 && rightElements.length > 0);
  
  if (hasMultiplePositions) {
    // Create a single paragraph with tab stops for positioning
    const children: any[] = [];
    
    // Add left elements
    leftElements.forEach(element => {
      const content = getElementContent(element, sampleData);
      children.push(createTextRun(content, element.style));
    });
    
    // Add tab and center elements
    if (centerElements.length > 0) {
      children.push(new TextRun({ text: '\t' }));
      centerElements.forEach(element => {
        const content = getElementContent(element, sampleData);
        children.push(createTextRun(content, element.style));
      });
    }
    
    // Add tab and right elements
    if (rightElements.length > 0) {
      children.push(new TextRun({ text: '\t' }));
      rightElements.forEach(element => {
        const content = getElementContent(element, sampleData);
        children.push(createTextRun(content, element.style));
      });
    }
    
    headerParagraphs.push(
      new Paragraph({
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
        bidirectional: true
      })
    );
  } else {
    // Create separate paragraphs for each position group
    if (centerElements.length > 0) {
      centerElements.forEach(element => {
        const content = getElementContent(element, sampleData);
        headerParagraphs.push(
          new Paragraph({
            children: [createTextRun(content, element.style)],
            alignment: AlignmentType.CENTER,
            bidirectional: true
          })
        );
      });
    }
    
    if (rightElements.length > 0) {
      rightElements.forEach(element => {
        const content = getElementContent(element, sampleData);
        headerParagraphs.push(
          new Paragraph({
            children: [createTextRun(content, element.style)],
            alignment: AlignmentType.RIGHT,
            bidirectional: true
          })
        );
      });
    }
    
    if (leftElements.length > 0) {
      leftElements.forEach(element => {
        const content = getElementContent(element, sampleData);
        headerParagraphs.push(
          new Paragraph({
            children: [createTextRun(content, element.style)],
            alignment: AlignmentType.LEFT,
            bidirectional: true
          })
        );
      });
    }
  }
  
  // Create body content
  const bodyParagraphs: Paragraph[] = [];
  
  // Add speakers info
  bodyParagraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'דוברים: ',
          bold: true,
          size: 24,
          font: 'David'
        }),
        new TextRun({
          text: sampleData.speakers.join(', '),
          size: 24,
          font: 'David'
        })
      ],
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      spacing: { after: 240 }
    })
  );
  
  bodyParagraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'משך הקלטה: ',
          bold: true,
          size: 24,
          font: 'David'
        }),
        new TextRun({
          text: sampleData.duration,
          size: 24,
          font: 'David'
        })
      ],
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      spacing: { after: 480 }
    })
  );
  
  // Get body alignment setting (default to justified for transcriptions)
  const bodyAlignment = bodySettings?.alignment === 'center' ? AlignmentType.CENTER :
                       bodySettings?.alignment === 'left' ? AlignmentType.LEFT :
                       bodySettings?.alignment === 'right' ? AlignmentType.RIGHT :
                       AlignmentType.JUSTIFIED; // Default to justified
  
  // Add transcription blocks
  sampleData.blocks.forEach(block => {
    bodyParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: block.speaker + ': ',
            bold: true,
            color: '000080',
            size: 24,
            font: 'David'
          }),
          new TextRun({
            text: block.text,
            size: 24,
            font: 'David'
          })
        ],
        alignment: bodyAlignment,
        bidirectional: true,
        spacing: { after: 240, line: 360 }
      })
    );
  });
  
  // Add more content to test multiple pages
  for (let i = 0; i < 20; i++) {
    bodyParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `בלוק נוסף ${i + 1}: `,
            bold: true,
            color: '000080',
            size: 24,
            font: 'David'
          }),
          new TextRun({
            text: 'זהו טקסט נוסף כדי לבדוק שהכותרת העליונה והתחתונה מופיעות בכל עמוד. הטקסט הזה ארוך יותר כדי למלא מקום ולגרום למסמך להיות מרובה עמודים.',
            size: 24,
            font: 'David'
          })
        ],
        alignment: bodyAlignment,
        bidirectional: true,
        spacing: { after: 240, line: 360 }
      })
    );
  }
  
  // Create footer paragraphs
  const footerParagraphs = createFooterParagraphs(footerElements, sampleData);
  
  // Create the document with real header and footer
  const doc = new Document({
    creator: 'Hebrew Template Designer',
    sections: [{
      headers: {
        default: new Header({
          children: headerParagraphs
        })
      },
      footers: {
        default: new Footer({
          children: footerParagraphs
        })
      },
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1),
            right: bodySettings?.lineNumbers ? convertInchesToTwip(1.5) : convertInchesToTwip(1)
          }
        },
        bidi: true,
        rtlGutter: true,
        textDirection: 'rightToLeft',
        lineNumbers: bodySettings?.lineNumbers ? {
          countBy: bodySettings.lineNumbersCountBy || 1,
          start: bodySettings.lineNumbersStartAt || 1,
          restart: LineNumberRestartFormat.NEW_PAGE,
          distance: convertInchesToTwip(0.5)
        } : undefined
      },
      children: bodyParagraphs
    }],
    settings: {
      defaultLanguage: 'he-IL',
      evenAndOddHeaderAndFooters: false
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
      }
    }
  });
  
  // Generate and save
  const blob = await Packer.toBlob(doc);
  const fileName = `hebrew_test_${new Date().getTime()}.docx`;
  
  console.log('Saving DOCX with real header & footer as:', fileName);
  saveAs(blob, fileName);
  console.log('=== DOCX Generation Complete ===');
}

function createFooterParagraphs(footerElements: FooterElement[], sampleData: SampleData): Paragraph[] {
  // Group footer elements by position
  const leftElements = footerElements.filter(e => e.position === 'left');
  const centerElements = footerElements.filter(e => e.position === 'center');
  const rightElements = footerElements.filter(e => e.position === 'right');
  
  const footerParagraphs: Paragraph[] = [];
  
  // Check if we have elements in different positions
  const hasMultiplePositions = 
    (leftElements.length > 0 && centerElements.length > 0) ||
    (leftElements.length > 0 && rightElements.length > 0) ||
    (centerElements.length > 0 && rightElements.length > 0);
  
  if (hasMultiplePositions) {
    // Create a single paragraph with tab stops
    const children: any[] = [];
    
    // Add left elements
    leftElements.forEach(element => {
      children.push(...createFooterTextRun(element, sampleData));
    });
    
    // Add tab and center elements
    if (centerElements.length > 0) {
      children.push(new TextRun({ text: '\t' }));
      centerElements.forEach(element => {
        children.push(...createFooterTextRun(element, sampleData));
      });
    }
    
    // Add tab and right elements
    if (rightElements.length > 0) {
      children.push(new TextRun({ text: '\t' }));
      rightElements.forEach(element => {
        children.push(...createFooterTextRun(element, sampleData));
      });
    }
    
    footerParagraphs.push(
      new Paragraph({
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
        bidirectional: true
      })
    );
  } else {
    // Create separate paragraphs for each position group
    if (centerElements.length > 0) {
      centerElements.forEach(element => {
        footerParagraphs.push(
          new Paragraph({
            children: createFooterTextRun(element, sampleData),
            alignment: AlignmentType.CENTER,
            bidirectional: true
          })
        );
      });
    }
    
    if (rightElements.length > 0) {
      rightElements.forEach(element => {
        footerParagraphs.push(
          new Paragraph({
            children: createFooterTextRun(element, sampleData),
            alignment: AlignmentType.RIGHT,
            bidirectional: true
          })
        );
      });
    }
    
    if (leftElements.length > 0) {
      leftElements.forEach(element => {
        footerParagraphs.push(
          new Paragraph({
            children: createFooterTextRun(element, sampleData),
            alignment: AlignmentType.LEFT,
            bidirectional: true
          })
        );
      });
    }
  }
  
  return footerParagraphs;
}

function createFooterTextRun(element: FooterElement, sampleData: SampleData): any[] {
  const style = element.style;
  const baseStyle = {
    font: 'David',
    size: (style?.size || 11) * 2,
    bold: style?.bold,
    italics: style?.italic,
    underline: style?.underline ? {} : undefined,
    color: style?.color || '000000',
    rightToLeft: true,
    language: {
      value: 'he-IL'
    }
  };
  
  switch (element.type) {
    case 'pageNumber':
      return [
        new TextRun({
          children: [PageNumber.CURRENT],
          ...baseStyle
        })
      ];
    
    case 'pageNumberFull':
      return [
        new TextRun({ ...baseStyle, text: 'עמוד ' }),
        new TextRun({
          children: [PageNumber.CURRENT],
          ...baseStyle
        }),
        new TextRun({ ...baseStyle, text: ' מתוך ' }),
        new TextRun({
          children: [PageNumber.TOTAL_PAGES],
          ...baseStyle
        })
      ];
    
    case 'fileName':
      return [new TextRun({ ...baseStyle, text: sampleData.fileName })];
    
    case 'date':
      return [new TextRun({ ...baseStyle, text: new Date().toLocaleDateString('he-IL') })];
    
    case 'time':
      return [new TextRun({ ...baseStyle, text: new Date().toLocaleTimeString('he-IL') })];
    
    case 'userName':
      return [new TextRun({ ...baseStyle, text: 'משתמש מערכת' })];
    
    case 'text':
      return [new TextRun({ ...baseStyle, text: element.value || '' })];
    
    default:
      return [new TextRun({ ...baseStyle, text: '' })];
  }
}

function getElementContent(element: HeaderElement, sampleData: SampleData): string {
  switch (element.type) {
    case 'fileName':
      return 'קובץ: ' + sampleData.fileName;
    case 'date':
      return 'תאריך: ' + new Date().toLocaleDateString('he-IL');
    case 'pageNumber':
      return ''; // Will be handled specially
    case 'speakers':
      return 'דוברים: ' + sampleData.speakers.join(', ');
    case 'duration':
      return 'משך: ' + sampleData.duration;
    case 'text':
      return element.value || '';
    default:
      return '';
  }
}

function createTextRun(text: string, style: HeaderElement['style']): TextRun {
  // Handle page numbers specially
  if (text === '') {
    return new TextRun({
      children: [PageNumber.CURRENT],
      font: 'David',
      size: (style?.size || 12) * 2
    });
  }
  
  return new TextRun({
    text,
    bold: style?.bold,
    italics: style?.italic,
    underline: style?.underline ? {} : undefined,
    size: (style?.size || 12) * 2,
    color: style?.color || '000000',
    font: 'David',
    rightToLeft: true,
    language: {
      value: 'he-IL'
    }
  });
}