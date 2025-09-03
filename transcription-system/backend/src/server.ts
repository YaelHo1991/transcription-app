import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : '.env.development';

dotenv.config({ 
  path: path.resolve(__dirname, '..', envFile)
});

const app = express();
const PORT = process.env.PORT || 5000;
const isDevelopment = process.env.NODE_ENV?.trim() === 'development' || process.env.ENABLE_DEV_TOOLS === 'true';

// Import security middleware
import { 
  helmetConfig, 
  apiRateLimiter,
  sqlInjectionProtection,
  requestSizeLimit 
} from './middleware/security.middleware';

// Security headers - Apply FIRST
app.use(helmetConfig);

// CORS configuration - More permissive for development and DO
const corsOptions = {
  origin: function (origin: any, callback: any) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3004',
      'http://localhost:3000', 
      'http://localhost:3002',
      'http://127.0.0.1:3004',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3002',
      'http://yalitranscription.duckdns.org',
      'https://yalitranscription.duckdns.org',
      'http://146.190.57.51',
      'http://146.190.57.51:3002'
    ];
    
    if (isDevelopment || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for now to fix the issue
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-API-Key', 'X-Dev-Mode'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400 // Cache preflight for 24 hours
};
app.use(cors(corsOptions));

// Body parsing with size limits - MUST come before other middleware that needs req.body
app.use(express.json({ limit: requestSizeLimit.json }));
app.use(express.urlencoded(requestSizeLimit.urlencoded));

// Security middleware - Apply AFTER body parsing
app.use(sqlInjectionProtection);

// Rate limiting - Apply to all routes (skip in development)
const isDev = process.env.NODE_ENV?.trim() === 'development' || process.env.ENABLE_DEV_TOOLS === 'true';
if (!isDev) {
  app.use('/api/', apiRateLimiter);
} else {
  console.log('⚠️  Rate limiting disabled in development mode');
}

// Import routes and middleware
import devToolsRouter from './api/dev/routes';
import apiRouter from './api/routes';
import { errorHandler, notFound } from './middleware/error.middleware';
import { testConnection, initializeDatabase } from './db/connection';
import { seedDatabase } from './db/seed';
import { emailService } from './services/email.service';

// Health check with database status
app.get('/health', async (req, res) => {
  const dbConnected = await testConnection();
  
  res.json({ 
    status: dbConnected ? 'OK' : 'DEGRADED',
    database: dbConnected ? 'Connected' : 'Disconnected',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString() 
  });
});

// Development tools - ONLY in development mode
if (isDevelopment) {
  // console.log removed for production
  // For dev tools, we need to allow inline scripts and external fonts
  app.use('/dev', (req, res, next) => {
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self'"
    );
    next();
  });
  app.use('/dev', devToolsRouter);
} else {
  // Block dev routes in production
  app.use('/dev', (req, res) => {
    res.status(403).json({ error: 'Development tools are disabled in production' });
  });
}

// TEMPORARY: Direct test endpoints to debug the issue
app.get('/api/projects/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Test endpoint works!',
    timestamp: new Date().toISOString()
  });
});

// TEMPORARY: Hardcoded project list for testing
app.get('/api/projects/list-test', (req, res) => {
  res.json({
    success: true,
    projects: [
      {
        projectId: 'test-001',
        name: 'Test Project 1',
        displayName: 'Test Project 1',
        mediaFiles: ['media-1', 'media-2'],
        totalMedia: 2,
        currentMediaIndex: 0,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      }
    ],
    count: 1
  });
});

// Production API routes
app.use('/api', apiRouter);

// Error handling middleware (must be last)
// Don't use notFound middleware - let unmatched routes fall through
// app.use(notFound);
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    // Test database connection
    // console.log removed for production
    const isConnected = await testConnection();
    
    if (!isConnected) {
      console.warn('⚠️  Database connection failed - running without database');
      console.warn('   Authentication will not work until database is connected');
    } else {
      // Initialize database tables
      await initializeDatabase();
      
      // Seed database if in development and needed
      if (isDevelopment) {
        // console.log removed for production
        // The seed function will check if users already exist
        await seedDatabase();
      }
    }
    
    // Email service is already initialized when imported
    console.log('📧 Email service ready');
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║  🚀 Server Started Successfully        ║
║  Port: ${PORT.toString().padEnd(32)} ║
║  Database: ${isConnected ? '✅ Connected'.padEnd(29) : '❌ Disconnected'.padEnd(29)} ║
║  Dev Tools: ${isDevelopment ? '✅ Enabled'.padEnd(26) : '❌ Disabled'.padEnd(26)} ║
╚════════════════════════════════════════╝
      `);
      
      if (isDevelopment) {
        // console.log removed for production
      }
    });
    
    // Keep the server running
    server.on('error', (error) => {
      console.error('Server error:', error);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  // console.log removed for production
  process.exit(0);
});

process.on('SIGTERM', () => {
  // console.log removed for production
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();
