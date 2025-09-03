#!/usr/bin/env ts-node
import storageService from '../services/storageService';

async function testQuotaUpdate() {
  try {
    console.log('🧪 Testing storage quota update...');
    
    // Test updating quota for a real user
    const testUserId = 'bfc0ba9a-daae-46e2-acb9-5984d1adef9f';
    const newQuotaMB = 750;
    
    console.log(`📝 Updating quota for user ${testUserId} to ${newQuotaMB}MB`);
    
    // Get current storage info
    const beforeUpdate = await storageService.getUserStorage(testUserId);
    console.log('📊 Before update:', beforeUpdate);
    
    // Update quota
    await storageService.updateUserQuota(testUserId, newQuotaMB);
    console.log('✅ Quota update completed');
    
    // Get updated storage info
    const afterUpdate = await storageService.getUserStorage(testUserId);
    console.log('📊 After update:', afterUpdate);
    
    if (afterUpdate.quotaLimitMB === newQuotaMB) {
      console.log('🎉 SUCCESS: Quota update working correctly!');
    } else {
      console.log(`❌ ISSUE: Expected ${newQuotaMB}MB but got ${afterUpdate.quotaLimitMB}MB`);
    }
    
    // Reset back to 500MB
    await storageService.updateUserQuota(testUserId, 500);
    console.log('🔄 Reset quota back to 500MB');
    
  } catch (error) {
    console.error('❌ Quota update test failed:', error);
  } finally {
    process.exit(0);
  }
}

testQuotaUpdate();