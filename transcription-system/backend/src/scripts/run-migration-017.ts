import { db } from '../db/connection';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  console.log('Running migration 017: Add Auto Export Settings...');
  
  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../../migrations/017_add_auto_export_settings.sql');
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
    
    console.log('✅ Migration 017 completed successfully!');
    console.log('Added columns:');
    console.log('  - users.auto_word_export_enabled');
    console.log('  - users.last_auto_export');
    console.log('Created table:');
    console.log('  - auto_export_history');
    
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