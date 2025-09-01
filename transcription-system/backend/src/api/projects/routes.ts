import { Router, Request, Response, NextFunction } from 'express';
import { projectService } from '../../services/projectService';
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
 * Create a new project
 */
router.post('/create', verifyUser, async (req: Request, res: Response) => {
  try {
    const { mediaFileName, projectName } = req.body;
    
    if (!mediaFileName) {
      return res.status(400).json({ error: 'Media file name is required' });
    }
    
    const userId = (req as any).user?.id || 'unknown';
    // console.log removed for production
    
    const projectId = await projectService.createProject(mediaFileName, projectName, userId);
    
    res.json({
      success: true,
      projectId,
      message: 'Project ' + projectId + ' created successfully'
    });
  } catch (error: any) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: error.message || 'Failed to create project' });
  }
});

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
 * Load project data
 */
router.get('/:projectId/load', verifyUser, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = (req as any).user?.id || 'unknown';
    
    // console.log removed for production
    
    const data = await projectService.loadProject(projectId, userId);
    
    if (data) {
      // console.log removed for production
      
      res.json({
        success: true,
        ...data
      });
    } else {
      res.status(404).json({ error: 'Project not found' });
    }
  } catch (error: any) {
    console.error('Error loading project:', error);
    res.status(500).json({ error: error.message || 'Failed to load project' });
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
      // Load the restored data
      const userId = (req as any).user?.id || 'unknown';
      const data = await projectService.loadProject(projectId, userId);
      
      res.json({
        success: true,
        message: `Project restored from backup ${backupFile}`,
        ...data
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
 * List all projects
 */
router.get('/list', verifyUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'unknown';
    // console.log removed for production
    
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
 * NEW: Get all projects for authenticated user (ProjectLoader compatible)
 */
router.get('/user', verifyUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'unknown';
    const userPath = path.join(process.cwd(), 'user_data', 'users', userId, 'projects');
    
    // Check if user directory exists
    try {
      await fs_promises.access(userPath);
    } catch {
      // No projects yet
      return res.json([]);
    }

    // Read all project directories
    const projectDirs = await fs_promises.readdir(userPath);
    const projects = [];

    for (const projectId of projectDirs) {
      const projectPath = path.join(userPath, projectId, 'project.json');
      try {
        const projectData = await fs_promises.readFile(projectPath, 'utf-8');
        const project = JSON.parse(projectData);
        
        // Add duration to media files if missing
        if (project.mediaFiles && Array.isArray(project.mediaFiles)) {
          project.mediaFiles = project.mediaFiles.map((file: any, index: number) => ({
            ...file,
            // Use actual duration if available, otherwise estimate
            duration: file.actualDuration || file.duration || Math.floor(300 + (file.size / 100000) + index * 180)
          }));
        }
        
        projects.push(project);
      } catch (error) {
        console.error(`Failed to read project ${projectId}:`, error);
      }
    }

    res.json(projects);
  } catch (error) {
    console.error('Failed to get user projects:', error);
    res.status(500).json({ error: 'Failed to load projects' });
  }
});

/**
 * NEW: Upload new project with media files (ProjectLoader compatible)
 */
router.post('/upload', verifyUser, upload.array('media'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'unknown';
    const { folderName } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No media files provided' });
    }

    // Generate project ID
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 10)}_${folderName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10)}`;
    
    // Create project structure
    const projectPath = path.join(process.cwd(), 'user_data', 'users', userId, 'projects', projectId);
    await fs_promises.mkdir(projectPath, { recursive: true });

    // Process media files
    const mediaFiles = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const mediaId = `media-${Date.now()}-${i}`;
      
      // Create media folder structure
      const mediaPath = path.join(projectPath, mediaId);
      await fs_promises.mkdir(mediaPath, { recursive: true });
      
      // Fix encoding issue with filenames - ensure UTF-8
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      
      // Save the actual media file
      const mediaFilePath = path.join(mediaPath, originalName);
      await fs_promises.writeFile(mediaFilePath, file.buffer);

      // Create transcription folders
      const transcriptionPath = path.join(mediaPath, 'transcription');
      const proofreadingPath = path.join(mediaPath, 'proofreading');
      const exportPath = path.join(mediaPath, 'export');
      
      await fs_promises.mkdir(transcriptionPath, { recursive: true });
      await fs_promises.mkdir(proofreadingPath, { recursive: true });
      await fs_promises.mkdir(exportPath, { recursive: true });
      
      // Create backups folder in transcription
      await fs_promises.mkdir(path.join(transcriptionPath, 'backups'), { recursive: true });

      // Create initial transcription data with media identifier
      const transcriptionData = {
        folderId: uuidv4(),
        type: 'transcription',
        blocks: [
          {
            id: `block-${Date.now()}-0`,
            text: `[${originalName}] - תמלול חדש`,
            timestamp: 0,
            duration: 0,
            speaker: '',
            isEdited: false
          }
        ],
        speakers: [],
        remarks: [],
        helperFiles: [],
        backups: [],
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };

      // Save main data.json
      await fs_promises.writeFile(
        path.join(transcriptionPath, 'data.json'),
        JSON.stringify(transcriptionData, null, 2)
      );
      
      // Save separate files for speakers and remarks
      await fs_promises.writeFile(
        path.join(transcriptionPath, 'speakers.json'),
        JSON.stringify([], null, 2)
      );
      
      await fs_promises.writeFile(
        path.join(transcriptionPath, 'remarks.json'),
        JSON.stringify([], null, 2)
      );

      // Create metadata file for media
      const metadata = {
        projectId,
        mediaId,
        createdAt: new Date().toISOString(),
        projectName: folderName,
        lastModified: new Date().toISOString()
      };

      await fs_promises.writeFile(
        path.join(mediaPath, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      // Add to media files array
      mediaFiles.push({
        mediaId,
        fileName: originalName,
        filePath: `/api/projects/media/${userId}/${projectId}/${mediaId}/${encodeURIComponent(originalName)}`,
        size: file.size,
        mimeType: file.mimetype,
        duration: Math.floor(300 + (file.size / 100000)), // Estimate duration based on file size
        transcriptions: {
          transcription: transcriptionData
        }
      });
    }

    // Create project metadata
    const project = {
      projectId,
      userId,
      projectName: folderName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mediaFiles,
      currentMediaIndex: 0
    };

    // Save project data
    await fs_promises.writeFile(
      path.join(projectPath, 'project.json'),
      JSON.stringify(project, null, 2)
    );

    res.json(project);
  } catch (error) {
    console.error('Upload failed:', error);
    res.status(500).json({ error: 'Failed to upload project' });
  }
});

/**
 * NEW: Get media file (ProjectLoader compatible)
 */
router.get('/media/:userId/:projectId/:mediaId/:filename', async (req: Request, res: Response) => {
  try {
    const { userId, projectId, mediaId, filename } = req.params;
    const decodedFilename = decodeURIComponent(filename);
    const filePath = path.join(process.cwd(), 'user_data', 'users', userId, 'projects', projectId, mediaId, decodedFilename);
    
    console.log('[Media] Serving file:', filePath);
    
    // Check if file exists
    try {
      await fs_promises.access(filePath);
    } catch (err) {
      console.error('[Media] File not found:', filePath);
      return res.status(404).json({ error: 'Media file not found' });
    }
    
    // Get file stats for content type
    const stats = await fs_promises.stat(filePath);
    
    // Determine content type based on extension
    const ext = path.extname(decodedFilename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (['.mp3', '.m4a', '.wav', '.ogg', '.aac', '.flac'].includes(ext)) {
      contentType = `audio/${ext.substring(1)}`;
      if (ext === '.m4a') contentType = 'audio/mp4';
    } else if (['.mp4', '.webm', '.ogv', '.mov', '.avi'].includes(ext)) {
      contentType = `video/${ext.substring(1)}`;
      if (ext === '.mov') contentType = 'video/quicktime';
      if (ext === '.avi') contentType = 'video/x-msvideo';
    }
    
    // Set headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size.toString());
    res.setHeader('Accept-Ranges', 'bytes');
    
    // Handle range requests for media streaming
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunksize = (end - start) + 1;
      
      const stream = createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize.toString(),
        'Content-Type': contentType
      });
      stream.pipe(res);
    } else {
      // Send entire file
      const stream = createReadStream(filePath);
      res.writeHead(200, {
        'Content-Length': stats.size.toString(),
        'Content-Type': contentType
      });
      stream.pipe(res);
    }
  } catch (error) {
    console.error('[Media] Failed to serve file:', error);
    res.status(500).json({ error: 'Failed to serve media file' });
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
 * NEW: Get transcription data for specific media in specific project
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
      return res.status(404).json({ error: 'Transcription not found' });
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
    const projectId = await projectService.getProjectByMedia(mediaFileName, userId);
    
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
          for (const media of projectData.mediaFiles) {
            const transcriptionPath = path.join(projectPath, media.mediaId, 'transcription');
            
            try {
              await fs_promises.access(transcriptionPath);
              
              // Create media folder in orphaned
              const targetMediaPath = path.join(orphanedProjectPath, media.mediaId);
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
                  mediaId: media.mediaId,
                  mediaName: media.fileName,
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
    const mediaPath = path.join(projectPath, mediaId);
    
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
          data.orphanedFrom = {
            projectId,
            projectName,
            mediaId,
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
    try {
      const projectData = JSON.parse(await fs_promises.readFile(projectFile, 'utf-8'));
      
      if (projectData.mediaFiles) {
        projectData.mediaFiles = projectData.mediaFiles.filter((m: any) => m.mediaId !== mediaId);
        projectData.updatedAt = new Date().toISOString();
        
        await fs_promises.writeFile(projectFile, JSON.stringify(projectData, null, 2));
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
      mediaId, 
      'transcription', 
      'data.json'
    );
    
    // Ensure directory exists
    await fs_promises.mkdir(path.dirname(transcriptionPath), { recursive: true });
    
    // Save transcription data
    const transcriptionData = {
      blocks: blocks || [],
      speakers: speakers || [],
      remarks: remarks || [],
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
    
    // Find and update the media file's duration
    if (projectData.mediaFiles && Array.isArray(projectData.mediaFiles)) {
      const mediaFile = projectData.mediaFiles.find((m: any) => m.mediaId === mediaId);
      if (mediaFile) {
        mediaFile.duration = duration;
        mediaFile.actualDuration = duration; // Mark as actual duration
        
        // Save updated project data
        await fs_promises.writeFile(projectPath, JSON.stringify(projectData, null, 2));
        
        console.log('[Duration] Updated media duration successfully:', duration);
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
 * Serve media file from project folder
 */
router.get('/:projectId/media/:filename', verifyUser, async (req: Request, res: Response) => {
  try {
    const { projectId, filename } = req.params;
    
    // console.log removed for production
    
    // Get the project folder path with user-specific directory
    const userId = (req as any).user?.id || 'unknown';
    const safeUserId = userId.toString().replace(/[^a-zA-Z0-9-_]/g, '_');
    const userDataPath = path.join(process.cwd(), 'user_data', 'users', safeUserId, 'projects', projectId);
    const mediaPath = path.join(userDataPath, filename);
    
    // Check if file exists
    if (!fs.existsSync(mediaPath)) {
      console.error(`Media file not found: ${mediaPath}`);
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