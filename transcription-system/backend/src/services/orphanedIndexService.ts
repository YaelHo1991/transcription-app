import path from 'path';
import fs from 'fs-extra';

interface OrphanedTranscription {
  transcriptionId: string;
  originalProjectId: string;
  originalProjectName: string;
  originalProjectFolder?: string; // The folder name in orphaned directory
  originalMediaId: string;
  originalMediaName: string;
  mediaDuration?: number; // Duration in seconds
  mediaSize?: number; // Size in bytes
  archivedAt: string;
  archivedPath: string;
  fileSize?: number; // Size of the transcription file
}

interface OrphanedIndex {
  version: string;
  lastUpdated: string;
  transcriptions: Record<string, OrphanedTranscription[]>; // Key is media name
}

export class OrphanedIndexService {
  private indexPath: string;
  private index: OrphanedIndex | null = null;

  constructor(private userId: string, private userDataPath: string) {
    this.indexPath = path.join(userDataPath, 'user_data', 'users', userId, 'orphaned', 'orphaned-index.json');
  }

  /**
   * Initialize the orphaned folder and index file if they don't exist
   */
  async initialize(): Promise<void> {
    const orphanedDir = path.dirname(this.indexPath);
    
    // Ensure orphaned directory exists
    await fs.ensureDir(orphanedDir);
    
    // Load or create index
    await this.loadIndex();
  }

