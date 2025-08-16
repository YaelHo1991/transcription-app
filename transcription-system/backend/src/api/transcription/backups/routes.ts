import { Router, Request, Response } from 'express';
import { BackupModel } from '../../../models/backup.model';
import { TranscriptionModel } from '../../../models/transcription.model';
import { ProjectModel } from '../../../models/project.model';
import { BackupService, BackupContent } from '../../../services/backupService';
import { authMiddleware } from '../../../middleware/auth.middleware';

const router = Router();

// Trigger a backup for a transcription
router.post('/trigger/:transcriptionId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { transcriptionId } = req.params;
    const { blocks, speakers } = req.body;
    const userId = (req as any).user.id;

    // Verify ownership
    const transcription = await TranscriptionModel.findById(transcriptionId);
    if (!transcription) {
      return res.status(404).json({ error: 'Transcription not found' });
    }
    if (transcription.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get project info if exists
    let projectName: string | undefined;
    if (transcription.project_id) {
      const project = await ProjectModel.findById(transcription.project_id);
      projectName = project?.name;
    }

    // Get linked media
    const media = await TranscriptionModel.getLinkedMedia(transcriptionId);
    
    // Calculate metadata
    const totalWords = blocks.reduce((sum: number, block: any) => {
      return sum + (block.text?.split(/\s+/).filter((w: string) => w.length > 0).length || 0);
    }, 0);

    // Prepare backup content
    const backupContent: BackupContent = {
      projectName,
      transcriptionTitle: transcription.title,
      date: new Date(),
      version: transcription.current_version + 1,
      mediaFiles: media.map(m => ({
        name: m.file_name,
        type: m.external_url ? 'external' : 'local',
        url: m.external_url
      })),
      speakers: speakers || [],
      blocks: blocks || [],
      metadata: {
        totalWords,
        totalBlocks: blocks?.length || 0,
        totalSpeakers: speakers?.length || 0
      }
    };

    // Create the backup
    const backupPath = await BackupService.createBackup(
      userId,
      transcriptionId,
      backupContent,
      projectName,
      media[0]?.file_name // Use primary media name if exists
    );

    res.json({ 
      success: true, 
      backupPath,
      version: backupContent.version 
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// Get backup history for a transcription
router.get('/history/:transcriptionId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { transcriptionId } = req.params;
    const { limit = 50 } = req.query;
    const userId = (req as any).user.id;

    // Verify ownership
    const transcription = await TranscriptionModel.findById(transcriptionId);
    if (!transcription) {
      return res.status(404).json({ error: 'Transcription not found' });
    }
    if (transcription.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const backups = await BackupModel.findByTranscriptionId(
      transcriptionId, 
      parseInt(limit as string)
    );
    
    res.json({ success: true, backups });
  } catch (error) {
    console.error('Error fetching backup history:', error);
    res.status(500).json({ error: 'Failed to fetch backup history' });
  }
});

// Preview a backup
router.get('/preview/:backupId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { backupId } = req.params;
    const userId = (req as any).user.id;

    // Get backup info
    const backup = await BackupModel.findById(backupId);
    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    // Verify ownership through transcription
    const transcription = await TranscriptionModel.findById(backup.transcription_id);
    if (!transcription) {
      return res.status(404).json({ error: 'Transcription not found' });
    }
    if (transcription.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Read backup content
    const content = await BackupService.readBackup(backup.file_path);
    const parsedContent = BackupService.parseBackupContent(content);

    res.json({ 
      success: true, 
      backup,
      content: parsedContent 
    });
  } catch (error) {
    console.error('Error previewing backup:', error);
    res.status(500).json({ error: 'Failed to preview backup' });
  }
});

// Restore from a backup
router.post('/restore/:backupId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { backupId } = req.params;
    const userId = (req as any).user.id;

    // Get backup info
    const backup = await BackupModel.findById(backupId);
    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    // Verify ownership through transcription
    const transcription = await TranscriptionModel.findById(backup.transcription_id);
    if (!transcription) {
      return res.status(404).json({ error: 'Transcription not found' });
    }
    if (transcription.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Restore the backup content
    const restoredContent = await BackupService.restoreBackup(backupId);
    
    if (!restoredContent) {
      return res.status(500).json({ error: 'Failed to restore backup' });
    }

    // Update transcription version
    await TranscriptionModel.update(backup.transcription_id, {
      current_version: backup.version_number
    });

    res.json({ 
      success: true, 
      content: restoredContent,
      message: `Restored to version ${backup.version_number}` 
    });
  } catch (error) {
    console.error('Error restoring backup:', error);
    res.status(500).json({ error: 'Failed to restore backup' });
  }
});

// Cleanup old backups
router.delete('/cleanup/:transcriptionId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { transcriptionId } = req.params;
    const { keepCount = 100 } = req.query;
    const userId = (req as any).user.id;

    // Verify ownership
    const transcription = await TranscriptionModel.findById(transcriptionId);
    if (!transcription) {
      return res.status(404).json({ error: 'Transcription not found' });
    }
    if (transcription.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await BackupService.cleanupOldBackups(
      transcriptionId, 
      parseInt(keepCount as string)
    );

    res.json({ 
      success: true, 
      message: `Cleaned up old backups, keeping last ${keepCount}` 
    });
  } catch (error) {
    console.error('Error cleaning up backups:', error);
    res.status(500).json({ error: 'Failed to cleanup backups' });
  }
});

export default router;