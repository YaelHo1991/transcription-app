/**
 * Operation cost estimates and configurations
 */

import { OperationType, OperationCost } from './types';

const MB = 1024 * 1024;

/**
 * Operation memory cost configurations
 * Defines how much memory each operation type typically requires
 */
export const OPERATION_COSTS: Map<OperationType, OperationCost> = new Map([
  [OperationType.WAVEFORM, {
    memoryMultiplier: 3,        // 3x file size for waveform generation
    safetyFactor: 2,            // 2x safety margin
    minMemoryRequired: 50 * MB, // Minimum 50MB
    preferredMemory: 200 * MB,  // Preferred 200MB
    description: 'Waveform generation requires decoding audio to PCM'
  }],
  
  [OperationType.VIDEO_PROCESS, {
    memoryMultiplier: 5,        // 5x file size for video
    safetyFactor: 2,
    minMemoryRequired: 100 * MB,
    preferredMemory: 500 * MB,
    description: 'Video processing requires frame buffering'
  }],
  
  [OperationType.AUDIO_PROCESS, {
    memoryMultiplier: 2,
    safetyFactor: 1.5,
    minMemoryRequired: 30 * MB,
    preferredMemory: 100 * MB,
    description: 'Audio processing with effects'
  }],
  
  [OperationType.FILE_UPLOAD, {
    memoryMultiplier: 1.5,      // 1.5x for upload buffering
    safetyFactor: 1.5,
    minMemoryRequired: 10 * MB,
    preferredMemory: 50 * MB,
    description: 'File upload with progress tracking'
  }],
  
  [OperationType.FILE_DOWNLOAD, {
    memoryMultiplier: 1.2,
    safetyFactor: 1.5,
    minMemoryRequired: 10 * MB,
    preferredMemory: 50 * MB,
    description: 'File download buffering'
  }],
  
  [OperationType.FILE_PROCESS, {
    memoryMultiplier: 2,
    safetyFactor: 2,
    minMemoryRequired: 20 * MB,
    preferredMemory: 100 * MB,
    description: 'Generic file processing'
  }],
  
  [OperationType.DATA_IMPORT, {
    memoryMultiplier: 2,        // 2x for parsing and validation
    safetyFactor: 2,
    minMemoryRequired: 20 * MB,
    preferredMemory: 200 * MB,
    description: 'Data import with validation'
  }],
  
  [OperationType.DATA_EXPORT, {
    memoryMultiplier: 1.5,
    safetyFactor: 1.5,
    minMemoryRequired: 20 * MB,
    preferredMemory: 100 * MB,
    description: 'Data export formatting'
  }],
  
  [OperationType.REPORT_GENERATION, {
    memoryMultiplier: 2.5,      // Variable, depends on report
    safetyFactor: 2,
    minMemoryRequired: 50 * MB,
    preferredMemory: 300 * MB,
    description: 'Report generation with charts'
  }],
  
  [OperationType.AI_PROCESSING, {
    memoryMultiplier: 4,        // AI models need more memory
    safetyFactor: 2.5,
    minMemoryRequired: 100 * MB,
    preferredMemory: 1024 * MB,
    description: 'AI model processing'
  }],
  
  [OperationType.TRANSCRIPTION, {
    memoryMultiplier: 3,
    safetyFactor: 2,
    minMemoryRequired: 100 * MB,
    preferredMemory: 500 * MB,
    description: 'Audio transcription processing'
  }],
  
  [OperationType.HEAVY_OPERATION, {
    memoryMultiplier: 3,        // Generic heavy operation
    safetyFactor: 2,
    minMemoryRequired: 50 * MB,
    preferredMemory: 300 * MB,
    description: 'Generic heavy operation'
  }],
  
  [OperationType.CUSTOM, {
    memoryMultiplier: 2,        // Default for custom operations
    safetyFactor: 2,
    minMemoryRequired: 30 * MB,
    preferredMemory: 100 * MB,
    description: 'Custom operation'
  }]
]);

/**
 * Calculate memory requirement for an operation
 */
export function calculateMemoryRequirement(
  operationType: OperationType,
  fileSize: number
): number {
  const cost = OPERATION_COSTS.get(operationType) || OPERATION_COSTS.get(OperationType.CUSTOM)!;
  
  // Calculate base requirement
  const baseRequirement = fileSize * cost.memoryMultiplier;
  
  // Apply safety factor
  const withSafety = baseRequirement * cost.safetyFactor;
  
  // Ensure minimum requirement is met
  return Math.max(withSafety, cost.minMemoryRequired);
}

/**
 * Get operation cost details
 */
export function getOperationCost(operationType: OperationType): OperationCost {
  return OPERATION_COSTS.get(operationType) || OPERATION_COSTS.get(OperationType.CUSTOM)!;
}

/**
 * Check if operation is memory intensive
 */
export function isMemoryIntensive(operationType: OperationType): boolean {
  const cost = getOperationCost(operationType);
  return cost.memoryMultiplier >= 3 || cost.preferredMemory >= 300 * MB;
}

/**
 * Get recommended alternative for an operation
 */
export function getAlternativeMethod(
  operationType: OperationType,
  availableMemory: number
): string | undefined {
  const cost = getOperationCost(operationType);
  
  // If we have less than minimum required, suggest alternatives
  if (availableMemory < cost.minMemoryRequired) {
    switch (operationType) {
      case OperationType.WAVEFORM:
        return 'Use server-side waveform generation';
      case OperationType.VIDEO_PROCESS:
        return 'Process video in smaller chunks';
      case OperationType.FILE_UPLOAD:
        return 'Use chunked upload for large files';
      case OperationType.DATA_IMPORT:
        return 'Import data in batches';
      case OperationType.REPORT_GENERATION:
        return 'Generate report in sections';
      case OperationType.AI_PROCESSING:
        return 'Use cloud AI processing';
      default:
        return 'Try processing smaller amounts of data';
    }
  }
  
  return undefined;
}