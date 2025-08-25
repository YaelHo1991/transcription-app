import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env'
  : '.env.development';

dotenv.config({ 
  path: path.resolve(__dirname, '..', '..', envFile)
});

// Database connection configuration
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'transcription_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

// Create the connection pool
export const db = new Pool(poolConfig);

// Test the connection
export async function testConnection(): Promise<boolean> {
  try {
    const client = await db.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connected successfully at:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Initialize database tables
export async function initializeDatabase(): Promise<void> {
  try {
    // Create users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        permissions VARCHAR(10) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      )
    `);

    // Create licenses table
    await db.query(`
      CREATE TABLE IF NOT EXISTS licenses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        license_key VARCHAR(255) UNIQUE NOT NULL,
        type VARCHAR(50) NOT NULL,
        permissions VARCHAR(10) NOT NULL,
        valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        valid_until TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create sessions table for token management
    await db.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create waveforms table for storing pre-generated waveform data
    await db.query(`
      CREATE TABLE IF NOT EXISTS waveforms (
        id SERIAL PRIMARY KEY,
        file_id VARCHAR(255) UNIQUE NOT NULL,
        file_url TEXT NOT NULL,
        file_size BIGINT NOT NULL,
        duration FLOAT NOT NULL,
        sample_rate INTEGER DEFAULT 44100,
        peaks JSONB NOT NULL,
        peak_count INTEGER NOT NULL,
        processing_time FLOAT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add password reset fields if they don't exist
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255) UNIQUE,
      ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;
    `);

    // Create indexes for better performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token) WHERE reset_token IS NOT NULL;
    `);
    
    // Create other indexes only if tables exist
    try {
      await db.query(`CREATE INDEX IF NOT EXISTS idx_licenses_user_id ON licenses(user_id);`);
    } catch (e) {
      // Licenses table might not exist
    }
    
    try {
      await db.query(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);`);
    } catch (e) {
      // Sessions table might not exist
    }
    
    try {
      await db.query(`CREATE INDEX IF NOT EXISTS idx_waveforms_file_id ON waveforms(file_id);`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_waveforms_created_at ON waveforms(created_at);`);
    } catch (e) {
      // Waveforms table might not exist
    }

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database tables:', error);
    throw error;
  }
}

// Graceful shutdown
export async function closeDatabase(): Promise<void> {
  await db.end();
  console.log('Database connection pool closed');
}