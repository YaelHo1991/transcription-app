import { Router } from 'express';
import { authenticateToken, requirePermission, requireAnyPermission, AuthRequest } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../middleware/error.middleware';
import shortcutsRouter from './shortcuts/routes';
import projectsRouter from './projects/routes';
import transcriptionsRouter from './transcriptions/routes';
import backupsRouter from './backups/routes';
import mediaRouter from './media/routes';
import sessionsRouter from './sessions/routes';

const router = Router();

// Mount sessions routes WITHOUT authentication (they handle their own auth)
router.use('/sessions', sessionsRouter);

// All other transcription routes require authentication
router.use(authenticateToken);

// Mount sub-routes
router.use('/shortcuts', shortcutsRouter);
router.use('/projects', projectsRouter);
router.use('/transcriptions', transcriptionsRouter);
router.use('/backups', backupsRouter);
router.use('/media', mediaRouter);

// Mock transcription projects data
const mockProjects = [
  {
    id: '1',
    title: 'ישיבת דירקטוריון Q3 2024',
    audioFile: 'board-meeting-q3.mp3',
    status: 'transcribing',
    assignedTo: 'user1',
    priority: 'high',
    createdAt: new Date('2024-08-01'),
    dueDate: new Date('2024-08-15'),
    duration: 120, // minutes
    transcriptionText: 'בישיבה השתתפו כל חברי הדירקטוריון...',
    completionPercentage: 65,
    language: 'hebrew',
    clientName: 'חברת טכנולוגיה ABC'
  },
  {
    id: '2',
    title: 'ראיון עבודה - מהנדס תוכנה',
    audioFile: 'interview-software-eng.mp3',
    status: 'pending',
    assignedTo: null,
    priority: 'medium',
    createdAt: new Date('2024-08-05'),
    dueDate: new Date('2024-08-20'),
    duration: 45,
    transcriptionText: '',
    completionPercentage: 0,
    language: 'hebrew',
    clientName: 'HR Solutions Ltd'
  },
  {
    id: '3',
    title: 'הרצאה אקדמית - בינה מלאכותית',
    audioFile: 'ai-lecture.mp3',
    status: 'completed',
    assignedTo: 'demo',
    priority: 'low',
    createdAt: new Date('2024-07-20'),
    dueDate: new Date('2024-07-30'),
    duration: 90,
    transcriptionText: 'ברוכים הבאים להרצאה על בינה מלאכותית...',
    completionPercentage: 100,
    language: 'hebrew',
    clientName: 'האוניברסיטה העברית'
  }
];

// Mock export formats
const exportFormats = [
  { format: 'docx', name: 'Microsoft Word', description: 'מסמך Word עם עיצוב' },
  { format: 'pdf', name: 'PDF', description: 'קובץ PDF להדפסה' },
  { format: 'txt', name: 'Text', description: 'טקסט רגיל ללא עיצוב' },
  { format: 'srt', name: 'SRT', description: 'קובץ כתוביות לוידאו' },
  { format: 'vtt', name: 'WebVTT', description: 'כתוביות לרשת' }
];

// TRANSCRIPTION WORK ROUTES (Permission D)

// GET /api/transcription/projects - Get transcription projects
router.get('/projects', requirePermission('D'), asyncHandler(async (req: AuthRequest, res) => {
  const { status, assignedTo, priority } = req.query;
  const userId = req.user!.id;
  const isAdmin = req.user!.permissions === 'ABCDEF';
  
  let filteredProjects = [...mockProjects];

  // Non-admin users can only see their own projects
  if (!isAdmin) {
    filteredProjects = filteredProjects.filter(p => p.assignedTo === userId || p.assignedTo === req.user!.username);
  }

  // Apply filters
  if (status) {
    filteredProjects = filteredProjects.filter(p => p.status === status);
  }

  if (assignedTo && isAdmin) {
    filteredProjects = filteredProjects.filter(p => p.assignedTo === assignedTo);
  }

  if (priority) {
    filteredProjects = filteredProjects.filter(p => p.priority === priority);
  }

  res.json({
    success: true,
    projects: filteredProjects,
    total: filteredProjects.length
  });
}));

