import axios from 'axios';

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

    try {
      const token = localStorage.getItem('token');
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
    try {
      const token = localStorage.getItem('token');
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
    try {
      const token = localStorage.getItem('token');
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
    try {
      const token = localStorage.getItem('token');
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