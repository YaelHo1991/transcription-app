import { db } from '../db/connection';

async function addRecordingColumns() {
  try {
    console.log('Adding recording columns to users table...');
    
    // Add recording permission fields
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS recording_enabled BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS recording_pages JSONB DEFAULT '[]'::jsonb;
    `);
    
    console.log('✅ Recording columns added successfully');
    
    // Verify columns were added
    const result = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('recording_enabled', 'recording_pages')
    `);
    
    console.log('Columns found:', result.rows);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding recording columns:', error);
    process.exit(1);
  }
}

addRecordingColumns();