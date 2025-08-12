import { Router, Request, Response } from 'express';
import { authenticateToken, requirePermission, AuthRequest } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../middleware/error.middleware';
import bcrypt from 'bcryptjs';
import { db } from '../../db/connection';

const router = Router();

// GET /api/licenses/stats - Get statistics for the license page
router.get('/stats', (req: Request, res: Response) => {
  res.json({
    success: true,
    stats: {
      totalUsers: '50+',
      companies: '15+', 
      transcribers: '30+',
      projects: '200+'
    }
  });
});

// POST /api/licenses/purchase - Purchase a license (public route)
router.post('/purchase', async (req: Request, res: Response) => {
  try {
    const { fullName, email, password, personalCompany, permissions, totalAmount } = req.body;

    // Validation
    if (!fullName || !email || !password || !permissions || !totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'חובה למלא את כל השדות הנדרשים'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'הסיסמה חייבת להכיל לפחות 6 תווים'
      });
    }

    if (!Array.isArray(permissions) || permissions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'חובה לבחור לפחות הרשאה אחת'
      });
    }

    // Add missing columns if they don't exist
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
    
    try {
      await client.query('BEGIN');

      // Check if user exists by email
      const existingUser = await client.query('SELECT * FROM users WHERE email = $1', [email]);
      
      let userId;
      if (existingUser.rows.length > 0) {
        // Update existing user
        const user = existingUser.rows[0];
        userId = user.id;
        
        // Check if user needs a transcriber code
        const hasTranscriptionPerms = permissions.some(p => ['D', 'E', 'F'].includes(p));
        if (hasTranscriptionPerms && !user.transcriber_code) {
          const transcriberCode = 'TRN-' + Math.floor(1000 + Math.random() * 9000);
          await client.query(
            'UPDATE users SET full_name = $1, personal_company = $2, transcriber_code = $3 WHERE id = $4',
            [fullName, personalCompany || null, transcriberCode, userId]
          );
          console.log(`Generated transcriber code ${transcriberCode} for existing user ${email}`);
        } else {
          await client.query(
            'UPDATE users SET full_name = $1, personal_company = $2 WHERE id = $3',
            [fullName, personalCompany || null, userId]
          );
        }
      } else {
        // Create new user
        const username = email.split('@')[0] + '_' + Date.now();
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Generate transcriber code if user has D, E, or F permissions
        let transcriberCode = null;
        const hasTranscriptionPerms = permissions.some(p => ['D', 'E', 'F'].includes(p));
        if (hasTranscriptionPerms) {
          transcriberCode = 'TRN-' + Math.floor(1000 + Math.random() * 9000);
        }
        
        const insertResult = await client.query(
          'INSERT INTO users (username, password, email, full_name, personal_company, permissions, transcriber_code) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, transcriber_code',
          [username, hashedPassword, email, fullName, personalCompany || null, permissions.join(''), transcriberCode]
        );
        userId = insertResult.rows[0].id;
        
        if (transcriberCode) {
          console.log(`Generated transcriber code ${transcriberCode} for ${email}`);
        }
      }

      // Generate license key
      const licenseKey = `LIC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Create license record
      await client.query(
        'INSERT INTO licenses (user_id, license_key, type, permissions, total_amount, status) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, licenseKey, 'CUSTOM', permissions.join(''), totalAmount, 'pending']
      );

      // Commit transaction
      await client.query('COMMIT');
      console.log(`✅ License purchased for ${email}, user ID: ${userId}`);
    } catch (innerError) {
      await client.query('ROLLBACK');
      throw innerError;
    } finally {
      client.release();
    }

    res.json({
      success: true,
      message: 'רכישת הרישיון נשלחה בהצלחה! נחזור אליך בהקדם.'
    });

  } catch (error: any) {
    console.error('Purchase error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    
    // If transaction is in progress, rollback
    if (error.message?.includes('client')) {
      try {
        const client = await db.connect();
        await client.query('ROLLBACK');
        client.release();
      } catch (rollbackError) {
        console.error('Rollback error:', rollbackError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'שגיאה בעיבוד הרכישה. נסו שוב מאוחר יותר.'
    });
  }
});

export default router;