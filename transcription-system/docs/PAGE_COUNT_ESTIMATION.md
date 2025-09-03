# Page Count Estimation Feature

## Overview
The Page Count Estimation feature provides real-time page count feedback in the text editor based on how the content will appear when exported to Word using customizable templates. Since the text editor display doesn't reflect the actual Word template formatting (fonts, margins, spacing), this feature calculates an accurate estimate without generating the actual Word document.

## Problem Statement
- Text editor is resizable and responsive - doesn't reflect actual Word page layout
- Different Word templates have different formatting (fonts, sizes, margins, spacing)
- Users need to know approximate page count while working
- Generating Word documents for every keystroke is resource-intensive

## Technical Approaches Analysis

### 1. Static Calculation (70-80% Accuracy)
**Method:** Fixed values for characters/lines per page
```javascript
const CHARS_PER_PAGE = 1800;
const pageCount = totalCharacters / CHARS_PER_PAGE;
```
**Pros:** Fast, simple
**Cons:** Ignores template variations, font metrics, Hebrew text characteristics

### 2. Template XML Parsing (85-90% Accuracy)
**Method:** Extract formatting from .docx template
```javascript
// Parse word/styles.xml and word/document.xml
const templateSpecs = {
  fontSize: extractFromXML('w:sz'),
  lineSpacing: extractFromXML('w:spacing'),
  margins: extractFromXML('w:pgMar')
}
```
**Pros:** Adapts to each template
**Cons:** Doesn't account for font character widths, word wrapping

### 3. Smart Hybrid with Calibration (95-98% Accuracy)
**Method:** Template parsing + font metrics + calibration
```javascript
const calibratedConfig = {
  templateId: 'hebrew-export-template',
  actualCharsPerPage: 1890,  // Measured from test document
  calibrationFactor: 1.02,    // Fine-tuning based on samples
  fontMetrics: { 
    'David': { avgCharWidth: 6.2 } 
  }
}
```
**Pros:** Highly accurate, adapts to templates
**Cons:** Requires initial calibration

### 4. Shadow Document Generation (99-100% Accuracy)
**Method:** Generate Word document in memory, count pages
**Pros:** Perfect accuracy
**Cons:** Resource intensive, slower

## Recommended Implementation: Smart Hybrid Approach

### System Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Admin Upload   │────▶│ Template Parser │────▶│  Calibration    │
│    Template     │     │   & Analyzer    │     │    Storage      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Text Editor   │────▶│  Page Counter   │────▶│  Real-time      │
│     Blocks      │     │    Service      │     │    Display      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Admin Workflow for Template Configuration

#### Step 1: Template Upload
Admin uploads a new Word template through the admin panel

#### Step 2: Automatic Analysis
System automatically extracts:
```
Template Analysis Results:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Font Family: David
✓ Font Size: 12pt
✓ Line Spacing: 1.5
✓ Page Margins: 
  - Top: 2.54cm
  - Bottom: 2.54cm
  - Left: 3.17cm
  - Right: 3.17cm
✓ Page Size: A4 (21cm x 29.7cm)
✓ Effective Text Area: 14.66cm x 24.62cm

Calculated Estimates:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Lines per page: ~28
• Characters per line: ~68
• Total characters per page: ~1,904
```

#### Step 3: Manual Adjustment Interface
```
┌──────────────────────────────────────────────┐
│  Template Calibration - hebrew-export.docx   │
├──────────────────────────────────────────────┤
│                                              │
│  Characters per line:    [68]   ↕           │
│  Lines per page:         [28]   ↕           │
│  Speaker line factor:    [1.4]  ↕           │
│  Paragraph break lines:  [0.5]  ↕           │
│                                              │
│  [Test with Sample Text]  [Save Config]     │
└──────────────────────────────────────────────┘
```

#### Step 4: Calibration Testing
Admin clicks "Test with Sample Text":
1. System generates a Word document with known content (e.g., 1000 words)
2. Counts actual pages in generated document
3. Calculates calibration factor
4. Shows comparison:
```
Test Results:
Expected pages (calculated): 2.3
Actual pages (in Word): 2.5
Calibration factor: 1.087
Accuracy: 92% → 98% (after calibration)
```

#### Step 5: Save Configuration
Calibrated values stored in database:
```sql
template_configs:
- template_id: 'hebrew-export-template'
- chars_per_page: 1890
- speaker_multiplier: 1.4
- paragraph_multiplier: 0.5
- calibration_factor: 1.087
- last_calibrated: '2025-01-15'
- calibrated_by: 'admin@system.com'
```

### User Experience

#### Display in Text Editor
```
┌─────────────────────────────────────────────┐
│ 📝 Text Editor                              │
│ ─────────────────────────────────────────── │
│ Words: 1,234 | Pages: ~3.2 📄 | Saved ✓    │
└─────────────────────────────────────────────┘
```

#### Tooltip on Hover
```
┌──────────────────────────────┐
│ Estimated Page Count         │
│ ───────────────────────────  │
│ Based on: hebrew-export.docx │
│ Accuracy: ±5%                │
│ Last calibrated: 3 days ago  │
│                              │
│ [Get Exact Count]            │
└──────────────────────────────┘
```

### Technical Implementation Details

