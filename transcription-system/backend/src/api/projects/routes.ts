import { Router, Request, Response, NextFunction } from 'express';
import { projectService } from '../../services/projectService';
import storageService from '../../services/storageService';
import { backgroundJobService } from '../../services/backgroundJobs';
import { OrphanedIndexService } from '../../services/orphanedIndexService';
import path from 'path';
import fs, { createReadStream } from 'fs';
import fs_promises from 'fs/promises';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
      // Use the actual user ID for dev-anonymous token
      const userId = token === 'dev-anonymous' ? 'bfc0ba9a-daae-46e2-acb9-5984d1adef9f' : (token.substring(4) || 'dev-user-default');
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
 * Helper function to get audio duration using FFprobe
 */
async function getAudioDuration(filePath: string): Promise<number> {
  try {
    // Normalize the path for Windows
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    // Build the ffprobe command with proper escaping
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
    const { folderName, computerId, computerName, force } = req.body;
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }
    
    const userId = (req as any).user?.id || 'unknown';
    console.log(`[FolderUpload] Creating project from folder: ${folderName} with ${files.length} files for user: ${userId}, force: ${force}`);
    
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
    
    // Check for duplicate projects first if not forced
    let duplicateInfo = null;
    if (force !== 'true') {
      console.log('[FolderUpload] Checking for duplicate projects...');
      
      // Load all existing projects for the user
      const projects = await projectService.listProjects(userId);
      console.log('[FolderUpload] Loaded projects:', projects.length);
      console.log('[FolderUpload] Projects with mediaInfo:', projects.filter(p => p.mediaInfo && p.mediaInfo.length > 0).length);
      
      // Debug: log first project's mediaInfo if exists
      if (projects.length > 0) {
        console.log('[FolderUpload] First project mediaInfo:', projects[0].mediaInfo);
      }
      
      // Create a map of uploaded files for comparison
      const uploadedFilesMap = new Map();
      console.log(`[FolderUpload] Uploaded files:`);
      mediaFilesData.forEach(file => {
        console.log(`[FolderUpload]   - "${file.name}" (size: ${file.buffer.length})`);
        uploadedFilesMap.set(file.name, {
          name: file.name,
          size: file.buffer.length
        });
      });
      
      // Check each existing project for duplicates
      for (const project of projects) {
        console.log(`[FolderUpload] Checking project ${project.projectId}: mediaInfo exists = ${!!project.mediaInfo}, length = ${project.mediaInfo?.length || 0}`);
        if (!project.mediaInfo || project.mediaInfo.length === 0) {
          console.log(`[FolderUpload] Skipping project ${project.projectId} - no mediaInfo`);
          continue;
        }
        
        // Create a map of existing project's media files
        const existingFilesMap = new Map();
        let allMatch = true;
        let missingInUpload: string[] = [];
        let missingInProject: string[] = [];
        
        // Check existing project media
        console.log(`[FolderUpload] Project ${project.projectId} has ${project.mediaInfo.length} media files`);
        for (const media of project.mediaInfo) {
          console.log(`[FolderUpload]   - Existing media: "${media.name}" (size: ${media.size})`);
          existingFilesMap.set(media.name, {
            name: media.name,
            size: media.size,
            mediaId: media.mediaId
          });
          
          // Check if this file exists in upload
          const uploadedFile = uploadedFilesMap.get(media.name);
          console.log(`[FolderUpload]     Checking "${media.name}" against uploaded:`);
          console.log(`[FolderUpload]       - Found: ${!!uploadedFile}`);
          console.log(`[FolderUpload]       - Size match: ${uploadedFile?.size === media.size}`);
          console.log(`[FolderUpload]       - Uploaded files available:`, Array.from(uploadedFilesMap.keys()));
          
          if (!uploadedFile) {
            console.log(`[FolderUpload]     ❌ MISSING: "${media.name}" not found in upload`);
          }
          if (!uploadedFile || uploadedFile.size !== media.size) {
            if (!uploadedFile) {
              missingInUpload.push(media.name);
            }
            allMatch = false;
          }
        }
        
        // Check uploaded files that don't exist in project
        for (const [fileName, fileData] of uploadedFilesMap) {
          if (!existingFilesMap.has(fileName)) {
            missingInProject.push(fileName);
            allMatch = false;
          }
        }
        
        // If we found a potential duplicate
        if (allMatch && uploadedFilesMap.size === existingFilesMap.size) {
          // Exact duplicate - all files match
          console.log('[FolderUpload] Exact duplicate project found:', project.projectId);
          duplicateInfo = {
            isDuplicateProject: true,
            duplicateType: 'exact',
            existingProject: {
              projectId: project.projectId,
              name: project.name,
              displayName: project.displayName,
              totalMedia: project.totalMedia,
              createdAt: project.createdAt
            },
            message: 'פרויקט עם אותם קבצים כבר קיים'
          };
          break; // Found duplicate, stop checking
        } else if (missingInUpload.length === 0 && missingInProject.length > 0) {
          // Partial duplicate - upload has additional files
          console.log('[FolderUpload] Partial duplicate found - upload has additional files');
          duplicateInfo = {
            isDuplicateProject: true,
            duplicateType: 'partial',
            existingProject: {
              projectId: project.projectId,
              name: project.name,
              displayName: project.displayName,
              totalMedia: project.totalMedia,
              createdAt: project.createdAt
            },
            missingInProject: missingInProject,
            message: `הפרויקט הקיים חסר ${missingInProject.length} קבצים`
          };
          break; // Found duplicate, stop checking
        }
      }
      
      console.log('[FolderUpload] Duplicate check result:', duplicateInfo ? 'Found duplicate' : 'No duplicate found');
    }
    
    // Now check for archived transcriptions
    const orphanedIndex = projectService.getOrphanedIndexService(userId);
    const mediaNames = mediaFilesData.map(m => m.name);
    const archivedTranscriptions = await orphanedIndex.findOrphanedTranscriptionsForMultipleMedia(mediaNames);
    const hasArchivedTranscriptions = Object.keys(archivedTranscriptions).length > 0;
    
    // If we have both duplicate and archived transcriptions, return both
    if (duplicateInfo && hasArchivedTranscriptions && !force) {
      console.log('[FolderUpload] Found both duplicate and archived transcriptions');
      return res.json({
        ...duplicateInfo,
        hasArchivedTranscriptions: true,
        archivedTranscriptions,
        mediaFiles: mediaFilesData.map(m => m.name)
      });
    }
    
    // If only duplicate found, return duplicate info
    if (duplicateInfo && !force) {
      console.log('[FolderUpload] Returning duplicate info only');
      return res.json(duplicateInfo);
    }
    
    // If only archived transcriptions found, return them for user choice
    if (hasArchivedTranscriptions && !force) {
      console.log(`[FolderUpload] Found ${Object.keys(archivedTranscriptions).length} archived transcriptions`);
      return res.json({
        hasArchivedTranscriptions: true,
        archivedTranscriptions,
        mediaFiles: mediaFilesData.map(m => m.name),
        message: 'נמצאו תמלולים קיימים עבור חלק מהקבצים. האם ברצונך לשחזר אותם?'
      });
    }
    
    // Create the project
    const result = await projectService.createMultiMediaProject(folderName, mediaFilesData, userId);
    
    console.log(`[FolderUpload] Project created successfully: ${result.projectId} with ${result.mediaIds.length} media files`);
    
    // Check if we should restore archived transcriptions
    const restoreArchived = req.body.restoreArchived === 'true';
    const selectedTranscriptionIds = req.body.selectedTranscriptionIds ? 
      JSON.parse(req.body.selectedTranscriptionIds) : null;
      
    if (restoreArchived && archivedTranscriptions) {
      console.log('[FolderUpload] Restoring archived transcriptions...');
      
      // Prepare transcription IDs to restore
      const transcriptionIds: string[] = [];
      const mediaIdsToRestore: string[] = [];
      
      for (const [mediaName, transcriptions] of Object.entries(archivedTranscriptions)) {
        // Find the corresponding media ID in the new project
        const mediaIndex = mediaFilesData.findIndex(m => m.name === mediaName);
        if (mediaIndex >= 0 && result.mediaIds[mediaIndex]) {
          const mediaId = result.mediaIds[mediaIndex];
          
          // Filter transcriptions based on selection if provided
          const transcriptionsToRestore = selectedTranscriptionIds ?
            transcriptions.filter((t: any) => selectedTranscriptionIds.includes(t.transcriptionId)) :
            transcriptions;
          
          // Add selected transcription IDs for this media
          transcriptionsToRestore.forEach((t: any) => {
            transcriptionIds.push(t.transcriptionId);
            mediaIdsToRestore.push(mediaId);
          });
        }
      }
      
      if (transcriptionIds.length > 0) {
        try {
          // Call the restore endpoint logic directly
          const orphanedPath = path.join(process.cwd(), 'user_data', 'users', userId, 'orphaned');
          const orphanedIndex = projectService.getOrphanedIndexService(userId);
          let restored = 0;
          
          for (let i = 0; i < transcriptionIds.length; i++) {
            const transcriptionId = transcriptionIds[i];
            const mediaId = mediaIdsToRestore[i];
            
            try {
              // Find the orphaned transcription folder
              const orphanedFolders = await fs_promises.readdir(orphanedPath);
              const orphanedFolder = orphanedFolders.find(f => f.includes(transcriptionId.split('_')[0]));
              
              if (orphanedFolder) {
                const orphanedTranscriptionPath = path.join(orphanedPath, orphanedFolder, 'transcription');
                const targetTranscriptionPath = path.join(
                  process.cwd(), 'user_data', 'users', userId, 'projects', 
                  result.projectId, 'media', mediaId, 'transcription'
                );
                
                // Ensure target directory exists
                await fs_promises.mkdir(targetTranscriptionPath, { recursive: true });
                
                // Copy transcription data
                if (await fs_promises.access(orphanedTranscriptionPath).then(() => true).catch(() => false)) {
                  // Copy all files from orphaned transcription to new location
                  const files = await fs_promises.readdir(orphanedTranscriptionPath);
                  for (const file of files) {
                    await fs_promises.copyFile(
                      path.join(orphanedTranscriptionPath, file),
                      path.join(targetTranscriptionPath, file)
                    );
                  }
                  
                  // Remove from orphaned index
                  await orphanedIndex.removeOrphanedTranscription(transcriptionId);
                  
                  // Delete orphaned folder
                  await fs_promises.rm(path.join(orphanedPath, orphanedFolder), { recursive: true, force: true });
                  
                  restored++;
                  console.log(`[FolderUpload] Restored transcription for media ${mediaId}`);
                }
              }
            } catch (error) {
              console.error(`[FolderUpload] Failed to restore transcription ${transcriptionId}:`, error);
            }
          }
          
          console.log(`[FolderUpload] Restored ${restored} transcriptions`);
        } catch (error) {
          console.error('[FolderUpload] Error restoring transcriptions:', error);
          // Don't fail the whole request, project is already created
        }
      }
    }
    
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
 * Batch download from URLs (YouTube, etc.)
 * Creates a project with proper structure matching regular uploads
 */
router.post('/batch-download', verifyUser, async (req: Request, res: Response) => {
  try {
    // Handle both JSON and FormData
    let urls, projectName, target;
    const cookieFiles: { [index: string]: any } = {};
    
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      // Handle FormData with cookie files
      const multer = require('multer');
      const upload = multer({ dest: 'temp/cookies/' });
      
      // Process multipart data
      await new Promise((resolve, reject) => {
        const uploadHandler = upload.any();
        uploadHandler(req, res, (err: any) => {
          if (err) reject(err);
          else resolve(true);
        });
      });
      
      // Extract data from form
      urls = JSON.parse((req as any).body.urls || '[]');
      projectName = (req as any).body.projectName;
      target = (req as any).body.target;
      
      // Extract cookie files
      const files = (req as any).files || [];
      files.forEach((file: any) => {
        if (file.fieldname.startsWith('cookieFile_')) {
          const index = file.fieldname.replace('cookieFile_', '');
          cookieFiles[index] = file.path; // Store file path for yt-dlp
        }
      });
    } else {
      // Handle JSON data (backward compatibility)
      urls = req.body.urls;
      projectName = req.body.projectName;
      target = req.body.target;
    }
    const userId = (req as any).user?.id || 'dev-anonymous';
    
    console.log('[BatchDownload] Starting batch download for user:', userId);
    console.log('[BatchDownload] URLs:', urls);
    console.log('[BatchDownload] Project name:', projectName);
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'No URLs provided' });
    }
    
    // Import YtDlpService
    const { YtDlpService } = require('../../services/ytdlpService');
    
    // Generate batch ID for tracking
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Register this download for progress tracking
    downloadProgress[batchId] = {
      startTime: Date.now(),
      completed: false
    };
    
    // Return immediately with batchId so frontend can start showing progress
    res.json({ batchId });
    
    // Continue downloading in background
    (async () => {
      try {
        // For now, we'll download synchronously and create the project
        // In production, this should be done in background with progress tracking
        const downloadedFiles: Array<{name: string, buffer: Buffer, mimeType: string}> = [];
    
    for (let i = 0; i < urls.length; i++) {
      const urlInfo = urls[i];
      const url = urlInfo.url || urlInfo;
      console.log(`[BatchDownload] Processing URL: ${url}`);
      
      try {
        // Generate temp directory path
        const tempDir = path.join(process.cwd(), 'temp', uuidv4());
        
        // Ensure temp directory exists
        await fs_promises.mkdir(tempDir, { recursive: true });
        
        // Download the video with cookie file if available
        const downloadOptions: any = {
          url,
          outputPath: tempDir,
          quality: urlInfo.quality || 'medium',
          downloadType: urlInfo.downloadType || 'video'
        };
        
        // Add cookie file if present for this URL
        if (cookieFiles[i.toString()]) {
          downloadOptions.cookieFile = cookieFiles[i.toString()];
          console.log(`[BatchDownload] Using cookie file for URL ${i}: ${cookieFiles[i.toString()]}`);
        }
        
        const videoInfo = await YtDlpService.downloadVideo(downloadOptions);
        
        // Read the downloaded file
        const downloadedFilePath = path.join(tempDir, videoInfo.filename);
        const fileBuffer = await fs_promises.readFile(downloadedFilePath);
        
        // Add to files array with the actual video title as name
        downloadedFiles.push({
          name: videoInfo.title + '.' + (videoInfo.format || 'mp4'),
          buffer: fileBuffer,
          mimeType: videoInfo.hasVideo ? `video/${videoInfo.format || 'mp4'}` : `audio/${videoInfo.format || 'mp3'}`
        });
        
        // Clean up temp directory
        await fs_promises.rm(tempDir, { recursive: true, force: true });
        
        console.log(`[BatchDownload] Successfully downloaded: ${videoInfo.title}`);
      } catch (error) {
        console.error(`[BatchDownload] Failed to download ${url}:`, error);
        // Continue with other URLs even if one fails
      }
    }
    
    if (downloadedFiles.length === 0) {
      return res.status(400).json({ error: 'Failed to download any files' });
    }
    
    // Create project using the standard createMultiMediaProject method
    // This ensures the same structure as regular uploads
    const result = await projectService.createMultiMediaProject(
      projectName || 'Downloaded Media',
      downloadedFiles,
      userId
    );
    
    // Additionally save URL metadata for each media
    const userDir = path.join(process.cwd(), 'user_data', 'users', userId, 'projects', result.projectId);
    
    for (let i = 0; i < Math.min(urls.length, result.mediaIds.length); i++) {
      const mediaDir = path.join(userDir, 'media', result.mediaIds[i]);
      const urlInfo = urls[i];
      
      // Save media.json with URL-specific information
      const mediaJson = {
        name: downloadedFiles[i].name.replace(/\.[^/.]+$/, ''), // Remove extension
        filename: `media-${uuidv4()}.${downloadedFiles[i].name.split('.').pop()}`,
        originalUrl: urlInfo.url || urlInfo,
        quality: urlInfo.quality || 'medium',
        downloadType: urlInfo.downloadType || 'video',
        format: downloadedFiles[i].name.split('.').pop(),
        hasVideo: downloadedFiles[i].mimeType.startsWith('video/'),
        createdAt: new Date().toISOString()
      };
      
      await fs_promises.writeFile(
        path.join(mediaDir, 'media.json'),
        JSON.stringify(mediaJson, null, 2),
        'utf8'
      );
    }
    
        console.log(`[BatchDownload] Project created: ${result.projectId} with ${result.mediaIds.length} media files`);
        
        // Mark download as completed
        if (downloadProgress[batchId]) {
          downloadProgress[batchId].completed = true;
          // Clean up after 5 minutes
          setTimeout(() => {
            delete downloadProgress[batchId];
          }, 5 * 60 * 1000);
        }
        
        // Clean up cookie files after successful completion
        Object.values(cookieFiles).forEach((cookieFilePath: string) => {
          fs_promises.unlink(cookieFilePath).catch(err => {
            console.log(`[BatchDownload] Failed to cleanup cookie file ${cookieFilePath}:`, err);
          });
        });
        
      } catch (error: any) {
        console.error('[BatchDownload] Error:', error);
        // Mark as completed even on error to stop progress tracking
        if (downloadProgress[batchId]) {
          downloadProgress[batchId].completed = true;
        }
        
        // Clean up cookie files even on error
        Object.values(cookieFiles).forEach((cookieFilePath: string) => {
          fs_promises.unlink(cookieFilePath).catch(err => {
            console.log(`[BatchDownload] Failed to cleanup cookie file ${cookieFilePath}:`, err);
          });
        });
      }
    })();
    
  } catch (error: any) {
    console.error('[BatchDownload] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to process batch download' });
  }
});

