import axios from 'axios';
import { buildApiUrl } from '@/utils/api';

// Development mode flag - automatically set based on environment
const DEV_MODE = process.env.NODE_ENV === 'development';
console.log('BackupService: DEV_MODE is', DEV_MODE);

export interface BackupData {
  blocks: Array<{
    id: string;
    text: string;
    speaker?: string;
    timestamp?: string;
    startTime?: number;
    endTime?: number;
  }>;
  speakers: Array<{
    id: string;
    code: string;
    name: string;
    description?: string;
    color?: string;
    count?: number;
  }>;
  remarks?: Array<{
    id: string;
    text: string;
    blockId: string;
    timestamp: string;
  }>;
  metadata?: {
    mediaId: string;
    fileName: string;
    originalName: string;
    version?: number;
    savedAt?: string;
    autoSave?: boolean;
  };
}

export interface BackupStatus {
  lastBackup: Date | null;
  version: number;
  isBackingUp: boolean;
  hasChanges: boolean;
  error: string | null;
}

export interface BackupHistoryItem {
  id: string;
  version_number: number;
  created_at: string;
  file_size?: number;
  blocks_count?: number;
  speakers_count?: number;
  words_count?: number;
  change_summary?: string;
}

class BackupService {
  private static instance: BackupService;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private lastSaveTime: number = Date.now();
  private hasChanges: boolean = false;
  private isBackingUp: boolean = false;
  private currentProjectId: string | null = null;
  private currentMediaId: string | null = null;
  private statusListeners: Set<(status: BackupStatus) => void> = new Set();
  private currentVersion: number = 0;
  private lastError: string | null = null;
  private dataCallback: (() => BackupData) | null = null;
  private lastContentHash: string | null = null;
  private isTransitioning: boolean = false;
  private transitionTimeout: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  /**
   * Start auto-save with interval
   */
  startAutoSave(
    projectId: string,
    mediaId: string,
    dataCallback: () => BackupData,
    intervalMs: number = 120000 // Default 2 minutes
  ): void {
    console.log('[BackupService] Starting auto-save:', {
      projectId,
      mediaId,
      interval: intervalMs
    });

    // Stop existing auto-save if media has changed
    if (this.currentMediaId && this.currentMediaId !== mediaId) {
      console.log('[BackupService] Media changed, stopping previous auto-save');
      this.stopAutoSave();
    }

    // Set transition flag to prevent any backup operations during setup
    this.isTransitioning = true;
    console.log('[BackupService] 🚧 Setting transition flag - no backups allowed');

    // Clear any existing transition timeout
    if (this.transitionTimeout) {
      clearTimeout(this.transitionTimeout);
    }

    this.currentProjectId = projectId;
    this.currentMediaId = mediaId;
    this.dataCallback = dataCallback;

    // IMPORTANT: Reset content hash when switching media to ensure first save happens
    this.lastContentHash = null;
    // Reset last save time to allow immediate backups for the new media
    this.lastSaveTime = 0; // Set to 0 so the first change triggers a backup after the interval
    console.log('[BackupService] Content hash and save timer reset for new media:', mediaId);

    // Clear existing interval
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    // Set up new interval
    this.autoSaveInterval = setInterval(() => {
      console.log('[BackupService] ⏰ Interval triggered - calling checkAndSave');
      this.checkAndSave();
    }, intervalMs);

    // Clear transition flag after a safe delay to allow media switching to complete
    this.transitionTimeout = setTimeout(() => {
      this.isTransitioning = false;
      console.log('[BackupService] ✅ Transition period ended - backups now allowed');
    }, 2000); // 2 second safety delay

    console.log('[BackupService] ✅ Auto-save initialized:', {
      projectId,
      mediaId,
      intervalMs: intervalMs/1000 + 's',
      hasInterval: !!this.autoSaveInterval
    });
  }

  /**
   * Stop auto-save
   */
  stopAutoSave(): void {
    console.log('[BackupService] Stopping auto-save for:', {
      projectId: this.currentProjectId,
      mediaId: this.currentMediaId
    });

    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }

