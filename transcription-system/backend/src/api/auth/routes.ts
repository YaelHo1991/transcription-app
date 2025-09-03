import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { loginRateLimiter } from '../../middleware/security.middleware';
import { UserModel } from '../../models/user.model';
import { emailService } from '../../services/email.service';
import { authenticateToken, AuthRequest } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../middleware/error.middleware';
import { db } from '../../db/connection';
import storageService from '../../services/storageService';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-a8f3c9e6b2d7f4e1a9c6b8e3f2a7d5c8e9b4f7a2c6e1d8b5f9c3a7e4b2d6f8c5';

// Helper function to create JWT token
function createToken(user: any) {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username,
      permissions: user.permissions,
      is_admin: user.is_admin || false
    }, 
    JWT_SECRET, 
    { expiresIn: '24h' }
  );
}

// Helper function to create user response (without password)
function createUserResponse(user: any) {
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

// POST /api/auth/login - User login with rate limiting (supports both email and username)
router.post('/login', loginRateLimiter, async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const loginId = email || username; // Support both email and username login

    // Input validation
    if (!loginId || !password) {
      return res.status(400).json({
        success: false,
        message: 'כתובת אימייל וסיסמה נדרשים',
        error: 'כתובת אימייל וסיסמה נדרשים'
      });
    }

    // Basic sanitization and validation
    if (typeof loginId !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'נתונים לא תקינים',
        error: 'נתונים לא תקינים'
      });
    }

    // Email validation if email is provided
    if (email && !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'כתובת אימייל לא תקינה',
        error: 'כתובת אימייל לא תקינה'
      });
    }

    if (password.length < 3 || password.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'סיסמה חייבת להיות באורך 3-100 תווים',
        error: 'סיסמה חייבת להיות באורך 3-100 תווים'
      });
    }

    // Find user in database - try email first, then username
    let user = null;
    if (email) {
      user = await UserModel.findByEmail(email);
    }
    if (!user && username) {
      user = await UserModel.findByUsername(username);
    }
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'כתובת אימייל או סיסמה שגויים',
        error: 'כתובת אימייל או סיסמה שגויים'
      });
    }

    // Verify password
    const isValidPassword = await UserModel.verifyPassword(user, password);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'כתובת אימייל או סיסמה שגויים',
        error: 'כתובת אימייל או סיסמה שגויים'
      });
    }

    // Update last login in database
    await UserModel.updateLastLogin(user.id);

    // Create token
    const token = createToken(user);

    // Send response with user data
    res.json({
      success: true,
      user: {
        ...createUserResponse(user),
        permissions: user.permissions,
        personal_company: user.personal_company,
        business_company: user.business_company,
        transcriber_code: user.transcriber_code
      },
      token,
      message: 'התחברות בוצעה בהצלחה'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשרת',
      error: 'שגיאה בשרת'
    });
  }
});

// GET /api/auth/verify - Verify token
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token לא נמצא'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Find user in database to get full details
      const user = await UserModel.findById(decoded.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'משתמש לא נמצא'
        });
      }

      res.json({
        success: true,
        user: createUserResponse(user)
      });

    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Token לא תקין'
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'שגיאה בשרת'
    });
  }
});

// POST /api/auth/logout - User logout (client-side mainly)
router.post('/logout', (req, res) => {
  // In a real app, you might want to blacklist the token
  res.json({
    success: true,
    message: 'התנתקות בוצעה בהצלחה'
  });
});

// GET /api/auth/me - Get current user info
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'נדרשת הזדהות'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user = await UserModel.findById(decoded.id);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'משתמש לא נמצא'
        });
      }

      res.json({
        success: true,
        user: createUserResponse(user)
      });

    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Token לא תקין'
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'שגיאה בשרת'
    });
  }
});

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', loginRateLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'נדרש כתובת אימייל'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'כתובת אימייל לא תקינה'
      });
    }

    // Find user by email
    const user = await UserModel.findByEmail(email);
    
    if (!user) {
      // Always return success to prevent email enumeration
      return res.json({
        success: true,
        message: 'אם כתובת האימייל קיימת במערכת, נשלח אליך קישור לאיפוס סיסמה'
      });
    }

    // Generate reset token and expiration (15 minutes)
    const resetToken = UserModel.generateResetToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save token to database
    await UserModel.setResetToken(email, resetToken, expiresAt);

    // Send reset email
    await emailService.sendPasswordResetEmail({
      to: email,
      fullName: user.full_name || user.username,
      resetToken
    });

    res.json({
      success: true,
      message: 'אם כתובת האימייל קיימת במערכת, נשלח אליך קישור לאיפוס סיסמה'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשרת'
    });
  }
});

// GET /api/auth/verify-reset-token - Verify reset token validity
router.get('/verify-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'נדרש טוקן'
      });
    }

    // Find user by token
    const user = await UserModel.findByResetToken(token);
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'טוקן לא תקין או פג תוקף'
      });
    }

    res.json({
      success: true,
      message: 'טוקן תקין',
      email: user.email // Show email for confirmation
    });

  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשרת'
    });
  }
});

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'נדרשים כל השדות'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'הסיסמאות אינן תואמות'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'הסיסמה חייבת להיות באורך 6 תווים לפחות'
      });
    }

    // Find user by token to ensure it's valid
    const user = await UserModel.findByResetToken(token);
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'טוכן לא תקין או פג תוקף'
      });
    }

    // Hash the new password
    const hashedPassword = await UserModel.hashPassword(password);

    // Reset password and clear token
    const success = await UserModel.resetPassword(token, hashedPassword);
    
    if (!success) {
      return res.status(400).json({
        success: false,
        message: 'שגיאה באיפוס הסיסמה'
      });
    }

    res.json({
      success: true,
      message: 'הסיסמה שונתה בהצלחה'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשרת'
    });
  }
});

// GET /api/auth/storage - Get user storage info
router.get('/storage', authenticateToken, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  
  const storageInfo = await storageService.getUserStorage(userId);
  
  // Also get if auto export is enabled  
  const userResult = await db.query(
    'SELECT auto_word_export_enabled FROM users WHERE id = $1',
    [userId]
  );
  const autoExportEnabled = userResult.rows[0]?.auto_word_export_enabled || false;
  
  res.json({
    success: true,
    storage: storageInfo,
    autoExportEnabled
  });
}));

export default router;