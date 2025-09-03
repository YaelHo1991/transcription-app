import { db } from '../db/connection';

async function createStorageTable() {
  try {
    console.log('Creating user_storage_quotas table...');
    
    // Create the table
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_storage_quotas (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) UNIQUE NOT NULL,
        quota_limit BIGINT DEFAULT 524288000, -- 500MB in bytes
        quota_used BIGINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    
    console.log('✓ Successfully created user_storage_quotas table');
    
    // Check if the table was created
    const result = await db.query(`
      SELECT table_name, column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'user_storage_quotas'
      ORDER BY ordinal_position;
    `);
    
    if (result.rows.length > 0) {
      console.log('✓ Table structure:');
      result.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
      });
    } else {
      console.log('⚠ Table not found after creation');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating table:', error);
    process.exit(1);
  }
}

createStorageTable();