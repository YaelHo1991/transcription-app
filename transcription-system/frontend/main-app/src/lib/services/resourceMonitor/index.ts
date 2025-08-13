/**
 * Resource Monitor Service Public API
 * 
 * Usage:
 * import { resourceMonitor, OperationType } from '@/lib/services/resourceMonitor';
 * 
 * const safe = await resourceMonitor.checkOperation(OperationType.WAVEFORM, fileSize);
 */

export { resourceMonitor, ResourceMonitor } from './ResourceMonitor';
export * from './types';
export { getThresholds, getFileSizeCategory, FILE_SIZE_CATEGORIES } from './thresholds';
export { 
  calculateMemoryRequirement, 
  getOperationCost, 
  isMemoryIntensive,
  getAlternativeMethod 
} from './operations';