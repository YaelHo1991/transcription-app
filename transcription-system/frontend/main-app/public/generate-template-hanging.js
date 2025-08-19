// Script to generate Hebrew Word template with hanging indent for multi-line text
const { Document, Paragraph, TextRun, AlignmentType, TabStopType, TabStopPosition, Packer, HeadingLevel } = require('docx');
const fs = require('fs');

async function createHebrewTemplateWithHanging() {
  const doc = new Document({
    creator: 'Template Generator',
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440,
            right: 1440,
            bottom: 1440,
            left: 1440
          }
        },
        bidi: true  // Enable RTL for section
      },
      children: [
        // Header
        new Paragraph({
          children: [
            new TextRun({
              text: 'שם הקובץ: ',
              font: 'David',
              size: 24,
              bold: true
            }),
            new TextRun({
              text: '{fileName}',
              font: 'David',
              size: 24
            })
          ],
          alignment: AlignmentType.CENTER,
          bidirectional: true
        }),
        
        // Separator
        new Paragraph({
          children: [
            new TextRun({
              text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
              size: 24
            })
          ],
          alignment: AlignmentType.CENTER
        }),
        
        // Metadata
        new Paragraph({
          children: [
            new TextRun({
              text: 'דוברים: ',
              font: 'David',
              size: 24,
              bold: true
            }),
            new TextRun({
              text: '{speakers}',
              font: 'David',
              size: 24
            }),
            new TextRun({
              text: ', זמן הקלטה: ',
              font: 'David',
              size: 24,
              bold: true
            }),
            new TextRun({
              text: '{duration}',
              font: 'David',
              size: 24
            }),
            new TextRun({
              text: ' דקות',
              font: 'David',
              size: 24
            })
          ],
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          spacing: { after: 240 }
        }),
        
        // Another separator
        new Paragraph({
          children: [
            new TextRun({
              text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
              size: 24
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 480 }
        }),
        
        // Loop start
        new Paragraph({
          children: [
            new TextRun({
              text: '{#formattedBlocks}',
              font: 'Courier New',
              size: 20,
              color: '0000FF'
            })
          ]
        }),
        
        // THE MAIN TEMPLATE LINE WITH HANGING INDENT
        new Paragraph({
          children: [
            new TextRun({
              text: '{lineNumber}',
              font: 'David',
              size: 24
            }),
            new TextRun({
              text: '\t',  // Tab
              font: 'David',
              size: 24
            }),
            new TextRun({
              text: '{speaker}',
              font: 'David',
              size: 24,
              bold: true  // Make speaker bold
            }),
            new TextRun({
              text: '\t',  // Tab
              font: 'David',
              size: 24
            }),
            new TextRun({
              text: '{text}',
              font: 'David',
              size: 24
            })
          ],
          alignment: AlignmentType.JUSTIFIED,
          bidirectional: true,
          // HANGING INDENT CONFIGURATION
          indent: {
            left: 2268,  // 4cm in twips (567 twips = 1cm)
            hanging: 2268 // Same as left for hanging indent
          },
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: 283  // 0.5cm for line numbers
            },
            {
              type: TabStopType.LEFT,
              position: 1417  // 2.5cm for speakers
            },
            {
              type: TabStopType.LEFT,
              position: 2268  // 4cm for text start (same as indent)
            }
          ],
          spacing: {
            line: 360,  // 1.5 line spacing
            after: 120  // Small space after paragraph
          }
        }),
        
        // End loop
        new Paragraph({
          children: [
            new TextRun({
              text: '{/formattedBlocks}',
              font: 'Courier New',
              size: 20,
              color: '0000FF'
            })
          ],
          spacing: { before: 240 }
        })
      ]
    }],
    settings: {
      defaultTabStop: 708,
      defaultLanguage: 'he-IL',
      themeFontLang: {
        val: 'he-IL',
        eastAsia: 'he-IL',
        bidi: 'he-IL'
      }
    }
  });

  // Generate and save
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync('hebrew-template-hanging-indent.docx', buffer);
  console.log('Template with hanging indent created: hebrew-template-hanging-indent.docx');
  console.log('');
  console.log('This template has:');
  console.log('- Hanging indent of 4cm for multi-line text');
  console.log('- Tab stops at 0.5cm, 2.5cm, and 4cm');
  console.log('- RTL text direction');
  console.log('- Bold speaker names');
  console.log('');
  console.log('Multi-line text will automatically indent on continuation lines!');
}

createHebrewTemplateWithHanging().catch(console.error);