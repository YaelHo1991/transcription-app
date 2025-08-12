# Text Editor Component Structure

## Component Organization
```
text-editor/
├── index.php                      # Main component entry
├── editor.php                     # Current implementation
├── STRUCTURE.md                   # This file
├── FUNCTIONS.md                   # Functions documentation
├── core/
│   ├── text-editor-core.js        # Core editor logic
│   ├── text-editor-blocks.js      # Block system
│   ├── text-editor-rtl.js         # RTL support
│   ├── selection-manager.js       # Text selection
│   └── cursor-manager.js          # Cursor position
├── blocks/
│   ├── speaker-block.js           # Speaker blocks
│   ├── timestamp-block.js         # Timestamp blocks
│   ├── paragraph-block.js         # Text blocks
│   └── block-styles.css           # Block styling
├── toolbar/
│   ├── formatting/                # Text formatting tools
│   │   ├── bold-italic.js
│   │   ├── font-controls.js
│   │   ├── text-align.js
│   │   └── undo-redo.js
│   ├── transcription-tools/       # Transcription specific
│   │   ├── timestamp-insert.js
│   │   ├── speaker-shortcuts.js
│   │   ├── auto-corrections.js
│   │   └── navigation-mode.js
│   └── toolbar.css                # Toolbar styling
├── features/
│   ├── auto-corrections/          # Auto-correction system
│   ├── spell-check/               # Spell checking
│   ├── shortcuts/                 # Keyboard shortcuts
│   └── speaker-integration/       # Speaker system link
├── messages/
│   ├── editor-messages.js         # Status messages
│   └── message-styles.css         # Message styling
└── styles/
    ├── editor-base.css            # Base editor styles
    ├── editor-rtl.css             # RTL specific styles
    └── editor-blocks.css          # Block styles
```

## Current Files to Reorganize
- `editor.js` → Split into core modules
- `text-editor-consolidated.php` → Merge with editor.php
- `js/*` → Organize into appropriate folders
- Auto-detect JS files → Move to features/auto-detect/

## Component Dependencies
1. **External Dependencies**
   - Media Player (for timestamps)
   - Speakers Component (for speaker data)

2. **Internal Dependencies**
   - Block system for content structure
   - Toolbar for formatting
   - Shortcuts manager

## Data Structure
```javascript
{
  blocks: [
    {
      id: 'block-1',
      type: 'speaker',
      speaker: 'speaker-1',
      color: '#FF5733'
    },
    {
      id: 'block-2',  
      type: 'paragraph',
      content: 'Transcribed text here...',
      timestamp: '00:01:23'
    }
  ],
  settings: {
    rtl: true,
    autoCorrect: true,
    blockMode: true
  }
}
```

## Integration Points
- **Input**: Initial content, speaker list
- **Output**: Formatted transcription data
- **Events**:
  - `editor:contentChanged`
  - `editor:blockAdded`
  - `editor:speakerChanged`
  - `editor:save`