// Track download progress for each batch
const downloadProgress: { [batchId: string]: { startTime: number, completed: boolean } } = {};

/**
 * Get batch download progress (simulated progress for UI feedback)
 */
router.get('/batch-download/:batchId/progress', verifyUser, async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;
    
    // Check if this batch is being tracked
    if (!downloadProgress[batchId]) {
      // Batch not found or already completed and cleaned up
      return res.json({
        status: 'completed',
        projectId: batchId,
        totalFiles: 1,
        completedFiles: 1,
        progress: {
          0: {
            progress: 100,
            status: 'completed'
          }
        },
        mediaNames: {
          0: 'Downloaded Media'
        }
      });
    }
    
    const batchInfo = downloadProgress[batchId];
    const elapsedTime = Date.now() - batchInfo.startTime;
    
    if (batchInfo.completed) {
      // Download is complete
      return res.json({
        status: 'completed',
        projectId: batchId,
        totalFiles: 1,
        completedFiles: 1,
        progress: {
          0: {
            progress: 100,
            status: 'completed'
          }
        },
        mediaNames: {
          0: 'Downloaded Media'
        }
      });
    } else {
      // Simulate progress based on elapsed time
      // Assume downloads take about 30 seconds on average
      const progressPercent = Math.min(95, Math.floor((elapsedTime / 30000) * 100));
      
      return res.json({
        status: 'downloading',
        projectId: batchId,
        totalFiles: 1,
        completedFiles: 0,
        progress: {
          0: {
            progress: progressPercent,
            status: 'downloading'
          }
        },
        mediaNames: {
          0: 'Downloading Media'
        }
      });
    }
  } catch (error: any) {
    console.error('[BatchProgress] Error:', error);
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

/**
 * Check if URL is valid and can be downloaded
 */
router.post('/check-url', verifyUser, async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    console.log('[CheckURL] Checking URL:', url);
    
    // Import YtDlpService
    const { YtDlpService } = require('../../services/ytdlpService');
    
    try {
      // Try to get video info to validate the URL
      const videoInfo = await YtDlpService.getVideoInfo(url);
      
      console.log('[CheckURL] Video info retrieved:', {
        title: videoInfo.title,
        duration: videoInfo.duration,
        hasVideo: videoInfo.hasVideo
      });
      
      // Get quality options for the URL
      const formats = await YtDlpService.getQualityOptions(url);
      
      res.json({
        valid: true,
        status: 'public', // Add status field
        title: videoInfo.title,
        duration: videoInfo.duration,
        hasVideo: videoInfo.hasVideo,
        formats: formats
      });
    } catch (error: any) {
      console.error('[CheckURL] Failed to get video info:', error);
      
      // Parse error message and determine status
      let userMessage = 'לא ניתן לגשת לכתובת URL זו';
      let status = 'invalid';
      
      if (error.message.includes('סרטון פרטי') || error.message.includes('Private video')) {
        userMessage = 'סרטון פרטי - נדרש קובץ Cookies לאימות';
        status = 'protected';
      } else if (error.message.includes('סרטון למנויים') || error.message.includes('members-only')) {
        userMessage = 'סרטון למנויים בלבד - נדרש קובץ Cookies';
        status = 'protected';
      } else if (error.message.includes('לא זמין') || error.message.includes('unavailable')) {
        userMessage = 'הסרטון לא זמין או הוסר';
        status = 'invalid';
      } else if (error.message.includes('כתובת URL לא נתמכת') || error.message.includes('Unsupported URL')) {
        userMessage = 'כתובת URL לא נתמכת';
        status = 'invalid';
      }
      
      // For protected content, return 200 instead of 400 so frontend can handle it
      const responseStatus = status === 'protected' ? 200 : 400;
      
      res.status(responseStatus).json({
        valid: status === 'protected', // Protected content is valid, just needs cookies
        status: status,
        message: userMessage,
        error: userMessage
      });
    }
  } catch (error: any) {
    console.error('[CheckURL] Error:', error);
    res.status(500).json({ 
      valid: false,
      error: 'שגיאה בבדיקת הכתובת' 
    });
  }
});

