/**
 * Chunked waveform processor for medium-sized files (50-200MB)
 * Processes audio in chunks to avoid memory overflow
 */

import { WaveformData } from '../types';

export interface ChunkedProcessorOptions {
  chunkSize?: number; // Default: 10MB
  onProgress?: (progress: number) => void;
  onError?: (error: string) => void;
}

export class ChunkedWaveformProcessor {
  private chunkSize: number;
  private onProgress?: (progress: number) => void;
  private onError?: (error: string) => void;
  private audioContext: AudioContext | null = null;
  
  constructor(options: ChunkedProcessorOptions = {}) {
    this.chunkSize = options.chunkSize || 10 * 1024 * 1024; // 10MB default
    this.onProgress = options.onProgress;
    this.onError = options.onError;
  }

  /**
   * Process large file in chunks
   */
  async processLargeFile(url: string): Promise<WaveformData> {
    try {
      // Check if it's a blob URL
      const isBlobUrl = url.startsWith('blob:');
      
      if (isBlobUrl) {
        // For blob URLs, process the entire file at once with memory management
        return this.processBlobUrl(url);
      }
      
      // For regular URLs, use range requests
      // Get file size first
      const response = await fetch(url, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      const fileSize = contentLength ? parseInt(contentLength, 10) : 0;
      
      if (fileSize === 0) {
        throw new Error('Unable to determine file size');
      }

      // Initialize audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Calculate number of chunks
      const chunks = Math.ceil(fileSize / this.chunkSize);
      const allPeaks: number[] = [];
      let totalDuration = 0;
      
      console.log(`Processing ${chunks} chunks of ${this.formatBytes(this.chunkSize)} each`);
      
      // Process each chunk
      for (let i = 0; i < chunks; i++) {
        const start = i * this.chunkSize;
        const end = Math.min(start + this.chunkSize - 1, fileSize - 1);
        
        // Fetch chunk with range request
        const chunkData = await this.fetchChunk(url, start, end);
        
        // Process chunk
        const chunkPeaks = await this.processChunk(chunkData, i === 0);
        allPeaks.push(...chunkPeaks.peaks);
        
        // Update duration (only from first chunk)
        if (i === 0 && chunkPeaks.duration) {
          totalDuration = this.estimateTotalDuration(chunkPeaks.duration, this.chunkSize, fileSize);
        }
        
        // Report progress
        const progress = ((i + 1) / chunks) * 100;
        this.onProgress?.(progress);
        
        // Allow browser to breathe between chunks
        await this.delay(50);
        
        // Check memory usage and clean up if needed
        if (i % 5 === 0) {
          await this.checkMemoryAndCleanup();
        }
      }
      
      // Close audio context
      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
      }
      
      // Normalize and downsample peaks if needed
      const finalPeaks = this.normalizePeaks(allPeaks, 2000);
      
      return {
        peaks: finalPeaks,
        duration: totalDuration
      };
    } catch (error) {
      this.onError?.(error.message);
      throw error;
    }
  }

  /**
   * Fetch a chunk of the file using Range requests
   */
  private async fetchChunk(url: string, start: number, end: number): Promise<ArrayBuffer> {
    const response = await fetch(url, {
      headers: {
        'Range': `bytes=${start}-${end}`
      }
    });
    
    if (!response.ok && response.status !== 206) {
      throw new Error(`Failed to fetch chunk: ${response.status}`);
    }
    
    return response.arrayBuffer();
  }

