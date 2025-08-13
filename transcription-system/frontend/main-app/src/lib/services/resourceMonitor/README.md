# Resource Monitor Service

## Overview
The Resource Monitor Service prevents application crashes by checking system resources before memory-intensive operations.

## Quick Start

### Basic Usage
```typescript
import { resourceMonitor, OperationType } from '@/lib/services/resourceMonitor';

// Check before operation
const safe = await resourceMonitor.checkOperation(OperationType.WAVEFORM, fileSize);

if (!safe.safe) {
  console.warn(safe.message);
  // Show warning to user or use alternative method
  return;
}

// Proceed with operation
processWaveform();
```

### With React Hook
```typescript
import { useResourceCheck } from '@/hooks/useResourceCheck';

function MyComponent() {
  const { checkOperation, showWarning } = useResourceCheck();
  
  const handleLargeFile = async (file: File) => {
    const result = await checkOperation(OperationType.FILE_UPLOAD, file.size);
    
    if (!result.safe) {
      showWarning(result);
      return;
    }
    
    // Safe to proceed
    await uploadFile(file);
  };
}
```

## API Reference

### Main Methods

#### `checkOperation(type, size)`
Check if an operation is safe to proceed.

**Parameters:**
- `type: OperationType` - Type of operation
- `size: number` - Estimated size in bytes

**Returns:** `Promise<SafetyCheck>`
- `safe: boolean` - Whether safe to proceed
- `reason?: SafetyReason` - Why it's not safe
- `recommendation: Recommendation` - What to do
- `alternativeMethod?: string` - Alternative approach
- `message: string` - English message
- `messageHebrew: string` - Hebrew message

#### `getStatus()`
Get current resource status.

**Returns:** `Promise<ResourceStatus>`
- Memory, CPU, and storage information
- System flags (isLowMemory, isHighCPU, etc.)

#### `startMonitoring(callback, options?)`
Start continuous resource monitoring.

**Parameters:**
- `callback: (status) => void` - Called with updates
- `options?: { interval: number }` - Update interval (ms)

#### `stopMonitoring()`
Stop continuous monitoring.

## Operation Types

### Media Operations
- `WAVEFORM` - Waveform generation (3x file size)
- `VIDEO_PROCESS` - Video processing (5x file size)
- `AUDIO_PROCESS` - Audio processing (2x file size)

### File Operations
- `FILE_UPLOAD` - File upload (1.5x file size)
- `FILE_DOWNLOAD` - File download (1.2x file size)
- `FILE_PROCESS` - Generic processing (2x file size)

### Data Operations
- `DATA_IMPORT` - Data import (2x data size)
- `DATA_EXPORT` - Data export (1.5x data size)
- `REPORT_GENERATION` - Report generation (2.5x data size)

### AI Operations
- `AI_PROCESSING` - AI model processing (4x input size)
- `TRANSCRIPTION` - Audio transcription (3x file size)

## Recommendations

The service returns these recommendations:
- `PROCEED` - Safe to continue
- `PROCEED_WITH_CAUTION` - Can continue but may be slow
- `WAIT` - System busy, try later
- `USE_ALTERNATIVE` - Use alternative method
- `USE_CHUNKED` - Process in chunks
- `USE_SERVER` - Use server-side processing
- `CLOSE_OTHER_APPS` - Free up memory
- `ABORT` - Do not proceed

## Resource Thresholds

### Critical (Operations Blocked)
- Memory: < 100MB
- CPU: > 95%
- Storage: < 500MB

### Warning (User Warned)
- Memory: < 500MB
- CPU: > 80%
- Storage: < 1GB

### Safe (No Restrictions)
- Memory: > 1GB
- CPU: < 60%
- Storage: > 2GB

## Examples

### Waveform Generation
```typescript
const checkWaveform = async (audioUrl: string, fileSize: number) => {
  const result = await resourceMonitor.checkOperation(
    OperationType.WAVEFORM,
    fileSize
  );
  
  if (!result.safe) {
    if (result.recommendation === Recommendation.USE_SERVER) {
      // Use server-side waveform generation
      return generateWaveformOnServer(audioUrl);
    } else {
      // Show warning and abort
      alert(result.messageHebrew);
      return null;
    }
  }
  
  // Safe to generate client-side
  return generateWaveformLocally(audioUrl);
};
```

