import { Router, Request, Response } from 'express';
import { MediaModel } from '../../../models/media.model';
import { authenticateToken } from '../../../middleware/auth.middleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const userId = (req as any).user.id;
    const uploadDir = path.join(__dirname, '..', '..', '..', '..', 'user_data', `user_${userId}`, 'uploads');
    
    // Ensure directory exists
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max
  },
  fileFilter: (req, file, cb) => {
    // Accept audio and video files
    const allowedMimes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm',
      'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio and video files are allowed.'));
    }
  }
});

// Upload a media file
router.post('/upload', authenticateToken, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = (req as any).user.id;
    const { projectId } = req.body;

    const media = await MediaModel.create(
      userId,
      req.file.originalname,
      {
        projectId,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        metadata: {
          originalName: req.file.originalname,
          encoding: req.file.encoding
        }
      }
    );

    res.json({ success: true, media });
  } catch (error) {
    console.error('Error uploading media:', error);
    res.status(500).json({ error: 'Failed to upload media' });
  }
});

// Link external media URL
router.post('/link-external', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { url, fileName, projectId, durationSeconds } = req.body;
    const userId = (req as any).user.id;

    if (!url || !fileName) {
      return res.status(400).json({ error: 'URL and filename are required' });
    }

    const media = await MediaModel.create(
      userId,
      fileName,
      {
        projectId,
        externalUrl: url,
        durationSeconds,
        metadata: {
          source: 'external',
          originalUrl: url
        }
      }
    );

    res.json({ success: true, media });
  } catch (error) {
    console.error('Error linking external media:', error);
    res.status(500).json({ error: 'Failed to link external media' });
  }
});

// Get all media for a user
router.get('/user/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).user.id;

    // Users can only access their own media
    if (userId !== requestingUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const media = await MediaModel.findByUserId(userId);
    res.json({ success: true, media });
  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

// Get media for a project
router.get('/project/:projectId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = (req as any).user.id;

    const media = await MediaModel.findByProjectId(projectId);
    
    // Filter to only user's media
    const userMedia = media.filter(m => m.user_id === userId);
    
    res.json({ success: true, media: userMedia });
  } catch (error) {
    console.error('Error fetching project media:', error);
    res.status(500).json({ error: 'Failed to fetch project media' });
  }
});

// Get a specific media file with its transcriptions
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const media = await MediaModel.findById(id);
    
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    // Verify ownership
    if (media.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get linked transcriptions
    const transcriptions = await MediaModel.getTranscriptions(id);

    res.json({ 
      success: true, 
      media,
      transcriptions 
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

// Update media metadata
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const updates = req.body;

    // Verify ownership
    const existing = await MediaModel.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Media not found' });
    }
    if (existing.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const media = await MediaModel.update(id, updates);
    res.json({ success: true, media });
  } catch (error) {
    console.error('Error updating media:', error);
    res.status(500).json({ error: 'Failed to update media' });
  }
});

// Delete a media file
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    // Verify ownership
    const media = await MediaModel.findById(id);
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }
    if (media.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete physical file if exists
    if (media.file_path) {
      try {
        await fs.unlink(media.file_path);
      } catch (error) {
        console.error('Error deleting physical file:', error);
      }
    }

    const success = await MediaModel.delete(id);
    res.json({ success });
  } catch (error) {
    console.error('Error deleting media:', error);
    res.status(500).json({ error: 'Failed to delete media' });
  }
});

export default router;