// GET /api/transcription/projects/:id - Get specific project
router.get('/projects/:id', requirePermission('D'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const username = req.user!.username;
  const isAdmin = req.user!.permissions === 'ABCDEF';
  
  const project = mockProjects.find(p => p.id === id);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'פרויקט לא נמצא'
    });
  }

  // Check permissions - user can only access their own projects unless admin
  if (!isAdmin && project.assignedTo !== userId && project.assignedTo !== username) {
    return res.status(403).json({
      success: false,
      message: 'אין הרשאה לצפות בפרויקט זה'
    });
  }

  res.json({
    success: true,
    project
  });
}));

// PUT /api/transcription/projects/:id - Update transcription text
router.put('/projects/:id', requirePermission('D'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { transcriptionText, completionPercentage } = req.body;
  const userId = req.user!.id;
  const username = req.user!.username;
  const isAdmin = req.user!.permissions === 'ABCDEF';
  
  const projectIndex = mockProjects.findIndex(p => p.id === id);
  
  if (projectIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'פרויקט לא נמצא'
    });
  }

  const project = mockProjects[projectIndex];

  // Check permissions
  if (!isAdmin && project.assignedTo !== userId && project.assignedTo !== username) {
    return res.status(403).json({
      success: false,
      message: 'אין הרשאה לערוך פרויקט זה'
    });
  }

  // Update project
  if (transcriptionText !== undefined) {
    mockProjects[projectIndex].transcriptionText = transcriptionText;
  }
  
  if (completionPercentage !== undefined) {
    mockProjects[projectIndex].completionPercentage = Math.min(100, Math.max(0, completionPercentage));
    
    // Auto-update status based on completion
    if (completionPercentage >= 100) {
      mockProjects[projectIndex].status = 'proofreading';
    } else if (completionPercentage > 0) {
      mockProjects[projectIndex].status = 'transcribing';
    }
  }

  res.json({
    success: true,
    message: 'פרויקט עודכן בהצלחה',
    project: mockProjects[projectIndex]
  });
}));

// PROOFREADING ROUTES (Permission E)

// GET /api/transcription/proofread - Get projects ready for proofreading
router.get('/proofread', requirePermission('E'), asyncHandler(async (req: AuthRequest, res) => {
  const proofreadingProjects = mockProjects.filter(p => 
    p.status === 'proofreading' || p.status === 'completed'
  );

  res.json({
    success: true,
    projects: proofreadingProjects,
    total: proofreadingProjects.length
  });
}));

// PUT /api/transcription/proofread/:id - Update proofreading
router.put('/proofread/:id', requirePermission('E'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { transcriptionText, proofreadingNotes, status } = req.body;
  
  const projectIndex = mockProjects.findIndex(p => p.id === id);
  
  if (projectIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'פרויקט לא נמצא'
    });
  }

  // Update project
  if (transcriptionText !== undefined) {
    mockProjects[projectIndex].transcriptionText = transcriptionText;
  }
  
  if (status && ['proofreading', 'completed', 'needs_revision'].includes(status)) {
    mockProjects[projectIndex].status = status;
    
    if (status === 'completed') {
      mockProjects[projectIndex].completionPercentage = 100;
    }
  }

  res.json({
    success: true,
    message: 'הגהה עודכנה בהצלחה',
    project: mockProjects[projectIndex]
  });
}));

// EXPORT ROUTES (Permission F)

// GET /api/transcription/export/formats - Get available export formats
router.get('/export/formats', requirePermission('F'), asyncHandler(async (req: AuthRequest, res) => {
  res.json({
    success: true,
    formats: exportFormats
  });
}));

// GET /api/transcription/export - Get projects available for export  
router.get('/export', requirePermission('F'), asyncHandler(async (req: AuthRequest, res) => {
  // Get all completed projects
  const completedProjects = mockProjects.filter(p => p.status === 'completed');
  
  res.json({
    success: true,
    projects: completedProjects,
    total: completedProjects.length,
    availableFormats: exportFormats
  });
}));

// GET /api/transcription/export/:id - Get specific project for export
router.get('/export/:id', requirePermission('F'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  
  // Get specific project for export
  const project = mockProjects.find(p => p.id === id);
  
  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'פרויקט לא נמצא'
    });
  }

  if (project.status !== 'completed') {
    return res.status(400).json({
      success: false,
      message: 'ניתן לייצא רק פרויקטים מושלמים'
    });
  }

  res.json({
    success: true,
    project,
    availableFormats: exportFormats
  });
}));

