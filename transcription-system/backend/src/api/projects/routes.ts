import { Router, Request, Response, NextFunction } from 'express';
import { projectService } from '../../services/projectService';
import storageService from '../../services/storageService';
import { backgroundJobService } from '../../services/backgroundJobs';
import path from 'path';
import fs, { createReadStream } from 'fs';
import fs_promises from 'fs/promises';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Import JWT for token verification
import jwt from 'jsonwebtoken';

// Middleware to verify user from JWT token
const verifyUser = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    const isDev = process.env.NODE_ENV?.trim() === 'development';
    
    if (!token) {
      // In dev mode, allow without token but use a default user
      if (isDev) {
        (req as any).user = { id: 'dev-user-default', username: 'dev-user' };
        return next();
      }
      return res.status(401).json({ error: 'No authorization token provided' });
    }
    
    // In dev mode, accept any token starting with 'dev-'
    if (isDev && token && token.startsWith('dev-')) {
      const userId = token.substring(4) || 'dev-user-default';
      (req as any).user = { id: userId, username: userId };
      return next();
    }
    
    // Verify token and extract user info
    const secret = process.env.JWT_SECRET || 'default-secret-key';
    const decoded = jwt.verify(token, secret) as any;
    
    // Use the actual user ID from the token
    (req as any).user = { 
      id: decoded.userId || decoded.id || 'unknown', 
      username: decoded.username || decoded.email || 'unknown'
    };
    
    next();
  } catch (error) {
    console.error('Auth error:', error);
    // In dev mode, continue with default user
    if (process.env.NODE_ENV === 'development') {
      (req as any).user = { id: 'dev-user-default', username: 'dev-user' };
      return next();
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};


/**
 * Save project data
 */
router.post('/:projectId/save', verifyUser, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { blocks, speakers, remarks } = req.body;
    
    // console.log removed for production
    
    const userId = (req as any).user?.id || 'unknown';
    const success = await projectService.saveProject(projectId, {
      blocks,
      speakers,
      remarks
    }, userId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Project ' + projectId + ' saved successfully'
      });
    } else {
      res.status(500).json({ error: 'Failed to save project' });
    }
  } catch (error: any) {
    console.error('Error saving project:', error);
    res.status(500).json({ error: error.message || 'Failed to save project' });
  }
});


/**
 * Create a backup
 */
router.post('/:projectId/backup', verifyUser, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    
    // console.log removed for production
    
    const userId = (req as any).user?.id || 'unknown';
    const backupFile = await projectService.createBackup(projectId, userId);
    
    if (backupFile) {
      res.json({
        success: true,
        backupFile,
        message: `Backup ${backupFile} created successfully`
      });
    } else {
      res.status(500).json({ error: 'Failed to create backup' });
    }
  } catch (error: any) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: error.message || 'Failed to create backup' });
  }
});

/**
 * Restore from backup
 */
router.post('/:projectId/restore/:backupFile', verifyUser, async (req: Request, res: Response) => {
  try {
    const { projectId, backupFile } = req.params;
    
    // console.log removed for production
    
    const userId = (req as any).user?.id || 'unknown';
    const success = await projectService.restoreBackup(projectId, backupFile, userId);
    
    if (success) {
      // Project loading removed
      console.log('[API] Project loading disabled');
      
      res.json({
        success: true,
        message: `Project restored from backup ${backupFile}` 
      });
    } else {
      res.status(500).json({ error: 'Failed to restore from backup' });
    }
  } catch (error: any) {
    console.error('Error restoring backup:', error);
    res.status(500).json({ error: error.message || 'Failed to restore backup' });
  }
});

/**
 * Create a backup for specific media in a project
 */
