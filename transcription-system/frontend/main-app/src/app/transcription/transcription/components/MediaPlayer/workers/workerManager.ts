import { WaveformData, AutoDetectSettings, WorkerMessage } from '../types';

type EventCallback = (data: any) => void;

// Import worker code as strings
import { waveformWorkerCode } from './waveformWorkerCode';
import { timerWorkerCode } from './timerWorkerCode';
import { autoDetectWorkerCode } from './autoDetectWorkerCode';

export class WorkerManager {
  private waveformWorker: Worker | null = null;
  private timerWorker: Worker | null = null;
  private autoDetectWorker: Worker | null = null;
  private eventListeners: Map<string, EventCallback[]> = new Map();

  constructor() {
    this.initializeWorkers();
  }

  private createWorkerFromString(workerCode: string): Worker {
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    return new Worker(workerUrl);
  }

  private initializeWorkers() {
    try {
      // Initialize waveform worker
      this.waveformWorker = this.createWorkerFromString(waveformWorkerCode);
      
      this.waveformWorker.onmessage = (e: MessageEvent<WorkerMessage>) => {
        this.handleWaveformMessage(e.data);
      };

      // Initialize timer worker
      this.timerWorker = this.createWorkerFromString(timerWorkerCode);
      
      this.timerWorker.onmessage = (e: MessageEvent<WorkerMessage>) => {
        this.handleTimerMessage(e.data);
      };

      // Initialize auto-detect worker
      this.autoDetectWorker = this.createWorkerFromString(autoDetectWorkerCode);
      
      this.autoDetectWorker.onmessage = (e: MessageEvent<WorkerMessage>) => {
        this.handleAutoDetectMessage(e.data);
      };

    } catch (error) {
      console.error('Failed to initialize workers:', error);
    }
  }

  // Event handling
  on(event: string, callback: EventCallback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Waveform worker methods
  analyzeWaveform(audioBuffer: ArrayBuffer, sampleRate: number) {
    if (!this.waveformWorker) return;

    this.waveformWorker.postMessage({
      type: 'ANALYZE',
      audioBuffer,
      sampleRate
    }, [audioBuffer]); // Transfer ownership for better performance
  }

  cancelWaveformAnalysis() {
    if (!this.waveformWorker) return;

    this.waveformWorker.postMessage({
      type: 'CANCEL'
    });
  }

  private handleWaveformMessage(message: WorkerMessage) {
    switch (message.type) {
      case 'PROGRESS':
        this.emit('waveform:progress', message.data.progress);
        break;
      case 'COMPLETE':
        this.emit('waveform:complete', message.data as WaveformData);
        break;
      case 'ERROR':
        this.emit('waveform:error', message.data.error);
        break;
    }
  }

  // Timer worker methods
  startTimer(interval: number = 100) {
    if (!this.timerWorker) return;

    this.timerWorker.postMessage({
      type: 'START',
      interval
    });
  }

  stopTimer() {
    if (!this.timerWorker) return;

    this.timerWorker.postMessage({
      type: 'STOP'
    });
  }

  updateTimerTime(currentTime: number) {
    if (!this.timerWorker) return;

    this.timerWorker.postMessage({
      type: 'UPDATE',
      currentTime
    });
  }

  private handleTimerMessage(message: WorkerMessage) {
    switch (message.type) {
      case 'TICK':
        this.emit('timer:tick', message.data.currentTime);
        break;
    }
  }

  // Auto-detect worker methods
  updateAutoDetectSettings(settings: AutoDetectSettings) {
    if (!this.autoDetectWorker) return;

    this.autoDetectWorker.postMessage({
      type: 'UPDATE_SETTINGS',
      settings
    });
  }

  notifyTypingStart() {
    if (!this.autoDetectWorker) return;

    this.autoDetectWorker.postMessage({
      type: 'START_TYPING'
    });
  }

  notifyTypingStop() {
    if (!this.autoDetectWorker) return;

    this.autoDetectWorker.postMessage({
      type: 'STOP_TYPING'
    });
  }

  enableAutoDetect() {
    if (!this.autoDetectWorker) return;

    this.autoDetectWorker.postMessage({
      type: 'ENABLE'
    });
  }

  disableAutoDetect() {
    if (!this.autoDetectWorker) return;

    this.autoDetectWorker.postMessage({
      type: 'DISABLE'
    });
  }

  private handleAutoDetectMessage(message: WorkerMessage) {
    switch (message.type) {
      case 'ACTION':
        this.emit('autodetect:action', message.data.action);
        break;
      case 'STATUS':
        this.emit('autodetect:status', message.data);
        break;
    }
  }

  // Cleanup
  terminate() {
    if (this.waveformWorker) {
      this.waveformWorker.terminate();
      this.waveformWorker = null;
    }

    if (this.timerWorker) {
      this.timerWorker.terminate();
      this.timerWorker = null;
    }

    if (this.autoDetectWorker) {
      this.autoDetectWorker.terminate();
      this.autoDetectWorker = null;
    }

    this.eventListeners.clear();
  }
}