# Text Editor Functions

## Core Functions

### Initialization
- `initializeEditor()` - Set up editor instance
- `loadContent(data)` - Load existing transcription
- `setupBlockSystem()` - Initialize block structure
- `bindEvents()` - Attach event listeners

### Block Management
- `createBlock(type, data)` - Create new block
- `deleteBlock(blockId)` - Remove block
- `updateBlock(blockId, data)` - Update block content
- `moveBlock(blockId, direction)` - Reorder blocks
- `mergeBlocks(block1, block2)` - Combine blocks
- `splitBlock(blockId, position)` - Split at cursor

### Text Editing
- `insertText(text)` - Insert at cursor
- `deleteSelection()` - Delete selected text
- `replaceText(find, replace)` - Find and replace
- `getCurrentBlock()` - Get active block
- `setBlockContent(blockId, content)` - Set block text

### Speaker Functions
- `assignSpeaker(blockId, speakerId)` - Assign speaker
- `createSpeakerBlock(speakerId)` - New speaker block
- `updateSpeakerColor(blockId, color)` - Change color
- `quickSpeakerAssign(key)` - Keyboard assignment

### Timestamp Functions
- `insertTimestamp()` - Insert current time
- `updateTimestamp(blockId)` - Update block time
- `syncWithMedia()` - Sync with player time
- `jumpToTimestamp(time)` - Navigate to time

### Formatting Functions
- `toggleBold()` - Bold text
- `toggleItalic()` - Italic text
- `toggleUnderline()` - Underline text
- `setFontSize(size)` - Change font size
- `setFontFamily(font)` - Change font
- `setTextAlign(align)` - Align text
- `applyStyle(style)` - Apply custom style

### Auto-Correction
- `enableAutoCorrect()` - Turn on auto-correct
- `addCorrection(wrong, right)` - Add rule
- `applyCorrections(text)` - Fix text
- `loadCorrectionDictionary()` - Load rules

### Navigation
- `moveToBlock(blockId)` - Jump to block
- `moveToNextBlock()` - Next block
- `moveToPrevBlock()` - Previous block
- `moveToStart()` - Document start
- `moveToEnd()` - Document end

### Selection Management
- `selectAll()` - Select all content
- `selectBlock(blockId)` - Select block
- `getSelection()` - Get selected text
- `clearSelection()` - Clear selection
- `expandSelection(direction)` - Expand selection

### Undo/Redo
- `undo()` - Undo last action
- `redo()` - Redo action
- `saveState()` - Save for undo
- `clearHistory()` - Clear undo stack

### Save/Export
- `saveContent()` - Save to database
- `exportAsText()` - Plain text export
- `exportAsHTML()` - HTML export
- `getEditorData()` - Get all data
- `autoSave()` - Periodic save

### RTL Support
- `toggleRTL()` - Switch RTL/LTR
- `detectTextDirection()` - Auto-detect
- `applyRTLStyles()` - Apply RTL styles
- `handleRTLCursor()` - RTL cursor logic

### Keyboard Shortcuts
- `registerShortcut(key, action)` - Add shortcut
- `handleKeyDown(event)` - Process key
- `showShortcutsModal()` - Show help
- `customizeShortcuts()` - User config

### Utility Functions
- `getWordCount()` - Count words
- `getCharCount()` - Count characters
- `getBlockCount()` - Count blocks
- `findInEditor(query)` - Search text
- `scrollToBlock(blockId)` - Scroll to block

## Event Handlers
- `onChange()` - Content change
- `onBlockCreate()` - Block created
- `onBlockDelete()` - Block deleted
- `onSelectionChange()` - Selection change
- `onSave()` - Save triggered
- `onKeyDown()` - Key pressed

## Message Functions
- `showStatus(message)` - Status message
- `showError(error)` - Error message
- `showSaveStatus()` - Save indicator
- `showWordCount()` - Word count display