router.post('/:projectId/media/:mediaId/backup', verifyUser, async (req: Request, res: Response) => {
  try {
    const { projectId, mediaId } = req.params;
    const backupData = req.body;
    const userId = (req as any).user?.id || 'dev-anonymous';
    
    // Create backup directory in the media folder
    const backupDir = path.join(
      process.cwd(), 
      'user_data', 
      'users', 
      userId, 
      'projects',
      projectId,
      'media',
      mediaId,
      'backups'
    );
    
    await fs_promises.mkdir(backupDir, { recursive: true });
    
    // Get list of existing backups to determine version number
    const existingBackups = await fs_promises.readdir(backupDir).catch(() => []);
    const backupFiles = existingBackups.filter(f => f.startsWith('backup_v'));
    
    // Keep only last 50 versions
    if (backupFiles.length >= 50) {
      // Sort by version number and delete oldest
      backupFiles.sort((a, b) => {
        const versionA = parseInt(a.match(/backup_v(\d+)/)?.[1] || '0');
        const versionB = parseInt(b.match(/backup_v(\d+)/)?.[1] || '0');
        return versionA - versionB;
      });
      
      // Delete oldest versions to keep only 49 (we'll add a new one)
      const toDelete = backupFiles.slice(0, backupFiles.length - 49);
      for (const file of toDelete) {
        await fs_promises.unlink(path.join(backupDir, file)).catch(() => {});
      }
    }
    
    // Determine next version number
    const latestVersion = backupFiles.reduce((max, file) => {
      const version = parseInt(file.match(/backup_v(\d+)/)?.[1] || '0');
      return Math.max(max, version);
    }, 0);
    
    const newVersion = latestVersion + 1;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup_v${newVersion}_${timestamp}.json`;
    const backupPath = path.join(backupDir, backupFileName);
    
    // Add version to backup data
    const versionedData = {
      ...backupData,
      metadata: {
        ...backupData.metadata,
        version: newVersion,
        backupDate: new Date().toISOString(),
        fileName: backupFileName
      }
    };
    
    // Write backup file
    await fs_promises.writeFile(backupPath, JSON.stringify(versionedData, null, 2));
    
    res.json({
      success: true,
      version: newVersion,
      fileName: backupFileName,
      message: `Backup version ${newVersion} created for media ${mediaId}`
    });
    
  } catch (error: any) {
    console.error('Error creating media backup:', error);
    res.status(500).json({ error: error.message || 'Failed to create media backup' });
  }
});

/**
 * List backups for specific media in a project
 */
router.get('/:projectId/media/:mediaId/backups', verifyUser, async (req: Request, res: Response) => {
  try {
    const { projectId, mediaId } = req.params;
    const userId = (req as any).user?.id || 'dev-anonymous';
    
    const backupDir = path.join(
      process.cwd(), 
      'user_data', 
      'users', 
      userId, 
      'projects',
      projectId,
      'media',
      mediaId,
      'backups'
    );
    
    // Check if backup directory exists
    try {
      await fs_promises.access(backupDir);
    } catch {
      return res.json({ success: true, backups: [] });
    }
    
    // Read backup files
    const files = await fs_promises.readdir(backupDir);
    const backupFiles = files.filter(f => f.startsWith('backup_v') && f.endsWith('.json'));
    
    // Get details for each backup
    const backups = await Promise.all(backupFiles.map(async (file) => {
      const filePath = path.join(backupDir, file);
      const stats = await fs_promises.stat(filePath);
      const version = parseInt(file.match(/backup_v(\d+)/)?.[1] || '0');
      
      // Read file to get metadata
      try {
        const content = await fs_promises.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        return {
          file,
          version,
          timestamp: stats.mtime.toISOString(),
          size: stats.size,
          blocks: data.blocks?.length || 0,
          speakers: data.speakers?.length || 0,
          remarks: data.remarks?.length || 0
        };
      } catch {
        return {
          file,
          version,
          timestamp: stats.mtime.toISOString(),
          size: stats.size
        };
      }
    }));
    
    // Sort by version descending (newest first)
    backups.sort((a, b) => b.version - a.version);
    
    res.json({
      success: true,
      backups
    });
    
  } catch (error: any) {
    console.error('Error listing media backups:', error);
    res.status(500).json({ error: error.message || 'Failed to list media backups' });
  }
});

/**
 * Get specific backup content for media
 */
router.get('/:projectId/media/:mediaId/backups/:backupFile', verifyUser, async (req: Request, res: Response) => {
  try {
    const { projectId, mediaId, backupFile } = req.params;
    const userId = (req as any).user?.id || 'dev-anonymous';
    
    const backupPath = path.join(
      process.cwd(), 
      'user_data', 
      'users', 
      userId, 
      'projects',
      projectId,
      'media',
      mediaId,
      'backups',
      backupFile
    );
    
    // Check if file exists
    await fs_promises.access(backupPath);
    
    // Read and parse backup content
    const content = await fs_promises.readFile(backupPath, 'utf-8');
    const data = JSON.parse(content);
    
    res.json({
      success: true,
      ...data
    });
    
  } catch (error: any) {
    console.error('Error loading media backup:', error);
    res.status(500).json({ error: error.message || 'Failed to load media backup' });
  }
});

/**
 * Create project from folder with multiple media files
 */
router.post('/create-from-folder', verifyUser, upload.array('files'), async (req: Request, res: Response) => {
  try {
    const { folderName, computerId, computerName } = req.body;
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }
    
    const userId = (req as any).user?.id || 'unknown';
    console.log(`[FolderUpload] Creating project from folder: ${folderName} with ${files.length} files for user: ${userId}`);
    
    // Filter for media files only
    const mediaFiles = files.filter(file => 
      file.mimetype.startsWith('audio/') || 
      file.mimetype.startsWith('video/')
    );
    
    if (mediaFiles.length === 0) {
      return res.status(400).json({ error: 'No media files found in upload' });
    }
    
    // Check storage limit before processing
    const totalSize = mediaFiles.reduce((sum, file) => sum + file.buffer.length, 0);
    const storageCheck = await storageService.canUserUpload(userId, totalSize);
    
    if (!storageCheck.canUpload) {
      console.log(`[FolderUpload] Storage limit exceeded for user ${userId}: ${storageCheck.message}`);
      return res.status(413).json({ 
        error: 'Storage limit exceeded',
        details: storageCheck.message,
        currentUsedMB: storageCheck.currentUsedMB,
        limitMB: storageCheck.limitMB,
        availableMB: storageCheck.availableMB,
        requestedMB: storageCheck.requestedMB
      });
    }
    
    // Get properly encoded filenames if provided
    let fileNames: string[] = [];
    try {
      if (req.body.fileNames) {
        fileNames = JSON.parse(req.body.fileNames);
      }
    } catch (e) {
      console.log('[FolderUpload] Could not parse fileNames, using originalname');
    }
    
    // Prepare media files for project service
    const mediaFilesData = mediaFiles.map((file, index) => ({
      name: fileNames[index] || file.originalname, // Use UTF-8 encoded name if available
      buffer: file.buffer,
      mimeType: file.mimetype
    }));
    
    // Create the project
    const result = await projectService.createMultiMediaProject(folderName, mediaFilesData, userId);
    
    console.log(`[FolderUpload] Project created successfully: ${result.projectId} with ${result.mediaIds.length} media files`);
    
    // Update user's storage usage after successful upload
    await storageService.incrementUsedStorage(userId, totalSize);
    
    res.json({
      success: true,
      projectId: result.projectId,
      mediaIds: result.mediaIds,
      totalMedia: result.mediaIds.length,
      message: `Project "${folderName}" created with ${result.mediaIds.length} media files`
    });
  } catch (error: any) {
    console.error('Error creating project from folder:', error);
    res.status(500).json({ error: error.message || 'Failed to create project from folder' });
  }
});

/**
 * List all projects
 */
router.get('/list', verifyUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'unknown';
    console.log(`[ProjectList] Loading projects for user: ${userId}`);
    
    // Queue background storage calculation (non-blocking)
    backgroundJobService.queueStorageCalculation(userId);
    
    // Load projects using the new project service method (fast now)
    const projects = await projectService.listProjects(userId);
    
    res.json({
      success: true,
      projects,
      count: projects.length
    });
  } catch (error: any) {
    console.error('Error listing projects:', error);
    res.status(500).json({ error: error.message || 'Failed to list projects' });
  }
});




/**
 * NEW: Save transcription data for media (ProjectLoader compatible)
 */
router.post('/media/:mediaId/:type', verifyUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'unknown';
    const { mediaId, type } = req.params;
    const { blocks, speakers, remarks } = req.body;
    
    console.log('[Transcription] Saving transcription for media:', mediaId, 'type:', type);
    console.log('[Transcription] Save data received:', {
      blocks: blocks?.length || 0,
      speakers: speakers?.length || 0,
      remarks: remarks?.length || 0,
      userId,
      firstBlockText: blocks?.[0]?.text?.substring(0, 50) || 'No text'
    });
    
    // Find the project containing this media
    const userPath = path.join(process.cwd(), 'user_data', 'users', userId, 'projects');
    const projectDirs = await fs_promises.readdir(userPath);
    
    for (const projectId of projectDirs) {
      const mediaPath = path.join(userPath, projectId, mediaId, type, 'data.json');
      
      try {
        // Check if this media exists in this project
        await fs_promises.access(path.dirname(mediaPath));
        
        // Load existing data to preserve metadata
        let existingData: any = {};
        try {
          const existingContent = await fs_promises.readFile(mediaPath, 'utf-8');
          existingData = JSON.parse(existingContent);
        } catch {
          // File doesn't exist yet, use defaults
          existingData = {
            folderId: uuidv4(),
            type,
            helperFiles: [],
            backups: [],
            createdAt: new Date().toISOString()
          };
        }
        
        // Save the transcription data, preserving existing metadata
        const transcriptionData = {
          ...existingData,  // Preserve existing metadata
          type,
          blocks: blocks || [],
          speakers: speakers || [],
          remarks: remarks || [],
          lastModified: new Date().toISOString()
        };
        
        // Save main data file
        await fs_promises.writeFile(mediaPath, JSON.stringify(transcriptionData, null, 2));
        
        // Save speakers and remarks separately
        const transcriptionDir = path.dirname(mediaPath);
        await fs_promises.writeFile(
          path.join(transcriptionDir, 'speakers.json'),
          JSON.stringify(speakers || [], null, 2)
        );
        
        await fs_promises.writeFile(
          path.join(transcriptionDir, 'remarks.json'),
          JSON.stringify(remarks || [], null, 2)
        );
        
        console.log('[Transcription] Saved successfully to:', mediaPath);
        return res.json({ success: true, data: transcriptionData });
      } catch {
        // Continue searching in other projects
      }
    }
    
    res.status(404).json({ error: 'Media not found' });
  } catch (error) {
    console.error('[Transcription] Failed to save:', error);
    res.status(500).json({ error: 'Failed to save transcription' });
  }
});

/**
 * Load media data from multi-media project (MUST come before generic /:type route)
 */
router.get('/:projectId/media/:mediaId/load', verifyUser, async (req: Request, res: Response) => {
  try {
    const { projectId, mediaId } = req.params;
    const userId = (req as any).user?.id || 'unknown';
    
    console.log(`[MediaData] Loading data for project: ${projectId}, media: ${mediaId}, user: ${userId}`);
    
    const mediaData = await projectService.loadMediaData(projectId, mediaId, userId);
    
    if (mediaData) {
      res.json({
        success: true,
        ...mediaData
      });
    } else {
      res.status(404).json({ error: 'Media data not found' });
    }
  } catch (error: any) {
    console.error('Error loading media data:', error);
    res.status(500).json({ error: error.message || 'Failed to load media data' });
  }
});

/**
 * NEW: Get transcription data for specific media in specific project (GENERIC ROUTE - must come after specific routes)
 */
router.get('/:projectId/media/:mediaId/:type', verifyUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'unknown';
    const { projectId, mediaId, type } = req.params;
    
    console.log(`[Transcription] Loading ${type} for project: ${projectId}, media: ${mediaId}, user: ${userId}`);
    
    // Direct path to the transcription
    const mediaPath = path.join(
      process.cwd(), 
      'user_data', 
      'users', 
      userId, 
      'projects', 
      projectId, 
      'media',
      mediaId, 
      type, 
      'data.json'
    );
    
    try {
      await fs_promises.access(mediaPath);
      console.log(`[Transcription] Found transcription at: ${mediaPath}`);
      const data = await fs_promises.readFile(mediaPath, 'utf-8');
      const parsed = JSON.parse(data);
      console.log(`[Transcription] Returning transcription with ${parsed.blocks?.length || 0} blocks, first block: "${parsed.blocks?.[0]?.text?.substring(0, 50) || 'empty'}"`);
      return res.json(parsed);
    } catch (error) {
      console.log(`[Transcription] No transcription found at: ${mediaPath}`);
      // For transcription type, return empty structure instead of 404
      if (type === 'transcription') {
        return res.json({
          blocks: [],
          speakers: [],
          remarks: [],
          metadata: {}
        });
      }
      return res.status(404).json({ error: 'Data not found' });
    }
  } catch (error) {
    console.error('[Transcription] Failed to get transcription:', error);
    res.status(500).json({ error: 'Failed to load transcription' });
  }
});

/**
 * NEW: Get transcription data for media (ProjectLoader compatible) - searches all projects
 */
router.get('/media/:mediaId/:type', verifyUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'unknown';
    const { mediaId, type } = req.params;
    
    console.log(`[Transcription] Loading ${type} for media: ${mediaId}, user: ${userId}`);
    
    // Find the project containing this media
    const userPath = path.join(process.cwd(), 'user_data', 'users', userId, 'projects');
    
    try {
      const projectDirs = await fs_promises.readdir(userPath);
      console.log(`[Transcription] Found ${projectDirs.length} projects for user`);
      
      for (const projectId of projectDirs) {
        const mediaPath = path.join(userPath, projectId, mediaId, type, 'data.json');
        
        try {
          await fs_promises.access(mediaPath);
          console.log(`[Transcription] Found transcription at: ${mediaPath}`);
          const data = await fs_promises.readFile(mediaPath, 'utf-8');
          const parsed = JSON.parse(data);
          console.log(`[Transcription] Returning transcription with ${parsed.blocks?.length || 0} blocks, first block: "${parsed.blocks?.[0]?.text?.substring(0, 50) || 'empty'}"`);
          return res.json(parsed);
        } catch {
          // Continue searching in other projects
        }
      }
    } catch (error) {
      console.log(`[Transcription] No projects found for user: ${userId}`);
    }
    
    console.log(`[Transcription] No transcription found for media: ${mediaId}`);
    res.status(404).json({ error: 'Transcription not found' });
  } catch (error) {
    console.error('[Transcription] Failed to get transcription:', error);
    res.status(500).json({ error: 'Failed to load transcription' });
  }
});

/**
 * Get project by media file
 */
router.get('/by-media/:mediaFileName', verifyUser, async (req: Request, res: Response) => {
  try {
    const { mediaFileName } = req.params;
    
    // console.log removed for production
    
    const userId = (req as any).user?.id || 'unknown';
    // Project lookup by media removed
    const projectId = null; // await projectService.getProjectByMedia(mediaFileName, userId);
    
    if (projectId) {
      res.json({
        success: true,
        projectId,
        exists: true
      });
    } else {
      res.json({
        success: true,
        projectId: null,
        exists: false
      });
    }
  } catch (error: any) {
    console.error('Error finding project by media:', error);
    res.status(500).json({ error: error.message || 'Failed to find project' });
  }
});

/**
 * List backups for a project
 */
router.get('/:projectId/backups', verifyUser, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    
    // console.log removed for production
    
    const userId = (req as any).user?.id || 'unknown';
    const backups = await projectService.listBackups(projectId, userId);
    
    res.json({
      success: true,
      backups,
      count: backups.length
    });
  } catch (error: any) {
    console.error('Error listing backups:', error);
    res.status(500).json({ error: error.message || 'Failed to list backups' });
  }
});

/**
 * Get specific backup content
 */
router.get('/:projectId/backups/:backupFile', verifyUser, async (req: Request, res: Response) => {
  try {
    const { projectId, backupFile } = req.params;
    
    // console.log removed for production
    
    const userId = (req as any).user?.id || 'unknown';
    const content = await projectService.getBackupContent(projectId, backupFile, userId);
    
    if (content) {
      res.json({
        success: true,
        ...content
      });
    } else {
      res.status(404).json({ error: 'Backup not found' });
    }
  } catch (error: any) {
    console.error('Error loading backup:', error);
    res.status(500).json({ error: error.message || 'Failed to load backup' });
  }
});

/**
 * Get orphaned transcriptions
 */
router.get('/orphaned/transcriptions', verifyUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'unknown';
    const orphanedPath = path.join(process.cwd(), 'user_data', 'users', userId, 'orphaned');
    
    const transcriptions: any[] = [];
    
    try {
      await fs_promises.access(orphanedPath);
      
      // Read all orphan folders
      const orphanFolders = await fs_promises.readdir(orphanedPath);
      
      for (const orphanFolder of orphanFolders) {
        const orphanPath = path.join(orphanedPath, orphanFolder);
        const stats = await fs_promises.stat(orphanPath);
        
        if (stats.isDirectory()) {
          // Check if this is a project folder (has media subfolders) or single media
          const contents = await fs_promises.readdir(orphanPath);
          
          for (const item of contents) {
            const itemPath = path.join(orphanPath, item);
            const itemStats = await fs_promises.stat(itemPath);
            
            if (itemStats.isDirectory()) {
              // This could be a media folder
              const transcriptionDataPath = path.join(itemPath, 'transcription', 'data.json');
              
              try {
                const data = JSON.parse(await fs_promises.readFile(transcriptionDataPath, 'utf-8'));
                
                // Calculate size
                let size = 0;
                try {
                  const files = await fs_promises.readdir(path.join(itemPath, 'transcription'));
                  for (const file of files) {
                    const filePath = path.join(itemPath, 'transcription', file);
                    const fileStats = await fs_promises.stat(filePath);
                    size += fileStats.size;
                  }
                } catch {
                  // Ignore size calculation errors
                }
                
                transcriptions.push({
                  id: `${orphanFolder}_${item}`,
                  originalProjectName: data.orphanedFrom?.projectName || 'Unknown Project',
                  originalMediaName: data.orphanedFrom?.mediaName || data.metadata?.originalName || data.metadata?.fileName || 'Unknown Media',
                  archivedDate: data.orphanedFrom?.orphanedAt || stats.ctime.toISOString(),
                  size: size,
                  blocksCount: data.blocks?.length || 0,
                  speakersCount: data.speakers?.length || 0,
                  path: transcriptionDataPath,
                  orphanFolder: orphanFolder,
                  mediaId: item
                });
              } catch {
                // Not a valid transcription folder, skip
              }
            }
          }
          
          // Also check for direct transcription folder (old format)
          const directTranscriptionPath = path.join(orphanPath, 'transcription', 'data.json');
          try {
            const data = JSON.parse(await fs_promises.readFile(directTranscriptionPath, 'utf-8'));
            
            // Calculate size
            let size = 0;
            try {
              const files = await fs_promises.readdir(path.join(orphanPath, 'transcription'));
              for (const file of files) {
                const filePath = path.join(orphanPath, 'transcription', file);
                const fileStats = await fs_promises.stat(filePath);
                size += fileStats.size;
              }
            } catch {
              // Ignore size calculation errors
            }
            
            transcriptions.push({
              id: orphanFolder,
              originalProjectName: data.orphanedFrom?.projectName || 'Unknown Project',
              originalMediaName: data.orphanedFrom?.mediaName || data.metadata?.originalName || data.metadata?.fileName || 'Unknown Media',
              archivedDate: data.orphanedFrom?.orphanedAt || stats.ctime.toISOString(),
              size: size,
              blocksCount: data.blocks?.length || 0,
              speakersCount: data.speakers?.length || 0,
              path: directTranscriptionPath,
              orphanFolder: orphanFolder,
              mediaId: null
            });
          } catch {
            // Not a transcription folder, skip
          }
        }
      }
    } catch {
      // Orphaned directory doesn't exist yet
    }
    
    res.json({
      success: true,
      transcriptions: transcriptions
    });
  } catch (error: any) {
    console.error('Error loading orphaned transcriptions:', error);
    res.status(500).json({ error: error.message || 'Failed to load orphaned transcriptions' });
  }
});

/**
 * Export orphaned transcription
 */
router.post('/orphaned/export', verifyUser, async (req: Request, res: Response) => {
  try {
    const { transcriptionId, format } = req.body;
    const userId = (req as any).user?.id || 'unknown';
    
    // The transcriptionId is the full folder name (e.g., orphan_1756840988593_media-1)
    const orphanedPath = path.join(process.cwd(), 'user_data', 'users', userId, 'orphaned');
    
    // Check if the ID contains both orphan folder and media ID (new format for multi-media projects)
    // Format: orphan_timestamp_projectname_mediaId where mediaId is separate
    const idParts = transcriptionId.split('_');
    let dataPath;
    
    // Check if this is a media-specific orphan (ends with media-N or similar pattern)
    if (transcriptionId.match(/_media-\d+$/)) {
      // Single media orphan: orphan_timestamp_media-N/transcription/data.json
      dataPath = path.join(orphanedPath, transcriptionId, 'transcription', 'data.json');
    } else if (idParts.length > 3 && idParts[idParts.length - 1].startsWith('media-')) {
      // Multi-media project orphan with separate folder
      const mediaId = idParts[idParts.length - 1];
      const projectFolder = idParts.slice(0, -1).join('_');
      dataPath = path.join(orphanedPath, projectFolder, mediaId, 'transcription', 'data.json');
    } else {
      // Default: direct transcription folder
      dataPath = path.join(orphanedPath, transcriptionId, 'transcription', 'data.json');
    }
    
    // Read the transcription data
    const data = JSON.parse(await fs_promises.readFile(dataPath, 'utf-8'));
    
    if (format === 'json') {
      // Return as JSON
      res.json({
        success: true,
        format: 'json',
        filename: `transcription_${transcriptionId}.json`,
        data: data
      });
    } else if (format === 'word') {
      // Create Word document using the service
      const { wordExportService } = await import('../../services/wordExportService');
      const buffer = await wordExportService.createWordDocument(data);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="transcription_${transcriptionId}.docx"`);
      res.send(buffer);
    } else {
      res.status(400).json({ error: 'Invalid format. Use "json" or "word"' });
    }
  } catch (error: any) {
    console.error('Error exporting orphaned transcription:', error);
    res.status(500).json({ error: error.message || 'Failed to export transcription' });
  }
});