/**
 * Add missing media files to existing project
 */
router.post('/:projectId/add-missing-media', verifyUser, upload.array('files'), async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { fileNames, missingFiles } = req.body;
    const files = req.files as Express.Multer.File[];
    const userId = (req as any).user?.id || 'unknown';
    
    console.log('[AddMissingMedia] Adding missing media to project:', projectId);
    console.log('[AddMissingMedia] Missing files:', missingFiles);
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }
    
    // Parse file names and missing files list
    let parsedFileNames: string[] = [];
    let parsedMissingFiles: string[] = [];
    try {
      if (fileNames) parsedFileNames = JSON.parse(fileNames);
      if (missingFiles) parsedMissingFiles = JSON.parse(missingFiles);
    } catch (e) {
      console.error('[AddMissingMedia] Failed to parse file info:', e);
    }
    
    // Filter to only add the missing files with enhanced validation
    const filesToAdd: Express.Multer.File[] = [];
    const namesToAdd: string[] = [];
    const processedNames = new Set<string>(); // Prevent duplicate names within this upload
    
    console.log('[AddMissingMedia] Filtering files:');
    console.log('[AddMissingMedia] - Received files:', files.map(f => f.originalname));
    console.log('[AddMissingMedia] - Parsed file names:', parsedFileNames);
    console.log('[AddMissingMedia] - Missing files list:', parsedMissingFiles);
    
    files.forEach((file, index) => {
      const fileName = parsedFileNames[index] || file.originalname;
      
      // Only add if it's in the missing files list AND we haven't already processed this name
      if (parsedMissingFiles.includes(fileName) && !processedNames.has(fileName)) {
        filesToAdd.push(file);
        namesToAdd.push(fileName);
        processedNames.add(fileName);
        console.log(`[AddMissingMedia] - Adding file: "${fileName}"`);
      } else {
        console.log(`[AddMissingMedia] - Skipping file: "${fileName}" (not missing: ${!parsedMissingFiles.includes(fileName)}, duplicate: ${processedNames.has(fileName)})`);
      }
    });
    
    if (filesToAdd.length === 0) {
      console.log('[AddMissingMedia] No missing files found in upload after filtering');
      return res.status(400).json({ error: 'No missing files found in upload' });
    }
    
    console.log(`[AddMissingMedia] Filtered to ${filesToAdd.length} files to add:`, namesToAdd);
    
    // Load project metadata
    const projectPath = path.join(process.cwd(), 'user_data', 'users', userId, 'projects', projectId);
    const projectMetaPath = path.join(projectPath, 'project.json');
    
    try {
      await fs_promises.access(projectMetaPath);
    } catch {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const projectData = JSON.parse(await fs_promises.readFile(projectMetaPath, 'utf-8'));
    const mediaPath = path.join(projectPath, 'media');
    
    // Get existing media file names to avoid duplicates
    const existingMediaNames = new Set<string>();
    if (projectData.mediaFiles) {
      for (const mediaId of projectData.mediaFiles) {
        try {
          const mediaMetaPath = path.join(mediaPath, mediaId, 'metadata.json');
          const mediaMetadata = JSON.parse(await fs_promises.readFile(mediaMetaPath, 'utf-8'));
          existingMediaNames.add(mediaMetadata.originalName);
        } catch (error) {
          // Ignore error, media may not have metadata
        }
      }
    }
    
    // Check for duplicates and prepare lists
    const duplicateFiles: string[] = [];
    const finalFilesToAdd: Express.Multer.File[] = [];
    const finalNamesToAdd: string[] = [];
    
    filesToAdd.forEach((file, index) => {
      const fileName = namesToAdd[index];
      if (!existingMediaNames.has(fileName)) {
        finalFilesToAdd.push(file);
        finalNamesToAdd.push(fileName);
      } else {
        duplicateFiles.push(fileName);
        console.log(`[AddMissingMedia] Found duplicate file: ${fileName}`);
      }
    });
    
    // If there are duplicates and user hasn't confirmed, return warning
    if (duplicateFiles.length > 0 && req.body.confirmDuplicates !== 'true') {
      console.log('[AddMissingMedia] Duplicates found, requesting confirmation');
      return res.status(409).json({
        duplicatesFound: true,
        duplicateFiles,
        message: duplicateFiles.length === 1 
          ? `הקובץ "${duplicateFiles[0]}" כבר קיים בפרויקט. האם להמשיך?`
          : `${duplicateFiles.length} קבצים כבר קיימים בפרויקט. האם להמשיך?`
      });
    }
    
    if (finalFilesToAdd.length === 0) {
      console.log('[AddMissingMedia] No new files to add (all already exist)');
      return res.json({
        success: true,
        newMediaIds: [],
        totalMedia: projectData.totalMedia,
        message: 'כל הקבצים כבר קיימים בפרויקט'
      });
    }
    
    console.log(`[AddMissingMedia] Adding ${finalFilesToAdd.length} new files (filtered from ${filesToAdd.length})`);
    
    // Add each missing file
    const newMediaIds: string[] = [];
    
    // Load or create media index
    const mediaIndexPath = path.join(projectPath, 'media-index.json');
    let mediaIndex;
    
    try {
      mediaIndex = JSON.parse(await fs_promises.readFile(mediaIndexPath, 'utf-8'));
      console.log('[AddMissingMedia] Loaded media index:', mediaIndex);
    } catch (error) {
      // Create new index if it doesn't exist
      console.log('[AddMissingMedia] Creating new media index');
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
    
    for (let i = 0; i < finalFilesToAdd.length; i++) {
      const file = finalFilesToAdd[i];
      const fileName = finalNamesToAdd[i];
      
      // Get next media ID from index
      let mediaNumber: number;
      if (mediaIndex.availableNumbers && mediaIndex.availableNumbers.length > 0) {
        // Use available gap
        mediaNumber = mediaIndex.availableNumbers.shift();
        console.log(`[AddMissingMedia] Using gap: media-${mediaNumber} for file: ${fileName}`);
      } else {
        // Use next number
        mediaNumber = mediaIndex.nextMediaNumber;
        mediaIndex.nextMediaNumber++;
        console.log(`[AddMissingMedia] Using next: media-${mediaNumber} for file: ${fileName}`);
      }
      
      const mediaId = `media-${mediaNumber}`;
      
      // Update media index
      if (!mediaIndex.activeMediaIds.includes(mediaId)) {
        mediaIndex.activeMediaIds.push(mediaId);
        mediaIndex.activeMediaIds.sort();
      }
      
      // Create media directory structure
      const mediaDir = path.join(mediaPath, mediaId);
      const backupsDir = path.join(mediaDir, 'backups');
      const transcriptionDir = path.join(mediaDir, 'transcription');
      
      await fs_promises.mkdir(mediaDir, { recursive: true });
      await fs_promises.mkdir(backupsDir, { recursive: true });
      await fs_promises.mkdir(transcriptionDir, { recursive: true });
      
      // Save media file
      const fileExtension = path.extname(fileName).toLowerCase();
      const mediaFileName = `media${fileExtension}`;
      const mediaFilePath = path.join(mediaDir, mediaFileName);
      await fs_promises.writeFile(mediaFilePath, file.buffer);
      
      // Calculate audio duration
      console.log(`[AddMissingMedia] Calculating duration for: ${mediaFilePath}`);
      const duration = await getAudioDuration(mediaFilePath);
      console.log(`[AddMissingMedia] Calculated duration: ${duration} seconds for ${fileName}`);
      
      // Create metadata
      const metadataContent = {
        mediaId,
        fileName: mediaFileName,
        originalName: fileName,
        mimeType: file.mimetype,
        size: file.size,
        duration,
        stage: 'transcription',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };
      
      await fs_promises.writeFile(
        path.join(mediaDir, 'metadata.json'),
        JSON.stringify(metadataContent, null, 2)
      );
      
      // Create empty transcription data
      const transcriptionData = {
        blocks: [],
        lastSaved: new Date().toISOString()
      };
      
      await fs_promises.writeFile(
        path.join(transcriptionDir, 'data.json'),
        JSON.stringify(transcriptionData, null, 2)
      );
      
      // Create empty speakers and remarks files
      await fs_promises.writeFile(
        path.join(mediaDir, 'speakers.json'),
        JSON.stringify({ speakers: [] }, null, 2)
      );
      
      await fs_promises.writeFile(
        path.join(mediaDir, 'remarks.json'),
        JSON.stringify({ remarks: [] }, null, 2)
      );
      
      newMediaIds.push(mediaId);
      
      // Update media index's active media list
      if (!mediaIndex.activeMediaIds.includes(mediaId)) {
        mediaIndex.activeMediaIds.push(mediaId);
      }
    }
    
    // Sort activeMediaIds and update lastUpdated
    mediaIndex.activeMediaIds.sort();
    mediaIndex.lastUpdated = new Date().toISOString();
    
    // Update project metadata - ensure no duplicates using Set
    const allMediaIds = new Set([...(projectData.mediaFiles || []), ...newMediaIds]);
    projectData.mediaFiles = Array.from(allMediaIds);
    projectData.totalMedia = projectData.mediaFiles.length;
    
    console.log(`[AddMissingMedia] Updated mediaFiles array:`, projectData.mediaFiles);
    projectData.lastModified = new Date().toISOString();
    
    await fs_promises.writeFile(projectMetaPath, JSON.stringify(projectData, null, 2));
    
    // Save updated media index
    await fs_promises.writeFile(mediaIndexPath, JSON.stringify(mediaIndex, null, 2));
    console.log('[AddMissingMedia] Updated media index:', mediaIndex);
    
    console.log('[AddMissingMedia] Successfully added', newMediaIds.length, 'missing media files');
    
    res.json({
      success: true,
      newMediaIds,
      totalMedia: projectData.totalMedia,
      message: `נוספו ${newMediaIds.length} קבצים חסרים לפרויקט`
    });
    
  } catch (error: any) {
    console.error('[AddMissingMedia] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to add missing media' });
  }
});

