# Speakers Component Functions

## Core Functions

### Initialization
- `initializeSpeakers()` - Set up component
- `loadSpeakers()` - Load from storage
- `setupDefaultSpeakers()` - Create defaults
- `bindSpeakerEvents()` - Attach listeners

### Speaker Management
- `addSpeaker(name, color)` - Add new speaker
- `removeSpeaker(speakerId)` - Delete speaker
- `updateSpeaker(id, data)` - Update details
- `getSpeaker(speakerId)` - Get speaker data
- `getAllSpeakers()` - Get all speakers
- `clearAllSpeakers()` - Remove all

### Color Management
- `assignColor(speakerId)` - Auto-assign color
- `updateColor(id, color)` - Change color
- `getNextColor()` - Get next available
- `isColorUsed(color)` - Check if taken
- `resetColors()` - Reset to defaults

### Quick Assignment
- `assignShortcut(id, key)` - Set keyboard key
- `removeShortcut(speakerId)` - Remove key
- `handleQuickAssign(key)` - Process keypress
- `getShortcuts()` - Get all shortcuts

### UI Functions
- `renderSpeakersList()` - Display speakers
- `showAddSpeakerForm()` - Show add form
- `hideAddSpeakerForm()` - Hide form
- `highlightSpeaker(id)` - Highlight item
- `updateSpeakerCount(id, count)` - Update usage

### Integration Functions
- `assignToBlock(blockId, speakerId)` - Assign to text
- `getBlocksBySpeaker(speakerId)` - Get blocks
- `reassignBlocks(oldId, newId)` - Bulk reassign
- `syncWithEditor()` - Sync with editor

### Search Functions
- `searchSpeakers(query)` - Search by name
- `filterActive()` - Show active only
- `sortSpeakers(criteria)` - Sort list
- `findSpeakerByName(name)` - Find exact

### Statistics
- `getSpeakerStats(speakerId)` - Usage stats
- `getTotalBlocks(speakerId)` - Block count
- `getActiveTime(speakerId)` - Speaking time
- `generateReport()` - Usage report

### Import/Export
- `exportSpeakers()` - Export list
- `importSpeakers(data)` - Import list
- `mergeSpeakers(data)` - Merge lists
- `validateImport(data)` - Check format

### Storage Functions
- `saveSpeakers()` - Save to storage
- `loadFromStorage()` - Load saved
- `clearStorage()` - Clear saved
- `backupSpeakers()` - Create backup

### Validation
- `validateName(name)` - Check name
- `validateColor(color)` - Check color
- `checkDuplicate(name)` - Check exists
- `canAddSpeaker()` - Check limit

### Event Handlers
- `onSpeakerAdd()` - Handle add
- `onSpeakerRemove()` - Handle remove
- `onSpeakerUpdate()` - Handle update
- `onColorChange()` - Handle color
- `onShortcutPress()` - Handle key

### UI State
- `showLoading()` - Show loading
- `hideLoading()` - Hide loading
- `enableForm()` - Enable inputs
- `disableForm()` - Disable inputs
- `resetForm()` - Clear form

### Toolbar Functions
- `addToToolbar()` - Add to toolbar
- `updateToolbar()` - Update buttons
- `createQuickButtons()` - Quick assigns
- `syncToolbarState()` - Sync state

## Keyboard Shortcuts
- `1-9` - Quick assign speakers
- `Ctrl+Shift+S` - Show speakers panel
- `Ctrl+Shift+A` - Add new speaker
- `Delete` - Remove selected speaker

## Message Functions
- `showSuccess(message)` - Success message
- `showError(message)` - Error message
- `showInfo(message)` - Info message
- `clearMessages()` - Clear messages