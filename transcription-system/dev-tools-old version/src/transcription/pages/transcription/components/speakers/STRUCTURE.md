# Speakers Component Structure

## Component Organization
```
speakers/
├── index.php                    # Main component entry
├── STRUCTURE.md                # This file
├── FUNCTIONS.md               # Functions documentation
├── core/
│   ├── speakers-manager.js     # Core speaker logic
│   ├── speakers-store.js       # Speaker data storage
│   └── color-manager.js        # Color assignment
├── ui/
│   ├── speakers-panel.php      # Main panel UI
│   ├── speaker-item.js         # Individual speaker
│   ├── speaker-form.js         # Add/edit form
│   └── speakers-ui.js          # UI interactions
├── features/
│   ├── quick-assign.js         # Quick assignment
│   ├── color-picker.js         # Color selection
│   └── speaker-search.js       # Search speakers
├── toolbar/
│   ├── speakers-toolbar.php    # Toolbar integration
│   └── toolbar-buttons.js      # Quick actions
├── messages/
│   ├── speaker-messages.js     # Status messages
│   └── message-styles.css      # Message styling
└── styles/
    ├── speakers-main.css       # Main styles
    └── speaker-colors.css      # Color schemes
```

## Current Files to Reorganize
- `js/speakers-manager.js` → `core/speakers-manager.js`
- `js/speakers-ui.js` → `ui/speakers-ui.js`
- `js/speakers-blocks.js` → Integration with text-editor
- `js/speakers-init.js` → `core/speakers-init.js`

## Component Dependencies
1. **External Dependencies**
   - Text Editor (for block assignment)
   - Toolbar (for quick actions)

2. **Internal Dependencies**
   - Color manager for consistent colors
   - Storage for persistence

## Data Structure
```javascript
{
  speakers: [
    {
      id: 'speaker-1',
      name: 'דובר 1',
      color: '#FF5733',
      shortcut: '1',
      blocksCount: 15,
      isActive: true
    }
  ],
  settings: {
    maxSpeakers: 10,
    defaultColors: ['#FF5733', '#33FF57', ...],
    autoAssign: true
  }
}
```

## Integration Points
- **Input**: Initial speaker list
- **Output**: Speaker assignments
- **Events**:
  - `speakers:added`
  - `speakers:removed`
  - `speakers:updated`
  - `speakers:assigned`