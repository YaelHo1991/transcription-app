import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-a8f3c9e6b2d7f4e1a9c6b8e3f2a7d5c8e9b4f7a2c6e1d8b5f9c3a7e4b2d6f8c5';

// Extended Request interface to include user data
export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    email?: string;
    permissions: string;
    is_admin?: boolean;
  };
}

// Authentication middleware - verifies JWT token
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'נדרשת הזדהות - אין token'
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer '

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      id: decoded.id,
      username: decoded.username,
      permissions: decoded.permissions,
      is_admin: decoded.is_admin || false
    };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token לא תקין'
    });
  }
};

// Permission-based middleware - checks if user has required permission
export const requirePermission = (requiredPermission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'נדרשת הזדהות'
      });
    }

    if (!req.user.permissions.includes(requiredPermission)) {
      return res.status(403).json({
        success: false,
        message: `אין הרשאה לפעולה זו - נדרשת הרשאה ${requiredPermission}`,
        userPermissions: req.user.permissions,
        requiredPermission: requiredPermission
      });
    }

    next();
  };
};

// Multiple permissions middleware - user needs ANY of the specified permissions
export const requireAnyPermission = (permissions: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'נדרשת הזדהות'
      });
    }

    const hasPermission = permissions.some(permission => 
      req.user!.permissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `אין הרשאה לפעולה זו - נדרשת אחת מההרשאות: ${permissions.join(', ')}`,
        userPermissions: req.user.permissions,
        requiredPermissions: permissions
      });
    }

    next();
  };
};

// Admin-only middleware - requires full permissions (ABCDEF)
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'נדרשת הזדהות'
    });
  }

  if (req.user.permissions !== 'ABCDEF') {
    return res.status(403).json({
      success: false,
      message: 'נדרשות הרשאות מנהל',
      userPermissions: req.user.permissions
    });
  }

  next();
};

// Admin flag middleware - checks is_admin column
export const requireAdminFlag = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'נדרשת הזדהות'
    });
  }

  if (!req.user.is_admin) {
    return res.status(403).json({
      success: false,
      message: 'נדרשות הרשאות מנהל מערכת'
    });
  }

  next();
};

// Specific admin users middleware - for extra security (both environments)
const ADMIN_USER_IDS = [
  // Production IDs
  '3134f67b-db84-4d58-801e-6b2f5da0f6a3', // יעל הורי (production)
  '21c6c05f-cb60-47f3-b5f2-b9ada3631345', // ליאת בן שי (production)
  // Local development IDs
  'bfc0ba9a-daae-46e2-acb9-5984d1adef9f', // יעל הורי (local)
  '6bdc1c02-fa65-4ef0-868b-928ec807b2ba'  // ליאת בן שי (local)
];

export const requireSpecificAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'נדרשת הזדהות'
    });
  }

  if (!ADMIN_USER_IDS.includes(req.user.id)) {
    return res.status(403).json({
      success: false,
      message: 'אין הרשאת גישה'
    });
  }

  next();
};