    // Clear transition timeout if exists
    if (this.transitionTimeout) {
      clearTimeout(this.transitionTimeout);
      this.transitionTimeout = null;
    }

    // Reset flags
    this.isTransitioning = false;
    this.hasChanges = false;
    this.dataCallback = null;
  }

  /**
   * Track that changes have been made
   */
  trackChanges(): void {
    this.hasChanges = true;
    console.log('[BackupService] Changes tracked, will backup in next check cycle');
  }

  /**
   * Check and save if needed
   */
  private async checkAndSave(): Promise<void> {
    console.log('[BackupService] === CHECKING FOR BACKUP ===');

    // CRITICAL: Block during media transition
    if (this.isTransitioning) {
      console.log('[BackupService] 🚧 Skipping check - media transition in progress');
      return;
    }

    if (!this.currentProjectId || !this.currentMediaId) {
      console.log('[BackupService] ⚠️ Missing project/media ID:', {
        currentProjectId: this.currentProjectId,
        currentMediaId: this.currentMediaId,
        noProjectId: !this.currentProjectId,
        noMediaId: !this.currentMediaId
      });
      return;
    }

    const timeSinceLastSave = Date.now() - this.lastSaveTime;
    console.log('[BackupService] Check conditions:', {
      projectId: this.currentProjectId,
      mediaId: this.currentMediaId,
      hasChanges: this.hasChanges,
      timeSinceLastSave: Math.round(timeSinceLastSave / 1000) + 's',
      needsMoreTime: timeSinceLastSave < 60000 ? Math.round((60000 - timeSinceLastSave) / 1000) + 's' : 'ready'
    });

    // Only save if enough time has passed (60 seconds) and there are changes
    if (timeSinceLastSave >= 60000 && this.hasChanges) {
      console.log('[BackupService] ✅ Creating backup - 60 seconds passed with changes');
      // Get the latest data from the editor via callback
      const backupData = this.dataCallback?.();
      if (backupData) {
        console.log('[BackupService] Got backup data from callback, proceeding with backup');
        await this.createBackup(backupData);
      } else {
        console.log('[BackupService] ⚠️ No backup data returned from callback!');
      }
    } else {
      console.log('[BackupService] ⏳ Not backing up yet', {
        timeSinceLastSave,
        needsMoreTime: 60000 - timeSinceLastSave,
        hasChanges: this.hasChanges
      });
    }
  }

  /**
   * Generate a simple hash of the content for comparison
   */
  private generateContentHash(data: BackupData): string {
    // Create a string representation of important content
    const contentString = JSON.stringify({
      blocks: data.blocks.map(b => ({
        text: b.text,
        speaker: b.speaker,
        timestamp: b.timestamp
      })),
      speakers: data.speakers.map(s => ({
        code: s.code,
        name: s.name,
        description: s.description
      })),
      remarks: data.remarks
    });

    // Simple hash function (not cryptographic, just for comparison)
    let hash = 0;
    for (let i = 0; i < contentString.length; i++) {
      const char = contentString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Initialize auto-save for a project/media
   */
  initAutoSave(
    projectId: string,
    mediaId: string,
    dataCallback: () => BackupData,
    intervalMs: number = 60000 // 1 minute default
  ): void {
    // CRITICAL: Stop any existing auto-save first to prevent cross-contamination
    console.log('[BackupService] === INIT AUTO-SAVE ===');
    console.log('[BackupService] New IDs:', { projectId, mediaId });
    console.log('[BackupService] Previous IDs:', {
      prevProjectId: this.currentProjectId,
      prevMediaId: this.currentMediaId
    });
    console.log('[BackupService] Media ID format:', {
      isUUID: mediaId?.includes('-') && mediaId.length > 20,
      isNumbered: mediaId?.match(/^media-\d+$/),
      actual: mediaId
    });
    
    // Stop existing auto-save if media has changed
    if (this.currentMediaId && this.currentMediaId !== mediaId) {
      console.log('[BackupService] Media changed, stopping previous auto-save');
      this.stopAutoSave();
    }

    // Set transition flag to prevent any backup operations during setup
    this.isTransitioning = true;
    console.log('[BackupService] 🚧 Setting transition flag - no backups allowed');

    // Clear any existing transition timeout
    if (this.transitionTimeout) {
      clearTimeout(this.transitionTimeout);
    }

    this.currentProjectId = projectId;
    this.currentMediaId = mediaId;
    this.dataCallback = dataCallback;

    // IMPORTANT: Reset content hash when switching media to ensure first save happens
    this.lastContentHash = null;
    // Reset last save time to allow immediate backups for the new media
    this.lastSaveTime = 0; // Set to 0 so the first change triggers a backup after the interval
    console.log('[BackupService] Content hash and save timer reset for new media:', mediaId);

    // Clear existing interval
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    // Set up new interval
    this.autoSaveInterval = setInterval(() => {
      console.log('[BackupService] ⏰ Interval triggered - calling checkAndSave');
      this.checkAndSave();
    }, intervalMs);

    // Clear transition flag after a safe delay to allow media switching to complete
    this.transitionTimeout = setTimeout(() => {
      this.isTransitioning = false;
      console.log('[BackupService] ✅ Transition period ended - backups now allowed');
    }, 2000); // 2 second safety delay

    console.log('[BackupService] ✅ Auto-save initialized:', {
      projectId,
      mediaId,
      intervalMs: intervalMs/1000 + 's',
      hasInterval: !!this.autoSaveInterval
    });
  }

  /**
   * Stop auto-save
   */
  stopAutoSave(): void {
    console.log('[BackupService] Stopping auto-save for:', {
      projectId: this.currentProjectId,
      mediaId: this.currentMediaId
    });

    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }

    // Clear transition timeout
    if (this.transitionTimeout) {
      clearTimeout(this.transitionTimeout);
      this.transitionTimeout = null;
    }

    // Set transition flag to prevent any lingering backup operations
    this.isTransitioning = true;
    console.log('[BackupService] 🚧 Stop auto-save - setting transition flag');

    // Clear all references to prevent stale data
    this.currentProjectId = null;
    this.currentMediaId = null;
    this.dataCallback = null;
    this.hasChanges = false;
    this.isBackingUp = false;
    this.lastContentHash = null; // Clear the content hash when stopping

    console.log('[BackupService] Auto-save stopped and references cleared');
  }

  /**
   * Mark that changes have been made
   */
  markChanges(): void {
    console.log('[BackupService] === MARK CHANGES ===');
    console.log('[BackupService] Current state:', {
      hasChanges: this.hasChanges,
      currentProjectId: this.currentProjectId,
      currentMediaId: this.currentMediaId,
      autoSaveInterval: !!this.autoSaveInterval,
      timeSinceLastSave: Date.now() - this.lastSaveTime
    });
    this.hasChanges = true;
    this.notifyStatusListeners();
  }

  /**
   * Check if backup is needed and perform it
   */
  private async checkAndSave(): Promise<void> {
    console.log('[BackupService] === CHECK AND SAVE (60s interval) ===');
    console.log('[BackupService] Conditions:', {
      hasChanges: this.hasChanges,
      isBackingUp: this.isBackingUp,
      projectId: this.currentProjectId,
      mediaId: this.currentMediaId,
      hasDataCallback: !!this.dataCallback,
      timeSinceLastSave: Date.now() - this.lastSaveTime,
      timeUntilBackup: Math.max(0, 60000 - (Date.now() - this.lastSaveTime))
    });
    
    // Skip if no changes or already backing up
    if (!this.hasChanges || this.isBackingUp || !this.currentProjectId || !this.currentMediaId) {
      console.log('[BackupService] Skipping backup - conditions not met:', {
        noChanges: !this.hasChanges,
        alreadyBackingUp: this.isBackingUp,
        noProjectId: !this.currentProjectId,
        noMediaId: !this.currentMediaId
      });
      return;
    }

    const timeSinceLastSave = Date.now() - this.lastSaveTime;
    
    // Only save if enough time has passed (60 seconds) and there are changes
    if (timeSinceLastSave >= 60000 && this.hasChanges) {
      console.log('[BackupService] ✅ Creating backup - 60 seconds passed with changes');
      // Get the latest data from the editor via callback
      const backupData = this.dataCallback?.();
      if (backupData) {
        console.log('[BackupService] Got backup data from callback, proceeding with backup');
        await this.createBackup(backupData);
      } else {
        console.log('[BackupService] ⚠️ No backup data returned from callback!');
      }
    } else {
      console.log('[BackupService] ⏳ Not backing up yet', {
        timeSinceLastSave,
        needsMoreTime: 60000 - timeSinceLastSave,
        hasChanges: this.hasChanges
      });
    }
  }

  /**
   * Force an immediate backup
   */
  async forceBackup(data: BackupData): Promise<void> {
    if (!this.currentProjectId || !this.currentMediaId) {
      throw new Error('No project or media ID set');
    }
    await this.createBackup(data);
  }

  /**
   * Create a backup
   */
  private async createBackup(data: BackupData): Promise<void> {
    // CRITICAL: Check transition flag first - completely block during media switching
    if (this.isTransitioning) {
      console.log('[BackupService] 🚧 BLOCKED: Backup attempt during media transition - REJECTED');
      return;
    }

    if (this.isBackingUp || !this.currentProjectId || !this.currentMediaId) {
      return;
    }

    // CRITICAL: Validate media ID consistency before backup
    console.log('[BackupService] 🔍 Pre-backup validation:', {
      dataMediaId: data.metadata?.mediaId,
      currentMediaId: this.currentMediaId,
      projectId: this.currentProjectId,
      hasMetadata: !!data.metadata,
      callStack: new Error().stack?.split('\n').slice(0, 3).join('\n')
    });

    // Ensure we have metadata
    if (!data.metadata) {
      console.error('[BackupService] ❌ CRITICAL: No metadata in backup data!');
      return;
    }

    // Ensure we have required IDs
    if (!this.currentMediaId || !this.currentProjectId) {
      console.error('[BackupService] ❌ CRITICAL: Missing current media/project ID!', {
        currentMediaId: this.currentMediaId,
        currentProjectId: this.currentProjectId
      });
      return;
    }

    // Validate that the data's mediaId matches our current mediaId
    if (data.metadata.mediaId !== this.currentMediaId) {
      console.error('[BackupService] ❌ CRITICAL: Media ID mismatch - BLOCKING BACKUP!', JSON.stringify({
        dataMediaId: data.metadata.mediaId,
        currentMediaId: this.currentMediaId,
        projectId: this.currentProjectId,
        dataProjectId: this.currentProjectId,
        action: 'BLOCKED - No backup created'
      }, null, 2));

      // CRITICAL: Completely block this backup operation - do not throw error, just return
      console.error('[BackupService] 🚫 BACKUP BLOCKED: Cross-contamination prevented');
      this.lastError = `Media ID mismatch: Expected ${this.currentMediaId}, got ${data.metadata.mediaId}`;
      this.notifyStatusListeners();
      return;
    }

    // Check if content has actually changed using hash comparison
    const currentHash = this.generateContentHash(data);
    console.log('[BackupService] 🔐 Content hash comparison:', {
      currentHash: currentHash.substring(0, 8) + '...',
      lastHash: this.lastContentHash ? this.lastContentHash.substring(0, 8) + '...' : 'none',
      isMatch: this.lastContentHash === currentHash,
      mediaId: this.currentMediaId
    });

    if (this.lastContentHash && currentHash === this.lastContentHash) {
      console.log('[BackupService] ⏭️ DUPLICATE PREVENTED - Content unchanged (hash match)');
      console.log('[BackupService] Media:', this.currentMediaId, '- No new version created');
      this.hasChanges = false; // Reset the flag since content hasn't changed
      this.lastSaveTime = Date.now(); // Update time to prevent repeated checks
      return;
    }

    // Check if we have a valid token
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    if (!token) {
      console.warn('[BackupService] No authentication token found, skipping backup');
      return;
    }

    console.log('[BackupService] Creating backup for:', {
      projectId: this.currentProjectId,
      mediaId: this.currentMediaId,
      blocksCount: data.blocks?.length || 0,
      speakersCount: data.speakers?.length || 0
    });

    this.isBackingUp = true;
    this.lastError = null;
    this.notifyStatusListeners();

    let response: Response | undefined;

    try {
      // Add metadata to the backup data
      const backupPayload = {
        ...data,
        metadata: {
          ...data.metadata,
          mediaId: this.currentMediaId,
          version: this.currentVersion + 1,
          savedAt: new Date().toISOString(),
          autoSave: true
        }
      };

      // Use project backup endpoint with fetch instead of axios to avoid interceptor conflicts
      const url = buildApiUrl(`/api/projects/${this.currentProjectId}/media/${this.currentMediaId}/backup`);

      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Background-Request': 'true'
        },
        body: JSON.stringify(backupPayload)
      }).catch(error => {
        // Network error or other fetch failures - log but don't throw to console
        console.warn('[BackupService] Network error during backup (will retry):', error.message);
        this.lastError = error.message || 'Network error';
        return null;
      });

      if (!response) {
        // Network error occurred, already logged
        return;
      }

      const responseData = await response.json();
      
      if (response.ok && responseData.success) {
        this.lastSaveTime = Date.now();
        this.hasChanges = false;
        this.currentVersion = responseData.version || this.currentVersion + 1;
        this.lastContentHash = currentHash; // Store the hash of successfully backed up content
        console.log('Backup created: v' + this.currentVersion + ' for media ' + this.currentMediaId + ' (hash: ' + currentHash + ')');
      }
    } catch (error: any) {
      // Handle different error types more gracefully
      if (!response) {
        // Network error already handled in the fetch().catch() above
        this.lastError = 'Network error';
      } else if (response.status === 400) {
        // 400 errors are expected when project/media isn't ready yet
        // Don't log these to console to avoid noise
        this.lastError = 'Waiting for valid project/media';
      } else if (response.status === 401) {
        // Authentication error - token might be expired
        this.lastError = 'Authentication required';
        console.warn('Backup authentication failed - token may be expired');
      } else {
        // Log other errors at warning level to avoid console errors
        console.warn('[BackupService] Backup failed (will retry):', error.message || 'Unknown error');
        this.lastError = error.message || 'Backup failed';
      }
      
      // In development, still mark as saved to prevent constant retries
      if (process.env.NODE_ENV === 'development' && response?.status !== 401) {
        this.lastSaveTime = Date.now();
        this.hasChanges = false;
        this.currentVersion++;
        // Only log if it's not a 400 error
        if (response?.status !== 400) {
          console.log('Dev mode: Marked as saved despite error');
        }
      }
    } finally {
      this.isBackingUp = false;
      this.notifyStatusListeners();
    }
  }

  /**
   * Get backup history
   */
  async getBackupHistory(
    transcriptionId: string,
    limit: number = 50
  ): Promise<BackupHistoryItem[]> {
    // We need both projectId and mediaId to fetch backups
    if (!this.currentProjectId || !this.currentMediaId) {
      console.log('[BackupService] Cannot fetch backup history - no project/media ID set');
      return [];
    }

    try {
      const token = localStorage.getItem('token');

      // For development without token, return empty array
      if (!token) {
        console.log('[BackupService] No token, returning empty backup history');
        return [];
      }

      const API_URL = buildApiUrl('').replace('/api', '');
      // Use the correct endpoint: /api/projects/:projectId/media/:mediaId/backups
      const response = await fetch(
        `${API_URL}/api/projects/${this.currentProjectId}/media/${this.currentMediaId}/backups`,
        {
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        console.error('[BackupService] Failed to fetch backup history:', response.status);
        throw new Error('Failed to fetch backup history');
      }

      const data = await response.json();
      console.log('[BackupService] Received backup history:', data);

      if (data.success && data.backups) {
        // Transform backend response to match our interface
        return data.backups.map((backup: any) => ({
          id: backup.file,
          version_number: backup.version,
          created_at: backup.timestamp,
          blocks_count: backup.blocks || 0,
          speakers_count: backup.speakers || 0,
          words_count: backup.words || 0,
          remarks_count: backup.remarks || 0
        }));
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch backup history:', error);
      return [];
    }
  }

  /**
   * Preview a backup
   */
  async previewBackup(backupId: string): Promise<any> {
    // In dev mode, return mock preview
    if (DEV_MODE) {
      console.log('DEV MODE: Returning mock backup preview');
      return {
        version: 1,
        date: new Date(),
        blocks: [],
        speakers: []
      };
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return null;
      }
      
      const API_URL = buildApiUrl('').replace('/api', '');
      const response = await fetch(
        API_URL + '/api/transcription/backups/preview/' + backupId,
        {
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to preview backup');
      }
      
      const data = await response.json();
      if (data.success) {
        return data.content;
      }
      return null;
    } catch (error) {
      console.error('Failed to preview backup:', error);
      return null;
    }
  }

  /**
   * Restore from a backup
   */
  async restoreBackup(backupId: string): Promise<any> {
    // In dev mode, simulate restore
    if (DEV_MODE) {
      console.log('DEV MODE: Simulating backup restore');
      this.currentVersion = this.currentVersion + 1;
      this.hasChanges = false;
      this.lastSaveTime = Date.now();
      this.notifyStatusListeners();
      return {
        version: this.currentVersion,
        blocks: [],
        speakers: []
      };
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return null;
      }
      
      const API_URL = buildApiUrl('').replace('/api', '');
      const response = await fetch(
        API_URL + '/api/transcription/backups/restore/' + backupId,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          body: '{}'
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to restore backup');
      }
      
      const data = await response.json();
      if (data.success) {
        this.currentVersion = data.content.version;
        this.hasChanges = false;
        this.lastSaveTime = Date.now();
        this.notifyStatusListeners();
        return data.content;
      }
      return null;
    } catch (error) {
      console.error('Failed to restore backup:', error);
      return null;
    }
  }

  /**
   * Register a status listener
   */
  onStatusChange(listener: (status: BackupStatus) => void): () => void {
    this.statusListeners.add(listener);
    // Return unsubscribe function
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  /**
   * Get current backup status
   */
  getStatus(): BackupStatus {
    return {
      lastBackup: this.lastSaveTime ? new Date(this.lastSaveTime) : null,
      version: this.currentVersion,
      isBackingUp: this.isBackingUp,
      hasChanges: this.hasChanges,
      error: this.lastError
    };
  }

  /**
   * Notify all status listeners
   */
  private notifyStatusListeners(): void {
    const status = this.getStatus();
    this.statusListeners.forEach(listener => listener(status));
  }

  // Callback to get data from editor

  /**
   * Start auto-save for a project/media
   */
  startAutoSave(
    projectId: string,
    mediaId: string,
    dataCallback: () => BackupData,
    intervalMs: number = 120000
  ): void {
    // Generate temporary IDs if missing (for internet projects)
    const effectiveProjectId = projectId || 'internet-project-' + Date.now();
    const effectiveMediaId = mediaId || 'internet-media-' + Date.now();

    console.log('[BackupService] Starting auto-save with params:', {
      originalProjectId: projectId,
      originalMediaId: mediaId,
      effectiveProjectId,
      effectiveMediaId,
      intervalMs
    });

    // Store the current configuration with effective IDs
    this.currentProjectId = effectiveProjectId;
    this.currentMediaId = effectiveMediaId;
    this.dataCallback = dataCallback;

    // Reset content hash and save timer for new media
    this.lastContentHash = null;
    this.lastSaveTime = 0;

    // Clear any existing interval
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    // Set up interval to check every intervalMs
    this.autoSaveInterval = setInterval(() => {
      this.checkAndSave();
    }, intervalMs);

    console.log('[BackupService] Auto-save started for', effectiveProjectId, '/', effectiveMediaId);
  }

  /**
   * Track that changes have been made (alias for markChanges)
   */
  trackChanges(): void {
    this.hasChanges = true;
    console.log('[BackupService] Changes tracked, will backup in next check cycle');
  }
}

export default BackupService.getInstance();