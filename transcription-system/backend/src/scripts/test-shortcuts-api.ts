import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api';

// Test user credentials
const TEST_USER = {
  username: 'demo',
  password: 'demo123'
};

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  data?: any;
  error?: string;
}

async function getAuthToken(): Promise<string> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_USER)
  });
  
  const data = await response.json();
  if (!data.success) {
    throw new Error('Failed to authenticate');
  }
  
  return data.token;
}

async function testEndpoint(
  token: string,
  method: string,
  endpoint: string,
  body?: any
): Promise<TestResult> {
  try {
    const options: any = {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, options);
    const data = await response.json();
    
    return {
      endpoint,
      method,
      status: response.status,
      success: response.ok,
      data
    };
  } catch (error: any) {
    return {
      endpoint,
      method,
      status: 0,
      success: false,
      error: error.message
    };
  }
}

async function runTests() {
  console.log('🧪 Testing Shortcuts API Endpoints\n');
  console.log('================================\n');
  
  try {
    // Get auth token
    console.log('🔐 Authenticating...');
    const token = await getAuthToken();
    console.log('✅ Authentication successful\n');
    
    const results: TestResult[] = [];
    
    // Test 1: Get all shortcuts
    console.log('📋 Test 1: Get all shortcuts');
    const test1 = await testEndpoint(token, 'GET', '/transcription/shortcuts');
    results.push(test1);
    console.log(`Status: ${test1.status} ${test1.success ? '✅' : '❌'}`);
    if (test1.success) {
      console.log(`Found ${test1.data.shortcuts.length} shortcuts`);
      console.log(`Quota: ${test1.data.quota.used}/${test1.data.quota.max}`);
      console.log(`Categories: ${test1.data.categories.join(', ')}`);
      
      // Show sample shortcuts
      console.log('\nSample shortcuts:');
      test1.data.shortcuts.slice(0, 5).forEach((s: any) => {
        console.log(`  ${s.shortcut} → ${s.expansion} (${s.source})`);
      });
    }
    console.log();
    
    // Test 2: Get quota
    console.log('📊 Test 2: Get user quota');
    const test2 = await testEndpoint(token, 'GET', '/transcription/shortcuts/quota');
    results.push(test2);
    console.log(`Status: ${test2.status} ${test2.success ? '✅' : '❌'}`);
    if (test2.success) {
      console.log(`Max shortcuts: ${test2.data.max_shortcuts}`);
      console.log(`Used shortcuts: ${test2.data.used_shortcuts}`);
    }
    console.log();
    
    // Test 3: Search shortcuts
    console.log('🔍 Test 3: Search shortcuts');
    const test3 = await testEndpoint(token, 'GET', '/transcription/shortcuts/search?q=עורך');
    results.push(test3);
    console.log(`Status: ${test3.status} ${test3.success ? '✅' : '❌'}`);
    if (test3.success) {
      console.log(`Found ${test3.data.length} matching shortcuts`);
      test3.data.forEach((s: any) => {
        console.log(`  ${s.shortcut} → ${s.expansion}`);
      });
    }
    console.log();
    
    // Test 4: Add personal shortcut
    console.log('➕ Test 4: Add personal shortcut');
    const newShortcut = {
      shortcut: 'טסט',
      expansion: 'זהו טקסט לבדיקה',
      language: 'he'
    };
    const test4 = await testEndpoint(token, 'POST', '/transcription/shortcuts', newShortcut);
    results.push(test4);
    console.log(`Status: ${test4.status} ${test4.success ? '✅' : '❌'}`);
    if (test4.success) {
      console.log(`Created shortcut: ${test4.data.shortcut} → ${test4.data.expansion}`);
      console.log(`ID: ${test4.data.id}`);
    } else if (test4.status === 409) {
      console.log('Shortcut already exists (expected if running test multiple times)');
    }
    console.log();
    
    // Test 5: Get system shortcuts
    console.log('🔧 Test 5: Get system shortcuts');
    const test5 = await testEndpoint(token, 'GET', '/transcription/shortcuts/system');
    results.push(test5);
    console.log(`Status: ${test5.status} ${test5.success ? '✅' : '❌'}`);
    if (test5.success) {
      console.log(`Found ${test5.data.length} system shortcuts`);
      
      // Count by category
      const categoryCounts: { [key: string]: number } = {};
      test5.data.forEach((s: any) => {
        const cat = s.category_name || 'uncategorized';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });
      
      console.log('\nBy category:');
      Object.entries(categoryCounts).forEach(([cat, count]) => {
        console.log(`  ${cat}: ${count} shortcuts`);
      });
    }
    console.log();
    
    // Summary
    console.log('================================');
    console.log('📊 Test Summary:\n');
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${results.length}`);
    
    if (failed > 0) {
      console.log('\n❌ Failed tests:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  ${r.method} ${r.endpoint}: ${r.error || `Status ${r.status}`}`);
      });
    }
    
    console.log('\n✅ API testing complete!');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }
}

// Add node-fetch import check
async function checkDependencies() {
  try {
    require('node-fetch');
    return true;
  } catch {
    console.log('📦 Installing node-fetch...');
    const { execSync } = require('child_process');
    execSync('npm install --save-dev node-fetch@2', { 
      cwd: process.cwd(),
      stdio: 'inherit' 
    });
    return true;
  }
}

async function main() {
  await checkDependencies();
  
  // Wait for server to be ready
  console.log('⏳ Waiting for server to be ready...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await runTests();
}

main().catch(console.error);