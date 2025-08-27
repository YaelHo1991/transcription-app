# Hebrew Word Export Solutions

## Problem Overview

The current Word document generation using the `docx` library has fundamental issues with Hebrew/RTL support:

### Current Issues:
1. **Colon Reversal**: Text like "קובץ:" appears as ":קובץ" in the generated Word document
2. **Page Number Alignment**: Elements marked as "right" don't actually align to the right
3. **Spell Check**: Hebrew words are marked as misspelled (red underlines)
4. **RTL Support**: The document isn't recognized as a Hebrew document by Word

### Root Cause:
The `docx` library doesn't properly set the document language and RTL properties at the XML level that Word requires for Hebrew documents.

---

## Solution 1: HTML to DOCX Conversion (RECOMMENDED)

### Overview
Generate HTML with proper Hebrew RTL formatting and convert it to DOCX using a library that explicitly supports RTL.

### Library: `convert-html-to-docx`
- **NPM**: https://www.npmjs.com/package/convert-html-to-docx
- **GitHub**: https://github.com/amalamrani/convert-html-to-docx
- **Key Feature**: Explicitly states "The generated documents support RTL orientation"

### Implementation Steps:

#### 1. Install the library
```bash
npm install convert-html-to-docx
```

#### 2. Create HTML Generator
```javascript
// HtmlDocumentGenerator.ts
export class HtmlDocumentGenerator {
  generateHtml(template, blocks, mediaFileName) {
    let html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <style>
          body { 
            font-family: 'David', 'Arial Hebrew', serif; 
            direction: rtl;
            text-align: right;
          }
          .header { 
            border-bottom: 1px solid black; 
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .page-number { 
            text-align: ${template.header.position || 'right'};
          }
          .speaker { 
            font-weight: bold; 
            color: #000080;
          }
          @media print {
            .page-break { page-break-after: always; }
          }
        </style>
      </head>
      <body>
    `;
    
    // Add header
    if (template.header?.enabled) {
      html += '<div class="header">';
      template.header.elements.forEach(element => {
        if (element.type === 'text') {
          html += `<span>${element.value}</span>`;
        } else if (element.type === 'fileName') {
          html += `<span>קובץ: ${mediaFileName}</span>`;
        }
        // Add other element types...
      });
      html += '</div>';
    }
    
    // Add content
    blocks.forEach(block => {
      html += `
        <p>
          <span class="speaker">${block.speaker}:</span>
          <span>${block.text}</span>
        </p>
      `;
    });
    
    html += '</body></html>';
    return html;
  }
}
```

#### 3. Convert HTML to DOCX
```javascript
import HTMLtoDOCX from 'convert-html-to-docx';

