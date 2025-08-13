/**
 * Resource Monitor Service
 * Monitors system resources and prevents crashes from memory-intensive operations
 */

import {
  ResourceStatus,
  SafetyCheck,
  OperationType,
  SafetyReason,
  Recommendation,
  MonitoringOptions,
  OperationLog,
  ExtendedPerformance
} from './types';
import { getThresholds } from './thresholds';
import { calculateMemoryRequirement, getAlternativeMethod } from './operations';

export class ResourceMonitor {
  private static instance: ResourceMonitor;
  private status: ResourceStatus | null = null;
  private statusCache: { data: ResourceStatus; timestamp: number } | null = null;
  private cacheTimeout = 5000; // 5 seconds
  private monitoringInterval: number | null = null;
  private operationLogs: OperationLog[] = [];
  private maxLogs = 100;
  private thresholds = getThresholds();

  private constructor() {
    // Initialize on first use
    this.updateStatus();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ResourceMonitor {
    if (!ResourceMonitor.instance) {
      ResourceMonitor.instance = new ResourceMonitor();
    }
    return ResourceMonitor.instance;
  }

  /**
   * Check if an operation is safe to proceed
   */
  async checkOperation(
    type: OperationType,
    estimatedSize: number
  ): Promise<SafetyCheck> {
    const status = await this.getStatus();
    const memoryNeeded = calculateMemoryRequirement(type, estimatedSize);
    const availableMemory = status.memoryAvailable;

    // Check memory availability
    if (availableMemory < this.thresholds.criticalMemory) {
      return this.createSafetyResponse(
        false,
        SafetyReason.INSUFFICIENT_MEMORY,
        Recommendation.ABORT,
        memoryNeeded,
        availableMemory,
        'Critical: Not enough memory to proceed safely',
        'קריטי: אין מספיק זיכרון להמשיך בבטחה'
      );
    }

    if (availableMemory < memoryNeeded) {
      const alternative = getAlternativeMethod(type, availableMemory);
      return this.createSafetyResponse(
        false,
        SafetyReason.INSUFFICIENT_MEMORY,
        alternative ? Recommendation.USE_ALTERNATIVE : Recommendation.CLOSE_OTHER_APPS,
        memoryNeeded,
        availableMemory,
        `Need ${this.formatBytes(memoryNeeded)} but only ${this.formatBytes(availableMemory)} available`,
        `נדרש ${this.formatBytes(memoryNeeded)} אך רק ${this.formatBytes(availableMemory)} זמין`,
        alternative
      );
    }

    // Check CPU usage
    if (status.cpuUsage > this.thresholds.criticalCPU) {
      return this.createSafetyResponse(
        false,
        SafetyReason.HIGH_CPU,
        Recommendation.WAIT,
        memoryNeeded,
        availableMemory,
        'System is too busy, please wait',
        'המערכת עמוסה מדי, אנא המתן'
      );
    }

    // Warning level checks
    if (availableMemory < this.thresholds.warningMemory) {
      return this.createSafetyResponse(
        true,
        SafetyReason.INSUFFICIENT_MEMORY,
        Recommendation.PROCEED_WITH_CAUTION,
        memoryNeeded,
        availableMemory,
        'Low memory - operation may be slow',
        'זיכרון נמוך - הפעולה עלולה להיות איטית'
      );
    }

    if (status.cpuUsage > this.thresholds.warningCPU) {
      return this.createSafetyResponse(
        true,
        SafetyReason.HIGH_CPU,
        Recommendation.PROCEED_WITH_CAUTION,
        memoryNeeded,
        availableMemory,
        'High CPU usage - operation may be slow',
        'שימוש גבוה במעבד - הפעולה עלולה להיות איטית'
      );
    }

    // All good
    return this.createSafetyResponse(
      true,
      undefined,
      Recommendation.PROCEED,
      memoryNeeded,
      availableMemory,
      'Safe to proceed',
      'בטוח להמשיך'
    );
  }

  /**
   * Get current resource status
   */
  async getStatus(): Promise<ResourceStatus> {
    // Check cache
    if (this.statusCache && Date.now() - this.statusCache.timestamp < this.cacheTimeout) {
      return this.statusCache.data;
    }

    // Update and cache
    const status = await this.updateStatus();
    this.statusCache = { data: status, timestamp: Date.now() };
    return status;
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(
    callback: (status: ResourceStatus) => void,
    options: MonitoringOptions = {}
  ): void {
    const interval = options.interval || 1000; // Default 1 second

    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    this.monitoringInterval = window.setInterval(async () => {
      const status = await this.getStatus();
      callback(status);
    }, interval);
  }

  /**
   * Stop continuous monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Log an operation for metrics
   */
  logOperation(log: OperationLog): void {
    this.operationLogs.push(log);
    
    // Keep only recent logs
    if (this.operationLogs.length > this.maxLogs) {
      this.operationLogs.shift();
    }
  }

  /**
   * Get operation history
   */
  getOperationLogs(): OperationLog[] {
    return [...this.operationLogs];
  }

  /**
   * Clear cache to force refresh
   */
  clearCache(): void {
    this.statusCache = null;
  }

  /**
   * Private: Update resource status
   */
  private async updateStatus(): Promise<ResourceStatus> {
    const memoryInfo = this.getMemoryInfo();
    const cpuInfo = this.getCPUInfo();
    const storageInfo = await this.getStorageInfo();

    const status: ResourceStatus = {
      // Memory
      memoryAvailable: memoryInfo.available,
      memoryTotal: memoryInfo.total,
      memoryUsed: memoryInfo.used,
      memoryPercent: (memoryInfo.used / memoryInfo.total) * 100,
      
      // CPU
      cpuCores: cpuInfo.cores,
      cpuUsage: cpuInfo.usage,
      
      // Storage
      storageAvailable: storageInfo?.available,
      storageTotal: storageInfo?.total,
      storagePercent: storageInfo ? ((storageInfo.total - storageInfo.available) / storageInfo.total) * 100 : undefined,
      
      // System flags
      timestamp: Date.now(),
      isLowMemory: memoryInfo.available < this.thresholds.warningMemory,
      isHighCPU: cpuInfo.usage > this.thresholds.warningCPU,
      isLowStorage: storageInfo ? storageInfo.available < this.thresholds.warningStorage : false
    };

    this.status = status;
    return status;
  }

  /**
   * Private: Get memory information
   */
  private getMemoryInfo(): { available: number; total: number; used: number } {
    // Try Chrome/Edge memory API
    if ('memory' in performance) {
      const memory = (performance as ExtendedPerformance).memory!;
      return {
        total: memory.jsHeapSizeLimit,
        used: memory.usedJSHeapSize,
        available: memory.jsHeapSizeLimit - memory.usedJSHeapSize
      };
    }

    // Fallback: Estimate based on device
    const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const estimatedTotal = isMobile ? 2 * 1024 * 1024 * 1024 : 4 * 1024 * 1024 * 1024; // 2GB mobile, 4GB desktop
    
    // Conservative estimate: assume 50% used
    return {
      total: estimatedTotal,
      used: estimatedTotal * 0.5,
      available: estimatedTotal * 0.5
    };
  }

  /**
   * Private: Get CPU information
   */
  private getCPUInfo(): { cores: number; usage: number } {
    const cores = navigator.hardwareConcurrency || 4;
    
    // Estimate CPU usage (this is a rough approximation)
    // In production, you might want to use a more sophisticated method
    let usage = 30; // Base usage
    
    // Check if main thread is responsive
    const start = performance.now();
    // Small synchronous operation to test responsiveness
    for (let i = 0; i < 1000000; i++) {
      // Empty loop
    }
    const elapsed = performance.now() - start;
    
    // If loop took > 10ms, system is likely busy
    if (elapsed > 10) {
      usage = Math.min(90, 30 + (elapsed * 2));
    }
    
    return { cores, usage };
  }

  /**
   * Private: Get storage information
   */
  private async getStorageInfo(): Promise<{ available: number; total: number } | null> {
    // Try Storage API
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        if (estimate.quota && estimate.usage !== undefined) {
          return {
            total: estimate.quota,
            available: estimate.quota - estimate.usage
          };
        }
      } catch (error) {
        console.warn('Storage API failed:', error);
      }
    }
    
    return null;
  }

  /**
   * Private: Create safety response
   */
  private createSafetyResponse(
    safe: boolean,
    reason?: SafetyReason,
    recommendation: Recommendation = Recommendation.PROCEED,
    estimatedMemoryNeeded: number = 0,
    availableMemory: number = 0,
    message: string = '',
    messageHebrew: string = '',
    alternativeMethod?: string
  ): SafetyCheck {
    return {
      safe,
      reason,
      recommendation,
      alternativeMethod,
      estimatedMemoryNeeded,
      availableMemory,
      message,
      messageHebrew,
      details: reason === SafetyReason.INSUFFICIENT_MEMORY ? {
        memoryShortfall: Math.max(0, estimatedMemoryNeeded - availableMemory)
      } : undefined
    };
  }

  /**
   * Private: Format bytes for display
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}

// Export singleton instance
export const resourceMonitor = ResourceMonitor.getInstance();