/**
 * Delete orphaned transcription
 */
router.delete('/orphaned/:transcriptionId', verifyUser, async (req: Request, res: Response) => {
  try {
    const transcriptionId = decodeURIComponent(req.params.transcriptionId);
    const userId = (req as any).user?.id || 'unknown';
    
    console.log(`[OrphanDelete] Received deletion request for: ${transcriptionId} from user: ${userId}`);
    
    // The transcriptionId could be in different formats depending on how it was orphaned
    const orphanedPath = path.join(process.cwd(), 'user_data', 'users', userId, 'orphaned');
    
    // Parse the transcription ID to handle different formats
    let deletePath;
    
    // Check if this is a nested media ID (format: orphan_timestamp_projectname_media-N)
    if (transcriptionId.includes('_media-')) {
      // This might be a media within a project orphan
      const parts = transcriptionId.split('_');
      const mediaId = parts[parts.length - 1]; // Get the last part (media-N)
      const projectPart = parts.slice(0, -1).join('_'); // Get everything except media-N
      
      // First try the nested structure
      const nestedPath = path.join(orphanedPath, projectPart, mediaId);
      const directPath = path.join(orphanedPath, transcriptionId);
      
      // Check which path exists
      const nestedExists = await fs_promises.access(nestedPath).then(() => true).catch(() => false);
      const directExists = await fs_promises.access(directPath).then(() => true).catch(() => false);
      
      if (nestedExists) {
        deletePath = nestedPath;
        console.log(`[OrphanDelete] Found nested orphan at: ${nestedPath}`);
      } else if (directExists) {
        deletePath = directPath;
        console.log(`[OrphanDelete] Found direct orphan at: ${directPath}`);
      } else {
        // Try the full ID as-is
        deletePath = path.join(orphanedPath, transcriptionId);
        console.log(`[OrphanDelete] Trying default path: ${deletePath}`);
      }
    } else {
      // Simple orphan folder name
      deletePath = path.join(orphanedPath, transcriptionId);
      console.log(`[OrphanDelete] Using simple path: ${deletePath}`);
    }
    
    console.log(`[OrphanDelete] Final delete path: ${deletePath}`);
    
    // Check if the folder exists
    const exists = await fs_promises.access(deletePath).then(() => true).catch(() => false);
    
    if (!exists) {
      console.log(`[OrphanDelete] Path does not exist: ${deletePath}`);
      res.status(404).json({ 
        error: 'Transcription not found',
        message: `Orphaned transcription ${transcriptionId} not found`
      });
      return;
    }
    
    // Delete the folder
    await fs_promises.rm(deletePath, { recursive: true, force: true });
    
    console.log(`[OrphanDelete] Successfully deleted: ${deletePath}`);
    
    res.json({
      success: true,
      message: `Orphaned transcription ${transcriptionId} deleted successfully`
    });
  } catch (error: any) {
    console.error('[OrphanDelete] Error deleting orphaned transcription:', error);
    res.status(500).json({ error: error.message || 'Failed to delete transcription' });
  }
});

