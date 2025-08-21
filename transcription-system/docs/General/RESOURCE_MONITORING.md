# Resource Monitoring System Architecture

## Overview

The Resource Monitoring System is a comprehensive, system-wide service that prevents application crashes by monitoring available resources before executing memory-intensive operations. It provides intelligent fallbacks, user warnings, and automatic optimization strategies.

## Problem Statement

Modern web applications can crash browsers when processing large files or performing memory-intensive operations. This is especially critical in transcription systems dealing with:
- Large media files (4GB+ videos)
- Waveform generation requiring 3x file size in memory
- Multiple concurrent operations
- Users with varying hardware capabilities

## Architecture Principles

### 1. Prevention Over Recovery
- Check resources BEFORE operations, not during
- Block dangerous operations proactively
- Provide clear user feedback

### 2. Progressive Enhancement
- System works without monitoring (graceful degradation)
- Enhanced experience with monitoring enabled
- Automatic fallbacks for limited resources

### 3. Universal Integration
- Single service for entire application
- Consistent thresholds across components
- Simple 2-line integration for new features

## System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│  Media Player │ CRM System │ Transcription │ Future Components │
└───────┬───────┴──────┬──────┴──────┬────────┴───────┬─────────┘
        │              │             │                │
        └──────────────┴─────────────┴────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Resource Monitor   │
                    │     (Core Service)  │
                    └─────────┬──────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼─────┐        ┌─────▼──────┐      ┌──────▼──────┐
   │  Memory  │        │    CPU      │      │   Storage   │
   │  Monitor │        │   Monitor   │      │   Monitor   │
   └──────────┘        └────────────┘       └─────────────┘
```

## Core Service API

### Client-Side (Frontend)

```typescript
interface ResourceMonitor {
  // Check if operation is safe
  checkOperation(type: OperationType, estimatedSize: number): Promise<SafetyCheck>;
  
  // Get current resource status
  getStatus(): ResourceStatus;
  
  // Monitor resources continuously
  startMonitoring(callback: (status: ResourceStatus) => void): void;
  
  // Clean up monitoring
  stopMonitoring(): void;
}

interface SafetyCheck {
  safe: boolean;
  reason?: 'insufficient-memory' | 'high-cpu' | 'low-storage';
  recommendation?: 'proceed' | 'wait' | 'use-alternative' | 'abort';
  alternativeMethod?: string;
  estimatedMemoryNeeded: number;
  availableMemory: number;
}
```

### Server-Side (Backend)

```typescript
interface ServerResourceMonitor {
  // Check server resources
  checkServerCapacity(operation: string): Promise<ServerCapacity>;
  
  // Queue operation if resources low
  queueOperation(operation: Operation): Promise<QueuePosition>;
  
  // Get server load metrics
  getServerMetrics(): ServerMetrics;
}
```

## Operation Types & Memory Requirements

| Operation | Memory Formula | Safety Factor | Example (100MB file) |
|-----------|---------------|---------------|---------------------|
| Waveform Generation | 3x file size | 2x | Needs 600MB free |
| Video Processing | 5x file size | 2x | Needs 1GB free |
| Chunked Processing | 50MB per chunk | 1.5x | Needs 75MB free |
| File Upload | 1.5x file size | 1.5x | Needs 225MB free |
| Data Import | 2x data size | 2x | Needs 400MB free |
| Report Generation | Varies | 2x | Calculated dynamically |

## Resource Thresholds

### Critical Levels
- **Memory**: < 100MB available → Block all operations
- **CPU**: > 95% usage → Block new operations
- **Storage**: < 500MB free → Block file operations

### Warning Levels
- **Memory**: < 500MB available → Warn user
- **CPU**: > 80% usage → Suggest waiting
- **Storage**: < 1GB free → Warn about space

### Safe Levels
- **Memory**: > 1GB available → All operations allowed
- **CPU**: < 60% usage → Optimal performance
- **Storage**: > 2GB free → No restrictions

## Implementation Details

### 1. Memory Detection

#### Browser (Chrome/Edge)
```javascript
if ('memory' in performance) {
  const memory = performance.memory;
  const available = memory.jsHeapSizeLimit - memory.usedJSHeapSize;
}
```

#### Fallback Methods
- Estimate from user agent
- Use conservative defaults
- Progressive testing

### 2. CPU Monitoring

```javascript
// Hardware concurrency (CPU cores)
const cores = navigator.hardwareConcurrency || 4;

// Estimate load from main thread blocking
const measureCPUPressure = async () => {
  const start = performance.now();
  await new Promise(resolve => setTimeout(resolve, 0));
  const delay = performance.now() - start;
  return delay > 10 ? 'high' : 'normal';
};
```

### 3. Storage Monitoring

```javascript
// Storage quota API
if ('storage' in navigator && 'estimate' in navigator.storage) {
  const {usage, quota} = await navigator.storage.estimate();
  const available = quota - usage;
}
```

## Integration Patterns

### Simple Integration (2 lines)
```typescript
import { resourceMonitor } from '@/lib/services/resourceMonitor';

