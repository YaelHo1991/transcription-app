/**
 * Resource thresholds and limits configuration
 */

import { ResourceThresholds } from './types';

// Size constants
const MB = 1024 * 1024;
const GB = 1024 * MB;

/**
 * Default resource thresholds
 */
export const DEFAULT_THRESHOLDS: ResourceThresholds = {
  // Critical levels - operations will be blocked
  criticalMemory: 100 * MB,    // 100MB
  criticalCPU: 95,              // 95%
  criticalStorage: 500 * MB,    // 500MB
  
  // Warning levels - user will be warned
  warningMemory: 500 * MB,      // 500MB
  warningCPU: 80,                // 80%
  warningStorage: 1 * GB,        // 1GB
  
  // Safe levels - all operations allowed
  safeMemory: 1 * GB,            // 1GB
  safeCPU: 60,                   // 60%
  safeStorage: 2 * GB,           // 2GB
};

/**
 * Development environment thresholds (more lenient)
 */
export const DEV_THRESHOLDS: ResourceThresholds = {
  criticalMemory: 50 * MB,      // 50MB
  criticalCPU: 98,               // 98%
  criticalStorage: 100 * MB,     // 100MB
  
  warningMemory: 200 * MB,       // 200MB
  warningCPU: 90,                 // 90%
  warningStorage: 500 * MB,      // 500MB
  
  safeMemory: 500 * MB,          // 500MB
  safeCPU: 70,                   // 70%
  safeStorage: 1 * GB,           // 1GB
};

/**
 * Mobile device thresholds (stricter)
 */
export const MOBILE_THRESHOLDS: ResourceThresholds = {
  criticalMemory: 50 * MB,       // 50MB
  criticalCPU: 90,                // 90%
  criticalStorage: 200 * MB,     // 200MB
  
  warningMemory: 200 * MB,       // 200MB
  warningCPU: 70,                 // 70%
  warningStorage: 500 * MB,      // 500MB
  
  safeMemory: 500 * MB,          // 500MB
  safeCPU: 50,                   // 50%
  safeStorage: 1 * GB,           // 1GB
};

/**
 * Get appropriate thresholds based on environment
 */
export function getThresholds(): ResourceThresholds {
  // Check if mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  
  if (isMobile) {
    return MOBILE_THRESHOLDS;
  }
  
  // Check if development environment
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    return DEV_THRESHOLDS;
  }
  
  return DEFAULT_THRESHOLDS;
}

/**
 * File size categories for different handling strategies
 */
export const FILE_SIZE_CATEGORIES = {
  TINY: 1 * MB,           // < 1MB - No checks needed
  SMALL: 10 * MB,         // < 10MB - Basic checks
  MEDIUM: 50 * MB,        // < 50MB - Standard checks
  LARGE: 200 * MB,        // < 200MB - Strict checks
  HUGE: 1 * GB,           // < 1GB - Very strict checks
  MASSIVE: 4 * GB,        // < 4GB - Maximum supported
} as const;

/**
 * Get size category for a file
 */
export function getFileSizeCategory(sizeInBytes: number): keyof typeof FILE_SIZE_CATEGORIES {
  if (sizeInBytes < FILE_SIZE_CATEGORIES.TINY) return 'TINY';
  if (sizeInBytes < FILE_SIZE_CATEGORIES.SMALL) return 'SMALL';
  if (sizeInBytes < FILE_SIZE_CATEGORIES.MEDIUM) return 'MEDIUM';
  if (sizeInBytes < FILE_SIZE_CATEGORIES.LARGE) return 'LARGE';
  if (sizeInBytes < FILE_SIZE_CATEGORIES.HUGE) return 'HUGE';
  return 'MASSIVE';
}