/**
 * Delete a project with option to preserve transcriptions
 */
router.delete('/:projectId', verifyUser, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { deleteTranscription = false } = req.body;
    
    const userId = (req as any).user?.id || 'unknown';
    
    // If we should preserve transcriptions, move them to orphaned folder
    if (!deleteTranscription) {
      const projectPath = path.join(process.cwd(), 'user_data', 'users', userId, 'projects', projectId);
      const orphanedPath = path.join(process.cwd(), 'user_data', 'users', userId, 'orphaned');
      
      // Create orphaned directory if it doesn't exist
      await fs_promises.mkdir(orphanedPath, { recursive: true });
      
      // Read project to get media files
      const projectFile = path.join(projectPath, 'project.json');
      try {
        const projectData = JSON.parse(await fs_promises.readFile(projectFile, 'utf-8'));
        
        // Get project name for the orphaned folder
        const projectName = projectData.projectName || projectData.name || projectId;
        const timestamp = Date.now();
        const orphanedProjectFolder = `orphan_${timestamp}_${projectName.replace(/[^a-zA-Z0-9א-ת_-]/g, '_').substring(0, 20)}`;
        const orphanedProjectPath = path.join(orphanedPath, orphanedProjectFolder);
        
        // Create the project folder in orphaned
        await fs_promises.mkdir(orphanedProjectPath, { recursive: true });
        
        // Move each media's transcription folder
        if (projectData.mediaFiles) {
          for (const mediaId of projectData.mediaFiles) {
            // Check for multi-media project structure first
            let transcriptionPath = path.join(projectPath, 'media', mediaId, 'transcription');
            
            // If not found, try old structure
            try {
              await fs_promises.access(transcriptionPath);
            } catch {
              transcriptionPath = path.join(projectPath, mediaId, 'transcription');
            }
            
            try {
              await fs_promises.access(transcriptionPath);
              
              // Create media folder in orphaned
              const targetMediaPath = path.join(orphanedProjectPath, mediaId);
              await fs_promises.mkdir(targetMediaPath, { recursive: true });
              
              // Move the transcription folder
              const targetPath = path.join(targetMediaPath, 'transcription');
              await fs_promises.rename(transcriptionPath, targetPath);
              
              // Update metadata to indicate when it was moved
              const dataPath = path.join(targetPath, 'data.json');
              try {
                const data = JSON.parse(await fs_promises.readFile(dataPath, 'utf-8'));
                data.orphanedFrom = {
                  projectId,
                  projectName,
                  mediaId: mediaId,
                  mediaName: data.metadata?.originalName || data.metadata?.fileName || mediaId,
                  orphanedAt: new Date().toISOString()
                };
                await fs_promises.writeFile(dataPath, JSON.stringify(data, null, 2));
              } catch (error) {
                console.error('Failed to update orphaned transcription metadata:', error);
              }
            } catch {
              // Transcription doesn't exist, skip
            }
          }
        }
      } catch (error) {
        console.error('Failed to read project data:', error);
      }
    }
    
    // Now delete the project
    const success = await projectService.deleteProject(projectId, userId);
    
    if (success) {
      res.json({
        success: true,
        message: `Project ${projectId} deleted successfully`,
        transcriptionsPreserved: !deleteTranscription
      });
    } else {
      res.status(404).json({ error: 'Project not found' });
    }
  } catch (error: any) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: error.message || 'Failed to delete project' });
  }
});

