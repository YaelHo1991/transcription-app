# Waveform Architecture for Large File Support

## Problem Statement

The current waveform implementation loads entire audio files into browser memory for analysis, causing:
- Browser crashes with files > 200MB
- Memory overflow with compressed audio expanding to 2-3x size in PCM format
- Poor user experience with large transcription files (4GB+, 5+ hours)

## Solution Architecture

### File Size Thresholds & Processing Strategies

| File Size | Processing Method | Initial Load Time | Memory Usage | Location |
|-----------|------------------|-------------------|--------------|----------|
| < 50MB | Client-side (current) | 1-3 seconds | ~150MB | Browser |
| 50-200MB | Chunked client-side | 5-15 seconds | ~100MB/chunk | Browser |
| > 200MB | Server-side FFmpeg | 2-5 seconds | ~5MB | Backend |

### Processing Methods

#### 1. Small Files (< 50MB) - Client-Side Processing
```javascript
// Current implementation - works well for small files
- Fetch entire file
- Decode to PCM using Web Audio API
- Extract peaks in Web Worker
- Render on canvas
```

#### 2. Medium Files (50-200MB) - Chunked Client-Side
```javascript
// Process audio in chunks to avoid memory overflow
- Stream file in 10MB chunks
- Decode each chunk separately
- Merge peak data progressively
- Release chunk memory after processing
```

#### 3. Large Files (> 200MB) - Server-Side Generation
```javascript
// Backend processes file, frontend receives lightweight data
- Backend: FFmpeg extracts waveform
- Store peaks in database (compressed)
- Frontend: Fetch pre-generated peaks (~5KB per minute)
- Instant rendering, no client processing
```

## Backend Architecture

### FFmpeg Integration

```bash
# Generate waveform data from audio file
ffmpeg -i input.mp3 -filter_complex "showwavespic=s=1920x120:colors=white" -frames:v 1 output.png

# Alternative: Extract raw audio samples
ffmpeg -i input.mp3 -ac 1 -filter:a aresample=8000 -map 0:a -c:a pcm_s16le -f data output.dat
```

### Database Schema

```sql
-- Waveform storage table
CREATE TABLE waveforms (
  id SERIAL PRIMARY KEY,
  file_id VARCHAR(255) UNIQUE NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  duration FLOAT NOT NULL,
  sample_rate INTEGER DEFAULT 44100,
  peaks JSONB NOT NULL, -- Compressed peak data
  peak_count INTEGER NOT NULL,
  processing_time FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookups
CREATE INDEX idx_waveforms_file_id ON waveforms(file_id);
```

### REST API Endpoints

#### POST /api/waveform/generate
Generate waveform for a file
```javascript
Request:
{
  "fileId": "unique-file-id",
  "fileUrl": "https://example.com/audio.mp3",
  "fileSize": 213000000
}

Response:
{
  "status": "processing" | "completed" | "error",
  "waveformId": "waveform-123",
  "processingTime": 3.2,
  "peakCount": 1920
}
```

#### GET /api/waveform/:fileId
Retrieve waveform data
```javascript
Response:
{
  "fileId": "unique-file-id",
  "duration": 3600.5,
  "peaks": [0.1, 0.3, 0.5, ...], // Normalized values 0-1
  "peakCount": 1920,
  "cached": true
}
```

#### GET /api/waveform/:fileId/segment
Retrieve partial waveform (for progressive loading)
```javascript
Query params: ?start=0&end=500

Response:
{
  "segment": [0.1, 0.3, 0.5, ...],
  "startIndex": 0,
  "endIndex": 500,
  "totalPeaks": 1920
}
```

## Frontend Implementation

### Smart File Size Detection

```typescript
interface WaveformStrategy {
  method: 'client' | 'chunked' | 'server';
  threshold: number;
}

const getWaveformStrategy = (fileSize: number): WaveformStrategy => {
  if (fileSize < 50 * 1024 * 1024) { // < 50MB
    return { method: 'client', threshold: 50 };
  } else if (fileSize < 200 * 1024 * 1024) { // < 200MB
    return { method: 'chunked', threshold: 200 };
  } else { // >= 200MB
    return { method: 'server', threshold: Infinity };
  }
};
```

### Chunked Processing Implementation