  /**
   * Process a single chunk of audio data
   */
  private async processChunk(
    arrayBuffer: ArrayBuffer, 
    isFirstChunk: boolean
  ): Promise<{ peaks: number[]; duration?: number }> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    try {
      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
      
      // Get channel data
      const channelData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      const duration = isFirstChunk ? audioBuffer.duration : undefined;
      
      // Calculate peaks (simplified for chunks)
      const peaksPerChunk = 100; // Fewer peaks per chunk for memory efficiency
      const peaks = this.extractPeaks(channelData, peaksPerChunk);
      
      return { peaks, duration };
    } catch (error) {
      console.warn('Failed to decode chunk, skipping:', error);
      // Return empty peaks for failed chunks
      return { peaks: [] };
    }
  }

  /**
   * Extract peaks from channel data
   */
  private extractPeaks(channelData: Float32Array, targetPeaks: number): number[] {
    const peaks: number[] = [];
    const samplesPerPeak = Math.floor(channelData.length / targetPeaks);
    
    for (let i = 0; i < targetPeaks; i++) {
      const start = i * samplesPerPeak;
      const end = Math.min(start + samplesPerPeak, channelData.length);
      
      let maxPeak = 0;
      for (let j = start; j < end; j++) {
        const absSample = Math.abs(channelData[j]);
        if (absSample > maxPeak) {
          maxPeak = absSample;
        }
      }
      
      peaks.push(maxPeak);
    }
    
    return peaks;
  }

  /**
   * Normalize and resample peaks to target count
   */
  private normalizePeaks(peaks: number[], targetCount: number): number[] {
    // If we have too many peaks, downsample
    if (peaks.length > targetCount) {
      const result: number[] = [];
      const ratio = peaks.length / targetCount;
      
      for (let i = 0; i < targetCount; i++) {
        const start = Math.floor(i * ratio);
        const end = Math.floor((i + 1) * ratio);
        
        // Get max peak in range
        let maxPeak = 0;
        for (let j = start; j < end && j < peaks.length; j++) {
          maxPeak = Math.max(maxPeak, peaks[j]);
        }
        
        result.push(Math.min(1, maxPeak)); // Ensure normalized 0-1
      }
      
      return result;
    }
    
    // Normalize to 0-1 range
    return peaks.map(p => Math.min(1, p));
  }

  /**
   * Estimate total duration based on first chunk
   */
  private estimateTotalDuration(
    chunkDuration: number, 
    chunkSize: number, 
    totalSize: number
  ): number {
    const ratio = totalSize / chunkSize;
    return chunkDuration * ratio;
  }

  /**
   * Check memory usage and clean up if needed
   */
  private async checkMemoryAndCleanup(): Promise<void> {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMemory = memory.usedJSHeapSize;
      const totalMemory = memory.jsHeapSizeLimit;
      const usagePercent = (usedMemory / totalMemory) * 100;
      
      if (usagePercent > 80) {
        console.warn(`High memory usage: ${usagePercent.toFixed(1)}%, forcing garbage collection`);
        // Force garbage collection if available (Chrome with --enable-precise-memory-info)
        if (global.gc) {
          global.gc();
        }
        
        // Wait a bit for memory to be freed
        await this.delay(100);
      }
    }
  }

  /**
   * Helper: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Helper: Format bytes for display
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Process blob URL with optimized memory usage
   */
  private async processBlobUrl(url: string): Promise<WaveformData> {
    console.log('Processing blob URL with optimized memory usage');
    
    try {
      // Initialize audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Fetch the blob
      this.onProgress?.(10);
      const response = await fetch(url);
      const blob = await response.blob();
      const fileSize = blob.size;
      
      console.log(`Blob size: ${this.formatBytes(fileSize)}`);
      this.onProgress?.(20);
      
      // Convert to ArrayBuffer
      const arrayBuffer = await blob.arrayBuffer();
      this.onProgress?.(40);
      
      // Decode audio data with lower sample rate to save memory
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.onProgress?.(60);
      
      // Get channel data
      const channelData = audioBuffer.getChannelData(0);
      const duration = audioBuffer.duration;
      
      // Extract peaks with reduced resolution for large files
      const targetPeaks = fileSize > 100 * 1024 * 1024 ? 1500 : 2000; // Fewer peaks for very large files
      const peaks = this.extractPeaksOptimized(channelData, targetPeaks);
      this.onProgress?.(90);
      
      // Close audio context
      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
      }
      
      this.onProgress?.(100);
      
      return {
        peaks,
        duration
      };
    } catch (error) {
      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
      }
      throw error;
    }
  }

  /**
   * Extract peaks with optimized memory usage
   */
  private extractPeaksOptimized(channelData: Float32Array, targetPeaks: number): number[] {
    const peaks: number[] = [];
    const samplesPerPeak = Math.floor(channelData.length / targetPeaks);
    const skipFactor = Math.max(1, Math.floor(samplesPerPeak / 100)); // Sample every Nth sample for efficiency
    
    for (let i = 0; i < targetPeaks; i++) {
      const start = i * samplesPerPeak;
      const end = Math.min(start + samplesPerPeak, channelData.length);
      
      let maxPeak = 0;
      let sumSquares = 0;
      let count = 0;
      
      // Use RMS (Root Mean Square) for better peak detection
      for (let j = start; j < end; j += skipFactor) {
        const sample = channelData[j];
        const absSample = Math.abs(sample);
        maxPeak = Math.max(maxPeak, absSample);
        sumSquares += sample * sample;
        count++;
      }
      
      // Combine max peak and RMS for better representation
      const rms = Math.sqrt(sumSquares / count);
      const combinedPeak = (maxPeak * 0.7 + rms * 0.3); // Weight towards max peak
      
      peaks.push(Math.min(1, combinedPeak));
    }
    
    return peaks;
  }
}

// Export a singleton instance for convenience
export const chunkedProcessor = new ChunkedWaveformProcessor();