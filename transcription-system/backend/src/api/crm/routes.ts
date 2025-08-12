import { Router } from 'express';
import { authenticateToken, requirePermission, requireAnyPermission, AuthRequest } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../middleware/error.middleware';

const router = Router();

// All CRM routes require authentication
router.use(authenticateToken);

// Mock data - will be replaced with database in Stage 6
const mockClients = [
  {
    id: '1',
    name: 'חברת טכנולוגיה ABC',
    email: 'contact@abc-tech.com',
    phone: '03-1234567',
    address: 'תל אביב, ישראל',
    status: 'active',
    createdAt: new Date('2024-01-15'),
    notes: 'לקוח VIP - פרויקטים גדולים'
  },
  {
    id: '2',
    name: 'עורך דין יוסי כהן',
    email: 'yossi@lawfirm.co.il',
    phone: '02-9876543',
    address: 'ירושלים, ישראל',
    status: 'active',
    createdAt: new Date('2024-02-01'),
    notes: 'דוחות משפטיים'
  }
];

const mockJobs = [
  {
    id: '1',
    title: 'תמלול ישיבת דירקטוריון',
    clientId: '1',
    transcriberId: '3',
    status: 'in_progress',
    priority: 'high',
    dueDate: new Date('2024-08-15'),
    createdAt: new Date('2024-08-10'),
    audioFile: 'board-meeting-2024-08.mp3',
    estimatedDuration: 120, // minutes
    notes: 'דחוף - נדרש עד סוף השבוע'
  },
  {
    id: '2',
    title: 'תמלול עדות בבית משפט',
    clientId: '2',
    transcriberId: null,
    status: 'pending',
    priority: 'medium',
    dueDate: new Date('2024-08-20'),
    createdAt: new Date('2024-08-09'),
    audioFile: 'court-testimony-2024.mp3',
    estimatedDuration: 90,
    notes: 'איכות גבוהה נדרשת'
  }
];

const mockTranscribers = [
  {
    id: '3',
    name: 'מרים לוי',
    email: 'miriam@transcription.com',
    phone: '054-1234567',
    specialization: ['משפטי', 'עסקי'],
    status: 'active',
    rating: 4.8,
    completedJobs: 156,
    joinedAt: new Date('2023-06-15')
  },
  {
    id: '4',
    name: 'דוד כהן',
    email: 'david@transcription.com',
    phone: '052-9876543',
    specialization: ['רפואי', 'טכני'],
    status: 'active',
    rating: 4.6,
    completedJobs: 98,
    joinedAt: new Date('2023-09-20')
  }
];

// CLIENT MANAGEMENT ROUTES (Permission A)

// GET /api/crm/clients - Get all clients
router.get('/clients', requirePermission('A'), asyncHandler(async (req: AuthRequest, res) => {
  res.json({
    success: true,
    clients: mockClients,
    total: mockClients.length
  });
}));

// GET /api/crm/clients/:id - Get specific client
router.get('/clients/:id', requirePermission('A'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const client = mockClients.find(c => c.id === id);

  if (!client) {
    return res.status(404).json({
      success: false,
      message: 'לקוח לא נמצא'
    });
  }

  // Get client's jobs
  const clientJobs = mockJobs.filter(job => job.clientId === id);

  res.json({
    success: true,
    client: {
      ...client,
      jobs: clientJobs
    }
  });
}));

// POST /api/crm/clients - Create new client
router.post('/clients', requirePermission('A'), asyncHandler(async (req: AuthRequest, res) => {
  const { name, email, phone, address, notes } = req.body;

  if (!name || !email) {
    return res.status(400).json({
      success: false,
      message: 'שם ומייל נדרשים'
    });
  }

  const newClient = {
    id: Date.now().toString(),
    name,
    email,
    phone: phone || '',
    address: address || '',
    notes: notes || '',
    status: 'active',
    createdAt: new Date()
  };

  mockClients.push(newClient);

  res.json({
    success: true,
    message: 'לקוח נוצר בהצלחה',
    client: newClient
  });
}));

// JOB MANAGEMENT ROUTES (Permission B)

// GET /api/crm/jobs - Get all jobs
router.get('/jobs', requirePermission('B'), asyncHandler(async (req: AuthRequest, res) => {
  const { status, priority, clientId } = req.query;
  
  let filteredJobs = [...mockJobs];

  // Filter by status if provided
  if (status) {
    filteredJobs = filteredJobs.filter(job => job.status === status);
  }

  // Filter by priority if provided
  if (priority) {
    filteredJobs = filteredJobs.filter(job => job.priority === priority);
  }

  // Filter by client if provided
  if (clientId) {
    filteredJobs = filteredJobs.filter(job => job.clientId === clientId);
  }

  // Enrich jobs with client and transcriber info
  const enrichedJobs = filteredJobs.map(job => ({
    ...job,
    client: mockClients.find(c => c.id === job.clientId),
    transcriber: job.transcriberId ? mockTranscribers.find(t => t.id === job.transcriberId) : null
  }));

  res.json({
    success: true,
    jobs: enrichedJobs,
    total: enrichedJobs.length
  });
}));

