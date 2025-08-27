import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../db/connection';
import { developmentHTML } from '../../dev-tools/development-html';
import shortcutsAdminRoutes from './shortcuts-admin-routes';
import shortcutsAdvancedRoutes from './shortcuts-advanced-routes';
import { testCreateBackup, testReadBackup } from './test-backup';
import { testCreateBackupSimple, testReadBackupSimple } from './test-backup-simple';
import { testCreateBackupLive, listLiveBackups } from './test-backup-live';

const router = Router();

// Hardcoded admin IDs for security
const ADMIN_USER_IDS = [
  '3134f67b-db84-4d58-801e-6b2f5da0f6a3', // יעל הורי (production)
  '21c6c05f-cb60-47f3-b5f2-b9ada3631345', // ליאת בן שי (production)
  'bfc0ba9a-daae-46e2-acb9-5984d1adef9f', // יעל הורי (local)
  '6bdc1c02-fa65-4ef0-868b-928ec807b2ba'  // ליאת בן שי (local)
];

// Helper function to verify JWT token
const verifyToken = (authHeader: string | null): { userId: string } | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    return { userId: decoded.userId };
  } catch (error) {
    return null;
  }
};

// Dev tools main page - serve HTML
router.get('/', (req, res) => {
  res.send(developmentHTML);
});

// Redirect to shortcuts admin - special handling
router.get('/shortcuts-admin', (req, res) => {
  // Redirect to the frontend shortcuts admin page
  const host = req.get('host')?.split(':')[0] || 'localhost';
  const protocol = req.protocol;
  res.redirect(`${protocol}://${host}:3002/dev-portal/shortcuts-admin`);
});

// Mount shortcuts admin routes
router.use('/admin', shortcutsAdminRoutes);
router.use('/admin/advanced', shortcutsAdvancedRoutes);

// Test backup routes
router.post('/test-backup', testCreateBackup);
router.get('/test-backup', testReadBackup);

// Simple test backup routes (no database)
router.post('/test-backup-simple', testCreateBackupSimple);
router.get('/test-backup-simple', testReadBackupSimple);

// Live backup routes (from editor)
router.post('/test-backup-live', testCreateBackupLive);
router.get('/test-backup-live', listLiveBackups);

// Debug endpoint to check environment
router.get('/check-env', (req: Request, res: Response) => {
  const raw = process.env.NODE_ENV;
  const trimmed = process.env.NODE_ENV?.trim();
  const isDev = process.env.NODE_ENV?.trim() === 'development' || process.env.ENABLE_DEV_TOOLS === 'true';
  
  res.json({
    raw: raw,
    rawLength: raw?.length,
    trimmed: trimmed,
    isDev: isDev,
    ENABLE_DEV_TOOLS: process.env.ENABLE_DEV_TOOLS
  });
});