// POST /api/transcription/export/:id - Export project in specified format
router.post('/export/:id', requirePermission('F'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { format, options = {} } = req.body;
  
  const project = mockProjects.find(p => p.id === id);
  
  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'פרויקט לא נמצא'
    });
  }

  if (project.status !== 'completed') {
    return res.status(400).json({
      success: false,
      message: 'ניתן לייצא רק פרויקטים מושלמים'
    });
  }

  const validFormats = exportFormats.map(f => f.format);
  if (!validFormats.includes(format)) {
    return res.status(400).json({
      success: false,
      message: 'פורמט לא נתמך',
      validFormats
    });
  }

  // Simulate export process
  const exportResult = {
    projectId: id,
    projectTitle: project.title,
    format,
    fileName: `${project.title.replace(/[^a-zA-Z0-9\u0590-\u05FF]/g, '_')}.${format}`,
    fileSize: Math.floor(Math.random() * 1000) + 100, // KB
    downloadUrl: `/api/transcription/download/${id}/${format}`,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  };

  res.json({
    success: true,
    message: 'ייצוא בוצע בהצלחה',
    export: exportResult
  });
}));

// Dashboard endpoint - requires any transcription permission
router.get('/dashboard', requireAnyPermission(['D', 'E', 'F']), asyncHandler(async (req: AuthRequest, res) => {
  const userPermissions = req.user!.permissions;
  const userId = req.user!.id;
  const username = req.user!.username;
  const isAdmin = userPermissions === 'ABCDEF';
  
  let userProjects = mockProjects;
  if (!isAdmin) {
    userProjects = mockProjects.filter(p => p.assignedTo === userId || p.assignedTo === username);
  }
  
  const dashboardData: any = {
    user: req.user,
    accessibleSections: []
  };

  if (userPermissions.includes('D')) {
    dashboardData.accessibleSections.push('transcription');
    dashboardData.totalProjects = userProjects.length;
    dashboardData.inProgressProjects = userProjects.filter(p => p.status === 'transcribing').length;
    dashboardData.pendingProjects = userProjects.filter(p => p.status === 'pending').length;
  }

  if (userPermissions.includes('E')) {
    dashboardData.accessibleSections.push('proofreading');
    dashboardData.proofreadingProjects = mockProjects.filter(p => p.status === 'proofreading').length;
  }

  if (userPermissions.includes('F')) {
    dashboardData.accessibleSections.push('export');
    dashboardData.completedProjects = mockProjects.filter(p => p.status === 'completed').length;
  }

  res.json({
    success: true,
    dashboard: dashboardData
  });
}));

// AUTO-CORRECT SETTINGS ROUTES

// GET /api/transcription/autocorrect-settings - Get user's auto-correct settings
router.get('/autocorrect-settings', requireAnyPermission(['D', 'E', 'F']), asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  
  try {
    // Import db connection inside the handler to avoid timing issues
    const { db: database } = await import('../../db/connection');
    
    // Query database for user's settings
    if (!database) {
      return res.status(500).json({
        success: false,
        message: 'Database connection error'
      });
    }
    
    const result = await database.query(
      'SELECT autocorrect_settings FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }
    
    const settings = result.rows[0].autocorrect_settings;
    
    res.json({
      success: true,
      settings: settings || {}
    });
  } catch (error) {
    console.error('Error fetching autocorrect settings:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בטעינת הגדרות'
    });
  }
}));

// PUT /api/transcription/autocorrect-settings - Update user's auto-correct settings
router.put('/autocorrect-settings', requireAnyPermission(['D', 'E', 'F']), asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const { settings } = req.body;
  
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({
      success: false,
      message: 'הגדרות לא תקינות'
    });
  }
  
  try {
    // Import db connection inside the handler to avoid timing issues
    const { db: database } = await import('../../db/connection');
    
    if (!database) {
      return res.status(500).json({
        success: false,
        message: 'Database connection error'
      });
    }
    
    // Update user's autocorrect settings
    const result = await database.query(
      'UPDATE users SET autocorrect_settings = $1 WHERE id = $2 RETURNING autocorrect_settings',
      [JSON.stringify(settings), userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }
    
    res.json({
      success: true,
      message: 'הגדרות נשמרו בהצלחה',
      settings: result.rows[0].autocorrect_settings
    });
  } catch (error) {
    console.error('Error saving autocorrect settings:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשמירת ההגדרות'
    });
  }
}));

export default router;