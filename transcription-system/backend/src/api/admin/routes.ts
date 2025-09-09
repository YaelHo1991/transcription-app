import { Router } from 'express';
import { authenticateToken, requireAdminFlag, requireSpecificAdmin, AuthRequest } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../middleware/error.middleware';
import { db } from '../../db/connection';
import jwt from 'jsonwebtoken';
import storageService from '../../services/storageService';
import { backgroundJobService } from '../../services/backgroundJobs';

const router = Router();

// All admin routes require authentication
router.use(authenticateToken);

// Use requireSpecificAdmin for maximum security (only יעל and ליאת)
// Or use requireAdminFlag to check is_admin column
router.use(requireSpecificAdmin);

// GET /api/admin/users - Get all users (simplified for now)
router.get('/users', asyncHandler(async (req: AuthRequest, res) => {
  try {
    const users = await db.query(
      `SELECT 
        u.id, 
        u.username,
        u.email, 
        u.full_name, 
        u.permissions, 
        u.is_admin,
        u.transcriber_code,
        u.created_at,
        u.last_login,
        u.password,
        u.auto_word_export_enabled
      FROM users u
      ORDER BY u.created_at DESC`
    );

    // Get system storage info (simplified)
    let systemStorage = null;
    let totalStats = null;
    
    try {
      systemStorage = await storageService.getSystemStorage();
      totalStats = await storageService.getTotalStorageStats();
    } catch (storageError) {
      console.log('Storage info unavailable:', storageError.message);
    }

    // Get storage data for all users
    const usersWithStorage = await Promise.all(
      users.rows.map(async (user) => {
        try {
          const storageInfo = await storageService.getUserStorage(user.id);
          const result = {
            ...user,
            auto_word_export_enabled: user.auto_word_export_enabled || false,
            quota_limit_mb: storageInfo.quotaLimitMB,
            quota_used_mb: storageInfo.quotaUsedMB
          };
          console.log(`[AdminUsers] User ${user.id} auto_word_export_enabled:`, user.auto_word_export_enabled, '-> final:', result.auto_word_export_enabled);
          return result;
        } catch (error) {
          console.error(`Error getting storage for user ${user.id}:`, error);
          return {
            ...user,
            auto_word_export_enabled: false, // Default false
            quota_limit_mb: 500, // Default 500MB
            quota_used_mb: 0     // Default 0MB used
          };
        }
      })
    );

    res.json({
      success: true,
      users: usersWithStorage,
      total: users.rowCount,
      systemStorage,
      totalStats
    });
  } catch (error) {
    console.error('Admin users API error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בטעינת משתמשים'
    });
  }
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

// POST /api/admin/impersonate - Generate token for another user (admin only)
router.post('/impersonate', asyncHandler(async (req: AuthRequest, res) => {
  const { userId, email } = req.body;
  
  // Get the target user
  const userResult = await db.query(
    'SELECT id, email, full_name, permissions, is_admin FROM users WHERE id = $1',
    [userId]
  );

  if (userResult.rowCount === 0) {
    return res.status(404).json({
      success: false,
      message: 'משתמש לא נמצא'
    });
  }

  const targetUser = userResult.rows[0];
  
  // Generate a token for the target user
  const token = jwt.sign(
    { 
      id: targetUser.id,
      userId: targetUser.id,
      email: targetUser.email,
      permissions: targetUser.permissions,
      is_admin: targetUser.is_admin,
      impersonated_by: req.user?.id,
      impersonated_at: new Date().toISOString()
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );

  res.json({
    success: true,
    token,
    user: {
      id: targetUser.id,
      email: targetUser.email,
      full_name: targetUser.full_name,
      permissions: targetUser.permissions,
      is_admin: targetUser.is_admin
    }
  });
}));

// PUT /api/admin/user/:id/storage-quota - Update user storage quota
router.put('/user/:id/storage-quota', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { quotaMB } = req.body;

  if (!quotaMB || quotaMB < 0) {
    return res.status(400).json({
      success: false,
      message: 'נדרש ערך חיובי למכסת אחסון'
    });
  }

  await storageService.updateUserQuota(id, quotaMB);

  res.json({
    success: true,
    message: 'מכסת האחסון עודכנה בהצלחה'
  });
}));

// POST /api/admin/user/:id/auto-export - Toggle auto Word export
router.post('/user/:id/auto-export', requireAdminFlag, asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { enabled } = req.body;

  console.log(`[AutoExport] Updating user ${id} to enabled=${enabled}`);

  const result = await db.query(
    'UPDATE users SET auto_word_export_enabled = $1 WHERE id = $2 RETURNING id, auto_word_export_enabled',
    [enabled, id]
  );

  console.log(`[AutoExport] Update result:`, result.rows[0]);

  if (result.rowCount === 0) {
    return res.status(404).json({
      success: false,
      message: 'משתמש לא נמצא'
    });
  }

  res.json({
    success: true,
    user: result.rows[0],
    message: 'הגדרות הייצוא האוטומטי עודכנו בהצלחה'
  });
}));

