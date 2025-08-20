import axios from 'axios';

// Development mode flag - set to true to bypass all authentication
const DEV_MODE = true;

export interface BlockChange {
  id: string;
  text: string;
  speaker?: string;
  speakerName?: string;
  speakerTime?: number;
  timestamp?: string;
  operation: 'create' | 'update' | 'delete';
}

export interface IncrementalBackupData {
  projectId: string;
  changes: BlockChange[];
  fullSnapshot: boolean; // true for initial save, false for incremental
  version: number;
  timestamp: number;
  totalBlocks: number; // For validation
}

export interface BackupMetrics {
  totalBlocks: number;
  modifiedBlocks: number;
  deletedBlocks: number;
  addedBlocks: number;
  lastFullBackup: Date | null;
  lastIncrementalBackup: Date | null;
}

class IncrementalBackupService {
  private static instance: IncrementalBackupService;
  
  // Track modified blocks since last save
  private modifiedBlocks: Map<string, BlockChange> = new Map();
  private deletedBlocks: Set<string> = new Set();
  private addedBlocks: Set<string> = new Set();
  
  // Track original state for comparison
  private originalBlocks: Map<string, any> = new Map();
  private lastSaveVersion: number = 0;
  private projectId: string | null = null;
  
  // Backup thresholds
  private readonly FULL_BACKUP_THRESHOLD = 100; // Force full backup after 100 changes
  private readonly FULL_BACKUP_INTERVAL = 3600000; // Force full backup every hour
  private lastFullBackupTime: number = 0;
  
  private constructor() {}

  static getInstance(): IncrementalBackupService {
    if (!IncrementalBackupService.instance) {
      IncrementalBackupService.instance = new IncrementalBackupService();
    }
    return IncrementalBackupService.instance;
  }

  /**
   * Initialize with current document state
   */
  initialize(projectId: string, blocks: any[], version: number = 0): void {
    this.projectId = projectId;
    this.lastSaveVersion = version;
    this.clearChanges();
    
    // Store original state
    blocks.forEach(block => {
      this.originalBlocks.set(block.id, { ...block });
    });
    
    console.log(`[IncrementalBackup] Initialized with ${blocks.length} blocks, version ${version}`);
  }

  /**
   * Track block creation
   */
  trackBlockCreated(block: any): void {
    const change: BlockChange = {
      ...block,
      operation: 'create'
    };
    
    this.modifiedBlocks.set(block.id, change);
    this.addedBlocks.add(block.id);
    this.deletedBlocks.delete(block.id); // In case it was previously deleted
    
    console.log(`[IncrementalBackup] Block created: ${block.id}`);
  }

  /**
   * Track block update
   */
  trackBlockUpdated(blockId: string, field: string, value: any, fullBlock?: any): void {
    // If block is newly added, keep it as 'create'
    if (this.addedBlocks.has(blockId)) {
      // Update the create change with new value
      const existing = this.modifiedBlocks.get(blockId);
      if (existing) {
        existing[field] = value;
        if (fullBlock) {
          Object.assign(existing, fullBlock);
        }
      }
      return;
    }

    // Check if actually changed from original
    const original = this.originalBlocks.get(blockId);
    if (original && original[field] === value) {
      // No actual change from original, might remove from modified
      const currentChange = this.modifiedBlocks.get(blockId);
      if (currentChange && currentChange.operation === 'update') {
        // Check if all fields match original
        const hasOtherChanges = Object.keys(currentChange).some(key => {
          return key !== 'operation' && key !== 'id' && 
                 original[key] !== currentChange[key];
        });
        
        if (!hasOtherChanges) {
          this.modifiedBlocks.delete(blockId);
          console.log(`[IncrementalBackup] Block ${blockId} reverted to original`);
          return;
        }
      }
    }

    // Track the update
    let change = this.modifiedBlocks.get(blockId);
    if (!change) {
      change = {
        id: blockId,
        operation: 'update',
        ...original // Start with original values
      } as BlockChange;
      this.modifiedBlocks.set(blockId, change);
    }
    
    // Update the changed field
    change[field] = value;
    if (fullBlock) {
      Object.assign(change, fullBlock);
    }
    
    console.log(`[IncrementalBackup] Block updated: ${blockId}.${field}`);
  }