/**
 * Delete a specific media file from a project
 */
router.delete('/:projectId/media/:mediaId', verifyUser, async (req: Request, res: Response) => {
  try {
    const { projectId, mediaId } = req.params;
    const { deleteTranscription = false } = req.body;
    const userId = (req as any).user?.id || 'unknown';
    
    const projectPath = path.join(process.cwd(), 'user_data', 'users', userId, 'projects', projectId);
    
    // Check if this is a multi-media project (has media subdirectory)
    let mediaPath = path.join(projectPath, 'media', mediaId);
    try {
      await fs_promises.access(mediaPath);
    } catch {
      // Fall back to old structure (direct mediaId folder)
      mediaPath = path.join(projectPath, mediaId);
    }
    
    // Check if media exists
    try {
      await fs_promises.access(mediaPath);
    } catch {
      return res.status(404).json({ error: 'Media not found' });
    }
    
    // If we should preserve transcription, move it to orphaned folder
    if (!deleteTranscription) {
      const transcriptionPath = path.join(mediaPath, 'transcription');
      const orphanedPath = path.join(process.cwd(), 'user_data', 'users', userId, 'orphaned');
      
      try {
        await fs_promises.access(transcriptionPath);
        
        // Create orphaned directory if it doesn't exist
        await fs_promises.mkdir(orphanedPath, { recursive: true });
        
        // Get project name from project.json
        const projectFile = path.join(projectPath, 'project.json');
        let projectName = projectId;
        try {
          const projectData = JSON.parse(await fs_promises.readFile(projectFile, 'utf-8'));
          projectName = projectData.projectName || projectData.name || projectId;
        } catch {
          // Use projectId if can't read project data
        }
        
        // Create folder for this media's transcription
        const timestamp = Date.now();
        const orphanFolder = `orphan_${timestamp}_${mediaId.substring(0, 8)}`;
        const targetPath = path.join(orphanedPath, orphanFolder, 'transcription');
        
        // Create the target directory
        await fs_promises.mkdir(path.dirname(targetPath), { recursive: true });
        
        // Move the transcription folder
        await fs_promises.rename(transcriptionPath, targetPath);
        
        // Update metadata
        const dataPath = path.join(targetPath, 'data.json');
        try {
          const data = JSON.parse(await fs_promises.readFile(dataPath, 'utf-8'));
          
          // Try to get the media name from metadata
          let mediaName = mediaId;
          try {
            const mediaMetadataPath = path.join(mediaPath, '..', 'metadata.json');
            const mediaMetadata = JSON.parse(await fs_promises.readFile(mediaMetadataPath, 'utf-8'));
            mediaName = mediaMetadata.originalName || mediaMetadata.fileName || mediaId;
          } catch {
            // If no metadata.json, use the name from transcription metadata if available
            mediaName = data.metadata?.originalName || data.metadata?.fileName || mediaId;
          }
          
          data.orphanedFrom = {
            projectId,
            projectName,
            mediaId,
            mediaName,
            orphanedAt: new Date().toISOString()
          };
          await fs_promises.writeFile(dataPath, JSON.stringify(data, null, 2));
        } catch (error) {
          console.error('Failed to update orphaned transcription metadata:', error);
        }
      } catch {
        // Transcription doesn't exist, skip
      }
    }
    
    // Delete the media folder
    await fs_promises.rm(mediaPath, { recursive: true, force: true });
    
    // Update project.json to remove the media file
    const projectFile = path.join(projectPath, 'project.json');
    let isLastMedia = false;
    
    try {
      const projectData = JSON.parse(await fs_promises.readFile(projectFile, 'utf-8'));
      
      if (projectData.mediaFiles) {
        projectData.mediaFiles = projectData.mediaFiles.filter((id: string) => id !== mediaId);
        
        // Check if this was the last media file
        if (projectData.mediaFiles.length === 0) {
          isLastMedia = true;
          console.log(`[MediaDelete] Last media file deleted from project ${projectId}, deleting entire project`);
          
          // Delete the entire project directory
          await fs_promises.rm(projectPath, { recursive: true, force: true });
          
          res.json({
            success: true,
            message: `Last media deleted - entire project ${projectId} removed`,
            projectDeleted: true,
            transcriptionPreserved: !deleteTranscription
          });
          return;
        } else {
          // Update the project file if there are remaining media files
          projectData.updatedAt = new Date().toISOString();
          await fs_promises.writeFile(projectFile, JSON.stringify(projectData, null, 2));
        }
      }
    } catch (error) {
      console.error('Failed to update project.json:', error);
    }
    
    res.json({
      success: true,
      message: `Media ${mediaId} deleted successfully`,
      transcriptionPreserved: !deleteTranscription
    });
  } catch (error: any) {
    console.error('Error deleting media:', error);
    res.status(500).json({ error: error.message || 'Failed to delete media' });
  }
});

