# Speaker Component Implementation Plan

## Overview
The Speaker component manages speaker identification, shortcuts, and visual representation in the transcription system. It works in tandem with the TextEditor to provide seamless speaker management with dual-language support.

## Core Architecture

### Speaker Data Structure
```typescript
interface Speaker {
  id: string;              // Unique identifier
  code: string;           // Single letter code (א, ב, A, B, etc.)
  name: string;           // Full speaker name
  color: string;          // Hex color for visual identification
  colorIndex: number;     // Index in color palette
  timestamp?: number;     // First appearance time
  blockCount: number;     // Number of text blocks
}

interface SpeakerMap {
  hebrewMap: Map<string, Speaker>;   // Hebrew letter → Speaker
  englishMap: Map<string, Speaker>;  // English letter → Speaker
  nameMap: Map<string, Speaker>;     // Name → Speaker
}
```

## Speaker Code System

### Hebrew Letter Mapping
```typescript
const hebrewCodes = [
  'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י',
  'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ', 'ק', 'ר', 'ש', 'ת'
];

// Default naming pattern
hebrewSpeakers = {
  'א': 'דובר 1',
  'ב': 'דובר 2',
  'ג': 'דובר 3',
  // ... etc
}
```

### English Letter Mapping
```typescript
const englishCodes = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
  'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
  'U', 'V', 'W', 'X', 'Y', 'Z'
];

// Default naming pattern
englishSpeakers = {
  'A': 'Speaker A',
  'B': 'Speaker B', 
  'C': 'Speaker C',
  // ... etc
}
```

### Mixed Mode Support
- Can use both Hebrew and English codes in same document
- Maintains separate namespaces (א ≠ A)
- Automatic detection based on character type

## Color Management

### Color Palette
```typescript
const colorPalette = [
  '#667eea',  // Purple
  '#10b981',  // Green
  '#f59e0b',  // Amber
  '#ef4444',  // Red
  '#3b82f6',  // Blue
  '#ec4899',  // Pink
  '#22c55e',  // Emerald
  '#a855f7',  // Violet
];
```

### Color Assignment Rules
1. First speaker gets first color
2. Sequential assignment for new speakers
3. Cycles back to beginning after 8 speakers
4. Color persists throughout session
5. Consistent between TextEditor and Speaker panel

## Component Structure

### Main Speaker Panel
```tsx
interface SpeakerPanelProps {
  speakers: Speaker[];
  activeSpeaker?: string;
  onSpeakerSelect: (speaker: Speaker) => void;
  onSpeakerEdit: (id: string, name: string) => void;
  onSpeakerAdd: (code: string) => void;
  theme: 'transcription' | 'proofreading';
}
```

### Speaker List Item
```tsx
interface SpeakerItemProps {
  speaker: Speaker;
  isActive: boolean;
  onClick: () => void;
  onEdit: (name: string) => void;
}
```

## Event Communication

### Speaker Request Event
Triggered when TAB is pressed after a single letter:
```javascript
// Listen for speaker requests from TextEditor
document.addEventListener('speakerTabRequest', (event) => {
  const { code, callback } = event.detail;
  
  // Check if code exists
  const speaker = findSpeakerByCode(code);
  
  if (speaker) {
    callback(speaker.name);
  } else {
    // Create new speaker
    const newSpeaker = createSpeaker(code);
    callback(newSpeaker.name);
  }
});
```

### Speaker Update Events
```javascript
// Notify TextEditor of speaker changes
document.dispatchEvent(new CustomEvent('speakerUpdated', {
  detail: {
    code: 'א',
    name: 'דובר ראשי',
    color: '#667eea'
  }
}));

// Notify of color changes
document.dispatchEvent(new CustomEvent('speakerColorUpdated', {
  detail: {
    speaker: 'דובר 1',
    color: '#667eea',
    colorIndex: 0
  }
}));
```

## UI Components

### Speaker Panel Layout
```
┌─────────────────────────┐
│ רשימת דוברים           │
├─────────────────────────┤
│ [+] הוסף דובר חדש       │
├─────────────────────────┤
│ ● א - דובר 1 (5)        │
│ ● ב - דובר 2 (3)        │
│ ● A - Speaker A (2)     │
│ ● ג - דובר 3 (1)        │
└─────────────────────────┘
```

### Speaker Item Features
- **Code Display**: Shows shortcut letter
- **Name**: Editable speaker name
- **Color Indicator**: Colored dot matching text
- **Block Count**: Number of text blocks
- **Edit Mode**: Click to rename
- **Active State**: Highlight current speaker

## Functionality

