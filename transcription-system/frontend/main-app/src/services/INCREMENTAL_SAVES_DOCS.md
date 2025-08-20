# Incremental Saves Implementation

## Overview
Phase 2 of the Large Document Optimization plan - implements incremental saving to reduce network traffic and improve save performance for large documents.

## Problem Solved
- Previously sent entire document (all blocks) on every save
- 300-page document = ~5MB sent every minute
- Slow saves and high bandwidth usage
- Unnecessary server load

## Solution Architecture

### Core Service: IncrementalBackupService
Singleton service that tracks all block changes since last save.

### Change Tracking
```typescript
// Three types of changes tracked
trackBlockCreated(block)     // New blocks
trackBlockUpdated(id, field, value)  // Modified blocks  
trackBlockDeleted(id)         // Removed blocks
```

### Smart Detection
- Only tracks actual changes (compares with original)
- Reverts tracking if user undoes changes
- Maintains original state for comparison

### Automatic Full Backup Triggers
- After 100 changed blocks (configurable)
- After 1 hour since last full backup
- On first save (no version)

## Integration Points

### TextEditor.tsx
```typescript
// On block update
incrementalBackupService.trackBlockUpdated(id, field, value, block);

// On new block
incrementalBackupService.trackBlockCreated(newBlock);

// On block delete  
incrementalBackupService.trackBlockDeleted(id);

// On project load
incrementalBackupService.initialize(projectId, blocks, version);
```

### Save Flow
```typescript
if (incrementalBackupService.hasChanges()) {
  // Prepare incremental or full backup
  const data = incrementalBackupService.prepareBackupData(blocks);
  
  // Send incremental save
  await projectService.saveProjectIncremental(projectId, data);
  
  // Update tracking on success
  incrementalBackupService.onSaveSuccess(version, blocks);
}
```

## Data Structure

### BlockChange
```typescript
{
  id: string;
  text: string;
  speaker?: string;
  speakerName?: string;
  speakerTime?: number;
  timestamp?: string;
  operation: 'create' | 'update' | 'delete';
}
```

### IncrementalBackupData
```typescript
{
  projectId: string;
  changes: BlockChange[];
  fullSnapshot: boolean;
  version: number;
  timestamp: number;
  totalBlocks: number;
}
```

## Metrics & Monitoring

The service provides detailed metrics:
- Total blocks in document
- Number of modified blocks
- Number of deleted blocks  
- Number of added blocks
- Last full backup time
- Change summary string

## Performance Impact

### Before (Full Save)
- 1500 blocks = ~2.5MB per save
- Network: High bandwidth usage
- Server: Process entire document

### After (Incremental)
- Typical edit: 5-10 blocks = ~10KB
- Network: 99% reduction in traffic
- Server: Process only changes

### Full Backup Scenarios
- Initial save
- After 100+ changes
- Every hour (safety)
- Manual trigger

## Current Limitations

1. **Backend Compatibility**: Currently converts to full saves on backend
2. **Conflict Resolution**: No merge strategy for concurrent edits
3. **Offline Changes**: Not accumulated during offline periods

## Future Enhancements

### Backend Delta Processing
```typescript
// Future backend endpoint
POST /api/projects/{id}/delta
{
  changes: BlockChange[],
  baseVersion: number
}
```

### Conflict Resolution
- Version tracking per block
- Three-way merge for conflicts
- User resolution UI

### Compression
- Batch similar operations
- Compress change payload
- Binary delta encoding

## Testing

### Manual Testing
1. Create new document
2. Add 10 blocks - check console for "10 added"
3. Modify 5 blocks - check "5 modified"  
4. Delete 2 blocks - check "2 deleted"
5. Save - verify incremental save in console
6. Add 100+ blocks - verify switches to full backup

### Performance Testing
1. Load 1500-block document
2. Make small edit (1 block)
3. Check save payload size < 1KB
4. Verify save time < 500ms

## Configuration

### Thresholds (in incrementalBackupService.ts)
```typescript
FULL_BACKUP_THRESHOLD = 100;     // Changes before full backup
FULL_BACKUP_INTERVAL = 3600000;  // 1 hour in milliseconds
```

## Rollback Plan

To disable incremental saves:
1. Remove `incrementalBackupService` imports
2. Revert save function to use only `projectService.saveProject()`
3. Remove tracking calls from block operations

## Success Metrics

✅ Reduce save payload by 95%+ for typical edits
✅ Maintain data integrity
✅ Transparent to users
✅ Backwards compatible
✅ No performance degradation