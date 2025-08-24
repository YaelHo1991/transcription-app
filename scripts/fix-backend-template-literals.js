#!/usr/bin/env node

/**
 * Fix template literals in backend code that are causing runtime errors
 */

const fs = require('fs');
const path = require('path');

// Files that need fixing based on the error logs
const filesToFix = [
  'transcription-system/backend/src/services/projectService.ts',
  'transcription-system/backend/src/api/projects/routes.ts',
  'transcription-system/backend/src/routes/uploadRoutes.ts',
  'transcription-system/backend/src/services/uploadService.ts'
];

let totalFixed = 0;

console.log('🔧 Fixing backend template literals...\n');

filesToFix.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let fixedCount = 0;
    
    // Fix error messages with ${projectId} or similar
    content = content.replace(/console\.error\(`Error (.*?) \$\{(\w+)\}:(.*?)`\)/g, (match, prefix, variable, suffix) => {
      fixedCount++;
      return `console.error('Error ' + '${prefix} ' + ${variable} + ':' + '${suffix}')`;
    });
    
    // Fix console.log statements with ${projectId}
    content = content.replace(/console\.log\(`(.*?)\$\{(\w+)\}(.*?)`\)/g, (match, prefix, variable, suffix) => {
      fixedCount++;
      return `console.log('${prefix}' + ${variable} + '${suffix}')`;
    });
    
    // Fix path.join with template literals containing ${projectId}
    content = content.replace(/path\.join\((.*?),\s*`\$\{(\w+)\}`\)/g, (match, args, variable) => {
      fixedCount++;
      return `path.join(${args}, ${variable})`;
    });
    
    // Fix standalone template literals with ${projectId} in file paths
    content = content.replace(/`([^`]*?)\$\{projectId\}([^`]*?)`/g, (match, prefix, suffix) => {
      // Skip if it's inside a console.log or error (already handled)
      if (match.includes('Error') || match.includes('console')) {
        return match;
      }
      fixedCount++;
      return `'${prefix}' + projectId + '${suffix}'`;
    });
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed ${fixedCount} template literals in ${file}`);
      totalFixed += fixedCount;
    } else {
      console.log(`✓ No changes needed in ${file}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
  }
});

console.log(`\n✅ Total fixed: ${totalFixed} template literals`);
console.log('\n🔨 Rebuilding backend...');

// Rebuild backend
const { execSync } = require('child_process');
try {
  process.chdir(path.join(__dirname, '..', 'transcription-system', 'backend'));
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Backend rebuilt successfully');
} catch (error) {
  console.error('❌ Build failed:', error.message);
}