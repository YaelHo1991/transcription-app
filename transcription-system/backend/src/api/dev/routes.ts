import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../../db/connection';
import { developmentHTML } from '../../dev-tools/development-html';
import shortcutsAdminRoutes from './shortcuts-admin-routes';

const router = Router();

// Dev tools main page - serve HTML
router.get('/', (req, res) => {
  res.send(developmentHTML);
});

// Mount shortcuts admin routes
router.use('/admin', shortcutsAdminRoutes);

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
        u.personal_company,
        u.created_at,
        u.transcriber_code,
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
      GROUP BY u.id, u.username, u.full_name, u.email, u.personal_company, u.created_at, u.transcriber_code
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
        permissions: user.licenses.map((l: any) => l.permissions).join(''),
        is_admin: user.licenses.some((l: any) => l.permissions.includes('A')),
        transcriber_code: user.transcriber_code || null, // Use actual transcriber_code from database
        created_at: user.created_at,
        last_login: null,
        personal_company: user.personal_company,
        licenses: user.licenses,
        plain_password: passwordHint, // Add password hint for dev tools
        password_hint: passwordHint
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
router.delete('/users/:id', async (req: Request, res: Response) => {
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

export default router;