/**
 * Worker setup utilities for the MediaPlayer component
 */

import React from 'react';
import { WorkerManager } from '../workers/workerManager';
import { WaveformData } from '../types';

/**
 * Setup worker manager with event handlers
 */
export function setupWorkerManager(
  setWaveformProgress: React.Dispatch<React.SetStateAction<number>>,
  setWaveformData: React.Dispatch<React.SetStateAction<WaveformData | null>>,
  setWaveformLoading: React.Dispatch<React.SetStateAction<boolean>>
): WorkerManager {
  const workerManager = new WorkerManager();
  
  // Set up waveform event listeners
  workerManager.on('waveform:progress', (progress: number) => {
    setWaveformProgress(progress);
  });

  workerManager.on('waveform:complete', (data: WaveformData) => {
    setWaveformData(data);
    setWaveformLoading(false);
    setWaveformProgress(100);
  });

  workerManager.on('waveform:error', (error: string) => {
    console.error('Waveform analysis error:', error);
    setWaveformLoading(false);
    setWaveformProgress(0);
  });
  
  return workerManager;
}