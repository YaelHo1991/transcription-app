import fs from 'fs/promises';
import path from 'path';
import * as mm from 'music-metadata';

/**
 * Project Service - Manages transcription projects with unique IDs
 */
export class ProjectService {
  private baseDir: string;
  private projectCounter: number = 0;

  constructor() {
    // Base directory for all users' projects
    this.baseDir = path.join(__dirname, '..', '..', 'user_data');
    this.initializeService();
  }

  /**
   * Initialize the service and ensure base directory exists
   */
  private async initializeService() {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
      // Project counter removed - no longer loading projects
      this.projectCounter = 0;
    } catch (error) {
      console.error('Error initializing project service:', error);
    }
  }


  /**
   * Generate a unique project ID
   */
  generateProjectId(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    this.projectCounter++;
    const counter = String(this.projectCounter).padStart(3, '0');
    
    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}_${counter}`;
  }

  /**
   * Get user-specific project directory
   */
  private getUserDir(userId: string): string {
    // Sanitize user ID to make it safe for filesystem
    const safeUserId = userId.toString().replace(/[^a-zA-Z0-9-_]/g, '_');
    return path.join(this.baseDir, 'users', safeUserId, 'projects');
  }
  
  /**
   * Create a new project
   */
  async createProject(mediaFileName: string, projectName?: string, userId: string = 'default'): Promise<string> {
    const projectId = this.generateProjectId();
    const userDir = this.getUserDir(userId);
    const projectDir = path.join(userDir, projectId);
    const backupsDir = path.join(projectDir, 'backups');
    
    // Create directories
    await fs.mkdir(backupsDir, { recursive: true });
    
    // Create metadata file
    const metadata = {
      projectId,
      createdAt: new Date().toISOString(),
      mediaFile: mediaFileName,
      projectName: projectName || 'Project ' + projectId + '',
      lastModified: new Date().toISOString()
    };
    
    await fs.writeFile(
      path.join(projectDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2),
      'utf8'
    );
    
    // Initialize empty files
    await this.initializeProjectFiles(projectDir);
    
    // console.log removed for production
    return projectId;
  }

  /**
   * Create a new multi-media project from folder
   */
  async createMultiMediaProject(folderName: string, mediaFiles: Array<{name: string, buffer: Buffer, mimeType: string}>, userId: string = 'default'): Promise<{projectId: string, mediaIds: string[]}> {
    const projectId = this.generateProjectId();
    const userDir = this.getUserDir(userId);
    const projectDir = path.join(userDir, projectId);
    
    // Create project directory
    await fs.mkdir(projectDir, { recursive: true });
    
    // Create media IDs and directories
    const mediaIds: string[] = [];
    
    for (let i = 0; i < mediaFiles.length; i++) {
      const file = mediaFiles[i];
      const mediaId = `media-${i + 1}`;
      mediaIds.push(mediaId);
      
      const mediaDir = path.join(projectDir, 'media', mediaId);
      const backupsDir = path.join(mediaDir, 'backups');
      
      // Create media directory structure
      await fs.mkdir(backupsDir, { recursive: true });
      
      // Save media file with filesystem-safe name
      const fileExtension = path.extname(file.name);
      const safeFileName = `media${fileExtension}`;
      const mediaFilePath = path.join(mediaDir, safeFileName);
      await fs.writeFile(mediaFilePath, file.buffer);
      
      // Extract duration from audio file
      let duration = 0;
      try {
        const metadata = await mm.parseFile(mediaFilePath);
        duration = metadata.format.duration || 0;
        console.log(`[ProjectService] Extracted duration for ${mediaId}: ${duration} seconds`);
      } catch (error) {
        console.log(`[ProjectService] Could not extract duration for ${mediaId}:`, error);
        duration = 0;
      }
      
      // Create media metadata with duration
      const mediaMetadata = {
        mediaId,
        fileName: safeFileName,
        originalName: file.name,
        mimeType: file.mimeType,
        size: file.buffer.length,
        duration: duration,
        stage: 'transcription',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };
      
      await fs.writeFile(
        path.join(mediaDir, 'metadata.json'),
        JSON.stringify(mediaMetadata, null, 2),
        'utf8'
      );
      
      // Initialize empty transcription files for this media
      await this.initializeMediaFiles(mediaDir);
    }
    
    // Create project metadata
    const projectMetadata = {
      projectId,
      name: folderName,
      displayName: folderName,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      mediaFiles: mediaIds,
      totalMedia: mediaFiles.length,
      currentMediaIndex: 0
    };
    
    await fs.writeFile(
      path.join(projectDir, 'project.json'),
      JSON.stringify(projectMetadata, null, 2),
      'utf8'
    );
    
    return { projectId, mediaIds };
  }

  /**
   * Initialize empty media files for individual media
   */
  private async initializeMediaFiles(mediaDir: string) {
    // Empty transcription
    const transcription = {
      blocks: [],
      version: '1.0.0',
      lastSaved: new Date().toISOString()
    };
    
    // Empty speakers
    const speakers = {
      speakers: [],
      version: '1.0.0'
    };
    
    // Empty remarks
    const remarks = {
      remarks: [],
      version: '1.0.0'
    };
    
    await Promise.all([
      fs.writeFile(
        path.join(mediaDir, 'transcription.json'),
        JSON.stringify(transcription, null, 2),
        'utf8'
      ),
      fs.writeFile(
        path.join(mediaDir, 'speakers.json'),
        JSON.stringify(speakers, null, 2),
        'utf8'
      ),
      fs.writeFile(
        path.join(mediaDir, 'remarks.json'),
        JSON.stringify(remarks, null, 2),
        'utf8'
      )
    ]);
  }

  /**
   * Initialize empty project files
   */
  private async initializeProjectFiles(projectDir: string) {
    // Empty transcription
    const transcription = {
      blocks: [],
      version: '1.0.0',
      lastSaved: new Date().toISOString()
    };
    
    // Empty speakers
    const speakers = {
      speakers: [],
      version: '1.0.0'
    };
    
    // Empty remarks
    const remarks = {
      remarks: [],
      version: '1.0.0'
    };
    
    await Promise.all([
      fs.writeFile(
        path.join(projectDir, 'transcription.json'),
        JSON.stringify(transcription, null, 2),
        'utf8'
      ),
      fs.writeFile(
        path.join(projectDir, 'speakers.json'),
        JSON.stringify(speakers, null, 2),
        'utf8'
      ),
      fs.writeFile(
        path.join(projectDir, 'remarks.json'),
        JSON.stringify(remarks, null, 2),
        'utf8'
      )
    ]);
  }

  /**
   * Save project data
   */
  async saveProject(projectId: string, data: {
    blocks?: any[];
    speakers?: any[];
    remarks?: any[];
  }, userId: string = 'default'): Promise<boolean> {
    try {
      const userDir = this.getUserDir(userId);
      const projectDir = path.join(userDir, projectId);
      
      // Check if project exists
      await fs.access(projectDir);
      
      // Update metadata
      const metadataPath = path.join(projectDir, 'metadata.json');
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
      metadata.lastModified = new Date().toISOString();
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
      
      // Save each component if provided
      const saves = [];
      
      if (data.blocks !== undefined) {
        const transcription = {
          blocks: data.blocks,
          version: '1.0.0',
          lastSaved: new Date().toISOString()
        };
        saves.push(
          fs.writeFile(
            path.join(projectDir, 'transcription.json'),
            JSON.stringify(transcription, null, 2),
            'utf8'
          )
        );
      }
      
      if (data.speakers !== undefined) {
        const speakers = {
          speakers: data.speakers,
          version: '1.0.0'
        };
        saves.push(
          fs.writeFile(
            path.join(projectDir, 'speakers.json'),
            JSON.stringify(speakers, null, 2),
            'utf8'
          )
        );
      }
      
      if (data.remarks !== undefined) {
        const remarks = {
          remarks: data.remarks,
          version: '1.0.0'
        };
        saves.push(
          fs.writeFile(
            path.join(projectDir, 'remarks.json'),
            JSON.stringify(remarks, null, 2),
            'utf8'
          )
        );
      }
      
      await Promise.all(saves);
      // console.log removed for production
      return true;
    } catch (error) {
      console.error(`Error saving project ${projectId}:`, error);
      return false;
    }
  }


  /**
   * Create a backup of the project
   */
  async createBackup(projectId: string, userId: string = 'default'): Promise<string | null> {
    try {
      const userDir = this.getUserDir(userId);
      const projectDir = path.join(userDir, projectId);
      const backupsDir = path.join(projectDir, 'backups');
      
      // Create backup timestamp
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
      
      // Load current data
      const [transcription, speakers, remarks] = await Promise.all([
        fs.readFile(path.join(projectDir, 'transcription.json'), 'utf8'),
        fs.readFile(path.join(projectDir, 'speakers.json'), 'utf8'),
        fs.readFile(path.join(projectDir, 'remarks.json'), 'utf8')
      ]);
      
      // Create backup object
      const backup = {
        timestamp: now.toISOString(),
        transcription: JSON.parse(transcription),
        speakers: JSON.parse(speakers),
        remarks: JSON.parse(remarks)
      };
      
      // Save backup
      const backupFile = `${timestamp}.json`;
      await fs.writeFile(
        path.join(backupsDir, backupFile),
        JSON.stringify(backup, null, 2),
        'utf8'
      );
      
      // Clean old backups (keep last 20)
      const backups = await fs.readdir(backupsDir);
      if (backups.length > 20) {
        const sortedBackups = backups.sort();
        const toDelete = sortedBackups.slice(0, sortedBackups.length - 20);
        
        for (const file of toDelete) {
          await fs.unlink(path.join(backupsDir, file));
        }
      }
      
      // console.log removed for production
      return backupFile;
    } catch (error) {
      console.error(`Error creating backup for ${projectId}:`, error);
      return null;
    }
  }

  /**
   * Restore from backup
   */
  async restoreBackup(projectId: string, backupFile: string, userId: string = 'default'): Promise<boolean> {
    try {
      const userDir = this.getUserDir(userId);
      const projectDir = path.join(userDir, projectId);
      const backupPath = path.join(projectDir, 'backups', backupFile);
      
      // Load backup
      const backup = JSON.parse(await fs.readFile(backupPath, 'utf8'));
      
      // Restore files
      await Promise.all([
        fs.writeFile(
          path.join(projectDir, 'transcription.json'),
          JSON.stringify(backup.transcription, null, 2),
          'utf8'
        ),
        fs.writeFile(
          path.join(projectDir, 'speakers.json'),
          JSON.stringify(backup.speakers, null, 2),
          'utf8'
        ),
        fs.writeFile(
          path.join(projectDir, 'remarks.json'),
          JSON.stringify(backup.remarks, null, 2),
          'utf8'
        )
      ]);
      
      // Update metadata
      const metadataPath = path.join(projectDir, 'metadata.json');
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
      metadata.lastModified = new Date().toISOString();
      metadata.restoredFrom = backupFile;
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
      
      // console.log removed for production
      return true;
    } catch (error) {
      console.error(`Error restoring backup ${backupFile}:`, error);
      return false;
    }
  }



  /**
   * List backups for a project
   */
  async listBackups(projectId: string, userId: string = 'default'): Promise<any[]> {
    try {
      const userDir = this.getUserDir(userId);
      const backupsDir = path.join(userDir, projectId, 'backups');
      const files = await fs.readdir(backupsDir);
      
      const backups = [];
      for (const file of files) {
        if (file.endsWith('.json')) {
          const stats = await fs.stat(path.join(backupsDir, file));
          backups.push({
            file: file,
            filename: file,
            timestamp: file.replace('.json', '').replace(/-/g, ':').replace('_', 'T'),
            size: stats.size,
            created: stats.mtime
          });
        }
      }
      
      // Sort by creation date (newest first)
      backups.sort((a, b) => b.created.getTime() - a.created.getTime());
      
      return backups;
    } catch (error) {
      console.error(`Error listing backups for ${projectId}:`, error);
      return [];
    }
  }
  
  /**
   * Get backup content
   */
  async getBackupContent(projectId: string, backupFile: string, userId: string = 'default'): Promise<any | null> {
    try {
      const userDir = this.getUserDir(userId);
      const backupPath = path.join(userDir, projectId, 'backups', backupFile);
      
      // Check if file exists
      await fs.access(backupPath);
      
      const content = await fs.readFile(backupPath, 'utf8');
      const data = JSON.parse(content);
      
      // Extract the components from the backup
      return {
        blocks: data.transcription?.blocks || [],
        speakers: data.speakers?.speakers || [],
        remarks: data.remarks?.remarks || [],
        metadata: {
          timestamp: data.timestamp,
          projectId
        }
      };
    } catch (error) {
      console.error(`Error getting backup content ${backupFile} for ${projectId}:`, error);
      return null;
    }
  }

  /**
   * Delete a project and all its data
   */
  async deleteProject(projectId: string, userId: string = 'default'): Promise<boolean> {
    try {
      const userDir = this.getUserDir(userId);
      const projectDir = path.join(userDir, projectId);
      
      // Check if project exists
      await fs.access(projectDir);
      
      // Delete the entire project directory
      await fs.rm(projectDir, { recursive: true, force: true });
      
      // console.log removed for production
      return true;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.error('Project ' + projectId + ' not found');
        return false;
      }
      console.error(`Error deleting project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * List all projects for a user
   */
  async listProjects(userId: string = 'default'): Promise<any[]> {
    try {
      const userDir = this.getUserDir(userId);
      
      // Check if user directory exists
      try {
        await fs.access(userDir);
      } catch {
        return [];
      }
      
      const projectDirs = await fs.readdir(userDir);
      const projects = [];
      
      for (const projectId of projectDirs) {
        const projectDir = path.join(userDir, projectId);
        const stats = await fs.stat(projectDir);
        
        if (stats.isDirectory()) {
          try {
            // Try to read project.json (multi-media project)
            const projectPath = path.join(projectDir, 'project.json');
            try {
              const projectData = JSON.parse(await fs.readFile(projectPath, 'utf8'));
              
              // Load media metadata for each media file
              const mediaInfo = [];
              let totalSize = 0;
              
              if (projectData.mediaFiles && Array.isArray(projectData.mediaFiles)) {
                for (const mediaId of projectData.mediaFiles) {
                  try {
                    const mediaMetadataPath = path.join(projectDir, 'media', mediaId, 'metadata.json');
                    const mediaMetadata = JSON.parse(await fs.readFile(mediaMetadataPath, 'utf8'));
                    
                    // Use stored duration from metadata (already extracted during creation)
                    mediaInfo.push({
                      mediaId: mediaId,
                      name: mediaMetadata.originalName || mediaMetadata.fileName,
                      size: mediaMetadata.size || 0,
                      duration: mediaMetadata.duration || 0, // Use stored duration
                      mimeType: mediaMetadata.mimeType
                    });
                    
                    totalSize += mediaMetadata.size || 0;
                  } catch (error) {
                    console.error(`Error loading media metadata for ${mediaId}:`, error);
                    // Try to at least get file info directly
                    try {
                      const mediaFiles = await fs.readdir(path.join(projectDir, 'media', mediaId));
                      const audioFile = mediaFiles.find(f => 
                        ['.mp3', '.mp4', '.wav', '.m4a', '.webm', '.ogg'].includes(path.extname(f).toLowerCase())
                      );
                      
                      if (audioFile) {
                        const audioPath = path.join(projectDir, 'media', mediaId, audioFile);
                        const stats = await fs.stat(audioPath);
                        let duration = 0;
                        
                        try {
                          const metadata = await mm.parseFile(audioPath);
                          duration = metadata.format.duration || 0;
                        } catch {}
                        
                        mediaInfo.push({
                          mediaId: mediaId,
                          name: audioFile,
                          size: stats.size,
                          duration: duration,
                          mimeType: `audio/${path.extname(audioFile).substring(1)}`
                        });
                      } else {
                        // Final fallback
                        mediaInfo.push({
                          mediaId: mediaId,
                          name: mediaId,
                          size: 0,
                          duration: 0,
                          mimeType: 'unknown'
                        });
                      }
                    } catch {
                      // Final fallback if all else fails
                      mediaInfo.push({
                        mediaId: mediaId,
                        name: mediaId,
                        size: 0,
                        duration: 0,
                        mimeType: 'unknown'
                      });
                    }
                  }
                }
              }
              
              projects.push({
                ...projectData,
                mediaInfo: mediaInfo,
                size: totalSize
              });
            } catch {
              // Fallback to metadata.json (single media project)
              const metadataPath = path.join(projectDir, 'metadata.json');
              const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
              projects.push({
                projectId: metadata.projectId,
                name: metadata.projectName,
                displayName: metadata.projectName,
                createdAt: metadata.createdAt,
                lastModified: metadata.lastModified,
                mediaFiles: [metadata.mediaFile],
                totalMedia: 1,
                currentMediaIndex: 0,
                mediaInfo: [],
                size: 0
              });
            }
          } catch (error) {
            console.error(`Error reading project ${projectId}:`, error);
          }
        }
      }
      
      // Sort by creation date (newest first)
      projects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      return projects;
    } catch (error) {
      console.error(`Error listing projects for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Load specific media data from project
   */
  async loadMediaData(projectId: string, mediaId: string, userId: string = 'default'): Promise<any | null> {
    try {
      const userDir = this.getUserDir(userId);
      const mediaDir = path.join(userDir, projectId, 'media', mediaId);
      
      console.log(`[MediaData] Loading data from: ${mediaDir}`);
      
      // Load all media files with error handling for each
      let transcription, speakers, remarks, metadata;
      
      try {
        transcription = JSON.parse(await fs.readFile(path.join(mediaDir, 'transcription.json'), 'utf8'));
      } catch (error) {
        console.log(`[MediaData] No transcription.json found, using empty`);
        transcription = { blocks: [], version: '1.0.0', lastSaved: new Date().toISOString() };
      }
      
      try {
        speakers = JSON.parse(await fs.readFile(path.join(mediaDir, 'speakers.json'), 'utf8'));
      } catch (error) {
        console.log(`[MediaData] No speakers.json found, using empty`);
        speakers = { speakers: [], version: '1.0.0' };
      }
      
      try {
        remarks = JSON.parse(await fs.readFile(path.join(mediaDir, 'remarks.json'), 'utf8'));
      } catch (error) {
        console.log(`[MediaData] No remarks.json found, using empty`);
        remarks = { remarks: [], version: '1.0.0' };
      }
      
      try {
        metadata = JSON.parse(await fs.readFile(path.join(mediaDir, 'metadata.json'), 'utf8'));
      } catch (error) {
        console.error(`[MediaData] No metadata.json found for ${mediaId}`);
        return null;
      }
      
      return {
        blocks: transcription.blocks || [],
        speakers: speakers.speakers || [],
        remarks: remarks.remarks || [],
        metadata: metadata
      };
    } catch (error) {
      console.error(`[MediaData] Error loading media data ${mediaId} from project ${projectId}:`, error);
      return null;
    }
  }

  /**
   * Save media data to specific media within project
   */
  async saveMediaData(projectId: string, mediaId: string, data: {
    blocks?: any[];
    speakers?: any[];
    remarks?: any[];
  }, userId: string = 'default'): Promise<boolean> {
    try {
      const userDir = this.getUserDir(userId);
      const mediaDir = path.join(userDir, projectId, 'media', mediaId);
      
      // Update media metadata
      const metadataPath = path.join(mediaDir, 'metadata.json');
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
      metadata.lastModified = new Date().toISOString();
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
      
      // Save each component if provided
      const saves = [];
      
      // Save all transcription data in one file
      const transcriptionDir = path.join(mediaDir, 'transcription');
      await fs.mkdir(transcriptionDir, { recursive: true });
      
      const transcriptionData = {
        blocks: data.blocks || [],
        speakers: data.speakers || [],
        remarks: data.remarks || [],
        metadata: metadata,
        version: '1.0.0',
        lastSaved: new Date().toISOString()
      };
      
      saves.push(
        fs.writeFile(
          path.join(transcriptionDir, 'data.json'),
          JSON.stringify(transcriptionData, null, 2),
          'utf8'
        )
      );
      
      // Also save individual files for backward compatibility (optional)
      if (data.speakers !== undefined) {
        const speakers = {
          speakers: data.speakers,
          version: '1.0.0'
        };
        saves.push(
          fs.writeFile(
            path.join(mediaDir, 'speakers.json'),
            JSON.stringify(speakers, null, 2),
            'utf8'
          )
        );
      }
      
      if (data.remarks !== undefined) {
        const remarks = {
          remarks: data.remarks,
          version: '1.0.0'
        };
        saves.push(
          fs.writeFile(
            path.join(mediaDir, 'remarks.json'),
            JSON.stringify(remarks, null, 2),
            'utf8'
          )
        );
      }
      
      await Promise.all(saves);
      
      // Update project metadata
      const projectMetadataPath = path.join(userDir, projectId, 'project.json');
      try {
        const projectMetadata = JSON.parse(await fs.readFile(projectMetadataPath, 'utf8'));
        projectMetadata.lastModified = new Date().toISOString();
        await fs.writeFile(projectMetadataPath, JSON.stringify(projectMetadata, null, 2), 'utf8');
      } catch (error) {
        // Project metadata might not exist for single-media projects
      }
      
      return true;
    } catch (error) {
      console.error(`Error saving media data ${mediaId} to project ${projectId}:`, error);
      return false;
    }
  }

  /**
   * Update media stage (transcription -> proofreading -> export)
   */
  async updateMediaStage(projectId: string, mediaId: string, stage: 'transcription' | 'proofreading' | 'export', userId: string = 'default'): Promise<boolean> {
    try {
      const userDir = this.getUserDir(userId);
      const metadataPath = path.join(userDir, projectId, 'media', mediaId, 'metadata.json');
      
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
      metadata.stage = stage;
      metadata.lastModified = new Date().toISOString();
      
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error(`Error updating stage for media ${mediaId}:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const projectService = new ProjectService();