### Add New Speaker
```typescript
function addNewSpeaker(code?: string): Speaker {
  // Auto-assign next available code if not provided
  const nextCode = code || getNextAvailableCode();
  
  // Generate default name
  const defaultName = generateDefaultName(nextCode);
  
  // Assign next color
  const colorIndex = speakers.length % colorPalette.length;
  const color = colorPalette[colorIndex];
  
  // Create speaker object
  const speaker: Speaker = {
    id: generateId(),
    code: nextCode,
    name: defaultName,
    color,
    colorIndex,
    blockCount: 0
  };
  
  // Add to maps
  updateSpeakerMaps(speaker);
  
  return speaker;
}
```

### Edit Speaker Name
```typescript
function editSpeakerName(id: string, newName: string): void {
  const speaker = speakers.find(s => s.id === id);
  if (!speaker) return;
  
  // Update name
  speaker.name = newName;
  
  // Notify TextEditor
  document.dispatchEvent(new CustomEvent('speakerUpdated', {
    detail: { 
      code: speaker.code, 
      name: newName,
      color: speaker.color
    }
  }));
  
  // Update all blocks with this speaker
  updateBlocksWithSpeaker(speaker.code, newName);
}
```

### Find Speaker by Code
```typescript
function findSpeakerByCode(code: string): Speaker | null {
  // Check if Hebrew
  if (isHebrewLetter(code)) {
    return hebrewMap.get(code) || null;
  }
  
  // Check if English
  if (isEnglishLetter(code)) {
    return englishMap.get(code.toUpperCase()) || null;
  }
  
  return null;
}
```

## Styling

### Component Styles
```css
.speaker-panel {
  width: 250px;
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.speaker-item {
  display: flex;
  align-items: center;
  padding: 8px;
  margin: 4px 0;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.speaker-item:hover {
  background: #f3f4f6;
}

.speaker-item.active {
  background: #e0f2fe;
  border-left: 3px solid #0ea5e9;
}

.speaker-color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 8px;
}

.speaker-code {
  font-weight: bold;
  margin-right: 8px;
  color: #6b7280;
}

.speaker-name {
  flex: 1;
  font-weight: 500;
}

.speaker-count {
  color: #9ca3af;
  font-size: 12px;
}
```

## Integration with TextEditor

### Communication Flow
```
User Types Letter → TAB
        ↓
TextEditor detects pattern
        ↓
Dispatches 'speakerTabRequest'
        ↓
Speaker Component receives
        ↓
Checks existing speakers
        ↓
Returns name or creates new
        ↓
TextEditor replaces text
        ↓
Both components update colors
```

### Synchronization Points
1. **On TAB transformation**: Get/create speaker
2. **On speaker edit**: Update all blocks
3. **On color change**: Sync visual indicators
4. **On new block**: Update block count
5. **On speaker delete**: Handle orphaned blocks

## Advanced Features

### Speaker Statistics
```typescript
interface SpeakerStats {
  totalBlocks: number;
  totalWords: number;
  totalCharacters: number;
  firstAppearance: number;
  lastAppearance: number;
  averageBlockLength: number;
}
```

### Import/Export
```typescript
// Export speakers to JSON
function exportSpeakers(): string {
  return JSON.stringify(speakers.map(s => ({
    code: s.code,
    name: s.name,
    color: s.color
  })));
}

// Import speakers from JSON
function importSpeakers(json: string): void {
  const imported = JSON.parse(json);
  imported.forEach(s => addNewSpeaker(s.code, s.name));
}
```

### Keyboard Shortcuts
- **Ctrl+Shift+S**: Open speaker panel
- **Ctrl+N**: Add new speaker
- **F2**: Edit selected speaker
- **Delete**: Remove speaker (with confirmation)

## Implementation Checklist

- [ ] Create Speaker component folder structure
- [ ] Implement dual-language code system
- [ ] Set up color management
- [ ] Create speaker panel UI
- [ ] Implement add/edit/delete functions
- [ ] Set up event communication
- [ ] Add statistics tracking
- [ ] Implement import/export
- [ ] Add keyboard shortcuts
- [ ] Write unit tests
- [ ] Add accessibility features
- [ ] Create documentation

## Testing Scenarios

1. **Hebrew speaker creation**: Type א + TAB
2. **English speaker creation**: Type A + TAB
3. **Mixed document**: Use both Hebrew and English
4. **Color cycling**: Add 10+ speakers
5. **Name editing**: Rename speakers
6. **Block counting**: Track usage
7. **Event synchronization**: Verify updates
8. **Import/Export**: Save and load speakers