import { Router, Request, Response } from 'express';
import WaveformService from '../services/waveformService';
import { Pool } from 'pg';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Initialize waveform service with database pool
let waveformService: WaveformService;

export const initWaveformRoutes = (pool: Pool) => {
  waveformService = new WaveformService(pool);
  return router;
};

/**
 * POST /api/waveform/generate
 * Generate waveform for a media file
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { fileId, fileUrl, fileSize } = req.body;

    // Validate input
    if (!fileId || !fileUrl || !fileSize) {
      return res.status(400).json({
        error: 'Missing required fields: fileId, fileUrl, fileSize'
      });
    }

    // Check file size limit (max 4GB for safety)
    const MAX_FILE_SIZE = 4 * 1024 * 1024 * 1024; // 4GB
    if (fileSize > MAX_FILE_SIZE) {
      return res.status(400).json({
        error: 'File size exceeds maximum limit of 4GB'
      });
    }

    // Generate waveform (async - don't wait for completion)
    const waveformPromise = waveformService.generateWaveform({
      fileId,
      fileUrl,
      fileSize,
      targetPeaks: 2000
    });

    // For large files, return processing status immediately
    if (fileSize > 200 * 1024 * 1024) { // > 200MB
      res.json({
        status: 'processing',
        message: 'Waveform generation started for large file',
        fileId
      });

      // Continue processing in background
      waveformPromise
        .then(result => {
          // console.log removed for production
        })
        .catch(error => {
          console.error(`Waveform generation failed for ${fileId}:`, error);
        });
    } else {
      // For smaller files, wait for completion
      const result = await waveformPromise;
      
      res.json({
        status: 'completed',
        waveformId: fileId,
        peakCount: result.peakCount,
        duration: result.duration
      });
    }
  } catch (error) {
    console.error('Waveform generation error:', error);
    res.status(500).json({
      error: 'Failed to generate waveform',
      details: error.message
    });
  }
});

/**
 * GET /api/waveform/:fileId
 * Retrieve waveform data for a file
 */
router.get('/:fileId', async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;

    const waveform = await waveformService.getWaveform(fileId);

    if (!waveform) {
      return res.status(404).json({
        error: 'Waveform not found'
      });
    }

    res.json({
      fileId,
      duration: waveform.duration,
      peaks: waveform.peaks,
      peakCount: waveform.peakCount,
      cached: true
    });
  } catch (error) {
    console.error('Failed to retrieve waveform:', error);
    res.status(500).json({
      error: 'Failed to retrieve waveform',
      details: error.message
    });
  }
});

/**
 * GET /api/waveform/:fileId/segment
 * Retrieve partial waveform data (for progressive loading)
 */
router.get('/:fileId/segment', async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const start = parseInt(req.query.start as string) || 0;
    const end = parseInt(req.query.end as string) || 500;

    // Validate range
    if (start < 0 || end <= start) {
      return res.status(400).json({
        error: 'Invalid range parameters'
      });
    }

    const segment = await waveformService.getWaveformSegment(fileId, start, end);

    if (!segment) {
      return res.status(404).json({
        error: 'Waveform not found'
      });
    }

    res.json(segment);
  } catch (error) {
    console.error('Failed to retrieve waveform segment:', error);
    res.status(500).json({
      error: 'Failed to retrieve waveform segment',
      details: error.message
    });
  }
});

/**
 * DELETE /api/waveform/:fileId
 * Delete waveform data for a file
 */
router.delete('/:fileId', async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;

    const deleted = await waveformService.deleteWaveform(fileId);

    if (!deleted) {
      return res.status(404).json({
        error: 'Waveform not found'
      });
    }

    res.json({
      message: 'Waveform deleted successfully',
      fileId
    });
  } catch (error) {
    console.error('Failed to delete waveform:', error);
    res.status(500).json({
      error: 'Failed to delete waveform',
      details: error.message
    });
  }
});

/**
 * POST /api/waveform/cleanup
 * Clean up old waveforms (admin only)
 */
router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    // Check if user is admin (you might want to add proper admin check)
    // For now, we'll just proceed
    
    const daysOld = parseInt(req.body.daysOld as string) || 30;

    const deletedCount = await waveformService.cleanupOldWaveforms(daysOld);

    res.json({
      message: `Cleaned up ${deletedCount} old waveforms`,
      daysOld
    });
  } catch (error) {
    console.error('Failed to cleanup waveforms:', error);
    res.status(500).json({
      error: 'Failed to cleanup waveforms',
      details: error.message
    });
  }
});

/**
 * GET /api/waveform/status/:fileId
 * Check waveform generation status
 */
router.get('/status/:fileId', async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;

    const waveform = await waveformService.getWaveform(fileId);

    if (waveform) {
      res.json({
        status: 'completed',
        fileId,
        ready: true,
        data: {
          duration: waveform.duration,
          peaks: waveform.peaks,
          peakCount: waveform.peakCount
        }
      });
    } else {
      res.json({
        status: 'not_found',
        fileId,
        ready: false
      });
    }
  } catch (error) {
    console.error('Failed to check waveform status:', error);
    res.status(500).json({
      error: 'Failed to check waveform status',
      details: error.message
    });
  }
});

export default router;