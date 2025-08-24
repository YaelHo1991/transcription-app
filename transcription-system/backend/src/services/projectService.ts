import fs from 'fs/promises';
import path from 'path';

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
      // Load counter from existing projects
      await this.loadProjectCounter();
    } catch (error) {
      console.error('Error initializing project service:', error);
    }
  }

  /**
   * Load the project counter based on existing projects
   */
  private async loadProjectCounter() {
    try {
      // Check all user directories for the highest counter
      const usersDir = path.join(this.baseDir, 'users');
      await fs.mkdir(usersDir, { recursive: true });
      
      const users = await fs.readdir(usersDir);
      let maxCounter = 0;
      
      for (const user of users) {
        const userProjectsDir = path.join(usersDir, user, 'projects');
        try {
          const entries = await fs.readdir(userProjectsDir);
          const projectFolders = entries.filter(e => e.match(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_\d{3}$/));
          
          if (projectFolders.length > 0) {
            const counters = projectFolders.map(folder => {
              const parts = folder.split('_');
              return parseInt(parts[2], 10);
            });
            maxCounter = Math.max(maxCounter, ...counters);
          }
        } catch (err) {
          // User directory might not exist yet
        }
      }
      
      this.projectCounter = maxCounter;
    } catch (error) {
      console.error('Error loading project counter:', error);
      this.projectCounter = 0;
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
    
    console.log('✅ Created new project: ' + projectId + '');
    return projectId;
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
      console.log('✅ Saved project: ' + projectId + '');
      return true;
    } catch (error) {
      console.error(`Error saving project ${projectId}:`, error);
      return false;
    }
  }

  /**
   * Load project data
   */
  async loadProject(projectId: string, userId?: string): Promise<any> {
    try {
      // Try to find the project in user-specific directory first
      let projectDir: string;
      
      if (userId) {
        const userDir = this.getUserDir(userId);
        projectDir = path.join(userDir, projectId);
      } else {
        // Fallback to old structure for backward compatibility
        projectDir = path.join(this.baseDir, 'user_live', 'projects', projectId);
      }
      
      // Check if project exists
      await fs.access(projectDir);
      
      // Load all files
      const [metadata, transcription, speakers, remarks] = await Promise.all([
        fs.readFile(path.join(projectDir, 'metadata.json'), 'utf8').then(JSON.parse),
        fs.readFile(path.join(projectDir, 'transcription.json'), 'utf8').then(JSON.parse),
        fs.readFile(path.join(projectDir, 'speakers.json'), 'utf8').then(JSON.parse),
        fs.readFile(path.join(projectDir, 'remarks.json'), 'utf8').then(JSON.parse)
      ]);
      
      console.log('✅ Loaded project: ' + projectId + '');
      
      return {
        metadata,
        blocks: transcription.blocks,
        speakers: speakers.speakers,
        remarks: remarks.remarks
      };
    } catch (error) {
      console.error(`Error loading project ${projectId}:`, error);
      return null;
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
      
      console.log('✅ Created backup: ' + backupFile + '');
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
      
      console.log('✅ Restored from backup: ' + backupFile + '');
      return true;
    } catch (error) {
      console.error(`Error restoring backup ${backupFile}:`, error);
      return false;
    }
  }

  /**
   * List all projects for a specific user
   */
  async listProjects(userId: string = 'default'): Promise<any[]> {
    try {
      const userDir = this.getUserDir(userId);
      
      // Ensure user directory exists
      await fs.mkdir(userDir, { recursive: true });
      
      const entries = await fs.readdir(userDir);
      console.log('Found ${entries.length} entries in user ' + userId + ' projects directory');
      
      const projectFolders = entries.filter(e => e.match(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_\d{3}$/));
      console.log('Found ${projectFolders.length} project folders for user ' + userId + '');
      
      const projects = [];
      for (const folder of projectFolders) {
        try {
          const metadataPath = path.join(userDir, folder, 'metadata.json');
          const metadata = JSON.parse(
            await fs.readFile(metadataPath, 'utf8')
          );
          projects.push(metadata);
        } catch (error: any) {
          // Skip projects without metadata (probably incomplete)
          if (error.code !== 'ENOENT') {
            console.error(`Error reading metadata for ${folder}:`, error.message);
          }
        }
      }
      
      console.log(`Successfully loaded metadata for ${projects.length} projects`);
      
      // Sort by creation date (newest first)
      projects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      return projects;
    } catch (error) {
      console.error('Error listing projects:', error);
      return [];
    }
  }

  /**
   * Get project by media file name
   */
  async getProjectByMedia(mediaFileName: string, userId: string = 'default'): Promise<string | null> {
    try {
      const projects = await this.listProjects(userId);
      const project = projects.find(p => p.mediaFile === mediaFileName);
      return project ? project.projectId : null;
    } catch (error) {
      console.error('Error finding project by media:', error);
      return null;
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
      
      console.log('✅ Deleted project ' + projectId + '');
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
}

// Export singleton instance
export const projectService = new ProjectService();