/**
 * Save transcription for a specific media file
 */
router.put('/:projectId/media/:mediaId/transcription', verifyUser, async (req: Request, res: Response) => {
  try {
    const { projectId, mediaId } = req.params;
    const { blocks, speakers, remarks } = req.body;
    const userId = (req as any).user?.id || 'unknown';
    
    console.log('[Save] Saving transcription:', { projectId, mediaId, userId, blocksCount: blocks?.length });
    
    // Debug: Check if blocks have speakerTime
    if (blocks && blocks.length > 0) {
      const blocksWithTime = blocks.filter((b: any) => b.speakerTime !== undefined && b.speakerTime > 0);
      console.log('[Save] Blocks with speakerTime:', blocksWithTime.length, '/', blocks.length);
      if (blocksWithTime.length > 0) {
        console.log('[Save] Sample block with time:', {
          id: blocksWithTime[0].id,
          speaker: blocksWithTime[0].speaker,
          speakerTime: blocksWithTime[0].speakerTime
        });
      }
    }
    
    // Build paths
    const transcriptionPath = path.join(
      process.cwd(), 
      'user_data', 
      'users', 
      userId, 
      'projects', 
      projectId, 
      'media',
      mediaId, 
      'transcription', 
      'data.json'
    );
    
    // Ensure directory exists
    await fs_promises.mkdir(path.dirname(transcriptionPath), { recursive: true });
    
    // Get media info from metadata.json file
    let mediaInfo = null;
    const metadataPath = path.join(
      process.cwd(), 
      'user_data', 
      'users', 
      userId, 
      'projects', 
      projectId,
      'media',
      mediaId,
      'metadata.json'
    );
    
    try {
      mediaInfo = JSON.parse(await fs_promises.readFile(metadataPath, 'utf-8'));
      console.log('[Save] Loaded media metadata:', { 
        mediaId: mediaInfo.mediaId, 
        originalName: mediaInfo.originalName,
        size: mediaInfo.size,
        duration: mediaInfo.duration
      });
      
      // If duration is missing, try to extract it
      if (!mediaInfo.duration || mediaInfo.duration === 0) {
        const mediaDir = path.join(
          process.cwd(), 
          'user_data', 
          'users', 
          userId, 
          'projects', 
          projectId,
          'media',
          mediaId
        );
        
        try {
          const files = await fs_promises.readdir(mediaDir);
          const audioFile = files.find(f => 
            ['.mp3', '.mp4', '.wav', '.m4a', '.webm', '.ogg'].includes(path.extname(f).toLowerCase())
          );
          
          if (audioFile) {
            const audioPath = path.join(mediaDir, audioFile);
            // Import music-metadata dynamically
            const mm = await import('music-metadata');
            const metadata = await mm.parseFile(audioPath);
            mediaInfo.duration = metadata.format.duration || 0;
            
            // Update the metadata file with the duration
            await fs_promises.writeFile(metadataPath, JSON.stringify(mediaInfo, null, 2));
            console.log('[Save] Updated metadata with duration:', mediaInfo.duration);
          }
        } catch (err) {
          console.log('[Save] Could not extract duration:', err);
        }
      }
    } catch (error) {
      console.log('[Save] Could not load metadata.json for media info:', error);
      // Try to get basic info from media directory
      try {
        const mediaDir = path.join(
          process.cwd(), 
          'user_data', 
          'users', 
          userId, 
          'projects', 
          projectId,
          'media',
          mediaId
        );
        
        const files = await fs_promises.readdir(mediaDir);
        const audioFile = files.find(f => 
          ['.mp3', '.mp4', '.wav', '.m4a', '.webm', '.ogg'].includes(path.extname(f).toLowerCase())
        );
        
        if (audioFile) {
          const audioPath = path.join(mediaDir, audioFile);
          const stats = await fs_promises.stat(audioPath);
          let duration = 0;
          
          try {
            const mm = await import('music-metadata');
            const metadata = await mm.parseFile(audioPath);
            duration = metadata.format.duration || 0;
          } catch {}
          
          // Try to get the original name from the project or use a better default
          let originalName = audioFile;
          
          // Check if we can get a better name from the project
          try {
            const projectJsonPath = path.join(
              process.cwd(), 
              'user_data', 
              'users', 
              userId, 
              'projects', 
              projectId,
              'project.json'
            );
            const projectData = JSON.parse(await fs_promises.readFile(projectJsonPath, 'utf-8'));
            // Use project display name as a hint for the media name if it's not generic
            if (projectData.displayName && !projectData.displayName.startsWith('Project ')) {
              originalName = projectData.displayName;
              // If there are multiple media files, append the media number
              if (projectData.mediaFiles && projectData.mediaFiles.length > 1) {
                const mediaIndex = projectData.mediaFiles.indexOf(mediaId);
                if (mediaIndex >= 0) {
                  originalName = `${originalName} - קובץ ${mediaIndex + 1}`;
                }
              }
            }
          } catch {}
          
          // Create new metadata
          mediaInfo = {
            mediaId: mediaId,
            fileName: audioFile,
            originalName: originalName,
            size: stats.size,
            duration: duration,
            mimeType: `audio/${path.extname(audioFile).substring(1)}`,
            stage: 'transcription',
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString()
          };
          
          // Save the metadata
          await fs_promises.writeFile(metadataPath, JSON.stringify(mediaInfo, null, 2));
          console.log('[Save] Created new metadata file with extracted info');
        } else {
          // Just use mediaId as a fallback name
          mediaInfo = {
            fileName: mediaId,
            originalName: mediaId
          };
        }
      } catch {
        // No metadata available
        mediaInfo = {
          fileName: mediaId,
          originalName: mediaId
        };
      }
    }
    
    // Save transcription data with metadata
    const transcriptionData = {
      blocks: blocks || [],
      speakers: speakers || [],
      remarks: remarks || [],
      metadata: {
        fileName: mediaInfo?.fileName || mediaInfo?.name || mediaId,
        originalName: mediaInfo?.originalName || mediaInfo?.fileName || mediaInfo?.name || mediaId,
        duration: mediaInfo?.duration || 0
      },
      lastModified: new Date().toISOString()
    };
    
    await fs_promises.writeFile(transcriptionPath, JSON.stringify(transcriptionData, null, 2));
    
    console.log('[Save] Transcription saved successfully to:', transcriptionPath);
    
    res.json({ 
      success: true, 
      message: 'Transcription saved successfully',
      mediaId,
      blocksCount: blocks?.length || 0
    });
  } catch (error: any) {
    console.error('[Save] Error saving transcription:', error);
    res.status(500).json({ error: error.message || 'Failed to save transcription' });
  }
});

