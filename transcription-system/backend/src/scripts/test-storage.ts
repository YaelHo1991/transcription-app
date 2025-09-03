#!/usr/bin/env ts-node
import storageService from '../services/storageService';

async function testStorage() {
  try {
    console.log('🧪 Testing storage calculation...');
    
    const userId = 'bfc0ba9a-daae-46e2-acb9-5984d1adef9f';
    console.log(`📊 Testing storage for user: ${userId}`);
    
    const storageInfo = await storageService.getUserStorage(userId);
    console.log('✅ Storage calculation result:', storageInfo);
    
    // Calculate expected percentage
    const expectedPercent = (storageInfo.quotaUsedMB / storageInfo.quotaLimitMB) * 100;
    console.log(`📈 Expected percentage: ${expectedPercent.toFixed(1)}%`);
    
    if (storageInfo.quotaUsedMB > 0) {
      console.log('🎉 SUCCESS: Storage calculation is working! User has actual usage.');
    } else {
      console.log('❌ ISSUE: Storage still shows 0MB usage despite user having projects.');
    }
    
  } catch (error) {
    console.error('❌ Storage test failed:', error);
  } finally {
    process.exit(0);
  }
}

testStorage();