// Get all users with full details (DEV ONLY)
router.get('/api/users', async (req: Request, res: Response) => {
  // Check if in development mode - Windows sets it with a space sometimes
  const isDev = process.env.NODE_ENV?.trim() === 'development' || process.env.ENABLE_DEV_TOOLS === 'true';
  if (!isDev) {
    return res.status(403).json({ error: 'Access denied in production', env: process.env.NODE_ENV });
  }

  try {
    const result = await db.query(`
      SELECT 
        u.id,
        u.username,
        u.full_name,
        u.email,
        u.permissions,
        u.personal_company,
        u.created_at,
        u.transcriber_code,
        u.is_admin,
        u.plain_password,
        u.last_login,
        u.is_active,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', l.id,
              'permissions', l.permissions,
              'total_amount', l.total_amount,
              'status', l.status,
              'created_at', l.created_at
            )
          ) FILTER (WHERE l.id IS NOT NULL), 
          '[]'::json
        ) as licenses
      FROM users u
      LEFT JOIN licenses l ON u.id = l.user_id
      GROUP BY u.id, u.username, u.full_name, u.email, u.permissions, u.personal_company, 
               u.created_at, u.transcriber_code, u.is_admin, u.plain_password, u.last_login, u.is_active
      ORDER BY u.created_at DESC
    `);

    // Transform the data to match the expected format for dev tools
    const transformedUsers = result.rows.map((user: any) => {
      // Generate password hint based on email for demo purposes
      let passwordHint = 'Password123!'; // Default password for demo users
      if (user.email === 'ayelho@gmail.com') {
        passwordHint = 'ayelho123'; // Specific hint for this user
      } else if (user.email === 'working@test.com') {
        passwordHint = 'test123';
      } else if (user.email.includes('demo')) {
        passwordHint = 'demo123';
      } else if (user.email.includes('admin')) {
        passwordHint = 'admin123';
      } else if (user.email.includes('user')) {
        passwordHint = 'user123';
      }
      
      return {
        id: user.id.toString(),
        username: user.username || user.email.split('@')[0], // Use actual username or email prefix
        email: user.email,
        full_name: user.full_name,
        permissions: user.permissions || '', // Use permissions from users table
        is_admin: user.is_admin || false, // Use is_admin from users table
        transcriber_code: user.transcriber_code || null, // Use actual transcriber_code from database
        created_at: user.created_at,
        last_login: user.last_login,
        personal_company: user.personal_company,
        licenses: user.licenses,
        plain_password: user.plain_password || passwordHint, // Use actual plain_password if exists
        password_hint: user.plain_password || passwordHint
      };
    });
    
    res.json(transformedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get system statistics
router.get('/api/stats', async (req: Request, res: Response) => {
  const isDev = process.env.NODE_ENV?.trim() === 'development' || process.env.ENABLE_DEV_TOOLS === 'true';
  if (!isDev) {
    return res.status(403).json({ error: 'Access denied in production' });
  }

  try {
    // Get user and license statistics
    const userCount = await db.query('SELECT COUNT(*) as count FROM users');
    const licenseCount = await db.query('SELECT COUNT(*) as count FROM licenses');
    
    // Count companies (users with company names)
    const companyCount = await db.query('SELECT COUNT(*) as count FROM users WHERE personal_company IS NOT NULL AND personal_company != \'\'');
    
    // Count transcribers (users with D, E, or F permissions)
    const transcribersCount = await db.query(`
      SELECT COUNT(DISTINCT user_id) as count 
      FROM licenses 
      WHERE permissions LIKE '%D%' OR permissions LIKE '%E%' OR permissions LIKE '%F%'
    `);
    
    // Count CRM users (users with A, B, or C permissions)
    const crmCount = await db.query(`
      SELECT COUNT(DISTINCT user_id) as count 
      FROM licenses 
      WHERE permissions LIKE '%A%' OR permissions LIKE '%B%' OR permissions LIKE '%C%'
    `);
    
    // Count admin users (users with A permission)
    const adminCount = await db.query(`
      SELECT COUNT(DISTINCT user_id) as count 
      FROM licenses 
      WHERE permissions LIKE '%A%'
    `);

    const stats = {
      totalUsers: parseInt(userCount.rows[0].count) || 0,
      adminUsers: parseInt(adminCount.rows[0].count) || 0,
      crmUsers: parseInt(crmCount.rows[0].count) || 0,
      transcribers: parseInt(transcribersCount.rows[0].count) || 0,
      activeSessions: 0, // No sessions table in new structure
      totalLicenses: parseInt(licenseCount.rows[0].count) || 0
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Delete a user (DEV ONLY)
router.delete('/api/users/:id', async (req: Request, res: Response) => {
  const isDev = process.env.NODE_ENV?.trim() === 'development' || process.env.ENABLE_DEV_TOOLS === 'true';
  if (!isDev) {
    return res.status(403).json({ error: 'Access denied in production' });
  }

  const userId = req.params.id;

  // Prevent deleting admin user
  if (userId === '1') {
    return res.status(400).json({ error: 'Cannot delete admin user' });
  }

  try {
    await db.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Clear all sessions
router.post('/clear-sessions', async (req: Request, res: Response) => {
  const isDev = process.env.NODE_ENV?.trim() === 'development' || process.env.ENABLE_DEV_TOOLS === 'true';
  if (!isDev) {
    return res.status(403).json({ error: 'Access denied in production' });
  }

  try {
    await db.query('DELETE FROM sessions');
    res.json({ success: true, message: 'All sessions cleared' });
  } catch (error) {
    console.error('Error clearing sessions:', error);
    res.status(500).json({ error: 'Failed to clear sessions' });
  }
});

// Add a new test user
router.post('/users', async (req: Request, res: Response) => {
  const isDev = process.env.NODE_ENV?.trim() === 'development' || process.env.ENABLE_DEV_TOOLS === 'true';
  if (!isDev) {
    return res.status(403).json({ error: 'Access denied in production' });
  }

  const { username, password, email, full_name, permissions, is_admin } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await db.query(`
      INSERT INTO users (username, password, email, full_name, permissions, is_admin)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, username, email, full_name, permissions, is_admin
    `, [username, hashedPassword, email, full_name, permissions || '', is_admin || false]);

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Test database connection
router.get('/test-connection', async (req: Request, res: Response) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ 
      success: true, 
      message: 'Database connected',
      timestamp: result.rows[0].now 
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Database connection failed' 
    });
  }
});

// Get system info
router.get('/system-info', async (req: Request, res: Response) => {
  const isDev = process.env.NODE_ENV?.trim() === 'development' || process.env.ENABLE_DEV_TOOLS === 'true';
  if (!isDev) {
    return res.status(403).json({ error: 'Access denied in production' });
  }

  res.json({
    node_version: process.version,
    platform: process.platform,
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV,
    port: process.env.PORT || 5000,
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'transcription_dev'
    }
  });
});

// Development Hub Components API
router.get('/api/components', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const decoded = verifyToken(authHeader || '');
    
    if (!decoded || !ADMIN_USER_IDS.includes(decoded.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // First, create tables if they don't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS dev_components (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) CHECK (type IN ('existing', 'planned', 'infrastructure')) DEFAULT 'planned',
        status VARCHAR(50) CHECK (status IN ('active', 'planned', 'on-hold', 'completed', 'archived')) DEFAULT 'planned',
        folder_path VARCHAR(500),
        description TEXT,
        related_files JSON,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name)
      )
    `);

    // Insert default components if table is empty
    const { rows: existingRows } = await db.query('SELECT COUNT(*) FROM dev_components');
    if (existingRows[0].count === '0') {
      await db.query(`
        INSERT INTO dev_components (name, type, status, folder_path, description) VALUES
          ('MediaPlayer', 'existing', 'active', 'src/app/transcription/transcription/components/MediaPlayer', 'Audio/video player with waveform visualization'),
          ('TextEditor', 'existing', 'active', 'src/app/transcription/transcription/components/TextEditor', 'Main transcription text editor with shortcuts'),
          ('Speaker', 'existing', 'active', 'src/app/transcription/transcription/components/Speaker', 'Speaker management and identification'),
          ('Remarks', 'existing', 'active', 'src/app/transcription/transcription/components/Remarks', 'Remarks and annotations system'),
          ('Development Hub', 'planned', 'active', 'src/app/transcription/admin/development', 'Development task management system')
        ON CONFLICT (name) DO NOTHING
      `);
    }

    // Get all components
    const { rows } = await db.query(
      'SELECT * FROM dev_components ORDER BY created_at DESC'
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching components:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/api/components', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const decoded = verifyToken(authHeader || '');
    
    if (!decoded || !ADMIN_USER_IDS.includes(decoded.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { name, type, description } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    const { rows } = await db.query(
      `INSERT INTO dev_components (name, type, description, created_by) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [name, type, description, decoded.userId]
    );

    res.json(rows[0]);
  } catch (error) {
    console.error('Error creating component:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Development Hub Tasks API
router.get('/api/tasks', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const decoded = verifyToken(authHeader || '');
    
    if (!decoded || !ADMIN_USER_IDS.includes(decoded.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // First, create tables if they don't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS dev_tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        component_id UUID REFERENCES dev_components(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
        status VARCHAR(20) CHECK (status IN ('idea', 'todo', 'in_progress', 'completed', 'cancelled')) DEFAULT 'todo',
        file_links JSON,
        dependencies JSON,
        tags JSON,
        assignee UUID REFERENCES users(id),
        created_by UUID REFERENCES users(id),
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes if they don't exist
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_dev_tasks_component_id ON dev_tasks(component_id);
      CREATE INDEX IF NOT EXISTS idx_dev_tasks_status ON dev_tasks(status);
      CREATE INDEX IF NOT EXISTS idx_dev_tasks_priority ON dev_tasks(priority);
    `);

    // Get component_id from query params if provided
    const componentId = req.query.component_id;

    let queryText = 'SELECT * FROM dev_tasks';
    let queryParams: any[] = [];

    if (componentId) {
      queryText += ' WHERE component_id = $1';
      queryParams = [componentId];
    }

    queryText += ' ORDER BY priority DESC, created_at DESC';

    const { rows } = await db.query(queryText, queryParams);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/api/tasks', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const decoded = verifyToken(authHeader || '');
    
    if (!decoded || !ADMIN_USER_IDS.includes(decoded.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { component_id, title, content, priority, status, tags } = req.body;

    if (!component_id || !title) {
      return res.status(400).json({ error: 'Component ID and title are required' });
    }

    const { rows } = await db.query(
      `INSERT INTO dev_tasks (component_id, title, content, priority, status, tags, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [
        component_id, 
        title, 
        content || '', 
        priority || 'medium', 
        status || 'todo',
        tags ? JSON.stringify(tags) : null,
        decoded.userId
      ]
    );

    res.json(rows[0]);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/api/tasks', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const decoded = verifyToken(authHeader || '');
    
    if (!decoded || !ADMIN_USER_IDS.includes(decoded.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id, status } = req.body;

    if (!id || !status) {
      return res.status(400).json({ error: 'Task ID and status are required' });
    }

    const completedAt = status === 'completed' ? 'CURRENT_TIMESTAMP' : 'NULL';

    const { rows } = await db.query(
      `UPDATE dev_tasks 
       SET status = $1, completed_at = ${completedAt}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get app structure with components and tasks
router.get('/api/app-structure', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const decoded = verifyToken(authHeader || '');
    
    if (!decoded || !ADMIN_USER_IDS.includes(decoded.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Get all pages from app structure
    const { rows: pages } = await db.query(`
      SELECT * FROM dev_app_structure 
      ORDER BY app_section, page_path
    `);

    // Get all components
    const { rows: components } = await db.query(`
      SELECT * FROM dev_components 
      ORDER BY page_path, name
    `);

    // Get all tasks
    const { rows: tasks } = await db.query(`
      SELECT * FROM dev_tasks 
      ORDER BY page_path, order_index, created_at
    `);

    // Structure the data
    const structure = {
      transcription: [],
      crm: [],
      'dev-portal': [],
      general: []
    };

    // Build hierarchical structure
    pages.forEach(page => {
      const pageData = {
        ...page,
        components: components.filter(c => c.page_path === page.page_path),
        tasks: tasks.filter(t => t.page_path === page.page_path)
      };
      structure[page.app_section]?.push(pageData);
    });

    res.json(structure);
  } catch (error) {
    console.error('Error fetching app structure:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add planned component
router.post('/api/components/planned', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const decoded = verifyToken(authHeader || '');
    
    if (!decoded || !ADMIN_USER_IDS.includes(decoded.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { name, page_path, app_section, description } = req.body;

    if (!name || !page_path || !app_section) {
      return res.status(400).json({ error: 'Name, page path, and app section are required' });
    }

    const { rows } = await db.query(
      `INSERT INTO dev_components (name, page_path, app_section, type, is_planned, description, created_by) 
       VALUES ($1, $2, $3, 'planned', true, $4, $5) 
       RETURNING *`,
      [name, page_path, app_section, description, decoded.userId]
    );

    res.json(rows[0]);
  } catch (error) {
    console.error('Error creating planned component:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get tasks by page
router.get('/api/tasks/by-page', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const decoded = verifyToken(authHeader || '');
    
    if (!decoded || !ADMIN_USER_IDS.includes(decoded.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { page_path } = req.query;

    if (!page_path) {
      return res.status(400).json({ error: 'Page path is required' });
    }

    const { rows } = await db.query(
      `SELECT t.*, c.name as component_name, c.is_planned
       FROM dev_tasks t
       LEFT JOIN dev_components c ON t.component_id = c.id
       WHERE t.page_path = $1
       ORDER BY t.task_category, t.order_index, t.created_at`,
      [page_path]
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching tasks by page:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sync tasks to MD file
router.post('/api/tasks/sync-md', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const decoded = verifyToken(authHeader || '');
    
    if (!decoded || !ADMIN_USER_IDS.includes(decoded.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const fs = require('fs').promises;
    const path = require('path');
    
    let tasks: any[] = [];
    let usedMockData = false;

    // Try to get tasks from database, fall back to mock data if tables don't exist
    try {
      const { rows: dbTasks } = await db.query(`
        SELECT 
          t.*,
          c.name as component_name,
          c.is_planned,
          s.app_section,
          s.page_name
        FROM dev_tasks t
        LEFT JOIN dev_components c ON t.component_id = c.id
        LEFT JOIN dev_app_structure s ON t.page_path = s.page_path
        ORDER BY s.app_section, t.page_path, t.task_category, c.name, t.order_index
      `);
      tasks = dbTasks;
    } catch (dbError) {
      console.log('Database tables not found, using mock data');
      usedMockData = true;
      
      // Enhanced mock data matching the frontend structure
      const mockAppStructure = {
        transcription: [
          {
            id: '1',
            app_section: 'transcription',
            page_path: '/transcription',
            page_name: 'לוח בקרה ראשי',
            components: [],
            tasks: [
              { id: 't1', title: 'Add dashboard widgets', status: 'todo', priority: 'medium', task_category: 'general' },
              { id: 't2', title: 'Implement recent activity feed', status: 'todo', priority: 'medium', task_category: 'general' }
            ]
          },
          {
            id: '2',
            app_section: 'transcription',
            page_path: '/transcription/transcription',
            page_name: 'עורך תמלול',
            components: [
              { id: 'c1', name: 'TextEditor', type: 'existing', is_planned: false },
              { id: 'c2', name: 'MediaPlayer', type: 'existing', is_planned: false },
              { id: 'c3', name: 'Speaker', type: 'existing', is_planned: false },
              { id: 'c4', name: 'VoiceCommands', type: 'planned', is_planned: true }
            ],
            tasks: [
              // TextEditor tasks
              { id: 't3', component_id: 'c1', title: 'Fix Hebrew shortcuts bug', status: 'todo', priority: 'high', task_category: 'component' },
              { id: 't4', component_id: 'c1', title: 'Add auto-save indicator', status: 'todo', priority: 'medium', task_category: 'component' },
              { id: 't5', component_id: 'c1', title: 'Improve performance for large documents', status: 'todo', priority: 'high', task_category: 'component' },
              { id: 't6', component_id: 'c1', title: 'Add spell check for Hebrew', status: 'todo', priority: 'low', task_category: 'component' },
              // MediaPlayer tasks
              { id: 't7', component_id: 'c2', title: 'Add volume slider', status: 'todo', priority: 'medium', task_category: 'component' },
              { id: 't8', component_id: 'c2', title: 'Fix waveform display issues', status: 'todo', priority: 'high', task_category: 'component' },
              { id: 't9', component_id: 'c2', title: 'Add playback speed presets', status: 'todo', priority: 'low', task_category: 'component' },
              { id: 't10', component_id: 'c2', title: 'Improve keyboard shortcuts', status: 'todo', priority: 'medium', task_category: 'component' },
              // Speaker tasks
              { id: 't11', component_id: 'c3', title: 'Add speaker templates', status: 'todo', priority: 'medium', task_category: 'component' },
              { id: 't12', component_id: 'c3', title: 'Improve color selection', status: 'todo', priority: 'low', task_category: 'component' },
              { id: 't13', component_id: 'c3', title: 'Add speaker statistics', status: 'todo', priority: 'low', task_category: 'component' },
              // VoiceCommands (planned) tasks
              { id: 't14', component_id: 'c4', title: 'Research Web Speech API', status: 'todo', priority: 'high', task_category: 'planned' },
              { id: 't15', component_id: 'c4', title: 'Design command structure', status: 'todo', priority: 'high', task_category: 'planned' },
              { id: 't16', component_id: 'c4', title: 'Implement basic commands', status: 'todo', priority: 'medium', task_category: 'planned' },
              { id: 't17', component_id: 'c4', title: 'Add Hebrew language support', status: 'todo', priority: 'medium', task_category: 'planned' },
              // General tasks
              { id: 't18', title: 'Improve page load time', status: 'todo', priority: 'medium', task_category: 'general' },
              { id: 't19', title: 'Add user preferences', status: 'todo', priority: 'low', task_category: 'general' },
              { id: 't20', title: 'Document API endpoints', status: 'todo', priority: 'low', task_category: 'general' }
            ]
          },
          {
            id: '3',
            app_section: 'transcription',
            page_path: '/transcription/admin/development',
            page_name: 'מרכז פיתוח',
            components: [],
            tasks: [
              { id: 't21', title: 'Add export to CSV', status: 'todo', priority: 'medium', task_category: 'general' },
              { id: 't22', title: 'Implement task dependencies', status: 'todo', priority: 'high', task_category: 'general' },
              { id: 't23', title: 'Add task priority sorting', status: 'todo', priority: 'medium', task_category: 'general' }
            ]
          }
        ],
        crm: [
          {
            id: '4',
            app_section: 'crm',
            page_path: '/crm',
            page_name: 'לוח בקרה CRM',
            components: [
              { id: 'c5', name: 'Dashboard', type: 'planned', is_planned: true }
            ],
            tasks: [
              // Dashboard (planned) tasks
              { id: 't24', component_id: 'c5', title: 'Design dashboard layout', status: 'todo', priority: 'high', task_category: 'planned' },
              { id: 't25', component_id: 'c5', title: 'Add statistics widgets', status: 'todo', priority: 'medium', task_category: 'planned' },
              { id: 't26', component_id: 'c5', title: 'Implement data visualization', status: 'todo', priority: 'medium', task_category: 'planned' },
              // General tasks
              { id: 't27', title: 'Setup database tables', status: 'todo', priority: 'high', task_category: 'general' },
              { id: 't28', title: 'Create API endpoints', status: 'todo', priority: 'high', task_category: 'general' }
            ]
          },
          {
            id: '5',
            app_section: 'crm',
            page_path: '/crm/clients',
            page_name: 'לקוחות',
            components: [
              { id: 'c6', name: 'ClientTable', type: 'planned', is_planned: true },
              { id: 'c7', name: 'ClientAnalytics', type: 'planned', is_planned: true }
            ],
            tasks: [
              // ClientTable (planned) tasks
              { id: 't29', component_id: 'c6', title: 'Design table component', status: 'todo', priority: 'high', task_category: 'planned' },
              { id: 't30', component_id: 'c6', title: 'Add sorting and filtering', status: 'todo', priority: 'medium', task_category: 'planned' },
              { id: 't31', component_id: 'c6', title: 'Implement CRUD operations', status: 'todo', priority: 'high', task_category: 'planned' },
              // ClientAnalytics (planned) tasks
              { id: 't32', component_id: 'c7', title: 'Create analytics dashboard', status: 'todo', priority: 'medium', task_category: 'planned' },
              { id: 't33', component_id: 'c7', title: 'Add export functionality', status: 'todo', priority: 'low', task_category: 'planned' },
              // General tasks
              { id: 't34', title: 'Optimize database queries', status: 'todo', priority: 'medium', task_category: 'general' },
              { id: 't35', title: 'Add pagination', status: 'todo', priority: 'medium', task_category: 'general' }
            ]
          }
        ],
        'dev-portal': [
          {
            id: '6',
            app_section: 'dev-portal',
            page_path: '/dev-portal',
            page_name: 'פורטל פיתוח',
            components: [],
            tasks: [
              { id: 't36', title: 'Create main navigation', status: 'todo', priority: 'high', task_category: 'general' },
              { id: 't37', title: 'Add tool descriptions', status: 'todo', priority: 'medium', task_category: 'general' },
              { id: 't38', title: 'Implement access control', status: 'todo', priority: 'high', task_category: 'general' }
            ]
          }
        ],
        general: [
          {
            id: '7',
            app_section: 'general',
            page_path: '/login',
            page_name: 'התחברות',
            components: [
              { id: 'c8', name: 'AuthForm', type: 'existing', is_planned: false }
            ],
            tasks: [
              // AuthForm (existing) tasks
              { id: 't39', component_id: 'c8', title: 'Add remember me option', status: 'todo', priority: 'low', task_category: 'component' },
              { id: 't40', component_id: 'c8', title: 'Implement OAuth', status: 'todo', priority: 'medium', task_category: 'component' },
              { id: 't41', component_id: 'c8', title: 'Add password strength indicator', status: 'todo', priority: 'low', task_category: 'component' },
              // General tasks
              { id: 't42', title: 'Add captcha', status: 'todo', priority: 'medium', task_category: 'general' },
              { id: 't43', title: 'Implement rate limiting', status: 'todo', priority: 'high', task_category: 'general' }
            ]
          }
        ]
      };

      // Convert mock data to the format expected by the MD generation logic
      tasks = [];
      Object.entries(mockAppStructure).forEach(([sectionName, pages]: [string, any]) => {
        pages.forEach((page: any) => {
          // Create a component lookup
          const componentLookup: any = {};
          page.components.forEach((comp: any) => {
            componentLookup[comp.id] = comp;
          });
          
          // Process tasks
          page.tasks.forEach((task: any) => {
            const component = task.component_id ? componentLookup[task.component_id] : null;
            tasks.push({
              ...task,
              component_name: component?.name || null,
              is_planned: component?.is_planned || false,
              app_section: page.app_section,
              page_name: page.page_name,
              page_path: page.page_path
            });
          });
        });
      });
    }

    // Build markdown content
    let mdContent = '# Development Tasks\n\n';
    mdContent += `_Last synced: ${new Date().toISOString()}_\n\n`;

    // Group tasks by section and page
    const sections: any = {};
    tasks.forEach((task: any) => {
      const section = task.app_section || 'general';
      const page = task.page_path || 'unassigned';
      
      if (!sections[section]) sections[section] = {};
      if (!sections[section][page]) sections[section][page] = {
        page_name: task.page_name,
        components: {},
        planned: {},
        general: []
      };

      if (task.task_category === 'general') {
        sections[section][page].general.push(task);
      } else if (task.is_planned) {
        if (!sections[section][page].planned[task.component_name]) {
          sections[section][page].planned[task.component_name] = [];
        }
        sections[section][page].planned[task.component_name].push(task);
      } else {
        if (!sections[section][page].components[task.component_name]) {
          sections[section][page].components[task.component_name] = [];
        }
        sections[section][page].components[task.component_name].push(task);
      }
    });

    // Generate markdown
    ['transcription', 'crm', 'dev-portal', 'general'].forEach(sectionName => {
      if (sections[sectionName]) {
        mdContent += `## ${sectionName.charAt(0).toUpperCase() + sectionName.slice(1).replace('-', ' ')}\n\n`;
        
        Object.entries(sections[sectionName]).forEach(([pagePath, pageData]: [string, any]) => {
          mdContent += `### ${pagePath} ${pageData.page_name ? `(${pageData.page_name})` : ''}\n\n`;
          
          // Existing components
          if (Object.keys(pageData.components).length > 0) {
            Object.entries(pageData.components).forEach(([componentName, componentTasks]: [string, any]) => {
              mdContent += `#### ${componentName} (existing)\n`;
              componentTasks.forEach((task: any) => {
                const checkbox = task.status === 'completed' ? '[x]' : '[ ]';
                mdContent += `- ${checkbox} ${task.title}\n`;
              });
              mdContent += '\n';
            });
          }
          
          // Planned components
          if (Object.keys(pageData.planned).length > 0) {
            Object.entries(pageData.planned).forEach(([componentName, componentTasks]: [string, any]) => {
              mdContent += `#### ${componentName} (planned)\n`;
              componentTasks.forEach((task: any) => {
                const checkbox = task.status === 'completed' ? '[x]' : '[ ]';
                mdContent += `- ${checkbox} ${task.title}\n`;
              });
              mdContent += '\n';
            });
          }
          
          // General tasks
          if (pageData.general.length > 0) {
            mdContent += '#### General/Other\n';
            pageData.general.forEach((task: any) => {
              const checkbox = task.status === 'completed' ? '[x]' : '[ ]';
              mdContent += `- ${checkbox} ${task.title}\n`;
            });
            mdContent += '\n';
          }
        });
      }
    });

    // Add footer
    mdContent += '---\n\n';
    mdContent += '_This file is automatically generated by the Development Hub. Do not edit manually._\n';
    mdContent += '_To update tasks, use the Development Hub interface at /transcription/admin/development_\n';

    // Write to todo.md file in docs folder
    const docsPath = path.join(process.cwd(), '..', 'docs');
    // Create docs folder if it doesn't exist
    try {
      await fs.mkdir(docsPath, { recursive: true });
    } catch (err) {
      // Folder might already exist
    }
    const todoPath = path.join(docsPath, 'todo-dev-hub.md');
    await fs.writeFile(todoPath, mdContent, 'utf8');

    // If using database, mark all tasks as synced
    if (!usedMockData) {
      try {
        await db.query('UPDATE dev_tasks SET is_synced_to_md = true');
      } catch (updateError) {
        // Ignore if column doesn't exist
      }
    }

    res.json({ 
      success: true, 
      message: `Tasks synced to todo-dev-hub.md ${usedMockData ? '(using mock data)' : ''}`,
      taskCount: tasks.length,
      path: todoPath,
      usedMockData
    });
  } catch (error) {
    console.error('Error syncing tasks to MD:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;