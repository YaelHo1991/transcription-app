import { Router, Request, Response } from 'express';
import { ProjectModel } from '../../../models/project.model';
import { authenticateToken } from '../../../middleware/auth.middleware';
import * as fs from 'fs/promises';
import * as path from 'path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max per file
  }
});

// Create project from folder upload
router.post('/create-from-folder', authenticateToken, upload.array('files'), async (req: Request, res: Response) => {
  try {
    const { folderName, computerId, computerName, fileNames } = req.body;
    const userId = (req as any).user?.id || 'dev-user';
    const files = req.files as Express.Multer.File[];
    
    console.log('[Project Create] Request received:', { 
      folderName, 
      filesCount: files?.length,
      userId,
      computerId,
      computerName
    });
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }
    
    // Generate project ID with timestamp
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .split('.')[0];
    const projectId = `${timestamp}_${Math.random().toString(36).substr(2, 3)}`;
    
    // Create project directory structure
    const dataPath = path.join(__dirname, '../../../../data');
    const projectPath = path.join(dataPath, 'projects', projectId);
    const mediaPath = path.join(projectPath, 'media');
    const transcriptionsPath = path.join(projectPath, 'transcriptions');
    
    // Create directories
    await fs.mkdir(projectPath, { recursive: true });
    await fs.mkdir(mediaPath, { recursive: true });
    await fs.mkdir(transcriptionsPath, { recursive: true });
    
    // Parse file names if provided as JSON string
    let parsedFileNames: string[] = [];
    if (fileNames) {
      try {
        parsedFileNames = JSON.parse(fileNames);
      } catch (e) {
        console.error('Failed to parse fileNames:', e);
      }
    }
    
    // Save media files and create media metadata
    const mediaFiles: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const originalName = parsedFileNames[i] || file.originalname;
      const mediaId = `media_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`;
      
      // Save media file
      const mediaFilePath = path.join(mediaPath, `${mediaId}_${originalName}`);
      await fs.writeFile(mediaFilePath, file.buffer);
      
      // Create empty transcription file
      const transcriptionData = {
        blocks: [],
        speakers: [],
        remarks: [],
        metadata: {
          mediaId,
          fileName: originalName,
          originalName,
          mimeType: file.mimetype,
          size: file.size,
          stage: 'transcription',
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString()
        }
      };
      
      const transcriptionPath = path.join(transcriptionsPath, `${mediaId}.json`);
      await fs.writeFile(transcriptionPath, JSON.stringify(transcriptionData, null, 2));
      
      mediaFiles.push(mediaId);
    }
    
    // Create project metadata
    const projectData = {
      projectId,
      name: folderName || 'New Project',
      displayName: folderName || 'New Project',
      mediaFiles,
      totalMedia: mediaFiles.length,
      currentMediaIndex: 0,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      userId,
      computerId,
      computerName
    };
    
    // Save project metadata
    const projectMetaPath = path.join(projectPath, 'project.json');
    await fs.writeFile(projectMetaPath, JSON.stringify(projectData, null, 2));
    
    console.log('[Project Create] Project created successfully:', projectId);
    
    res.json({
      success: true,
      projectId,
      project: projectData
    });
    
  } catch (error) {
    console.error('[Project Create] Error:', error);
    res.status(500).json({ 
      error: 'Failed to create project',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// List all projects
router.get('/list', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'dev-user';
    console.log('[Project List] Fetching projects for user:', userId);
    
    const dataPath = path.join(__dirname, '../../../../data/projects');
    
    // Check if projects directory exists
    try {
      await fs.access(dataPath);
    } catch {
      console.log('[Project List] Projects directory does not exist, creating it');
      await fs.mkdir(dataPath, { recursive: true });
      return res.json({ success: true, projects: [], count: 0 });
    }
    
    // Read all project directories
    const projectDirs = await fs.readdir(dataPath);
    const projects = [];
    
    for (const dir of projectDirs) {
      const projectPath = path.join(dataPath, dir);
      const projectMetaPath = path.join(projectPath, 'project.json');
      
      try {
        // Check if it's a directory and has project.json
        const stat = await fs.stat(projectPath);
        if (stat.isDirectory()) {
          try {
            const projectData = await fs.readFile(projectMetaPath, 'utf-8');
            const project = JSON.parse(projectData);
            projects.push(project);
          } catch (e) {
            console.log(`[Project List] No project.json in ${dir}, skipping`);
          }
        }
      } catch (e) {
        console.error(`[Project List] Error reading project ${dir}:`, e);
      }
    }
    
    console.log(`[Project List] Found ${projects.length} projects`);
    
    res.json({
      success: true,
      projects,
      count: projects.length
    });
    
  } catch (error) {
    console.error('[Project List] Error:', error);
    res.status(500).json({ 
      error: 'Failed to list projects',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create a new project
router.post('/create', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const userId = (req as any).user.id;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const project = await ProjectModel.create(userId, name, description);
    res.json({ success: true, project });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Get all projects for a user
router.get('/user/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).user.id;

    // Users can only access their own projects
    if (userId !== requestingUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const projects = await ProjectModel.findByUserId(userId);
    res.json({ success: true, projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get a specific project
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const project = await ProjectModel.findById(id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify ownership
    if (project.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ success: true, project });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Update a project
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const updates = req.body;

    // Verify ownership
    const existing = await ProjectModel.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (existing.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const project = await ProjectModel.update(id, updates);
    res.json({ success: true, project });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete a project (soft delete + remove files)
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    // For filesystem-based projects (timestamp format like 2025-08-20_21-13-34_087)
    if (id.match(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_\d{3}$/)) {
      // Delete project folder from filesystem directly
      const userDataPath = path.join(__dirname, '../../../../user_data');
      const projectPath = path.join(userDataPath, 'user_live', 'projects', id);
      
      try {
        // Check if folder exists before trying to delete
        await fs.access(projectPath);
        // Delete the project folder and all its contents
        await fs.rm(projectPath, { recursive: true, force: true });
        // console.log removed for production
        return res.json({ success: true, message: 'Project folder deleted successfully' });
      } catch (fsError) {
        // console.log removed for production
        return res.status(404).json({ error: 'Project folder not found' });
      }
    }
    
    // For database-based projects (numeric IDs)
    // Verify ownership
    const existing = await ProjectModel.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Project not found in database' });
    }
    if (existing.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete project folder from filesystem
    const userDataPath = path.join(__dirname, '../../../../user_data');
    const projectPath = path.join(userDataPath, `user_${userId}`, 'projects', id);
    
    try {
      // Check if folder exists before trying to delete
      await fs.access(projectPath);
      // Delete the project folder and all its contents
      await fs.rm(projectPath, { recursive: true, force: true });
      // console.log removed for production
    } catch (fsError) {
      // Folder might not exist, log but don't fail the request
      // console.log removed for production
    }

    // Delete from database
    const success = await ProjectModel.delete(id);
    res.json({ success, message: 'Project and files deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;