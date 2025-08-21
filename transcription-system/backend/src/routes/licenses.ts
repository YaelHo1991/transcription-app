import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { emailService } from '../services/email.service';

const router = Router();

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'transcription_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'transcription_system',
  password: process.env.DB_PASSWORD || 'transcription_pass',
  port: parseInt(process.env.DB_PORT || '5432'),
});

// Function to generate secure random password
function generatePassword(): string {
  const uppercaseLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercaseLetters = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%';
  
  // Ensure at least one of each type
  let password = '';
  password += uppercaseLetters[Math.floor(Math.random() * uppercaseLetters.length)];
  password += lowercaseLetters[Math.floor(Math.random() * lowercaseLetters.length)];
  password += lowercaseLetters[Math.floor(Math.random() * lowercaseLetters.length)];
  password += lowercaseLetters[Math.floor(Math.random() * lowercaseLetters.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Function to generate transcriber code
function generateTranscriberCode(): string {
  const randomNum = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
  return `TRN-${randomNum}`;
}

// Initialize database tables
async function initializeTables() {
  try {
    // First check if tables exist and add columns if needed
    try {
      // Add plain_password column to users table if it doesn't exist
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS plain_password VARCHAR(255)
      `);
      
      // Add username column if it doesn't exist
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS username VARCHAR(100)
      `);
      
      // Add password column if it doesn't exist
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS password VARCHAR(255)
      `);
      
      // Add permissions column if it doesn't exist
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS permissions VARCHAR(10) DEFAULT ''
      `);
      
      // Add transcriber_code column if it doesn't exist
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS transcriber_code VARCHAR(20)
      `);
      
      // Add last_login column if it doesn't exist
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS last_login TIMESTAMP
      `);
      
      // Add is_active column if it doesn't exist
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true
      `);
      
      console.log('✅ User table columns updated successfully');
    } catch (alterError) {
      // Table might not exist, create it
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(100),
          password VARCHAR(255),
          full_name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          permissions VARCHAR(10) DEFAULT '',
          personal_company VARCHAR(255),
          transcriber_code VARCHAR(20),
          plain_password VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_login TIMESTAMP,
          is_active BOOLEAN DEFAULT true
        )
      `);
    }

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
    const totalUsers = parseInt(userCount.rows[0]?.count) || 0;
    const totalLicenses = parseInt(licenseCount.rows[0]?.count) || 0;
    
    // Count companies (users with company names)
    const companyCount = await pool.query('SELECT COUNT(*) as count FROM users WHERE personal_company IS NOT NULL AND personal_company != \'\'');
    const totalCompanies = parseInt(companyCount.rows[0]?.count) || 0;

    // Count transcribers (users with D, E, or F permissions)
    const transcribersCount = await pool.query(`
      SELECT COUNT(DISTINCT user_id) as count 
      FROM licenses 
      WHERE permissions && ARRAY['D', 'E', 'F']
    `);
    const totalTranscribers = parseInt(transcribersCount.rows[0]?.count) || 0;

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

// POST /api/licenses/purchase - Handle license purchase with auto-generated password
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
    // Generate password
    const plainPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    // Generate username from email
    const username = email.split('@')[0];
    
    // Generate transcriber code if user has transcription permissions
    const hasTranscriptionPerms = permissions.some(p => ['D', 'E', 'F'].includes(p));
    const transcriberCode = hasTranscriptionPerms ? generateTranscriberCode() : null;
    
    // Join permissions into string format
    const permissionsString = permissions.sort().join('');

    // Start transaction
    const client = await pool.connect();
    await client.query('BEGIN');

    try {
      // Check if user exists
      const existingUser = await client.query('SELECT * FROM users WHERE email = $1', [email]);
      
      let userId;
      let isNewUser = false;
      
      if (existingUser.rows.length > 0) {
        // Update existing user with new permissions
        const user = await client.query(
          `UPDATE users 
           SET full_name = $1, 
               personal_company = $2, 
               permissions = $3,
               transcriber_code = COALESCE(transcriber_code, $4),
               updated_at = CURRENT_TIMESTAMP 
           WHERE email = $5 
           RETURNING id, transcriber_code`,
          [fullName, personalCompany || null, permissionsString, transcriberCode, email]
        );
        userId = user.rows[0].id;
      } else {
        // Create new user in main users table
        const user = await client.query(
          `INSERT INTO users 
           (username, password, full_name, email, permissions, personal_company, transcriber_code, plain_password, is_active) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true) 
           RETURNING id`,
          [username, hashedPassword, fullName, email, permissionsString, personalCompany || null, transcriberCode, plainPassword]
        );
        userId = user.rows[0].id;
        isNewUser = true;
      }

      // Create license record
      const license = await client.query(
        'INSERT INTO licenses (user_id, permissions, total_amount, status) VALUES ($1, $2, $3, $4) RETURNING *',
        [userId, permissions, totalAmount, 'active'] // Set to active since we're creating user credentials
      );

      // Commit transaction
      await client.query('COMMIT');
      client.release();

      // Send welcome email with credentials (only for new users)
      if (isNewUser) {
        try {
          await emailService.sendWelcomeEmail({
            to: email,
            fullName: fullName,
            password: plainPassword,
            permissions: permissions
          });
          console.log(`📧 Welcome email sent to ${email}`);
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
          // Don't fail the registration if email fails
        }
      }

      console.log(`✅ License purchased successfully for user ${email}`);
      console.log(`   Username: ${username}`);
      console.log(`   Password: ${plainPassword}`);
      console.log(`   Permissions: [${permissions.join(', ')}]`);
      console.log(`   Amount: ₪${totalAmount}`);
      if (transcriberCode) {
        console.log(`   Transcriber Code: ${transcriberCode}`);
      }

      res.json({
        success: true,
        message: isNewUser 
          ? 'רכישת הרישיון הושלמה בהצלחה! פרטי הכניסה נשלחו לאימייל שלך.'
          : 'רכישת הרישיון הושלמה בהצלחה! ההרשאות עודכנו.',
        licenseId: license.rows[0].id,
        userId: userId,
        isNewUser: isNewUser
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
        message: 'שגיאה בעיבוד הרכישה. נסו שוב מאוחר יותר.',
        error: error.message
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
        u.username,
        u.full_name,
        u.email,
        u.permissions,
        u.personal_company,
        u.transcriber_code,
        u.plain_password,
        u.created_at,
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
      GROUP BY u.id, u.username, u.full_name, u.email, u.permissions, 
               u.personal_company, u.transcriber_code, u.plain_password, 
               u.created_at, u.last_login, u.is_active
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