import { db } from '../src/db/connection';
import fs from 'fs';
import path from 'path';

async function runAutocorrectMigration() {
  try {
    console.log('🚀 Running autocorrect settings migration...');
    
    const migrationPath = path.join(__dirname, '..', 'migrations', '019_add_autocorrect_settings.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await db.query(sql);
    
    // Verify the migration was successful
    const verifyResult = await db.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'autocorrect_settings'
    `);
    
    if (verifyResult.rows[0].count === '1') {
      console.log('✅ Autocorrect settings migration completed successfully');
      
      // Show sample of updated data
      const sampleResult = await db.query(`
        SELECT id, username, autocorrect_settings->>'blockDuplicateSpeakers' as block_duplicates
        FROM users 
        LIMIT 3
      `);
      
      console.log('📄 Sample data after migration:');
      console.table(sampleResult.rows);
    } else {
      console.error('❌ Migration verification failed - column not found');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('\n🔄 To rollback this migration, run: npm run rollback-autocorrect');
  } finally {
    await db.end();
  }
}

// Function to rollback the migration
async function rollbackAutocorrectMigration() {
  try {
    console.log('🔄 Rolling back autocorrect settings migration...');
    
    const rollbackPath = path.join(__dirname, '..', 'migrations', '019_add_autocorrect_settings_rollback.sql');
    const sql = fs.readFileSync(rollbackPath, 'utf8');
    
    await db.query(sql);
    
    // Verify the rollback was successful
    const verifyResult = await db.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'autocorrect_settings'
    `);
    
    if (verifyResult.rows[0].count === '0') {
      console.log('✅ Autocorrect settings migration rollback completed successfully');
    } else {
      console.error('❌ Rollback verification failed - column still exists');
    }
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
  } finally {
    await db.end();
  }
}

// Check command line arguments
const action = process.argv[2];

if (action === 'rollback') {
  rollbackAutocorrectMigration();
} else {
  runAutocorrectMigration();
}