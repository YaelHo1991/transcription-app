import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import { Request, Response, NextFunction } from 'express';

// Rate limiting for login attempts
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Temporarily increased from 5 to 50 for testing
  message: 'יותר מדי ניסיונות התחברות, נסה שוב מאוחר יותר',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  // Use default key generator which handles IPv6 properly
});

// General API rate limiting
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'יותר מדי בקשות, נסה שוב מאוחר יותר',
  standardHeaders: true,
  legacyHeaders: false,
  // Use default key generator which handles IPv6 properly
});

// Strict rate limiting for sensitive operations
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 requests per hour
  message: 'חריגה ממגבלת הבקשות, נסה שוב מאוחר יותר',
  standardHeaders: true,
  legacyHeaders: false,
  // Use default key generator which handles IPv6 properly
});

// Helmet configuration for security headers
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "no-referrer" },
  xssFilter: true,
});

// MongoDB injection protection
export const mongoSanitization = mongoSanitize({
  replaceWith: '_'
});

// SQL injection protection middleware (preparation for when database is added)
export const sqlInjectionProtection = (req: Request, res: Response, next: NextFunction) => {
  const suspiciousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|SCRIPT)\b)/gi,
    /(--|\||;|\/\*|\*\/|xp_|sp_|0x)/gi,
    /(<script|<\/script|javascript:|onerror=|onload=)/gi
  ];

  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(value));
    }
    return false;
  };

  const checkObject = (obj: any): boolean => {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (typeof value === 'object' && value !== null) {
          if (checkObject(value)) return true;
        } else if (checkValue(value)) {
          return true;
        }
      }
    }
    return false;
  };

  // Check request body, query, and params
  if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
    return res.status(400).json({
      success: false,
      message: 'בקשה לא תקינה - תווים חשודים זוהו'
    });
  }

  next();
};

// Request size limiting - reasonable limits to prevent DoS
export const requestSizeLimit = {
  json: '50mb', // 50MB limit for JSON data (enough for large transcriptions)
  urlencoded: { extended: true, limit: '50mb' }
};

// API key validation for sensitive endpoints
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  
  // In production, this should check against database or env variable
  const validApiKey = process.env.API_KEY || 'development-api-key';
  
  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({
      success: false,
      message: 'API key לא תקין או חסר'
    });
  }
  
  next();
};

// IP whitelist middleware (optional)
export const ipWhitelist = (allowedIps: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip || req.socket.remoteAddress || '';
    
    if (process.env.NODE_ENV === 'production' && !allowedIps.includes(clientIp)) {
      return res.status(403).json({
        success: false,
        message: 'גישה נדחתה'
      });
    }
    
    next();
  };
};

// CSRF token validation (for state-changing operations)
export const validateCsrfToken = (req: Request, res: Response, next: NextFunction) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const token = req.headers['x-csrf-token'] || req.body._csrf;
    const sessionToken = (req as any).session?.csrfToken;
    
    if (!token || token !== sessionToken) {
      return res.status(403).json({
        success: false,
        message: 'CSRF token לא תקין'
      });
    }
  }
  
  next();
};