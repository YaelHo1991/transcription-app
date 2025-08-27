/**
 * Project Upload Service
 * Handles hybrid storage for projects with local/URL/server media support
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

interface MediaSource {
  computerId: string;
  computerName: string;
  path: string;
  lastSeen: Date;
}

interface MediaFile {
  mediaId: string;
  name: string;
  type: 'local' | 'url' | 'server';
  sources: Record<string, MediaSource>;
  currentSource?: string;
  metadata: {
    size: number;
    duration?: string;
    format: string;
    fingerprint?: string;
  };
  serverStorage: {
    used: boolean;
    path?: string;
    uploadedAt?: Date;
  };
  notes: string[];
}

interface Project {
  projectId: string;
  userId: string;
  name: string;
  displayName: string;
  mediaFiles: MediaFile[];
  createdAt: Date;
  lastModified: Date;
}

interface TranscriptionData {
  mediaId: string;
  content: any[];
  speakers: any[];
  remarks: any[];
  versions: any[];
  lastModified: Date;
}

interface UserStorageQuota {
  userId: string;
  quotaLimit: number;  // in bytes
  quotaUsed: number;   // in bytes
  quotaType: 'free' | 'basic' | 'pro' | 'custom';
}

class ProjectUploadService {
  private projectsPath: string;
  private defaultQuota = 500 * 1024 * 1024; // 500MB default

  constructor() {
    this.projectsPath = path.join(process.cwd(), 'data', 'projects');
    this.initializeStorage();
  }

  private async initializeStorage() {
    try {
      await fs.mkdir(this.projectsPath, { recursive: true });
    } catch (error) {
      console.error('Failed to initialize storage:', error);
    }
  }

  /**
   * Create a project from folder upload
   */
  async createProjectFromFolder(params: {
    userId: string;
    folderName: string;
    mediaFiles: Array<{
      name: string;
      size: number;
      type: string;
      duration?: string;
      path?: string;
      url?: string;
    }>;
    computerId: string;
    computerName: string;
  }): Promise<Project> {
    const { userId, folderName, mediaFiles, computerId, computerName } = params;

    // Generate unique project ID
    const projectId = this.generateProjectId(folderName);
    
    // Check if project with same folder name exists
    const existingProject = await this.findProjectByFolderName(userId, folderName);
    
    if (existingProject) {
      // Merge new media into existing project
      return this.mergeMediaIntoProject(existingProject, mediaFiles, computerId, computerName);
    }

    // Create new project
    const project: Project = {
      projectId,
      userId,
      name: projectId,  // Internal storage name
      displayName: folderName,  // User-visible name
      mediaFiles: [],
      createdAt: new Date(),
      lastModified: new Date()
    };

    // Process each media file
    for (const file of mediaFiles) {
      const mediaId = uuidv4();
      
      // Determine media type
      let mediaType: 'local' | 'url' | 'server' = 'local';
      if (file.url && this.isValidUrl(file.url)) {
        mediaType = 'url';
      }

      const mediaFile: MediaFile = {
        mediaId,
        name: file.name,
        type: mediaType,
        sources: {},
        metadata: {
          size: file.size,
          duration: file.duration,
          format: path.extname(file.name).substring(1),
          fingerprint: await this.generateFingerprint(file)
        },
        serverStorage: {
          used: false
        },
        notes: [`Created from ${computerName} on ${new Date().toISOString()}`]
      };

      // Add source based on type
      if (mediaType === 'local' && file.path) {
        mediaFile.sources[computerId] = {
          computerId,
          computerName,
          path: file.path,
          lastSeen: new Date()
        };
        mediaFile.currentSource = computerId;
      } else if (mediaType === 'url' && file.url) {
        // URLs don't need computer-specific sources
        mediaFile.sources['url'] = {
          computerId: 'url',
          computerName: 'URL',
          path: file.url,
          lastSeen: new Date()
        };
        mediaFile.currentSource = 'url';
      }

      project.mediaFiles.push(mediaFile);

      // Create empty transcription structure
      await this.createTranscriptionStructure(userId, projectId, mediaId);
    }

    // Save project to disk
    await this.saveProject(project);

    return project;
  }

  /**
   * Create empty transcription structure for media
   */
  private async createTranscriptionStructure(
    userId: string, 
    projectId: string, 
    mediaId: string
  ): Promise<void> {
    const transcriptionPath = path.join(
      this.projectsPath,
      userId,
      'pages',
      'transcription',
      projectId,
      mediaId
    );

    await fs.mkdir(transcriptionPath, { recursive: true });

    // Create empty files
    const emptyTranscription: TranscriptionData = {
      mediaId,
      content: [],
      speakers: [],
      remarks: [],
      versions: [],
      lastModified: new Date()
    };

    await fs.writeFile(
      path.join(transcriptionPath, 'data.json'),
      JSON.stringify(emptyTranscription, null, 2)
    );

    // Create versions folder
    await fs.mkdir(path.join(transcriptionPath, 'versions'), { recursive: true });
  }

  /**
   * Update media path for multi-computer support
   */
  async updateMediaPath(params: {
    userId: string;
    projectId: string;
    mediaId: string;
    computerId: string;
    computerName: string;
    path: string;
  }): Promise<void> {
    const project = await this.getProjectById(params.userId, params.projectId);
    
    if (!project) {
      throw new Error('Project not found');
    }

    const media = project.mediaFiles.find(m => m.mediaId === params.mediaId);
    
    if (!media) {
      throw new Error('Media not found');
    }

    // Update or add computer source
    media.sources[params.computerId] = {
      computerId: params.computerId,
      computerName: params.computerName,
      path: params.path,
      lastSeen: new Date()
    };
    
    media.currentSource = params.computerId;
    media.notes.push(
      `Path updated from ${params.computerName} on ${new Date().toISOString()}`
    );

    project.lastModified = new Date();
    await this.saveProject(project);
  }

  /**
   * Upload media to server (within quota)
   */
  async uploadMediaToServer(params: {
    userId: string;
    projectId: string;
    mediaId: string;
    file: Buffer;
    filename: string;
  }): Promise<void> {
    // Check storage quota
    const quota = await this.getUserQuota(params.userId);
    const fileSize = params.file.length;
    
    if (quota.quotaUsed + fileSize > quota.quotaLimit) {
      throw new Error(
        `Storage quota exceeded. Available: ${this.formatBytes(quota.quotaLimit - quota.quotaUsed)}`
      );
    }

    const project = await this.getProjectById(params.userId, params.projectId);
    if (!project) throw new Error('Project not found');

    const media = project.mediaFiles.find(m => m.mediaId === params.mediaId);
    if (!media) throw new Error('Media not found');

    // Save file to server
    const serverPath = path.join(
      this.projectsPath,
      params.userId,
      'projects',
      params.projectId,
      'media',
      params.mediaId,
      params.filename
    );

    await fs.mkdir(path.dirname(serverPath), { recursive: true });
    await fs.writeFile(serverPath, params.file);

    // Update media record
    media.type = 'server';
    media.serverStorage = {
      used: true,
      path: serverPath,
      uploadedAt: new Date()
    };
    media.notes.push(`Uploaded to server on ${new Date().toISOString()}`);

    // Update quota (in production, this would be in database)
    await this.updateUserQuota(params.userId, quota.quotaUsed + fileSize);

    await this.saveProject(project);
  }

  /**
   * Get user storage quota
   */
  async getUserQuota(userId: string): Promise<UserStorageQuota> {
    // In production, this would query the database
    // For now, return default quota
    return {
      userId,
      quotaLimit: this.defaultQuota,
      quotaUsed: await this.calculateUserStorage(userId),
      quotaType: 'free'
    };
  }

  /**
   * Update user quota
   */
  private async updateUserQuota(userId: string, newUsed: number): Promise<void> {
    // In production, update database
    console.log(`Updated quota for user ${userId}: ${this.formatBytes(newUsed)} used`);
  }

  /**
   * Helper functions
   */
  private generateProjectId(folderName: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    const sanitized = folderName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10);
    return `proj_${sanitized}_${timestamp}_${random}`;
  }

  private async generateFingerprint(file: any): Promise<string> {
    // Generate a fingerprint based on file properties
    const data = `${file.name}-${file.size}-${file.type}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  private async saveProject(project: Project): Promise<void> {
    const projectPath = path.join(
      this.projectsPath,
      project.userId,
      'projects',
      project.projectId,
      'project.json'
    );
    
    await fs.mkdir(path.dirname(projectPath), { recursive: true });
    await fs.writeFile(projectPath, JSON.stringify(project, null, 2));
  }

  async getProjectById(userId: string, projectId: string): Promise<Project | null> {
    try {
      const projectPath = path.join(
        this.projectsPath,
        userId,
        'projects',
        projectId,
        'project.json'
      );
      const data = await fs.readFile(projectPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async findProjectByFolderName(userId: string, folderName: string): Promise<Project | null> {
    const userProjects = await this.getUserProjects(userId);
    return userProjects.find(p => p.displayName === folderName) || null;
  }

  async getUserProjects(userId: string): Promise<Project[]> {
    try {
      const userPath = path.join(this.projectsPath, userId, 'projects');
      const projectDirs = await fs.readdir(userPath);
      
      const projects: Project[] = [];
      for (const dir of projectDirs) {
        const project = await this.getProjectById(userId, dir);
        if (project) projects.push(project);
      }
      
      return projects;
    } catch {
      return [];
    }
  }

  private async calculateUserStorage(userId: string): Promise<number> {
    // Calculate total storage used by user's server-stored media
    let totalSize = 0;
    const projects = await this.getUserProjects(userId);
    
    for (const project of projects) {
      for (const media of project.mediaFiles) {
        if (media.serverStorage.used && media.serverStorage.path) {
          try {
            const stats = await fs.stat(media.serverStorage.path);
            totalSize += stats.size;
          } catch {
            // File doesn't exist
          }
        }
      }
    }
    
    return totalSize;
  }

  async deleteProject(userId: string, projectId: string, deleteTranscriptions: boolean): Promise<void> {
    const projectPath = path.join(this.projectsPath, userId, 'projects', projectId);
    
    if (deleteTranscriptions) {
      // Delete everything including transcriptions
      const transcriptionPath = path.join(
        this.projectsPath,
        userId,
        'pages',
        'transcription',
        projectId
      );
      await fs.rm(transcriptionPath, { recursive: true, force: true });
    }
    
    // Delete project data
    await fs.rm(projectPath, { recursive: true, force: true });
  }

  private async mergeMediaIntoProject(
    existingProject: Project,
    newMediaFiles: any[],
    computerId: string,
    computerName: string
  ): Promise<Project> {
    // Add only new media files not already in project
    for (const file of newMediaFiles) {
      const exists = existingProject.mediaFiles.some(m => m.name === file.name);
      if (!exists) {
        // Add as new media
        const mediaId = uuidv4();
        const mediaType: 'local' | 'url' = file.url ? 'url' : 'local';
        
        const mediaFile: MediaFile = {
          mediaId,
          name: file.name,
          type: mediaType,
          sources: {},
          metadata: {
            size: file.size,
            format: path.extname(file.name).substring(1),
            fingerprint: await this.generateFingerprint(file)
          },
          serverStorage: {
            used: false
          },
          notes: [`Added from ${computerName} on ${new Date().toISOString()}`]
        };

        if (mediaType === 'local' && file.path) {
          mediaFile.sources[computerId] = {
            computerId,
            computerName,
            path: file.path,
            lastSeen: new Date()
          };
        }

        existingProject.mediaFiles.push(mediaFile);
        
        // Create transcription structure
        await this.createTranscriptionStructure(
          existingProject.userId,
          existingProject.projectId,
          mediaId
        );
      }
    }
    
    existingProject.lastModified = new Date();
    await this.saveProject(existingProject);
    
    return existingProject;
  }
}

export const projectUploadService = new ProjectUploadService();