async function exportToWord(template, blocks, mediaFileName) {
  const generator = new HtmlDocumentGenerator();
  const html = generator.generateHtml(template, blocks, mediaFileName);
  
  const fileBuffer = await HTMLtoDOCX(html, null, {
    table: { row: { cantSplit: true } },
    footer: true,
    pageNumber: true,
    font: 'David',
    lang: 'he-IL'
  });
  
  // Save the file
  const blob = new Blob([fileBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
  });
  saveAs(blob, 'document.docx');
}
```

### Pros:
- Full control over HTML structure and styling
- Explicit RTL support
- Proper handling of mixed LTR/RTL content
- Hebrew punctuation works correctly

### Cons:
- Need to rewrite the template generator
- May lose some advanced Word features
- Different library to maintain

---

## Solution 2: Template-Based with Docxtemplater

### Overview
Use a pre-made Hebrew Word template with placeholders that get replaced with actual content.

### Library: `docxtemplater`
- **NPM**: https://www.npmjs.com/package/docxtemplater
- **Website**: https://docxtemplater.com/

### Implementation Steps:

#### 1. Create Word Template
1. Open Microsoft Word
2. Set document language to Hebrew (Review → Language → Hebrew)
3. Set text direction to RTL (Page Layout → Text Direction → Right-to-Left)
4. Create template with placeholders:
   ```
   קובץ: {fileName}
   דוברים: {speakers}
   משך: {duration}
   
   {#blocks}
   {speaker}: {text}
   {/blocks}
   ```
5. Save as `hebrew-template.docx`

#### 2. Install Dependencies
```bash
npm install docxtemplater pizzip
```

#### 3. Implementation
```javascript
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';

async function generateFromTemplate(data) {
  // Load the template
  const response = await fetch('/templates/hebrew-template.docx');
  const content = await response.arrayBuffer();
  
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });
  
  // Set the data
  doc.setData({
    fileName: data.mediaFileName,
    speakers: data.speakers.join(', '),
    duration: data.duration,
    blocks: data.blocks.map(b => ({
      speaker: b.speaker,
      text: b.text
    }))
  });
  
  // Render the document
  doc.render();
  
  // Generate output
  const blob = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  
  saveAs(blob, 'output.docx');
}
```

### Template Storage Options:
1. Store in `public/templates/` folder
2. Store as base64 string in the code
3. Allow users to upload their own templates

### Pros:
- Perfect Hebrew formatting (set in Word)
- No RTL issues - Word handles it natively
- Users can customize templates themselves
- Preserves all Word features

### Cons:
- Requires maintaining template files
- Less dynamic than code generation
- Template must match expected placeholders

---

## Solution 3: Alternative Export Formats

### Option A: HTML with Print Styles

#### Implementation:
```javascript
function exportAsHtml(content) {
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <title>תמלול</title>
      <style>
        @media print {
          @page { 
            size: A4; 
            margin: 2.5cm;
          }
          .no-print { display: none; }
          .page-break { page-break-after: always; }
        }
        body {
          font-family: 'David', 'Times New Roman', serif;
          direction: rtl;
          text-align: right;
          line-height: 1.5;
        }
      </style>
    </head>
    <body>${content}</body>
    </html>
  `;
  
  // Open in new window for printing/saving
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}
```

### Option B: RTF Format

#### Implementation:
```javascript
function generateRTF(content) {
  let rtf = '{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}';
  rtf += '\\viewkind4\\uc1\\pard\\rtlpar\\f0\\fs24 ';
  
  // Add content with RTL markers
  content.forEach(block => {
    rtf += `\\par ${block.speaker}: ${block.text}`;
  });
  
  rtf += '}';
  
  const blob = new Blob([rtf], { type: 'application/rtf' });
  saveAs(blob, 'document.rtf');
}
```

### Option C: Plain Text Export

```javascript
function exportAsText(blocks) {
  let text = 'תמלול\n';
  text += '='.repeat(50) + '\n\n';
  
  blocks.forEach(block => {
    text += `${block.speaker}: ${block.text}\n\n`;
  });
  
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, 'transcript.txt');
}
```

### Pros:
- Simple implementation
- No library dependencies
- Hebrew works perfectly
- Users can import to Word manually

### Cons:
- Not a true Word document
- Requires manual steps from users
- May lose formatting features

---

## Testing Strategy

### Test Cases:
1. **Hebrew Text**: Basic Hebrew paragraph
2. **Punctuation**: Test "קובץ:" displays correctly
3. **Mixed Content**: Hebrew and English in same line
4. **Numbers**: Hebrew text with numbers
5. **Alignment**: Test right/center/left alignment
6. **Page Numbers**: Verify page numbering works

### Success Criteria:
- ✅ No red underlines on Hebrew words
- ✅ Colons appear after Hebrew words (קובץ:)
- ✅ Page numbers align correctly
- ✅ Document opens without compatibility warnings
- ✅ RTL text flows properly

### Testing Order:
1. Start with Solution 1 (HTML to DOCX)
2. If issues persist, try Solution 2 (Template)
3. Fall back to Solution 3 if needed

---

## Implementation Timeline

### Phase 1: HTML to DOCX (2-3 days)
- Day 1: Install library and create HTML generator
- Day 2: Implement conversion and test
- Day 3: Fix issues and optimize

### Phase 2: Template Approach (if needed) (2 days)
- Day 1: Create templates and implement docxtemplater
- Day 2: Test and refine

### Phase 3: Alternative Formats (1 day)
- Implement as fallback options

---

## Decision Matrix

| Criteria | HTML→DOCX | Template | Alternative |
|----------|-----------|----------|-------------|
| Hebrew Support | Good | Excellent | Excellent |
| Development Time | Medium | Low | Very Low |
| Flexibility | High | Medium | Low |
| User Experience | Good | Good | Fair |
| Maintenance | Medium | Low | Very Low |

---

## Next Steps

1. **Immediate**: Implement Solution 1 (HTML to DOCX)
2. **Test**: With real Hebrew content from the transcription system
3. **Evaluate**: Check against success criteria
4. **Decide**: Continue with Solution 1 or move to Solution 2
5. **Deploy**: Once working solution is confirmed