  /**
   * Track block deletion
   */
  trackBlockDeleted(blockId: string): void {
    // If it was added in this session, just remove it
    if (this.addedBlocks.has(blockId)) {
      this.addedBlocks.delete(blockId);
      this.modifiedBlocks.delete(blockId);
      console.log(`[IncrementalBackup] Newly added block deleted: ${blockId}`);
      return;
    }

    // Mark as deleted
    this.deletedBlocks.add(blockId);
    this.modifiedBlocks.set(blockId, {
      id: blockId,
      text: '',
      operation: 'delete'
    });
    
    console.log(`[IncrementalBackup] Block deleted: ${blockId}`);
  }

  /**
   * Track bulk updates (e.g., speaker name changes)
   */
  trackBulkUpdate(blocks: any[], field: string): void {
    blocks.forEach(block => {
      this.trackBlockUpdated(block.id, field, block[field], block);
    });
  }

  /**
   * Get current changes for backup
   */
  getChanges(): BlockChange[] {
    return Array.from(this.modifiedBlocks.values());
  }

  /**
   * Check if incremental or full backup is needed
   */
  shouldDoFullBackup(): boolean {
    // Force full backup if too many changes
    if (this.modifiedBlocks.size > this.FULL_BACKUP_THRESHOLD) {
      console.log('[IncrementalBackup] Full backup needed: too many changes');
      return true;
    }

    // Force full backup if too much time passed
    const timeSinceFullBackup = Date.now() - this.lastFullBackupTime;
    if (timeSinceFullBackup > this.FULL_BACKUP_INTERVAL) {
      console.log('[IncrementalBackup] Full backup needed: time threshold');
      return true;
    }

    return false;
  }

  /**
   * Prepare backup data
   */
  prepareBackupData(allBlocks: any[], forceFullBackup: boolean = false): IncrementalBackupData {
    const shouldFullBackup = forceFullBackup || this.shouldDoFullBackup() || this.lastSaveVersion === 0;
    
    if (shouldFullBackup) {
      // Full backup - send all blocks
      this.lastFullBackupTime = Date.now();
      
      return {
        projectId: this.projectId!,
        changes: allBlocks.map(block => ({
          ...block,
          operation: 'update' as const
        })),
        fullSnapshot: true,
        version: this.lastSaveVersion + 1,
        timestamp: Date.now(),
        totalBlocks: allBlocks.length
      };
    } else {
      // Incremental backup - send only changes
      return {
        projectId: this.projectId!,
        changes: this.getChanges(),
        fullSnapshot: false,
        version: this.lastSaveVersion + 1,
        timestamp: Date.now(),
        totalBlocks: allBlocks.length
      };
    }
  }

  /**
   * Clear changes after successful save
   */
  onSaveSuccess(newVersion: number, blocks: any[]): void {
    this.lastSaveVersion = newVersion;
    this.clearChanges();
    
    // Update original blocks to current state
    this.originalBlocks.clear();
    blocks.forEach(block => {
      this.originalBlocks.set(block.id, { ...block });
    });
    
    console.log(`[IncrementalBackup] Save successful, version ${newVersion}`);
  }

  /**
   * Clear all tracked changes
   */
  private clearChanges(): void {
    this.modifiedBlocks.clear();
    this.deletedBlocks.clear();
    this.addedBlocks.clear();
  }

  /**
   * Get backup metrics
   */
  getMetrics(): BackupMetrics {
    return {
      totalBlocks: this.originalBlocks.size,
      modifiedBlocks: this.modifiedBlocks.size,
      deletedBlocks: this.deletedBlocks.size,
      addedBlocks: this.addedBlocks.size,
      lastFullBackup: this.lastFullBackupTime ? new Date(this.lastFullBackupTime) : null,
      lastIncrementalBackup: null // Will be tracked by main backup service
    };
  }

  /**
   * Check if there are unsaved changes
   */
  hasChanges(): boolean {
    return this.modifiedBlocks.size > 0;
  }

  /**
   * Get change summary for UI
   */
  getChangeSummary(): string {
    const added = this.addedBlocks.size;
    const modified = this.modifiedBlocks.size - this.deletedBlocks.size - this.addedBlocks.size;
    const deleted = this.deletedBlocks.size;
    
    const parts = [];
    if (added > 0) parts.push(`${added} added`);
    if (modified > 0) parts.push(`${modified} modified`);
    if (deleted > 0) parts.push(`${deleted} deleted`);
    
    return parts.length > 0 ? parts.join(', ') : 'No changes';
  }

  /**
   * Reset service
   */
  reset(): void {
    this.clearChanges();
    this.originalBlocks.clear();
    this.lastSaveVersion = 0;
    this.projectId = null;
    this.lastFullBackupTime = 0;
  }
}

export default IncrementalBackupService.getInstance();