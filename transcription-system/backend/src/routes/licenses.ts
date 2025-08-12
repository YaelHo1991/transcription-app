import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

const router = Router();

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'transcription_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'transcription_system',
  password: process.env.DB_PASSWORD || 'transcription_pass',
  port: parseInt(process.env.DB_PORT || '5432'),
});

// Initialize database tables
async function initializeTables() {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        personal_company VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Licenses table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS licenses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        permissions TEXT[] NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database tables:', error);
  }
}

// Initialize tables on module load
initializeTables();

// GET /api/licenses/stats - Get statistics for the license page
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // Get user and license statistics
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    const licenseCount = await pool.query('SELECT COUNT(*) as count FROM licenses');
    const activePermissions = await pool.query(`
      SELECT unnest(permissions) as permission, COUNT(*) as count 
      FROM licenses 
      WHERE status = 'active' 
      GROUP BY permission
    `);

    // Calculate stats
    const totalUsers = parseInt(userCount.rows[0].count) || 0;
    const totalLicenses = parseInt(licenseCount.rows[0].count) || 0;
    
    // Count companies (users with company names)
    const companyCount = await pool.query('SELECT COUNT(*) as count FROM users WHERE personal_company IS NOT NULL AND personal_company != \'\'');
    const totalCompanies = parseInt(companyCount.rows[0].count) || 0;

    // Count transcribers (users with D, E, or F permissions)
    const transcribersCount = await pool.query(`
      SELECT COUNT(DISTINCT user_id) as count 
      FROM licenses 
      WHERE permissions && ARRAY['D', 'E', 'F']
    `);
    const totalTranscribers = parseInt(transcribersCount.rows[0].count) || 0;

    const stats = {
      totalUsers: totalUsers > 0 ? `${totalUsers}+` : '0',
      companies: totalCompanies > 0 ? `${totalCompanies}+` : '0', 
      transcribers: totalTranscribers > 0 ? `${totalTranscribers}+` : '0',
      projects: totalLicenses > 0 ? `${Math.floor(totalLicenses * 1.5)}+` : '0'
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
});

// POST /api/licenses/purchase - Handle license purchase
router.post('/purchase', async (req: Request, res: Response) => {
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

  try {
    // Start transaction
    const client = await pool.connect();
    await client.query('BEGIN');

    try {
      // Check if user exists, if not create one
      let user;
      const existingUser = await client.query('SELECT * FROM users WHERE email = $1', [email]);
      
      if (existingUser.rows.length > 0) {
        // Update existing user
        user = await client.query(
          'UPDATE users SET full_name = $1, personal_company = $2, updated_at = CURRENT_TIMESTAMP WHERE email = $3 RETURNING *',
          [fullName, personalCompany || null, email]
        );
      } else {
        // Create new user
        user = await client.query(
          'INSERT INTO users (full_name, email, personal_company) VALUES ($1, $2, $3) RETURNING *',
          [fullName, email, personalCompany || null]
        );
      }

      const userId = user.rows[0].id;

      // Create license record
      const license = await client.query(
        'INSERT INTO licenses (user_id, permissions, total_amount, status) VALUES ($1, $2, $3, $4) RETURNING *',
        [userId, permissions, totalAmount, 'pending']
      );

      // Commit transaction
      await client.query('COMMIT');
      client.release();

      console.log(`✅ License purchased successfully for user ${email}, Amount: ₪${totalAmount}, Permissions: [${permissions.join(', ')}]`);

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

  } catch (error) {
    console.error('Error processing license purchase:', error);
    
    if (error.code === '23505') {
      res.status(400).json({
        success: false,
        message: 'כתובת האימייל כבר קיימת במערכת'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'שגיאה בעיבוד הרכישה. נסו שוב מאוחר יותר.'
      });
    }
  }
});

// GET /api/licenses/users - Get all users for dev tools
router.get('/users', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.personal_company,
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
      GROUP BY u.id, u.full_name, u.email, u.personal_company, u.created_at
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
});

export default router;