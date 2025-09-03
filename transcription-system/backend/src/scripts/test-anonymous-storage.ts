#!/usr/bin/env ts-node
import storageService from '../services/storageService';

async function testAnonymousStorage() {
  try {
    console.log('🧪 Testing storage for anonymous user with 339MB data...');
    const storageInfo = await storageService.getUserStorage('anonymous');
    console.log('✅ Storage result:', storageInfo);
    
    if (storageInfo.quotaUsedMB > 0) {
      console.log('🎉 SUCCESS: Storage calculation working! Shows', storageInfo.quotaUsedMB, 'MB usage');
    } else {
      console.log('❌ ISSUE: Still shows 0MB despite having files');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testAnonymousStorage();