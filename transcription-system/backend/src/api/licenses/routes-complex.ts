import { Router, Request, Response } from 'express';
import { authenticateToken, requirePermission, AuthRequest } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../middleware/error.middleware';
import bcrypt from 'bcryptjs';

const router = Router();

// Import the existing database connection
import { db } from '../../db/connection';

// Initialize/update database tables
async function initializeTables() {
  try {
    // Add missing columns to existing users table if they don't exist
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS personal_company VARCHAR(255),
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS transcriber_code VARCHAR(50)
    `).catch(() => {
      // Column might already exist, ignore error
    });

    // Update licenses table to match new structure
    await db.query(`
      ALTER TABLE licenses 
      ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'
    `).catch(() => {
      // Column might already exist, ignore error
    });

    // console.log removed for production
  } catch (error) {
    console.error('❌ Error updating database tables:', error);
  }
}

// Initialize tables on module load
initializeTables();

// GET /api/licenses/stats - Get statistics for the license page
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  try {
    // Return mock stats for now - will connect to real DB later
    const stats = {
      totalUsers: '50+',
      companies: '15+', 
      transcribers: '30+',
      projects: '200+'
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting license stats:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשליפת נתונים סטטיסטיים'
    });
  }
}));

// GET /api/licenses/users - Get all users for dev tools
router.get('/users', asyncHandler(async (req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT 
        u.id,
        u.username,
        u.full_name,
        u.email,
        u.personal_company,
        u.permissions,
        u.created_at,
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
      GROUP BY u.id, u.username, u.full_name, u.email, u.personal_company, u.permissions, u.created_at
      ORDER BY u.created_at DESC
    `);

    res.json({
      success: true,
      users: result.rows
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשליפת נתוני משתמשים'
    });
  }
}));

// GET /api/licenses - Get available license types (public route)
router.get('/types', asyncHandler(async (req: Request, res: Response) => {
  const licenseTypes = [
    {
      type: 'CRM_BASIC',
      name: 'CRM בסיסי',
      description: 'ניהול לקוחות ועבודות',
      permissions: 'AB',
      price: 299,
      features: ['ניהול לקוחות', 'ניהול עבודות']
    },
    {
      type: 'CRM_ADVANCED',
      name: 'CRM מתקדם',
      description: 'CRM מלא כולל ניהול מתמללים',
      permissions: 'ABC',
      price: 399,
      features: ['ניהול לקוחות', 'ניהול עבודות', 'ניהול מתמללים']
    },
    {
      type: 'TRANSCRIPTION_BASIC',
      name: 'תמלול בסיסי',
      description: 'תמלול והגהה',
      permissions: 'DE',
      price: 399,
      features: ['תמלול', 'הגהה']
    },
    {
      type: 'TRANSCRIPTION_PRO',
      name: 'תמלול מקצועי',
      description: 'תמלול מלא כולל ייצוא',
      permissions: 'DEF',
      price: 499,
      features: ['תמלול', 'הגהה', 'ייצוא מתקדם']
    },
    {
      type: 'COMPLETE_SYSTEM',
      name: 'מערכת מלאה',
      description: 'גישה מלאה לכל המערכות',
      permissions: 'ABCDEF',
      price: 799,
      features: ['כל הפיצ\'רים', 'תמיכה מלאה', 'עדכונים חינם']
    }
  ];

  res.json({
    success: true,
    licenseTypes
  });
}));

// Purchase route will be handled by routes.ts

// Test endpoint
router.get('/test', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Test endpoint working' });
});

