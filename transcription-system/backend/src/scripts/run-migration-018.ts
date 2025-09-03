import { db } from '../db/connection';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  console.log('Running migration 018: Create user_storage_quotas table...');
  console.log('Database connection details:', {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER
  });
  
  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../../migrations/018_create_user_storage_quotas.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolon and filter out empty statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.includes('GRANT')) {
        // Skip GRANT statements as they may not work with the current user
        console.log('Skipping GRANT statement...');
        continue;
      }
      
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      await db.query(statement + ';');
    }
    
    console.log('✅ Migration 018 completed successfully!');
    console.log('Created table:');
    console.log('  - user_storage_quotas');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await db.end();
    process.exit(0);
  }
}

runMigration();