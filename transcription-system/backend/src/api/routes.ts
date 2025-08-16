import { Router } from 'express';
import authRoutes from './auth/routes';
import devRoutes from './dev/routes';
import licensesRoutes from './licenses/routes';
import transcriptionRoutes from './transcription/routes';
import { initWaveformRoutes } from '../routes/waveformRoutes';
import { db } from '../db/connection';

const router = Router();

// Production API routes

// Authentication endpoints
router.use('/auth', authRoutes);

// License management endpoints
router.use('/licenses', licensesRoutes);

// Transcription endpoints (includes shortcuts)
router.use('/transcription', transcriptionRoutes);

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