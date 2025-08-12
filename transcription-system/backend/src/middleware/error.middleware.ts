import { Request, Response, NextFunction } from 'express';

// Error interface for structured error responses
export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

// Global error handling middleware
export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'שגיאה פנימית בשרת';
  
  // Log error for debugging (in production, you'd use a proper logging service)
  console.error('API Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'נתונים לא תקינים';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token לא תקין';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token פג תוקף';
  } else if (err.name === 'MongoError' && err.message.includes('duplicate')) {
    statusCode = 409;
    message = 'רשומה כבר קיימת במערכת';
  }

  // Don't leak sensitive information in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(statusCode).json({
    success: false,
    message: message,
    ...(isDevelopment && {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method
    })
  });
};

// Async error wrapper - catches async errors and passes them to error handler
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler for unmatched routes
export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`נתיב לא נמצא - ${req.originalUrl}`) as ApiError;
  error.statusCode = 404;
  next(error);
};

// Custom error creator
export const createError = (message: string, statusCode: number = 500): ApiError => {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};