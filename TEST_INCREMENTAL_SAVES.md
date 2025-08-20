# Testing Guide - Virtual Scrolling & Incremental Saves

## Quick Test Steps

### 1. Test Virtual Scrolling (Already Working)
- Import the 600-block test file you already have
- Verify Hebrew RTL works correctly
- Check smooth scrolling without scrollbar
- See "סוף המסמך" at the bottom

### 2. Test Incremental Saves

#### A. Initial Setup
1. Open browser DevTools Console (F12)
2. Filter console by "[Project]" or "[IncrementalBackup]"
3. Create or load a project

#### B. Test Change Tracking
1. **Add new blocks** (press Enter a few times)
   - Console should show: `[IncrementalBackup] Block created: [id]`

2. **Edit text in blocks**
   - Type some text
   - Console should show: `[IncrementalBackup] Block updated: [id].text`

3. **Change speaker names**
   - Type speaker codes and press TAB
   - Console should show: `[IncrementalBackup] Block updated: [id].speaker`

4. **Delete blocks** (Backspace at start of block)
   - Console should show: `[IncrementalBackup] Block deleted: [id]`

#### C. Test Save Behavior
1. **Wait for auto-save** (1 minute) or **press Ctrl+S**
2. Look for console output:
```
[Project] Save metrics: {
  type: "Incremental",  // or "Full"
  changes: "5 added, 3 modified, 1 deleted",
  totalBlocks: 45,
  modifiedBlocks: 9
}
```

#### D. Test Full Backup Triggers
1. **Make 100+ changes** (copy-paste many blocks)
2. On save, should see: `type: "Full"` and message:
   - `[IncrementalBackup] Full backup needed: too many changes`

### 3. Verification Tests

#### Test 1: Small Edit Performance
```javascript
// In console, check before editing:
console.time('save');
// Make 1 small edit and save (Ctrl+S)
// After save completes:
console.timeEnd('save');
// Should be < 500ms
```

#### Test 2: Check Change Detection
1. Type "test" in a block
2. Delete "test" from same block  
3. Console should show: `[IncrementalBackup] Block [id] reverted to original`
4. Save should show: `modifiedBlocks: 0`

#### Test 3: Hebrew RTL in Virtual Mode
1. Load document with 30+ blocks (triggers virtual scrolling)
2. Type Hebrew text: "שלום עולם"
3. Should display right-to-left correctly
4. Navigate with arrow keys between blocks

### 4. Complete Feature Test Checklist

✅ **Virtual Scrolling (30+ blocks)**
- [ ] Smooth scrolling without jumps
- [ ] No visible scrollbar
- [ ] Hebrew RTL works correctly
- [ ] Search jumps to off-screen blocks
- [ ] Ctrl+A selects visible blocks
- [ ] Navigation with arrow keys works

✅ **Incremental Saves**
- [ ] Console shows change tracking
- [ ] Small edits = "Incremental" save
- [ ] 100+ changes = "Full" save  
- [ ] Revert detection works
- [ ] Save metrics show correct counts

✅ **Integration**
- [ ] Both features work together
- [ ] No performance degradation
- [ ] All existing features still work:
  - [ ] Speaker management (TAB transform)
  - [ ] Timestamps (F8)
  - [ ] Search & Replace
  - [ ] Export to Word
  - [ ] Copy/Paste blocks

## Expected Console Output Examples

### Good - Incremental Save:
```
[IncrementalBackup] Block updated: block-123.text
[Project] Save metrics: {
  type: "Incremental",
  changes: "0 added, 1 modified, 0 deleted",
  totalBlocks: 600,
  modifiedBlocks: 1
}
[Project] Incremental changes: {
  created: 0,
  updated: 1,
  deleted: 0
}
```

### Good - Full Backup (first save):
```
[IncrementalBackup] Initialized with 600 blocks, version 0
[Project] Save metrics: {
  type: "Full",
  changes: "0 added, 600 modified, 0 deleted",
  totalBlocks: 600,
  modifiedBlocks: 600
}
```

### Good - Mixed Changes:
```
[IncrementalBackup] Block created: block-789
[IncrementalBackup] Block updated: block-456.speaker
[IncrementalBackup] Block deleted: block-123
[Project] Save metrics: {
  type: "Incremental",
  changes: "1 added, 1 modified, 1 deleted",
  totalBlocks: 598,
  modifiedBlocks: 3
}
```

## Troubleshooting

**Issue: No console output**
- Make sure DevTools Console is open
- Clear filter or search for "Incremental" or "Project"
- Refresh page and try again

**Issue: Always shows "Full" backup**
- Normal for first save after loading
- Check if you have 100+ unsaved changes
- Check if it's been >1 hour since last full backup

**Issue: Changes not tracked**
- Make sure you're actually modifying content
- Typing and deleting same text = no change
- Check console for error messages

## Quick Performance Test

In console, paste and run:
```javascript
// Check if incremental tracking is working
if (typeof incrementalBackupService !== 'undefined') {
  const metrics = incrementalBackupService.getMetrics();
  console.log('Incremental Save Status:', {
    hasChanges: incrementalBackupService.hasChanges(),
    ...metrics,
    changeSummary: incrementalBackupService.getChangeSummary()
  });
} else {
  console.log('Incremental backup service not loaded');
}
```

This will show current tracking status without saving.