// GET /api/admin/storage/system - Get system storage info
router.get('/storage/system', asyncHandler(async (req: AuthRequest, res) => {
  const systemStorage = await storageService.getSystemStorage();
  
  res.json({
    success: true,
    storage: systemStorage
  });
}));

// GET /api/admin/storage/users - Get all users storage info
router.get('/storage/users', asyncHandler(async (req: AuthRequest, res) => {
  const usersStorage = await storageService.getAllUsersStorage();
  
  res.json({
    success: true,
    storage: usersStorage
  });
}));

// POST /api/admin/storage/clear-user - Clear storage for a specific user
router.post('/storage/clear-user', asyncHandler(async (req: AuthRequest, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'חסר מזהה משתמש'
    });
  }

  try {
    const result = await storageService.clearUserStorage(userId);
    
    res.json({
      success: true,
      filesDeleted: result.filesDeleted,
      bytesFreed: result.bytesFreed,
      message: `אחסון המשתמש נמחק בהצלחה. ${result.filesDeleted} קבצים נמחקו.`
    });
  } catch (error) {
    console.error('Error clearing user storage:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה במחיקת אחסון המשתמש'
    });
  }
}));

// POST /api/admin/storage/clear-all - Clear storage for all users (DANGER!)
router.post('/storage/clear-all', asyncHandler(async (req: AuthRequest, res) => {
  try {
    const result = await storageService.clearAllUsersStorage();
    
    res.json({
      success: true,
      totalFilesDeleted: result.totalFilesDeleted,
      totalBytesFreed: result.totalBytesFreed,
      usersCleared: result.usersCleared,
      message: `כל האחסון נמחק בהצלחה. ${result.totalFilesDeleted} קבצים נמחקו מ-${result.usersCleared} משתמשים.`
    });
  } catch (error) {
    console.error('Error clearing all storage:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה במחיקת כל האחסון'
    });
  }
}));

/**
 * Get performance monitoring data
 */
router.get('/performance', asyncHandler(async (req: AuthRequest, res) => {
  const jobStats = backgroundJobService.getStats();
  
  // Get system performance info
  const systemStorage = await storageService.getSystemStorage();
  const totalStorageStats = await storageService.getTotalStorageStats();
  
  // Calculate cache efficiency (rough estimate)
  const cacheStats = {
    storageCache: 'Active', // storageService has internal caching
    backgroundJobs: jobStats
  };
  
  res.json({
    success: true,
    performance: {
      system: systemStorage,
      storage: totalStorageStats,
      cache: cacheStats,
      backgroundJobs: jobStats,
      optimizations: {
        storageCaching: 'Enabled - 5min TTL with background refresh',
        audioParsingSkipped: 'Enabled - Background jobs only',
        errorHandling: 'Enhanced - Graceful fallbacks',
        backgroundJobs: `${jobStats.pending} pending, ${jobStats.running} running`
      }
    }
  });
}));

/**
 * Force refresh storage for a specific user (admin tool)
 */
router.post('/refresh-storage/:userId', asyncHandler(async (req: AuthRequest, res) => {
  const { userId } = req.params;
  
  console.log(`[Admin] Force refreshing storage for user: ${userId}`);
  const storageInfo = await storageService.forceRefreshUserStorage(userId);
  
  res.json({
    success: true,
    message: `Storage refreshed for user ${userId}`,
    storage: storageInfo
  });
}));

/**
 * Queue background job (admin tool)
 */
router.post('/queue-job', asyncHandler(async (req: AuthRequest, res) => {
  const { type, userId } = req.body;
  
  let jobId;
  if (type === 'storage_calculation') {
    jobId = backgroundJobService.queueStorageCalculation(userId);
  } else {
    return res.status(400).json({ error: 'Invalid job type. Use: storage_calculation' });
  }
  
  res.json({
    success: true,
    jobId,
    message: `Queued ${type} job for user ${userId}`
  });
}));

export default router;