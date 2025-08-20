import { Router, Request, Response, NextFunction } from 'express';
import { projectService } from '../../services/projectService';
import path from 'path';
import fs from 'fs';

const router = Router();

// Middleware to allow dev mode without auth
const devAuth = (req: Request, res: Response, next: NextFunction) => {
  // In development, ALWAYS allow access for testing
  const isDev = process.env.NODE_ENV?.trim() === 'development' || true;
  if (isDev) {
    (req as any).user = { id: 999, username: 'dev-user' };
    return next();
  }
  return next();
};

/**
 * Create a new project
 */
router.post('/create', devAuth, async (req: Request, res: Response) => {
  try {
    const { mediaFileName, projectName } = req.body;
    
    if (!mediaFileName) {
      return res.status(400).json({ error: 'Media file name is required' });
    }
    
    console.log('📁 Creating new project for media:', mediaFileName);
    
    const projectId = await projectService.createProject(mediaFileName, projectName);
    
    res.json({
      success: true,
      projectId,
      message: `Project ${projectId} created successfully`
    });
  } catch (error: any) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: error.message || 'Failed to create project' });
  }
});

/**
 * Save project data
 */
router.post('/:projectId/save', devAuth, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { blocks, speakers, remarks } = req.body;
    
    console.log(`💾 Saving project ${projectId}:`, {
      blocksCount: blocks?.length || 0,
      speakersCount: speakers?.length || 0,
      remarksCount: remarks?.length || 0
    });
    
    const success = await projectService.saveProject(projectId, {
      blocks,
      speakers,
      remarks
    });
    
    if (success) {
      res.json({
        success: true,
        message: `Project ${projectId} saved successfully`
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
router.get('/:projectId/load', devAuth, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    
    console.log(`📂 Loading project ${projectId}`);
    
    const data = await projectService.loadProject(projectId);
    
    if (data) {
      console.log(`✅ Loaded project ${projectId}:`, {
        blocksCount: data.blocks?.length || 0,
        speakersCount: data.speakers?.length || 0,
        remarksCount: data.remarks?.length || 0
      });
      
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
router.post('/:projectId/backup', devAuth, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    
    console.log(`📸 Creating backup for project ${projectId}`);
    
    const backupFile = await projectService.createBackup(projectId);
    
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
router.post('/:projectId/restore/:backupFile', devAuth, async (req: Request, res: Response) => {
  try {
    const { projectId, backupFile } = req.params;
    
    console.log(`♻️ Restoring project ${projectId} from backup ${backupFile}`);
    
    const success = await projectService.restoreBackup(projectId, backupFile);
    
    if (success) {
      // Load the restored data
      const data = await projectService.loadProject(projectId);
      
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
router.get('/list', devAuth, async (req: Request, res: Response) => {
  try {
    console.log('📋 Listing all projects');
    
    const projects = await projectService.listProjects();
    
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
 * Get project by media file
 */
router.get('/by-media/:mediaFileName', devAuth, async (req: Request, res: Response) => {
  try {
    const { mediaFileName } = req.params;
    
    console.log('🔍 Finding project for media:', mediaFileName);
    
    const projectId = await projectService.getProjectByMedia(mediaFileName);
    
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
router.get('/:projectId/backups', devAuth, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    
    console.log(`📋 Listing backups for project ${projectId}`);
    
    const backups = await projectService.listBackups(projectId);
    
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
router.get('/:projectId/backups/:backupFile', devAuth, async (req: Request, res: Response) => {
  try {
    const { projectId, backupFile } = req.params;
    
    console.log(`📄 Loading backup ${backupFile} for project ${projectId}`);
    
    const content = await projectService.getBackupContent(projectId, backupFile);
    
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
 * Delete a project
 */
router.delete('/:projectId', devAuth, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    
    console.log(`🗑️ Deleting project ${projectId}`);
    
    const success = await projectService.deleteProject(projectId);
    
    if (success) {
      res.json({
        success: true,
        message: `Project ${projectId} deleted successfully`
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
 * Serve media file from project folder
 */
router.get('/:projectId/media/:filename', devAuth, async (req: Request, res: Response) => {
  try {
    const { projectId, filename } = req.params;
    
    console.log(`🎵 Serving media file: ${filename} from project: ${projectId}`);
    
    // Get the project folder path
    const userDataPath = path.join(process.cwd(), 'user_data', 'user_live', 'projects', projectId);
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