#### Core Calculation Function
```javascript
class PageEstimationService {
  calculatePages(blocks, templateConfig) {
    let totalChars = 0;
    let extraLines = 0;
    
    blocks.forEach(block => {
      // Count characters
      totalChars += block.text.length;
      
      // Account for speaker lines (take extra space)
      if (block.speaker) {
        extraLines += templateConfig.speakerMultiplier;
      }
      
      // Account for paragraph breaks
      const breaks = (block.text.match(/\n\n/g) || []).length;
      extraLines += breaks * templateConfig.paragraphMultiplier;
    });
    
    // Convert extra lines to character equivalent
    const extraChars = extraLines * templateConfig.charsPerLine;
    
    // Total effective characters
    const effectiveChars = totalChars + extraChars;
    
    // Apply calibration
    const pages = (effectiveChars / templateConfig.charsPerPage) 
                  * templateConfig.calibrationFactor;
    
    return {
      pages: Math.round(pages * 10) / 10,  // Round to 0.1
      confidence: templateConfig.isCalibrated ? 0.95 : 0.85
    };
  }
}
```

#### Hebrew-Specific Considerations
```javascript
const hebrewFactors = {
  // Hebrew words are generally shorter
  avgWordLength: 4.2,  // vs 5.1 for English
  
  // RTL affects line breaks differently
  lineBreakFactor: 1.1,
  
  // Punctuation positioning affects space
  punctuationFactor: 1.02,
  
  // Common short words affect packing
  commonWords: ['את', 'של', 'על', 'עם'],  // Take less space
};
```

### API Endpoints

#### 1. Template Analysis Endpoint
```
POST /api/admin/templates/analyze
Body: FormData with .docx file
Response: {
  fontSize: 12,
  fontFamily: "David",
  linesPerPage: 28,
  charsPerLine: 68,
  margins: {...}
}
```

#### 2. Calibration Test Endpoint
```
POST /api/admin/templates/calibrate
Body: {
  templateId: "hebrew-export-template",
  sampleText: "..." // Optional, uses default if not provided
}
Response: {
  expectedPages: 2.3,
  actualPages: 2.5,
  calibrationFactor: 1.087,
  accuracy: 0.98
}
```

#### 3. Page Count Estimation Endpoint
```
POST /api/projects/estimate-pages
Body: {
  blocks: [...],
  templateId: "hebrew-export-template"
}
Response: {
  pages: 3.2,
  confidence: 0.95,
  templateName: "hebrew-export-template"
}
```

### Database Schema

```sql
-- Template configurations table
CREATE TABLE template_configs (
  id UUID PRIMARY KEY,
  template_id VARCHAR(255) UNIQUE NOT NULL,
  template_name VARCHAR(255),
  
  -- Base metrics
  font_family VARCHAR(100),
  font_size INTEGER,
  line_spacing DECIMAL(3,2),
  
  -- Calculated values
  chars_per_line INTEGER,
  lines_per_page INTEGER,
  chars_per_page INTEGER,
  
  -- Multipliers
  speaker_line_multiplier DECIMAL(3,2) DEFAULT 1.4,
  paragraph_break_multiplier DECIMAL(3,2) DEFAULT 0.5,
  
  -- Calibration
  is_calibrated BOOLEAN DEFAULT FALSE,
  calibration_factor DECIMAL(4,3) DEFAULT 1.000,
  calibration_sample TEXT,
  calibration_date TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255)
);

-- Cache for page count estimates
CREATE TABLE page_count_cache (
  id UUID PRIMARY KEY,
  content_hash VARCHAR(64),  -- SHA-256 of blocks content
  template_id VARCHAR(255),
  page_count DECIMAL(5,1),
  calculated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_content_template (content_hash, template_id)
);
```

### Implementation Phases

#### Phase 1: Basic Implementation (Week 1)
- [ ] Create PageEstimationService
- [ ] Add simple character-based calculation
- [ ] Display count in text editor
- [ ] Add "estimated" indicator

#### Phase 2: Template Analysis (Week 2)
- [ ] Implement .docx parser for templates
- [ ] Create admin UI for template upload
- [ ] Auto-extract template specifications
- [ ] Store template configs in database

#### Phase 3: Calibration System (Week 3)
- [ ] Build calibration test generator
- [ ] Create calibration UI for admin
- [ ] Implement calibration factor calculation
- [ ] Add confidence scoring

#### Phase 4: Optimization (Week 4)
- [ ] Implement caching system
- [ ] Add real-time updates with debouncing
- [ ] Create background worker for large documents
- [ ] Add "exact count" option with progress indicator

### Performance Considerations

1. **Caching Strategy**
   - Cache page count for 30 seconds during active editing
   - Store hash of content to detect changes
   - Background recalculation on idle

2. **Debouncing**
   ```javascript
   const debouncedCalculate = debounce(() => {
     calculatePageCount();
   }, 500); // Wait 500ms after typing stops
   ```

3. **Progressive Enhancement**
   - Show quick estimate immediately (~50ms)
   - Refine with better calculation (~200ms)
   - Option for exact count via Word generation (~2-3s)

### Success Metrics

1. **Accuracy Goals**
   - 90% of estimates within ±10% of actual
   - 95% of calibrated estimates within ±5% of actual

2. **Performance Goals**
   - Initial estimate: <100ms
   - Refined estimate: <500ms
   - UI remains responsive during calculation

3. **User Satisfaction**
   - Clear indication that it's an estimate
   - Option for exact count when needed
   - Consistent accuracy across different templates

### Future Enhancements

1. **Machine Learning Calibration**
   - Learn from actual exports to improve estimates
   - Template-specific pattern recognition

2. **Multi-Template Support**
   - Allow users to preview with different templates
   - Quick template switching for comparison

3. **Export Preview**
   - Visual page break indicators in editor
   - Mini page thumbnails showing layout

4. **Advanced Metrics**
   - Estimate ink/toner usage
   - Reading time estimation
   - Formatting complexity score

## Summary

The Smart Hybrid Approach provides the best balance of accuracy (95-98%) and performance. By combining template analysis, calibration, and caching, users get reliable page estimates in real-time without the overhead of generating actual Word documents. The admin calibration workflow ensures accuracy across different templates while maintaining system flexibility.