### File Upload with Progress
```typescript
const uploadWithMonitoring = async (file: File) => {
  // Start monitoring
  resourceMonitor.startMonitoring((status) => {
    if (status.isLowMemory) {
      console.warn('Low memory during upload');
    }
  });
  
  try {
    // Check before upload
    const safe = await resourceMonitor.checkOperation(
      OperationType.FILE_UPLOAD,
      file.size
    );
    
    if (!safe.safe) {
      throw new Error(safe.message);
    }
    
    // Log operation start
    const startMem = (await resourceMonitor.getStatus()).memoryUsed;
    const startTime = Date.now();
    
    // Upload file
    await uploadFile(file);
    
    // Log operation complete
    resourceMonitor.logOperation({
      type: OperationType.FILE_UPLOAD,
      timestamp: startTime,
      fileSize: file.size,
      memoryBefore: startMem,
      memoryAfter: (await resourceMonitor.getStatus()).memoryUsed,
      duration: Date.now() - startTime,
      success: true
    });
  } finally {
    // Stop monitoring
    resourceMonitor.stopMonitoring();
  }
};
```

### Continuous Monitoring
```typescript
// In app initialization
resourceMonitor.startMonitoring((status) => {
  // Update UI indicator
  updateResourceIndicator({
    memory: status.memoryPercent,
    cpu: status.cpuUsage,
    lowMemory: status.isLowMemory,
    highCPU: status.isHighCPU
  });
  
  // Warn if critical
  if (status.memoryAvailable < 50 * 1024 * 1024) {
    showCriticalWarning('Very low memory!');
  }
}, { interval: 5000 }); // Check every 5 seconds
```

## Browser Compatibility

### Full Support (Chrome/Edge)
- Memory API available
- Accurate memory measurements
- Storage quota API

### Partial Support (Firefox/Safari)
- No Memory API
- Uses conservative estimates
- Storage API available

### Fallback Strategy
```typescript
// Service automatically handles missing APIs
const status = await resourceMonitor.getStatus();
// Will use estimates if Memory API unavailable
```

## Testing

### Mock for Testing
```typescript
// In test setup
jest.mock('@/lib/services/resourceMonitor', () => ({
  resourceMonitor: {
    checkOperation: jest.fn().mockResolvedValue({
      safe: true,
      recommendation: 'proceed',
      message: 'Safe to proceed'
    }),
    getStatus: jest.fn().mockResolvedValue({
      memoryAvailable: 1024 * 1024 * 1024, // 1GB
      cpuUsage: 30,
      isLowMemory: false
    })
  }
}));
```

## Performance

- Memory check: < 1ms
- CPU check: < 5ms
- Storage check: < 10ms (async)
- Total overhead: < 0.1% CPU
- Cache duration: 5 seconds

## Best Practices

1. **Always check before heavy operations**
   ```typescript
   // Good
   const safe = await resourceMonitor.checkOperation(type, size);
   if (!safe.safe) return;
   
   // Bad
   processLargeFile(); // No check
   ```

2. **Use appropriate operation types**
   ```typescript
   // Good - specific type
   checkOperation(OperationType.WAVEFORM, size);
   
   // Less good - generic type
   checkOperation(OperationType.HEAVY_OPERATION, size);
   ```

3. **Handle recommendations**
   ```typescript
   if (!result.safe) {
     switch (result.recommendation) {
       case Recommendation.USE_ALTERNATIVE:
         useAlternativeMethod();
         break;
       case Recommendation.WAIT:
         setTimeout(() => retry(), 5000);
         break;
       default:
         showError(result.message);
     }
   }
   ```

4. **Log operations for metrics**
   ```typescript
   resourceMonitor.logOperation({
     type: OperationType.DATA_IMPORT,
     fileSize: data.length,
     memoryBefore,
     memoryAfter,
     duration,
     success
   });
   ```

## Troubleshooting

### "Memory API not available"
- Normal in Firefox/Safari
- Service uses conservative estimates
- Still provides protection

### False positives (blocking safe operations)
- Adjust thresholds in development
- Check if other apps using memory
- Clear browser cache

### Operations still crashing
- Check operation cost multipliers
- Increase safety factors
- Consider server-side processing