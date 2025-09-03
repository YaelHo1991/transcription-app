import { db } from '../db/connection';

async function testAdminAPI() {
  try {
    console.log('Testing database connection...');
    
    // Test basic users query
    const usersResult = await db.query('SELECT id, email, full_name FROM users LIMIT 3');
    console.log(`✅ Found ${usersResult.rowCount} users in database:`);
    usersResult.rows.forEach(user => {
      console.log(`  - ${user.email} (${user.full_name || 'No name'})`);
    });

    // Test user_storage_quotas table
    const storageResult = await db.query('SELECT COUNT(*) FROM user_storage_quotas');
    console.log(`✅ user_storage_quotas table exists with ${storageResult.rows[0].count} records`);

    // Test the full admin query
    const adminQuery = `
      SELECT 
        u.id, 
        u.email, 
        u.full_name, 
        u.permissions, 
        u.is_admin,
        u.transcriber_code,
        u.created_at,
        u.last_login,
        u.password,
        u.auto_word_export_enabled,
        COALESCE(usq.quota_limit, 524288000) as quota_limit,
        COALESCE(usq.quota_used, 0) as quota_used
      FROM users u
      LEFT JOIN user_storage_quotas usq ON u.id = usq.user_id
      ORDER BY u.created_at DESC
      LIMIT 2
    `;
    
    const adminResult = await db.query(adminQuery);
    console.log(`✅ Admin API query works! Retrieved ${adminResult.rowCount} users with storage info`);
    
    if (adminResult.rowCount > 0) {
      const user = adminResult.rows[0];
      console.log(`  - Sample user: ${user.email}, Storage: ${Math.round(user.quota_used / (1024 * 1024))}MB / ${Math.round(user.quota_limit / (1024 * 1024))}MB`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await db.end();
  }
}

testAdminAPI();