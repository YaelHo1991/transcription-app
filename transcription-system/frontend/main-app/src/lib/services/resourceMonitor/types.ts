/**
 * Type definitions for Resource Monitor Service
 */

export enum OperationType {
  // Media operations
  WAVEFORM = 'waveform',
  VIDEO_PROCESS = 'video-process',
  AUDIO_PROCESS = 'audio-process',
  
  // File operations
  FILE_UPLOAD = 'file-upload',
  FILE_DOWNLOAD = 'file-download',
  FILE_PROCESS = 'file-process',
  
  // Data operations
  DATA_IMPORT = 'data-import',
  DATA_EXPORT = 'data-export',
  REPORT_GENERATION = 'report-generation',
  
  // AI operations
  AI_PROCESSING = 'ai-processing',
  TRANSCRIPTION = 'transcription',
  
  // Generic
  HEAVY_OPERATION = 'heavy-operation',
  CUSTOM = 'custom'
}

export interface ResourceStatus {
  // Memory (in bytes)
  memoryAvailable: number;
  memoryTotal: number;
  memoryUsed: number;
  memoryPercent: number;
  
  // CPU
  cpuCores: number;
  cpuUsage: number; // 0-100
  
  // Storage (in bytes)
  storageAvailable?: number;
  storageTotal?: number;
  storagePercent?: number;
  
  // System
  timestamp: number;
  isLowMemory: boolean;
  isHighCPU: boolean;
  isLowStorage: boolean;
}

export interface SafetyCheck {
  safe: boolean;
  reason?: SafetyReason;
  recommendation: Recommendation;
  alternativeMethod?: string;
  estimatedMemoryNeeded: number;
  availableMemory: number;
  message: string;
  messageHebrew: string;
  details?: {
    memoryShortfall?: number;
    cpuOverload?: number;
    storageNeeded?: number;
  };
}

export enum SafetyReason {
  INSUFFICIENT_MEMORY = 'insufficient-memory',
  HIGH_CPU = 'high-cpu',
  LOW_STORAGE = 'low-storage',
  OPERATION_TOO_LARGE = 'operation-too-large',
  SYSTEM_BUSY = 'system-busy'
}

export enum Recommendation {
  PROCEED = 'proceed',
  PROCEED_WITH_CAUTION = 'proceed-with-caution',
  WAIT = 'wait',
  USE_ALTERNATIVE = 'use-alternative',
  USE_CHUNKED = 'use-chunked',
  USE_SERVER = 'use-server',
  CLOSE_OTHER_APPS = 'close-other-apps',
  ABORT = 'abort'
}

export interface OperationCost {
  memoryMultiplier: number;
  safetyFactor: number;
  minMemoryRequired: number;
  preferredMemory: number;
  description: string;
}

export interface MonitoringOptions {
  interval?: number; // ms
  enableCaching?: boolean;
  cacheTimeout?: number; // ms
  verbose?: boolean;
}

export interface OperationLog {
  type: OperationType;
  timestamp: number;
  fileSize?: number;
  memoryBefore: number;
  memoryAfter?: number;
  duration?: number;
  success: boolean;
  error?: string;
}

export interface ResourceThresholds {
  // Critical levels (block operations)
  criticalMemory: number; // bytes
  criticalCPU: number; // percentage
  criticalStorage: number; // bytes
  
  // Warning levels (show warnings)
  warningMemory: number;
  warningCPU: number;
  warningStorage: number;
  
  // Safe levels (no restrictions)
  safeMemory: number;
  safeCPU: number;
  safeStorage: number;
}

export interface ResourceMonitorConfig {
  thresholds: ResourceThresholds;
  monitoring: MonitoringOptions;
  operations: Map<OperationType, OperationCost>;
}

// Browser-specific memory info (Chrome/Edge)
export interface MemoryInfo {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
}

// Extended Performance interface
export interface ExtendedPerformance extends Performance {
  memory?: MemoryInfo;
}