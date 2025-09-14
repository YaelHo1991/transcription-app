import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { OrphanedIndexService } from './orphanedIndexService';

let mm: any;
try {
  // Use dynamic import for ES module compatibility
  (async () => {
    try {
      const musicMetadata = await import('music-metadata');
      mm = musicMetadata;
      console.log('[ProjectService] music-metadata loaded successfully');
    } catch (importError) {
      console.log('[ProjectService] Failed to import music-metadata:', importError.message);
    }
  })();
} catch (error) {
  console.log('[ProjectService] music-metadata not available, duration extraction disabled');
}

/**
 * Project Service - Manages transcription projects with unique IDs
 */
export class ProjectService {
  private baseDir: string;
  private projectCounter: number = 0;

  constructor() {
    // Base directory for all users' projects - use process.cwd() for consistent paths
    this.baseDir = path.join(process.cwd(), 'user_data');
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
   * Get user-specific orphaned directory
   */
  private getUserOrphanedDir(userId: string): string {
    const safeUserId = userId.toString().replace(/[^a-zA-Z0-9-_]/g, '_');
    return path.join(this.baseDir, 'users', safeUserId, 'orphaned');
  }
  
  /**
   * Ensure user directories exist (projects and orphaned)
   */
  async ensureUserDirectories(userId: string): Promise<void> {
    const userDir = this.getUserDir(userId);
    const orphanedDir = this.getUserOrphanedDir(userId);
    
    // Create both directories
    await fs.mkdir(userDir, { recursive: true });
    await fs.mkdir(orphanedDir, { recursive: true });
    
    // Initialize orphaned index if needed
    const indexService = new OrphanedIndexService(userId, this.baseDir);
    await indexService.initialize();
  }
  
  /**
   * Get orphaned index service for a user
   */
  getOrphanedIndexService(userId: string): OrphanedIndexService {
    return new OrphanedIndexService(userId, this.baseDir);
  }
  
  /**
   * Create a new project
   */
  async createProject(mediaFileName: string, projectName?: string, userId: string = 'default'): Promise<string> {
    // Ensure user directories exist
    await this.ensureUserDirectories(userId);
    
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
    // Ensure user directories exist
    await this.ensureUserDirectories(userId);
    
    const projectId = this.generateProjectId();
    const userDir = this.getUserDir(userId);
    const projectDir = path.join(userDir, projectId);
    
    // Create project directory
    await fs.mkdir(projectDir, { recursive: true });
    
    // Create media IDs and directories
    const mediaIds: string[] = [];
    
    for (let i = 0; i < mediaFiles.length; i++) {
      const file = mediaFiles[i];
      const mediaId = `media-${uuidv4()}`;
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
        // Check both mm.parseFile and mm.default.parseFile for ES module compatibility
        const parseFile = mm?.parseFile || mm?.default?.parseFile || mm?.parseBuffer;
        if (parseFile) {
          const metadata = await parseFile(mediaFilePath);
          duration = metadata.format.duration || 0;
          console.log(`[ProjectService] Extracted duration for ${mediaId}: ${duration} seconds`);
        } else {
          console.log(`[ProjectService] music-metadata not available or parseFile not found, skipping duration extraction for ${mediaId}`);
        }
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
    
    // Create media index
    const mediaIndex = {
      nextMediaNumber: mediaFiles.length + 1,
      availableNumbers: [],
      activeMediaIds: mediaIds,
      lastUpdated: new Date().toISOString()
    };
    
    await fs.writeFile(
      path.join(projectDir, 'media-index.json'),
      JSON.stringify(mediaIndex, null, 2),
      'utf8'
    );
    
    return { projectId, mediaIds };
  }

  /**
   * Add media files to an existing project
   */
  async addMediaToProject(projectId: string, mediaFiles: Array<{name: string, buffer: Buffer, mimeType: string}>, userId: string = 'default'): Promise<{projectId: string, mediaIds: string[]}> {
    try {
      // Ensure user directory exists
      await this.ensureUserDirectories(userId);
      
      const projectDir = path.join(this.baseDir, 'users', userId, 'projects', projectId);
      
      // Check if project exists
      if (!await fs.access(projectDir).then(() => true).catch(() => false)) {
        throw new Error(`Project ${projectId} not found`);
      }
      
      // Read existing project metadata
      const projectJsonPath = path.join(projectDir, 'project.json');
      const projectJson = JSON.parse(await fs.readFile(projectJsonPath, 'utf8'));
      
      const mediaIds: string[] = [];
      const mediaInfoArray: any[] = projectJson.mediaInfo || [];
      
      // Save each media file to the project
      for (const file of mediaFiles) {
        const mediaId = `media-${uuidv4()}`;
        mediaIds.push(mediaId);
        
        const mediaDir = path.join(projectDir, 'media', mediaId);
        await fs.mkdir(mediaDir, { recursive: true });
        
        // Use simple filename matching the directory pattern (like working projects)
        const fileExtension = file.mimeType.split('/')[1] || 'bin';
        const mediaFileName = `media.${fileExtension}`;
        const mediaFilePath = path.join(mediaDir, mediaFileName);
        
        // Save the media file
        await fs.writeFile(mediaFilePath, file.buffer);
        
        // Save media metadata
        const mediaMetadata = {
          name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          filename: mediaFileName,
          originalName: file.name,
          mimeType: file.mimeType,
          size: file.buffer.length,
          uploadedAt: new Date().toISOString(),
          stage: 'transcription' as const
        };
        
        await fs.writeFile(
          path.join(mediaDir, 'media.json'),
          JSON.stringify(mediaMetadata, null, 2),
          'utf8'
        );

        // Create metadata.json (required for media player)
        const metadataJson = {
          mediaId,
          fileName: mediaFileName,
          originalName: file.name,
          mimeType: file.mimeType,
          size: file.buffer.length,
          duration: 0, // Will be populated when media is analyzed
          stage: 'transcription',
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString()
        };

        await fs.writeFile(
          path.join(mediaDir, 'metadata.json'),
          JSON.stringify(metadataJson, null, 2),
          'utf8'
        );
        
        // Initialize empty transcription files for this media
        await this.initializeMediaFiles(mediaDir);
        
        // Add to media info array
        mediaInfoArray.push({
          mediaId,
          name: file.name.replace(/\.[^/.]+$/, ''),
          filename: mediaFileName,
          size: file.buffer.length,
          mimeType: file.mimeType,
          uploadedAt: new Date().toISOString()
        });
      }
      
      // Update project metadata with new media - properly merge without duplicates
      const existingMediaIds = new Set(projectJson.mediaFiles || []);
      const newMediaFiles = mediaIds.filter(id => !existingMediaIds.has(id));
      
      // Only add new media info entries that don't already exist
      const existingMediaInfoIds = new Set((projectJson.mediaInfo || []).map((m: any) => m.mediaId));
      const newMediaInfo = mediaInfoArray.filter(info => !existingMediaInfoIds.has(info.mediaId));
      
      projectJson.mediaInfo = [...(projectJson.mediaInfo || []), ...newMediaInfo];
      projectJson.mediaFiles = [...(projectJson.mediaFiles || []), ...newMediaFiles];
      projectJson.totalMedia = projectJson.mediaFiles.length;
      projectJson.lastModified = new Date().toISOString();
      
      // Save updated project metadata
      await fs.writeFile(projectJsonPath, JSON.stringify(projectJson, null, 2), 'utf8');
      
      // Update the media index
      const mediaIndexPath = path.join(projectDir, 'media-index.json');
      const mediaIndex = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        media: {} as { [key: string]: any }
      };
      
      for (const mediaId of projectJson.mediaFiles) {
        const mediaMetadataPath = path.join(projectDir, 'media', mediaId, 'media.json');
        try {
          const metadata = JSON.parse(await fs.readFile(mediaMetadataPath, 'utf8'));
          mediaIndex.media[mediaId] = {
            name: metadata.name || metadata.originalName || 'Unnamed Media',
            stage: metadata.stage || 'transcription',
            lastModified: metadata.uploadedAt || new Date().toISOString()
          };
        } catch (err) {
          console.error(`Error reading media metadata for ${mediaId}:`, err);
        }
      }
      
      await fs.writeFile(
        mediaIndexPath,
        JSON.stringify(mediaIndex, null, 2),
        'utf8'
      );
      
      console.log(`[ProjectService] Successfully added ${mediaFiles.length} media files to project ${projectId}`);
      return { projectId, mediaIds };
      
    } catch (error: any) {
      console.error('[ProjectService] Error adding media to project:', error);
      throw error;
    }
  }

  /**
   * Initialize empty media files for individual media
   */
  private async initializeMediaFiles(mediaDir: string) {
    // Create required directories
    const backupsDir = path.join(mediaDir, 'backups');
    const transcriptionDir = path.join(mediaDir, 'transcription');
    
    await Promise.all([
      fs.mkdir(backupsDir, { recursive: true }),
      fs.mkdir(transcriptionDir, { recursive: true })
    ]);
    
    // Empty transcription (root level)
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

    // Transcription data.json (for text editor)
    const transcriptionData = {
      blocks: [
        {
          id: `block-${Date.now()}`,
          speaker: "",
          text: "",
          speakerTime: 0
        }
      ],
      speakers: [
        {
          id: "speaker-3",
          code: "",
          name: "",
          description: "",
          color: "#667eea",
          count: 0
        }
      ],
      remarks: [],
      metadata: {
        fileName: 'media.mp4',
        originalName: '',
        duration: 0
      },
      lastModified: new Date().toISOString()
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
      ),
      fs.writeFile(
        path.join(transcriptionDir, 'data.json'),
        JSON.stringify(transcriptionData, null, 2),
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
                  // First, try to load from media.json (URL downloads have correct name here)
                  try {
                    const mediaJsonPath = path.join(projectDir, 'media', mediaId, 'media.json');
                    const mediaData = JSON.parse(await fs.readFile(mediaJsonPath, 'utf8'));
                    
                    mediaInfo.push({
                      mediaId: mediaId,
                      name: mediaData.name || mediaData.title || mediaData.filename,
                      size: mediaData.size || 0,
                      duration: mediaData.duration || 0,
                      mimeType: mediaData.format ? `video/${mediaData.format}` : 'unknown'
                    });
                    totalSize += mediaData.size || 0;
                    console.log(`[ProjectService] Loaded media info from media.json for ${mediaId}: ${mediaData.name}`);
                    continue; // Skip to next media file
                  } catch (mediaJsonError) {
                    // media.json doesn't exist, fall back to metadata.json
                  }
                  
                  // Fall back to metadata.json (regular uploads)
                  try {
                    const mediaMetadataPath = path.join(projectDir, 'media', mediaId, 'metadata.json');
                    const mediaMetadata = JSON.parse(await fs.readFile(mediaMetadataPath, 'utf8'));
                    
                    // If duration is missing, try to extract it from the audio file
                    let duration = mediaMetadata.duration || 0;
                    if (!duration || duration === 0) {
                      try {
                        // Find the audio file in the media directory
                        const mediaDir = path.join(projectDir, 'media', mediaId);
                        const files = await fs.readdir(mediaDir);
                        const audioFile = files.find(f => 
                          f.endsWith('.mp3') || f.endsWith('.wav') || 
                          f.endsWith('.m4a') || f.endsWith('.aac') ||
                          f.endsWith('.ogg') || f.endsWith('.flac')
                        );
                        
                        const parseFile = mm?.parseFile || mm?.default?.parseFile || mm?.parseBuffer;
                        if (audioFile && parseFile) {
                          const audioPath = path.join(mediaDir, audioFile);
                          const metadata = await parseFile(audioPath);
                          duration = metadata.format.duration || 0;
                          
                          // Update the metadata file with the extracted duration
                          mediaMetadata.duration = duration;
                          await fs.writeFile(mediaMetadataPath, JSON.stringify(mediaMetadata, null, 2));
                          console.log(`[ProjectService] Extracted and saved duration for ${mediaId}: ${duration} seconds`);
                        }
                      } catch (extractError) {
                        console.log(`[ProjectService] Could not extract duration for ${mediaId}:`, extractError.message);
                      }
                    }
                    
                    mediaInfo.push({
                      mediaId: mediaId,
                      name: mediaMetadata.originalName || mediaMetadata.fileName,
                      size: mediaMetadata.size || 0,
                      duration: duration,
                      mimeType: mediaMetadata.mimeType
                    });
                    
                    totalSize += mediaMetadata.size || 0;
                  } catch (error) {
                    console.log(`[ProjectService] No metadata.json or media.json for ${mediaId}, using fallback file detection`);
                    // Try to at least get file info directly (without expensive audio parsing)
                    try {
                      const mediaFiles = await fs.readdir(path.join(projectDir, 'media', mediaId));
                      const audioFile = mediaFiles.find(f => 
                        ['.mp3', '.mp4', '.wav', '.m4a', '.webm', '.ogg'].includes(path.extname(f).toLowerCase())
                      );
                      
                      if (audioFile) {
                        const audioPath = path.join(projectDir, 'media', mediaId, audioFile);
                        const stats = await fs.stat(audioPath);
                        let duration = 0;
                        
                        // Try to extract duration for missing metadata
                        try {
                          const parseFile = mm?.parseFile || mm?.default?.parseFile || mm?.parseBuffer;
                        if (parseFile) {
                            const metadata = await parseFile(audioPath);
                            duration = metadata.format.duration || 0;
                            console.log(`[ProjectService] Extracted duration for ${mediaId} (no metadata.json): ${duration} seconds`);
                            
                            // Create metadata.json to cache this for next time
                            const mediaMetadata = {
                              mediaId: mediaId,
                              fileName: audioFile,
                              originalName: audioFile,
                              mimeType: `audio/${path.extname(audioFile).substring(1)}`,
                              size: stats.size,
                              duration: duration,
                              stage: 'transcription',
                              createdAt: stats.birthtime.toISOString(),
                              lastModified: stats.mtime.toISOString()
                            };
                            const mediaMetadataPath = path.join(projectDir, 'media', mediaId, 'metadata.json');
                            await fs.writeFile(mediaMetadataPath, JSON.stringify(mediaMetadata, null, 2));
                          }
                        } catch (extractError) {
                          console.log(`[ProjectService] Could not extract duration (no metadata): ${extractError.message}`);
                        }
                        
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
                          duration: 0, // Keep as 0 for performance
                          mimeType: 'unknown'
                        });
                      }
                    } catch (fileError) {
                      console.log(`[ProjectService] Could not access media files for ${mediaId}`);
                      // Final fallback if all else fails
                      mediaInfo.push({
                        mediaId: mediaId,
                        name: mediaId,
                        size: 0,
                        duration: 0, // Keep as 0 for performance
                        mimeType: 'unknown'
                      });
                    }
                  }
                }
              }
              
              console.log(`[ProjectService] Adding project ${projectId} with ${mediaInfo.length} media files`);
              projects.push({
                ...projectData,
                mediaInfo: mediaInfo,
                size: totalSize
              });
            } catch (projectError) {
              console.log(`[ProjectService] Could not read project.json for ${projectId}, trying metadata.json fallback`);
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
            console.log(`[ProjectService] Skipping invalid project ${projectId}:`, error.message);
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

  /**
   * Rename a project (both directory and internal metadata)
   */
  async renameProject(userId: string, projectId: string, newName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const userDir = this.getUserDir(userId);
      const projectDir = path.join(userDir, projectId);
      
      // Check if project exists
      const projectExists = await fs.access(projectDir).then(() => true).catch(() => false);
      if (!projectExists) {
        return { success: false, error: 'הפרויקט לא נמצא' };
      }

      // Check if another project with the same name already exists
      const existingProjects = await this.listProjects(userId);
      const duplicateProject = existingProjects.find(p => 
        p.displayName.toLowerCase() === newName.toLowerCase() && p.projectId !== projectId
      );
      
      if (duplicateProject) {
        return { success: false, error: 'פרויקט עם השם הזה כבר קיים' };
      }

      // Update project metadata
      const metadataPath = path.join(projectDir, 'project.json');
      try {
        const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
        
        // Update both name and displayName
        const oldName = metadata.displayName || metadata.name;
        metadata.name = newName;
        metadata.displayName = newName;
        metadata.lastModified = new Date().toISOString();
        
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
        
        console.log(`[ProjectService] Successfully renamed project "${oldName}" to "${newName}" for user ${userId}`);
        return { success: true };
        
      } catch (metadataError) {
        console.error('[ProjectService] Error updating project metadata:', metadataError);
        return { success: false, error: 'שגיאה בעדכון מטאדטא של הפרויקט' };
      }
      
    } catch (error: any) {
      console.error('[ProjectService] Error renaming project:', error);
      return { success: false, error: error.message || 'שגיאה בשינוי שם הפרויקט' };
    }
  }
}

// Export singleton instance
export const projectService = new ProjectService();