// OLD POST /api/licenses/purchase - DISABLED
router.post('/purchase-old-disabled', async (req: Request, res: Response) => {
  // Test immediate response
  return res.json({
    success: false,
    message: 'Test response - endpoint reached',
    body: req.body
  });
  
  try {
    // Immediate response to test if endpoint is reached
    if (!req.body) {
      return res.status(400).json({
        success: false,
        message: 'No body received'
      });
    }
    
    const { fullName, email, personalCompany, permissions, totalAmount } = req.body;

    // Validation
    if (!fullName || !email || !permissions || !totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'חובה למלא את כל השדות הנדרשים'
      });
    }

    if (!Array.isArray(permissions) || permissions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'חובה לבחור לפחות הרשאה אחת'
      });
    }

    // Validate permissions are from allowed set
    const validPermissions = ['A', 'B', 'C', 'D', 'E', 'F'];
    const invalidPerms = permissions.filter(p => !validPermissions.includes(p));
    if (invalidPerms.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'הרשאות לא תקינות נבחרו'
      });
    }

    // First add missing columns if they don't exist
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS personal_company VARCHAR(255)
    `).catch(() => {});
    
    await db.query(`
      ALTER TABLE licenses 
      ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'
    `).catch(() => {});

    // Start transaction
    const client = await db.connect();
    await client.query('BEGIN');

    try {
      // Check if user exists by email
      const existingUser = await client.query('SELECT * FROM users WHERE email = $1', [email]);
      
      let userId;
      if (existingUser.rows.length > 0) {
        // Update existing user
        const updateResult = await client.query(
          'UPDATE users SET full_name = $1, personal_company = $2 WHERE email = $3 RETURNING id',
          [fullName, personalCompany || null, email]
        );
        userId = updateResult.rows[0].id;
      } else {
        // Create new user with a username based on email
        const username = email.split('@')[0] + '_' + Date.now();
        const password = await bcrypt.hash('temp_' + Date.now(), 10); // Temporary password
        const insertResult = await client.query(
          'INSERT INTO users (username, password, email, full_name, personal_company, permissions) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
          [username, password, email, fullName, personalCompany || null, permissions.join('')]
        );
        userId = insertResult.rows[0].id;
      }

      // Generate license key
      const licenseKey = `LIC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Create license record
      const license = await client.query(
        'INSERT INTO licenses (user_id, license_key, type, permissions, total_amount, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [userId, licenseKey, 'CUSTOM', permissions.join(''), totalAmount, 'pending']
      );

      // Commit transaction
      await client.query('COMMIT');
      client.release();

      // console.log removed for production}]`);

      res.json({
        success: true,
        message: 'רכישת הרישיון נשלחה בהצלחה! נחזור אליך בהקדם.',
        licenseId: license.rows[0].id,
        userId: userId
      });

    } catch (error) {
      // Rollback transaction
      await client.query('ROLLBACK');
      client.release();
      throw error;
    }

  } catch (error: any) {
    console.error('Error processing license purchase:', error);
    console.error('Stack trace:', error.stack);
    
    const errorMessage = error.message || 'Unknown error';
    const errorCode = error.code || 'UNKNOWN';
    
    if (error.code === '23505') {
      res.status(400).json({
        success: false,
        message: 'כתובת האימייל כבר קיימת במערכת'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'שגיאה בעיבוד הרכישה. נסו שוב מאוחר יותר.',
        error: `${errorCode}: ${errorMessage}`,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
});

// Protected routes below - require authentication
router.use(authenticateToken);

// GET /api/licenses/my - Get user's licenses
router.get('/my', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.query(
      'SELECT * FROM licenses WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user!.id]
    );
    
    res.json({
      success: true,
      licenses: result.rows
    });
  } catch (error) {
    console.error('Error getting user licenses:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשליפת רישיונות המשתמש'
    });
  }
}));

// GET /api/licenses/:id - Get specific license details
router.get('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  
  try {
    const result = await db.query(
      'SELECT l.*, u.full_name, u.email FROM licenses l JOIN users u ON l.user_id = u.id WHERE l.id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'רישיון לא נמצא'
      });
    }

    const license = result.rows[0];

    // Check if user owns this license or is admin
    if (license.user_id !== parseInt(req.user!.id) && req.user!.permissions !== 'ABCDEF') {
      return res.status(403).json({
        success: false,
        message: 'אין הרשאה לצפות ברישיון זה'
      });
    }

    res.json({
      success: true,
      license
    });
  } catch (error) {
    console.error('Error getting license:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשליפת הרישיון'
    });
  }
}));

// GET /api/licenses/admin/all - Admin only: get all licenses
router.get('/admin/all', requirePermission('A'), asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.query(`
      SELECT l.*, u.full_name, u.email, u.personal_company 
      FROM licenses l 
      JOIN users u ON l.user_id = u.id 
      ORDER BY l.created_at DESC
    `);
    
    res.json({
      success: true,
      licenses: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error getting all licenses:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשליפת כל הרישיונות'
    });
  }
}));

export default router;