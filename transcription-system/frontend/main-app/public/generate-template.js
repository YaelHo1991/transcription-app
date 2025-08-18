// Script to generate a proper Hebrew Word template using docx library
const { Document, Paragraph, TextRun, AlignmentType, TabStopType, TabStopPosition, Packer, HeadingLevel } = require('docx');
const fs = require('fs');

async function createHebrewTemplate() {
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
        
        // Loop instruction comment
        new Paragraph({
          children: [
            new TextRun({
              text: '// Start of transcription content',
              font: 'Courier New',
              size: 20,
              color: '808080'
            })
          ],
          spacing: { after: 240 }
        }),
        
        // The loop template - properly formatted for RTL
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
        
        // Template line with proper RTL structure
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
              text: ':',
              font: 'David',
              size: 24,
              bold: true
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
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          tabStops: [
            {
              type: TabStopType.LEFT,
              position: TabStopPosition.MAX * 0.1  // 10% from left
            },
            {
              type: TabStopType.LEFT,
              position: TabStopPosition.MAX * 0.2  // 20% from left
            }
          ],
          indent: {
            left: 0,
            right: 0
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
        }),
        
        // End comment
        new Paragraph({
          children: [
            new TextRun({
              text: '// End of transcription content',
              font: 'Courier New',
              size: 20,
              color: '808080'
            })
          ],
          spacing: { before: 480 }
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
  fs.writeFileSync('hebrew-template-formatted.docx', buffer);
  console.log('Template created: hebrew-template-formatted.docx');
}

createHebrewTemplate().catch(console.error);