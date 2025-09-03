import { db } from '../db/connection';

async function addAutoExportColumn() {
  try {
    console.log('Adding auto_word_export_enabled column to users table...');
    
    // Add the column if it doesn't exist
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS auto_word_export_enabled BOOLEAN DEFAULT FALSE;
    `);
    
    console.log('✓ Successfully added auto_word_export_enabled column');
    
    // Check if the column was added
    const result = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'auto_word_export_enabled';
    `);
    
    if (result.rows.length > 0) {
      console.log('✓ Column verified:', result.rows[0]);
    } else {
      console.log('⚠ Column not found after creation');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding column:', error);
    process.exit(1);
  }
}

addAutoExportColumn();