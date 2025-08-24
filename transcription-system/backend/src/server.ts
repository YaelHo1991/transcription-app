import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ 
  path: path.resolve(__dirname, '..', '.env.development')
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

// Rate limiting - Apply to all routes
app.use('/api/', apiRateLimiter);

// Import routes and middleware
import devToolsRouter from './api/dev/routes';
import apiRouter from './api/routes';
import { errorHandler, notFound } from './middleware/error.middleware';
import { testConnection, initializeDatabase } from './db/connection';
import { seedDatabase } from './db/seed';

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
  console.log('🔧 Development tools enabled at /dev');
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
    console.log('🔌 Connecting to database...');
    const isConnected = await testConnection();
    
    if (!isConnected) {
      console.warn('⚠️  Database connection failed - running without database');
      console.warn('   Authentication will not work until database is connected');
    } else {
      // Initialize database tables
      await initializeDatabase();
      
      // Seed database if in development and needed
      if (isDevelopment) {
        console.log('🌱 Checking if database needs seeding...');
        // The seed function will check if users already exist
        await seedDatabase();
      }
    }
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║     Transcription System Backend       ║
╠════════════════════════════════════════╣
║  Environment: ${process.env.NODE_ENV?.padEnd(24)} ║
║  Port: ${PORT.toString().padEnd(32)} ║
║  Database: ${isConnected ? '✅ Connected'.padEnd(29) : '❌ Disconnected'.padEnd(29)} ║
║  Dev Tools: ${isDevelopment ? '✅ Enabled'.padEnd(26) : '❌ Disabled'.padEnd(26)} ║
╚════════════════════════════════════════╝
      `);
      
      if (isDevelopment) {
        console.log(`
📋 Development Dashboard: http://localhost:${PORT}/dev
📡 API Health Check: http://localhost:${PORT}/health
        `);
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
  console.log('\nReceived SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
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