import { Router, Request, Response } from 'express';
import { shortcutService } from '../../../services/shortcutService';
import { AddShortcutRequest, UpdateShortcutRequest } from '../../../models/shortcut.model';

const router = Router();

// Authentication is already handled by parent router in transcription/routes.ts

/**
 * GET /api/transcription/shortcuts
 * Get all shortcuts for the authenticated user (system + personal)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const shortcuts = await shortcutService.getUserShortcuts(userId);
    res.json(shortcuts);
  } catch (error: any) {
    console.error('Error fetching shortcuts:', error);
    res.status(500).json({
      error: 'Failed to fetch shortcuts',
      message: error.message
    });
  }
});

/**
 * GET /api/transcription/shortcuts/search
 * Search shortcuts by query
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const query = req.query.q as string;
    
    if (!query) {
      return res.status(400).json({
        error: 'Search query is required'
      });
    }
    
    const results = await shortcutService.searchShortcuts(userId, query);
    res.json(results);
  } catch (error: any) {
    console.error('Error searching shortcuts:', error);
    res.status(500).json({
      error: 'Failed to search shortcuts',
      message: error.message
    });
  }
});

/**
 * GET /api/transcription/shortcuts/quota
 * Get user's shortcut quota information
 */
router.get('/quota', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const quota = await shortcutService.getUserQuota(userId);
    res.json(quota);
  } catch (error: any) {
    console.error('Error fetching quota:', error);
    res.status(500).json({
      error: 'Failed to fetch quota',
      message: error.message
    });
  }
});

/**
 * GET /api/transcription/shortcuts/system
 * Get system shortcuts only (for reference)
 */
router.get('/system', async (req: Request, res: Response) => {
  try {
    const shortcuts = await shortcutService.getSystemShortcuts();
    res.json(shortcuts);
  } catch (error: any) {
    console.error('Error fetching system shortcuts:', error);
    res.status(500).json({
      error: 'Failed to fetch system shortcuts',
      message: error.message
    });
  }
});

/**
 * POST /api/transcription/shortcuts
 * Add a new personal shortcut
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const request: AddShortcutRequest = req.body;
    
    // Validate request
    if (!request.shortcut || !request.expansion) {
      return res.status(400).json({
        error: 'Both shortcut and expansion are required'
      });
    }
    
    // Validate shortcut length
    if (request.shortcut.length > 50) {
      return res.status(400).json({
        error: 'Shortcut must be 50 characters or less'
      });
    }
    
    const newShortcut = await shortcutService.addUserShortcut(userId, request);
    res.status(201).json(newShortcut);
  } catch (error: any) {
    console.error('Error adding shortcut:', error);
    
    if (error.code === 'QUOTA_EXCEEDED') {
      return res.status(403).json({
        error: error.message
      });
    }
    
    if (error.code === 'DUPLICATE_SHORTCUT') {
      return res.status(409).json({
        error: error.message
      });
    }
    
    res.status(500).json({
      error: 'Failed to add shortcut',
      message: error.message
    });
  }
});

/**
 * PUT /api/transcription/shortcuts/:id
 * Update a personal shortcut
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const shortcutId = req.params.id;
    const request: UpdateShortcutRequest = req.body;
    
    const updatedShortcut = await shortcutService.updateUserShortcut(
      userId,
      shortcutId,
      request
    );
    
    res.json(updatedShortcut);
  } catch (error: any) {
    console.error('Error updating shortcut:', error);
    
    if (error.code === 'NOT_FOUND') {
      return res.status(404).json({
        error: error.message
      });
    }
    
    res.status(500).json({
      error: 'Failed to update shortcut',
      message: error.message
    });
  }
});

/**
 * DELETE /api/transcription/shortcuts/:id
 * Delete a personal shortcut by ID or shortcut text
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const shortcutIdOrText = req.params.id;

    // Try to delete by ID first, if it looks like a UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shortcutIdOrText);

    if (isUuid) {
      await shortcutService.deleteUserShortcut(userId, shortcutIdOrText);
    } else {
      // Delete by shortcut text
      await shortcutService.deleteUserShortcutByText(userId, decodeURIComponent(shortcutIdOrText));
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting shortcut:', error);

    if (error.code === 'NOT_FOUND') {
      return res.status(404).json({
        error: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to delete shortcut',
      message: error.message
    });
  }
});

/**
 * POST /api/transcription/shortcuts/usage
 * Log shortcut usage (for analytics)
 */
router.post('/usage', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { shortcut, expansion, source } = req.body;
    
    await shortcutService.logShortcutUsage(userId, shortcut, expansion, source);
    res.status(204).send();
  } catch (error: any) {
    // Don't fail on logging errors
    console.error('Error logging usage:', error);
    res.status(204).send();
  }
});

export default router;