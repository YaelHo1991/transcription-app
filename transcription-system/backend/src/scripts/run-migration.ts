#!/usr/bin/env ts-node
import { db } from '../db/connection';
import { readFileSync } from 'fs';
import path from 'path';

async function runMigration() {
  try {
    console.log('🚀 Running user_storage_quotas migration...');
    
    const migrationPath = path.join(__dirname, '../../migrations/018_create_user_storage_quotas.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('📝 Executing:', statement.substring(0, 50) + '...');
        await db.query(statement);
      }
    }
    
    console.log('✅ Migration completed successfully!');
    
    // Test the table creation
    const testResult = await db.query('SELECT COUNT(*) FROM user_storage_quotas');
    console.log(`📊 user_storage_quotas table has ${testResult.rows[0].count} records`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await db.end();
    process.exit(0);
  }
}

runMigration();