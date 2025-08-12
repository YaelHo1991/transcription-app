import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

// Extended Request interface to include user data
export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    permissions: string;
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
      permissions: decoded.permissions
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