```typescript
class ChunkedWaveformProcessor {
  private chunkSize = 10 * 1024 * 1024; // 10MB chunks
  
  async processLargeFile(file: File): Promise<WaveformData> {
    const chunks = Math.ceil(file.size / this.chunkSize);
    const allPeaks: number[] = [];
    
    for (let i = 0; i < chunks; i++) {
      const start = i * this.chunkSize;
      const end = Math.min(start + this.chunkSize, file.size);
      const chunk = file.slice(start, end);
      
      // Process chunk
      const chunkPeaks = await this.processChunk(chunk);
      allPeaks.push(...chunkPeaks);
      
      // Report progress
      this.onProgress((i + 1) / chunks * 100);
      
      // Allow browser to breathe
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    return { peaks: allPeaks, duration: 0 };
  }
}
```

## Performance Metrics

### Memory Usage Comparison

| File Size | Current Method | Chunked Method | Server Method |
|-----------|---------------|----------------|---------------|
| 50MB | 150MB RAM | 30MB RAM | 5MB RAM |
| 200MB | 600MB RAM (crash) | 30MB RAM | 5MB RAM |
| 1GB | Crash | 30MB RAM | 5MB RAM |
| 4GB | Crash | 30MB RAM | 5MB RAM |

### Processing Time

| File Size | Client-Side | Chunked | Server (First) | Server (Cached) |
|-----------|------------|---------|----------------|-----------------|
| 50MB | 3s | 5s | 8s | 0.5s |
| 200MB | Crash | 15s | 12s | 0.5s |
| 1GB | Crash | 60s | 25s | 0.5s |
| 4GB | Crash | 240s | 60s | 0.5s |

## Development vs Production

### Development (Localhost)
- **Supported**: Files up to 200MB with chunked processing
- **Backend**: Optional FFmpeg for testing large files
- **Database**: Local PostgreSQL with waveform table
- **Caching**: In-memory cache for development

### Production (Digital Ocean)
- **Supported**: Unlimited file size
- **Backend**: FFmpeg on server, auto-scaling workers
- **Database**: PostgreSQL with read replicas
- **Caching**: Redis for waveform data
- **CDN**: CloudFlare for static waveform assets

## Migration Path

### Stage 1: Safety Implementation (Current)
- Add file size detection
- Implement chunked processing for 50-200MB
- Prevent crashes with > 200MB files

### Stage 2: Backend Support
- Install FFmpeg on development and production
- Create waveform generation service
- Add database schema
- Implement REST endpoints

### Stage 3: Full Integration
- Frontend switches between methods based on file size
- Progressive waveform loading for long files
- Caching in IndexedDB for offline support

### Stage 4: Optimization
- WebAssembly for faster client-side processing
- GPU acceleration for waveform rendering
- Adaptive quality based on zoom level

## Security Considerations

1. **File Size Limits**: Enforce maximum file sizes at upload
2. **Rate Limiting**: Limit waveform generation requests
3. **Sanitization**: Validate file types before processing
4. **Storage**: Encrypt waveform data at rest
5. **Access Control**: Verify user permissions for waveform access

## Error Handling

```typescript
enum WaveformError {
  FILE_TOO_LARGE = 'File exceeds maximum size for client processing',
  MEMORY_LIMIT = 'Browser memory limit reached',
  INVALID_FORMAT = 'Unsupported audio format',
  NETWORK_ERROR = 'Failed to fetch waveform from server',
  PROCESSING_FAILED = 'Waveform generation failed'
}

const handleWaveformError = (error: WaveformError) => {
  switch(error) {
    case WaveformError.FILE_TOO_LARGE:
      // Fallback to server processing
      return fetchServerWaveform();
    case WaveformError.MEMORY_LIMIT:
      // Clear memory and retry with chunks
      return retryWithChunks();
    default:
      // Show user-friendly error
      showErrorMessage(error);
  }
};
```

## Testing Strategy

### Test Files
- Small: 10MB MP3 (3 minutes)
- Medium: 100MB MP3 (30 minutes)  
- Large: 500MB MP3 (2 hours)
- Extra Large: 2GB WAV (5 hours)

### Test Scenarios
1. Memory usage monitoring during processing
2. Browser tab crash recovery
3. Network interruption during chunk processing
4. Concurrent waveform generations
5. Cache invalidation and refresh

## Future Enhancements

1. **AI-Powered Waveform**: Identify speech vs silence automatically
2. **Multi-Resolution**: Different detail levels for zoom
3. **Real-time Updates**: Live waveform during recording
4. **Collaborative Markers**: Shared annotations on waveform
5. **Audio Fingerprinting**: Detect duplicate sections

## Conclusion

This architecture ensures:
- ✅ No browser crashes regardless of file size
- ✅ Smooth workflow after initial processing
- ✅ Scalable from development to production
- ✅ Progressive enhancement based on capabilities
- ✅ Future-proof for 4GB+ transcription files