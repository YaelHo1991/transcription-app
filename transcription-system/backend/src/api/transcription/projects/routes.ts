import { Router, Request, Response } from 'express';
import { ProjectModel } from '../../../models/project.model';
import { authenticateToken } from '../../../middleware/auth.middleware';
import * as fs from 'fs/promises';
import * as path from 'path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const router = Router();

/**
 * Helper function to get audio duration using FFprobe
 */
async function getAudioDuration(filePath: string): Promise<number> {
  try {
    // Normalize the path for Windows
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    // Use different command format based on platform
    const command = process.platform === 'win32'
      ? `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${normalizedPath}"`
      : `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
    
    console.log('[getAudioDuration] Running command:', command);
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      console.error('[getAudioDuration] FFprobe stderr:', stderr);
    }
    
    const duration = parseFloat(stdout.trim());
    console.log(`[getAudioDuration] Duration for ${path.basename(filePath)}: ${duration} seconds`);
    
    return isNaN(duration) ? 0 : duration;
  } catch (error: any) {
    console.error('[getAudioDuration] Failed to get duration:', error.message);
    console.error('[getAudioDuration] File path was:', filePath);
    return 0; // Return 0 if duration calculation fails
  }
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max per file
  }
});

// Add media to existing project
router.post('/:projectId/add-media', authenticateToken, upload.array('files'), async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { force, fileNames } = req.body;
    const userId = (req as any).user?.id || 'dev-user';
    const files = req.files as Express.Multer.File[];
    
    console.log('[Add Media] Request received:', { 
      projectId,
      filesCount: files?.length,
      userId,
      force: force === 'true'
    });
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }
    
    // Load existing project - use user_data structure
    const userDataPath = path.join(__dirname, '../../../../user_data');
    const userPath = path.join(userDataPath, 'users', userId, 'projects', projectId);
    const projectMetaPath = path.join(userPath, 'project.json');
    
    // Check if project exists
    try {
      await fs.access(projectMetaPath);
    } catch {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Load project metadata
    const projectData = JSON.parse(await fs.readFile(projectMetaPath, 'utf-8'));
    
    // Parse file names if provided as JSON string
    let parsedFileNames: string[] = [];
    if (fileNames) {
      try {
        parsedFileNames = JSON.parse(fileNames);
      } catch (e) {
        console.error('Failed to parse fileNames:', e);
      }
    }
    
    // Check for duplicates if not forced - check ALL files, not just single uploads
    if (force !== 'true') {
      console.log('[Add Media] Checking for duplicates...');
      console.log('[Add Media] Existing media files:', projectData.mediaFiles);
      
      // Load existing media metadata to check for duplicates
      const mediaPath = path.join(userPath, 'media');
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const originalName = parsedFileNames[i] || file.originalname;
        
        console.log(`[Add Media] Checking file ${i}: ${originalName}, size: ${file.size}`);
        
        // Check against all existing media
        for (const existingMediaId of projectData.mediaFiles || []) {
          try {
            const existingMediaPath = path.join(mediaPath, existingMediaId);
            
            // Read metadata to get original name and size
            try {
              const metadataPath = path.join(existingMediaPath, 'metadata.json');
              const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
              
              console.log(`[Add Media] Comparing with ${existingMediaId}: name="${metadata.originalName}" vs "${originalName}", size=${metadata.size} vs ${file.size}`);
              
              // Check if it's a duplicate (same original name and size)
              if (metadata.originalName === originalName && metadata.size === file.size) {
                console.log('[Add Media] Duplicate detected:', originalName);
                
                return res.json({
                  isDuplicate: true,
                  existingMedia: {
                    mediaId: existingMediaId,
                    name: originalName,
                    size: metadata.size,
                    duration: metadata.duration || 0
                  }
                });
              }
            } catch (e) {
              console.log(`[Add Media] No metadata for ${existingMediaId}, checking file directly`);
              
              // If no metadata, try checking the actual file
              const existingFiles = await fs.readdir(existingMediaPath);
              const existingMediaFile = existingFiles.find(f => f.startsWith('media.'));
              
              if (existingMediaFile) {
                const existingFilePath = path.join(existingMediaPath, existingMediaFile);
                const existingStats = await fs.stat(existingFilePath);
                
                console.log(`[Add Media] File stats for ${existingMediaId}: size=${existingStats.size}`);
                
                // For older files without metadata, just check size
                if (existingStats.size === file.size) {
                  console.log('[Add Media] Possible duplicate detected by size:', originalName);
                  
                  return res.json({
                    isDuplicate: true,
                    existingMedia: {
                      mediaId: existingMediaId,
                      name: originalName,
                      size: existingStats.size,
                      duration: 0
                    }
                  });
                }
              }
            }
          } catch (e) {
            console.error(`Error checking media ${existingMediaId}:`, e);
          }
        }
      }
      
      console.log('[Add Media] No duplicates found, proceeding to add media');
    } else {
      console.log('[Add Media] Force flag is true, skipping duplicate check');
    }
    
    // Add new media files - use correct path
    const mediaPath = path.join(userPath, 'media');
    
    // Ensure directories exist
    await fs.mkdir(mediaPath, { recursive: true });
    
    const newMediaIds: string[] = [];
    
    // Load or create media index
    const mediaIndexPath = path.join(userPath, 'media-index.json');
    let mediaIndex;
    
    try {
      mediaIndex = JSON.parse(await fs.readFile(mediaIndexPath, 'utf-8'));
      console.log('[Add Media] Loaded media index:', mediaIndex);
    } catch (error) {
      // Create new index if it doesn't exist
      console.log('[Add Media] Creating new media index');
      const existingMediaIds = new Set<string>(projectData.mediaFiles || []);
      const existingNumbers = new Set<number>();
      let highestNumber = 0;
      
      existingMediaIds.forEach(id => {
        const num = parseInt(id.replace('media-', ''));
        if (!isNaN(num)) {
          existingNumbers.add(num);
          if (num > highestNumber) highestNumber = num;
        }
      });
      
      // Find gaps
      const availableNumbers: number[] = [];
      for (let i = 1; i < highestNumber; i++) {
        if (!existingNumbers.has(i)) {
          availableNumbers.push(i);
        }
      }
      
      mediaIndex = {
        nextMediaNumber: highestNumber + 1,
        availableNumbers: availableNumbers,
        activeMediaIds: Array.from(existingMediaIds).sort(),
        lastUpdated: new Date().toISOString()
      };
    }
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const originalName = parsedFileNames[i] || file.originalname;
      
      // Get next media ID from index
      let mediaNumber: number;
      if (mediaIndex.availableNumbers && mediaIndex.availableNumbers.length > 0) {
        // Use available gap
        mediaNumber = mediaIndex.availableNumbers.shift();
        console.log(`[Add Media] Using gap: media-${mediaNumber} for file: ${originalName}`);
      } else {
        // Use next number
        mediaNumber = mediaIndex.nextMediaNumber;
        mediaIndex.nextMediaNumber++;
        console.log(`[Add Media] Using next: media-${mediaNumber} for file: ${originalName}`);
      }
      
      const mediaId = `media-${mediaNumber}`;
      
      // Create media directory structure to match existing format
      const mediaDir = path.join(mediaPath, mediaId);
      const backupsDir = path.join(mediaDir, 'backups');
      const transcriptionDir = path.join(mediaDir, 'transcription');
      
      // Create directories
      await fs.mkdir(mediaDir, { recursive: true });
      await fs.mkdir(backupsDir, { recursive: true });
      await fs.mkdir(transcriptionDir, { recursive: true });
      
      // Get file extension
      const fileExtension = path.extname(originalName).toLowerCase();
      
      // Save media file with standard name
      const mediaFileName = `media${fileExtension}`;
      const mediaFilePath = path.join(mediaDir, mediaFileName);
      await fs.writeFile(mediaFilePath, file.buffer);
      
      // Calculate audio duration
      console.log(`[Add Media] Calculating duration for: ${mediaFilePath}`);
      const duration = await getAudioDuration(mediaFilePath);
      console.log(`[Add Media] Calculated duration: ${duration} seconds for ${originalName}`);
      
      // Create metadata.json
      const metadataContent = {
        mediaId,
        fileName: mediaFileName,
        originalName,
        mimeType: file.mimetype,
        size: file.size,
        duration,
        stage: 'transcription',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };
      
      await fs.writeFile(
        path.join(mediaDir, 'metadata.json'),
        JSON.stringify(metadataContent, null, 2)
      );
      
      // Create empty transcription data
      const transcriptionData = {
        blocks: [],
        speakerAssignments: {},
        remarks: [],
        version: '1.0.0',
        lastSaved: new Date().toISOString()
      };
      
      await fs.writeFile(
        path.join(transcriptionDir, 'data.json'),
        JSON.stringify(transcriptionData, null, 2)
      );
      
      // Create empty speakers.json
      const speakersData = {
        speakers: [],
        lastModified: new Date().toISOString()
      };
      
      await fs.writeFile(
        path.join(mediaDir, 'speakers.json'),
        JSON.stringify(speakersData, null, 2)
      );
      
      newMediaIds.push(mediaId);
    }
    
    // Update project metadata
    projectData.mediaFiles = [...(projectData.mediaFiles || []), ...newMediaIds];
    projectData.totalMedia = projectData.mediaFiles.length;
    projectData.lastModified = new Date().toISOString();
    
    await fs.writeFile(projectMetaPath, JSON.stringify(projectData, null, 2));
    
    // Update and save media index
    mediaIndex.activeMediaIds = [...(mediaIndex.activeMediaIds || []), ...newMediaIds].sort();
    mediaIndex.lastUpdated = new Date().toISOString();
    
    await fs.writeFile(mediaIndexPath, JSON.stringify(mediaIndex, null, 2));
    console.log('[Add Media] Updated media index with new media IDs:', newMediaIds);
    
    console.log('[Add Media] Media added successfully to project:', projectId);
    
    res.json({
      success: true,
      projectId,
      newMediaIds,
      project: projectData
    });
    
  } catch (error) {
    console.error('[Add Media] Error:', error);
    res.status(500).json({ 
      error: 'Failed to add media to project',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
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