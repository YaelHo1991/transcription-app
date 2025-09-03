/**
 * IndexedDB Service for Large Document Storage
 * Replaces localStorage with unlimited storage capacity
 */

interface DBSchema {
  transcriptions: {
    id: string;
    projectId: string;
    blocks: any[];
    speakers: any[];
    remarks: any[];
    timestamp: number;
    version: number;
  };
  backups: {
    id: string;
    projectId: string;
    version: number;
    data: any;
    timestamp: number;
  };
  metadata: {
    id: string;
    projectId: string;
    lastModified: number;
    blockCount: number;
    speakerCount: number;
    remarkCount: number;
  };
}

class IndexedDBService {
  private static instance: IndexedDBService;
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'TranscriptionDB';
  private readonly DB_VERSION = 1;
  
  private constructor() {}

  static getInstance(): IndexedDBService {
    if (!IndexedDBService.instance) {
      IndexedDBService.instance = new IndexedDBService();
    }
    return IndexedDBService.instance;
  }

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve();
        return;
      }

      if (!window.indexedDB) {
        console.error('[IndexedDB] Not supported in this browser');
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('[IndexedDB] Failed to open database');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[IndexedDB] Database opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('transcriptions')) {
          const transcriptionStore = db.createObjectStore('transcriptions', { 
            keyPath: 'id' 
          });
          transcriptionStore.createIndex('projectId', 'projectId', { unique: false });
          transcriptionStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('backups')) {
          const backupStore = db.createObjectStore('backups', { 
            keyPath: 'id' 
          });
          backupStore.createIndex('projectId', 'projectId', { unique: false });
          backupStore.createIndex('version', 'version', { unique: false });
        }

        if (!db.objectStoreNames.contains('metadata')) {
          const metadataStore = db.createObjectStore('metadata', { 
            keyPath: 'id' 
          });
          metadataStore.createIndex('projectId', 'projectId', { unique: true });
        }

        console.log('[IndexedDB] Database schema created');
      };
    });
  }

  /**
   * Save transcription data
   */
  async saveTranscription(
    projectId: string, 
    blocks: any[], 
    speakers: any[] = [], 
    remarks: any[] = []
  ): Promise<boolean> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['transcriptions', 'metadata'], 'readwrite');
      const transcriptionStore = transaction.objectStore('transcriptions');
      const metadataStore = transaction.objectStore('metadata');

      const transcriptionData = {
        id: projectId + '_' + Date.now(),
        projectId,
        blocks,
        speakers,
        remarks,
        timestamp: Date.now(),
        version: 1
      };

      const metadataData = {
        id: projectId,
        projectId,
        lastModified: Date.now(),
        blockCount: blocks.length,
        speakerCount: speakers.length,
        remarkCount: remarks.length
      };

      // Save transcription
      const transcriptionRequest = transcriptionStore.put(transcriptionData);
      
      // Update metadata
      const metadataRequest = metadataStore.put(metadataData);

      transaction.oncomplete = () => {
        console.log('[IndexedDB] Saved transcription for project ' + projectId);
        console.log('[IndexedDB] Stats: ' + blocks.length + ' blocks, ' + speakers.length + ' speakers, ' + remarks.length + ' remarks');
        resolve(true);
      };

      transaction.onerror = () => {
        console.error('[IndexedDB] Save transaction failed:', transaction.error);
        reject(transaction.error);
      };
    });
  }

  /**
   * Load transcription data
   */
  async loadTranscription(projectId: string): Promise<any | null> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['transcriptions'], 'readonly');
      const store = transaction.objectStore('transcriptions');
      const index = store.index('projectId');
      
      // Get the most recent transcription for this project
      const request = index.openCursor(IDBKeyRange.only(projectId), 'prev');
      
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const data = cursor.value;
          console.log('[IndexedDB] Loaded transcription for project ' + projectId);
          console.log('[IndexedDB] Stats: ' + data.blocks.length + ' blocks, ' + data.speakers.length + ' speakers');
          resolve({
            blocks: data.blocks,
            speakers: data.speakers,
            remarks: data.remarks,
            version: data.version
          });
        } else {
          console.log('[IndexedDB] No transcription found for project ' + projectId);
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('[IndexedDB] Load failed:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Create backup
   */
  async createBackup(projectId: string, data: any, version: number): Promise<boolean> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['backups'], 'readwrite');
      const store = transaction.objectStore('backups');

      const backupData = {
        id: projectId + '_v' + version + '_' + Date.now(),
        projectId,
        version,
        data,
        timestamp: Date.now()
      };

      const request = store.add(backupData);

      request.onsuccess = () => {
        console.log('[IndexedDB] Created backup v' + version + ' for project ' + projectId);
        resolve(true);
      };

      request.onerror = () => {
        console.error('[IndexedDB] Backup failed:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all backups for a project
   */
  async getBackups(projectId: string): Promise<any[]> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['backups'], 'readonly');
      const store = transaction.objectStore('backups');
      const index = store.index('projectId');
      
      const request = index.getAll(projectId);
      
      request.onsuccess = () => {
        const backups = request.result || [];
        console.log('[IndexedDB] Found ' + backups.length + ' backups for project ' + projectId);
        resolve(backups.sort((a, b) => b.timestamp - a.timestamp));
      };

      request.onerror = () => {
        console.error('[IndexedDB] Failed to get backups:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear old data (cleanup)
   */
  async clearOldData(daysToKeep: number = 30): Promise<number> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
      let deletedCount = 0;

      const transaction = this.db.transaction(['transcriptions', 'backups'], 'readwrite');
      
      // Clear old transcriptions
      const transcriptionStore = transaction.objectStore('transcriptions');
      const transcriptionIndex = transcriptionStore.index('timestamp');
      const transcriptionRequest = transcriptionIndex.openCursor(IDBKeyRange.upperBound(cutoffTime));
      
      transcriptionRequest.onsuccess = () => {
        const cursor = transcriptionRequest.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        }
      };

      // Clear old backups
      const backupStore = transaction.objectStore('backups');
      const backupRequest = backupStore.openCursor();
      
      backupRequest.onsuccess = () => {
        const cursor = backupRequest.result;
        if (cursor) {
          if (cursor.value.timestamp < cutoffTime) {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        }
      };

      transaction.oncomplete = () => {
        console.log('[IndexedDB] Cleaned up ' + deletedCount + ' old records');
        resolve(deletedCount);
      };

      transaction.onerror = () => {
        console.error('[IndexedDB] Cleanup failed:', transaction.error);
        reject(transaction.error);
      };
    });
  }

  /**
   * Get storage estimate
   */
  async getStorageInfo(): Promise<{ usage: number; quota: number; percent: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percent = quota > 0 ? (usage / quota) * 100 : 0;
      
      console.log('[IndexedDB] Storage: ' + (usage / 1024 / 1024).toFixed(2) + 'MB / ' + (quota / 1024 / 1024).toFixed(2) + 'MB (' + percent.toFixed(2) + '%)');
      
      return { usage, quota, percent };
    }
    
    return { usage: 0, quota: 0, percent: 0 };
  }

  /**
   * Migrate from localStorage
   */
  async migrateFromLocalStorage(): Promise<boolean> {
    try {
      const keys = Object.keys(localStorage);
      let migratedCount = 0;

      for (const key of keys) {
        if (key.startsWith('transcription_') || key.startsWith('project_')) {
          const data = localStorage.getItem(key);
          if (data) {
            try {
              const parsed = JSON.parse(data);
              if (parsed.blocks && Array.isArray(parsed.blocks)) {
                // Extract project ID from key
                const projectId = key.replace(/^(transcription_|project_)/, '');
                
                // Save to IndexedDB
                await this.saveTranscription(
                  projectId,
                  parsed.blocks,
                  parsed.speakers || [],
                  parsed.remarks || []
                );
                
                // Remove from localStorage after successful migration
                localStorage.removeItem(key);
                migratedCount++;
              }
            } catch (e) {
              console.error('[IndexedDB] Failed to migrate ' + key + ':', e);
            }
          }
        }
      }

      console.log('[IndexedDB] Migrated ' + migratedCount + ' items from localStorage');
      return true;
    } catch (error) {
      console.error('[IndexedDB] Migration failed:', error);
      return false;
    }
  }

  /**
   * Check if IndexedDB is available and working
   */
  async isAvailable(): Promise<boolean> {
    try {
      if (!window.indexedDB) {
        return false;
      }
      
      await this.init();
      return this.db !== null;
    } catch {
      return false;
    }
  }

  /**
   * Delete all data for a specific project
   */
  async deleteProjectData(projectId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(
        ['transcriptions', 'backups', 'metadata'], 
        'readwrite'
      );

      let deletedCount = 0;

      // Delete from transcriptions
      const transcriptionStore = transaction.objectStore('transcriptions');
      const transcriptionIndex = transcriptionStore.index('projectId');
      const transcriptionRequest = transcriptionIndex.openCursor(IDBKeyRange.only(projectId));
      
      transcriptionRequest.onsuccess = () => {
        const cursor = transcriptionRequest.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        }
      };

      // Delete from backups
      const backupStore = transaction.objectStore('backups');
      const backupIndex = backupStore.index('projectId');
      const backupRequest = backupIndex.openCursor(IDBKeyRange.only(projectId));
      
      backupRequest.onsuccess = () => {
        const cursor = backupRequest.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        }
      };

      // Delete from metadata
      const metadataStore = transaction.objectStore('metadata');
      const metadataIndex = metadataStore.index('projectId');
      const metadataRequest = metadataIndex.openCursor(IDBKeyRange.only(projectId));
      
      metadataRequest.onsuccess = () => {
        const cursor = metadataRequest.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        }
      };

      transaction.oncomplete = () => {
        console.log('[IndexedDB] Deleted ' + deletedCount + ' records for project:', projectId);
        resolve();
      };

      transaction.onerror = () => {
        console.error('[IndexedDB] Failed to delete project data:', transaction.error);
        reject(transaction.error);
      };
    });
  }

  /**
   * Delete all data for a specific media within a project
   */
  async deleteMediaData(projectId: string, mediaId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const combinedId = projectId + '_' + mediaId;
      const transaction = this.db.transaction(
        ['transcriptions', 'backups', 'metadata'], 
        'readwrite'
      );

      let deletedCount = 0;

      // Delete specific transcription
      const transcriptionStore = transaction.objectStore('transcriptions');
      const transcriptionRequest = transcriptionStore.delete(combinedId);
      
      transcriptionRequest.onsuccess = () => {
        deletedCount++;
      };

      // Delete backups for this media
      const backupStore = transaction.objectStore('backups');
      const backupIndex = backupStore.index('projectId');
      const backupRequest = backupIndex.openCursor(IDBKeyRange.only(combinedId));
      
      backupRequest.onsuccess = () => {
        const cursor = backupRequest.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        }
      };

      // Delete metadata
      const metadataStore = transaction.objectStore('metadata');
      const metadataRequest = metadataStore.delete(combinedId);
      
      metadataRequest.onsuccess = () => {
        deletedCount++;
      };

      transaction.oncomplete = () => {
        console.log('[IndexedDB] Deleted ' + deletedCount + ' records for media:', mediaId);
        resolve();
      };

      transaction.onerror = () => {
        console.error('[IndexedDB] Failed to delete media data:', transaction.error);
        reject(transaction.error);
      };
    });
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('[IndexedDB] Database connection closed');
    }
  }
}

export default IndexedDBService.getInstance();