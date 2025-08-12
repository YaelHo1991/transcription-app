import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { loginRateLimiter } from '../../middleware/security.middleware';
import { UserModel } from '../../models/user.model';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-a8f3c9e6b2d7f4e1a9c6b8e3f2a7d5c8e9b4f7a2c6e1d8b5f9c3a7e4b2d6f8c5';

// Helper function to create JWT token
function createToken(user: any) {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username,
      permissions: user.permissions 
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

export default router;