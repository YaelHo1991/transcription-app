import { db } from '../db/connection';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  try {
    console.log('Starting backup system migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', '..', 'migrations', '008_create_backup_system_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Run the migration
    await db.query(migrationSQL);
    
    console.log('✅ Backup system tables created successfully');
    
    // Verify tables were created
    const tableCheck = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('projects', 'transcriptions', 'media_files', 'transcription_media', 'transcription_backups')
      ORDER BY table_name;
    `);
    
    console.log('Created tables:', tableCheck.rows.map(r => r.table_name).join(', '));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();