/**
 * Get transcription for a specific media file
 */
// COMMENTED OUT - DUPLICATE ENDPOINT WITH WRONG PATH STRUCTURE
/*
router.get('/:projectId/media/:mediaId/transcription', verifyUser, async (req: Request, res: Response) => {
  try {
    const { projectId, mediaId } = req.params;
    const userId = (req as any).user?.id || 'unknown';
    
    console.log('[Load] Loading transcription:', { projectId, mediaId, userId });
    
    // Build path
    const transcriptionPath = path.join(
      process.cwd(), 
      'user_data', 
      'users', 
      userId, 
      'projects', 
      projectId, 
      mediaId, 
      'transcription', 
      'data.json'
    );
    
    // Check if file exists
    try {
      await fs_promises.access(transcriptionPath);
    } catch {
      // File doesn't exist yet
      console.log('[Load] No transcription file found at:', transcriptionPath);
      return res.status(404).json({ error: 'Transcription not found' });
    }
    
    // Read transcription
    const data = await fs_promises.readFile(transcriptionPath, 'utf-8');
    const transcription = JSON.parse(data);
    
    console.log('[Load] Transcription loaded, blocks:', transcription.blocks?.length || 0);
    
    // Debug: Check loaded blocks for speakerTime
    if (transcription.blocks && transcription.blocks.length > 0) {
      const blocksWithTime = transcription.blocks.filter((b: any) => b.speakerTime !== undefined && b.speakerTime > 0);
      console.log('[Load] Blocks with speakerTime:', blocksWithTime.length, '/', transcription.blocks.length);
      if (blocksWithTime.length > 0) {
        console.log('[Load] Sample loaded block with time:', {
          id: blocksWithTime[0].id,
          speaker: blocksWithTime[0].speaker,
          speakerTime: blocksWithTime[0].speakerTime
        });
      }
    }
    
    res.json(transcription);
  } catch (error: any) {
    console.error('[Load] Error loading transcription:', error);
    res.status(500).json({ error: error.message || 'Failed to load transcription' });
  }
});
*/

/**
 * Update media duration when obtained from actual media file
 */
router.put('/:projectId/media/:mediaId/duration', async (req: Request, res: Response) => {
  try {
    const { projectId, mediaId } = req.params;
    const { duration } = req.body;
    
    // Try to get userId from auth if available, otherwise search for the project
    let userId = (req as any).user?.id;
    
    console.log('[Duration API] Request received:');
    console.log('  - Project ID:', projectId);
    console.log('  - Media ID:', mediaId);
    console.log('  - Duration:', duration, 'seconds');
    console.log('  - User ID:', userId || 'not authenticated');
    
    // If no userId, search for the project in all user directories
    let possiblePaths: string[] = [];
    
    if (!userId) {
      const usersDir = path.join(process.cwd(), 'backend', 'user_data', 'users');
      try {
        const userDirs = await fs_promises.readdir(usersDir);
        for (const userDir of userDirs) {
          possiblePaths.push(path.join(usersDir, userDir, 'projects', projectId, 'project.json'));
        }
      } catch (error) {
        console.error('[Duration API] Failed to list user directories:', error);
      }
      
      // Also try without backend prefix
      const usersDir2 = path.join(process.cwd(), 'user_data', 'users');
      try {
        const userDirs = await fs_promises.readdir(usersDir2);
        for (const userDir of userDirs) {
          possiblePaths.push(path.join(usersDir2, userDir, 'projects', projectId, 'project.json'));
        }
      } catch (error) {
        // Ignore, directory might not exist
      }
    } else {
      // Try multiple possible paths for project.json with the known userId
      possiblePaths = [
        path.join(process.cwd(), 'user_data', 'users', userId, 'projects', projectId, 'project.json'),
        path.join(process.cwd(), 'data', 'projects', userId, 'projects', projectId, 'project.json'),
        path.join(process.cwd(), 'backend', 'data', 'projects', userId, 'projects', projectId, 'project.json'),
        path.join(process.cwd(), 'backend', 'user_data', 'users', userId, 'projects', projectId, 'project.json')
      ];
    }
    
    let projectPath = null;
    let projectData = null;
    
    // Find the correct path
    for (const testPath of possiblePaths) {
      try {
        await fs_promises.access(testPath);
        projectPath = testPath;
        projectData = JSON.parse(await fs_promises.readFile(testPath, 'utf-8'));
        console.log('[Duration] Found project at:', testPath);
        break;
      } catch {
        // Try next path
      }
    }
    
    if (!projectPath || !projectData) {
      console.error('[Duration] Project file not found in any of the expected paths');
      return res.status(404).json({ error: 'Project file not found' });
    }
    
    // Check if the mediaId exists in the project
    if (projectData.mediaFiles && Array.isArray(projectData.mediaFiles)) {
      const mediaExists = projectData.mediaFiles.includes(mediaId);
      if (mediaExists) {
        // Duration should be stored in the media's metadata, not in project.json
        // For now, just acknowledge the duration update
        console.log('[Duration] Duration update acknowledged for mediaId:', mediaId, 'duration:', duration);
        return res.json({ success: true, duration });
      } else {
        console.error('[Duration] Media file not found in project:', mediaId);
      }
    } else {
      console.error('[Duration] No mediaFiles array in project data');
    }
    
    res.status(404).json({ error: 'Media file not found in project' });
  } catch (error: any) {
    console.error('[Duration] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to update duration' });
  }
});


/**
 * Load transcription data for a specific media file
 */
router.get('/:projectId/media/:mediaId/transcription', verifyUser, async (req: Request, res: Response) => {
  try {
    const { projectId, mediaId } = req.params;
    const userId = (req as any).user?.id || 'unknown';
    
    console.log(`[Transcription] Loading transcription for project: ${projectId}, media: ${mediaId}, user: ${userId}`);
    
    // Determine user data path
    const userDataPath = path.join(
      process.cwd(), 'user_data',
      'users', userId,
      'projects', projectId,
      'media', mediaId,
      'transcription'
    );
    
    const transcriptionPath = path.join(userDataPath, 'data.json');
    
    try {
      await fs_promises.access(transcriptionPath);
      const data = JSON.parse(await fs_promises.readFile(transcriptionPath, 'utf-8'));
      
      console.log(`[Transcription] Found transcription data at: ${transcriptionPath}`);
      res.json(data);
    } catch (error) {
      // File doesn't exist - return empty structure
      console.log(`[Transcription] No transcription found at: ${transcriptionPath}`);
      
      // Get media metadata if available
      const metadataPath = path.join(
        process.cwd(), 'user_data',
        'users', userId,
        'projects', projectId,
        'media', mediaId,
        'metadata.json'
      );
      
      let metadata = {};
      try {
        metadata = JSON.parse(await fs_promises.readFile(metadataPath, 'utf-8'));
      } catch {
        // No metadata file
      }
      
      // Return empty transcription structure
      res.json({
        blocks: [],
        speakers: [],
        remarks: [],
        metadata
      });
    }
  } catch (error: any) {
    console.error('Error loading transcription:', error);
    res.status(500).json({ error: error.message || 'Failed to load transcription' });
  }
});

