import { Router } from 'express';
import { authenticateToken, requireAdminFlag, requireSpecificAdmin, AuthRequest } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../middleware/error.middleware';
import { db } from '../../db/connection';

const router = Router();

// All admin routes require authentication
router.use(authenticateToken);

// Use requireSpecificAdmin for maximum security (only יעל and ליאת)
// Or use requireAdminFlag to check is_admin column
router.use(requireSpecificAdmin);

// GET /api/admin/users - Get all users (no passwords)
router.get('/users', asyncHandler(async (req: AuthRequest, res) => {
  const users = await db.query(
    `SELECT 
      id, 
      email, 
      full_name, 
      permissions, 
      is_admin,
      transcriber_code,
      created_at,
      last_login
    FROM users 
    ORDER BY created_at DESC`
  );

  res.json({
    success: true,
    users: users.rows,
    total: users.rowCount
  });
}));

// GET /api/admin/stats - Get system statistics
router.get('/stats', asyncHandler(async (req: AuthRequest, res) => {
  const [
    totalUsers,
    adminUsers,
    crmUsers,
    transcribers,
    systemShortcuts,
    userShortcuts
  ] = await Promise.all([
    db.query('SELECT COUNT(*) FROM users'),
    db.query('SELECT COUNT(*) FROM users WHERE is_admin = true'),
    db.query("SELECT COUNT(*) FROM users WHERE permissions LIKE '%A%' OR permissions LIKE '%B%' OR permissions LIKE '%C%'"),
    db.query("SELECT COUNT(*) FROM users WHERE permissions LIKE '%D%' OR permissions LIKE '%E%' OR permissions LIKE '%F%'"),
    db.query('SELECT COUNT(*) FROM system_shortcuts'),
    db.query('SELECT COUNT(*) FROM user_shortcuts')
  ]);

  res.json({
    success: true,
    stats: {
      totalUsers: parseInt(totalUsers.rows[0].count),
      adminUsers: parseInt(adminUsers.rows[0].count),
      crmUsers: parseInt(crmUsers.rows[0].count),
      transcribers: parseInt(transcribers.rows[0].count),
      systemShortcuts: parseInt(systemShortcuts.rows[0].count),
      userShortcuts: parseInt(userShortcuts.rows[0].count),
      timestamp: new Date()
    }
  });
}));

// GET /api/admin/system - Get system information
router.get('/system', asyncHandler(async (req: AuthRequest, res) => {
  const dbStatus = await db.query('SELECT NOW() as time, current_database() as database');
  
  res.json({
    success: true,
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: {
        connected: true,
        database: dbStatus.rows[0].database,
        time: dbStatus.rows[0].time
      },
      environment: process.env.NODE_ENV || 'development'
    }
  });
}));

// POST /api/admin/user/:id/admin - Toggle admin status
router.post('/user/:id/admin', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { is_admin } = req.body;

  const result = await db.query(
    'UPDATE users SET is_admin = $1 WHERE id = $2 RETURNING id, email, is_admin',
    [is_admin, id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({
      success: false,
      message: 'משתמש לא נמצא'
    });
  }

  // Log admin action
  // console.log removed for production

  res.json({
    success: true,
    user: result.rows[0]
  });
}));

// GET /api/admin/shortcuts - Get all system shortcuts with stats
router.get('/shortcuts', asyncHandler(async (req: AuthRequest, res) => {
  const shortcuts = await db.query(`
    SELECT 
      ss.*,
      sc.name as category_name,
      sc.description as category_description,
      COUNT(sus.id) as usage_count
    FROM system_shortcuts ss
    LEFT JOIN shortcut_categories sc ON ss.category_id = sc.id
    LEFT JOIN shortcut_usage_stats sus ON sus.shortcut_id = ss.id
    GROUP BY ss.id, sc.id
    ORDER BY ss.category_id, ss.shortcut
  `);

  const categories = await db.query(
    'SELECT * FROM shortcut_categories ORDER BY display_order'
  );

  res.json({
    success: true,
    shortcuts: shortcuts.rows,
    categories: categories.rows
  });
}));

// POST /api/admin/shortcuts - Create new system shortcut
router.post('/shortcuts', asyncHandler(async (req: AuthRequest, res) => {
  const { shortcut, expansion, category_id, description } = req.body;

  if (!shortcut || !expansion) {
    return res.status(400).json({
      success: false,
      message: 'קיצור והרחבה הם שדות חובה'
    });
  }

  const result = await db.query(
    `INSERT INTO system_shortcuts (shortcut, expansion, category_id, description)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [shortcut, expansion, category_id, description]
  );

  res.json({
    success: true,
    shortcut: result.rows[0]
  });
}));

// PUT /api/admin/shortcuts/:id - Update system shortcut
router.put('/shortcuts/:id', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { shortcut, expansion, category_id, description } = req.body;

  const result = await db.query(
    `UPDATE system_shortcuts 
     SET shortcut = $1, expansion = $2, category_id = $3, description = $4, updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [shortcut, expansion, category_id, description, id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({
      success: false,
      message: 'קיצור לא נמצא'
    });
  }

  res.json({
    success: true,
    shortcut: result.rows[0]
  });
}));

// DELETE /api/admin/shortcuts/:id - Delete system shortcut
router.delete('/shortcuts/:id', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;

  const result = await db.query(
    'DELETE FROM system_shortcuts WHERE id = $1 RETURNING shortcut',
    [id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({
      success: false,
      message: 'קיצור לא נמצא'
    });
  }

  res.json({
    success: true,
    deleted: result.rows[0].shortcut
  });
}));

export default router;