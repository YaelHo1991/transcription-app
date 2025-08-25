import { db } from './connection';

async function addTranscriberCode() {
  try {
    // console.log removed for production
    
    // Add transcriber_code column if it doesn't exist
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS transcriber_code VARCHAR(10) UNIQUE
    `);
    
    // console.log removed for production
    
    // Create employee_links table
    await db.query(`
      CREATE TABLE IF NOT EXISTS employee_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        crm_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        transcriber_code VARCHAR(10),
        linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(crm_user_id, transcriber_code)
      )
    `);
    
    // console.log removed for production
    
    // Generate codes for existing users with D, E, or F permissions
    const result = await db.query(`
      SELECT id, username, permissions, transcriber_code 
      FROM users 
      WHERE (permissions LIKE '%D%' OR permissions LIKE '%E%' OR permissions LIKE '%F%')
      AND transcriber_code IS NULL
    `);
    
    // console.log removed for production
    
    for (const user of result.rows) {
      const code = 'TRN-' + Math.floor(1000 + Math.random() * 9000);
      await db.query(
        'UPDATE users SET transcriber_code = $1 WHERE id = $2',
        [code, user.id]
      );
      // console.log removed for production
    }
    
    // Show all users with codes
    const users = await db.query(`
      SELECT username, email, permissions, transcriber_code 
      FROM users 
      WHERE transcriber_code IS NOT NULL
      ORDER BY created_at DESC
    `);
    
    // console.log removed for production
    users.rows.forEach(u => {
      // console.log removed for production`);
    });
    
    // console.log removed for production
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  addTranscriberCode();
}

export { addTranscriberCode };