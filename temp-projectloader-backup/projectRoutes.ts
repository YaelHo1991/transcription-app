/**
 * Project Routes - API endpoints for project upload and management
 * Connects frontend ProjectLoader with backend projectUploadService
 */

import { Router, Request, Response } from 'express';
import { projectUploadService } from '../services/projectUploadService';
import { authenticateToken } from '../middleware/auth.middleware';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Create project from folder upload
 */
router.post('/projects/create-from-folder', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { folderName, mediaFiles, computerId, computerName } = req.body;

    if (!folderName || !mediaFiles || !computerId || !computerName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const project = await projectUploadService.createProjectFromFolder({
      userId,
      folderName,
      mediaFiles,
      computerId,
      computerName
    });

    res.json({
      success: true,
      project
    });

  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create project'
    });
  }
});

/**
 * Get user's projects
 */
router.get('/projects/list', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const projects = await projectUploadService.getUserProjects(userId);

    res.json({
      success: true,
      projects
    });

  } catch (error) {
    console.error('List projects error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list projects'
    });
  }
});

/**
 * Get specific project
 */
router.get('/projects/:projectId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { projectId } = req.params;

    const project = await projectUploadService.getProjectById(userId, projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    res.json({
      success: true,
      project
    });

  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get project'
    });
  }
});

/**
 * Delete project
 */
router.delete('/projects/:projectId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { projectId } = req.params;
    const { deleteTranscriptions } = req.query;

    const project = await projectUploadService.getProjectById(userId, projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    await projectUploadService.deleteProject(
      userId, 
      projectId, 
      deleteTranscriptions === 'true'
    );

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });

  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project'
    });
  }
});

/**
 * Update media path (for multi-computer support)
 */
router.put('/projects/media/:mediaId/path', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { mediaId } = req.params;
    const { projectId, computerId, computerName, path } = req.body;

    if (!projectId || !computerId || !computerName || !path) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    await projectUploadService.updateMediaPath({
      userId,
      projectId,
      mediaId,
      computerId,
      computerName,
      path
    });

    res.json({
      success: true,
      message: 'Media path updated successfully'
    });

  } catch (error) {
    console.error('Update media path error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update media path'
    });
  }
});

/**
 * Upload media to server (within quota)
 */
router.post('/projects/:projectId/media/:mediaId/upload', 
  authenticateToken, 
  upload.single('media'),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { projectId, mediaId } = req.params;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file provided'
        });
      }

      await projectUploadService.uploadMediaToServer({
        userId,
        projectId,
        mediaId,
        file: req.file.buffer,
        filename: req.file.originalname
      });

      res.json({
        success: true,
        message: 'Media uploaded to server successfully'
      });

    } catch (error) {
      console.error('Upload media error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload media'
      });
    }
});

/**
 * Get user storage quota
 */
router.get('/users/quota', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const quota = await projectUploadService.getUserQuota(userId);

    res.json({
      success: true,
      quota
    });

  } catch (error) {
    console.error('Get quota error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get storage quota'
    });
  }
});

/**
 * Load transcription data for a project
 */
router.get('/transcription/:projectId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { projectId } = req.params;

    // For now, return empty structure
    // This will be connected to actual transcription service later
    res.json({
      success: true,
      content: [],
      speakers: [],
      remarks: []
    });

  } catch (error) {
    console.error('Load transcription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load transcription data'
    });
  }
});

export default router;