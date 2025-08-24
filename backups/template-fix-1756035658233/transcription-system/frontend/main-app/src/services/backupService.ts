import axios from 'axios';

// Development mode flag - set to true to bypass all authentication
const DEV_MODE = true;
console.log('BackupService: DEV_MODE is', DEV_MODE);

export interface BackupData {
  blocks: Array<{
    id: string;
    text: string;
    speaker?: string;
    timestamp?: string;
  }>;
  speakers: Array<{
    code: string;
    name: string;
    description?: string;
  }>;
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
  private currentTranscriptionId: string | null = null;
  private statusListeners: Set<(status: BackupStatus) => void> = new Set();
  private currentVersion: number = 0;
  private lastError: string | null = null;

  private constructor() {}

  static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  /**
   * Initialize auto-save for a transcription
   */
  initAutoSave(
    transcriptionId: string,
    intervalMs: number = 60000 // 1 minute default
  ): void {
    this.currentTranscriptionId = transcriptionId;
    
    // Clear existing interval
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    // Set up new interval
    this.autoSaveInterval = setInterval(() => {
      this.checkAndSave();
    }, intervalMs);

    console.log(`Auto-save initialized for transcription ${transcriptionId} every ${intervalMs/1000}s`);
  }

  /**
   * Stop auto-save
   */
  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    this.currentTranscriptionId = null;
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
    // Always check DEV_MODE first
    if (DEV_MODE) {
      console.log('DEV MODE: Skipping auto-save check');
      if (this.hasChanges) {
        this.hasChanges = false;
        this.lastSaveTime = Date.now();
        this.currentVersion++;
        this.notifyStatusListeners();
      }
      return;
    }
    
    if (!this.hasChanges || this.isBackingUp || !this.currentTranscriptionId) {
      return;
    }

    const timeSinceLastSave = Date.now() - this.lastSaveTime;
    
    // Only save if enough time has passed and there are changes
    if (timeSinceLastSave >= 60000 && this.hasChanges) {
      // Get the latest data from the editor
      const backupData = this.getBackupDataCallback?.();
      if (backupData) {
        await this.createBackup(backupData);
      }
    }
  }

  /**
   * Force an immediate backup
   */
  async forceBackup(data: BackupData): Promise<void> {
    if (!this.currentTranscriptionId) {
      throw new Error('No transcription ID set');
    }
    await this.createBackup(data);
  }

  /**
   * Create a backup
   */
  private async createBackup(data: BackupData): Promise<void> {
    if (this.isBackingUp || !this.currentTranscriptionId) {
      return;
    }

    this.isBackingUp = true;
    this.lastError = null;
    this.notifyStatusListeners();

    // In dev mode, always simulate backup
    if (DEV_MODE) {
      console.log('DEV MODE: Simulating backup for', this.currentTranscriptionId);
      setTimeout(() => {
        this.lastSaveTime = Date.now();
        this.hasChanges = false;
        this.currentVersion = this.currentVersion + 1;
        this.isBackingUp = false;
        this.notifyStatusListeners();
        console.log(`DEV MODE backup simulated: v${this.currentVersion}`);
      }, 500);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      // For development without token, simulate backup
      if (!token) {
        console.log('No token: Simulating backup for', this.currentTranscriptionId);
        setTimeout(() => {
          this.lastSaveTime = Date.now();
          this.hasChanges = false;
          this.currentVersion = this.currentVersion + 1;
          this.isBackingUp = false;
          this.notifyStatusListeners();
          console.log(`No token backup simulated: v${this.currentVersion}`);
        }, 500);
        return;
      }
      
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/transcription/backups/trigger/${this.currentTranscriptionId}`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        this.lastSaveTime = Date.now();
        this.hasChanges = false;
        this.currentVersion = response.data.version;
        console.log(`Backup created: v${response.data.version}`);
      }
    } catch (error: any) {
      console.error('Backup failed:', error);
      this.lastError = error.response?.data?.error || 'Backup failed';
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
      
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/transcription/backups/history/${transcriptionId}`,
        {
          params: { limit },
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        return response.data.backups;
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
      
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/transcription/backups/preview/${backupId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        return response.data.content;
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
      
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/transcription/backups/restore/${backupId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        this.currentVersion = response.data.content.version;
        this.hasChanges = false;
        this.lastSaveTime = Date.now();
        this.notifyStatusListeners();
        return response.data.content;
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
  private getBackupDataCallback: (() => BackupData | null) | null = null;

  /**
   * Set the callback to get data from the editor
   */
  setDataCallback(callback: () => BackupData | null): void {
    this.getBackupDataCallback = callback;
  }
}

export default BackupService.getInstance();