// Before any heavy operation
const safe = await resourceMonitor.checkOperation('waveform', fileSize);
if (!safe.safe) return;
```

### Advanced Integration (with UI)
```typescript
import { useResourceCheck } from '@/hooks/useResourceCheck';

function MyComponent() {
  const { checkOperation, showWarning } = useResourceCheck();
  
  const handleLargeOperation = async () => {
    const result = await checkOperation('import', dataSize);
    
    if (!result.safe) {
      showWarning({
        title: 'Insufficient Resources',
        message: result.message,
        alternatives: result.alternatives
      });
      return;
    }
    
    // Proceed with operation
  };
}
```

## Fallback Strategies

### Automatic Fallbacks by Component

#### Media Player
1. Try client-side waveform
2. Fall back to chunked processing
3. Fall back to server processing
4. Disable waveform (last resort)

#### File Upload
1. Try direct upload
2. Fall back to chunked upload
3. Fall back to background upload
4. Queue for later

#### Data Processing
1. Try in-memory processing
2. Fall back to streaming
3. Fall back to server processing
4. Break into smaller batches

## Performance Considerations

### Monitoring Overhead
- Memory check: < 1ms
- CPU check: < 5ms  
- Storage check: < 10ms
- Total overhead: < 0.1% CPU

### Caching Strategy
- Cache resource status for 5 seconds
- Invalidate on focus/blur events
- Force refresh before critical operations

### Background Monitoring
- Use Web Workers for continuous monitoring
- RequestIdleCallback for non-critical checks
- Throttle updates to max 1 per second

## Error Handling

### Graceful Degradation
```typescript
try {
  const resources = await resourceMonitor.getStatus();
  // Use actual resources
} catch (error) {
  // Fall back to conservative defaults
  const resources = {
    memoryAvailable: 100 * 1024 * 1024, // Assume 100MB
    cpuUsage: 50, // Assume 50% usage
    storageAvailable: 500 * 1024 * 1024 // Assume 500MB
  };
}
```

### User Communication
- Clear error messages in user's language
- Actionable suggestions
- Alternative options presented

## Security Considerations

1. **No Sensitive Data**: Never log actual file contents
2. **Rate Limiting**: Prevent resource check spam
3. **Sandboxing**: Operations run in isolated contexts
4. **Quotas**: Enforce per-user resource limits

## Testing Strategy

### Unit Tests
- Mock resource APIs
- Test threshold calculations
- Verify fallback logic

### Integration Tests
- Test with real files of various sizes
- Simulate low resource conditions
- Verify UI warnings appear

### Performance Tests
- Measure monitoring overhead
- Test with concurrent operations
- Verify no memory leaks

## Future Enhancements

### Phase 1 (Current)
- ✅ Basic resource monitoring
- ✅ Operation safety checks
- ✅ User warnings

### Phase 2 (Planned)
- [ ] Machine learning for better estimates
- [ ] Historical usage patterns
- [ ] Predictive warnings

### Phase 3 (Future)
- [ ] Cloud resource integration
- [ ] Distributed processing
- [ ] Advanced scheduling

## Migration Guide

### For Existing Components
```typescript
// Before (no protection)
const analyzeWaveform = async (file) => {
  const data = await processFile(file); // May crash
};

// After (with protection)
const analyzeWaveform = async (file) => {
  const safe = await resourceMonitor.checkOperation('waveform', file.size);
  if (!safe.safe) {
    showWarning(safe.recommendation);
    return;
  }
  const data = await processFile(file);
};
```

### For New Components
Simply import and use from day one - the service is already available.

## Monitoring Metrics

### Key Performance Indicators
- Crash prevention rate
- Operation success rate
- Fallback usage frequency
- User warning acceptance rate

### Logging
```typescript
resourceMonitor.logOperation({
  type: 'waveform',
  fileSize: 100MB,
  memoryBefore: 500MB,
  memoryAfter: 200MB,
  duration: 5000ms,
  success: true
});
```

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Memory API | ✅ | ❌ | ❌ | ✅ |
| Storage API | ✅ | ✅ | ✅ | ✅ |
| Performance API | ✅ | ✅ | ✅ | ✅ |
| Web Workers | ✅ | ✅ | ✅ | ✅ |

Fallbacks ensure functionality in all browsers.

## Conclusion

The Resource Monitoring System provides a robust, scalable solution for preventing application crashes while maintaining excellent user experience. Its modular design allows easy integration with current and future components, making it a critical infrastructure service for the entire application.