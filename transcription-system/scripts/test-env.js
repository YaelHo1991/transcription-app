#!/usr/bin/env node

/**
 * Test script to verify environment variable loading
 * Run with: node scripts/test-env.js
 */

const path = require('path');
const fs = require('fs');

console.log('🔍 Testing Environment Variable Loading...\n');

// Test backend .env.production
console.log('📦 Backend Environment (.env.production):');
console.log('=========================================');

const backendEnvPath = path.join(__dirname, '../backend/.env.production');
if (fs.existsSync(backendEnvPath)) {
  console.log('✅ Backend .env.production file exists');
  
  // Load and test critical variables
  const envContent = fs.readFileSync(backendEnvPath, 'utf8');
  const requiredBackendVars = [
    'NODE_ENV',
    'PORT',
    'JWT_SECRET',
    'API_KEY',
    'DB_HOST',
    'DB_NAME',
    'DB_USER',
    'FRONTEND_URL'
  ];
  
  requiredBackendVars.forEach(varName => {
    if (envContent.includes(`${varName}=`)) {
      console.log(`✅ ${varName} is defined`);
    } else {
      console.log(`❌ ${varName} is missing!`);
    }
  });
} else {
  console.log('❌ Backend .env.production file not found!');
}

console.log('\n📱 Frontend Environment (.env.production):');
console.log('==========================================');

const frontendEnvPath = path.join(__dirname, '../frontend/main-app/.env.production');
if (fs.existsSync(frontendEnvPath)) {
  console.log('✅ Frontend .env.production file exists');
  
  // Load and test critical variables
  const envContent = fs.readFileSync(frontendEnvPath, 'utf8');
  const requiredFrontendVars = [
    'NEXT_PUBLIC_DOMAIN',
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_SITE_URL',
    'NEXT_PUBLIC_ENABLE_PEDAL',
    'NEXT_PUBLIC_MAX_FILE_SIZE'
  ];
  
  requiredFrontendVars.forEach(varName => {
    if (envContent.includes(`${varName}=`)) {
      console.log(`✅ ${varName} is defined`);
    } else {
      console.log(`❌ ${varName} is missing!`);
    }
  });
} else {
  console.log('❌ Frontend .env.production file not found!');
}

console.log('\n⚠️  Security Reminders:');
console.log('========================');
console.log('1. Update DB_PASSWORD in backend/.env.production');
console.log('2. Regenerate JWT_SECRET for actual production');
console.log('3. Update email configuration if needed');
console.log('4. Verify DROPLET_IP is correct');
console.log('5. Never commit .env.production files to git');

console.log('\n✅ Environment configuration test complete!');