/**
 * Save media data to multi-media project
 */
router.put('/:projectId/media/:mediaId/save', verifyUser, async (req: Request, res: Response) => {
  try {
    const { projectId, mediaId } = req.params;
    const { blocks, speakers, remarks } = req.body;
    const userId = (req as any).user?.id || 'unknown';
    
    console.log(`[MediaData] Saving data for project: ${projectId}, media: ${mediaId}, user: ${userId}`);
    
    const success = await projectService.saveMediaData(projectId, mediaId, {
      blocks,
      speakers,
      remarks
    }, userId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Media data saved successfully'
      });
    } else {
      res.status(500).json({ error: 'Failed to save media data' });
    }
  } catch (error: any) {
    console.error('Error saving media data:', error);
    res.status(500).json({ error: error.message || 'Failed to save media data' });
  }
});

/**
 * Update media stage (transcription -> proofreading -> export)
 */
router.put('/:projectId/media/:mediaId/stage', verifyUser, async (req: Request, res: Response) => {
  try {
    const { projectId, mediaId } = req.params;
    const { stage } = req.body;
    const userId = (req as any).user?.id || 'unknown';
    
    if (!['transcription', 'proofreading', 'export'].includes(stage)) {
      return res.status(400).json({ error: 'Invalid stage. Must be transcription, proofreading, or export' });
    }
    
    console.log(`[MediaStage] Updating stage for project: ${projectId}, media: ${mediaId}, stage: ${stage}, user: ${userId}`);
    
    const success = await projectService.updateMediaStage(projectId, mediaId, stage, userId);
    
    if (success) {
      res.json({
        success: true,
        stage,
        message: `Media stage updated to ${stage}`
      });
    } else {
      res.status(500).json({ error: 'Failed to update media stage' });
    }
  } catch (error: any) {
    console.error('Error updating media stage:', error);
    res.status(500).json({ error: error.message || 'Failed to update media stage' });
  }
});

/**
 * Serve media file from project folder
 */
router.get('/:projectId/media/:filename', async (req: Request, res: Response) => {
  try {
    const { projectId, filename } = req.params;
    
    // Get token from query param for media requests (audio element can't send headers)
    const token = req.query.token as string;
    if (token) {
      // Manually verify token for media requests
      if (token.startsWith('dev-')) {
        const userId = token.substring(4) || 'dev-user-default';
        (req as any).user = { id: userId, username: userId };
      } else {
        try {
          const jwt = require('jsonwebtoken');
          const secret = process.env.JWT_SECRET || 'default-secret-key';
          const decoded = jwt.verify(token, secret) as any;
          (req as any).user = { 
            id: decoded.userId || decoded.id || 'unknown', 
            username: decoded.username || decoded.email || 'unknown'
          };
        } catch {
          (req as any).user = { id: 'unknown', username: 'unknown' };
        }
      }
    }
    
    // Get the project folder path with user-specific directory
    const userId = (req as any).user?.id || 'unknown';
    const safeUserId = userId.toString().replace(/[^a-zA-Z0-9-_]/g, '_');
    
    // First try the new structure (media files in media/mediaId/ subdirectories)
    let mediaPath: string | null = null;
    // Use consistent base path with process.cwd()
    const possibleBasePaths = [
      path.join(process.cwd(), 'user_data', 'users', safeUserId, 'projects', projectId)
    ];
    
    let userDataPath = possibleBasePaths[0];
    for (const basePath of possibleBasePaths) {
      if (fs.existsSync(basePath)) {
        userDataPath = basePath;
        break;
      }
    }
    
    // Check if filename is actually a mediaId (like "media-1", "media-2")
    const isMediaId = filename.match(/^media-\d+$/);
    
    // Try to find the file in any of the media subdirectories
    const mediaDir = path.join(userDataPath, 'media');
    console.log(`[MediaServe] Looking for ${filename} in ${mediaDir}`);
    
    if (isMediaId) {
      // If it's a media ID, look for any media file in that specific subdirectory
      const mediaIdPath = path.join(mediaDir, filename);
      console.log(`[MediaServe] Checking media ID directory: ${mediaIdPath}`);
      
      try {
        const files = await fs_promises.readdir(mediaIdPath);
        // Find the first audio/video file
        const mediaFile = files.find(file => {
          const ext = path.extname(file).toLowerCase();
          return ['.mp3', '.mp4', '.wav', '.m4a', '.webm', '.ogg'].includes(ext);
        });
        
        if (mediaFile) {
          mediaPath = path.join(mediaIdPath, mediaFile);
          console.log(`[MediaServe] Found media file: ${mediaPath}`);
        }
      } catch (err) {
        console.log(`[MediaServe] Media ID directory not found: ${mediaIdPath}`);
      }
    } else {
      // Original logic for finding by filename
      try {
        const mediaDirs = await fs_promises.readdir(mediaDir);
        console.log(`[MediaServe] Found media directories:`, mediaDirs);
        for (const mediaId of mediaDirs) {
          const possiblePath = path.join(mediaDir, mediaId, filename);
          console.log(`[MediaServe] Checking: ${possiblePath}`);
          if (fs.existsSync(possiblePath)) {
            console.log(`[MediaServe] Found media file at: ${possiblePath}`);
            mediaPath = possiblePath;
            break;
          }
        }
      } catch (error) {
        console.log(`[MediaServe] Media directory doesn't exist: ${mediaDir}`);
        // Media directory doesn't exist, try old structure
      }
    }
    
    // Fallback to old structure (direct in project directory)
    if (!mediaPath) {
      const fallbackPath = path.join(userDataPath, filename);
      if (fs.existsSync(fallbackPath)) {
        mediaPath = fallbackPath;
      }
    }
    
    // Check if file exists
    if (!mediaPath || !fs.existsSync(mediaPath)) {
      console.error(`Media file not found: ${filename} in project ${projectId}`);
      return res.status(404).json({ error: 'Media file not found' });
    }
    
    // Get file stats for content-length
    const stat = fs.statSync(mediaPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    if (['.mp3', '.m4a', '.wav', '.ogg', '.aac'].includes(ext)) {
      contentType = `audio/${ext.substring(1)}`;
    } else if (['.mp4', '.webm', '.ogv'].includes(ext)) {
      contentType = `video/${ext.substring(1)}`;
    }
    
    // Support range requests for media streaming
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(mediaPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      };
      res.writeHead(200, head);
      fs.createReadStream(mediaPath).pipe(res);
    }
  } catch (error: any) {
    console.error('Error serving media file:', error);
    res.status(500).json({ error: error.message || 'Failed to serve media file' });
  }
});

export default router;