// GET /api/crm/jobs/:id - Get specific job
router.get('/jobs/:id', requirePermission('B'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const job = mockJobs.find(j => j.id === id);

  if (!job) {
    return res.status(404).json({
      success: false,
      message: 'עבודה לא נמצאה'
    });
  }

  const enrichedJob = {
    ...job,
    client: mockClients.find(c => c.id === job.clientId),
    transcriber: job.transcriberId ? mockTranscribers.find(t => t.id === job.transcriberId) : null
  };

  res.json({
    success: true,
    job: enrichedJob
  });
}));

// POST /api/crm/jobs - Create new job
router.post('/jobs', requirePermission('B'), asyncHandler(async (req: AuthRequest, res) => {
  const { title, clientId, priority, dueDate, audioFile, estimatedDuration, notes } = req.body;

  if (!title || !clientId) {
    return res.status(400).json({
      success: false,
      message: 'כותרת ולקוח נדרשים'
    });
  }

  // Check if client exists
  const client = mockClients.find(c => c.id === clientId);
  if (!client) {
    return res.status(400).json({
      success: false,
      message: 'לקוח לא נמצא'
    });
  }

  const newJob = {
    id: Date.now().toString(),
    title,
    clientId,
    transcriberId: null,
    status: 'pending',
    priority: priority || 'medium',
    dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default: 1 week
    createdAt: new Date(),
    audioFile: audioFile || '',
    estimatedDuration: estimatedDuration || 60,
    notes: notes || ''
  };

  mockJobs.push(newJob);

  res.json({
    success: true,
    message: 'עבודה נוצרה בהצלחה',
    job: newJob
  });
}));

// TRANSCRIBER MANAGEMENT ROUTES (Permission C)

// GET /api/crm/transcribers - Get all transcribers
router.get('/transcribers', requirePermission('C'), asyncHandler(async (req: AuthRequest, res) => {
  const { status, specialization } = req.query;
  
  let filteredTranscribers = [...mockTranscribers];

  if (status) {
    filteredTranscribers = filteredTranscribers.filter(t => t.status === status);
  }

  if (specialization) {
    filteredTranscribers = filteredTranscribers.filter(t => 
      t.specialization.some(spec => 
        spec.toLowerCase().includes(specialization.toString().toLowerCase())
      )
    );
  }

  res.json({
    success: true,
    transcribers: filteredTranscribers,
    total: filteredTranscribers.length
  });
}));

// GET /api/crm/transcribers/:id - Get specific transcriber
router.get('/transcribers/:id', requirePermission('C'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const transcriber = mockTranscribers.find(t => t.id === id);

  if (!transcriber) {
    return res.status(404).json({
      success: false,
      message: 'מתמלל לא נמצא'
    });
  }

  // Get transcriber's jobs
  const transcriberJobs = mockJobs.filter(job => job.transcriberId === id);

  res.json({
    success: true,
    transcriber: {
      ...transcriber,
      currentJobs: transcriberJobs.filter(job => job.status === 'in_progress'),
      completedJobsDetailed: transcriberJobs.filter(job => job.status === 'completed')
    }
  });
}));

// Dashboard endpoint - requires any CRM permission
router.get('/dashboard', requireAnyPermission(['A', 'B', 'C']), asyncHandler(async (req: AuthRequest, res) => {
  const userPermissions = req.user!.permissions;
  
  const dashboardData: any = {
    user: req.user,
    accessibleSections: []
  };

  // Add data based on user permissions
  if (userPermissions.includes('A')) {
    dashboardData.accessibleSections.push('clients');
    dashboardData.clientsCount = mockClients.length;
    dashboardData.activeClients = mockClients.filter(c => c.status === 'active').length;
  }

  if (userPermissions.includes('B')) {
    dashboardData.accessibleSections.push('jobs');
    dashboardData.jobsCount = mockJobs.length;
    dashboardData.pendingJobs = mockJobs.filter(j => j.status === 'pending').length;
    dashboardData.inProgressJobs = mockJobs.filter(j => j.status === 'in_progress').length;
  }

  if (userPermissions.includes('C')) {
    dashboardData.accessibleSections.push('transcribers');
    dashboardData.transcribersCount = mockTranscribers.length;
    dashboardData.activeTranscribers = mockTranscribers.filter(t => t.status === 'active').length;
  }

  res.json({
    success: true,
    dashboard: dashboardData
  });
}));

export default router;