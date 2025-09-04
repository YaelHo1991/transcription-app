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

  private constructor() {}

  static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
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
    this.currentProjectId = projectId;
    this.currentMediaId = mediaId;
    this.dataCallback = dataCallback;
    
    // Clear existing interval
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    // Set up new interval
    this.autoSaveInterval = setInterval(() => {
      this.checkAndSave();
    }, intervalMs);

    console.log('Auto-save initialized for project ' + projectId + ' media ' + mediaId + ' every ' + intervalMs/1000 + 's');
  }

  /**
   * Stop auto-save
   */
  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    this.currentProjectId = null;
    this.currentMediaId = null;
    this.dataCallback = null;
    console.log('Auto-save stopped');
  }

  /**
   * Mark that changes have been made
   */
  markChanges(): void {
    this.hasChanges = true;
    this.notifyStatusListeners();
  }

  /**
   * Check if backup is needed and perform it
   */
  private async checkAndSave(): Promise<void> {
    // Skip if no changes or already backing up
    if (!this.hasChanges || this.isBackingUp || !this.currentProjectId || !this.currentMediaId) {
      return;
    }

    const timeSinceLastSave = Date.now() - this.lastSaveTime;
    
    // Only save if enough time has passed (60 seconds) and there are changes
    if (timeSinceLastSave >= 60000 && this.hasChanges) {
      // Get the latest data from the editor via callback
      const backupData = this.dataCallback?.();
      if (backupData) {
        await this.createBackup(backupData);
      }
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
    if (this.isBackingUp || !this.currentProjectId || !this.currentMediaId) {
      return;
    }

    this.isBackingUp = true;
    this.lastError = null;
    this.notifyStatusListeners();

    let response: Response | undefined;
    
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous';
      
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
      response = await fetch(
        buildApiUrl(`/api/projects/${this.currentProjectId}/media/${this.currentMediaId}/backup`),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Background-Request': 'true'
          },
          body: JSON.stringify(backupPayload)
        }
      );

      const responseData = await response.json();
      
      if (response.ok && responseData.success) {
        this.lastSaveTime = Date.now();
        this.hasChanges = false;
        this.currentVersion = responseData.version || this.currentVersion + 1;
        console.log('Backup created: v' + this.currentVersion + ' for media ' + this.currentMediaId);
      }
    } catch (error: any) {
      // Handle different error types more gracefully
      if (!response) {
        console.error('Backup failed - network error:', error);
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
        // Log other errors
        console.error('Backup failed:', error);
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
    // In dev mode, always return mock history
    if (DEV_MODE) {
      console.log('DEV MODE: Returning mock backup history');
      return [
        {
          id: 'backup-1',
          version_number: 1,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          blocks_count: 10,
          speakers_count: 2,
          words_count: 250
        },
        {
          id: 'backup-2', 
          version_number: 2,
          created_at: new Date(Date.now() - 1800000).toISOString(),
          blocks_count: 15,
          speakers_count: 3,
          words_count: 450
        }
      ];
    }
    
    try {
      const token = localStorage.getItem('token');
      
      // For development without token, return mock history
      if (!token) {
        return [
          {
            id: 'backup-1',
            version_number: 1,
            created_at: new Date(Date.now() - 3600000).toISOString(),
            blocks_count: 10,
            speakers_count: 2,
            words_count: 250
          },
          {
            id: 'backup-2', 
            version_number: 2,
            created_at: new Date(Date.now() - 1800000).toISOString(),
            blocks_count: 15,
            speakers_count: 3,
            words_count: 450
          }
        ];
      }
      
      const API_URL = getApiUrl();
      const response = await fetch(
        API_URL + '/api/transcription/backups/history/' + transcriptionId + '?' + new URLSearchParams({ limit: limit.toString() }),
        {
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch backup history');
      }
      
      const data = await response.json();
      if (data.success) {
        return data.backups;
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
      
      const API_URL = getApiUrl();
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
      
      const API_URL = getApiUrl();
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
}

export default BackupService.getInstance();