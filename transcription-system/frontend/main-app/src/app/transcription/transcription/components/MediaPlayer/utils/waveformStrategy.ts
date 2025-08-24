/**
 * Waveform processing strategy based on file size
 */

export enum WaveformMethod {
  CLIENT = 'client',      // < 50MB: Process in browser
  CHUNKED = 'chunked',    // 50-300MB: Process in chunks
  SERVER = 'server'       // > 300MB: Server-side processing (not available for blob URLs)
}

export interface WaveformStrategy {
  method: WaveformMethod;
  threshold: number;
  message: string;
}

// File size thresholds in bytes
export const FILE_SIZE_LIMITS = {
  SMALL: 50 * 1024 * 1024,     // 50MB
  MEDIUM: 300 * 1024 * 1024,   // 300MB - increased for better blob support
  LARGE: 4 * 1024 * 1024 * 1024 // 4GB (max supported)
};

/**
 * Determine the appropriate waveform processing strategy based on file size
 */
export const getWaveformStrategy = (fileSize: number): WaveformStrategy => {
  if (fileSize < FILE_SIZE_LIMITS.SMALL) {
    return {
      method: WaveformMethod.CLIENT,
      threshold: FILE_SIZE_LIMITS.SMALL,
      message: 'מעבד צורת גל...'
    };
  } else if (fileSize < FILE_SIZE_LIMITS.MEDIUM) {
    return {
      method: WaveformMethod.CHUNKED,
      threshold: FILE_SIZE_LIMITS.MEDIUM,
      message: 'מעבד קובץ גדול, אנא המתן...'
    };
  } else if (fileSize < FILE_SIZE_LIMITS.LARGE) {
    return {
      method: WaveformMethod.SERVER,
      threshold: FILE_SIZE_LIMITS.LARGE,
      message: 'מעבד קובץ גדול מאוד בשרת...'
    };
  } else {
    throw new Error('הקובץ גדול מדי (מקסימום 4GB)');
  }
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return ((bytes / 1024).toFixed(1)) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return ((bytes / (1024 * 1024)).toFixed(1)) + ' MB';
  return ((bytes / (1024 * 1024 * 1024)).toFixed(2)) + ' GB';
};

/**
 * Check if browser has enough memory for waveform processing
 */
export const checkMemoryAvailable = async (): Promise<boolean> => {
  // Check if Memory API is available (Chrome only)
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    const usedMemory = memory.usedJSHeapSize;
    const totalMemory = memory.jsHeapSizeLimit;
    const availableMemory = totalMemory - usedMemory;
    
    // Need at least 500MB available
    const requiredMemory = 500 * 1024 * 1024;
    
    if (availableMemory < requiredMemory) {
      console.warn('Low memory: ' + formatFileSize(availableMemory) + ' available');
      return false;
    }
  }
  
  // If Memory API not available, assume we have enough
  return true;
};

/**
 * Get file size from URL (using HEAD request)
 */
export const getFileSizeFromUrl = async (url: string): Promise<number> => {
  try {
    // For local blob URLs or data URLs, we need to fetch the actual blob
    if (url.startsWith('blob:') || url.startsWith('data:')) {
      const response = await fetch(url);
      const blob = await response.blob();
      return blob.size;
    }
    
    // For HTTP URLs, try HEAD request first
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        mode: 'cors',
        credentials: 'omit'
      });
      
      const contentLength = response.headers.get('content-length');
      
      if (contentLength) {
        return parseInt(contentLength, 10);
      }
    } catch (headError) {
      // HEAD request failed, try GET with range
      console.warn('HEAD request failed, trying alternative method');
    }
    
    // Fallback: Download first chunk to estimate size
    // This is safer than downloading the whole file
    try {
      const response = await fetch(url, {
        headers: {
          'Range': 'bytes=0-0' // Request only first byte
        }
      });
      
      // Check Content-Range header
      const contentRange = response.headers.get('content-range');
      if (contentRange) {
        // Format: "bytes 0-0/12345" - extract total size
        const match = contentRange.match(/\/(\d+)$/);
        if (match) {
          return parseInt(match[1], 10);
        }
      }
    } catch (rangeError) {
      console.warn('Range request failed');
    }
    
    // Last resort: Download file to check size (only for small files)
    console.warn('No size info available, downloading to check (may be slow)');
    const fullResponse = await fetch(url);
    const blob = await fullResponse.blob();
    return blob.size;
  } catch (error) {
    console.error('Failed to get file size:', error);
    // Return 0 to use client-side processing as fallback
    // This is safer than crashing
    return 0;
  }
};

/**
 * Generate a unique file ID from URL
 */
export const generateFileId = (url: string): string => {
  // Simple hash function for generating ID from URL
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Add timestamp for uniqueness
  return 'file_' + Math.abs(hash) + '_' + Date.now();
};