# TextEditor Block-Based Implementation Plan

## Overview
The TextEditor component uses a block-based architecture where each block contains a speaker section and a text section. This design enables efficient transcription with automatic speaker management and MediaPlayer synchronization.

## Core Architecture

### Block Structure
Each block consists of two main areas:
```
[Speaker Area] : [Text Area]
```

- **Speaker Area**: Fixed width (120px), displays speaker name or code
- **Text Area**: Flexible width, contains the transcribed text
- **Separator**: Colon (":") between speaker and text

### Block Component Structure
```typescript
interface TextBlock {
  id: string;              // Unique block identifier
  speaker: string;         // Speaker name or code
  text: string;           // Transcribed text content
  speakerTime: number;    // Hidden timestamp when speaker started
  element: HTMLElement;   // DOM reference
}
```

## Navigation System

### SPACE Key Navigation (Primary)
- **In Speaker Block + SPACE**: 
  - If empty → Move to text area of same block
  - If has content → Move to text area of same block
  
- **In Text Block + SPACE**:
  - If empty → Move to next block's speaker area
  - If has content → Insert space normally

### TAB Key Transformation
- **Single Letter + TAB**: Transforms to full speaker name
  - Hebrew: א → "דובר 1", ב → "דובר 2", etc.
  - English: A → "Speaker A", B → "Speaker B", etc.
  - If unknown → Creates new speaker automatically

### ENTER Key Behavior
- **ENTER**: Creates new block
  - Validates punctuation in current text block
  - Shows tooltip if text doesn't end with punctuation
  - Creates new block below current

- **SHIFT+ENTER**: 
  - In speaker → Move to text area
  - In text → Create new block (with validation)

### BACKSPACE Navigation
- **In empty text block**: Move back to speaker area
- **In empty speaker block**: Move to previous block's text area
- **At beginning of block**: Navigate to previous block

### Arrow Key Navigation
- **UP/DOWN**: Navigate between blocks vertically
- **LEFT/RIGHT**: Navigate between speaker/text horizontally
- Supports RTL layout for Hebrew

## Speaker Management

### Speaker Code System
Supports dual-language shortcuts:

#### Hebrew Codes
```javascript
hebrewCodes = {
  'א': 'דובר 1',
  'ב': 'דובר 2', 
  'ג': 'דובר 3',
  'ד': 'דובר 4',
  // ... etc
}
```

#### English Codes
```javascript
englishCodes = {
  'A': 'Speaker A',
  'B': 'Speaker B',
  'C': 'Speaker C',
  'D': 'Speaker D',
  // ... etc
}
```

### Color Coding
- Each unique speaker gets assigned a color
- Colors are consistent across TextEditor and Speaker panel
- Color palette with 8 distinct colors
- Cycles through palette for new speakers

### Speaker Events
```javascript
// Event: Request speaker transformation
document.dispatchEvent(new CustomEvent('speakerTabRequest', {
  detail: {
    code: 'א',  // or 'A'
    callback: (speakerName) => { /* handle transformation */ }
  }
}));

// Event: Speaker color updated
document.dispatchEvent(new CustomEvent('speakerColorUpdated', {
  detail: {
    speaker: 'דובר 1',
    color: '#667eea',
    colorIndex: 0
  }
}));
```

## MediaPlayer Synchronization

### Timestamp Features

#### Auto-Timestamp Conversion
- Type "..." → Converts to `[HH:MM:SS]`
- Gets current time from MediaPlayer
- Formatted with brackets and spaces

#### Hidden Speaker Timestamps
- Captures time when leaving speaker block (TAB/SPACE)
- Stored as `data-timestamp` attribute
- Used for navigation mode jumping

#### Timestamp Navigation
- Click on timestamp → Seek to that time
- Navigation mode → Auto-jump when cursor on timestamp
- Visual feedback on jump (background highlight)