/**
 * List all projects
 */
router.get('/list', verifyUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'unknown';
    console.log(`[ProjectList] Loading projects for user: ${userId}`);
    
    // Don't queue storage calculation on every project list request - it's too expensive
    // backgroundJobService.queueStorageCalculation(userId);
    
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
 * Restore orphaned transcription to a specific media file
 */
router.post('/orphaned/restore-to-media', verifyUser, async (req: Request, res: Response) => {
  try {
    const { transcriptionId, targetProjectId, targetMediaId, mode, position } = req.body;
    const userId = (req as any).user?.id || 'bfc0ba9a-daae-46e2-acb9-5984d1adef9f';
    
    if (!transcriptionId || !targetProjectId || !targetMediaId || !mode) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    if (mode !== 'override' && mode !== 'append') {
      return res.status(400).json({ error: 'Mode must be either "override" or "append"' });
    }
    
    // Validate position parameter if mode is append
    const appendPosition = mode === 'append' ? (position || 'after') : null;
    if (mode === 'append' && appendPosition !== 'before' && appendPosition !== 'after') {
      return res.status(400).json({ error: 'Position must be either "before" or "after" for append mode' });
    }
    
    console.log(`[RestoreToMedia] Restoring ${transcriptionId} to project ${targetProjectId}, media ${targetMediaId}, mode: ${mode}, position: ${appendPosition}`);
    
    // Get paths
    const orphanedPath = path.join(process.cwd(), 'user_data', 'users', userId, 'orphaned');
    const projectPath = path.join(process.cwd(), 'user_data', 'users', userId, 'projects', targetProjectId);
    const mediaPath = path.join(projectPath, 'media', targetMediaId);
    const targetTranscriptionPath = path.join(mediaPath, 'transcription', 'data.json');
    
    // Ensure target directory exists
    await fs_promises.mkdir(path.join(mediaPath, 'transcription'), { recursive: true });
    
    // Find the transcription directly from filesystem instead of using the index
    let archivePath: string | null = null;
    let orphanedFolderName: string | null = null;
    
    // Check if transcriptionId contains media suffix (e.g., "_media-1")
    const mediaMatch = transcriptionId.match(/^(.+)_(media-\d+)$/);
    
    if (mediaMatch) {
      // Handle subfolder structure: orphan_xxx/media-N/transcription/data.json
      const [, baseFolder, mediaFolder] = mediaMatch;
      const subfolderPath = path.join(orphanedPath, baseFolder, mediaFolder, 'transcription', 'data.json');
      
      try {
        await fs_promises.access(subfolderPath);
        archivePath = subfolderPath;
        orphanedFolderName = baseFolder; // Use the base folder for cleanup
        console.log(`[RestoreToMedia] Found transcription at subfolder path: ${subfolderPath}`);
      } catch {
        console.log(`[RestoreToMedia] Subfolder path not found: ${subfolderPath}`);
      }
    }
    
    // If not found with subfolder structure, try direct path
    if (!archivePath) {
      const directPath = path.join(orphanedPath, transcriptionId, 'transcription', 'data.json');
      
      try {
        await fs_promises.access(directPath);
        archivePath = directPath;
        orphanedFolderName = transcriptionId;
        console.log(`[RestoreToMedia] Found transcription at direct path: ${directPath}`);
      } catch {
        // If still not found, search through orphaned folders
        try {
          const folders = await fs_promises.readdir(orphanedPath);
          for (const folder of folders) {
            if (folder === 'orphaned-index.json') continue;
            
            // Check if this folder matches or contains the transcriptionId
            const transcriptionBase = transcriptionId.replace(/_media-\d+$/, '');
            
            if (folder === transcriptionId || 
                folder === transcriptionBase ||
                folder.includes(transcriptionId) || 
                transcriptionId.includes(folder) ||
                folder.includes(transcriptionBase)) {
              const testPath = path.join(orphanedPath, folder, 'transcription', 'data.json');
              try {
                await fs_promises.access(testPath);
                archivePath = testPath;
                orphanedFolderName = folder;
                console.log(`[RestoreToMedia] Found transcription at: ${testPath}`);
                break;
              } catch {
                // Continue searching
              }
            }
          }
        } catch (error) {
          console.error('[RestoreToMedia] Error searching orphaned folders:', error);
        }
      }
    }
    
    if (!archivePath || !orphanedFolderName) {
      console.log('[RestoreToMedia] Transcription not found for ID:', transcriptionId);
      return res.status(404).json({ error: 'Transcription not found' });
    }
    
    // For testing: Simply copy the content from archived to target
    console.log(`[RestoreToMedia] Reading archived data from: ${archivePath}`);
    console.log(`[RestoreToMedia] Will write to: ${targetTranscriptionPath}`);
    
    let archivedData: any;
    try {
      // Read the archived transcription content
      const archivedContent = await fs_promises.readFile(archivePath, 'utf-8');
      
      // Parse to verify it's valid JSON
      archivedData = JSON.parse(archivedContent);
      
      if (mode === 'append') {
        // For append mode, merge with existing content
        let existingData: any = { blocks: [], version: '1.0.0' };
        try {
          const existingContent = await fs_promises.readFile(targetTranscriptionPath, 'utf-8');
          existingData = JSON.parse(existingContent);
        } catch (e) {
          // No existing transcription or invalid JSON, that's okay
        }
        
        // Mark existing blocks as original
        const originalBlocks = (existingData.blocks || []).map((block: any, index: number) => ({
          ...block,
          _source: 'original',
          _blockIndex: index
        }));
        
        // Mark archived blocks as restored and ensure unique IDs
        const restoredBlocks = (archivedData.blocks || []).map((block: any, index: number) => {
          // Generate new unique ID for restored blocks to avoid duplicates
          const newBlockId = block.id ? `${block.id}-restored-${Date.now()}-${index}` : `block-restored-${Date.now()}-${index}`;
          return {
            ...block,
            id: newBlockId,
            _source: 'restored',
            _sourceId: transcriptionId,
            _restoredAt: new Date().toISOString(),
            _blockIndex: index,
            _originalId: block.id // Keep track of original ID
          };
        });
        
        // Merge blocks based on position
        let mergedBlocks;
        let originalIndices: number[];
        let restoredIndices: number[];
        
        if (appendPosition === 'before') {
          mergedBlocks = [...restoredBlocks, ...originalBlocks];
          originalIndices = Array.from({ length: originalBlocks.length }, (_, i) => restoredBlocks.length + i);
          restoredIndices = Array.from({ length: restoredBlocks.length }, (_, i) => i);
        } else {
          mergedBlocks = [...originalBlocks, ...restoredBlocks];
          originalIndices = Array.from({ length: originalBlocks.length }, (_, i) => i);
          restoredIndices = Array.from({ length: restoredBlocks.length }, (_, i) => originalBlocks.length + i);
        }
        
        // Create merge history entry
        const mergeHistoryEntry = {
          timestamp: new Date().toISOString(),
          operation: 'append',
          position: appendPosition,
          originalBlockIndices: originalIndices,
          restoredBlockIndices: restoredIndices,
          restoredFrom: transcriptionId,
          restoredMediaName: archivedData.metadata?.originalName || 'Unknown'
        };
        
        // Merge all data with metadata tracking
        const mergedData = {
          blocks: mergedBlocks,
          version: '1.0.0',
          lastSaved: new Date().toISOString(),
          metadata: archivedData.metadata || existingData.metadata || {},
          speakers: archivedData.speakers || existingData.speakers || [],
          remarks: archivedData.remarks || existingData.remarks || [],
          mergeHistory: [...(existingData.mergeHistory || []), mergeHistoryEntry]
        };
        
        // Write merged content
        await fs_promises.writeFile(targetTranscriptionPath, JSON.stringify(mergedData, null, 2));
        console.log(`[RestoreToMedia] Successfully appended ${archivedData.blocks?.length || 0} blocks`);
      } else {
        // Override mode - simply copy the entire content
        await fs_promises.writeFile(targetTranscriptionPath, archivedContent);
        console.log(`[RestoreToMedia] Successfully copied archived content to target`);
        
        // Also update speakers.json if present
        if (archivedData.speakers) {
          const speakersPath = path.join(mediaPath, 'speakers.json');
          await fs_promises.writeFile(speakersPath, JSON.stringify(archivedData.speakers, null, 2));
          console.log(`[RestoreToMedia] Updated speakers.json`);
        }
      }
    } catch (error) {
      console.error(`[RestoreToMedia] Error copying content:`, error);
      return res.status(500).json({ error: 'Failed to restore transcription content' });
    }
    
    // Delete the orphaned folder - TEMPORARILY COMMENTED OUT FOR TESTING
    // const orphanedFolderPath = path.join(orphanedPath, orphanedFolderName);
    // try {
    //   await fs_promises.rm(orphanedFolderPath, { recursive: true, force: true });
    //   console.log(`[RestoreToMedia] Deleted orphaned folder: ${orphanedFolderName}`);
    // } catch (error) {
    //   console.error(`[RestoreToMedia] Failed to delete orphaned folder:`, error);
    // }
    console.log(`[RestoreToMedia] SKIPPING deletion of orphaned folder: ${orphanedFolderName} (temporarily disabled for testing)`)
    
    // Update orphaned index if it exists (but don't fail if it doesn't)
    try {
      const orphanedIndexPath = path.join(orphanedPath, 'orphaned-index.json');
      const orphanedIndex = JSON.parse(await fs_promises.readFile(orphanedIndexPath, 'utf-8'));
      
      if (orphanedIndex.transcriptions) {
        for (const [mediaName, transcriptions] of Object.entries(orphanedIndex.transcriptions)) {
          const index = (transcriptions as any[]).findIndex(t => 
            t.id === transcriptionId || 
            t.transcriptionId === transcriptionId ||
            t.originalProjectFolder === orphanedFolderName
          );
          if (index >= 0) {
            (transcriptions as any[]).splice(index, 1);
            if ((transcriptions as any[]).length === 0) {
              delete orphanedIndex.transcriptions[mediaName];
            }
            break;
          }
        }
        orphanedIndex.lastUpdated = new Date().toISOString();
        await fs_promises.writeFile(orphanedIndexPath, JSON.stringify(orphanedIndex, null, 2));
      }
    } catch (e) {
      // Index update failed, but restoration can continue
      console.log('[RestoreToMedia] Could not update orphaned index, but restoration continues');
    }
    
    // Return success response
    // Note: archivedData was already parsed earlier at line 1664
    let successMessage = 'התמלול שוחזר בהצלחה';
    if (mode === 'append') {
      if (appendPosition === 'before') {
        successMessage = 'התמלול נוסף בהצלחה בתחילת התמלול הקיים';
      } else {
        successMessage = 'התמלול נוסף בהצלחה בסוף התמלול הקיים';
      }
    }
    
    res.json({
      success: true,
      message: successMessage,
      blocksRestored: archivedData.blocks?.length || 0
    });
    
  } catch (error: any) {
    console.error('[RestoreToMedia] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to restore transcription' });
  }
});

