import { Router, Request, Response } from 'express';
import { TranscriptionModel } from '../../../models/transcription.model';
import { BackupModel } from '../../../models/backup.model';
import { authMiddleware } from '../../../middleware/auth.middleware';

const router = Router();

// Create a new transcription
router.post('/create', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { title, projectId, mediaIds } = req.body;
    const userId = (req as any).user.id;

    if (!title) {
      return res.status(400).json({ error: 'Transcription title is required' });
    }

    // Create the transcription
    const transcription = await TranscriptionModel.create(userId, title, projectId);

    // Link media files if provided
    if (mediaIds && Array.isArray(mediaIds)) {
      for (let i = 0; i < mediaIds.length; i++) {
        await TranscriptionModel.linkMedia(
          transcription.id, 
          mediaIds[i], 
          i === 0 // First media is primary
        );
      }
    }

    res.json({ success: true, transcription });
  } catch (error) {
    console.error('Error creating transcription:', error);
    res.status(500).json({ error: 'Failed to create transcription' });
  }
});

// Get all transcriptions for a user
router.get('/user/:userId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).user.id;

    // Users can only access their own transcriptions
    if (userId !== requestingUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const transcriptions = await TranscriptionModel.findByUserId(userId);
    res.json({ success: true, transcriptions });
  } catch (error) {
    console.error('Error fetching transcriptions:', error);
    res.status(500).json({ error: 'Failed to fetch transcriptions' });
  }
});

// Get transcriptions for a project
router.get('/project/:projectId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = (req as any).user.id;

    const transcriptions = await TranscriptionModel.findByProjectId(projectId);
    
    // Filter to only user's transcriptions
    const userTranscriptions = transcriptions.filter(t => t.user_id === userId);
    
    res.json({ success: true, transcriptions: userTranscriptions });
  } catch (error) {
    console.error('Error fetching project transcriptions:', error);
    res.status(500).json({ error: 'Failed to fetch project transcriptions' });
  }
});

// Get a specific transcription with media
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const transcription = await TranscriptionModel.findById(id);
    
    if (!transcription) {
      return res.status(404).json({ error: 'Transcription not found' });
    }

    // Verify ownership
    if (transcription.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get linked media
    const media = await TranscriptionModel.getLinkedMedia(id);

    res.json({ 
      success: true, 
      transcription,
      media 
    });
  } catch (error) {
    console.error('Error fetching transcription:', error);
    res.status(500).json({ error: 'Failed to fetch transcription' });
  }
});

// Update a transcription
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const updates = req.body;

    // Verify ownership
    const existing = await TranscriptionModel.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Transcription not found' });
    }
    if (existing.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const transcription = await TranscriptionModel.update(id, updates);
    res.json({ success: true, transcription });
  } catch (error) {
    console.error('Error updating transcription:', error);
    res.status(500).json({ error: 'Failed to update transcription' });
  }
});

// Link media to transcription
router.post('/:id/link-media', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { mediaId, isPrimary } = req.body;
    const userId = (req as any).user.id;

    // Verify ownership
    const transcription = await TranscriptionModel.findById(id);
    if (!transcription) {
      return res.status(404).json({ error: 'Transcription not found' });
    }
    if (transcription.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const link = await TranscriptionModel.linkMedia(id, mediaId, isPrimary);
    res.json({ success: true, link });
  } catch (error) {
    console.error('Error linking media:', error);
    res.status(500).json({ error: 'Failed to link media' });
  }
});

// Unlink media from transcription
router.delete('/:id/unlink-media/:mediaId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id, mediaId } = req.params;
    const userId = (req as any).user.id;

    // Verify ownership
    const transcription = await TranscriptionModel.findById(id);
    if (!transcription) {
      return res.status(404).json({ error: 'Transcription not found' });
    }
    if (transcription.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const success = await TranscriptionModel.unlinkMedia(id, mediaId);
    res.json({ success });
  } catch (error) {
    console.error('Error unlinking media:', error);
    res.status(500).json({ error: 'Failed to unlink media' });
  }
});

// Delete a transcription (soft delete)
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    // Verify ownership
    const existing = await TranscriptionModel.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Transcription not found' });
    }
    if (existing.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const success = await TranscriptionModel.delete(id);
    res.json({ success });
  } catch (error) {
    console.error('Error deleting transcription:', error);
    res.status(500).json({ error: 'Failed to delete transcription' });
  }
});

export default router;