### Mark Zone Integration
```typescript
interface MarkSync {
  marks: Mark[];           // From MediaPlayer
  activeMark: Mark | null; // Currently playing mark
  syncEnabled: boolean;    // Auto-scroll enabled
  autoScroll: boolean;     // Follow playback
}
```

### Synchronization Events
- `onSeek`: Jump to specific time
- `onMarkClick`: Navigate to mark
- `onMarkCreate`: Create mark at cursor
- `onMarkUpdate`: Update mark timing

## Text Validation

### Punctuation Rules
Text blocks must end with punctuation:
```javascript
const punctuationMarks = [
  '.', ',', '!', '?', ':', ';', 
  '״', '"', "'", ')', ']', '}'
];
```

### Validation Feedback
- Inline tooltip for missing punctuation
- Green gradient background
- Auto-dismiss after 3 seconds
- Prevents block creation until fixed

## Styling Guidelines

### Design Principles
- **Word-like appearance**: Clean, professional
- **Turquoise theme**: Matching transcription page (#17a2b8)
- **RTL support**: Full Hebrew text support
- **Responsive**: Adjustable height, scrollable

### Block Styling
```css
.text-block {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 4px 10px;
  background-color: #f9f9f9;
  margin-bottom: 1px;
}

.block-speaker {
  width: 120px;
  font-weight: 600;
  text-align: right;
  direction: rtl;
}

.block-text {
  flex: 1;
  direction: rtl;
}
```

### Visual States
- **Active block**: Subtle highlight
- **Speaker with timestamp**: Dotted underline
- **Hover on timestamp**: Pointer cursor
- **Navigation jump**: Brief background flash

## Component Communication

### TextEditor ↔ Speaker Panel
```
TextEditor                Speaker Panel
    |                          |
    |--speaker code + TAB----->|
    |<----speaker name---------|
    |                          |
    |--color update event----->|
    |<----speaker list---------|
```

### TextEditor ↔ MediaPlayer
```
TextEditor                MediaPlayer
    |                          |
    |<----current time---------|
    |--seek to time----------->|
    |                          |
    |<----marks list-----------|
    |--mark navigation-------->|
```

## Implementation Phases

### Phase 1: Core Block System
1. Create TextBlock component
2. Implement SPACE navigation
3. Add TAB transformation
4. Set up ENTER/BACKSPACE behavior

### Phase 2: Speaker Integration
1. Create Speaker component folder
2. Implement dual-language codes
3. Add color synchronization
4. Set up event communication

### Phase 3: MediaPlayer Sync
1. Add timestamp conversion
2. Implement hidden timestamps
3. Create navigation mode
4. Sync with mark zones

### Phase 4: Styling & Polish
1. Apply Word-like styling
2. Add turquoise theme
3. Implement tooltips
4. Add visual feedback

## File Structure
```
components/
├── TextEditor/
│   ├── index.tsx
│   ├── TextEditor.tsx
│   ├── TextEditor.css
│   ├── blocks/
│   │   ├── TextBlock.tsx
│   │   ├── TextBlock.css
│   │   └── BlockManager.ts
│   ├── hooks/
│   │   ├── useMediaSync.ts
│   │   └── useBlockNavigation.ts
│   └── utils/
│       ├── timestampUtils.ts
│       └── validationUtils.ts
└── Speaker/
    ├── index.tsx
    ├── Speaker.tsx
    ├── Speaker.css
    ├── SpeakerList.tsx
    └── utils/
        ├── speakerCodes.ts
        └── colorManager.ts
```

## Key Features Summary

1. **Block-based editing** with speaker/text separation
2. **SPACE navigation** between blocks
3. **Dual-language speaker codes** (Hebrew + English)
4. **Automatic timestamp conversion** ("..." → [HH:MM:SS])
5. **MediaPlayer synchronization** with marks
6. **Color-coded speakers** with consistency
7. **Punctuation validation** with inline feedback
8. **RTL support** for Hebrew text
9. **Word-like styling** with turquoise theme
10. **Event-driven communication** between components