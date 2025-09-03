#!/usr/bin/env ts-node
import { db } from '../db/connection';
import storageService from '../services/storageService';

async function testAdminStorage() {
  try {
    console.log('🧪 Testing admin API storage integration...');
    
    // Get all users like the admin API does
    const users = await db.query(
      `SELECT 
        u.id, 
        u.email, 
        u.full_name, 
        u.permissions, 
        u.is_admin,
        u.transcriber_code,
        u.created_at,
        u.last_login,
        u.password
      FROM users u
      ORDER BY u.created_at DESC`
    );

    console.log(`📊 Found ${users.rows.length} users`);

    // Get storage data for all users (like admin API now does)
    const usersWithStorage = await Promise.all(
      users.rows.map(async (user) => {
        try {
          const storageInfo = await storageService.getUserStorage(user.id);
          return {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            quota_limit_mb: storageInfo.quotaLimitMB,
            quota_used_mb: storageInfo.quotaUsedMB,
            used_percent: storageInfo.usedPercent
          };
        } catch (error) {
          console.error(`❌ Error getting storage for user ${user.id}:`, error.message);
          return {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            quota_limit_mb: 500, // Default 500MB
            quota_used_mb: 0,    // Default 0MB used
            used_percent: 0
          };
        }
      })
    );

    console.log('\n📈 Users with Storage Data:');
    usersWithStorage.forEach(user => {
      console.log(`- ${user.full_name || user.email}: ${user.quota_used_mb}MB / ${user.quota_limit_mb}MB (${user.used_percent.toFixed(1)}%)`);
    });

    // Count users with actual usage
    const usersWithUsage = usersWithStorage.filter(u => u.quota_used_mb > 0);
    console.log(`\n✅ ${usersWithUsage.length}/${usersWithStorage.length} users have actual storage usage`);
    
    if (usersWithUsage.length > 0) {
      console.log('🎉 SUCCESS: Admin API will now show real storage usage!');
    } else {
      console.log('⚠️  All users show 0MB usage - may need to check storage calculation');
    }
    
  } catch (error) {
    console.error('❌ Admin storage test failed:', error);
  } finally {
    await db.end();
    process.exit(0);
  }
}

testAdminStorage();