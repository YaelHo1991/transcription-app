/**
 * Waveform Analysis Utility
 * Handles waveform generation and processing for media files
 */

import React from 'react';
import { WaveformData } from '../types';
import { ChunkedWaveformProcessor } from './ChunkedWaveformProcessor';
import { getWaveformStrategy, WaveformMethod, getFileSizeFromUrl, generateFileId, formatFileSize } from './waveformStrategy';
import { statusMessages } from './statusManager';
import { OperationType, Recommendation } from '@/lib/services/resourceMonitor';

interface WaveformAnalysisParams {
  url: string;
  workerManager: any;
  setWaveformLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setWaveformProgress: React.Dispatch<React.SetStateAction<number>>;
  setWaveformData: React.Dispatch<React.SetStateAction<WaveformData | null>>;
  setWaveformEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  checkOperation: (type: OperationType, size: number) => Promise<any>;
  showWarning: (check: any) => boolean;
  showGlobalStatus: (message: string) => void;
  resourceMonitor: any;
}

export async function analyzeWaveform(params: WaveformAnalysisParams): Promise<void> {
  const {
    url,
    workerManager,
    setWaveformLoading,
    setWaveformProgress,
    setWaveformData,
    setWaveformEnabled,
    checkOperation,
    showWarning,
    showGlobalStatus,
    resourceMonitor
  } = params;

  try {
    setWaveformLoading(true);
    setWaveformProgress(0);
    setWaveformData(null);

    // Get file size to determine strategy
    const fileSize = await getFileSizeFromUrl(url);
    
    // If file size detection failed (returns 0), use client-side as fallback
    
    // Check system resources before processing
    const resourceCheck = await checkOperation(OperationType.WAVEFORM, fileSize || 50 * 1024 * 1024);
    
    if (!resourceCheck.safe) {
      // Show warning and handle user response
      const proceed = showWarning(resourceCheck);
      
      if (!proceed) {
        // User cancelled, disable waveform
        setWaveformEnabled(false);
        setWaveformLoading(false);
        showGlobalStatus(statusMessages.waveform.canceled);
        return;
      }
      
      // If alternative method suggested, switch strategy
      if (resourceCheck.recommendation === Recommendation.USE_SERVER) {
        // Force server-side processing
      }
    }
    
    // Check if it's a blob URL (can't be processed server-side)
    const isBlobUrl = url.startsWith('blob:');
    
    let strategy = getWaveformStrategy(fileSize || 1); // Use 1 byte if 0 to get client strategy
    
    // Override to chunked processing for blob URLs that would normally use server
    if (isBlobUrl && strategy.method === WaveformMethod.SERVER) {
      strategy = { 
        method: WaveformMethod.CHUNKED, 
        threshold: fileSize || 0,
        message: 'מעבד קובץ גדול, אנא המתן...'
      };
    }
    
    
    // Show appropriate message
    setWaveformProgress(1); // Show loading started
    
    // Log operation start for metrics
    const startTime = Date.now();
    const startMemory = (await resourceMonitor.getStatus()).memoryUsed;
    
    switch (strategy.method) {
      case WaveformMethod.CLIENT:
        // Small files: Original client-side processing
        if (!workerManager) {
          console.error('Worker manager not available');
          throw new Error('Worker manager not initialized');
        }
        
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const decodedData = await audioContext.decodeAudioData(arrayBuffer.slice());

        const channelData = decodedData.getChannelData(0);
        const duration = decodedData.duration;
        
        audioContext.close();

        // Create a new ArrayBuffer from the Float32Array to avoid SharedArrayBuffer issues
        const buffer = new ArrayBuffer(channelData.byteLength);
        const bufferView = new Float32Array(buffer);
        bufferView.set(channelData);
        workerManager.analyzeWaveform(buffer, decodedData.sampleRate, duration);
        break;
        
      case WaveformMethod.CHUNKED:
        // Medium files: Process in chunks
        const chunkedProcessor = new ChunkedWaveformProcessor({
          onProgress: (progress) => {
            setWaveformProgress(progress);
          },
          onError: (error) => {
            throw error;
          }
        });
        
        try {
          const chunkedResult = await chunkedProcessor.processLargeFile(url);
          
          // Ensure the data is in the correct format
          if (chunkedResult && chunkedResult.peaks && chunkedResult.peaks.length > 0) {
            setWaveformData(chunkedResult);
            setWaveformLoading(false);
            setWaveformProgress(100);
            showGlobalStatus('צורת גל נטענה בהצלחה');
          } else {
            throw new Error('Invalid waveform data received from chunked processor');
          }
        } catch (chunkedError) {
          console.error('Failed to process waveform in chunks:', chunkedError);
          throw chunkedError;
        }
        break;
        
      case WaveformMethod.SERVER:
        // Large files: Request from server
        const fileId = generateFileId(url);
        
        // First, trigger generation on server
        const generateResponse = await fetch('http://localhost:5000/api/waveform/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fileId,
            fileUrl: url,
            fileSize
          })
        });
        
        if (!generateResponse.ok) {
          throw new Error('Failed to generate waveform on server');
        }
        
        // Check generation status first
        const statusData = await generateResponse.json();
        
        // If processing in background (large files), poll for completion
        if (statusData.status === 'processing') {
          let attempts = 0;
          const maxAttempts = 600; // 10 minutes timeout for very large files
          
          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between checks
            
            try {
              const waveformResponse = await fetch(`http://localhost:5000/api/waveform/${fileId}`);
              
              if (waveformResponse.ok) {
                const data = await waveformResponse.json();
                setWaveformData({
                  peaks: data.peaks instanceof Float32Array ? data.peaks : new Float32Array(data.peaks),
                  duration: data.duration,
                  sampleRate: data.sampleRate || 44100,
                  resolution: data.resolution || 1024
                });
                setWaveformLoading(false);
                setWaveformProgress(100);
                break;
              }
            } catch (pollError) {
            }
            
            // Update progress based on attempts
            setWaveformProgress(Math.min(90, (attempts / maxAttempts) * 90));
            attempts++;
          }
          
          if (attempts >= maxAttempts) {
            throw new Error('Waveform generation timed out');
          }
        } else {
          // Immediate response (cached or small file)
          setWaveformData({
            peaks: statusData.peaks instanceof Float32Array ? statusData.peaks : new Float32Array(statusData.peaks),
            duration: statusData.duration,
            sampleRate: statusData.sampleRate || 44100,
            resolution: statusData.resolution || 1024
          });
          setWaveformLoading(false);
          setWaveformProgress(100);
        }
        break;
    }
    
    // Log operation completion for metrics
    const endMemory = (await resourceMonitor.getStatus()).memoryUsed;
    resourceMonitor.logOperation({
      type: OperationType.WAVEFORM,
      timestamp: startTime,
      fileSize: fileSize || 0,
      memoryBefore: startMemory,
      memoryAfter: endMemory,
      duration: Date.now() - startTime,
      success: true
    });
    
  } catch (error) {
    console.error('Failed to analyze waveform:', error);
    setWaveformLoading(false);
    setWaveformProgress(0);
    
    // Log operation failure
    resourceMonitor.logOperation({
      type: OperationType.WAVEFORM,
      timestamp: Date.now(),
      fileSize: 0,
      memoryBefore: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Show error message to user
    showGlobalStatus(statusMessages.waveform.error(error instanceof Error ? error.message : String(error)));
  }
}