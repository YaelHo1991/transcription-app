const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const FRONTEND_PATH = path.join(__dirname, '..', 'transcription-system', 'frontend', 'main-app');

console.log('=====================================');
console.log('Build Verification Script');
console.log('=====================================');
console.log('');

// Step 1: Check if we're in the right directory
if (!fs.existsSync(FRONTEND_PATH)) {
  console.error('❌ ERROR: Frontend directory not found!');
  console.error(`   Expected at: ${FRONTEND_PATH}`);
  process.exit(1);
}

console.log(`📁 Frontend path: ${FRONTEND_PATH}`);
console.log('');

// Function to run command and capture output
function runCommand(command, description, cwd = FRONTEND_PATH) {
  console.log(`🔄 ${description}...`);
  console.log(`   Command: ${command}`);
  
  try {
    const output = execSync(command, {
      cwd: cwd,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    console.log('✅ Success!');
    if (output && output.trim()) {
      console.log('   Output:', output.substring(0, 200));
    }
    return { success: true, output };
  } catch (error) {
    console.log('❌ Failed!');
    if (error.stdout) {
      console.log('   Output:', error.stdout.toString().substring(0, 500));
    }
    if (error.stderr) {
      console.log('   Error:', error.stderr.toString().substring(0, 500));
    }
    return { success: false, error };
  }
}

// Step 2: Check Node.js version
console.log('Step 1: Checking environment');
console.log('-'.repeat(30));
const nodeVersion = process.version;
console.log(`Node.js version: ${nodeVersion}`);

// Step 3: Check if dependencies are installed
console.log('');
console.log('Step 2: Checking dependencies');
console.log('-'.repeat(30));
const packageJsonPath = path.join(FRONTEND_PATH, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ package.json not found!');
  process.exit(1);
}

const nodeModulesPath = path.join(FRONTEND_PATH, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('⚠️  node_modules not found. Installing dependencies...');
  runCommand('npm install', 'Installing dependencies');
} else {
  console.log('✅ Dependencies already installed');
}

// Step 4: Run TypeScript check
console.log('');
console.log('Step 3: TypeScript type checking');
console.log('-'.repeat(30));
const tscResult = runCommand('npx tsc --noEmit', 'Running TypeScript compiler');

// Step 5: Run ESLint (if available)
console.log('');
console.log('Step 4: Linting check');
console.log('-'.repeat(30));
const eslintConfig = path.join(FRONTEND_PATH, '.eslintrc.json');
if (fs.existsSync(eslintConfig)) {
  runCommand('npm run lint || true', 'Running ESLint');
} else {
  console.log('⏭️  No ESLint configuration found, skipping...');
}

// Step 6: Try production build
console.log('');
console.log('Step 5: Production build test');
console.log('-'.repeat(30));
console.log('This may take a few minutes...');

const buildResult = runCommand('npm run build', 'Building for production');

// Step 7: Check build output
console.log('');
console.log('Step 6: Verifying build output');
console.log('-'.repeat(30));
const buildDir = path.join(FRONTEND_PATH, '.next');
if (fs.existsSync(buildDir)) {
  console.log('✅ Build directory created successfully');
  
  // Check for static files
  const staticDir = path.join(buildDir, 'static');
  if (fs.existsSync(staticDir)) {
    console.log('✅ Static assets generated');
  }
  
  // Check server files
  const serverDir = path.join(buildDir, 'server');
  if (fs.existsSync(serverDir)) {
    console.log('✅ Server files generated');
  }
} else {
  console.log('❌ Build directory not found!');
}

// Summary
console.log('');
console.log('='.repeat(50));
console.log('VERIFICATION SUMMARY');
console.log('='.repeat(50));

const checks = [
  { name: 'Dependencies installed', passed: fs.existsSync(nodeModulesPath) },
  { name: 'TypeScript check', passed: tscResult.success },
  { name: 'Production build', passed: buildResult.success },
  { name: 'Build output exists', passed: fs.existsSync(buildDir) }
];

let allPassed = true;
checks.forEach(check => {
  console.log(`${check.passed ? '✅' : '❌'} ${check.name}`);
  if (!check.passed) allPassed = false;
});

console.log('');
if (allPassed) {
  console.log('🎉 All checks passed! The build is ready for deployment.');
  console.log('');
  console.log('Next steps:');
  console.log('1. Test the production build locally: npm run start');
  console.log('2. Commit your changes: git add -A && git commit -m "Fix template literals"');
  console.log('3. Push to repository: git push');
  console.log('4. Deploy to DigitalOcean');
} else {
  console.log('⚠️  Some checks failed. Please fix the issues before deploying.');
  console.log('');
  console.log('Common fixes:');
  console.log('1. Run the template literal fix script: node scripts/fix-all-template-literals-comprehensive.js');
  console.log('2. Check for syntax errors in the code');
  console.log('3. Ensure all dependencies are installed: npm install');
}