  /**
   * Load the index from disk or create a new one
   */
  private async loadIndex(): Promise<void> {
    try {
      if (await fs.pathExists(this.indexPath)) {
        const data = await fs.readFile(this.indexPath, 'utf-8');
        this.index = JSON.parse(data);
      } else {
        // Create new index
        this.index = {
          version: '1.0.0',
          lastUpdated: new Date().toISOString(),
          transcriptions: {}
        };
        await this.saveIndex();
      }
    } catch (error) {
      console.error('[OrphanedIndexService] Error loading index:', error);
      // Create new index on error
      this.index = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        transcriptions: {}
      };
    }
  }

  /**
   * Save the index to disk
   */
  private async saveIndex(): Promise<void> {
    if (!this.index) return;
    
    try {
      this.index.lastUpdated = new Date().toISOString();
      await fs.writeFile(
        this.indexPath,
        JSON.stringify(this.index, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('[OrphanedIndexService] Error saving index:', error);
      throw error;
    }
  }

  /**
   * Add an orphaned transcription to the index
   */
  async addOrphanedTranscription(transcription: Omit<OrphanedTranscription, 'archivedAt'>): Promise<void> {
    if (!this.index) await this.loadIndex();
    
    const entry: OrphanedTranscription = {
      ...transcription,
      archivedAt: new Date().toISOString()
    };

    // Use media name as key for easy lookup
    const mediaName = transcription.originalMediaName.toLowerCase();
    
    if (!this.index!.transcriptions[mediaName]) {
      this.index!.transcriptions[mediaName] = [];
    }
    
    // Check if already exists
    const existingIndex = this.index!.transcriptions[mediaName].findIndex(
      t => t.transcriptionId === entry.transcriptionId
    );
    
    if (existingIndex >= 0) {
      // Update existing entry
      this.index!.transcriptions[mediaName][existingIndex] = entry;
    } else {
      // Add new entry
      this.index!.transcriptions[mediaName].push(entry);
    }
    
    await this.saveIndex();
  }

  /**
   * Remove an orphaned transcription from the index
   */
  async removeOrphanedTranscription(transcriptionId: string): Promise<void> {
    if (!this.index) await this.loadIndex();
    
    // Search through all media names
    for (const mediaName in this.index!.transcriptions) {
      const transcriptions = this.index!.transcriptions[mediaName];
      const index = transcriptions.findIndex(t => t.transcriptionId === transcriptionId);
      
      if (index >= 0) {
        transcriptions.splice(index, 1);
        
        // Remove media name entry if no more transcriptions
        if (transcriptions.length === 0) {
          delete this.index!.transcriptions[mediaName];
        }
        
        await this.saveIndex();
        return;
      }
    }
  }

  /**
   * Find orphaned transcriptions for a given media file name
   */
  async findOrphanedTranscriptions(mediaName: string): Promise<OrphanedTranscription[]> {
    if (!this.index) await this.loadIndex();
    
    const normalizedName = mediaName.toLowerCase();
    return this.index!.transcriptions[normalizedName] || [];
  }

  /**
   * Find orphaned transcriptions for multiple media files
   */
  async findOrphanedTranscriptionsForMultipleMedia(mediaNames: string[]): Promise<Record<string, OrphanedTranscription[]>> {
    if (!this.index) await this.loadIndex();
    
    const results: Record<string, OrphanedTranscription[]> = {};
    
    for (const mediaName of mediaNames) {
      const normalizedName = mediaName.toLowerCase();
      const orphaned = this.index!.transcriptions[normalizedName];
      if (orphaned && orphaned.length > 0) {
        results[mediaName] = orphaned;
      }
    }
    
    return results;
  }

  /**
   * Get all orphaned transcriptions
   */
  async getAllOrphanedTranscriptions(): Promise<OrphanedTranscription[]> {
    if (!this.index) await this.loadIndex();
    
    const allTranscriptions: OrphanedTranscription[] = [];
    for (const mediaName in this.index!.transcriptions) {
      allTranscriptions.push(...this.index!.transcriptions[mediaName]);
    }
    
    return allTranscriptions;
  }

  /**
   * Clean up index by removing entries for non-existent files
   */
  async cleanupIndex(): Promise<number> {
    if (!this.index) await this.loadIndex();
    
    let removedCount = 0;
    const toRemove: string[] = [];
    
    for (const mediaName in this.index!.transcriptions) {
      const transcriptions = this.index!.transcriptions[mediaName];
      
      for (let i = transcriptions.length - 1; i >= 0; i--) {
        const transcription = transcriptions[i];
        
        // Check if archived file still exists
        if (!(await fs.pathExists(transcription.archivedPath))) {
          transcriptions.splice(i, 1);
          removedCount++;
        }
      }
      
      // Mark for removal if no transcriptions left
      if (transcriptions.length === 0) {
        toRemove.push(mediaName);
      }
    }
    
    // Remove empty entries
    for (const mediaName of toRemove) {
      delete this.index!.transcriptions[mediaName];
    }
    
    if (removedCount > 0) {
      await this.saveIndex();
    }
    
    return removedCount;
  }

  /**
   * Check if a media file might be a duplicate based on name and size
   */
  async checkForDuplicateMedia(mediaName: string, mediaSize?: number): Promise<OrphanedTranscription[]> {
    if (!this.index) await this.loadIndex();
    
    const normalizedName = mediaName.toLowerCase();
    const candidates = this.index!.transcriptions[normalizedName] || [];
    
    if (!mediaSize) {
      // Return all matches by name
      return candidates;
    }
    
    // Filter by size if provided (allow 5% variance for metadata differences)
    const sizeTolerance = mediaSize * 0.05;
    return candidates.filter(t => {
      if (!t.mediaSize) return true; // Include if no size to compare
      return Math.abs(t.mediaSize - mediaSize) <= sizeTolerance;
    });
  }

  /**
   * Rebuild index by scanning the orphaned folder
   */
  async rebuildIndex(): Promise<void> {
    const orphanedDir = path.dirname(this.indexPath);
    
    // Create new index
    this.index = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      transcriptions: {}
    };
    
    // Check if orphaned directory exists
    if (!(await fs.pathExists(orphanedDir))) {
      await this.saveIndex();
      return;
    }
    
    // Scan for orphaned transcription folders and files
    const items = await fs.readdir(orphanedDir);
    
    for (const item of items) {
      // Skip the index file itself
      if (item === 'orphaned-index.json') continue;
      
      // Handle both orphaned_ and orphan_ prefixes for folders
      if (item.startsWith('orphaned_') || item.startsWith('orphan_')) {
        try {
          const itemPath = path.join(orphanedDir, item);
          const stats = await fs.stat(itemPath);
          
          let transcriptionData;
          let archivePath;
          
          if (stats.isDirectory()) {
            // It's a folder - read from transcription/data.json
            const dataPath = path.join(itemPath, 'transcription', 'data.json');
            try {
              const data = await fs.readFile(dataPath, 'utf-8');
              transcriptionData = JSON.parse(data);
              archivePath = path.join(itemPath, 'transcription');
            } catch (error) {
              console.error(`[OrphanedIndexService] Could not read data.json from ${item}:`, error);
              continue;
            }
          } else if (item.endsWith('.json')) {
            // It's a JSON file (old format) - this shouldn't happen anymore but handle it
            const data = await fs.readFile(itemPath, 'utf-8');
            transcriptionData = JSON.parse(data);
            archivePath = itemPath;
          } else {
            continue;
          }
          
          // Extract info from folder/file name
          const nameWithoutPrefix = item.replace('orphaned_', '').replace('orphan_', '').replace('.json', '');
          const parts = nameWithoutPrefix.split('_');
          
          if (parts.length >= 3) {
            // Handle different naming patterns
            let projectId, mediaId, timestamp;
            
            // For orphaned_ format: projectId_mediaId_timestamp
            if (item.startsWith('orphaned_')) {
              // Format: 2025-09-07_14-01-41_009_media-4_1757243618189
              const datePattern = /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_\d{3}/;
              const match = nameWithoutPrefix.match(datePattern);
              if (match) {
                projectId = match[0];
                const remaining = nameWithoutPrefix.substring(match[0].length + 1);
                const remainingParts = remaining.split('_');
                mediaId = remainingParts[0];
                timestamp = remainingParts[1] || Date.now().toString();
              } else {
                [projectId, mediaId, ...timestamp] = parts;
                timestamp = timestamp.join('_');
              }
            } else {
              // For orphan_ format: timestamp_identifier
              timestamp = parts[0];
              const identifier = parts.slice(1).join('_');
              
              // Try to extract from orphanedFrom metadata
              if (transcriptionData.orphanedFrom) {
                projectId = transcriptionData.orphanedFrom.projectId;
                mediaId = transcriptionData.orphanedFrom.mediaId;
              } else {
                projectId = identifier;
                mediaId = identifier;
              }
            }
            
            const orphanedEntry: OrphanedTranscription = {
              transcriptionId: `${projectId}_${mediaId}_${timestamp}`,
              originalProjectId: projectId,
              originalProjectName: transcriptionData.orphanedFrom?.projectName || 
                                  transcriptionData.projectName || 
                                  'Unknown Project',
              originalMediaId: mediaId,
              originalMediaName: transcriptionData.orphanedFrom?.mediaName || 
                                transcriptionData.metadata?.originalName || 
                                transcriptionData.metadata?.fileName || 
                                'Unknown Media',
              mediaDuration: transcriptionData.orphanedFrom?.mediaDuration || 
                            transcriptionData.metadata?.duration,
              mediaSize: transcriptionData.orphanedFrom?.mediaSize || 
                        transcriptionData.metadata?.size,
              archivedAt: transcriptionData.orphanedFrom?.orphanedAt || 
                         new Date().toISOString(),
              archivedPath: archivePath,
              fileSize: stats.isDirectory() ? 0 : stats.size
            };
            
            const mediaName = orphanedEntry.originalMediaName.toLowerCase();
            
            if (!this.index.transcriptions[mediaName]) {
              this.index.transcriptions[mediaName] = [];
            }
            
            this.index.transcriptions[mediaName].push(orphanedEntry);
          }
        } catch (error) {
          console.error(`[OrphanedIndexService] Error processing item ${item}:`, error);
        }
      }
    }
    
    await this.saveIndex();
  }
}