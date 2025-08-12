import { db } from './connection';

async function addTranscriberCode() {
  try {
    console.log('🔧 Adding transcriber code system...');
    
    // Add transcriber_code column if it doesn't exist
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS transcriber_code VARCHAR(10) UNIQUE
    `);
    
    console.log('✅ Added transcriber_code column');
    
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
    
    console.log('✅ Created employee_links table');
    
    // Generate codes for existing users with D, E, or F permissions
    const result = await db.query(`
      SELECT id, username, permissions, transcriber_code 
      FROM users 
      WHERE (permissions LIKE '%D%' OR permissions LIKE '%E%' OR permissions LIKE '%F%')
      AND transcriber_code IS NULL
    `);
    
    console.log(`Found ${result.rows.length} users needing codes`);
    
    for (const user of result.rows) {
      const code = 'TRN-' + Math.floor(1000 + Math.random() * 9000);
      await db.query(
        'UPDATE users SET transcriber_code = $1 WHERE id = $2',
        [code, user.id]
      );
      console.log(`  Generated code ${code} for user ${user.username}`);
    }
    
    // Show all users with codes
    const users = await db.query(`
      SELECT username, email, permissions, transcriber_code 
      FROM users 
      WHERE transcriber_code IS NOT NULL
      ORDER BY created_at DESC
    `);
    
    console.log('\n📋 Users with transcriber codes:');
    users.rows.forEach(u => {
      console.log(`  ${u.username}: ${u.transcriber_code} (permissions: ${u.permissions})`);
    });
    
    console.log('\n✅ Transcriber code system setup complete!');
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