/**
 * Preview orphaned transcription content
 */
router.get('/orphaned/preview/:transcriptionId', verifyUser, async (req: Request, res: Response) => {
  try {
    const { transcriptionId } = req.params;
    const userId = (req as any).user?.id || 'bfc0ba9a-daae-46e2-acb9-5984d1adef9f';
    
    console.log(`[OrphanedPreview] Previewing transcription ${transcriptionId} for user ${userId}`);
    
    // Read directly from filesystem instead of using the index
    const baseDir = process.cwd().endsWith('backend') ? process.cwd() : path.join(process.cwd(), 'backend');
    const orphanedDir = path.join(baseDir, 'user_data', 'users', userId, 'orphaned');
    
    // The transcriptionId from frontend is the folder name (e.g., "orphan_1757235196891_2026772" or "orphaned_2025-09-07_23-18-09_001_media-2_1757314865945")
    let dataPath: string | null = null;
    
    // First, try direct folder with transcription subfolder
    const directPath = path.join(orphanedDir, transcriptionId, 'transcription', 'data.json');
    
    try {
      await fs_promises.access(directPath);
      dataPath = directPath;
      console.log(`[OrphanedPreview] Found transcription at direct path: ${directPath}`);
    } catch {
      // If not found, check if it's a subfolder pattern (for project-level orphans)
      const parts = transcriptionId.split('_');
      if (parts.length > 1) {
        // Try to find the parent folder
        const folders = await fs_promises.readdir(orphanedDir);
        for (const folder of folders) {
          if (folder.includes(transcriptionId) || transcriptionId.includes(folder)) {
            const testPath = path.join(orphanedDir, folder, 'transcription', 'data.json');
            try {
              await fs_promises.access(testPath);
              dataPath = testPath;
              console.log(`[OrphanedPreview] Found transcription at: ${testPath}`);
              break;
            } catch {
              // Check for media subfolders
              const subfolderPath = path.join(orphanedDir, folder, parts[parts.length - 1], 'transcription', 'data.json');
              try {
                await fs_promises.access(subfolderPath);
                dataPath = subfolderPath;
                console.log(`[OrphanedPreview] Found transcription at subfolder: ${subfolderPath}`);
                break;
              } catch {
                // Continue searching
              }
            }
          }
        }
      }
    }
    
    if (!dataPath) {
      console.log(`[OrphanedPreview] Transcription not found for ID: ${transcriptionId}`);
      return res.status(404).json({ error: 'Transcription not found' });
    }
    
    console.log(`[OrphanedPreview] Reading from: ${dataPath}`);
    
    if (!fs.existsSync(dataPath)) {
      console.log(`[OrphanedPreview] File not found at path`);
      return res.status(404).json({ error: 'Transcription file not found' });
    }
    
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    
    // Extract text content for preview
    let content = '';
    if (data.blocks && Array.isArray(data.blocks)) {
      content = data.blocks.map((block: any) => block.text || '').join('\n');
    } else if (typeof data === 'string') {
      content = data;
    } else {
      content = JSON.stringify(data, null, 2);
    }
    
    res.json({
      content: content.substring(0, 1000), // Limit preview to 1000 characters
      totalLength: content.length,
      transcriptionId: transcriptionId
    });
    
  } catch (error) {
    console.error('[OrphanedPreview] Error:', error);
    res.status(500).json({ error: 'Failed to preview transcription' });
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
        
        // Initialize orphaned index service
        const orphanedIndex = projectService.getOrphanedIndexService(userId);
        await orphanedIndex.initialize();
        
        // Move each media's transcription folder
        if (projectData.mediaFiles) {
          for (const mediaId of projectData.mediaFiles) {
            // Check for multi-media project structure first
            let mediaPath = path.join(projectPath, 'media', mediaId);
            let transcriptionPath = path.join(mediaPath, 'transcription');
            
            // If not found, try old structure
            try {
              await fs_promises.access(transcriptionPath);
            } catch {
              mediaPath = path.join(projectPath, mediaId);
              transcriptionPath = path.join(mediaPath, 'transcription');
            }
            
            try {
              await fs_promises.access(transcriptionPath);
              
              // Create media folder in orphaned
              const targetMediaPath = path.join(orphanedProjectPath, mediaId);
              await fs_promises.mkdir(targetMediaPath, { recursive: true });
              
              // Move the transcription folder
              const targetPath = path.join(targetMediaPath, 'transcription');
              await fs_promises.rename(transcriptionPath, targetPath);
              
              // Read media metadata if available
              let mediaDuration: number | undefined;
              let mediaSize: number | undefined;
              let mediaName = mediaId;
              
              try {
                const metadataPath = path.join(mediaPath, 'metadata.json');
                const mediaMetadata = JSON.parse(await fs_promises.readFile(metadataPath, 'utf-8'));
                mediaName = mediaMetadata.originalName || mediaMetadata.fileName || mediaId;
                mediaDuration = mediaMetadata.duration;
                mediaSize = mediaMetadata.size;
              } catch {
                // No metadata file, try to get from transcription data
              }
              
              // Update metadata to indicate when it was moved
              const dataPath = path.join(targetPath, 'data.json');
              try {
                const data = JSON.parse(await fs_promises.readFile(dataPath, 'utf-8'));
                
                // Get media name from transcription if not found
                if (!mediaName || mediaName === mediaId) {
                  mediaName = data.metadata?.originalName || data.metadata?.fileName || mediaId;
                }
                
                // Try to get duration from transcription metadata if not found
                if (!mediaDuration && data.metadata?.duration) {
                  mediaDuration = data.metadata.duration;
                }
                
                data.orphanedFrom = {
                  projectId,
                  projectName,
                  projectFolder: orphanedProjectFolder,
                  mediaId: mediaId,
                  mediaName,
                  mediaDuration,
                  mediaSize,
                  orphanedAt: new Date().toISOString()
                };
                await fs_promises.writeFile(dataPath, JSON.stringify(data, null, 2));
                
                // Add to orphaned index
                await orphanedIndex.addOrphanedTranscription({
                  transcriptionId: `${projectId}_${mediaId}_${timestamp}`,
                  originalProjectId: projectId,
                  originalProjectName: projectName,
                  originalProjectFolder: orphanedProjectFolder,
                  originalMediaId: mediaId,
                  originalMediaName: mediaName,
                  mediaDuration,
                  mediaSize,
                  archivedPath: targetPath,
                  fileSize: (await fs_promises.stat(dataPath)).size
                });
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
    
    // Now delete the remaining project folder
    const projectPath = path.join(process.cwd(), 'user_data', 'users', userId, 'projects', projectId);
    
    // First verify the folder exists before trying to delete
    try {
      await fs_promises.access(projectPath);
      console.log(`[ProjectDelete] Project folder exists, attempting deletion: ${projectPath}`);
    } catch {
      console.log(`[ProjectDelete] Project folder doesn't exist: ${projectPath}`);
      res.json({
        success: true,
        message: `Project ${projectId} already deleted`,
        transcriptionsPreserved: !deleteTranscription
      });
      return;
    }
    
    // Add a small delay to ensure files are released
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Try multiple deletion methods for Windows compatibility
    let deletionSuccessful = false;
    
    // Method 1: Try standard fs.rm first
    try {
      console.log(`[ProjectDelete] Attempting fs.rm deletion...`);
      await fs_promises.rm(projectPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      
      // Check if deletion worked
      try {
        await fs_promises.access(projectPath);
        console.log(`[ProjectDelete] fs.rm failed, folder still exists`);
      } catch {
        deletionSuccessful = true;
        console.log(`[ProjectDelete] fs.rm succeeded`);
      }
    } catch (error: any) {
      console.log(`[ProjectDelete] fs.rm error: ${error.message}`);
    }
    
    // Method 2: If fs.rm failed, try Windows rmdir command
    if (!deletionSuccessful && process.platform === 'win32') {
      try {
        console.log(`[ProjectDelete] Attempting Windows rmdir deletion...`);
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        // Use Windows rmdir command with /S (recursive) and /Q (quiet)
        await execAsync(`rmdir /S /Q "${projectPath}"`, { 
          windowsHide: true,
          timeout: 10000 
        });
        
        // Check if deletion worked
        try {
          await fs_promises.access(projectPath);
          console.log(`[ProjectDelete] rmdir failed, folder still exists`);
        } catch {
          deletionSuccessful = true;
          console.log(`[ProjectDelete] rmdir succeeded`);
        }
      } catch (error: any) {
        console.log(`[ProjectDelete] rmdir error: ${error.message}`);
      }
    }
    
    // Method 3: If still not deleted, try PowerShell Remove-Item
    if (!deletionSuccessful && process.platform === 'win32') {
      try {
        console.log(`[ProjectDelete] Attempting PowerShell deletion...`);
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        // Use PowerShell Remove-Item with -Recurse and -Force
        await execAsync(`powershell -Command "Remove-Item -Path '${projectPath}' -Recurse -Force -ErrorAction SilentlyContinue"`, {
          windowsHide: true,
          timeout: 10000
        });
        
        // Check if deletion worked
        try {
          await fs_promises.access(projectPath);
          console.log(`[ProjectDelete] PowerShell failed, folder still exists`);
        } catch {
          deletionSuccessful = true;
          console.log(`[ProjectDelete] PowerShell succeeded`);
        }
      } catch (error: any) {
        console.log(`[ProjectDelete] PowerShell error: ${error.message}`);
      }
    }
    
    // Final verification
    try {
      await fs_promises.access(projectPath);
      // If we can still access it, all deletion methods failed
      console.error(`[ProjectDelete] ERROR: All deletion methods failed. Folder still exists: ${projectPath}`);
      
      // Try to list what's preventing deletion
      try {
        const contents = await fs_promises.readdir(projectPath, { withFileTypes: true });
        console.error(`[ProjectDelete] Remaining contents: ${contents.map(c => c.name).join(', ')}`);
      } catch (e) {
        console.error(`[ProjectDelete] Could not list remaining contents`);
      }
      
      res.status(500).json({ 
        error: 'Failed to delete project folder. Directory still exists after all deletion attempts.',
        projectPath: projectPath,
        platform: process.platform
      });
    } catch {
      // Good! Folder is gone
      console.log(`[ProjectDelete] Successfully deleted project: ${projectId}`);
      
      // Force refresh storage calculation for this user
      const storageService = require('../../services/storageService').default;
      storageService.forceRefreshUserStorage(userId).then(() => {
        console.log(`[ProjectDelete] Storage refreshed for user: ${userId}`);
      }).catch((err: any) => {
        console.error(`[ProjectDelete] Failed to refresh storage:`, err);
      });
      
      res.json({
        success: true,
        message: `Project ${projectId} deleted successfully`,
        transcriptionsPreserved: !deleteTranscription
      });
    }
  } catch (error: any) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: error.message || 'Failed to delete project' });
  }
});

/**
 * Delete a specific media file from a project
 */
/**
 * Restore archived transcriptions
 */
/**
 * Get archived transcription content for preview
 */
router.post('/preview-archived', verifyUser, async (req: Request, res: Response) => {
  try {
    const { archivedTranscriptions } = req.body;
    const userId = (req as any).user?.id || 'unknown';
    
    console.log('[PreviewArchived] Fetching content for archived transcriptions');
    console.log('[PreviewArchived] Received data:', JSON.stringify(archivedTranscriptions, null, 2));
    
    const orphanedPath = path.join(process.cwd(), 'user_data', 'users', userId, 'orphaned');
    const transcriptionsWithContent: any[] = [];
    
    // For each media file and its transcriptions
    for (const [mediaName, transcriptions] of Object.entries(archivedTranscriptions)) {
      const mediaTranscriptions = [];
      
      for (const transcription of (transcriptions as any[])) {
        try {
          // Read transcription content from the archived folder structure
          let transcriptionData = null;
          
          // Build the correct path to the data file
          let dataFilePath: string;
          if (transcription.originalProjectFolder) {
            // Use the folder name stored in the index
            dataFilePath = path.join(orphanedPath, transcription.originalProjectFolder, 'transcription', 'data.json');
          } else {
            // Fallback to parsing the archivedPath
            const archivedPath = transcription.archivedPath;
            const pathParts = archivedPath.split(/[\\\/]/);
            const folderName = pathParts.find((p: string) => p.startsWith('orphan_') || p.startsWith('orphaned_'));
            if (folderName) {
              dataFilePath = path.join(orphanedPath, folderName, 'transcription', 'data.json');
            } else {
              // Final fallback - try direct path construction
              dataFilePath = path.join(process.cwd(), 'user_data', 'users', userId, archivedPath);
              if (archivedPath.endsWith('transcription')) {
                dataFilePath = path.join(dataFilePath, 'data.json');
              } else if (!archivedPath.endsWith('.json')) {
                dataFilePath = path.join(dataFilePath, 'transcription', 'data.json');
              }
            }
          }
          
          // Read the transcription data
          try {
            await fs_promises.access(dataFilePath);
            transcriptionData = JSON.parse(await fs_promises.readFile(dataFilePath, 'utf-8'));
          } catch (error) {
            console.log(`[PreviewArchived] Could not read transcription data for ${transcription.transcriptionId} at ${dataFilePath}:`, error);
            continue;
          }
          
          if (transcriptionData) {
            // Extract text content from blocks
            let textContent = '';
            let previewBlocks = [];
            let totalWords = 0;
            
            if (transcriptionData.blocks && Array.isArray(transcriptionData.blocks)) {
              // Get first 3 blocks for preview
              previewBlocks = transcriptionData.blocks.slice(0, 3).map((block: any) => ({
                text: block.text || '',
                speaker: block.speaker,
                timestamp: block.timestamp
              }));
              
              // Calculate total words
              totalWords = transcriptionData.blocks.reduce((sum: number, block: any) => {
                const words = (block.text || '').split(/\s+/).filter((w: string) => w.length > 0).length;
                return sum + words;
              }, 0);
              
              textContent = transcriptionData.blocks
                .map((block: any) => block.text || '')
                .join(' ')
                .substring(0, 500); // Limit preview to 500 chars
            }
            
            mediaTranscriptions.push({
              ...transcription,
              content: textContent,
              blockCount: transcriptionData.blocks?.length || 0,
              lastModified: transcriptionData.lastModified,
              totalDuration: transcriptionData.metadata?.duration,
              preview: {
                blocks: previewBlocks,
                totalBlocks: transcriptionData.blocks?.length || 0,
                totalWords: totalWords
              }
            });
          }
        } catch (error) {
          console.error(`[PreviewArchived] Error reading transcription ${transcription.transcriptionId}:`, error);
        }
      }
      
      if (mediaTranscriptions.length > 0) {
        transcriptionsWithContent.push({
          mediaName,
          transcriptions: mediaTranscriptions
        });
      }
    }
    
    res.json({
      success: true,
      transcriptions: transcriptionsWithContent
    });
    
  } catch (error) {
    console.error('[PreviewArchived] Error:', error);
    res.status(500).json({ error: 'Failed to preview archived transcriptions' });
  }
});

router.post('/restore-archived', verifyUser, async (req: Request, res: Response) => {
  try {
    const { transcriptionIds, projectId, mediaIds } = req.body;
    const userId = (req as any).user?.id || 'unknown';
    
    console.log(`[RestoreArchived] Restoring ${transcriptionIds.length} transcriptions to project ${projectId}`);
    
    const orphanedIndex = projectService.getOrphanedIndexService(userId);
    await orphanedIndex.initialize();
    const orphanedPath = path.join(process.cwd(), 'user_data', 'users', userId, 'orphaned');
    const projectPath = path.join(process.cwd(), 'user_data', 'users', userId, 'projects', projectId);
    
    const restored: string[] = [];
    const failed: string[] = [];
    
    for (let i = 0; i < transcriptionIds.length; i++) {
      const transcriptionId = transcriptionIds[i];
      const mediaId = mediaIds[i];
      
      try {
        // Find the orphaned folder
        const folders = await fs_promises.readdir(orphanedPath);
        const orphanedFolder = folders.find(f => f.includes(transcriptionId) || 
                                               (f.includes(projectId) && f.includes(mediaId)));
        
        if (!orphanedFolder) {
          console.error(`[RestoreArchived] Orphaned folder not found for ${transcriptionId}`);
          failed.push(transcriptionId);
          continue;
        }
        
        // Path to orphaned transcription
        const orphanedTranscriptionPath = path.join(orphanedPath, orphanedFolder, 'transcription');
        
        // Check if it's a folder structure or old single file
        let archivedData;
        let isFolder = false;
        
        try {
          // Try to read as folder structure first
          const dataPath = path.join(orphanedTranscriptionPath, 'data.json');
          archivedData = JSON.parse(await fs_promises.readFile(dataPath, 'utf-8'));
          isFolder = true;
        } catch {
          // Fall back to old single JSON file format
          const archivePath = path.join(orphanedPath, orphanedFolder);
          archivedData = JSON.parse(await fs_promises.readFile(archivePath, 'utf-8'));
        }
        
        // Create media transcription directory
        const mediaPath = path.join(projectPath, 'media', mediaId);
        const transcriptionPath = path.join(mediaPath, 'transcription');
        await fs_promises.mkdir(transcriptionPath, { recursive: true });
        
        // Remove orphaned metadata
        delete archivedData.orphanedFrom;
        
        if (isFolder) {
          // Move entire transcription folder back
          await fs_promises.rename(orphanedTranscriptionPath, transcriptionPath);
          
          // Update data.json to remove orphaned metadata
          const restoredDataPath = path.join(transcriptionPath, 'data.json');
          const restoredData = JSON.parse(await fs_promises.readFile(restoredDataPath, 'utf-8'));
          delete restoredData.orphanedFrom;
          await fs_promises.writeFile(restoredDataPath, JSON.stringify(restoredData, null, 2));
          
          // Delete the orphaned folder
          await fs_promises.rm(path.join(orphanedPath, orphanedFolder), { recursive: true, force: true });
        } else {
          // Old format: single JSON file
          await fs_promises.writeFile(
            path.join(transcriptionPath, 'data.json'),
            JSON.stringify(archivedData, null, 2)
          );
          
          // Delete archived file
          await fs_promises.unlink(path.join(orphanedPath, orphanedFolder));
        }
        
        // Remove from orphaned index
        await orphanedIndex.removeOrphanedTranscription(transcriptionId);
        
        restored.push(mediaId);
        console.log(`[RestoreArchived] Restored transcription for media ${mediaId}`);
        
      } catch (error) {
        console.error(`[RestoreArchived] Failed to restore ${transcriptionId}:`, error);
        failed.push(transcriptionId);
      }
    }
    
    res.json({
      success: true,
      restored,
      failed,
      message: `שוחזרו ${restored.length} תמלולים בהצלחה`
    });
    
  } catch (error) {
    console.error('[RestoreArchived] Error:', error);
    res.status(500).json({ error: 'Failed to restore archived transcriptions' });
  }
});

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
        
        // Create unique folder for orphaned transcription
        const timestamp = Date.now();
        const orphanedFolderName = `orphaned_${projectId}_${mediaId}_${timestamp}`;
        const orphanedMediaPath = path.join(orphanedPath, orphanedFolderName);
        await fs_promises.mkdir(orphanedMediaPath, { recursive: true });
        
        // Target path for the transcription folder
        const targetPath = path.join(orphanedMediaPath, 'transcription');
        
        // Move the entire transcription folder
        await fs_promises.rename(transcriptionPath, targetPath);
        
        // Load transcription data from new location
        const dataPath = path.join(targetPath, 'data.json');
        const data = JSON.parse(await fs_promises.readFile(dataPath, 'utf-8'));
        
        // Try to get the media name and metadata
        let mediaName = mediaId;
        let mediaDuration: number | undefined;
        let mediaSize: number | undefined;
        
        try {
          const mediaMetadataPath = path.join(mediaPath, 'metadata.json');
          const mediaMetadata = JSON.parse(await fs_promises.readFile(mediaMetadataPath, 'utf-8'));
          mediaName = mediaMetadata.originalName || mediaMetadata.fileName || mediaId;
          mediaDuration = mediaMetadata.duration;
          mediaSize = mediaMetadata.size;
        } catch {
          // If no metadata.json, use the name from transcription metadata if available
          mediaName = data.metadata?.originalName || data.metadata?.fileName || mediaId;
          if (data.metadata?.duration) {
            mediaDuration = data.metadata.duration;
          }
        }
        
        // Add orphaned metadata
        data.orphanedFrom = {
          projectId,
          projectName,
          mediaId,
          mediaName,
          mediaDuration,
          mediaSize,
          orphanedAt: new Date().toISOString()
        };
        
        // Update the data.json with orphaned metadata
        await fs_promises.writeFile(dataPath, JSON.stringify(data, null, 2));
        
        // Update the orphaned index
        const indexService = projectService.getOrphanedIndexService(userId);
        await indexService.initialize();
        await indexService.addOrphanedTranscription({
          transcriptionId: `${projectId}_${mediaId}_${timestamp}`,
          originalProjectId: projectId,
          originalProjectName: projectName,
          originalMediaId: mediaId,
          originalMediaName: mediaName,
          mediaDuration,
          mediaSize,
          archivedPath: targetPath,
          fileSize: (await fs_promises.stat(targetPath)).size
        });
        
        console.log(`Moved transcription to orphaned: ${orphanedFolderName}`);
      } catch (error) {
        // Transcription doesn't exist or error moving to orphaned, skip
        console.error('Error moving transcription to orphaned:', error);
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
          projectData.totalMedia = projectData.mediaFiles.length;
          await fs_promises.writeFile(projectFile, JSON.stringify(projectData, null, 2));
          
          // Update media index
          const mediaIndexPath = path.join(projectPath, 'media-index.json');
          try {
            const mediaIndex = JSON.parse(await fs_promises.readFile(mediaIndexPath, 'utf-8'));
            
            // Remove from activeMediaIds
            mediaIndex.activeMediaIds = mediaIndex.activeMediaIds.filter((id: string) => id !== mediaId);
            
            // Extract number from mediaId (e.g., "media-3" -> 3)
            const mediaNumber = parseInt(mediaId.replace('media-', ''));
            if (!isNaN(mediaNumber)) {
              // Add this number to availableNumbers for reuse
              if (!mediaIndex.availableNumbers.includes(mediaNumber)) {
                mediaIndex.availableNumbers.push(mediaNumber);
                mediaIndex.availableNumbers.sort((a: number, b: number) => a - b);
              }
            }
            
            mediaIndex.lastUpdated = new Date().toISOString();
            await fs_promises.writeFile(mediaIndexPath, JSON.stringify(mediaIndex, null, 2));
            console.log(`[MediaDelete] Updated media index after removing ${mediaId}`);
          } catch (error) {
            console.error('[MediaDelete] Failed to update media index:', error);
            // Continue even if index update fails
          }
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
    
    // CRITICAL: Validate mediaId to prevent cross-contamination
    if (!mediaId || !projectId) {
      console.error('[Save] Missing mediaId or projectId, rejecting save to prevent corruption');
      return res.status(400).json({ error: 'Missing mediaId or projectId' });
    }
    
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

// Restore archived transcriptions to existing project
router.post('/:projectId/restore-transcriptions', verifyUser, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { selectedTranscriptionIds } = req.body;
    const userId = (req as any).user?.id || 'unknown';
    
    if (!selectedTranscriptionIds || !Array.isArray(selectedTranscriptionIds) || selectedTranscriptionIds.length === 0) {
      return res.status(400).json({ error: 'No transcriptions selected' });
    }
    
    console.log(`[restore-transcriptions] Restoring ${selectedTranscriptionIds.length} transcriptions to project ${projectId}`);
    
    // Get project path
    const projectPath = path.join(process.cwd(), 'user_data', 'users', userId, 'projects', projectId);
    const orphanedPath = path.join(process.cwd(), 'user_data', 'users', userId, 'orphaned');
    
    // Check if project exists
    if (!await fs_promises.access(projectPath).then(() => true).catch(() => false)) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Load project metadata
    const projectMetaPath = path.join(projectPath, 'project.json');
    const projectData = JSON.parse(await fs_promises.readFile(projectMetaPath, 'utf-8'));
    
    let restoredCount = 0;
    const errors: string[] = [];
    
    // Get the orphaned index to find archive paths
    const orphanedIndexPath = path.join(orphanedPath, 'orphaned-index.json');
    let orphanedIndex: any = {};
    try {
      orphanedIndex = JSON.parse(await fs_promises.readFile(orphanedIndexPath, 'utf-8'));
    } catch (e) {
      console.log('[restore-transcriptions] Could not read orphaned index');
    }
    
    // Process each selected transcription
    for (const transcriptionId of selectedTranscriptionIds) {
      try {
        // Find the transcription in the index
        let transcriptionInfo: any = null;
        for (const [mediaName, transcriptions] of Object.entries(orphanedIndex.transcriptions || {})) {
          const found = (transcriptions as any[]).find(t => t.transcriptionId === transcriptionId);
          if (found) {
            transcriptionInfo = found;
            break;
          }
        }
        
        if (!transcriptionInfo) {
          errors.push(`Transcription not found in index: ${transcriptionId}`);
          continue;
        }
        
        // Build the actual path to the archived transcription data
        // The archivedPath is relative to the user folder, so we need to handle it properly
        let archivePath: string;
        if (transcriptionInfo.originalProjectFolder) {
          // Use the folder name stored in the index
          archivePath = path.join(orphanedPath, transcriptionInfo.originalProjectFolder, 'transcription', 'data.json');
        } else {
          // Fallback to parsing the archivedPath
          const pathParts = transcriptionInfo.archivedPath.split(/[\\\/]/);
          const folderName = pathParts.find((p: string) => p.startsWith('orphan_') || p.startsWith('orphaned_'));
          if (folderName) {
            archivePath = path.join(orphanedPath, folderName, 'transcription', 'data.json');
          } else {
            archivePath = path.join(orphanedPath, transcriptionInfo.archivedPath, 'data.json');
          }
        }
        
        // Check if archive file exists
        if (!await fs_promises.access(archivePath).then(() => true).catch(() => false)) {
          errors.push(`Archive file not found: ${archivePath}`);
          continue;
        }
        
        // Read the archived transcription
        const archivedData = JSON.parse(await fs_promises.readFile(archivePath, 'utf-8'));
        
        // Find matching media in current project by name
        const originalMediaName = transcriptionInfo.originalMediaName;
        let targetMediaId: string | null = null;
        
        // Check project metadata for media files
        if (projectData.mediaFiles && Array.isArray(projectData.mediaFiles)) {
          // Try to find media with matching name
          for (const mediaId of projectData.mediaFiles) {
            try {
              const mediaMetadataPath = path.join(projectPath, 'media', mediaId, 'metadata.json');
              const mediaMetadata = JSON.parse(await fs_promises.readFile(mediaMetadataPath, 'utf-8'));
              if (mediaMetadata.originalName === originalMediaName) {
                targetMediaId = mediaId;
                break;
              }
            } catch (e) {
              // Continue if metadata not found
            }
          }
          
          // If no match found, use the first media file
          if (!targetMediaId && projectData.mediaFiles.length > 0) {
            targetMediaId = projectData.mediaFiles[0];
          }
        }
        
        if (!targetMediaId) {
          errors.push(`No media file to restore transcription for: ${originalMediaName}`);
          continue;
        }
        
        // Create transcription file path - should be transcription.json in media folder
        const transcriptionPath = path.join(projectPath, 'media', targetMediaId, 'transcription.json');
        
        // Restore the transcription data (only the blocks and metadata, not orphanedFrom)
        const restoredData = {
          blocks: archivedData.blocks || [],
          version: '1.0.0',
          lastSaved: new Date().toISOString()
        };
        await fs_promises.writeFile(transcriptionPath, JSON.stringify(restoredData, null, 2));
        
        // Also restore speakers if present
        if (archivedData.speakers) {
          const speakersPath = path.join(projectPath, 'media', targetMediaId, 'speakers.json');
          await fs_promises.writeFile(speakersPath, JSON.stringify(archivedData.speakers, null, 2));
        }
        
        // Delete the orphaned folder after successful restoration
        const orphanedFolderPath = path.join(orphanedPath, transcriptionInfo.originalProjectFolder || '');
        if (orphanedFolderPath && transcriptionInfo.originalProjectFolder) {
          try {
            await fs_promises.rm(orphanedFolderPath, { recursive: true, force: true });
            console.log(`[restore-transcriptions] Deleted orphaned folder: ${transcriptionInfo.originalProjectFolder}`);
          } catch (error) {
            console.error(`[restore-transcriptions] Failed to delete orphaned folder: ${error}`);
          }
        }
        
        // Remove the transcription from the orphaned index
        if (orphanedIndex.transcriptions) {
          for (const [mediaName, transcriptions] of Object.entries(orphanedIndex.transcriptions)) {
            const index = (transcriptions as any[]).findIndex(t => t.transcriptionId === transcriptionId);
            if (index >= 0) {
              (transcriptions as any[]).splice(index, 1);
              if ((transcriptions as any[]).length === 0) {
                delete orphanedIndex.transcriptions[mediaName];
              }
              break;
            }
          }
          orphanedIndex.lastUpdated = new Date().toISOString();
          await fs_promises.writeFile(orphanedIndexPath, JSON.stringify(orphanedIndex, null, 2));
        }
        
        restoredCount++;
        console.log(`[restore-transcriptions] Restored transcription for media ${targetMediaId} from ${transcriptionInfo.archivedPath}`);
        
      } catch (error: any) {
        console.error(`[restore-transcriptions] Error restoring ${transcriptionId}:`, error);
        errors.push(`Failed to restore ${transcriptionId}: ${error.message}`);
      }
    }
    
    // Update project metadata
    projectData.lastModified = new Date().toISOString();
    await fs_promises.writeFile(projectMetaPath, JSON.stringify(projectData, null, 2));
    
    // Return updated project
    res.json({
      success: true,
      project: projectData,
      restoredCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `שוחזרו ${restoredCount} תמלולים מתוך ${selectedTranscriptionIds.length}`
    });
    
  } catch (error: any) {
    console.error('[restore-transcriptions] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to restore transcriptions' });
  }
});

export default router;