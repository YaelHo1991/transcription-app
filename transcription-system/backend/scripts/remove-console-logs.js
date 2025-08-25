const fs = require('fs');
const path = require('path');

// Directories to skip
const SKIP_DIRS = ['node_modules', 'dist', 'build', 'dev-tools', 'scripts', '.git'];
const SKIP_FILES = ['email.service.ts']; // Keep email service logs for now

// Counter for replacements
let totalReplacements = 0;
let filesModified = 0;

function shouldSkipFile(filePath) {
  // Skip if in a skip directory
  for (const dir of SKIP_DIRS) {
    if (filePath.includes(path.sep + dir + path.sep)) {
      return true;
    }
  }
  
  // Skip specific files
  const fileName = path.basename(filePath);
  if (SKIP_FILES.includes(fileName)) {
    return true;
  }
  
  return false;
}

function processFile(filePath) {
  if (shouldSkipFile(filePath)) {
    return;
  }
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Count console.log occurrences
    const matches = content.match(/console\.log\([^)]*\);?/g) || [];
    
    if (matches.length > 0) {
      // Replace console.log with a comment (preserving the logic flow)
      content = content.replace(/console\.log\([^)]*\);?/g, '// console.log removed for production');
      
      // Only write if content changed
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Processed ${filePath}: Removed ${matches.length} console.log statements`);
        totalReplacements += matches.length;
        filesModified++;
      }
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

function processDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip certain directories
      if (!SKIP_DIRS.includes(item)) {
        processDirectory(fullPath);
      }
    } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.js'))) {
      processFile(fullPath);
    }
  }
}

// Start processing from src directory
const srcPath = path.join(__dirname, '..', 'src');

console.log('🔍 Starting to remove console.log statements from production code...');
console.log(`📁 Processing directory: ${srcPath}`);
console.log(`⏭️  Skipping: ${SKIP_DIRS.join(', ')}`);
console.log('');

processDirectory(srcPath);

console.log('');
console.log('📊 Summary:');
console.log(`   Files modified: ${filesModified}`);
console.log(`   Console.logs removed: ${totalReplacements}`);
console.log('');
console.log('✅ Done! Remember to test the application after these changes.');