import { Router } from 'express';
import authRoutes from './auth/routes';
import devRoutes from './dev/routes';
import licensesRoutes from './licenses/routes';
import transcriptionRoutes from './transcription/routes';
import projectRoutes from './projects/routes';
import adminShortcutsRoutes from './admin/shortcuts/routes';
import templateRoutes from '../routes/templateRoutes';
import { initWaveformRoutes } from '../routes/waveformRoutes';
import { db } from '../db/connection';

const router = Router();

// Production API routes

// Authentication endpoints
router.use('/auth', authRoutes);

// License management endpoints
router.use('/licenses', licensesRoutes);

// Template endpoints
router.use('/template', templateRoutes);

// Public shortcuts endpoint (for testing without auth)
router.get('/transcription/shortcuts/public', async (req, res) => {
  try {
    const { shortcutService } = require('../services/shortcutService');
    const systemShortcuts = await shortcutService.getSystemShortcuts();
    const categories = await shortcutService.getCategories();
    
    // Convert to frontend format
    const shortcuts: Array<[string, any]> = [];
    systemShortcuts.forEach((shortcut: any) => {
      shortcuts.push([shortcut.shortcut, {
        expansion: shortcut.expansion,
        source: 'system',
        category: shortcut.category_name || shortcut.category,
        description: shortcut.description
      }]);
    });
    
    res.json({
      shortcuts,
      quota: { max: 100, used: 0 },
      categories
    });
  } catch (error) {
    console.error('Error fetching public shortcuts:', error);
    res.status(500).json({ error: 'Failed to fetch shortcuts' });
  }
});

// Transcription endpoints (includes shortcuts)
router.use('/transcription', transcriptionRoutes);

// Project management endpoints
router.use('/projects', projectRoutes);

// Admin endpoints for managing system shortcuts (auth handled in the route)
router.use('/admin/shortcuts', adminShortcutsRoutes);

// Waveform endpoints
router.use('/waveform', initWaveformRoutes(db));

// Development endpoints (will be protected in the route file)
router.use('/dev', devRoutes);

// Health check for API
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is working',
    timestamp: new Date().toISOString()
  });
});


router.get('/crm/dashboard', (req, res) => {
  res.json({
    success: true,
    message: 'CRM dashboard endpoint - Stage 5 in progress'
  });
});

export default router;